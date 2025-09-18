import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GroceryListWrapper from '@/components/GroceryListWrapper';
import { useAuth } from '@/contexts/AuthContext';

// Mock the auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the grocery list hooks
vi.mock('@/hooks/useGroceryLists', () => ({
  useGroceryLists: vi.fn(),
  useCreateGroceryList: vi.fn(),
  useGroceryList: vi.fn(),
  useUpdateGroceryItem: vi.fn(),
  useAddGroceryItem: vi.fn(),
  useDeleteGroceryItem: vi.fn()
}));

// Mock the MobileGroceryList component
vi.mock('@/components/MobileGroceryList', () => ({
  default: vi.fn(({ groceryListId, activeMealPlan }) => (
    <div data-testid="mobile-grocery-list">
      <div>Grocery List ID: {groceryListId}</div>
      {activeMealPlan && <div>Active Meal Plan: {activeMealPlan.id}</div>}
    </div>
  ))
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('GroceryListWrapper', () => {
  let queryClient: QueryClient;

  const mockUser = {
    id: 'user123',
    email: 'customer.test@evofitmeals.com',
    role: 'customer'
  };

  const mockGroceryLists = [
    {
      id: 'list1',
      name: 'Weekly Shopping List',
      items: [
        { id: 'item1', name: 'Apples', quantity: 5, unit: 'pieces', isPurchased: false },
        { id: 'item2', name: 'Milk', quantity: 1, unit: 'gallon', isPurchased: true },
        { id: 'item3', name: 'Bread', quantity: 2, unit: 'loaves', isPurchased: false }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerId: 'user123'
    },
    {
      id: 'list2',
      name: 'Meal Prep List',
      items: [
        { id: 'item4', name: 'Chicken Breast', quantity: 2, unit: 'lbs', isPurchased: false },
        { id: 'item5', name: 'Rice', quantity: 1, unit: 'bag', isPurchased: false }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerId: 'user123'
    }
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default auth mock
    (useAuth as any).mockReturnValue({
      user: mockUser,
      isAuthenticated: true
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GroceryListWrapper {...props} />
      </QueryClientProvider>
    );
  };

  describe('Loading State', () => {
    it('should display loading state when fetching grocery lists', async () => {
      const { useGroceryLists } = await import('@/hooks/useGroceryLists');
      (useGroceryLists as any).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      renderComponent();

      expect(screen.getByText('Loading grocery lists...')).toBeInTheDocument();
      expect(screen.getByText('Loading grocery lists...').closest('div')).toHaveClass('animate-pulse');
    });
  });

  describe('Error State', () => {
    it('should display error state when fetching fails', async () => {
      const { useGroceryLists } = await import('@/hooks/useGroceryLists');
      const refetchMock = vi.fn();

      (useGroceryLists as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: refetchMock
      });

      renderComponent();

      expect(screen.getByText('Failed to load grocery lists')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(refetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('should create a default list when no lists exist', async () => {
      const { useGroceryLists, useCreateGroceryList } = await import('@/hooks/useGroceryLists');
      const mutateAsyncMock = vi.fn().mockResolvedValue({ data: { id: 'new-list', name: 'My Grocery List' }});

      (useGroceryLists as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useCreateGroceryList as any).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false
      });

      renderComponent();

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          name: 'My Grocery List'
        });
      });
    });

    it('should show create list UI when user has no lists', async () => {
      const { useGroceryLists, useCreateGroceryList } = await import('@/hooks/useGroceryLists');

      (useGroceryLists as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useCreateGroceryList as any).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false
      });

      renderComponent();

      expect(screen.getByText('Create your first grocery list')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create new list/i })).toBeInTheDocument();
    });
  });

  describe('List Selection', () => {
    it('should auto-select the first list when lists are available', async () => {
      const { useGroceryLists, useGroceryList } = await import('@/hooks/useGroceryLists');

      (useGroceryLists as any).mockReturnValue({
        data: mockGroceryLists,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useGroceryList as any).mockReturnValue({
        data: mockGroceryLists[0],
        isLoading: false,
        error: null
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('mobile-grocery-list')).toBeInTheDocument();
        expect(screen.getByText(`Grocery List ID: ${mockGroceryLists[0].id}`)).toBeInTheDocument();
      });
    });

    it('should allow switching between multiple lists', async () => {
      const { useGroceryLists, useGroceryList } = await import('@/hooks/useGroceryLists');

      (useGroceryLists as any).mockReturnValue({
        data: mockGroceryLists,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useGroceryList as any).mockReturnValue({
        data: mockGroceryLists[0],
        isLoading: false,
        error: null
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /weekly shopping list/i })).toBeInTheDocument();
      });

      // Click dropdown to show list options
      const dropdownButton = screen.getByRole('button', { name: /weekly shopping list/i });
      fireEvent.click(dropdownButton);

      // Check both lists are shown
      await waitFor(() => {
        expect(screen.getByText('Weekly Shopping List')).toBeInTheDocument();
        expect(screen.getByText('Meal Prep List')).toBeInTheDocument();
      });
    });
  });

  describe('List Creation', () => {
    it('should show create list form when clicking create button', async () => {
      const { useGroceryLists, useCreateGroceryList } = await import('@/hooks/useGroceryLists');

      (useGroceryLists as any).mockReturnValue({
        data: mockGroceryLists,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useCreateGroceryList as any).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false
      });

      renderComponent();

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /weekly shopping list/i })).toBeInTheDocument();
      });

      // Open dropdown and click create new list
      const dropdownButton = screen.getByRole('button', { name: /weekly shopping list/i });
      fireEvent.click(dropdownButton);

      const createButton = await screen.findByText('Create New List');
      fireEvent.click(createButton);

      // Check create form is shown
      await waitFor(() => {
        expect(screen.getByText('Create New List')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/weekly shopping, meal prep/i)).toBeInTheDocument();
      });
    });

    it('should create a new list with entered name', async () => {
      const { useGroceryLists, useCreateGroceryList, useGroceryList } = await import('@/hooks/useGroceryLists');
      const mutateAsyncMock = vi.fn().mockResolvedValue({
        data: { id: 'new-list', name: 'Test List' }
      });

      (useGroceryLists as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useCreateGroceryList as any).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false
      });

      (useGroceryList as any).mockReturnValue({
        data: null,
        isLoading: false,
        error: null
      });

      renderComponent();

      // Click create button
      const createButton = await screen.findByRole('button', { name: /create new list/i });
      fireEvent.click(createButton);

      // Enter list name
      const input = screen.getByPlaceholderText(/weekly shopping, meal prep/i);
      fireEvent.change(input, { target: { value: 'Test List' }});

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create list/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          name: 'Test List',
          mealPlanId: undefined
        });
      });
    });

    it('should validate list name before creation', async () => {
      const { useGroceryLists, useCreateGroceryList } = await import('@/hooks/useGroceryLists');
      const { useToast } = await import('@/hooks/use-toast');
      const toastMock = vi.fn();

      (useToast as any).mockReturnValue({
        toast: toastMock
      });

      (useGroceryLists as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useCreateGroceryList as any).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false
      });

      renderComponent();

      // Click create button
      const createButton = await screen.findByRole('button', { name: /create new list/i });
      fireEvent.click(createButton);

      // Try to submit without name
      const submitButton = screen.getByRole('button', { name: /create list/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toastMock).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Please enter a list name',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Integration with MealPlan', () => {
    it('should pass activeMealPlan to MobileGroceryList', async () => {
      const { useGroceryLists, useGroceryList } = await import('@/hooks/useGroceryLists');

      const activeMealPlan = {
        id: 'meal-plan-123',
        name: 'Weekly Meal Plan',
        recipes: []
      };

      (useGroceryLists as any).mockReturnValue({
        data: mockGroceryLists,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useGroceryList as any).mockReturnValue({
        data: mockGroceryLists[0],
        isLoading: false,
        error: null
      });

      renderComponent({ activeMealPlan });

      await waitFor(() => {
        expect(screen.getByText(`Active Meal Plan: ${activeMealPlan.id}`)).toBeInTheDocument();
      });
    });

    it('should create list with mealPlanId when provided', async () => {
      const { useGroceryLists, useCreateGroceryList } = await import('@/hooks/useGroceryLists');
      const mutateAsyncMock = vi.fn().mockResolvedValue({
        data: { id: 'new-list', name: 'Test List' }
      });

      const mealPlanId = 'meal-plan-456';

      (useGroceryLists as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useCreateGroceryList as any).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false
      });

      renderComponent({ mealPlanId });

      // Click create button
      const createButton = await screen.findByRole('button', { name: /create new list/i });
      fireEvent.click(createButton);

      // Enter list name
      const input = screen.getByPlaceholderText(/weekly shopping, meal prep/i);
      fireEvent.change(input, { target: { value: 'Meal Plan List' }});

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create list/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          name: 'Meal Plan List',
          mealPlanId
        });
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Enter key to submit create list form', async () => {
      const { useGroceryLists, useCreateGroceryList } = await import('@/hooks/useGroceryLists');
      const mutateAsyncMock = vi.fn().mockResolvedValue({
        data: { id: 'new-list', name: 'Test List' }
      });

      (useGroceryLists as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useCreateGroceryList as any).mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false
      });

      renderComponent();

      // Click create button
      const createButton = await screen.findByRole('button', { name: /create new list/i });
      fireEvent.click(createButton);

      // Enter list name and press Enter
      const input = screen.getByPlaceholderText(/weekly shopping, meal prep/i);
      fireEvent.change(input, { target: { value: 'Enter Test' }});
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith({
          name: 'Enter Test',
          mealPlanId: undefined
        });
      });
    });

    it('should handle Escape key to cancel create list form', async () => {
      const { useGroceryLists, useCreateGroceryList } = await import('@/hooks/useGroceryLists');

      (useGroceryLists as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      (useCreateGroceryList as any).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false
      });

      renderComponent();

      // Click create button
      const createButton = await screen.findByRole('button', { name: /create new list/i });
      fireEvent.click(createButton);

      // Enter text and press Escape
      const input = screen.getByPlaceholderText(/weekly shopping, meal prep/i);
      fireEvent.change(input, { target: { value: 'Test' }});
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      // Form should be hidden
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/weekly shopping, meal prep/i)).not.toBeInTheDocument();
      });
    });
  });
});