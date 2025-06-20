/**
 * Recipe Detail Page
 * 
 * Displays comprehensive information about a single recipe including
 * ingredients, instructions, nutritional information, and user actions.
 */

import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

export default function RecipeDetail() {
  const [match, params] = useRoute("/recipe/:id");
  const { role } = useAuth();
  const recipeId = params?.id;

  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ['/api/recipes', recipeId],
    enabled: !!recipeId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
        <h3 className="text-xl font-medium text-slate-600 mb-2">Recipe not found</h3>
        <p className="text-slate-500 mb-4">The recipe you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => window.history.back()}>
          <i className="fas fa-arrow-left mr-2"></i>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Recipe Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recipe Image */}
        <div className="relative">
          <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200">
            {recipe.imageUrl ? (
              <img 
                src={recipe.imageUrl} 
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <i className="fas fa-utensils text-6xl text-orange-400 mb-4"></i>
                  <p className="text-orange-600 font-medium text-lg">{recipe.category || 'Recipe'}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            {recipe.status === 'approved' && (
              <Badge className="bg-green-500 hover:bg-green-600 text-white shadow-lg">
                <i className="fas fa-check mr-1"></i>
                Approved
              </Badge>
            )}
            {recipe.status === 'pending' && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 shadow-lg">
                <i className="fas fa-clock mr-1"></i>
                Pending Review
              </Badge>
            )}
          </div>
        </div>

        {/* Recipe Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">{recipe.title}</h1>
            <p className="text-slate-600 text-lg leading-relaxed">{recipe.description}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <i className="fas fa-clock text-2xl text-blue-500 mb-2"></i>
              <p className="text-sm text-slate-600">Total Time</p>
              <p className="text-lg font-semibold text-slate-800">
                {recipe.prepTime ? `${recipe.prepTime + (recipe.cookTime || 0)}` : recipe.cookTime || 'N/A'} min
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <i className="fas fa-users text-2xl text-green-500 mb-2"></i>
              <p className="text-sm text-slate-600">Servings</p>
              <p className="text-lg font-semibold text-slate-800">{recipe.servings || 'N/A'}</p>
            </div>
          </div>

          {/* Category and Tags */}
          <div className="space-y-3">
            {recipe.category && (
              <div>
                <Badge variant="outline" className="px-3 py-1">
                  <i className="fas fa-tag mr-2"></i>
                  {recipe.category}
                </Badge>
              </div>
            )}
            
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="px-2 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button className="flex-1">
              <i className="fas fa-heart mr-2"></i>
              Save Recipe
            </Button>
            <Button variant="outline" className="flex-1">
              <i className="fas fa-share mr-2"></i>
              Share
            </Button>
            {role === 'admin' && (
              <Button variant="outline">
                <i className="fas fa-edit mr-2"></i>
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Nutritional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <i className="fas fa-chart-pie mr-3 text-purple-500"></i>
            Nutritional Information
          </CardTitle>
          <CardDescription>Per serving nutritional breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-red-50 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <i className="fas fa-fire text-2xl text-red-500"></i>
              </div>
              <p className="text-sm text-slate-600 mb-1">Calories</p>
              <p className="text-2xl font-bold text-slate-800">{recipe.calories || 'N/A'}</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-50 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <i className="fas fa-dumbbell text-2xl text-blue-500"></i>
              </div>
              <p className="text-sm text-slate-600 mb-1">Protein</p>
              <p className="text-2xl font-bold text-slate-800">{recipe.protein || 'N/A'}g</p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-50 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <i className="fas fa-bread-slice text-2xl text-yellow-500"></i>
              </div>
              <p className="text-sm text-slate-600 mb-1">Carbs</p>
              <p className="text-2xl font-bold text-slate-800">{recipe.carbs || 'N/A'}g</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-50 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <i className="fas fa-cheese text-2xl text-orange-500"></i>
              </div>
              <p className="text-sm text-slate-600 mb-1">Fat</p>
              <p className="text-2xl font-bold text-slate-800">{recipe.fat || 'N/A'}g</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients and Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-list-ul mr-3 text-green-500"></i>
              Ingredients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <ul className="space-y-3">
                {recipe.ingredients.map((ingredient: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-medium text-green-600">{index + 1}</span>
                    </span>
                    <span className="text-slate-700">{ingredient}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 italic">No ingredients listed</p>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-list-ol mr-3 text-blue-500"></i>
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.instructions && recipe.instructions.length > 0 ? (
              <ol className="space-y-4">
                {recipe.instructions.map((instruction: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                    </span>
                    <span className="text-slate-700 leading-relaxed">{instruction}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-slate-500 italic">No instructions provided</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Back Button */}
      <div className="flex justify-center pt-6">
        <Button variant="outline" size="lg" onClick={() => window.history.back()}>
          <i className="fas fa-arrow-left mr-2"></i>
          Back to Recipes
        </Button>
      </div>
    </div>
  );
}