import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Target, TrendingUp, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Goal {
  id: string;
  goalType: 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'body_fat' | 'performance' | 'other';
  goalName: string;
  description?: string;
  targetValue: string;
  targetUnit: string;
  currentValue?: string;
  startingValue?: string;
  startDate: string;
  targetDate?: string;
  achievedDate?: string;
  status: string;
  progressPercentage: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  milestones?: Milestone[];
}

interface Milestone {
  id: string;
  goalId: string;
  milestoneName: string;
  targetValue: string;
  achievedValue?: string;
  achievedDate?: string;
  createdAt: string;
}

const goalTypeOptions = [
  { value: 'weight_loss', label: 'Weight Loss', icon: TrendingUp },
  { value: 'weight_gain', label: 'Weight Gain', icon: TrendingUp },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: Target },
  { value: 'body_fat', label: 'Body Fat %', icon: Target },
  { value: 'performance', label: 'Performance', icon: Target },
  { value: 'other', label: 'Other', icon: Target },
];

const GoalsTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateValue, setUpdateValue] = useState('');
  const [formData, setFormData] = useState({
    goalType: 'weight_loss' as Goal['goalType'],
    goalName: '',
    description: '',
    targetValue: '',
    targetUnit: '',
    currentValue: '',
    startingValue: '',
    startDate: new Date().toISOString().split('T')[0],
    targetDate: '',
    notes: '',
  });

  // Fetch goals
  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await fetch('/api/progress/goals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch goals');
      const result = await response.json();
      return result.data as Goal[];
    },
  });

  // Create goal mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/progress/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...data,
          targetValue: parseFloat(data.targetValue),
          currentValue: data.currentValue ? parseFloat(data.currentValue) : undefined,
          startingValue: data.startingValue ? parseFloat(data.startingValue) : undefined,
          startDate: new Date(data.startDate).toISOString(),
          targetDate: data.targetDate ? new Date(data.targetDate).toISOString() : undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to create goal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'Goal created successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create goal',
        variant: 'destructive',
      });
    },
  });

  // Update goal progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, currentValue }: { id: string; currentValue: number }) => {
      const response = await fetch(`/api/progress/goals/${id}/progress`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ currentValue }),
      });
      if (!response.ok) throw new Error('Failed to update goal progress');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setIsUpdateDialogOpen(false);
      setUpdateValue('');
      toast({
        title: 'Success',
        description: 'Goal progress updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update goal progress',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      goalType: 'weight_loss',
      goalName: '',
      description: '',
      targetValue: '',
      targetUnit: '',
      currentValue: '',
      startingValue: '',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdateProgress = () => {
    if (selectedGoal && updateValue) {
      updateProgressMutation.mutate({
        id: selectedGoal.id,
        currentValue: parseFloat(updateValue),
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'paused':
        return <PauseCircle className="h-5 w-5 text-yellow-600" />;
      case 'abandoned':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Target className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      achieved: 'secondary',
      paused: 'outline',
      abandoned: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const activeGoals = goals?.filter((g) => g.status === 'active') || [];
  const completedGoals = goals?.filter((g) => g.status === 'achieved') || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Fitness Goals</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Set New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Set a New Goal</DialogTitle>
              <DialogDescription>
                Define a specific, measurable goal to track your progress.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="goalType">Goal Type</Label>
                <Select
                  value={formData.goalType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, goalType: value as Goal['goalType'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="goalName">Goal Name</Label>
                <Input
                  id="goalName"
                  value={formData.goalName}
                  onChange={(e) => setFormData({ ...formData, goalName: e.target.value })}
                  placeholder="e.g., Lose 20 pounds"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add more details about your goal..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetValue">Target Value</Label>
                  <Input
                    id="targetValue"
                    type="number"
                    step="0.1"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="targetUnit">Unit</Label>
                  <Input
                    id="targetUnit"
                    value={formData.targetUnit}
                    onChange={(e) => setFormData({ ...formData, targetUnit: e.target.value })}
                    placeholder="lbs, %, reps, etc."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startingValue">Starting Value</Label>
                  <Input
                    id="startingValue"
                    type="number"
                    step="0.1"
                    value={formData.startingValue}
                    onChange={(e) => setFormData({ ...formData, startingValue: e.target.value })}
                    placeholder="Current value"
                  />
                </div>
                <div>
                  <Label htmlFor="currentValue">Current Value</Label>
                  <Input
                    id="currentValue"
                    type="number"
                    step="0.1"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                    placeholder="Same as starting"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="targetDate">Target Date (Optional)</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Goals */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Active Goals ({activeGoals.length})</h4>
        {activeGoals.length > 0 ? (
          <div className="grid gap-4">
            {activeGoals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(goal.status)}
                      <div>
                        <CardTitle className="text-lg">{goal.goalName}</CardTitle>
                        <p className="text-sm text-gray-600">
                          Started {format(new Date(goal.startDate), 'MMM d, yyyy')}
                          {goal.targetDate &&
                            ` • Target: ${format(new Date(goal.targetDate), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setUpdateValue(goal.currentValue || '');
                        setIsUpdateDialogOpen(true);
                      }}
                    >
                      Update Progress
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goal.description && (
                    <p className="text-sm text-gray-600">{goal.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        Current: {goal.currentValue || goal.startingValue || '0'} {goal.targetUnit}
                      </span>
                      <span>
                        Target: {goal.targetValue} {goal.targetUnit}
                      </span>
                    </div>
                    <Progress value={goal.progressPercentage} className="h-2" />
                    <p className="text-sm text-gray-600 text-right">
                      {goal.progressPercentage}% Complete
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No active goals. Set a new goal to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700">Completed Goals ({completedGoals.length})</h4>
          <div className="grid gap-4">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="opacity-75">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(goal.status)}
                    <div>
                      <CardTitle className="text-lg">{goal.goalName}</CardTitle>
                      <p className="text-sm text-gray-600">
                        Achieved on {format(new Date(goal.achievedDate!), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Update Progress Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Goal Progress</DialogTitle>
            <DialogDescription>
              Update the current value for "{selectedGoal?.goalName}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="updateValue">
                Current Value ({selectedGoal?.targetUnit})
              </Label>
              <Input
                id="updateValue"
                type="number"
                step="0.1"
                value={updateValue}
                onChange={(e) => setUpdateValue(e.target.value)}
                placeholder="Enter current value"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUpdateDialogOpen(false);
                  setUpdateValue('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProgress}
                disabled={!updateValue || updateProgressMutation.isPending}
              >
                {updateProgressMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalsTab;