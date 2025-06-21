import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import AdminTable from "@/components/AdminTable";
import AdminRecipeGrid from "@/components/AdminRecipeGrid";
import SearchFilters from "@/components/SearchFilters";
import type { Recipe, RecipeFilter } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<RecipeFilter>({ 
    page: 1, 
    limit: 50,
    approved: undefined // Show all recipes by default
  });
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [showAllRecipes, setShowAllRecipes] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    total: number;
    approved: number;
    pending: number;
    avgRating: number;
  }>({
    queryKey: ['/api/admin/stats'],
    enabled: isAuthenticated,
    retry: false, // Don't retry on auth errors
  });

  // Use the working public recipes endpoint instead of admin recipes
  const { data: allRecipesData, isLoading: allRecipesLoading } = useQuery({
    queryKey: ['/api/recipes', filters],
    enabled: isAuthenticated && showAllRecipes,
  });

  const { data: adminRecipesData, isLoading: pendingLoading } = useQuery({
    queryKey: ['/api/admin/recipes', filters],
    enabled: isAuthenticated && !showAllRecipes,
  });

  const allRecipes = (allRecipesData as any)?.recipes || [];
  const pendingRecipes = (adminRecipesData as any)?.recipes || [];
  const displayRecipes = showAllRecipes ? allRecipes : pendingRecipes;
  const total = showAllRecipes ? allRecipes.length : ((adminRecipesData as any)?.total || 0);
  const isLoading = showAllRecipes ? allRecipesLoading : pendingLoading;

  const handleFilterChange = (newFilters: Partial<RecipeFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const generateMutation = useMutation({
    mutationFn: async (count: number) => {
      const response = await apiRequest('POST', '/api/admin/generate', { count });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Recipe Generation Started",
        description: data.message,
      });
      // Immediate refresh to show generation started
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      
      // Progressive refresh during generation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      }, 10000); // 10 seconds
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
        queryClient.refetchQueries({ queryKey: ['/api/admin/recipes'] });
      }, 30000); // 30 seconds - when generation should be complete
    },
    onError: (error) => {
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
        description: "Failed to start recipe generation",
        variant: "destructive",
      });
    },
  });

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
      // Aggressively refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      
      // Force refetch to ensure immediate updates
      queryClient.refetchQueries({ queryKey: ['/api/admin/recipes', filters] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error) => {
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/recipes/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Recipe Deleted",
        description: "Recipe has been removed from the system.",
      });
      // Aggressively refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      
      // Force refetch to ensure immediate updates
      queryClient.refetchQueries({ queryKey: ['/api/admin/recipes', filters] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error) => {
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest('DELETE', '/api/admin/recipes', { ids });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Recipes Deleted",
        description: data.message,
      });
      // Aggressively refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      
      // Force refetch to ensure immediate updates
      queryClient.refetchQueries({ queryKey: ['/api/admin/recipes', filters] });
      queryClient.refetchQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error) => {
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
        description: "Failed to delete selected recipes",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-slate-600">Manage recipes, generate new content, and monitor system status.</p>
      </div>

      {/* Admin Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <i className="fas fa-plus-circle text-primary text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Generate Recipes</h3>
            </div>
            <p className="text-slate-600 mb-4">Create new recipes using OpenAI integration</p>
            <Button 
              className="w-full bg-primary hover:bg-primary/90" 
              onClick={() => generateMutation.mutate(20)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <i className="fas fa-magic mr-2"></i>
                  Generate New Batch
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <i className="fas fa-eye text-secondary text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Review Queue</h3>
            </div>
            <p className="text-slate-600 mb-4">Review and approve pending recipes</p>
            <Button 
              variant="outline" 
              className="w-full border-secondary text-secondary hover:bg-secondary hover:text-white"
            >
              <span className="flex items-center justify-center">
                <i className="fas fa-list mr-2"></i>
                View Pending ({total})
              </span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="fas fa-download text-blue-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Export Data</h3>
            </div>
            <p className="text-slate-600 mb-4">Download recipe database as JSON</p>
            <Button 
              variant="outline" 
              className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
            >
              <span className="flex items-center justify-center">
                <i className="fas fa-file-download mr-2"></i>
                Export All Data
              </span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => {
              setShowAllRecipes(true);
              setFilters({ page: 1, limit: 50 });
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Recipes</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-primary mt-1">👆 Click to view all recipes</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <i className="fas fa-book text-primary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <i className="fas fa-check-circle text-green-600 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pending Review</p>
                  <p className="text-2xl font-bold text-secondary">{stats.pending.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <i className="fas fa-clock text-secondary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg Rating</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.avgRating}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <i className="fas fa-star text-yellow-500 text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recipe Database Management Button - Always Visible */}
      <Card className="mb-8 border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="mb-4">
              <i className="fas fa-database text-primary text-3xl mb-3"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Recipe Database Management</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Access the complete recipe database with advanced management tools including individual and bulk delete operations
            </p>
            <Button
              size="lg"
              onClick={() => {
                setShowAllRecipes(true);
                setFilters({ page: 1, limit: 50 });
              }}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
            >
              <i className="fas fa-database mr-3"></i>
              Manage All Recipes ({stats?.total || "Loading..."})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <SearchFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Recipe Management Section */}
      {showAllRecipes ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">All Recipes ({total} total)</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Manage and delete recipes from the database
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                >
                  <i className={`fas ${viewMode === 'grid' ? 'fa-table' : 'fa-th-large'} mr-2`}></i>
                  {viewMode === 'grid' ? 'Table View' : 'Grid View'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllRecipes(false)}
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Dashboard
                </Button>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <AdminRecipeGrid
                recipes={displayRecipes}
                isLoading={isLoading}
                onDelete={(id) => deleteMutation.mutate(id)}
                onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
                deletePending={deleteMutation.isPending}
                bulkDeletePending={bulkDeleteMutation.isPending}
              />
            ) : (
              <AdminTable
                recipes={displayRecipes}
                isLoading={isLoading}
                onApprove={(id) => approveMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
                onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
                approvePending={approveMutation.isPending}
                deletePending={deleteMutation.isPending}
                bulkDeletePending={bulkDeleteMutation.isPending}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Recipe Management</h2>
              <p className="text-sm text-slate-600 mt-1">
                {filters.approved === false ? 'Pending Recipe Reviews' : 
                 filters.approved === true ? 'Approved Recipes' : 'All Recipes'} 
                ({total} results)
              </p>
            </div>
            <AdminTable
              recipes={displayRecipes}
              isLoading={isLoading}
              onApprove={(id) => approveMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
              approvePending={approveMutation.isPending}
              deletePending={deleteMutation.isPending}
              bulkDeletePending={bulkDeleteMutation.isPending}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
