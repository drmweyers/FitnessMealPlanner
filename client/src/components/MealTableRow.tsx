import React, { memo, useCallback, useMemo } from 'react';
import { Badge } from './ui/badge';
import type { Recipe } from '@shared/schema';

interface MealTableRowProps {
  recipe: Recipe;
  mealType: string;
  onRecipeClick: (recipe: Recipe) => void;
  formatMealType: (mealType: string) => string;
  getMealTypeColor: (mealType: string) => string;
  getMealTypeIcon: (mealType: string) => string;
}

function MealTableRow({ 
  recipe, 
  mealType, 
  onRecipeClick, 
  formatMealType, 
  getMealTypeColor, 
  getMealTypeIcon 
}: MealTableRowProps) {
  
  // Memoize click handler to prevent recreation
  const handleClick = useCallback(() => {
    onRecipeClick(recipe);
  }, [onRecipeClick, recipe]);

  // Memoize expensive calculations
  const totalTime = useMemo(() => {
    return recipe.prepTimeMinutes + (recipe.cookTimeMinutes || 0);
  }, [recipe.prepTimeMinutes, recipe.cookTimeMinutes]);

  const proteinAmount = useMemo(() => {
    return Number(recipe.proteinGrams).toFixed(0);
  }, [recipe.proteinGrams]);

  const mealTypeStyle = useMemo(() => {
    return getMealTypeColor(mealType);
  }, [getMealTypeColor, mealType]);

  const mealTypeIcon = useMemo(() => {
    return getMealTypeIcon(mealType);
  }, [getMealTypeIcon, mealType]);

  const formattedMealType = useMemo(() => {
    return formatMealType(mealType);
  }, [formatMealType, mealType]);

  // Handle image error with fallback
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    img.src = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60&h=60&fit=crop`;
  }, []);

  return (
    <tr
      className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <td className="py-4 px-4">
        <div className="flex items-center space-x-3">
          <img
            src={recipe.imageUrl || "/api/placeholder/60/60"}
            alt={recipe.name}
            className="w-12 h-12 rounded-lg object-cover"
            onError={handleImageError}
          />
          <div>
            <div className="font-medium text-gray-900">
              {recipe.name}
            </div>
            <div className="text-sm text-gray-500 line-clamp-1">
              {recipe.description || "Delicious and nutritious meal"}
            </div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${mealTypeStyle}`}
        >
          {mealTypeIcon} {formattedMealType}
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="text-sm text-gray-900">
          {recipe.caloriesKcal} cal
        </div>
        <div className="text-xs text-gray-500">
          {proteinAmount}g protein
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="text-sm text-gray-900">
          {totalTime} min
        </div>
        <div className="text-xs text-gray-500">
          prep + cook
        </div>
      </td>
    </tr>
  );
}

// Memoize the component with custom comparison
export default memo(MealTableRow, (prevProps, nextProps) => {
  return (
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.mealType === nextProps.mealType &&
    prevProps.onRecipeClick === nextProps.onRecipeClick &&
    prevProps.formatMealType === nextProps.formatMealType &&
    prevProps.getMealTypeColor === nextProps.getMealTypeColor &&
    prevProps.getMealTypeIcon === nextProps.getMealTypeIcon
  );
});