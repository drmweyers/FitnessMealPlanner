import React, { ReactElement } from 'react';
import { render, RenderOptions, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, AuthProvider } from '../client/src/contexts/AuthContext';
import { Router } from 'wouter';
import { vi, beforeEach } from 'vitest';
import type { User, AuthContextValue } from '../client/src/types/auth';

// Mock implementations
const mockNavigate = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => ['/', mockNavigate],
    Router: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

// Mock user data for different roles
export const mockUsers = {
  admin: {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'admin' as const,
    profilePicture: null,
  },
  trainer: {
    id: 'trainer-1',
    email: 'trainer@test.com',
    role: 'trainer' as const,
    profilePicture: null,
  },
  customer: {
    id: 'customer-1',
    email: 'customer@test.com',
    role: 'customer' as const,
    profilePicture: null,
  },
} as const;

// Mock auth context values
export const createMockAuthContext = (
  user: User | null = null,
  overrides: Partial<AuthContextValue> = {}
): AuthContextValue => ({
  user,
  isLoading: false,
  isAuthenticated: !!user,
  error: undefined,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

// Create a test query client
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
      gcTime: 0,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: process.env.NODE_ENV === 'test' ? () => {} : console.error,
  },
});

// Test providers wrapper
interface TestProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  authContextValue?: AuthContextValue;
  useRealAuthProvider?: boolean;
}

export function TestProviders({ 
  children, 
  queryClient, 
  authContextValue,
  useRealAuthProvider = false 
}: TestProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient();
  
  if (useRealAuthProvider) {
    return (
      <QueryClientProvider client={testQueryClient}>
        <Router>
          <AuthProvider>{children}</AuthProvider>
        </Router>
      </QueryClientProvider>
    );
  }

  const mockAuth = authContextValue || createMockAuthContext();

  return (
    <QueryClientProvider client={testQueryClient}>
      <Router>
        <AuthContext.Provider value={mockAuth}>
          {children}
        </AuthContext.Provider>
      </Router>
    </QueryClientProvider>
  );
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  authContextValue?: AuthContextValue;
  useRealAuthProvider?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient,
    authContextValue,
    useRealAuthProvider = false,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const testQueryClient = queryClient || createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders
      queryClient={testQueryClient}
      authContextValue={authContextValue}
      useRealAuthProvider={useRealAuthProvider}
    >
      {children}
    </TestProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
}

// Helper to render with specific user role
export function renderWithUser(
  ui: ReactElement,
  userType: keyof typeof mockUsers | User | null = 'trainer',
  options: CustomRenderOptions = {}
) {
  const user = typeof userType === 'string' && userType in mockUsers 
    ? mockUsers[userType] 
    : userType;
    
  const authContextValue = createMockAuthContext(user, options.authContextValue);
  
  return renderWithProviders(ui, {
    ...options,
    authContextValue,
  });
}

// Helper for authenticated tests
export function renderAuthenticated(
  ui: ReactElement,
  options: CustomRenderOptions & { user?: User } = {}
) {
  const user = options.user || mockUsers.trainer;
  return renderWithUser(ui, user, options);
}

// Helper for unauthenticated tests
export function renderUnauthenticated(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  return renderWithUser(ui, null, options);
}

// Mock API request function
export const mockApiRequest = vi.fn();

// Setup mocks for common hooks
export const setupMocks = () => {
  // Mock useToast
  vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
      toast: vi.fn(),
    }),
  }));

  // Mock API request
  vi.mock('../client/src/lib/queryClient', () => ({
    apiRequest: mockApiRequest,
  }));

  // Mock Lucide React icons
  vi.mock('lucide-react', () => ({
    Camera: () => <div data-testid="camera-icon" />,
    Upload: () => <div data-testid="upload-icon" />,
    Trash2: () => <div data-testid="trash-icon" />,
    Loader2: () => <div data-testid="loader-icon" />,
    Search: () => <div data-testid="search-icon" />,
    Filter: () => <div data-testid="filter-icon" />,
    Clock: () => <div data-testid="clock-icon" />,
    Users: () => <div data-testid="users-icon" />,
    CheckCircle: () => <div data-testid="check-icon" />,
    Eye: () => <div data-testid="eye-icon" />,
    Calendar: () => <div data-testid="calendar-icon" />,
    ChefHat: () => <div data-testid="chef-hat-icon" />,
    ChevronDown: () => <div data-testid="chevron-down-icon" />,
    ChevronUp: () => <div data-testid="chevron-up-icon" />,
    Check: () => <div data-testid="check-icon" />,
    X: () => <div data-testid="x-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
    Minus: () => <div data-testid="minus-icon" />,
    Edit: () => <div data-testid="edit-icon" />,
    MoreHorizontal: () => <div data-testid="more-icon" />,
    Save: () => <div data-testid="save-icon" />,
    User: () => <div data-testid="user-icon" />,
    Mail: () => <div data-testid="mail-icon" />,
    Lock: () => <div data-testid="lock-icon" />,
    Home: () => <div data-testid="home-icon" />,
    Settings: () => <div data-testid="settings-icon" />,
    LogOut: () => <div data-testid="logout-icon" />,
    Menu: () => <div data-testid="menu-icon" />,
    ArrowRight: () => <div data-testid="arrow-right-icon" />,
    ArrowLeft: () => <div data-testid="arrow-left-icon" />,
    Download: () => <div data-testid="download-icon" />,
  }));

  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockClear();
  });
};

// Test data helpers
export const testData = {
  recipe: {
    id: 'test-recipe-1',
    name: 'Test Recipe',
    description: 'A test recipe',
    mealTypes: ['lunch'],
    dietaryTags: ['vegetarian'],
    mainIngredientTags: ['vegetables'],
    ingredientsJson: [
      { name: 'Test ingredient', amount: '100', unit: 'g' }
    ],
    instructionsText: 'Test instructions',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 2,
    caloriesKcal: 200,
    proteinGrams: '10.0',
    carbsGrams: '20.0',
    fatGrams: '5.0',
    imageUrl: null,
    sourceReference: 'Test',
    creationTimestamp: new Date(),
    lastUpdatedTimestamp: new Date(),
    isApproved: true,
  },
  customer: {
    id: 'test-customer-1',
    email: 'customer@test.com',
    name: 'Test Customer',
    role: 'customer' as const,
    profilePicture: null,
  },
  trainer: {
    id: 'test-trainer-1',
    email: 'trainer@test.com',
    name: 'Test Trainer',
    role: 'trainer' as const,
    profilePicture: null,
  },
  mealPlan: {
    id: 'test-meal-plan-1',
    name: 'Test Meal Plan',
    days: 7,
    mealsPerDay: 3,
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 67,
    meals: [],
    createdBy: 'test-trainer-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  mealPlanGeneration: {
    days: 7,
    mealsPerDay: 3,
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 67,
    dietaryTags: ['vegetarian'],
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    activityLevel: 'moderately_active',
    fitnessGoal: 'weight_loss',
  },
};

// Enhanced recipe factory
export const createMockRecipe = (overrides?: any) => ({
  ...testData.recipe,
  ...overrides,
});

// Enhanced meal plan factory  
export const createMockMealPlan = (overrides?: any) => ({
  ...testData.mealPlan,
  ...overrides,
});

// Generate test recipes with variety
export const generateMockRecipes = (count: number) => {
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const dietaryTags = ['vegetarian', 'vegan', 'keto', 'paleo', 'gluten-free'];
  const cuisines = ['American', 'Italian', 'Asian', 'Mediterranean'];

  return Array.from({ length: count }, (_, i) => createMockRecipe({
    id: `recipe-${i + 1}`,
    name: `Test Recipe ${i + 1}`,
    mealTypes: [mealTypes[i % mealTypes.length]],
    dietaryTags: [dietaryTags[i % dietaryTags.length]],
    cuisineType: cuisines[i % cuisines.length],
    caloriesKcal: 200 + (i * 50),
    proteinGrams: (10 + (i * 2)).toString(),
    prepTimeMinutes: 10 + (i * 5),
    cookTimeMinutes: 15 + (i * 5),
  }));
};

// Cleanup helper
export const cleanup = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Export everything needed for tests
export type { RenderResult } from '@testing-library/react';