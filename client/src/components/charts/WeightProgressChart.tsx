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
  ReferenceLine,
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Measurement,
  WeightDataPoint,
  WeightUnit,
  ChartTimeRange,
  WeightTrendAnalysis
} from '@/types/charts';

interface WeightProgressChartProps {
  className?: string;
}

const WeightProgressChart: React.FC<WeightProgressChartProps> = ({ className }) => {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>({ value: 'lbs', label: 'lbs' });
  const [timeRange, setTimeRange] = useState<ChartTimeRange>({ value: '90d', label: '3 months' });

  const weightUnits: WeightUnit[] = [
    { value: 'lbs', label: 'lbs' },
    { value: 'kg', label: 'kg' },
  ];

  const timeRanges: ChartTimeRange[] = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '3 months' },
    { value: '6m', label: '6 months' },
    { value: '1y', label: '1 year' },
    { value: 'all', label: 'All time' },
  ];

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
  const chartData = useMemo((): WeightDataPoint[] => {
    if (!measurements) return [];

    const filteredData = measurements
      .filter((measurement) => {
        const weightValue = weightUnit.value === 'lbs'
          ? measurement.weightLbs
          : measurement.weightKg;

        if (!weightValue || !measurement.measurementDate) return false;

        // Apply time range filter
        const measurementDate = new Date(measurement.measurementDate);
        if (!isValid(measurementDate)) return false;

        const now = new Date();
        const cutoffDate = new Date();

        switch (timeRange.value) {
          case '7d':
            cutoffDate.setDate(now.getDate() - 7);
            break;
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
      .map((measurement): WeightDataPoint => {
        const date = new Date(measurement.measurementDate);
        const weight = parseFloat(
          weightUnit.value === 'lbs'
            ? measurement.weightLbs!
            : measurement.weightKg!
        );

        return {
          date: measurement.measurementDate,
          weight,
          formattedDate: format(date, 'MMM dd'),
          displayDate: format(date, 'MMM dd, yyyy'),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return filteredData;
  }, [measurements, weightUnit, timeRange]);

  // Calculate trend analysis
  const trendAnalysis = useMemo((): WeightTrendAnalysis | null => {
    if (chartData.length < 2) return null;

    const recent = chartData.slice(-5); // Last 5 measurements
    const older = chartData.slice(-10, -5); // Previous 5 measurements

    if (recent.length === 0 || older.length === 0) return null;

    const recentAvg = recent.reduce((sum, point) => sum + point.weight, 0) / recent.length;
    const olderAvg = older.reduce((sum, point) => sum + point.weight, 0) / older.length;

    const change = recentAvg - olderAvg;
    const changePercentage = Math.abs((change / olderAvg) * 100);

    const trend = {
      trend: Math.abs(change) < 0.5 ? 'stable' as const : change > 0 ? 'up' as const : 'down' as const,
      percentage: changePercentage,
      direction: Math.abs(change) < 0.5 ? 0 as const : change > 0 ? 1 as const : -1 as const,
    };

    return {
      current: recentAvg,
      previous: olderAvg,
      change,
      changePercentage,
      trend,
      period: `last ${recent.length} measurements`,
    };
  }, [chartData]);

  // Calculate average line
  const averageWeight = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((sum, point) => sum + point.weight, 0) / chartData.length;
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as WeightDataPoint;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium">{data.displayDate}</p>
          <p className="text-blue-600">
            Weight: {data.weight.toFixed(1)} {weightUnit.label}
          </p>
        </div>
      );
    }
    return null;
  };

  const TrendIcon = ({ trend }: { trend: WeightTrendAnalysis['trend'] }) => {
    switch (trend.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Scale className="mr-2 h-4 w-4" />
            Weight Progress
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
            <Scale className="mr-2 h-4 w-4" />
            Weight Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-red-500">Failed to load weight data</p>
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
            <Scale className="mr-2 h-4 w-4" />
            Weight Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No weight data available for the selected period</p>
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
            <Scale className="mr-2 h-4 w-4" />
            Weight Progress
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

            {/* Unit Selector */}
            <div className="flex rounded-md border border-gray-200 overflow-hidden">
              {weightUnits.map((unit) => (
                <Button
                  key={unit.value}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none border-0 text-xs",
                    weightUnit.value === unit.value
                      ? "bg-blue-100 text-blue-700"
                      : "hover:bg-gray-100"
                  )}
                  onClick={() => setWeightUnit(unit)}
                >
                  {unit.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Trend Analysis */}
        {trendAnalysis && (
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
            <div className="flex items-center gap-1">
              <TrendIcon trend={trendAnalysis.trend} />
              <span>
                {Math.abs(trendAnalysis.change).toFixed(1)} {weightUnit.label}
                {trendAnalysis.trend.trend !== 'stable' && (
                  <span className="ml-1">
                    ({trendAnalysis.changePercentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
            <span className="text-xs">over {trendAnalysis.period}</span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="h-64 w-full">
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
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Average line */}
              {averageWeight && (
                <ReferenceLine
                  y={averageWeight}
                  stroke="#9ca3af"
                  strokeDasharray="5 5"
                  label={{ value: `Avg: ${averageWeight.toFixed(1)}`, position: 'top' }}
                />
              )}

              <Line
                type="monotone"
                dataKey="weight"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
          {chartData.length > 0 && (
            <>
              <div>
                <p className="text-xs text-gray-500">Current</p>
                <p className="font-semibold">
                  {chartData[chartData.length - 1]?.weight.toFixed(1)} {weightUnit.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Highest</p>
                <p className="font-semibold">
                  {Math.max(...chartData.map(d => d.weight)).toFixed(1)} {weightUnit.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Lowest</p>
                <p className="font-semibold">
                  {Math.min(...chartData.map(d => d.weight)).toFixed(1)} {weightUnit.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Average</p>
                <p className="font-semibold">
                  {averageWeight?.toFixed(1)} {weightUnit.label}
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeightProgressChart;