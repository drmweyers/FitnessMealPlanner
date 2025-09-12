import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MealPlanGenerator from '@/components/MealPlanGenerator';
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

const mockRecipes = [
  {
    id: '1',
    title: 'Grilled Chicken Salad',
    description: 'Healthy protein-packed salad',
    cuisine: 'Mediterranean',
    dietaryRestrictions: ['gluten-free'],
    calories: 350,
    prepTime: 20,
    servings: 2,
    imageUrl: '/images/chicken-salad.jpg',
    isApproved: true,
  },
  {
    id: '2',
    title: 'Quinoa Bowl',
    description: 'Nutritious quinoa with vegetables',
    cuisine: 'Modern',
    dietaryRestrictions: ['vegetarian', 'gluten-free'],
    calories: 420,
    prepTime: 25,
    servings: 1,
    imageUrl: '/images/quinoa-bowl.jpg',
    isApproved: true,
  },
];

const mockGeneratedMealPlan = {
  id: 'mp-1',
  title: 'Weekly Meal Plan',
  description: 'Custom meal plan for weight loss',
  startDate: '2024-01-15',
  endDate: '2024-01-21',
  totalCalories: 1800,
  mealsPerDay: 3,
  days: [
    {
      date: '2024-01-15',
      meals: [
        {
          id: 'm1',
          type: 'breakfast',
          recipe: mockRecipes[0],
          servings: 1,
        },
        {
          id: 'm2',
          type: 'lunch',
          recipe: mockRecipes[1],
          servings: 1,
        },
      ],
    },
  ],
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
        <MealPlanGenerator />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('MealPlanGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default API responses
    mockApiRequest.mockImplementation((url: string) => {
      if (url.includes('/recipes')) {
        return Promise.resolve(mockRecipes);
      }
      if (url.includes('/meal-plans/generate')) {
        return Promise.resolve(mockGeneratedMealPlan);
      }
      return Promise.resolve([]);
    });
  });

  describe('Component Rendering', () => {
    it('renders meal plan generator form with all required fields', async () => {
      renderWithProviders(createMockAuthContext());

      await waitFor(() => {
        expect(screen.getByText('Meal Plan Generator')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/plan title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/meals per day/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/target calories/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate meal plan/i })).toBeInTheDocument();
    });

    it('displays dietary restrictions checkboxes', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByLabelText(/vegetarian/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/vegan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/gluten.free/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dairy.free/i)).toBeInTheDocument();
    });

    it('shows cuisine preference options', () => {
      renderWithProviders(createMockAuthContext());

      const cuisineSelect = screen.getByLabelText(/cuisine preference/i);
      expect(cuisineSelect).toBeInTheDocument();
      
      fireEvent.click(cuisineSelect);
      
      expect(screen.getByText('Mediterranean')).toBeInTheDocument();
      expect(screen.getByText('Asian')).toBeInTheDocument();
      expect(screen.getByText('Italian')).toBeInTheDocument();
    });

    it('includes activity level selection', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByLabelText(/activity level/i)).toBeInTheDocument();
      
      const activitySelect = screen.getByLabelText(/activity level/i);
      fireEvent.click(activitySelect);
      
      expect(screen.getByText('Sedentary')).toBeInTheDocument();
      expect(screen.getByText('Lightly Active')).toBeInTheDocument();
      expect(screen.getByText('Moderately Active')).toBeInTheDocument();
      expect(screen.getByText('Very Active')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required plan title field', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/plan title is required/i)).toBeInTheDocument();
      });
    });

    it('validates start date is not in the past', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      const startDateInput = screen.getByLabelText(/start date/i);

      await user.type(titleInput, 'My Meal Plan');
      await user.type(startDateInput, '2020-01-01'); // Past date

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/start date cannot be in the past/i)).toBeInTheDocument();
      });
    });

    it('validates duration is within reasonable limits', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      const durationInput = screen.getByLabelText(/duration/i);

      await user.type(titleInput, 'My Meal Plan');
      await user.clear(durationInput);
      await user.type(durationInput, '100'); // Too long

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/duration must be between 1 and 30 days/i)).toBeInTheDocument();
      });
    });

    it('validates meals per day is reasonable', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      const mealsInput = screen.getByLabelText(/meals per day/i);

      await user.type(titleInput, 'My Meal Plan');
      await user.clear(mealsInput);
      await user.type(mealsInput, '10'); // Too many

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/meals per day must be between 1 and 6/i)).toBeInTheDocument();
      });
    });

    it('validates target calories is within healthy range', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      const caloriesInput = screen.getByLabelText(/target calories/i);

      await user.type(titleInput, 'My Meal Plan');
      await user.clear(caloriesInput);
      await user.type(caloriesInput, '500'); // Too low

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/calories must be between 1200 and 4000/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    it('allows entering plan title', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      await user.type(titleInput, 'My Custom Meal Plan');

      expect(titleInput).toHaveValue('My Custom Meal Plan');
    });

    it('allows selecting start date', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, '2024-02-01');

      expect(startDateInput).toHaveValue('2024-02-01');
    });

    it('allows adjusting duration with stepper controls', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const durationInput = screen.getByLabelText(/duration/i);
      const increaseButton = screen.getByRole('button', { name: /increase duration/i });

      const initialValue = parseInt(durationInput.value || '7');
      await user.click(increaseButton);

      expect(durationInput).toHaveValue((initialValue + 1).toString());
    });

    it('allows selecting dietary restrictions', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const vegetarianCheckbox = screen.getByLabelText(/vegetarian/i);
      const glutenFreeCheckbox = screen.getByLabelText(/gluten.free/i);

      await user.click(vegetarianCheckbox);
      await user.click(glutenFreeCheckbox);

      expect(vegetarianCheckbox).toBeChecked();
      expect(glutenFreeCheckbox).toBeChecked();
    });

    it('allows selecting cuisine preferences', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const cuisineSelect = screen.getByLabelText(/cuisine preference/i);
      await user.click(cuisineSelect);
      
      const mediterraneanOption = screen.getByText('Mediterranean');
      await user.click(mediterraneanOption);

      expect(cuisineSelect).toHaveTextContent('Mediterranean');
    });

    it('calculates end date automatically based on start date and duration', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const startDateInput = screen.getByLabelText(/start date/i);
      const durationInput = screen.getByLabelText(/duration/i);

      await user.type(startDateInput, '2024-02-01');
      await user.clear(durationInput);
      await user.type(durationInput, '7');

      // End date should be calculated automatically
      expect(screen.getByText('Feb 8, 2024')).toBeInTheDocument();
    });
  });

  describe('Meal Plan Generation', () => {
    it('generates meal plan with valid form data', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const caloriesInput = screen.getByLabelText(/target calories/i);

      await user.type(titleInput, 'Test Meal Plan');
      await user.type(startDateInput, '2024-02-01');
      await user.clear(caloriesInput);
      await user.type(caloriesInput, '2000');

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/meal-plans/generate',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"title":"Test Meal Plan"'),
          })
        );
      });
    });

    it('shows loading state during generation', async () => {
      const user = userEvent.setup();
      let resolveGeneration: (value: any) => void;
      mockApiRequest.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveGeneration = resolve;
        })
      );

      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      await user.type(titleInput, 'Test Plan');

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      expect(screen.getByText(/generating meal plan/i)).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      resolveGeneration!(mockGeneratedMealPlan);
    });

    it('displays generated meal plan preview', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      await user.type(titleInput, 'Test Plan');

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Weekly Meal Plan')).toBeInTheDocument();
        expect(screen.getByText('Grilled Chicken Salad')).toBeInTheDocument();
        expect(screen.getByText('Quinoa Bowl')).toBeInTheDocument();
      });
    });

    it('includes dietary restrictions in generation request', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      const vegetarianCheckbox = screen.getByLabelText(/vegetarian/i);

      await user.type(titleInput, 'Vegetarian Plan');
      await user.click(vegetarianCheckbox);

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          '/api/meal-plans/generate',
          expect.objectContaining({
            body: expect.stringContaining('"dietaryRestrictions":["vegetarian"]'),
          })
        );
      });
    });

    it('shows save meal plan option after generation', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      await user.type(titleInput, 'Test Plan');

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save meal plan/i })).toBeInTheDocument();
      });
    });

    it('allows regenerating meal plan with different options', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      await user.type(titleInput, 'Test Plan');

      // Generate first plan
      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Weekly Meal Plan')).toBeInTheDocument();
      });

      // Regenerate with different settings
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      await user.click(regenerateButton);

      expect(mockApiRequest).toHaveBeenCalledTimes(3); // Initial recipes + 2 generations
    });
  });

  describe('Error Handling', () => {
    it('displays error message when generation fails', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockRejectedValueOnce(new Error('Generation failed'));

      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      await user.type(titleInput, 'Test Plan');

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to generate meal plan/i)).toBeInTheDocument();
      });
    });

    it('handles insufficient recipes error', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockRejectedValueOnce(new Error('Not enough recipes found'));

      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      await user.type(titleInput, 'Test Plan');

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/not enough recipes available/i)).toBeInTheDocument();
      });
    });

    it('provides retry option on generation failure', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      await user.type(titleInput, 'Test Plan');

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      // Test retry functionality
      mockApiRequest.mockResolvedValueOnce(mockGeneratedMealPlan);
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Weekly Meal Plan')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper labels for all form controls', () => {
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      const startDateInput = screen.getByLabelText(/start date/i);
      const durationInput = screen.getByLabelText(/duration/i);
      const caloriesInput = screen.getByLabelText(/target calories/i);

      expect(titleInput).toHaveAccessibleName();
      expect(startDateInput).toHaveAccessibleName();
      expect(durationInput).toHaveAccessibleName();
      expect(caloriesInput).toHaveAccessibleName();
    });

    it('provides ARIA descriptions for complex controls', () => {
      renderWithProviders(createMockAuthContext());

      const durationInput = screen.getByLabelText(/duration/i);
      expect(durationInput).toHaveAccessibleDescription();
    });

    it('announces generation progress to screen readers', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      await user.type(titleInput, 'Test Plan');

      const generateButton = screen.getByRole('button', { name: /generate meal plan/i });
      await user.click(generateButton);

      // Should have live region for progress updates
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('maintains keyboard navigation throughout the form', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const titleInput = screen.getByLabelText(/plan title/i);
      titleInput.focus();

      // Tab through form elements
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText(/start date/i));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText(/duration/i));
    });
  });
});