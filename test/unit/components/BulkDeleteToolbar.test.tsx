/**
 * BulkDeleteToolbar Component Tests
 * 
 * Comprehensive tests for the BulkDeleteToolbar component covering:
 * - Select all/deselect all functionality
 * - Bulk delete confirmation dialog
 * - Selection count display and messages
 * - Clear selection functionality
 * - Loading and disabled states
 * - Error handling and edge cases
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkDeleteToolbar from '@/components/BulkDeleteToolbar';
import { renderWithProviders } from '../../test-utils';

// Mock UI components
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, className, ...props }: any) => (
    <input
      type="checkbox"
      data-testid="bulk-checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={className}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open, onOpenChange }: any) => 
    open ? <div data-testid="alert-dialog" onClick={() => onOpenChange?.(false)}>{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2 data-testid="alert-dialog-title">{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p data-testid="alert-dialog-description">{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogAction: ({ children, onClick, className }: any) => (
    <button 
      data-testid="alert-dialog-action" 
      onClick={onClick} 
      className={className}
    >
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: any) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Trash2: ({ className }: any) => <div data-testid="trash2-icon" className={className}>🗑️</div>,
  X: ({ className }: any) => <div data-testid="x-icon" className={className}>❌</div>,
  Check: ({ className }: any) => <div data-testid="check-icon" className={className}>✓</div>,
}));

describe('BulkDeleteToolbar Component', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const defaultProps = {
    selectedCount: 0,
    totalCount: 10,
    isAllSelected: false,
    onSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onBulkDelete: vi.fn(),
    isDeleting: false,
  };

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with default state (no selections)', () => {
      renderWithProviders(<BulkDeleteToolbar {...defaultProps} />);

      expect(screen.getByText('Select recipes')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-checkbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('renders with correct styling classes', () => {
      const { container } = renderWithProviders(<BulkDeleteToolbar {...defaultProps} />);

      const toolbar = container.firstChild;
      expect(toolbar).toHaveClass(
        'bg-primary/10', 
        'border', 
        'border-primary/20', 
        'rounded-lg', 
        'p-3'
      );
    });

    it('renders responsive layout classes', () => {
      const { container } = renderWithProviders(<BulkDeleteToolbar {...defaultProps} />);

      const flexContainer = container.querySelector('.flex');
      expect(flexContainer).toHaveClass(
        'flex-col',
        'sm:flex-row', 
        'items-center', 
        'justify-between',
        'gap-3'
      );
    });

    it('renders checkbox with correct props', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          isAllSelected={true}
        />
      );

      const checkbox = screen.getByTestId('bulk-checkbox');
      expect(checkbox).toBeChecked();
      expect(checkbox).toHaveClass('border-primary');
    });
  });

  describe('Selection Count Display', () => {
    it('displays "Select recipes" when no items selected', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={0}
          totalCount={10}
        />
      );

      expect(screen.getByText('Select recipes')).toBeInTheDocument();
    });

    it('displays partial selection count correctly', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
          isAllSelected={false}
        />
      );

      expect(screen.getByText('3 of 10 recipes selected')).toBeInTheDocument();
    });

    it('displays all selected message when all items selected', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={10}
          totalCount={10}
          isAllSelected={true}
        />
      );

      expect(screen.getByText('All 10 recipes selected')).toBeInTheDocument();
    });

    it('handles singular/plural correctly for single item', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={1}
          totalCount={5}
          isAllSelected={false}
        />
      );

      expect(screen.getByText('1 of 5 recipes selected')).toBeInTheDocument();
    });

    it('handles zero total count gracefully', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={0}
          totalCount={0}
          isAllSelected={false}
        />
      );

      expect(screen.getByText('Select recipes')).toBeInTheDocument();
    });
  });

  describe('Select All Functionality', () => {
    it('calls onSelectAll when checkbox is clicked', async () => {
      const mockOnSelectAll = vi.fn();
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          onSelectAll={mockOnSelectAll}
        />
      );

      const checkbox = screen.getByTestId('bulk-checkbox');
      await user.click(checkbox);

      expect(mockOnSelectAll).toHaveBeenCalledTimes(1);
    });

    it('shows unchecked state when not all selected', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
          isAllSelected={false}
        />
      );

      const checkbox = screen.getByTestId('bulk-checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('shows checked state when all selected', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={10}
          totalCount={10}
          isAllSelected={true}
        />
      );

      const checkbox = screen.getByTestId('bulk-checkbox');
      expect(checkbox).toBeChecked();
    });

    it('maintains checkbox state consistency', async () => {
      const mockOnSelectAll = vi.fn();
      const { rerender } = renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={0}
          totalCount={10}
          isAllSelected={false}
          onSelectAll={mockOnSelectAll}
        />
      );

      let checkbox = screen.getByTestId('bulk-checkbox');
      expect(checkbox).not.toBeChecked();

      // Simulate selecting all
      rerender(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={10}
          totalCount={10}
          isAllSelected={true}
          onSelectAll={mockOnSelectAll}
        />
      );

      checkbox = screen.getByTestId('bulk-checkbox');
      expect(checkbox).toBeChecked();
    });
  });

  describe('Delete Button and Functionality', () => {
    it('shows delete button when items are selected', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
        />
      );

      expect(screen.getByRole('button', { name: /delete 3/i })).toBeInTheDocument();
    });

    it('does not show delete button when no items selected', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={0}
          totalCount={10}
        />
      );

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('shows correct delete button text for single item', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={1}
          totalCount={10}
        />
      );

      expect(screen.getByRole('button', { name: /delete 1/i })).toBeInTheDocument();
    });

    it('shows correct delete button text for multiple items', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={5}
          totalCount={10}
        />
      );

      expect(screen.getByRole('button', { name: /delete 5/i })).toBeInTheDocument();
    });

    it('renders delete button with correct styling', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete 3/i });
      expect(deleteButton).toHaveAttribute('data-variant', 'outline');
      expect(deleteButton).toHaveAttribute('data-size', 'sm');
      expect(deleteButton).toHaveClass(
        'text-red-600',
        'border-red-300',
        'hover:bg-red-50',
        'hover:border-red-400'
      );
    });

    it('shows trash icon in delete button', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
        />
      );

      expect(screen.getByTestId('trash2-icon')).toBeInTheDocument();
    });

    it('opens confirmation dialog when delete button is clicked', async () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete 3/i });
      await user.click(deleteButton);

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('Delete Multiple Recipes');
      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent(
        'Are you sure you want to delete 3 recipes? This action cannot be undone.'
      );
    });
  });

  describe('Loading States', () => {
    it('shows "Deleting..." text when isDeleting is true', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
          isDeleting={true}
        />
      );

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('disables delete button when isDeleting is true', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
          isDeleting={true}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /deleting/i });
      expect(deleteButton).toBeDisabled();
    });

    it('shows normal text when not deleting', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
          isDeleting={false}
        />
      );

      expect(screen.getByText(/delete 3/i)).toBeInTheDocument();
      expect(screen.queryByText('Deleting...')).not.toBeInTheDocument();
    });
  });

  describe('Clear Selection Functionality', () => {
    it('renders clear button', () => {
      renderWithProviders(<BulkDeleteToolbar {...defaultProps} />);

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('calls onClearSelection when clear button is clicked', async () => {
      const mockOnClearSelection = vi.fn();
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          onClearSelection={mockOnClearSelection}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    });

    it('renders clear button with correct styling', () => {
      renderWithProviders(<BulkDeleteToolbar {...defaultProps} />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toHaveAttribute('data-variant', 'ghost');
      expect(clearButton).toHaveAttribute('data-size', 'sm');
      expect(clearButton).toHaveClass(
        'text-slate-600',
        'hover:bg-slate-100'
      );
    });

    it('shows X icon in clear button', () => {
      renderWithProviders(<BulkDeleteToolbar {...defaultProps} />);

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });

  describe('Confirmation Dialog', () => {
    beforeEach(async () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
        />
      );

      // Open the confirmation dialog
      const deleteButton = screen.getByRole('button', { name: /delete 3/i });
      await user.click(deleteButton);
    });

    it('shows confirmation dialog with correct title', () => {
      expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('Delete Multiple Recipes');
    });

    it('shows confirmation message with correct count', () => {
      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent(
        'Are you sure you want to delete 3 recipes? This action cannot be undone.'
      );
    });

    it('shows cancel and confirm buttons', () => {
      expect(screen.getByTestId('alert-dialog-cancel')).toHaveTextContent('Cancel');
      expect(screen.getByTestId('alert-dialog-action')).toHaveTextContent('Delete 3 Recipes');
    });

    it('calls onBulkDelete when confirm button is clicked', async () => {
      const mockOnBulkDelete = vi.fn();
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={2}
          totalCount={10}
          onBulkDelete={mockOnBulkDelete}
        />
      );

      // Open dialog and confirm
      const deleteButton = screen.getByRole('button', { name: /delete 2/i });
      await user.click(deleteButton);
      
      const confirmButton = screen.getByTestId('alert-dialog-action');
      await user.click(confirmButton);

      expect(mockOnBulkDelete).toHaveBeenCalledTimes(1);
    });

    it('closes dialog after confirming delete', async () => {
      const mockOnBulkDelete = vi.fn();
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={2}
          totalCount={10}
          onBulkDelete={mockOnBulkDelete}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete 2/i });
      await user.click(deleteButton);

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();

      const confirmButton = screen.getByTestId('alert-dialog-action');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
      });
    });

    it('handles single item deletion message correctly', async () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={1}
          totalCount={10}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete 1/i });
      await user.click(deleteButton);

      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent(
        'Are you sure you want to delete 1 recipe? This action cannot be undone.'
      );
      expect(screen.getByTestId('alert-dialog-action')).toHaveTextContent('Delete 1 Recipe');
    });

    it('applies correct styling to confirm button', () => {
      const confirmButton = screen.getByTestId('alert-dialog-action');
      expect(confirmButton).toHaveClass('bg-red-600', 'hover:bg-red-700');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles zero selected count gracefully', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={0}
          totalCount={10}
        />
      );

      expect(screen.getByText('Select recipes')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('handles negative selected count gracefully', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={-1}
          totalCount={10}
        />
      );

      // Should treat negative as zero
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('handles selected count greater than total count', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={15}
          totalCount={10}
          isAllSelected={true}
        />
      );

      expect(screen.getByText('All 10 recipes selected')).toBeInTheDocument();
    });

    it('handles zero total count with selections', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={5}
          totalCount={0}
        />
      );

      // Should handle gracefully
      expect(screen.getByText('5 of 0 recipes selected')).toBeInTheDocument();
    });

    it('handles undefined callback functions gracefully', async () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
          onSelectAll={undefined as any}
          onClearSelection={undefined as any}
          onBulkDelete={undefined as any}
        />
      );

      // Should not throw errors when clicked
      const checkbox = screen.getByTestId('bulk-checkbox');
      await user.click(checkbox);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      // These clicks should not cause errors
    });

    it('handles rapid clicking without issues', async () => {
      const mockOnSelectAll = vi.fn();
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          onSelectAll={mockOnSelectAll}
        />
      );

      const checkbox = screen.getByTestId('bulk-checkbox');
      
      // Rapid clicks
      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);

      expect(mockOnSelectAll).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles and labels', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete 3/i });
      const clearButton = screen.getByRole('button', { name: /clear/i });
      
      expect(deleteButton).toBeInTheDocument();
      expect(clearButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
        />
      );

      const checkbox = screen.getByTestId('bulk-checkbox');
      const deleteButton = screen.getByRole('button', { name: /delete 3/i });
      const clearButton = screen.getByRole('button', { name: /clear/i });

      // Tab through elements
      await user.tab();
      expect(checkbox).toHaveFocus();

      await user.tab();
      expect(deleteButton).toHaveFocus();

      await user.tab();
      expect(clearButton).toHaveFocus();
    });

    it('activates controls with keyboard', async () => {
      const mockOnSelectAll = vi.fn();
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
          onSelectAll={mockOnSelectAll}
        />
      );

      const checkbox = screen.getByTestId('bulk-checkbox');
      checkbox.focus();
      
      await user.keyboard(' ');
      expect(mockOnSelectAll).toHaveBeenCalled();
    });

    it('provides descriptive text for selection status', () => {
      renderWithProviders(
        <BulkDeleteToolbar
          {...defaultProps}
          selectedCount={3}
          totalCount={10}
        />
      );

      const statusText = screen.getByText('3 of 10 recipes selected');
      expect(statusText).toHaveClass('text-slate-700');
    });
  });
});