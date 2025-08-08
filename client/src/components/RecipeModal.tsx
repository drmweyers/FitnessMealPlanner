/**
 * Recipe Modal Component
 * 
 * A comprehensive modal overlay that displays detailed recipe information including
 * nutritional data, ingredients, cooking instructions, and meal planning details.
 * This component handles different recipe data structures from various sources
 * (browse recipes vs meal plan recipes) and provides a consistent viewing experience.
 * 
 * Key Features:
 * - Responsive design with mobile-friendly layout
 * - Detailed nutritional information display
 * - Step-by-step cooking instructions
 * - Ingredient list with measurements
 * - Recipe metadata (prep time, servings, dietary tags)
 * - Fallback image handling for missing recipe photos
 */

import React from "react";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import type { Recipe } from "@shared/schema";

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  /**
   * Instruction Text Handling
   * 
   * Handles different instruction formats between browse recipes and meal plan recipes.
   * Browse recipes use 'instructionsText' while meal plan recipes may use 'instructions'.
   * Splits text into individual steps for better readability.
   */
  const instructionText = recipe.instructionsText || (recipe as any).instructions || '';
  const instructions = instructionText.split('\n').filter((step: string) => step.trim());

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with recipe title and close button */}
        <div className="border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-start gap-3">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight pr-2">
              {recipe.name}
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-gray-600 border-gray-300 hover:bg-gray-50 flex-shrink-0 h-8 w-8 sm:h-10 sm:w-auto sm:px-3"
            >
              <X className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Close</span>
            </Button>
          </div>
        </div>
        
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Left column: Image and Nutrition/Recipe Details */}
            <div className="space-y-4 sm:space-y-6">
              {/* Recipe image */}
              <div className="relative">
                <img 
                  src={recipe.imageUrl || '/api/placeholder/400/300'} 
                  alt={recipe.name}
                  className="w-full h-48 sm:h-56 lg:h-64 object-cover rounded-lg shadow-md"
                />
              </div>
              
              {/* Nutrition Information */}
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Nutrition Information
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center bg-orange-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">
                      {recipe.caloriesKcal}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Calories</div>
                  </div>
                  <div className="text-center bg-red-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">
                      {Number(recipe.proteinGrams).toFixed(0)}g
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Protein</div>
                  </div>
                  <div className="text-center bg-blue-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">
                      {Number(recipe.carbsGrams).toFixed(0)}g
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Carbs</div>
                  </div>
                  <div className="text-center bg-green-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">
                      {Number(recipe.fatGrams).toFixed(0)}g
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Fat</div>
                  </div>
                </div>
              </div>

              {/* Recipe Details */}
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Recipe Details
                </h2>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Prep Time:</span>
                    <span className="text-gray-900 font-medium">{recipe.prepTimeMinutes} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Cook Time:</span>
                    <span className="text-gray-900 font-medium">{recipe.cookTimeMinutes || 0} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Servings:</span>
                    <span className="text-gray-900 font-medium">{recipe.servings}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 flex-shrink-0">Meal Types:</span>
                    <span className="text-gray-900 font-medium text-right">
                      {(recipe.mealTypes || []).join(', ') || 'N/A'}
                    </span>
                  </div>
                  {(recipe.dietaryTags || []).length > 0 && (
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600 flex-shrink-0">Dietary Tags:</span>
                      <span className="text-gray-900 font-medium text-right">
                        {(recipe.dietaryTags || []).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right column: Description, Ingredients and Instructions */}
            <div className="space-y-4 sm:space-y-6">
              {/* Description */}
              {recipe.description && (
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">
                    Description
                  </h2>
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                    {recipe.description}
                  </p>
                </div>
              )}
              
              {/* Ingredients */}
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Ingredients
                </h2>
                <ul className="space-y-2">
                  {(recipe.ingredientsJson || (recipe as any).ingredients || []).map((ingredient: any, index: number) => (
                    <li key={index} className="text-gray-700 text-xs sm:text-sm flex items-start">
                      <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2 mr-3"></span>
                      <span className="leading-relaxed">
                        <span className="font-medium">
                          {ingredient.amount} {ingredient.unit ? `${ingredient.unit} ` : ''}
                        </span>
                        {ingredient.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Instructions */}
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Instructions
                </h2>
                <ol className="space-y-3 sm:space-y-4">
                  {instructions.map((instruction: string, index: number) => (
                    <li key={index} className="flex text-gray-700 text-xs sm:text-sm">
                      <span className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 bg-primary text-white text-xs font-medium rounded-full flex items-center justify-center mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="leading-relaxed">{instruction.trim()}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
