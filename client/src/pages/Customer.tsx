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
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Personalized Meal Plans</h1>
      <p className="mb-8">Here are the meal plans assigned to you by your trainer.</p>

      {/* Filters Section */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search meal plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-600" />
            <span className="text-sm text-slate-600">Filters:</span>
          </div>
          
          <Select value={fitnessGoalFilter} onValueChange={setFitnessGoalFilter}>
            <SelectTrigger className="w-48">
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
            <SelectTrigger className="w-48">
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-32 bg-slate-200 rounded-t-xl"></div>
              <CardContent className="p-4">
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
            <div className="text-red-500 p-4 rounded-lg bg-red-50 mb-4">
              {error.message}
            </div>
          )}

          {filteredMealPlans && filteredMealPlans.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Showing {filteredMealPlans.length} of {mealPlans?.length} meal plans
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {mealPlans?.length ? 'No meal plans match your filters.' : 'You have no personalized meal plans yet.'}
                </p>
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