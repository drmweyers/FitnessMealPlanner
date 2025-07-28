import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import type { Recipe } from "@shared/schema";
import RecipeDetailModal from "./RecipeDetailModal";

interface AdminTableProps {
  recipes: Recipe[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  onUnapprove: (id: string) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkUnapprove: (ids: string[]) => void;
  approvePending: boolean;
  unapprovePending: boolean;
  deletePending: boolean;
  bulkDeletePending: boolean;
  bulkApprovePending: boolean;
  bulkUnapprovePending: boolean;
}

export default function AdminTable({ 
  recipes, 
  isLoading, 
  onApprove,
  onUnapprove, 
  onDelete, 
  onBulkDelete,
  onBulkApprove,
  onBulkUnapprove,
  approvePending,
  unapprovePending, 
  deletePending,
  bulkDeletePending,
  bulkApprovePending,
  bulkUnapprovePending
}: AdminTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    const allRecipeIds = recipes.map(recipe => recipe.id);
    setIsAllSelected(selectedIds.length > 0 && selectedIds.length === allRecipeIds.length);
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

  const handleRecipeClick = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
  };

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
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No recipes found</h3>
        <p className="text-sm sm:text-base text-slate-600">No recipes match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-lg border gap-3 sm:gap-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <span className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">
              {selectedIds.length} recipe{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds([])}
              className="text-slate-600 border-slate-300 hover:bg-slate-100 text-xs sm:text-sm py-2 sm:py-1"
            >
              Clear Selection
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const selectedRecipes = recipes.filter(r => selectedIds.includes(r.id));
                const allApproved = selectedRecipes.every(r => r.isApproved);
                if (allApproved) {
                  onBulkUnapprove(selectedIds);
                } else {
                  onBulkApprove(selectedIds);
                }
                setSelectedIds([]);
              }}
              disabled={bulkApprovePending || bulkUnapprovePending}
              className={`text-xs sm:text-sm py-2 sm:py-1 ${
                recipes.filter(r => selectedIds.includes(r.id)).every(r => r.isApproved)
                  ? 'text-yellow-600 border-yellow-200 hover:bg-yellow-50'
                  : 'text-green-600 border-green-200 hover:bg-green-50'
              }`}
            >
              {bulkApprovePending || bulkUnapprovePending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  <span className="hidden sm:inline">
                    {recipes.filter(r => selectedIds.includes(r.id)).every(r => r.isApproved)
                      ? 'Unapproving...'
                      : 'Approving...'}
                  </span>
                  <span className="sm:hidden">Processing...</span>
                </>
              ) : (
                <>
                  <i className={`fas fa-${recipes.filter(r => selectedIds.includes(r.id)).every(r => r.isApproved) ? 'times' : 'check'} mr-2`}></i>
                  <span className="hidden sm:inline">
                    {recipes.filter(r => selectedIds.includes(r.id)).every(r => r.isApproved)
                      ? 'Unapprove Selected'
                      : 'Approve Selected'}
                  </span>
                  <span className="sm:hidden">
                    {recipes.filter(r => selectedIds.includes(r.id)).every(r => r.isApproved)
                      ? 'Unapprove'
                      : 'Approve'}
                  </span>
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeletePending}
              className="bg-red-600 hover:bg-red-700 text-xs sm:text-sm py-2 sm:py-1"
            >
              {bulkDeletePending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  <span className="hidden sm:inline">Deleting...</span>
                  <span className="sm:hidden">Deleting...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-trash-alt mr-2"></i>
                  <span className="hidden sm:inline">Delete Selected</span>
                  <span className="sm:hidden">Delete</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {recipes.map((recipe) => (
          <Card 
            key={recipe.id} 
            className="shadow-sm border-0 ring-1 ring-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => handleRecipeClick(recipe.id)}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start space-x-3">
                {/* Checkbox */}
                <div className="pt-1" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(recipe.id)}
                    onCheckedChange={(checked) => handleSelectRecipe(recipe.id, checked as boolean)}
                    disabled={deletePending || bulkDeletePending}
                  />
                </div>

                {/* Recipe Image */}
                <img 
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg object-cover flex-shrink-0" 
                  src={recipe.imageUrl || '/api/placeholder/100/100'} 
                  alt={recipe.name}
                />

                {/* Recipe Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm sm:text-base font-medium text-slate-900 line-clamp-2 pr-2">
                      {recipe.name}
                    </h3>
                    <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full flex-shrink-0 ${
                      recipe.isApproved 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {recipe.isApproved ? 'Approved' : 'Pending'}
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
                  <div className="flex flex-col sm:flex-row gap-2" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        recipe.isApproved ? onUnapprove(recipe.id) : onApprove(recipe.id);
                      }}
                      disabled={approvePending || unapprovePending || selectedIds.includes(recipe.id)}
                      className={`text-xs ${
                        recipe.isApproved 
                          ? 'text-yellow-600 border-yellow-200 hover:bg-yellow-50'
                          : 'text-green-600 border-green-200 hover:bg-green-50'
                      }`}
                    >
                      <i className={`fas fa-${recipe.isApproved ? 'times' : 'check'} mr-1`}></i>
                      {recipe.isApproved ? 'Unapprove' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(recipe.id);
                      }}
                      disabled={deletePending || selectedIds.includes(recipe.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                    >
                      <i className="fas fa-times mr-1"></i>
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={isAllSelected && recipes.length > 0}
                    onCheckedChange={handleSelectAll}
                    disabled={recipes.length === 0}
                  />
                  <span>Select</span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Recipe
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Nutrition
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {recipes.map((recipe) => (
              <tr 
                key={recipe.id} 
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleRecipeClick(recipe.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(recipe.id)}
                    onCheckedChange={(checked) => handleSelectRecipe(recipe.id, checked as boolean)}
                    disabled={deletePending || bulkDeletePending}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img 
                      className="h-12 w-12 rounded-lg object-cover mr-4" 
                      src={recipe.imageUrl || '/api/placeholder/100/100'} 
                      alt={recipe.name}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{recipe.name}</div>
                      <div className="text-sm text-slate-500">
                        {recipe.description?.slice(0, 50)}
                        {recipe.description && recipe.description.length > 50 ? '...' : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    recipe.isApproved 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {recipe.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary">
                    {(recipe.mealTypes && recipe.mealTypes.length > 0) ? recipe.mealTypes[0] : 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  <div className="flex space-x-4">
                    <span>{recipe.caloriesKcal} cal</span>
                    <span>{Number(recipe.proteinGrams).toFixed(0)}g protein</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {recipe.creationTimestamp 
                    ? new Date(recipe.creationTimestamp).toLocaleDateString()
                    : 'N/A'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={e => e.stopPropagation()}>
                  <div className="flex space-x-2 min-w-[180px]">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        recipe.isApproved ? onUnapprove(recipe.id) : onApprove(recipe.id);
                      }}
                      disabled={approvePending || unapprovePending || selectedIds.includes(recipe.id)}
                      className={`${
                        recipe.isApproved 
                          ? 'text-yellow-600 border-yellow-200 hover:bg-yellow-50'
                          : 'text-green-600 border-green-200 hover:bg-green-50'
                      }`}
                    >
                      <i className={`fas fa-${recipe.isApproved ? 'times' : 'check'} mr-1`}></i>
                      {recipe.isApproved ? 'Unapprove' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(recipe.id);
                      }}
                      disabled={deletePending || selectedIds.includes(recipe.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <i className="fas fa-times mr-1"></i>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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