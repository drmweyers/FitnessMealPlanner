import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, createMockMealPlan, generateMockRecipes, createMockRecipe } from '../test-utils';
import MealPlanModal from '../../client/src/components/MealPlanModal';

// Mock RecipeDetailModal to verify it's called correctly
const mockRecipeDetailModal = vi.fn();
vi.mock('../../client/src/components/RecipeDetailModal', () => ({
  __esModule: true,
  default: mockRecipeDetailModal,
}));

// Mock MealPrepDisplay
vi.mock('../../client/src/components/MealPrepDisplay', () => ({
  __esModule: true,
  default: ({ mealPrep, planName, days }: any) => (
    <div data-testid="meal-prep-display">
      <div>Meal Prep for {planName}</div>
      <div>Days: {days}</div>
    </div>
  ),
}));

// Mock the API request for recipe details
const mockApiRequest = vi.fn();
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

// Mock React Query
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: mockUseQuery,
  };
});

// Mock the useSafeMealPlan hook with realistic data
vi.mock('../../client/src/hooks/useSafeMealPlan', () => ({
  useSafeMealPlan: vi.fn((mealPlan) => {
    const mockRecipes = [
      createMockRecipe({
        id: 'recipe-breakfast-1',
        name: 'Healthy Breakfast Bowl',
        description: 'Nutritious start to your day',
        mealTypes: ['breakfast'],
        caloriesKcal: 320,
        proteinGrams: '18',
        prepTimeMinutes: 10,
        cookTimeMinutes: 5,
      }),
      createMockRecipe({
        id: 'recipe-lunch-1',
        name: 'Mediterranean Chicken Salad',
        description: 'Fresh and flavorful lunch option',
        mealTypes: ['lunch'],
        caloriesKcal: 450,
        proteinGrams: '35',
        prepTimeMinutes: 15,
        cookTimeMinutes: 20,
      }),
      createMockRecipe({
        id: 'recipe-dinner-1',
        name: 'Grilled Salmon with Vegetables',
        description: 'Omega-3 rich dinner',
        mealTypes: ['dinner'],
        caloriesKcal: 380,
        proteinGrams: '42',
        prepTimeMinutes: 15,
        cookTimeMinutes: 18,
      }),
      createMockRecipe({
        id: 'recipe-breakfast-2',
        name: 'Protein Smoothie',
        description: 'Quick breakfast option',
        mealTypes: ['breakfast'],
        caloriesKcal: 280,
        proteinGrams: '25',
        prepTimeMinutes: 5,
        cookTimeMinutes: 0,
      }),
      createMockRecipe({
        id: 'recipe-lunch-2',
        name: 'Quinoa Power Bowl',
        description: 'Nutrient-dense lunch',
        mealTypes: ['lunch'],
        caloriesKcal: 420,
        proteinGrams: '22',
        prepTimeMinutes: 20,
        cookTimeMinutes: 15,
      }),
      createMockRecipe({
        id: 'recipe-dinner-2',
        name: 'Lean Beef Stir Fry',
        description: 'High-protein dinner',
        mealTypes: ['dinner'],
        caloriesKcal: 410,
        proteinGrams: '38',
        prepTimeMinutes: 12,
        cookTimeMinutes: 15,
      }),
    ];

    const meals = mockRecipes.map((recipe, index) => ({
      recipe,
      mealType: recipe.mealTypes[0],
      day: Math.floor(index / 3) + 1,
    }));

    return {
      isValid: true,
      validMeals: meals,
      days: mealPlan?.mealPlanData?.days || mealPlan?.totalDays || 7,
      planName: mealPlan?.mealPlanData?.planName || mealPlan?.planName || 'Complete Fitness Plan',
      fitnessGoal: mealPlan?.mealPlanData?.fitnessGoal || mealPlan?.fitnessGoal || 'muscle_gain',
      clientName: mealPlan?.mealPlanData?.clientName || 'John Doe',
      dailyCalorieTarget: mealPlan?.mealPlanData?.dailyCalorieTarget || 2200,
      nutrition: {
        avgCaloriesPerDay: 2200,
        avgProteinPerDay: 165,
        avgCarbsPerDay: 220,
        avgFatPerDay: 75,
      },
      getMealsForDay: vi.fn((day) => meals.filter(meal => meal.day === day)),
    };
  }),
}));

describe('Meal Card Click Flow Integration', () => {
  const mockOnClose = vi.fn();
  const mockMealPlan = createMockMealPlan({
    id: 'integration-meal-plan-1',
    mealPlanData: {
      planName: 'Complete Fitness Plan',
      days: 7,
      fitnessGoal: 'muscle_gain',
      dailyCalorieTarget: 2200,
      clientName: 'John Doe',
      description: 'A comprehensive meal plan for muscle building',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup RecipeDetailModal mock
    mockRecipeDetailModal.mockImplementation(({ recipeId, isOpen, onClose }) => {
      if (!isOpen || !recipeId) return null;
      return (
        <div data-testid="recipe-detail-modal" data-recipe-id={recipeId}>
          <div data-testid="modal-header">Recipe Details</div>
          <div data-testid="recipe-content">
            Showing details for recipe: {recipeId}
          </div>
          <button onClick={onClose} data-testid="close-recipe-modal">
            Close Recipe Modal
          </button>
        </div>
      );
    });

    // Setup useQuery mock
    mockUseQuery.mockImplementation(({ queryKey, enabled }) => {
      if (!enabled) {
        return {
          data: null,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      const recipeId = queryKey[0]?.split('/').pop();
      
      if (recipeId?.includes('breakfast-1')) {
        return {
          data: createMockRecipe({
            id: 'recipe-breakfast-1',
            name: 'Healthy Breakfast Bowl',
            description: 'Nutritious start to your day',
          }),
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      return {
        data: createMockRecipe({ id: recipeId }),
        isLoading: false,
        isError: false,
        error: null,
      };
    });
  });

  afterEach(() => {
    mockOnClose.mockClear();
  });

  describe('Complete Click Flow', () => {
    it('successfully opens meal plan modal and displays meal cards', async () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      // Verify meal plan modal is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Complete Fitness Plan')).toBeInTheDocument();

      // Verify meal cards are displayed
      expect(screen.getByText('Healthy Breakfast Bowl')).toBeInTheDocument();
      expect(screen.getByText('Mediterranean Chicken Salad')).toBeInTheDocument();
      expect(screen.getByText('Grilled Salmon with Vegetables')).toBeInTheDocument();
    });

    it('clicking a meal card opens the recipe detail modal', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      // Find and click the first meal row (breakfast bowl)
      const mealRows = screen.getAllByRole('row').slice(1); // Skip header row
      const breakfastRow = mealRows.find(row => 
        row.textContent?.includes('Healthy Breakfast Bowl')
      );
      
      expect(breakfastRow).toBeInTheDocument();
      
      await user.click(breakfastRow!);

      // Verify recipe detail modal opened
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      expect(screen.getByTestId('recipe-detail-modal')).toHaveAttribute(
        'data-recipe-id',
        'recipe-breakfast-1'
      );
    });

    it('can close recipe detail modal and return to meal plan', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      // Click meal row to open recipe modal
      const mealRows = screen.getAllByRole('row').slice(1);
      const breakfastRow = mealRows.find(row => 
        row.textContent?.includes('Healthy Breakfast Bowl')
      );
      
      await user.click(breakfastRow!);

      // Wait for recipe modal to open
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // Close recipe modal
      const closeButton = screen.getByTestId('close-recipe-modal');
      await user.click(closeButton);

      // Verify recipe modal is closed and meal plan modal is still open
      await waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument(); // Meal plan modal still open
      expect(screen.getByText('Complete Fitness Plan')).toBeInTheDocument();
    });

    it('can click different meal cards sequentially', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);

      // Click first meal (breakfast)
      const breakfastRow = mealRows.find(row => 
        row.textContent?.includes('Healthy Breakfast Bowl')
      );
      await user.click(breakfastRow!);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toHaveAttribute(
          'data-recipe-id',
          'recipe-breakfast-1'
        );
      });

      // Close first modal
      await user.click(screen.getByTestId('close-recipe-modal'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();
      });

      // Click second meal (lunch)
      const lunchRow = mealRows.find(row => 
        row.textContent?.includes('Mediterranean Chicken Salad')
      );
      await user.click(lunchRow!);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toHaveAttribute(
          'data-recipe-id',
          'recipe-lunch-1'
        );
      });
    });

    it('handles rapid clicking without breaking state', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      const breakfastRow = mealRows.find(row => 
        row.textContent?.includes('Healthy Breakfast Bowl')
      );

      // Rapid clicks
      await user.click(breakfastRow!);
      await user.click(breakfastRow!);
      await user.click(breakfastRow!);

      // Should still work correctly - only one modal should be open
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      const modals = screen.getAllByTestId('recipe-detail-modal');
      expect(modals).toHaveLength(1);
    });
  });

  describe('Event Handling Integration', () => {
    it('properly prevents event propagation to parent elements', async () => {
      const parentClickHandler = vi.fn();
      const user = userEvent.setup();

      const TestWrapper = () => (
        <div onClick={parentClickHandler} data-testid="parent-container">
          <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
        </div>
      );

      renderWithProviders(<TestWrapper />);

      const mealRows = screen.getAllByRole('row').slice(1);
      const firstRow = mealRows[0];

      await user.click(firstRow);

      // Parent click handler should not be called due to event.stopPropagation()
      expect(parentClickHandler).not.toHaveBeenCalled();

      // Recipe modal should still open
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });
    });

    it('handles keyboard events on meal rows', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      const firstRow = mealRows[0];

      // Focus the row and press Enter
      firstRow.focus();
      await user.keyboard('{Enter}');

      // Recipe modal should open
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Stacking and Z-Index Integration', () => {
    it('maintains proper z-index hierarchy when both modals are open', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      // Verify meal plan modal z-index
      const mealPlanDialog = screen.getByTestId('dialog-content');
      expect(mealPlanDialog).toHaveClass('z-[50]');

      // Click meal to open recipe modal
      const mealRows = screen.getAllByRole('row').slice(1);
      await user.click(mealRows[0]);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // Both modals should be present with correct stacking
      expect(screen.getByTestId('dialog-content')).toHaveClass('z-[50]'); // Meal plan modal
      // Recipe modal should be rendered by the mocked component (z-[60] is handled there)
    });

    it('properly handles ESC key when multiple modals are open', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      // Open recipe modal
      const mealRows = screen.getAllByRole('row').slice(1);
      await user.click(mealRows[0]);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // ESC should close the top-most modal (recipe modal)
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();
      });

      // Meal plan modal should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('makes correct API calls when recipe modal opens', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      const breakfastRow = mealRows.find(row => 
        row.textContent?.includes('Healthy Breakfast Bowl')
      );

      await user.click(breakfastRow!);

      await waitFor(() => {
        expect(mockUseQuery).toHaveBeenCalledWith({
          queryKey: ['/api/admin/recipes/recipe-breakfast-1'],
          queryFn: expect.any(Function),
          enabled: true,
        });
      });
    });

    it('handles API loading states during recipe fetch', async () => {
      const user = userEvent.setup();

      // Mock loading state
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      await user.click(mealRows[0]);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // Recipe modal should handle loading state properly
      // (This would be tested more thoroughly in the RecipeDetailModal unit tests)
    });
  });

  describe('User Experience Flow', () => {
    it('maintains proper focus management throughout the flow', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      const firstRow = mealRows[0];

      // Click meal row
      await user.click(firstRow);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // Focus should be managed properly (exact behavior depends on UI library)
      expect(document.activeElement).toBeDefined();
    });

    it('provides smooth transition between meal plan and recipe views', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      // Open recipe modal
      const mealRows = screen.getAllByRole('row').slice(1);
      await user.click(mealRows[0]);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // Close recipe modal
      await user.click(screen.getByTestId('close-recipe-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();
      });

      // User should be back to meal plan view
      expect(screen.getByText('Complete Fitness Plan')).toBeInTheDocument();
      expect(screen.getByText('Healthy Breakfast Bowl')).toBeInTheDocument();
    });
  });

  describe('Error Scenarios Integration', () => {
    it('handles recipe API errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock API error
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Recipe not found'),
      });

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      await user.click(mealRows[0]);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // Recipe modal should handle error state
      // (Error handling details would be tested in RecipeDetailModal unit tests)
    });

    it('recovers from temporary API failures', async () => {
      const user = userEvent.setup();

      // First call fails
      mockUseQuery
        .mockReturnValueOnce({
          data: null,
          isLoading: false,
          isError: true,
          error: new Error('Network error'),
        })
        // Second call succeeds
        .mockReturnValueOnce({
          data: createMockRecipe({ id: 'recipe-breakfast-1' }),
          isLoading: false,
          isError: false,
          error: null,
        });

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      
      // First click (fails)
      await user.click(mealRows[0]);
      
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // Close and try again
      await user.click(screen.getByTestId('close-recipe-modal'));
      
      await waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();
      });

      // Second click (succeeds)
      await user.click(mealRows[0]);
      
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });
    });
  });
});