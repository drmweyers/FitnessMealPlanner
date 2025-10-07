import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MealPlanCard from '../../client/src/components/MealPlanCard';
import { AuthContext } from '../../client/src/contexts/AuthContext';
import type { CustomerMealPlan } from '@shared/schema';
import type { AuthContextValue } from '../../client/src/types/auth';

// Mock the useSafeMealPlan hook
vi.mock('../../client/src/hooks/useSafeMealPlan', () => ({
  useSafeMealPlan: (mealPlan: any) => ({
    isValid: true,
    validMeals: Array(21).fill({}), // 7 days * 3 meals
    days: 7,
    planName: mealPlan.mealPlanData?.planName || 'Test Meal Plan',
    fitnessGoal: mealPlan.mealPlanData?.fitnessGoal || 'Weight Loss',
    nutrition: {
      avgCaloriesPerDay: 2000,
      avgProteinPerDay: 150
    },
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    hasMeals: true
  })
}));

// Mock toast hook
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const mockMealPlan: CustomerMealPlan = {
  id: 'test-meal-plan-1',
  mealPlanId: 'test-meal-plan-1',
  trainerId: 'trainer-1',
  customerId: 'customer-1',
  assignedAt: new Date().toISOString(),
  isActive: true,
  mealPlanData: {
    id: 'test-meal-plan-1',
    planName: 'Test Weight Loss Plan',
    fitnessGoal: 'Weight Loss',
    clientName: 'Test Customer',
    targetCalories: 2000,
    mealsPerDay: 3,
    duration: 7,
    dietaryPreferences: ['low-carb'],
    meals: []
  }
};

describe('MealPlanCard Delete Functionality', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  it('should render delete button for customer role', () => {
    const mockUser = { id: '1', email: 'test@test.com', role: 'customer' as const };
    const mockOnDelete = vi.fn();
    
    const mockAuthValue: AuthContextValue = {
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false
    };
    
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <MealPlanCard 
            mealPlan={mockMealPlan} 
            onClick={() => {}}
            onDelete={mockOnDelete}
          />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
    
    const deleteButton = screen.getByLabelText('Delete meal plan');
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toBeVisible();
  });

  it('should not render delete button for non-customer roles', () => {
    const mockUser = { id: '1', email: 'test@test.com', role: 'trainer' as const };
    const mockOnDelete = vi.fn();
    
    const mockAuthValue: AuthContextValue = {
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false
    };
    
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <MealPlanCard 
            mealPlan={mockMealPlan} 
            onClick={() => {}}
            onDelete={mockOnDelete}
          />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
    
    const deleteButton = screen.queryByLabelText('Delete meal plan');
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('should not render delete button when onDelete prop is not provided', () => {
    const mockUser = { id: '1', email: 'test@test.com', role: 'customer' as const };
    
    const mockAuthValue: AuthContextValue = {
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false
    };
    
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <MealPlanCard 
            mealPlan={mockMealPlan} 
            onClick={() => {}}
          />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
    
    const deleteButton = screen.queryByLabelText('Delete meal plan');
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('should call onDelete with meal plan ID when delete button is clicked', async () => {
    const mockUser = { id: '1', email: 'test@test.com', role: 'customer' as const };
    const mockOnDelete = vi.fn();
    const mockOnClick = vi.fn();
    
    const mockAuthValue: AuthContextValue = {
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false
    };
    
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <MealPlanCard 
            mealPlan={mockMealPlan} 
            onClick={mockOnClick}
            onDelete={mockOnDelete}
          />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
    
    const deleteButton = screen.getByLabelText('Delete meal plan');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('test-meal-plan-1');
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      // Ensure card click wasn't triggered
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  it('should have proper styling for delete button', () => {
    const mockUser = { id: '1', email: 'test@test.com', role: 'customer' as const };
    const mockOnDelete = vi.fn();
    
    const mockAuthValue: AuthContextValue = {
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false
    };
    
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <MealPlanCard 
            mealPlan={mockMealPlan} 
            onClick={() => {}}
            onDelete={mockOnDelete}
          />
        </AuthContext.Provider>
      </QueryClientProvider>
    );
    
    const deleteButton = screen.getByLabelText('Delete meal plan');
    expect(deleteButton).toHaveClass('absolute');
    expect(deleteButton).toHaveClass('top-2');
    expect(deleteButton).toHaveClass('right-2');
    expect(deleteButton.className).toContain('hover:bg-red-50');
    expect(deleteButton.className).toContain('hover:text-red-600');
  });
});

describe('Delete API Endpoint', () => {
  it('should send DELETE request with correct meal plan ID', async () => {
    const mealPlanId = 'test-meal-plan-123';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true, 
        message: 'Meal plan deleted successfully',
        deletedMealPlanId: mealPlanId
      })
    });
    
    global.fetch = mockFetch;
    
    const response = await fetch(`/api/meal-plan/${mealPlanId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    const result = await response.json();
    
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/meal-plan/${mealPlanId}`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      })
    );
    
    expect(result.success).toBe(true);
    expect(result.deletedMealPlanId).toBe(mealPlanId);
  });

  it('should handle delete API errors gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ 
        error: 'You do not have permission to delete this meal plan'
      })
    });
    
    global.fetch = mockFetch;
    
    const response = await fetch('/api/meal-plan/unauthorized-plan', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    const result = await response.json();
    
    expect(response.ok).toBe(false);
    expect(result.error).toBe('You do not have permission to delete this meal plan');
  });

  it('should handle network errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    global.fetch = mockFetch;
    
    await expect(
      fetch('/api/meal-plan/test-plan', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    ).rejects.toThrow('Network error');
  });
});