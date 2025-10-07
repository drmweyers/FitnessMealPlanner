import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Admin from '../../../client/src/pages/Admin';
import { useAuth } from '../../../client/src/contexts/AuthContext';
import { useToast } from '../../../client/src/hooks/use-toast';

// Mock the useAuth hook
vi.mock('../../../client/src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the useToast hook
vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock child components to avoid complex rendering issues
vi.mock('../../../client/src/components/SearchFilters', () => ({
  default: () => <div data-testid="search-filters">Search Filters</div>
}));

vi.mock('../../../client/src/components/RecipeCard', () => ({
  default: () => <div data-testid="recipe-card">Recipe Card</div>
}));

vi.mock('../../../client/src/components/RecipeModal', () => ({
  default: () => <div data-testid="recipe-modal">Recipe Modal</div>
}));

vi.mock('../../../client/src/components/PendingRecipesTable', () => ({
  default: () => <div data-testid="pending-recipes-table">Pending Recipes Table</div>
}));

vi.mock('../../../client/src/components/MealPlanGenerator', () => ({
  default: () => <div data-testid="meal-plan-generator">Meal Plan Generator</div>
}));

const mockAdminUser = {
  id: 1,
  email: 'admin@test.com',
  role: 'admin' as const
};

const mockStats = {
  total: 150,
  approved: 120,
  pending: 30,
  users: 25
};

describe('Admin Component - Health Protocol Tab Verification', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    (useAuth as any).mockReturnValue({
      user: mockAdminUser,
      isLoading: false
    });

    // Mock API responses
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/admin/stats')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockStats
        });
      }
      if (url.includes('/api/recipes')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            recipes: [],
            total: 0
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const renderAdmin = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Admin />
      </QueryClientProvider>
    );
  };

  describe('Tab Structure Verification', () => {
    it('should render exactly 3 tabs (no Health Protocol tab)', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Get all tab triggers
      const tabTriggers = screen.getAllByRole('tab');
      
      // Should have exactly 3 tabs
      expect(tabTriggers).toHaveLength(3);
      
      // Verify the exact tab names/values
      const expectedTabs = ['recipes', 'meal-plans', 'admin'];
      expectedTabs.forEach((tabValue, index) => {
        const tab = tabTriggers[index];
        expect(tab).toBeInTheDocument();
        expect(tab).toHaveAttribute('value', tabValue);
      });
    });

    it('should NOT render Health Protocol tab', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Verify Health Protocol tab does not exist
      expect(screen.queryByText(/Health Protocol/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Protocol/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Specialized/i)).not.toBeInTheDocument();
      
      // Check for any health-related tab attributes
      const tabTriggers = screen.getAllByRole('tab');
      tabTriggers.forEach(tab => {
        expect(tab.getAttribute('value')).not.toMatch(/health|protocol|specialized/i);
      });
    });

    it('should have proper tab grid layout with 3 columns', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toHaveClass('grid-cols-3', 'sm:grid-cols-3');
    });

    it('should display correct tab labels', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Verify tab labels
      expect(screen.getByText('Recipes')).toBeInTheDocument();
      expect(screen.getByText('Meal Plan Generator')).toBeInTheDocument();
      expect(screen.getByText('Plans')).toBeInTheDocument(); // Mobile version
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation Verification', () => {
    it('should navigate correctly between all 3 tabs', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Default should be 'recipes' tab active
      const recipesTab = screen.getByRole('tab', { name: /Recipes/i });
      expect(recipesTab).toHaveAttribute('data-state', 'active');

      // Click on meal-plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /Meal Plan Generator/i });
      fireEvent.click(mealPlansTab);
      
      await waitFor(() => {
        expect(mealPlansTab).toHaveAttribute('data-state', 'active');
      });

      // Click on admin tab
      const adminTab = screen.getByRole('tab', { name: /Admin/i });
      fireEvent.click(adminTab);
      
      await waitFor(() => {
        expect(adminTab).toHaveAttribute('data-state', 'active');
      });

      // Click back to recipes tab
      fireEvent.click(recipesTab);
      
      await waitFor(() => {
        expect(recipesTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('should start with recipes tab as default active', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const recipesTab = screen.getByRole('tab', { name: /Recipes/i });
      expect(recipesTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Tab Content Verification', () => {
    it('should render correct content for recipes tab', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByTestId('search-filters')).toBeInTheDocument();
      });

      // Should show stats cards
      expect(screen.getByText('Total Recipes')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('should render correct content for meal-plans tab', async () => {
      renderAdmin();
      
      // Navigate to meal-plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /Meal Plan Generator/i });
      fireEvent.click(mealPlansTab);
      
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-generator')).toBeInTheDocument();
      });
    });

    it('should render correct content for admin tab', async () => {
      renderAdmin();
      
      // Navigate to admin tab
      const adminTab = screen.getByRole('tab', { name: /Admin/i });
      fireEvent.click(adminTab);
      
      await waitFor(() => {
        expect(screen.getByText('Generate Recipes')).toBeInTheDocument();
        expect(screen.getByText('Review Queue')).toBeInTheDocument();
        expect(screen.getByText('Generate New Batch')).toBeInTheDocument();
        expect(screen.getByText(/View Pending/)).toBeInTheDocument();
      });
    });

    it('should NOT render any Health Protocol related content', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Test all tabs for health protocol content
      const tabs = screen.getAllByRole('tab');
      
      for (const tab of tabs) {
        fireEvent.click(tab);
        
        await waitFor(() => {
          const tabpanel = screen.getByRole('tabpanel');
          expect(tabpanel.textContent).not.toMatch(/Health Protocol/i);
          expect(tabpanel.textContent).not.toMatch(/Specialized Protocol/i);
          expect(tabpanel.textContent).not.toMatch(/Longevity/i);
          expect(tabpanel.textContent).not.toMatch(/Parasite/i);
        });
      }
    });
  });

  describe('Component Import Verification', () => {
    it('should not import any Health Protocol related components', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
      
      // Check that health protocol related test IDs don't exist
      expect(screen.queryByTestId('health-protocols')).not.toBeInTheDocument();
      expect(screen.queryByTestId('specialized-protocols')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trainer-health-protocols')).not.toBeInTheDocument();
      expect(screen.queryByTestId('protocol-dashboard')).not.toBeInTheDocument();
      expect(screen.queryByTestId('specialized-protocols-panel')).not.toBeInTheDocument();
    });
  });

  describe('Stats Display Verification', () => {
    it('should display admin stats correctly in recipes tab', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total recipes
        expect(screen.getByText('120')).toBeInTheDocument(); // Approved
        expect(screen.getByText('30')).toBeInTheDocument(); // Pending
        expect(screen.getByText('25')).toBeInTheDocument(); // Users
      });
    });
  });

  describe('Action Cards Verification', () => {
    it('should display Generate Recipes and Review Queue cards in admin tab', async () => {
      renderAdmin();
      
      const adminTab = screen.getByRole('tab', { name: /Admin/i });
      fireEvent.click(adminTab);
      
      await waitFor(() => {
        expect(screen.getByText('Generate Recipes')).toBeInTheDocument();
        expect(screen.getByText('Create new recipes using AI integration')).toBeInTheDocument();
        expect(screen.getByText('Review Queue')).toBeInTheDocument();
        expect(screen.getByText('Review and approve pending recipes')).toBeInTheDocument();
      });

      // Verify buttons exist
      expect(screen.getByRole('button', { name: /Generate New Batch/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /View Pending/i })).toBeInTheDocument();
    });

    it('should NOT display any Health Protocol action cards', async () => {
      renderAdmin();
      
      const adminTab = screen.getByRole('tab', { name: /Admin/i });
      fireEvent.click(adminTab);
      
      await waitFor(() => {
        expect(screen.getByText('Generate Recipes')).toBeInTheDocument();
      });

      // Verify no health protocol related action cards
      expect(screen.queryByText(/Health Protocol/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Specialized Protocol/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Protocol Management/i)).not.toBeInTheDocument();
    });
  });

  describe('Authentication State Verification', () => {
    it('should show access denied for non-authenticated users', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        isLoading: false
      });

      renderAdmin();
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You must be logged in as an admin to access this page.')).toBeInTheDocument();
    });

    it('should render admin interface for authenticated admin users', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Manage recipes, users, and meal plan generation')).toBeInTheDocument();
      });

      // Should not show access denied
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design Verification', () => {
    it('should maintain 3-tab layout across different screen sizes', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const tabsList = screen.getByRole('tablist');
      
      // Verify responsive classes are present for 3-tab layout
      expect(tabsList).toHaveClass('grid-cols-3');
      expect(tabsList).toHaveClass('sm:grid-cols-3');
      
      // Verify all 3 tabs have responsive design elements
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
      
      tabs.forEach(tab => {
        const hiddenText = tab.querySelector('.hidden.sm\\:inline');
        const visibleText = tab.querySelector('.sm\\:hidden');
        // At least one responsive text element should exist
        expect(hiddenText || visibleText).toBeTruthy();
      });
    });
  });
});