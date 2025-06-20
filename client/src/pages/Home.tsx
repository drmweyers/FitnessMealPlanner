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
import { useState } from "react";

export default function Home() {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: role === 'admin'
  });

  const { data: recipes, isLoading: recipesLoading } = useQuery({
    queryKey: ['/api/recipes']
  });

  // Convert recipes data to expected format
  const recipesList = recipes?.recipes || [];
  
  // Filter recipes based on search term
  const filteredRecipes = recipesList.filter((recipe: any) =>
    recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">{recipe.title}</CardTitle>
                {recipe.status === 'approved' && (
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    <i className="fas fa-check mr-1 text-xs"></i>
                    Approved
                  </Badge>
                )}
                {recipe.status === 'pending' && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <i className="fas fa-clock mr-1 text-xs"></i>
                    Pending
                  </Badge>
                )}
              </div>
              <CardDescription className="line-clamp-2">
                {recipe.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span><i className="fas fa-clock mr-1"></i>{recipe.cookTime || 'N/A'} min</span>
                  <span><i className="fas fa-users mr-1"></i>{recipe.servings || 'N/A'} servings</span>
                </div>
                
                <div className="flex justify-between text-sm text-slate-600">
                  <span><i className="fas fa-fire mr-1"></i>{recipe.calories || 'N/A'} cal</span>
                  <span><i className="fas fa-dumbbell mr-1"></i>{recipe.protein || 'N/A'}g protein</span>
                </div>

                {recipe.category && (
                  <Badge variant="outline" className="text-xs">
                    {recipe.category}
                  </Badge>
                )}

                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags.slice(0, 3).map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {recipe.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{recipe.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full mt-3">
                  <i className="fas fa-eye mr-2"></i>
                  View Recipe
                </Button>
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
    </div>
  );
}