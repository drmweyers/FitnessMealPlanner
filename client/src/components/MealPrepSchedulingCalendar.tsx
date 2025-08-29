import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  ChefHat,
  Bell,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  ShoppingCart,
  Timer,
  Users,
  MapPin,
  Utensils
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isToday, isBefore, addWeeks, subWeeks } from 'date-fns';

interface MealPrepTask {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime: string;
  category: 'prep' | 'cook' | 'batch' | 'shopping';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  recipeIds?: string[];
  estimatedTime: number; // minutes
  servings?: number;
  location?: string;
  reminders: number[]; // minutes before start
  tags: string[];
  notes?: string;
}

interface Recipe {
  id: string;
  name: string;
  prepTime: number;
  cookTime: number;
  servings: number;
}

interface MealPrepSchedulingCalendarProps {
  userId: string;
  recipes?: Recipe[];
  onTaskCreate?: (task: Omit<MealPrepTask, 'id'>) => Promise<void>;
  onTaskUpdate?: (taskId: string, updates: Partial<MealPrepTask>) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  className?: string;
}

const CATEGORY_CONFIG = {
  prep: { label: 'Meal Prep', color: 'bg-blue-100 text-blue-800', icon: ChefHat },
  cook: { label: 'Cooking', color: 'bg-orange-100 text-orange-800', icon: Utensils },
  batch: { label: 'Batch Cook', color: 'bg-green-100 text-green-800', icon: Users },
  shopping: { label: 'Shopping', color: 'bg-purple-100 text-purple-800', icon: ShoppingCart }
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-red-100 text-red-800' }
};

const MealPrepSchedulingCalendar: React.FC<MealPrepSchedulingCalendarProps> = ({
  userId,
  recipes = [],
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  className = ''
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [tasks, setTasks] = useState<MealPrepTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MealPrepTask | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const { toast } = useToast();

  const [newTask, setNewTask] = useState<Omit<MealPrepTask, 'id'>>({
    title: '',
    description: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    category: 'prep',
    priority: 'medium',
    status: 'pending',
    estimatedTime: 60,
    reminders: [30, 10],
    tags: [],
    notes: ''
  });

  // Generate sample data
  useEffect(() => {
    const generateSampleTasks = () => {
      const sampleTasks: MealPrepTask[] = [];
      const today = new Date();
      
      // Generate tasks for the next 14 days
      for (let i = 0; i < 14; i++) {
        const date = addDays(today, i);
        
        // Add 1-3 random tasks per day
        const taskCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < taskCount; j++) {
          const startHour = 8 + Math.floor(Math.random() * 8); // 8 AM to 4 PM
          const duration = 30 + Math.floor(Math.random() * 90); // 30-120 minutes
          
          const categories: (keyof typeof CATEGORY_CONFIG)[] = ['prep', 'cook', 'batch', 'shopping'];
          const priorities: (keyof typeof PRIORITY_CONFIG)[] = ['low', 'medium', 'high'];
          const statuses: MealPrepTask['status'][] = ['pending', 'in_progress', 'completed'];
          
          const category = categories[Math.floor(Math.random() * categories.length)];
          const priority = priorities[Math.floor(Math.random() * priorities.length)];
          const status = i < 3 ? statuses[Math.floor(Math.random() * statuses.length)] : 'pending';
          
          const taskTitles = {
            prep: ['Wash and chop vegetables', 'Prepare protein portions', 'Make overnight oats', 'Prep snack containers'],
            cook: ['Cook quinoa batch', 'Roast vegetables', 'Grill chicken breasts', 'Make soup base'],
            batch: ['Sunday meal prep', 'Weekly protein prep', 'Snack preparation', 'Lunch containers'],
            shopping: ['Grocery shopping', 'Farmers market visit', 'Protein shopping', 'Supplement restock']
          };
          
          sampleTasks.push({
            id: `task-${i}-${j}`,
            title: taskTitles[category][Math.floor(Math.random() * taskTitles[category].length)],
            description: 'Sample meal prep task for demonstration',
            date,
            startTime: `${startHour.toString().padStart(2, '0')}:00`,
            endTime: `${Math.floor(startHour + duration / 60).toString().padStart(2, '0')}:${((duration % 60)).toString().padStart(2, '0')}`,
            category,
            priority,
            status,
            estimatedTime: duration,
            servings: Math.floor(Math.random() * 6) + 2,
            reminders: [30, 10],
            tags: ['meal-prep', category],
            notes: 'Auto-generated task for demo purposes'
          });
        }
      }
      
      setTasks(sampleTasks);
    };

    generateSampleTasks();
  }, []);

  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekTasks = useMemo(() => {
    return tasks.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate >= weekStart && taskDate <= weekEnd;
    });
  }, [tasks, weekStart, weekEnd]);

  const getTasksForDay = useCallback((date: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.date), date))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [tasks]);

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: 'Error',
        description: 'Task title is required',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const taskToCreate = {
        ...newTask,
        date: selectedDate || newTask.date,
        id: `task-${Date.now()}`
      };

      // Add to local state immediately for better UX
      setTasks(prev => [...prev, taskToCreate as MealPrepTask]);
      
      // Call external handler if provided
      if (onTaskCreate) {
        await onTaskCreate(taskToCreate);
      }

      toast({
        title: 'Success',
        description: 'Meal prep task created successfully',
      });

      // Reset form
      setNewTask({
        title: '',
        description: '',
        date: selectedDate || new Date(),
        startTime: '09:00',
        endTime: '10:00',
        category: 'prep',
        priority: 'medium',
        status: 'pending',
        estimatedTime: 60,
        reminders: [30, 10],
        tags: [],
        notes: ''
      });
      
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: MealPrepTask['status']) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));

    if (onTaskUpdate) {
      try {
        await onTaskUpdate(taskId, { status: newStatus });
      } catch (error) {
        // Revert on error
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: task.status } : task
        ));
        toast({
          title: 'Error',
          description: 'Failed to update task',
          variant: 'destructive'
        });
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    
    if (onTaskDelete) {
      try {
        await onTaskDelete(taskId);
        toast({
          title: 'Success',
          description: 'Task deleted successfully',
        });
      } catch (error) {
        toast({
          title: 'Error', 
          description: 'Failed to delete task',
          variant: 'destructive'
        });
      }
    }
  };

  const getStatusIcon = (status: MealPrepTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Timer className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const TaskCard: React.FC<{ task: MealPrepTask }> = ({ task }) => {
    const categoryConfig = CATEGORY_CONFIG[task.category];
    const priorityConfig = PRIORITY_CONFIG[task.priority];
    
    return (
      <Card className="mb-2 cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <categoryConfig.icon className="h-4 w-4" />
                <span className="font-medium text-sm truncate">{task.title}</span>
                {getStatusIcon(task.status)}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                <span>{task.startTime} - {task.endTime}</span>
                <span>({task.estimatedTime}min)</span>
              </div>
              
              <div className="flex items-center gap-1 flex-wrap">
                <Badge className={`text-xs ${categoryConfig.color}`}>
                  {categoryConfig.label}
                </Badge>
                <Badge className={`text-xs ${priorityConfig.color}`}>
                  {priorityConfig.label}
                </Badge>
                {task.servings && (
                  <Badge variant="outline" className="text-xs">
                    {task.servings} servings
                  </Badge>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}>
                  <Timer className="mr-2 h-4 w-4" />
                  Start Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateTaskStatus(task.id, 'completed')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Complete
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setSelectedTask(task);
                  setIsEditDialogOpen(true);
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const duplicated = { ...task, id: `task-${Date.now()}`, status: 'pending' as const };
                  setTasks(prev => [...prev, duplicated]);
                }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  const TaskForm: React.FC<{ 
    task: Omit<MealPrepTask, 'id'>, 
    onChange: (task: Omit<MealPrepTask, 'id'>) => void 
  }> = ({ task, onChange }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title *</Label>
        <Input
          id="title"
          value={task.title}
          onChange={(e) => onChange({ ...task, title: e.target.value })}
          placeholder="e.g., Prep vegetables for the week"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={task.description}
          onChange={(e) => onChange({ ...task, description: e.target.value })}
          placeholder="Additional details about the task..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={task.category} onValueChange={(value: any) => onChange({ ...task, category: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <config.icon className="h-4 w-4" />
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={task.priority} onValueChange={(value: any) => onChange({ ...task, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-time">Start Time</Label>
          <Input
            id="start-time"
            type="time"
            value={task.startTime}
            onChange={(e) => onChange({ ...task, startTime: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="end-time">End Time</Label>
          <Input
            id="end-time"
            type="time"
            value={task.endTime}
            onChange={(e) => onChange({ ...task, endTime: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="servings">Servings</Label>
          <Input
            id="servings"
            type="number"
            value={task.servings || ''}
            onChange={(e) => onChange({ ...task, servings: parseInt(e.target.value) || undefined })}
            placeholder="Optional"
            min="1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={task.notes}
          onChange={(e) => onChange({ ...task, notes: e.target.value })}
          placeholder="Any additional notes or reminders..."
          rows={2}
        />
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meal Prep Calendar</h2>
          <p className="text-muted-foreground mt-1">
            Schedule and track your meal preparation tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'week' ? 'day' : 'week')}
          >
            {viewMode === 'week' ? 'Day View' : 'Week View'}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Meal Prep Task</DialogTitle>
                <DialogDescription>
                  Schedule a new meal preparation task
                </DialogDescription>
              </DialogHeader>
              <TaskForm task={newTask} onChange={setNewTask} />
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask} disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          >
            Previous Week
          </Button>
          <h3 className="text-lg font-semibold">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            Next Week
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {weekTasks.length} task{weekTasks.length !== 1 ? 's' : ''} this week
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day);
          const completedTasks = dayTasks.filter(t => t.status === 'completed').length;
          
          return (
            <Card 
              key={index} 
              className={`${isToday(day) ? 'ring-2 ring-primary' : ''} 
                         ${selectedDate && isSameDay(day, selectedDate) ? 'ring-2 ring-blue-500' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-lg font-bold ${isToday(day) ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setSelectedDate(day);
                      setNewTask(prev => ({ ...prev, date: day }));
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {dayTasks.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3" />
                    {completedTasks}/{dayTasks.length} done
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="pt-0 space-y-1 max-h-64 overflow-y-auto">
                {dayTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
                
                {dayTasks.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No tasks scheduled
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">
              {weekTasks.filter(t => t.status === 'pending').length}
            </p>
            <p className="text-sm text-muted-foreground">Pending Tasks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">
              {weekTasks.filter(t => t.status === 'in_progress').length}
            </p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">
              {weekTasks.filter(t => t.status === 'completed').length}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <ChefHat className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">
              {weekTasks.reduce((acc, task) => acc + (task.estimatedTime || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update your meal prep task
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <>
              <TaskForm 
                task={selectedTask} 
                onChange={(updated) => setSelectedTask({ ...selectedTask, ...updated })} 
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (selectedTask) {
                      setTasks(prev => prev.map(task => 
                        task.id === selectedTask.id ? selectedTask : task
                      ));
                      
                      if (onTaskUpdate) {
                        await onTaskUpdate(selectedTask.id, selectedTask);
                      }
                      
                      setIsEditDialogOpen(false);
                      setSelectedTask(null);
                      
                      toast({
                        title: 'Success',
                        description: 'Task updated successfully',
                      });
                    }
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MealPrepSchedulingCalendar;