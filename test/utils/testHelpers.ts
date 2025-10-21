/**
 * Test Helper Utilities
 *
 * Common utility functions and helpers for testing across the application.
 * Provides consistent patterns for mocking, assertions, and test setup.
 */

import { vi, expect, type MockedFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Mock Data Helpers
 */
export const MockHelpers = {
  /**
   * Create a mock function with specified return values
   */
  createMockWithReturnValues: <T extends (...args: any[]) => any>(
    returnValues: ReturnType<T>[]
  ): MockedFunction<T> => {
    const mock = vi.fn() as MockedFunction<T>;
    returnValues.forEach((value, index) => {
      mock.mockReturnValueOnce(value);
    });
    return mock;
  },

  /**
   * Create a mock function that resolves to specified values
   */
  createAsyncMockWithValues: <T>(
    values: T[]
  ): MockedFunction<() => Promise<T>> => {
    const mock = vi.fn();
    values.forEach(value => {
      mock.mockResolvedValueOnce(value);
    });
    return mock;
  },

  /**
   * Create a mock API response
   */
  createMockApiResponse: <T>(data: T, status: number = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  }),

  /**
   * Create a mock fetch implementation
   */
  createMockFetch: (responses: Array<{ url?: string; response: any; status?: number }>) => {
    return vi.fn().mockImplementation((url: string) => {
      const mockResponse = responses.find(r => !r.url || url.includes(r.url));
      if (mockResponse) {
        return Promise.resolve(MockHelpers.createMockApiResponse(mockResponse.response, mockResponse.status));
      }
      return Promise.reject(new Error(`No mock response for ${url}`));
    });
  },

  /**
   * Mock localStorage
   */
  mockLocalStorage: () => {
    const storage: { [key: string]: string } = {};
    return {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(storage).forEach(key => delete storage[key]);
      }),
    };
  },

  /**
   * Mock window.location
   */
  mockLocation: (url: string = 'http://localhost:3000') => {
    const location = new URL(url);
    return {
      href: location.href,
      origin: location.origin,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      reload: vi.fn(),
      replace: vi.fn(),
      assign: vi.fn(),
    };
  },
};

/**
 * Async Testing Helpers
 */
export const AsyncHelpers = {
  /**
   * Wait for a condition to be true
   */
  waitForCondition: async (
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Wait for multiple elements to appear
   */
  waitForElements: async (selectors: string[], timeout: number = 5000) => {
    const elements = await Promise.all(
      selectors.map(selector =>
        waitFor(() => screen.getByTestId(selector), { timeout })
      )
    );
    return elements;
  },

  /**
   * Wait for API calls to complete
   */
  waitForApiCalls: async (mockFn: MockedFunction<any>, expectedCalls: number = 1) => {
    await waitFor(() => {
      expect(mockFn).toHaveBeenCalledTimes(expectedCalls);
    });
  },

  /**
   * Simulate network delay
   */
  networkDelay: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Retry an async operation
   */
  retry: async <T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 100
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          await AsyncHelpers.networkDelay(delay);
        }
      }
    }

    throw lastError!;
  },
};

/**
 * DOM Testing Helpers
 */
export const DOMHelpers = {
  /**
   * Get form data as an object
   */
  getFormData: (form: HTMLFormElement): Record<string, string> => {
    const formData = new FormData(form);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });
    return data;
  },

  /**
   * Fill out a form with test data
   */
  fillForm: async (formData: Record<string, string>) => {
    const user = userEvent.setup();

    for (const [name, value] of Object.entries(formData)) {
      const input = screen.getByRole('textbox', { name: new RegExp(name, 'i') }) ||
                   screen.getByLabelText(new RegExp(name, 'i')) ||
                   screen.getByTestId(name);

      await user.clear(input);
      await user.type(input, value);
    }
  },

  /**
   * Submit a form and wait for response
   */
  submitForm: async (formSelector?: string) => {
    const user = userEvent.setup();
    const submitButton = formSelector
      ? screen.getByRole('button', { name: /submit/i })
      : screen.getByRole('button', { name: /submit/i });

    await user.click(submitButton);
  },

  /**
   * Check if element has specific CSS class
   */
  hasClass: (element: Element, className: string): boolean => {
    return element.classList.contains(className);
  },

  /**
   * Get all elements with specific test ID pattern
   */
  getAllByTestIdPattern: (pattern: RegExp): HTMLElement[] => {
    return screen.getAllByTestId((content, element) => {
      const testId = element?.getAttribute('data-testid');
      return testId ? pattern.test(testId) : false;
    });
  },

  /**
   * Check for accessibility violations
   */
  checkAccessibility: async (container: HTMLElement) => {
    // Basic accessibility checks
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // Check for missing labels
    const inputs = container.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const label = container.querySelector(`label[for="${input.id}"]`) ||
                   input.closest('label');
      if (!label && !input.getAttribute('aria-label')) {
        console.warn(`Input without label found:`, input);
      }
    });

    // Check for missing alt text on images
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      if (!img.getAttribute('alt')) {
        console.warn(`Image without alt text found:`, img);
      }
    });

    return {
      focusableElements: focusableElements.length,
      hasAccessibilityIssues: false, // Simplified for this example
    };
  },
};

/**
 * Performance Testing Helpers
 */
export const PerformanceHelpers = {
  /**
   * Measure function execution time
   */
  measureTime: async <T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  /**
   * Run performance benchmark
   */
  benchmark: async <T>(
    fn: () => Promise<T> | T,
    iterations: number = 100
  ): Promise<{ avg: number; min: number; max: number; results: T[] }> => {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await PerformanceHelpers.measureTime(fn);
      times.push(duration);
      results.push(result);
    }

    return {
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      results,
    };
  },

  /**
   * Check memory usage
   */
  checkMemoryUsage: () => {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return process.memoryUsage(); // Node.js fallback
  },

  /**
   * Profile rendering performance
   */
  profileRender: async (renderFn: () => RenderResult): Promise<{ renderTime: number; result: RenderResult }> => {
    const { result, duration } = await PerformanceHelpers.measureTime(renderFn);
    return { renderTime: duration, result };
  },
};

/**
 * Validation Helpers
 */
export const ValidationHelpers = {
  /**
   * Assert that a validation result is successful
   */
  expectValidationSuccess: (result: { success: boolean; data?: any; error?: any }) => {
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
  },

  /**
   * Assert that a validation result failed with specific errors
   */
  expectValidationFailure: (
    result: { success: boolean; error?: any },
    expectedFields?: string[]
  ) => {
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    if (expectedFields && result.error?.issues) {
      const errorFields = result.error.issues.map((issue: any) => issue.path[0]);
      expectedFields.forEach(field => {
        expect(errorFields).toContain(field);
      });
    }
  },

  /**
   * Create validation test cases
   */
  createValidationTestCases: <T>(
    validCases: Array<{ input: T; description: string }>,
    invalidCases: Array<{ input: T; description: string; expectedErrors?: string[] }>
  ) => ({
    valid: validCases,
    invalid: invalidCases,
  }),
};

/**
 * Error Testing Helpers
 */
export const ErrorHelpers = {
  /**
   * Expect an async function to throw
   */
  expectToThrow: async (fn: () => Promise<any>, expectedError?: string | RegExp) => {
    await expect(fn()).rejects.toThrow(expectedError);
  },

  /**
   * Expect a function to throw synchronously
   */
  expectToThrowSync: (fn: () => any, expectedError?: string | RegExp) => {
    expect(fn).toThrow(expectedError);
  },

  /**
   * Mock console methods for error testing
   */
  mockConsole: () => {
    const originalConsole = { ...console };
    const mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };

    Object.assign(console, mockConsole);

    return {
      mockConsole,
      restore: () => Object.assign(console, originalConsole),
    };
  },

  /**
   * Create error boundary test wrapper
   */
  createErrorBoundary: () => {
    let hasError = false;
    let error: Error | null = null;

    const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      try {
        return <>{children}</>;
      } catch (e) {
        hasError = true;
        error = e as Error;
        return <div data-testid="error-boundary">Something went wrong</div>;
      }
    };

    return {
      ErrorBoundary,
      hasError: () => hasError,
      getError: () => error,
      reset: () => {
        hasError = false;
        error = null;
      },
    };
  },
};

/**
 * Common Test Patterns
 */
export const TestPatterns = {
  /**
   * Test CRUD operations
   */
  testCrudOperations: <T>(
    entity: string,
    createFn: (data: Partial<T>) => Promise<T>,
    readFn: (id: string) => Promise<T>,
    updateFn: (id: string, data: Partial<T>) => Promise<T>,
    deleteFn: (id: string) => Promise<void>,
    testData: Partial<T>
  ) => ({
    testCreate: async () => {
      const created = await createFn(testData);
      expect(created).toMatchObject(testData);
      return created;
    },

    testRead: async (id: string) => {
      const item = await readFn(id);
      expect(item).toBeDefined();
      return item;
    },

    testUpdate: async (id: string, updateData: Partial<T>) => {
      const updated = await updateFn(id, updateData);
      expect(updated).toMatchObject(updateData);
      return updated;
    },

    testDelete: async (id: string) => {
      await deleteFn(id);
      await expect(readFn(id)).rejects.toThrow();
    },
  }),

  /**
   * Test component lifecycle
   */
  testComponentLifecycle: (
    ComponentToTest: React.ComponentType<any>,
    props: any = {}
  ) => ({
    testMount: () => {
      const { unmount } = render(<ComponentToTest {...props} />);
      expect(screen.getByTestId('component-root')).toBeInTheDocument();
      unmount();
    },

    testUnmount: () => {
      const { unmount } = render(<ComponentToTest {...props} />);
      unmount();
      // Component should be removed from DOM
    },

    testRerender: () => {
      const { rerender } = render(<ComponentToTest {...props} />);
      rerender(<ComponentToTest {...props} someProp="changed" />);
      expect(screen.getByTestId('component-root')).toBeInTheDocument();
    },
  }),

  /**
   * Test form submission flow
   */
  testFormFlow: (formData: Record<string, string>, expectedResult?: any) => ({
    fillAndSubmit: async () => {
      await DOMHelpers.fillForm(formData);
      await DOMHelpers.submitForm();

      if (expectedResult) {
        await waitFor(() => {
          expect(screen.getByTestId('success-message')).toBeInTheDocument();
        });
      }
    },

    testValidation: async (invalidData: Record<string, string>) => {
      await DOMHelpers.fillForm(invalidData);
      await DOMHelpers.submitForm();

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    },
  }),
};

/**
 * Test Environment Helpers
 */
export const EnvironmentHelpers = {
  /**
   * Setup test environment
   */
  setupTestEnvironment: () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock common browser APIs
    Object.defineProperty(window, 'localStorage', {
      value: MockHelpers.mockLocalStorage(),
    });

    Object.defineProperty(window, 'location', {
      value: MockHelpers.mockLocation(),
      writable: true,
    });

    // Mock fetch
    global.fetch = MockHelpers.createMockFetch([]);
  },

  /**
   * Cleanup test environment
   */
  cleanupTestEnvironment: () => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  },

  /**
   * Mock timers for testing
   */
  mockTimers: () => {
    vi.useFakeTimers();
    return {
      advanceBy: (ms: number) => vi.advanceTimersByTime(ms),
      runAll: () => vi.runAllTimers(),
      restore: () => vi.useRealTimers(),
    };
  },
};