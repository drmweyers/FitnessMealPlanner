/**
 * DOM Setup for Integration Tests
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfills - MUST be first before any other imports
(global as any).TextEncoder = require('util').TextEncoder;
(global as any).TextDecoder = require('util').TextDecoder;

// Comprehensive DOM API patching for JSDOM
if (typeof window !== 'undefined') {
  // Patch Element prototype methods that React DOM expects
  const patchElementPrototype = (ElementClass: any) => {
    if (!ElementClass || !ElementClass.prototype) return;
    
    const proto = ElementClass.prototype;
    
    // Force override setAttribute to ensure it always exists and works
    proto.setAttribute = function(name: string, value: any) {
      try {
        (this as any)[name] = value;
        if (!this.attributes) {
          (this as any).attributes = {};
        }
        this.attributes[name] = { name, value: String(value), specified: true };
      } catch (error) {
        // Silently handle any errors in test environment
        console.warn('setAttribute error handled:', error);
      }
    };
    
    // Force override all attribute methods to ensure they always exist and work
    proto.getAttribute = function(name: string) {
      try {
        return (this as any)[name] || null;
      } catch (error) {
        return null;
      }
    };
    
    proto.removeAttribute = function(name: string) {
      try {
        delete (this as any)[name];
        if (this.attributes) {
          delete this.attributes[name];
        }
      } catch (error) {
        // Silently handle any errors in test environment
      }
    };
    
    proto.hasAttribute = function(name: string) {
      try {
        return name in this && (this as any)[name] !== undefined;
      } catch (error) {
        return false;
      }
    };
    
    proto.setAttributeNS = function(namespace: string, name: string, value: any) {
      try {
        (this as any)[name] = value;
      } catch (error) {
        // Silently handle any errors in test environment
      }
    };
    
    proto.removeAttributeNS = function(namespace: string, name: string) {
      try {
        delete (this as any)[name];
      } catch (error) {
        // Silently handle any errors in test environment
      }
    };
  };

  // Patch all relevant Element classes - be comprehensive
  const elementClasses = [
    window.Element,
    window.HTMLElement,
    window.SVGElement,
    window.HTMLInputElement,
    window.HTMLDivElement,
    window.HTMLButtonElement,
    window.HTMLSpanElement,
    window.HTMLHeadingElement,
    window.HTMLParagraphElement,
    window.HTMLAnchorElement,
    window.HTMLImageElement,
    window.HTMLFormElement,
    window.HTMLLabelElement,
    window.HTMLSelectElement,
    window.HTMLTextAreaElement,
    window.HTMLTableElement,
    window.HTMLTableRowElement,
    window.HTMLTableCellElement,
    window.HTMLListElement,
    window.HTMLLIElement,
  ];
  
  elementClasses.forEach(ElementClass => {
    if (ElementClass) patchElementPrototype(ElementClass);
  });
  
  // Also patch Node if needed
  if (window.Node && window.Node.prototype) {
    const nodeProto = window.Node.prototype;
    if (!nodeProto.appendChild) {
      nodeProto.appendChild = function(child: any) {
        if (!this.childNodes) (this as any).childNodes = [];
        this.childNodes.push(child);
        child.parentNode = this;
        return child;
      };
    }
  }
}

// React global
import React from 'react';
(global as any).React = React;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
(global as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
(global as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
window.scrollTo = vi.fn() as any;

// Mock localStorage with fallback behavior (can be overridden by individual tests)
const localStorageMock = {
  items: new Map(),
  getItem: vi.fn((key: string) => {
    // Check if there's a stored value first (for unit tests)
    if (localStorageMock.items.has(key)) {
      return localStorageMock.items.get(key);
    }
    // Fallback to default values for integration tests
    if (key === 'token') return 'mock-jwt-token';
    if (key === 'refreshToken') return 'mock-refresh-token';
    if (key === 'user') return JSON.stringify({ id: '1', email: 'test@example.com', role: 'admin' });
    return null;
  }),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.items.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    localStorageMock.items.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageMock.items.clear();
  }),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

// Mock document methods for PDF export tests
const mockAnchor = {
  click: vi.fn(),
  href: '',
  download: '',
  style: {},
};

const originalCreateElement = document.createElement.bind(document);

// Enhanced DOM element creation with comprehensive method mocking
const ensureElementMethods = (element: any) => {
  if (!element) return element;
  
  // Core DOM methods that React expects
  if (typeof element.setAttribute !== 'function') {
    element.setAttribute = function(name: string, value: string) {
      (this as any)[name] = value;
      // Also set as attribute for proper attribute access
      if (this.attributes) {
        this.attributes[name] = { name, value };
      }
    };
  }
  
  if (typeof element.getAttribute !== 'function') {
    element.getAttribute = function(name: string) {
      return (this as any)[name] || null;
    };
  }
  
  if (typeof element.removeAttribute !== 'function') {
    element.removeAttribute = function(name: string) {
      delete (this as any)[name];
      if (this.attributes) {
        delete this.attributes[name];
      }
    };
  }
  
  if (typeof element.hasAttribute !== 'function') {
    element.hasAttribute = function(name: string) {
      return (this as any)[name] !== undefined;
    };
  }
  
  // Additional methods React might use
  if (typeof element.setAttributeNS !== 'function') {
    element.setAttributeNS = function(namespace: string, name: string, value: string) {
      (this as any)[name] = value;
    };
  }
  
  if (typeof element.removeAttributeNS !== 'function') {
    element.removeAttributeNS = function(namespace: string, name: string) {
      delete (this as any)[name];
    };
  }
  
  // Ensure attributes object exists
  if (!element.attributes) {
    element.attributes = {};
  }
  
  return element;
};

document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    return ensureElementMethods(mockAnchor) as any;
  }
  
  const element = originalCreateElement(tagName);
  return ensureElementMethods(element);
});

// Don't mock appendChild and removeChild - let them work normally
// document.body.appendChild = vi.fn();
// document.body.removeChild = vi.fn();

// Mock modules
vi.mock('react-router-dom');

// Mock wouter to prevent appendChild issues
vi.mock('wouter', () => {
  const mockNavigate = vi.fn();
  return {
    useLocation: () => ['/', mockNavigate],
    Router: ({ children }: { children: React.ReactNode }) => 
      React.createElement('div', { 'data-testid': 'wouter-router' }, children),
    Link: React.forwardRef((props: any, ref) => {
      const { children, href, ...restProps } = props;
      return React.createElement('a', { 
        ref,
        href, 
        ...restProps, 
        onClick: (e: any) => { e.preventDefault(); mockNavigate(href); }
      }, children);
    }),
    Switch: ({ children }: { children: React.ReactNode }) => 
      React.createElement('div', { 'data-testid': 'wouter-switch' }, children),
    Route: ({ children }: { children: React.ReactNode }) => 
      React.createElement('div', { 'data-testid': 'wouter-route' }, children),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-id', email: 'test@example.com', role: 'admin' },
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
    isLoading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock fetch globally
const mockFetch = vi.fn((url: string, options?: any) => {
  // Default success response
  const defaultResponse = {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: [] }),
    text: async () => 'OK',
    blob: async () => new Blob(['mock pdf data'], { type: 'application/pdf' }),
    headers: new Headers({ 'content-type': 'application/json' }),
  };

  // Handle different endpoints
  if (url.includes('/api/auth/login')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: { id: '1', email: 'test@example.com', role: 'admin' },
      }),
    });
  }

  if (url.includes('/api/auth/refresh')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        token: 'new-mock-jwt-token',
        user: { id: '1', email: 'test@example.com', role: 'admin' },
      }),
    });
  }

  if (url.includes('/api/stats') || url.includes('/admin/stats')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        totalUsers: 100,
        totalRecipes: 50,
        totalMealPlans: 25,
        activeUsers: 80,
      }),
    });
  }

  if (url.includes('/api/recipes')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        recipes: [
          { id: '1', name: 'Test Recipe 1', approved: true },
          { id: '2', name: 'Test Recipe 2', approved: false },
        ],
        total: 2,
      }),
    });
  }

  if (url.includes('/api/users')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        users: [
          { id: '1', email: 'user1@test.com', role: 'customer' },
          { id: '2', email: 'user2@test.com', role: 'trainer' },
        ],
      }),
    });
  }

  if (url.includes('/api/meal-plans')) {
    return Promise.resolve({
      ...defaultResponse,
      json: async () => ({
        mealPlans: [
          { id: '1', name: 'Test Plan 1', calories: 2000 },
          { id: '2', name: 'Test Plan 2', calories: 1800 },
        ],
      }),
    });
  }

  // Default response for unknown endpoints
  return Promise.resolve(defaultResponse);
});

(global as any).fetch = mockFetch;

// Import the required vitest functions
import { beforeEach, afterEach } from 'vitest';

// Setup test DOM container
beforeEach(() => {
  vi.clearAllMocks();
  
  // Ensure document.body exists
  if (!document.body) {
    document.documentElement.appendChild(document.createElement('body'));
  }
  
  // Use innerHTML instead of appendChild (which doesn't work in this jsdom setup)
  document.body.innerHTML = `
    <div id="root" data-testid="test-container"></div>
    <div id="modal-root"></div>
    <div id="portal-root"></div>
  `;
  
  // Ensure all elements have proper DOM methods (use same function as createElement)
  const ensureDOMMethods = ensureElementMethods;
  
  // Apply to root elements
  const root = document.getElementById('root');
  if (root) ensureDOMMethods(root);
  
  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) ensureDOMMethods(modalRoot);
  
  const portalRoot = document.getElementById('portal-root');
  if (portalRoot) ensureDOMMethods(portalRoot);
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
  
  // Clean up DOM thoroughly
  if (document.body) {
    document.body.innerHTML = '';
  }
  
  // Reset any global state that might interfere
  if (global.window) {
    global.window.location.hash = '';
  }
});