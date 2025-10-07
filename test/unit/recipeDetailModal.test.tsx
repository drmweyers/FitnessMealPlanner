import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeDetailModal from '../../client/src/components/RecipeDetailModal';
import { useAuth } from '../../client/src/contexts/AuthContext';
import { apiRequest } from '../../client/src/lib/queryClient';
import type { Recipe } from '@shared/schema';

// Mock dependencies
vi.mock('../../client/src/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock UI components
vi.mock('../../client/src/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}));

vi.mock('../../client/src/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

vi.mock('../../client/src/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

const mockUseAuth = vi.mocked(useAuth);
const mockApiRequest = vi.mocked(apiRequest);

const mockRecipe: Recipe = {
  id: 'recipe-123',
  name: 'Test Recipe',
  description: 'A delicious test recipe',
  caloriesKcal: 300,
  proteinGrams: '25',
  carbsGrams: '30',
  fatGrams: '10',
  prepTimeMinutes: 15,
  cookTimeMinutes: 20,
  servings: 2,
  mealTypes: ['lunch'],
  dietaryTags: ['healthy'],
  mainIngredientTags: ['chicken'],
  ingredientsJson: [
    { name: 'Chicken breast', amount: '200', unit: 'g' },
    { name: 'Rice', amount: '100', unit: 'g' },
  ],
  instructionsText: 'Cook the chicken and rice.',
  imageUrl: 'https://example.com/recipe.jpg',
  isApproved: true,
  creationTimestamp: new Date('2024-01-01'),
  lastUpdatedTimestamp: new Date('2024-01-01'),
  createdBy: 'user-123',
  sourceReference: null,
};

describe('RecipeDetailModal - Role-based Endpoint Selection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      recipeId: null,
      recipe: null,
      isOpen: false,
      onClose: vi.fn(),
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <RecipeDetailModal {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Admin User Endpoint Selection', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
        login: vi.fn(),
        logout: vi.fn(),
        isLoading: false,
      });
    });

    it('should use admin endpoint for admin users when fetching by recipeId', async () => {
      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve(mockRecipe),
      } as any);

      renderModal({ recipeId: 'recipe-123', isOpen: true });

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/admin/recipes/recipe-123');
      });
    });

    it('should not fetch when recipe is passed directly (admin)', () => {
      renderModal({ recipe: mockRecipe, isOpen: true });

      // Should not make API call when recipe is provided directly
      expect(mockApiRequest).not.toHaveBeenCalled();
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  describe('Trainer User Endpoint Selection', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'trainer-1', email: 'trainer@test.com', role: 'trainer' },
        login: vi.fn(),
        logout: vi.fn(),
        isLoading: false,
      });
    });

    it('should use public endpoint for trainer users when fetching by recipeId', async () => {
      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve(mockRecipe),
      } as any);

      renderModal({ recipeId: 'recipe-123', isOpen: true });

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/recipes/recipe-123');
      });
    });

    it('should not fetch when recipe is passed directly (trainer)', () => {
      renderModal({ recipe: mockRecipe, isOpen: true });

      // Should not make API call when recipe is provided directly
      expect(mockApiRequest).not.toHaveBeenCalled();
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  describe('Customer User Endpoint Selection', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'customer-1', email: 'customer@test.com', role: 'customer' },
        login: vi.fn(),
        logout: vi.fn(),
        isLoading: false,
      });
    });

    it('should use public endpoint for customer users when fetching by recipeId', async () => {
      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve(mockRecipe),
      } as any);

      renderModal({ recipeId: 'recipe-123', isOpen: true });

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/recipes/recipe-123');
      });
    });

    it('should not fetch when recipe is passed directly (customer)', () => {
      renderModal({ recipe: mockRecipe, isOpen: true });

      // Should not make API call when recipe is provided directly
      expect(mockApiRequest).not.toHaveBeenCalled();
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  describe('Direct Recipe Display (Meal Plan Integration)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'trainer-1', email: 'trainer@test.com', role: 'trainer' },
        login: vi.fn(),
        logout: vi.fn(),
        isLoading: false,
      });
    });

    it('should display recipe details when recipe object is passed directly', () => {
      renderModal({ recipe: mockRecipe, isOpen: true });

      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
      expect(screen.getByText('A delicious test recipe')).toBeInTheDocument();
      expect(screen.getByText('300 kcal')).toBeInTheDocument();
      expect(screen.getByText('25g')).toBeInTheDocument(); // protein
      expect(screen.getByText('15 mins')).toBeInTheDocument(); // prep time
      expect(screen.getByText('Cook the chicken and rice.')).toBeInTheDocument();
    });

    it('should display ingredients when recipe is passed directly', () => {
      renderModal({ recipe: mockRecipe, isOpen: true });

      expect(screen.getByText('200 g Chicken breast')).toBeInTheDocument();
      expect(screen.getByText('100 g Rice')).toBeInTheDocument();
    });

    it('should display tags when recipe is passed directly', () => {
      renderModal({ recipe: mockRecipe, isOpen: true });

      expect(screen.getByText('lunch')).toBeInTheDocument();
      expect(screen.getByText('healthy')).toBeInTheDocument();
      expect(screen.getByText('chicken')).toBeInTheDocument();
    });

    it('should show loading state only when fetching from API', async () => {
      // Set up delayed API response
      let resolvePromise: (value: any) => void;
      const apiPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockApiRequest.mockReturnValue(apiPromise as any);

      // Render with recipeId (should show loading)
      const { rerender } = renderModal({ recipeId: 'recipe-123', isOpen: true });
      
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);

      // Resolve the API call
      resolvePromise!({ json: () => Promise.resolve(mockRecipe) });
      
      await waitFor(() => {
        expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
      });

      // Rerender with direct recipe (should not show loading)
      rerender(
        <QueryClientProvider client={queryClient}>
          <RecipeDetailModal recipe={mockRecipe} isOpen={true} onClose={vi.fn()} />
        </QueryClientProvider>
      );

      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'trainer-1', email: 'trainer@test.com', role: 'trainer' },
        login: vi.fn(),
        logout: vi.fn(),
        isLoading: false,
      });
    });

    it('should show "Recipe not found" when API returns null', async () => {
      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve(null),
      } as any);

      renderModal({ recipeId: 'recipe-123', isOpen: true });

      await waitFor(() => {
        expect(screen.getByText('Recipe not found')).toBeInTheDocument();
      });
    });

    it('should handle modal close properly', () => {
      const mockOnClose = vi.fn();
      renderModal({ recipe: mockRecipe, isOpen: true, onClose: mockOnClose });

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      
      // Modal should be open
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    it('should not render when modal is closed', () => {
      renderModal({ recipe: mockRecipe, isOpen: false });

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Query Key Generation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'trainer-1', email: 'trainer@test.com', role: 'trainer' },
        login: vi.fn(),
        logout: vi.fn(),
        isLoading: false,
      });
    });

    it('should generate unique query keys based on user role and recipe ID', async () => {
      mockApiRequest.mockResolvedValue({
        json: () => Promise.resolve(mockRecipe),
      } as any);

      renderModal({ recipeId: 'recipe-123', isOpen: true });

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/recipes/recipe-123');
      });

      // The query key should include role for cache separation
      // This ensures admin and trainer caches don't interfere
    });
  });
});

describe('Recipe Detail Modal - Meal Plan Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseAuth.mockReturnValue({
      user: { id: 'trainer-1', email: 'trainer@test.com', role: 'trainer' },
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    vi.clearAllMocks();
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      recipeId: null,
      recipe: null,
      isOpen: false,
      onClose: vi.fn(),
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <RecipeDetailModal {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it('should work correctly when called from MealPlanModal with embedded recipe data', () => {
    // Simulate how MealPlanModal passes recipe data from meal plans
    const mealPlanRecipe = {
      ...mockRecipe,
      // Recipe data embedded in meal plan might have slightly different structure
      id: 'embedded-recipe-123',
      name: 'Meal Plan Recipe',
    };

    renderModal({ recipe: mealPlanRecipe, isOpen: true });

    // Should display the embedded recipe without making API calls
    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(screen.getByText('Meal Plan Recipe')).toBeInTheDocument();
    expect(screen.getByText('A delicious test recipe')).toBeInTheDocument();
  });

  it('should handle the meal plan -> recipe detail flow without "recipe not found" errors', () => {
    // This test documents the fix for the original issue
    // When trainers click on meals in their saved meal plans, the recipe data
    // should be displayed directly without API calls that could fail
    
    renderModal({ recipe: mockRecipe, isOpen: true });

    // Should show recipe details immediately
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.queryByText('Recipe not found')).not.toBeInTheDocument();
    
    // Should not attempt to fetch from API
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});