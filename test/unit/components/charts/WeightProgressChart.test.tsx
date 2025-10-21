import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeightProgressChart } from '@/components/charts/WeightProgressChart';

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
  Legend: (props: any) => <div data-testid="legend" data-legend-props={JSON.stringify(props)} />,
  ReferenceLine: (props: any) => <div data-testid="reference-line" data-ref-props={JSON.stringify(props)} />
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
  isValid: (date: any) => date instanceof Date && !isNaN(date.getTime()),
  subDays: (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000),
  addDays: (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}));

const mockWeightData = [
  {
    id: '1',
    customerId: 'customer-1',
    recordedAt: '2024-01-01T00:00:00Z',
    measurements: { weight: 180.5 }
  },
  {
    id: '2',
    customerId: 'customer-1',
    recordedAt: '2024-01-08T00:00:00Z',
    measurements: { weight: 179.2 }
  },
  {
    id: '3',
    customerId: 'customer-1',
    recordedAt: '2024-01-15T00:00:00Z',
    measurements: { weight: 177.8 }
  },
  {
    id: '4',
    customerId: 'customer-1',
    recordedAt: '2024-01-22T00:00:00Z',
    measurements: { weight: 176.5 }
  },
  {
    id: '5',
    customerId: 'customer-1',
    recordedAt: '2024-01-29T00:00:00Z',
    measurements: { weight: 175.1 }
  }
];

describe('WeightProgressChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render chart container', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render with empty data', () => {
      render(<WeightProgressChart data={[]} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render chart components', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      expect(screen.getByTestId('line')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should display correct chart data', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      expect(parsedData).toHaveLength(5);
      expect(parsedData[0]).toMatchObject({
        date: expect.any(String),
        weight: 180.5
      });
      expect(parsedData[4]).toMatchObject({
        date: expect.any(String),
        weight: 175.1
      });
    });
  });

  describe('Data Processing', () => {
    it('should handle missing weight measurements', () => {
      const dataWithMissingWeight = [
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: '2024-01-01T00:00:00Z',
          measurements: { bodyFat: 15.5 } // No weight
        },
        {
          id: '2',
          customerId: 'customer-1',
          recordedAt: '2024-01-08T00:00:00Z',
          measurements: { weight: 179.2 }
        }
      ];

      render(<WeightProgressChart data={dataWithMissingWeight} />);

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      // Should only include entries with weight data
      expect(parsedData).toHaveLength(1);
      expect(parsedData[0].weight).toBe(179.2);
    });

    it('should sort data by date', () => {
      const unsortedData = [
        {
          id: '2',
          customerId: 'customer-1',
          recordedAt: '2024-01-15T00:00:00Z',
          measurements: { weight: 177.8 }
        },
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: '2024-01-01T00:00:00Z',
          measurements: { weight: 180.5 }
        },
        {
          id: '3',
          customerId: 'customer-1',
          recordedAt: '2024-01-08T00:00:00Z',
          measurements: { weight: 179.2 }
        }
      ];

      render(<WeightProgressChart data={unsortedData} />);

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      // Should be sorted chronologically
      expect(parsedData[0].weight).toBe(180.5); // Jan 1
      expect(parsedData[1].weight).toBe(179.2); // Jan 8
      expect(parsedData[2].weight).toBe(177.8); // Jan 15
    });

    it('should handle invalid dates gracefully', () => {
      const dataWithInvalidDate = [
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: 'invalid-date',
          measurements: { weight: 180.5 }
        },
        {
          id: '2',
          customerId: 'customer-1',
          recordedAt: '2024-01-08T00:00:00Z',
          measurements: { weight: 179.2 }
        }
      ];

      render(<WeightProgressChart data={dataWithInvalidDate} />);

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      // Should only include valid dates
      expect(parsedData).toHaveLength(1);
      expect(parsedData[0].weight).toBe(179.2);
    });
  });

  describe('Chart Configuration', () => {
    it('should set correct line properties', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      const line = screen.getByTestId('line');
      const lineProps = JSON.parse(line.getAttribute('data-line-props') || '{}');

      expect(lineProps).toMatchObject({
        type: 'monotone',
        dataKey: 'weight',
        stroke: expect.any(String),
        strokeWidth: expect.any(Number),
        dot: expect.any(Object)
      });
    });

    it('should configure axes correctly', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      const xAxis = screen.getByTestId('x-axis');
      const yAxis = screen.getByTestId('y-axis');

      const xAxisProps = JSON.parse(xAxis.getAttribute('data-axis-props') || '{}');
      const yAxisProps = JSON.parse(yAxis.getAttribute('data-axis-props') || '{}');

      expect(xAxisProps.dataKey).toBe('date');
      expect(yAxisProps.domain).toEqual(['dataMin - 5', 'dataMax + 5']);
    });

    it('should configure grid properties', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      const grid = screen.getByTestId('grid');
      const gridProps = JSON.parse(grid.getAttribute('data-grid-props') || '{}');

      expect(gridProps).toHaveProperty('strokeDasharray');
    });
  });

  describe('Goal Line', () => {
    it('should render goal line when provided', () => {
      render(<WeightProgressChart data={mockWeightData} goalWeight={170} />);

      const referenceLine = screen.getByTestId('reference-line');
      const refProps = JSON.parse(referenceLine.getAttribute('data-ref-props') || '{}');

      expect(refProps).toMatchObject({
        y: 170,
        stroke: expect.any(String),
        strokeDasharray: expect.any(String),
        label: expect.objectContaining({
          value: 'Goal: 170 lbs'
        })
      });
    });

    it('should not render goal line when not provided', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument();
    });

    it('should handle zero goal weight', () => {
      render(<WeightProgressChart data={mockWeightData} goalWeight={0} />);

      expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render in responsive container', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });

    it('should handle different container widths', () => {
      const { rerender } = render(<WeightProgressChart data={mockWeightData} width={800} />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();

      rerender(<WeightProgressChart data={mockWeightData} width={400} />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle height prop', () => {
      render(<WeightProgressChart data={mockWeightData} height={200} />);

      const chartContainer = screen.getByTestId('responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Tooltip Behavior', () => {
    it('should render tooltip component', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should configure tooltip props', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      const tooltip = screen.getByTestId('tooltip');
      const tooltipProps = JSON.parse(tooltip.getAttribute('data-tooltip-props') || '{}');

      expect(tooltipProps).toHaveProperty('contentStyle');
      expect(tooltipProps).toHaveProperty('labelStyle');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible structure', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      // Chart should be present and accessible
      const chart = screen.getByTestId('line-chart');
      expect(chart).toBeInTheDocument();
    });

    it('should work with screen readers', () => {
      render(<WeightProgressChart data={mockWeightData} />);

      // Should render chart data in a readable format
      const chartData = screen.getByTestId('chart-data');
      expect(chartData).toHaveTextContent('180.5');
      expect(chartData).toHaveTextContent('175.1');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array(1000).fill(0).map((_, index) => ({
        id: `measurement-${index}`,
        customerId: 'customer-1',
        recordedAt: new Date(2024, 0, 1 + index).toISOString(),
        measurements: { weight: 180 - (index * 0.1) }
      }));

      const startTime = performance.now();
      render(<WeightProgressChart data={largeDataset} />);
      const endTime = performance.now();

      // Should render in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should memoize chart data processing', () => {
      const { rerender } = render(<WeightProgressChart data={mockWeightData} />);

      // Get initial chart data
      const initialData = screen.getByTestId('chart-data').textContent;

      // Rerender with same data
      rerender(<WeightProgressChart data={mockWeightData} />);

      // Data should be identical (memoized)
      const rerenderedData = screen.getByTestId('chart-data').textContent;
      expect(rerenderedData).toBe(initialData);
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined data gracefully', () => {
      render(<WeightProgressChart data={null as any} />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle malformed data entries', () => {
      const malformedData = [
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: '2024-01-01T00:00:00Z',
          measurements: { weight: 180.5 }
        },
        {
          // Missing required fields
          id: '2',
          measurements: null
        } as any,
        {
          id: '3',
          customerId: 'customer-1',
          recordedAt: '2024-01-15T00:00:00Z',
          measurements: { weight: 177.8 }
        }
      ];

      render(<WeightProgressChart data={malformedData} />);

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      // Should only include valid entries
      expect(parsedData).toHaveLength(2);
      expect(parsedData.every((entry: any) => typeof entry.weight === 'number')).toBe(true);
    });

    it('should handle non-numeric weight values', () => {
      const invalidWeightData = [
        {
          id: '1',
          customerId: 'customer-1',
          recordedAt: '2024-01-01T00:00:00Z',
          measurements: { weight: 'invalid' as any }
        },
        {
          id: '2',
          customerId: 'customer-1',
          recordedAt: '2024-01-08T00:00:00Z',
          measurements: { weight: 179.2 }
        }
      ];

      render(<WeightProgressChart data={invalidWeightData} />);

      const chartData = screen.getByTestId('chart-data');
      const parsedData = JSON.parse(chartData.textContent || '[]');

      // Should filter out invalid weight values
      expect(parsedData).toHaveLength(1);
      expect(parsedData[0].weight).toBe(179.2);
    });
  });
});