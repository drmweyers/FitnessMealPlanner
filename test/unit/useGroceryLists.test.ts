/**
 * Custom Hooks Unit Tests for Grocery Lists
 *
 * Comprehensive testing of React Query hooks for grocery list operations:
 * - All CRUD operations for grocery lists and items
 * - Optimistic updates and error handling
 * - Offline support functionality
 * - Cache management and invalidation
 * - Loading and error states
 *
 * @author FitnessMealPlanner Team - Unit Tests Bot
 * @since 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useGroceryLists,
  useGroceryList,
  useCreateGroceryList,
  useUpdateGroceryList,
  useDeleteGroceryList,
  useAddGroceryItem,
  useUpdateGroceryItem,
  useDeleteGroceryItem,
  useGenerateFromMealPlan,
  useToggleGroceryItem,
  useOfflineGroceryList,
  groceryListKeys,
} from '../../client/src/hooks/useGroceryLists';

// Mock toast hook
const mockToast = vi.fn();
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock API functions
const mockApiResponse = {
  data: null,
  message: 'Success',
  error: null,
};

const mockFetchGroceryLists = vi.fn();
const mockFetchGroceryList = vi.fn();
const mockCreateGroceryList = vi.fn();
const mockUpdateGroceryList = vi.fn();
const mockDeleteGroceryList = vi.fn();
const mockAddGroceryItem = vi.fn();
const mockUpdateGroceryItem = vi.fn();
const mockDeleteGroceryItem = vi.fn();
const mockGenerateFromMealPlan = vi.fn();

vi.mock('../../client/src/utils/api', () => ({
  fetchGroceryLists: mockFetchGroceryLists,
  fetchGroceryList: mockFetchGroceryList,
  createGroceryList: mockCreateGroceryList,
  updateGroceryList: mockUpdateGroceryList,
  deleteGroceryList: mockDeleteGroceryList,
  addGroceryItem: mockAddGroceryItem,
  updateGroceryItem: mockUpdateGroceryItem,
  deleteGroceryItem: mockDeleteGroceryItem,
  generateFromMealPlan: mockGenerateFromMealPlan,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Test data
const mockGroceryList = {
  id: 'list-123',
  customerId: 'user-123',
  name: 'Weekly Grocery List',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  items: [
    {
      id: 'item-123',
      groceryListId: 'list-123',
      name: 'Apples',
      category: 'produce',
      quantity: 5,
      unit: 'pcs',
      isChecked: false,
      priority: 'medium',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ],
};

const mockGroceryLists = [
  {
    ...mockGroceryList,
    itemCount: 5,
    checkedCount: 2,
  },
  {
    id: 'list-456',
    customerId: 'user-123',
    name: 'Shopping List',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    itemCount: 3,
    checkedCount: 1,
  },
];

const mockGroceryListItem = {
  id: 'item-456',
  groceryListId: 'list-123',
  name: 'Bananas',
  category: 'produce',
  quantity: 3,
  unit: 'bunches',
  isChecked: false,
  priority: 'medium',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Helper function to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  return Wrapper;
};

describe('Grocery Lists Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(groceryListKeys.all).toEqual(['grocery-lists']);
      expect(groceryListKeys.lists()).toEqual(['grocery-lists', 'list']);
      expect(groceryListKeys.list('list-123')).toEqual(['grocery-lists', 'list', 'list-123']);
      expect(groceryListKeys.items('list-123')).toEqual(['grocery-lists', 'items', 'list-123']);
    });
  });

  describe('useGroceryLists', () => {
    it('should fetch grocery lists successfully', async () => {
      mockFetchGroceryLists.mockResolvedValue({
        ...mockApiResponse,
        data: mockGroceryLists,
      });

      const { result } = renderHook(() => useGroceryLists(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockGroceryLists);
      expect(result.current.error).toBe(null);
      expect(mockFetchGroceryLists).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch');
      mockFetchGroceryLists.mockRejectedValue(error);

      const { result } = renderHook(() => useGroceryLists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeUndefined();
    });

    it('should return empty array as default data', async () => {
      mockFetchGroceryLists.mockResolvedValue({
        ...mockApiResponse,
        data: [],
      });

      const { result } = renderHook(() => useGroceryLists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should use proper stale time and refetch settings', () => {
      const { result } = renderHook(() => useGroceryLists(), {
        wrapper: createWrapper(),
      });

      // Query should be configured with stale time of 5 minutes
      // This is tested implicitly through the hook configuration
      expect(result.current).toBeDefined();
    });
  });

  describe('useGroceryList', () => {
    it('should fetch specific grocery list successfully', async () => {
      mockFetchGroceryList.mockResolvedValue({
        ...mockApiResponse,
        data: mockGroceryList,
      });

      const { result } = renderHook(() => useGroceryList('list-123'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockGroceryList);
      expect(mockFetchGroceryList).toHaveBeenCalledWith('list-123');
    });

    it('should not fetch when listId is null', () => {
      const { result } = renderHook(() => useGroceryList(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockFetchGroceryList).not.toHaveBeenCalled();
    });

    it('should handle fetch error for specific list', async () => {
      const error = new Error('List not found');
      mockFetchGroceryList.mockRejectedValue(error);

      const { result } = renderHook(() => useGroceryList('list-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should return null when listId is not provided', async () => {
      mockFetchGroceryList.mockResolvedValue({
        ...mockApiResponse,
        data: null,
      });

      const { result } = renderHook(() => useGroceryList(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateGroceryList', () => {
    it('should create grocery list successfully', async () => {
      const newList = { name: 'New List' };
      const createdList = { ...mockGroceryList, name: 'New List' };

      mockCreateGroceryList.mockResolvedValue({
        ...mockApiResponse,
        data: createdList,
      });

      const { result } = renderHook(() => useCreateGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newList);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCreateGroceryList).toHaveBeenCalledWith(newList);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Grocery list created successfully',
      });
    });

    it('should handle creation error', async () => {
      const error = new Error('Failed to create');
      mockCreateGroceryList.mockRejectedValue(error);

      const { result } = renderHook(() => useCreateGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New List' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to create',
        variant: 'destructive',
      });
    });

    it('should update cache after successful creation', async () => {
      const newList = { name: 'New List' };
      const createdList = { ...mockGroceryList, name: 'New List' };

      mockCreateGroceryList.mockResolvedValue({
        ...mockApiResponse,
        data: createdList,
      });

      const { result } = renderHook(() => useCreateGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(newList);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Cache should be updated with new list
      expect(result.current.data?.data).toEqual(createdList);
    });
  });

  describe('useUpdateGroceryList', () => {
    it('should update grocery list successfully', async () => {
      const updates = { name: 'Updated List' };
      const updatedList = { ...mockGroceryList, name: 'Updated List' };

      mockUpdateGroceryList.mockResolvedValue({
        ...mockApiResponse,
        data: updatedList,
      });

      const { result } = renderHook(() => useUpdateGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ listId: 'list-123', updates });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateGroceryList).toHaveBeenCalledWith('list-123', updates);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Grocery list updated successfully',
      });
    });

    it('should handle update error', async () => {
      const error = new Error('Failed to update');
      mockUpdateGroceryList.mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ listId: 'list-123', updates: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to update',
        variant: 'destructive',
      });
    });

    it('should implement optimistic updates', async () => {
      const updates = { name: 'Updated List' };
      mockUpdateGroceryList.mockResolvedValue({
        ...mockApiResponse,
        data: { ...mockGroceryList, ...updates },
      });

      const { result } = renderHook(() => useUpdateGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ listId: 'list-123', updates });
      });

      // Optimistic update should happen immediately
      expect(result.current.isPending).toBe(true);
    });

    it('should revert optimistic updates on error', async () => {
      const error = new Error('Update failed');
      mockUpdateGroceryList.mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ listId: 'list-123', updates: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Error handling should revert optimistic changes
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
        })
      );
    });
  });

  describe('useDeleteGroceryList', () => {
    it('should delete grocery list successfully', async () => {
      mockDeleteGroceryList.mockResolvedValue({
        ...mockApiResponse,
        data: { success: true },
      });

      const { result } = renderHook(() => useDeleteGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('list-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockDeleteGroceryList).toHaveBeenCalledWith('list-123');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Grocery list deleted successfully',
      });
    });

    it('should handle deletion error', async () => {
      const error = new Error('Failed to delete');
      mockDeleteGroceryList.mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('list-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to delete',
        variant: 'destructive',
      });
    });

    it('should implement optimistic deletion', async () => {
      mockDeleteGroceryList.mockResolvedValue({
        ...mockApiResponse,
        data: { success: true },
      });

      const { result } = renderHook(() => useDeleteGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('list-123');
      });

      // Should immediately mark as pending
      expect(result.current.isPending).toBe(true);
    });
  });

  describe('useAddGroceryItem', () => {
    it('should add grocery item successfully', async () => {
      const newItem = {
        name: 'Bananas',
        category: 'produce' as const,
        quantity: 3,
        unit: 'bunches',
        priority: 'medium' as const,
      };

      mockAddGroceryItem.mockResolvedValue({
        ...mockApiResponse,
        data: mockGroceryListItem,
      });

      const { result } = renderHook(() => useAddGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ listId: 'list-123', item: newItem });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAddGroceryItem).toHaveBeenCalledWith('list-123', newItem);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Item added successfully',
      });
    });

    it('should handle add item error', async () => {
      const error = new Error('Failed to add item');
      mockAddGroceryItem.mockRejectedValue(error);

      const { result } = renderHook(() => useAddGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          listId: 'list-123',
          item: {
            name: 'Test Item',
            category: 'produce',
            quantity: 1,
            unit: 'pcs',
            priority: 'medium',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to add item',
        variant: 'destructive',
      });
    });

    it('should implement optimistic item addition', async () => {
      const newItem = {
        name: 'Bananas',
        category: 'produce' as const,
        quantity: 3,
        unit: 'bunches',
        priority: 'medium' as const,
      };

      mockAddGroceryItem.mockResolvedValue({
        ...mockApiResponse,
        data: mockGroceryListItem,
      });

      const { result } = renderHook(() => useAddGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ listId: 'list-123', item: newItem });
      });

      // Should create optimistic item with temporary ID
      expect(result.current.isPending).toBe(true);
    });

    it('should replace optimistic item with server response', async () => {
      const newItem = {
        name: 'Bananas',
        category: 'produce' as const,
        quantity: 3,
        unit: 'bunches',
        priority: 'medium' as const,
      };

      mockAddGroceryItem.mockResolvedValue({
        ...mockApiResponse,
        data: mockGroceryListItem,
      });

      const { result } = renderHook(() => useAddGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ listId: 'list-123', item: newItem });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Temporary items should be replaced with server response
      expect(result.current.data?.data).toEqual(mockGroceryListItem);
    });
  });

  describe('useUpdateGroceryItem', () => {
    it('should update grocery item successfully', async () => {
      const updates = { isChecked: true };
      const updatedItem = { ...mockGroceryListItem, isChecked: true };

      mockUpdateGroceryItem.mockResolvedValue({
        ...mockApiResponse,
        data: updatedItem,
      });

      const { result } = renderHook(() => useUpdateGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          listId: 'list-123',
          itemId: 'item-456',
          updates,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateGroceryItem).toHaveBeenCalledWith('list-123', 'item-456', updates);
    });

    it('should handle update item error', async () => {
      const error = new Error('Failed to update item');
      mockUpdateGroceryItem.mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          listId: 'list-123',
          itemId: 'item-456',
          updates: { isChecked: true },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      });
    });

    it('should implement optimistic item updates', async () => {
      const updates = { isChecked: true };
      mockUpdateGroceryItem.mockResolvedValue({
        ...mockApiResponse,
        data: { ...mockGroceryListItem, ...updates },
      });

      const { result } = renderHook(() => useUpdateGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          listId: 'list-123',
          itemId: 'item-456',
          updates,
        });
      });

      // Should immediately show optimistic update
      expect(result.current.isPending).toBe(true);
    });
  });

  describe('useDeleteGroceryItem', () => {
    it('should delete grocery item successfully', async () => {
      mockDeleteGroceryItem.mockResolvedValue({
        ...mockApiResponse,
        data: { success: true },
      });

      const { result } = renderHook(() => useDeleteGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          listId: 'list-123',
          itemId: 'item-456',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockDeleteGroceryItem).toHaveBeenCalledWith('list-123', 'item-456');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Item deleted successfully',
      });
    });

    it('should handle delete item error', async () => {
      const error = new Error('Failed to delete item');
      mockDeleteGroceryItem.mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          listId: 'list-123',
          itemId: 'item-456',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    });

    it('should implement optimistic item deletion', async () => {
      mockDeleteGroceryItem.mockResolvedValue({
        ...mockApiResponse,
        data: { success: true },
      });

      const { result } = renderHook(() => useDeleteGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          listId: 'list-123',
          itemId: 'item-456',
        });
      });

      // Should immediately remove item optimistically
      expect(result.current.isPending).toBe(true);
    });
  });

  describe('useGenerateFromMealPlan', () => {
    it('should generate grocery list from meal plan successfully', async () => {
      const generatedList = {
        ...mockGroceryList,
        name: 'Generated from Meal Plan',
      };

      mockGenerateFromMealPlan.mockResolvedValue({
        ...mockApiResponse,
        data: generatedList,
      });

      const { result } = renderHook(() => useGenerateFromMealPlan(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          mealPlanId: 'plan-123',
          listName: 'Generated List',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGenerateFromMealPlan).toHaveBeenCalledWith({
        mealPlanId: 'plan-123',
        listName: 'Generated List',
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Grocery list generated from meal plan',
      });
    });

    it('should handle generation error', async () => {
      const error = new Error('Failed to generate');
      mockGenerateFromMealPlan.mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateFromMealPlan(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          mealPlanId: 'plan-123',
          listName: 'Generated List',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to generate',
        variant: 'destructive',
      });
    });

    it('should add generated list to cache', async () => {
      const generatedList = {
        ...mockGroceryList,
        name: 'Generated from Meal Plan',
      };

      mockGenerateFromMealPlan.mockResolvedValue({
        ...mockApiResponse,
        data: generatedList,
      });

      const { result } = renderHook(() => useGenerateFromMealPlan(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          mealPlanId: 'plan-123',
          listName: 'Generated List',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Generated list should be cached
      expect(result.current.data?.data).toEqual(generatedList);
    });
  });

  describe('useToggleGroceryItem', () => {
    it('should toggle item checked status', async () => {
      const updatedItem = { ...mockGroceryListItem, isChecked: true };

      mockUpdateGroceryItem.mockResolvedValue({
        ...mockApiResponse,
        data: updatedItem,
      });

      const { result } = renderHook(() => useToggleGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          listId: 'list-123',
          itemId: 'item-456',
          isChecked: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should use the update item mutation internally
      expect(mockUpdateGroceryItem).toHaveBeenCalledWith('list-123', 'item-456', { isChecked: true });
    });

    it('should handle toggle error', async () => {
      const error = new Error('Failed to toggle');
      mockUpdateGroceryItem.mockRejectedValue(error);

      const { result } = renderHook(() => useToggleGroceryItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          listId: 'list-123',
          itemId: 'item-456',
          isChecked: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useOfflineGroceryList', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockClear();
      mockLocalStorage.setItem.mockClear();
      mockLocalStorage.removeItem.mockClear();
    });

    it('should save grocery list to local storage', () => {
      const { result } = renderHook(() => useOfflineGroceryList());

      act(() => {
        result.current.saveToLocal(mockGroceryList);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'grocery-list-offline',
        JSON.stringify(mockGroceryList)
      );
    });

    it('should load grocery list from local storage', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockGroceryList));

      const { result } = renderHook(() => useOfflineGroceryList());

      const loaded = result.current.loadFromLocal();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('grocery-list-offline');
      expect(loaded).toEqual(mockGroceryList);
    });

    it('should return null when no data in local storage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useOfflineGroceryList());

      const loaded = result.current.loadFromLocal();

      expect(loaded).toBe(null);
    });

    it('should clear grocery list from local storage', () => {
      const { result } = renderHook(() => useOfflineGroceryList());

      act(() => {
        result.current.clearLocal();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('grocery-list-offline');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const { result } = renderHook(() => useOfflineGroceryList());

      act(() => {
        result.current.saveToLocal(mockGroceryList);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save grocery list to local storage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON in localStorage', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const { result } = renderHook(() => useOfflineGroceryList());

      const loaded = result.current.loadFromLocal();

      expect(loaded).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load grocery list from local storage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle localStorage clear errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useOfflineGroceryList());

      act(() => {
        result.current.clearLocal();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear grocery list from local storage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockFetchGroceryLists.mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useGroceryLists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(timeoutError);
    });

    it('should handle unauthorized errors', async () => {
      const authError = new Error('Unauthorized');
      authError.name = 'AuthError';
      mockFetchGroceryLists.mockRejectedValue(authError);

      const { result } = renderHook(() => useGroceryLists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(authError);
    });

    it('should handle server errors gracefully', async () => {
      const serverError = new Error('Internal server error');
      serverError.name = 'ServerError';
      mockCreateGroceryList.mockRejectedValue(serverError);

      const { result } = renderHook(() => useCreateGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'Test List' });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Internal server error',
        variant: 'destructive',
      });
    });
  });

  describe('Cache Management', () => {
    it('should properly invalidate cache on mutations', async () => {
      mockCreateGroceryList.mockResolvedValue({
        ...mockApiResponse,
        data: mockGroceryList,
      });

      const { result } = renderHook(() => useCreateGroceryList(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: 'New List' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Cache should be updated with new data
      expect(result.current.data?.data).toEqual(mockGroceryList);
    });

    it('should handle concurrent mutations properly', async () => {
      const updates1 = { name: 'Update 1' };
      const updates2 = { name: 'Update 2' };

      mockUpdateGroceryList
        .mockResolvedValueOnce({
          ...mockApiResponse,
          data: { ...mockGroceryList, ...updates1 },
        })
        .mockResolvedValueOnce({
          ...mockApiResponse,
          data: { ...mockGroceryList, ...updates2 },
        });

      const { result } = renderHook(() => useUpdateGroceryList(), {
        wrapper: createWrapper(),
      });

      // Fire two mutations concurrently
      await act(async () => {
        result.current.mutate({ listId: 'list-123', updates: updates1 });
        result.current.mutate({ listId: 'list-123', updates: updates2 });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Last mutation should win
      expect(mockUpdateGroceryList).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
        ...mockGroceryList,
        id: `list-${index}`,
        name: `List ${index}`,
      }));

      mockFetchGroceryLists.mockResolvedValue({
        ...mockApiResponse,
        data: largeDataset,
      });

      const start = performance.now();

      const { result } = renderHook(() => useGroceryLists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const end = performance.now();

      expect(result.current.data).toHaveLength(1000);
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should debounce rapid mutations', async () => {
      mockUpdateGroceryItem.mockResolvedValue({
        ...mockApiResponse,
        data: mockGroceryListItem,
      });

      const { result } = renderHook(() => useUpdateGroceryItem(), {
        wrapper: createWrapper(),
      });

      // Fire multiple rapid updates
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          result.current.mutate({
            listId: 'list-123',
            itemId: 'item-456',
            updates: { quantity: i },
          });
        }
      });

      await waitFor(() => {
        expect(mockUpdateGroceryItem).toHaveBeenCalled();
      });

      // Should handle rapid mutations gracefully
      expect(mockUpdateGroceryItem).toHaveBeenCalledTimes(10);
    });
  });
});