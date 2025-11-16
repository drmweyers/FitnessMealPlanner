import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { RecipeRatingSummary } from '@shared/schema';

interface RatingDisplayProps {
  summary: RecipeRatingSummary;
  showDistribution?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    stars: 'w-3 h-3',
    text: 'text-xs',
    avgText: 'text-sm',
    barHeight: 'h-1'
  },
  md: {
    stars: 'w-4 h-4',
    text: 'text-sm',
    avgText: 'text-base',
    barHeight: 'h-2'
  },
  lg: {
    stars: 'w-5 h-5',
    text: 'text-base',
    avgText: 'text-lg',
    barHeight: 'h-2'
  }
};

export default function RatingDisplay({
  summary,
  showDistribution = false,
  size = 'md',
  className
}: RatingDisplayProps) {
  const config = SIZE_CONFIG[size];
  const avgRating = Number(summary.averageRating);
  const totalRatings = summary.totalRatings;
  
  // Handle case where there are no ratings
  if (totalRatings === 0) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star 
              key={star} 
              className={cn(config.stars, 'text-gray-300')}
              fill="currentColor"
            />
          ))}
        </div>
        <span className={cn('text-gray-500', config.text)}>
          No ratings yet
        </span>
      </div>
    );
  }

  const fullStars = Math.floor(avgRating);
  const hasHalfStar = avgRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const distribution = summary.ratingDistribution as { [key: string]: number };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main Rating Display */}
      <div className="flex items-center gap-2">
        {/* Star Icons */}
        <div className="flex items-center">
          {/* Full Stars */}
          {Array.from({ length: fullStars }, (_, i) => (
            <Star 
              key={`full-${i}`} 
              className={cn(config.stars, 'text-yellow-400')}
              fill="currentColor"
            />
          ))}
          
          {/* Half Star */}
          {hasHalfStar && (
            <div className="relative">
              <Star 
                className={cn(config.stars, 'text-gray-300')}
                fill="currentColor"
              />
              <Star 
                className={cn(config.stars, 'absolute top-0 left-0 text-yellow-400')}
                fill="currentColor"
                style={{ clipPath: 'inset(0 50% 0 0)' }}
              />
            </div>
          )}
          
          {/* Empty Stars */}
          {Array.from({ length: emptyStars }, (_, i) => (
            <Star 
              key={`empty-${i}`} 
              className={cn(config.stars, 'text-gray-300')}
              fill="currentColor"
            />
          ))}
        </div>

        {/* Rating Value and Count */}
        <div className="flex items-center gap-1">
          <span className={cn('font-semibold', config.avgText)}>
            {avgRating.toFixed(1)}
          </span>
          <span className={cn('text-gray-600', config.text)}>
            ({totalRatings.toLocaleString()} {totalRatings === 1 ? 'rating' : 'ratings'})
          </span>
        </div>
      </div>

      {/* Rating Distribution */}
      {showDistribution && totalRatings > 0 && (
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating] || 0;
            const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center gap-2">
                <div className="flex items-center gap-1 w-8">
                  <span className={cn('text-gray-700', config.text)}>{rating}</span>
                  <Star className={cn(config.stars, 'text-yellow-400')} fill="currentColor" />
                </div>
                
                <div className="flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn('bg-yellow-400 transition-all duration-300', config.barHeight)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                <span className={cn('text-gray-600 w-8 text-right', config.text)}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Additional Stats */}
      {(summary.totalReviews > 0 || (summary.helpfulCount ?? 0) > 0) && (
        <div className="flex gap-4 text-gray-600">
          {summary.totalReviews > 0 && (
            <span className={config.text}>
              {summary.totalReviews} {summary.totalReviews === 1 ? 'review' : 'reviews'}
            </span>
          )}

          {(summary.helpfulCount ?? 0) > 0 && (
            <span className={config.text}>
              {summary.helpfulCount} found helpful
            </span>
          )}

          {(summary.wouldCookAgainCount ?? 0) > 0 && totalRatings > 0 && (
            <span className={config.text}>
              {Math.round(((summary.wouldCookAgainCount ?? 0) / totalRatings) * 100)}% would cook again
            </span>
          )}
        </div>
      )}
      
      {/* Average Difficulty */}
      {summary.averageDifficulty && Number(summary.averageDifficulty) > 0 && (
        <div className="flex items-center gap-2">
          <span className={cn('text-gray-600', config.text)}>
            Difficulty:
          </span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((level) => (
              <Star 
                key={level}
                className={cn(
                  config.stars,
                  level <= Number(summary.averageDifficulty) 
                    ? 'text-red-400' 
                    : 'text-gray-300'
                )}
                fill="currentColor"
              />
            ))}
          </div>
          <span className={cn('text-gray-600', config.text)}>
            ({Number(summary.averageDifficulty).toFixed(1)}/5)
          </span>
        </div>
      )}
    </div>
  );
}