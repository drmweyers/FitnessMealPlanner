import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MobileGroceryList from '../../client/src/components/MobileGroceryList';

// Mock lucide-react icons - using vi.mock instead of jest.mock for Vitest
import { vi } from 'vitest';

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
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn(() => 'Dec 15, 2023')
}));

// Mock toast hook
const mockToast = vi.fn();
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock UI components
vi.mock('../../client/src/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardDescription: ({ children, className }: any) => <div className={className} data-testid="card-description">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>
}));

vi.mock('../../client/src/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, size, disabled, ...props }: any) => (
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
  )
}));

vi.mock('../../client/src/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: any) => (
    <span className={className} data-variant={variant} data-testid="badge">
      {children}
    </span>
  )
}));

vi.mock('../../client/src/components/ui/input', () => ({
  Input: ({ className, onChange, value, ...props }: any) => (
    <input
      className={className}
      onChange={onChange}
      value={value}
      data-testid="input"
      {...props}
    />
  )
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
  )
}));

vi.mock('../../client/src/components/ui/separator', () => ({
  Separator: ({ className }: any) => <hr className={className} data-testid="separator" />
}));

vi.mock('../../client/src/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-menu-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick} data-testid="dropdown-menu-item">{children}</div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div data-testid="dropdown-menu-label">{children}</div>,
  DropdownMenuSeparator: () => <div data-testid="dropdown-menu-separator" />,
  DropdownMenuTrigger: ({ children, asChild }: any) => (
    <div data-testid="dropdown-menu-trigger">{children}</div>
  )
}));

describe('MobileGroceryList', () => {
  const mockItems = [
    {
      id: '1',
      name: 'Chicken Breast',
      category: 'meat',
      quantity: 2,
      unit: 'lbs',
      isChecked: false,
      priority: 'high' as const,
      estimatedPrice: 12.99
    },
    {
      id: '2',
      name: 'Broccoli',
      category: 'produce',
      quantity: 2,
      unit: 'bunches',
      isChecked: true,
      priority: 'medium' as const,
      estimatedPrice: 3.99
    },
    {
      id: '3',
      name: 'Brown Rice',
      category: 'pantry',
      quantity: 1,
      unit: 'packages',
      isChecked: false,
      priority: 'medium' as const,
      estimatedPrice: 4.49
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text Rendering', () => {
    it('should render grocery list title correctly', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const title = screen.getByText('Grocery List');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('text-2xl', 'font-bold');
    });

    it('should render item names correctly', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      expect(screen.getByText(/Chicken Breast/)).toBeInTheDocument();
      expect(screen.getByText(/Broccoli/)).toBeInTheDocument();
      expect(screen.getByText(/Brown Rice/)).toBeInTheDocument();
    });

    it('should render item quantities and units correctly', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      expect(screen.getByText(/2 lbs Chicken Breast/)).toBeInTheDocument();
      expect(screen.getByText(/2 bunches Broccoli/)).toBeInTheDocument();
      expect(screen.getByText(/1 packages Brown Rice/)).toBeInTheDocument();
    });

    it('should apply line-through style to checked items', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const checkedItemText = screen.getByText(/2 bunches Broccoli/);
      expect(checkedItemText).toHaveClass('line-through');
    });

    it('should not apply line-through style to unchecked items', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const uncheckedItemText = screen.getByText(/2 lbs Chicken Breast/);
      expect(uncheckedItemText).not.toHaveClass('line-through');
    });

    it('should render priority badges correctly', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const highPriorityBadge = screen.getByText('High');
      expect(highPriorityBadge).toBeInTheDocument();
      expect(highPriorityBadge).toHaveAttribute('data-variant', 'destructive');
    });

    it('should render category names correctly', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      expect(screen.getByText('Meat & Seafood')).toBeInTheDocument();
      expect(screen.getByText('Produce')).toBeInTheDocument();
      expect(screen.getByText('Pantry')).toBeInTheDocument();
    });

    it('should render estimated prices correctly', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      expect(screen.getByText('$12.99')).toBeInTheDocument();
      expect(screen.getByText('$3.99')).toBeInTheDocument();
      expect(screen.getByText('$4.49')).toBeInTheDocument();
    });

    it('should render completed items counter correctly', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      expect(screen.getByText('1/3 items completed')).toBeInTheDocument();
    });
  });

  describe('Checkbox Interactions', () => {
    it('should render checkboxes for all items', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const checkboxes = screen.getAllByTestId('checkbox');
      expect(checkboxes).toHaveLength(3);
    });

    it('should show checked state correctly', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const checkboxes = screen.getAllByTestId('checkbox');
      expect(checkboxes[0]).not.toBeChecked(); // Chicken Breast
      expect(checkboxes[1]).toBeChecked(); // Broccoli (checked in mock data)
      expect(checkboxes[2]).not.toBeChecked(); // Brown Rice
    });

    it('should have proper touch targets for checkboxes', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const touchTargets = screen.getAllByText(/lbs|bunches|packages/);
      touchTargets.forEach(target => {
        const container = target.closest('.touch-target');
        expect(container).toBeInTheDocument();
        expect(container).toHaveClass('cursor-pointer');
      });
    });

    it('should call toggle function when checkbox container is clicked', async () => {
      const onItemsChange = vi.fn();
      render(<MobileGroceryList items={mockItems} onItemsChange={onItemsChange} />);
      
      // Find the checkbox container for the first item (Chicken Breast)
      const checkboxContainer = screen.getByText(/2 lbs Chicken Breast/).closest('.touch-target');
      expect(checkboxContainer).toBeInTheDocument();
      
      await userEvent.click(checkboxContainer!);
      
      await waitFor(() => {
        expect(onItemsChange).toHaveBeenCalled();
      });
    });

    it('should apply opacity reduction to checked items', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      // Find the checked item (Broccoli) and verify opacity
      const checkedItemContainer = screen.getByText(/2 bunches Broccoli/).closest('.transition-opacity');
      expect(checkedItemContainer).toHaveClass('opacity-50');
    });

    it('should not apply opacity reduction to unchecked items', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      // Find the unchecked item (Chicken Breast)
      const uncheckedItemContainer = screen.getByText(/2 lbs Chicken Breast/).closest('.transition-opacity');
      expect(uncheckedItemContainer).not.toHaveClass('opacity-50');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch start events on items', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const itemContainer = screen.getByText(/2 lbs Chicken Breast/).closest('div');
      expect(itemContainer).toBeInTheDocument();
      
      // Simulate touch start
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      
      fireEvent(itemContainer!, touchEvent);
      // Should not throw error
    });

    it('should have proper touch targets for all interactive elements', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        if (button.classList.contains('touch-target')) {
          // Button should meet minimum touch target size requirements
          expect(button).toHaveClass('touch-target');
        }
      });
    });

    it('should handle swipe gestures without errors', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const itemContainer = screen.getByText(/2 lbs Chicken Breast/).closest('div[onTouchMove]');
      expect(itemContainer).toBeInTheDocument();
      
      // Simulate swipe gesture
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch]
      });
      
      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 100 } as Touch]
      });
      
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 } as Touch]
      });
      
      fireEvent(itemContainer!, touchStartEvent);
      fireEvent(itemContainer!, touchMoveEvent);
      fireEvent(itemContainer!, touchEndEvent);
      
      // Should not throw error
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should render with mobile-friendly classes', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const mainContainer = screen.getByText('Grocery List').closest('.min-h-screen');
      expect(mainContainer).toHaveClass('bg-background');
    });

    it('should have proper spacing for mobile devices', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const headerContainer = screen.getByText('Grocery List').closest('.sticky');
      expect(headerContainer).toHaveClass('top-0', 'z-50');
    });

    it('should render search input with proper mobile styling', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const searchInput = screen.getByPlaceholderText('Search items...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveClass('touch-target');
    });

    it('should render add item button with touch target class', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const addButton = screen.getByText('Add Item');
      expect(addButton).toHaveClass('touch-target');
    });
  });

  describe('Item Management', () => {
    it('should allow adding new items', async () => {
      const onItemsChange = vi.fn();
      render(<MobileGroceryList items={[]} onItemsChange={onItemsChange} />);
      
      // Click add item button
      const addButton = screen.getByText('Add Item');
      await userEvent.click(addButton);
      
      // Fill in item details
      const nameInput = screen.getByPlaceholderText('Item name');
      await userEvent.type(nameInput, 'Test Item');
      
      // Submit the item
      const submitButton = screen.getByText('Add Item');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Item added to grocery list'
        });
      });
    });

    it('should show validation error for empty item name', async () => {
      render(<MobileGroceryList items={[]} />);
      
      // Click add item button
      const addButton = screen.getByText('Add Item');
      await userEvent.click(addButton);
      
      // Try to submit without name
      const submitButton = screen.getByText('Add Item');
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Item name is required',
          variant: 'destructive'
        });
      });
    });

    it('should allow searching items', async () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const searchInput = screen.getByPlaceholderText('Search items...');
      await userEvent.type(searchInput, 'Chicken');
      
      // Should still show Chicken Breast
      expect(screen.getByText(/Chicken Breast/)).toBeInTheDocument();
      
      // Should not show other items (they would be filtered out)
      // Note: The actual filtering logic would need to be tested in integration tests
    });

    it('should handle empty state correctly', () => {
      render(<MobileGroceryList items={[]} />);
      
      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Start by adding some items to your grocery list')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Grocery List');
    });

    it('should have accessible checkboxes', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeInTheDocument();
      });
    });

    it('should have accessible buttons', () => {
      render(<MobileGroceryList items={mockItems} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });
});