import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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
import type { TrainerMealPlanWithAssignments, CustomerMealPlan } from '@shared/schema';

export default function TrainerMealPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<CustomerMealPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ['/api/trainer/meal-plans'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/trainer/meal-plans');
      return response.json();
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
                          onClick={() => window.location.href = `/trainer/meal-plans/${plan.id}/assign`}
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
    </div>
  );
}