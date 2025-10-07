import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  TrendingUp, 
  Clock, 
  Eye, 
  Heart,
  Flame,
  Calendar,
  CalendarDays,
  Timer,
  Trophy,
  Star
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePopularRecipes } from '../../hooks/useEngagement';
import RecipeCard from '../RecipeCard';
import FavoriteButton from '../favorites/FavoriteButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface PopularRecipesProps {
  className?: string;
  onRecipeClick?: (recipe: any) => void;
}

const PopularRecipes = memo(({ className, onRecipeClick }: PopularRecipesProps) => {
  const [activeTimeframe, setActiveTimeframe] = useState<'day' | 'week' | 'month' | 'all'>('week');
  
  const { 
    data: popularData, 
    isLoading, 
    error,
    refetch 
  } = usePopularRecipes(activeTimeframe, 20);

  const handleRecipeClick = useCallback((recipe: any) => {
    onRecipeClick?.(recipe);
  }, [onRecipeClick]);

  const timeframeConfig = {
    day: {
      label: 'Today',
      icon: Clock,
      description: 'Most popular recipes today',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    week: {
      label: 'This Week',
      icon: Calendar,
      description: 'Trending recipes this week',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    month: {
      label: 'This Month',
      icon: CalendarDays,
      description: 'Popular recipes this month',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    all: {
      label: 'All Time',
      icon: Trophy,
      description: 'Most loved recipes ever',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  };

  const currentConfig = timeframeConfig[activeTimeframe];

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load popular recipes</h3>
            <p className="text-gray-600 mb-4">
              We couldn't load the trending recipes. Please try again.
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
            <TrendingUp className="h-6 w-6 text-blue-500" />
            Popular Recipes
          </h2>
          <p className="text-gray-600">
            {currentConfig.description}
          </p>
        </div>

        {/* Trending Badge */}
        <Badge variant="secondary" className={cn(
          'text-sm font-medium px-3 py-1',
          currentConfig.color,
          currentConfig.bgColor
        )}>
          <currentConfig.icon className="h-4 w-4 mr-1" />
          {currentConfig.label}
        </Badge>
      </div>

      {/* Timeframe Tabs */}
      <Tabs value={activeTimeframe} onValueChange={(value: any) => setActiveTimeframe(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="day" className="text-xs sm:text-sm">
            <Clock className="h-4 w-4 mr-1 hidden sm:block" />
            Today
          </TabsTrigger>
          <TabsTrigger value="week" className="text-xs sm:text-sm">
            <Calendar className="h-4 w-4 mr-1 hidden sm:block" />
            Week
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs sm:text-sm">
            <CalendarDays className="h-4 w-4 mr-1 hidden sm:block" />
            Month
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs sm:text-sm">
            <Trophy className="h-4 w-4 mr-1 hidden sm:block" />
            All Time
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTimeframe} className="mt-6">
          {/* Loading State */}
          {isLoading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
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
          {!isLoading && (!popularData?.data || popularData.data.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <div className="text-center">
                  <Flame className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No popular recipes yet</h3>
                  <p className="text-gray-600">
                    Check back later to see what's trending!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Popular Recipes Grid */}
          {!isLoading && popularData?.data && popularData.data.length > 0 && (
            <div className="space-y-6">
              {/* Top 3 Featured */}
              {popularData.data.length >= 3 && (
                <div className="grid gap-6 lg:grid-cols-3">
                  {popularData.data.slice(0, 3).map((item: any, index: number) => (
                    <Card 
                      key={item.recipe.id}
                      className={cn(
                        "group hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden",
                        index === 0 && "lg:col-span-1 ring-2 ring-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50"
                      )}
                      onClick={() => handleRecipeClick(item.recipe)}
                    >
                      {/* Ranking Badge */}
                      <div className={cn(
                        "absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                        index === 0 && "bg-yellow-500",
                        index === 1 && "bg-gray-400",
                        index === 2 && "bg-amber-600"
                      )}>
                        {index + 1}
                      </div>

                      {/* Favorite Button */}
                      <div className="absolute top-3 right-3 z-10">
                        <FavoriteButton 
                          recipeId={item.recipe.id}
                          size="sm"
                          variant="ghost"
                        />
                      </div>

                      {/* Recipe Image */}
                      <div className="relative w-full h-48 overflow-hidden">
                        <img 
                          src={item.recipe.imageUrl || '/api/placeholder/400/250'} 
                          alt={item.recipe.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        
                        {/* Trending Overlay */}
                        {index === 0 && (
                          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 to-transparent" />
                        )}
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {item.recipe.name}
                        </h3>

                        {/* Engagement Stats */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{item.viewCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span>{item.favoriteCount || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Timer className="h-4 w-4" />
                            <span>{item.recipe.prepTimeMinutes + item.recipe.cookTimeMinutes}m</span>
                          </div>
                        </div>

                        {/* Recipe Meta */}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {item.recipe.mealTypes?.slice(0, 2).map((type: string) => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-sm font-medium text-blue-600">
                            {item.recipe.caloriesKcal} cal
                          </div>
                        </div>

                        {/* Trending Indicator */}
                        {index === 0 && (
                          <div className="mt-3 flex items-center gap-2 text-yellow-600">
                            <Flame className="h-4 w-4" />
                            <span className="text-sm font-medium">Trending Now!</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Remaining Recipes Grid */}
              {popularData.data.length > 3 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-blue-500" />
                    More Popular Recipes
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {popularData.data.slice(3).map((item: any, index: number) => (
                      <Card 
                        key={item.recipe.id}
                        className="group hover:shadow-lg transition-all duration-200 cursor-pointer relative"
                        onClick={() => handleRecipeClick(item.recipe)}
                      >
                        {/* Ranking */}
                        <div className="absolute top-2 left-2 z-10 bg-gray-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                          {index + 4}
                        </div>

                        {/* Favorite Button */}
                        <div className="absolute top-2 right-2 z-10">
                          <FavoriteButton 
                            recipeId={item.recipe.id}
                            size="sm"
                            variant="ghost"
                          />
                        </div>

                        {/* Recipe Image */}
                        <div className="relative w-full h-32 overflow-hidden">
                          <img 
                            src={item.recipe.imageUrl || '/api/placeholder/400/200'} 
                            alt={item.recipe.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>

                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {item.recipe.name}
                          </h4>

                          {/* Compact Stats */}
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {item.viewCount || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3 text-red-500" />
                                {item.favoriteCount || 0}
                              </span>
                            </div>
                            <span className="font-medium text-blue-600">
                              {item.recipe.caloriesKcal} cal
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
});

PopularRecipes.displayName = 'PopularRecipes';

export default PopularRecipes;