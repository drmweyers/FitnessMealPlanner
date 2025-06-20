/**
 * Trainer Dashboard Page
 * 
 * Dashboard for fitness trainers to manage their clients and create meal plans.
 * Provides client management, meal plan creation, and assignment capabilities.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, PlusCircle, Calendar, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Client {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface MealPlan {
  id: string;
  data: any;
  assignedTo: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function TrainerDashboard() {
  const { toast } = useToast();
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [planFormData, setPlanFormData] = useState({
    planName: "",
    fitnessGoal: "",
    dailyCalorieTarget: "",
    days: "7",
    mealsPerDay: "3",
    description: ""
  });

  // Fetch trainer's clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/trainer/clients"],
  });

  // Fetch trainer's meal plans
  const { data: mealPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["/api/trainer/meal-plans"],
  });

  // Create meal plan mutation
  const createMealPlan = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/trainer/clients/${selectedClient}/meal-plan`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/meal-plans"] });
      setIsCreatePlanOpen(false);
      setPlanFormData({
        planName: "",
        fitnessGoal: "",
        dailyCalorieTarget: "",
        days: "7",
        mealsPerDay: "3",
        description: ""
      });
      setSelectedClient("");
      toast({
        title: "Success",
        description: "Meal plan created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create meal plan",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlan = () => {
    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    createMealPlan.mutate({
      ...planFormData,
      dailyCalorieTarget: parseInt(planFormData.dailyCalorieTarget),
      days: parseInt(planFormData.days),
      mealsPerDay: parseInt(planFormData.mealsPerDay),
    });
  };

  if (clientsLoading || plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Trainer Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Manage your clients and create personalized meal plans
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meal Plans Created</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mealPlans.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mealPlans.filter((plan: MealPlan) => 
                  new Date(plan.createdAt).getMonth() === new Date().getMonth()
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mb-8">
          <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <PlusCircle className="w-5 h-5 mr-2" />
                Create Meal Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Meal Plan</DialogTitle>
                <DialogDescription>
                  Create a personalized meal plan for one of your clients
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="client">Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client: Client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.firstName} {client.lastName} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="planName">Plan Name</Label>
                    <Input
                      id="planName"
                      value={planFormData.planName}
                      onChange={(e) => setPlanFormData({ ...planFormData, planName: e.target.value })}
                      placeholder="e.g., Weight Loss Plan"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fitnessGoal">Fitness Goal</Label>
                    <Select 
                      value={planFormData.fitnessGoal} 
                      onValueChange={(value) => setPlanFormData({ ...planFormData, fitnessGoal: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight_loss">Weight Loss</SelectItem>
                        <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="endurance">Endurance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="calories">Daily Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      value={planFormData.dailyCalorieTarget}
                      onChange={(e) => setPlanFormData({ ...planFormData, dailyCalorieTarget: e.target.value })}
                      placeholder="2000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="days">Duration (Days)</Label>
                    <Input
                      id="days"
                      type="number"
                      value={planFormData.days}
                      onChange={(e) => setPlanFormData({ ...planFormData, days: e.target.value })}
                      placeholder="7"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="meals">Meals per Day</Label>
                    <Input
                      id="meals"
                      type="number"
                      value={planFormData.mealsPerDay}
                      onChange={(e) => setPlanFormData({ ...planFormData, mealsPerDay: e.target.value })}
                      placeholder="3"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={planFormData.description}
                    onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                    placeholder="Any special notes or requirements..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreatePlanOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePlan} 
                  disabled={createMealPlan.isPending || !selectedClient}
                >
                  {createMealPlan.isPending ? "Creating..." : "Create Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Clients and Meal Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Clients List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Clients</CardTitle>
              <CardDescription>Manage your assigned clients</CardDescription>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No clients assigned yet</p>
              ) : (
                <div className="space-y-4">
                  {clients.map((client: Client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {client.firstName?.[0]}{client.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{client.firstName} {client.lastName}</p>
                          <p className="text-sm text-slate-500">{client.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{client.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Meal Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Meal Plans</CardTitle>
              <CardDescription>Your recently created meal plans</CardDescription>
            </CardHeader>
            <CardContent>
              {mealPlans.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No meal plans created yet</p>
              ) : (
                <div className="space-y-4">
                  {mealPlans.slice(0, 5).map((plan: MealPlan) => (
                    <div key={plan.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{plan.data.planName}</h4>
                        <Badge variant="outline">
                          {plan.data.days} days
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mb-2">
                        Goal: {plan.data.fitnessGoal?.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-400">
                        Created {new Date(plan.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}