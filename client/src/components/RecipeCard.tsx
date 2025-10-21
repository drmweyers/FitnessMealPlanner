import React, { memo, useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import type { Recipe } from "@shared/schema";
import FavoriteButton from "./favorites/FavoriteButton";
import { useRecipeViewTracking } from "../hooks/useEngagement";
import { Eye, Clock, Star, Heart } from "lucide-react";
import { cn } from "../lib/utils";
import StarRating from "./ratings/StarRating";
import { RatingDisplay } from "./ratings";

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (recipeId: string, selected: boolean) => void;
  showFavoriteButton?: boolean;
  showEngagementStats?: boolean;
  engagementData?: {
    viewCount?: number;
    favoriteCount?: number;
    avgRating?: number;
    totalRatings?: number;
    isRecommended?: boolean;
    recommendationReason?: string;
    recentReview?: {
      rating: number;
      comment: string;
      authorName: string;
      createdAt: string;
    };
  };
  allowRating?: boolean;
  onRateRecipe?: (recipeId: string, rating: number) => void;
  className?: string;
}

// Memoized color mapping functions outside component to avoid recreation
const MEAL_TYPE_COLORS = {
  breakfast: "bg-orange-100 text-orange-700",
  lunch: "bg-yellow-100 text-yellow-700", 
  dinner: "bg-primary/10 text-primary",
  snack: "bg-pink-100 text-pink-700",
} as const;

const DIETARY_TAG_COLORS = {
  vegetarian: "bg-green-100 text-green-700",
  vegan: "bg-blue-100 text-blue-700",
  keto: "bg-green-100 text-green-700",
  paleo: "bg-orange-100 text-orange-700",
  "gluten-free": "bg-purple-100 text-purple-700",
  "low-carb": "bg-red-100 text-red-700",
  "high-protein": "bg-purple-100 text-purple-700",
} as const;

const getMealTypeColor = (mealType: string) => {
  return MEAL_TYPE_COLORS[mealType as keyof typeof MEAL_TYPE_COLORS] || "bg-slate-100 text-slate-700";
};

const getDietaryTagColor = (tag: string) => {
  return DIETARY_TAG_COLORS[tag as keyof typeof DIETARY_TAG_COLORS] || "bg-slate-100 text-slate-700";
};

function RecipeCard({ 
  recipe, 
  onClick, 
  showCheckbox = false, 
  isSelected = false, 
  onSelectionChange,
  showFavoriteButton = true,
  showEngagementStats = false,
  engagementData,
  allowRating = false,
  onRateRecipe,
  className,
}: RecipeCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const { trackView } = useRecipeViewTracking();

  // Memoized callbacks to prevent unnecessary re-renders
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  const handleCheckboxChange = useCallback((checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(recipe.id, checked);
    }
  }, [recipe.id, onSelectionChange]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger card click if checkbox, favorite button, or rating was clicked
    if (e.target !== e.currentTarget) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-checkbox]') || 
          target.closest('[data-favorite-button]') || 
          target.closest('[data-rating-component]')) {
        return;
      }
    }
    
    // Track recipe view
    trackView(recipe.id);
    
    onClick();
  }, [onClick, showCheckbox, trackView, recipe.id]);

  const handleRating = useCallback((rating: number) => {
    if (onRateRecipe) {
      onRateRecipe(recipe.id, rating);
    }
  }, [recipe.id, onRateRecipe]);

  // Auto-track view when card comes into viewport (optional)
  useEffect(() => {
    const cardElement = document.querySelector(`[data-recipe-id="${recipe.id}"]`);
    if (!cardElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Optional: Auto-track views when card is visible
            // trackView(recipe.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardElement);
    return () => observer.disconnect();
  }, [recipe.id, trackView]);

  // Memoized computed values
  const { primaryMealType, primaryDietaryTag, totalTime, formattedProtein, formattedCarbs, formattedFat } = useMemo(() => ({
    primaryMealType: recipe.mealTypes?.[0] || 'dinner',
    primaryDietaryTag: recipe.dietaryTags?.[0],
    totalTime: recipe.prepTimeMinutes + recipe.cookTimeMinutes,
    formattedProtein: Number(recipe.proteinGrams).toFixed(0),
    formattedCarbs: Number(recipe.carbsGrams).toFixed(0),
    formattedFat: Number(recipe.fatGrams).toFixed(0),
  }), [recipe.mealTypes, recipe.dietaryTags, recipe.prepTimeMinutes, recipe.cookTimeMinutes, recipe.proteinGrams, recipe.carbsGrams, recipe.fatGrams]);

  return (
    <Card 
      className={cn(
        "overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-full border-0 shadow-sm relative",
        "mobile-card touch-manipulation",
        isSelected && 'ring-2 ring-primary ring-offset-2',
        className
      )}
      onClick={handleCardClick}
      data-recipe-id={recipe.id}
    >
      <div className="relative w-full h-36 sm:h-40 lg:h-48 bg-gray-100 overflow-hidden">
        {showCheckbox && (
          <div className="absolute top-2 left-2 z-10" data-checkbox>
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              className="bg-white/90 backdrop-blur-sm border-gray-300"
            />
          </div>
        )}
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
            onLoad={handleImageLoad}
            onError={handleImageError}
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
        
        {/* Favorite Button */}
        {showFavoriteButton && (
          <div className="absolute top-2 right-2 z-10" data-favorite-button>
            <FavoriteButton 
              recipeId={recipe.id} 
              size="sm"
              variant="ghost"
              className="bg-white/90 backdrop-blur-sm hover:bg-white/95 shadow-sm"
            />
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
        <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors text-sm sm:text-base line-clamp-2 leading-tight">
          {recipe.name}
        </h3>
        
        {/* Enhanced Rating Display */}
        {(showEngagementStats || allowRating) && (
          <div className="mb-2 sm:mb-3" data-rating-component>
            {allowRating ? (
              <div className="space-y-2">
                <StarRating
                  rating={engagementData?.avgRating || 0}
                  onRatingChange={handleRating}
                  size="sm"
                  showValue={false}
                  className="justify-start"
                  hoverEffect={true}
                />
                {engagementData?.totalRatings && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {engagementData.avgRating?.toFixed(1)} 
                      ({engagementData.totalRatings} review{engagementData.totalRatings !== 1 ? 's' : ''})
                    </span>
                    {engagementData.viewCount && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {engagementData.viewCount}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : engagementData?.avgRating ? (
              <RatingDisplay
                rating={engagementData.avgRating}
                totalRatings={engagementData.totalRatings || 0}
                size="sm"
                showReviewCount={true}
                className="justify-start"
              />
            ) : null}
            
            {/* Recent Review Preview */}
            {engagementData?.recentReview && (
              <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{engagementData.recentReview.authorName}</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{engagementData.recentReview.rating}</span>
                  </div>
                </div>
                <p className="text-muted-foreground line-clamp-2">
                  "{engagementData.recentReview.comment}"
                </p>
              </div>
            )}
            
            {/* Recommendation Badge */}
            {engagementData?.isRecommended && (
              <Badge 
                variant="secondary" 
                className="mt-2 text-xs bg-blue-100 text-blue-800 border-blue-200"
              >
                <Star className="h-3 w-3 mr-1 fill-blue-600 text-blue-600" />
                Recommended
                {engagementData.recommendationReason && (
                  <span className="hidden sm:inline"> - {engagementData.recommendationReason}</span>
                )}
              </Badge>
            )}
          </div>
        )}
        
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">
          <div className="flex items-center space-x-1">
            <i className="fas fa-clock text-slate-400 text-xs"></i>
            <span className="truncate">{totalTime} min</span>
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
                {formattedProtein}g
              </div>
              <div className="text-xs text-slate-500">Protein</div>
            </div>
          </div>
          
          {/* Secondary Nutrition - Compact */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div className="text-center bg-blue-50 rounded-lg p-2 sm:p-3">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                {formattedCarbs}g
              </div>
              <div className="text-xs text-slate-500">Carbs</div>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-2 sm:p-3">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                {formattedFat}g
              </div>
              <div className="text-xs text-slate-500">Fat</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export memoized component with shallow comparison
export default memo(RecipeCard);
