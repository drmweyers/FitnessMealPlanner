import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BodyMeasurementChart } from '@/components/charts/BodyMeasurementChart';

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data, ...props }: any) => (
    <div data-testid="line-chart" data-chart-props={JSON.stringify(props)}>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      {children}
    </div>
  ),
  Line: (props: any) => <div data-testid="line" data-line-props={JSON.stringify(props)} />,
  XAxis: (props: any) => <div data-testid="x-axis" data-axis-props={JSON.stringify(props)} />,
  YAxis: (props: any) => <div data-testid="y-axis" data-axis-props={JSON.stringify(props)} />,
  CartesianGrid: (props: any) => <div data-testid="grid" data-grid-props={JSON.stringify(props)} />,
  Tooltip: (props: any) => <div data-testid="tooltip" data-tooltip-props={JSON.stringify(props)} />,
  Legend: (props: any) => <div data-testid="legend" data-legend-props={JSON.stringify(props)} />
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    if (formatStr === 'MMM dd') {
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    }
    return date.toLocaleDateString();
  },
  parseISO: (dateStr: string) => new Date(dateStr),
  isValid: (date: any) => date instanceof Date && !isNaN(date.getTime())
}));

const mockBodyMeasurementData = [
  {
    id: '1',
    customerId: 'customer-1',
    recordedAt: '2024-01-01T00:00:00Z',
    measurements: {
      neck: 16.5,
      shoulders: 46.2,
      chest: 42.8,
      waist: 34.1,
      hips: 38.9,
      biceps: 14.8,
      thighs: 24.6,
      calves: 15.2,
      bodyFat: 18.5
    }
  },
  {
    id: '2',
    customerId: 'customer-1',
    recordedAt: '2024-01-15T00:00:00Z',
    measurements: {
      neck: 16.3,
      shoulders: 46.5,
      chest: 43.1,
      waist: 33.7,
      hips: 38.6,
      biceps: 15.1,
      thighs: 24.8,
      calves: 15.4,
      bodyFat: 17.8
    }
  },
  {
    id: '3',
    customerId: 'customer-1',
    recordedAt: '2024-02-01T00:00:00Z',
    measurements: {
      neck: 16.1,
      shoulders: 46.8,
      chest: 43.4,
      waist: 33.3,
      hips: 38.3,
      biceps: 15.4,
      thighs: 25.0,
      calves: 15.6,
      bodyFat: 17.1
    }
  }
];

describe('BodyMeasurementChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render chart container', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist', 'chest']}
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render with empty data', () => {
      render(
        <BodyMeasurementChart
          data={[]}
          selectedMeasurements={['waist']}
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render legend when multiple measurements selected', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist', 'chest', 'biceps']}
        />
      );

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should not render legend for single measurement', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist']}
        />
      );

      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('should process selected measurements correctly', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist', 'chest']}
        />
      );

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      expect(parsedData).toHaveLength(3);
      expect(parsedData[0]).toHaveProperty('waist', 34.1);
      expect(parsedData[0]).toHaveProperty('chest', 42.8);
      expect(parsedData[0]).toHaveProperty('date');
    });

    it('should handle missing measurements gracefully', () => {
      const dataWithMissingMeasurements = [
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: '2024-01-01T00:00:00Z',
          measurements: {
            waist: 34.1,
            // chest missing
          }
        },
        {
          id: '2',
          customerId: 'customer-1',
          recordedAt: '2024-01-15T00:00:00Z',
          measurements: {
            waist: 33.7,
            chest: 43.1
          }
        }
      ];

      render(
        <BodyMeasurementChart
          data={dataWithMissingMeasurements}
          selectedMeasurements={['waist', 'chest']}
        />
      );

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      expect(parsedData).toHaveLength(2);
      expect(parsedData[0]).toHaveProperty('waist', 34.1);
      expect(parsedData[0]).not.toHaveProperty('chest');
      expect(parsedData[1]).toHaveProperty('chest', 43.1);
    });

    it('should sort data chronologically', () => {
      const unsortedData = [
        {
          id: '2',
          customerId: 'customer-1',
          recordedAt: '2024-02-01T00:00:00Z',
          measurements: { waist: 33.3 }
        },
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: '2024-01-01T00:00:00Z',
          measurements: { waist: 34.1 }
        },
        {
          id: '3',
          customerId: 'customer-1',
          recordedAt: '2024-01-15T00:00:00Z',
          measurements: { waist: 33.7 }
        }
      ];

      render(
        <BodyMeasurementChart
          data={unsortedData}
          selectedMeasurements={['waist']}
        />
      );

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      // Should be sorted chronologically
      expect(parsedData[0].waist).toBe(34.1); // Jan 1
      expect(parsedData[1].waist).toBe(33.7); // Jan 15
      expect(parsedData[2].waist).toBe(33.3); // Feb 1
    });

    it('should filter out invalid measurements', () => {
      const dataWithInvalidMeasurements = [
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: '2024-01-01T00:00:00Z',
          measurements: {
            waist: 34.1,
            chest: 'invalid' as any,
            biceps: null as any
          }
        },
        {
          id: '2',
          customerId: 'customer-1',
          recordedAt: '2024-01-15T00:00:00Z',
          measurements: {
            waist: 33.7,
            chest: 43.1,
            biceps: 15.1
          }
        }
      ];

      render(
        <BodyMeasurementChart
          data={dataWithInvalidMeasurements}
          selectedMeasurements={['waist', 'chest', 'biceps']}
        />
      );

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      expect(parsedData[0]).toHaveProperty('waist', 34.1);
      expect(parsedData[0]).not.toHaveProperty('chest'); // Invalid value filtered
      expect(parsedData[0]).not.toHaveProperty('biceps'); // Null value filtered
      expect(parsedData[1]).toHaveProperty('chest', 43.1); // Valid value included
    });
  });

  describe('Line Rendering', () => {
    it('should render correct number of lines for selected measurements', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist', 'chest', 'biceps']}
        />
      );

      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(3);

      const lineProps1 = JSON.parse(lines[0].getAttribute('data-line-props') || '{}');
      const lineProps2 = JSON.parse(lines[1].getAttribute('data-line-props') || '{}');
      const lineProps3 = JSON.parse(lines[2].getAttribute('data-line-props') || '{}');

      expect([lineProps1.dataKey, lineProps2.dataKey, lineProps3.dataKey].sort())
        .toEqual(['biceps', 'chest', 'waist']);
    });

    it('should assign different colors to different measurements', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist', 'chest']}
        />
      );

      const lines = screen.getAllByTestId('line');
      const lineProps1 = JSON.parse(lines[0].getAttribute('data-line-props') || '{}');
      const lineProps2 = JSON.parse(lines[1].getAttribute('data-line-props') || '{}');

      expect(lineProps1.stroke).toBeDefined();
      expect(lineProps2.stroke).toBeDefined();
      expect(lineProps1.stroke).not.toBe(lineProps2.stroke);
    });

    it('should handle single measurement selection', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist']}
        />
      );

      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(1);

      const lineProps = JSON.parse(lines[0].getAttribute('data-line-props') || '{}');
      expect(lineProps.dataKey).toBe('waist');
    });
  });

  describe('Measurement Types', () => {
    const measurementTypes = [
      'neck', 'shoulders', 'chest', 'waist', 'hips',
      'biceps', 'thighs', 'calves', 'bodyFat'
    ];

    it('should handle all measurement types', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={measurementTypes}
        />
      );

      const lines = screen.getAllByTestId('line');
      expect(lines.length).toBeGreaterThan(0);

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      // Should have data for all measurements
      expect(parsedData[0]).toHaveProperty('neck');
      expect(parsedData[0]).toHaveProperty('shoulders');
      expect(parsedData[0]).toHaveProperty('chest');
      expect(parsedData[0]).toHaveProperty('bodyFat');
    });

    it('should handle measurement selection changes', () => {
      const { rerender } = render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist']}
        />
      );

      expect(screen.getAllByTestId('line')).toHaveLength(1);

      rerender(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist', 'chest', 'biceps']}
        />
      );

      expect(screen.getAllByTestId('line')).toHaveLength(3);
    });

    it('should handle empty measurement selection', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={[]}
        />
      );

      expect(screen.queryAllByTestId('line')).toHaveLength(0);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Chart Configuration', () => {
    it('should configure axes correctly', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist', 'chest']}
        />
      );

      const xAxis = screen.getByTestId('x-axis');
      const yAxis = screen.getByTestId('y-axis');

      const xAxisProps = JSON.parse(xAxis.getAttribute('data-axis-props') || '{}');
      const yAxisProps = JSON.parse(yAxis.getAttribute('data-axis-props') || '{}');

      expect(xAxisProps.dataKey).toBe('date');
      expect(yAxisProps).toHaveProperty('domain');
    });

    it('should configure tooltip', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist']}
        />
      );

      const tooltip = screen.getByTestId('tooltip');
      const tooltipProps = JSON.parse(tooltip.getAttribute('data-tooltip-props') || '{}');

      expect(tooltipProps).toHaveProperty('contentStyle');
      expect(tooltipProps).toHaveProperty('labelStyle');
    });

    it('should configure grid', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist']}
        />
      );

      const grid = screen.getByTestId('grid');
      const gridProps = JSON.parse(grid.getAttribute('data-grid-props') || '{}');

      expect(gridProps).toHaveProperty('strokeDasharray');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render in responsive container', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist']}
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle custom dimensions', () => {
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={['waist']}
          width={800}
          height={400}
        />
      );

      const chart = screen.getByTestId('line-chart');
      expect(chart).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array(500).fill(0).map((_, index) => ({
        id: `measurement-${index}`,
        customerId: 'customer-1',
        recordedAt: new Date(2024, 0, 1 + index).toISOString(),
        measurements: {
          waist: 34 - (index * 0.01),
          chest: 43 + (index * 0.005),
          biceps: 15 + (index * 0.002)
        }
      }));

      const startTime = performance.now();
      render(
        <BodyMeasurementChart
          data={largeDataset}
          selectedMeasurements={['waist', 'chest', 'biceps']}
        />
      );
      const endTime = performance.now();

      // Should render in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle many selected measurements efficiently', () => {
      const allMeasurements = [
        'neck', 'shoulders', 'chest', 'waist', 'hips',
        'biceps', 'thighs', 'calves', 'bodyFat'
      ];

      const startTime = performance.now();
      render(
        <BodyMeasurementChart
          data={mockBodyMeasurementData}
          selectedMeasurements={allMeasurements}
        />
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
      expect(screen.getAllByTestId('line')).toHaveLength(allMeasurements.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined data', () => {
      render(
        <BodyMeasurementChart
          data={null as any}
          selectedMeasurements={['waist']}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle invalid date formats', () => {
      const dataWithInvalidDates = [
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: 'invalid-date',
          measurements: { waist: 34.1 }
        },
        {
          id: '2',
          customerId: 'customer-1',
          recordedAt: '2024-01-15T00:00:00Z',
          measurements: { waist: 33.7 }
        }
      ];

      render(
        <BodyMeasurementChart
          data={dataWithInvalidDates}
          selectedMeasurements={['waist']}
        />
      );

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      // Should filter out invalid dates
      expect(parsedData).toHaveLength(1);
      expect(parsedData[0].waist).toBe(33.7);
    });

    it('should handle empty measurements object', () => {
      const dataWithEmptyMeasurements = [
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: '2024-01-01T00:00:00Z',
          measurements: {}
        },
        {
          id: '2',
          customerId: 'customer-1',
          recordedAt: '2024-01-15T00:00:00Z',
          measurements: { waist: 33.7 }
        }
      ];

      render(
        <BodyMeasurementChart
          data={dataWithEmptyMeasurements}
          selectedMeasurements={['waist']}
        />
      );

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      expect(parsedData).toHaveLength(2);
      expect(parsedData[0]).not.toHaveProperty('waist');
      expect(parsedData[1]).toHaveProperty('waist', 33.7);
    });
  });
});