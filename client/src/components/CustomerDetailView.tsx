import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { SimplePDFExportButton } from './PDFExportButton';
import MealPlanGenerator from './MealPlanGenerator';
import MealPlanModal from './MealPlanModal';
import {
  User,
  Target,
  ChefHat,
  TrendingUp,
  Scale,
  Heart,
  Activity,
  Plus,
  ArrowLeft,
  Zap
} from 'lucide-react';
import type { MealPlan, CustomerMealPlan } from '@shared/schema';
import { formatDateSafe } from '../utils/dateUtils';

interface Customer {
  id: string;
  email: string;
  firstAssignedAt: string;
}

interface ProgressMeasurement {
  id: string;
  customerId: string;
  measurementDate: string;
  weightKg?: string;
  weightLbs?: string;
  bodyFatPercentage?: string;
  waistCm?: string;
  chestCm?: string;
  hipsCm?: string;
  notes?: string;
  createdAt: string;
}

interface CustomerGoal {
  id: string;
  customerId: string;
  goalType: string;
  goalName: string;
  description?: string;
  targetValue: string;
  currentValue?: string;
  targetUnit: string;
  progressPercentage: number;
  status: 'active' | 'achieved' | 'paused';
  startDate: string;
  targetDate?: string;
  achievedDate?: string;
}

interface CustomerDetailViewProps {
  customer: Customer;
  onBack: () => void;
}

export default function CustomerDetailView({ customer, onBack }: CustomerDetailViewProps) {
  const [showMealPlanGenerator, setShowMealPlanGenerator] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState<CustomerMealPlan | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customer's assigned meal plans
  const { data: mealPlansData, isLoading: mealPlansLoading } = useQuery<{ mealPlans: CustomerMealPlan[]; total: number }>({
    queryKey: ['customerMealPlans', customer.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/customers/${customer.id}/meal-plans`);
      return res.json();
    }
  });

  // Fetch customer's progress measurements (for trainer view)
  const { data: measurementsData, isLoading: measurementsLoading } = useQuery<{ status: string; data: ProgressMeasurement[] }>({
    queryKey: ['customerMeasurements', customer.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/customers/${customer.id}/measurements`);
      return res.json();
    }
  });

  // Fetch customer's goals (for trainer view)
  const { data: goalsData, isLoading: goalsLoading } = useQuery<{ status: string; data: CustomerGoal[] }>({
    queryKey: ['customerGoals', customer.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/customers/${customer.id}/goals`);
      return res.json();
    }
  });

  const mealPlans = mealPlansData?.mealPlans || [];
  const measurements = measurementsData?.data || [];
  const goals = goalsData?.data || [];
  const latestMeasurement = measurements[0]; // Assuming sorted by date desc

  // Get customer health metrics summary
  const getHealthMetrics = () => {
    if (!latestMeasurement) return undefined;
    
    return {
      weight: latestMeasurement.weightLbs ? `${latestMeasurement.weightLbs} lbs` :
              latestMeasurement.weightKg ? `${latestMeasurement.weightKg} kg` : 'Not recorded',
      bodyFat: latestMeasurement.bodyFatPercentage ? `${latestMeasurement.bodyFatPercentage}%` : 'Not recorded',
      waist: latestMeasurement.waistCm ? `${latestMeasurement.waistCm} cm` : 'Not recorded',
      lastUpdated: formatDateSafe(latestMeasurement.measurementDate)
    };
  };

  const healthMetrics = getHealthMetrics();

  // Handle meal plan creation with customer context
  const handleCreateMealPlan = () => {
    // Set customer context for meal plan generator
    const customerContext = {
      customerId: customer.id,
      customerEmail: customer.email,
      healthMetrics,
      goals: goals.filter(g => g.status === 'active'),
      recentMeasurements: measurements.slice(0, 3)
    };
    
    // Store context for meal plan generator
    sessionStorage.setItem('customerContext', JSON.stringify(customerContext));
    setShowMealPlanGenerator(true);
  };

  const handleMealPlanCreated = (mealPlan: MealPlan) => {
    // Auto-assign the new meal plan to this customer
    assignMealToCustomer(mealPlan);
    setShowMealPlanGenerator(false);
    sessionStorage.removeItem('customerContext');
  };

  // Mutation to assign meal plan to customer
  const assignMealPlanMutation = useMutation({
    mutationFn: async (mealPlanData: MealPlan) => {
      const res = await apiRequest('POST', `/api/trainer/customers/${customer.id}/meal-plans`, {
        mealPlanData
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Plan Created & Assigned",
        description: `Successfully created and assigned a personalized meal plan to ${customer.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ['customerMealPlans', customer.id] });
      queryClient.invalidateQueries({ queryKey: ['trainerCustomers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign meal plan",
        variant: "destructive",
      });
    }
  });

  const assignMealToCustomer = (mealPlan: MealPlan) => {
    assignMealPlanMutation.mutate(mealPlan);
  };

  if (showMealPlanGenerator) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => setShowMealPlanGenerator(false)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {customer.email}</span>
          </Button>
          <div>
            <h2 className="text-xl font-bold">Create Meal Plan for {customer.email}</h2>
            <p className="text-sm text-gray-600">
              Use the customer's health metrics and goals below to create a personalized meal plan
            </p>
          </div>
        </div>

        {/* Customer Context Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-800">
              <User className="h-5 w-5" />
              <span>Customer Context</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {healthMetrics && (
                <>
                  <div className="text-center">
                    <Scale className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-sm font-medium">Weight</div>
                    <div className="text-lg">{healthMetrics.weight}</div>
                  </div>
                  <div className="text-center">
                    <Activity className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-sm font-medium">Body Fat</div>
                    <div className="text-lg">{healthMetrics.bodyFat}</div>
                  </div>
                  <div className="text-center">
                    <Target className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-sm font-medium">Waist</div>
                    <div className="text-lg">{healthMetrics.waist}</div>
                  </div>
                </>
              )}
              <div className="text-center">
                <Heart className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <div className="text-sm font-medium">Active Goals</div>
                <div className="text-lg">{goals.filter(g => g.status === 'active').length}</div>
              </div>
            </div>
            
            {goals.filter(g => g.status === 'active').length > 0 && (
              <div>
                <h4 className="font-medium text-blue-800 mb-2">Active Goals:</h4>
                <div className="flex flex-wrap gap-2">
                  {goals.filter(g => g.status === 'active').map(goal => (
                    <Badge key={goal.id} variant="outline" className="bg-white">
                      {goal.goalName} ({goal.progressPercentage}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <MealPlanGenerator 
          onMealPlanGenerated={handleMealPlanCreated}
          customerContext={{
            customerId: customer.id,
            customerEmail: customer.email,
            healthMetrics,
            goals: goals.filter(g => g.status === 'active')
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Customers</span>
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{customer.email}</h2>
            <p className="text-gray-600">
              Customer since {formatDateSafe(customer.firstAssignedAt)}
            </p>
          </div>
        </div>
        <Button onClick={handleCreateMealPlan} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Create New Meal Plan
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="meal-plans">Meal Plans ({mealPlans.length})</TabsTrigger>
          <TabsTrigger value="health-metrics">Health Metrics</TabsTrigger>
          <TabsTrigger value="goals">Goals ({goals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <ChefHat className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{mealPlans.length}</div>
                <div className="text-sm text-gray-600">Meal Plans</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{goals.filter(g => g.status === 'active').length}</div>
                <div className="text-sm text-gray-600">Active Goals</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold">{measurements.length}</div>
                <div className="text-sm text-gray-600">Measurements</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold">
                  {goals.filter(g => g.status === 'achieved').length}
                </div>
                <div className="text-sm text-gray-600">Goals Achieved</div>
              </CardContent>
            </Card>
          </div>

          {/* Latest Health Metrics */}
          {healthMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Latest Health Metrics</span>
                  <Badge variant="outline">{healthMetrics.lastUpdated}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <Scale className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-sm font-medium text-gray-600">Weight</div>
                    <div className="text-xl font-bold">{healthMetrics.weight}</div>
                  </div>
                  <div className="text-center">
                    <Heart className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <div className="text-sm font-medium text-gray-600">Body Fat</div>
                    <div className="text-xl font-bold">{healthMetrics.bodyFat}</div>
                  </div>
                  <div className="text-center">
                    <Target className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <div className="text-sm font-medium text-gray-600">Waist</div>
                    <div className="text-xl font-bold">{healthMetrics.waist}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Meal Plans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ChefHat className="h-5 w-5" />
                  <span>Recent Meal Plans</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCreateMealPlan}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mealPlansLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : mealPlans.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ChefHat className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No meal plans assigned yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={handleCreateMealPlan}
                  >
                    Create First Meal Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mealPlans.slice(0, 3).map((assignment) => (
                    <div 
                      key={assignment.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => setSelectedMealPlan(assignment)}
                    >
                      <div className="flex-1">
                        <h5 className="font-medium hover:text-blue-600 transition-colors">{assignment.mealPlanData.planName}</h5>
                        <p className="text-sm text-gray-600">
                          Assigned {formatDateSafe(assignment.assignedAt)}
                        </p>
                      </div>
                      <SimplePDFExportButton
                        mealPlan={assignment}
                        className="text-blue-600 hover:text-blue-700"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ))}
                  {mealPlans.length > 3 && (
                    <p className="text-center text-sm text-gray-500">
                      And {mealPlans.length - 3} more meal plans...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meal-plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Assigned Meal Plans ({mealPlans.length})</h3>
            <Button onClick={handleCreateMealPlan} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Create New Plan
            </Button>
          </div>

          {mealPlansLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : mealPlans.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ChefHat className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Meal Plans Yet</h3>
                <p className="text-gray-600 mb-4">
                  Create a personalized meal plan for {customer.email} based on their health metrics and goals.
                </p>
                <Button onClick={handleCreateMealPlan} className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Meal Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {mealPlans.map((assignment) => (
                <Card 
                  key={assignment.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedMealPlan(assignment)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="text-lg font-medium text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                          {assignment.mealPlanData.planName}
                        </h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-gray-600">Goal</div>
                            <div className="text-sm font-medium">
                              {assignment.mealPlanData.fitnessGoal?.replace('_', ' ')}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Duration</div>
                            <div className="text-sm font-medium">{assignment.mealPlanData.days} days</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Calories/Day</div>
                            <div className="text-sm font-medium">{assignment.mealPlanData.dailyCalorieTarget}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Assigned</div>
                            <div className="text-sm font-medium">
                              {formatDateSafe(assignment.assignedAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <SimplePDFExportButton
                          mealPlan={assignment}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="health-metrics" className="space-y-4">
          <h3 className="text-lg font-medium">Health Metrics & Progress</h3>
          {measurementsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : measurements.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Scale className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Measurements Yet</h3>
                <p className="text-gray-600">
                  The customer hasn't recorded any measurements yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {measurements.map((measurement) => (
                <Card key={measurement.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h5 className="font-medium">
                          {formatDateSafe(measurement.measurementDate)}
                        </h5>
                        <p className="text-sm text-gray-600">
                          Recorded {formatDateSafe(measurement.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {measurement.weightLbs && (
                        <div>
                          <div className="text-sm text-gray-600">Weight</div>
                          <div className="font-medium">{measurement.weightLbs} lbs</div>
                        </div>
                      )}
                      {measurement.bodyFatPercentage && (
                        <div>
                          <div className="text-sm text-gray-600">Body Fat</div>
                          <div className="font-medium">{measurement.bodyFatPercentage}%</div>
                        </div>
                      )}
                      {measurement.waistCm && (
                        <div>
                          <div className="text-sm text-gray-600">Waist</div>
                          <div className="font-medium">{measurement.waistCm} cm</div>
                        </div>
                      )}
                      {measurement.chestCm && (
                        <div>
                          <div className="text-sm text-gray-600">Chest</div>
                          <div className="font-medium">{measurement.chestCm} cm</div>
                        </div>
                      )}
                    </div>
                    {measurement.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm text-gray-600">Notes</div>
                        <div className="text-sm">{measurement.notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <h3 className="text-lg font-medium">Customer Goals ({goals.length})</h3>
          {goalsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Goals Set</h3>
                <p className="text-gray-600">
                  The customer hasn't set any fitness goals yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <Card key={goal.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h5 className="font-medium">{goal.goalName}</h5>
                          <Badge 
                            variant={goal.status === 'achieved' ? 'default' : goal.status === 'active' ? 'secondary' : 'outline'}
                            className={
                              goal.status === 'achieved' ? 'bg-green-100 text-green-800' :
                              goal.status === 'active' ? 'bg-blue-100 text-blue-800' : ''
                            }
                          >
                            {goal.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Target</div>
                            <div className="font-medium">{goal.targetValue} {goal.targetUnit}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Current</div>
                            <div className="font-medium">{goal.currentValue || 'Not set'} {goal.targetUnit}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Progress</div>
                            <div className="font-medium">{goal.progressPercentage}%</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Target Date</div>
                            <div className="font-medium">
                              {goal.targetDate ? formatDateSafe(goal.targetDate) : 'No deadline'}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                goal.progressPercentage >= 100 ? 'bg-green-500' :
                                goal.progressPercentage >= 50 ? 'bg-blue-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Meal Plan Modal */}
      {selectedMealPlan && (
        <MealPlanModal
          mealPlan={selectedMealPlan}
          onClose={() => setSelectedMealPlan(null)}
        />
      )}
    </div>
  );
}