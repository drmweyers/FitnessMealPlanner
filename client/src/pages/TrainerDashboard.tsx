import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ChefHat, Users, Target, Plus, BookOpen } from "lucide-react";
import { Link } from "wouter";
import MealPlanGenerator from "@/components/MealPlanGenerator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TrainerDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/trainer/clients"],
  });

  const { data: mealPlans = [], isLoading: mealPlansLoading } = useQuery({
    queryKey: ["/api/trainer/meal-plans"],
  });

  const { data: recipes } = useQuery({
    queryKey: ["/api/recipes", { page: 1, limit: 50, isApproved: true }],
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Trainer Dashboard</h1>
              <p className="text-slate-600">Welcome back, {user?.firstName || 'Trainer'}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.href = "/role-setup"}>
                Change Role
              </Button>
              <Button variant="outline" onClick={() => window.location.href = "/api/logout"}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Clients</p>
                  <p className="text-2xl font-bold">{clients?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Meal Plans</p>
                  <p className="text-2xl font-bold">{mealPlans?.length || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Available Recipes</p>
                  <p className="text-2xl font-bold">{recipes?.recipes?.length || 0}</p>
                </div>
                <ChefHat className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">This Month</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Target className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="meal-plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="meal-plans">Meal Plans</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="recipes">Browse Recipes</TabsTrigger>
            <TabsTrigger value="generator">Generate Meal Plan</TabsTrigger>
          </TabsList>

          {/* Meal Plans Tab */}
          <TabsContent value="meal-plans">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Created Meal Plans
                </CardTitle>
                <CardDescription>
                  Meal plans you've created for your clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mealPlansLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : mealPlans && mealPlans.length > 0 ? (
                  <div className="space-y-4">
                    {mealPlans.map((plan: any) => (
                      <div key={plan.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{plan.planName}</h3>
                            <p className="text-sm text-slate-600">{plan.description}</p>
                          </div>
                          <Badge variant={plan.isActive ? "default" : "secondary"}>
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Goal:</span> {plan.fitnessGoal}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {plan.days} days
                          </div>
                          <div>
                            <span className="font-medium">Meals/Day:</span> {plan.mealsPerDay}
                          </div>
                          <div>
                            <span className="font-medium">Calories:</span> {plan.dailyCalorieTarget}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4 pt-3 border-t">
                          <span className="text-sm text-slate-600">
                            Created: {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                          <Button size="sm" variant="outline">View Details</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No meal plans created yet</h3>
                    <p className="text-slate-600 mb-4">
                      Start creating personalized meal plans for your clients
                    </p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Meal Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  My Clients
                </CardTitle>
                <CardDescription>
                  Manage your fitness training clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : clients && clients.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clients.map((client: any) => (
                      <div key={client.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {client.user?.firstName} {client.user?.lastName}
                            </h3>
                            <p className="text-sm text-slate-600">{client.user?.email}</p>
                          </div>
                          <Badge variant="outline">Client</Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Goals:</span> {client.fitnessGoals?.join(", ") || "Not set"}
                          </div>
                          <div>
                            <span className="font-medium">Activity Level:</span> {client.activityLevel || "Not specified"}
                          </div>
                          <div>
                            <span className="font-medium">Restrictions:</span> {client.dietaryRestrictions?.join(", ") || "None"}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          <Button size="sm" variant="outline">View Profile</Button>
                          <Button size="sm">Create Meal Plan</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No clients assigned yet</h3>
                    <p className="text-slate-600">
                      Clients will appear here once they're assigned to you
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Browse Recipes Tab */}
          <TabsContent value="recipes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Browse Approved Recipes
                </CardTitle>
                <CardDescription>
                  Explore recipes available for meal planning
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recipes?.recipes && recipes.recipes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recipes.recipes.slice(0, 12).map((recipe: any) => (
                      <div key={recipe.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-slate-900 line-clamp-2">{recipe.name}</h3>
                          <Badge variant="secondary">{recipe.caloriesKcal} cal</Badge>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{recipe.description}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {recipe.mealTypes?.slice(0, 2).map((type: string) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center text-sm text-slate-600">
                          <span>{recipe.prepTimeMinutes}min prep</span>
                          <span>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</span>
                        </div>
                        
                        <Button size="sm" variant="outline" className="w-full mt-3">
                          View Recipe
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ChefHat className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No recipes available</h3>
                    <p className="text-slate-600">
                      Approved recipes will appear here for meal planning
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meal Plan Generator Tab */}
          <TabsContent value="generator">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Generate New Meal Plan
                </CardTitle>
                <CardDescription>
                  Create personalized meal plans for your clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MealPlanGenerator />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}