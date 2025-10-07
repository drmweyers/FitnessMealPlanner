/**
 * Lazy Loading Components
 * 
 * This module provides lazy-loaded components for better performance.
 * Components are only loaded when needed, reducing initial bundle size.
 */

import { lazy } from 'react';
import { ComponentType } from 'react';

// Lazy load large/complex components
export const LazyMealPlanGenerator = lazy(() => 
  import('../MealPlanGenerator').then(module => ({ default: module.default }))
);

export const LazyEvoFitPDFExport = lazy(() => 
  import('../EvoFitPDFExport').then(module => ({ default: module.default }))
);

export const LazyCustomerManagement = lazy(() => 
  import('../CustomerManagement').then(module => ({ default: module.default }))
);

export const LazyProgressTracking = lazy(() => 
  import('../ProgressTracking').then(module => ({ default: module.default }))
);

export const LazyRecipeDetailModal = lazy(() => 
  import('../RecipeDetailModal').then(module => ({ default: module.default }))
);

export const LazyAdminRecipeGenerator = lazy(() => 
  import('../AdminRecipeGenerator').then(module => ({ default: module.default }))
);

export const LazyTrainerMealPlans = lazy(() => 
  import('../TrainerMealPlans').then(module => ({ default: module.default }))
);

// Progress tracking sub-components
export const LazyMeasurementsTab = lazy(() => 
  import('../progress/MeasurementsTab').then(module => ({ default: module.default }))
);

export const LazyProgressCharts = lazy(() => 
  import('../progress/ProgressCharts').then(module => ({ default: module.default }))
);

// Higher-order component for adding loading state
export function withLazyLoading<P extends object>(
  LazyComponent: ComponentType<P>,
  fallbackComponent?: ComponentType
) {
  const LazyWrapper = (props: P) => {
    const Fallback = fallbackComponent || (() => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ));

    return (
      <LazyComponent {...props} />
    );
  };

  return LazyWrapper;
}

// Loading skeleton components
export const ComponentSkeleton = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="h-32 bg-gray-200 rounded"></div>
  </div>
);

export const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 h-48 rounded-t-lg"></div>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="flex space-x-2">
        <div className="h-8 bg-gray-200 rounded w-16"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  </div>
);

export const TableSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 rounded w-full"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    <div className="h-4 bg-gray-200 rounded w-full"></div>
    <div className="h-4 bg-gray-200 rounded w-3/6"></div>
  </div>
);