import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, isValid } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Ruler, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type {
  Measurement,
  BodyMeasurementDataPoint,
  BodyMeasurementType,
  ChartTimeRange
} from '@/types/charts';

interface BodyMeasurementChartProps {
  className?: string;
}

const BodyMeasurementChart: React.FC<BodyMeasurementChartProps> = ({ className }) => {
  const [timeRange, setTimeRange] = useState<ChartTimeRange>({ value: '90d', label: '3 months' });

  const timeRanges: ChartTimeRange[] = [
    { value: '30d', label: '30 days' },
    { value: '90d', label: '3 months' },
    { value: '6m', label: '6 months' },
    { value: '1y', label: '1 year' },
    { value: 'all', label: 'All time' },
  ];

  // Available measurement types with their display properties
  const [measurementTypes, setMeasurementTypes] = useState<BodyMeasurementType[]>([
    { key: 'waist', label: 'Waist', color: '#3b82f6', unit: 'cm', enabled: true },
    { key: 'chest', label: 'Chest', color: '#ef4444', unit: 'cm', enabled: true },
    { key: 'hips', label: 'Hips', color: '#10b981', unit: 'cm', enabled: true },
    { key: 'neck', label: 'Neck', color: '#f59e0b', unit: 'cm', enabled: false },
    { key: 'shoulders', label: 'Shoulders', color: '#8b5cf6', unit: 'cm', enabled: false },
    { key: 'bicepLeft', label: 'Left Bicep', color: '#06b6d4', unit: 'cm', enabled: false },
    { key: 'bicepRight', label: 'Right Bicep', color: '#84cc16', unit: 'cm', enabled: false },
    { key: 'thighLeft', label: 'Left Thigh', color: '#f97316', unit: 'cm', enabled: false },
    { key: 'thighRight', label: 'Right Thigh', color: '#ec4899', unit: 'cm', enabled: false },
    { key: 'calfLeft', label: 'Left Calf', color: '#6366f1', unit: 'cm', enabled: false },
    { key: 'calfRight', label: 'Right Calf', color: '#14b8a6', unit: 'cm', enabled: false },
    { key: 'bodyFat', label: 'Body Fat', color: '#dc2626', unit: '%', enabled: false },
    { key: 'muscleMass', label: 'Muscle Mass', color: '#059669', unit: 'kg', enabled: false },
  ]);

  // Fetch measurements data
  const { data: measurements, isLoading, error } = useQuery({
    queryKey: ['measurements'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/progress/measurements');
      const result = await response.json();
      return result.data as Measurement[];
    },
  });

  // Process data for chart
  const chartData = useMemo((): BodyMeasurementDataPoint[] => {
    if (!measurements) return [];

    const filteredData = measurements
      .filter((measurement) => {
        if (!measurement.measurementDate) return false;

        // Apply time range filter
        const measurementDate = new Date(measurement.measurementDate);
        if (!isValid(measurementDate)) return false;

        const now = new Date();
        const cutoffDate = new Date();

        switch (timeRange.value) {
          case '30d':
            cutoffDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            cutoffDate.setDate(now.getDate() - 90);
            break;
          case '6m':
            cutoffDate.setMonth(now.getMonth() - 6);
            break;
          case '1y':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
          case 'all':
            return true;
          default:
            cutoffDate.setDate(now.getDate() - 90);
        }

        return measurementDate >= cutoffDate;
      })
      .map((measurement): BodyMeasurementDataPoint => {
        const date = new Date(measurement.measurementDate);

        return {
          date: measurement.measurementDate,
          formattedDate: format(date, 'MMM dd'),
          displayDate: format(date, 'MMM dd, yyyy'),
          waist: measurement.waistCm ? parseFloat(measurement.waistCm) : undefined,
          chest: measurement.chestCm ? parseFloat(measurement.chestCm) : undefined,
          hips: measurement.hipsCm ? parseFloat(measurement.hipsCm) : undefined,
          neck: measurement.neckCm ? parseFloat(measurement.neckCm) : undefined,
          shoulders: measurement.shouldersCm ? parseFloat(measurement.shouldersCm) : undefined,
          bicepLeft: measurement.bicepLeftCm ? parseFloat(measurement.bicepLeftCm) : undefined,
          bicepRight: measurement.bicepRightCm ? parseFloat(measurement.bicepRightCm) : undefined,
          thighLeft: measurement.thighLeftCm ? parseFloat(measurement.thighLeftCm) : undefined,
          thighRight: measurement.thighRightCm ? parseFloat(measurement.thighRightCm) : undefined,
          calfLeft: measurement.calfLeftCm ? parseFloat(measurement.calfLeftCm) : undefined,
          calfRight: measurement.calfRightCm ? parseFloat(measurement.calfRightCm) : undefined,
          bodyFat: measurement.bodyFatPercentage ? parseFloat(measurement.bodyFatPercentage) : undefined,
          muscleMass: measurement.muscleMassKg ? parseFloat(measurement.muscleMassKg) : undefined,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return filteredData;
  }, [measurements, timeRange]);

  // Get enabled measurement types that have data
  const enabledMeasurements = useMemo(() => {
    return measurementTypes.filter(type => {
      if (!type.enabled) return false;

      // Check if there's at least one data point with this measurement
      return chartData.some(point => {
        const value = point[type.key as keyof BodyMeasurementDataPoint];
        return typeof value === 'number' && !isNaN(value);
      });
    });
  }, [measurementTypes, chartData]);

  const toggleMeasurement = (key: string) => {
    setMeasurementTypes(prev =>
      prev.map(type =>
        type.key === key ? { ...type, enabled: !type.enabled } : type
      )
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as BodyMeasurementDataPoint;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <p className="font-medium mb-2">{data.displayDate}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value?.toFixed(1)} {
                measurementTypes.find(t => t.key === entry.dataKey)?.unit || 'cm'
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Ruler className="mr-2 h-4 w-4" />
            Body Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Ruler className="mr-2 h-4 w-4" />
            Body Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-red-500">Failed to load measurement data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Ruler className="mr-2 h-4 w-4" />
            Body Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No measurement data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (enabledMeasurements.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Ruler className="mr-2 h-4 w-4" />
            Body Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center flex-col gap-2">
            <p className="text-gray-500">No measurements selected or available</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Select Measurements
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium">Select measurements to display</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {measurementTypes.map((type) => (
                      <div key={type.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.key}
                          checked={type.enabled}
                          onCheckedChange={() => toggleMeasurement(type.key)}
                        />
                        <label
                          htmlFor={type.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center">
            <Ruler className="mr-2 h-4 w-4" />
            Body Measurements
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            {/* Time Range Selector */}
            <div className="flex rounded-md border border-gray-200 overflow-hidden">
              {timeRanges.map((range) => (
                <Button
                  key={range.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none border-0 text-xs",
                    timeRange.value === range.value
                      ? "bg-blue-100 text-blue-700"
                      : "hover:bg-gray-100"
                  )}
                  onClick={() => setTimeRange(range)}
                >
                  {range.label}
                </Button>
              ))}
            </div>

            {/* Measurement Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium">Select measurements to display</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {measurementTypes.map((type) => (
                      <div key={type.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.key}
                          checked={type.enabled}
                          onCheckedChange={() => toggleMeasurement(type.key)}
                        />
                        <label
                          htmlFor={type.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="line"
              />

              {enabledMeasurements.map((measurement) => (
                <Line
                  key={measurement.key}
                  type="monotone"
                  dataKey={measurement.key}
                  name={measurement.label}
                  stroke={measurement.color}
                  strokeWidth={2}
                  dot={{ fill: measurement.color, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: measurement.color, strokeWidth: 2 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats for enabled measurements */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {enabledMeasurements.map((measurement) => {
            const values = chartData
              .map(d => d[measurement.key as keyof BodyMeasurementDataPoint])
              .filter((v): v is number => typeof v === 'number' && !isNaN(v));

            if (values.length === 0) return null;

            const latest = values[values.length - 1];
            const average = values.reduce((sum, val) => sum + val, 0) / values.length;

            return (
              <div key={measurement.key} className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: measurement.color }}
                  />
                  <p className="text-xs text-gray-500">{measurement.label}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm">
                    {latest.toFixed(1)} {measurement.unit}
                  </p>
                  <p className="text-xs text-gray-400">
                    Avg: {average.toFixed(1)} {measurement.unit}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BodyMeasurementChart;