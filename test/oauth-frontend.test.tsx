import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import OAuthCallbackPage from '../client/src/pages/OAuthCallbackPage';
import { useOAuthToken } from '../client/src/hooks/useOAuthToken';
import { AuthProvider } from '../client/src/contexts/AuthContext';
import LoginPage from '../client/src/pages/LoginPage';
import RegisterPage from '../client/src/pages/RegisterPage';

// Mock dependencies
vi.mock('../client/src/hooks/useOAuthToken');
vi.mock('../client/src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn()
  })
}));

// Mock window.location
const mockLocation = {
  search: '',
  pathname: '/',
  href: '',
  replace: vi.fn(),
  assign: vi.fn()
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock window.history
const mockHistory = {
  replaceState: vi.fn(),
  pushState: vi.fn()
};

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          {children}
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('OAuth Frontend Components', () => {
  let mockUseOAuthToken: any;

  beforeEach(() => {
    mockUseOAuthToken = vi.mocked(useOAuthToken);
    vi.clearAllMocks();
    
    // Reset window mocks
    mockLocation.search = '';
    mockLocation.pathname = '/';
    mockHistory.replaceState.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.getItem.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('OAuthCallbackPage', () => {
    it('should render loading state', () => {
      render(
        <TestWrapper>
          <OAuthCallbackPage />
        </TestWrapper>
      );

      expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should process OAuth token from URL', async () => {
      mockLocation.search = '?token=mock-oauth-token';
      
      render(
        <TestWrapper>
          <OAuthCallbackPage />
        </TestWrapper>
      );

      expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
    });

    it('should handle OAuth error in URL', async () => {
      mockLocation.search = '?error=oauth_failed';
      
      const mockNavigate = vi.fn();
      
      // Mock the navigation
      vi.mock('wouter', async () => {
        const actual = await vi.importActual('wouter');
        return {
          ...actual,
          useLocation: () => ['/', mockNavigate]
        };
      });

      render(
        <TestWrapper>
          <OAuthCallbackPage />
        </TestWrapper>
      );

      // The component should attempt to navigate to login with error
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login?error=oauth_failed');
      });
    });

    it('should redirect based on user role after authentication', async () => {
      const mockNavigate = vi.fn();
      
      // Mock authenticated user
      const { useAuth } = await import('../client/src/contexts/AuthContext');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: '123', email: 'test@example.com', role: 'trainer' },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn()
      });

      vi.mock('wouter', async () => {
        const actual = await vi.importActual('wouter');
        return {
          ...actual,
          useLocation: () => ['/', mockNavigate]
        };
      });

      render(
        <TestWrapper>
          <OAuthCallbackPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/trainer');
      });
    });

    it('should redirect customer to meal plans page', async () => {
      const mockNavigate = vi.fn();
      
      // Mock authenticated customer
      const { useAuth } = await import('../client/src/contexts/AuthContext');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: '123', email: 'test@example.com', role: 'customer' },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn()
      });

      vi.mock('wouter', async () => {
        const actual = await vi.importActual('wouter');
        return {
          ...actual,
          useLocation: () => ['/', mockNavigate]
        };
      });

      render(
        <TestWrapper>
          <OAuthCallbackPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/my-meal-plans');
      });
    });

    it('should redirect admin to admin page', async () => {
      const mockNavigate = vi.fn();
      
      // Mock authenticated admin
      const { useAuth } = await import('../client/src/contexts/AuthContext');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: '123', email: 'test@example.com', role: 'admin' },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn()
      });

      vi.mock('wouter', async () => {
        const actual = await vi.importActual('wouter');
        return {
          ...actual,
          useLocation: () => ['/', mockNavigate]
        };
      });

      render(
        <TestWrapper>
          <OAuthCallbackPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin');
      });
    });

    it('should clean URL after processing token', async () => {
      mockLocation.search = '?token=mock-oauth-token';
      mockLocation.pathname = '/oauth/callback';

      render(
        <TestWrapper>
          <OAuthCallbackPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockHistory.replaceState).toHaveBeenCalledWith(
          {},
          expect.any(String),
          '/oauth/callback'
        );
      });
    });
  });

  describe('useOAuthToken Hook', () => {
    it('should detect and process OAuth token in URL', () => {
      mockLocation.search = '?token=test-token';
      
      // Import and use the actual hook
      const { useOAuthToken } = require('../client/src/hooks/useOAuthToken');
      
      const TestComponent = () => {
        useOAuthToken();
        return <div>Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    });

    it('should dispatch auth state change event', () => {
      mockLocation.search = '?token=test-token';
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
      
      const { useOAuthToken } = require('../client/src/hooks/useOAuthToken');
      
      const TestComponent = () => {
        useOAuthToken();
        return <div>Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'authStateChange'
        })
      );
    });

    it('should clean URL after processing token', () => {
      mockLocation.search = '?token=test-token';
      mockLocation.pathname = '/some-path';
      
      const { useOAuthToken } = require('../client/src/hooks/useOAuthToken');
      
      const TestComponent = () => {
        useOAuthToken();
        return <div>Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        {},
        expect.any(String),
        '/some-path'
      );
    });

    it('should not process if no token in URL', () => {
      mockLocation.search = '';
      
      const { useOAuthToken } = require('../client/src/hooks/useOAuthToken');
      
      const TestComponent = () => {
        useOAuthToken();
        return <div>Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Google OAuth Login Buttons', () => {
    it('should render Google login button on login page', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText(/continue with google/i)).toBeInTheDocument();
    });

    it('should render Google signup buttons on register page', () => {
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      const googleButtons = screen.getAllByText(/continue with google/i);
      expect(googleButtons.length).toBeGreaterThan(0);
    });

    it('should navigate to correct OAuth endpoint for trainer', () => {
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      const trainerGoogleButton = screen.getByRole('link', { 
        name: /sign up as trainer.*google/i 
      });
      
      expect(trainerGoogleButton).toHaveAttribute(
        'href', 
        '/api/auth/google/trainer'
      );
    });

    it('should navigate to correct OAuth endpoint for customer', () => {
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      const customerGoogleButton = screen.getByRole('link', { 
        name: /sign up as customer.*google/i 
      });
      
      expect(customerGoogleButton).toHaveAttribute(
        'href', 
        '/api/auth/google/customer'
      );
    });

    it('should have proper styling and icons', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const googleButton = screen.getByText(/continue with google/i).closest('a');
      expect(googleButton).toHaveClass('flex', 'items-center');
      
      // Check for Google icon (this depends on your implementation)
      const icon = googleButton?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('OAuth Error Handling', () => {
    it('should display error message for OAuth failures', () => {
      mockLocation.search = '?error=oauth_failed';
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Check if error message is displayed
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });

    it('should display specific error for no user', () => {
      mockLocation.search = '?error=no_user';
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText(/no user information received/i)).toBeInTheDocument();
    });

    it('should handle auth errors gracefully', () => {
      mockLocation.search = '?error=auth_error';
      
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
    });
  });

  describe('OAuth Flow Integration', () => {
    it('should properly integrate with Router component', () => {
      const { Router } = require('wouter');
      
      render(
        <TestWrapper>
          <Router>
            <OAuthCallbackPage />
          </Router>
        </TestWrapper>
      );

      expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
    });

    it('should work with authentication context', async () => {
      const mockLogin = vi.fn().mockResolvedValue(true);
      
      // Mock authenticated state
      const { useAuth } = await import('../client/src/contexts/AuthContext');
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        login: mockLogin,
        logout: vi.fn(),
        register: vi.fn()
      });

      render(
        <TestWrapper>
          <OAuthCallbackPage />
        </TestWrapper>
      );

      // Component should handle the authentication flow
      expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive data in DOM', () => {
      mockLocation.search = '?token=sensitive-token-data';
      
      render(
        <TestWrapper>
          <OAuthCallbackPage />
        </TestWrapper>
      );

      // Ensure token is not visible in the DOM
      expect(screen.queryByText('sensitive-token-data')).not.toBeInTheDocument();
    });

    it('should clean URL parameters after processing', () => {
      mockLocation.search = '?token=test-token&state=test-state';
      
      const { useOAuthToken } = require('../client/src/hooks/useOAuthToken');
      
      const TestComponent = () => {
        useOAuthToken();
        return <div>Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        {},
        expect.any(String),
        expect.not.stringContaining('token=')
      );
    });

    it('should handle malformed URLs gracefully', () => {
      mockLocation.search = '?token=&error=&invalid=param';
      
      const { useOAuthToken } = require('../client/src/hooks/useOAuthToken');
      
      const TestComponent = () => {
        useOAuthToken();
        return <div>Test</div>;
      };

      expect(() => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });
});