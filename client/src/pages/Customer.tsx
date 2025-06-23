import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Recipe } from '../../../shared/schema';
import RecipeCard from '../components/RecipeCard';
import RecipeFilters, { FilterOptions } from '../components/RecipeFilters';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

const fetchPersonalizedRecipes = async (): Promise<Recipe[]> => {
  const res = await apiRequest('GET', '/api/recipes/personalized');
  const data = await res.json();
  return data.recipes || []; // Ensure we always return an array
};

const Customer = () => {
  const { isAuthenticated } = useAuth();
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

      {isLoading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <p>Loading recipes...</p>
        </div>
      )}
      
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onClick={() => {}} />
            ))}
          </div>
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
    </div>
  );
};

export default Customer; 