import React from 'react';
import { cn } from '../lib/utils';

interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'button' | 'input';
  lines?: number;
  className?: string;
  animate?: boolean;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  lines = 1,
  className,
  animate = true,
}) => {
  const baseClasses = cn(
    'bg-gray-200 rounded',
    animate && 'animate-pulse',
    className
  );

  switch (variant) {
    case 'text':
      return (
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(
                baseClasses,
                'h-4',
                index === lines - 1 && lines > 1 && 'w-3/4'
              )}
            />
          ))}
        </div>
      );

    case 'card':
      return (
        <div className={cn('rounded-lg overflow-hidden', baseClasses)}>
          <div className="h-48 bg-gray-300" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-300 rounded w-3/4" />
            <div className="h-3 bg-gray-300 rounded" />
            <div className="h-3 bg-gray-300 rounded w-5/6" />
          </div>
        </div>
      );

    case 'avatar':
      return (
        <div className={cn('rounded-full', baseClasses, 'w-10 h-10')} />
      );

    case 'button':
      return (
        <div className={cn('h-10 w-24', baseClasses)} />
      );

    case 'input':
      return (
        <div className={cn('h-10 w-full', baseClasses)} />
      );

    default:
      return <div className={baseClasses} />;
  }
};

interface SkeletonGridProps {
  count?: number;
  variant?: LoadingSkeletonProps['variant'];
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 6,
  variant = 'card',
  className,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
}) => {
  const gridCols = cn(
    'grid gap-4',
    `grid-cols-${cols.xs || 1}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    className
  );

  return (
    <div className={gridCols}>
      {Array.from({ length: count }).map((_, index) => (
        <LoadingSkeleton key={index} variant={variant} />
      ))}
    </div>
  );
};

export default LoadingSkeleton;