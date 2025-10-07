import { memo, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  Activity,
  Eye,
  Heart,
  Star,
  BookOpen,
  TrendingUp,
  Calendar,
  Award,
  Target,
  Clock,
  Utensils,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUserActivity } from '../../hooks/useEngagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';

interface ActivityDashboardProps {
  className?: string;
}

interface ActivityStats {
  totalInteractions: number;
  recipesViewed: number;
  recipesRated: number;
  totalFavorites: number;
  totalCollections: number;
}

const ActivityDashboard = memo(({ className }: ActivityDashboardProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);
  
  const { 
    data: activityData, 
    isLoading, 
    error,
    refetch 
  } = useUserActivity(selectedPeriod);

  const stats: ActivityStats = activityData?.data || {
    totalInteractions: 0,
    recipesViewed: 0,
    recipesRated: 0,
    totalFavorites: 0,
    totalCollections: 0,
  };

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    const avgInteractionsPerDay = stats.totalInteractions / selectedPeriod;
    const engagementRate = stats.recipesViewed > 0 ? (stats.recipesRated / stats.recipesViewed) * 100 : 0;
    const favoriteRate = stats.recipesViewed > 0 ? (stats.totalFavorites / stats.recipesViewed) * 100 : 0;
    
    // Achievement calculation
    const achievements = [];
    if (stats.totalFavorites >= 10) achievements.push('Recipe Collector');
    if (stats.recipesRated >= 20) achievements.push('Active Reviewer');
    if (stats.totalCollections >= 3) achievements.push('Organization Master');
    if (stats.recipesViewed >= 50) achievements.push('Recipe Explorer');
    if (engagementRate >= 50) achievements.push('Engagement Champion');

    return {
      avgInteractionsPerDay,
      engagementRate,
      favoriteRate,
      achievements,
    };
  }, [stats, selectedPeriod]);

  const periodConfig = {
    7: { label: 'Last 7 Days', shortLabel: '7D' },
    30: { label: 'Last 30 Days', shortLabel: '30D' },
    90: { label: 'Last 90 Days', shortLabel: '90D' },
  };

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load activity data</h3>
            <p className="text-gray-600 mb-4">
              We couldn't load your activity dashboard. Please try again.
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
            <Activity className="h-6 w-6 text-blue-500" />
            Activity Dashboard
          </h2>
          <p className="text-gray-600">
            Track your recipe discovery and engagement
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <Tabs 
            value={selectedPeriod.toString()} 
            onValueChange={(value) => setSelectedPeriod(Number(value) as 7 | 30 | 90)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="7" className="text-xs">7D</TabsTrigger>
              <TabsTrigger value="30" className="text-xs">30D</TabsTrigger>
              <TabsTrigger value="90" className="text-xs">90D</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Interactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalInteractions}</div>
                <p className="text-xs text-muted-foreground">
                  ~{derivedMetrics.avgInteractionsPerDay.toFixed(1)} per day
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recipes Viewed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipes Viewed</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.recipesViewed}</div>
                <p className="text-xs text-muted-foreground">
                  Unique recipes explored
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Favorites */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favorites</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalFavorites}</div>
                <p className="text-xs text-muted-foreground">
                  {derivedMetrics.favoriteRate.toFixed(1)}% of viewed recipes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Collections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalCollections}</div>
                <p className="text-xs text-muted-foreground">
                  Recipe collections created
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engagement Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Engagement Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : (
              <>
                {/* Engagement Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rating Engagement</span>
                    <span className="text-sm text-muted-foreground">
                      {derivedMetrics.engagementRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={derivedMetrics.engagementRate} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {stats.recipesRated} of {stats.recipesViewed} recipes rated
                  </p>
                </div>

                {/* Favorite Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Favorite Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {derivedMetrics.favoriteRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={derivedMetrics.favoriteRate} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Percentage of viewed recipes favorited
                  </p>
                </div>

                {/* Activity Level */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Daily Activity</span>
                    <span className="text-sm text-muted-foreground">
                      {derivedMetrics.avgInteractionsPerDay.toFixed(1)}/day
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((derivedMetrics.avgInteractionsPerDay / 10) * 100, 100)} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Average interactions per day
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            ) : (
              <>
                {derivedMetrics.achievements.length > 0 ? (
                  <div className="space-y-3">
                    {derivedMetrics.achievements.map((achievement, index) => (
                      <div key={achievement} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <Award className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-yellow-800">{achievement}</p>
                          <p className="text-sm text-yellow-600">Achievement unlocked!</p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Next Achievement Hints */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Next Goals
                      </h4>
                      <div className="space-y-1 text-sm text-blue-700">
                        {stats.totalFavorites < 10 && (
                          <p>• Favorite {10 - stats.totalFavorites} more recipes to unlock Recipe Collector</p>
                        )}
                        {stats.recipesRated < 20 && (
                          <p>• Rate {20 - stats.recipesRated} more recipes to unlock Active Reviewer</p>
                        )}
                        {stats.totalCollections < 3 && (
                          <p>• Create {3 - stats.totalCollections} more collections to unlock Organization Master</p>
                        )}
                        {stats.recipesViewed < 50 && (
                          <p>• View {50 - stats.recipesViewed} more recipes to unlock Recipe Explorer</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No achievements yet</h3>
                    <p className="text-gray-600 mb-4">
                      Start exploring recipes to unlock your first achievement!
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• View 10 recipes to start your journey</p>
                      <p>• Favorite your first recipe</p>
                      <p>• Create your first collection</p>
                      <p>• Rate recipes to help others</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-green-500" />
            Activity Summary - {periodConfig[selectedPeriod].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Utensils className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">{stats.recipesViewed}</div>
                <div className="text-sm text-blue-600">Recipes Explored</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <Heart className="h-6 w-6 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-700">{stats.totalFavorites}</div>
                <div className="text-sm text-red-600">Favorites Added</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-700">{stats.recipesRated}</div>
                <div className="text-sm text-yellow-600">Recipes Rated</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <BookOpen className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">{stats.totalCollections}</div>
                <div className="text-sm text-purple-600">Collections Created</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

ActivityDashboard.displayName = 'ActivityDashboard';

export default ActivityDashboard;