/**
 * Home Page - Recipe Browser
 * 
 * Displays recipe statistics (for admin) and recipe browsing interface.
 * Navigation is handled by the parent Layout component.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RecipeDetailModal from "@/components/RecipeDetailModal";
import { useState } from "react";

export default function Home() {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRecipeClick = (recipeId: string) => {
    console.log('Recipe clicked:', recipeId);
    setSelectedRecipeId(recipeId);
    setIsModalOpen(true);
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: role === 'admin'
  });

  const { data: recipes, isLoading: recipesLoading } = useQuery({
    queryKey: ['/api/recipes']
  });

  // Convert recipes data to expected format
  const recipesList = recipes?.recipes || [];
  
  console.log('Raw recipes data:', recipes);
  console.log('Recipes list:', recipesList.length, 'recipes');
  
  // Filter recipes based on search term
  const filteredRecipes = recipesList.filter((recipe: any) =>
    recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  console.log('Filtered recipes:', filteredRecipes.length);

  if (statsLoading || recipesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recipe Stats Overview - Only for Admin */}
      {role === 'admin' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Recipes</CardTitle>
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                <i className="fas fa-book text-white text-sm"></i>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">{stats.total}</div>
              <p className="text-xs text-blue-600 mt-1">
                Complete recipe database
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Approved</CardTitle>
              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                <i className="fas fa-check text-white text-sm"></i>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">{stats.approved}</div>
              <p className="text-xs text-green-600 mt-1">
                Ready for meal plans
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Pending Review</CardTitle>
              <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <i className="fas fa-clock text-white text-sm"></i>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
              <p className="text-xs text-yellow-600 mt-1">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Avg Rating</CardTitle>
              <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                <i className="fas fa-star text-white text-sm"></i>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">{stats.avgRating}</div>
              <p className="text-xs text-purple-600 mt-1">
                Community feedback
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="max-w-md">
        <Input
          type="text"
          placeholder="Search recipes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe: any) => (
          <Card 
            key={recipe.id} 
            className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
            onClick={() => handleRecipeClick(recipe.id)}
          >
            {/* Recipe Image */}
            <div className="relative h-48 bg-gradient-to-br from-orange-100 to-orange-200">
              {recipe.imageUrl ? (
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.name || recipe.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <i className="fas fa-utensils text-4xl text-orange-400 mb-2"></i>
                    <p className="text-orange-600 font-medium">{recipe.category || 'Recipe'}</p>
                  </div>
                </div>
              )}
              
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                {recipe.status === 'approved' && (
                  <Badge className="bg-green-500 hover:bg-green-600 text-white shadow-md">
                    <i className="fas fa-check mr-1 text-xs"></i>
                    Approved
                  </Badge>
                )}
                {recipe.status === 'pending' && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 shadow-md">
                    <i className="fas fa-clock mr-1 text-xs"></i>
                    Pending
                  </Badge>
                )}
              </div>

              {/* Difficulty Badge */}
              {recipe.difficulty && (
                <div className="absolute top-3 left-3">
                  <Badge variant="outline" className="bg-white/90 text-slate-700 border-slate-300">
                    {recipe.difficulty}
                  </Badge>
                </div>
              )}
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold line-clamp-2 mb-1">
                {recipe.title}
              </CardTitle>
              <CardDescription className="line-clamp-2 text-sm">
                {recipe.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center text-slate-600">
                    <i className="fas fa-clock mr-2 text-blue-500"></i>
                    <span>{recipe.prepTime ? `${recipe.prepTime} + ${recipe.cookTime || 0}` : recipe.cookTime || 'N/A'} min</span>
                  </div>
                  <div className="flex items-center text-slate-600">
                    <i className="fas fa-users mr-2 text-green-500"></i>
                    <span>{recipe.servings || 'N/A'} servings</span>
                  </div>
                </div>

                {/* Nutritional Information */}
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                    Nutrition Per Serving
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Calories:</span>
                      <span className="font-medium text-slate-800">{recipe.calories || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Protein:</span>
                      <span className="font-medium text-slate-800">{recipe.protein || 'N/A'}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Carbs:</span>
                      <span className="font-medium text-slate-800">{recipe.carbs || 'N/A'}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Fat:</span>
                      <span className="font-medium text-slate-800">{recipe.fat || 'N/A'}g</span>
                    </div>
                  </div>
                </div>

                {/* Category and Tags */}
                <div className="space-y-2">
                  {recipe.category && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-medium">
                        <i className="fas fa-tag mr-1"></i>
                        {recipe.category}
                      </Badge>
                    </div>
                  )}
                  
                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 3).map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs px-2 py-1">
                          {tag}
                        </Badge>
                      ))}
                      {recipe.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs px-2 py-1">
                          +{recipe.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecipeClick(recipe.id);
                    }}
                  >
                    <i className="fas fa-eye mr-2"></i>
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <i className="fas fa-heart mr-2"></i>
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-12">
          <i className="fas fa-search text-4xl text-slate-300 mb-4"></i>
          <h3 className="text-xl font-medium text-slate-600 mb-2">No recipes found</h3>
          <p className="text-slate-500">Try adjusting your search terms</p>
        </div>
      )}

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipeId={selectedRecipeId}
        open={isModalOpen}
        onOpenChange={(open) => {
          console.log('Modal open change:', open);
          if (!open) {
            setSelectedRecipeId(null);
          }
          setIsModalOpen(open);
        }}
      />
    </div>
  );
}