import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import type { Recipe } from "@shared/schema";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
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
      className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-full border-0 shadow-sm"
      onClick={onClick}
    >
      <div className="relative w-full h-36 sm:h-40 lg:h-48 bg-gray-100 overflow-hidden">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-pulse text-gray-400">
              <i className="fas fa-image text-lg sm:text-xl lg:text-2xl"></i>
            </div>
          </div>
        )}
        {!imageError ? (
          <img 
            src={recipe.imageUrl ?? '/api/placeholder/400/250'} 
            alt={recipe.name}
            className="w-full h-36 sm:h-40 lg:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        ) : (
          <div className="w-full h-36 sm:h-40 lg:h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500 px-2">
              <i className="fas fa-utensils text-xl sm:text-2xl lg:text-3xl mb-2"></i>
              <p className="text-xs sm:text-sm font-medium line-clamp-2">{recipe.name}</p>
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="p-3 sm:p-4 flex flex-col h-auto">
        {/* Meal Type and Dietary Tags */}
        <div className="mb-2 sm:mb-3 flex flex-wrap gap-1 sm:gap-2">
          <div className={`inline-block text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-2 rounded-lg ${getMealTypeColor(primaryMealType)} shadow-sm`}>
            {primaryMealType.charAt(0).toUpperCase() + primaryMealType.slice(1)}
          </div>
          {primaryDietaryTag && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDietaryTagColor(primaryDietaryTag)}`}>
              {primaryDietaryTag.charAt(0).toUpperCase() + primaryDietaryTag.slice(1)}
            </span>
          )}
        </div>
        
        {/* Recipe Name */}
        <h3 className="font-semibold text-slate-900 mb-2 sm:mb-3 group-hover:text-primary transition-colors text-sm sm:text-base line-clamp-2 leading-tight">
          {recipe.name}
        </h3>
        
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">
          <div className="flex items-center space-x-1">
            <i className="fas fa-clock text-slate-400 text-xs"></i>
            <span className="truncate">{recipe.prepTimeMinutes + recipe.cookTimeMinutes} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <i className="fas fa-fire text-slate-400 text-xs"></i>
            <span className="truncate">{recipe.caloriesKcal} cal</span>
          </div>
        </div>
        
        {/* Nutrition Information */}
        <div className="mt-auto">
          <h4 className="text-xs sm:text-sm font-medium text-slate-700 mb-2">
            Nutrition
          </h4>
          
          {/* Primary Nutrition - Mobile Layout */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm mb-2 sm:mb-3">
            <div className="text-center bg-orange-50 rounded-lg p-2 sm:p-3">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                {recipe.caloriesKcal}
              </div>
              <div className="text-xs text-slate-500">Calories</div>
            </div>
            <div className="text-center bg-red-50 rounded-lg p-2 sm:p-3">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                {Number(recipe.proteinGrams).toFixed(0)}g
              </div>
              <div className="text-xs text-slate-500">Protein</div>
            </div>
          </div>
          
          {/* Secondary Nutrition - Compact */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="text-center bg-blue-50 rounded-lg p-2 sm:p-3">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                {Number(recipe.carbsGrams).toFixed(0)}g
              </div>
              <div className="text-xs text-slate-500">Carbs</div>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-2 sm:p-3">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                {Number(recipe.fatGrams).toFixed(0)}g
              </div>
              <div className="text-xs text-slate-500">Fat</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
