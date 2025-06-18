import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import RecipeModal from "@/components/RecipeModal";
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

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['/api/admin/recipes', filters],
    enabled: true,
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
      // Immediately invalidate and refetch all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
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
      // Immediately invalidate and refetch all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
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
      // Immediately invalidate and refetch all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
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
      <div className="p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="h-12 w-12 bg-slate-200 rounded-lg"></div>
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
      <div className="p-12 text-center">
        <i className="fas fa-clipboard-check text-4xl text-slate-300 mb-4"></i>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No pending recipes</h3>
        <p className="text-slate-600">All recipes have been reviewed and approved.</p>
      </div>
    );
  }

  return (
    <>
    <div className="table-container">
      {/* Batch Actions Header */}
      {recipes.length > 0 && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {recipes.length} recipes pending approval
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
                queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
                toast({
                  title: "Refreshing",
                  description: "Updating recipe data...",
                });
              }}
              className="border-slate-300"
            >
              <i className="fas fa-sync mr-2"></i>
              Refresh
            </Button>
            <Button
              onClick={() => approveAllMutation.mutate()}
              disabled={approveAllMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approveAllMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Approving All...
                </>
              ) : (
                <>
                  <i className="fas fa-check-double mr-2"></i>
                  Approve All ({recipes.length})
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      <table className="w-full min-w-[800px]">
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
      
      {/* Results summary */}
      <div className="px-6 py-4 bg-slate-50 text-sm text-slate-600">
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