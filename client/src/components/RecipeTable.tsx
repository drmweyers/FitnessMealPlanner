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
import { Eye, Trash2, Clock, Zap } from "lucide-react";
import type { Recipe } from "@shared/schema";

interface RecipeTableProps {
  recipes: Recipe[];
  isLoading?: boolean;
  showCheckbox?: boolean;
  selectedRecipeIds?: Set<string>;
  onRecipeClick: (recipe: Recipe) => void;
  onSelectionChange?: (recipeId: string, selected: boolean) => void;
  onDelete?: (recipeId: string) => void;
}

// Memoized color mapping functions
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

  // Memoized computed values
  const { primaryMealType, primaryDietaryTag, totalTime, isApproved } = useMemo(() => ({
    primaryMealType: recipe.mealTypes?.[0] || 'dinner',
    primaryDietaryTag: recipe.dietaryTags?.[0],
    totalTime: recipe.prepTimeMinutes + recipe.cookTimeMinutes,
    isApproved: recipe.isApproved === true,
  }), [recipe.mealTypes, recipe.dietaryTags, recipe.prepTimeMinutes, recipe.cookTimeMinutes, recipe.isApproved]);

  return (
    <TableRow 
      className={`hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
      data-state={isSelected ? 'selected' : undefined}
    >
      {/* Selection Checkbox */}
      {showCheckbox && (
        <TableCell className="w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            aria-label={`Select ${recipe.name}`}
          />
        </TableCell>
      )}

      {/* Recipe Name */}
      <TableCell className="min-w-[200px]">
        <button
          onClick={handleNameClick}
          className="text-left hover:text-primary transition-colors font-medium"
        >
          <div className="line-clamp-2">{recipe.name}</div>
        </button>
      </TableCell>

      {/* Meal Type */}
      <TableCell className="min-w-[120px]">
        <Badge 
          variant="outline" 
          className={`${getMealTypeColor(primaryMealType)} text-xs`}
        >
          {primaryMealType.charAt(0).toUpperCase() + primaryMealType.slice(1)}
        </Badge>
      </TableCell>

      {/* Dietary Tags */}
      <TableCell className="min-w-[120px]">
        {primaryDietaryTag ? (
          <Badge 
            variant="outline" 
            className={`${getDietaryTagColor(primaryDietaryTag)} text-xs`}
          >
            {primaryDietaryTag.charAt(0).toUpperCase() + primaryDietaryTag.slice(1)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )}
      </TableCell>

      {/* Calories */}
      <TableCell className="text-center min-w-[80px]">
        <div className="flex items-center justify-center space-x-1">
          <Zap className="h-3 w-3 text-orange-500" />
          <span className="font-medium">{recipe.caloriesKcal}</span>
        </div>
      </TableCell>

      {/* Prep Time */}
      <TableCell className="text-center min-w-[80px]">
        <div className="flex items-center justify-center space-x-1">
          <Clock className="h-3 w-3 text-slate-500" />
          <span>{totalTime}m</span>
        </div>
      </TableCell>

      {/* Macros - Mobile Hidden */}
      <TableCell className="text-center min-w-[80px] hidden lg:table-cell">
        <div className="text-xs space-y-1">
          <div>P: {Number(recipe.proteinGrams).toFixed(0)}g</div>
          <div className="text-muted-foreground">
            C: {Number(recipe.carbsGrams).toFixed(0)}g • F: {Number(recipe.fatGrams).toFixed(0)}g
          </div>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="min-w-[100px]">
        <Badge 
          variant={isApproved ? "success" : "warning"}
          className="text-xs"
        >
          {isApproved ? "Approved" : "Pending"}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-24">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewClick}
            className="h-8 w-8 p-0"
            title="View recipe"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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

const RecipeTable: React.FC<RecipeTableProps> = ({
  recipes,
  isLoading = false,
  showCheckbox = false,
  selectedRecipeIds = new Set(),
  onRecipeClick,
  onSelectionChange,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckbox && <TableHead className="w-12"></TableHead>}
              <TableHead>Recipe Name</TableHead>
              <TableHead>Meal Type</TableHead>
              <TableHead>Dietary Tags</TableHead>
              <TableHead className="text-center">Calories</TableHead>
              <TableHead className="text-center">Time</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Macros</TableHead>
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
                <TableCell className="hidden lg:table-cell">
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
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {showCheckbox && <TableHead className="w-12"></TableHead>}
              <TableHead>Recipe Name</TableHead>
              <TableHead>Meal Type</TableHead>
              <TableHead>Dietary Tags</TableHead>
              <TableHead className="text-center">Calories</TableHead>
              <TableHead className="text-center">Time</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Macros</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell 
                colSpan={showCheckbox ? 9 : 8} 
                className="h-32 text-center"
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <i className="fas fa-utensils text-4xl text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-muted-foreground">No recipes found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search filters or generate some recipes.</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
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
            <TableHead className="text-center min-w-[80px] hidden lg:table-cell">Macros</TableHead>
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
    </div>
  );
};

export default memo(RecipeTable);