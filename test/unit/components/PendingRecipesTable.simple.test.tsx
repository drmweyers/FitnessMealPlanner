/**
 * Simplified PendingRecipesTable Component Tests
 * Testing the core functionality after our fixes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PendingRecipesTable from '@/components/PendingRecipesTable';
import { renderWithProviders, mockUsers } from '../../test-utils';
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
    error?.message?.includes('Unauthorized'),
}));

// Mock RecipeModal component
vi.mock('@/components/RecipeModal', () => ({
  default: ({ recipe, onClose }: any) => (
    <div data-testid="recipe-modal">
      <h2>{recipe.name}</h2>
      <button onClick={onClose} data-testid="close-modal">Close</button>
    </div>
  ),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('PendingRecipesTable - Core Functionality', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  const mockPendingRecipes = [
    {
      id: 'recipe-1',
      name: 'Test Pending Recipe 1',
      description: 'A test recipe',
      caloriesKcal: 400,
      proteinGrams: 30,
      mealTypes: ['lunch'],
      isApproved: false,
      imageUrl: 'http://example.com/image.jpg'
    },
    {
      id: 'recipe-2', 
      name: 'Test Pending Recipe 2',
      description: 'Another test recipe',
      caloriesKcal: 500,
      proteinGrams: 25,
      mealTypes: ['dinner'],
      isApproved: false,
      imageUrl: 'http://example.com/image2.jpg'
    }
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    user = userEvent.setup();
    vi.clearAllMocks();

    // Mock fetch to return pending recipes
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        recipes: mockPendingRecipes,
        total: 2
      }),
    });

    // Mock API request for mutations
    vi.mocked(apiRequest).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe('Basic Rendering', () => {
    it('should render pending recipes from API', async () => {
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

      // Wait for recipes to load
      await waitFor(() => {
        expect(screen.getByText('Test Pending Recipe 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Pending Recipe 2')).toBeInTheDocument();
    });

    it('should call API with correct pending recipes filter', async () => {
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
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/recipes?approved=false&page=1&limit=50',
          { credentials: 'include' }
        );
      });
    });

    it('should display recipe count in header', async () => {
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
        expect(screen.getByText('2 recipes pending approval')).toBeInTheDocument();
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
        expect(screen.getByText('Test Pending Recipe 1')).toBeInTheDocument();
      });
    });

    it('should approve individual recipe', async () => {
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
        'PATCH',
        '/api/admin/recipes/recipe-1/approve'
      );
    });

    it('should delete individual recipe', async () => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
        'DELETE',
        '/api/admin/recipes/recipe-1'
      );
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
        expect(screen.getByText('Test Pending Recipe 1')).toBeInTheDocument();
      });
    });

    it('should render bulk approve button with count', () => {
      expect(screen.getByRole('button', { name: /approve all \(2\)/i })).toBeInTheDocument();
    });

    it('should call bulk approve API when clicked', async () => {
      const bulkApproveButton = screen.getByRole('button', { name: /approve all \(2\)/i });
      await user.click(bulkApproveButton);

      expect(vi.mocked(apiRequest)).toHaveBeenCalledWith(
        'POST',
        '/api/admin/recipes/bulk-approve',
        {
          recipeIds: ['recipe-1', 'recipe-2']
        }
      );
    });

    it('should show success toast after bulk approve', async () => {
      const bulkApproveButton = screen.getByRole('button', { name: /approve all \(2\)/i });
      await user.click(bulkApproveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'All Recipes Approved',
          description: 'Successfully approved 2 recipes. They are now visible to users.',
        });
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no pending recipes', async () => {
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
      });
    });
  });
});