import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import SearchFilters from "@/components/SearchFilters";
import RecipeCard from "@/components/RecipeCard";
import RecipeModal from "@/components/RecipeModal";
import MealPlanGenerator from "@/components/MealPlanGenerator";
import AdminTable from "@/components/AdminTable";
import AdminRecipeGenerator from "@/components/AdminRecipeGenerator";
import type { Recipe, RecipeFilter } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<RecipeFilter>({ 
    page: 1, 
    limit: 12,
    approved: true 
  });
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['/api/recipes', filters],
    enabled: true,
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: !!user,
  });

  const recipes = recipesData?.recipes || [];
  const total = recipesData?.total || 0;

  const handleFilterChange = (newFilters: Partial<RecipeFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <i className="fas fa-utensils text-primary text-2xl"></i>
              <span className="text-xl font-bold text-slate-800">FitMeal Pro</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors">
                  <img 
                    src={user?.profileImageUrl || '/api/placeholder/32/32'} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="hidden sm:block font-medium">
                    {user?.firstName || user?.email || 'User'}
                  </span>
                </button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="recipes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="recipes">
              <i className="fas fa-book-open mr-2"></i>
              Browse Recipes
            </TabsTrigger>
            <TabsTrigger value="meal-plan">
              <i className="fas fa-utensils mr-2"></i>
              Meal Plan Generator
            </TabsTrigger>
            <TabsTrigger value="admin">
              <i className="fas fa-cog mr-2"></i>
              Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes">
            {/* Recipe Stats Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Total Recipes</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.total.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-full">
                        <i className="fas fa-book text-primary text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Approved</p>
                        <p className="text-2xl font-bold text-green-600">{stats.approved.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <i className="fas fa-check-circle text-green-600 text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Pending Review</p>
                        <p className="text-2xl font-bold text-secondary">{stats.pending.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-amber-100 rounded-full">
                        <i className="fas fa-clock text-secondary text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Avg Rating</p>
                        <p className="text-2xl font-bold text-slate-900">{stats.avgRating}</p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-full">
                        <i className="fas fa-star text-yellow-500 text-xl"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search and Filters */}
            <SearchFilters filters={filters} onFilterChange={handleFilterChange} />

            {/* Recipe Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-slate-200 rounded-t-xl"></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recipes.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recipes.map((recipe) => (
                    <RecipeCard 
                      key={recipe.id} 
                      recipe={recipe} 
                      onClick={() => setSelectedRecipe(recipe)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {total > filters.limit && (
                  <div className="flex justify-center mt-12">
                    <nav className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={filters.page <= 1}
                        onClick={() => handlePageChange(filters.page - 1)}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </Button>
                      
                      {Array.from({ length: Math.min(5, Math.ceil(total / filters.limit)) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={page === filters.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={filters.page >= Math.ceil(total / filters.limit)}
                        onClick={() => handlePageChange(filters.page + 1)}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </Button>
                    </nav>
                  </div>
                )}
              </>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <i className="fas fa-search text-4xl text-slate-300 mb-4"></i>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No recipes found</h3>
                  <p className="text-slate-600">Try adjusting your search criteria or filters.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="meal-plan">
            <MealPlanGenerator />
          </TabsContent>

          <TabsContent value="admin">
            <AdminRecipeGenerator />
          </TabsContent>
        </Tabs>
      </main>

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal 
          recipe={selectedRecipe} 
          onClose={() => setSelectedRecipe(null)} 
        />
      )}
    </div>
  );
}
