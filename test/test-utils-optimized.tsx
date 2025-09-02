import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { createTestQueryClient, mockApiResponse } from './setup-optimized';

/**
 * Optimized Test Utilities for FitnessMealPlanner
 * 
 * Provides efficient, performance-focused test rendering
 * and common test helpers
 */

// Mock router component
const MockRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="mock-router">{children}</div>;
};

// Lightweight test wrapper
interface TestProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

const TestProviders: React.FC<TestProvidersProps> = ({ 
  children, 
  queryClient = createTestQueryClient() 
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <MockRouter>
        {children}
      </MockRouter>
    </QueryClientProvider>
  );
};

// Optimized render function
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  preloadedState?: any;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) => {
  const { queryClient, preloadedState, ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProviders queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: queryClient || createTestQueryClient(),
  };
};

// Mock user data for tests
export const mockUsers = {
  admin: {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'admin' as const,
    name: 'Test Admin',
  },
  trainer: {
    id: 'trainer-1', 
    email: 'trainer@test.com',
    role: 'trainer' as const,
    name: 'Test Trainer',
  },
  customer: {
    id: 'customer-1',
    email: 'customer@test.com', 
    role: 'customer' as const,
    name: 'Test Customer',
  },
};

// Mock recipe data
export const mockRecipe = {
  id: 'recipe-1',
  title: 'Test Recipe',
  description: 'A test recipe',
  servings: 4,
  prepTime: 15,
  cookTime: 30,
  difficulty: 'medium' as const,
  ingredients: [
    { name: 'Test ingredient 1', amount: '1 cup' },
    { name: 'Test ingredient 2', amount: '2 tbsp' },
  ],
  instructions: [
    'Step 1: Do something',
    'Step 2: Do something else',
  ],
  tags: ['healthy', 'quick'],
  calories: 300,
  protein: 25,
  carbs: 30,
  fat: 10,
  fiber: 5,
};

// Mock meal plan data
export const mockMealPlan = {
  id: 'plan-1',
  title: 'Test Meal Plan',
  description: 'A test meal plan',
  customerId: 'customer-1',
  trainerId: 'trainer-1',
  startDate: '2024-01-01',
  endDate: '2024-01-07',
  meals: [
    {
      day: 'Monday',
      breakfast: [mockRecipe],
      lunch: [mockRecipe],
      dinner: [mockRecipe],
    },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Performance testing utilities
export const waitForTimeout = (ms: number) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

// Common test patterns
export const expectElementToBePresent = (testId: string) => {
  const element = document.querySelector(`[data-testid="${testId}"]`);
  expect(element).toBeInTheDocument();
  return element;
};

export const expectElementToBeAbsent = (testId: string) => {
  const element = document.querySelector(`[data-testid="${testId}"]`);
  expect(element).not.toBeInTheDocument();
};

// API mocking helpers
export const mockSuccessfulApiCall = (data: any) => {
  (global.fetch as any).mockResolvedValueOnce(mockApiResponse(data));
};

export const mockFailedApiCall = (error: string, status = 400) => {
  (global.fetch as any).mockRejectedValueOnce(new Error(error));
};

// Form testing helpers
export const fillForm = async (formData: Record<string, string>) => {
  const { getByLabelText, getByDisplayValue } = await import('@testing-library/react');
  
  for (const [field, value] of Object.entries(formData)) {
    const input = getByLabelText(field) || getByDisplayValue('');
    if (input) {
      await import('@testing-library/user-event').then(({ default: userEvent }) => 
        userEvent.clear(input)
      );
      await import('@testing-library/user-event').then(({ default: userEvent }) => 
        userEvent.type(input, value)
      );
    }
  }
};

// Component testing patterns
export const testComponentRendering = (Component: React.ComponentType, props: any = {}) => {
  return () => {
    const { container } = renderWithProviders(<Component {...props} />);
    expect(container.firstChild).toBeInTheDocument();
  };
};

export const testComponentWithProps = (Component: React.ComponentType, testCases: Array<{ props: any; expected: string }>) => {
  return () => {
    testCases.forEach(({ props, expected }) => {
      const { getByText, unmount } = renderWithProviders(<Component {...props} />);
      expect(getByText(expected)).toBeInTheDocument();
      unmount();
    });
  };
};

// Export everything
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';