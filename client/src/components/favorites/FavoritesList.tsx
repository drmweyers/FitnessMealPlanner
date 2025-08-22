import { memo, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Search, Filter, SortAsc, SortDesc, Grid, List, Heart } from 'lucide-react';
import { useUserFavorites } from '../../hooks/useFavorites';
import { cn } from '../../lib/utils';
import RecipeCard from '../RecipeCard';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import { Pagination } from '../ui/pagination';

interface FavoritesListProps {
  className?: string;
}

const ITEMS_PER_PAGE = 12;

const FavoritesList = memo(({ className }: FavoritesListProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'calories'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  
  // Debounce search input
  useMemo(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const { 
    data: favoritesData, 
    isLoading, 
    error,
    refetch 
  } = useUserFavorites(currentPage, ITEMS_PER_PAGE, debouncedSearch);

  // Sort and filter favorites
  const sortedAndFilteredFavorites = useMemo(() => {
    if (!favoritesData?.data?.favorites) return [];

    let favorites = [...favoritesData.data.favorites];

    // Apply type filter
    if (filterType !== 'all') {
      favorites = favorites.filter(recipe => 
        recipe.mealTypes?.includes(filterType)
      );
    }

    // Apply sorting
    favorites.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'calories':
          aValue = a.caloriesKcal;
          bValue = b.caloriesKcal;
          break;
        case 'date':
        default:
          aValue = new Date(a.favoriteDate || a.createdAt);
          bValue = new Date(b.favoriteDate || b.createdAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return favorites;
  }, [favoritesData?.data?.favorites, filterType, sortBy, sortOrder]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  }, [sortBy]);

  const handleRecipeClick = useCallback((recipe: any) => {
    // Track view interaction
    // TODO: Implement recipe detail modal
    console.log('Recipe clicked:', recipe);
  }, []);

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load favorites</h3>
            <p className="text-gray-600 mb-4">
              We couldn't load your favorite recipes. Please try again.
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
          <h2 className="text-2xl font-bold tracking-tight">My Favorites</h2>
          <p className="text-gray-600">
            {favoritesData?.data?.total || 0} saved recipes
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-9 w-9 p-0"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-9 w-9 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search your favorites..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="whitespace-nowrap">
              <Filter className="h-4 w-4 mr-2" />
              {filterType === 'all' ? 'All Types' : filterType}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterType('all')}>
              All Types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('breakfast')}>
              Breakfast
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('lunch')}>
              Lunch
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('dinner')}>
              Dinner
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('snack')}>
              Snacks
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="whitespace-nowrap">
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4 mr-2" />
              ) : (
                <SortDesc className="h-4 w-4 mr-2" />
              )}
              Sort by {sortBy}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSortChange('date')}>
              Date Added
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('name')}>
              Recipe Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('calories')}>
              Calories
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={cn(
          'grid gap-6',
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1'
        )}>
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
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
      {!isLoading && sortedAndFilteredFavorites.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="text-center">
              <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || filterType !== 'all' 
                  ? 'No favorites found' 
                  : 'No favorites yet'
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Start exploring recipes and save your favorites!'
                }
              </p>
              {(searchQuery || filterType !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Favorites Grid/List */}
      {!isLoading && sortedAndFilteredFavorites.length > 0 && (
        <>
          <div className={cn(
            'grid gap-6',
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1'
          )}>
            {sortedAndFilteredFavorites.map((recipe) => (
              <div key={recipe.id} className="relative group">
                <RecipeCard
                  recipe={recipe}
                  onClick={() => handleRecipeClick(recipe)}
                  className={cn(
                    'h-full transition-all duration-200 hover:shadow-xl',
                    viewMode === 'list' && 'flex flex-row'
                  )}
                />
                
                {/* Favorite Date Badge */}
                {recipe.favoriteDate && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 right-2 text-xs bg-white/90 backdrop-blur-sm"
                  >
                    Added {new Date(recipe.favoriteDate).toLocaleDateString()}
                  </Badge>
                )}

                {/* Personal Notes */}
                {recipe.notes && (
                  <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded p-2 text-xs text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <strong>Notes:</strong> {recipe.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {favoritesData?.data && favoritesData.data.totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={favoritesData.data.totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
});

FavoritesList.displayName = 'FavoritesList';

export default FavoritesList;