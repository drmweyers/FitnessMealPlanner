import React, { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
  hoverEffect?: boolean;
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

const TEXT_SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

export default function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = 'md',
  showValue = false,
  className,
  hoverEffect = true
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const handleStarClick = useCallback((starRating: number) => {
    if (!readonly && onRatingChange) {
      // If clicking the same star that's already selected, remove rating
      if (starRating === rating) {
        onRatingChange(0);
      } else {
        onRatingChange(starRating);
      }
    }
  }, [readonly, onRatingChange, rating]);

  const handleStarHover = useCallback((starRating: number | null) => {
    if (!readonly && hoverEffect) {
      setHoveredRating(starRating);
    }
  }, [readonly, hoverEffect]);

  const displayRating = hoveredRating ?? rating;
  const starSize = SIZE_CLASSES[size];
  const textSize = TEXT_SIZE_CLASSES[size];

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((starNumber) => {
          const isFilled = starNumber <= displayRating;
          const isPartiallyFilled = starNumber - 1 < displayRating && starNumber > displayRating;
          
          return (
            <button
              key={starNumber}
              type="button"
              disabled={readonly}
              className={cn(
                'relative transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm',
                !readonly && 'cursor-pointer hover:scale-110',
                readonly && 'cursor-default'
              )}
              onClick={() => handleStarClick(starNumber)}
              onMouseEnter={() => handleStarHover(starNumber)}
              onMouseLeave={() => handleStarHover(null)}
              aria-label={`${starNumber} star${starNumber !== 1 ? 's' : ''}`}
            >
              {/* Background star (empty) */}
              <Star 
                className={cn(
                  starSize,
                  'text-gray-300 transition-colors duration-150'
                )}
                fill="currentColor"
              />
              
              {/* Foreground star (filled) */}
              {(isFilled || isPartiallyFilled) && (
                <Star 
                  className={cn(
                    starSize,
                    'absolute top-0 left-0 text-yellow-400 transition-colors duration-150',
                    hoveredRating !== null && starNumber <= hoveredRating && 'text-yellow-500'
                  )}
                  fill="currentColor"
                  style={
                    isPartiallyFilled
                      ? {
                          clipPath: `inset(0 ${100 - ((displayRating - (starNumber - 1)) * 100)}% 0 0)`
                        }
                      : undefined
                  }
                />
              )}
            </button>
          );
        })}
      </div>
      
      {showValue && (
        <span className={cn('text-gray-600 font-medium ml-1', textSize)}>
          {displayRating > 0 ? displayRating.toFixed(1) : '0.0'}
        </span>
      )}
      
      {!readonly && hoverEffect && hoveredRating !== null && (
        <span className={cn('text-gray-500 ml-1', textSize)}>
          {hoveredRating}/5
        </span>
      )}
    </div>
  );
}