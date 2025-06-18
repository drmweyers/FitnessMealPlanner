import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChefHat, Target, User } from "lucide-react";

export default function ClientDashboard() {
  const { user } = useAuth();

  const { data: mealPlans, isLoading: mealPlansLoading } = useQuery({
    queryKey: ["/api/client/meal-plans"],
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Meal Plans</h1>
              <p className="text-slate-600">Welcome back, {user?.firstName || 'Client'}</p>
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
        {/* Client Profile Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-slate-900 mb-2">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {user?.firstName} {user?.lastName}</p>
                  <p><span className="font-medium">Email:</span> {user?.email}</p>
                  <p><span className="font-medium">Role:</span> <Badge variant="secondary">Client</Badge></p>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-slate-900 mb-2">Fitness Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Goals:</span> {user?.client?.fitnessGoals?.join(", ") || "Not set"}</p>
                  <p><span className="font-medium">Activity Level:</span> {user?.client?.activityLevel || "Not specified"}</p>
                  <p><span className="font-medium">Dietary Restrictions:</span> {user?.client?.dietaryRestrictions?.join(", ") || "None"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meal Plans Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              My Meal Plans
            </CardTitle>
            <CardDescription>
              View meal plans created by your fitness trainer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mealPlansLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : mealPlans && mealPlans.length > 0 ? (
              <div className="space-y-6">
                {mealPlans.map((plan: any) => (
                  <div key={plan.id} className="border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{plan.planName}</h3>
                        <p className="text-slate-600">{plan.description}</p>
                      </div>
                      <Badge variant={plan.isActive ? "default" : "secondary"}>
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Goal</p>
                          <p className="text-sm text-slate-600">{plan.fitnessGoal}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Duration</p>
                          <p className="text-sm text-slate-600">{plan.days} days</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-sm font-medium">Meals/Day</p>
                          <p className="text-sm text-slate-600">{plan.mealsPerDay}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-600" />
                        <div>
                          <p className="text-sm font-medium">Daily Calories</p>
                          <p className="text-sm text-slate-600">{plan.dailyCalorieTarget}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium text-slate-900 mb-3">Recent Meals</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {plan.mealsData?.slice(0, 6).map((meal: any, index: number) => (
                          <div key={index} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                Day {meal.day} - {meal.mealType}
                              </Badge>
                              <span className="text-xs text-slate-600">{meal.recipe?.caloriesKcal} cal</span>
                            </div>
                            <h5 className="font-medium text-sm text-slate-900">{meal.recipe?.name}</h5>
                            <p className="text-xs text-slate-600 mt-1">
                              {meal.recipe?.prepTimeMinutes}min prep • {meal.recipe?.servings} serving{meal.recipe?.servings !== 1 ? 's' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <p className="text-sm text-slate-600">
                        Created: {new Date(plan.createdAt).toLocaleDateString()}
                      </p>
                      <Button size="sm">View Full Plan</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No meal plans yet</h3>
                <p className="text-slate-600 mb-4">
                  Your fitness trainer will create personalized meal plans for you. They will appear here once available.
                </p>
                <p className="text-sm text-slate-500">
                  Contact your trainer to get started with your nutrition plan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}