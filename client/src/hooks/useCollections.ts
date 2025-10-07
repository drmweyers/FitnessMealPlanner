import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface Collection {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  tags: string[];
  recipeCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateCollectionRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
}

interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {}

interface CollectionsResponse {
  status: 'success' | 'error';
  data: {
    collections: Collection[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CollectionResponse {
  status: 'success' | 'error';
  data: Collection;
  message?: string;
}

// API functions
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`/api/favorites/collections${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

const createCollectionApi = async (collectionData: CreateCollectionRequest): Promise<CollectionResponse> => {
  return apiRequest('', {
    method: 'POST',
    body: JSON.stringify(collectionData),
  });
};

const getUserCollections = async (page = 1, limit = 20): Promise<CollectionsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  return apiRequest(`?${params.toString()}`);
};

const getCollectionWithRecipes = async (collectionId: string): Promise<any> => {
  return apiRequest(`/${collectionId}`);
};

const updateCollectionApi = async (collectionId: string, updates: UpdateCollectionRequest): Promise<CollectionResponse> => {
  return apiRequest(`/${collectionId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

const deleteCollectionApi = async (collectionId: string): Promise<{ status: 'success'; message: string }> => {
  return apiRequest(`/${collectionId}`, {
    method: 'DELETE',
  });
};

const addRecipeToCollectionApi = async (collectionId: string, recipeId: string, notes?: string): Promise<any> => {
  return apiRequest(`/${collectionId}/recipes`, {
    method: 'POST',
    body: JSON.stringify({ recipeId, notes }),
  });
};

const removeRecipeFromCollectionApi = async (collectionId: string, recipeId: string): Promise<any> => {
  return apiRequest(`/${collectionId}/recipes/${recipeId}`, {
    method: 'DELETE',
  });
};

// Main collections hook
export const useCollections = (page = 1, limit = 20) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch collections
  const { 
    data: collectionsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['collections', page, limit],
    queryFn: () => getUserCollections(page, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create collection mutation
  const createMutation = useMutation({
    mutationFn: createCollectionApi,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      
      toast({
        title: 'Collection created',
        description: 'Your new collection has been created successfully.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to create collection:', error);
      toast({
        title: 'Failed to create collection',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update collection mutation
  const updateMutation = useMutation({
    mutationFn: ({ collectionId, updates }: { collectionId: string; updates: UpdateCollectionRequest }) =>
      updateCollectionApi(collectionId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collection', data.data.id] });
      
      toast({
        title: 'Collection updated',
        description: 'Your collection has been updated successfully.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update collection:', error);
      toast({
        title: 'Failed to update collection',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Delete collection mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCollectionApi,
    onSuccess: (data, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.removeQueries({ queryKey: ['collection', collectionId] });
      
      toast({
        title: 'Collection deleted',
        description: 'Your collection has been deleted successfully.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to delete collection:', error);
      toast({
        title: 'Failed to delete collection',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    collections: collectionsData?.data?.collections || [],
    total: collectionsData?.data?.total || 0,
    
    // State
    isLoading,
    error,
    
    // Actions
    createCollection: (data: CreateCollectionRequest) => createMutation.mutateAsync(data),
    updateCollection: (collectionId: string, updates: UpdateCollectionRequest) => 
      updateMutation.mutateAsync({ collectionId, updates }),
    deleteCollection: (collectionId: string) => deleteMutation.mutateAsync(collectionId),
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Utilities
    refetch,
  };
};

// Hook for fetching a single collection with recipes
export const useCollection = (collectionId: string) => {
  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: () => getCollectionWithRecipes(collectionId),
    enabled: !!collectionId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Hook for managing recipes within collections
export const useCollectionRecipes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Add recipe to collection mutation
  const addRecipeMutation = useMutation({
    mutationFn: ({ collectionId, recipeId, notes }: { collectionId: string; recipeId: string; notes?: string }) =>
      addRecipeToCollectionApi(collectionId, recipeId, notes),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      
      toast({
        title: 'Recipe added',
        description: 'Recipe has been added to your collection.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to add recipe to collection:', error);
      toast({
        title: 'Failed to add recipe',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Remove recipe from collection mutation
  const removeRecipeMutation = useMutation({
    mutationFn: ({ collectionId, recipeId }: { collectionId: string; recipeId: string }) =>
      removeRecipeFromCollectionApi(collectionId, recipeId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      
      toast({
        title: 'Recipe removed',
        description: 'Recipe has been removed from your collection.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to remove recipe from collection:', error);
      toast({
        title: 'Failed to remove recipe',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    addRecipeToCollection: (collectionId: string, recipeId: string, notes?: string) =>
      addRecipeMutation.mutateAsync({ collectionId, recipeId, notes }),
    
    removeRecipeFromCollection: (collectionId: string, recipeId: string) =>
      removeRecipeMutation.mutateAsync({ collectionId, recipeId }),
    
    isAddingRecipe: addRecipeMutation.isPending,
    isRemovingRecipe: removeRecipeMutation.isPending,
  };
};