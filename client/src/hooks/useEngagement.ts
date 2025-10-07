import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

// Types
interface EngagementResponse {
  status: 'success' | 'error';
  data: any;
  message?: string;
}

interface PopularRecipe {
  recipe: any;
  viewCount: number;
  favoriteCount: number;
  avgRating?: number;
  trendingScore?: number;
}

interface TrendingRecipe {
  recipe: any;
  recentViews: number;
  totalViews: number;
  favoriteCount: number;
}

interface RecommendedRecipe {
  recipe: any;
  score: number;
  reason: string;
}

interface UserActivity {
  totalInteractions: number;
  recipesViewed: number;
  recipesRated: number;
  totalFavorites: number;
  totalCollections: number;
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

const getPopularRecipes = async (timeframe: string, limit: number): Promise<EngagementResponse> => {
  const params = new URLSearchParams({
    timeframe,
    limit: limit.toString(),
  });

  return apiRequest(`/popular?${params.toString()}`);
};

const getTrendingRecipes = async (limit: number, category?: string): Promise<EngagementResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });

  if (category) {
    params.append('category', category);
  }

  return apiRequest(`/trending?${params.toString()}`);
};

const getRecommendations = async (limit: number, type: string): Promise<EngagementResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    type,
  });

  return apiRequest(`/recommendations?${params.toString()}`);
};

const getUserActivity = async (days: number): Promise<EngagementResponse> => {
  const params = new URLSearchParams({
    days: days.toString(),
  });

  return apiRequest(`/activity?${params.toString()}`);
};

const trackInteraction = async (interaction: {
  recipeId: string;
  interactionType: 'view' | 'rate' | 'cook' | 'share' | 'search';
  interactionValue?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}): Promise<EngagementResponse> => {
  return apiRequest('/interactions', {
    method: 'POST',
    body: JSON.stringify(interaction),
  });
};

const rateRecipe = async (recipeId: string, rating: number): Promise<EngagementResponse> => {
  return apiRequest('/rate', {
    method: 'POST',
    body: JSON.stringify({ recipeId, rating }),
  });
};

// Hooks

// Hook for popular recipes
export const usePopularRecipes = (timeframe: 'day' | 'week' | 'month' | 'all' = 'week', limit: number = 20) => {
  return useQuery({
    queryKey: ['popular-recipes', timeframe, limit],
    queryFn: () => getPopularRecipes(timeframe, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};

// Hook for trending recipes
export const useTrendingRecipes = (limit: number = 20, category?: string) => {
  return useQuery({
    queryKey: ['trending-recipes', limit, category],
    queryFn: () => getTrendingRecipes(limit, category),
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
};

// Hook for personalized recommendations
export const useRecommendations = (limit: number = 10, type: 'personalized' | 'similar' | 'trending' | 'new' = 'personalized') => {
  return useQuery({
    queryKey: ['recommendations', limit, type],
    queryFn: () => getRecommendations(limit, type),
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: 2,
  });
};

// Hook for user activity summary
export const useUserActivity = (days: number = 30) => {
  return useQuery({
    queryKey: ['user-activity', days],
    queryFn: () => getUserActivity(days),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};

// Hook for tracking interactions
export const useInteractionTracking = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Track interaction mutation
  const trackInteractionMutation = useMutation({
    mutationFn: trackInteraction,
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['popular-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['trending-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
    onError: (error: Error) => {
      console.error('Failed to track interaction:', error);
      // Don't show toast for tracking errors as they're non-critical
    },
  });

  // Rate recipe mutation
  const rateRecipeMutation = useMutation({
    mutationFn: ({ recipeId, rating }: { recipeId: string; rating: number }) =>
      rateRecipe(recipeId, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popular-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['trending-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
      
      toast({
        title: 'Rating submitted',
        description: 'Thank you for rating this recipe!',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Failed to rate recipe:', error);
      toast({
        title: 'Failed to submit rating',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    // Actions
    trackInteraction: (interaction: Parameters<typeof trackInteraction>[0]) =>
      trackInteractionMutation.mutateAsync(interaction),
    
    rateRecipe: (recipeId: string, rating: number) =>
      rateRecipeMutation.mutateAsync({ recipeId, rating }),
    
    // State
    isTrackingInteraction: trackInteractionMutation.isPending,
    isRatingRecipe: rateRecipeMutation.isPending,
  };
};

// Utility hook for auto-tracking recipe views
export const useRecipeViewTracking = () => {
  const { trackInteraction } = useInteractionTracking();

  const trackView = async (recipeId: string, sessionId?: string) => {
    try {
      await trackInteraction({
        recipeId,
        interactionType: 'view',
        sessionId,
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to track recipe view:', error);
    }
  };

  const trackSearch = async (query: string, sessionId?: string) => {
    try {
      await trackInteraction({
        recipeId: '', // Search doesn't have a specific recipe ID
        interactionType: 'search',
        sessionId,
        metadata: {
          query,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to track search:', error);
    }
  };

  const trackShare = async (recipeId: string, platform: string, sessionId?: string) => {
    try {
      await trackInteraction({
        recipeId,
        interactionType: 'share',
        sessionId,
        metadata: {
          platform,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  };

  const trackCook = async (recipeId: string, sessionId?: string) => {
    try {
      await trackInteraction({
        recipeId,
        interactionType: 'cook',
        sessionId,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to track cook:', error);
    }
  };

  return {
    trackView,
    trackSearch,
    trackShare,
    trackCook,
  };
};