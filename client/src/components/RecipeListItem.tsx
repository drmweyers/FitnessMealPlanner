import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import type { Recipe } from "@shared/schema";

interface RecipeListItemProps {
  recipe: Recipe;
  onClick: () => void;
}

export default function RecipeListItem({ recipe, onClick }: RecipeListItemProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const getMealTypeColor = (mealType: string) => {
    const colors = {
      breakfast: "bg-orange-100 text-orange-700",
      lunch: "bg-yellow-100 text-yellow-700", 
      dinner: "bg-primary/10 text-primary",
      snack: "bg-pink-100 text-pink-700",
    };
    return colors[mealType as keyof typeof colors] || "bg-slate-100 text-slate-700";
  };

  const getDietaryTagColor = (tag: string) => {
    const colors = {
      vegetarian: "bg-green-100 text-green-700",
      vegan: "bg-blue-100 text-blue-700",
      keto: "bg-green-100 text-green-700",
      paleo: "bg-orange-100 text-orange-700",
      "gluten-free": "bg-purple-100 text-purple-700",
      "low-carb": "bg-red-100 text-red-700",
      "high-protein": "bg-purple-100 text-purple-700",
    };
    return colors[tag as keyof typeof colors] || "bg-slate-100 text-slate-700";
  };

  const primaryMealType = recipe.mealTypes?.[0] || 'dinner';
  const primaryDietaryTag = recipe.dietaryTags?.[0];

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group mb-4"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Recipe Image */}
          <div className="relative w-24 h-24 bg-gray-100 overflow-hidden rounded-lg flex-shrink-0">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-pulse text-gray-400">
                  <i className="fas fa-image text-lg"></i>
                </div>
              </div>
            )}
            {!imageError ? (
              <img 
                src={recipe.imageUrl ?? '/api/placeholder/96/96'} 
                alt={recipe.name}
                className="w-24 h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <i className="fas fa-utensils text-lg"></i>
                </div>
              </div>
            )}
          </div>

          {/* Recipe Content */}
          <div className="flex-1 min-w-0">
            {/* Meal Type and Tags */}
            <div className="flex items-center space-x-2 mb-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getMealTypeColor(primaryMealType)}`}>
                {primaryMealType.charAt(0).toUpperCase() + primaryMealType.slice(1)}
              </span>
              {primaryDietaryTag && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDietaryTagColor(primaryDietaryTag)}`}>
                  {primaryDietaryTag.charAt(0).toUpperCase() + primaryDietaryTag.slice(1)}
                </span>
              )}
            </div>

            {/* Recipe Name */}
            <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors">
              {recipe.name}
            </h3>

            {/* Time and Calories */}
            <div className="flex items-center space-x-4 text-sm text-slate-600 mb-3">
              <div className="flex items-center space-x-1">
                <i className="fas fa-clock text-slate-400"></i>
                <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} min</span>
              </div>
              <div className="flex items-center space-x-1">
                <i className="fas fa-fire text-slate-400"></i>
                <span>{recipe.caloriesKcal} cal</span>
              </div>
            </div>
          </div>

          {/* Nutrition Information */}
          <div className="flex-shrink-0">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{Number(recipe.proteinGrams).toFixed(0)}g</div>
                <div className="text-slate-500">Protein</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{Number(recipe.carbsGrams).toFixed(0)}g</div>
                <div className="text-slate-500">Carbs</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{Number(recipe.fatGrams).toFixed(0)}g</div>
                <div className="text-slate-500">Fat</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}