/**
 * React Query hooks for grocery list operations
 *
 * Provides data fetching, caching, and mutation hooks for grocery lists.
 * Includes optimistic updates for better user experience.
 * Integrates with authentication context for user-specific data.
 *
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  fetchGroceryLists,
  fetchGroceryList,
  createGroceryList,
  updateGroceryList,
  deleteGroceryList,
  addGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  generateFromMealPlan,
  type GroceryList,
  type GroceryListItem,
  type GroceryListInput,
  type GroceryListItemInput,
  type GenerateFromMealPlanInput,
  type GroceryListsResponse,
} from '@/utils/api';

/**
 * Query Keys for React Query
 */
export const groceryListKeys = {
  all: ['grocery-lists'] as const,
  lists: () => [...groceryListKeys.all, 'lists'] as const,
  list: (id: string) => [...groceryListKeys.all, 'list', id] as const,
  items: (listId: string) => [...groceryListKeys.all, 'items', listId] as const,
};

/**
 * Hook to fetch all grocery lists for the authenticated customer
 */
export function useGroceryLists() {
  return useQuery({
    queryKey: groceryListKeys.lists(),
    queryFn: async () => {
      console.log('[useGroceryLists] Fetching grocery lists...');
      const response = await fetchGroceryLists();
      console.log('[useGroceryLists] API Response:', response);

      // fetchGroceryLists now returns GroceryListsResponse directly
      if (response && response.groceryLists) {
        console.log('[useGroceryLists] Extracted lists:', response.groceryLists.length, 'items');
        return response.groceryLists;
      }

      // Fallback for unexpected response structure
      console.warn('[useGroceryLists] Unexpected response structure, returning empty array');
      return [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3, // Add retry logic for robustness
  });
}

/**
 * Hook to fetch a specific grocery list with its items
 */
export function useGroceryList(listId: string | null) {
  return useQuery({
    queryKey: listId ? groceryListKeys.list(listId) : ['grocery-lists', 'empty'],
    queryFn: async () => {
      if (!listId) {
        // Return empty list structure for consistent typing
        return {
          id: '',
          customerId: '',
          name: '',
          createdAt: '',
          updatedAt: '',
          items: []
        } as GroceryList;
      }
      const response = await fetchGroceryList(listId);
      // fetchGroceryList now returns GroceryList directly
      return response;
    },
    enabled: !!listId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to create a new grocery list
 */
export function useCreateGroceryList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createGroceryList,
    onSuccess: (response) => {
      // Add new list to cache
      queryClient.setQueryData(groceryListKeys.lists(), (old: GroceryList[] = []) => {
        return [response, ...old];
      });

      toast({
        title: 'Success',
        description: 'Grocery list created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create grocery list',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update a grocery list
 */
export function useUpdateGroceryList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ listId, updates }: { listId: string; updates: Partial<GroceryListInput> }) =>
      updateGroceryList(listId, updates),
    onMutate: async ({ listId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: groceryListKeys.list(listId) });
      await queryClient.cancelQueries({ queryKey: groceryListKeys.lists() });

      // Snapshot previous value
      const previousList = queryClient.getQueryData(groceryListKeys.list(listId));
      const previousLists = queryClient.getQueryData(groceryListKeys.lists());

      // Optimistically update
      if (previousList) {
        queryClient.setQueryData(groceryListKeys.list(listId), {
          ...previousList,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      if (previousLists && Array.isArray(previousLists)) {
        queryClient.setQueryData(
          groceryListKeys.lists(),
          previousLists.map((list: GroceryList) =>
            list.id === listId ? { ...list, ...updates, updatedAt: new Date().toISOString() } : list
          )
        );
      }

      return { previousList, previousLists };
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update
      if (context?.previousList) {
        queryClient.setQueryData(groceryListKeys.list(variables.listId), context.previousList);
      }
      if (context?.previousLists) {
        queryClient.setQueryData(groceryListKeys.lists(), context.previousLists);
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to update grocery list',
        variant: 'destructive',
      });
    },
    onSuccess: (response) => {
      // Update cache with server response
      queryClient.setQueryData(groceryListKeys.list(response.data.id), response.data);

      toast({
        title: 'Success',
        description: 'Grocery list updated successfully',
      });
    },
  });
}

/**
 * Hook to delete a grocery list
 */
export function useDeleteGroceryList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteGroceryList,
    onMutate: async (listId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: groceryListKeys.lists() });

      // Snapshot previous value
      const previousLists = queryClient.getQueryData(groceryListKeys.lists());

      // Optimistically remove from lists
      if (previousLists && Array.isArray(previousLists)) {
        queryClient.setQueryData(
          groceryListKeys.lists(),
          previousLists.filter((list: GroceryList) => list.id !== listId)
        );
      }

      return { previousLists };
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update
      if (context?.previousLists) {
        queryClient.setQueryData(groceryListKeys.lists(), context.previousLists);
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to delete grocery list',
        variant: 'destructive',
      });
    },
    onSuccess: (response, listId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: groceryListKeys.list(listId) });

      toast({
        title: 'Success',
        description: 'Grocery list deleted successfully',
      });
    },
  });
}

/**
 * Hook to add an item to a grocery list
 */
export function useAddGroceryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ listId, item }: { listId: string; item: GroceryListItemInput }) =>
      addGroceryItem(listId, item),
    onMutate: async ({ listId, item }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: groceryListKeys.list(listId) });

      // Snapshot previous value
      const previousList = queryClient.getQueryData(groceryListKeys.list(listId));

      // Create optimistic item
      const optimisticItem: GroceryListItem = {
        id: `temp-${Date.now()}`,
        groceryListId: listId,
        name: item.name,
        category: item.category || 'produce',
        quantity: item.quantity || 1,
        unit: item.unit || 'pcs',
        isChecked: false,
        priority: item.priority || 'medium',
        notes: item.notes,
        estimatedPrice: item.estimatedPrice,
        brand: item.brand,
        recipeId: item.recipeId,
        recipeName: item.recipeName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistically update
      if (previousList && typeof previousList === 'object' && 'items' in previousList) {
        const currentList = previousList as GroceryList;
        queryClient.setQueryData(groceryListKeys.list(listId), {
          ...currentList,
          items: [...(currentList.items || []), optimisticItem],
        });
      }

      return { previousList, optimisticItem };
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update
      if (context?.previousList) {
        queryClient.setQueryData(groceryListKeys.list(variables.listId), context.previousList);
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to add item',
        variant: 'destructive',
      });
    },
    onSuccess: (response, { listId }) => {
      // Update with server response
      const currentList = queryClient.getQueryData(groceryListKeys.list(listId)) as GroceryList;
      if (currentList && typeof currentList === 'object' && 'items' in currentList) {
        queryClient.setQueryData(groceryListKeys.list(listId), {
          ...currentList,
          items: [
            ...(currentList.items || []).filter(item => !item.id.startsWith('temp-')),
            response, // addGroceryItem now returns GroceryListItem directly
          ],
        });
      }

      // Invalidate and refetch to ensure UI updates
      queryClient.invalidateQueries({ queryKey: groceryListKeys.list(listId) });

      toast({
        title: 'Success',
        description: 'Item added successfully',
      });
    },
  });
}

/**
 * Hook to update a grocery list item
 */
export function useUpdateGroceryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      listId,
      itemId,
      updates,
    }: {
      listId: string;
      itemId: string;
      updates: Partial<GroceryListItemInput>;
    }) => updateGroceryItem(listId, itemId, updates),
    onMutate: async ({ listId, itemId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: groceryListKeys.list(listId) });

      // Snapshot previous value
      const previousList = queryClient.getQueryData(groceryListKeys.list(listId));

      // Optimistically update
      if (previousList && typeof previousList === 'object' && 'items' in previousList && previousList.items) {
        const currentList = previousList as GroceryList;
        queryClient.setQueryData(groceryListKeys.list(listId), {
          ...currentList,
          items: currentList.items!.map((item: GroceryListItem) =>
            item.id === itemId
              ? { ...item, ...updates, updatedAt: new Date().toISOString() }
              : item
          ),
        });
      }

      return { previousList };
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update
      if (context?.previousList) {
        queryClient.setQueryData(groceryListKeys.list(variables.listId), context.previousList);
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to update item',
        variant: 'destructive',
      });
    },
    onSuccess: (response, { listId }) => {
      // Update with server response
      const currentList = queryClient.getQueryData(groceryListKeys.list(listId)) as GroceryList;
      if (currentList && typeof currentList === 'object' && 'items' in currentList && currentList.items) {
        queryClient.setQueryData(groceryListKeys.list(listId), {
          ...currentList,
          items: currentList.items.map((item: GroceryListItem) =>
            item.id === response.id ? response : item // updateGroceryItem now returns GroceryListItem directly
          ),
        });
      }

      // Invalidate and refetch to ensure UI updates
      queryClient.invalidateQueries({ queryKey: groceryListKeys.list(listId) });
    },
  });
}

/**
 * Hook to delete a grocery list item
 */
export function useDeleteGroceryItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      deleteGroceryItem(listId, itemId),
    onMutate: async ({ listId, itemId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: groceryListKeys.list(listId) });

      // Snapshot previous value
      const previousList = queryClient.getQueryData(groceryListKeys.list(listId));

      // Optimistically remove item
      if (previousList && typeof previousList === 'object' && 'items' in previousList && previousList.items) {
        const currentList = previousList as GroceryList;
        queryClient.setQueryData(groceryListKeys.list(listId), {
          ...currentList,
          items: currentList.items!.filter((item: GroceryListItem) => item.id !== itemId),
        });
      }

      return { previousList };
    },
    onError: (error: Error, variables, context) => {
      // Revert optimistic update
      if (context?.previousList) {
        queryClient.setQueryData(groceryListKeys.list(variables.listId), context.previousList);
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item',
        variant: 'destructive',
      });
    },
    onSuccess: (response, { listId, itemId }) => {
      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      });
    },
  });
}

/**
 * Hook to generate a grocery list from a meal plan
 */
export function useGenerateFromMealPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: generateFromMealPlan,
    onSuccess: (response) => {
      // Add new list to cache
      queryClient.setQueryData(groceryListKeys.lists(), (old: GroceryList[] = []) => {
        return [response.data, ...old];
      });

      // Cache the new list with items
      queryClient.setQueryData(groceryListKeys.list(response.data.id), response.data);

      toast({
        title: 'Success',
        description: 'Grocery list generated from meal plan',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate grocery list',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to toggle item checked status (convenience hook)
 */
export function useToggleGroceryItem() {
  const updateItem = useUpdateGroceryItem();

  return useMutation({
    mutationFn: ({ listId, itemId, isChecked }: { listId: string; itemId: string; isChecked: boolean }) =>
      updateItem.mutateAsync({ listId, itemId, updates: { isChecked } }),
  });
}

/**
 * Hook for local storage fallback (offline support)
 */
export function useOfflineGroceryList() {
  const storageKey = 'grocery-list-offline';

  const saveToLocal = (data: GroceryList) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save grocery list to local storage:', error);
    }
  };

  const loadFromLocal = (): GroceryList | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load grocery list from local storage:', error);
      return null;
    }
  };

  const clearLocal = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear grocery list from local storage:', error);
    }
  };

  return { saveToLocal, loadFromLocal, clearLocal };
}