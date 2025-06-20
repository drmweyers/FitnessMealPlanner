# FitMeal Pro Component Guide

## Overview

This guide provides comprehensive documentation for all React components in the FitMeal Pro application. Each component is designed with reusability, type safety, and performance in mind.

## Component Architecture

### Design Principles
- **Single Responsibility**: Each component has one clear purpose
- **Composition over Inheritance**: Components are composed together
- **Type Safety**: Full TypeScript coverage with proper interfaces
- **Performance**: Optimized rendering with React Query caching
- **Accessibility**: WCAG 2.1 AA compliance throughout

### Component Categories

1. **Pages** - Top-level route components
2. **Features** - Business logic components
3. **UI Components** - Reusable interface elements
4. **Modals** - Overlay components for detailed interactions

## Page Components

### Landing Page (`/pages/Landing.tsx`)

**Purpose**: Marketing page for unauthenticated users

**Key Features**:
- Hero section with call-to-action
- Feature highlights and benefits
- Authentication integration
- Responsive design for all devices

**Dependencies**:
- Replit authentication hook
- UI components for layout
- Lucide icons for visual elements

**Usage**:
```tsx
import Landing from '@/pages/Landing';
// Used automatically by Router for unauthenticated users
```

### Home Page (`/pages/Home.tsx`)

**Purpose**: Main dashboard for authenticated users

**Key Features**:
- Recipe browsing and search
- Navigation to other features
- User-specific content
- Quick access to meal planning

**State Management**:
- React Query for recipe data
- Local state for search filters
- Authentication context

### Admin Page (`/pages/Admin.tsx`)

**Purpose**: Administrative interface for content management

**Key Features**:
- Recipe generation and approval
- System statistics and analytics
- Batch operations for content
- Admin-only access control

**Security**:
- Role-based access control
- Protected routes
- Audit logging for actions

### Meal Plan Generator Page (`/pages/MealPlanGenerator.tsx`)

**Purpose**: Container for meal plan generation functionality

**Key Features**:
- Form-based meal plan creation
- Natural language processing
- Generated plan display
- PDF export capabilities

## Feature Components

### MealPlanGenerator (`/components/MealPlanGenerator.tsx`)

**Purpose**: Core meal planning functionality with AI integration

**Props**: None (self-contained)

**Key Features**:
- **Dual Input Methods**:
  - Natural language processing with OpenAI
  - Detailed form with nutritional constraints
- **Real-time Validation**: Zod schema validation
- **Nutrition Analysis**: Comprehensive macro tracking
- **PDF Export**: Professional meal plan documents
- **Interactive Recipe Cards**: Clickable cards with full details

**State Management**:
```tsx
const [generatedPlan, setGeneratedPlan] = useState<MealPlanResult | null>(null);
const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
const [showAdvancedForm, setShowAdvancedForm] = useState(false);
const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
```

**API Integration**:
- POST `/api/meal-plans/generate` - Generate meal plan
- POST `/api/meal-plans/parse-natural-language` - Parse natural input

**Form Schema**:
```tsx
const form = useForm<MealPlanGeneration>({
  resolver: zodResolver(mealPlanGenerationSchema),
  defaultValues: {
    planName: "",
    fitnessGoal: "",
    dailyCalorieTarget: 2000,
    days: 7,
    mealsPerDay: 3,
  }
});
```

**PDF Export Implementation**:
- Uses html2canvas for DOM capture
- jsPDF for document generation
- Professional formatting with nutrition summary
- Client-deliverable quality output

### AdminRecipeGenerator (`/components/AdminRecipeGenerator.tsx`)

**Purpose**: Admin interface for batch recipe generation

**Props**: None (admin-only component)

**Key Features**:
- **Batch Processing**: Generate 10-100 recipes at once
- **Progress Tracking**: Real-time generation status
- **Error Handling**: Comprehensive error states
- **Success Feedback**: Generation completion notifications

**Form Configuration**:
```tsx
interface AdminRecipeGeneration {
  count: number;          // 10-100 recipes
  mealTypes: string[];    // Target meal types
  dietaryTags: string[];  // Dietary restrictions
}
```

**State Management**:
- React Hook Form for form state
- TanStack Query mutations for API calls
- Toast notifications for user feedback

### RecipeModal (`/components/RecipeModal.tsx`)

**Purpose**: Detailed recipe display in modal overlay

**Props**:
```tsx
interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}
```

**Key Features**:
- **Responsive Design**: Mobile-optimized layout
- **Comprehensive Display**:
  - Full recipe image with fallback
  - Detailed nutritional information
  - Complete ingredient list with measurements
  - Step-by-step cooking instructions
  - Recipe metadata (prep time, servings, dietary tags)
- **Accessibility**: Keyboard navigation and screen reader support

**Data Handling**:
```tsx
// Handles different instruction formats
const instructionText = recipe.instructionsText || (recipe as any).instructions || '';
const instructions = instructionText.split('\n').filter((step: string) => step.trim());
```

**Layout Structure**:
- Fixed header with recipe name and close button
- Two-column layout (image/nutrition + ingredients/instructions)
- Responsive breakpoints for mobile devices
- Scrollable content area for long recipes

## UI Components

### Custom Hooks

#### useAuth (`/hooks/useAuth.ts`)

**Purpose**: Authentication state management

**Returns**:
```tsx
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Implementation**:
- React Query integration
- Automatic session refresh
- Error handling for auth failures
- Loading states for UI

#### useToast (`/hooks/use-toast.ts`)

**Purpose**: Global notification system

**Usage**:
```tsx
const { toast } = useToast();

toast({
  title: "Success",
  description: "Meal plan generated successfully",
  variant: "default"
});
```

### shadcn/ui Components

The application uses shadcn/ui components for consistent design:

- **Form Components**: Input, Select, Textarea, Button
- **Layout Components**: Card, Separator, Badge
- **Feedback Components**: Toast, Tooltip, Alert
- **Navigation Components**: Tabs, Accordion, Dropdown

All components are customized with Tailwind CSS for the FitMeal Pro design system.

## Component Communication

### Props vs Context

**Props** are used for:
- Parent-child data passing
- Component configuration
- Event handlers

**Context** is used for:
- Authentication state
- Theme preferences
- Global UI state

### State Management Strategy

**Local State** (`useState`):
- Component-specific UI state
- Form inputs and validation
- Modal visibility
- Temporary selections

**Server State** (React Query):
- API data fetching and caching
- Background updates
- Optimistic updates
- Error handling

**Form State** (React Hook Form):
- Complex form validation
- Multi-step forms
- Performance optimization
- Type-safe form handling

## Performance Optimization

### React Query Configuration

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes
      cacheTime: 10 * 60 * 1000,   // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Image Optimization

- Lazy loading for recipe images
- WebP format with fallbacks
- Responsive image sizing
- Placeholder images for missing content

### Bundle Optimization

- Code splitting by route
- Dynamic imports for heavy components
- Tree shaking for unused code
- CSS purging for production

## Accessibility

### WCAG 2.1 AA Compliance

- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Screen Reader Support**: Proper ARIA labels and roles
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Visible focus indicators
- **Semantic HTML**: Proper heading hierarchy and landmarks

### Implementation Examples

```tsx
// Modal with proper focus management
<div
  role="dialog"
  aria-labelledby="recipe-title"
  aria-describedby="recipe-description"
  tabIndex={-1}
>
  <h2 id="recipe-title">{recipe.name}</h2>
  <p id="recipe-description">{recipe.description}</p>
</div>

// Form with proper labeling
<FormField
  control={form.control}
  name="planName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Plan Name</FormLabel>
      <FormControl>
        <Input {...field} aria-describedby="planName-error" />
      </FormControl>
      <FormMessage id="planName-error" />
    </FormItem>
  )}
/>
```

## Testing Strategy

### Component Testing

**Unit Tests** (`test/components.test.tsx`):
- Component rendering
- Props handling
- Event handling
- State management

**Integration Tests** (`test/integration.test.ts`):
- API integration
- User workflows
- Error scenarios
- Authentication flows

### Testing Tools

- **Vitest**: Fast unit testing
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Playwright**: End-to-end testing

### Test Examples

```tsx
// Component rendering test
test('renders meal plan generator', () => {
  render(<MealPlanGenerator />);
  expect(screen.getByText('Generate Meal Plan')).toBeInTheDocument();
});

// User interaction test
test('opens recipe modal on card click', async () => {
  const user = userEvent.setup();
  render(<MealPlanResult plan={mockPlan} />);
  
  await user.click(screen.getByText('Grilled Chicken'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

## Error Handling

### Error Boundaries

Components are wrapped in error boundaries to catch and handle errors gracefully:

```tsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### API Error Handling

```tsx
const { data, error, isLoading } = useQuery({
  queryKey: ['/api/recipes'],
  queryFn: () => fetch('/api/recipes').then(res => res.json()),
  onError: (error) => {
    toast({
      title: "Error",
      description: "Failed to load recipes",
      variant: "destructive"
    });
  }
});
```

## Development Workflow

### Component Creation Checklist

1. **Create Component File**: Use proper naming convention
2. **Define Props Interface**: TypeScript interface with JSDoc
3. **Implement Component**: Functional component with hooks
4. **Add Styling**: Tailwind CSS classes
5. **Write Tests**: Unit and integration tests
6. **Document Usage**: JSDoc comments and examples
7. **Export Component**: Add to index files

### Code Style Guidelines

```tsx
/**
 * Component Name
 * 
 * Brief description of the component's purpose and functionality.
 * 
 * @param props - Component props
 * @returns JSX element
 */
interface ComponentProps {
  /** Description of prop */
  propName: string;
  /** Optional prop with default */
  optionalProp?: boolean;
}

export default function Component({ propName, optionalProp = false }: ComponentProps) {
  // Hooks at the top
  const [state, setState] = useState(initialValue);
  const { data, isLoading } = useQuery(...);
  
  // Event handlers
  const handleClick = () => {
    // Implementation
  };
  
  // Early returns for loading/error states
  if (isLoading) return <LoadingSpinner />;
  
  // Main render
  return (
    <div className="component-container">
      {/* Component content */}
    </div>
  );
}
```

This component guide provides comprehensive documentation for all React components in FitMeal Pro. For implementation details, refer to the individual component files and their inline documentation.