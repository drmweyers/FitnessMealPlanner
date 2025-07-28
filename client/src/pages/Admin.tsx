import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/queryClient";
import { isUnauthorizedError } from "../lib/authUtils";
import { createCacheManager } from "../lib/cacheUtils";
import AdminTable from "../components/AdminTable";
import AdminRecipeGrid from "../components/AdminRecipeGrid";
import SearchFilters from "../components/SearchFilters";
import type { Recipe, RecipeFilter } from "../../shared/schema.ts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import MealPlanGenerator from "../components/MealPlanGenerator";
import RecipeGenerationModal from "../components/RecipeGenerationModal";
import CacheDebugger from "../components/CacheDebugger";

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const queryClient = useQueryClient();
  const cacheManager = createCacheManager(queryClient);
  const [filters, setFilters] = useState<RecipeFilter>({
    page: 1,
    limit: 50,
    approved: undefined, // Start with no filter, show management card
  });
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [activeTab, setActiveTab] = useState("admin");
  const [showRecipeGenerationModal, setShowRecipeGenerationModal] = useState(false);

  // Periodic cache refresh to keep data fresh
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const cleanup = cacheManager.startPeriodicRefresh(60000); // Every minute
    return cleanup;
  }, [isAuthenticated, cacheManager]);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    total: number;
    approved: number;
    pending: number;
    avgRating: number;
  }>({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/stats');
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: [`/api/admin/recipes`, filters],
    enabled: isAuthenticated,
  });

  const displayRecipes = (recipesData as any)?.recipes || [];
  const total = (recipesData as any)?.total || 0;
  const isLoading = recipesLoading;

  const handleFilterChange = (newFilters: Partial<RecipeFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/admin/recipes/${id}/approve`);
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Recipe Approved",
        description: "Recipe has been approved and is now visible to users.",
      });
      // Use centralized cache management
      await cacheManager.invalidateRecipes();
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
    onSuccess: async () => {
      toast({
        title: "Recipe Deleted",
        description: "Recipe has been removed from the system.",
      });
      // Use centralized cache management
      await cacheManager.invalidateRecipes();
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
    onSuccess: async (data) => {
      toast({
        title: "Recipes Deleted",
        description: data.message,
      });
      // Use centralized cache management for bulk operations
      await cacheManager.handleBulkOperation('delete', data.removed || data.count || 1);
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

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest('POST', '/api/admin/recipes/bulk-approve', { recipeIds: ids });
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Recipes Approved",
        description: data.message || "Selected recipes have been approved.",
      });
      // Use centralized cache management for bulk operations
      await cacheManager.handleBulkOperation('approve', data.succeeded || data.count || 1);
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
        description: "Failed to approve recipes",
        variant: "destructive",
      });
    },
  });

  const unapproveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/admin/recipes/${id}/unapprove`);
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Recipe Unapproved",
        description: "Recipe has been unapproved and is now pending review.",
      });
      // Use centralized cache management
      await cacheManager.invalidateRecipes();
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
        description: "Failed to unapprove recipe",
        variant: "destructive",
      });
    },
  });

  const bulkUnapproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest('POST', '/api/admin/recipes/bulk-unapprove', { ids });
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Recipes Unapproved",
        description: data.message || "Selected recipes have been unapproved.",
      });
      // Use centralized cache management for bulk operations
      await cacheManager.handleBulkOperation('update', data.succeeded || data.count || 1);
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
        description: "Failed to unapprove recipes",
        variant: "destructive",
      });
    },
  });

  const handleManageAllClick = () => {
    setFilters(prev => ({ ...prev, approved: undefined, page: 1 }));
  };

  const handleViewPendingClick = () => {
    setFilters(prev => ({ ...prev, approved: false, page: 1 }));
  };

  const handleExportClick = () => {
    // This is a placeholder. In a real app, you would trigger a download.
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(displayRecipes));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "recipes.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast({
      title: "Exporting Recipes",
      description: "Your download for recipes.json has started.",
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2 truncate">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Manage recipes, generate new content, and monitor system status.
          </p>
        </div>
        <Button onClick={logout} variant="destructive" className="flex-shrink-0 text-sm sm:text-base">
          <i className="fas fa-sign-out-alt mr-2"></i>
          <span className="hidden sm:inline">Logout</span>
          <span className="sm:hidden">Exit</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6 sm:mb-8">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="recipes" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
            <i className="fas fa-book-open text-sm sm:text-base"></i>
            <span className="hidden sm:inline">Browse Recipes</span>
            <span className="sm:hidden">Recipes</span>
          </TabsTrigger>
          <TabsTrigger value="meal-plan" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
            <i className="fas fa-utensils text-sm sm:text-base"></i>
            <span className="hidden sm:inline">Meal Plan Generator</span>
            <span className="sm:hidden">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
            <i className="fas fa-cog text-sm sm:text-base"></i>
            <span className="hidden sm:inline">Admin</span>
            <span className="sm:hidden">Admin</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes">
          <CacheDebugger />
          
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mt-6 sm:mt-8">
              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Total Recipes</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">{stats.total.toLocaleString()}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-full flex-shrink-0 ml-2">
                      <i className="fas fa-book text-primary text-sm sm:text-lg lg:text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Approved</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.approved.toLocaleString()}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                      <i className="fas fa-check-circle text-green-600 text-sm sm:text-lg lg:text-xl"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Pending Review</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-secondary">{stats.pending.toLocaleString()}</p>
                    </div>
                    <div className="p-2 sm:p-3 bg-amber-100 rounded-full flex-shrink-0 ml-2">
                      <i className="fas fa-clock text-secondary text-sm sm:text-lg lg:text-xl"></i>
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
        </TabsContent>

        <TabsContent value="meal-plan">
          <MealPlanGenerator />
        </TabsContent>

        <TabsContent value="admin">
          {/* Admin Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
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
                  onClick={() => setShowRecipeGenerationModal(true)}
                >
                  <span className="flex items-center justify-center">
                    <i className="fas fa-magic mr-2"></i>
                    Generate New Batch
                  </span>
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
                  onClick={handleViewPendingClick}
                >
                  <span className="flex items-center justify-center">
                    <i className="fas fa-list mr-2"></i>
                    View Pending ({stats?.pending || "0"})
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
                  onClick={handleExportClick}
                  disabled={displayRecipes.length === 0}
                >
                  <span className="flex items-center justify-center">
                    <i className="fas fa-file-download mr-2"></i>
                    Export All Data
                  </span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recipe Database Management Button */}
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
                  onClick={handleManageAllClick}
                  className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
                >
                  <i className="fas fa-database mr-3"></i>
                  Manage All Recipes ({stats?.total || "0"})
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Recipe Management Section - Now outside tabs */}
      <div id="recipe-management-section">

        {/* Quick Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant={filters.approved === undefined ? "default" : "outline"}
              onClick={() => handleFilterChange({ approved: undefined })}
            >
              <i className="fas fa-list-ul mr-2"></i>
              All Recipes
            </Button>
            <Button
              variant={filters.approved === false ? "default" : "outline"}
              onClick={() => handleFilterChange({ approved: false })}
              className="text-yellow-600"
            >
              <i className="fas fa-clock mr-2"></i>
              Pending Approval ({stats?.pending || 0})
            </Button>
            <Button
              variant={filters.approved === true ? "default" : "outline"}
              onClick={() => handleFilterChange({ approved: true })}
              className="text-green-600"
            >
              <i className="fas fa-check mr-2"></i>
              Approved ({stats?.approved || 0})
            </Button>
          </div>

          <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              >
              <i className={`fas fa-${viewMode === 'grid' ? 'table' : 'th'} mr-2`}></i>
                {viewMode === 'grid' ? 'Table View' : 'Grid View'}
              </Button>
            </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <SearchFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* Recipe Display */}
        {viewMode === 'grid' ? (
          <AdminRecipeGrid
            recipes={displayRecipes}
            isLoading={isLoading}
            onDelete={(id) => deleteMutation.mutate(id)}
            onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
            onApprove={(id) => approveMutation.mutate(id)}
            onUnapprove={(id) => unapproveMutation.mutate(id)}
            onBulkApprove={(ids) => bulkApproveMutation.mutate(ids)}
            onBulkUnapprove={(ids) => bulkUnapproveMutation.mutate(ids)}
            deletePending={deleteMutation.isPending}
            bulkDeletePending={bulkDeleteMutation.isPending}
            approvePending={approveMutation.isPending}
            unapprovePending={unapproveMutation.isPending}
            bulkApprovePending={bulkApproveMutation.isPending}
            bulkUnapprovePending={bulkUnapproveMutation.isPending}
          />
        ) : (
          <AdminTable
            recipes={displayRecipes}
            isLoading={isLoading}
            onApprove={(id) => approveMutation.mutate(id)}
            onUnapprove={(id) => unapproveMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
            onBulkApprove={(ids) => bulkApproveMutation.mutate(ids)}
            onBulkUnapprove={(ids) => bulkUnapproveMutation.mutate(ids)}
            approvePending={approveMutation.isPending}
            unapprovePending={unapproveMutation.isPending}
            deletePending={deleteMutation.isPending}
            bulkDeletePending={bulkDeleteMutation.isPending}
            bulkApprovePending={bulkApproveMutation.isPending}
            bulkUnapprovePending={bulkUnapproveMutation.isPending}
          />
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
      </div>

      {/* Recipe Generation Modal */}
      <RecipeGenerationModal
        isOpen={showRecipeGenerationModal}
        onClose={() => setShowRecipeGenerationModal(false)}
      />
    </div>
  );
}
