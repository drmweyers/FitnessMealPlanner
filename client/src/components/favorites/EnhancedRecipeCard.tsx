import React, { memo, useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import type { Recipe } from "@shared/schema";
import FavoriteButton from "./FavoriteButton";
import { useRecipeViewTracking } from "../../hooks/useEngagement";
import { Eye, Clock, Star, Heart, TrendingUp, Flame } from "lucide-react";
import { cn } from "../../lib/utils";

interface EnhancedRecipeCardProps {
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
    isRecommended?: boolean;
    recommendationReason?: string;
    isTrending?: boolean;
    rank?: number;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'grid' | 'list';
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

const EnhancedRecipeCard = memo(({ 
  recipe, 
  onClick, 
  showCheckbox = false, 
  isSelected = false, 
  onSelectionChange,
  showFavoriteButton = true,
  showEngagementStats = false,
  engagementData,
  className,
  size = 'md',
  layout = 'grid',
}: EnhancedRecipeCardProps) => {
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
    // Don't trigger card click if checkbox or favorite button was clicked
    if (e.target !== e.currentTarget) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-checkbox]') || target.closest('[data-favorite-button]')) {
        return;
      }
    }
    
    // Track recipe view
    trackView(recipe.id);
    
    onClick();
  }, [onClick, trackView, recipe.id]);

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

  // Size configuration
  const sizeConfig = {
    sm: {
      imageHeight: 'h-32',
      contentPadding: 'p-3',
      titleSize: 'text-sm',
      metaSize: 'text-xs',
      badgeSize: 'text-xs px-2 py-1',
    },
    md: {
      imageHeight: 'h-36 sm:h-40 lg:h-48',
      contentPadding: 'p-3 sm:p-4',
      titleSize: 'text-sm sm:text-base',
      metaSize: 'text-xs sm:text-sm',
      badgeSize: 'text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2',
    },
    lg: {
      imageHeight: 'h-48 lg:h-56',
      contentPadding: 'p-4 lg:p-6',
      titleSize: 'text-base lg:text-lg',
      metaSize: 'text-sm',
      badgeSize: 'text-sm px-3 py-2',
    },
  };

  const config = sizeConfig[size];

  // Layout configuration
  const isListLayout = layout === 'list';

  return (
    <Card 
      className={cn(
        "overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-full border-0 shadow-sm relative",
        isSelected && 'ring-2 ring-primary ring-offset-2',
        isListLayout && 'flex flex-row h-auto',
        engagementData?.isTrending && 'ring-2 ring-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50',
        className
      )}
      onClick={handleCardClick}
      data-recipe-id={recipe.id}
    >
      {/* Image Section */}
      <div className={cn(
        "relative bg-gray-100 overflow-hidden",
        isListLayout ? 'w-32 sm:w-40 flex-shrink-0' : `w-full ${config.imageHeight}`
      )}>
        {/* Rank Badge for Top Recipes */}
        {engagementData?.rank && engagementData.rank <= 10 && (
          <div className={cn(
            "absolute top-2 left-2 z-20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
            engagementData.rank === 1 && "bg-yellow-500",
            engagementData.rank === 2 && "bg-gray-400",
            engagementData.rank === 3 && "bg-amber-600",
            engagementData.rank > 3 && "bg-gray-600"
          )}>
            {engagementData.rank}
          </div>
        )}

        {/* Checkbox */}
        {showCheckbox && (
          <div className="absolute top-2 left-2 z-10" data-checkbox>
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              className="bg-white/90 backdrop-blur-sm border-gray-300"
            />
          </div>
        )}
        
        {/* Favorite Button */}
        {showFavoriteButton && (
          <div className="absolute top-2 right-2 z-10" data-favorite-button>
            <FavoriteButton 
              recipeId={recipe.id}
              size="sm"
              variant="ghost"
              className="bg-white/90 backdrop-blur-sm border border-gray-200 hover:bg-white"
            />
          </div>
        )}

        {/* Trending Badge */}
        {engagementData?.isTrending && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-15">
            <Badge 
              variant="secondary" 
              className="bg-orange-500 text-white text-xs px-2 py-1 flex items-center gap-1"
            >
              <Flame className="h-3 w-3" />
              Trending
            </Badge>
          </div>
        )}

        {/* Recommendation Badge */}
        {engagementData?.isRecommended && !engagementData?.isTrending && (
          <div className="absolute bottom-2 left-2 z-15">
            <Badge 
              variant="secondary" 
              className="bg-blue-500 text-white text-xs px-2 py-1 flex items-center gap-1"
            >
              <TrendingUp className="h-3 w-3" />
              Recommended
            </Badge>
          </div>
        )}

        {/* Loading State */}
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-pulse text-gray-400">
              <i className="fas fa-image text-lg sm:text-xl lg:text-2xl"></i>
            </div>
          </div>
        )}

        {/* Recipe Image */}
        {!imageError ? (
          <img 
            src={recipe.imageUrl ?? '/api/placeholder/400/250'} 
            alt={recipe.name}
            className={cn(
              "object-cover group-hover:scale-105 transition-transform duration-300",
              isListLayout ? 'w-full h-full' : `w-full ${config.imageHeight}`
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        ) : (
          <div className={cn(
            "bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center",
            isListLayout ? 'w-full h-full' : `w-full ${config.imageHeight}`
          )}>
            <div className="text-center text-gray-500 px-2">
              <i className="fas fa-utensils text-xl sm:text-2xl lg:text-3xl mb-2"></i>
              <p className="text-xs sm:text-sm font-medium line-clamp-2">{recipe.name}</p>
            </div>
          </div>
        )}

        {/* Engagement Stats Overlay */}
        {showEngagementStats && engagementData && (
          <div className="absolute bottom-2 left-2 right-2 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 text-white text-xs">
              <div className="flex items-center justify-between gap-2">
                {engagementData.viewCount !== undefined && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{engagementData.viewCount}</span>
                  </div>
                )}
                {engagementData.favoriteCount !== undefined && (
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3 text-red-400" />
                    <span>{engagementData.favoriteCount}</span>
                  </div>
                )}
                {engagementData.avgRating !== undefined && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    <span>{engagementData.avgRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <CardContent className={cn(config.contentPadding, "flex flex-col h-auto flex-1")}>
        {/* Meal Type and Dietary Tags */}
        <div className="mb-2 sm:mb-3 flex flex-wrap gap-1 sm:gap-2">
          <div className={cn(
            "inline-block font-semibold rounded-lg shadow-sm",
            getMealTypeColor(primaryMealType),
            config.badgeSize
          )}>
            {primaryMealType.charAt(0).toUpperCase() + primaryMealType.slice(1)}
          </div>
          {primaryDietaryTag && (
            <span className={cn(
              "font-medium rounded-full",
              getDietaryTagColor(primaryDietaryTag),
              "text-xs px-2 py-1"
            )}>
              {primaryDietaryTag.charAt(0).toUpperCase() + primaryDietaryTag.slice(1)}
            </span>
          )}
        </div>
        
        {/* Recipe Name */}
        <h3 className={cn(
          "font-semibold text-slate-900 mb-2 sm:mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight",
          config.titleSize
        )}>
          {recipe.name}
        </h3>
        
        {/* Basic Info */}
        <div className={cn(
          "grid grid-cols-2 gap-2 text-slate-600 mb-3 sm:mb-4",
          config.metaSize
        )}>
          <div className="flex items-center space-x-1">
            <Clock className="text-slate-400 text-xs" />
            <span className="truncate">{totalTime} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <i className="fas fa-fire text-slate-400 text-xs"></i>
            <span className="truncate">{recipe.caloriesKcal} cal</span>
          </div>
        </div>
        
        {/* Engagement Stats Row (Compact) */}
        {showEngagementStats && engagementData && !isListLayout && (
          <div className={cn("flex items-center gap-3 mb-3 text-slate-600", config.metaSize)}>
            {engagementData.viewCount !== undefined && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-slate-400" />
                <span>{engagementData.viewCount}</span>
              </div>
            )}
            {engagementData.favoriteCount !== undefined && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-400" />
                <span>{engagementData.favoriteCount}</span>
              </div>
            )}
            {engagementData.avgRating !== undefined && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400" />
                <span>{engagementData.avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Nutrition Information */}
        {!isListLayout && (
          <div className="mt-auto">
            <h4 className={cn("font-medium text-slate-700 mb-2", config.metaSize)}>
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
        )}

        {/* List Layout Compact Nutrition */}
        {isListLayout && (
          <div className="flex items-center gap-4 text-xs text-slate-600 mt-auto">
            <span className="font-medium text-orange-600">{recipe.caloriesKcal} cal</span>
            <span>{formattedProtein}g protein</span>
            <span>{formattedCarbs}g carbs</span>
            <span>{formattedFat}g fat</span>
          </div>
        )}

        {/* Recommendation Reason */}
        {engagementData?.recommendationReason && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded p-2">
            💡 {engagementData.recommendationReason}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

EnhancedRecipeCard.displayName = 'EnhancedRecipeCard';

export default EnhancedRecipeCard;