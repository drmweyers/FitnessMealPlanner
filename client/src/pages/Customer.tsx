import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Recipe } from '../../../shared/schema';
import RecipeCard from '../components/RecipeCard';
import RecipeListItem from '../components/RecipeListItem';
import RecipeFilters, { FilterOptions } from '../components/RecipeFilters';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import RecipeModal from '@/components/RecipeModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const fetchPersonalizedRecipes = async (): Promise<Recipe[]> => {
  const res = await apiRequest('GET', '/api/recipes/personalized');
  const data = await res.json();
  return data.recipes || []; // Ensure we always return an array
};

const Customer = () => {
  const { isAuthenticated } = useAuth();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    mealType: 'all',
    sortBy: 'default',
    dietaryRestrictions: [],
    prepTimeRange: [0, 180],
    calorieRange: [0, 1500],
    proteinRange: [0, 100],
  });

  const { data: recipes, isLoading, error } = useQuery<Recipe[], Error>({
    queryKey: ['personalizedRecipes'],
    queryFn: fetchPersonalizedRecipes,
    enabled: isAuthenticated,
  });

  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];

    return recipes
      .filter((recipe) => {
        // Search filter
        if (filters.search && !recipe.name.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }

        // Meal type filter
        if (filters.mealType !== 'all' && !recipe.mealTypes?.includes(filters.mealType)) {
          return false;
        }

        // Dietary restrictions filter
        if (filters.dietaryRestrictions.length > 0) {
          const recipeTags = recipe.dietaryTags || [];
          if (!filters.dietaryRestrictions.every(restriction => 
            recipeTags.includes(restriction))) {
            return false;
          }
        }

        // Preparation time filter
        const prepTime = recipe.prepTimeMinutes || 0;
        if (prepTime < filters.prepTimeRange[0] || prepTime > filters.prepTimeRange[1]) {
          return false;
        }

        // Calorie filter
        const calories = recipe.caloriesKcal || 0;
        if (calories < filters.calorieRange[0] || calories > filters.calorieRange[1]) {
          return false;
        }

        // Protein filter
        const protein = Number(recipe.proteinGrams) || 0;
        if (protein < filters.proteinRange[0] || protein > filters.proteinRange[1]) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'calories-asc':
            return (a.caloriesKcal || 0) - (b.caloriesKcal || 0);
          case 'calories-desc':
            return (b.caloriesKcal || 0) - (a.caloriesKcal || 0);
          case 'protein-asc':
            return (Number(a.proteinGrams) || 0) - (Number(b.proteinGrams) || 0);
          case 'protein-desc':
            return (Number(b.proteinGrams) || 0) - (Number(a.proteinGrams) || 0);
          case 'time-asc':
            return (a.prepTimeMinutes || 0) - (b.prepTimeMinutes || 0);
          default:
            return 0;
        }
      });
  }, [recipes, filters]);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Personalized Recipes</h1>
      <p className="mb-8">Here are the recipes assigned to you by your trainer.</p>

      {/* Filters Section */}
      <div className="mb-8">
        <RecipeFilters onFilterChange={setFilters} />
      </div>

      {/* View Toggle */}
      <div className="flex justify-end mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-600">View:</span>
          <div className="flex border border-slate-300 rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none px-3 py-1"
            >
              <i className="fas fa-th mr-2"></i>
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none px-3 py-1"
            >
              <i className="fas fa-list mr-2"></i>
              List
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-slate-200 rounded-t-xl"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-24 h-24 bg-slate-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-2/3 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
          {error && (
            <div className="text-red-500 p-4 rounded-lg bg-red-50 mb-4">
              {error.message}
            </div>
          )}

          {filteredRecipes && filteredRecipes.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Showing {filteredRecipes.length} of {recipes?.length} recipes
              </p>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredRecipes.map((recipe) => (
                    <RecipeCard 
                      key={recipe.id} 
                      recipe={recipe} 
                      onClick={() => setSelectedRecipe(recipe)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRecipes.map((recipe) => (
                    <RecipeListItem
                      key={recipe.id}
                      recipe={recipe}
                      onClick={() => setSelectedRecipe(recipe)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            !isLoading && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {recipes?.length ? 'No recipes match your filters.' : 'You have no personalized recipes yet.'}
                </p>
              </div>
            )
          )}
        </>
      )}

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
};

export default Customer; 