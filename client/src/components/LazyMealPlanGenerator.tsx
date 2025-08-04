import React, { Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, ChefHat } from 'lucide-react';

// Lazy load the heavy MealPlanGenerator component
const MealPlanGenerator = lazy(() => import('./MealPlanGenerator'));

// Loading component for meal plan generator
const MealPlanGeneratorLoading = () => (
  <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
    <Card>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <ChefHat className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl">Meal Plan Generator</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-slate-600">Loading Meal Plan Generator...</p>
          <p className="text-sm text-slate-500 text-center max-w-md">
            Preparing advanced meal planning tools with AI assistance and nutrition analysis.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Error boundary for meal plan generator
class MealPlanGeneratorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MealPlanGenerator Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Meal Plan Generator Unavailable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-red-600 space-y-2">
                <p>The meal plan generator could not be loaded at this time.</p>
                <p className="text-sm">Please refresh the page or try again later.</p>
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-red-700 font-medium">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                      {this.state.error?.stack}
                    </pre>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function LazyMealPlanGenerator(props: any) {
  return (
    <MealPlanGeneratorErrorBoundary>
      <Suspense fallback={<MealPlanGeneratorLoading />}>
        <MealPlanGenerator {...props} />
      </Suspense>
    </MealPlanGeneratorErrorBoundary>
  );
}