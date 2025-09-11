import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { apiRequest } from "../lib/queryClient";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import type { Recipe } from "@shared/schema";

interface RecipeDetailModalProps {
  recipeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecipeDetailModal({ recipeId, isOpen, onClose }: RecipeDetailModalProps) {
  console.log('RecipeDetailModal rendered:', { recipeId, isOpen });
  
  const { data: recipe, isLoading } = useQuery<Recipe>({
    queryKey: [`/api/recipes/${recipeId}`],
    queryFn: async () => {
      if (!recipeId) return null;
      const res = await apiRequest('GET', `/api/recipes/${recipeId}`);
      return res.json();
    },
    enabled: !!recipeId && isOpen,
  });


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[60]">
        <DialogHeader>
          <DialogTitle>Recipe Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
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
          <div className="w-full space-y-6">
              {/* Recipe Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">{recipe.name}</h2>
                    {recipe.description && (
                      <p className="text-slate-600">{recipe.description}</p>
                    )}
                  </div>
                  <Badge variant={recipe.isApproved ? "success" : "warning"}>
                    {recipe.isApproved ? "Approved" : "Pending"}
                  </Badge>
                </div>

                <Separator />
              </div>

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
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Prep Time</p>
                  <p className="text-lg font-semibold">{recipe.prepTimeMinutes} mins</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Cook Time</p>
                  <p className="text-lg font-semibold">{recipe.cookTimeMinutes} mins</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Calories</p>
                  <p className="text-lg font-semibold">{recipe.caloriesKcal} kcal</p>
                </div>
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

              {/* Metadata */}
              <div className="text-sm text-slate-500 space-y-1">
                <p>Created: {recipe.creationTimestamp ? new Date(recipe.creationTimestamp).toLocaleDateString() : ''}</p>
                {recipe.lastUpdatedTimestamp && (
                  <p>Last Updated: {recipe.lastUpdatedTimestamp ? new Date(recipe.lastUpdatedTimestamp).toLocaleDateString() : ''}</p>
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