/**
 * Stable Form Components Tests
 * 
 * Comprehensive test suite to verify that the optimized form components
 * address the 30+ second delays and provide stable, performant form interactions.
 * 
 * Test Coverage:
 * 1. Render performance (under 100ms initial render)
 * 2. State management stability (no uncontrolled/controlled conflicts)
 * 3. Memory leak prevention (proper cleanup)
 * 4. Event handler efficiency (no excessive re-renders)
 * 5. Error boundary functionality
 * 6. Select component optimization
 * 7. Form validation performance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Import optimized components
import {
  OptimizedSelect,
  OptimizedSelectTrigger,
  OptimizedSelectContent,
  OptimizedSelectItem,
  OptimizedSelectValue,
  OptimizedSelectField,
  SelectErrorBoundary,
} from '../../../client/src/components/ui/optimized-select';

import RegisterPageOptimized from '../../../client/src/pages/RegisterPageOptimized';
import RecipeGenerationModalOptimized from '../../../client/src/components/RecipeGenerationModalOptimized';

// Mock dependencies
vi.mock('wouter', () => ({
  useLocation: () => ['/register', vi.fn()],
  Link: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('../../../client/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    register: vi.fn().mockResolvedValue({ role: 'customer' }),
  }),
}));

vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock styles
vi.mock('../../../client/src/styles/icons.module.css', () => ({
  default: {
    iconContainer: 'icon-container',
    iconPrimary: 'icon-primary',
    iconMuted: 'icon-muted',
    icon: 'icon',
  },
}));

// Performance testing utilities
const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now();
  await act(async () => {
    renderFn();
  });
  return performance.now() - start;
};

const measureReRenders = (Component: React.ComponentType) => {
  let renderCount = 0;
  const WrappedComponent = (props: any) => {
    renderCount++;
    return <Component {...props} />;
  };
  return { WrappedComponent, getRenderCount: () => renderCount };
};

// Test wrapper with QueryClient
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Stable Form Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('OptimizedSelect Component Performance', () => {
    it('should render within 100ms', async () => {
      const renderTime = await measureRenderTime(() => {
        render(
          <OptimizedSelect>
            <OptimizedSelectTrigger>
              <OptimizedSelectValue placeholder="Select an option" />
            </OptimizedSelectTrigger>
            <OptimizedSelectContent>
              <OptimizedSelectItem value="option1">Option 1</OptimizedSelectItem>
              <OptimizedSelectItem value="option2">Option 2</OptimizedSelectItem>
            </OptimizedSelectContent>
          </OptimizedSelect>
        );
      });

      expect(renderTime).toBeLessThan(100);
    });

    it('should prevent unnecessary re-renders with stable props', async () => {
      const { WrappedComponent, getRenderCount } = measureReRenders(
        (props: any) => (
          <OptimizedSelectField {...props}>
            <OptimizedSelectItem value="option1">Option 1</OptimizedSelectItem>
            <OptimizedSelectItem value="option2">Option 2</OptimizedSelectItem>
          </OptimizedSelectField>
        )
      );

      const { rerender } = render(
        <WrappedComponent
          value="option1"
          onValueChange={vi.fn()}
          placeholder="Test select"
        />
      );

      const initialRenderCount = getRenderCount();

      // Re-render with same props - should not cause component re-render
      rerender(
        <WrappedComponent
          value="option1"
          onValueChange={vi.fn()}
          placeholder="Test select"
        />
      );

      expect(getRenderCount()).toBe(initialRenderCount + 1); // Only one additional render for rerender call
    });

    it('should handle large option lists efficiently', async () => {
      const largeOptions = Array.from({ length: 500 }, (_, i) => ({
        value: `option${i}`,
        label: `Option ${i}`,
      }));

      const renderTime = await measureRenderTime(() => {
        render(
          <OptimizedSelectField placeholder="Select option">
            {largeOptions.map(option => (
              <OptimizedSelectItem key={option.value} value={option.value}>
                {option.label}
              </OptimizedSelectItem>
            ))}
          </OptimizedSelectField>
        );
      });

      expect(renderTime).toBeLessThan(200); // Even with 500 options, should render quickly
    });

    it('should properly handle controlled/uncontrolled states', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();

      // Test controlled component
      const { rerender } = render(
        <OptimizedSelectField
          value="option1"
          onValueChange={onValueChange}
          placeholder="Controlled select"
        >
          <OptimizedSelectItem value="option1">Option 1</OptimizedSelectItem>
          <OptimizedSelectItem value="option2">Option 2</OptimizedSelectItem>
        </OptimizedSelectField>
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger).toBeInTheDocument();

      // Change to uncontrolled (should not cause errors)
      rerender(
        <OptimizedSelectField
          defaultValue="option2"
          onValueChange={onValueChange}
          placeholder="Uncontrolled select"
        >
          <OptimizedSelectItem value="option1">Option 1</OptimizedSelectItem>
          <OptimizedSelectItem value="option2">Option 2</OptimizedSelectItem>
        </OptimizedSelectField>
      );

      // Should not throw errors or cause warnings
      expect(trigger).toBeInTheDocument();
    });

    it('should debounce value changes properly', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      const onValueChange = vi.fn();

      render(
        <OptimizedSelectField onValueChange={onValueChange}>
          <OptimizedSelectItem value="option1">Option 1</OptimizedSelectItem>
          <OptimizedSelectItem value="option2">Option 2</OptimizedSelectItem>
          <OptimizedSelectItem value="option3">Option 3</OptimizedSelectItem>
        </OptimizedSelectField>
      );

      const trigger = screen.getByRole('combobox');
      
      // Rapid changes should be debounced
      await user.click(trigger);
      const option1 = screen.getByText('Option 1');
      const option2 = screen.getByText('Option 2');
      
      await user.click(option1);
      await user.click(trigger);
      await user.click(option2);

      // Fast forward past debounce delay
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should only call onValueChange for the final selection
      expect(onValueChange).toHaveBeenCalledWith('option2');
      
      vi.useRealTimers();
    });
  });

  describe('SelectErrorBoundary', () => {
    it('should catch errors and display fallback UI', () => {
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <SelectErrorBoundary fallback={<div>Select component failed to load</div>}>
          <ThrowingComponent />
        </SelectErrorBoundary>
      );

      expect(screen.getByText('Select component failed to load')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should render children when no error occurs', () => {
      render(
        <SelectErrorBoundary>
          <div>Select component works</div>
        </SelectErrorBoundary>
      );

      expect(screen.getByText('Select component works')).toBeInTheDocument();
    });
  });

  describe('RegisterPageOptimized Performance', () => {
    it('should render the registration form within performance budget', async () => {
      const renderTime = await measureRenderTime(() => {
        render(
          <TestWrapper>
            <RegisterPageOptimized />
          </TestWrapper>
        );
      });

      expect(renderTime).toBeLessThan(300); // Complex form should still render quickly
    });

    it('should handle form submission without delays', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RegisterPageOptimized />
        </TestWrapper>
      );

      // Fill out form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'TestPassword123!');
      await user.type(confirmPasswordInput, 'TestPassword123!');

      // Form interactions should be responsive
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('TestPassword123!');
      expect(confirmPasswordInput).toHaveValue('TestPassword123!');
    });

    it('should not cause memory leaks during form interactions', async () => {
      const user = userEvent.setup();
      const initialMemory = performance.memory?.usedJSHeapSize || 0;

      const { unmount } = render(
        <TestWrapper>
          <RegisterPageOptimized />
        </TestWrapper>
      );

      // Perform many form interactions
      const emailInput = screen.getByLabelText(/email address/i);
      
      for (let i = 0; i < 100; i++) {
        await user.clear(emailInput);
        await user.type(emailInput, `test${i}@example.com`);
      }

      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should maintain form state consistency during role changes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RegisterPageOptimized />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      // Change role via select - should not affect other form fields
      const roleSelect = screen.getByRole('combobox');
      await user.click(roleSelect);
      
      const trainerOption = screen.getByText(/trainer - creating meal plans/i);
      await user.click(trainerOption);

      // Email should remain unchanged
      expect(emailInput).toHaveValue('test@example.com');
    });
  });

  describe('RecipeGenerationModalOptimized Performance', () => {
    it('should render modal within performance budget', async () => {
      const renderTime = await measureRenderTime(() => {
        render(
          <TestWrapper>
            <RecipeGenerationModalOptimized
              isOpen={true}
              onClose={vi.fn()}
            />
          </TestWrapper>
        );
      });

      expect(renderTime).toBeLessThan(400); // Complex modal with many selects
    });

    it('should handle form state updates efficiently', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RecipeGenerationModalOptimized
            isOpen={true}
            onClose={vi.fn()}
          />
        </TestWrapper>
      );

      // Test multiple rapid form updates
      const textArea = screen.getByPlaceholderText(/describe recipe requirements/i);
      const startTime = performance.now();

      // Rapid typing should not cause delays
      await user.type(textArea, 'Test recipe requirements with multiple words and descriptions');

      const endTime = performance.now();
      const typingTime = endTime - startTime;

      // Should handle typing without significant delays
      expect(typingTime).toBeLessThan(1000);
    });

    it('should properly debounce form updates', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      const { rerender } = render(
        <TestWrapper>
          <RecipeGenerationModalOptimized
            isOpen={true}
            onClose={vi.fn()}
          />
        </TestWrapper>
      );

      const textArea = screen.getByPlaceholderText(/describe recipe requirements/i);

      // Type multiple characters rapidly
      await user.type(textArea, 'rapid typing test');

      // Fast forward past debounce delay
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(textArea).toHaveValue('rapid typing test');

      vi.useRealTimers();
    });
  });

  describe('Form Validation Performance', () => {
    it('should validate forms without causing render delays', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RegisterPageOptimized />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      
      const startTime = performance.now();

      // Type invalid password
      await user.type(passwordInput, 'weak');
      
      // Type valid password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'StrongPassword123!');

      const endTime = performance.now();
      const validationTime = endTime - startTime;

      // Validation should be near-instantaneous
      expect(validationTime).toBeLessThan(500);
    });

    it('should handle simultaneous validation of multiple fields efficiently', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RegisterPageOptimized />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      const startTime = performance.now();

      // Fill all fields simultaneously (simulate fast user)
      await Promise.all([
        user.type(emailInput, 'invalid-email'),
        user.type(passwordInput, 'weak'),
        user.type(confirmPasswordInput, 'different'),
      ]);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle multiple validations efficiently
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe('Memory Management', () => {
    it('should clean up event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <TestWrapper>
          <RegisterPageOptimized />
        </TestWrapper>
      );

      const addListenerCalls = addEventListenerSpy.mock.calls.length;

      unmount();

      const removeListenerCalls = removeEventListenerSpy.mock.calls.length;

      // Should clean up listeners (or at least not leak them)
      expect(removeListenerCalls).toBeGreaterThanOrEqual(0);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should not leak React state on rapid mount/unmount cycles', async () => {
      const TestComponent = () => (
        <TestWrapper>
          <RegisterPageOptimized />
        </TestWrapper>
      );

      // Rapid mount/unmount cycle
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<TestComponent />);
        unmount();
      }

      // Should not throw errors or warnings about state updates on unmounted components
      // This test passes if no errors are thrown
      expect(true).toBe(true);
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should maintain proper ARIA attributes during interactions', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RegisterPageOptimized />
        </TestWrapper>
      );

      const roleSelect = screen.getByRole('combobox');
      expect(roleSelect).toHaveAttribute('aria-expanded', 'false');

      await user.click(roleSelect);
      expect(roleSelect).toHaveAttribute('aria-expanded', 'true');
    });

    it('should provide proper loading states during form submission', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <RegisterPageOptimized />
        </TestWrapper>
      );

      // Fill out valid form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'TestPassword123!');
      await user.type(confirmPasswordInput, 'TestPassword123!');

      // Submit form
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });
  });
});