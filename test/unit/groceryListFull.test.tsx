import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MobileGroceryList from '@/components/MobileGroceryList';
import GroceryListWrapper from '@/components/GroceryListWrapper';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/toast';

// Mock API calls
const mockGroceryListData = {
  id: 'test-list-1',
  name: 'Test Grocery List',
  items: [
    {
      id: 'item-1',
      name: 'Apples',
      quantity: 5,
      unit: 'pcs',
      category: 'produce',
      priority: 'high',
      isChecked: false,
      notes: 'Get green ones',
      estimatedPrice: 2.50
    },
    {
      id: 'item-2',
      name: 'Milk',
      quantity: 2,
      unit: 'bottles',
      category: 'dairy',
      priority: 'medium',
      isChecked: false,
      estimatedPrice: 4.00
    },
    {
      id: 'item-3',
      name: 'Bread',
      quantity: 1,
      unit: 'pcs',
      category: 'pantry',
      priority: 'low',
      isChecked: true,
      estimatedPrice: 3.00
    }
  ]
};

// Mock hooks
vi.mock('@/hooks/useGroceryLists', () => ({
  useGroceryList: vi.fn(() => ({
    data: mockGroceryListData,
    isLoading: false,
    error: null,
    refetch: vi.fn()
  })),
  useGroceryLists: vi.fn(() => ({
    data: [mockGroceryListData],
    isLoading: false,
    error: null,
    refetch: vi.fn()
  })),
  useAddGroceryItem: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ data: { id: 'new-item' } }),
    isPending: false
  })),
  useUpdateGroceryItem: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false
  })),
  useDeleteGroceryItem: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false
  })),
  useCreateGroceryList: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ data: { id: 'new-list' } }),
    isPending: false
  })),
  useGenerateFromMealPlan: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false
  }))
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com', role: 'customer' },
    isAuthenticated: true
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('Grocery List Functionality Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            {component}
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  describe('Checkbox Functionality', () => {
    it('should toggle item checked state when checkbox is clicked', async () => {
      const { useUpdateGroceryItem } = await import('@/hooks/useGroceryLists');
      const mockUpdate = vi.fn().mockResolvedValue({});
      (useUpdateGroceryItem as any).mockReturnValue({
        mutateAsync: mockUpdate,
        isPending: false
      });

      renderWithProviders(<MobileGroceryList groceryListId="test-list-1" />);

      // Find checkbox for unchecked item (Apples)
      const checkboxes = screen.getAllByRole('button', { name: /check/i });
      const appleCheckbox = checkboxes.find(el => el.getAttribute('aria-label')?.includes('Apples'));

      expect(appleCheckbox).toBeDefined();

      // Click to check
      fireEvent.click(appleCheckbox!);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          listId: 'test-list-1',
          itemId: 'item-1',
          updates: { isChecked: true }
        });
      });
    });

    it('should uncheck item when clicking checked checkbox', async () => {
      const { useUpdateGroceryItem } = await import('@/hooks/useGroceryLists');
      const mockUpdate = vi.fn().mockResolvedValue({});
      (useUpdateGroceryItem as any).mockReturnValue({
        mutateAsync: mockUpdate,
        isPending: false
      });

      renderWithProviders(<MobileGroceryList groceryListId="test-list-1" />);

      // Find checkbox for checked item (Bread)
      const checkboxes = screen.getAllByRole('button', { name: /uncheck/i });
      const breadCheckbox = checkboxes.find(el => el.getAttribute('aria-label')?.includes('Bread'));

      expect(breadCheckbox).toBeDefined();

      // Click to uncheck
      fireEvent.click(breadCheckbox!);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          listId: 'test-list-1',
          itemId: 'item-3',
          updates: { isChecked: false }
        });
      });
    });
  });

  describe('Edit Functionality', () => {
    it('should open edit modal when edit menu item is clicked', async () => {
      renderWithProviders(<MobileGroceryList groceryListId="test-list-1" />);

      // Find and click more menu for first item
      const moreButtons = screen.getAllByRole('button');
      const firstMoreButton = moreButtons.find(btn =>
        btn.querySelector('.lucide-more-horizontal')
      );

      fireEvent.click(firstMoreButton!);

      // Click Edit in dropdown
      await waitFor(() => {
        const editButton = screen.getByText('Edit');
        fireEvent.click(editButton);
      });

      // Check if edit modal appears
      await waitFor(() => {
        expect(screen.getByText('Edit Item')).toBeInTheDocument();
        expect(screen.getByText('Update the details of your grocery item')).toBeInTheDocument();
      });
    });

    it('should update item when edit form is submitted', async () => {
      const { useUpdateGroceryItem } = await import('@/hooks/useGroceryLists');
      const mockUpdate = vi.fn().mockResolvedValue({});
      (useUpdateGroceryItem as any).mockReturnValue({
        mutateAsync: mockUpdate,
        isPending: false
      });

      renderWithProviders(<MobileGroceryList groceryListId="test-list-1" />);

      // Open edit modal for first item
      const moreButtons = screen.getAllByRole('button');
      const firstMoreButton = moreButtons.find(btn =>
        btn.querySelector('.lucide-more-horizontal')
      );

      fireEvent.click(firstMoreButton!);

      await waitFor(() => {
        const editButton = screen.getByText('Edit');
        fireEvent.click(editButton);
      });

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Edit Item')).toBeInTheDocument();
      });

      // Update item name
      const nameInput = screen.getByPlaceholderText('Item name');
      fireEvent.change(nameInput, { target: { value: 'Red Apples' } });

      // Click Update
      const updateButton = screen.getByText('Update Item');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          listId: 'test-list-1',
          itemId: 'item-1',
          updates: expect.objectContaining({
            name: 'Red Apples',
            quantity: 5,
            unit: 'pcs',
            category: 'produce',
            priority: 'high'
          })
        });
      });
    });

    it('should close edit modal when cancel is clicked', async () => {
      renderWithProviders(<MobileGroceryList groceryListId="test-list-1" />);

      // Open edit modal
      const moreButtons = screen.getAllByRole('button');
      const firstMoreButton = moreButtons.find(btn =>
        btn.querySelector('.lucide-more-horizontal')
      );

      fireEvent.click(firstMoreButton!);

      await waitFor(() => {
        const editButton = screen.getByText('Edit');
        fireEvent.click(editButton);
      });

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByText('Edit Item')).toBeInTheDocument();
      });

      // Click Cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Edit Item')).not.toBeInTheDocument();
      });
    });
  });

  describe('Add Item Functionality', () => {
    it('should show add item form when Add Item button is clicked', async () => {
      renderWithProviders(<MobileGroceryList groceryListId="test-list-1" />);

      const addButton = screen.getByText('Add Item');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Item name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Qty')).toBeInTheDocument();
      });
    });

    it('should add new item when form is submitted', async () => {
      const { useAddGroceryItem } = await import('@/hooks/useGroceryLists');
      const mockAdd = vi.fn().mockResolvedValue({ data: { id: 'new-item' } });
      (useAddGroceryItem as any).mockReturnValue({
        mutateAsync: mockAdd,
        isPending: false
      });

      renderWithProviders(<MobileGroceryList groceryListId="test-list-1" />);

      // Click Add Item
      const addButton = screen.getByText('Add Item');
      fireEvent.click(addButton);

      // Fill form
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Item name');
        const qtyInput = screen.getByPlaceholderText('Qty');

        fireEvent.change(nameInput, { target: { value: 'Bananas' } });
        fireEvent.change(qtyInput, { target: { value: '6' } });
      });

      // Submit
      const submitButton = screen.getByRole('button', { name: /add item/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAdd).toHaveBeenCalledWith({
          listId: 'test-list-1',
          item: expect.objectContaining({
            name: 'Bananas',
            quantity: 6,
            category: 'produce',
            unit: 'pcs',
            priority: 'medium'
          })
        });
      });
    });

    it('should show error if item name is empty', async () => {
      const { useToast } = await import('@/hooks/use-toast');
      const mockToast = vi.fn();
      (useToast as any).mockReturnValue({ toast: mockToast });

      renderWithProviders(<MobileGroceryList groceryListId="test-list-1" />);

      // Click Add Item
      const addButton = screen.getByText('Add Item');
      fireEvent.click(addButton);

      // Try to submit without name
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /add item/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            description: 'Item name is required',
            variant: 'destructive'
          })
        );
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should delete item when delete menu item is clicked', async () => {
      const { useDeleteGroceryItem } = await import('@/hooks/useGroceryLists');
      const mockDelete = vi.fn().mockResolvedValue({});
      (useDeleteGroceryItem as any).mockReturnValue({
        mutateAsync: mockDelete,
        isPending: false
      });

      renderWithProviders(<MobileGroceryList groceryListId="test-list-1" />);

      // Open dropdown for first item
      const moreButtons = screen.getAllByRole('button');
      const firstMoreButton = moreButtons.find(btn =>
        btn.querySelector('.lucide-more-horizontal')
      );

      fireEvent.click(firstMoreButton!);

      // Click Delete
      await waitFor(() => {
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith({
          listId: 'test-list-1',
          itemId: 'item-1'
        });
      });
    });
  });

  describe('List Management', () => {
    it('should create a new list when Create New List is clicked', async () => {
      const { useCreateGroceryList } = await import('@/hooks/useGroceryLists');
      const mockCreate = vi.fn().mockResolvedValue({ data: { id: 'new-list' } });
      (useCreateGroceryList as any).mockReturnValue({
        mutateAsync: mockCreate,
        isPending: false
      });

      renderWithProviders(<GroceryListWrapper />);

      // Wait for lists to load
      await waitFor(() => {
        expect(screen.queryByText('Loading your grocery lists')).not.toBeInTheDocument();
      });

      // Click Create New List
      const createButton = screen.getByText('Create New List');
      fireEvent.click(createButton);

      // Fill in list name
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('e.g., Weekly Shopping, Meal Prep');
        fireEvent.change(nameInput, { target: { value: 'Weekly Shopping' } });
      });

      // Submit
      const submitButton = screen.getByRole('button', { name: /create list/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'Weekly Shopping'
        });
      });
    });
  });
});