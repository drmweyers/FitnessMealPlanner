import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Label } from "./ui/label";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/queryClient";
import type { Recipe, User } from "@shared/schema";

interface RecipeAssignmentProps {
  recipe: Recipe;
}

interface Customer extends User {
  id: string;
  email: string;
  role: 'customer';
  hasRecipe?: boolean;
}

const fetchCustomers = async (recipeId: string, userRole: string): Promise<Customer[]> => {
  // Use different endpoints based on user role
  const endpoint = userRole === 'admin' 
    ? `/api/admin/customers?recipeId=${recipeId}`
    : `/api/trainer/customers?recipeId=${recipeId}`;
    
  const response = await apiRequest('GET', endpoint);
  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }
  
  // Handle different response formats
  const data = await response.json();
  return userRole === 'admin' ? data : data.customers || [];
};

const assignRecipe = async (data: { recipeId: string; customerIds: string[]; userRole: string }) => {
  // Both admin and trainer use the same endpoint since it supports requireTrainerOrAdmin
  const response = await apiRequest('POST', '/api/admin/assign-recipe', {
    recipeId: data.recipeId,
    customerIds: data.customerIds
  });
  if (!response.ok) {
    throw new Error('Failed to assign recipe');
  }
  return response.json();
};

export default function RecipeAssignment({ recipe }: RecipeAssignmentProps) {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers', recipe.id, user?.role],
    queryFn: () => fetchCustomers(recipe.id, user?.role || 'admin'),
  });

  // Initialize selected customers with those who already have the recipe
  useEffect(() => {
    if (customers.length > 0) {
      setSelectedCustomers(customers.filter(c => c.hasRecipe).map(c => c.id));
    }
  }, [customers]);

  const assignMutation = useMutation({
    mutationFn: assignRecipe,
    onSuccess: (data) => {
      const title = [];
      if (data.added > 0) title.push('Recipe Assigned');
      if (data.removed > 0) title.push('Recipe Unassigned');
      
      toast({
        title: title.length > 0 ? title.join(' & ') : "No Changes Made",
        description: data.message,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['customers', recipe.id, user?.role] });
      queryClient.invalidateQueries({ queryKey: ['personalizedRecipes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to update recipe assignments.",
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

  const handleAssign = () => {
    const currentlyAssigned = customers.filter(c => c.hasRecipe).map(c => c.id);
    const hasChanges = selectedCustomers.some(id => !currentlyAssigned.includes(id)) ||
                      currentlyAssigned.some(id => !selectedCustomers.includes(id));

    if (!hasChanges) {
      toast({
        title: "No Changes Made",
        description: "Please select or deselect customers to update assignments.",
        variant: "default",
      });
      return;
    }

    assignMutation.mutate({
      recipeId: recipe.id,
      customerIds: selectedCustomers,
      userRole: user?.role || 'admin',
    });
  };

  return (
    <div className="space-y-4">
      {/* Customer Selection Header */}
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">
          Select Customers ({selectedCustomers.length} selected)
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={isLoadingCustomers}
        >
          {selectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}
        </Button>
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
                  customer.hasRecipe ? 'border-green-200 bg-green-50' : 'border-slate-200'
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
                    {customer.hasRecipe && (
                      <span className="text-green-600 text-sm">
                        <i className="fas fa-check-circle mr-1"></i>
                        Currently Assigned
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
          disabled={
            assignMutation.isPending ||
            (customers.filter(c => c.hasRecipe).length === selectedCustomers.length &&
             customers.filter(c => c.hasRecipe).every(c => selectedCustomers.includes(c.id)))
          }
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