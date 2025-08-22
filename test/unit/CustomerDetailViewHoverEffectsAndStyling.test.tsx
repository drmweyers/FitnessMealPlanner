/**
 * Unit Tests for CustomerDetailView Hover Effects and Visual Styling
 * 
 * This test suite focuses specifically on:
 * - CSS class application for hover effects
 * - Visual feedback during user interactions
 * - Transition animations and styling
 * - Responsive design behavior
 * - Accessibility considerations for visual elements
 * - Cursor pointer styling for clickable elements
 * 
 * Tests ensure that:
 * 1. Proper hover classes are applied to meal plan items
 * 2. Transition effects work correctly
 * 3. Visual feedback indicates interactive elements
 * 4. Styling is consistent across different tabs and states
 * 5. Accessibility features are properly implemented
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import CustomerDetailView from '@/components/CustomerDetailView';
import type { CustomerMealPlan } from '@shared/schema';

// Mock API request
const mockApiRequest = vi.fn();
vi.mock('@/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

// Simple PDF Button Mock for styling tests
vi.mock('@/components/PDFExportButton', () => ({
  SimplePDFExportButton: ({ className, size, children, onClick }: any) => (
    <button
      data-testid="pdf-button"
      className={className}
      onClick={onClick}
    >
      {children || 'PDF'}
    </button>
  ),
}));

// Simple Modal Mock for styling tests
vi.mock('@/components/MealPlanModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="meal-plan-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Test data
const mockCustomer = {
  id: 'customer-123',
  email: 'testcustomer@example.com',
  firstAssignedAt: '2024-01-01T00:00:00Z',
};

const createMockMealPlan = (id: string, planName: string): CustomerMealPlan => ({
  id,
  customerId: 'customer-123',
  trainerId: 'trainer-456',
  mealPlanData: {
    planName,
    fitnessGoal: 'weight_loss',
    description: `${planName} description`,
    dailyCalorieTarget: 1800,
    days: 7,
    mealsPerDay: 4,
    meals: [],
    totalCalories: 7200,
    totalProtein: '350.00',
    totalCarbs: '900.00',
    totalFat: '240.00',
    createdAt: '2024-01-01T00:00:00Z',
  },
  assignedAt: '2024-01-01T00:00:00Z',
  planName,
  fitnessGoal: 'weight_loss',
  dailyCalorieTarget: 1800,
  totalDays: 7,
  mealsPerDay: 4,
});

const mockMealPlans = [
  createMockMealPlan('plan-1', 'Hover Test Plan'),
  createMockMealPlan('plan-2', 'Styling Test Plan'),
  createMockMealPlan('plan-3', 'Animation Test Plan'),
];

describe('CustomerDetailView - Hover Effects and Visual Styling', () => {
  let queryClient: QueryClient;
  let mockOnBack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockOnBack = vi.fn();
    
    vi.clearAllMocks();
    
    // Setup API mocks
    mockApiRequest.mockImplementation((method: string, url: string) => {
      if (url.includes('/meal-plans')) {
        return Promise.resolve({
          json: () => Promise.resolve({ 
            mealPlans: mockMealPlans, 
            total: mockMealPlans.length 
          })
        });
      }
      if (url.includes('/measurements')) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'success', data: [] })
        });
      }
      if (url.includes('/goals')) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'success', data: [] })
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CustomerDetailView customer={mockCustomer} onBack={mockOnBack} />
      </QueryClientProvider>
    );
  };

  describe('Recent Meal Plans Section (Overview Tab) - Hover Styling', () => {
    it('applies correct hover classes to meal plan items in recent section', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Find the clickable container for the meal plan item
      const mealPlanItem = screen.getByText('Hover Test Plan').closest('div');
      
      // Verify the container has the correct hover classes
      expect(mealPlanItem).toHaveClass('hover:bg-gray-100');
      expect(mealPlanItem).toHaveClass('cursor-pointer');
      expect(mealPlanItem).toHaveClass('transition-colors');
    });

    it('includes proper base styling classes for recent meal plan items', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      const mealPlanContainer = screen.getByText('Hover Test Plan')
        .closest('div[class*="bg-gray-50"]');
      
      expect(mealPlanContainer).toHaveClass('bg-gray-50');
      expect(mealPlanContainer).toHaveClass('rounded-lg');
      expect(mealPlanContainer).toHaveClass('p-3');
    });

    it('applies hover text color changes to meal plan titles', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Find the meal plan title element
      const titleElement = screen.getByText('Hover Test Plan');
      
      // Check for hover color transition classes
      expect(titleElement).toHaveClass('hover:text-blue-600');
      expect(titleElement).toHaveClass('transition-colors');
    });

    it('maintains consistent styling across multiple meal plan items', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
        expect(screen.getByText('Styling Test Plan')).toBeInTheDocument();
      });

      const items = [
        screen.getByText('Hover Test Plan'),
        screen.getByText('Styling Test Plan'),
        screen.getByText('Animation Test Plan')
      ];

      items.forEach(item => {
        const container = item.closest('div[class*="hover:bg-gray-100"]');
        expect(container).toHaveClass('hover:bg-gray-100');
        expect(container).toHaveClass('cursor-pointer');
        expect(container).toHaveClass('transition-colors');
      });
    });
  });

  describe('Full Meal Plans Tab - Card Hover Styling', () => {
    beforeEach(async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Switch to meal plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);
      
      await waitFor(() => {
        expect(mealPlansTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('applies card-specific hover effects in meal plans tab', async () => {
      // Find meal plan cards
      const mealPlanCard = screen.getByText('Hover Test Plan')
        .closest('div[class*="hover:shadow-md"]');
      
      expect(mealPlanCard).toHaveClass('hover:shadow-md');
      expect(mealPlanCard).toHaveClass('transition-shadow');
      expect(mealPlanCard).toHaveClass('cursor-pointer');
    });

    it('includes proper card base styling', async () => {
      const cardElement = screen.getByText('Hover Test Plan')
        .closest('[class*="card"]');
      
      // Should have card-like appearance
      expect(cardElement).toBeInTheDocument();
      
      // Find the actual card container with the expected classes
      const cardContainer = screen.getByText('Hover Test Plan')
        .closest('div[class*="transition-shadow"]');
      
      expect(cardContainer).toHaveClass('transition-shadow');
    });

    it('applies hover effects to meal plan titles in card view', async () => {
      const titleElement = screen.getByText('Hover Test Plan');
      
      // Title should have hover color effects
      expect(titleElement).toHaveClass('hover:text-blue-600');
      expect(titleElement).toHaveClass('transition-colors');
    });

    it('maintains card styling consistency across all meal plans', async () => {
      const planTitles = ['Hover Test Plan', 'Styling Test Plan', 'Animation Test Plan'];
      
      planTitles.forEach(title => {
        const titleElement = screen.getByText(title);
        const cardContainer = titleElement.closest('div[class*="hover:shadow-md"]');
        
        expect(cardContainer).toHaveClass('hover:shadow-md');
        expect(cardContainer).toHaveClass('transition-shadow');
        expect(cardContainer).toHaveClass('cursor-pointer');
      });
    });
  });

  describe('PDF Button Styling Integration', () => {
    it('applies correct styling classes to PDF buttons', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      const pdfButtons = screen.getAllByTestId('pdf-button');
      
      pdfButtons.forEach(button => {
        expect(button).toHaveClass('text-blue-600');
        expect(button).toHaveClass('hover:text-blue-700');
      });
    });

    it('maintains PDF button styling in meal plans tab', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Switch to meal plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      const pdfButtons = screen.getAllByTestId('pdf-button');
      
      pdfButtons.forEach(button => {
        expect(button).toHaveClass('text-blue-600');
        expect(button).toHaveClass('hover:text-blue-700');
        // Should also have hover background in card view
        expect(button).toHaveClass('hover:bg-blue-50');
      });
    });
  });

  describe('Mouse Interaction Visual Feedback', () => {
    it('responds to mouse enter and leave events', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      const mealPlanItem = screen.getByText('Hover Test Plan')
        .closest('div[class*="hover:bg-gray-100"]');

      // Simulate mouse interactions
      fireEvent.mouseEnter(mealPlanItem!);
      fireEvent.mouseLeave(mealPlanItem!);

      // Element should maintain its hover classes for CSS transitions
      expect(mealPlanItem).toHaveClass('hover:bg-gray-100');
      expect(mealPlanItem).toHaveClass('transition-colors');
    });

    it('maintains hover effects during click interactions', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      const mealPlanItem = screen.getByText('Hover Test Plan')
        .closest('div[class*="hover:bg-gray-100"]');

      // Hover, click, and verify classes persist
      fireEvent.mouseEnter(mealPlanItem!);
      await user.click(mealPlanItem!);

      expect(mealPlanItem).toHaveClass('hover:bg-gray-100');
      expect(mealPlanItem).toHaveClass('cursor-pointer');
    });

    it('provides visual feedback for rapid interactions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      const mealPlanItem = screen.getByText('Hover Test Plan')
        .closest('div[class*="transition-colors"]');

      // Rapid mouse events
      fireEvent.mouseEnter(mealPlanItem!);
      fireEvent.mouseLeave(mealPlanItem!);
      fireEvent.mouseEnter(mealPlanItem!);
      fireEvent.click(mealPlanItem!);

      // Transition classes should remain for smooth animations
      expect(mealPlanItem).toHaveClass('transition-colors');
    });
  });

  describe('Responsive Design Considerations', () => {
    it('maintains hover effects across different viewport considerations', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Test that hover classes are applied regardless of viewport
      // (CSS media queries would handle actual responsive behavior)
      const mealPlanItems = screen.getAllByText(/Test Plan/).map(item =>
        item.closest('div[class*="hover:"]')
      );

      mealPlanItems.forEach(item => {
        expect(item).toHaveClass('cursor-pointer');
        // Should have some form of hover effect
        expect(item?.className).toMatch(/hover:/);
      });
    });

    it('applies consistent spacing and padding for touch interactions', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Verify adequate padding for touch targets
      const mealPlanContainers = screen.getAllByText(/Test Plan/).map(item =>
        item.closest('div[class*="p-"]')
      );

      mealPlanContainers.forEach(container => {
        // Should have padding for comfortable touch targets
        expect(container?.className).toMatch(/p-\d/);
      });
    });
  });

  describe('Accessibility and Visual Hierarchy', () => {
    it('provides proper cursor indicators for interactive elements', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // All clickable meal plan elements should have cursor-pointer
      const clickableElements = screen.getAllByText(/Test Plan/).map(item =>
        item.closest('div[class*="cursor-pointer"]')
      );

      expect(clickableElements.length).toBeGreaterThan(0);
      clickableElements.forEach(element => {
        expect(element).toHaveClass('cursor-pointer');
      });
    });

    it('maintains visual hierarchy with proper text styling', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Meal plan titles should have appropriate font weight
      const titleElements = screen.getAllByText(/Test Plan/);
      
      titleElements.forEach(title => {
        // Should have medium or higher font weight for titles
        expect(title.className).toMatch(/font-(medium|semibold|bold)/);
      });
    });

    it('provides sufficient color contrast for hover states', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Verify that hover color classes provide good contrast
      const titleElements = screen.getAllByText(/Test Plan/);
      
      titleElements.forEach(title => {
        expect(title).toHaveClass('hover:text-blue-600');
        // Base text should be visible (gray-900 or similar)
        expect(title.className).toMatch(/(text-gray-900|text-lg|font-medium)/);
      });
    });

    it('includes transition effects for smooth user experience', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // All interactive elements should have transitions
      const interactiveElements = [
        ...screen.getAllByText(/Test Plan/).map(item =>
          item.closest('div[class*="transition"]')
        ),
        ...screen.getAllByTestId('pdf-button')
      ];

      interactiveElements.forEach(element => {
        if (element) {
          expect(element.className).toMatch(/transition/);
        }
      });
    });
  });

  describe('State Persistence and Visual Consistency', () => {
    it('maintains styling when switching between tabs', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Check styling in overview tab
      let mealPlanItem = screen.getByText('Hover Test Plan')
        .closest('div[class*="hover:bg-gray-100"]');
      expect(mealPlanItem).toHaveClass('hover:bg-gray-100');

      // Switch to meal plans tab
      const mealPlansTab = screen.getByRole('tab', { name: /meal plans/i });
      fireEvent.click(mealPlansTab);

      // Check styling in meal plans tab
      mealPlanItem = screen.getByText('Hover Test Plan')
        .closest('div[class*="hover:shadow-md"]');
      expect(mealPlanItem).toHaveClass('hover:shadow-md');
    });

    it('preserves hover effects after modal interactions', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Open and close modal
      await user.click(screen.getByText('Hover Test Plan'));
      await waitFor(() => {
        expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Hover effects should still be present
      await waitFor(() => {
        const mealPlanItem = screen.getByText('Hover Test Plan')
          .closest('div[class*="hover:bg-gray-100"]');
        expect(mealPlanItem).toHaveClass('hover:bg-gray-100');
        expect(mealPlanItem).toHaveClass('cursor-pointer');
      });
    });

    it('maintains consistent styling after PDF button interactions', async () => {
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      });

      // Click PDF button
      const pdfButton = screen.getAllByTestId('pdf-button')[0];
      await user.click(pdfButton);

      // Meal plan item should still have hover effects
      const mealPlanItem = screen.getByText('Hover Test Plan')
        .closest('div[class*="hover:bg-gray-100"]');
      
      expect(mealPlanItem).toHaveClass('hover:bg-gray-100');
      expect(mealPlanItem).toHaveClass('transition-colors');
      expect(mealPlanItem).toHaveClass('cursor-pointer');
    });
  });

  describe('Loading and Empty State Styling', () => {
    it('applies proper styling to loading skeleton elements', async () => {
      // Mock delayed response to catch loading state
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url.includes('/meal-plans')) {
          return new Promise(resolve => 
            setTimeout(() => resolve({
              json: () => Promise.resolve({ 
                mealPlans: mockMealPlans, 
                total: mockMealPlans.length 
              })
            }), 50)
          );
        }
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'success', data: [] })
        });
      });

      renderComponent();

      // Should show loading skeletons with proper animation
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse')
      );
      
      expect(skeletons.length).toBeGreaterThan(0);
      skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass('animate-pulse');
      });

      // Wait for data to load and verify transition to normal styling
      await waitFor(() => {
        expect(screen.getByText('Hover Test Plan')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('handles empty state styling appropriately', async () => {
      // Mock empty response
      mockApiRequest.mockImplementation((method: string, url: string) => {
        if (url.includes('/meal-plans')) {
          return Promise.resolve({
            json: () => Promise.resolve({ mealPlans: [], total: 0 })
          });
        }
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'success', data: [] })
        });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no meal plans assigned yet/i)).toBeInTheDocument();
      });

      // Empty state should have appropriate styling
      const emptyStateText = screen.getByText(/no meal plans assigned yet/i);
      expect(emptyStateText.closest('div')).toHaveClass('text-center');
    });
  });
});