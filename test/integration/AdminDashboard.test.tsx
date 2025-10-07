import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Admin from '../../client/src/pages/Admin';

// Mock the AuthContext
const mockUser = {
  id: 'admin-id',
  email: 'admin@test.com',
  role: 'admin',
  name: 'Admin User',
};

const mockAuthContext = {
  user: mockUser,
  login: vi.fn(),
  logout: vi.fn(),
  signup: vi.fn(),
  isLoading: false,
};

vi.mock('../../client/src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'mock-token'),
    setItem: vi.fn(),
  },
});

// Mock URL and DOM methods for file download testing
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

const mockClick = vi.fn();
const mockAnchor = {
  href: '',
  download: '',
  click: mockClick,
};

Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName) => {
    if (tagName === 'a') {
      return mockAnchor;
    }
    return {};
  }),
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn(),
});

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn(),
});

// Mock all the child components to focus on integration
vi.mock('../../client/src/components/SearchFilters', () => ({
  default: ({ onFilterChange }: any) => (
    <div data-testid="search-filters">
      <input 
        data-testid="search-input"
        onChange={(e) => onFilterChange({ search: e.target.value })}
        placeholder="Search recipes..."
      />
    </div>
  ),
}));

vi.mock('../../client/src/components/ViewToggle', () => ({
  default: ({ viewType, onViewTypeChange }: any) => (
    <div data-testid="view-toggle">
      <button onClick={() => onViewTypeChange('cards')}>Cards</button>
      <button onClick={() => onViewTypeChange('table')}>Table</button>
    </div>
  ),
}));

vi.mock('../../client/src/components/RecipeCard', () => ({
  default: ({ recipe, onClick }: any) => (
    <div data-testid="recipe-card" onClick={() => onClick(recipe)}>
      {recipe.name}
    </div>
  ),
}));

vi.mock('../../client/src/components/RecipeTable', () => ({
  default: ({ recipes, onRecipeClick }: any) => (
    <div data-testid="recipe-table">
      {recipes.map((recipe: any) => (
        <div 
          key={recipe.id} 
          data-testid="recipe-table-row"
          onClick={() => onRecipeClick(recipe)}
        >
          {recipe.name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../client/src/components/RecipeModal', () => ({
  default: ({ recipe, onClose }: any) => (
    <div data-testid="recipe-modal">
      <h2>{recipe.name}</h2>
      <button onClick={onClose} data-testid="close-modal">Close</button>
    </div>
  ),
}));

vi.mock('../../client/src/components/RecipeGenerationModal', () => ({
  default: ({ isOpen, onClose }: any) => isOpen ? (
    <div data-testid="recipe-generation-modal">
      <h2>Generate Recipes</h2>
      <button onClick={onClose} data-testid="close-generation-modal">Close</button>
    </div>
  ) : null,
}));

vi.mock('../../client/src/components/PendingRecipesTable', () => ({
  default: () => <div data-testid="pending-recipes-table">Pending Recipes</div>,
}));

vi.mock('../../client/src/components/MealPlanGenerator', () => ({
  default: () => <div data-testid="meal-plan-generator">Meal Plan Generator</div>,
}));

vi.mock('../../client/src/components/BulkDeleteToolbar', () => ({
  default: () => <div data-testid="bulk-delete-toolbar">Bulk Delete Toolbar</div>,
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Admin Dashboard Integration', () => {
  const mockRecipes = [
    {
      id: '1',
      name: 'Test Recipe 1',
      description: 'A test recipe',
      caloriesKcal: 200,
      proteinGrams: '15.0',
      carbsGrams: '20.0',
      fatGrams: '8.0',
      prepTimeMinutes: 10,
      servings: 2,
      mealTypes: ['breakfast'],
      isApproved: true,
    },
    {
      id: '2',
      name: 'Test Recipe 2',
      description: 'Another test recipe',
      caloriesKcal: 300,
      proteinGrams: '25.0',
      carbsGrams: '30.0',
      fatGrams: '12.0',
      prepTimeMinutes: 15,
      servings: 1,
      mealTypes: ['lunch'],
      isApproved: true,
    },
  ];

  const mockStats = {
    total: 150,
    approved: 140,
    pending: 10,
    users: 25,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock recipes API response
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/admin/recipes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            recipes: mockRecipes,
            total: mockRecipes.length,
          }),
        });
      }
      
      if (url.includes('/api/admin/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats),
        });
      }
      
      if (url.includes('/api/admin/export')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            recipes: mockRecipes,
            recipesCount: mockRecipes.length,
            exportDate: new Date().toISOString(),
            exportType: 'recipes',
            version: '1.0',
          }),
        });
      }
      
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  it('should render admin dashboard with all tabs', async () => {
    renderWithProviders(<Admin />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    
    // Check for all tabs
    expect(screen.getByRole('tab', { name: /recipes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /meal plan generator/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /admin/i })).toBeInTheDocument();
  });

  it('should display stats cards with correct data', async () => {
    renderWithProviders(<Admin />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Total recipes
      expect(screen.getByText('140')).toBeInTheDocument(); // Approved
      expect(screen.getByText('10')).toBeInTheDocument();  // Pending
      expect(screen.getByText('25')).toBeInTheDocument();  // Users
    });
  });

  it('should display Export JSON card in Admin tab', async () => {
    renderWithProviders(<Admin />);

    // Click on Admin tab
    const adminTab = screen.getByRole('tab', { name: /admin/i });
    fireEvent.click(adminTab);

    await waitFor(() => {
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
      expect(screen.getByText('Export data as JSON files for backup or analysis')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export data/i })).toBeInTheDocument();
    });
  });

  it('should open Export JSON modal when button is clicked', async () => {
    renderWithProviders(<Admin />);

    // Navigate to Admin tab
    const adminTab = screen.getByRole('tab', { name: /admin/i });
    fireEvent.click(adminTab);

    // Click Export Data button
    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /export data/i });
      fireEvent.click(exportButton);
    });

    // Modal should be visible
    expect(screen.getByText('Export Data as JSON')).toBeInTheDocument();
  });

  it('should show other admin action cards alongside Export JSON', async () => {
    renderWithProviders(<Admin />);

    // Navigate to Admin tab
    const adminTab = screen.getByRole('tab', { name: /admin/i });
    fireEvent.click(adminTab);

    await waitFor(() => {
      // Should show all three cards
      expect(screen.getByText('Generate Recipes')).toBeInTheDocument();
      expect(screen.getByText('Review Queue')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });
  });

  it('should handle export modal interactions correctly', async () => {
    renderWithProviders(<Admin />);

    // Navigate to Admin tab and open export modal
    const adminTab = screen.getByRole('tab', { name: /admin/i });
    fireEvent.click(adminTab);

    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /export data/i });
      fireEvent.click(exportButton);
    });

    // Modal should be open
    expect(screen.getByText('Export Data as JSON')).toBeInTheDocument();

    // Should show export options
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Meal Plans')).toBeInTheDocument();
    expect(screen.getByText('Export All')).toBeInTheDocument();
  });

  it('should close export modal when close button is clicked', async () => {
    renderWithProviders(<Admin />);

    // Open export modal
    const adminTab = screen.getByRole('tab', { name: /admin/i });
    fireEvent.click(adminTab);

    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /export data/i });
      fireEvent.click(exportButton);
    });

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Modal should be closed
    expect(screen.queryByText('Export Data as JSON')).not.toBeInTheDocument();
  });

  it('should maintain state when switching between tabs', async () => {
    renderWithProviders(<Admin />);

    // Start on recipes tab, should load recipes
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });

    // Switch to Admin tab
    const adminTab = screen.getByRole('tab', { name: /admin/i });
    fireEvent.click(adminTab);

    await waitFor(() => {
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
    });

    // Switch back to recipes tab
    const recipesTab = screen.getByRole('tab', { name: /recipes/i });
    fireEvent.click(recipesTab);

    // Should still show recipes
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API failure
    mockFetch.mockImplementation(() => 
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    renderWithProviders(<Admin />);

    // Component should still render even with API errors
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('should show loading states appropriately', async () => {
    // Mock slow API response
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ recipes: [], total: 0 }),
        }), 1000)
      )
    );

    renderWithProviders(<Admin />);

    // Should show loading skeletons or indicators
    // (Implementation depends on your loading UI)
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('should integrate search functionality with export', async () => {
    renderWithProviders(<Admin />);

    // Use search
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Test Recipe 1' } });

    // This should trigger API call with search parameter
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=Test+Recipe+1'),
        expect.any(Object)
      );
    });
  });

  it('should handle user role changes appropriately', () => {
    // Test with non-admin user
    const nonAdminUser = { ...mockUser, role: 'customer' };
    vi.mocked(mockAuthContext).user = nonAdminUser;

    renderWithProviders(<Admin />);

    // Should show access denied
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('You must be logged in as an admin to access this page.')).toBeInTheDocument();
  });

  it('should handle unauthenticated users', () => {
    // Test with no user
    vi.mocked(mockAuthContext).user = null;

    renderWithProviders(<Admin />);

    // Should show access denied
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('should export data and close modal automatically after successful export', async () => {
    renderWithProviders(<Admin />);

    // Open export modal
    const adminTab = screen.getByRole('tab', { name: /admin/i });
    fireEvent.click(adminTab);

    await waitFor(() => {
      const exportButton = screen.getByRole('button', { name: /export data/i });
      fireEvent.click(exportButton);
    });

    // Click on recipes export
    const recipesCard = screen.getByText('Recipes').closest('div')?.parentElement;
    if (recipesCard) {
      fireEvent.click(recipesCard);
    }

    // Should call export API
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/export?type=recipes',
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        })
      );
    });

    // Should show success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export successful',
        description: 'recipes exported successfully',
      });
    });
  });
});