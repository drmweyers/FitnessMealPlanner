import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import type { Recipe } from "@shared/schema";

interface AdminRecipeGridProps {
  recipes: Recipe[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onApprove: (id: string) => void;
  onBulkApprove: (ids: string[]) => void;
  deletePending: boolean;
  bulkDeletePending: boolean;
  approvePending: boolean;
  bulkApprovePending: boolean;
}

export default function AdminRecipeGrid({
  recipes,
  isLoading,
  onDelete,
  onBulkDelete,
  onApprove,
  onBulkApprove,
  deletePending,
  bulkDeletePending,
  approvePending,
  bulkApprovePending
}: AdminRecipeGridProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);

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

  const handleBulkApprove = () => {
    if (selectedIds.length > 0) {
      onBulkApprove(selectedIds);
      setSelectedIds([]);
    }
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
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
        <div className="flex items-center space-x-4">
          <Checkbox
            checked={isAllSelected && recipes.length > 0}
            onCheckedChange={handleSelectAll}
            disabled={recipes.length === 0}
          />
          <span className="text-sm font-medium text-slate-700">
            Select All ({recipes.length} recipes)
          </span>
          {selectedIds.length > 0 && (
            <span className="text-sm text-primary">
              {selectedIds.length} selected
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Status Summary */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
              {recipes.filter(r => r.isApproved).length} Approved
            </span>
            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
              {recipes.filter(r => !r.isApproved).length} Pending
            </span>
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds([])}
                className="text-slate-600 border-slate-300 hover:bg-slate-100"
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleBulkApprove}
                disabled={bulkApprovePending}
                className={`${
                  selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {bulkApprovePending ? (
                  <span className="flex items-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    {selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                      ? 'Unapproving...'
                      : 'Approving...'}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <i className={`fas fa-${
                      selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                        ? 'times'
                        : 'check'
                    } mr-2`}></i>
                    {selectedIds.every(id => recipes.find(r => r.id === id)?.isApproved)
                      ? 'Unapprove Selected'
                      : 'Approve Selected'} ({selectedIds.length})
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeletePending}
                className="bg-red-600 hover:bg-red-700"
              >
                {bulkDeletePending ? (
                  <span className="flex items-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <i className="fas fa-trash mr-2"></i>
                    Delete Selected ({selectedIds.length})
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
              className={`group relative transition-all duration-200 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-primary shadow-lg' : ''
              }`}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-3 left-3 z-10">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectRecipe(recipe.id, checked as boolean)}
                  disabled={deletePending || bulkDeletePending || approvePending || bulkApprovePending}
                  className="bg-white/90 backdrop-blur-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="absolute top-3 right-3 z-10 flex space-x-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(recipe.id);
                  }}
                  disabled={approvePending || isSelected}
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
                  <i className={`fas fa-${recipe.isApproved ? 'times' : 'check'} text-sm`}></i>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(recipe.id);
                  }}
                  disabled={deletePending || isSelected}
                  className="
                    transition-all duration-200
                    shadow-md hover:shadow-lg
                    backdrop-blur-sm
                    bg-red-500 hover:bg-red-600
                    text-white
                  "
                  title="Delete Recipe"
                >
                  <i className="fas fa-trash text-sm"></i>
                </Button>
              </div>

              <CardContent className="p-0">
                {/* Recipe Image */}
                <div className="relative h-48 overflow-hidden rounded-t-lg">
                  <img
                    src={recipe.imageUrl || '/api/placeholder/300/200'}
                    alt={recipe.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Approval Status Badge - Moved to top-left for better visibility */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className={`
                      px-3 py-1.5 
                      text-xs font-semibold rounded-full 
                      shadow-md backdrop-blur-sm
                      ${recipe.isApproved 
                        ? 'bg-green-100/90 text-green-800' 
                        : 'bg-yellow-100/90 text-yellow-800'
                      }
                    `}>
                      {recipe.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  {/* Click to View Hint */}
                  <div className="
                    absolute bottom-0 left-0 right-0
                    bg-gradient-to-t from-black/50 to-transparent
                    text-white text-center
                    py-2 text-sm
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-200
                  ">
                    Click to view details
                  </div>
                </div>

                {/* Recipe Info - Enhanced styling */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {recipe.name}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-2">
                      {recipe.description}
                    </p>
                  </div>

                  {/* Recipe Stats - Enhanced with better icons and layout */}
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center bg-orange-50 px-2 py-1 rounded-full">
                      <i className="fas fa-fire text-orange-500 mr-1.5"></i>
                      {recipe.caloriesKcal} cal
                    </span>
                    <span className="flex items-center bg-blue-50 px-2 py-1 rounded-full">
                      <i className="fas fa-clock text-blue-500 mr-1.5"></i>
                      {recipe.prepTimeMinutes}min
                    </span>
                  </div>

                  {/* Meal Types - Enhanced styling */}
                  <div className="flex flex-wrap gap-2">
                    {recipe.mealTypes?.slice(0, 2).map((type, index) => (
                      <span 
                        key={index}
                        className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
                      >
                        {type}
                      </span>
                    ))}
                    {recipe.mealTypes && recipe.mealTypes.length > 2 && (
                      <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                        +{recipe.mealTypes.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}