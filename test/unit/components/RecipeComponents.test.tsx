/**
 * Comprehensive Unit Tests for Recipe Components
 * 
 * Tests all recipe-related React components including:
 * - AdminRecipeGenerator
 * - RecipeGenerationModal
 * - RecipeDetailModal
 * - RecipeCard
 * - RecipeFilters
 * - RecipeTable
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Component imports
import AdminRecipeGenerator from '../../../client/src/components/AdminRecipeGenerator';
import RecipeGenerationModal from '../../../client/src/components/RecipeGenerationModal';
import RecipeDetailModal from '../../../client/src/components/RecipeDetailModal';
import RecipeCard from '../../../client/src/components/RecipeCard';
import RecipeFilters from '../../../client/src/components/RecipeFilters';
import RecipeTable from '../../../client/src/components/RecipeTable';
import RecipeGenerationProgress from '../../../client/src/components/RecipeGenerationProgress';

// Mock dependencies
import { apiRequest } from '../../../client/src/lib/queryClient';
import { useToast } from '../../../client/src/hooks/use-toast';

// Mock external dependencies
vi.mock('../../../client/src/lib/queryClient');
vi.mock('../../../client/src/hooks/use-toast');
vi.mock('wouter', () => ({
  useLocation: () => ['/admin', vi.fn()]
}));

// Mock data
const mockRecipe = {
  id: '1',
  name: 'Test Protein Pancakes',
  description: 'High-protein breakfast pancakes perfect for fitness enthusiasts',
  mealTypes: ['breakfast'],
  dietaryTags: ['high-protein', 'gluten-free'],
  mainIngredientTags: ['eggs', 'oats'],
  ingredientsJson: [
    { name: 'eggs', amount: '3', unit: 'pieces' },
    { name: 'oats', amount: '1', unit: 'cup' },
    { name: 'banana', amount: '1', unit: 'piece' },
    { name: 'protein powder', amount: '1', unit: 'scoop' }
  ],
  instructionsText: '1. Mix all dry ingredients\n2. Whisk eggs and add wet ingredients\n3. Cook pancakes in non-stick pan',
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 2,
  caloriesKcal: 450,
  proteinGrams: '35.5',
  carbsGrams: '28.0',
  fatGrams: '12.5',
  imageUrl: 'https://example.com/pancakes.jpg',
  sourceReference: 'AI Generated',
  isApproved: true,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString()
};

const mockRecipeStats = {
  totalRecipes: 150,
  approvedRecipes: 140,
  pendingRecipes: 10,
  averageRating: 4.2
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Recipe Components Tests', () => {
  let mockApiRequest: MockedFunction<typeof apiRequest>;
  let mockToast: any;

  beforeEach(() => {
    mockApiRequest = vi.mocked(apiRequest);
    mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-jwt-token'),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AdminRecipeGenerator', () => {
    beforeEach(() => {
      mockApiRequest.mockImplementation(async (method, url) => {
        if (url === '/api/admin/stats') {
          return { json: async () => mockRecipeStats };
        }
        if (url === '/api/admin/recipes') {
          return { json: async () => ({ recipes: [mockRecipe], total: 1 }) };
        }
        return { json: async () => ({}) };
      });
    });

    it('should render admin recipe generator with stats', async () => {
      render(
        <TestWrapper>
          <AdminRecipeGenerator />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Recipe Management')).toBeInTheDocument();
      });

      // Check for stats display
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total recipes
        expect(screen.getByText('140')).toBeInTheDocument(); // Approved recipes
      });
    });

    it('should open recipe generation modal when generate button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AdminRecipeGenerator />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Recipe Management')).toBeInTheDocument();
      });

      const generateButton = screen.getByText('Generate Random Recipes');
      await user.click(generateButton);

      expect(screen.getByText('Generate Targeted Recipes')).toBeInTheDocument();
    });

    it('should display recipe list with approval actions', async () => {
      render(
        <TestWrapper>
          <AdminRecipeGenerator />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Protein Pancakes')).toBeInTheDocument();
      });

      // Check for recipe details
      expect(screen.getByText('35.5g protein')).toBeInTheDocument();
      expect(screen.getByText('450 kcal')).toBeInTheDocument();
    });

    it('should handle recipe approval action', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockResolvedValueOnce({ json: async () => ({ success: true }) });

      render(
        <TestWrapper>
          <AdminRecipeGenerator />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Protein Pancakes')).toBeInTheDocument();
      });

      // Find and click approve button (if recipe is not approved)
      const recipeWithUnapproved = { ...mockRecipe, isApproved: false };
      mockApiRequest.mockImplementation(async (method, url) => {
        if (url === '/api/admin/recipes') {
          return { json: async () => ({ recipes: [recipeWithUnapproved], total: 1 }) };
        }
        return { json: async () => ({}) };
      });

      // Re-render with unapproved recipe
      render(
        <TestWrapper>
          <AdminRecipeGenerator />
        </TestWrapper>
      );

      await waitFor(() => {
        const approveButton = screen.getByText('Approve');
        expect(approveButton).toBeInTheDocument();
      });
    });

    it('should handle search and filtering', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AdminRecipeGenerator />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Recipe Management')).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.getByPlaceholderText(/search recipes/i);
      await user.type(searchInput, 'protein');

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('GET', expect.stringContaining('search=protein'));
      });
    });
  });

  describe('RecipeGenerationModal', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn()
    };

    beforeEach(() => {
      mockApiRequest.mockResolvedValue({
        json: async () => ({ jobId: 'test-job-123', message: 'Generation started' })
      });
    });

    it('should render recipe generation modal when open', () => {
      render(
        <TestWrapper>
          <RecipeGenerationModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Generate Targeted Recipes')).toBeInTheDocument();
      expect(screen.getByText('Use meal plan criteria to generate contextually relevant recipes')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <TestWrapper>
          <RecipeGenerationModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Generate Targeted Recipes')).not.toBeInTheDocument();
    });

    it('should handle recipe count selection', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RecipeGenerationModal {...defaultProps} />
        </TestWrapper>
      );

      // Find recipe count selector
      const countSelector = screen.getByRole('combobox');
      await user.click(countSelector);

      // Select 5 recipes
      const option5 = screen.getByText('5 recipes');
      await user.click(option5);

      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    it('should handle quick random generation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RecipeGenerationModal {...defaultProps} />
        </TestWrapper>
      );

      const quickGenerateButton = screen.getByText('Generate Random Recipes');
      await user.click(quickGenerateButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/admin/generate', { count: 10 });
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Recipe Generation Started',
        description: 'Generation started'
      });
    });

    it('should handle context-based generation with form data', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RecipeGenerationModal {...defaultProps} />
        </TestWrapper>
      );

      // Fill in natural language prompt
      const promptTextarea = screen.getByPlaceholderText(/Example: I need protein-rich breakfast recipes/);
      await user.type(promptTextarea, 'High protein breakfast for muscle building');

      // Fill in main ingredient
      const mainIngredientInput = screen.getByPlaceholderText('e.g., chicken, salmon, quinoa...');
      await user.type(mainIngredientInput, 'eggs');

      // Set fitness goal
      const fitnessGoalSelect = screen.getAllByRole('combobox')[1]; // Second select is fitness goal
      await user.click(fitnessGoalSelect);
      const muscleGainOption = screen.getByText('Muscle Gain');
      await user.click(muscleGainOption);

      // Click targeted generation button
      const targetedGenerateButton = screen.getByText('Generate Targeted Recipes');
      await user.click(targetedGenerateButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/admin/generate', expect.objectContaining({
          count: 10,
          naturalLanguagePrompt: 'High protein breakfast for muscle building',
          mainIngredient: 'eggs',
          fitnessGoal: 'muscle_gain'
        }));
      });
    });

    it('should handle macro nutrient inputs', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <RecipeGenerationModal {...defaultProps} />
        </TestWrapper>
      );

      // Find protein min/max inputs
      const proteinInputs = screen.getAllByPlaceholderText(/\d+|∞/);
      
      // Set minimum protein
      await user.type(proteinInputs[0], '25');
      
      // Set maximum protein
      await user.type(proteinInputs[1], '40');

      const targetedGenerateButton = screen.getByText('Generate Targeted Recipes');
      await user.click(targetedGenerateButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/admin/generate', expect.objectContaining({
          minProtein: 25,
          maxProtein: 40
        }));
      });
    });

    it('should handle authentication errors', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockRejectedValueOnce(new Error('Authentication required'));
      
      render(
        <TestWrapper>
          <RecipeGenerationModal {...defaultProps} />
        </TestWrapper>
      );

      const quickGenerateButton = screen.getByText('Generate Random Recipes');
      await user.click(quickGenerateButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Recipe Generation Failed',
          description: expect.stringContaining('Authentication required'),
          variant: 'destructive'
        });
      });
    });

    it('should close modal when close button clicked', async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();
      
      render(
        <TestWrapper>
          <RecipeGenerationModal {...defaultProps} onClose={onCloseMock} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('RecipeDetailModal', () => {
    const defaultProps = {
      recipe: mockRecipe,
      isOpen: true,
      onClose: vi.fn()
    };

    it('should render recipe details correctly', () => {
      render(
        <TestWrapper>
          <RecipeDetailModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Test Protein Pancakes')).toBeInTheDocument();
      expect(screen.getByText('High-protein breakfast pancakes perfect for fitness enthusiasts')).toBeInTheDocument();
      expect(screen.getByText('450 calories')).toBeInTheDocument();
      expect(screen.getByText('35.5g protein')).toBeInTheDocument();
      expect(screen.getByText('2 servings')).toBeInTheDocument();
    });

    it('should display ingredients list', () => {
      render(
        <TestWrapper>
          <RecipeDetailModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('3 pieces eggs')).toBeInTheDocument();
      expect(screen.getByText('1 cup oats')).toBeInTheDocument();
      expect(screen.getByText('1 piece banana')).toBeInTheDocument();
      expect(screen.getByText('1 scoop protein powder')).toBeInTheDocument();
    });

    it('should display cooking instructions', () => {
      render(
        <TestWrapper>
          <RecipeDetailModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText(/Mix all dry ingredients/)).toBeInTheDocument();
      expect(screen.getByText(/Whisk eggs and add wet ingredients/)).toBeInTheDocument();
      expect(screen.getByText(/Cook pancakes in non-stick pan/)).toBeInTheDocument();
    });

    it('should display meal types and dietary tags', () => {
      render(
        <TestWrapper>
          <RecipeDetailModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('breakfast')).toBeInTheDocument();
      expect(screen.getByText('high-protein')).toBeInTheDocument();
      expect(screen.getByText('gluten-free')).toBeInTheDocument();
    });

    it('should display timing information', () => {
      render(
        <TestWrapper>
          <RecipeDetailModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('10 min prep')).toBeInTheDocument();
      expect(screen.getByText('15 min cook')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <TestWrapper>
          <RecipeDetailModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Test Protein Pancakes')).not.toBeInTheDocument();
    });

    it('should handle missing optional data gracefully', () => {
      const recipeWithMissingData = {
        ...mockRecipe,
        description: '',
        imageUrl: '',
        dietaryTags: [],
        mainIngredientTags: []
      };

      render(
        <TestWrapper>
          <RecipeDetailModal {...defaultProps} recipe={recipeWithMissingData} />
        </TestWrapper>
      );

      expect(screen.getByText('Test Protein Pancakes')).toBeInTheDocument();
      // Should still render even with missing data
    });
  });

  describe('RecipeCard', () => {
    const defaultProps = {
      recipe: mockRecipe,
      onClick: vi.fn()
    };

    it('should render recipe card with basic information', () => {
      render(
        <TestWrapper>
          <RecipeCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Test Protein Pancakes')).toBeInTheDocument();
      expect(screen.getByText('450 kcal')).toBeInTheDocument();
      expect(screen.getByText('35.5g protein')).toBeInTheDocument();
      expect(screen.getByText('25 min')).toBeInTheDocument(); // Total time (prep + cook)
    });

    it('should display meal type badges', () => {
      render(
        <TestWrapper>
          <RecipeCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('breakfast')).toBeInTheDocument();
    });

    it('should display dietary tags', () => {
      render(
        <TestWrapper>
          <RecipeCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('high-protein')).toBeInTheDocument();
      expect(screen.getByText('gluten-free')).toBeInTheDocument();
    });

    it('should handle click events', async () => {
      const user = userEvent.setup();
      const onClickMock = vi.fn();
      
      render(
        <TestWrapper>
          <RecipeCard {...defaultProps} onClick={onClickMock} />
        </TestWrapper>
      );

      const card = screen.getByText('Test Protein Pancakes').closest('div');
      if (card) {
        await user.click(card);
        expect(onClickMock).toHaveBeenCalledWith(mockRecipe);
      }
    });

    it('should display placeholder image when imageUrl is missing', () => {
      const recipeWithoutImage = { ...mockRecipe, imageUrl: '' };
      
      render(
        <TestWrapper>
          <RecipeCard {...defaultProps} recipe={recipeWithoutImage} />
        </TestWrapper>
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', expect.stringContaining('placeholder'));
    });
  });

  describe('RecipeGenerationProgress', () => {
    const defaultProps = {
      jobId: 'test-job-123',
      totalRecipes: 10,
      onComplete: vi.fn(),
      onError: vi.fn()
    };

    beforeEach(() => {
      // Mock SSE (Server-Sent Events) for progress tracking
      const mockEventSource = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn(),
        readyState: 1
      };
      
      global.EventSource = vi.fn(() => mockEventSource) as any;
      
      // Mock progress API
      mockApiRequest.mockImplementation(async (method, url) => {
        if (url.includes('/api/progress/')) {
          return {
            json: async () => ({
              status: 'in_progress',
              currentStep: 'generating',
              stepProgress: { current: 3, total: 10, message: 'Processing Recipe 3' },
              completedRecipes: 2,
              failedRecipes: 0,
              errors: []
            })
          };
        }
        return { json: async () => ({}) };
      });
    });

    it('should render progress tracking interface', () => {
      render(
        <TestWrapper>
          <RecipeGenerationProgress {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText(/Recipe Generation Progress/)).toBeInTheDocument();
      expect(screen.getByText(/Generating 10 recipes/)).toBeInTheDocument();
    });

    it('should display progress steps', async () => {
      render(
        <TestWrapper>
          <RecipeGenerationProgress {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/generating/i)).toBeInTheDocument();
      });
    });

    it('should handle completion callback', () => {
      const onCompleteMock = vi.fn();
      
      render(
        <TestWrapper>
          <RecipeGenerationProgress {...defaultProps} onComplete={onCompleteMock} />
        </TestWrapper>
      );

      // Simulate completion event
      const eventSource = global.EventSource as any;
      const mockInstance = eventSource.mock.results[0].value;
      const progressHandler = mockInstance.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'progress'
      )?.[1];

      if (progressHandler) {
        progressHandler({
          data: JSON.stringify({
            status: 'complete',
            results: { success: 8, failed: 2 }
          })
        });

        expect(onCompleteMock).toHaveBeenCalledWith({ success: 8, failed: 2 });
      }
    });

    it('should handle error callback', () => {
      const onErrorMock = vi.fn();
      
      render(
        <TestWrapper>
          <RecipeGenerationProgress {...defaultProps} onError={onErrorMock} />
        </TestWrapper>
      );

      // Simulate error event
      const eventSource = global.EventSource as any;
      const mockInstance = eventSource.mock.results[0].value;
      const progressHandler = mockInstance.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'progress'
      )?.[1];

      if (progressHandler) {
        progressHandler({
          data: JSON.stringify({
            status: 'failed',
            error: 'OpenAI API error'
          })
        });

        expect(onErrorMock).toHaveBeenCalledWith('OpenAI API error');
      }
    });
  });

  describe('RecipeFilters', () => {
    const defaultProps = {
      onFiltersChange: vi.fn(),
      initialFilters: {}
    };

    it('should render all filter options', () => {
      render(
        <TestWrapper>
          <RecipeFilters {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Meal Type')).toBeInTheDocument();
      expect(screen.getByText('Dietary Tags')).toBeInTheDocument();
      expect(screen.getByText('Calories')).toBeInTheDocument();
      expect(screen.getByText('Protein')).toBeInTheDocument();
    });

    it('should handle meal type filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChangeMock = vi.fn();
      
      render(
        <TestWrapper>
          <RecipeFilters {...defaultProps} onFiltersChange={onFiltersChangeMock} />
        </TestWrapper>
      );

      const breakfastCheckbox = screen.getByLabelText('Breakfast');
      await user.click(breakfastCheckbox);

      expect(onFiltersChangeMock).toHaveBeenCalledWith(expect.objectContaining({
        mealTypes: ['breakfast']
      }));
    });

    it('should handle dietary tag filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChangeMock = vi.fn();
      
      render(
        <TestWrapper>
          <RecipeFilters {...defaultProps} onFiltersChange={onFiltersChangeMock} />
        </TestWrapper>
      );

      const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
      await user.click(vegetarianCheckbox);

      expect(onFiltersChangeMock).toHaveBeenCalledWith(expect.objectContaining({
        dietaryTags: ['vegetarian']
      }));
    });

    it('should handle nutrition range filters', async () => {
      const user = userEvent.setup();
      const onFiltersChangeMock = vi.fn();
      
      render(
        <TestWrapper>
          <RecipeFilters {...defaultProps} onFiltersChange={onFiltersChangeMock} />
        </TestWrapper>
      );

      const caloriesMinInput = screen.getByLabelText('Min Calories');
      await user.type(caloriesMinInput, '300');

      const caloriesMaxInput = screen.getByLabelText('Max Calories');
      await user.type(caloriesMaxInput, '600');

      expect(onFiltersChangeMock).toHaveBeenCalledWith(expect.objectContaining({
        calories: { min: 300, max: 600 }
      }));
    });

    it('should clear filters when reset button clicked', async () => {
      const user = userEvent.setup();
      const onFiltersChangeMock = vi.fn();
      
      render(
        <TestWrapper>
          <RecipeFilters {...defaultProps} onFiltersChange={onFiltersChangeMock} />
        </TestWrapper>
      );

      const clearButton = screen.getByText('Clear Filters');
      await user.click(clearButton);

      expect(onFiltersChangeMock).toHaveBeenCalledWith({});
    });
  });

  describe('Integration Tests', () => {
    it('should integrate AdminRecipeGenerator with modals', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AdminRecipeGenerator />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Recipe Management')).toBeInTheDocument();
      });

      // Open generation modal
      const generateButton = screen.getByText('Generate Random Recipes');
      await user.click(generateButton);

      // Check modal opened
      expect(screen.getByText('Generate Targeted Recipes')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Check modal closed
      expect(screen.queryByText('Generate Targeted Recipes')).not.toBeInTheDocument();
    });

    it('should handle error states across components', async () => {
      mockApiRequest.mockRejectedValue(new Error('Network error'));
      
      render(
        <TestWrapper>
          <AdminRecipeGenerator />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: expect.stringContaining('Error'),
          description: expect.stringContaining('Network error'),
          variant: 'destructive'
        });
      });
    });
  });
});