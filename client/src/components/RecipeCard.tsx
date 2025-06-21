import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
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
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-pulse text-gray-400">
              <i className="fas fa-image text-2xl"></i>
            </div>
          </div>
        )}
        {!imageError ? (
          <img 
            src={recipe.imageUrl ?? '/api/placeholder/400/250'} 
            alt={recipe.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <i className="fas fa-utensils text-3xl mb-2"></i>
              <p className="text-sm font-medium">{recipe.name}</p>
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        {/* Meal Type - More Prominent */}
        <div className="mb-3">
          <div className={`inline-block text-sm font-semibold px-3 py-2 rounded-lg ${getMealTypeColor(primaryMealType)} shadow-sm`}>
            {primaryMealType.charAt(0).toUpperCase() + primaryMealType.slice(1)}
          </div>
          {primaryDietaryTag && (
            <span className={`ml-2 text-xs font-medium px-2 py-1 rounded-full ${getDietaryTagColor(primaryDietaryTag)}`}>
              {primaryDietaryTag.charAt(0).toUpperCase() + primaryDietaryTag.slice(1)}
            </span>
          )}
        </div>
        
        <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors">
          {recipe.name}
        </h3>
        
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
          <div className="flex items-center space-x-1">
            <i className="fas fa-clock text-slate-400"></i>
            <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <i className="fas fa-fire text-slate-400"></i>
            <span>{recipe.caloriesKcal} cal</span>
          </div>
        </div>
        
        {/* Nutrition Information with Brand Colors */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Nutrition Information</h4>
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{recipe.caloriesKcal}</div>
              <div className="text-xs text-slate-500">Calories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{Number(recipe.proteinGrams).toFixed(0)}g</div>
              <div className="text-xs text-slate-500">Protein</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Number(recipe.carbsGrams).toFixed(0)}g</div>
              <div className="text-xs text-slate-500">Carbs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Number(recipe.fatGrams).toFixed(0)}g</div>
              <div className="text-xs text-slate-500">Fat</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
