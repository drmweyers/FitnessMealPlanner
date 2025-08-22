import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  Sparkles,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  X,
  Lightbulb,
  TrendingUp,
  Star,
  Clock,
  Users,
  Filter
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useRecommendations, useInteractionTracking } from '../../hooks/useEngagement';
import EnhancedRecipeCard from '../favorites/EnhancedRecipeCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '../ui/dropdown-menu';

interface RecommendationFeedProps {
  className?: string;
  onRecipeClick?: (recipe: any) => void;
}

interface RecommendedRecipe {
  recipe: any;
  score: number;
  reason: string;
}

const RecommendationFeed = memo(({ className, onRecipeClick }: RecommendationFeedProps) => {
  const [activeType, setActiveType] = useState<'personalized' | 'similar' | 'trending' | 'new'>('personalized');
  const [dismissedRecipes, setDismissedRecipes] = useState<Set<string>>(new Set());
  
  const { 
    data: recommendationsData, 
    isLoading, 
    error,
    refetch 
  } = useRecommendations(15, activeType);

  const { trackInteraction } = useInteractionTracking();

  const handleRecipeClick = useCallback((recipe: any) => {
    onRecipeClick?.(recipe);
  }, [onRecipeClick]);

  const handleFeedback = useCallback(async (recipeId: string, feedback: 'like' | 'dislike' | 'not_interested') => {
    try {
      await trackInteraction({
        recipeId,
        interactionType: 'rate',
        interactionValue: feedback === 'like' ? 5 : feedback === 'dislike' ? 1 : 0,
        metadata: {
          feedbackType: feedback,
          recommendationType: activeType,
          timestamp: new Date().toISOString(),
        },
      });

      if (feedback === 'not_interested') {
        setDismissedRecipes(prev => new Set(prev).add(recipeId));
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }, [trackInteraction, activeType]);

  const handleRefresh = useCallback(() => {
    setDismissedRecipes(new Set());
    refetch();
  }, [refetch]);

  // Filter out dismissed recipes
  const visibleRecommendations = recommendationsData?.data?.filter(
    (item: RecommendedRecipe) => !dismissedRecipes.has(item.recipe.id)
  ) || [];

  const typeConfig = {
    personalized: {
      label: 'For You',
      icon: Sparkles,
      description: 'Recipes tailored to your taste preferences',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    similar: {
      label: 'Similar',
      icon: Star,
      description: 'Based on recipes you loved',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    trending: {
      label: 'Trending',
      icon: TrendingUp,
      description: 'What others are cooking now',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    new: {
      label: 'New',
      icon: Clock,
      description: 'Fresh recipes just added',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
  };

  const currentConfig = typeConfig[activeType];

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load recommendations</h3>
            <p className="text-gray-600 mb-4">
              We couldn't load your recommendations. Please try again.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <currentConfig.icon className={cn("h-6 w-6", currentConfig.color)} />
            Recipe Recommendations
          </h2>
          <p className="text-gray-600">
            {currentConfig.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Recommendation Type Tabs */}
      <Tabs value={activeType} onValueChange={(value: any) => setActiveType(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personalized" className="text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 mr-1 hidden sm:block" />
            For You
          </TabsTrigger>
          <TabsTrigger value="similar" className="text-xs sm:text-sm">
            <Star className="h-4 w-4 mr-1 hidden sm:block" />
            Similar
          </TabsTrigger>
          <TabsTrigger value="trending" className="text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 mr-1 hidden sm:block" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="new" className="text-xs sm:text-sm">
            <Clock className="h-4 w-4 mr-1 hidden sm:block" />
            New
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeType} className="mt-6">
          {/* Loading State */}
          {isLoading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && visibleRecommendations.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <div className="text-center">
                  <currentConfig.icon className={cn("h-12 w-12 text-gray-300 mx-auto mb-4")} />
                  <h3 className="text-lg font-semibold mb-2">
                    No recommendations available
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {dismissedRecipes.size > 0 
                      ? "All recommendations have been dismissed. Refresh to see new ones!"
                      : "We're learning your preferences. Try exploring some recipes first!"
                    }
                  </p>
                  <Button onClick={handleRefresh} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Recommendations
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations Grid */}
          {!isLoading && visibleRecommendations.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleRecommendations.map((item: RecommendedRecipe, index: number) => (
                <div key={item.recipe.id} className="relative group">
                  <EnhancedRecipeCard
                    recipe={item.recipe}
                    onClick={() => handleRecipeClick(item.recipe)}
                    showFavoriteButton={true}
                    showEngagementStats={false}
                    engagementData={{
                      isRecommended: true,
                      recommendationReason: item.reason,
                    }}
                    className="h-full"
                  />

                  {/* Recommendation Score Badge */}
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "absolute top-2 left-2 z-30 text-xs font-medium px-2 py-1",
                      currentConfig.color,
                      currentConfig.bgColor
                    )}
                  >
                    {Math.round(item.score * 100)}% match
                  </Badge>

                  {/* Feedback Actions */}
                  <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm hover:bg-green-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFeedback(item.recipe.id, 'like');
                        }}
                        title="I like this recommendation"
                      >
                        <ThumbsUp className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFeedback(item.recipe.id, 'dislike');
                        }}
                        title="I don't like this recommendation"
                      >
                        <ThumbsDown className="h-3 w-3 text-red-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFeedback(item.recipe.id, 'not_interested');
                        }}
                        title="Not interested"
                      >
                        <X className="h-3 w-3 text-gray-600" />
                      </Button>
                    </div>
                  </div>

                  {/* Recommendation Reason */}
                  <div className="absolute bottom-2 left-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 text-sm shadow-lg">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-700 text-xs leading-relaxed">
                          {item.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show More Button */}
          {!isLoading && visibleRecommendations.length > 0 && visibleRecommendations.length >= 15 && (
            <div className="flex justify-center mt-8">
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Load More Recommendations
              </Button>
            </div>
          )}

          {/* Feedback Tip */}
          {!isLoading && visibleRecommendations.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Help us improve your recommendations
                  </h4>
                  <p className="text-sm text-blue-700">
                    Use the thumbs up/down buttons to tell us what you like. 
                    The more feedback you give, the better our suggestions become!
                  </p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
});

RecommendationFeed.displayName = 'RecommendationFeed';

export default RecommendationFeed;