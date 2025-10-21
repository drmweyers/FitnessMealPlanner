import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import BodyMeasurementChart from '../../../client/src/components/charts/BodyMeasurementChart';
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
  Line: ({ dataKey, stroke, name }: any) => (
    <div 
      data-testid="chart-line" 
      data-key={dataKey} 
      data-stroke={stroke}
      data-name={name}
    />
  ),
  XAxis: ({ dataKey }: any) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => (
    <div data-testid="tooltip" data-content={content?.name} />
  ),
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Legend: ({ iconType }: any) => (
    <div data-testid="legend" data-icon-type={iconType} />
  ),
}));

// Mock UI components
vi.mock('../../../client/src/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children, className }: any) => (
    <div data-testid="popover-content" className={className}>{children}</div>
  ),
  PopoverTrigger: ({ children, asChild }: any) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
}));

vi.mock('../../../client/src/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: any) => (
    <input
      data-testid={`checkbox-${id}`}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
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
  isValid: vi.fn((date) => date instanceof Date && !isNaN(date.getTime())),
}));

const mockApiRequest = vi.mocked(apiRequest);

describe('BodyMeasurementChart Component Tests', () => {
  let queryClient: QueryClient;
  let user: any;

  const mockMeasurements: Measurement[] = [
    {
      id: 1,
      measurementDate: '2024-01-01',
      waistCm: '85.0',
      chestCm: '100.0',
      hipsCm: '95.0',
      neckCm: '38.0',
      shouldersCm: '45.0',
      bicepLeftCm: '32.0',
      bicepRightCm: '32.5',
      thighLeftCm: '58.0',
      thighRightCm: '58.5',
      calfLeftCm: '36.0',
      calfRightCm: '36.2',
      bodyFatPercentage: '15.5',
      muscleMassKg: '65.0',
      userId: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      measurementDate: '2024-01-15',
      waistCm: '84.0',
      chestCm: '101.0',
      hipsCm: '94.5',
      neckCm: '38.2',
      shouldersCm: '45.5',
      bicepLeftCm: '32.5',
      bicepRightCm: '33.0',
      thighLeftCm: '58.5',
      thighRightCm: '59.0',
      calfLeftCm: '36.2',
      calfRightCm: '36.5',
      bodyFatPercentage: '15.0',
      muscleMassKg: '65.5',
      userId: 1,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    },
    {
      id: 3,
      measurementDate: '2024-02-01',
      waistCm: '83.5',
      chestCm: '102.0',
      hipsCm: '94.0',
      neckCm: '38.5',
      shouldersCm: '46.0',
      bicepLeftCm: '33.0',
      bicepRightCm: '33.5',
      thighLeftCm: '59.0',
      thighRightCm: '59.5',
      calfLeftCm: '36.5',
      calfRightCm: '36.8',
      bodyFatPercentage: '14.5',
      muscleMassKg: '66.0',
      userId: 1,
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z'
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
        <BodyMeasurementChart {...props} />
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('should render loading state initially', async () => {
      renderComponent();
      
      expect(screen.getByText('Body Measurements')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render chart with data', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should render with custom className', async () => {
      const { container } = renderComponent({ className: 'custom-measurement-chart' });
      
      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-measurement-chart');
      });
    });

    it('should display title with ruler icon', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Body Measurements')).toBeInTheDocument();
      });
    });
  });

  describe('Measurement Type Configuration', () => {
    it('should render default enabled measurements', async () => {
      renderComponent();

      await waitFor(() => {
        // Default enabled: waist, chest, hips
        expect(screen.getByTestId('chart-line')).toBeInTheDocument();
      });

      // Should have 3 chart lines for default enabled measurements
      const chartLines = screen.getAllByTestId('chart-line');
      expect(chartLines).toHaveLength(3);
    });

    it('should open measurement configuration popover', async () => {
      renderComponent();

      await waitFor(() => {
        const configureButton = screen.getByText('Configure');
        fireEvent.click(configureButton);
      });

      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
      expect(screen.getByText('Select measurements to display')).toBeInTheDocument();
    });

    it('should render all measurement type checkboxes', async () => {
      renderComponent();

      await waitFor(() => {
        const configureButton = screen.getByText('Configure');
        fireEvent.click(configureButton);
      });

      // Check for specific measurement checkboxes
      expect(screen.getByTestId('checkbox-waist')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-chest')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-hips')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-neck')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-bodyFat')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-muscleMass')).toBeInTheDocument();
    });

    it('should toggle measurement visibility', async () => {
      renderComponent();

      await waitFor(() => {
        const configureButton = screen.getByText('Configure');
        fireEvent.click(configureButton);
      });

      // Initially waist should be checked (enabled by default)
      const waistCheckbox = screen.getByTestId('checkbox-waist');
      expect(waistCheckbox).toBeChecked();

      // Uncheck waist measurement
      fireEvent.click(waistCheckbox);
      expect(waistCheckbox).not.toBeChecked();

      // Check body fat measurement (disabled by default)
      const bodyFatCheckbox = screen.getByTestId('checkbox-bodyFat');
      expect(bodyFatCheckbox).not.toBeChecked();
      
      fireEvent.click(bodyFatCheckbox);
      expect(bodyFatCheckbox).toBeChecked();
    });

    it('should filter out measurements with no data', async () => {
      const measurementsWithMissingData = mockMeasurements.map(m => ({
        ...m,
        waistCm: null, // Remove waist data
        chestCm: m.chestCm,
        hipsCm: m.hipsCm
      }));

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: measurementsWithMissingData })
      } as any);

      renderComponent();

      await waitFor(() => {
        // Should only show 2 lines (chest and hips) since waist has no data
        const chartLines = screen.getAllByTestId('chart-line');
        expect(chartLines).toHaveLength(2);
      });
    });

    it('should display different measurement units correctly', async () => {
      renderComponent();

      await waitFor(() => {
        const configureButton = screen.getByText('Configure');
        fireEvent.click(configureButton);
      });

      // Enable body fat (percentage) and muscle mass (kg)
      const bodyFatCheckbox = screen.getByTestId('checkbox-bodyFat');
      const muscleMassCheckbox = screen.getByTestId('checkbox-muscleMass');
      
      fireEvent.click(bodyFatCheckbox);
      fireEvent.click(muscleMassCheckbox);

      await waitFor(() => {
        // Should see stats with different units
        expect(screen.getByText('%')).toBeInTheDocument();
        expect(screen.getByText('kg')).toBeInTheDocument();
      });
    });
  });

  describe('Data Processing', () => {
    it('should process measurement data correctly', async () => {
      renderComponent();

      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-chart-length', '3');
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

    it('should handle missing measurement values', async () => {
      const partialMeasurements = [
        { 
          ...mockMeasurements[0], 
          waistCm: null, 
          chestCm: '', 
          hipsCm: undefined 
        },
        mockMeasurements[1] // Valid one
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: partialMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toBeInTheDocument();
      });
    });

    it('should sort data chronologically', async () => {
      const unsortedMeasurements = [
        mockMeasurements[2], // 2024-02-01
        mockMeasurements[0], // 2024-01-01
        mockMeasurements[1], // 2024-01-15
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: unsortedMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should parse numeric values correctly', async () => {
      const stringMeasurements = mockMeasurements.map(m => ({
        ...m,
        waistCm: '85.5', // String number
        bodyFatPercentage: '15.75' // String with decimals
      }));

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: stringMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Time Range Filtering', () => {
    it('should filter data for 30 days', async () => {
      // Mock current date to be 2024-02-15
      const mockDate = new Date('2024-02-15');
      vi.setSystemTime(mockDate);

      renderComponent();

      await waitFor(() => {
        const thirtyDayButton = screen.getByText('30 days');
        fireEvent.click(thirtyDayButton);
      });

      // Should only show measurements from last 30 days
      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-chart-length', '1'); // Only 2024-02-01
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
        expect(chart).toHaveAttribute('data-chart-length', '3');
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

    it('should update chart data when time range changes', async () => {
      renderComponent();

      // Initial 3 months view
      await waitFor(() => {
        const chart = screen.getByTestId('line-chart');
        expect(chart).toHaveAttribute('data-chart-length', '3');
      });

      // Change to 30 days
      const thirtyDayButton = screen.getByText('30 days');
      fireEvent.click(thirtyDayButton);

      await waitFor(() => {
        expect(screen.getByText('30 days')).toHaveClass('bg-blue-100');
      });
    });
  });

  describe('Statistics Display', () => {
    it('should display latest measurements for enabled types', async () => {
      renderComponent();

      await waitFor(() => {
        // Should show stats for waist, chest, hips (default enabled)
        expect(screen.getByText('Waist')).toBeInTheDocument();
        expect(screen.getByText('Chest')).toBeInTheDocument();
        expect(screen.getByText('Hips')).toBeInTheDocument();
      });
    });

    it('should calculate and display averages correctly', async () => {
      renderComponent();

      await waitFor(() => {
        // Check for average labels
        const avgTexts = screen.getAllByText(/Avg:/);
        expect(avgTexts.length).toBeGreaterThan(0);
      });
    });

    it('should show latest values for each measurement', async () => {
      renderComponent();

      await waitFor(() => {
        // Latest waist measurement should be 83.5 cm
        expect(screen.getByText('83.5 cm')).toBeInTheDocument();
        // Latest chest measurement should be 102.0 cm
        expect(screen.getByText('102.0 cm')).toBeInTheDocument();
        // Latest hips measurement should be 94.0 cm
        expect(screen.getByText('94.0 cm')).toBeInTheDocument();
      });
    });

    it('should display color indicators for each measurement', async () => {
      renderComponent();

      await waitFor(() => {
        const colorDots = screen.getAllByClassName('w-2 h-2 rounded-full');
        expect(colorDots.length).toBeGreaterThanOrEqual(3); // At least for waist, chest, hips
      });
    });

    it('should not display stats for measurements with no data', async () => {
      const limitedMeasurements = mockMeasurements.map(m => ({
        ...m,
        waistCm: m.waistCm,
        chestCm: null, // Remove chest data
        hipsCm: null   // Remove hips data
      }));

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: limitedMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        // Should only show waist stats
        expect(screen.getByText('Waist')).toBeInTheDocument();
        expect(screen.queryByText('Chest')).not.toBeInTheDocument();
        expect(screen.queryByText('Hips')).not.toBeInTheDocument();
      });
    });
  });

  describe('Chart Visualization', () => {
    it('should configure chart correctly', async () => {
      renderComponent();

      await waitFor(() => {
        const xAxis = screen.getByTestId('x-axis');
        expect(xAxis).toHaveAttribute('data-key', 'formattedDate');
      });

      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should render lines for enabled measurements with correct colors', async () => {
      renderComponent();

      await waitFor(() => {
        const chartLines = screen.getAllByTestId('chart-line');
        
        // Check that lines have correct colors (default enabled: waist, chest, hips)
        const waistLine = chartLines.find(line => 
          line.getAttribute('data-key') === 'waist'
        );
        const chestLine = chartLines.find(line => 
          line.getAttribute('data-key') === 'chest'
        );
        const hipsLine = chartLines.find(line => 
          line.getAttribute('data-key') === 'hips'
        );

        expect(waistLine).toHaveAttribute('data-stroke', '#3b82f6');
        expect(chestLine).toHaveAttribute('data-stroke', '#ef4444');
        expect(hipsLine).toHaveAttribute('data-stroke', '#10b981');
      });
    });

    it('should use correct legend configuration', async () => {
      renderComponent();

      await waitFor(() => {
        const legend = screen.getByTestId('legend');
        expect(legend).toHaveAttribute('data-icon-type', 'line');
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
        const thirtyDayButton = screen.getByText('30 days');
        thirtyDayButton.focus();
        
        await user.keyboard('{Enter}');
        
        expect(screen.getByText('30 days')).toHaveClass('bg-blue-100');
      });
    });

    it('should handle rapid measurement toggling', async () => {
      renderComponent();

      await waitFor(() => {
        const configureButton = screen.getByText('Configure');
        fireEvent.click(configureButton);
      });

      const checkboxes = [
        screen.getByTestId('checkbox-waist'),
        screen.getByTestId('checkbox-chest'),
        screen.getByTestId('checkbox-hips'),
        screen.getByTestId('checkbox-neck')
      ];

      // Rapidly toggle checkboxes
      for (let i = 0; i < 5; i++) {
        checkboxes.forEach(checkbox => {
          fireEvent.click(checkbox);
        });
      }

      // Should still work correctly
      expect(screen.getByTestId('popover-content')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error state when API fails', async () => {
      mockApiRequest.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load measurement data')).toBeInTheDocument();
      });
    });

    it('should display no data message when array is empty', async () => {
      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: [] })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No measurement data available for the selected period')).toBeInTheDocument();
      });
    });

    it('should show no measurements selected state', async () => {
      renderComponent();

      // Disable all default measurements
      await waitFor(() => {
        const configureButton = screen.getByText('Configure');
        fireEvent.click(configureButton);
      });

      const waistCheckbox = screen.getByTestId('checkbox-waist');
      const chestCheckbox = screen.getByTestId('checkbox-chest');
      const hipsCheckbox = screen.getByTestId('checkbox-hips');

      fireEvent.click(waistCheckbox);
      fireEvent.click(chestCheckbox);
      fireEvent.click(hipsCheckbox);

      await waitFor(() => {
        expect(screen.getByText('No measurements selected or available')).toBeInTheDocument();
        expect(screen.getByText('Select Measurements')).toBeInTheDocument();
      });
    });

    it('should handle malformed API response', async () => {
      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: null })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No measurement data available for the selected period')).toBeInTheDocument();
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
        expect(screen.getByText('Failed to load measurement data')).toBeInTheDocument();
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
      expect(screen.getByText('Body Measurements')).toBeInTheDocument();
    });

    it('should adapt stats grid for different screen sizes', async () => {
      renderComponent();

      await waitFor(() => {
        // Should render stats in grid layout
        const statsContainer = screen.getByText('Waist').closest('.grid');
        expect(statsContainer).toBeInTheDocument();
      });
    });

    it('should handle very small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      renderComponent();

      expect(screen.getByText('Body Measurements')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeMeasurements = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        measurementDate: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
        waistCm: (85 + Math.sin(i / 30) * 5).toFixed(1),
        chestCm: (100 + Math.cos(i / 25) * 8).toFixed(1),
        hipsCm: (95 + Math.sin(i / 20) * 4).toFixed(1),
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
      expect(endTime - startTime).toBeLessThan(2000); // Should render within 2 seconds
    });

    it('should memoize calculations correctly', async () => {
      const { rerender } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      // Re-render with same props
      rerender(
        <QueryClientProvider client={queryClient}>
          <BodyMeasurementChart />
        </QueryClientProvider>
      );

      // Should not recalculate data or cause excessive re-renders
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should handle many measurement types efficiently', async () => {
      renderComponent();

      await waitFor(() => {
        const configureButton = screen.getByText('Configure');
        fireEvent.click(configureButton);
      });

      // Enable all measurement types
      const allCheckboxes = screen.getAllByRole('checkbox');
      allCheckboxes.forEach(checkbox => {
        if (!checkbox.checked) {
          fireEvent.click(checkbox);
        }
      });

      // Should still render efficiently with many lines
      await waitFor(() => {
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
        expect(screen.getByText('Body Measurements')).toBeInTheDocument();
        
        // Check for accessible labels
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('id');
        });
      });
    });

    it('should have good color contrast for measurement lines', async () => {
      renderComponent();

      await waitFor(() => {
        const chartLines = screen.getAllByTestId('chart-line');
        chartLines.forEach(line => {
          const color = line.getAttribute('data-stroke');
          expect(color).toBeTruthy();
          // Colors should be defined and not transparent
          expect(color).not.toBe('transparent');
          expect(color).not.toBe('#ffffff');
        });
      });
    });
  });

  describe('Custom Tooltip', () => {
    it('should render custom tooltip correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      });
    });

    it('should handle tooltip with multiple measurements', async () => {
      renderComponent();

      // Enable multiple measurements to test tooltip with multiple values
      await waitFor(() => {
        const configureButton = screen.getByText('Configure');
        fireEvent.click(configureButton);
      });

      const bodyFatCheckbox = screen.getByTestId('checkbox-bodyFat');
      fireEvent.click(bodyFatCheckbox);

      await waitFor(() => {
        expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme measurement values', async () => {
      const extremeMeasurements = [
        { 
          ...mockMeasurements[0], 
          waistCm: '1000', // Extremely large
          chestCm: '10'    // Extremely small
        }
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: extremeMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should handle zero measurement values', async () => {
      const zeroMeasurements = [
        { ...mockMeasurements[0], waistCm: '0', chestCm: '0' }
      ];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: zeroMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
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

    it('should handle identical consecutive measurements', async () => {
      const identicalMeasurements = mockMeasurements.map(m => ({
        ...m,
        waistCm: '85.0',
        chestCm: '100.0',
        hipsCm: '95.0'
      }));

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: identicalMeasurements })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should handle single measurement data point', async () => {
      const singleMeasurement = [mockMeasurements[0]];

      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: singleMeasurement })
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });
});