import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProgressTracking from '@/components/ProgressTracking';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextValue } from '@/types/auth';

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockApiRequest = vi.mocked(await import('@/lib/queryClient')).apiRequest;

const mockUser = {
  id: '1',
  email: 'customer@example.com',
  role: 'customer' as const,
  profilePicture: null,
};

const mockMeasurements = [
  {
    id: '1',
    measurementDate: '2024-01-15',
    weightKg: '70',
    chestCm: '100',
    waistCm: '80',
    hipsCm: '95',
    bodyFatPercentage: '15',
    notes: 'Feeling good',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    measurementDate: '2024-01-01',
    weightKg: '72',
    chestCm: '102',
    waistCm: '82',
    hipsCm: '97',
    bodyFatPercentage: '17',
    notes: 'Starting point',
    createdAt: '2024-01-01T10:00:00Z',
  },
];

const mockGoals = [
  {
    id: '1',
    title: 'Lose 5kg',
    description: 'Target weight loss by summer',
    targetDate: '2024-06-01',
    isCompleted: false,
    createdAt: '2024-01-01T10:00:00Z',
  },
  {
    id: '2',
    title: 'Run 5K',
    description: 'Complete a 5K run without stopping',
    targetDate: '2024-04-01',
    isCompleted: true,
    createdAt: '2024-01-01T10:00:00Z',
  },
];

const mockProgressPhotos = [
  {
    id: '1',
    photoUrl: '/photos/progress1.jpg',
    description: 'Front view - January',
    photoDate: '2024-01-15',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    photoUrl: '/photos/progress2.jpg',
    description: 'Side view - January',
    photoDate: '2024-01-15',
    createdAt: '2024-01-15T10:00:00Z',
  },
];

const createMockAuthContext = (overrides?: Partial<AuthContextValue>): AuthContextValue => ({
  user: mockUser,
  isLoading: false,
  isAuthenticated: true,
  error: undefined,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

const renderWithProviders = (authContextValue: AuthContextValue) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContextValue}>
        <ProgressTracking />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('ProgressTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses for different endpoints
    mockApiRequest.mockImplementation((url: string) => {
      if (url.includes('/measurements')) {
        return Promise.resolve(mockMeasurements);
      }
      if (url.includes('/goals')) {
        return Promise.resolve(mockGoals);
      }
      if (url.includes('/progress-photos')) {
        return Promise.resolve(mockProgressPhotos);
      }
      return Promise.resolve([]);
    });
  });

  describe('Component Rendering', () => {
    it('renders progress tracking with tab navigation', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: /measurements/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /goals/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /photos/i })).toBeInTheDocument();
    });

    it('displays measurements tab by default', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      });

      const measurementsTab = screen.getByRole('tab', { name: /measurements/i });
      expect(measurementsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('shows measurements data when loaded', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('70')).toBeInTheDocument(); // weight
        expect(screen.getByText('15')).toBeInTheDocument(); // body fat
        expect(screen.getByText('Feeling good')).toBeInTheDocument(); // notes
      });
    });

    it('displays measurement dates correctly formatted', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
        expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('switches to goals tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      });

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      await user.click(goalsTab);

      expect(goalsTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Lose 5kg')).toBeInTheDocument();
      expect(screen.getByText('Run 5K')).toBeInTheDocument();
    });

    it('switches to photos tab when clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      });

      const photosTab = screen.getByRole('tab', { name: /photos/i });
      await user.click(photosTab);

      expect(photosTab).toHaveAttribute('aria-selected', 'true');
      await waitFor(() => {
        expect(screen.getByText('Front view - January')).toBeInTheDocument();
        expect(screen.getByText('Side view - January')).toBeInTheDocument();
      });
    });

    it('maintains proper ARIA attributes during tab switches', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      });

      const measurementsTab = screen.getByRole('tab', { name: /measurements/i });
      const goalsTab = screen.getByRole('tab', { name: /goals/i });

      expect(measurementsTab).toHaveAttribute('aria-selected', 'true');
      expect(goalsTab).toHaveAttribute('aria-selected', 'false');

      await user.click(goalsTab);

      expect(measurementsTab).toHaveAttribute('aria-selected', 'false');
      expect(goalsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Measurements Tab Functionality', () => {
    it('shows add new measurement button', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });
    });

    it('opens measurement dialog when add button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add measurement/i });
      await user.click(addButton);

      expect(screen.getByText('Add New Measurement')).toBeInTheDocument();
    });

    it('displays measurements in descending order by date', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        const dates = screen.getAllByText(/Jan \d+, 2024/);
        expect(dates[0]).toHaveTextContent('Jan 15, 2024'); // Most recent first
        expect(dates[1]).toHaveTextContent('Jan 1, 2024');
      });
    });

    it('shows edit and delete options for measurements', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2);
      });
    });

    it('calculates and displays progress indicators', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        // Should show weight change between measurements
        expect(screen.getByText(/-2 kg/i)).toBeInTheDocument(); // 70 - 72 = -2kg loss
      });
    });
  });

  describe('Goals Tab Functionality', () => {
    it('displays goals with completion status', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      });

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      await user.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('Lose 5kg')).toBeInTheDocument();
        expect(screen.getByText('Run 5K')).toBeInTheDocument();
      });

      // Check completion indicators
      const completedGoal = screen.getByText('Run 5K').closest('[data-completed="true"]');
      const incompleteGoal = screen.getByText('Lose 5kg').closest('[data-completed="false"]');
      
      expect(completedGoal).toBeInTheDocument();
      expect(incompleteGoal).toBeInTheDocument();
    });

    it('shows add new goal button', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      await user.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add goal/i })).toBeInTheDocument();
      });
    });

    it('displays goal target dates', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      await user.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('Jun 1, 2024')).toBeInTheDocument();
        expect(screen.getByText('Apr 1, 2024')).toBeInTheDocument();
      });
    });

    it('allows marking goals as completed', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockResolvedValueOnce({}); // Mock update response

      renderWithProviders(createMockAuthContext());

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      await user.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('Lose 5kg')).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole('button', { name: /mark as completed/i });
      await user.click(toggleButton);

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/goals/1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"isCompleted":true'),
        })
      );
    });
  });

  describe('Photos Tab Functionality', () => {
    it('displays progress photos in grid layout', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const photosTab = screen.getByRole('tab', { name: /photos/i });
      await user.click(photosTab);

      await waitFor(() => {
        expect(screen.getByText('Front view - January')).toBeInTheDocument();
        expect(screen.getByText('Side view - January')).toBeInTheDocument();
      });

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2);
    });

    it('shows upload new photo button', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const photosTab = screen.getByRole('tab', { name: /photos/i });
      await user.click(photosTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload photo/i })).toBeInTheDocument();
      });
    });

    it('displays photo dates correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const photosTab = screen.getByRole('tab', { name: /photos/i });
      await user.click(photosTab);

      await waitFor(() => {
        expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      });
    });

    it('provides photo viewing functionality', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const photosTab = screen.getByRole('tab', { name: /photos/i });
      await user.click(photosTab);

      await waitFor(() => {
        const firstPhoto = screen.getByAltText('Front view - January');
        expect(firstPhoto).toBeInTheDocument();
        expect(firstPhoto).toHaveAttribute('src', '/photos/progress1.jpg');
      });
    });
  });

  describe('Data Loading and Error Handling', () => {
    it('shows loading state while fetching data', () => {
      vi.clearAllMocks();
      mockApiRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(createMockAuthContext());

      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });

    it('handles measurements fetch error', async () => {
      vi.clearAllMocks();
      mockApiRequest.mockRejectedValueOnce(new Error('Failed to fetch measurements'));

      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText(/error loading measurements/i)).toBeInTheDocument();
      });
    });

    it('handles goals fetch error', async () => {
      const user = userEvent.setup();
      vi.clearAllMocks();
      mockApiRequest.mockImplementation((url: string) => {
        if (url.includes('/goals')) {
          return Promise.reject(new Error('Failed to fetch goals'));
        }
        return Promise.resolve([]);
      });

      renderWithProviders(createMockAuthContext());

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      await user.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText(/error loading goals/i)).toBeInTheDocument();
      });
    });

    it('handles photos fetch error', async () => {
      const user = userEvent.setup();
      vi.clearAllMocks();
      mockApiRequest.mockImplementation((url: string) => {
        if (url.includes('/progress-photos')) {
          return Promise.reject(new Error('Failed to fetch photos'));
        }
        return Promise.resolve([]);
      });

      renderWithProviders(createMockAuthContext());

      const photosTab = screen.getByRole('tab', { name: /photos/i });
      await user.click(photosTab);

      await waitFor(() => {
        expect(screen.getByText(/error loading photos/i)).toBeInTheDocument();
      });
    });

    it('provides retry functionality on errors', async () => {
      const user = userEvent.setup();
      vi.clearAllMocks();
      mockApiRequest.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      mockApiRequest.mockResolvedValueOnce(mockMeasurements);
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('70')).toBeInTheDocument(); // Measurements loaded
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      // Component should render without layout issues
    });

    it('shows appropriate mobile navigation for tabs', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(createMockAuthContext());

      const tabList = screen.getByRole('tablist');
      expect(tabList).toHaveClass(/mobile/i); // Assuming mobile-specific classes
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for tabs', () => {
      renderWithProviders(createMockAuthContext());

      const measurementsTab = screen.getByRole('tab', { name: /measurements/i });
      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      const photosTab = screen.getByRole('tab', { name: /photos/i });

      expect(measurementsTab).toHaveAccessibleName();
      expect(goalsTab).toHaveAccessibleName();
      expect(photosTab).toHaveAccessibleName();
    });

    it('maintains keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      });

      const measurementsTab = screen.getByRole('tab', { name: /measurements/i });
      measurementsTab.focus();

      await user.keyboard('{ArrowRight}');
      
      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      expect(document.activeElement).toBe(goalsTab);
    });

    it('provides screen reader announcements for dynamic content', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      await user.click(goalsTab);

      // Should have live region for announcements
      const liveRegion = screen.getByRole('status', { name: /loading/i });
      expect(liveRegion).toBeInTheDocument();
    });
  });
});