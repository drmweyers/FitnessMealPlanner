import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CustomerProfile from '../../client/src/pages/CustomerProfile';
import '@testing-library/jest-dom';

// Mock the auth context
vi.mock('../../client/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { 
      id: '1', 
      email: 'customer.test@evofitmeals.com', 
      role: 'customer' 
    },
    logout: vi.fn(),
    isLoading: false,
  }),
}));

// Mock toast
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock API requests
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock react-query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: () => ({
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    }),
  };
});

describe('CustomerProfile - Rate Meal Plans Button Completely Removed', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Get the mocked functions
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    
    // Mock successful profile data query
    vi.mocked(useQuery).mockReturnValue({
      data: {
        email: 'customer.test@evofitmeals.com',
        bio: 'Test user bio',
        height: 70,
        weight: 180,
        age: 30,
      },
      isLoading: false,
      isError: false,
    } as any);

    // Mock successful mutation
    vi.mocked(useMutation).mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    } as any);
  });

  // Test 1: Rate Meal Plans button should not exist at all
  it('should not display Rate Meal Plans button anywhere', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomerProfile />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify the Rate Meal Plans button does not exist
    expect(screen.queryByText('Rate Meal Plans')).not.toBeInTheDocument();
    expect(screen.queryByText('Rate meal plans')).not.toBeInTheDocument();
    expect(screen.queryByText('RATE MEAL PLANS')).not.toBeInTheDocument();
    
    // Check that Heart icon with rating text is not present
    const heartIcons = screen.queryAllByTestId('heart-icon');
    heartIcons.forEach(icon => {
      const parentText = icon.closest('button')?.textContent || '';
      expect(parentText.toLowerCase()).not.toContain('rate');
    });
  });

  // Test 2: MealPlanRating component should not be imported
  it('should not have MealPlanRating component in the DOM', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomerProfile />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check that no rating dialog elements are present
    expect(screen.queryByText('Rate this meal plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Submit Rating')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Test 3: No rating state or handlers should exist
  it('should not have any rating-related state or event handlers', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomerProfile />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify no rating button exists to click
    expect(screen.queryByText('Rate Meal Plans')).not.toBeInTheDocument();
    
    // Verify no dialogs exist
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    
    // Check that all buttons in Quick Actions are non-rating related
    const quickActionsButtons = screen.getAllByRole('button');
    quickActionsButtons.forEach(button => {
      expect(button.textContent?.toLowerCase()).not.toContain('rate');
      expect(button.textContent?.toLowerCase()).not.toContain('feedback');
    });
  });

  // Test 4: Quick Actions section should not have Rating button
  it('should not have Rate Meal Plans button in Quick Actions section', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomerProfile />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Find Quick Actions section
    const quickActionsHeading = screen.getByText('Quick Actions');
    expect(quickActionsHeading).toBeInTheDocument();

    // Rate Meal Plans button should NOT exist
    expect(screen.queryByText('Rate Meal Plans')).not.toBeInTheDocument();
    
    // Verify other Quick Actions buttons exist (View Progress, Sign Out)
    expect(screen.getByText('View Progress')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  // Test 5: Component should render without rating-related errors
  it('should render CustomerProfile without rating-related imports or errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomerProfile />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should render successfully
    expect(screen.getByText('Customer Profile')).toBeInTheDocument();

    // Should have no import errors related to MealPlanRating
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('MealPlanRating')
    );

    consoleSpy.mockRestore();
  });
});
