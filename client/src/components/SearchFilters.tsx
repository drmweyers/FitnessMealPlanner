import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { RecipeFilter } from "@shared/schema";

interface SearchFiltersProps {
  filters: RecipeFilter;
  onFilterChange: (filters: Partial<RecipeFilter>) => void;
}

export default function SearchFilters({ filters, onFilterChange }: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearchChange = (value: string) => {
    onFilterChange({ search: value || undefined });
  };

  return (
    <Card className="p-3 sm:p-4 lg:p-6 mb-6 sm:mb-8 shadow-sm border-0 ring-1 ring-slate-200">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <i className="fas fa-search absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm"></i>
            <Input
              type="text"
              placeholder="Search recipes by name or ingredients..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base"
            />
          </div>
        </div>
        
        {/* Filter Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="lg:w-auto w-full text-sm sm:text-base py-2 sm:py-3 h-11 sm:h-12"
        >
          <i className="fas fa-filter mr-2"></i>
          <span className="hidden sm:inline">Advanced Filters</span>
          <span className="sm:hidden">Filters</span>
          {showAdvanced ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200">
          {/* Basic Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Meal Type Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                Meal Type
              </label>
              <Select
                value={filters.mealType || 'all'}
                onValueChange={(value) => onFilterChange({ mealType: value === 'all' ? undefined : value })}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder="All Meals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Meals</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dietary Tags Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                Dietary
              </label>
              <Select
                value={filters.dietaryTag || 'all'}
                onValueChange={(value) => onFilterChange({ dietaryTag: value === 'all' ? undefined : value })}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder="All Diets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Diets</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="keto">Keto</SelectItem>
                  <SelectItem value="paleo">Paleo</SelectItem>
                  <SelectItem value="gluten-free">Gluten Free</SelectItem>
                  <SelectItem value="low-carb">Low Carb</SelectItem>
                  <SelectItem value="high-protein">High Protein</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prep Time Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                Max Prep Time
              </label>
              <Select
                value={filters.maxPrepTime?.toString() || 'all'}
                onValueChange={(value) => onFilterChange({ maxPrepTime: value === 'all' ? undefined : parseInt(value) })}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder="Any Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Time</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calories Range Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                Calories Range
              </label>
              <Select
                value={filters.maxCalories?.toString() || 'all'}
                onValueChange={(value) => onFilterChange({ maxCalories: value === 'all' ? undefined : parseInt(value) })}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder="Any Amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Amount</SelectItem>
                  <SelectItem value="300">Under 300</SelectItem>
                  <SelectItem value="500">Under 500</SelectItem>
                  <SelectItem value="800">Under 800</SelectItem>
                  <SelectItem value="1200">Under 1200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Macro Nutrients Section */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200">
            <h4 className="text-xs sm:text-sm font-medium text-slate-700 mb-3 sm:mb-4">
              Macro Nutrients (per serving)
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Protein Filters */}
              <div className="space-y-3">
                <h5 className="text-xs sm:text-sm font-medium text-slate-600">
                  Protein (g)
                </h5>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Min</label>
                    <Select
                      value={filters.minProtein?.toString() || 'all'}
                      onValueChange={(value) => onFilterChange({ minProtein: value === 'all' ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="10">10g+</SelectItem>
                        <SelectItem value="20">20g+</SelectItem>
                        <SelectItem value="30">30g+</SelectItem>
                        <SelectItem value="40">40g+</SelectItem>
                        <SelectItem value="50">50g+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Max</label>
                    <Select
                      value={filters.maxProtein?.toString() || 'all'}
                      onValueChange={(value) => onFilterChange({ maxProtein: value === 'all' ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="20">Under 20g</SelectItem>
                        <SelectItem value="30">Under 30g</SelectItem>
                        <SelectItem value="40">Under 40g</SelectItem>
                        <SelectItem value="50">Under 50g</SelectItem>
                        <SelectItem value="60">Under 60g</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Carbohydrates Filters */}
              <div className="space-y-3">
                <h5 className="text-xs sm:text-sm font-medium text-slate-600">
                  Carbohydrates (g)
                </h5>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Min</label>
                    <Select
                      value={filters.minCarbs?.toString() || 'all'}
                      onValueChange={(value) => onFilterChange({ minCarbs: value === 'all' ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="5">5g+</SelectItem>
                        <SelectItem value="15">15g+</SelectItem>
                        <SelectItem value="25">25g+</SelectItem>
                        <SelectItem value="35">35g+</SelectItem>
                        <SelectItem value="45">45g+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Max</label>
                    <Select
                      value={filters.maxCarbs?.toString() || 'all'}
                      onValueChange={(value) => onFilterChange({ maxCarbs: value === 'all' ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="10">Under 10g</SelectItem>
                        <SelectItem value="20">Under 20g</SelectItem>
                        <SelectItem value="30">Under 30g</SelectItem>
                        <SelectItem value="40">Under 40g</SelectItem>
                        <SelectItem value="50">Under 50g</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Fat Filters */}
              <div className="space-y-3">
                <h5 className="text-xs sm:text-sm font-medium text-slate-600">
                  Fat (g)
                </h5>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Min</label>
                    <Select
                      value={filters.minFat?.toString() || 'all'}
                      onValueChange={(value) => onFilterChange({ minFat: value === 'all' ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="5">5g+</SelectItem>
                        <SelectItem value="10">10g+</SelectItem>
                        <SelectItem value="15">15g+</SelectItem>
                        <SelectItem value="20">20g+</SelectItem>
                        <SelectItem value="25">25g+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Max</label>
                    <Select
                      value={filters.maxFat?.toString() || 'all'}
                      onValueChange={(value) => onFilterChange({ maxFat: value === 'all' ? undefined : parseInt(value) })}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="10">Under 10g</SelectItem>
                        <SelectItem value="15">Under 15g</SelectItem>
                        <SelectItem value="20">Under 20g</SelectItem>
                        <SelectItem value="25">Under 25g</SelectItem>
                        <SelectItem value="30">Under 30g</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 sm:mt-6 flex justify-center sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onFilterChange({ 
                search: undefined,
                mealType: undefined,
                dietaryTag: undefined,
                maxPrepTime: undefined,
                maxCalories: undefined,
                minCalories: undefined,
                minProtein: undefined,
                maxProtein: undefined,
                minCarbs: undefined,
                maxCarbs: undefined,
                minFat: undefined,
                maxFat: undefined,
              })}
              className="text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto"
            >
              <i className="fas fa-times mr-2"></i>
              Clear All Filters
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
