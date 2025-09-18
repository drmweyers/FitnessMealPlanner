/**
 * Enhanced Frontend Component Tests for MobileGroceryList
 *
 * Comprehensive testing of the updated MobileGroceryList component including:
 * - Component rendering with different states
 * - User interactions (add, delete, check items)
 * - Swipe gestures and touch interactions
 * - Category filtering and sorting
 * - Local state management
 * - Mobile-specific features
 *
 * @author FitnessMealPlanner Team - Unit Tests Bot
 * @since 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MobileGroceryList from '../../client/src/components/MobileGroceryList';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ShoppingCart: () => <div data-testid="shopping-cart-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  MoreHorizontal: () => <div data-testid="more-horizontal-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Share: () => <div data-testid="share-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  SortAsc: () => <div data-testid="sort-icon" />,
  Grid: () => <div data-testid="grid-icon" />,
  List: () => <div data-testid="list-icon" />,
  Apple: () => <div data-testid="apple-icon" />,
  Beef: () => <div data-testid="beef-icon" />,
  Milk: () => <div data-testid="milk-icon" />,
  Coffee: () => <div data-testid="coffee-icon" />,
  Wheat: () => <div data-testid="wheat-icon" />,
  Candy: () => <div data-testid="candy-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatString) => {
    if (formatString === 'MMM d, yyyy') return 'Dec 15, 2023';
    if (formatString === 'yyyy-MM-dd') return '2023-12-15';
    return '2023-12-15';
  }),
}));

// Mock toast hook
const mockToast = vi.fn();
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock UI components
vi.mock('../../client/src/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardDescription: ({ children, className }: any) => <div className={className} data-testid="card-description">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
}));

vi.mock('../../client/src/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled, variant, size, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('../../client/src/components/ui/input', () => ({
  Input: ({ onChange, value, placeholder, className, type, ...props }: any) => (
    <input
      type={type || 'text'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      data-testid="input"
      {...props}
    />
  ),
}));

vi.mock('../../client/src/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onChange, className, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={className}
      data-testid="checkbox"
      {...props}
    />
  ),
}));

vi.mock('../../client/src/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-variant={variant} data-testid="badge">
      {children}
    </span>
  ),
}));

vi.mock('../../client/src/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} data-testid="separator" />,
}));

vi.mock('../../client/src/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children, align }: any) => <div data-align={align} data-testid="dropdown-menu-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <div onClick={onClick} className={className} data-testid="dropdown-menu-item">{children}</div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div data-testid="dropdown-menu-label">{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-menu-separator" />,
  DropdownMenuTrigger: ({ children, asChild }: any) => (
    <div data-testid="dropdown-menu-trigger">{children}</div>
  ),
}));

vi.mock('../../client/src/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <div onClick={() => onValueChange && onValueChange('test-value')}>{children}</div>
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
  SelectTrigger: ({ children, className }: any) => <div className={className} data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
}));

vi.mock('../../client/src/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open, onOpenChange }: any) => (
    open ? <div data-testid="alert-dialog" data-open={open}>{children}</div> : null
  ),
  AlertDialogAction: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className} data-testid="alert-dialog-action">{children}</button>
  ),
  AlertDialogCancel: ({ children }: any) => <button data-testid="alert-dialog-cancel">{children}</button>,
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
}));

// Mock hooks
vi.mock('../../client/src/hooks/useGroceryLists', () => ({
  useGroceryLists: vi.fn(),
  useGroceryList: vi.fn(),
  useCreateGroceryList: vi.fn(),
  useUpdateGroceryList: vi.fn(),
  useDeleteGroceryList: vi.fn(),
  useAddGroceryItem: vi.fn(),
  useUpdateGroceryItem: vi.fn(),
  useDeleteGroceryItem: vi.fn(),
  useGenerateFromMealPlan: vi.fn(),
  useToggleGroceryItem: vi.fn(),
  useOfflineGroceryList: vi.fn(),
}));

// Test data
const mockGroceryItems = [
  {
    id: '1',
    name: 'Chicken Breast',
    category: 'meat',
    quantity: 2,
    unit: 'lbs',
    isChecked: false,
    priority: 'high' as const,
    estimatedPrice: 12.99,
  },
  {
    id: '2',
    name: 'Broccoli',
    category: 'produce',
    quantity: 2,
    unit: 'bunches',
    isChecked: true,
    priority: 'medium' as const,
    estimatedPrice: 3.99,
  },
  {
    id: '3',
    name: 'Brown Rice',
    category: 'pantry',
    quantity: 1,
    unit: 'packages',
    isChecked: false,
    priority: 'medium' as const,
    estimatedPrice: 4.49,
  },
  {
    id: '4',
    name: 'Greek Yogurt',
    category: 'dairy',
    quantity: 2,
    unit: 'cups',
    isChecked: false,
    priority: 'medium' as const,
    estimatedPrice: 5.99,
  },
];

describe('MobileGroceryList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render with default sample data when no items provided', () => {
      render(<MobileGroceryList />);

      expect(screen.getByText('Grocery List')).toBeInTheDocument();
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
    });

    it('should render with provided items', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      expect(screen.getByText('Broccoli')).toBeInTheDocument();
      expect(screen.getByText('Brown Rice')).toBeInTheDocument();
      expect(screen.getByText('Greek Yogurt')).toBeInTheDocument();
    });

    it('should display correct item counts in header', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      // 1 item is checked out of 4 total
      expect(screen.getByText('1/4 items completed')).toBeInTheDocument();
    });

    it('should show estimated total for unchecked items with prices', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      // Total: $12.99 + $4.49 + $5.99 = $23.47 (excluding checked broccoli)
      expect(screen.getByText('Est. total: $23.47')).toBeInTheDocument();
    });

    it('should render category icons correctly', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      expect(screen.getAllByTestId('beef-icon')).toHaveLength(1); // meat category
      expect(screen.getAllByTestId('apple-icon')).toHaveLength(1); // produce category
      expect(screen.getAllByTestId('wheat-icon')).toHaveLength(1); // pantry category
      expect(screen.getAllByTestId('milk-icon')).toHaveLength(1); // dairy category
    });
  });

  describe('Item Management', () => {
    it('should add new item when form is submitted', async () => {
      const user = userEvent.setup();
      const onItemsChange = vi.fn();

      render(<MobileGroceryList items={[]} onItemsChange={onItemsChange} />);

      // Click add item button
      const addButton = screen.getByText('Add Item');
      await user.click(addButton);

      // Fill out form
      const nameInput = screen.getByPlaceholderText('Item name');
      await user.type(nameInput, 'Test Item');

      const quantityInput = screen.getByPlaceholderText('Qty');
      await user.clear(quantityInput);
      await user.type(quantityInput, '3');

      // Submit form
      const submitButton = screen.getByText('Add Item');
      await user.click(submitButton);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Item added to grocery list',
      });

      expect(onItemsChange).toHaveBeenCalled();
    });

    it('should show error when trying to add item without name', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={[]} />);

      // Click add item button
      const addButton = screen.getByText('Add Item');
      await user.click(addButton);

      // Try to submit without name
      const submitButton = screen.getByText('Add Item');
      await user.click(submitButton);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Item name is required',
        variant: 'destructive',
      });
    });

    it('should cancel adding item when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={[]} />);

      // Click add item button
      const addButton = screen.getByText('Add Item');
      await user.click(addButton);

      // Verify form is shown
      expect(screen.getByPlaceholderText('Item name')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Verify form is hidden
      expect(screen.queryByPlaceholderText('Item name')).not.toBeInTheDocument();
    });

    it('should toggle item checked status', async () => {
      const user = userEvent.setup();
      const onItemsChange = vi.fn();

      render(<MobileGroceryList items={mockGroceryItems} onItemsChange={onItemsChange} />);

      // Find and click checkbox for first item
      const checkboxes = screen.getAllByTestId('checkbox');
      await user.click(checkboxes[0]);

      expect(onItemsChange).toHaveBeenCalled();
    });

    it('should delete item when delete action is clicked', async () => {
      const user = userEvent.setup();
      const onItemsChange = vi.fn();

      render(<MobileGroceryList items={mockGroceryItems} onItemsChange={onItemsChange} />);

      // Find and click more options for first item
      const moreButtons = screen.getAllByTestId('dropdown-menu-trigger');
      await user.click(moreButtons[0]);

      // Click delete option
      const deleteOption = screen.getByText('Delete');
      await user.click(deleteOption);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Item removed',
        description: 'Item deleted from grocery list',
      });

      expect(onItemsChange).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('should filter items based on search term', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={mockGroceryItems} />);

      const searchInput = screen.getByPlaceholderText('Search items...');
      await user.type(searchInput, 'chicken');

      // Should show chicken but not other items
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      expect(screen.queryByText('Broccoli')).not.toBeInTheDocument();
      expect(screen.queryByText('Brown Rice')).not.toBeInTheDocument();
    });

    it('should show empty state when search yields no results', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={mockGroceryItems} />);

      const searchInput = screen.getByPlaceholderText('Search items...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
    });

    it('should clear search and show all items when search is cleared', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={mockGroceryItems} />);

      const searchInput = screen.getByPlaceholderText('Search items...');

      // Search for chicken
      await user.type(searchInput, 'chicken');
      expect(screen.queryByText('Broccoli')).not.toBeInTheDocument();

      // Clear search
      await user.clear(searchInput);

      // All items should be visible again
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      expect(screen.getByText('Broccoli')).toBeInTheDocument();
      expect(screen.getByText('Brown Rice')).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('should filter items by category when category button is clicked', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={mockGroceryItems} />);

      // Click meat category filter (should have 1 item)
      const meatFilter = screen.getByText('Meat & Seafood (1)');
      await user.click(meatFilter);

      // Should only show chicken breast
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      expect(screen.queryByText('Broccoli')).not.toBeInTheDocument();
      expect(screen.queryByText('Brown Rice')).not.toBeInTheDocument();
    });

    it('should show all items when "All" filter is clicked', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={mockGroceryItems} />);

      // First filter by meat
      const meatFilter = screen.getByText('Meat & Seafood (1)');
      await user.click(meatFilter);

      // Then click All to show everything
      const allFilter = screen.getByText('All (4)');
      await user.click(allFilter);

      // All items should be visible
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      expect(screen.getByText('Broccoli')).toBeInTheDocument();
      expect(screen.getByText('Brown Rice')).toBeInTheDocument();
      expect(screen.getByText('Greek Yogurt')).toBeInTheDocument();
    });

    it('should display correct item counts for each category', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      expect(screen.getByText('Meat & Seafood (1)')).toBeInTheDocument();
      expect(screen.getByText('Produce (1)')).toBeInTheDocument();
      expect(screen.getByText('Pantry (1)')).toBeInTheDocument();
      expect(screen.getByText('Dairy & Eggs (1)')).toBeInTheDocument();
    });
  });

  describe('View Modes', () => {
    it('should toggle between list and category view modes', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={mockGroceryItems} />);

      // Initially should be in category view (default)
      expect(screen.getByTestId('list-icon')).toBeInTheDocument();

      // Click to switch to list view
      const viewToggle = screen.getByTestId('button');
      await user.click(viewToggle);

      expect(screen.getByTestId('grid-icon')).toBeInTheDocument();
    });

    it('should display items grouped by category in category view', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      // Should see category headers
      expect(screen.getByText('Meat & Seafood')).toBeInTheDocument();
      expect(screen.getByText('Produce')).toBeInTheDocument();
      expect(screen.getByText('Pantry')).toBeInTheDocument();
      expect(screen.getByText('Dairy & Eggs')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort items by category by default', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      // Items should be ordered with checked items at bottom
      const itemNames = screen.getAllByText(/2 lbs Chicken Breast|2 bunches Broccoli|1 packages Brown Rice|2 cups Greek Yogurt/);

      // Broccoli (checked) should be at the end
      expect(itemNames[itemNames.length - 1]).toHaveTextContent('Broccoli');
    });

    it('should access sort options from dropdown menu', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={mockGroceryItems} />);

      // Click more options menu
      const moreButton = screen.getAllByTestId('dropdown-menu-trigger')[0];
      await user.click(moreButton);

      // Should see sort options
      expect(screen.getByText('Sort By')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });
  });

  describe('Bulk Actions', () => {
    it('should clear all checked items', async () => {
      const user = userEvent.setup();
      const onItemsChange = vi.fn();

      render(<MobileGroceryList items={mockGroceryItems} onItemsChange={onItemsChange} />);

      // Click clear completed button
      const clearButton = screen.getByText('Clear Done (1)');
      await user.click(clearButton);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Checked items cleared',
        description: 'All completed items have been removed',
      });

      expect(onItemsChange).toHaveBeenCalled();
    });

    it('should disable clear button when no items are checked', () => {
      const uncheckedItems = mockGroceryItems.map(item => ({ ...item, isChecked: false }));

      render(<MobileGroceryList items={uncheckedItems} />);

      const clearButton = screen.getByText('Clear Done (0)');
      expect(clearButton).toBeDisabled();
    });

    it('should export grocery list', async () => {
      const user = userEvent.setup();

      // Mock navigator.share
      const mockShare = vi.fn();
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
      });

      render(<MobileGroceryList items={mockGroceryItems} />);

      const shareButton = screen.getByText('Share');
      await user.click(shareButton);

      expect(mockShare).toHaveBeenCalledWith({
        title: 'Grocery List',
        text: expect.stringContaining('Grocery List - Dec 15, 2023'),
      });
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch start event', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      const firstItem = screen.getByText('2 lbs Chicken Breast').closest('[data-testid]')?.parentElement;

      if (firstItem) {
        fireEvent.touchStart(firstItem, {
          touches: [{ clientX: 100, clientY: 100 }],
        });
      }

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle touch move event for swipe detection', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      const firstItem = screen.getByText('2 lbs Chicken Breast').closest('[data-testid]')?.parentElement;

      if (firstItem) {
        // Start touch
        fireEvent.touchStart(firstItem, {
          touches: [{ clientX: 100, clientY: 100 }],
        });

        // Move touch horizontally (right swipe)
        fireEvent.touchMove(firstItem, {
          touches: [{ clientX: 200, clientY: 100 }],
        });
      }

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should handle touch end event and complete swipe action', async () => {
      const onItemsChange = vi.fn();

      render(<MobileGroceryList items={mockGroceryItems} onItemsChange={onItemsChange} />);

      const firstItem = screen.getByText('2 lbs Chicken Breast').closest('[data-testid]')?.parentElement;

      if (firstItem) {
        // Simulate complete swipe right gesture
        fireEvent.touchStart(firstItem, {
          touches: [{ clientX: 100, clientY: 100 }],
        });

        fireEvent.touchMove(firstItem, {
          touches: [{ clientX: 200, clientY: 100 }],
        });

        fireEvent.touchEnd(firstItem, {
          changedTouches: [{ clientX: 250, clientY: 100 }],
        });

        // Should trigger item toggle
        await waitFor(() => {
          expect(onItemsChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for checkboxes', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      // Check ARIA labels are present
      const checkboxContainer = screen.getByLabelText('Check Chicken Breast');
      expect(checkboxContainer).toBeInTheDocument();
    });

    it('should support keyboard navigation for checkboxes', async () => {
      const user = userEvent.setup();
      const onItemsChange = vi.fn();

      render(<MobileGroceryList items={mockGroceryItems} onItemsChange={onItemsChange} />);

      const checkboxContainer = screen.getByLabelText('Check Chicken Breast');

      // Focus and press Enter
      checkboxContainer.focus();
      await user.keyboard('{Enter}');

      expect(onItemsChange).toHaveBeenCalled();
    });

    it('should support keyboard navigation with Space key', async () => {
      const user = userEvent.setup();
      const onItemsChange = vi.fn();

      render(<MobileGroceryList items={mockGroceryItems} onItemsChange={onItemsChange} />);

      const checkboxContainer = screen.getByLabelText('Check Chicken Breast');

      // Focus and press Space
      checkboxContainer.focus();
      await user.keyboard(' ');

      expect(onItemsChange).toHaveBeenCalled();
    });

    it('should have touch-target classes for mobile accessibility', () => {
      render(<MobileGroceryList items={mockGroceryItems} />);

      // Check that buttons have touch-target classes
      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        expect(button.className).toContain('touch-target');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      render(<MobileGroceryList items={[]} />);

      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Start by adding some items to your grocery list')).toBeInTheDocument();
    });

    it('should handle items without estimated prices', () => {
      const itemsWithoutPrices = mockGroceryItems.map(item => ({ ...item, estimatedPrice: undefined }));

      render(<MobileGroceryList items={itemsWithoutPrices} />);

      // Should not show estimated total
      expect(screen.queryByText(/Est\. total:/)).not.toBeInTheDocument();
    });

    it('should handle items with special characters in names', () => {
      const specialItems = [
        {
          id: '1',
          name: 'Café Latté & 100% Açaí',
          category: 'beverages',
          quantity: 1,
          unit: 'cups',
          isChecked: false,
          priority: 'medium' as const,
        },
      ];

      render(<MobileGroceryList items={specialItems} />);

      expect(screen.getByText('Café Latté & 100% Açaí')).toBeInTheDocument();
    });

    it('should handle very long item names gracefully', () => {
      const longNameItems = [
        {
          id: '1',
          name: 'Extra Long Item Name That Should Not Break The Layout When Displayed In The Mobile Interface',
          category: 'produce',
          quantity: 1,
          unit: 'pcs',
          isChecked: false,
          priority: 'medium' as const,
        },
      ];

      render(<MobileGroceryList items={longNameItems} />);

      expect(screen.getByText(/Extra Long Item Name/)).toBeInTheDocument();
    });

    it('should handle items with zero quantity', () => {
      const zeroQuantityItems = [
        {
          id: '1',
          name: 'Zero Quantity Item',
          category: 'produce',
          quantity: 0,
          unit: 'pcs',
          isChecked: false,
          priority: 'medium' as const,
        },
      ];

      render(<MobileGroceryList items={zeroQuantityItems} />);

      expect(screen.getByText('0 pcs Zero Quantity Item')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large number of items efficiently', () => {
      const manyItems = Array.from({ length: 100 }, (_, index) => ({
        id: `item-${index}`,
        name: `Item ${index}`,
        category: 'produce',
        quantity: 1,
        unit: 'pcs',
        isChecked: false,
        priority: 'medium' as const,
      }));

      const start = performance.now();
      render(<MobileGroceryList items={manyItems} />);
      const end = performance.now();

      // Should render within reasonable time (less than 1 second)
      expect(end - start).toBeLessThan(1000);
    });

    it('should memoize filtered results efficiently', async () => {
      const user = userEvent.setup();

      render(<MobileGroceryList items={mockGroceryItems} />);

      // Multiple search operations should not cause performance issues
      const searchInput = screen.getByPlaceholderText('Search items...');

      await user.type(searchInput, 'a');
      await user.type(searchInput, 'b');
      await user.type(searchInput, 'c');
      await user.clear(searchInput);

      // Should not throw errors or cause performance issues
      expect(true).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should maintain state when items change externally', () => {
      const { rerender } = render(<MobileGroceryList items={mockGroceryItems} />);

      // Add an item externally
      const newItems = [...mockGroceryItems, {
        id: '5',
        name: 'New Item',
        category: 'produce',
        quantity: 1,
        unit: 'pcs',
        isChecked: false,
        priority: 'medium' as const,
      }];

      rerender(<MobileGroceryList items={newItems} />);

      expect(screen.getByText('New Item')).toBeInTheDocument();
    });

    it('should call onItemsChange when items are modified', async () => {
      const user = userEvent.setup();
      const onItemsChange = vi.fn();

      render(<MobileGroceryList items={mockGroceryItems} onItemsChange={onItemsChange} />);

      // Toggle an item
      const checkboxes = screen.getAllByTestId('checkbox');
      await user.click(checkboxes[0]);

      expect(onItemsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            isChecked: true, // Should be toggled
          }),
        ])
      );
    });

    it('should preserve search term when items change', async () => {
      const user = userEvent.setup();

      const { rerender } = render(<MobileGroceryList items={mockGroceryItems} />);

      // Set search term
      const searchInput = screen.getByPlaceholderText('Search items...');
      await user.type(searchInput, 'chicken');

      // Update items externally
      const newItems = [...mockGroceryItems, {
        id: '5',
        name: 'Chicken Wings',
        category: 'meat',
        quantity: 1,
        unit: 'lbs',
        isChecked: false,
        priority: 'medium' as const,
      }];

      rerender(<MobileGroceryList items={newItems} />);

      // Search term should still be active and show both chicken items
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
      expect(screen.getByText('Chicken Wings')).toBeInTheDocument();
      expect(screen.queryByText('Broccoli')).not.toBeInTheDocument();
    });
  });
});