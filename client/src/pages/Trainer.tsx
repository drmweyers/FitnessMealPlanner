import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import SearchFilters from "@/components/SearchFilters";
import RecipeCard from "@/components/RecipeCard";
import RecipeCardWithAssignment from "@/components/RecipeCardWithAssignment";
import RecipeListItem from "@/components/RecipeListItem";
import RecipeListItemWithAssignment from "@/components/RecipeListItemWithAssignment";
import RecipeModal from "@/components/RecipeModal";
import RecipeAssignment from "@/components/RecipeAssignment";
import MealPlanGenerator from "@/components/MealPlanGenerator";
import type { Recipe, RecipeFilter } from "@shared/schema";

export default function Trainer() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [filters, setFilters] = useState<RecipeFilter>({ 
    page: 1, 
    limit: 10,
    approved: true 
  });
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Determine active tab based on URL
  const getActiveTab = () => {
    if (location === '/meal-plan-generator') return 'meal-plan';
    return 'recipes';
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'meal-plan':
        navigate('/meal-plan-generator');
        break;
      default:
        navigate('/trainer');
    }
  };

  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['/api/recipes', filters],
    enabled: getActiveTab() === 'recipes',
  });

  const recipes: Recipe[] = (recipesData as any)?.recipes || [];
  const total: number = (recipesData as any)?.total || 0;

  const handleFilterChange = (newFilters: Partial<RecipeFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    const totalPages = Math.max(1, Math.ceil(total / filters.limit));
    const validPage = Math.max(1, Math.min(page, totalPages));
    setFilters(prev => ({ ...prev, page: validPage }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {user?.email}</h1>
        <p className="text-slate-600">Browse recipes and create meal plans for your clients.</p>
      </div>

      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="recipes">
            <i className="fas fa-book-open mr-2"></i>
            Browse Recipes
          </TabsTrigger>
          <TabsTrigger value="meal-plan">
            <i className="fas fa-utensils mr-2"></i>
            Meal Plan Generator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="space-y-6">
          {/* Search and Filters */}
          <SearchFilters filters={filters} onFilterChange={handleFilterChange} />

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

          {/* Recipe Display */}
          {isLoading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recipes.map((recipe) => (
                    user?.role === 'trainer' || user?.role === 'admin' ? (
                      <RecipeCardWithAssignment
                        key={recipe.id}
                        recipe={recipe}
                        onClick={() => setSelectedRecipe(recipe)}
                        showAssignment={user?.role === 'trainer' || user?.role === 'admin'}
                      />
                    ) : (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        onClick={() => setSelectedRecipe(recipe)}
                      />
                    )
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recipes.map((recipe) => (
                    user?.role === 'trainer' || user?.role === 'admin' ? (
                      <RecipeListItemWithAssignment
                        key={recipe.id}
                        recipe={recipe}
                        onClick={() => setSelectedRecipe(recipe)}
                        showAssignment={user?.role === 'trainer' || user?.role === 'admin'}
                      />
                    ) : (
                      <RecipeListItem
                        key={recipe.id}
                        recipe={recipe}
                        onClick={() => setSelectedRecipe(recipe)}
                      />
                    )
                  ))}
                </div>
              )}

              {/* Pagination */}
              {total > filters.limit && (
                <div className="mt-8 flex justify-center">
                  <div className="flex space-x-2">
                    {Array.from({ length: Math.ceil(total / filters.limit) }).map((_, i) => (
                      <Button
                        key={i}
                        variant={filters.page === i + 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="meal-plan">
          <MealPlanGenerator />
        </TabsContent>
      </Tabs>

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
} 