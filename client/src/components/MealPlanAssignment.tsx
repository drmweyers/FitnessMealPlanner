import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Label } from "./ui/label";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import type { MealPlan, User } from "@shared/schema";

interface MealPlanAssignmentProps {
  mealPlan: MealPlan;
}

interface Customer extends User {
  id: string;
  email: string;
  role: 'customer';
  hasMealPlan?: boolean;
}

interface MealPlanResult {
  mealPlan: MealPlan;
  nutrition: {
    total: { calories: number; protein: number; carbs: number; fat: number };
    averageDaily: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    daily: Array<{
      day: number;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
  };
  message: string;
  completed?: boolean;
  timestamp?: string;
}

const fetchCustomers = async (): Promise<Customer[]> => {
  // FIX: Use trainer endpoint (accepts both trainer and admin roles)
  console.log('[MealPlanAssignment] Fetching customers...');
  const response = await apiRequest('GET', '/api/trainer/customers');
  if (!response.ok) {
    console.error('[MealPlanAssignment] Failed to fetch customers:', response.status);
    throw new Error('Failed to fetch customers');
  }
  const data = await response.json();
  console.log('[MealPlanAssignment] Fetched customers:', data.customers?.length || 0);
  // API returns { customers: Customer[], total: number }
  return data.customers || [];
};

const assignMealPlan = async (data: { mealPlanData: MealPlan; customerIds: string[] }) => {
  // FIX: Use new bulk assignment endpoint (accepts both trainer and admin roles)
  console.log('[MealPlanAssignment] Assigning to', data.customerIds.length, 'customers');
  const response = await apiRequest('POST', '/api/trainer/assign-meal-plan-bulk', data);
  if (!response.ok) {
    console.error('[MealPlanAssignment] Assignment failed:', response.status);
    throw new Error('Failed to assign meal plan');
  }
  const result = await response.json();
  console.log('[MealPlanAssignment] Assignment SUCCESS:', result);
  return result;
};

export default function MealPlanAssignment({ mealPlan }: MealPlanAssignmentProps) {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  });

  // Initialize with no customers selected for new meal plan assignments
  useEffect(() => {
    setSelectedCustomers([]);
  }, [customers]);

  const assignMutation = useMutation({
    mutationFn: assignMealPlan,
    onSuccess: (data) => {
      toast({
        title: "Meal Plan Assigned Successfully",
        description: data.message,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['personalizedMealPlans'] });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to update meal plan assignments.",
        variant: "destructive",
      });
    },
  });

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleSelectAvailableOnly = () => {
    const availableCustomers = customers.filter(c => !c.hasMealPlan);
    setSelectedCustomers(availableCustomers.map(c => c.id));
  };

  const handleAssign = () => {
    if (selectedCustomers.length === 0) {
      toast({
        title: "No Customers Selected",
        description: "Please select at least one customer to assign the meal plan.",
        variant: "default",
      });
      return;
    }

    // Check if any selected customers already have meal plans
    const customersWithExistingPlans = selectedCustomers.filter(customerId => {
      const customer = customers.find(c => c.id === customerId);
      return customer?.hasMealPlan;
    });

    if (customersWithExistingPlans.length > 0) {
      const customerEmails = customersWithExistingPlans.map(customerId => {
        const customer = customers.find(c => c.id === customerId);
        return customer?.email;
      }).join(', ');

      toast({
        title: "Warning: Existing Meal Plans",
        description: `${customersWithExistingPlans.length} customer(s) (${customerEmails}) already have meal plans. This will replace their existing assignments.`,
        variant: "default",
      });
    }

    assignMutation.mutate({
      mealPlanData: mealPlan,
      customerIds: selectedCustomers,
    });
  };

  return (
    <div className="space-y-4">
      {/* Customer Selection Header */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">
            Select Customers ({selectedCustomers.length} selected)
          </Label>
          {customers.length > 0 && (
            <div className="text-sm text-slate-600 mt-1">
              {customers.filter(c => !c.hasMealPlan).length} available, {customers.filter(c => c.hasMealPlan).length} with existing plans
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAvailableOnly}
            disabled={isLoadingCustomers || customers.filter(c => !c.hasMealPlan).length === 0}
          >
            Select Available Only
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={isLoadingCustomers}
          >
            {selectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
      </div>

      {/* Customer List */}
      <ScrollArea className="h-[300px] border rounded-lg p-4">
        {isLoadingCustomers ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-slate-600">Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <i className="fas fa-users text-4xl mb-4 opacity-50"></i>
            <p>No customers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  customer.hasMealPlan ? 'border-amber-200 bg-amber-50' : 'border-slate-200'
                } hover:bg-slate-50 cursor-pointer transition-colors`}
                onClick={() => handleCustomerToggle(customer.id)}
              >
                <Checkbox
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={() => handleCustomerToggle(customer.id)}
                  className="h-5 w-5"
                />
                <div className="flex-1">
                                      <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-user text-slate-400"></i>
                        <span className="font-medium text-slate-900">
                          {customer.email}
                        </span>
                      </div>
                      {customer.hasMealPlan && (
                        <span className="text-amber-600 text-sm">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          Has Meal Plan
                        </span>
                      )}
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
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleAssign}
          disabled={assignMutation.isPending}
          className="min-w-[120px]"
        >
          {assignMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Updating...
            </>
          ) : (
            <>
              <i className="fas fa-check mr-2"></i>
              Update Assignments
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 