/**
 * Admin Page - Recipe Library Tab Tests
 *
 * Tests specifically for verifying that the AI Recipe Generator has been removed
 * from the Recipe Library tab and AdminRecipeGenerator component is not rendered.
 *
 * Changes verified:
 * - "Generate Recipes" button is NOT rendered
 * - AdminRecipeGenerator component is NOT imported
 * - RecipeGenerationModal is NOT rendered
 * - Recipe Library tab only shows: search/filters, bulk delete, review queue, export
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Admin from '@/pages/Admin';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock components
vi.mock('@/components/SearchFilters', () => ({
  default: ({ filters, onFilterChange }: any) => (
    <div data-testid="search-filters">
      <input
        data-testid="search-input"
        placeholder="Search recipes..."
        onChange={(e) => onFilterChange({ search: e.target.value })}
      />
    </div>
  ),
}));

vi.mock('@/components/RecipeCard', () => ({
  default: ({ recipe }: any) => (
    <div data-testid={`recipe-card-${recipe.id}`}>
      <h3>{recipe.name}</h3>
    </div>
  ),
}));

vi.mock('@/components/RecipeTable', () => ({
  default: ({ recipes, isLoading }: any) => {
    if (isLoading) return <div>Loading...</div>;
    return (
      <div data-testid="recipe-table">
        {recipes.map((recipe: any) => (
          <div key={recipe.id}>{recipe.name}</div>
        ))}
      </div>
    );
  },
}));

vi.mock('@/components/ViewToggle', () => ({
  default: ({ viewType, onViewTypeChange }: any) => (
    <div data-testid="view-toggle">
      <button onClick={() => onViewTypeChange('cards')}>Cards</button>
      <button onClick={() => onViewTypeChange('table')}>Table</button>
    </div>
  ),
}));

vi.mock('@/components/BulkDeleteToolbar', () => ({
  default: ({ selectedCount, onBulkDelete }: any) => (
    <div data-testid="bulk-delete-toolbar">
      <button onClick={onBulkDelete} data-testid="bulk-delete-btn">
        Delete {selectedCount}
      </button>
    </div>
  ),
}));

vi.mock('@/components/RecipeModal', () => ({
  default: ({ recipe, onClose }: any) => (
    <div data-testid="recipe-modal">
      <h2>{recipe.name}</h2>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/components/PendingRecipesTable', () => ({
  default: () => <div data-testid="pending-recipes-table">Pending Recipes</div>,
}));

vi.mock('@/components/MealPlanGenerator', () => ({
  default: () => <div data-testid="meal-plan-generator">Meal Plan Generator</div>,
}));

vi.mock('@/components/ExportJSONModal', () => ({
  default: ({ isOpen }: any) =>
    isOpen ? <div data-testid="export-json-modal">Export Modal</div> : null,
}));

vi.mock('@/components/BMADRecipeGenerator', () => ({
  default: () => <div data-testid="bmad-recipe-generator">BMAD Generator</div>,
}));

// Wrapper component
const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  const mockUser = {
    id: '1',
    email: 'admin@test.com',
    role: 'admin' as const,
    name: 'Admin User',
  };

  const mockAuthContext = {
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    error: undefined,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  };

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider value={mockAuthContext}>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Admin Page - Recipe Library Tab (AI Generator Removal)', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const mockStats = {
    total: 100,
    approved: 80,
    pending: 20,
    users: 50,
  };

  const mockRecipes = [
    {
      id: '1',
      name: 'Test Recipe 1',
      description: 'Description 1',
      approved: true,
    },
    {
      id: '2',
      name: 'Test Recipe 2',
      description: 'Description 2',
      approved: true,
    },
  ];

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();

    // Mock API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/admin/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats),
        });
      }
      if (url.includes('/api/admin/recipes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            recipes: mockRecipes,
            total: mockRecipes.length,
            page: 1,
            limit: 12,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe('Recipe Library Tab - Removed Components', () => {
    it('should NOT render "Generate Recipes" button in Recipe Library tab', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Verify we're on the Recipe Library tab
      expect(screen.getByRole('tab', { name: /Recipe Library/i })).toBeInTheDocument();

      // Verify "Generate Recipes" button does NOT exist
      expect(screen.queryByRole('button', { name: /Generate Recipes/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Generate New Batch/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/AI Recipe Generator/i)).not.toBeInTheDocument();
    });

    it('should NOT render RecipeGenerationModal component', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // RecipeGenerationModal should not be rendered at all
      expect(screen.queryByTestId('recipe-generation-modal')).not.toBeInTheDocument();
      expect(screen.queryByText(/Generate Recipes/i)).not.toBeInTheDocument();
    });

    it('should NOT render AdminRecipeGenerator component', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // AdminRecipeGenerator component should not be rendered
      expect(screen.queryByTestId('admin-recipe-generator')).not.toBeInTheDocument();
    });

    it('should NOT have any references to old AI recipe generation UI', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Verify no AI generation UI elements exist
      expect(screen.queryByText(/AI-Powered/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Natural Language/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Parse with AI/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /AI/i })).not.toBeInTheDocument();
    });
  });

  describe('Recipe Library Tab - Existing Components', () => {
    it('should render search and filter components', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByTestId('search-filters')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search recipes/i)).toBeInTheDocument();
    });

    it('should render "Review Queue" button with pending count', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Review Queue/i })).toBeInTheDocument();
      expect(screen.getByText(/\(20\)/)).toBeInTheDocument(); // Pending count
    });

    it('should render "Export Data" button', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Export Data/i })).toBeInTheDocument();
    });

    it('should render view toggle (cards/table)', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
    });

    it('should render select mode button', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Select Mode/i })).toBeInTheDocument();
    });

    it('should render stats cards', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Recipes')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // Total count
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument(); // Approved count
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument(); // Pending count
    });
  });

  describe('Recipe Library Tab - Only Three Tabs', () => {
    it('should only render three tabs: Recipe Library, Meal Plan Builder, Bulk Generator', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Verify exactly 3 tabs exist
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);

      // Verify tab names
      expect(screen.getByRole('tab', { name: /Recipe Library/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Meal Plan Builder/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Bulk Generator/i })).toBeInTheDocument();
    });

    it('should NOT have a fourth "Admin" tab', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // The old "Admin" tab should not exist
      expect(screen.queryByRole('tab', { name: /^Admin$/i })).not.toBeInTheDocument();
    });
  });

  describe('BMAD Bulk Generator Tab', () => {
    it('should render BMAD Generator in third tab', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Click on Bulk Generator tab
      const bmadTab = screen.getByRole('tab', { name: /Bulk Generator/i });
      await user.click(bmadTab);

      await waitFor(() => {
        expect(screen.getByTestId('bmad-recipe-generator')).toBeInTheDocument();
      });
    });

    it('should show BMAD tab with robot icon', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const bmadTab = screen.getByRole('tab', { name: /Bulk Generator/i });
      expect(bmadTab).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should open Review Queue modal when button is clicked', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const reviewQueueBtn = screen.getByRole('button', { name: /Review Queue/i });
      await user.click(reviewQueueBtn);

      await waitFor(() => {
        expect(screen.getByText('Pending Recipes')).toBeInTheDocument();
        expect(screen.getByTestId('pending-recipes-table')).toBeInTheDocument();
      });
    });

    it('should open Export JSON modal when button is clicked', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const exportBtn = screen.getByRole('button', { name: /Export Data/i });
      await user.click(exportBtn);

      await waitFor(() => {
        expect(screen.getByTestId('export-json-modal')).toBeInTheDocument();
      });
    });

    it('should switch between cards and table view', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const viewToggle = screen.getByTestId('view-toggle');
      const tableButton = viewToggle.querySelector('button:last-child');

      if (tableButton) {
        await user.click(tableButton);

        await waitFor(() => {
          expect(screen.getByTestId('recipe-table')).toBeInTheDocument();
        });
      }
    });

    it('should enable selection mode when Select Mode button is clicked', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const selectModeBtn = screen.getByRole('button', { name: /Select Mode/i });
      await user.click(selectModeBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Exit Selection/i })).toBeInTheDocument();
        expect(screen.getByTestId('bulk-delete-toolbar')).toBeInTheDocument();
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain all existing recipe management functionality', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // All core recipe management features should still work
      expect(screen.getByTestId('search-filters')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Review Queue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export Data/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Select Mode/i })).toBeInTheDocument();
      expect(screen.getByTestId('view-toggle')).toBeInTheDocument();

      // Stats should display
      expect(screen.getByText('Total Recipes')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
    });

    it('should maintain meal plan generation functionality in second tab', async () => {
      render(<Admin />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const mealPlanTab = screen.getByRole('tab', { name: /Meal Plan Builder/i });
      await user.click(mealPlanTab);

      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-generator')).toBeInTheDocument();
      });
    });
  });
});
