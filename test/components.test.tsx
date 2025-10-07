import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeCard from '../client/src/components/RecipeCard';
import SearchFilters from '../client/src/components/SearchFilters';
import AdminTable from '../client/src/components/AdminTable';
import type { Recipe, RecipeFilter } from '../shared/schema';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Users: () => <div data-testid="users-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  ChefHat: () => <div data-testid="chef-hat-icon" />,
}));

const mockRecipe: Recipe = {
  id: 'test-recipe-1',
  name: 'Grilled Chicken Breast',
  description: 'Healthy grilled chicken with herbs',
  mealTypes: ['lunch', 'dinner'],
  dietaryTags: ['high-protein', 'low-carb'],
  mainIngredientTags: ['chicken'],
  ingredientsJson: [
    { name: 'Chicken breast', amount: '200', unit: 'g' },
    { name: 'Olive oil', amount: '1', unit: 'tbsp' },
    { name: 'Salt', amount: '1', unit: 'tsp' }
  ],
  instructionsText: '1. Season chicken\n2. Grill for 6-8 minutes per side\n3. Rest and serve',
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 2,
  caloriesKcal: 350,
  proteinGrams: '45.50',
  carbsGrams: '2.00',
  fatGrams: '12.00',
  imageUrl: 'https://example.com/chicken.jpg',
  sourceReference: 'Test Kitchen',
  creationTimestamp: new Date('2024-01-01'),
  lastUpdatedTimestamp: new Date('2024-01-01'),
  isApproved: true
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('RecipeCard Component', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('should render recipe information correctly', () => {
    renderWithProviders(
      <RecipeCard recipe={mockRecipe} onClick={mockOnClick} />
    );

    expect(screen.getByText('Grilled Chicken Breast')).toBeInTheDocument();
    // Component shows total time (prep + cook)
    expect(screen.getByText('25 min')).toBeInTheDocument(); // 10 + 15
    expect(screen.getByText('350 cal')).toBeInTheDocument();
    // Nutrition values are displayed
    expect(screen.getByText('Calories')).toBeInTheDocument();
    expect(screen.getByText('Protein')).toBeInTheDocument();
  });

  it('should display dietary tags', () => {
    renderWithProviders(
      <RecipeCard recipe={mockRecipe} onClick={mockOnClick} />
    );

    // Component only displays first dietary tag with proper capitalization
    expect(screen.getByText('High-protein')).toBeInTheDocument();
  });

  it('should display meal types', () => {
    renderWithProviders(
      <RecipeCard recipe={mockRecipe} onClick={mockOnClick} />
    );

    // Component only displays first meal type with proper capitalization
    expect(screen.getByText('Lunch')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <RecipeCard recipe={mockRecipe} onClick={mockOnClick} />
    );

    // Card has cursor-pointer class and onClick handler
    const card = screen.getByText('Grilled Chicken Breast').closest('.cursor-pointer');
    if (card) {
      await user.click(card);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    }
  });

  it('should display recipe image if provided', async () => {
    renderWithProviders(
      <RecipeCard recipe={mockRecipe} onClick={mockOnClick} />
    );

    // Wait for image to load (has loading state initially)
    await waitFor(() => {
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', mockRecipe.name);
    });
  });
});

describe('SearchFilters Component', () => {
  const mockFilters: RecipeFilter = {
    search: '',
    mealType: undefined,
    dietaryTag: undefined,
    maxPrepTime: undefined,
    maxCalories: undefined,
    minCalories: undefined,
    minProtein: undefined,
    maxProtein: undefined,
    minCarbs: undefined,
    maxCarbs: undefined,
    minFat: undefined,
    maxFat: undefined,
    includeIngredients: [],
    excludeIngredients: [],
    page: 1,
    limit: 12,
    approved: undefined
  };

  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  it('should render search input', () => {
    renderWithProviders(
      <SearchFilters filters={mockFilters} onFilterChange={mockOnFilterChange} />
    );

    expect(screen.getByPlaceholderText(/search recipes by name or ingredients/i)).toBeInTheDocument();
  });

  it('should call onFilterChange when search input changes', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SearchFilters filters={mockFilters} onFilterChange={mockOnFilterChange} />
    );

    const searchInput = screen.getByPlaceholderText(/search recipes by name or ingredients/i);
    await user.type(searchInput, 'c');

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalled();
    });
  });

  it('should render meal type filter', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SearchFilters filters={mockFilters} onFilterChange={mockOnFilterChange} />
    );

    // Click Advanced Filters button to show hidden filters
    const filterButton = screen.getByText(/filters/i);
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/meal type/i)).toBeInTheDocument();
    });
  });

  it('should render dietary preferences filter', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SearchFilters filters={mockFilters} onFilterChange={mockOnFilterChange} />
    );

    // Click Advanced Filters button to show hidden filters
    const filterButton = screen.getByText(/filters/i);
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/dietary/i)).toBeInTheDocument();
    });
  });

  it('should render prep time slider', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SearchFilters filters={mockFilters} onFilterChange={mockOnFilterChange} />
    );

    // Click Advanced Filters button to show hidden filters
    const filterButton = screen.getByText(/filters/i);
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/prep time/i)).toBeInTheDocument();
    });
  });

  it('should render calorie range inputs', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SearchFilters filters={mockFilters} onFilterChange={mockOnFilterChange} />
    );

    // Click Advanced Filters button to show hidden filters
    const filterButton = screen.getByText(/filters/i);
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText(/calorie/i)).toBeInTheDocument();
    });
  });
});

describe('AdminTable Component', () => {
  const mockRecipes = [mockRecipe];
  const mockOnApprove = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockOnApprove.mockClear();
    mockOnDelete.mockClear();
  });

  it('should render recipe table with data', () => {
    renderWithProviders(
      <AdminTable 
        recipes={mockRecipes}
        isLoading={false}
        onApprove={mockOnApprove}
        onDelete={mockOnDelete}
        approvePending={false}
        deletePending={false}
      />
    );

    expect(screen.getByText('Grilled Chicken Breast')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument(); // calories
    expect(screen.getByText('10')).toBeInTheDocument(); // prep time
  });

  it('should show loading state', () => {
    renderWithProviders(
      <AdminTable 
        recipes={[]}
        isLoading={true}
        onApprove={mockOnApprove}
        onDelete={mockOnDelete}
        approvePending={false}
        deletePending={false}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show empty state when no recipes', () => {
    renderWithProviders(
      <AdminTable 
        recipes={[]}
        isLoading={false}
        onApprove={mockOnApprove}
        onDelete={mockOnDelete}
        approvePending={false}
        deletePending={false}
      />
    );

    expect(screen.getByText(/no recipes found/i)).toBeInTheDocument();
  });

  it('should call onApprove when approve button is clicked', async () => {
    const user = userEvent.setup();
    const unapprovedRecipe = { ...mockRecipe, isApproved: false };
    
    renderWithProviders(
      <AdminTable 
        recipes={[unapprovedRecipe]}
        isLoading={false}
        onApprove={mockOnApprove}
        onDelete={mockOnDelete}
        approvePending={false}
        deletePending={false}
      />
    );

    const approveButton = screen.getByTestId('check-icon').closest('button');
    if (approveButton) {
      await user.click(approveButton);
      expect(mockOnApprove).toHaveBeenCalledWith(unapprovedRecipe.id);
    }
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(
      <AdminTable 
        recipes={mockRecipes}
        isLoading={false}
        onApprove={mockOnApprove}
        onDelete={mockOnDelete}
        approvePending={false}
        deletePending={false}
      />
    );

    const deleteButton = screen.getByTestId('trash-icon').closest('button');
    if (deleteButton) {
      await user.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith(mockRecipe.id);
    }
  });

  it('should disable buttons when operations are pending', () => {
    renderWithProviders(
      <AdminTable 
        recipes={mockRecipes}
        isLoading={false}
        onApprove={mockOnApprove}
        onDelete={mockOnDelete}
        approvePending={true}
        deletePending={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should display recipe approval status', () => {
    const approvedRecipe = { ...mockRecipe, isApproved: true };
    const unapprovedRecipe = { ...mockRecipe, id: 'test-2', isApproved: false };
    
    renderWithProviders(
      <AdminTable 
        recipes={[approvedRecipe, unapprovedRecipe]}
        isLoading={false}
        onApprove={mockOnApprove}
        onDelete={mockOnDelete}
        approvePending={false}
        deletePending={false}
      />
    );

    expect(screen.getByText(/approved/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });
});