/**
 * Recipe Detail Modal Component
 * 
 * Displays comprehensive recipe information in a modal overlay including:
 * - Recipe image and basic info (title, description, category)
 * - Timing information (prep time, cook time, total time)
 * - Nutritional breakdown with visual indicators
 * - Complete ingredients list with measurements
 * - Step-by-step cooking instructions
 * - Action buttons (save, share, edit)
 */

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Users, Utensils, Heart, Share2, Edit3, X } from "lucide-react";

interface RecipeDetailModalProps {
  recipeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecipeDetailModal({ recipeId, open, onOpenChange }: RecipeDetailModalProps) {
  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ['/api/recipes', recipeId],
    enabled: !!recipeId && open,
  });

  if (!recipeId) return null;

  const handleSaveRecipe = () => {
    // TODO: Implement save functionality
    console.log('Save recipe:', recipeId);
  };

  const handleShareRecipe = () => {
    // TODO: Implement share functionality
    console.log('Share recipe:', recipeId);
  };

  const handleEditRecipe = () => {
    // TODO: Implement edit functionality
    console.log('Edit recipe:', recipeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96 text-red-500">
            Failed to load recipe details
          </div>
        ) : recipe ? (
          <div className="flex flex-col h-full">
            {/* Header with Image */}
            <div className="relative">
              <div className="h-64 bg-gradient-to-br from-orange-100 to-orange-200 relative overflow-hidden">
                {recipe.imageUrl ? (
                  <img 
                    src={recipe.imageUrl} 
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Utensils className="w-16 h-16 text-orange-400" />
                  </div>
                )}
                
                {/* Status Badge */}
                {recipe.status && (
                  <div className="absolute top-4 left-4">
                    <Badge 
                      variant={recipe.status === 'approved' ? 'default' : 'secondary'}
                      className={recipe.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}
                    >
                      {recipe.status}
                    </Badge>
                  </div>
                )}

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Recipe Title and Basic Info */}
              <div className="p-6 pb-4">
                <DialogHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
                        {recipe.title}
                      </DialogTitle>
                      {recipe.description && (
                        <p className="text-gray-600 mt-2 leading-relaxed">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {recipe.prepTime && recipe.cookTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{recipe.prepTime + recipe.cookTime} min total</span>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{recipe.servings} servings</span>
                      </div>
                    )}
                    {recipe.category && (
                      <Badge variant="outline" className="text-xs">
                        {recipe.category}
                      </Badge>
                    )}
                  </div>

                  {/* Tags */}
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recipe.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </DialogHeader>
              </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-8 pb-6">
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handleSaveRecipe} className="flex-1 bg-green-500 hover:bg-green-600">
                    <Heart className="w-4 h-4 mr-2" />
                    Save Recipe
                  </Button>
                  <Button onClick={handleShareRecipe} variant="outline" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  <Button onClick={handleEditRecipe} variant="outline" className="flex-1">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>

                <Separator />

                {/* Nutritional Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Nutritional Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recipe.calories && (
                      <div className="bg-orange-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-orange-600">{recipe.calories}</div>
                        <div className="text-sm text-gray-600">Calories</div>
                      </div>
                    )}
                    {recipe.protein && (
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{recipe.protein}g</div>
                        <div className="text-sm text-gray-600">Protein</div>
                      </div>
                    )}
                    {recipe.carbs && (
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{recipe.carbs}g</div>
                        <div className="text-sm text-gray-600">Carbs</div>
                      </div>
                    )}
                    {recipe.fat && (
                      <div className="bg-purple-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">{recipe.fat}g</div>
                        <div className="text-sm text-gray-600">Fat</div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Ingredients */}
                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Ingredients</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <ul className="space-y-3">
                        {recipe.ingredients.map((ingredient: any, index: number) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <span className="font-medium">
                                {ingredient.amount} {ingredient.unit}
                              </span>
                              <span className="ml-2 text-gray-700">
                                {ingredient.name}
                              </span>
                              {ingredient.notes && (
                                <span className="ml-2 text-sm text-gray-500 italic">
                                  ({ingredient.notes})
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Instructions */}
                {recipe.instructions && recipe.instructions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Instructions</h3>
                    <div className="space-y-4">
                      {recipe.instructions.map((instruction: string, index: number) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-gray-700 leading-relaxed">{instruction}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}