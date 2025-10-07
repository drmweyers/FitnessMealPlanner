import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Router } from 'wouter';
import Trainer from '../../../client/src/pages/Trainer';
import { useAuth } from '../../../client/src/contexts/AuthContext';

// Mock the useAuth hook
vi.mock('../../../client/src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock all child components to avoid complex rendering issues
vi.mock('../../../client/src/components/SearchFilters', () => ({
  default: () => <div data-testid="search-filters">Search Filters</div>
}));

vi.mock('../../../client/src/components/RecipeCard', () => ({
  default: () => <div data-testid="recipe-card">Recipe Card</div>
}));

vi.mock('../../../client/src/components/RecipeCardWithAssignment', () => ({
  default: () => <div data-testid="recipe-card-with-assignment">Recipe Card With Assignment</div>
}));

vi.mock('../../../client/src/components/RecipeListItem', () => ({
  default: () => <div data-testid="recipe-list-item">Recipe List Item</div>
}));

vi.mock('../../../client/src/components/RecipeListItemWithAssignment', () => ({
  default: () => <div data-testid="recipe-list-item-with-assignment">Recipe List Item With Assignment</div>
}));

vi.mock('../../../client/src/components/RecipeModal', () => ({
  default: () => <div data-testid="recipe-modal">Recipe Modal</div>
}));

vi.mock('../../../client/src/components/RecipeAssignment', () => ({
  default: () => <div data-testid="recipe-assignment">Recipe Assignment</div>
}));

vi.mock('../../../client/src/components/MealPlanGenerator', () => ({
  default: () => <div data-testid="meal-plan-generator">Meal Plan Generator</div>
}));

vi.mock('../../../client/src/components/CustomerManagement', () => ({
  default: () => <div data-testid="customer-management">Customer Management</div>
}));

vi.mock('../../../client/src/components/TrainerMealPlans', () => ({
  default: () => <div data-testid="trainer-meal-plans">Trainer Meal Plans</div>
}));

const mockUser = {
  id: 1,
  email: 'trainer@test.com',
  role: 'trainer' as const
};

describe('Trainer Component - Health Protocol Tab Removal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    (useAuth as any).mockReturnValue({
      user: mockUser,
      isLoading: false
    });

    // Mock successful API response for recipes
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        recipes: [],
        total: 0
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const renderTrainer = (initialLocation = '/trainer') => {
    return render(
      <Router base="" hook={() => [initialLocation, () => {}]}>
        <QueryClientProvider client={queryClient}>
          <Trainer />
        </QueryClientProvider>
      </Router>
    );
  };

  describe('Tab Structure Verification', () => {
    it('should render exactly 4 tabs (no Health Protocol tab)', async () => {
      renderTrainer();
      
      await waitFor(() => {
        expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
      });

      // Get all tab triggers
      const tabTriggers = screen.getAllByRole('tab');
      
      // Should have exactly 4 tabs
      expect(tabTriggers).toHaveLength(4);
      
      // Verify the exact tab names/values
      const expectedTabs = ['recipes', 'meal-plan', 'saved-plans', 'customers'];
      expectedTabs.forEach((tabValue) => {
        const tab = screen.getByRole('tab', { name: new RegExp(tabValue === 'recipes' ? 'Browse Recipes' : 
          tabValue === 'meal-plan' ? 'Generate Plans' : 
          tabValue === 'saved-plans' ? 'Saved Plans' : 'Customers', 'i') });
        expect(tab).toBeInTheDocument();
        expect(tab).toHaveAttribute('data-state', tabValue === 'recipes' ? 'active' : 'inactive');
      });
    });

    it('should NOT render Health Protocol tab', async () => {
      renderTrainer();
      
      await waitFor(() => {
        expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
      });

      // Verify Health Protocol tab does not exist
      expect(screen.queryByText(/Health Protocol/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Protocol/i)).not.toBeInTheDocument();
      
      // Check for any health-related tab attributes
      const tabTriggers = screen.getAllByRole('tab');
      tabTriggers.forEach(tab => {
        expect(tab.getAttribute('value')).not.toMatch(/health|protocol/i);
      });
    });

    it('should have proper tab grid layout with 4 columns', async () => {
      renderTrainer();
      
      await waitFor(() => {
        expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
      });

      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toHaveClass('grid-cols-2', 'sm:grid-cols-4');
    });
  });

  describe('Tab Navigation Verification', () => {
    it('should navigate correctly between all 4 tabs', async () => {
      const mockNavigate = vi.fn();
      
      render(
        <Router base="" hook={() => ['/trainer', mockNavigate]}>
          <QueryClientProvider client={queryClient}>
            <Trainer />
          </QueryClientProvider>
        </Router>
      );

      await waitFor(() => {
        expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
      });

      // Test navigation to meal-plan tab
      const mealPlanTab = screen.getByRole('tab', { name: /Generate Plans/i });
      fireEvent.click(mealPlanTab);
      expect(mockNavigate).toHaveBeenCalledWith('/meal-plan-generator');

      // Test navigation to customers tab
      const customersTab = screen.getByRole('tab', { name: /Customers/i });
      fireEvent.click(customersTab);
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/customers');

      // Test navigation to saved-plans tab
      const savedPlansTab = screen.getByRole('tab', { name: /Saved Plans/i });
      fireEvent.click(savedPlansTab);
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/meal-plans');

      // Test navigation back to recipes tab
      const recipesTab = screen.getByRole('tab', { name: /Browse Recipes/i });
      fireEvent.click(recipesTab);
      expect(mockNavigate).toHaveBeenCalledWith('/trainer');
    });

    it('should properly determine active tab based on URL', () => {
      // Test each URL path
      const testCases = [
        { path: '/trainer', expectedActiveTab: 'recipes' },
        { path: '/meal-plan-generator', expectedActiveTab: 'meal-plan' },
        { path: '/trainer/customers', expectedActiveTab: 'customers' },
        { path: '/trainer/meal-plans', expectedActiveTab: 'saved-plans' }
      ];

      testCases.forEach(({ path, expectedActiveTab }) => {
        const { unmount } = renderTrainer(path);
        
        const activeTab = screen.getByRole('tab', { selected: true });
        expect(activeTab).toHaveAttribute('value', expectedActiveTab);
        
        unmount();
      });
    });
  });

  describe('Tab Content Verification', () => {
    it('should render correct content for recipes tab', async () => {
      renderTrainer('/trainer');
      
      await waitFor(() => {
        expect(screen.getByTestId('search-filters')).toBeInTheDocument();
      });
    });

    it('should render correct content for meal-plan tab', async () => {
      renderTrainer('/meal-plan-generator');
      
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-generator')).toBeInTheDocument();
      });
    });

    it('should render correct content for customers tab', async () => {
      renderTrainer('/trainer/customers');
      
      await waitFor(() => {
        expect(screen.getByTestId('customer-management')).toBeInTheDocument();
      });
    });

    it('should render correct content for saved-plans tab', async () => {
      renderTrainer('/trainer/meal-plans');
      
      await waitFor(() => {
        expect(screen.getByTestId('trainer-meal-plans')).toBeInTheDocument();
      });
    });

    it('should NOT render any Health Protocol related content', async () => {
      // Test all possible tabs
      const paths = ['/trainer', '/meal-plan-generator', '/trainer/customers', '/trainer/meal-plans'];
      
      for (const path of paths) {
        const { unmount } = renderTrainer(path);
        
        await waitFor(() => {
          const tabContent = screen.queryByRole('tabpanel');
          if (tabContent) {
            expect(tabContent.textContent).not.toMatch(/Health Protocol/i);
            expect(tabContent.textContent).not.toMatch(/Specialized Protocol/i);
            expect(tabContent.textContent).not.toMatch(/Longevity/i);
            expect(tabContent.textContent).not.toMatch(/Parasite/i);
          }
        });
        
        unmount();
      }
    });
  });

  describe('Component Import Verification', () => {
    it('should not import any Health Protocol related components', () => {
      // This test verifies that no health protocol components are imported
      // by checking the rendered output doesn't contain health protocol elements
      renderTrainer();
      
      // Check that health protocol related test IDs don't exist
      expect(screen.queryByTestId('health-protocols')).not.toBeInTheDocument();
      expect(screen.queryByTestId('specialized-protocols')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trainer-health-protocols')).not.toBeInTheDocument();
      expect(screen.queryByTestId('protocol-dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design Verification', () => {
    it('should maintain 4-tab layout across different screen sizes', async () => {
      renderTrainer();
      
      await waitFor(() => {
        expect(screen.getByText('Browse Recipes')).toBeInTheDocument();
      });

      const tabsList = screen.getByRole('tablist');
      
      // Verify responsive classes are present for 4-tab layout
      expect(tabsList).toHaveClass('grid-cols-2'); // Mobile: 2 columns
      expect(tabsList).toHaveClass('sm:grid-cols-4'); // Desktop: 4 columns
      
      // Verify all 4 tabs have responsive text classes
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        const tabContent = tab.querySelector('.hidden.lg\\:inline, .lg\\:hidden');
        expect(tabContent).toBeTruthy(); // Each tab should have responsive text elements
      });
    });
  });
});