import React, { memo, useState, useCallback, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useFavorites } from '../../hooks/useFavorites';

interface FavoriteButtonProps {
  recipeId: string;
  isFavorited?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  showCount?: boolean;
  className?: string;
  onFavoriteChange?: (isFavorited: boolean) => void;
}

const FavoriteButton = memo(({
  recipeId,
  isFavorited: initialFavorited = false,
  size = 'md',
  variant = 'ghost',
  showCount = false,
  className,
  onFavoriteChange,
}: FavoriteButtonProps) => {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isAnimating, setIsAnimating] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  
  const { addFavorite, removeFavorite, checkFavoriteStatus } = useFavorites();

  // Sync with prop changes
  useEffect(() => {
    setIsFavorited(initialFavorited);
  }, [initialFavorited]);

  // Check favorite status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkFavoriteStatus(recipeId);
        setIsFavorited(status.isFavorited);
      } catch (error) {
        console.error('Failed to check favorite status:', error);
      }
    };

    if (!initialFavorited) {
      checkStatus();
    }
  }, [recipeId, checkFavoriteStatus, initialFavorited]);

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAnimating) return;

    setIsAnimating(true);
    
    try {
      if (isFavorited) {
        await removeFavorite(recipeId);
        setIsFavorited(false);
        setFavoriteCount(prev => Math.max(0, prev - 1));
        onFavoriteChange?.(false);
      } else {
        await addFavorite(recipeId);
        setIsFavorited(true);
        setFavoriteCount(prev => prev + 1);
        onFavoriteChange?.(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Revert optimistic update on error
      setIsFavorited(!isFavorited);
    } finally {
      // Add a small delay to let animation complete
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isFavorited, isAnimating, recipeId, addFavorite, removeFavorite, onFavoriteChange]);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={variant}
        size="icon"
        className={cn(
          sizeClasses[size],
          'relative transition-all duration-200 hover:scale-110',
          isFavorited && 'text-red-500 hover:text-red-600',
          !isFavorited && 'text-gray-400 hover:text-red-400',
          className
        )}
        onClick={handleToggleFavorite}
        disabled={isAnimating}
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          className={cn(
            iconSizes[size],
            'transition-all duration-300 ease-out',
            isFavorited && 'fill-current scale-110',
            isAnimating && 'animate-pulse scale-125'
          )}
        />
        
        {/* Heart burst animation */}
        {isAnimating && isFavorited && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `rotate(${i * 60}deg)`,
                }}
              >
                <div
                  className={cn(
                    'w-1 h-1 bg-red-400 rounded-full animate-ping',
                    'opacity-0 animate-[ping_0.3s_ease-out_forwards]'
                  )}
                  style={{
                    animationDelay: `${i * 50}ms`,
                    transform: 'translateY(-12px)',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Floating heart animation for favorites */}
        {isAnimating && isFavorited && (
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 pointer-events-none">
            <Heart
              className={cn(
                iconSizes[size],
                'text-red-500 fill-current animate-[float-up_0.6s_ease-out_forwards] opacity-0'
              )}
              style={{
                animationDelay: '100ms',
              }}
            />
          </div>
        )}
      </Button>

      {showCount && favoriteCount > 0 && (
        <span 
          className={cn(
            'text-gray-600 font-medium transition-all duration-200',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base'
          )}
        >
          {favoriteCount}
        </span>
      )}

      <style>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-10px) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(1.2);
          }
        }

        @keyframes heart-burst {
          0% {
            opacity: 1;
            transform: scale(0);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(1.5);
          }
        }
      `}</style>
    </div>
  );
});

FavoriteButton.displayName = 'FavoriteButton';

export default FavoriteButton;