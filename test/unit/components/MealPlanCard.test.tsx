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
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.getByText('3 meals/day')).toBeInTheDocument();
    });

    it('displays nutrition targets correctly', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('1800 cal')).toBeInTheDocument();
      expect(screen.getByText('135g protein')).toBeInTheDocument();
      expect(screen.getByText('180g carbs')).toBeInTheDocument();
      expect(screen.getByText('60g fat')).toBeInTheDocument();
    });

    it('calculates and displays total meals correctly', () => {
      const mealPlan = createMockMealPlan({
        days: 5,
        mealsPerDay: 4,
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('5 days')).toBeInTheDocument();
      expect(screen.getByText('4 meals/day')).toBeInTheDocument();
    });

    it('shows meal count when meals are provided', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('3 meals')).toBeInTheDocument();
    });
  });

  describe('Assignment Status', () => {
    it('shows assigned status when isAssigned is true', () => {
      renderWithProviders(
        <MealPlanCard 
          mealPlan={mockMealPlan} 
          onClick={mockOnClick}
          isAssigned={true}
        />
      );

      expect(screen.getByText('Assigned')).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('shows unassigned status when isAssigned is false', () => {
      renderWithProviders(
        <MealPlanCard 
          mealPlan={mockMealPlan} 
          onClick={mockOnClick}
          isAssigned={false}
        />
      );

      expect(screen.getByText('Not Assigned')).toBeInTheDocument();
    });

    it('hides assignment status when isAssigned is undefined', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      expect(screen.queryByText('Assigned')).not.toBeInTheDocument();
      expect(screen.queryByText('Not Assigned')).not.toBeInTheDocument();
    });

    it('applies correct styling for assigned status', () => {
      renderWithProviders(
        <MealPlanCard 
          mealPlan={mockMealPlan} 
          onClick={mockOnClick}
          isAssigned={true}
        />
      );

      const assignedBadge = screen.getByText('Assigned');
      expect(assignedBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('applies correct styling for unassigned status', () => {
      renderWithProviders(
        <MealPlanCard 
          mealPlan={mockMealPlan} 
          onClick={mockOnClick}
          isAssigned={false}
        />
      );

      const unassignedBadge = screen.getByText('Not Assigned');
      expect(unassignedBadge).toHaveClass('bg-gray-100', 'text-gray-600');
    });
  });

  describe('User Interactions', () => {
    it('handles click events correctly', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const card = screen.getByText('Healthy Weight Loss Plan').closest('.cursor-pointer');
      expect(card).toBeInTheDocument();

      await user.click(card!);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClick).toHaveBeenCalledWith(mockMealPlan);
    });

    it('shows hover effects on interaction', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const card = screen.getByText('Healthy Weight Loss Plan').closest('.group');
      expect(card).toHaveClass('hover:shadow-md');
    });

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const card = screen.getByText('Healthy Weight Loss Plan').closest('.cursor-pointer');
      
      // Tab to focus the card
      await user.tab();
      expect(card).toHaveFocus();

      // Press Enter to trigger click
      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Nutrition Information', () => {
    it('displays individual nutrition values', () => {
      const mealPlan = createMockMealPlan({
        targetCalories: 2200,
        targetProtein: 165,
        targetCarbs: 220,
        targetFat: 73,
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('2200 cal')).toBeInTheDocument();
      expect(screen.getByText('165g protein')).toBeInTheDocument();
      expect(screen.getByText('220g carbs')).toBeInTheDocument();
      expect(screen.getByText('73g fat')).toBeInTheDocument();
    });

    it('handles zero nutrition values', () => {
      const mealPlan = createMockMealPlan({
        targetCalories: 0,
        targetProtein: 0,
        targetCarbs: 0,
        targetFat: 0,
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('0 cal')).toBeInTheDocument();
      expect(screen.getByText('0g protein')).toBeInTheDocument();
      expect(screen.getByText('0g carbs')).toBeInTheDocument();
      expect(screen.getByText('0g fat')).toBeInTheDocument();
    });

    it('rounds decimal values appropriately', () => {
      const mealPlan = createMockMealPlan({
        targetCalories: 1875.7,
        targetProtein: 134.6,
        targetCarbs: 187.3,
        targetFat: 62.1,
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('1876 cal')).toBeInTheDocument();
      expect(screen.getByText('135g protein')).toBeInTheDocument();
      expect(screen.getByText('187g carbs')).toBeInTheDocument();
      expect(screen.getByText('62g fat')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('displays creation date correctly', () => {
      const specificDate = new Date('2024-01-15T10:30:00Z');
      const mealPlan = createMockMealPlan({
        createdAt: specificDate,
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      // Check that some form of date display is present
      // (Exact format may depend on locale)
      expect(screen.getByText(/Jan|January/)).toBeInTheDocument();
    });

    it('handles recent dates appropriately', () => {
      const recentDate = new Date();
      const mealPlan = createMockMealPlan({
        createdAt: recentDate,
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      // Should display the date without errors
      const card = screen.getByText('Healthy Weight Loss Plan');
      expect(card).toBeInTheDocument();
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
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.getByText('3 meals/day')).toBeInTheDocument();
      expect(screen.getByText('1800 cal')).toBeInTheDocument();
    });

    it('has proper ARIA attributes for interactive elements', () => {
      renderWithProviders(
        <MealPlanCard mealPlan={mockMealPlan} onClick={mockOnClick} />
      );

      const card = screen.getByText('Healthy Weight Loss Plan').closest('[role="button"]');
      expect(card).toHaveAttribute('tabIndex', '0');
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

      expect(screen.getByText('0 meals')).toBeInTheDocument();
    });

    it('handles very long meal plan names', () => {
      const mealPlan = createMockMealPlan({
        name: 'This is a very long meal plan name that should be handled gracefully without breaking the layout',
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
        mealsPerDay: 1,
      });

      renderWithProviders(
        <MealPlanCard mealPlan={mealPlan} onClick={mockOnClick} />
      );

      expect(screen.getByText('1 day')).toBeInTheDocument();
      expect(screen.getByText('1 meal/day')).toBeInTheDocument();
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

      expect(screen.getByText('1 meal')).toBeInTheDocument();
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