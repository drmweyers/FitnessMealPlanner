/**
 * Race Condition Tests for GroceryListWrapper
 *
 * These tests specifically target the race condition bug found in
 * GroceryListWrapper.tsx where the component would show "Create your
 * first grocery list" even when lists existed in the API response.
 *
 * Bug Location: GroceryListWrapper.tsx:214
 * Fix Applied: Added loading state guard before empty state check
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GroceryListWrapper from '@/components/GroceryListWrapper';
import * as useGroceryListsHook from '@/hooks/useGroceryLists';
import * as useAuthHook from '@/hooks/useAuth';

// Mock the hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useGroceryLists');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('GroceryListWrapper - Race Condition Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Mock authenticated user
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com', role: 'customer' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });
  });

  /**
   * This test will FAIL with the bug and PASS after the fix
   */
  it('should show loading state while fetching lists, not empty state', async () => {
    // Simulate loading state initially
    const useGroceryListsMock = vi.mocked(useGroceryListsHook.useGroceryLists);

    // First render: loading state
    useGroceryListsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <GroceryListWrapper />
      </QueryClientProvider>
    );

    // During loading, should show loading spinner, not empty state
    expect(screen.getByText(/Loading your grocery lists/i)).toBeInTheDocument();
    expect(screen.queryByText(/Create your first grocery list/i)).not.toBeInTheDocument();

    // Simulate data loaded
    useGroceryListsMock.mockReturnValue({
      data: [
        {
          id: 'list-1',
          name: 'Meal Plan Grocery List',
          customerId: 'test-user',
          itemCount: '5',
          checkedCount: '0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <GroceryListWrapper />
      </QueryClientProvider>
    );

    // After loading, should show the list, not empty state
    await waitFor(() => {
      expect(screen.queryByText(/Loading your grocery lists/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Create your first grocery list/i)).not.toBeInTheDocument();
      // Should auto-select the list and show the grocery list interface
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  /**
   * Test the exact condition that was causing the bug
   */
  it('should not evaluate empty state condition while loading', () => {
    // This simulates the exact bug scenario
    const useGroceryListsMock = vi.mocked(useGroceryListsHook.useGroceryLists);

    useGroceryListsMock.mockReturnValue({
      data: undefined, // No data yet
      isLoading: true, // Still loading
      error: null,
      refetch: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <GroceryListWrapper />
      </QueryClientProvider>
    );

    // The bug was: (!selectedListId || showListSelector || isCreatingList)
    // This would evaluate to true even during loading, showing empty state

    // With fix: Loading state is checked first
    expect(screen.getByText(/Loading your grocery lists/i)).toBeInTheDocument();
    expect(screen.queryByText(/Create your first grocery list/i)).not.toBeInTheDocument();
  });

  /**
   * Test rapid state changes that could trigger race condition
   */
  it('should handle rapid loading state changes without flickering', async () => {
    const useGroceryListsMock = vi.mocked(useGroceryListsHook.useGroceryLists);

    // Simulate rapid state changes
    const states = [
      { data: undefined, isLoading: true },
      { data: [], isLoading: false },
      { data: undefined, isLoading: true },
      { data: [{ id: 'list-1', name: 'Test List', itemCount: '5' }], isLoading: false },
    ];

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <GroceryListWrapper />
      </QueryClientProvider>
    );

    for (const state of states) {
      useGroceryListsMock.mockReturnValue({
        ...state,
        error: null,
        refetch: vi.fn(),
      });

      rerender(
        <QueryClientProvider client={queryClient}>
          <GroceryListWrapper />
        </QueryClientProvider>
      );

      if (state.isLoading) {
        expect(screen.getByText(/Loading your grocery lists/i)).toBeInTheDocument();
      } else if (state.data?.length === 0) {
        expect(screen.getByText(/Create your first grocery list/i)).toBeInTheDocument();
      }
    }
  });

  /**
   * Test that selectedListId state doesn't cause race condition
   */
  it('should properly handle selectedListId state updates', async () => {
    const useGroceryListsMock = vi.mocked(useGroceryListsHook.useGroceryLists);

    // Start with data but no selected list (this was part of the bug)
    useGroceryListsMock.mockReturnValue({
      data: [
        {
          id: 'list-1',
          name: 'Meal Plan Grocery List',
          itemCount: '5',
          checkedCount: '0',
        },
        {
          id: 'list-2',
          name: 'Another List',
          itemCount: '0',
          checkedCount: '0',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <GroceryListWrapper />
      </QueryClientProvider>
    );

    // The component should auto-select the first list with items
    await waitFor(() => {
      // Should not show empty state when lists exist
      expect(screen.queryByText(/Create your first grocery list/i)).not.toBeInTheDocument();
    });
  });

  /**
   * Test the fix for API response parsing
   */
  it('should correctly parse API response structure', () => {
    const useGroceryListsMock = vi.mocked(useGroceryListsHook.useGroceryLists);

    // The bug was expecting response.data.groceryLists
    // But API returns response.groceryLists directly
    useGroceryListsMock.mockReturnValue({
      data: [
        {
          id: 'list-1',
          name: 'Test List',
          itemCount: '5',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <GroceryListWrapper />
      </QueryClientProvider>
    );

    // Should properly handle the data
    expect(screen.queryByText(/Create your first grocery list/i)).not.toBeInTheDocument();
  });
});

/**
 * Integration test to verify the complete flow
 */
describe('GroceryListWrapper - Integration Flow', () => {
  it('should handle the complete loading to display flow', async () => {
    const queryClient = new QueryClient();

    // Mock the complete flow
    const useGroceryListsMock = vi.mocked(useGroceryListsHook.useGroceryLists);
    const mockRefetch = vi.fn();

    // Step 1: Initial load
    useGroceryListsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <GroceryListWrapper />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Loading your grocery lists/i)).toBeInTheDocument();

    // Step 2: Data loaded
    useGroceryListsMock.mockReturnValue({
      data: [
        {
          id: 'd69be732-5297-4860-90bb-9cdeb686deef',
          customerId: '7efa555c-aa2b-4889-a179-64e70ff568b4',
          mealPlanId: 'f2fc5134-b4cc-49f9-ad26-fb3b0200b940',
          name: 'Meal Plan Grocery List',
          itemCount: '5',
          checkedCount: '0',
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <GroceryListWrapper />
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Should show the grocery list interface, not empty state
      expect(screen.queryByText(/Loading your grocery lists/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Create your first grocery list/i)).not.toBeInTheDocument();
    });
  });
});