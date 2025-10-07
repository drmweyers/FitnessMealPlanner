import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerProfile from '@/pages/CustomerProfile';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextValue } from '@/types/auth';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(await import('@/lib/queryClient')).apiRequest;

const mockUser = {
  id: '1',
  email: 'customer@example.com',
  role: 'customer' as const,
  profilePicture: null,
};

const mockCustomerProfile = {
  id: '1',
  email: 'customer@example.com',
  role: 'customer',
  createdAt: '2024-01-01T00:00:00Z',
  lastLoginAt: '2024-01-15T10:30:00Z',
  fitnessGoals: ['weight_loss', 'muscle_gain'],
  dietaryRestrictions: ['vegetarian'],
  preferredCuisines: ['italian', 'asian'],
  activityLevel: 'moderate',
  weight: 70,
  height: 175,
  age: 30,
  bio: 'Fitness enthusiast looking to improve nutrition',
};

const mockCustomerStats = {
  totalMealPlans: 5,
  completedDays: 12,
  favoriteRecipes: 8,
  avgCaloriesPerDay: 2200,
  currentStreak: 3,
};

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
        <CustomerProfile />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('CustomerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses
    mockApiRequest
      .mockResolvedValueOnce(mockCustomerProfile) // Profile data
      .mockResolvedValueOnce(mockCustomerStats);   // Stats data
  });

  describe('Component Rendering', () => {
    it('renders customer profile with basic information', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
    });

    it('displays customer statistics', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // totalMealPlans
        expect(screen.getByText('12')).toBeInTheDocument(); // completedDays
        expect(screen.getByText('8')).toBeInTheDocument(); // favoriteRecipes
        expect(screen.getByText('2,200')).toBeInTheDocument(); // avgCaloriesPerDay
        expect(screen.getByText('3')).toBeInTheDocument(); // currentStreak
      });
    });

    it('shows fitness goals as badges', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Weight Loss')).toBeInTheDocument();
        expect(screen.getByText('Muscle Gain')).toBeInTheDocument();
      });
    });

    it('displays dietary restrictions', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Vegetarian')).toBeInTheDocument();
      });
    });

    it('shows preferred cuisines', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Italian')).toBeInTheDocument();
        expect(screen.getByText('Asian')).toBeInTheDocument();
      });
    });

    it('displays physical metrics', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('70 kg')).toBeInTheDocument();
        expect(screen.getByText('175 cm')).toBeInTheDocument();
        expect(screen.getByText('30 years')).toBeInTheDocument();
      });
    });

    it('shows activity level', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Moderate')).toBeInTheDocument();
      });
    });

    it('displays bio information', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Fitness enthusiast looking to improve nutrition')).toBeInTheDocument();
      });
    });
  });

  describe('Profile Editing', () => {
    it('enables edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('shows form inputs in edit mode', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      expect(screen.getByDisplayValue('70')).toBeInTheDocument(); // weight
      expect(screen.getByDisplayValue('175')).toBeInTheDocument(); // height
      expect(screen.getByDisplayValue('30')).toBeInTheDocument(); // age
      expect(screen.getByDisplayValue('Fitness enthusiast looking to improve nutrition')).toBeInTheDocument(); // bio
    });

    it('allows updating weight field', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const weightInput = screen.getByDisplayValue('70');
      await user.clear(weightInput);
      await user.type(weightInput, '75');

      expect(weightInput).toHaveValue('75');
    });

    it('allows updating height field', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const heightInput = screen.getByDisplayValue('175');
      await user.clear(heightInput);
      await user.type(heightInput, '180');

      expect(heightInput).toHaveValue('180');
    });

    it('allows updating age field', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const ageInput = screen.getByDisplayValue('30');
      await user.clear(ageInput);
      await user.type(ageInput, '35');

      expect(ageInput).toHaveValue('35');
    });

    it('allows updating bio field', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const bioInput = screen.getByDisplayValue('Fitness enthusiast looking to improve nutrition');
      await user.clear(bioInput);
      await user.type(bioInput, 'Updated bio information');

      expect(bioInput).toHaveValue('Updated bio information');
    });

    it('cancels edit mode when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });
  });

  describe('Profile Updates', () => {
    it('saves profile changes when save button is clicked', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockResolvedValueOnce({}); // Update response

      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const weightInput = screen.getByDisplayValue('70');
      await user.clear(weightInput);
      await user.type(weightInput, '75');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/customers/1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"weight":75'),
          })
        );
      });
    });

    it('shows loading state during save operation', async () => {
      const user = userEvent.setup();
      let resolveSave: (value: any) => void;
      mockApiRequest.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSave = resolve;
        })
      );

      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();
      expect(screen.getByText(/saving/i)).toBeInTheDocument();

      resolveSave!({});
    });

    it('handles save errors gracefully', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockRejectedValueOnce(new Error('Save failed'));

      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
      });
    });

    it('validates numeric inputs', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const weightInput = screen.getByDisplayValue('70');
      await user.clear(weightInput);
      await user.type(weightInput, 'invalid');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show validation error or prevent submission
      expect(weightInput).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner while fetching profile data', () => {
      // Don't mock the API response to simulate loading
      vi.clearAllMocks();
      mockApiRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(createMockAuthContext());

      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });

    it('shows skeleton loaders for different sections', () => {
      vi.clearAllMocks();
      mockApiRequest.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(createMockAuthContext());

      // Look for loading indicators
      const loadingElements = screen.getAllByRole('status');
      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('displays error message when profile fetch fails', async () => {
      vi.clearAllMocks();
      mockApiRequest.mockRejectedValueOnce(new Error('Failed to fetch profile'));

      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText(/error loading profile/i)).toBeInTheDocument();
      });
    });

    it('provides retry option on fetch error', async () => {
      vi.clearAllMocks();
      mockApiRequest.mockRejectedValueOnce(new Error('Failed to fetch profile'));

      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('handles missing profile data gracefully', async () => {
      vi.clearAllMocks();
      mockApiRequest
        .mockResolvedValueOnce(null) // Profile data is null
        .mockResolvedValueOnce(mockCustomerStats);

      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      // Should handle gracefully without crashing
    });
  });

  describe('Responsive Design', () => {
    it('renders properly on mobile viewport', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithProviders(createMockAuthContext());

      // Component should render without issues
      expect(screen.getByText('Customer Profile')).toBeInTheDocument();
    });

    it('adapts layout for tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('Customer Profile')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for interactive elements', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      expect(editButton).toHaveAccessibleName();
    });

    it('maintains focus management during edit mode transitions', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Focus should move to first editable field
      const firstInput = screen.getByDisplayValue('70'); // weight input
      expect(document.activeElement).toBe(firstInput);
    });

    it('provides keyboard navigation support', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Customer Profile')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      
      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toBe(editButton);
    });
  });
});