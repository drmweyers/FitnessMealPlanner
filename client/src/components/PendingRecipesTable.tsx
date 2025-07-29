import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { isUnauthorizedError } from "../lib/authUtils";
import RecipeModal from "./RecipeModal";
import type { Recipe, RecipeFilter } from "@shared/schema";

export default function PendingRecipesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [filters] = useState<RecipeFilter>({ 
    approved: false, 
    page: 1, 
    limit: 50 
  });

  const { data: pendingData, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/recipes', filters],
    enabled: true,
    staleTime: 0, // Always consider data stale
    refetchOnMount: true,
  });

  const pendingRecipes = (pendingData as any)?.recipes || [];

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/admin/recipes/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Recipe Approved",
        description: "Recipe has been approved and is now visible to users.",
      });
      // Force refetch with cache bypass
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve recipe",
        variant: "destructive",
      });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      const recipeIds = pendingRecipes.map((recipe: Recipe) => recipe.id);
      await Promise.all(
        recipeIds.map((id: string) => 
          apiRequest('PATCH', `/api/admin/recipes/${id}/approve`)
        )
      );
      return recipeIds.length;
    },
    onSuccess: (count: number) => {
      toast({
        title: "All Recipes Approved",
        description: `Successfully approved ${count} recipes. They are now visible to users.`,
      });
      // Force refetch with cache bypass
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve all recipes",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/recipes/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Recipe Deleted",
        description: "Recipe has been removed from the system.",
      });
      // Force refetch with cache bypass
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      });
    },
  });

  const recipes = pendingRecipes;

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 sm:space-x-4 animate-pulse">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center">
        <i className="fas fa-clipboard-check text-3xl sm:text-4xl text-slate-300 mb-4"></i>
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No pending recipes</h3>
        <p className="text-sm sm:text-base text-slate-600">All recipes have been reviewed and approved.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {/* Batch Actions Header */}
        {recipes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-lg border gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-slate-600">
              {recipes.length} recipes pending approval
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Force complete cache refresh
                  queryClient.removeQueries({ queryKey: ['/api/admin/recipes'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
                  refetch(); // Force immediate refetch
                  queryClient.refetchQueries({ queryKey: ['/api/admin/stats'] });
                  toast({
                    title: "Refreshing",
                    description: "Updating recipe data...",
                  });
                }}
                className="border-slate-300 text-xs sm:text-sm py-2 sm:py-1"
              >
                <i className="fas fa-sync mr-2"></i>
                Refresh
              </Button>
              <Button
                onClick={() => approveAllMutation.mutate()}
                disabled={approveAllMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm py-2 sm:py-1"
              >
                {approveAllMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    <span className="hidden sm:inline">Approving All...</span>
                    <span className="sm:hidden">Approving...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-double mr-2"></i>
                    <span className="hidden sm:inline">Approve All ({recipes.length})</span>
                    <span className="sm:hidden">Approve All</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {recipes.map((recipe: Recipe) => (
            <Card key={recipe.id} className="shadow-sm border-0 ring-1 ring-slate-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start space-x-3">
                  {/* Recipe Image */}
                  <img 
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover flex-shrink-0 cursor-pointer"
                    onClick={() => setSelectedRecipe(recipe)}
                    src={recipe.imageUrl || '/api/placeholder/100/100'} 
                    alt={recipe.name}
                  />

                  {/* Recipe Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 
                        className="text-sm sm:text-base font-medium text-slate-900 line-clamp-2 pr-2 cursor-pointer hover:text-primary"
                        onClick={() => setSelectedRecipe(recipe)}
                      >
                        {recipe.name}
                        <i className="fas fa-external-link-alt ml-1 text-xs text-slate-400"></i>
                      </h3>
                      <span className="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-amber-100 text-amber-800 flex-shrink-0">
                        Pending
                      </span>
                    </div>

                    {recipe.description && (
                      <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mb-2">
                        {recipe.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3 text-xs sm:text-sm text-slate-600">
                        <span>{recipe.caloriesKcal} cal</span>
                        <span>{Number(recipe.proteinGrams).toFixed(0)}g protein</span>
                      </div>
                      {recipe.mealTypes && recipe.mealTypes.length > 0 && (
                        <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                          {recipe.mealTypes[0]}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveMutation.mutate(recipe.id)}
                        disabled={approveMutation.isPending}
                        className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                      >
                        <i className="fas fa-check mr-1"></i>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(recipe.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                      >
                        <i className="fas fa-trash mr-1"></i>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto rounded-lg border">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Recipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Nutrition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {recipes.map((recipe: Recipe) => (
                <tr key={recipe.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      className="flex items-center cursor-pointer"
                      onClick={() => setSelectedRecipe(recipe)}
                    >
                      <img 
                        className="h-12 w-12 rounded-lg object-cover mr-4" 
                        src={recipe.imageUrl || '/api/placeholder/100/100'} 
                        alt={recipe.name}
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-900 hover:text-primary">
                          {recipe.name}
                          <i className="fas fa-external-link-alt ml-2 text-xs text-slate-400"></i>
                        </div>
                        <div className="text-sm text-slate-500">
                          {recipe.description?.slice(0, 50)}
                          {recipe.description && recipe.description.length > 50 ? '...' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary">
                      {recipe.mealTypes?.[0] || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    <div className="flex space-x-4">
                      <span>{recipe.caloriesKcal} cal</span>
                      <span>{Number(recipe.proteinGrams).toFixed(0)}g protein</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                      Pending Review
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 min-w-[180px]">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveMutation.mutate(recipe.id)}
                        disabled={approveMutation.isPending}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <i className="fas fa-check mr-1"></i>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(recipe.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <i className="fas fa-trash mr-1"></i>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Results summary */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 bg-slate-50 rounded-lg text-xs sm:text-sm text-slate-600">
          Showing {recipes.length} pending recipes
        </div>
      </div>
      
      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeModal 
          recipe={selectedRecipe} 
          onClose={() => setSelectedRecipe(null)} 
        />
      )}
    </>
  );
}