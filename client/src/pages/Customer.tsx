import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { MealPlan } from '../../../shared/schema.ts';
import MealPlanCard from '../components/MealPlanCard';
import MealPlanModal from '../components/MealPlanModal';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/queryClient';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Search, Filter, TrendingUp, Calendar, Target, Zap, ChefHat, RotateCcw, SlidersHorizontal, Info, User, Database } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface EnhancedMealPlan extends MealPlan {
  planName: string;
  fitnessGoal: string;
  dailyCalorieTarget: number;
  totalDays: number;
  mealsPerDay: number;
  assignedAt: string;
  isActive: boolean;
  description?: string;
}

interface MealPlanResponse {
  mealPlans: EnhancedMealPlan[];
  total: number;
  summary: {
    totalPlans: number;
    activePlans: number;
    totalCalorieTargets: number;
    avgCaloriesPerDay: number;
  };
}

const fetchPersonalizedMealPlans = async (): Promise<MealPlanResponse> => {
  const res = await apiRequest('GET', '/api/meal-plan/personalized');
  const data = await res.json();
  console.log('API Response:', data); // Debug log
  return data;
};

const Customer = () => {
  const { isAuthenticated, user } = useAuth();
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fitnessGoalFilter, setFitnessGoalFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const { data: mealPlanResponse, isLoading, error } = useQuery<MealPlanResponse, Error>({
    queryKey: ['personalizedMealPlans'],
    queryFn: fetchPersonalizedMealPlans,
    enabled: isAuthenticated,
  });

  const mealPlans = mealPlanResponse?.mealPlans || [];
  const summary = mealPlanResponse?.summary;

  const filteredMealPlans = useMemo(() => {
    if (!mealPlans) return [];

    return mealPlans
      .filter((mealPlan) => {
        // Search filter
        if (searchTerm && !mealPlan.planName.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        // Fitness goal filter
        if (fitnessGoalFilter !== 'all' && mealPlan.fitnessGoal !== fitnessGoalFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
          case 'name':
            return a.planName.localeCompare(b.planName);
          case 'days':
            return b.totalDays - a.totalDays;
          case 'calories':
            return b.dailyCalorieTarget - a.dailyCalorieTarget;
          default:
            return 0;
        }
      });
  }, [mealPlans, searchTerm, fitnessGoalFilter, sortBy]);

  // Use summary from API response or calculate fallback stats
  const stats = useMemo(() => {
    if (summary) {
      return {
        totalPlans: summary.totalPlans,
        activePlans: summary.activePlans,
        avgCalories: summary.avgCaloriesPerDay,
        totalDays: mealPlans.reduce((sum, plan) => sum + plan.totalDays, 0),
        primaryGoal: mealPlans.length > 0 ? mealPlans[0].fitnessGoal : ''
      };
    }
    
    if (!mealPlans || mealPlans.length === 0) return null;
    
    const totalPlans = mealPlans.length;
    const activePlans = mealPlans.filter(plan => plan.isActive).length;
    const totalDays = mealPlans.reduce((sum, plan) => sum + plan.totalDays, 0);
    const avgCalories = Math.round(
      mealPlans.reduce((sum, plan) => sum + plan.dailyCalorieTarget, 0) / totalPlans
    );
    const mostCommonGoal = mealPlans.reduce((acc, plan) => {
      acc[plan.fitnessGoal] = (acc[plan.fitnessGoal] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const primaryGoal = Object.entries(mostCommonGoal).sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    return { totalPlans, activePlans, totalDays, avgCalories, primaryGoal };
  }, [mealPlans, summary]);

  const clearFilters = () => {
    setSearchTerm('');
    setFitnessGoalFilter('all');
    setSortBy('date');
    setShowFilters(false);
  };

  const formatGoalName = (goal: string) => {
    return goal.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Debug Information Panel
        <Card className="mb-6 border-amber-200 bg-amber-50/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Info className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-800">Debug Information</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  Development Mode
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="text-amber-700 hover:text-amber-900"
              >
                {showDebugInfo ? 'Hide' : 'Show'} Details
              </Button>
            </div>
            
            {showDebugInfo && (
              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800">User Info:</span>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 font-mono text-xs">
                      <div>Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}</div>
                      <div>User ID: {user?.id || 'Not available'}</div>
                      <div>Role: {user?.role || 'Not available'}</div>
                      <div>Email: {user?.email || 'Not available'}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800">API Status:</span>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3 font-mono text-xs">
                      <div>Loading: {isLoading ? '🔄 Yes' : '✅ Complete'}</div>
                      <div>Error: {error ? `❌ ${error.message}` : '✅ None'}</div>
                      <div>Meal Plans: {mealPlans ? `📊 ${mealPlans.length} found` : '📊 None'}</div>
                      <div>Filtered: {filteredMealPlans ? `🔍 ${filteredMealPlans.length} shown` : '🔍 None'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="font-medium text-amber-800 mb-2">💡 Troubleshooting Tips:</div>
                  <ul className="text-amber-700 space-y-1 text-xs">
                    <li>• Customer accounts only see meal plans assigned by trainers</li>
                    <li>• If you're a trainer/admin, switch to a customer account to test</li>
                    <li>• Use the Admin panel to assign meal plans to customer accounts</li>
                    <li>• Check console logs for API response details</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card> */}

        {/* Hero Header Section */}
        <div className="mb-8 lg:mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent mb-4">
              My Nutrition Journey
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Discover your personalized meal plans crafted by expert trainers to fuel your fitness goals
            </p>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90">
                <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="text-lg sm:text-xl lg:text-3xl font-bold text-slate-900 mb-1">{stats.totalPlans}</div>
                  <div className="text-xs sm:text-sm lg:text-base text-slate-600 font-medium">Active Plans</div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90">
                <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="text-lg sm:text-xl lg:text-3xl font-bold text-slate-900 mb-1">{stats.totalDays}</div>
                  <div className="text-xs sm:text-sm lg:text-base text-slate-600 font-medium">Total Days</div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90">
                <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="text-lg sm:text-xl lg:text-3xl font-bold text-slate-900 mb-1">{stats.avgCalories}</div>
                  <div className="text-xs sm:text-sm lg:text-base text-slate-600 font-medium">Avg Calories</div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/70 backdrop-blur-sm hover:bg-white/90 col-span-2 md:col-span-1">
                <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div className="text-sm sm:text-base lg:text-xl font-bold text-slate-900 mb-1 truncate">{formatGoalName(stats.primaryGoal)}</div>
                  <div className="text-xs sm:text-sm lg:text-base text-slate-600 font-medium">Primary Goal</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Enhanced Search and Filters */}
        <Card className="mb-6 sm:mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            {/* Search Bar */}
            <div className="relative mb-4 sm:mb-6">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              <Input
                placeholder="Search your meal plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base border-0 bg-slate-50/80 focus:bg-white transition-colors duration-200 rounded-lg sm:rounded-xl shadow-sm"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3 sm:gap-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 flex-shrink-0" />
                <span className="text-slate-700 font-semibold text-sm sm:text-base">Filter & Sort</span>
                {(fitnessGoalFilter !== 'all' || sortBy !== 'date' || searchTerm) && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                    {fitnessGoalFilter !== 'all' ? 1 : 0 + (sortBy !== 'date' ? 1 : 0) + (searchTerm ? 1 : 0)} active
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-slate-600 hover:text-slate-900 text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{showFilters ? 'Hide' : 'Show'} </span>Filters
                </Button>
                {(fitnessGoalFilter !== 'all' || sortBy !== 'date' || searchTerm) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-slate-600 hover:text-slate-900 text-xs sm:text-sm h-8 sm:h-9"
                  >
                    <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-slate-200">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-700">Fitness Goal</label>
                  <Select value={fitnessGoalFilter} onValueChange={setFitnessGoalFilter}>
                    <SelectTrigger className="h-10 sm:h-12 border-slate-200 focus:border-blue-400 transition-colors duration-200 text-sm">
                      <SelectValue placeholder="Select fitness goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Goals</SelectItem>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="athletic_performance">Athletic Performance</SelectItem>
                      <SelectItem value="general_health">General Health</SelectItem>
                      <SelectItem value="cutting">Cutting</SelectItem>
                      <SelectItem value="bulking">Bulking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-700">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-10 sm:h-12 border-slate-200 focus:border-blue-400 transition-colors duration-200 text-sm">
                      <SelectValue placeholder="Sort plans by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Newest First</SelectItem>
                      <SelectItem value="name">Plan Name</SelectItem>
                      <SelectItem value="days">Number of Days</SelectItem>
                      <SelectItem value="calories">Average Calories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Section */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse border-0 shadow-lg overflow-hidden">
                <div className="h-24 sm:h-32 bg-gradient-to-r from-slate-200 to-slate-300"></div>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3">
                    <div className="h-4 sm:h-5 bg-slate-200 rounded-lg"></div>
                    <div className="h-3 sm:h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="flex space-x-2">
                      <div className="h-5 sm:h-6 bg-slate-200 rounded-full w-12 sm:w-16"></div>
                      <div className="h-5 sm:h-6 bg-slate-200 rounded-full w-16 sm:w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {error && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-sm font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-800">Error Loading Meal Plans</h4>
                      <p className="text-red-600">{error.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {filteredMealPlans && filteredMealPlans.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-slate-600 font-medium">
                    Showing <span className="font-bold text-slate-900">{filteredMealPlans.length}</span> of{' '}
                    <span className="font-bold text-slate-900">{mealPlans?.length || 0}</span> meal plans
                  </p>
                  {filteredMealPlans.length !== (mealPlans?.length || 0) && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Filtered
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredMealPlans.map((mealPlan, index) => (
                    <div 
                      key={mealPlan.id} 
                      className="transform hover:scale-105 transition-all duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <MealPlanCard 
                        mealPlan={mealPlan} 
                        onClick={() => setSelectedMealPlan(mealPlan)}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              !isLoading && (
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <div className="max-w-md mx-auto">
                      <div className="relative mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <Search className="w-10 h-10 text-blue-500" />
                        </div>
                        {!(mealPlans?.length) && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                            <ChefHat className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-slate-900 mb-4">
                        {(mealPlans?.length || 0) > 0 ? 'No matching meal plans' : 'Your meal plan journey awaits!'}
                      </h3>
                      
                      <p className="text-slate-600 leading-relaxed mb-6">
                        {(mealPlans?.length || 0) > 0
                          ? 'Try adjusting your filters or search terms to discover more meal plans tailored to your needs.' 
                          : 'Your trainer is preparing amazing personalized meal plans just for you. Check back soon to start your nutrition journey!'}
                      </p>
                      
                      {(mealPlans?.length || 0) > 0 && (
                        <Button 
                          onClick={clearFilters}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </>
        )}

        {/* Meal Plan Modal */}
        {selectedMealPlan && (
          <MealPlanModal
            mealPlan={selectedMealPlan}
            onClose={() => setSelectedMealPlan(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Customer; 