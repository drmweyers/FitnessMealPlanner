import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, ChefHat, Calendar, Plus } from "lucide-react";
import { Link } from "wouter";
import MealPlanGenerator from "@/components/MealPlanGenerator";

export default function TrainerDashboard() {
  const { user } = useAuth();

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/trainer/clients"],
  });

  const { data: mealPlans, isLoading: mealPlansLoading } = useQuery({
    queryKey: ["/api/trainer/meal-plans"],
  });

  const { data: recipes, isLoading: recipesLoading } = useQuery({
    queryKey: ["/api/recipes"],
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
              <Button variant="outline" onClick={() => window.location.href = "/api/logout"}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Clients</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {clientsLoading ? "..." : clients?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Meal Plans Created</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {mealPlansLoading ? "..." : mealPlans?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Available Recipes</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {recipesLoading ? "..." : recipes?.recipes?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <ChefHat className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="meal-plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="meal-plans">Meal Plan Generator</TabsTrigger>
            <TabsTrigger value="clients">My Clients</TabsTrigger>
            <TabsTrigger value="recipes">Browse Recipes</TabsTrigger>
          </TabsList>

          <TabsContent value="meal-plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Generate Meal Plan for Client
                </CardTitle>
                <CardDescription>
                  Create personalized meal plans for your clients with advanced filtering and nutritional targeting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MealPlanGenerator />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Clients</CardTitle>
                <CardDescription>
                  Manage your clients and their meal plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : clients && clients.length > 0 ? (
                  <div className="space-y-4">
                    {clients.map((client: any) => (
                      <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">Client ID: {client.userId}</h3>
                          <p className="text-sm text-slate-600">
                            Goals: {client.fitnessGoals?.join(", ") || "None set"}
                          </p>
                          <p className="text-sm text-slate-600">
                            Activity Level: {client.activityLevel || "Not specified"}
                          </p>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No clients yet</h3>
                    <p className="text-slate-600">Clients will appear here when they're assigned to you.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recipe Library</CardTitle>
                <CardDescription>
                  Browse approved recipes to include in meal plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recipesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recipes?.recipes?.slice(0, 6).map((recipe: any) => (
                      <div key={recipe.id} className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">{recipe.name}</h3>
                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">{recipe.description}</p>
                        <div className="flex gap-2 mb-2">
                          {recipe.mealTypes?.slice(0, 2).map((type: string) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">{recipe.caloriesKcal} cal</span> • 
                          <span className="ml-1">{recipe.prepTimeMinutes}min prep</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}