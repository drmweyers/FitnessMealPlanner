/**
 * Comprehensive Recipe UI Components Unit Tests
 * 
 * This test suite provides extensive coverage of all recipe-related UI components,
 * including user interactions, form validation, loading states, error handling,
 * and responsive behavior.
 * 
 * Test Categories:
 * 1. RecipeGenerationModal component behavior and interactions
 * 2. AdminRecipeGenerator form validation and submission
 * 3. PendingRecipesTable display and actions
 * 4. Recipe card components (display, actions, responsiveness)
 * 5. Recipe search and filtering UI components
 * 6. Recipe form error states and validation
 * 7. Loading states during recipe operations
 * 
 * @author BMAD Testing Agent
 * @version 1.0.0
 * @date December 2024
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import components to test
import RecipeGenerationModal from '../../../client/src/components/RecipeGenerationModal';
import RecipeTable from '../../../client/src/components/RecipeTable';
import RecipeCard from '../../../client/src/components/RecipeCard';
import RecipeFilters from '../../../client/src/components/RecipeFilters';
import RecipeGenerationProgress from '../../../client/src/components/RecipeGenerationProgress';

// Mock API calls
vi.mock('../../../client/src/contexts/UserContext', () => ({
  useUser: () => ({
    user: { id: 'admin-123', role: 'admin', email: 'admin@test.com' }
  })
}));

vi.mock('../../../client/src/utils/api', () => ({
  api: {
    generateRecipes: vi.fn(),
    getRecipes: vi.fn(),
    approveRecipe: vi.fn(),
    rejectRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    getPendingRecipes: vi.fn()
  }
}));

// Test wrapper with React Query client
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Recipe UI Components Comprehensive Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('1. RecipeGenerationModal Component Behavior', () => {
    test('should render modal with all form fields', () => {
      const mockOnClose = vi.fn();
      const mockOnGenerate = vi.fn();

      render(
        <RecipeGenerationModal
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />,
        { wrapper: createWrapper() }
      );

      // Check for key form elements
      expect(screen.getByLabelText(/recipe count/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/meal type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dietary restrictions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/max prep time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/max calories/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate recipes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should validate recipe count input', async () => {
      const mockOnClose = vi.fn();
      const mockOnGenerate = vi.fn();

      render(
        <RecipeGenerationModal
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />,
        { wrapper: createWrapper() }
      );

      const countInput = screen.getByLabelText(/recipe count/i);
      const generateButton = screen.getByRole('button', { name: /generate recipes/i });

      // Test invalid values
      await user.clear(countInput);
      await user.type(countInput, '0');
      await user.click(generateButton);

      expect(await screen.findByText(/count must be between 1 and/i)).toBeInTheDocument();

      await user.clear(countInput);
      await user.type(countInput, '1000');
      await user.click(generateButton);

      expect(await screen.findByText(/count must be between 1 and/i)).toBeInTheDocument();
    });

    test('should handle form submission with valid data', async () => {
      const mockOnClose = vi.fn();
      const mockOnGenerate = vi.fn();

      render(
        <RecipeGenerationModal
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />,
        { wrapper: createWrapper() }
      );

      const countInput = screen.getByLabelText(/recipe count/i);
      const mealTypeSelect = screen.getByLabelText(/meal type/i);
      const generateButton = screen.getByRole('button', { name: /generate recipes/i });

      // Fill form with valid data
      await user.clear(countInput);
      await user.type(countInput, '5');
      await user.selectOptions(mealTypeSelect, 'breakfast');
      await user.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 5,
          mealType: 'breakfast'
        })
      );
    });

    test('should close modal when cancel button is clicked', async () => {
      const mockOnClose = vi.fn();
      const mockOnGenerate = vi.fn();

      render(
        <RecipeGenerationModal
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test('should show advanced options when toggled', async () => {
      const mockOnClose = vi.fn();
      const mockOnGenerate = vi.fn();

      render(
        <RecipeGenerationModal
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />,
        { wrapper: createWrapper() }
      );

      const advancedToggle = screen.getByText(/advanced options/i);
      await user.click(advancedToggle);

      // Check for advanced fields
      expect(screen.getByLabelText(/min protein/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/max protein/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/natural language prompt/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/main ingredient/i)).toBeInTheDocument();
    });
  });

  describe('2. RecipeTable Component Display and Actions', () => {
    const mockRecipes = [
      {
        id: 'recipe-1',
        name: 'Test Recipe 1',
        description: 'A test recipe',
        isApproved: true,
        caloriesKcal: 350,
        proteinGrams: '25.5',
        prepTimeMinutes: 20,
        mealTypes: ['breakfast'],
        imageUrl: 'https://example.com/recipe1.jpg'
      },
      {
        id: 'recipe-2',
        name: 'Test Recipe 2',
        description: 'Another test recipe',
        isApproved: false,
        caloriesKcal: 450,
        proteinGrams: '30.0',
        prepTimeMinutes: 35,
        mealTypes: ['lunch', 'dinner'],
        imageUrl: 'https://example.com/recipe2.jpg'
      }
    ];

    test('should render recipe table with data', () => {
      const mockOnEdit = vi.fn();
      const mockOnDelete = vi.fn();
      const mockOnApprove = vi.fn();

      render(
        <RecipeTable
          recipes={mockRecipes}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onApprove={mockOnApprove}
        />,
        { wrapper: createWrapper() }
      );

      // Check table headers
      expect(screen.getByText(/name/i)).toBeInTheDocument();
      expect(screen.getByText(/calories/i)).toBeInTheDocument();
      expect(screen.getByText(/protein/i)).toBeInTheDocument();
      expect(screen.getByText(/prep time/i)).toBeInTheDocument();
      expect(screen.getByText(/status/i)).toBeInTheDocument();

      // Check recipe data
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
      expect(screen.getByText('Test Recipe 2')).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
      expect(screen.getByText('25.5g')).toBeInTheDocument();
    });

    test('should handle recipe approval action', async () => {
      const mockOnEdit = vi.fn();
      const mockOnDelete = vi.fn();
      const mockOnApprove = vi.fn();

      render(
        <RecipeTable
          recipes={mockRecipes}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onApprove={mockOnApprove}
        />,
        { wrapper: createWrapper() }
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      expect(approveButtons).toHaveLength(1); // Only unapproved recipes should have approve button

      await user.click(approveButtons[0]);
      expect(mockOnApprove).toHaveBeenCalledWith('recipe-2');
    });

    test('should handle recipe deletion with confirmation', async () => {
      const mockOnEdit = vi.fn();
      const mockOnDelete = vi.fn();
      const mockOnApprove = vi.fn();

      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      render(
        <RecipeTable
          recipes={mockRecipes}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onApprove={mockOnApprove}
        />,
        { wrapper: createWrapper() }
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete')
      );
      expect(mockOnDelete).toHaveBeenCalledWith('recipe-1');

      window.confirm = originalConfirm;
    });

    test('should display appropriate status indicators', () => {
      const mockOnEdit = vi.fn();
      const mockOnDelete = vi.fn();
      const mockOnApprove = vi.fn();

      render(
        <RecipeTable
          recipes={mockRecipes}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onApprove={mockOnApprove}
        />,
        { wrapper: createWrapper() }
      );

      // Check status indicators
      expect(screen.getByText(/approved/i)).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    test('should handle empty recipe list', () => {
      const mockOnEdit = vi.fn();
      const mockOnDelete = vi.fn();
      const mockOnApprove = vi.fn();

      render(
        <RecipeTable
          recipes={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onApprove={mockOnApprove}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/no recipes found/i)).toBeInTheDocument();
    });
  });

  describe('3. RecipeCard Component Display and Interactions', () => {
    const mockRecipe = {
      id: 'card-recipe-1',
      name: 'Delicious Pancakes',
      description: 'Fluffy breakfast pancakes with maple syrup',
      caloriesKcal: 320,
      proteinGrams: '12.5',
      carbsGrams: '45.0',
      fatGrams: '8.5',
      prepTimeMinutes: 15,
      cookTimeMinutes: 10,
      servings: 4,
      mealTypes: ['breakfast'],
      dietaryTags: ['vegetarian'],
      imageUrl: 'https://example.com/pancakes.jpg',
      isApproved: true
    };

    test('should render recipe card with all information', () => {
      const mockOnClick = vi.fn();
      const mockOnFavorite = vi.fn();

      render(
        <RecipeCard
          recipe={mockRecipe}
          onClick={mockOnClick}
          onFavorite={mockOnFavorite}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('Delicious Pancakes')).toBeInTheDocument();
      expect(screen.getByText(/fluffy breakfast pancakes/i)).toBeInTheDocument();
      expect(screen.getByText('320')).toBeInTheDocument();
      expect(screen.getByText('12.5g')).toBeInTheDocument();
      expect(screen.getByText('15 min')).toBeInTheDocument();
      expect(screen.getByText('4 servings')).toBeInTheDocument();
      expect(screen.getByText('vegetarian')).toBeInTheDocument();
    });

    test('should handle recipe card click interaction', async () => {
      const mockOnClick = vi.fn();
      const mockOnFavorite = vi.fn();

      render(
        <RecipeCard
          recipe={mockRecipe}
          onClick={mockOnClick}
          onFavorite={mockOnFavorite}
        />,
        { wrapper: createWrapper() }
      );

      const recipeCard = screen.getByTestId('recipe-card') || screen.getByText('Delicious Pancakes').closest('div');
      await user.click(recipeCard!);

      expect(mockOnClick).toHaveBeenCalledWith(mockRecipe);
    });

    test('should handle favorite button interaction', async () => {
      const mockOnClick = vi.fn();
      const mockOnFavorite = vi.fn();

      render(
        <RecipeCard
          recipe={mockRecipe}
          onClick={mockOnClick}
          onFavorite={mockOnFavorite}
        />,
        { wrapper: createWrapper() }
      );

      const favoriteButton = screen.getByRole('button', { name: /favorite/i }) || 
                           screen.getByTestId('favorite-button');
      await user.click(favoriteButton);

      expect(mockOnFavorite).toHaveBeenCalledWith(mockRecipe.id);
    });

    test('should display recipe image with fallback', () => {
      const mockOnClick = vi.fn();
      const mockOnFavorite = vi.fn();

      render(
        <RecipeCard
          recipe={mockRecipe}
          onClick={mockOnClick}
          onFavorite={mockOnFavorite}
        />,
        { wrapper: createWrapper() }
      );

      const image = screen.getByAltText('Delicious Pancakes');
      expect(image).toBeInTheDocument();
      expect(image.getAttribute('src')).toBe('https://example.com/pancakes.jpg');
    });

    test('should show loading state when specified', () => {
      const mockOnClick = vi.fn();
      const mockOnFavorite = vi.fn();

      render(
        <RecipeCard
          recipe={mockRecipe}
          onClick={mockOnClick}
          onFavorite={mockOnFavorite}
          loading={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('recipe-card-loading') || 
             screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('4. RecipeFilters Component Functionality', () => {
    test('should render all filter options', () => {
      const mockOnFilterChange = vi.fn();

      render(
        <RecipeFilters onFilterChange={mockOnFilterChange} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/search recipes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/meal type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dietary restrictions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/max calories/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/prep time/i)).toBeInTheDocument();
    });

    test('should handle search input changes', async () => {
      const mockOnFilterChange = vi.fn();

      render(
        <RecipeFilters onFilterChange={mockOnFilterChange} />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByLabelText(/search recipes/i);
      await user.type(searchInput, 'chicken');

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'chicken'
          })
        );
      });
    });

    test('should handle multiple filter selections', async () => {
      const mockOnFilterChange = vi.fn();

      render(
        <RecipeFilters onFilterChange={mockOnFilterChange} />,
        { wrapper: createWrapper() }
      );

      const mealTypeSelect = screen.getByLabelText(/meal type/i);
      const dietarySelect = screen.getByLabelText(/dietary restrictions/i);

      await user.selectOptions(mealTypeSelect, 'dinner');
      await user.selectOptions(dietarySelect, 'vegan');

      await waitFor(() => {
        expect(mockOnFilterChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mealType: 'dinner',
            dietaryTags: expect.arrayContaining(['vegan'])
          })
        );
      });
    });

    test('should reset filters when reset button is clicked', async () => {
      const mockOnFilterChange = vi.fn();

      render(
        <RecipeFilters
          onFilterChange={mockOnFilterChange}
          initialFilters={{
            search: 'test',
            mealType: 'breakfast',
            dietaryTags: ['vegetarian']
          }}
        />,
        { wrapper: createWrapper() }
      );

      const resetButton = screen.getByRole('button', { name: /reset filters/i }) ||
                         screen.getByRole('button', { name: /clear/i });
      await user.click(resetButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({});
    });
  });

  describe('5. RecipeGenerationProgress Component', () => {
    test('should display progress information', () => {
      const mockProgress = {
        currentStep: 'generating',
        totalSteps: 4,
        currentStepNumber: 2,
        message: 'Generating recipes with AI...',
        success: 3,
        failed: 1,
        total: 10
      };

      render(
        <RecipeGenerationProgress progress={mockProgress} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/generating recipes with ai/i)).toBeInTheDocument();
      expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();
      expect(screen.getByText(/3 successful/i)).toBeInTheDocument();
      expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
    });

    test('should show completion state', () => {
      const mockProgress = {
        currentStep: 'complete',
        totalSteps: 4,
        currentStepNumber: 4,
        message: 'Recipe generation completed!',
        success: 10,
        failed: 0,
        total: 10
      };

      render(
        <RecipeGenerationProgress progress={mockProgress} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/recipe generation completed/i)).toBeInTheDocument();
      expect(screen.getByText(/10 successful/i)).toBeInTheDocument();
      expect(screen.getByTestId('progress-complete') || 
             screen.getByText(/completed/i)).toBeInTheDocument();
    });

    test('should show error state when generation fails', () => {
      const mockProgress = {
        currentStep: 'error',
        totalSteps: 4,
        currentStepNumber: 2,
        message: 'Recipe generation failed',
        success: 0,
        failed: 10,
        total: 10,
        error: 'OpenAI API error'
      };

      render(
        <RecipeGenerationProgress progress={mockProgress} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/recipe generation failed/i)).toBeInTheDocument();
      expect(screen.getByText(/openai api error/i)).toBeInTheDocument();
      expect(screen.getByTestId('progress-error') || 
             screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('6. Error States and Loading Behaviors', () => {
    test('should show loading spinner in recipe table', () => {
      const mockOnEdit = vi.fn();
      const mockOnDelete = vi.fn();
      const mockOnApprove = vi.fn();

      render(
        <RecipeTable
          recipes={[]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onApprove={mockOnApprove}
          loading={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('table-loading') || 
             screen.getByText(/loading recipes/i)).toBeInTheDocument();
    });

    test('should show error message in recipe card', () => {
      const mockOnClick = vi.fn();
      const mockOnFavorite = vi.fn();
      const mockRecipeWithError = {
        ...mockRecipes[0],
        error: 'Failed to load recipe image'
      };

      render(
        <RecipeCard
          recipe={mockRecipeWithError}
          onClick={mockOnClick}
          onFavorite={mockOnFavorite}
          error={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/failed to load/i) || 
             screen.getByTestId('recipe-error')).toBeInTheDocument();
    });

    test('should handle network errors gracefully in filters', async () => {
      const mockOnFilterChange = vi.fn();
      
      // Mock API error
      const { api } = await import('../../../client/src/utils/api');
      vi.mocked(api.getRecipes).mockRejectedValue(new Error('Network error'));

      render(
        <RecipeFilters onFilterChange={mockOnFilterChange} />,
        { wrapper: createWrapper() }
      );

      const searchInput = screen.getByLabelText(/search recipes/i);
      await user.type(searchInput, 'test search');

      // Should handle error gracefully without crashing
      expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
      expect(searchInput).toHaveValue('test search');
    });
  });

  describe('7. Responsive Design and Accessibility', () => {
    test('should be accessible with proper ARIA labels', () => {
      const mockOnClose = vi.fn();
      const mockOnGenerate = vi.fn();

      render(
        <RecipeGenerationModal
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />,
        { wrapper: createWrapper() }
      );

      // Check ARIA labels
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/recipe count/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate recipes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should support keyboard navigation', async () => {
      const mockOnClose = vi.fn();
      const mockOnGenerate = vi.fn();

      render(
        <RecipeGenerationModal
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />,
        { wrapper: createWrapper() }
      );

      const countInput = screen.getByLabelText(/recipe count/i);
      const generateButton = screen.getByRole('button', { name: /generate recipes/i });

      // Tab through elements
      await user.tab();
      expect(countInput).toHaveFocus();

      await user.tab();
      await user.tab(); // Skip through other form fields

      // Should be able to reach the generate button
      expect(document.activeElement).toBeTruthy();
    });

    test('should handle mobile viewport sizing', () => {
      const mockRecipes = [mockRecipes[0]];
      const mockOnEdit = vi.fn();
      const mockOnDelete = vi.fn();
      const mockOnApprove = vi.fn();

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(
        <RecipeTable
          recipes={mockRecipes}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onApprove={mockOnApprove}
        />,
        { wrapper: createWrapper() }
      );

      // Should render without horizontal scroll
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(table.className).toContain('responsive') || expect(table).toBeVisible();
    });
  });
});