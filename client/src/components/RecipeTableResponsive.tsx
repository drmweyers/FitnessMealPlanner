/**
 * RecipeTableResponsive Component
 * Story 1.8: Responsive UI/UX Enhancement
 * 
 * Enhanced responsive version of RecipeTable that provides
 * optimized viewing on mobile, tablet, and desktop devices.
 */

import React, { memo, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { 
  Eye, 
  Trash2, 
  Clock, 
  Zap, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Utensils
} from "lucide-react";
import type { Recipe } from "@shared/schema";
import { 
  TableToCards, 
  ResponsiveCard,
  MobileTableRow,
  MobileTableSection 
} from "./ui/ResponsiveTable";
import { cn } from "../lib/utils";

interface RecipeTableResponsiveProps {
  recipes: Recipe[];
  isLoading?: boolean;
  showCheckbox?: boolean;
  selectedRecipeIds?: Set<string>;
  onRecipeClick: (recipe: Recipe) => void;
  onSelectionChange?: (recipeId: string, selected: boolean) => void;
  onDelete?: (recipeId: string) => void;
}

// Color mapping functions (same as original)
const MEAL_TYPE_COLORS = {
  breakfast: "bg-orange-100 text-orange-700 border-orange-200",
  lunch: "bg-yellow-100 text-yellow-700 border-yellow-200",
  dinner: "bg-primary/10 text-primary border-primary/20",
  snack: "bg-pink-100 text-pink-700 border-pink-200",
} as const;

const DIETARY_TAG_COLORS = {
  vegetarian: "bg-green-100 text-green-700 border-green-200",
  vegan: "bg-blue-100 text-blue-700 border-blue-200",
  keto: "bg-green-100 text-green-700 border-green-200",
  paleo: "bg-orange-100 text-orange-700 border-orange-200",
  "gluten-free": "bg-purple-100 text-purple-700 border-purple-200",
  "low-carb": "bg-red-100 text-red-700 border-red-200",
  "high-protein": "bg-purple-100 text-purple-700 border-purple-200",
} as const;

const getMealTypeColor = (mealType: string) => {
  return MEAL_TYPE_COLORS[mealType as keyof typeof MEAL_TYPE_COLORS] || "bg-slate-100 text-slate-700 border-slate-200";
};

const getDietaryTagColor = (tag: string) => {
  return DIETARY_TAG_COLORS[tag as keyof typeof DIETARY_TAG_COLORS] || "bg-slate-100 text-slate-700 border-slate-200";
};

// Mobile Card Component for Recipe
const RecipeCard: React.FC<{
  recipe: Recipe;
  showCheckbox: boolean;
  isSelected: boolean;
  onRecipeClick: (recipe: Recipe) => void;
  onSelectionChange?: (recipeId: string, selected: boolean) => void;
  onDelete?: (recipeId: string) => void;
}> = memo(({ recipe, showCheckbox, isSelected, onRecipeClick, onSelectionChange, onDelete }) => {
  const handleCheckboxChange = useCallback((checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(recipe.id, checked);
    }
  }, [recipe.id, onSelectionChange]);

  const handleCardClick = useCallback(() => {
    if (!showCheckbox) {
      onRecipeClick(recipe);
    }
  }, [recipe, onRecipeClick, showCheckbox]);

  const handleViewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRecipeClick(recipe);
  }, [recipe, onRecipeClick]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(recipe.id);
    }
  }, [recipe.id, onDelete]);

  const primaryMealType = recipe.mealTypes?.[0] || 'dinner';
  const primaryDietaryTag = recipe.dietaryTags?.[0];
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const isApproved = recipe.isApproved === true;

  return (
    <ResponsiveCard 
      className={cn(
        "relative",
        isSelected && "ring-2 ring-primary ring-offset-2",
        !showCheckbox && "cursor-pointer"
      )}
      onClick={handleCardClick}
    >
      {/* Header with checkbox and status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              className="mt-1"
              aria-label={`Select ${recipe.name}`}
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-gray-900 line-clamp-2 mb-1">
              {recipe.name}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge 
                variant="outline" 
                className={`${getMealTypeColor(primaryMealType)} text-xs`}
              >
                {primaryMealType.charAt(0).toUpperCase() + primaryMealType.slice(1)}
              </Badge>
              {primaryDietaryTag && (
                <Badge 
                  variant="outline" 
                  className={`${getDietaryTagColor(primaryDietaryTag)} text-xs`}
                >
                  {primaryDietaryTag}
                </Badge>
              )}
              <Badge 
                variant={isApproved ? "success" : "warning"}
                className="text-xs"
              >
                {isApproved ? (
                  <><CheckCircle className="w-3 h-3 mr-1" /> Approved</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> Pending</>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Nutrition Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center space-x-2 text-sm">
          <Zap className="h-4 w-4 text-orange-500" />
          <span className="font-medium">{recipe.caloriesKcal} cal</span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="h-4 w-4 text-slate-500" />
          <span>{totalTime} min</span>
        </div>
      </div>

      {/* Macros */}
      <div className="flex justify-between text-xs text-gray-600 border-t pt-3 mb-3">
        <span>P: {Number(recipe.proteinGrams).toFixed(0)}g</span>
        <span>C: {Number(recipe.carbsGrams).toFixed(0)}g</span>
        <span>F: {Number(recipe.fatGrams).toFixed(0)}g</span>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewClick}
          className="flex-1 mr-2 touch-target"
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 touch-target"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </ResponsiveCard>
  );
});

RecipeCard.displayName = "RecipeCard";

// Loading Card Component
const LoadingCard: React.FC = () => (
  <ResponsiveCard className="animate-pulse">
    <div className="space-y-3">
      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
      <div className="flex space-x-2">
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  </ResponsiveCard>
);

// Table Row Component (same as original but with responsive enhancements)
const RecipeTableRow: React.FC<{
  recipe: Recipe;
  showCheckbox: boolean;
  isSelected: boolean;
  onRecipeClick: (recipe: Recipe) => void;
  onSelectionChange?: (recipeId: string, selected: boolean) => void;
  onDelete?: (recipeId: string) => void;
}> = memo(({ recipe, showCheckbox, isSelected, onRecipeClick, onSelectionChange, onDelete }) => {
  const handleCheckboxChange = useCallback((checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(recipe.id, checked);
    }
  }, [recipe.id, onSelectionChange]);

  const handleNameClick = useCallback(() => {
    onRecipeClick(recipe);
  }, [recipe, onRecipeClick]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(recipe.id);
    }
  }, [recipe.id, onDelete]);

  const handleViewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRecipeClick(recipe);
  }, [recipe, onRecipeClick]);

  const primaryMealType = recipe.mealTypes?.[0] || 'dinner';
  const primaryDietaryTag = recipe.dietaryTags?.[0];
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const isApproved = recipe.isApproved === true;

  return (
    <TableRow 
      className={cn(
        "hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted"
      )}
      data-state={isSelected ? 'selected' : undefined}
    >
      {showCheckbox && (
        <TableCell className="w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            aria-label={`Select ${recipe.name}`}
          />
        </TableCell>
      )}
      <TableCell className="min-w-[200px]">
        <button
          onClick={handleNameClick}
          className="text-left hover:text-primary transition-colors font-medium touch-target"
        >
          <div className="line-clamp-2">{recipe.name}</div>
        </button>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <Badge 
          variant="outline" 
          className={`${getMealTypeColor(primaryMealType)} text-xs`}
        >
          {primaryMealType.charAt(0).toUpperCase() + primaryMealType.slice(1)}
        </Badge>
      </TableCell>
      <TableCell className="min-w-[120px]">
        {primaryDietaryTag ? (
          <Badge 
            variant="outline" 
            className={`${getDietaryTagColor(primaryDietaryTag)} text-xs`}
          >
            {primaryDietaryTag}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>
      <TableCell className="text-center min-w-[80px]">
        <div className="flex items-center justify-center space-x-1">
          <Zap className="h-3 w-3 text-orange-500" />
          <span className="font-medium">{recipe.caloriesKcal}</span>
        </div>
      </TableCell>
      <TableCell className="text-center min-w-[80px]">
        <div className="flex items-center justify-center space-x-1">
          <Clock className="h-3 w-3 text-slate-500" />
          <span>{totalTime}m</span>
        </div>
      </TableCell>
      <TableCell className="text-center min-w-[80px] hidden xl:table-cell">
        <div className="text-xs space-y-1">
          <div>P: {Number(recipe.proteinGrams).toFixed(0)}g</div>
          <div className="text-muted-foreground">
            C: {Number(recipe.carbsGrams).toFixed(0)}g • F: {Number(recipe.fatGrams).toFixed(0)}g
          </div>
        </div>
      </TableCell>
      <TableCell className="min-w-[100px]">
        <Badge 
          variant={isApproved ? "success" : "warning"}
          className="text-xs"
        >
          {isApproved ? "Approved" : "Pending"}
        </Badge>
      </TableCell>
      <TableCell className="w-24">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewClick}
            className="h-8 w-8 p-0 touch-target"
            title="View recipe"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 touch-target"
              title="Delete recipe"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

RecipeTableRow.displayName = "RecipeTableRow";

// Main Component
const RecipeTableResponsive: React.FC<RecipeTableResponsiveProps> = ({
  recipes,
  isLoading = false,
  showCheckbox = false,
  selectedRecipeIds = new Set(),
  onRecipeClick,
  onSelectionChange,
  onDelete,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <>
        {/* Mobile Loading */}
        <div className="lg:hidden space-y-3">
          {[...Array(4)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
        
        {/* Desktop Loading */}
        <div className="hidden lg:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {showCheckbox && <TableHead className="w-12"></TableHead>}
                <TableHead>Recipe Name</TableHead>
                <TableHead>Meal Type</TableHead>
                <TableHead>Dietary Tags</TableHead>
                <TableHead className="text-center">Calories</TableHead>
                <TableHead className="text-center">Time</TableHead>
                <TableHead className="text-center hidden xl:table-cell">Macros</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  {showCheckbox && (
                    <TableCell>
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto" />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  // Empty state
  if (recipes.length === 0) {
    return (
      <div className="border rounded-lg p-8">
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <Utensils className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-muted-foreground">No recipes found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Try adjusting your search filters or generate some recipes to get started.
          </p>
        </div>
      </div>
    );
  }

  // Render cards for mobile, table for desktop
  const renderCard = (recipe: Recipe) => (
    <RecipeCard
      key={recipe.id}
      recipe={recipe}
      showCheckbox={showCheckbox}
      isSelected={selectedRecipeIds.has(recipe.id)}
      onRecipeClick={onRecipeClick}
      onSelectionChange={onSelectionChange}
      onDelete={onDelete}
    />
  );

  const renderTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          {showCheckbox && (
            <TableHead className="w-12">
              <span className="sr-only">Select</span>
            </TableHead>
          )}
          <TableHead className="min-w-[200px]">Recipe Name</TableHead>
          <TableHead className="min-w-[120px]">Meal Type</TableHead>
          <TableHead className="min-w-[120px]">Dietary Tags</TableHead>
          <TableHead className="text-center min-w-[80px]">Calories</TableHead>
          <TableHead className="text-center min-w-[80px]">Time</TableHead>
          <TableHead className="text-center min-w-[80px] hidden xl:table-cell">Macros</TableHead>
          <TableHead className="min-w-[100px]">Status</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recipes.map((recipe) => (
          <RecipeTableRow
            key={recipe.id}
            recipe={recipe}
            showCheckbox={showCheckbox}
            isSelected={selectedRecipeIds.has(recipe.id)}
            onRecipeClick={onRecipeClick}
            onSelectionChange={onSelectionChange}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  );

  return (
    <TableToCards
      items={recipes}
      renderCard={renderCard}
      renderTable={renderTable}
      breakpoint="lg"
      emptyMessage="No recipes found"
    />
  );
};

export default memo(RecipeTableResponsive);