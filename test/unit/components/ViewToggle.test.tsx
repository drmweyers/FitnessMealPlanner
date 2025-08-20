/**
 * ViewToggle Component Tests
 * 
 * Comprehensive tests for the ViewToggle component covering:
 * - View mode switching between cards and table
 * - localStorage persistence of view preferences
 * - Icon and label rendering for different view types
 * - Responsive behavior and button states
 * - Props handling and callback execution
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewToggle, { ViewType } from '@/components/ViewToggle';
import { renderWithProviders } from '../../test-utils';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Grid3X3: ({ className, ...props }: any) => (
    <div data-testid="grid3x3-icon" className={className} {...props}>Grid Icon</div>
  ),
  Table: ({ className, ...props }: any) => (
    <div data-testid="table-icon" className={className} {...props}>Table Icon</div>
  ),
}));

describe('ViewToggle Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnViewTypeChange = vi.fn();

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Reset localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders both view toggle buttons', () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      expect(screen.getByRole('button', { name: /grid icon cards/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /table icon table/i })).toBeInTheDocument();
    });

    it('renders with correct icons', () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      expect(screen.getByTestId('grid3x3-icon')).toBeInTheDocument();
      expect(screen.getByTestId('table-icon')).toBeInTheDocument();
    });

    it('renders responsive label text', () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      // Check for responsive spans with hidden class
      const cardsLabel = screen.getByText('Cards');
      const tableLabel = screen.getByText('Table');
      
      expect(cardsLabel).toBeInTheDocument();
      expect(tableLabel).toBeInTheDocument();
      expect(cardsLabel).toHaveClass('sm:inline');
      expect(tableLabel).toHaveClass('sm:inline');
    });

    it('applies correct container styling', () => {
      const { container } = renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const toggleContainer = container.firstChild;
      expect(toggleContainer).toHaveClass(
        'flex', 
        'items-center', 
        'border', 
        'rounded-lg', 
        'overflow-hidden'
      );
    });
  });

  describe('View Type States', () => {
    it('shows cards button as active when viewType is cards', () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const cardsButton = screen.getByRole('button', { name: /grid icon cards/i });
      const tableButton = screen.getByRole('button', { name: /table icon table/i });

      // Cards button should have default variant (active)
      expect(cardsButton).toHaveClass('bg-primary');
      // Table button should have ghost variant
      expect(tableButton).not.toHaveClass('bg-primary');
    });

    it('shows table button as active when viewType is table', () => {
      renderWithProviders(
        <ViewToggle viewType="table" onViewTypeChange={mockOnViewTypeChange} />
      );

      const cardsButton = screen.getByRole('button', { name: /grid icon cards/i });
      const tableButton = screen.getByRole('button', { name: /table icon table/i });

      // Table button should have default variant (active)
      expect(tableButton).toHaveClass('bg-primary');
      // Cards button should have ghost variant  
      expect(cardsButton).not.toHaveClass('bg-primary');
    });

    it('applies correct button sizing and styling', () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const cardsButton = screen.getByRole('button', { name: /grid icon cards/i });
      const tableButton = screen.getByRole('button', { name: /table icon table/i });

      // Both buttons should have small size and rounded-none styling
      expect(cardsButton).toHaveClass('rounded-none', 'border-0', 'px-3', 'py-2');
      expect(tableButton).toHaveClass('rounded-none', 'border-0', 'px-3', 'py-2');
    });
  });

  describe('User Interactions', () => {
    it('calls onViewTypeChange with cards when cards button is clicked', async () => {
      renderWithProviders(
        <ViewToggle viewType="table" onViewTypeChange={mockOnViewTypeChange} />
      );

      const cardsButton = screen.getByRole('button', { name: /grid icon cards/i });
      await user.click(cardsButton);

      expect(mockOnViewTypeChange).toHaveBeenCalledWith('cards');
      expect(mockOnViewTypeChange).toHaveBeenCalledTimes(1);
    });

    it('calls onViewTypeChange with table when table button is clicked', async () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const tableButton = screen.getByRole('button', { name: /table icon table/i });
      await user.click(tableButton);

      expect(mockOnViewTypeChange).toHaveBeenCalledWith('table');
      expect(mockOnViewTypeChange).toHaveBeenCalledTimes(1);
    });

    it('does not call onViewTypeChange when clicking already active button', async () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const cardsButton = screen.getByRole('button', { name: /grid icon cards/i });
      await user.click(cardsButton);

      expect(mockOnViewTypeChange).toHaveBeenCalledWith('cards');
      expect(mockOnViewTypeChange).toHaveBeenCalledTimes(1);
    });

    it('handles rapid clicking without issues', async () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const tableButton = screen.getByRole('button', { name: /table icon table/i });
      
      // Rapid clicks
      await user.click(tableButton);
      await user.click(tableButton);
      await user.click(tableButton);

      expect(mockOnViewTypeChange).toHaveBeenCalledTimes(3);
      expect(mockOnViewTypeChange).toHaveBeenCalledWith('table');
    });
  });

  describe('localStorage Persistence', () => {
    it('saves view type to localStorage when viewType changes', () => {
      const { rerender } = renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      // Initially should not have called setItem
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      // Re-render with different viewType to trigger useEffect
      rerender(
        <ViewToggle viewType="table" onViewTypeChange={mockOnViewTypeChange} />
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('admin-recipe-view-type', 'table');
    });

    it('saves cards view type to localStorage', () => {
      const { rerender } = renderWithProviders(
        <ViewToggle viewType="table" onViewTypeChange={mockOnViewTypeChange} />
      );

      rerender(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('admin-recipe-view-type', 'cards');
    });

    it('handles localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Should not throw error
      expect(() => {
        const { rerender } = renderWithProviders(
          <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
        );

        rerender(
          <ViewToggle viewType="table" onViewTypeChange={mockOnViewTypeChange} />
        );
      }).not.toThrow();
    });

    it('saves to localStorage each time viewType changes', () => {
      const { rerender } = renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      // Change to table
      rerender(
        <ViewToggle viewType="table" onViewTypeChange={mockOnViewTypeChange} />
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('admin-recipe-view-type', 'table');

      // Change back to cards
      rerender(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('admin-recipe-view-type', 'cards');
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles', () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const cardsButton = screen.getByRole('button', { name: /grid icon cards/i });
      const tableButton = screen.getByRole('button', { name: /table icon table/i });

      // Tab to first button
      await user.tab();
      expect(cardsButton).toHaveFocus();

      // Tab to second button
      await user.tab();
      expect(tableButton).toHaveFocus();
    });

    it('activates buttons with Enter key', async () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const tableButton = screen.getByRole('button', { name: /table icon table/i });
      
      tableButton.focus();
      await user.keyboard('{Enter}');

      expect(mockOnViewTypeChange).toHaveBeenCalledWith('table');
    });

    it('activates buttons with Space key', async () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      const tableButton = screen.getByRole('button', { name: /table icon table/i });
      
      tableButton.focus();
      await user.keyboard(' ');

      expect(mockOnViewTypeChange).toHaveBeenCalledWith('table');
    });

    it('has descriptive button text for screen readers', () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      // Buttons should have text content that describes their function
      expect(screen.getByRole('button', { name: /grid icon cards/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /table icon table/i })).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('handles all valid ViewType values', () => {
      const viewTypes: ViewType[] = ['cards', 'table'];
      
      viewTypes.forEach(viewType => {
        expect(() => {
          renderWithProviders(
            <ViewToggle viewType={viewType} onViewTypeChange={mockOnViewTypeChange} />
          );
        }).not.toThrow();
      });
    });

    it('renders correctly with minimum required props', () => {
      expect(() => {
        renderWithProviders(
          <ViewToggle viewType="cards" onViewTypeChange={vi.fn()} />
        );
      }).not.toThrow();

      expect(screen.getByRole('button', { name: /grid icon cards/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /table icon table/i })).toBeInTheDocument();
    });

    it('calls onViewTypeChange with correct parameters', async () => {
      const mockCallback = vi.fn();
      
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockCallback} />
      );

      await user.click(screen.getByRole('button', { name: /table icon table/i }));
      
      expect(mockCallback).toHaveBeenCalledWith('table');
      expect(mockCallback.mock.calls[0]).toHaveLength(1);
      expect(mockCallback.mock.calls[0][0]).toBe('table');
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined callback gracefully', async () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={undefined as any} />
      );

      // Should not throw error when clicking
      expect(async () => {
        await user.click(screen.getByRole('button', { name: /table icon table/i }));
      }).not.toThrow();
    });

    it('handles null callback gracefully', async () => {
      renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={null as any} />
      );

      // Should not throw error when clicking
      expect(async () => {
        await user.click(screen.getByRole('button', { name: /table icon table/i }));
      }).not.toThrow();
    });

    it('maintains correct state after multiple re-renders', () => {
      const { rerender } = renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      // Initial state
      expect(screen.getByRole('button', { name: /grid icon cards/i })).toHaveClass('bg-primary');

      // Re-render with table view
      rerender(
        <ViewToggle viewType="table" onViewTypeChange={mockOnViewTypeChange} />
      );

      expect(screen.getByRole('button', { name: /table icon table/i })).toHaveClass('bg-primary');
      expect(screen.getByRole('button', { name: /grid icon cards/i })).not.toHaveClass('bg-primary');

      // Re-render back to cards view
      rerender(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      expect(screen.getByRole('button', { name: /grid icon cards/i })).toHaveClass('bg-primary');
      expect(screen.getByRole('button', { name: /table icon table/i })).not.toHaveClass('bg-primary');
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props do not change', () => {
      const { rerender } = renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      // Re-render with same props
      rerender(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      // Component should still work correctly
      expect(screen.getByRole('button', { name: /grid icon cards/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /table icon table/i })).toBeInTheDocument();
    });

    it('only calls localStorage.setItem when viewType actually changes', () => {
      const { rerender } = renderWithProviders(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      // Re-render with same viewType
      rerender(
        <ViewToggle viewType="cards" onViewTypeChange={mockOnViewTypeChange} />
      );

      // localStorage.setItem should only be called when viewType actually changes
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      // Now change the viewType
      rerender(
        <ViewToggle viewType="table" onViewTypeChange={mockOnViewTypeChange} />
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
    });
  });
});