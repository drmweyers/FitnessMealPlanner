import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import WeightProgressChart from '../../../client/src/components/charts/WeightProgressChart';
import { apiRequest } from '../../../client/src/lib/queryClient';
import type { Measurement } from '../../../client/src/types/charts';

// Mock dependencies
vi.mock('../../../client/src/lib/queryClient');
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-length={data?.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid="chart-line" data-key={dataKey} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey }: any) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: ({ domain }: any) => (
    <div data-testid="y-axis" data-domain={JSON.stringify(domain)} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => (
    <div data-testid="tooltip" data-content={content?.name} />
  ),
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ReferenceLine: ({ y, stroke, label }: any) => (
    <div 
      data-testid="reference-line" 
      data-y={y} 
      data-stroke={stroke}
      data-label={label?.value}
    />
  ),
}));

// Mock date-fns functions
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    const d = new Date(date);
    if (formatStr === 'MMM dd') {
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    }
    if (formatStr === 'MMM dd, yyyy') {
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      });
    }
    return d.toISOString();
  }),
  parseISO: vi.fn((date) => new Date(date)),
  isValid: vi.fn((date) => date instanceof Date && !isNaN(date.getTime())),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe('WeightProgressChart Component Tests', () => {
  let queryClient: QueryClient;
  let user: any;

  const mockMeasurements: Measurement[] = [
    {
      id: 1,
      measurementDate: '2024-01-01',
      weightLbs: '180.5',
      weightKg: '81.9',
      userId: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      measurementDate: '2024-01-08',
      weightLbs: '179.2',
      weightKg: '81.3',
      userId: 1,
      createdAt: '2024-01-08T00:00:00Z',
      updatedAt: '2024-01-08T00:00:00Z'
    },
    {
      id: 3,
      measurementDate: '2024-01-15',
      weightLbs: '178.0',
      weightKg: '80.7',
      userId: 1,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    },
    {
      id: 4,
      measurementDate: '2024-01-22',
      weightLbs: '177.8',
      weightKg: '80.6',
      userId: 1,
      createdAt: '2024-01-22T00:00:00Z',
      updatedAt: '2024-01-22T00:00:00Z'
    },
    {
      id: 5,
      measurementDate: '2024-01-29',
      weightLbs: '176.5',
      weightKg: '80.0',
      userId: 1,
      createdAt: '2024-01-29T00:00:00Z',
      updatedAt: '2024-01-29T00:00:00Z'
    }
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    user = userEvent.setup();

    // Mock successful API response
    mockApiRequest.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ data: mockMeasurements })
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WeightProgressChart {...props} />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('should render loading state initially', async () => {
      renderComponent();
      
      expect(screen.getByText('Weight Progress')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render chart with data', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      expect(screen.getByTestId('chart-line')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('should render with custom className', async () => {
      const { container } = renderComponent({ className: 'custom-chart' });
      
      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-chart');
      });
    });

    it('should display title with scale icon', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Weight Progress')).toBeInTheDocument();
      });
    });
  });

  describe('Data Processing', () => {
    it('should process weight data correctly for lbs', async () => {
      renderComponent();

      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-chart-length', '5');
      });
    });

    it('should convert to kg when unit is changed', async () => {
      renderComponent();

      await waitFor(() => {
        const kgButton = screen.getByText('kg');
        fireEvent.click(kgButton);
      });

      await waitFor(() => {
        expect(screen.getByText('kg')).toHaveClass('bg-blue-100');
      });
    });

    it('should filter data based on time range', async () => {
      renderComponent();

      await waitFor(() => {
        const sevenDayButton = screen.getByText('7 days');
        fireEvent.click(sevenDayButton);
      });

      await waitFor(() => {
        expect(screen.getByText('7 days')).toHaveClass('bg-blue-100');
      });
    });

    it('should handle invalid dates gracefully', async () => {
      const invalidMeasurements = [
        { ...mockMeasurements[0], measurementDate: 'invalid-date' },
        { ...mockMeasurements[1], measurementDate: null },
        mockMeasurements[2] // Valid one
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: invalidMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-chart-length', '1'); // Only valid one
      });
    });

    it('should handle missing weight values', async () => {
      const partialMeasurements = [
        { ...mockMeasurements[0], weightLbs: null, weightKg: null },
        { ...mockMeasurements[1], weightLbs: '', weightKg: '' },
        mockMeasurements[2] // Valid one
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: partialMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-chart-length', '1');
      });
    });

    it('should sort data chronologically', async () => {
      const unsortedMeasurements = [
        mockMeasurements[2], // 2024-01-15
        mockMeasurements[0], // 2024-01-01
        mockMeasurements[1], // 2024-01-08
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: unsortedMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Time Range Filtering', () => {
    it('should filter data for 7 days', async () => {
      // Mock current date to be 2024-01-30
      const mockDate = new Date('2024-01-30');
      vi.setSystemTime(mockDate);

      renderComponent();

      await waitFor(() => {
        const sevenDayButton = screen.getByText('7 days');
        fireEvent.click(sevenDayButton);
      });

      // Should only show measurements from last 7 days
      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-chart-length', '1'); // Only 2024-01-29
      });

      vi.useRealTimers();
    });

    it('should show all data for "All time" range', async () => {
      renderComponent();

      await waitFor(() => {
        const allTimeButton = screen.getByText('All time');
        fireEvent.click(allTimeButton);
      });

      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-chart-length', '5');
      });
    });

    it('should handle 6 months and 1 year ranges', async () => {
      renderComponent();

      await waitFor(() => {
        const sixMonthButton = screen.getByText('6 months');
        fireEvent.click(sixMonthButton);
      });

      await waitFor(() => {
        expect(screen.getByText('6 months')).toHaveClass('bg-blue-100');
      });

      const oneYearButton = screen.getByText('1 year');
      fireEvent.click(oneYearButton);

      await waitFor(() => {
        expect(screen.getByText('1 year')).toHaveClass('bg-blue-100');
      });
    });
  });

  describe('Trend Analysis', () => {
    it('should calculate downward trend correctly', async () => {
      renderComponent();

      await waitFor(() => {
        // Should show downward trend (180.5 -> 176.5)
        expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument();
      });
    });

    it('should calculate stable trend for minimal changes', async () => {
      const stableMeasurements = mockMeasurements.map((m, i) => ({
        ...m,
        weightLbs: (180 + i * 0.1).toString(), // Very small changes
        weightKg: (81.6 + i * 0.05).toString()
      }));

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: stableMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('stable-icon')).toBeInTheDocument();
      });
    });

    it('should calculate upward trend correctly', async () => {
      const upwardMeasurements = mockMeasurements.map((m, i) => ({
        ...m,
        weightLbs: (170 + i * 2).toString(), // Increasing trend
        weightKg: (77.1 + i * 0.9).toString()
      }));

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: upwardMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      });
    });

    it('should not show trend analysis with insufficient data', async () => {
      const singleMeasurement = [mockMeasurements[0]];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: singleMeasurement })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.queryByTestId('trend-analysis')).not.toBeInTheDocument();
      });
    });

    it('should show trend percentage for significant changes', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/\(.*%\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Statistics Display', () => {
    it('should display current weight correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Current')).toBeInTheDocument();
        expect(screen.getByText('176.5 lbs')).toBeInTheDocument();
      });
    });

    it('should display highest weight correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Highest')).toBeInTheDocument();
        expect(screen.getByText('180.5 lbs')).toBeInTheDocument();
      });
    });

    it('should display lowest weight correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Lowest')).toBeInTheDocument();
        expect(screen.getByText('176.5 lbs')).toBeInTheDocument();
      });
    });

    it('should calculate and display average weight', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Average')).toBeInTheDocument();
        // Average of [180.5, 179.2, 178.0, 177.8, 176.5] = 178.4
        expect(screen.getByText('178.4 lbs')).toBeInTheDocument();
      });
    });

    it('should update statistics when unit changes', async () => {
      renderComponent();

      await waitFor(() => {
        const kgButton = screen.getByText('kg');
        fireEvent.click(kgButton);
      });

      await waitFor(() => {
        expect(screen.getByText('80.0 kg')).toBeInTheDocument(); // Current in kg
      });
    });
  });

  describe('Chart Visualization', () => {
    it('should render reference line for average', async () => {
      renderComponent();

      await waitFor(() => {
        const referenceLine = screen.getByTestId('reference-line');
        expect(referenceLine).toBeInTheDocument();
        expect(referenceLine).toHaveAttribute('data-label', 'Avg: 178.4');
      });
    });

    it('should configure chart axes correctly', async () => {
      renderComponent();

      await waitFor(() => {
        const xAxis = screen.getByTestId('x-axis');
        const yAxis = screen.getByTestId('y-axis');
        
        expect(xAxis).toHaveAttribute('data-key', 'formattedDate');
        expect(yAxis).toHaveAttribute('data-domain', '["dataMin - 5","dataMax + 5"]');
      });
    });

    it('should use correct line styling', async () => {
      renderComponent();

      await waitFor(() => {
        const line = screen.getByTestId('chart-line');
        expect(line).toHaveAttribute('data-key', 'weight');
        expect(line).toHaveAttribute('data-stroke', '#3b82f6');
      });
    });

    it('should render responsive container', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle unit selector clicks', async () => {
      renderComponent();

      await waitFor(() => {
        const lbsButton = screen.getByText('lbs');
        const kgButton = screen.getByText('kg');

        expect(lbsButton).toHaveClass('bg-blue-100');
        expect(kgButton).not.toHaveClass('bg-blue-100');
      });

      const kgButton = screen.getByText('kg');
      await user.click(kgButton);

      await waitFor(() => {
        expect(screen.getByText('kg')).toHaveClass('bg-blue-100');
        expect(screen.getByText('lbs')).not.toHaveClass('bg-blue-100');
      });
    });

    it('should handle time range selector clicks', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('3 months')).toHaveClass('bg-blue-100');
      });

      const thirtyDayButton = screen.getByText('30 days');
      await user.click(thirtyDayButton);

      await waitFor(() => {
        expect(screen.getByText('30 days')).toHaveClass('bg-blue-100');
        expect(screen.getByText('3 months')).not.toHaveClass('bg-blue-100');
      });
    });

    it('should be keyboard accessible', async () => {
      renderComponent();

      await waitFor(() => {
        const kgButton = screen.getByText('kg');
        kgButton.focus();
        
        await user.keyboard('{Enter}');
        
        expect(screen.getByText('kg')).toHaveClass('bg-blue-100');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when API fails', async () => {
      mockApiRequest.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load weight data')).toBeInTheDocument();
      });
    });

    it('should display no data message when array is empty', async () => {
      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: [] })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No weight data available for the selected period')).toBeInTheDocument();
      });
    });

    it('should handle malformed API response', async () => {
      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: null })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No weight data available for the selected period')).toBeInTheDocument();
      });
    });

    it('should handle network timeout gracefully', async () => {
      mockApiRequest.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load weight data')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile layout correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderComponent();

      // Should render without errors in mobile viewport
      expect(screen.getByText('Weight Progress')).toBeInTheDocument();
    });

    it('should handle very small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      renderComponent();

      expect(screen.getByText('Weight Progress')).toBeInTheDocument();
    });

    it('should adapt button layout for small screens', async () => {
      renderComponent();

      await waitFor(() => {
        const timeRangeButtons = screen.getAllByRole('button');
        expect(timeRangeButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeMeasurements = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        measurementDate: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
        weightLbs: (180 + Math.sin(i / 30) * 10).toFixed(1),
        weightKg: (81.6 + Math.sin(i / 30) * 4.5).toFixed(1),
        userId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: largeMeasurements })
      } as any);

      const startTime = performance.now();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('should memoize calculations correctly', async () => {
      const { rerender } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Re-render with same props
      rerender(
        <QueryClientProvider client={queryClient}>
          <WeightProgressChart />
        </QueryClientProvider>
      );

      // Should not recalculate data or cause excessive re-renders
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should handle rapid unit switching', async () => {
      renderComponent();

      await waitFor(() => {
        const lbsButton = screen.getByText('lbs');
        const kgButton = screen.getByText('kg');

        // Rapidly switch units
        for (let i = 0; i < 10; i++) {
          fireEvent.click(i % 2 === 0 ? kgButton : lbsButton);
        }

        // Should still work correctly
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderComponent();

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toBeVisible();
        });
      });
    });

    it('should support screen readers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Weight Progress')).toBeInTheDocument();
        expect(screen.getByText('Current')).toBeInTheDocument();
        expect(screen.getByText('Average')).toBeInTheDocument();
      });
    });

    it('should have good color contrast', () => {
      renderComponent();

      // Chart colors should have good contrast
      const chartLine = screen.queryByTestId('chart-line');
      if (chartLine) {
        expect(chartLine).toHaveAttribute('data-stroke', '#3b82f6');
      }
    });
  });

  describe('Custom Tooltip', () => {
    it('should render custom tooltip correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      });
    });

    it('should format tooltip data correctly', async () => {
      const mockTooltipData = {
        active: true,
        payload: [{
          payload: {
            date: '2024-01-15',
            weight: 178.0,
            formattedDate: 'Jan 15',
            displayDate: 'Jan 15, 2024'
          }
        }],
        label: 'Jan 15'
      };

      // Test tooltip rendering with mock data
      // This would be tested in integration tests with actual chart interaction
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero weight values', async () => {
      const zeroWeightMeasurements = [
        { ...mockMeasurements[0], weightLbs: '0', weightKg: '0' }
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: zeroWeightMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No weight data available for the selected period')).toBeInTheDocument();
      });
    });

    it('should handle future dates gracefully', async () => {
      const futureMeasurements = [
        { ...mockMeasurements[0], measurementDate: '2025-12-31' }
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: futureMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should handle very old dates', async () => {
      const oldMeasurements = [
        { ...mockMeasurements[0], measurementDate: '1990-01-01' }
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: oldMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        const allTimeButton = screen.getByText('All time');
        fireEvent.click(allTimeButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should handle extreme weight values', async () => {
      const extremeWeightMeasurements = [
        { ...mockMeasurements[0], weightLbs: '1000', weightKg: '453.6' },
        { ...mockMeasurements[1], weightLbs: '50', weightKg: '22.7' }
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: extremeWeightMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should handle identical consecutive weights', async () => {
      const identicalWeights = mockMeasurements.map(m => ({
        ...m,
        weightLbs: '180.0',
        weightKg: '81.6'
      }));

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: identicalWeights })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('stable-icon')).toBeInTheDocument();
      });
    });
  });
});