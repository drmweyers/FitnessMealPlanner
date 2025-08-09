import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../contexts/AuthContext";
import SearchFilters from "../components/SearchFilters";
import RecipeCard from "../components/RecipeCard";
import RecipeCardWithAssignment from "../components/RecipeCardWithAssignment";
import RecipeListItem from "../components/RecipeListItem";
import RecipeListItemWithAssignment from "../components/RecipeListItemWithAssignment";
import RecipeModal from "../components/RecipeModal";
import RecipeAssignment from "../components/RecipeAssignment";
import MealPlanGenerator from "../components/MealPlanGenerator";
import CustomerManagement from "../components/CustomerManagement";
import TrainerMealPlans from "../components/TrainerMealPlans";
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
    if (location === '/trainer/customers') return 'customers';
    if (location === '/trainer/meal-plans') return 'saved-plans';
    return 'recipes';
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'meal-plan':
        navigate('/meal-plan-generator');
        break;
      case 'customers':
        navigate('/trainer/customers');
        break;
      case 'saved-plans':
        navigate('/trainer/meal-plans');
        break;
      default:
        navigate('/trainer');
    }
  };

  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['/api/recipes', filters],
    queryFn: async () => {
      const response = await fetch('/api/recipes', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch recipes');
      return response.json();
    },
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
          Welcome, {user?.email?.split('@')[0] || 'Trainer'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Browse recipes and create meal plans for your clients.
        </p>
      </div>

      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-6 sm:mb-8 h-auto p-1 gap-1">
          <TabsTrigger 
            value="recipes" 
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
          >
            <i className="fas fa-book-open text-sm sm:text-base"></i>
            <span className="hidden lg:inline">Browse Recipes</span>
            <span className="lg:hidden">Recipes</span>
          </TabsTrigger>
          <TabsTrigger 
            value="meal-plan"
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
          >
            <i className="fas fa-utensils text-sm sm:text-base"></i>
            <span className="hidden lg:inline">Generate Plans</span>
            <span className="lg:hidden">Generate</span>
          </TabsTrigger>
          <TabsTrigger 
            value="saved-plans"
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
          >
            <i className="fas fa-save text-sm sm:text-base"></i>
            <span className="hidden lg:inline">Saved Plans</span>
            <span className="lg:hidden">Saved</span>
          </TabsTrigger>
          <TabsTrigger 
            value="customers"
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm"
          >
            <i className="fas fa-users text-sm sm:text-base"></i>
            <span className="hidden lg:inline">Customers</span>
            <span className="lg:hidden">Customers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="space-y-4 sm:space-y-6">
          {/* Search and Filters */}
          <SearchFilters filters={filters} onFilterChange={handleFilterChange} />

          {/* View Toggle */}
          <div className="flex flex-col sm:flex-row sm:justify-end mb-4 sm:mb-6 gap-3 sm:gap-0">
            <div className="flex items-center justify-between sm:justify-end sm:space-x-2">
              <span className="text-sm text-slate-600 font-medium">View:</span>
              <div className="flex border border-slate-300 rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none px-3 py-2 text-xs sm:text-sm"
                >
                  <i className="fas fa-th mr-1 sm:mr-2 text-xs sm:text-sm"></i>
                  <span className="hidden sm:inline">Grid</span>
                  <span className="sm:hidden">⬜</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none px-3 py-2 text-xs sm:text-sm"
                >
                  <i className="fas fa-list mr-1 sm:mr-2 text-xs sm:text-sm"></i>
                  <span className="hidden sm:inline">List</span>
                  <span className="sm:hidden">☰</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Recipe Display */}
          {isLoading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-36 sm:h-40 lg:h-48 bg-slate-200 rounded-t-xl"></div>
                    <CardContent className="p-3 sm:p-4">
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start space-x-3 sm:space-x-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-200 rounded-lg flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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
                <div className="space-y-3 sm:space-y-4">
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
                <div className="mt-6 sm:mt-8 flex justify-center">
                  <div className="flex flex-wrap gap-1 sm:gap-2 max-w-full">
                    {Array.from({ length: Math.ceil(total / filters.limit) }).map((_, i) => (
                      <Button
                        key={i}
                        variant={filters.page === i + 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(i + 1)}
                        className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 min-w-[32px] sm:min-w-[40px]"
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

        <TabsContent value="customers">
          <CustomerManagement />
        </TabsContent>

        <TabsContent value="saved-plans">
          <TrainerMealPlans />
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