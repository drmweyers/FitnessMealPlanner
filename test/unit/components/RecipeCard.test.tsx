/**
 * RecipeCard Component Tests
 * 
 * Comprehensive tests for the RecipeCard component covering:
 * - Recipe display and formatting
 * - Image handling and error states
 * - Nutrition information display
 * - User interactions and accessibility
 * - Performance optimizations (memoization)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeCard from '@/components/RecipeCard';
import { renderWithProviders, createMockRecipe } from '../../test-utils';

describe('RecipeCard', () => {
  const mockOnClick = vi.fn();
  const defaultRecipe = createMockRecipe();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Recipe Display', () => {
    it('renders recipe information correctly', () => {
      renderWithProviders(
        <RecipeCard recipe={defaultRecipe} onClick={mockOnClick} />
      );

      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
      expect(screen.getByText('Lunch')).toBeInTheDocument();
      expect(screen.getByText('Vegetarian')).toBeInTheDocument();
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('200 cal')).toBeInTheDocument();
    });

    it('displays nutrition information correctly', () => {
      const recipe = createMockRecipe({
        caloriesKcal: 450,
        proteinGrams: '35.5',
        carbsGrams: '25.8',
        fatGrams: '12.3',
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('36g')).toBeInTheDocument(); // Rounded protein
      expect(screen.getByText('26g')).toBeInTheDocument(); // Rounded carbs
      expect(screen.getByText('12g')).toBeInTheDocument(); // Rounded fat
    });

    it('handles multiple meal types correctly', () => {
      const recipe = createMockRecipe({
        mealTypes: ['lunch', 'dinner'],
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      // Should display the primary (first) meal type
      expect(screen.getByText('Lunch')).toBeInTheDocument();
      expect(screen.queryByText('Dinner')).not.toBeInTheDocument();
    });

    it('handles multiple dietary tags correctly', () => {
      const recipe = createMockRecipe({
        dietaryTags: ['vegetarian', 'gluten-free', 'high-protein'],
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      // Should display the primary (first) dietary tag
      expect(screen.getByText('Vegetarian')).toBeInTheDocument();
      expect(screen.queryByText('Gluten-free')).not.toBeInTheDocument();
      expect(screen.queryByText('High-protein')).not.toBeInTheDocument();
    });
  });

  describe('Image Handling', () => {
    it('displays recipe image when available', async () => {
      const recipe = createMockRecipe({
        imageUrl: 'https://example.com/recipe-image.jpg',
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      const image = screen.getByAltText('Test Recipe');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/recipe-image.jpg');
    });

    it('shows loading state initially', () => {
      renderWithProviders(
        <RecipeCard recipe={defaultRecipe} onClick={mockOnClick} />
      );

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('handles image load success', async () => {
      const recipe = createMockRecipe({
        imageUrl: 'https://example.com/recipe-image.jpg',
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      const image = screen.getByAltText('Test Recipe');
      
      // Simulate image load
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('handles image load error gracefully', async () => {
      const recipe = createMockRecipe({
        imageUrl: 'https://example.com/broken-image.jpg',
        name: 'Delicious Test Recipe',
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      const image = screen.getByAltText('Delicious Test Recipe');
      
      // Simulate image error
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
        expect(screen.getByText('Delicious Test Recipe')).toBeInTheDocument();
        expect(screen.getByTestId('chef-hat-icon')).toBeInTheDocument();
      });
    });

    it('uses placeholder image when imageUrl is null', () => {
      const recipe = createMockRecipe({
        imageUrl: null,
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      const image = screen.getByAltText('Test Recipe');
      expect(image).toHaveAttribute('src', '/api/placeholder/400/250');
    });
  });

  describe('User Interactions', () => {
    it('handles click events correctly', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RecipeCard recipe={defaultRecipe} onClick={mockOnClick} />
      );

      const card = screen.getByRole('generic', { 
        name: /test recipe/i 
      }).closest('.cursor-pointer');
      
      expect(card).toBeInTheDocument();
      
      await user.click(card!);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('shows hover effects', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RecipeCard recipe={defaultRecipe} onClick={mockOnClick} />
      );

      const card = screen.getByText('Test Recipe').closest('.group');
      expect(card).toHaveClass('hover:shadow-lg');
    });
  });

  describe('Styling and Layout', () => {
    it('applies correct meal type colors', () => {
      const breakfastRecipe = createMockRecipe({
        mealTypes: ['breakfast'],
      });

      renderWithProviders(
        <RecipeCard recipe={breakfastRecipe} onClick={mockOnClick} />
      );

      const mealTypeElement = screen.getByText('Breakfast');
      expect(mealTypeElement).toHaveClass('bg-orange-100', 'text-orange-700');
    });

    it('applies correct dietary tag colors', () => {
      const veganRecipe = createMockRecipe({
        dietaryTags: ['vegan'],
      });

      renderWithProviders(
        <RecipeCard recipe={veganRecipe} onClick={mockOnClick} />
      );

      const tagElement = screen.getByText('Vegan');
      expect(tagElement).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('handles unknown meal types with default styling', () => {
      const unknownMealRecipe = createMockRecipe({
        mealTypes: ['brunch'],
      });

      renderWithProviders(
        <RecipeCard recipe={unknownMealRecipe} onClick={mockOnClick} />
      );

      const mealTypeElement = screen.getByText('Brunch');
      expect(mealTypeElement).toHaveClass('bg-slate-100', 'text-slate-700');
    });

    it('handles unknown dietary tags with default styling', () => {
      const unknownTagRecipe = createMockRecipe({
        dietaryTags: ['organic'],
      });

      renderWithProviders(
        <RecipeCard recipe={unknownTagRecipe} onClick={mockOnClick} />
      );

      const tagElement = screen.getByText('Organic');
      expect(tagElement).toHaveClass('bg-slate-100', 'text-slate-700');
    });
  });

  describe('Accessibility', () => {
    it('provides proper alt text for images', () => {
      const recipe = createMockRecipe({
        name: 'Delicious Pasta Recipe',
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      expect(screen.getByAltText('Delicious Pasta Recipe')).toBeInTheDocument();
    });

    it('has proper semantic structure', () => {
      renderWithProviders(
        <RecipeCard recipe={defaultRecipe} onClick={mockOnClick} />
      );

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test Recipe');
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Nutrition');
    });

    it('provides keyboard accessibility', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <RecipeCard recipe={defaultRecipe} onClick={mockOnClick} />
      );

      const card = screen.getByText('Test Recipe').closest('.cursor-pointer');
      
      // Focus the card
      card!.focus();
      expect(card).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance', () => {
    it('memoizes component correctly', () => {
      const { rerender } = renderWithProviders(
        <RecipeCard recipe={defaultRecipe} onClick={mockOnClick} />
      );

      // Rerender with same props should not cause unnecessary renders
      rerender(<RecipeCard recipe={defaultRecipe} onClick={mockOnClick} />);

      // Component should still be rendered correctly
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    it('handles prop changes correctly', () => {
      const { rerender } = renderWithProviders(
        <RecipeCard recipe={defaultRecipe} onClick={mockOnClick} />
      );

      const updatedRecipe = createMockRecipe({
        name: 'Updated Recipe Name',
      });

      rerender(<RecipeCard recipe={updatedRecipe} onClick={mockOnClick} />);

      expect(screen.getByText('Updated Recipe Name')).toBeInTheDocument();
      expect(screen.queryByText('Test Recipe')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values gracefully', () => {
      const recipe = createMockRecipe({
        prepTimeMinutes: 0,
        cookTimeMinutes: 0,
        caloriesKcal: 0,
        proteinGrams: '0',
        carbsGrams: '0',
        fatGrams: '0',
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      expect(screen.getByText('0 min')).toBeInTheDocument();
      expect(screen.getByText('0 cal')).toBeInTheDocument();
      expect(screen.getByText('0g')).toBeInTheDocument();
    });

    it('handles missing dietary tags', () => {
      const recipe = createMockRecipe({
        dietaryTags: [],
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      // Should not render any dietary tag elements
      expect(screen.queryByText('Vegetarian')).not.toBeInTheDocument();
    });

    it('handles empty meal types with default', () => {
      const recipe = createMockRecipe({
        mealTypes: [],
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      // Should default to dinner
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });

    it('handles very long recipe names', () => {
      const recipe = createMockRecipe({
        name: 'This is a very long recipe name that should be truncated properly to avoid layout issues',
      });

      renderWithProviders(
        <RecipeCard recipe={recipe} onClick={mockOnClick} />
      );

      const nameElement = screen.getByText(/This is a very long recipe name/);
      expect(nameElement).toHaveClass('line-clamp-2');
    });
  });
});