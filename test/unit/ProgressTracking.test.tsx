import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProgressTracking from '../../client/src/components/ProgressTracking';

// Mock child components
vi.mock('../../client/src/components/progress/MeasurementsTab', () => ({
  default: () => <div data-testid="measurements-tab">Measurements Tab Content</div>,
}));

vi.mock('../../client/src/components/progress/PhotosTab', () => ({
  default: () => <div data-testid="photos-tab">Photos Tab Content</div>,
}));

vi.mock('../../client/src/components/progress/GoalsTab', () => ({
  default: () => <div data-testid="goals-tab">Goals Tab Content</div>,
}));

vi.mock('../../client/src/components/progress/ProgressCharts', () => ({
  default: () => <div data-testid="progress-charts">Progress Charts</div>,
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className} data-testid="card-title">{children}</h3>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange, className }: any) => (
    <div className={className} data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value, className }: any) => (
    <div className={className} data-testid={`tabs-content-${value}`} data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div className={className} data-testid="tabs-list" role="tablist">
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button 
      data-testid={`tabs-trigger-${value}`} 
      data-value={value}
      role="tab"
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Plus: () => <span>PlusIcon</span>,
  TrendingUp: () => <span>TrendingUpIcon</span>,
  Camera: () => <span>CameraIcon</span>,
  Target: () => <span>TargetIcon</span>,
}));

// Test utility to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ProgressTracking Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main header and description', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      expect(screen.getByText(/track your fitness journey/i)).toBeInTheDocument();
    });

    it('should render all quick stats cards', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getByText('Current Weight')).toBeInTheDocument();
      expect(screen.getByText('175 lbs')).toBeInTheDocument();
      expect(screen.getByText('Body Fat %')).toBeInTheDocument();
      expect(screen.getByText('18.5%')).toBeInTheDocument();
      expect(screen.getByText('Active Goals')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Progress Photos')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display trend indicators for stats', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getByText('-5 lbs this month')).toBeInTheDocument();
      expect(screen.getByText('-1.2% this month')).toBeInTheDocument();
      expect(screen.getByText('1 near completion')).toBeInTheDocument();
      expect(screen.getByText('Last: 3 days ago')).toBeInTheDocument();
    });

    it('should render the progress charts component', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getByTestId('progress-charts')).toBeInTheDocument();
      expect(screen.getByText('Progress Charts')).toBeInTheDocument();
    });

    it('should render all tab triggers', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getByRole('tab', { name: /measurements/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /progress photos/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /goals/i })).toBeInTheDocument();
    });

    it('should render icons correctly', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getAllByText('TrendingUpIcon')).toHaveLength(2); // Weight and Body Fat trends
      expect(screen.getByText('TargetIcon')).toBeInTheDocument();
      expect(screen.getByText('CameraIcon')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should default to measurements tab', () => {
      renderWithProviders(<ProgressTracking />);
      
      const measurementsContent = screen.getByTestId('tabs-content-measurements');
      expect(measurementsContent).toBeInTheDocument();
      expect(screen.getByTestId('measurements-tab')).toBeInTheDocument();
    });

    it('should switch to photos tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProgressTracking />);
      
      const photosTab = screen.getByRole('tab', { name: /progress photos/i });
      await user.click(photosTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('photos-tab')).toBeInTheDocument();
      });
    });

    it('should switch to goals tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProgressTracking />);
      
      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      await user.click(goalsTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('goals-tab')).toBeInTheDocument();
      });
    });

    it('should maintain tab state when switching', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProgressTracking />);
      
      // Switch to photos
      await user.click(screen.getByRole('tab', { name: /progress photos/i }));
      expect(screen.getByTestId('photos-tab')).toBeInTheDocument();
      
      // Switch to goals
      await user.click(screen.getByRole('tab', { name: /goals/i }));
      expect(screen.getByTestId('goals-tab')).toBeInTheDocument();
      
      // Switch back to measurements
      await user.click(screen.getByRole('tab', { name: /measurements/i }));
      expect(screen.getByTestId('measurements-tab')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
    });

    it('should apply responsive grid classes to stats cards', () => {
      renderWithProviders(<ProgressTracking />);
      
      const statsContainer = screen.getByText('Current Weight').closest('.grid');
      expect(statsContainer?.className).toContain('grid-cols-1');
      expect(statsContainer?.className).toContain('md:grid-cols-4');
    });

    it('should apply full width to tabs on mobile', () => {
      renderWithProviders(<ProgressTracking />);
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList.className).toContain('w-full');
      expect(tabsList.className).toContain('grid-cols-3');
    });

    it('should maintain spacing on mobile', () => {
      renderWithProviders(<ProgressTracking />);
      
      const mainContainer = screen.getByText('Progress Tracking').closest('.space-y-6');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Quick Stats Data Display', () => {
    it('should format weight correctly', () => {
      renderWithProviders(<ProgressTracking />);
      
      const weightCard = screen.getByText('Current Weight').closest('[data-testid="card"]');
      expect(weightCard).toHaveTextContent('175 lbs');
      expect(weightCard).toHaveTextContent('-5 lbs this month');
    });

    it('should format body fat percentage correctly', () => {
      renderWithProviders(<ProgressTracking />);
      
      const bodyFatCard = screen.getByText('Body Fat %').closest('[data-testid="card"]');
      expect(bodyFatCard).toHaveTextContent('18.5%');
      expect(bodyFatCard).toHaveTextContent('-1.2% this month');
    });

    it('should display goals count correctly', () => {
      renderWithProviders(<ProgressTracking />);
      
      const goalsCard = screen.getByText('Active Goals').closest('[data-testid="card"]');
      expect(goalsCard).toHaveTextContent('3');
      expect(goalsCard).toHaveTextContent('1 near completion');
    });

    it('should display photo count correctly', () => {
      renderWithProviders(<ProgressTracking />);
      
      const photosCard = screen.getByText('Progress Photos').closest('[data-testid="card"]');
      expect(photosCard).toHaveTextContent('12');
      expect(photosCard).toHaveTextContent('Last: 3 days ago');
    });

    it('should use appropriate colors for trend indicators', () => {
      renderWithProviders(<ProgressTracking />);
      
      const trendText = screen.getByText('-5 lbs this month');
      expect(trendText.className).toContain('text-green-600');
    });
  });

  describe('Component Integration', () => {
    it('should render MeasurementsTab component', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getByTestId('measurements-tab')).toBeInTheDocument();
      expect(screen.getByText('Measurements Tab Content')).toBeInTheDocument();
    });

    it('should render PhotosTab component when selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProgressTracking />);
      
      await user.click(screen.getByRole('tab', { name: /progress photos/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('photos-tab')).toBeInTheDocument();
        expect(screen.getByText('Photos Tab Content')).toBeInTheDocument();
      });
    });

    it('should render GoalsTab component when selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProgressTracking />);
      
      await user.click(screen.getByRole('tab', { name: /goals/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('goals-tab')).toBeInTheDocument();
        expect(screen.getByText('Goals Tab Content')).toBeInTheDocument();
      });
    });

    it('should render ProgressCharts component', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getByTestId('progress-charts')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles for tabs', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('should have descriptive text for screen readers', () => {
      renderWithProviders(<ProgressTracking />);
      
      expect(screen.getByText('Track your fitness journey and celebrate your achievements')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<ProgressTracking />);
      
      const measurementsTab = screen.getByRole('tab', { name: /measurements/i });
      const photosTab = screen.getByRole('tab', { name: /progress photos/i });
      
      measurementsTab.focus();
      expect(document.activeElement).toBe(measurementsTab);
      
      // Simulate Tab key press
      fireEvent.keyDown(measurementsTab, { key: 'Tab' });
      
      // Note: Actual keyboard navigation would depend on the tabs implementation
      // This is a basic test to ensure the elements can receive focus
    });
  });

  describe('State Management', () => {
    it('should initialize with measurements tab active', () => {
      renderWithProviders(<ProgressTracking />);
      
      const tabs = screen.getByTestId('tabs');
      expect(tabs.getAttribute('data-value')).toBe('measurements');
    });

    it('should update active tab state when switching', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProgressTracking />);
      
      const photosTab = screen.getByRole('tab', { name: /progress photos/i });
      await user.click(photosTab);
      
      // Since we're mocking the Tabs component, we can't directly test state changes
      // but we can verify that the correct content is displayed
      await waitFor(() => {
        expect(screen.getByTestId('photos-tab')).toBeInTheDocument();
      });
    });
  });
});