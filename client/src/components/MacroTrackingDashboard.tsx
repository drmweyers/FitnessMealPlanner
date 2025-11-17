import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Download, 
  Settings,
  Activity,
  Zap,
  Droplets,
  Apple,
  Beef,
  Wheat,
  FlameKindling,
  Clock,
  ChefHat
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface MacroData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  mealCount: number;
}

interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MacroTrackingDashboardProps {
  userId: string;
  userRole: 'customer' | 'trainer';
  className?: string;
}

const MACRO_COLORS = {
  protein: '#22c55e',
  carbs: '#3b82f6', 
  fat: '#f59e0b',
  calories: '#ef4444'
};

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b'];

const MacroTrackingDashboard: React.FC<MacroTrackingDashboardProps> = ({
  userId,
  userRole,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [macroData, setMacroData] = useState<MacroData[]>([]);
  const [macroGoals, setMacroGoals] = useState<MacroGoals>({
    calories: 2200,
    protein: 140,
    carbs: 275,
    fat: 73
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showGoalsSetting, setShowGoalsSetting] = useState(false);
  const [tempGoals, setTempGoals] = useState<MacroGoals>(macroGoals);

  // Simulate fetching macro data
  useEffect(() => {
    const fetchMacroData = async () => {
      setIsLoading(true);
      
      // Generate sample data for the last 30 days
      const sampleData: MacroData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const calorieVariation = Math.random() * 400 - 200; // ±200 calories
        const baseCalories = macroGoals.calories + calorieVariation;
        
        sampleData.push({
          date,
          calories: Math.round(baseCalories),
          protein: Math.round(macroGoals.protein + (Math.random() * 40 - 20)),
          carbs: Math.round(macroGoals.carbs + (Math.random() * 60 - 30)),
          fat: Math.round(macroGoals.fat + (Math.random() * 20 - 10)),
          fiber: Math.round(25 + (Math.random() * 10 - 5)),
          sugar: Math.round(50 + (Math.random() * 20 - 10)),
          sodium: Math.round(2000 + (Math.random() * 600 - 300)),
          mealCount: Math.floor(Math.random() * 3) + 3 // 3-5 meals
        });
      }
      
      setMacroData(sampleData);
      setIsLoading(false);
    };

    fetchMacroData();
  }, [macroGoals]);

  // Calculate current day's data
  const todayData = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return macroData.find(d => d.date === today) || {
      date: today,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      mealCount: 0
    };
  }, [macroData]);

  // Calculate weekly averages
  const weeklyData = useMemo(() => {
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    
    const weekData = macroData.filter(d => {
      const date = new Date(d.date);
      return date >= weekStart && date <= weekEnd;
    });
    
    if (weekData.length === 0) return null;
    
    const totals = weekData.reduce((acc, day) => ({
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fat: acc.fat + day.fat,
      fiber: acc.fiber + day.fiber,
      sugar: acc.sugar + day.sugar,
      sodium: acc.sodium + day.sodium,
      mealCount: acc.mealCount + day.mealCount
    }), {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      mealCount: 0
    });
    
    const avgDays = weekData.length;
    return {
      calories: Math.round(totals.calories / avgDays),
      protein: Math.round(totals.protein / avgDays),
      carbs: Math.round(totals.carbs / avgDays),
      fat: Math.round(totals.fat / avgDays),
      fiber: Math.round(totals.fiber / avgDays),
      sugar: Math.round(totals.sugar / avgDays),
      sodium: Math.round(totals.sodium / avgDays),
      mealCount: Math.round(totals.mealCount / avgDays)
    };
  }, [macroData, selectedDate]);

  // Prepare chart data based on active tab
  const chartData = useMemo(() => {
    if (activeTab === 'daily') {
      return macroData.slice(-7).map(d => ({
        ...d,
        date: format(new Date(d.date), 'MMM dd'),
      }));
    } else if (activeTab === 'weekly') {
      // Group by weeks
      const weeks: { [key: string]: MacroData[] } = {};
      macroData.forEach(d => {
        const weekKey = format(startOfWeek(new Date(d.date)), 'yyyy-MM-dd');
        if (!weeks[weekKey]) weeks[weekKey] = [];
        weeks[weekKey].push(d);
      });
      
      return Object.entries(weeks).map(([weekStart, weekData]) => {
        const avg = weekData.reduce((acc, day) => ({
          calories: acc.calories + day.calories,
          protein: acc.protein + day.protein,
          carbs: acc.carbs + day.carbs,
          fat: acc.fat + day.fat
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        
        const days = weekData.length;
        return {
          date: `Week of ${format(new Date(weekStart), 'MMM dd')}`,
          calories: Math.round(avg.calories / days),
          protein: Math.round(avg.protein / days),
          carbs: Math.round(avg.carbs / days),
          fat: Math.round(avg.fat / days)
        };
      }).slice(-4); // Last 4 weeks
    }
    
    return macroData.slice(-30);
  }, [macroData, activeTab]);

  // Pie chart data for macro distribution
  const pieData = useMemo(() => {
    const data = activeTab === 'daily' ? todayData : (weeklyData || todayData);
    const proteinCals = data.protein * 4;
    const carbsCals = data.carbs * 4;
    const fatCals = data.fat * 9;
    const total = proteinCals + carbsCals + fatCals;
    
    return [
      { name: 'Protein', value: Math.round((proteinCals / total) * 100) || 0, color: MACRO_COLORS.protein },
      { name: 'Carbs', value: Math.round((carbsCals / total) * 100) || 0, color: MACRO_COLORS.carbs },
      { name: 'Fat', value: Math.round((fatCals / total) * 100) || 0, color: MACRO_COLORS.fat }
    ];
  }, [todayData, weeklyData, activeTab]);

  const calculateProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 70) return 'bg-red-500';
    if (percentage < 90) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const updateGoals = () => {
    setMacroGoals(tempGoals);
    setShowGoalsSetting(false);
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)', 'Sugar (g)', 'Sodium (mg)', 'Meals'],
      ...macroData.map(d => [
        d.date,
        d.calories.toString(),
        d.protein.toString(),
        d.carbs.toString(),
        d.fat.toString(),
        d.fiber.toString(),
        d.sugar.toString(),
        d.sodium.toString(),
        d.mealCount.toString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `macro-data-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentData = activeTab === 'daily' ? todayData : (weeklyData || todayData);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Macro Tracking Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Monitor your daily nutrition and macro intake
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowGoalsSetting(!showGoalsSetting)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Goals
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Goals Setting Panel */}
      {showGoalsSetting && (
        <Card>
          <CardHeader>
            <CardTitle>Set Your Macro Goals</CardTitle>
            <CardDescription>
              Adjust your daily macro and calorie targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="goal-calories">Calories</Label>
                <Input
                  id="goal-calories"
                  type="number"
                  value={tempGoals.calories}
                  onChange={(e) => setTempGoals({
                    ...tempGoals, 
                    calories: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-protein">Protein (g)</Label>
                <Input
                  id="goal-protein"
                  type="number"
                  value={tempGoals.protein}
                  onChange={(e) => setTempGoals({
                    ...tempGoals, 
                    protein: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-carbs">Carbs (g)</Label>
                <Input
                  id="goal-carbs"
                  type="number"
                  value={tempGoals.carbs}
                  onChange={(e) => setTempGoals({
                    ...tempGoals, 
                    carbs: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-fat">Fat (g)</Label>
                <Input
                  id="goal-fat"
                  type="number"
                  value={tempGoals.fat}
                  onChange={(e) => setTempGoals({
                    ...tempGoals, 
                    fat: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={updateGoals}>Save Goals</Button>
              <Button 
                variant="outline" 
                onClick={() => setShowGoalsSetting(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Period Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Daily
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Monthly
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          {/* Daily Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Calories</p>
                    <p className="text-2xl font-bold">{currentData.calories}</p>
                    <p className="text-xs text-muted-foreground">
                      Goal: {macroGoals.calories}
                    </p>
                  </div>
                  <FlameKindling className="h-8 w-8 text-red-500" />
                </div>
                <Progress 
                  value={calculateProgress(currentData.calories, macroGoals.calories)} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Protein</p>
                    <p className="text-2xl font-bold">{currentData.protein}g</p>
                    <p className="text-xs text-muted-foreground">
                      Goal: {macroGoals.protein}g
                    </p>
                  </div>
                  <Beef className="h-8 w-8 text-green-500" />
                </div>
                <Progress 
                  value={calculateProgress(currentData.protein, macroGoals.protein)} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Carbs</p>
                    <p className="text-2xl font-bold">{currentData.carbs}g</p>
                    <p className="text-xs text-muted-foreground">
                      Goal: {macroGoals.carbs}g
                    </p>
                  </div>
                  <Wheat className="h-8 w-8 text-blue-500" />
                </div>
                <Progress 
                  value={calculateProgress(currentData.carbs, macroGoals.carbs)} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fat</p>
                    <p className="text-2xl font-bold">{currentData.fat}g</p>
                    <p className="text-xs text-muted-foreground">
                      Goal: {macroGoals.fat}g
                    </p>
                  </div>
                  <Droplets className="h-8 w-8 text-yellow-500" />
                </div>
                <Progress 
                  value={calculateProgress(currentData.fat, macroGoals.fat)} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          {weeklyData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Calories</p>
                      <p className="text-2xl font-bold">{weeklyData.calories}</p>
                      <p className="text-xs text-muted-foreground">
                        This week
                      </p>
                    </div>
                    <FlameKindling className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Protein</p>
                      <p className="text-2xl font-bold">{weeklyData.protein}g</p>
                      <p className="text-xs text-muted-foreground">
                        This week
                      </p>
                    </div>
                    <Beef className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Carbs</p>
                      <p className="text-2xl font-bold">{weeklyData.carbs}g</p>
                      <p className="text-xs text-muted-foreground">
                        This week
                      </p>
                    </div>
                    <Wheat className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Fat</p>
                      <p className="text-2xl font-bold">{weeklyData.fat}g</p>
                      <p className="text-xs text-muted-foreground">
                        This week
                      </p>
                    </div>
                    <Droplets className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <div className="text-center p-8 text-muted-foreground">
            <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Monthly View Coming Soon</h3>
            <p>Get comprehensive monthly macro analysis and trends.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Macro Trends</CardTitle>
            <CardDescription>
              Track your macro intake over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="protein" 
                  stroke={MACRO_COLORS.protein}
                  strokeWidth={2}
                  name="Protein (g)"
                />
                <Line 
                  type="monotone" 
                  dataKey="carbs" 
                  stroke={MACRO_COLORS.carbs}
                  strokeWidth={2}
                  name="Carbs (g)"
                />
                <Line 
                  type="monotone" 
                  dataKey="fat" 
                  stroke={MACRO_COLORS.fat}
                  strokeWidth={2}
                  name="Fat (g)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Macro Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Macro Distribution</CardTitle>
            <CardDescription>
              {activeTab === 'daily' ? "Today's" : "Weekly average"} calorie breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">
                    {entry.name}: {entry.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Metrics</CardTitle>
          <CardDescription>
            Other important nutritional information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{currentData.fiber}g</p>
              <p className="text-sm text-muted-foreground">Fiber</p>
              <p className="text-xs text-muted-foreground mt-1">Goal: 25g</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{currentData.sugar}g</p>
              <p className="text-sm text-muted-foreground">Sugar</p>
              <p className="text-xs text-muted-foreground mt-1">Limit: 50g</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{currentData.sodium}mg</p>
              <p className="text-sm text-muted-foreground">Sodium</p>
              <p className="text-xs text-muted-foreground mt-1">Limit: 2300mg</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{currentData.mealCount}</p>
              <p className="text-sm text-muted-foreground">Meals</p>
              <p className="text-xs text-muted-foreground mt-1">Today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MacroTrackingDashboard;