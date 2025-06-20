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

import { Button } from "@/components/ui/button";
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
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with recipe title and minimize button */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-gray-600 border-gray-300"
            >
              Minimize
            </Button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column: Image and Nutrition/Recipe Details */}
            <div className="space-y-6">
              {/* Recipe image */}
              <img 
                src={recipe.imageUrl || '/api/placeholder/400/300'} 
                alt={recipe.name}
                className="w-full h-64 object-cover rounded-lg"
              />
              
              {/* Nutrition Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Nutrition Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{recipe.caloriesKcal}</div>
                    <div className="text-sm text-gray-600">Calories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{Number(recipe.proteinGrams).toFixed(0)}g</div>
                    <div className="text-sm text-gray-600">Protein</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{Number(recipe.carbsGrams).toFixed(0)}g</div>
                    <div className="text-sm text-gray-600">Carbs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{Number(recipe.fatGrams).toFixed(0)}g</div>
                    <div className="text-sm text-gray-600">Fat</div>
                  </div>
                </div>
              </div>

              {/* Recipe Details */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recipe Details</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prep Time:</span>
                    <span className="text-gray-900 font-medium">{recipe.prepTimeMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cook Time:</span>
                    <span className="text-gray-900 font-medium">{recipe.cookTimeMinutes || 0} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Servings:</span>
                    <span className="text-gray-900 font-medium">{recipe.servings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Meal Types:</span>
                    <span className="text-gray-900 font-medium">{(recipe.mealTypes || []).join(', ')}</span>
                  </div>
                  {(recipe.dietaryTags || []).length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dietary Tags:</span>
                      <span className="text-gray-900 font-medium">{(recipe.dietaryTags || []).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right column: Description, Ingredients and Instructions */}
            <div className="space-y-6">
              {/* Description */}
              {recipe.description && (
                <div>
                  <p className="text-gray-700 leading-relaxed">{recipe.description}</p>
                </div>
              )}
              
              {/* Ingredients */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ingredients</h2>
                <ul className="space-y-1">
                  {(recipe.ingredientsJson || (recipe as any).ingredients || []).map((ingredient: any, index: number) => (
                    <li key={index} className="text-gray-700 text-sm">
                      {ingredient.amount} {ingredient.unit ? `${ingredient.unit} ` : ''}{ingredient.name}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Instructions */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h2>
                <ol className="space-y-3">
                  {instructions.map((instruction: string, index: number) => (
                    <li key={index} className="flex text-gray-700 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white text-xs font-medium rounded-full flex items-center justify-center mr-3 mt-0.5">
                        {index + 1}
                      </span>
                      <span>{instruction.trim()}</span>
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
