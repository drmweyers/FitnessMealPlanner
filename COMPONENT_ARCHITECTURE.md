# Component Architecture Guide

This document provides comprehensive documentation of the React component architecture in FitnessMealPlanner, designed to help developers understand the component hierarchy, patterns, and best practices used throughout the application.

## 🏗️ Component Architecture Overview

### Design Principles

1. **Component Composition**: Building complex UIs from simple, reusable components
2. **Single Responsibility**: Each component has one clear purpose
3. **Props-Based Configuration**: Components are configurable through props
4. **Type Safety**: All components use TypeScript interfaces for props
5. **Accessibility**: Components follow WCAG guidelines

### Component Hierarchy

```
App.tsx
├── Router (wouter)
├── AuthProvider (Context)
└── Pages/
    ├── Customer.tsx
    │   ├── Tabs (shadcn/ui)
    │   ├── MealPlanCard[] (mapped)
    │   └── ProgressTracking
    │       ├── MeasurementsTab
    │       ├── GoalsTab
    │       └── PhotosTab
    ├── Admin.tsx
    │   ├── RecipeManagement
    │   ├── UserManagement
    │   └── Analytics
    └── Login.tsx
        ├── LoginForm
        └── GoogleOAuthButton
```

## 📱 Core UI Components (`client/src/components/ui/`)

These are the foundational building blocks based on shadcn/ui:

### Button Component

**Purpose**: Consistent button styling and behavior across the app

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

// Usage Examples
<Button variant="default" size="lg">
  Save Changes
</Button>

<Button variant="outline" onClick={handleCancel}>
  Cancel
</Button>

<Button variant="destructive" size="sm">
  <Trash2 className="w-4 h-4 mr-2" />
  Delete
</Button>
```

**Key Features**:
- Variant-based styling system
- Size variations for different contexts
- Icon support with proper spacing
- Loading state support
- Full accessibility with keyboard navigation

### Card Component

**Purpose**: Container for related information with consistent styling

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

// Compound component pattern
<Card>
  <CardHeader>
    <CardTitle>Progress Summary</CardTitle>
    <CardDescription>Your fitness journey at a glance</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Weight: 175 lbs (-5 this month)</p>
    <p>Body Fat: 18.2% (-1.2% this month)</p>
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>
```

**Key Features**:
- Compound component pattern for flexible layouts
- Consistent spacing and borders
- Hover and focus states
- Responsive design built-in

### Form Components

**Purpose**: Consistent form inputs with validation and accessibility

```typescript
// Input with label and error handling
<div className="space-y-2">
  <Label htmlFor="weight">Weight (lbs)</Label>
  <Input
    id="weight"
    type="number"
    placeholder="Enter your weight"
    value={weight}
    onChange={(e) => setWeight(e.target.value)}
    className={errors.weight ? 'border-red-500' : ''}
  />
  {errors.weight && (
    <p className="text-sm text-red-500">{errors.weight}</p>
  )}
</div>

// Select dropdown with proper labeling
<div className="space-y-2">
  <Label htmlFor="goal-type">Goal Type</Label>
  <Select value={goalType} onValueChange={setGoalType}>
    <SelectTrigger>
      <SelectValue placeholder="Select goal type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="weight_loss">Weight Loss</SelectItem>
      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
      <SelectItem value="maintenance">Maintenance</SelectItem>
    </SelectContent>
  </Select>
</div>
```

## 🍽️ Feature Components

### MealPlanCard Component

**Purpose**: Display meal plan information in a card format

**Location**: `client/src/components/MealPlanCard.tsx`

```typescript
interface MealPlanCardProps {
  mealPlan: CustomerMealPlan;
  onClick: () => void;
  className?: string;
}

/**
 * MealPlanCard Component
 * 
 * Displays a meal plan in a card format with:
 * - Plan name and description
 * - Nutritional summary (calories, protein, etc.)
 * - Duration and meal count
 * - Fitness goal badge
 * - Click handler for viewing details
 * 
 * @param mealPlan - The meal plan data to display
 * @param onClick - Handler for when card is clicked
 * @param className - Additional CSS classes
 */
const MealPlanCard: React.FC<MealPlanCardProps> = ({ 
  mealPlan, 
  onClick, 
  className 
}) => {
  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-lg transition-shadow duration-200", 
        className
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{mealPlan.planName}</CardTitle>
          <Badge variant="secondary">
            {formatGoalName(mealPlan.fitnessGoal)}
          </Badge>
        </div>
        {mealPlan.description && (
          <CardDescription>{mealPlan.description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-900">
              {mealPlan.dailyCalorieTarget} cal/day
            </p>
            <p className="text-gray-600">Daily target</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {mealPlan.totalDays} days
            </p>
            <p className="text-gray-600">Duration</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

**Key Features**:
- Responsive grid layout
- Hover animations for better UX
- Proper semantic markup
- Accessible click targets
- Consistent styling with design system

### ProgressTracking Component

**Purpose**: Main dashboard for customer progress tracking

**Location**: `client/src/components/ProgressTracking.tsx`

```typescript
interface ProgressTrackingProps {
  className?: string;
}

/**
 * ProgressTracking Component
 * 
 * Main dashboard for customer progress tracking featuring:
 * - Quick stats overview (weight, body fat, goals, photos)
 * - Tabbed interface for different tracking types
 * - Real-time data from API
 * - Responsive design for all devices
 * 
 * Child Components:
 * - MeasurementsTab: Body measurement tracking
 * - GoalsTab: Fitness goal management
 * - PhotosTab: Progress photo upload and viewing
 * - ProgressCharts: Visual progress representation
 */
const ProgressTracking: React.FC<ProgressTrackingProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('measurements');

  // Fetch quick stats data
  const { data: stats, isLoading } = useQuery({
    queryKey: ['progress-stats'],
    queryFn: fetchProgressStats,
  });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Progress Tracking
          </h2>
          <p className="text-gray-600 mt-1">
            Track your fitness journey and celebrate your achievements
          </p>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickStatCard
          title="Current Weight"
          value={stats?.currentWeight || '--'}
          unit="lbs"
          change={stats?.weightChange}
          icon={<TrendingUp className="h-8 w-8 text-green-600" />}
        />
        {/* ... other stat cards */}
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="photos">Progress Photos</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="measurements">
          <MeasurementsTab />
        </TabsContent>
        
        <TabsContent value="photos">
          <PhotosTab />
        </TabsContent>
        
        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

## 📊 Progress Tracking Components

### MeasurementsTab Component

**Purpose**: Handle body measurement tracking with CRUD operations

**Location**: `client/src/components/progress/MeasurementsTab.tsx`

```typescript
interface MeasurementsTabProps {
  className?: string;
}

/**
 * MeasurementsTab Component
 * 
 * Comprehensive body measurement tracking interface:
 * - Display latest measurements
 * - Show measurement history in chronological order
 * - Add new measurements with validation
 * - Edit/delete existing measurements
 * - Progress charts and trends
 * 
 * Features:
 * - Form validation with Zod schemas
 * - Optimistic updates for better UX
 * - Error handling with user feedback
 * - Responsive table/card layouts
 * - Date filtering capabilities
 */
const MeasurementsTab: React.FC<MeasurementsTabProps> = ({ className }) => {
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<string | null>(null);

  // Fetch measurements with React Query
  const { 
    data: measurements, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['measurements'],
    queryFn: fetchMeasurements,
  });

  // Create measurement mutation
  const createMutation = useMutation({
    mutationFn: createMeasurement,
    onSuccess: () => {
      refetch();
      setIsAddingMeasurement(false);
      toast({
        title: "Success",
        description: "Measurement added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Body Measurements</h3>
        <Button onClick={() => setIsAddingMeasurement(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Measurement
        </Button>
      </div>

      {/* Latest Measurement Card */}
      <LatestMeasurementCard 
        measurement={measurements?.[0]} 
        isLoading={isLoading}
      />

      {/* Measurement History */}
      <MeasurementHistory 
        measurements={measurements || []}
        isLoading={isLoading}
        onEdit={setEditingMeasurement}
        onDelete={handleDeleteMeasurement}
      />

      {/* Add/Edit Measurement Dialog */}
      <MeasurementDialog
        isOpen={isAddingMeasurement || !!editingMeasurement}
        onClose={() => {
          setIsAddingMeasurement(false);
          setEditingMeasurement(null);
        }}
        onSubmit={handleSubmitMeasurement}
        measurement={editingMeasurement ? 
          measurements?.find(m => m.id === editingMeasurement) : 
          null
        }
        isLoading={createMutation.isPending}
      />
    </div>
  );
};
```

### GoalsTab Component

**Purpose**: Fitness goal management with progress tracking

**Key Features**:
- Create SMART fitness goals
- Track progress with automatic percentage calculation
- Set and manage milestones
- Visual progress indicators
- Goal completion celebrations

```typescript
/**
 * GoalsTab Component
 * 
 * Fitness goal management interface featuring:
 * - Goal creation with SMART criteria
 * - Progress tracking with visual indicators
 * - Milestone management
 * - Achievement celebrations
 * - Different goal types (weight loss, muscle gain, etc.)
 * 
 * Goal Types Supported:
 * - weight_loss: Reduce body weight
 * - weight_gain: Increase body weight
 * - muscle_gain: Build muscle mass
 * - body_fat_reduction: Lower body fat percentage
 * - strength_gain: Increase lifting capacity
 * - endurance: Improve cardiovascular fitness
 * - custom: User-defined goals
 */
```

### PhotosTab Component

**Purpose**: Progress photo management with S3 upload

**Key Features**:
- Photo upload with drag-and-drop
- Automatic image optimization
- Before/after comparisons  
- Photo categorization (front, side, back)
- Privacy controls
- Thumbnail generation

## 🎨 Styling and Theming

### Tailwind CSS Integration

The application uses Tailwind CSS for styling with a custom design system:

```typescript
// Custom color palette in tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        // ... other colors
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

### Component Styling Patterns

```typescript
// Using cn() utility for conditional classes
const Button = ({ variant, size, className, ...props }) => {
  return (
    <button
      className={cn(
        // Base styles
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        // Variant styles
        {
          "bg-primary-600 text-white hover:bg-primary-700": variant === 'default',
          "border border-input bg-background hover:bg-accent": variant === 'outline',
        },
        // Size styles
        {
          "h-10 px-4 py-2": size === 'default',
          "h-9 px-3": size === 'sm',
          "h-11 px-8": size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
};
```

## 🔄 State Management Patterns

### React Query for Server State

```typescript
// Custom hook for meal plans
export const useMealPlans = (customerId?: string) => {
  return useQuery({
    queryKey: ['mealPlans', customerId],
    queryFn: () => fetchMealPlans(customerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!customerId,
  });
};

// Mutations with optimistic updates
export const useCreateMeasurement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMeasurement,
    onMutate: async (newMeasurement) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['measurements'] });
      
      // Snapshot previous value
      const previousMeasurements = queryClient.getQueryData(['measurements']);
      
      // Optimistically update
      queryClient.setQueryData(['measurements'], (old: any) => [
        { ...newMeasurement, id: 'temp-' + Date.now() },
        ...(old || [])
      ]);
      
      return { previousMeasurements };
    },
    onError: (err, newMeasurement, context) => {
      // Rollback on error
      if (context?.previousMeasurements) {
        queryClient.setQueryData(['measurements'], context.previousMeasurements);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
    },
  });
};
```

### React Context for Global State

```typescript
// Auth context for user state
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      validateToken(token)
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiRequest('POST', '/auth/login', { email, password });
    const { user, token } = await response.json();
    
    localStorage.setItem('token', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## 🧪 Component Testing Patterns

### Unit Testing with Vitest and Testing Library

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import MeasurementsTab from '../MeasurementsTab';

// Test wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('MeasurementsTab', () => {
  beforeEach(() => {
    // Mock API calls
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'success',
        data: mockMeasurements,
      }),
    } as Response);
  });

  test('should display measurements list', async () => {
    render(<MeasurementsTab />, { wrapper: createWrapper() });

    expect(screen.getByText('Body Measurements')).toBeInTheDocument();
    expect(screen.getByText('Add Measurement')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Latest Measurement')).toBeInTheDocument();
    });
  });

  test('should open add measurement dialog', async () => {
    render(<MeasurementsTab />, { wrapper: createWrapper() });

    const addButton = screen.getByText('Add Measurement');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Measurement')).toBeInTheDocument();
    });
  });

  test('should create new measurement', async () => {
    render(<MeasurementsTab />, { wrapper: createWrapper() });

    // Open dialog
    fireEvent.click(screen.getByText('Add Measurement'));

    // Fill form
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/weight/i), {
        target: { value: '175.5' }
      });
      fireEvent.change(screen.getByLabelText(/body fat/i), {
        target: { value: '18.2' }
      });
    });

    // Submit
    fireEvent.click(screen.getByText('Save Measurement'));

    // Verify success
    await waitFor(() => {
      expect(screen.getByText('Measurement added successfully')).toBeInTheDocument();
    });
  });
});
```

## 📱 Responsive Design Patterns

### Mobile-First Approach

```typescript
// Responsive component with Tailwind classes
const ResponsiveCard = () => {
  return (
    <Card className="
      // Mobile (default)
      p-4 space-y-3
      
      // Tablet (sm:)
      sm:p-6 sm:space-y-4
      
      // Desktop (lg:)
      lg:p-8 lg:space-y-6
      
      // Large desktop (xl:)
      xl:p-10
    ">
      <CardContent className="
        // Grid responsive breakpoints
        grid grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
        gap-4
      ">
        {/* Content */}
      </CardContent>
    </Card>
  );
};
```

### Container Queries (Future Enhancement)

```typescript
// Using container queries for component-level responsiveness
const AdaptiveComponent = () => {
  return (
    <div className="@container">
      <div className="
        @sm:grid-cols-2
        @md:grid-cols-3
        @lg:grid-cols-4
        grid grid-cols-1 gap-4
      ">
        {/* Responsive based on container size, not viewport */}
      </div>
    </div>
  );
};
```

## 🔒 Security and Accessibility

### Input Sanitization

```typescript
// Sanitize user input before display
import DOMPurify from 'dompurify';

const SafeContent = ({ html }: { html: string }) => {
  const sanitizedHtml = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
};
```

### ARIA Accessibility

```typescript
// Proper ARIA labels and semantic markup
const AccessibleForm = () => {
  return (
    <form role="form" aria-labelledby="form-title">
      <h2 id="form-title">Add Measurement</h2>
      
      <div className="space-y-4">
        <Label htmlFor="weight" className="sr-only">
          Weight in pounds
        </Label>
        <Input
          id="weight"
          type="number"
          placeholder="Weight (lbs)"
          aria-describedby="weight-help"
          aria-invalid={!!errors.weight}
        />
        {errors.weight && (
          <div id="weight-help" role="alert" className="text-red-500">
            {errors.weight}
          </div>
        )}
      </div>
      
      <Button type="submit" aria-describedby="submit-help">
        Save Measurement
      </Button>
      <div id="submit-help" className="sr-only">
        This will save your measurement to your progress tracking
      </div>
    </form>
  );
};
```

## 🚀 Performance Optimization

### Code Splitting

```typescript
// Lazy load components for better performance
import { lazy, Suspense } from 'react';

const ProgressTracking = lazy(() => import('./ProgressTracking'));
const AdminPanel = lazy(() => import('./AdminPanel'));

const App = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/progress" component={ProgressTracking} />
        <Route path="/admin" component={AdminPanel} />
      </Routes>
    </Suspense>
  );
};
```

### Memoization

```typescript
// Memoize expensive calculations
const ProgressChart = memo(({ measurements }: { measurements: Measurement[] }) => {
  const chartData = useMemo(() => {
    return measurements.map(m => ({
      date: format(new Date(m.measurementDate), 'MM/dd'),
      weight: parseFloat(m.weightLbs || '0'),
      bodyFat: parseFloat(m.bodyFatPercentage || '0'),
    }));
  }, [measurements]);

  return <Chart data={chartData} />;
});
```

## 🎯 Best Practices Summary

### Component Development

1. **Start with TypeScript interfaces** - Define props before implementation
2. **Use compound components** - Break complex components into smaller pieces
3. **Implement error boundaries** - Graceful error handling
4. **Add loading states** - Better user experience during async operations
5. **Write tests first** - TDD approach for critical components

### Performance

1. **Lazy load routes** - Reduce initial bundle size
2. **Memoize expensive operations** - Prevent unnecessary re-calculations
3. **Optimize images** - Use proper formats and sizes
4. **Monitor bundle size** - Keep components lean

### Accessibility

1. **Use semantic HTML** - Proper heading hierarchy and landmarks
2. **Implement ARIA attributes** - Screen reader support
3. **Ensure keyboard navigation** - All interactive elements accessible
4. **Test with screen readers** - Verify actual accessibility

### Maintainability

1. **Follow naming conventions** - PascalCase for components, camelCase for functions
2. **Document complex logic** - JSDoc comments for non-obvious code
3. **Keep components small** - Single responsibility principle
4. **Use consistent patterns** - Establish and follow team conventions

This component architecture guide provides a solid foundation for understanding and contributing to the FitnessMealPlanner codebase. For specific implementation details, refer to the actual component files and their inline documentation.