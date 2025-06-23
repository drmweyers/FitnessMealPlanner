import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, X } from 'lucide-react';

export type FilterOptions = {
  search: string;
  mealType: string;
  sortBy: string;
  dietaryRestrictions: string[];
  prepTimeRange: [number, number];
  calorieRange: [number, number];
  proteinRange: [number, number];
};

const defaultFilters: FilterOptions = {
  search: '',
  mealType: 'all',
  sortBy: 'default',
  dietaryRestrictions: [],
  prepTimeRange: [0, 180],
  calorieRange: [0, 1500],
  proteinRange: [0, 100],
};

const dietaryOptions = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Low-Carb',
  'Paleo',
];

interface RecipeFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
}

const RecipeFilters: React.FC<RecipeFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleFilterChange = (
    key: keyof FilterOptions,
    value: string | string[] | [number, number]
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleDietaryRestriction = (restriction: string) => {
    const newRestrictions = filters.dietaryRestrictions.includes(restriction)
      ? filters.dietaryRestrictions.filter((r) => r !== restriction)
      : [...filters.dietaryRestrictions, restriction];
    handleFilterChange('dietaryRestrictions', newRestrictions);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow-sm border">
      {/* Basic Filters */}
      <div className="space-y-4">
        <Input
          placeholder="Search recipes..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="w-full"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            value={filters.mealType}
            onValueChange={(value) => handleFilterChange('mealType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Meal Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meals</SelectItem>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortBy}
            onValueChange={(value) => handleFilterChange('sortBy', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="calories-asc">Calories: Low to High</SelectItem>
              <SelectItem value="calories-desc">Calories: High to Low</SelectItem>
              <SelectItem value="protein-asc">Protein: Low to High</SelectItem>
              <SelectItem value="protein-desc">Protein: High to Low</SelectItem>
              <SelectItem value="time-asc">Prep Time: Shortest to Longest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Filters */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced-filters">
          <AccordionTrigger
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="text-sm font-medium"
          >
            Advanced Filters
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            {/* Dietary Restrictions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dietary Restrictions</label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((restriction) => (
                  <Badge
                    key={restriction}
                    variant={filters.dietaryRestrictions.includes(restriction) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDietaryRestriction(restriction)}
                  >
                    {restriction}
                    {filters.dietaryRestrictions.includes(restriction) ? (
                      <X className="ml-1 h-3 w-3" />
                    ) : (
                      <Check className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preparation Time Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Preparation Time (minutes): {filters.prepTimeRange[0]} - {filters.prepTimeRange[1]}
              </label>
              <Slider
                min={0}
                max={180}
                step={5}
                value={filters.prepTimeRange}
                onValueChange={(value) => handleFilterChange('prepTimeRange', value as [number, number])}
              />
            </div>

            {/* Calorie Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Calories: {filters.calorieRange[0]} - {filters.calorieRange[1]}
              </label>
              <Slider
                min={0}
                max={1500}
                step={50}
                value={filters.calorieRange}
                onValueChange={(value) => handleFilterChange('calorieRange', value as [number, number])}
              />
            </div>

            {/* Protein Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Protein (g): {filters.proteinRange[0]} - {filters.proteinRange[1]}
              </label>
              <Slider
                min={0}
                max={100}
                step={5}
                value={filters.proteinRange}
                onValueChange={(value) => handleFilterChange('proteinRange', value as [number, number])}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="text-sm"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
};

export default RecipeFilters; 