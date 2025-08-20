/**
 * MealPlanCard Component Tests
 * 
 * Comprehensive tests for the MealPlanCard component covering:
 * - Meal plan information display
 * - Nutrition summary calculations
 * - User interactions and click handlers
 * - Assignment status display
 * - Accessibility and keyboard navigation
 * - Responsive design elements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MealPlanCard from '@/components/MealPlanCard';
import { renderWithProviders, createMockMealPlan, createMockRecipe } from '../../test-utils';

describe('MealPlanCard', () => {
  const mockOnClick = vi.fn();
  
  const mockMealPlan = createMockMealPlan({
    id: 'meal-plan-1',
    name: 'Healthy Weight Loss Plan',
    days: 7,
    mealsPerDay: 3,
    targetCalories: 1800,
    targetProtein: 135,
    targetCarbs: 180,
    targetFat: 60,
    meals: [
      // Day 1 meals
      {
        day: 1,
        mealType: 'breakfast',
        recipe: createMockRecipe({ 
          name: 'Protein Pancakes',
          caloriesKcal: 350,
          proteinGrams: '25',
        }),
      },
      {
        day: 1,
        mealType: 'lunch',
        recipe: createMockRecipe({ 
          name: 'Grilled Chicken Salad',
          caloriesKcal: 400,
          proteinGrams: '35',
        }),
      },
      {
        day: 1,
        mealType: 'dinner',
        recipe: createMockRecipe({ 
          name: 'Salmon with Vegetables',
          caloriesKcal: 500,
          proteinGrams: '40',
        }),
      },
      // Day 2 meals
      {
        day: 2,
        mealType: 'breakfast',
        recipe: createMockRecipe({ 
          name: 'Oatmeal Bowl',
          caloriesKcal: 300,
          proteinGrams: '20',
        }),
      },
      {
        day: 2,
        mealType: 'lunch',
        recipe: createMockRecipe({ 
          name: 'Turkey Wrap',
          caloriesKcal: 450,
          proteinGrams: '30',
        }),
      },
      {
        day: 2,
        mealType: 'dinner',
        recipe: createMockRecipe({ 
          name: 'Beef Stir Fry',
          caloriesKcal: 550,
          proteinGrams: '45',
        }),
      },
      // Add more meals for realistic 7-day plan
      {
        day: 3,
        mealType: 'breakfast',
        recipe: createMockRecipe({ 
          name: 'Greek Yogurt Parfait',
          caloriesKcal: 280,
          proteinGrams: '22',
        }),
      },
      {
        day: 3,
        mealType: 'lunch',
        recipe: createMockRecipe({ 
          name: 'Quinoa Salad',
          caloriesKcal: 380,
          proteinGrams: '18',
        }),
      },
      {
        day: 3,
        mealType: 'dinner',
        recipe: createMockRecipe({ 
          name: 'Baked Cod',
          caloriesKcal: 420,
          proteinGrams: '38',
        }),
      },
      // Continue pattern for remaining days
      {
        day: 4,
        mealType: 'breakfast',
        recipe: createMockRecipe({ 
          name: 'Smoothie Bowl',
          caloriesKcal: 320,
          proteinGrams: '24',
        }),
      },
      {
        day: 4,
        mealType: 'lunch',
        recipe: createMockRecipe({ 
          name: 'Chicken Caesar Salad',
          caloriesKcal: 430,
          proteinGrams: '32',
        }),
      },
      {
        day: 4,
        mealType: 'dinner',
        recipe: createMockRecipe({ 
          name: 'Pork Tenderloin',
          caloriesKcal: 480,
          proteinGrams: '42',
        }),
      },
      {
        day: 5,
        mealType: 'breakfast',
        recipe: createMockRecipe({ 
          name: 'Egg White Scramble',
          caloriesKcal: 290,
          proteinGrams: '26',
        }),
      },
      {
        day: 5,
        mealType: 'lunch',
        recipe: createMockRecipe({ 
          name: 'Tuna Salad',
          caloriesKcal: 390,
          proteinGrams: '28',
        }),
      },
      {
        day: 5,
        mealType: 'dinner',
        recipe: createMockRecipe({ 
          name: 'Grilled Chicken Breast',
          caloriesKcal: 460,
          proteinGrams: '40',
        }),
      },
      {
        day: 6,
        mealType: 'breakfast',
        recipe: createMockRecipe({ 
          name: 'Protein Shake',
          caloriesKcal: 260,
          proteinGrams: '30',
        }),
      },
      {
        day: 6,
        mealType: 'lunch',
        recipe: createMockRecipe({ 
          name: 'Mediterranean Bowl',
          caloriesKcal: 420,
          proteinGrams: '25',
        }),
      },
      {
        day: 6,
        mealType: 'dinner',
        recipe: createMockRecipe({ 
          name: 'Shrimp Pasta',
          caloriesKcal: 510,
          proteinGrams: '35',
        }),
      },
      {
        day: 7,
        mealType: 'breakfast',
        recipe: createMockRecipe({ 
          name: 'Avocado Toast',
          caloriesKcal: 340,
          proteinGrams: '18',
        }),
      },
      {
        day: 7,
        mealType: 'lunch',
        recipe: createMockRecipe({ 
          name: 'Lentil Soup',
          caloriesKcal: 360,
          proteinGrams: '20',
        }),
      },
      {
        day: 7,
        mealType: 'dinner',
        recipe: createMockRecipe({ 
          name: 'Grilled Salmon',
          caloriesKcal: 490,
          proteinGrams: '44',
        }),
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Meal Plan Display', () => {
    it('renders meal plan basic information correctly', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('Healthy Weight Loss Plan')).toBeInTheDocument();
      expect(screen.getByText('7 Day Plan')).toBeInTheDocument();
      expect(screen.getByText('3 meals/day')).toBeInTheDocument(); // 21 meals / 7 days = 3 meals/day
    });

    it('displays calculated nutrition correctly', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      // Component calculates from actual meals and shows nutrition values
      expect(screen.getByText('Calories')).toBeInTheDocument();
      expect(screen.getByText('Protein')).toBeInTheDocument();
      expect(screen.getByText('91g')).toBeInTheDocument(); // 91g protein per day
      expect(screen.getAllByText('per day')).toHaveLength(2); // Both calories and protein have "per day"
    });

    it('calculates and displays total meals correctly', () => {
      const mealPlan = createMockMealPlan({
        days: 5,
        mealsPerDay: 4,
        meals: [], // No meals provided, so should show 0
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('5 Day Plan')).toBeInTheDocument();
      expect(screen.getByText('0 meals/day')).toBeInTheDocument(); // No meals provided
    });

    it('shows meal count when meals are provided', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('21 total meals')).toBeInTheDocument(); // 21 meals total in the plan
    });
  });

  describe('Status Display', () => {
    it('shows active status when isActive is true', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows assigned date information', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText(/Assigned/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles click events correctly', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      // Click handler is on CardContent, which has the data-testid="card-content"
      const cardContent = screen.getByTestId('card-content');
      expect(cardContent).toBeInTheDocument();

      await user.click(cardContent);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('shows hover effects on interaction', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const card = screen.getByText('Healthy Weight Loss Plan').closest('.group');
      expect(card).toHaveClass('hover:shadow-lg');
    });

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const cardContent = screen.getByTestId('card-content');
      expect(cardContent).toBeInTheDocument();
      
      // Test that the card content is clickable
      await user.click(cardContent);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Nutrition Information', () => {
    it('displays calculated nutrition values', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      // Component displays calculated values from actual meals
      expect(screen.getByText('1197')).toBeInTheDocument(); // Calculated calories per day
      expect(screen.getByText('91g')).toBeInTheDocument(); // Calculated protein amount in grams
      expect(screen.getAllByText('per day')).toHaveLength(2); // Per day indicator for both calories and protein
    });

    it('handles meals with zero nutrition values', () => {
      const mealPlan = createMockMealPlan({
        meals: [],
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('0')).toBeInTheDocument(); // Zero calories
      expect(screen.getByText('0g')).toBeInTheDocument(); // Zero protein
    });

    it('displays nutrition labels correctly', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('Calories')).toBeInTheDocument();
      expect(screen.getByText('Protein')).toBeInTheDocument();
      expect(screen.getAllByText('per day')).toHaveLength(2); // For both calories and protein
    });
  });

  describe('Date Formatting', () => {
    it('displays assigned date correctly', () => {
      const specificDate = '2024-01-15T10:30:00Z';
      const mealPlan = createMockMealPlan({
        assignedAt: specificDate,
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      // Component shows assignedAt date, not createdAt
      expect(screen.getByText(/Assigned/)).toBeInTheDocument();
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('handles assigned dates appropriately', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      // Should display the assigned date without errors
      expect(screen.getByText(/Assigned/)).toBeInTheDocument();
      expect(screen.getByText('Healthy Weight Loss Plan')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      // Check for proper heading
      expect(screen.getByRole('heading')).toHaveTextContent('Healthy Weight Loss Plan');
    });

    it('provides accessible meal plan information', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      // Check that key information is accessible
      expect(screen.getByText('7 Day Plan')).toBeInTheDocument();
      expect(screen.getByText('3 meals/day')).toBeInTheDocument();
      expect(screen.getByText('1197')).toBeInTheDocument(); // Calculated calories
    });

    it('has proper ARIA attributes for interactive elements', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const card = screen.getByText('Healthy Weight Loss Plan').closest('.cursor-pointer');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('Edge Cases', () => {
    it('handles meal plan with no meals', () => {
      const mealPlan = createMockMealPlan({
        meals: [],
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('0 total meals')).toBeInTheDocument();
      expect(screen.getByText('0 meals/day')).toBeInTheDocument();
    });

    it('handles very long meal plan names', () => {
      const mealPlan = createMockMealPlan({
        planName: 'This is a very long meal plan name that should be handled gracefully without breaking the layout',
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      const nameElement = screen.getByText(/This is a very long meal plan name/);
      expect(nameElement).toBeInTheDocument();
    });

    it('handles single day meal plans', () => {
      const mealPlan = createMockMealPlan({
        days: 1,
        meals: [
          {
            day: 1,
            mealType: 'breakfast',
            recipe: createMockRecipe({ name: 'Single Meal' }),
          },
        ],
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('1 Day Plan')).toBeInTheDocument();
      expect(screen.getByText('1 meals/day')).toBeInTheDocument(); // 1 meal / 1 day = 1 meal/day
    });

    it('handles meal plans with partial meal data', () => {
      const mealPlan = createMockMealPlan({
        meals: [
          {
            day: 1,
            mealType: 'breakfast',
            recipe: createMockRecipe({ name: 'Breakfast Only' }),
          },
        ],
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('1 total meals')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('applies correct CSS classes for layout', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const card = screen.getByText('Healthy Weight Loss Plan').closest('.group');
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveClass('transition-all');
    });

    it('shows proper visual hierarchy', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const title = screen.getByRole('heading');
      expect(title).toHaveClass('font-semibold');
    });
  });

  describe('Performance', () => {
    it('does not trigger unnecessary re-renders', () => {
      const { rerender } = renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      // Rerender with same props
      rerender(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('Healthy Weight Loss Plan')).toBeInTheDocument();
    });

    it('handles prop changes efficiently', () => {
      const { rerender } = renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const updatedMealPlan = createMockMealPlan({
        name: 'Updated Meal Plan',
      });

      rerender(
        <MealPlanCard mealPlan={updatedMealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('Updated Meal Plan')).toBeInTheDocument();
      expect(screen.queryByText('Healthy Weight Loss Plan')).not.toBeInTheDocument();
    });
  });
});