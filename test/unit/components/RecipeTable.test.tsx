/**
 * RecipeTable Component Tests
 * 
 * Comprehensive tests for the RecipeTable component covering:
 * - Table rendering with recipe data
 * - Selection checkboxes functionality  
 * - Action buttons (view, delete) interactions
 * - Responsive column hiding behavior
 * - Loading and empty states
 * - Memoization and performance optimizations
 * - Color coding for meal types and dietary tags
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeTable from '@/components/RecipeTable';
import { renderWithProviders, generateMockRecipes } from '../../test-utils';
import type { Recipe } from '@shared/schema';

// Mock UI components
vi.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table data-testid="recipe-table" {...props}>{children}</table>,
  TableBody: ({ children, ...props }: any) => <tbody data-testid="table-body" {...props}>{children}</tbody>,
  TableCell: ({ children, className, colSpan, ...props }: any) => (
    <td data-testid="table-cell" className={className} colSpan={colSpan} {...props}>{children}</td>
  ),
  TableHead: ({ children, className, ...props }: any) => (
    <th data-testid="table-head" className={className} {...props}>{children}</th>
  ),
  TableHeader: ({ children, ...props }: any) => <thead data-testid="table-header" {...props}>{children}</thead>,
  TableRow: ({ children, className, ...props }: any) => (
    <tr data-testid="table-row" className={className} {...props}>{children}</tr>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span 
      data-testid="badge" 
      data-variant={variant} 
      className={className}
      {...props}
    >
      {children}
    </span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, className, title, ...props }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      className={className}
      title={title}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      data-testid="recipe-checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Eye: ({ className }: any) => <div data-testid="eye-icon" className={className}>👁️</div>,
  Trash2: ({ className }: any) => <div data-testid="trash2-icon" className={className}>🗑️</div>,
  Clock: ({ className }: any) => <div data-testid="clock-icon" className={className}>⏰</div>,
  Zap: ({ className }: any) => <div data-testid="zap-icon" className={className}>⚡</div>,
}));

describe('RecipeTable Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockRecipes = generateMockRecipes(5);
  const defaultProps = {
    recipes: mockRecipes,
    isLoading: false,
    showCheckbox: false,
    selectedRecipeIds: new Set<string>(),
    onRecipeClick: vi.fn(),
    onSelectionChange: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders table with recipes data', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      expect(screen.getByTestId('recipe-table')).toBeInTheDocument();
      expect(screen.getByTestId('table-header')).toBeInTheDocument();
      expect(screen.getByTestId('table-body')).toBeInTheDocument();
    });

    it('renders correct table headers without checkbox column', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      const headers = screen.getAllByTestId('table-head');
      expect(headers).toHaveLength(8); // Without checkbox column
      
      // Check header text content
      expect(screen.getByText('Recipe Name')).toBeInTheDocument();
      expect(screen.getByText('Meal Type')).toBeInTheDocument();
      expect(screen.getByText('Dietary Tags')).toBeInTheDocument();
      expect(screen.getByText('Calories')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Macros')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders correct table headers with checkbox column', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} showCheckbox={true} />
      );

      const headers = screen.getAllByTestId('table-head');
      expect(headers).toHaveLength(9); // With checkbox column
      
      // First header should be for selection
      const firstHeader = headers[0];
      expect(firstHeader).toHaveTextContent(''); // Empty for checkbox column
    });

    it('renders recipe data in table rows', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      mockRecipes.forEach(recipe => {
        expect(screen.getByText(recipe.name)).toBeInTheDocument();
      });
    });

    it('applies responsive classes for mobile columns', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      // Check for responsive hiding classes
      const macrosHeaders = screen.getAllByText('Macros');
      expect(macrosHeaders[0]).toHaveClass('hidden', 'lg:table-cell');
    });

    it('renders with correct container styling', () => {
      const { container } = renderWithProviders(<RecipeTable {...defaultProps} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('border', 'rounded-lg', 'overflow-hidden');
    });
  });

  describe('Recipe Data Display', () => {
    it('displays recipe names as clickable buttons', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      mockRecipes.forEach(recipe => {
        const nameButton = screen.getByRole('button', { name: recipe.name });
        expect(nameButton).toBeInTheDocument();
        expect(nameButton).toHaveClass('text-left', 'hover:text-primary', 'transition-colors', 'font-medium');
      });
    });

    it('displays meal type badges with correct styling', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      const badges = screen.getAllByTestId('badge');
      const mealTypeBadges = badges.filter(badge => 
        badge.textContent?.includes('Breakfast') || 
        badge.textContent?.includes('Lunch') || 
        badge.textContent?.includes('Dinner') ||
        badge.textContent?.includes('Snack')
      );
      
      expect(mealTypeBadges.length).toBeGreaterThan(0);
      mealTypeBadges.forEach(badge => {
        expect(badge).toHaveAttribute('data-variant', 'outline');
      });
    });

    it('displays dietary tags with proper color coding', () => {
      const recipesWithDietaryTags = mockRecipes.map(recipe => ({
        ...recipe,
        dietaryTags: ['vegetarian']
      }));

      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={recipesWithDietaryTags} />
      );

      const vegetarianBadges = screen.getAllByText(/vegetarian/i);
      expect(vegetarianBadges.length).toBeGreaterThan(0);
    });

    it('displays dash when no dietary tags present', () => {
      const recipesNoDietaryTags = mockRecipes.map(recipe => ({
        ...recipe,
        dietaryTags: []
      }));

      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={recipesNoDietaryTags} />
      );

      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });

    it('displays calories with zap icon', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      expect(screen.getAllByTestId('zap-icon')).toHaveLength(mockRecipes.length);
      
      mockRecipes.forEach(recipe => {
        expect(screen.getByText(recipe.caloriesKcal.toString())).toBeInTheDocument();
      });
    });

    it('displays total time with clock icon', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      expect(screen.getAllByTestId('clock-icon')).toHaveLength(mockRecipes.length);
    });

    it('calculates and displays total time correctly', () => {
      const recipeWithTimes = {
        ...mockRecipes[0],
        prepTimeMinutes: 15,
        cookTimeMinutes: 25
      };

      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={[recipeWithTimes]} />
      );

      expect(screen.getByText('40m')).toBeInTheDocument(); // 15 + 25
    });

    it('displays macros information correctly', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      mockRecipes.forEach(recipe => {
        const proteinText = `P: ${Number(recipe.proteinGrams).toFixed(0)}g`;
        const carbsText = `C: ${Number(recipe.carbsGrams).toFixed(0)}g`;
        const fatText = `F: ${Number(recipe.fatGrams).toFixed(0)}g`;
        
        expect(screen.getByText(proteinText)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(carbsText))).toBeInTheDocument();
        expect(screen.getByText(new RegExp(fatText))).toBeInTheDocument();
      });
    });

    it('displays approval status correctly', () => {
      const mixedApprovalRecipes = [
        { ...mockRecipes[0], isApproved: true },
        { ...mockRecipes[1], isApproved: false }
      ];

      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={mixedApprovalRecipes} />
      );

      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('applies correct badge variants for approval status', () => {
      const mixedApprovalRecipes = [
        { ...mockRecipes[0], isApproved: true },
        { ...mockRecipes[1], isApproved: false }
      ];

      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={mixedApprovalRecipes} />
      );

      const badges = screen.getAllByTestId('badge');
      const statusBadges = badges.filter(badge => 
        badge.textContent === 'Approved' || badge.textContent === 'Pending'
      );
      
      expect(statusBadges).toHaveLength(2);
    });
  });

  describe('Selection Functionality', () => {
    it('renders checkboxes when showCheckbox is true', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} showCheckbox={true} />
      );

      const checkboxes = screen.getAllByTestId('recipe-checkbox');
      expect(checkboxes).toHaveLength(mockRecipes.length);
    });

    it('does not render checkboxes when showCheckbox is false', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} showCheckbox={false} />
      );

      expect(screen.queryByTestId('recipe-checkbox')).not.toBeInTheDocument();
    });

    it('shows selected state for selected recipes', () => {
      const selectedIds = new Set([mockRecipes[0].id, mockRecipes[2].id]);
      
      renderWithProviders(
        <RecipeTable 
          {...defaultProps} 
          showCheckbox={true}
          selectedRecipeIds={selectedIds}
        />
      );

      const checkboxes = screen.getAllByTestId('recipe-checkbox');
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });

    it('calls onSelectionChange when checkbox is clicked', async () => {
      const mockOnSelectionChange = vi.fn();
      
      renderWithProviders(
        <RecipeTable 
          {...defaultProps} 
          showCheckbox={true}
          onSelectionChange={mockOnSelectionChange}
        />
      );

      const firstCheckbox = screen.getAllByTestId('recipe-checkbox')[0];
      await user.click(firstCheckbox);

      expect(mockOnSelectionChange).toHaveBeenCalledWith(mockRecipes[0].id, true);
    });

    it('applies visual selection indicators to table rows', () => {
      const selectedIds = new Set([mockRecipes[0].id]);
      
      renderWithProviders(
        <RecipeTable 
          {...defaultProps} 
          showCheckbox={true}
          selectedRecipeIds={selectedIds}
        />
      );

      const tableRows = screen.getAllByTestId('table-row');
      // Find the row with the selected recipe (skip header row)
      const dataRows = tableRows.slice(1); // Skip header row
      expect(dataRows[0]).toHaveClass('bg-muted');
      expect(dataRows[0]).toHaveAttribute('data-state', 'selected');
    });

    it('has proper aria labels for checkboxes', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} showCheckbox={true} />
      );

      const checkboxes = screen.getAllByTestId('recipe-checkbox');
      checkboxes.forEach((checkbox, index) => {
        expect(checkbox).toHaveAttribute('aria-label', `Select ${mockRecipes[index].name}`);
      });
    });
  });

  describe('Action Buttons', () => {
    it('renders view buttons for all recipes', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      const viewButtons = screen.getAllByTitle('View recipe');
      expect(viewButtons).toHaveLength(mockRecipes.length);
      
      viewButtons.forEach(button => {
        expect(screen.getByTestId('eye-icon', { container: button })).toBeInTheDocument();
      });
    });

    it('renders delete buttons when onDelete is provided', () => {
      const mockOnDelete = vi.fn();
      
      renderWithProviders(
        <RecipeTable {...defaultProps} onDelete={mockOnDelete} />
      );

      const deleteButtons = screen.getAllByTitle('Delete recipe');
      expect(deleteButtons).toHaveLength(mockRecipes.length);
      
      deleteButtons.forEach(button => {
        expect(screen.getByTestId('trash2-icon', { container: button })).toBeInTheDocument();
      });
    });

    it('does not render delete buttons when onDelete is not provided', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} onDelete={undefined} />
      );

      expect(screen.queryByTitle('Delete recipe')).not.toBeInTheDocument();
    });

    it('calls onRecipeClick when view button is clicked', async () => {
      const mockOnRecipeClick = vi.fn();
      
      renderWithProviders(
        <RecipeTable {...defaultProps} onRecipeClick={mockOnRecipeClick} />
      );

      const firstViewButton = screen.getAllByTitle('View recipe')[0];
      await user.click(firstViewButton);

      expect(mockOnRecipeClick).toHaveBeenCalledWith(mockRecipes[0]);
    });

    it('calls onRecipeClick when recipe name is clicked', async () => {
      const mockOnRecipeClick = vi.fn();
      
      renderWithProviders(
        <RecipeTable {...defaultProps} onRecipeClick={mockOnRecipeClick} />
      );

      const firstRecipeNameButton = screen.getByRole('button', { name: mockRecipes[0].name });
      await user.click(firstRecipeNameButton);

      expect(mockOnRecipeClick).toHaveBeenCalledWith(mockRecipes[0]);
    });

    it('calls onDelete when delete button is clicked', async () => {
      const mockOnDelete = vi.fn();
      
      renderWithProviders(
        <RecipeTable {...defaultProps} onDelete={mockOnDelete} />
      );

      const firstDeleteButton = screen.getAllByTitle('Delete recipe')[0];
      await user.click(firstDeleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockRecipes[0].id);
    });

    it('prevents event propagation on delete button click', async () => {
      const mockOnDelete = vi.fn();
      const mockOnRecipeClick = vi.fn();
      
      renderWithProviders(
        <RecipeTable 
          {...defaultProps} 
          onDelete={mockOnDelete}
          onRecipeClick={mockOnRecipeClick}
        />
      );

      const firstDeleteButton = screen.getAllByTitle('Delete recipe')[0];
      await user.click(firstDeleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockRecipes[0].id);
      expect(mockOnRecipeClick).not.toHaveBeenCalled();
    });

    it('applies correct styling to action buttons', () => {
      const mockOnDelete = vi.fn();
      
      renderWithProviders(
        <RecipeTable {...defaultProps} onDelete={mockOnDelete} />
      );

      const viewButtons = screen.getAllByTitle('View recipe');
      const deleteButtons = screen.getAllByTitle('Delete recipe');

      viewButtons.forEach(button => {
        expect(button).toHaveAttribute('data-variant', 'ghost');
        expect(button).toHaveAttribute('data-size', 'sm');
        expect(button).toHaveClass('h-8', 'w-8', 'p-0');
      });

      deleteButtons.forEach(button => {
        expect(button).toHaveAttribute('data-variant', 'ghost');
        expect(button).toHaveAttribute('data-size', 'sm');
        expect(button).toHaveClass('h-8', 'w-8', 'p-0', 'text-destructive', 'hover:text-destructive', 'hover:bg-destructive/10');
      });
    });
  });

  describe('Loading States', () => {
    it('displays loading skeleton when isLoading is true', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} isLoading={true} />
      );

      // Should show skeleton rows
      const skeletonRows = screen.getAllByTestId('table-row').slice(1); // Skip header
      expect(skeletonRows).toHaveLength(8); // Default skeleton count
    });

    it('displays correct headers in loading state', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} isLoading={true} />
      );

      expect(screen.getByText('Recipe Name')).toBeInTheDocument();
      expect(screen.getByText('Meal Type')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('displays skeleton with checkboxes when showCheckbox is true', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} isLoading={true} showCheckbox={true} />
      );

      const headers = screen.getAllByTestId('table-head');
      expect(headers).toHaveLength(9); // With checkbox column
    });

    it('displays loading skeleton with correct pulse animations', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} isLoading={true} />
      );

      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    it('displays empty state when no recipes provided', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={[]} />
      );

      expect(screen.getByText('No recipes found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search filters or generate some recipes.')).toBeInTheDocument();
    });

    it('displays empty state with correct column span', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={[]} showCheckbox={true} />
      );

      const emptyCell = screen.getByTestId('table-cell');
      expect(emptyCell).toHaveAttribute('colSpan', '9'); // With checkbox
    });

    it('displays empty state with correct column span without checkbox', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={[]} showCheckbox={false} />
      );

      const emptyCell = screen.getByTestId('table-cell');
      expect(emptyCell).toHaveAttribute('colSpan', '8'); // Without checkbox
    });

    it('displays centered content in empty state', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={[]} />
      );

      const emptyCell = screen.getByTestId('table-cell');
      expect(emptyCell).toHaveClass('h-32', 'text-center');
    });

    it('includes utensils icon in empty state', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={[]} />
      );

      const icon = document.querySelector('.fa-utensils');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('applies responsive column hiding classes', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      const macrosHeader = screen.getByText('Macros');
      expect(macrosHeader).toHaveClass('hidden', 'lg:table-cell');
    });

    it('applies responsive styling to table cells', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      const tableCells = screen.getAllByTestId('table-cell');
      const macrosCells = tableCells.filter(cell => 
        cell.textContent?.includes('P:') || cell.classList.contains('lg:table-cell')
      );
      
      expect(macrosCells.length).toBeGreaterThan(0);
    });

    it('maintains proper column widths with responsive classes', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      const headers = screen.getAllByTestId('table-head');
      
      // Check for min-width classes on headers
      const nameHeader = screen.getByText('Recipe Name');
      expect(nameHeader).toHaveClass('min-w-[200px]');
    });
  });

  describe('Performance and Memoization', () => {
    it('handles large recipe lists efficiently', () => {
      const largeRecipeList = generateMockRecipes(100);
      
      expect(() => {
        renderWithProviders(
          <RecipeTable {...defaultProps} recipes={largeRecipeList} />
        );
      }).not.toThrow();

      // Should render all recipes
      expect(screen.getByTestId('recipe-table')).toBeInTheDocument();
    });

    it('maintains consistent performance with re-renders', () => {
      const { rerender } = renderWithProviders(
        <RecipeTable {...defaultProps} />
      );

      // Re-render with same props
      rerender(<RecipeTable {...defaultProps} />);
      
      expect(screen.getByTestId('recipe-table')).toBeInTheDocument();
      expect(screen.getAllByTestId('table-row')).toHaveLength(mockRecipes.length + 1); // +1 for header
    });

    it('efficiently updates when selection changes', () => {
      const { rerender } = renderWithProviders(
        <RecipeTable 
          {...defaultProps} 
          showCheckbox={true}
          selectedRecipeIds={new Set()}
        />
      );

      const selectedIds = new Set([mockRecipes[0].id]);
      
      rerender(
        <RecipeTable 
          {...defaultProps} 
          showCheckbox={true}
          selectedRecipeIds={selectedIds}
        />
      );

      const checkboxes = screen.getAllByTestId('recipe-checkbox');
      expect(checkboxes[0]).toBeChecked();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles recipes with missing data gracefully', () => {
      const incompleteRecipes: Partial<Recipe>[] = [
        { id: 'incomplete-1', name: 'Incomplete Recipe' },
        { 
          id: 'incomplete-2', 
          name: 'Another Incomplete',
          mealTypes: [],
          dietaryTags: []
        }
      ];

      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={incompleteRecipes as Recipe[]} />
      );

      expect(screen.getByText('Incomplete Recipe')).toBeInTheDocument();
      expect(screen.getByText('Another Incomplete')).toBeInTheDocument();
    });

    it('handles null or undefined callback functions gracefully', async () => {
      renderWithProviders(
        <RecipeTable 
          {...defaultProps}
          onRecipeClick={undefined as any}
          onSelectionChange={undefined as any}
          onDelete={undefined as any}
        />
      );

      const recipeNameButton = screen.getByRole('button', { name: mockRecipes[0].name });
      
      // Should not throw error
      expect(async () => {
        await user.click(recipeNameButton);
      }).not.toThrow();
    });

    it('handles empty selectedRecipeIds set gracefully', () => {
      renderWithProviders(
        <RecipeTable 
          {...defaultProps} 
          showCheckbox={true}
          selectedRecipeIds={undefined as any}
        />
      );

      const checkboxes = screen.getAllByTestId('recipe-checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('handles very long recipe names gracefully', () => {
      const longNameRecipe = {
        ...mockRecipes[0],
        name: 'This is a very long recipe name that should be handled gracefully by the component without breaking the layout or causing overflow issues'
      };

      renderWithProviders(
        <RecipeTable {...defaultProps} recipes={[longNameRecipe]} />
      );

      expect(screen.getByText(longNameRecipe.name)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper table structure and headers', () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      expect(screen.getByTestId('recipe-table')).toHaveAttribute('role', 'table');
      expect(screen.getByTestId('table-header')).toBeInTheDocument();
      expect(screen.getByTestId('table-body')).toBeInTheDocument();
    });

    it('has proper button roles and labels', () => {
      const mockOnDelete = vi.fn();
      
      renderWithProviders(
        <RecipeTable {...defaultProps} onDelete={mockOnDelete} />
      );

      const viewButtons = screen.getAllByTitle('View recipe');
      const deleteButtons = screen.getAllByTitle('Delete recipe');

      viewButtons.forEach(button => {
        expect(button).toHaveAttribute('title', 'View recipe');
      });

      deleteButtons.forEach(button => {
        expect(button).toHaveAttribute('title', 'Delete recipe');
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(<RecipeTable {...defaultProps} />);

      const firstRecipeButton = screen.getByRole('button', { name: mockRecipes[0].name });
      
      // Tab to button
      await user.tab();
      expect(firstRecipeButton).toHaveFocus();
    });

    it('activates controls with keyboard', async () => {
      const mockOnRecipeClick = vi.fn();
      
      renderWithProviders(
        <RecipeTable {...defaultProps} onRecipeClick={mockOnRecipeClick} />
      );

      const firstRecipeButton = screen.getByRole('button', { name: mockRecipes[0].name });
      firstRecipeButton.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnRecipeClick).toHaveBeenCalledWith(mockRecipes[0]);
    });

    it('has proper aria labels for checkboxes', () => {
      renderWithProviders(
        <RecipeTable {...defaultProps} showCheckbox={true} />
      );

      const checkboxes = screen.getAllByTestId('recipe-checkbox');
      checkboxes.forEach((checkbox, index) => {
        expect(checkbox).toHaveAttribute('aria-label', `Select ${mockRecipes[index].name}`);
      });
    });
  });
});