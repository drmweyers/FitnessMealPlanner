import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { SimplePDFExportButton } from './PDFExportButton';
import { 
  Users, 
  Plus, 
  Calendar, 
  Target, 
  ChefHat, 
  Search,
  MoreVertical,
  Trash2,
  User,
  Mail,
  Clock,
  Download
} from 'lucide-react';
import type { MealPlan } from '../../shared/schema.ts';

interface Customer {
  id: string;
  email: string;
  firstAssignedAt: string;
}

interface CustomerMealPlan {
  id: string;
  customerId: string;
  trainerId: string;
  mealPlanData: MealPlan;
  assignedAt: string;
}

interface MealPlanAssignmentDialogProps {
  customerId: string;
  customerEmail: string;
  onSuccess: () => void;
}

function MealPlanAssignmentDialog({ customerId, customerEmail, onSuccess }: MealPlanAssignmentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get available generated meal plans (this would typically come from a meal plan library or recent generations)
  const { data: availableMealPlans } = useQuery<MealPlan[]>({
    queryKey: ['availableMealPlans'],
    queryFn: async () => {
      // For now, return an empty array - in a real app, this would fetch generated meal plans
      // that haven't been assigned yet or are available for assignment
      return [];
    },
    enabled: isOpen
  });

  const assignMealPlanMutation = useMutation({
    mutationFn: async (mealPlanData: MealPlan) => {
      const res = await apiRequest('POST', `/api/trainer/customers/${customerId}/meal-plans`, {
        mealPlanData
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Plan Assigned",
        description: `Successfully assigned meal plan to ${customerEmail}`,
      });
      setIsOpen(false);
      setSelectedMealPlan(null);
      queryClient.invalidateQueries({ queryKey: ['trainerCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['customerMealPlans', customerId] });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign meal plan",
        variant: "destructive",
      });
    }
  });

  const handleAssign = () => {
    if (!selectedMealPlan) {
      toast({
        title: "No Meal Plan Selected",
        description: "Please select a meal plan to assign",
        variant: "destructive",
      });
      return;
    }
    assignMealPlanMutation.mutate(selectedMealPlan);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Assign Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ChefHat className="h-5 w-5" />
            <span>Assign Meal Plan to {customerEmail}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-blue-800">
              <Target className="h-5 w-5" />
              <span className="font-medium">Quick Meal Plan Assignment</span>
            </div>
            <p className="text-sm text-blue-700 mt-2">
              To assign a meal plan, first generate one using the "Meal Plan Generator" tab, 
              then return here to assign it to this customer.
            </p>
          </div>

          {availableMealPlans && availableMealPlans.length > 0 ? (
            <div className="space-y-3">
              <Label>Select a meal plan to assign:</Label>
              <div className="grid gap-3 max-h-60 overflow-y-auto">
                {availableMealPlans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedMealPlan?.id === plan.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedMealPlan(plan)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{plan.planName}</h4>
                          <p className="text-sm text-gray-600">
                            {plan.fitnessGoal} • {plan.days} days • {plan.dailyCalorieTarget} cal/day
                          </p>
                        </div>
                        <Badge variant="outline">{plan.meals.length} meals</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChefHat className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No meal plans available for assignment.</p>
              <p className="text-sm">Generate a meal plan first using the Meal Plan Generator.</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!selectedMealPlan || assignMealPlanMutation.isPending}
            >
              {assignMealPlanMutation.isPending ? 'Assigning...' : 'Assign Meal Plan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CustomerMealPlans({ customerId, customerEmail }: { customerId: string; customerEmail: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mealPlansData, isLoading } = useQuery<{ mealPlans: CustomerMealPlan[]; total: number }>({
    queryKey: ['customerMealPlans', customerId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/customers/${customerId}/meal-plans`);
      return res.json();
    }
  });

  const removeMealPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest('DELETE', `/api/trainer/meal-plans/${planId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Plan Removed",
        description: "Successfully removed meal plan assignment",
      });
      queryClient.invalidateQueries({ queryKey: ['customerMealPlans', customerId] });
      queryClient.invalidateQueries({ queryKey: ['trainerCustomers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove meal plan",
        variant: "destructive",
      });
    }
  });

  const mealPlans = mealPlansData?.mealPlans || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-900">
          Assigned Meal Plans ({mealPlans.length})
        </h4>
        <MealPlanAssignmentDialog 
          customerId={customerId}
          customerEmail={customerEmail}
          onSuccess={() => {}}
        />
      </div>

      {mealPlans.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <ChefHat className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No meal plans assigned yet</p>
          <p className="text-sm">Click "Assign Plan" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mealPlans.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">
                      {assignment.mealPlanData.planName}
                    </h5>
                    <p className="text-sm text-gray-600 mb-2">
                      {assignment.mealPlanData.fitnessGoal?.replace('_', ' ')} • {assignment.mealPlanData.days} days
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>{assignment.mealPlanData.dailyCalorieTarget} cal/day</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Assigned {new Date(assignment.assignedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <SimplePDFExportButton
                      mealPlan={assignment}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      size="sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMealPlanMutation.mutate(assignment.id)}
                      disabled={removeMealPlanMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomerManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  const { data: customersData, isLoading, error } = useQuery<{ customers: Customer[]; total: number }>({
    queryKey: ['trainerCustomers'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/trainer/customers');
      return res.json();
    }
  });

  const customers = customersData?.customers || [];
  const filteredCustomers = customers.filter(customer => 
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <div className="text-red-600">Failed to load customers</div>
          <p className="text-sm text-red-500 mt-2">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600">
            Manage meal plan assignments for your customers
          </p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {customers.length} Customer{customers.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search customers by email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {customers.length === 0 ? 'No Customers Yet' : 'No Matching Customers'}
            </h3>
            <p className="text-gray-600">
              {customers.length === 0 
                ? 'Start by assigning meal plans to customers through the admin panel.'
                : 'Try adjusting your search terms.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedCustomer(
                  expandedCustomer === customer.id ? null : customer.id
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{customer.email}</CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          Customer since {new Date(customer.firstAssignedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                    <MoreVertical className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardHeader>
              
              {expandedCustomer === customer.id && (
                <CardContent className="border-t bg-gray-50">
                  <CustomerMealPlans 
                    customerId={customer.id}
                    customerEmail={customer.email}
                  />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}