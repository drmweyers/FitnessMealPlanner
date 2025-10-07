import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import StarRating from './StarRating';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RatingFilterProps {
  minRating?: number;
  maxRating?: number;
  hasReviews?: boolean;
  sortBy?: 'rating_desc' | 'rating_asc' | 'reviews_desc' | 'recent';
  onFilterChange: (filters: {
    minRating?: number;
    maxRating?: number;
    hasReviews?: boolean;
    sortBy?: 'rating_desc' | 'rating_asc' | 'reviews_desc' | 'recent';
  }) => void;
  className?: string;
}

const SORT_OPTIONS = [
  { value: 'rating_desc', label: 'Highest Rated' },
  { value: 'rating_asc', label: 'Lowest Rated' },
  { value: 'reviews_desc', label: 'Most Reviews' },
  { value: 'recent', label: 'Recently Added' }
] as const;

export default function RatingFilter({
  minRating,
  maxRating,
  hasReviews,
  sortBy,
  onFilterChange,
  className
}: RatingFilterProps) {
  
  const handleMinRatingChange = (rating: number) => {
    const newMinRating = rating === minRating ? undefined : rating;
    onFilterChange({
      minRating: newMinRating,
      maxRating: newMinRating && maxRating && newMinRating > maxRating ? undefined : maxRating,
      hasReviews,
      sortBy
    });
  };

  const handleMaxRatingChange = (rating: number) => {
    const newMaxRating = rating === maxRating ? undefined : rating;
    onFilterChange({
      minRating: newMaxRating && minRating && minRating > newMaxRating ? undefined : minRating,
      maxRating: newMaxRating,
      hasReviews,
      sortBy
    });
  };

  const handleHasReviewsChange = (checked: boolean) => {
    onFilterChange({
      minRating,
      maxRating,
      hasReviews: checked ? true : undefined,
      sortBy
    });
  };

  const handleSortChange = (value: string) => {
    onFilterChange({
      minRating,
      maxRating,
      hasReviews,
      sortBy: value as typeof sortBy
    });
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = minRating || maxRating || hasReviews || sortBy;

  return (
    <div className={cn('space-y-4 p-4 bg-gray-50 rounded-lg border', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Rating Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Minimum Rating */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Minimum Rating</Label>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleMinRatingChange(rating)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors',
                  minRating === rating
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'hover:bg-gray-100'
                )}
              >
                <StarRating rating={rating} readonly size="sm" />
                <span>& up</span>
              </button>
            ))}
          </div>
        </div>

        {/* Maximum Rating */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Maximum Rating</Label>
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleMaxRatingChange(rating)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors',
                  maxRating === rating
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'hover:bg-gray-100'
                )}
              >
                <StarRating rating={rating} readonly size="sm" />
                <span>& down</span>
              </button>
            ))}
          </div>
        </div>

        {/* Has Reviews */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Review Options</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasReviews"
              checked={hasReviews || false}
              onCheckedChange={handleHasReviewsChange}
            />
            <Label htmlFor="hasReviews" className="text-sm cursor-pointer">
              Has written reviews
            </Label>
          </div>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Sort By</Label>
          <Select value={sortBy || ''} onValueChange={handleSortChange}>
            <SelectTrigger>
              <SelectValue placeholder="Default order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default order</SelectItem>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <span className="text-sm text-gray-600">Active filters:</span>
          
          {minRating && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <StarRating rating={minRating} readonly size="sm" />
              <span>& up</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => handleMinRatingChange(minRating)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {maxRating && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <StarRating rating={maxRating} readonly size="sm" />
              <span>& down</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => handleMaxRatingChange(maxRating)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {hasReviews && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Has reviews
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => handleHasReviewsChange(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {sortBy && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => handleSortChange('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}