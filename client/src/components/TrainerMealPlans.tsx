import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, Utensils, Search, MoreVertical, Trash2, UserPlus, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import MealPlanModal from './MealPlanModal';
import type { TrainerMealPlanWithAssignments, CustomerMealPlan, User } from '@shared/schema';

interface Customer extends User {
  id: string;
  email: string;
  role: 'customer';
}

export default function TrainerMealPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<CustomerMealPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [planToAssign, setPlanToAssign] = useState<TrainerMealPlanWithAssignments | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ['/api/trainer/meal-plans'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/trainer/meal-plans');
      return response.json();
    },
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/trainer/customers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/trainer/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      return data.customers || [];
    },
  });

  const deleteMealPlan = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest('DELETE', `/api/trainer/meal-plans/${planId}`);
      if (!response.ok) throw new Error('Failed to delete meal plan');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Meal Plan Deleted',
        description: 'The meal plan has been removed from your library.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/meal-plans'] });
      setPlanToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const assignMealPlan = useMutation({
    mutationFn: async ({ planId, customerId }: { planId: string; customerId: string }) => {
      const response = await apiRequest('POST', `/api/trainer/meal-plans/${planId}/assign`, {
        customerId,
      });
      if (!response.ok) throw new Error('Failed to assign meal plan');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Meal Plan Assigned',
        description: 'The meal plan has been successfully assigned to the customer.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/customers'] });
      setPlanToAssign(null);
      setSelectedCustomers([]);
    },
    onError: (error: Error) => {
      toast({
        title: 'Assignment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredPlans = mealPlans?.mealPlans?.filter((plan: TrainerMealPlanWithAssignments) => {
    const searchLower = searchTerm.toLowerCase();
    const planData = plan.mealPlanData as any;
    return (
      planData.planName?.toLowerCase().includes(searchLower) ||
      planData.fitnessGoal?.toLowerCase().includes(searchLower) ||
      planData.description?.toLowerCase().includes(searchLower) ||
      plan.notes?.toLowerCase().includes(searchLower) ||
      plan.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
    );
  }) || [];

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleViewPlan = (plan: TrainerMealPlanWithAssignments) => {
    // Convert to CustomerMealPlan format for the modal
    const customerPlan: CustomerMealPlan = {
      id: plan.id,
      customerId: user?.id || '',
      trainerId: plan.trainerId,
      mealPlanData: plan.mealPlanData,
      assignedAt: plan.createdAt,
    };
    setSelectedPlan(customerPlan);
  };

  const handleAssignToPlan = (plan: TrainerMealPlanWithAssignments) => {
    setPlanToAssign(plan);
    setSelectedCustomers([]);
  };

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleAssignSelected = () => {
    if (!planToAssign || selectedCustomers.length === 0) {
      toast({
        title: 'No Customer Selected',
        description: 'Please select at least one customer to assign the meal plan.',
        variant: 'default',
      });
      return;
    }

    // For now, assign to first selected customer (API only supports one at a time)
    const customerId = selectedCustomers[0];
    assignMealPlan.mutate({ planId: planToAssign.id, customerId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search meal plans by name, goal, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Meal Plans Grid */}
      {filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm
                ? 'No meal plans match your search.'
                : 'You haven\'t saved any meal plans yet. Generate a meal plan and save it to your library.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan: TrainerMealPlanWithAssignments) => {
            const planData = plan.mealPlanData as any;
            return (
              <Card key={plan.id} className="relative hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg line-clamp-1">
                        {planData.planName || 'Unnamed Plan'}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Created {formatDate(plan.createdAt || new Date())}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewPlan(plan)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleAssignToPlan(plan)}
                          className="text-blue-600"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign to Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setPlanToDelete(plan.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Plan Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Utensils className="h-4 w-4" />
                      <span>{planData.days} days, {planData.mealsPerDay} meals/day</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{planData.dailyCalorieTarget} cal/day</span>
                    </div>
                    {plan.assignmentCount !== undefined && plan.assignmentCount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>Assigned to {plan.assignmentCount} customer{plan.assignmentCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {plan.tags && plan.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {plan.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Fitness Goal */}
                  <Badge variant="outline" className="w-fit">
                    {planData.fitnessGoal?.replace('_', ' ') || 'General'}
                  </Badge>

                  {/* Template Badge */}
                  {plan.isTemplate && (
                    <Badge className="absolute top-2 right-2">
                      Template
                    </Badge>
                  )}

                  {/* Notes Preview */}
                  {plan.notes && (
                    <p className="text-sm text-gray-600 line-clamp-2 italic">
                      "{plan.notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Meal Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this meal plan? This action cannot be undone.
              Any assignments to customers will also be removed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setPlanToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => planToDelete && deleteMealPlan.mutate(planToDelete)}
              disabled={deleteMealPlan.isPending}
            >
              {deleteMealPlan.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meal Plan Modal */}
      {selectedPlan && (
        <MealPlanModal
          mealPlan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      )}

      {/* Assignment Modal */}
      <Dialog open={!!planToAssign} onOpenChange={() => setPlanToAssign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Meal Plan to Customer</DialogTitle>
            <DialogDescription>
              Select a customer to assign "{(planToAssign?.mealPlanData as any)?.planName || 'this meal plan'}" to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Customer List */}
            <ScrollArea className="h-[300px] border rounded-lg p-4">
              {isLoadingCustomers ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-slate-600">Loading customers...</span>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No customers found</p>
                  <p className="text-sm mt-1">Customers will appear here once they accept invitations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customers.map((customer: Customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleCustomerToggle(customer.id)}
                    >
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => handleCustomerToggle(customer.id)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">
                            {customer.email}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          Customer ID: {customer.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setPlanToAssign(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignSelected}
                disabled={assignMealPlan.isPending || selectedCustomers.length === 0}
                className="min-w-[120px]"
              >
                {assignMealPlan.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign ({selectedCustomers.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}