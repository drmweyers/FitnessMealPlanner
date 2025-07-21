import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { MealPlan } from '../../../shared/schema';
import MealPlanCard from '../components/MealPlanCard';
import MealPlanModal from '../components/MealPlanModal';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fetchPersonalizedMealPlans = async (): Promise<MealPlan[]> => {
  const res = await apiRequest('GET', '/api/meal-plan/personalized');
  const data = await res.json();
  return data.mealPlans || []; // Ensure we always return an array
};

const Customer = () => {
  const { isAuthenticated } = useAuth();
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fitnessGoalFilter, setFitnessGoalFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const { data: mealPlans, isLoading, error } = useQuery<MealPlan[], Error>({
    queryKey: ['personalizedMealPlans'],
    queryFn: fetchPersonalizedMealPlans,
    enabled: isAuthenticated,
  });

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
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'name':
            return a.planName.localeCompare(b.planName);
          case 'days':
            return b.days - a.days;
          case 'calories':
            const aCalories = a.meals.reduce((sum, meal) => sum + meal.recipe.caloriesKcal, 0) / a.days;
            const bCalories = b.meals.reduce((sum, meal) => sum + meal.recipe.caloriesKcal, 0) / b.days;
            return bCalories - aCalories;
          default:
            return 0;
        }
      });
  }, [mealPlans, searchTerm, fitnessGoalFilter, sortBy]);

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-4">
          My Personalized Meal Plans
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Here are the meal plans assigned to you by your trainer.
        </p>
      </div>

      {/* Filters Section */}
      <div className="mb-6 sm:mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search meal plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
          <div className="flex items-center space-x-2 text-sm sm:text-base">
            <Filter className="h-4 w-4 text-slate-600" />
            <span className="text-slate-600 font-medium">Filters:</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 max-w-md">
            <Select value={fitnessGoalFilter} onValueChange={setFitnessGoalFilter}>
              <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base">
                <SelectValue placeholder="Fitness Goal" />
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

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base">
                <SelectValue placeholder="Sort By" />
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
      </div>

      {/* Content Section */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-24 sm:h-28 md:h-32 bg-slate-200 rounded-t-xl"></div>
              <CardContent className="p-3 sm:p-4">
                <div className="h-4 bg-slate-200 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {error && (
            <div className="text-red-600 p-3 sm:p-4 rounded-lg bg-red-50 mb-4 text-sm sm:text-base">
              {error.message}
            </div>
          )}

          {filteredMealPlans && filteredMealPlans.length > 0 ? (
            <>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                Showing {filteredMealPlans.length} of {mealPlans?.length} meal plans
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {filteredMealPlans.map((mealPlan) => (
                  <MealPlanCard 
                    key={mealPlan.id} 
                    mealPlan={mealPlan} 
                    onClick={() => setSelectedMealPlan(mealPlan)}
                  />
                ))}
              </div>
            </>
          ) : (
            !isLoading && (
              <div className="text-center py-12 sm:py-16">
                <div className="max-w-md mx-auto">
                  <div className="mb-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-medium text-slate-900 mb-2">
                    {mealPlans?.length ? 'No matching meal plans' : 'No meal plans yet'}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500">
                    {mealPlans?.length 
                      ? 'Try adjusting your filters to see more results.' 
                      : 'Your trainer hasn\'t assigned any meal plans to you yet. Check back soon!'}
                  </p>
                  {mealPlans?.length > 0 && (
                    <Button 
                      onClick={() => {
                        setSearchTerm('');
                        setFitnessGoalFilter('all');
                        setSortBy('date');
                      }}
                      variant="outline"
                      className="mt-4 text-sm sm:text-base"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
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
  );
};

export default Customer; 