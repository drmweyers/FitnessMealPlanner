import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Check, X, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from "../components/ui/pagination";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import SearchFilters from "../components/SearchFilters";
import RecipeCard from "../components/RecipeCard";
import RecipeTable from "../components/RecipeTable";
import ViewToggle, { ViewType } from "../components/ViewToggle";
import RecipeModal from "../components/RecipeModal";
import RecipeGenerationModal from "../components/RecipeGenerationModal";
import PendingRecipesTable from "../components/PendingRecipesTable";
import MealPlanGenerator from "../components/MealPlanGenerator";
import BulkDeleteToolbar from "../components/BulkDeleteToolbar";
import ExportJSONModal from "../components/ExportJSONModal";
import BMADRecipeGenerator from "../components/BMADRecipeGenerator";
import type { Recipe, RecipeFilter } from "@shared/schema";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('recipes');
  
  // Initialize view type from localStorage
  const [viewType, setViewType] = useState<ViewType>(() => {
    const savedViewType = localStorage.getItem('admin-recipe-view-type') as ViewType;
    return savedViewType === 'table' ? 'table' : 'cards';
  });
  
  const [filters, setFilters] = useState<RecipeFilter>({ 
    page: 1, 
    limit: viewType === 'table' ? 20 : 12, // More items for table view
    approved: true 
  });
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeGenerationModal, setShowRecipeGenerationModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Bulk selection state
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // Fetch recipes with current filters using admin endpoint
  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ["admin-recipes", filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      if (filters.search) searchParams.append('search', filters.search);
      if (filters.mealType) searchParams.append('mealType', filters.mealType);
      if (filters.dietaryTag) searchParams.append('dietaryTag', filters.dietaryTag);
      if (filters.maxPrepTime) searchParams.append('maxPrepTime', filters.maxPrepTime.toString());
      if (filters.approved !== undefined) searchParams.append('approved', filters.approved.toString());
      
      searchParams.append('page', filters.page.toString());
      searchParams.append('limit', filters.limit.toString());

      const response = await fetch(`/api/admin/recipes?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch admin recipes');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch admin statistics
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (recipeIds: string[]) => {
      const response = await fetch('/api/admin/recipes', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ recipeIds }),
      });
      if (!response.ok) {
        throw new Error('Failed to delete recipes');
      }
      return response.json();
    },
    onSuccess: (data, recipeIds) => {
      // Invalidate and refetch admin recipes and stats
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      
      // Clear selections and exit selection mode
      setSelectedRecipeIds(new Set<string>());
      setIsSelectionMode(false);
      
      toast({
        title: "Recipes deleted",
        description: `Successfully deleted ${recipeIds.length} recipe${recipeIds.length === 1 ? '' : 's'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting recipes",
        description: error instanceof Error ? error.message : "Failed to delete recipes",
        variant: "destructive",
      });
    },
  });

  const displayRecipes = (recipesData as any)?.recipes || [];
  const total = (recipesData as any)?.total || 0;
  
  // Calculate pagination values
  const currentPage = filters.page;
  const totalPages = Math.ceil(total / filters.limit);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Debug pagination values
  console.log('Admin Pagination Debug:', {
    displayRecipes: displayRecipes.length,
    total,
    currentPage,
    limit: filters.limit,
    totalPages,
    hasNextPage,
    hasPrevPage,
    shouldShowPagination: totalPages > 1
  });

  const handleFilterChange = (newFilters: Partial<RecipeFilter>) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleViewTypeChange = (newViewType: ViewType) => {
    setViewType(newViewType);
    // Adjust limit based on view type and reset to first page
    const newLimit = newViewType === 'table' ? 20 : 12;
    setFilters({ ...filters, limit: newLimit, page: 1 });
  };

  const handleViewPendingClick = () => {
    setShowPendingModal(true);
  };

  // Selection handlers
  const handleRecipeSelection = (recipeId: string, selected: boolean) => {
    const newSelection = new Set(selectedRecipeIds);
    if (selected) {
      newSelection.add(recipeId);
    } else {
      newSelection.delete(recipeId);
    }
    setSelectedRecipeIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedRecipeIds.size === displayRecipes.length) {
      // Deselect all
      setSelectedRecipeIds(new Set<string>());
    } else {
      // Select all current page recipes
      const allIds = new Set<string>(displayRecipes.map((recipe: Recipe) => recipe.id));
      setSelectedRecipeIds(allIds);
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Clear selections when exiting selection mode
      setSelectedRecipeIds(new Set<string>());
    }
  };

  const handleBulkDelete = () => {
    if (selectedRecipeIds.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedRecipeIds));
    }
  };

  const handleIndividualDelete = (recipeId: string) => {
    // Use bulk delete with single recipe for consistency
    bulkDeleteMutation.mutate([recipeId]);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You must be logged in as an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-base sm:text-lg text-slate-600 mt-2">
            Manage recipes, users, and meal plan generation
          </p>
        </div>
        <Link href="/admin/analytics">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </Button>
        </Link>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-y-8">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-4">
          <TabsTrigger value="recipes" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm" data-testid="admin-tab-recipes">
            <i className="fas fa-utensils text-sm sm:text-base"></i>
            <span className="hidden sm:inline">Recipes</span>
            <span className="sm:hidden">Recipes</span>
          </TabsTrigger>
          <TabsTrigger value="meal-plans" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm" data-testid="admin-tab-meal-plans">
            <i className="fas fa-utensils text-sm sm:text-base"></i>
            <span className="hidden sm:inline">Meal Plan Generator</span>
            <span className="sm:hidden">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="bmad" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm" data-testid="admin-tab-bmad">
            <i className="fas fa-robot text-sm sm:text-base"></i>
            <span className="hidden sm:inline">BMAD Generator</span>
            <span className="sm:hidden">BMAD</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm" data-testid="admin-tab-admin">
            <i className="fas fa-cog text-sm sm:text-base"></i>
            <span className="hidden sm:inline">Admin</span>
            <span className="sm:hidden">Admin</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recipes">
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <SearchFilters filters={filters} onFilterChange={handleFilterChange} />
                  </div>
                  <div className="flex items-center gap-2">
                    <ViewToggle 
                      viewType={viewType} 
                      onViewTypeChange={handleViewTypeChange}
                    />
                    <Button
                      variant={isSelectionMode ? "default" : "outline"}
                      onClick={handleToggleSelectionMode}
                      className="flex-shrink-0"
                    >
                      {isSelectionMode ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Exit Selection
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Select Mode
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Bulk Delete Toolbar */}
              {isSelectionMode && (
                <BulkDeleteToolbar
                  selectedCount={selectedRecipeIds.size}
                  totalCount={displayRecipes.length}
                  isAllSelected={selectedRecipeIds.size === displayRecipes.length && displayRecipes.length > 0}
                  onSelectAll={handleSelectAll}
                  onClearSelection={() => setSelectedRecipeIds(new Set<string>())}
                  onBulkDelete={handleBulkDelete}
                  isDeleting={bulkDeleteMutation.isPending}
                />
              )}
            </div>
            
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
                      <div className="p-2 sm:p-3 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                        <i className="fas fa-utensils text-blue-600 text-sm sm:text-lg lg:text-xl"></i>
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
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-yellow-100 rounded-full flex-shrink-0 ml-2">
                        <i className="fas fa-clock text-yellow-600 text-sm sm:text-lg lg:text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3 sm:p-4 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">Users</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{stats.users?.toLocaleString() || 0}</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0 ml-2">
                        <i className="fas fa-users text-purple-600 text-sm sm:text-lg lg:text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recipes Display - Cards or Table */}
            <div className="space-y-4 sm:space-y-6">
              {viewType === 'cards' ? (
                // Card Grid View
                <>
                  {recipesLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : displayRecipes.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 sm:p-12 text-center">
                        <i className="fas fa-utensils text-4xl text-gray-400 mb-4"></i>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
                        <p className="text-gray-600">Try adjusting your search filters or generate some recipes.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {displayRecipes.map((recipe: Recipe) => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          onClick={() => setSelectedRecipe(recipe)}
                          showCheckbox={isSelectionMode}
                          isSelected={selectedRecipeIds.has(recipe.id)}
                          onSelectionChange={handleRecipeSelection}
                          showFavoriteButton={true}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // Table View
                <RecipeTable
                  recipes={displayRecipes}
                  isLoading={recipesLoading}
                  showCheckbox={isSelectionMode}
                  selectedRecipeIds={selectedRecipeIds}
                  onRecipeClick={(recipe) => setSelectedRecipe(recipe)}
                  onSelectionChange={handleRecipeSelection}
                  onDelete={handleIndividualDelete}
                />
              )}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                  <div className="text-sm text-slate-600">
                    Showing {displayRecipes.length} of {total} recipes (Page {currentPage} of {totalPages})
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => hasPrevPage && handlePageChange(currentPage - 1)}
                          className={hasPrevPage ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                        />
                      </PaginationItem>
                      
                      {/* Generate page numbers */}
                      {(() => {
                        const pages = [];
                        const showPages = 5; // Show 5 page numbers max
                        let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                        let endPage = Math.min(totalPages, startPage + showPages - 1);
                        
                        // Adjust start if we're near the end
                        if (endPage - startPage + 1 < showPages) {
                          startPage = Math.max(1, endPage - showPages + 1);
                        }
                        
                        // Add first page and ellipsis if needed
                        if (startPage > 1) {
                          pages.push(
                            <PaginationItem key={1}>
                              <PaginationLink 
                                onClick={() => handlePageChange(1)}
                                isActive={currentPage === 1}
                                className="cursor-pointer"
                              >
                                1
                              </PaginationLink>
                            </PaginationItem>
                          );
                          if (startPage > 2) {
                            pages.push(
                              <PaginationItem key="ellipsis-start">
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                        }
                        
                        // Add page numbers
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <PaginationItem key={i}>
                              <PaginationLink 
                                onClick={() => handlePageChange(i)}
                                isActive={currentPage === i}
                                className="cursor-pointer"
                              >
                                {i}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        
                        // Add ellipsis and last page if needed
                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pages.push(
                              <PaginationItem key="ellipsis-end">
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          pages.push(
                            <PaginationItem key={totalPages}>
                              <PaginationLink 
                                onClick={() => handlePageChange(totalPages)}
                                isActive={currentPage === totalPages}
                                className="cursor-pointer"
                              >
                                {totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        
                        return pages;
                      })()}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => hasNextPage && handlePageChange(currentPage + 1)}
                          className={hasNextPage ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="meal-plans">
          <MealPlanGenerator />
        </TabsContent>

        <TabsContent value="bmad">
          <BMADRecipeGenerator />
        </TabsContent>

        <TabsContent value="admin">
          {/* Admin Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <i className="fas fa-plus-circle text-primary text-lg sm:text-xl"></i>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Generate Recipes</h3>
                </div>
                <p className="text-sm sm:text-base text-slate-600 mb-4">Create new recipes using AI integration</p>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90" 
                  onClick={() => setShowRecipeGenerationModal(true)}
                  data-testid="admin-generate-recipes"
                >
                  <span className="flex items-center justify-center">
                    <i className="fas fa-magic mr-2"></i>
                    Generate New Batch
                  </span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-secondary/10 rounded-lg flex-shrink-0">
                    <i className="fas fa-eye text-secondary text-lg sm:text-xl"></i>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Review Queue</h3>
                </div>
                <p className="text-sm sm:text-base text-slate-600 mb-4">Review and approve pending recipes</p>
                <Button 
                  variant="outline" 
                  className="w-full border-secondary text-secondary hover:bg-secondary hover:text-white"
                  onClick={handleViewPendingClick}
                  data-testid="admin-view-pending"
                >
                  <span className="flex items-center justify-center">
                    <i className="fas fa-list mr-2"></i>
                    View Pending ({stats?.pending || "0"})
                  </span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <i className="fas fa-download text-green-600 text-lg sm:text-xl"></i>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Export JSON</h3>
                </div>
                <p className="text-sm sm:text-base text-slate-600 mb-4">Export data as JSON files for backup or analysis</p>
                <Button 
                  variant="outline" 
                  className="w-full border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                  onClick={() => setShowExportModal(true)}
                  data-testid="admin-export-data"
                >
                  <span className="flex items-center justify-center">
                    <i className="fas fa-database mr-2"></i>
                    Export Data
                  </span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          showDeleteButton={true}
          onDelete={() => {
            // Refresh data after individual delete
            queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
            queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          }}
        />
      )}

      {/* Recipe Generation Modal */}
      {showRecipeGenerationModal && (
        <RecipeGenerationModal
          isOpen={showRecipeGenerationModal}
          onClose={() => setShowRecipeGenerationModal(false)}
        />
      )}

      {/* Pending Recipes Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-hidden w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Pending Recipes</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPendingModal(false)}
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <PendingRecipesTable />
            </div>
          </div>
        </div>
      )}

      {/* Export JSON Modal */}
      <ExportJSONModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}