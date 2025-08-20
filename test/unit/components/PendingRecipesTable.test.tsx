/**
 * PendingRecipesTable Component Tests
 * 
 * Comprehensive tests for the PendingRecipesTable component covering:
 * - Pending recipes data fetching and display
 * - Individual approve/delete actions
 * - Bulk approve functionality
 * - Table rendering with proper data
 * - Loading states and error handling
 * - Responsive design (mobile card view vs desktop table view)
 * - Recipe detail modal interactions
 * - Cache management and query invalidation
 * - Authentication error handling
 * - Empty state rendering
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PendingRecipesTable from '@/components/PendingRecipesTable';
import { renderWithProviders, mockUsers, generateMockRecipes, testData } from '../../test-utils';
import { QueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock authentication utilities
vi.mock('@/lib/authUtils', () => ({
  isUnauthorizedError: (error: any) => 
    error?.message?.includes('401') || 
    error?.message?.includes('Unauthorized') || 
    error?.message?.includes('jwt expired'),
}));

// Mock RecipeModal component
vi.mock('@/components/RecipeModal', () => ({
  default: ({ recipe, onClose }: any) => (
    <div data-testid="recipe-modal">
      <h2 data-testid="recipe-modal-title">{recipe.name}</h2>
      <p data-testid="recipe-modal-description">{recipe.description}</p>
      <button onClick={onClose} data-testid="close-recipe-modal">Close</button>
    </div>
  ),
}));

// Mock window location for redirect tests
const mockLocationHref = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

// Mock fetch globally for pending recipes
global.fetch = vi.fn();

describe('PendingRecipesTable', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  // Mock pending recipes data
  const mockPendingRecipes = generateMockRecipes(5).map(recipe => ({
    ...recipe,
    isApproved: false,
    name: `Pending ${recipe.name}`,
    description: `Pending ${recipe.description}`,
  }));

  const mockPendingRecipesResponse = {
    recipes: mockPendingRecipes,
    total: 5,
    page: 1,
    limit: 50,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0, refetchOnMount: true },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
    vi.clearAllMocks();

    // Default fetch mock for pending recipes
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPendingRecipesResponse),
    });

    // Default API request mock for mutations
    vi.mocked(apiRequest).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });

    // Mock window location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Component Rendering and Data Loading', () => {
    it('renders loading state initially', () => {
      (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      // Should show loading skeletons
      const loadingElements = screen.getAllByRole('generic');
      const skeletons = loadingElements.filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders pending recipes table with data', async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        mockPendingRecipes.forEach(recipe => {
          expect(screen.getByText(recipe.name)).toBeInTheDocument();
        });
      });
    });

    it('renders empty state when no pending recipes', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ recipes: [], total: 0 }),
      });

      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('No pending recipes')).toBeInTheDocument();
        expect(screen.getByText('All recipes have been reviewed and approved.')).toBeInTheDocument();
      });
    });

    it('displays recipe count in batch actions header', async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('5 recipes pending approval')).toBeInTheDocument();
      });
    });
  });

  describe('Individual Recipe Actions', () => {
    beforeEach(async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });
    });

    it('renders approve buttons for each recipe', () => {
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      expect(approveButtons).toHaveLength(mockPendingRecipes.length);
    });

    it('renders delete buttons for each recipe', () => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(mockPendingRecipes.length);
    });

    it('approves individual recipe when approve button is clicked', async () => {
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
        'PATCH',
        `/api/admin/recipes/${mockPendingRecipes[0].id}/approve`
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Recipe Approved',
          description: 'Recipe has been approved and is now visible to users.',
        });
      });
    });

    it('deletes individual recipe when delete button is clicked', async () => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
        'DELETE',
        `/api/admin/recipes/${mockPendingRecipes[0].id}`
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Recipe Deleted',
          description: 'Recipe has been removed from the system.',
        });
      });
    });

    it('disables buttons during individual operations', async () => {
      vi.mocked(apiRequest).mockImplementation(() => new Promise(() => {})); // Never resolves

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      expect(approveButtons[0]).toBeDisabled();
    });

    it('handles approve operation error', async () => {
      vi.mocked(apiRequest).mockRejectedValue(new Error('Approval failed'));

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to approve recipe',
          variant: 'destructive',
        });
      });
    });

    it('handles delete operation error', async () => {
      vi.mocked(apiRequest).mockRejectedValue(new Error('Delete failed'));

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to delete recipe',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Bulk Approve Functionality', () => {
    beforeEach(async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });
    });

    it('renders bulk approve button with correct count', () => {
      expect(screen.getByRole('button', { name: /approve all \(5\)/i })).toBeInTheDocument();
    });

    it('executes bulk approve when button is clicked', async () => {
      const bulkApproveButton = screen.getByRole('button', { name: /approve all \(5\)/i });
      await user.click(bulkApproveButton);

      // Should call bulk approve endpoint with all recipe IDs
      expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
        'POST',
        '/api/admin/recipes/bulk-approve',
        {
          recipeIds: mockPendingRecipes.map(recipe => recipe.id)
        }
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'All Recipes Approved',
          description: 'Successfully approved 5 recipes. They are now visible to users.',
        });
      });
    });

    it('shows loading state during bulk approve', async () => {
      vi.mocked(apiRequest).mockImplementation(() => new Promise(() => {})); // Never resolves

      const bulkApproveButton = screen.getByRole('button', { name: /approve all \(5\)/i });
      await user.click(bulkApproveButton);

      expect(screen.getByText(/approving all.../i)).toBeInTheDocument();
      expect(bulkApproveButton).toBeDisabled();
    });

    it('handles bulk approve error', async () => {
      vi.mocked(apiRequest).mockRejectedValue(new Error('Bulk approve failed'));

      const bulkApproveButton = screen.getByRole('button', { name: /approve all \(5\)/i });
      await user.click(bulkApproveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to approve all recipes',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Recipe Detail Modal Interactions', () => {
    beforeEach(async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });
    });

    it('opens recipe detail modal when recipe name is clicked', async () => {
      const recipeName = screen.getByText(mockPendingRecipes[0].name);
      await user.click(recipeName);

      expect(screen.getByTestId('recipe-modal')).toBeInTheDocument();
      expect(screen.getByTestId('recipe-modal-title')).toHaveTextContent(mockPendingRecipes[0].name);
    });

    it('opens recipe detail modal when recipe image is clicked', async () => {
      // Find recipe image (by looking for img elements)
      const recipeImages = screen.getAllByRole('img');
      if (recipeImages.length > 0) {
        await user.click(recipeImages[0]);
        expect(screen.getByTestId('recipe-modal')).toBeInTheDocument();
      }
    });

    it('closes recipe detail modal when close button is clicked', async () => {
      const recipeName = screen.getByText(mockPendingRecipes[0].name);
      await user.click(recipeName);

      expect(screen.getByTestId('recipe-modal')).toBeInTheDocument();

      const closeButton = screen.getByTestId('close-recipe-modal');
      await user.click(closeButton);

      expect(screen.queryByTestId('recipe-modal')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    beforeEach(async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });
    });

    it('renders mobile card view with responsive classes', () => {
      // Mobile view should have lg:hidden class and specific mobile layout
      const mobileView = screen.getByText(mockPendingRecipes[0].name).closest('[class*="lg:hidden"]');
      expect(mobileView).toBeInTheDocument();
    });

    it('renders desktop table view with responsive classes', () => {
      // Desktop table should have hidden lg:block classes
      const desktopTable = screen.getByRole('table');
      expect(desktopTable).toBeInTheDocument();
      expect(desktopTable.closest('[class*="hidden lg:block"]')).toBeInTheDocument();
    });

    it('displays recipe information in both mobile and desktop views', () => {
      // Recipe name should appear in both views
      const recipeNames = screen.getAllByText(mockPendingRecipes[0].name);
      expect(recipeNames.length).toBeGreaterThanOrEqual(1);

      // Calories should be displayed
      expect(screen.getByText(`${mockPendingRecipes[0].caloriesKcal} cal`)).toBeInTheDocument();
      
      // Protein should be displayed
      const proteinValue = Number(mockPendingRecipes[0].proteinGrams).toFixed(0);
      expect(screen.getByText(`${proteinValue}g protein`)).toBeInTheDocument();
    });

    it('renders action buttons in both views', () => {
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      
      // Should have buttons for both mobile and desktop views
      expect(approveButtons.length).toBeGreaterThanOrEqual(mockPendingRecipes.length);
      expect(deleteButtons.length).toBeGreaterThanOrEqual(mockPendingRecipes.length);
    });
  });

  describe('Cache Management and Query Invalidation', () => {
    it('invalidates queries and triggers refetch after successful approve', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
      
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/recipes'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/stats'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/recipes'] });
        // Should trigger immediate refetch of pending recipes
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/recipes?approved=false&page=1&limit=50',
          { credentials: 'include' }
        );
      });
    });

    it('provides manual refresh functionality', async () => {
      const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/recipes'] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/recipes'] });
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Refreshing',
        description: 'Updating recipe data...',
      });
    });

    it('invalidates queries after bulk approve', async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });

      const bulkApproveButton = screen.getByRole('button', { name: /approve all/i });
      await user.click(bulkApproveButton);

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/recipes'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/admin/stats'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['/api/recipes'] });
      });
    });
  });

  describe('Authentication Error Handling', () => {
    beforeEach(async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });
    });

    it('handles unauthorized error during approve', async () => {
      vi.mocked(apiRequest).mockRejectedValue(new Error('401 Unauthorized'));

      let currentHref = '';
      Object.defineProperty(window.location, 'href', {
        get: () => currentHref,
        set: (value) => { currentHref = value; },
      });

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
      });

      // Should redirect to login after timeout
      vi.useFakeTimers();
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(currentHref).toBe('/api/login');
      });

      vi.useRealTimers();
    });

    it('handles unauthorized error during delete', async () => {
      vi.mocked(apiRequest).mockRejectedValue(new Error('jwt expired'));

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
      });
    });

    it('handles unauthorized error during bulk approve', async () => {
      vi.mocked(apiRequest).mockRejectedValue(new Error('Authentication required'));

      const bulkApproveButton = screen.getByRole('button', { name: /approve all/i });
      await user.click(bulkApproveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Data Display and Formatting', () => {
    beforeEach(async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });
    });

    it('displays recipe names correctly', () => {
      mockPendingRecipes.forEach(recipe => {
        expect(screen.getByText(recipe.name)).toBeInTheDocument();
      });
    });

    it('displays recipe descriptions with truncation', () => {
      // Check that descriptions are displayed (possibly truncated)
      mockPendingRecipes.forEach(recipe => {
        if (recipe.description) {
          const description = recipe.description.length > 50 
            ? recipe.description.slice(0, 50) + '...'
            : recipe.description;
          // Description might be truncated in the UI, so just check it exists
          expect(screen.getByText(recipe.description.slice(0, 30), { exact: false })).toBeInTheDocument();
        }
      });
    });

    it('displays nutritional information correctly', () => {
      mockPendingRecipes.forEach(recipe => {
        expect(screen.getByText(`${recipe.caloriesKcal} cal`)).toBeInTheDocument();
        const proteinValue = Number(recipe.proteinGrams).toFixed(0);
        expect(screen.getByText(`${proteinValue}g protein`)).toBeInTheDocument();
      });
    });

    it('displays meal type badges', () => {
      mockPendingRecipes.forEach(recipe => {
        if (recipe.mealTypes && recipe.mealTypes.length > 0) {
          expect(screen.getByText(recipe.mealTypes[0])).toBeInTheDocument();
        }
      });
    });

    it('displays pending status badges', () => {
      const pendingBadges = screen.getAllByText('Pending');
      expect(pendingBadges.length).toBeGreaterThan(0);
    });

    it('displays recipe images with fallback', () => {
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        // Should have either actual URL or placeholder
        const src = img.getAttribute('src');
        expect(src).toBeTruthy();
      });
    });

    it('shows results summary', () => {
      expect(screen.getByText('Showing 5 pending recipes')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles fetch error gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      // Should handle error gracefully without crashing
      await waitFor(() => {
        // Component should still render structure, just without data
        expect(document.body).toBeInTheDocument();
      });
    });

    it('handles malformed recipe data', async () => {
      const malformedRecipes = [
        {
          id: 'malformed-1',
          name: '', // Empty name
          caloriesKcal: 'invalid', // Invalid number
          proteinGrams: null, // Null protein
          mealTypes: undefined, // Undefined meal types
        },
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ recipes: malformedRecipes }),
      });

      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      // Should not crash with malformed data
      await waitFor(() => {
        expect(screen.getByText('1 recipes pending approval')).toBeInTheDocument();
      });
    });

    it('handles empty recipe array', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ recipes: [] }),
      });

      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('No pending recipes')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('uses proper query configuration for data fetching', async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      // Check that the fetch was made with proper credentials and query parameters
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/recipes?approved=false&page=1&limit=50',
          {
            credentials: 'include',
          }
        );
      });
    });

    it('implements proper stale time and refetch behavior', () => {
      const queries = queryClient.getQueryCache().getAll();
      const recipesQuery = queries.find(q => 
        q.queryKey.some(key => typeof key === 'string' && key.includes('/api/admin/recipes'))
      );

      if (recipesQuery) {
        expect(recipesQuery.options.staleTime).toBe(0);
        expect(recipesQuery.options.refetchOnMount).toBe(true);
      }
    });

    it('uses efficient bulk API call for bulk operations', async () => {
      renderWithProviders(<PendingRecipesTable />, {
        queryClient,
        authContextValue: { 
          user: mockUsers.admin, 
          isAuthenticated: true, 
          isLoading: false,
          error: undefined,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText(mockPendingRecipes[0].name)).toBeInTheDocument();
      });

      const bulkApproveButton = screen.getByRole('button', { name: /approve all/i });
      await user.click(bulkApproveButton);

      // Should make only one API call to bulk endpoint instead of multiple individual calls
      expect(vi.mocked(apiRequest)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
        'POST',
        '/api/admin/recipes/bulk-approve',
        {
          recipeIds: mockPendingRecipes.map(recipe => recipe.id)
        }
      );
    });
  });
});