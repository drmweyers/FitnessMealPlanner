import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface FavoriteResponse {
  status: 'success' | 'error';
  data?: any;
  message?: string;
}

interface AddFavoriteRequest {
  recipeId: string;
  notes?: string;
}

interface FavoritesListResponse {
  status: 'success' | 'error';
  data: {
    favorites: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// API functions
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`/api/favorites${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

const addRecipeToFavorites = async ({ recipeId, notes }: AddFavoriteRequest): Promise<FavoriteResponse> => {
  return apiRequest('/', {
    method: 'POST',
    body: JSON.stringify({ recipeId, notes }),
  });
};

const removeRecipeFromFavorites = async (recipeId: string): Promise<FavoriteResponse> => {
  return apiRequest(`/${recipeId}`, {
    method: 'DELETE',
  });
};

const getUserFavorites = async (page = 1, limit = 20, search?: string): Promise<FavoritesListResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search) {
    params.append('search', search);
  }

  return apiRequest(`/?${params.toString()}`);
};

const checkFavoriteStatus = async (recipeId: string): Promise<{ isFavorited: boolean }> => {
  const response = await apiRequest(`/check/${recipeId}`);
  return response.data;
};

const trackRecipeInteraction = async (interaction: {
  recipeId: string;
  interactionType: 'view' | 'rate' | 'cook' | 'share' | 'search';
  interactionValue?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}): Promise<FavoriteResponse> => {
  return apiRequest('/interactions', {
    method: 'POST',
    body: JSON.stringify(interaction),
  });
};

// Hook for managing favorites
export const useFavorites = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutation for adding favorite
  const addFavoriteMutation = useMutation({
    mutationFn: addRecipeToFavorites,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-status', variables.recipeId] });
      
      toast({
        title: 'Added to favorites',
        description: 'Recipe has been saved to your favorites.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to add favorite:', error);
      toast({
        title: 'Failed to add favorite',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for removing favorite
  const removeFavoriteMutation = useMutation({
    mutationFn: removeRecipeFromFavorites,
    onSuccess: (data, recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-status', recipeId] });
      
      toast({
        title: 'Removed from favorites',
        description: 'Recipe has been removed from your favorites.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to remove favorite:', error);
      toast({
        title: 'Failed to remove favorite',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for tracking interactions
  const trackInteractionMutation = useMutation({
    mutationFn: trackRecipeInteraction,
    onError: (error: Error) => {
      console.error('Failed to track interaction:', error);
      // Don't show toast for tracking errors as they're non-critical
    },
  });

  return {
    // Actions
    addFavorite: (recipeId: string, notes?: string) => 
      addFavoriteMutation.mutateAsync({ recipeId, notes }),
    
    removeFavorite: (recipeId: string) => 
      removeFavoriteMutation.mutateAsync(recipeId),
    
    trackInteraction: (interaction: Parameters<typeof trackRecipeInteraction>[0]) =>
      trackInteractionMutation.mutateAsync(interaction),
    
    checkFavoriteStatus,
    
    // State
    isAddingFavorite: addFavoriteMutation.isPending,
    isRemovingFavorite: removeFavoriteMutation.isPending,
  };
};

// Hook for fetching user's favorites list
export const useUserFavorites = (page = 1, limit = 20, search?: string) => {
  return useQuery({
    queryKey: ['favorites', page, limit, search],
    queryFn: () => getUserFavorites(page, limit, search),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook for checking if a specific recipe is favorited
export const useFavoriteStatus = (recipeId: string) => {
  return useQuery({
    queryKey: ['favorite-status', recipeId],
    queryFn: () => checkFavoriteStatus(recipeId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!recipeId,
  });
};