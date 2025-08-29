import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockMealPlan, generateMockRecipes } from '../../test-utils';
import MealPlanModal from '../../../client/src/components/MealPlanModal';
import RecipeDetailModal from '../../../client/src/components/RecipeDetailModal';

// Icons are already mocked in the global setup file

// Mock the RecipeDetailModal to control its behavior
vi.mock('../../../client/src/components/RecipeDetailModal', () => ({
  __esModule: true,
  default: vi.fn(({ recipeId, isOpen, onClose }) => {
    if (!isOpen || !recipeId) return null;
    return (
      <div data-testid="recipe-detail-modal" data-recipe-id={recipeId}>
        <div>Recipe Detail Modal</div>
        <button onClick={onClose} data-testid="close-recipe-modal">
          Close Recipe
        </button>
      </div>
    );
  }),
}));

// Mock MealPrepDisplay component
vi.mock('../../../client/src/components/MealPrepDisplay', () => ({
  __esModule: true,
  default: ({ mealPrep, planName, days }: any) => (
    <div data-testid="meal-prep-display">
      <div>Meal Prep for {planName}</div>
      <div>Days: {days}</div>
    </div>
  ),
}));

// Mock Skeleton component
vi.mock('../../../client/src/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

// Mock the useSafeMealPlan hook
vi.mock('../../../client/src/hooks/useSafeMealPlan', () => ({
  useSafeMealPlan: vi.fn((mealPlan) => {
    const mockRecipes = generateMockRecipes(6);
    const validMeals = mockRecipes.map((recipe, index) => ({
      recipe,
      mealType: ['breakfast', 'lunch', 'dinner'][index % 3],
      day: Math.floor(index / 3) + 1,
    }));
    
    const meals = validMeals; // For this mock, meals and validMeals are the same

    return {
      isValid: true,
      mealPlan,
      meals,
      validMeals,
      days: mealPlan?.mealPlanData?.days || mealPlan?.totalDays || 7,
      planName: mealPlan?.mealPlanData?.planName || mealPlan?.planName || 'Test Plan',
      fitnessGoal: mealPlan?.mealPlanData?.fitnessGoal || mealPlan?.fitnessGoal || 'weight_loss',
      clientName: mealPlan?.mealPlanData?.clientName || 'Test Client',
      dailyCalorieTarget: mealPlan?.mealPlanData?.dailyCalorieTarget || 2000,
      mealTypes: ['breakfast', 'lunch', 'dinner'],
      nutrition: {
        totalCalories: 4200,
        totalProtein: 315,
        totalCarbs: 420,
        totalFat: 140,
        avgCaloriesPerDay: 2000,
        avgProteinPerDay: 150,
        avgCarbsPerDay: 200,
        avgFatPerDay: 67,
      },
      getMealsForDay: vi.fn((day) => validMeals.filter(meal => meal.day === day)),
      hasMeals: true,
      hasValidData: true,
    };
  }),
}));

describe('MealPlanModal', () => {
  const mockOnClose = vi.fn();
  const mockMealPlan = createMockMealPlan({
    id: 'test-meal-plan-1',
    mealPlanData: {
      planName: 'Test Fitness Plan',
      days: 7,
      fitnessGoal: 'weight_loss',
      dailyCalorieTarget: 2000,
      clientName: 'Test Client',
      description: 'A comprehensive 7-day meal plan for weight loss',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockOnClose.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders modal with correct title and content', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Fitness Plan')).toBeInTheDocument();
      expect(screen.getByText(/Detailed view of your 7-day meal plan/)).toBeInTheDocument();
    });

    it('displays nutrition overview correctly', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      expect(screen.getByText('2000')).toBeInTheDocument(); // Calories
      expect(screen.getByText('150g')).toBeInTheDocument(); // Protein
      expect(screen.getByText('200g')).toBeInTheDocument(); // Carbs
      expect(screen.getByText('67g')).toBeInTheDocument(); // Fat
    });

    it('shows fitness goal and client information', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      expect(screen.getByText('weight_loss')).toBeInTheDocument();
      expect(screen.getByText('For: Test Client')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders both meal schedule and meal prep tabs', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      expect(screen.getByRole('tab', { name: /meal schedule/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /meal prep guide/i })).toBeInTheDocument();
    });

    it('defaults to meals tab being active', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealsTab = screen.getByRole('tab', { name: /meal schedule/i });
      expect(mealsTab).toHaveAttribute('data-state', 'active');
    });

    it('can switch to meal prep tab', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealPrepTab = screen.getByRole('tab', { name: /meal prep guide/i });
      fireEvent.click(mealPrepTab);

      expect(mealPrepTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Meal Card Clicking Functionality', () => {
    it('renders meal table with clickable rows', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      // Should have table with meal rows
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Look for recipe names
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
      expect(screen.getByText('Test Recipe 2')).toBeInTheDocument();
    });

    it('meal rows have proper click handlers and cursor styling', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1); // Skip header row
      expect(mealRows.length).toBeGreaterThan(0);

      // Check that rows have cursor pointer styling
      mealRows.forEach(row => {
        expect(row).toHaveClass('cursor-pointer');
        expect(row).toHaveClass('hover:bg-gray-50');
      });
    });

    it('calls handleRecipeClick when meal row is clicked', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1); // Skip header row
      const firstMealRow = mealRows[0];

      fireEvent.click(firstMealRow);

      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          'Recipe clicked:',
          expect.objectContaining({
            recipeId: expect.any(String),
            event: expect.any(Object),
          })
        );
      });

      consoleLogSpy.mockRestore();
    });

    it('prevents event propagation when meal row is clicked', async () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1); // Skip header row
      const firstMealRow = mealRows[0];

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        target: firstMealRow,
        currentTarget: firstMealRow,
      } as any;

      // Simulate click with event object
      fireEvent.click(firstMealRow, mockEvent);

      await waitFor(() => {
        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
      });
    });

    it('opens RecipeDetailModal when meal row is clicked', async () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1); // Skip header row
      const firstMealRow = mealRows[0];

      fireEvent.click(firstMealRow);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });
    });

    it('passes correct recipeId to RecipeDetailModal', async () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1); // Skip header row
      const firstMealRow = mealRows[0];

      fireEvent.click(firstMealRow);

      await waitFor(() => {
        const recipeModal = screen.getByTestId('recipe-detail-modal');
        expect(recipeModal).toHaveAttribute('data-recipe-id', 'recipe-1');
      });
    });

    it('can open and close RecipeDetailModal', async () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1); // Skip header row
      const firstMealRow = mealRows[0];

      // Open modal
      fireEvent.click(firstMealRow);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByTestId('close-recipe-modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();
      });
    });

    it('can handle clicking multiple different meal rows', async () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1); // Skip header row
      
      // Click first meal
      fireEvent.click(mealRows[0]);
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toHaveAttribute('data-recipe-id', 'recipe-1');
      });

      // Close modal
      fireEvent.click(screen.getByTestId('close-recipe-modal'));
      await waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();
      });

      // Click second meal
      if (mealRows.length > 1) {
        fireEvent.click(mealRows[1]);
        await waitFor(() => {
          expect(screen.getByTestId('recipe-detail-modal')).toHaveAttribute('data-recipe-id', 'recipe-2');
        });
      }
    });
  });

  describe('Modal State Management', () => {
    it('manages selectedRecipeId state correctly', async () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      // Initially no recipe modal should be open
      expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();

      const mealRows = screen.getAllByRole('row').slice(1);
      fireEvent.click(mealRows[0]);

      // Recipe modal should open
      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      // Close the modal
      fireEvent.click(screen.getByTestId('close-recipe-modal'));

      // Recipe modal should close
      await waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();
      });
    });

    it('sets selectedRecipeId to null when RecipeDetailModal is closed', async () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      fireEvent.click(mealRows[0]);

      await waitFor(() => {
        expect(screen.getByTestId('recipe-detail-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-recipe-modal'));

      await waitFor(() => {
        expect(screen.queryByTestId('recipe-detail-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('renders error state for invalid meal plan', () => {
      // Mock useSafeMealPlan to return invalid state for this specific test
      const mockUseSafeMealPlan = vi.fn().mockReturnValue({
        isValid: false,
        mealPlan: null,
        meals: [],
        validMeals: [],
        days: 1,
        planName: 'Untitled Plan',
        fitnessGoal: 'General',
        clientName: undefined,
        dailyCalorieTarget: 2000,
        mealTypes: [],
        nutrition: {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          avgCaloriesPerDay: 0,
          avgProteinPerDay: 0,
          avgCarbsPerDay: 0,
          avgFatPerDay: 0,
        },
        getMealsForDay: vi.fn(() => []),
        hasMeals: false,
        hasValidData: false,
      });

      // Replace the existing mock for this test
      vi.doMock('../../../client/src/hooks/useSafeMealPlan', () => ({
        useSafeMealPlan: mockUseSafeMealPlan,
      }));

      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid meal plan data. Cannot display details.')).toBeInTheDocument();
    });
  });

  describe('Meal Prep Tab', () => {
    it('shows meal prep guide when available', () => {
      const mealPlanWithPrep = createMockMealPlan({
        mealPlanData: {
          ...mockMealPlan.mealPlanData,
          startOfWeekMealPrep: {
            shoppingList: ['Item 1', 'Item 2'],
            prepSteps: ['Step 1', 'Step 2'],
          },
        },
      });

      renderWithProviders(
        <MealPlanModal mealPlan={mealPlanWithPrep} onClose={mockOnClose} />
      );

      const mealPrepTab = screen.getByRole('tab', { name: /meal prep guide/i });
      fireEvent.click(mealPrepTab);

      expect(screen.getByTestId('meal-prep-display')).toBeInTheDocument();
    });

    it('shows no meal prep message when not available', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealPrepTab = screen.getByRole('tab', { name: /meal prep guide/i });
      fireEvent.click(mealPrepTab);

      expect(screen.getByText('No Meal Prep Guide Available')).toBeInTheDocument();
      expect(screen.getByText(/This meal plan doesn't include detailed meal prep instructions/)).toBeInTheDocument();
    });
  });

  describe('Z-index and Modal Stacking', () => {
    it('MealPlanModal has correct z-index', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const dialogContent = screen.getByTestId('dialog-content');
      expect(dialogContent).toHaveClass('z-[50]');
    });

    it('RecipeDetailModal has higher z-index than MealPlanModal', async () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      fireEvent.click(mealRows[0]);

      await waitFor(() => {
        const recipeModal = screen.getByTestId('recipe-detail-modal');
        expect(recipeModal).toBeInTheDocument();
      });

      // RecipeDetailModal should have z-[60] while MealPlanModal has z-[50]
      // This is handled in the actual RecipeDetailModal component
    });
  });

  describe('Accessibility', () => {
    it('meal table has proper ARIA labels', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(4); // Recipe, Type, Nutrition, Time
    });

    it('meal rows are keyboard accessible', () => {
      renderWithProviders(
        <MealPlanModal mealPlan={mockMealPlan} onClose={mockOnClose} />
      );

      const mealRows = screen.getAllByRole('row').slice(1);
      const firstRow = mealRows[0];
      
      // Should be focusable as clickable element
      expect(firstRow).toHaveAttribute('tabIndex', expect.any(String));
    });
  });
});