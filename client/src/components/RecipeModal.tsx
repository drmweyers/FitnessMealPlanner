import { Button } from "@/components/ui/button";
import type { Recipe } from "@shared/schema";

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  // Handle both instructionsText (from browse recipes) and instructions (from meal plan)
  const instructionText = recipe.instructionsText || (recipe as any).instructions || '';
  const instructions = instructionText.split('\n').filter((step: string) => step.trim());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-2xl font-bold text-slate-900">{recipe.name}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <i className="fas fa-times text-xl"></i>
          </Button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <img 
                src={recipe.imageUrl || '/api/placeholder/600/400'} 
                alt={recipe.name}
                className="w-full h-64 object-cover rounded-xl"
              />
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Nutrition Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900">{recipe.caloriesKcal}</div>
                    <div className="text-sm text-slate-600">Calories</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900">{Number(recipe.proteinGrams).toFixed(0)}g</div>
                    <div className="text-sm text-slate-600">Protein</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900">{Number(recipe.carbsGrams).toFixed(0)}g</div>
                    <div className="text-sm text-slate-600">Carbs</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-900">{Number(recipe.fatGrams).toFixed(0)}g</div>
                    <div className="text-sm text-slate-600">Fat</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Recipe Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Prep Time:</span>
                    <span className="font-medium text-slate-900">{recipe.prepTimeMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Cook Time:</span>
                    <span className="font-medium text-slate-900">{recipe.cookTimeMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Servings:</span>
                    <span className="font-medium text-slate-900">{recipe.servings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Meal Types:</span>
                    <span className="font-medium text-slate-900">{(recipe.mealTypes || []).join(', ')}</span>
                  </div>
                  {(recipe.dietaryTags || []).length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Dietary Tags:</span>
                      <span className="font-medium text-slate-900">{(recipe.dietaryTags || []).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <div className="mb-6">
                {recipe.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Description</h3>
                    <p className="text-slate-700">{recipe.description}</p>
                  </div>
                )}
                
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Ingredients</h3>
                <ul className="space-y-2">
                  {(recipe.ingredientsJson || (recipe as any).ingredients || []).map((ingredient: any, index: number) => (
                    <li key={index} className="flex items-center text-slate-700">
                      <i className="fas fa-circle text-primary text-xs mr-3"></i>
                      <span>
                        {ingredient.amount} {ingredient.unit ? `${ingredient.unit} ` : ''}{ingredient.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Instructions</h3>
                <ol className="space-y-4">
                  {instructions.map((instruction: string, index: number) => (
                    <li key={index} className="flex text-slate-700">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary text-white text-sm font-medium rounded-full flex items-center justify-center mr-3 mt-0.5">
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
