import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Card, CardContent } from "./ui/card";
import type { Recipe } from "../../shared/schema.ts";
import RecipeDetailModal from "./RecipeDetailModal";

interface AdminRecipeGridProps {
  recipes: Recipe[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onApprove: (id: string) => void;
  onUnapprove: (id: string) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkUnapprove: (ids: string[]) => void;
  deletePending: boolean;
  bulkDeletePending: boolean;
  approvePending: boolean;
  unapprovePending: boolean;
  bulkApprovePending: boolean;
  bulkUnapprovePending: boolean;
}

export default function AdminRecipeGrid({
  recipes,
  isLoading,
  onDelete,
  onBulkDelete,
  onApprove,
  onUnapprove,
  onBulkApprove,
  onBulkUnapprove,
  deletePending,
  bulkDeletePending,
  approvePending,
  unapprovePending,
  bulkApprovePending,
  bulkUnapprovePending
}: AdminRecipeGridProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    setIsAllSelected(selectedIds.length > 0 && selectedIds.length === recipes.length);
  }, [selectedIds, recipes]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(recipes.map(recipe => recipe.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRecipe = (recipeId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, recipeId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== recipeId));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length > 0) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBulkApproveOrUnapprove = () => {
    if (selectedIds.length > 0) {
      const selectedRecipes = recipes.filter(r => selectedIds.includes(r.id));
      const allApproved = selectedRecipes.every(r => r.isApproved);
      
      if (allApproved) {
        onBulkUnapprove(selectedIds);
      } else {
        onBulkApprove(selectedIds);
      }
      setSelectedIds([]);
    }
  };

  const handleRecipeClick = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <div className="h-48 bg-slate-200 rounded-t-lg"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-utensils text-4xl text-slate-300 mb-4"></i>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No recipes found</h3>
        <p className="text-slate-600">No recipes match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bulk Actions Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-lg border gap-4 sm:gap-0">
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <Checkbox
            checked={isAllSelected && recipes.length > 0}
            onCheckedChange={handleSelectAll}
            disabled={recipes.length === 0}
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
              {recipes.length} recipes
            </span>
            {selectedIds.length > 0 && (
              <span className="text-sm text-primary whitespace-nowrap">
                {selectedIds.length} selected
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          {/* Status Summary */}
          <div className="flex flex-wrap gap-2 text-sm w-full sm:w-auto">
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium whitespace-nowrap">
              {recipes.filter(r => r.isApproved).length} Approved
            </span>
            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium whitespace-nowrap">
              {recipes.filter(r => !r.isApproved).length} Pending
            </span>
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds([])}
                className="text-slate-600 border-slate-300 hover:bg-slate-100 w-full sm:w-auto"
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleBulkApproveOrUnapprove}
                disabled={bulkApprovePending || bulkUnapprovePending}
                className={`w-full sm:w-auto ${
                  selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {bulkApprovePending || bulkUnapprovePending ? (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    <span className="hidden sm:inline">
                      {selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                        ? 'Unapproving...'
                        : 'Approving...'}
                    </span>
                    <span className="sm:hidden">
                      {selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                        ? 'Unapprove'
                        : 'Approve'}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <i className={`fas fa-${
                      selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                        ? 'times'
                        : 'check'
                    } mr-2`}></i>
                    <span className="hidden sm:inline">
                      {selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                        ? 'Unapprove Selected'
                        : 'Approve Selected'} ({selectedIds.length})
                    </span>
                    <span className="sm:hidden">
                      {selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                        ? 'Unapprove'
                        : 'Approve'} ({selectedIds.length})
                    </span>
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeletePending}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {bulkDeletePending ? (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    <span className="hidden sm:inline">Deleting...</span>
                    <span className="sm:hidden">Delete</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <i className="fas fa-trash-alt mr-2"></i>
                    <span className="hidden sm:inline">Delete Selected ({selectedIds.length})</span>
                    <span className="sm:hidden">Delete ({selectedIds.length})</span>
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recipes.map((recipe) => {
          const isSelected = selectedIds.includes(recipe.id);
          
          return (
            <Card 
              key={recipe.id} 
              className={`group relative transition-all duration-200 hover:shadow-lg cursor-pointer ${
                isSelected ? 'ring-2 ring-primary shadow-lg' : ''
              }`}
              onClick={() => handleRecipeClick(recipe.id)}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-3 left-3 z-10" onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectRecipe(recipe.id, checked as boolean)}
                  disabled={deletePending || bulkDeletePending || approvePending || unapprovePending || bulkApprovePending || bulkUnapprovePending}
                  className="bg-white/90 backdrop-blur-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="absolute top-3 right-3 z-10 flex space-x-2" onClick={e => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    recipe.isApproved ? onUnapprove(recipe.id) : onApprove(recipe.id);
                  }}
                  disabled={approvePending || unapprovePending || isSelected}
                  className={`
                    transition-all duration-200
                    shadow-md hover:shadow-lg
                    backdrop-blur-sm
                    ${recipe.isApproved 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                    }
                  `}
                  title={recipe.isApproved ? "Unapprove Recipe" : "Approve Recipe"}
                >
                  {approvePending || unapprovePending ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className={`fas fa-${recipe.isApproved ? 'times' : 'check'}`}></i>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(recipe.id);
                  }}
                  disabled={deletePending || isSelected}
                  className="shadow-md hover:shadow-lg backdrop-blur-sm"
                  title="Delete Recipe"
                >
                  {deletePending ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-trash"></i>
                  )}
                </Button>
              </div>

              <CardContent className="p-0">
                {/* Recipe Image */}
                <div className="relative h-48 bg-slate-100 rounded-t-lg overflow-hidden">
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <i className="fas fa-image text-4xl"></i>
                    </div>
                  )}
                </div>

                {/* Recipe Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                    {recipe.name}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                    {recipe.description}
                  </p>
                  
                  {/* Recipe Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-slate-600">
                      <i className="fas fa-clock mr-1"></i>
                      {recipe.prepTimeMinutes} mins
                    </div>
                    <div className="flex items-center text-slate-600">
                      <i className="fas fa-fire mr-1"></i>
                      {recipe.caloriesKcal} kcal
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipeId={selectedRecipeId}
        isOpen={!!selectedRecipeId}
        onClose={() => setSelectedRecipeId(null)}
      />
    </div>
  );
}