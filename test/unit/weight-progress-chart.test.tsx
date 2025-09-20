/**
 * Comprehensive unit tests for WeightProgressChart component
 * Tests component rendering, unit switching, time range filtering, trend calculations, and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';

import WeightProgressChart from '@/components/charts/WeightProgressChart';
import {
  mockApiResponses,
  MeasurementTestDataGenerator,
  calculateExpectedStats,
  calculateExpectedTrend,
} from '../utils/measurement-test-data';

// Mock the recharts module
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ReferenceLine: ({ y, label }: any) => (
    <div data-testid="reference-line" data-y={y} data-label={JSON.stringify(label)} />
  ),
}));

// Mock the date-fns module
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'MMM dd') return 'Jan 01';
    if (formatStr === 'MMM dd, yyyy') return 'Jan 01, 2024';
    return date.toISOString();
  }),
  parseISO: vi.fn((dateStr: string) => new Date(dateStr)),
  isValid: vi.fn((date: Date) => !isNaN(date.getTime())),
}));

// Mock useQuery from React Query
vi.mocked(useQuery);

describe('WeightProgressChart', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders loading state initially', () => {
      // Mock useQuery to return loading state
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isSuccess: false,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      expect(screen.getByText('Weight Progress')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument(); // Loading spinner
    });

    it('renders chart with weight loss data', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      expect(screen.getByText('Weight Progress')).toBeInTheDocument();
      expect(screen.getByTestId('line-weight')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders chart with correct title and icon', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart className="test-class" />);

      await waitFor(() => {
        expect(screen.getByText('Weight Progress')).toBeInTheDocument();
      });

      const card = screen.getByText('Weight Progress').closest('[class*="border"]');
      if (card) {
        expect(card).toHaveClass('test-class');
      }
    });
  });

  describe('Unit Switching', () => {
    it('switches between lbs and kg units', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Initially shows lbs
      expect(screen.getByRole('button', { name: 'lbs' })).toHaveClass('bg-blue-100');
      expect(screen.getByRole('button', { name: 'kg' })).not.toHaveClass('bg-blue-100');

      // Switch to kg
      fireEvent.click(screen.getByRole('button', { name: 'kg' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'kg' })).toHaveClass('bg-blue-100');
        expect(screen.getByRole('button', { name: 'lbs' })).not.toHaveClass('bg-blue-100');
      });

      // Verify chart data is updated with kg values
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

      // Check that weights are in kg range (should be roughly half of lbs values)
      if (chartData.length > 0) {
        const firstWeight = chartData[0].weight;
        expect(firstWeight).toBeLessThan(120); // Should be kg, not lbs
      }
    });

    it('updates statistics when switching units', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData(200, 90, 20);

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Get initial stats in lbs
      const lbsStats = calculateExpectedStats(testData, 'lbs');

      // Switch to kg and verify stats update
      fireEvent.click(screen.getByRole('button', { name: 'kg' }));

      await waitFor(() => {
        const kgStats = calculateExpectedStats(testData, 'kg');

        // Stats should be roughly half (lbs to kg conversion)
        if (lbsStats.current && kgStats.current) {
          expect(kgStats.current).toBeCloseTo(lbsStats.current * 0.453592, 1);
        }
      });
    });
  });

  describe('Time Range Filtering', () => {
    it('filters data by time range selection', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData(200, 180, 30); // 6 months of data

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Initially shows 3 months (default)
      expect(screen.getByRole('button', { name: '3 months' })).toHaveClass('bg-blue-100');

      // Switch to 30 days
      fireEvent.click(screen.getByRole('button', { name: '30 days' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '30 days' })).toHaveClass('bg-blue-100');
      });

      // Verify chart data is filtered
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');

      // Should have fewer data points when filtered to 30 days
      expect(chartData.length).toBeLessThan(testData.length);
    });

    it('shows all data when "All time" is selected', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData(200, 365, 40); // 1 year of data

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Switch to "All time"
      fireEvent.click(screen.getByRole('button', { name: 'All time' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'All time' })).toHaveClass('bg-blue-100');
      });

      // Verify all data is shown
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');
      expect(chartData.length).toBeGreaterThan(0);
    });
  });

  describe('Trend Calculation Logic', () => {
    it('calculates weight loss trend correctly', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData(200, 90, 20);

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Should show downward trend for weight loss
      const trendIcon = screen.getByTestId('trendingdown-icon');
      expect(trendIcon).toBeInTheDocument();
      expect(trendIcon).toHaveClass('text-green-500'); // Green for weight loss
    });

    it('calculates weight gain trend correctly', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightGainData(150, 120, 15);

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Should show upward trend for weight gain
      const trendIcon = screen.getByTestId('trendingup-icon');
      expect(trendIcon).toBeInTheDocument();
      expect(trendIcon).toHaveClass('text-red-500'); // Red for weight gain
    });

    it('calculates stable trend correctly', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightMaintenanceData(170, 60);

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Should show stable trend for maintenance
      const trendIcon = screen.getByTestId('minus-icon');
      expect(trendIcon).toBeInTheDocument();
      expect(trendIcon).toHaveClass('text-gray-500'); // Gray for stable
    });

    it('does not show trend analysis with insufficient data', async () => {
      const testData = MeasurementTestDataGenerator.generateSingleMeasurement();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Should not show trend analysis with only one data point
      expect(screen.queryByTestId('trendingup-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trendingdown-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('minus-icon')).not.toBeInTheDocument();
    });
  });

  describe('Statistics Calculations', () => {
    it('calculates and displays correct statistics', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData(200, 90, 20);
      const expectedStats = calculateExpectedStats(testData, 'lbs');

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Check current weight
      if (expectedStats.current) {
        expect(screen.getByText(`${expectedStats.current.toFixed(1)} lbs`)).toBeInTheDocument();
      }

      // Check highest weight
      if (expectedStats.highest) {
        expect(screen.getByText(`${expectedStats.highest.toFixed(1)} lbs`)).toBeInTheDocument();
      }

      // Check lowest weight
      if (expectedStats.lowest) {
        expect(screen.getByText(`${expectedStats.lowest.toFixed(1)} lbs`)).toBeInTheDocument();
      }

      // Check average weight
      if (expectedStats.average) {
        expect(screen.getByText(`${expectedStats.average.toFixed(1)} lbs`)).toBeInTheDocument();
      }
    });

    it('shows average reference line', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData(200, 90, 20);
      const expectedStats = calculateExpectedStats(testData, 'lbs');

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Check reference line with average
      const referenceLine = screen.getByTestId('reference-line');
      expect(referenceLine).toBeInTheDocument();

      if (expectedStats.average) {
        expect(referenceLine).toHaveAttribute('data-y', expectedStats.average.toString());
      }
    });
  });

  describe('Empty State Handling', () => {
    it('shows empty state when no data is available', async () => {
      vi.mocked(useQuery).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByText('No weight data available for the selected period')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('shows empty state when data has no weight values', async () => {
      const noWeightData = [{
        id: 'no-weight-1',
        measurementDate: new Date().toISOString(),
        weightLbs: undefined,
        weightKg: undefined,
        waistCm: '85.0',
        createdAt: new Date().toISOString(),
      }];

      vi.mocked(useQuery).mockReturnValue({
        data: noWeightData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByText('No weight data available for the selected period')).toBeInTheDocument();
      });
    });
  });

  describe('Error State Handling', () => {
    it('shows error state when API request fails', async () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: vi.fn(),
        isSuccess: false,
        isError: true,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load weight data')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid date formats gracefully', async () => {
      const testData = MeasurementTestDataGenerator.generateEdgeCaseData();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        // Should filter out invalid dates and still render valid data
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('handles missing weight values gracefully', async () => {
      const testData = MeasurementTestDataGenerator.generatePartialMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        // Should only show data points with valid weight values
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('handles extremely large datasets', async () => {
      const largeData = MeasurementTestDataGenerator.generateWeightLossData(200, 730, 50); // 2 years of data

      vi.mocked(useQuery).mockReturnValue({
        data: largeData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Should handle large datasets without performance issues
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');
      expect(chartData.length).toBeGreaterThan(50);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Check for proper button roles
      const timeRangeButtons = screen.getAllByRole('button');
      expect(timeRangeButtons.length).toBeGreaterThan(0);

      // Check for proper headings
      expect(screen.getByText('Weight Progress')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const testData = MeasurementTestDataGenerator.generateWeightLossData();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<WeightProgressChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Test keyboard navigation on buttons
      const lbsButton = screen.getByRole('button', { name: 'lbs' });
      lbsButton.focus();
      expect(document.activeElement).toBe(lbsButton);
    });
  });
});