import React, { memo, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { apiRequest } from "../lib/queryClient";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "../contexts/AuthContext";
import type { Recipe } from "@shared/schema";

interface RecipeDetailModalProps {
  recipeId?: string | null;
  recipe?: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

function RecipeDetailModal({ recipeId, recipe: passedRecipe, isOpen, onClose }: RecipeDetailModalProps) {
  const { user } = useAuth();
  
  // Memoize the endpoint calculation to prevent unnecessary re-calculations
  const recipeEndpoint = useMemo(() => {
    if (!recipeId) return null;
    if (user?.role === 'admin') {
      return `/api/admin/recipes/${recipeId}`;
    }
    return `/api/recipes/${recipeId}`;
  }, [recipeId, user?.role]);

  const { data: fetchedRecipe, isLoading } = useQuery<Recipe>({
    queryKey: [`recipe-detail-${recipeId}-${user?.role}`],
    queryFn: async () => {
      if (!recipeEndpoint) return null;
      const res = await apiRequest('GET', recipeEndpoint);
      return res.json();
    },
    enabled: !!recipeId && !passedRecipe && isOpen && !!recipeEndpoint,
  });

  // Use passed recipe if available, otherwise use fetched recipe
  const recipe = passedRecipe || fetchedRecipe;

  // Memoize formatted dates to avoid recreation on every render
  const formattedDates = useMemo(() => {
    if (!recipe) return { created: '', lastUpdated: '' };
    return {
      created: recipe.creationTimestamp ? new Date(recipe.creationTimestamp).toLocaleDateString() : '',
      lastUpdated: recipe.lastUpdatedTimestamp ? new Date(recipe.lastUpdatedTimestamp).toLocaleDateString() : ''
    };
  }, [recipe?.creationTimestamp, recipe?.lastUpdatedTimestamp]);

  // Memoize total cooking time calculation
  const totalCookTime = useMemo(() => {
    if (!recipe) return 0;
    return recipe.prepTimeMinutes + (recipe.cookTimeMinutes || 0);
  }, [recipe?.prepTimeMinutes, recipe?.cookTimeMinutes]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recipe Details</DialogTitle>
        </DialogHeader>

        {isLoading && !passedRecipe ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ) : recipe ? (
          <div className="space-y-6">
            {/* Recipe Title and Status */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">{recipe.name}</h2>
              <Badge variant={recipe.isApproved ? "success" : "warning"}>
                {recipe.isApproved ? "Approved" : "Pending"}
              </Badge>
            </div>

            {/* Recipe Description */}
            <p className="text-slate-600">{recipe.description}</p>

            {/* Recipe Image */}
            {recipe.imageUrl && (
              <div className="relative h-64 rounded-lg overflow-hidden">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Recipe Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Preparation Time */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Prep Time</p>
                <p className="text-lg font-semibold">{recipe.prepTimeMinutes} mins</p>
              </div>

              {/* Cook Time */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Cook Time</p>
                <p className="text-lg font-semibold">{recipe.cookTimeMinutes} mins</p>
              </div>

              {/* Calories */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Calories</p>
                <p className="text-lg font-semibold">{recipe.caloriesKcal} kcal</p>
              </div>

              {/* Servings */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Servings</p>
                <p className="text-lg font-semibold">{recipe.servings}</p>
              </div>
            </div>

            {/* Macronutrients */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Protein</p>
                <p className="text-lg font-semibold">{recipe.proteinGrams}g</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Carbs</p>
                <p className="text-lg font-semibold">{recipe.carbsGrams}g</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600">Fat</p>
                <p className="text-lg font-semibold">{recipe.fatGrams}g</p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {recipe.mealTypes?.map((type) => (
                  <Badge key={type} variant="outline" className="bg-purple-50">{type}</Badge>
                ))}
                {recipe.dietaryTags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="bg-green-50">{tag}</Badge>
                ))}
                {recipe.mainIngredientTags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="bg-blue-50">{tag}</Badge>
                ))}
              </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Ingredients</h3>
              <ul className="list-disc list-inside space-y-1">
                {recipe.ingredientsJson?.map((ingredient, index) => (
                  <li key={index} className="text-slate-600">
                    {ingredient.amount} {ingredient.unit} {ingredient.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Instructions</h3>
              <div className="text-slate-600 whitespace-pre-wrap">
                {recipe.instructionsText}
              </div>
            </div>

            {/* Source Reference */}
            {/* {recipe.sourceReference && (
              <div className="text-sm text-slate-500">
                <p>Source: {recipe.sourceReference}</p>
              </div>
            )} */}

            {/* Metadata */}
            <div className="text-sm text-slate-500 space-y-1">
                <p>Created: {formattedDates.created}</p>
              {formattedDates.lastUpdated && (
                <p>Last Updated: {formattedDates.lastUpdated}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            Recipe not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(RecipeDetailModal, (prevProps, nextProps) => {
  return (
    prevProps.recipeId === nextProps.recipeId &&
    prevProps.recipe?.id === nextProps.recipe?.id &&
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.onClose === nextProps.onClose
  );
}); 