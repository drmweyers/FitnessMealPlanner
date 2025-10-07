import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockRecipe } from '../../test-utils';
import RecipeDetailModal from '../../../client/src/components/RecipeDetailModal';

// Mock the useQuery hook from React Query
const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: mockUseQuery,
  };
});

// Mock the apiRequest function
const mockApiRequest = vi.fn();
vi.mock('../../../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

describe('RecipeDetailModal', () => {
  const mockOnClose = vi.fn();
  const mockRecipe = createMockRecipe({
    id: 'test-recipe-1',
    name: 'Delicious Test Recipe',
    description: 'A comprehensive test recipe with all the fixings',
    imageUrl: 'https://example.com/recipe-image.jpg',
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    caloriesKcal: 350,
    servings: 4,
    proteinGrams: '28',
    carbsGrams: '35',
    fatGrams: '12',
    mealTypes: ['lunch', 'dinner'],
    dietaryTags: ['high-protein', 'gluten-free'],
    mainIngredientTags: ['chicken', 'vegetables'],
    ingredientsJson: [
      { name: 'Chicken breast', amount: '400', unit: 'g' },
      { name: 'Broccoli', amount: '200', unit: 'g' },
      { name: 'Olive oil', amount: '2', unit: 'tbsp' },
    ],
    instructionsText: 'Step 1: Prepare ingredients\nStep 2: Cook chicken\nStep 3: Steam broccoli\nStep 4: Combine and serve',
    isApproved: true,
    creationTimestamp: '2024-01-15T10:30:00Z',
    lastUpdatedTimestamp: '2024-01-20T14:45:00Z',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    mockOnClose.mockClear();
  });

  describe('Modal State Management', () => {
    it('does not render when isOpen is false', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={false} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Recipe Details')).toBeInTheDocument();
    });

    it('calls onClose when dialog is dismissed', () => {
      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles null recipeId gracefully', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId={null} 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('makes correct API call when recipeId and isOpen are provided', () => {
      mockApiRequest.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockRecipe),
      });

      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      // Verify useQuery was called with correct parameters
      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['/api/admin/recipes/test-recipe-1'],
        queryFn: expect.any(Function),
        enabled: true, // recipeId && isOpen
      });
    });

    it('does not make API call when modal is closed', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={false} 
          onClose={mockOnClose} 
        />
      );

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['/api/admin/recipes/test-recipe-1'],
        queryFn: expect.any(Function),
        enabled: false, // recipeId && isOpen is false
      });
    });

    it('does not make API call when recipeId is null', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId={null} 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: ['/api/admin/recipes/null'],
        queryFn: expect.any(Function),
        enabled: false, // recipeId && isOpen is false due to null recipeId
      });
    });

    it('handles API errors gracefully', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('API Error'),
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Recipe not found')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('displays loading skeleton when data is loading', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      // Check for skeleton loading elements
      const skeletons = screen.getAllByTestId(/skeleton/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('hides loading skeleton when data is loaded', () => {
      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.queryByTestId(/skeleton/i)).not.toBeInTheDocument();
      expect(screen.getByText('Delicious Test Recipe')).toBeInTheDocument();
    });
  });

  describe('Recipe Content Display', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });
    });

    it('displays recipe title and approval status', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Delicious Test Recipe')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('displays recipe description', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('A comprehensive test recipe with all the fixings')).toBeInTheDocument();
    });

    it('displays recipe image when available', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      const image = screen.getByAltText('Delicious Test Recipe');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/recipe-image.jpg');
    });

    it('displays recipe timing details', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Prep Time')).toBeInTheDocument();
      expect(screen.getByText('15 mins')).toBeInTheDocument();
      expect(screen.getByText('Cook Time')).toBeInTheDocument();
      expect(screen.getByText('25 mins')).toBeInTheDocument();
    });

    it('displays nutritional information', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Calories')).toBeInTheDocument();
      expect(screen.getByText('350 kcal')).toBeInTheDocument();
      expect(screen.getByText('Servings')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('displays macronutrient breakdown', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Protein')).toBeInTheDocument();
      expect(screen.getByText('28g')).toBeInTheDocument();
      expect(screen.getByText('Carbs')).toBeInTheDocument();
      expect(screen.getByText('35g')).toBeInTheDocument();
      expect(screen.getByText('Fat')).toBeInTheDocument();
      expect(screen.getByText('12g')).toBeInTheDocument();
    });

    it('displays recipe tags correctly', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('lunch')).toBeInTheDocument();
      expect(screen.getByText('dinner')).toBeInTheDocument();
      expect(screen.getByText('high-protein')).toBeInTheDocument();
      expect(screen.getByText('gluten-free')).toBeInTheDocument();
      expect(screen.getByText('chicken')).toBeInTheDocument();
      expect(screen.getByText('vegetables')).toBeInTheDocument();
    });

    it('displays ingredients list', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Ingredients')).toBeInTheDocument();
      expect(screen.getByText('400 g Chicken breast')).toBeInTheDocument();
      expect(screen.getByText('200 g Broccoli')).toBeInTheDocument();
      expect(screen.getByText('2 tbsp Olive oil')).toBeInTheDocument();
    });

    it('displays cooking instructions', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Instructions')).toBeInTheDocument();
      expect(screen.getByText(/Step 1: Prepare ingredients/)).toBeInTheDocument();
      expect(screen.getByText(/Step 2: Cook chicken/)).toBeInTheDocument();
      expect(screen.getByText(/Step 3: Steam broccoli/)).toBeInTheDocument();
      expect(screen.getByText(/Step 4: Combine and serve/)).toBeInTheDocument();
    });

    it('displays recipe metadata', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/Last Updated:/)).toBeInTheDocument();
    });
  });

  describe('Empty/Missing Data Handling', () => {
    it('shows "Recipe not found" when no recipe data', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Recipe not found')).toBeInTheDocument();
    });

    it('handles recipe with missing image', () => {
      const recipeWithoutImage = { ...mockRecipe, imageUrl: null };
      mockUseQuery.mockReturnValue({
        data: recipeWithoutImage,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.queryByAltText('Delicious Test Recipe')).not.toBeInTheDocument();
      expect(screen.getByText('Delicious Test Recipe')).toBeInTheDocument(); // Title should still show
    });

    it('handles recipe with missing optional fields', () => {
      const minimalRecipe = {
        ...mockRecipe,
        mealTypes: null,
        dietaryTags: null,
        mainIngredientTags: null,
        lastUpdatedTimestamp: null,
      };

      mockUseQuery.mockReturnValue({
        data: minimalRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Delicious Test Recipe')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.queryByText(/Last Updated:/)).not.toBeInTheDocument();
    });
  });

  describe('Modal Stacking and Z-index', () => {
    it('has correct z-index for proper stacking', () => {
      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      const dialogContent = screen.getByTestId('dialog-content');
      expect(dialogContent).toHaveClass('z-[60]');
    });

    it('has higher z-index than parent modal', () => {
      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      const dialogContent = screen.getByTestId('dialog-content');
      // Recipe modal (z-60) should be higher than meal plan modal (z-50)
      expect(dialogContent).toHaveClass('z-[60]');
    });
  });

  describe('Console Logging', () => {
    it('logs when modal is rendered', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'RecipeDetailModal rendered:',
        { recipeId: 'test-recipe-1', isOpen: true }
      );

      consoleLogSpy.mockRestore();
    });

    it('logs when modal props change', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      const { rerender } = renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={false} 
          onClose={mockOnClose} 
        />
      );

      rerender(
        <RecipeDetailModal 
          recipeId="test-recipe-2" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'RecipeDetailModal rendered:',
        { recipeId: 'test-recipe-2', isOpen: true }
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Approval Status Display', () => {
    it('displays "Approved" badge for approved recipes', () => {
      const approvedRecipe = { ...mockRecipe, isApproved: true };
      mockUseQuery.mockReturnValue({
        data: approvedRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('displays "Pending" badge for unapproved recipes', () => {
      const pendingRecipe = { ...mockRecipe, isApproved: false };
      mockUseQuery.mockReturnValue({
        data: pendingRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockRecipe,
        isLoading: false,
        isError: false,
        error: null,
      });
    });

    it('has proper dialog role', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(
        <RecipeDetailModal 
          recipeId="test-recipe-1" 
          isOpen={true} 
          onClose={mockOnClose} 
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Should be able to close with Escape key
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});