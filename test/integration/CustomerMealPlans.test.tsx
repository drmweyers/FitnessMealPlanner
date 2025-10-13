/**
 * Integration Tests for Customer Meal Plans
 * 
 * These tests ensure that the meal plan components handle various
 * data structures and edge cases without runtime errors.
 */

import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../../client/src/contexts/AuthContext';
import MealPlanCard from '../../client/src/components/MealPlanCard';
import MealPlanModal from '../../client/src/components/MealPlanModal';
import type { CustomerMealPlan } from '@shared/schema';
import type { AuthContextValue } from '../../client/src/types/auth';

// Mock the UI components
vi.mock('../../client/src/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('../../client/src/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('../../client/src/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('../../client/src/components/RecipeDetailModal', () => ({
  default: () => <div>Recipe Detail Modal</div>,
}));

// Test data
const createMealPlan = (overrides = {}): CustomerMealPlan => ({
  id: 'test-id',
  customerId: 'customer-id',
  trainerId: 'trainer-id',
  assignedAt: new Date('2024-01-01'),
  mealPlanData: {
    id: 'plan-id',
    planName: 'Test Meal Plan',
    fitnessGoal: 'weight_loss',
    description: 'A test meal plan',
    dailyCalorieTarget: 2000,
    clientName: 'Test Client',
    days: 3,
    mealsPerDay: 3,
    generatedBy: 'trainer-id',
    createdAt: new Date('2024-01-01'),
    meals: [
      {
        day: 1,
        mealNumber: 1,
        mealType: 'breakfast',
        recipe: {
          id: 'recipe-1',
          name: 'Healthy Breakfast',
          description: 'A nutritious breakfast',
          caloriesKcal: 350,
          proteinGrams: '25',
          carbsGrams: '40',
          fatGrams: '12',
          servings: 1,
          prepTimeMinutes: 10,
          cookTimeMinutes: 15,
          ingredientsJson: [{ name: 'Oats', amount: '1', unit: 'cup' }],
          instructionsText: 'Cook oats with water',
          imageUrl: 'breakfast.jpg',
          mealTypes: ['breakfast'],
          dietaryTags: ['vegetarian'],
          mainIngredientTags: ['oats'],
        },
      },
      {
        day: 1,
        mealNumber: 2,
        mealType: 'lunch',
        recipe: {
          id: 'recipe-2',
          name: 'Power Lunch',
          description: 'Energizing lunch',
          caloriesKcal: 450,
          proteinGrams: '30',
          carbsGrams: '35',
          fatGrams: '18',
          servings: 1,
          prepTimeMinutes: 15,
          cookTimeMinutes: 20,
          ingredientsJson: [{ name: 'Chicken', amount: '150', unit: 'g' }],
          instructionsText: 'Grill chicken',
          imageUrl: 'lunch.jpg',
          mealTypes: ['lunch'],
          dietaryTags: ['high-protein'],
          mainIngredientTags: ['chicken'],
        },
      },
    ],
  },
  planName: 'Test Meal Plan',
  fitnessGoal: 'weight_loss',
  dailyCalorieTarget: 2000,
  totalDays: 3,
  mealsPerDay: 3,
  isActive: true,
  description: 'A test meal plan',
  ...overrides,
});

// Mock auth context value
const mockAuthValue: AuthContextValue = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'customer',
    profilePicture: null,
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
};

const renderWithQuery = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <AuthContext.Provider value={mockAuthValue}>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

describe('MealPlanCard Component', () => {
  test('renders without crashing with valid data', () => {
    const mealPlan = createMealPlan();
    const onClick = vi.fn();

    renderWithQuery(<MealPlanCard mealPlan={mealPlan} onClick={onClick} />);

    expect(screen.getByText('Test Meal Plan')).toBeInTheDocument();
    expect(screen.getByText('weight loss')).toBeInTheDocument();
    expect(screen.getByText('3 Day Plan')).toBeInTheDocument();
  });

  test('handles missing mealPlanData gracefully', () => {
    const mealPlan = createMealPlan({ mealPlanData: null });
    const onClick = vi.fn();

    renderWithQuery(<MealPlanCard mealPlan={mealPlan} onClick={onClick} />);

    // Should still render without crashing
    expect(screen.getByText('Test Meal Plan')).toBeInTheDocument();
  });

  test('handles empty meals array', () => {
    const mealPlan = createMealPlan({
      mealPlanData: {
        ...createMealPlan().mealPlanData!,
        meals: [],
      },
    });
    const onClick = vi.fn();

    renderWithQuery(<MealPlanCard mealPlan={mealPlan} onClick={onClick} />);

    expect(screen.getByText('Test Meal Plan')).toBeInTheDocument();
    expect(screen.getByText('0 total meals')).toBeInTheDocument();
  });

  test('handles meals with missing recipe data', () => {
    const mealPlan = createMealPlan({
      mealPlanData: {
        ...createMealPlan().mealPlanData!,
        meals: [
          createMealPlan().mealPlanData!.meals[0],
          { day: 2, mealNumber: 1, mealType: 'lunch', recipe: null } as any,
          { day: 3, mealNumber: 1, mealType: 'dinner' } as any, // missing recipe
        ],
      },
    });
    const onClick = vi.fn();

    renderWithQuery(<MealPlanCard mealPlan={mealPlan} onClick={onClick} />);

    // Should filter out invalid meals and only count valid ones
    expect(screen.getByText('Test Meal Plan')).toBeInTheDocument();
  });

  test('calculates nutrition correctly', () => {
    const mealPlan = createMealPlan();
    const onClick = vi.fn();

    renderWithQuery(<MealPlanCard mealPlan={mealPlan} onClick={onClick} />);

    // Should show average calories per day
    // (350 + 450) / 3 days = 267 calories per day (rounded)
    expect(screen.getByText('267')).toBeInTheDocument(); // calories
  });

  test('handles click events', () => {
    const mealPlan = createMealPlan();
    const onClick = vi.fn();

    renderWithQuery(<MealPlanCard mealPlan={mealPlan} onClick={onClick} />);

    const card = screen.getByText('Test Meal Plan').closest('div');
    fireEvent.click(card!);

    expect(onClick).toHaveBeenCalled();
  });
});

describe('MealPlanModal Component', () => {
  test('renders without crashing with valid data', () => {
    const mealPlan = createMealPlan();
    const onClose = vi.fn();

    renderWithQuery(<MealPlanModal mealPlan={mealPlan} onClose={onClose} />);

    expect(screen.getByText('Test Meal Plan')).toBeInTheDocument();
    expect(screen.getByText('Daily Meal Schedule')).toBeInTheDocument();
  });

  test('handles missing mealPlanData gracefully', () => {
    const mealPlan = createMealPlan({ mealPlanData: null });
    const onClose = vi.fn();

    renderWithQuery(<MealPlanModal mealPlan={mealPlan} onClose={onClose} />);

    // Should render without crashing, even with missing data
    expect(screen.getByText('Daily Meal Schedule')).toBeInTheDocument();
  });

  test('handles empty meals array', () => {
    const mealPlan = createMealPlan({
      mealPlanData: {
        ...createMealPlan().mealPlanData!,
        meals: [],
      },
    });
    const onClose = vi.fn();

    renderWithQuery(<MealPlanModal mealPlan={mealPlan} onClose={onClose} />);

    expect(screen.getByText('Daily Meal Schedule')).toBeInTheDocument();
  });

  test('displays nutrition information correctly', () => {
    const mealPlan = createMealPlan();
    const onClose = vi.fn();

    renderWithQuery(<MealPlanModal mealPlan={mealPlan} onClose={onClose} />);

    // Should display average nutrition per day
    expect(screen.getByText('267')).toBeInTheDocument(); // avg calories
    expect(screen.getByText('18g')).toBeInTheDocument(); // avg protein
  });

  test('displays meal schedule by days', () => {
    const mealPlan = createMealPlan();
    const onClose = vi.fn();

    renderWithQuery(<MealPlanModal mealPlan={mealPlan} onClose={onClose} />);

    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Healthy Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Power Lunch')).toBeInTheDocument();
  });
});

describe('Edge Cases and Error Scenarios', () => {
  test('components handle null/undefined props', () => {
    const onClose = vi.fn();
    const onClick = vi.fn();

    // Test with null meal plan
    expect(() => {
      renderWithQuery(<MealPlanCard mealPlan={null as any} onClick={onClick} />);
    }).not.toThrow();

    expect(() => {
      renderWithQuery(<MealPlanModal mealPlan={null as any} onClose={onClose} />);
    }).not.toThrow();
  });

  test('components handle malformed data structures', () => {
    const malformedPlan = {
      id: 'test',
      mealPlanData: {
        meals: 'not-an-array', // Wrong type
      },
    } as any;

    const onClose = vi.fn();
    const onClick = vi.fn();

    expect(() => {
      renderWithQuery(<MealPlanCard mealPlan={malformedPlan} onClick={onClick} />);
    }).not.toThrow();

    expect(() => {
      renderWithQuery(<MealPlanModal mealPlan={malformedPlan} onClose={onClose} />);
    }).not.toThrow();
  });
});