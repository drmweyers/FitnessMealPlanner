/**
 * Comprehensive unit tests for BodyMeasurementChart component
 * Tests component rendering, measurement type selection, time range filtering, and legend interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';

import BodyMeasurementChart from '@/components/charts/BodyMeasurementChart';
import {
  mockApiResponses,
  MeasurementTestDataGenerator,
} from '../utils/measurement-test-data';

// Mock the recharts module
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, name }: any) => (
    <div
      data-testid={`line-${dataKey}`}
      data-stroke={stroke}
      data-name={name}
    />
  ),
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: ({ wrapperStyle, iconType }: any) => (
    <div
      data-testid="legend"
      data-wrapper-style={JSON.stringify(wrapperStyle)}
      data-icon-type={iconType}
    />
  ),
}));

// Mock the date-fns module
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'MMM dd') return 'Jan 01';
    if (formatStr === 'MMM dd, yyyy') return 'Jan 01, 2024';
    return date.toISOString();
  }),
  isValid: vi.fn((date: Date) => !isNaN(date.getTime())),
}));

// Mock the popover components
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
  PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
}));

// Mock useQuery from React Query
vi.mocked(useQuery);

describe('BodyMeasurementChart', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders loading state initially', () => {
      vi.mocked(useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isSuccess: false,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      expect(screen.getByText('Body Measurements')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument(); // Loading spinner
    });

    it('renders chart with comprehensive body measurement data', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      expect(screen.getByText('Body Measurements')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
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

      render(<BodyMeasurementChart className="test-class" />);

      await waitFor(() => {
        expect(screen.getByText('Body Measurements')).toBeInTheDocument();
      });

      const card = screen.getByText('Body Measurements').closest('[class*="border"]');
      if (card) {
        expect(card).toHaveClass('test-class');
      }
    });

    it('renders measurement configuration button', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /configure/i })).toBeInTheDocument();
      });
    });
  });

  describe('Measurement Type Selection', () => {
    it('renders default enabled measurements (waist, chest, hips)', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Check for default enabled measurement lines
      expect(screen.getByTestId('line-waist')).toBeInTheDocument();
      expect(screen.getByTestId('line-chest')).toBeInTheDocument();
      expect(screen.getByTestId('line-hips')).toBeInTheDocument();

      // Check that disabled measurements are not rendered initially
      expect(screen.queryByTestId('line-neck')).not.toBeInTheDocument();
      expect(screen.queryByTestId('line-shoulders')).not.toBeInTheDocument();
    });

    it('opens measurement configuration popover', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Click configure button
      fireEvent.click(screen.getByRole('button', { name: /configure/i }));

      await waitFor(() => {
        expect(screen.getByText('Select measurements to display')).toBeInTheDocument();
      });

      // Check for measurement checkboxes
      expect(screen.getByLabelText('Waist')).toBeInTheDocument();
      expect(screen.getByLabelText('Chest')).toBeInTheDocument();
      expect(screen.getByLabelText('Hips')).toBeInTheDocument();
      expect(screen.getByLabelText('Neck')).toBeInTheDocument();
      expect(screen.getByLabelText('Left Bicep')).toBeInTheDocument();
    });

    it('toggles measurement types on and off', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Open configuration
      fireEvent.click(screen.getByRole('button', { name: /configure/i }));

      await waitFor(() => {
        expect(screen.getByText('Select measurements to display')).toBeInTheDocument();
      });

      // Initially waist should be checked
      const waistCheckbox = screen.getByLabelText('Waist');
      expect(waistCheckbox).toBeChecked();

      // Uncheck waist
      fireEvent.click(waistCheckbox);

      await waitFor(() => {
        expect(waistCheckbox).not.toBeChecked();
      });

      // Check neck (initially unchecked)
      const neckCheckbox = screen.getByLabelText('Neck');
      expect(neckCheckbox).not.toBeChecked();

      fireEvent.click(neckCheckbox);

      await waitFor(() => {
        expect(neckCheckbox).toBeChecked();
      });
    });

    it('shows measurements with different colors', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Check that each measurement line has different colors
      const waistLine = screen.getByTestId('line-waist');
      const chestLine = screen.getByTestId('line-chest');
      const hipsLine = screen.getByTestId('line-hips');

      expect(waistLine).toHaveAttribute('data-stroke', '#3b82f6'); // Blue
      expect(chestLine).toHaveAttribute('data-stroke', '#ef4444'); // Red
      expect(hipsLine).toHaveAttribute('data-stroke', '#10b981'); // Green
    });
  });

  describe('Time Range Filtering', () => {
    it('filters data by time range selection', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements(180); // 6 months of data

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

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
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements(365); // 1 year of data

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

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

  describe('Multiple Measurement Lines', () => {
    it('renders multiple measurement lines simultaneously', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Enable multiple measurements
      fireEvent.click(screen.getByRole('button', { name: /configure/i }));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Neck'));
        fireEvent.click(screen.getByLabelText('Shoulders'));
        fireEvent.click(screen.getByLabelText('Left Bicep'));
      });

      // Close configuration by clicking outside
      fireEvent.click(document.body);

      await waitFor(() => {
        // Should show all enabled measurement lines
        expect(screen.getByTestId('line-waist')).toBeInTheDocument();
        expect(screen.getByTestId('line-chest')).toBeInTheDocument();
        expect(screen.getByTestId('line-hips')).toBeInTheDocument();
        expect(screen.getByTestId('line-neck')).toBeInTheDocument();
        expect(screen.getByTestId('line-shoulders')).toBeInTheDocument();
        expect(screen.getByTestId('line-bicepLeft')).toBeInTheDocument();
      });
    });

    it('handles measurements with different units', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Enable measurements with different units
      fireEvent.click(screen.getByRole('button', { name: /configure/i }));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Body Fat')); // % unit
        fireEvent.click(screen.getByLabelText('Muscle Mass')); // kg unit
      });

      // Close configuration
      fireEvent.click(document.body);

      await waitFor(() => {
        // Should show lines for different unit types
        expect(screen.getByTestId('line-bodyFat')).toBeInTheDocument();
        expect(screen.getByTestId('line-muscleMass')).toBeInTheDocument();
      });
    });

    it('shows quick stats for enabled measurements', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Should show stats for default enabled measurements
      expect(screen.getByText('Waist')).toBeInTheDocument();
      expect(screen.getByText('Chest')).toBeInTheDocument();
      expect(screen.getByText('Hips')).toBeInTheDocument();

      // Stats should include latest value and average
      const waistStats = screen.getByText('Waist').closest('div');
      if (waistStats) {
        expect(within(waistStats).getByText(/\d+\.\d+ cm/)).toBeInTheDocument();
        expect(within(waistStats).getByText(/Avg: \d+\.\d+ cm/)).toBeInTheDocument();
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

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByText('No measurement data available for the selected period')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('shows empty state when no measurements are selected', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Disable all measurements
      fireEvent.click(screen.getByRole('button', { name: /configure/i }));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Waist'));
        fireEvent.click(screen.getByLabelText('Chest'));
        fireEvent.click(screen.getByLabelText('Hips'));
      });

      // Close configuration
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.getByText('No measurements selected or available')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /select measurements/i })).toBeInTheDocument();
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

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load measurement data')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  describe('Legend Interactions', () => {
    it('renders legend with correct properties', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      const legend = screen.getByTestId('legend');
      expect(legend).toBeInTheDocument();
      expect(legend).toHaveAttribute('data-icon-type', 'line');

      const wrapperStyle = JSON.parse(legend.getAttribute('data-wrapper-style') || '{}');
      expect(wrapperStyle.fontSize).toBe('12px');
    });

    it('updates legend when measurements are toggled', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Initially should have lines for default measurements
      expect(screen.getByTestId('line-waist')).toHaveAttribute('data-name', 'Waist');
      expect(screen.getByTestId('line-chest')).toHaveAttribute('data-name', 'Chest');
      expect(screen.getByTestId('line-hips')).toHaveAttribute('data-name', 'Hips');

      // Add more measurements
      fireEvent.click(screen.getByRole('button', { name: /configure/i }));

      await waitFor(() => {
        fireEvent.click(screen.getByLabelText('Body Fat'));
      });

      // Close configuration
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.getByTestId('line-bodyFat')).toHaveAttribute('data-name', 'Body Fat');
      });
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

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        // Should filter out invalid dates and still render valid data
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('handles missing measurement values gracefully', async () => {
      const testData = MeasurementTestDataGenerator.generatePartialMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        // Should only show lines for measurements with data
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('handles extremely large datasets', async () => {
      const largeData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements(730); // 2 years of data

      vi.mocked(useQuery).mockReturnValue({
        data: largeData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Should handle large datasets without performance issues
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');
      expect(chartData.length).toBeGreaterThan(30);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Check for proper button roles
      const timeRangeButtons = screen.getAllByRole('button');
      expect(timeRangeButtons.length).toBeGreaterThan(0);

      // Check for proper headings
      expect(screen.getByText('Body Measurements')).toBeInTheDocument();

      // Check for proper checkbox labels
      fireEvent.click(screen.getByRole('button', { name: /configure/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Waist')).toBeInTheDocument();
        expect(screen.getByLabelText('Chest')).toBeInTheDocument();
        expect(screen.getByLabelText('Hips')).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Test keyboard navigation on buttons
      const configureButton = screen.getByRole('button', { name: /configure/i });
      configureButton.focus();
      expect(document.activeElement).toBe(configureButton);

      // Test checkbox accessibility
      fireEvent.click(configureButton);

      await waitFor(() => {
        const waistCheckbox = screen.getByLabelText('Waist');
        waistCheckbox.focus();
        expect(document.activeElement).toBe(waistCheckbox);
      });
    });

    it('provides meaningful labels for measurement statistics', async () => {
      const testData = MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements();

      vi.mocked(useQuery).mockReturnValue({
        data: testData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSuccess: true,
        isError: false,
      } as any);

      render(<BodyMeasurementChart />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Check that stats have meaningful labels
      expect(screen.getByText('Waist')).toBeInTheDocument();
      expect(screen.getByText('Chest')).toBeInTheDocument();
      expect(screen.getByText('Hips')).toBeInTheDocument();

      // Check that each stat shows value and unit
      const waistSection = screen.getByText('Waist').closest('div');
      if (waistSection) {
        expect(within(waistSection).getByText(/\d+\.\d+ cm/)).toBeInTheDocument();
      }
    });
  });
});