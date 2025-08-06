import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Router } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouter from '../../client/src/Router';

// Mock profile page components
vi.mock('../../client/src/pages/AdminProfile', () => ({
  default: () => <div data-testid="admin-profile">Admin Profile Page</div>,
}));

vi.mock('../../client/src/pages/TrainerProfile', () => ({
  default: () => <div data-testid="trainer-profile">Trainer Profile Page</div>,
}));

vi.mock('../../client/src/pages/CustomerProfile', () => ({
  default: () => <div data-testid="customer-profile">Customer Profile Page</div>,
}));

// Mock other page components
vi.mock('../../client/src/pages/Landing', () => ({
  default: () => <div data-testid="landing">Landing Page</div>,
}));

vi.mock('../../client/src/pages/Trainer', () => ({
  default: () => <div data-testid="trainer">Trainer Dashboard</div>,
}));

vi.mock('../../client/src/pages/Admin', () => ({
  default: () => <div data-testid="admin">Admin Dashboard</div>,
}));

vi.mock('../../client/src/pages/Customer', () => ({
  default: () => <div data-testid="customer">Customer Dashboard</div>,
}));

vi.mock('../../client/src/pages/NotFound', () => ({
  default: () => <div data-testid="not-found">Not Found</div>,
}));

vi.mock('../../client/src/pages/LoginPage', () => ({
  default: () => <div data-testid="login">Login Page</div>,
}));

// Mock Layout component
vi.mock('../../client/src/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock ProtectedRoute component
vi.mock('../../client/src/components/ProtectedRoute', () => ({
  default: ({ children, requiredRole }: { children: React.ReactNode; requiredRole: string }) => (
    <div data-testid={`protected-route-${requiredRole}`}>{children}</div>
  ),
}));

// Mock other components
vi.mock('../../client/src/components/FallbackUI', () => ({
  default: () => <div data-testid="fallback">Fallback UI</div>,
}));

vi.mock('../../client/src/components/OAuthCallback', () => ({
  OAuthCallback: () => <div data-testid="oauth-callback">OAuth Callback</div>,
}));

vi.mock('../../client/src/pages/OAuthCallbackPage', () => ({
  default: () => <div data-testid="oauth-callback-page">OAuth Callback Page</div>,
}));

// Mock hooks
vi.mock('../../client/src/hooks/useOAuthToken', () => ({
  useOAuthToken: () => ({}),
}));

// Mock all users for different role tests
const mockUsers = {
  admin: {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'admin' as const,
    profilePicture: null,
  },
  trainer: {
    id: 'trainer-1',
    email: 'trainer@example.com',
    role: 'trainer' as const,
    profilePicture: null,
  },
  customer: {
    id: 'customer-1',
    email: 'customer@example.com',
    role: 'customer' as const,
    profilePicture: null,
  },
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement, initialPath = '/profile') => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Router hook={() => [initialPath, () => {}]}>
        {component}
      </Router>
    </QueryClientProvider>
  );
};

describe('Profile Routing Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear URL parameters
    delete (window as any).location;
    (window as any).location = { search: '' };
  });

  describe('Shared /profile route', () => {
    it('should route admin user to AdminProfile component', () => {
      // Mock auth context for admin user
      vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: mockUsers.admin,
          isLoading: false,
          logout: vi.fn(),
        }),
      })));

      renderWithProviders(<AppRouter />, '/profile');
      
      expect(screen.getByTestId('admin-profile')).toBeInTheDocument();
      expect(screen.getByText('Admin Profile Page')).toBeInTheDocument();
    });

    it('should route trainer user to TrainerProfile component', () => {
      // Mock auth context for trainer user
      vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: mockUsers.trainer,
          isLoading: false,
          logout: vi.fn(),
        }),
      })));

      renderWithProviders(<AppRouter />, '/profile');
      
      expect(screen.getByTestId('trainer-profile')).toBeInTheDocument();
      expect(screen.getByText('Trainer Profile Page')).toBeInTheDocument();
    });

    it('should route customer user to CustomerProfile component', () => {
      // Mock auth context for customer user
      vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: mockUsers.customer,
          isLoading: false,
          logout: vi.fn(),
        }),
      })));

      renderWithProviders(<AppRouter />, '/profile');
      
      expect(screen.getByTestId('customer-profile')).toBeInTheDocument();
      expect(screen.getByText('Customer Profile Page')).toBeInTheDocument();
    });
  });

  describe('Role-specific profile routes', () => {
    it('should allow admin to access /admin/profile', () => {
      vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: mockUsers.admin,
          isLoading: false,
          logout: vi.fn(),
        }),
      })));

      renderWithProviders(<AppRouter />, '/admin/profile');
      
      expect(screen.getByTestId('admin-profile')).toBeInTheDocument();
    });

    it('should allow trainer to access /trainer/profile', () => {
      vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: mockUsers.trainer,
          isLoading: false,
          logout: vi.fn(),
        }),
      })));

      renderWithProviders(<AppRouter />, '/trainer/profile');
      
      expect(screen.getByTestId('trainer-profile')).toBeInTheDocument();
    });

    it('should allow customer to access /customer/profile', () => {
      vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: mockUsers.customer,
          isLoading: false,
          logout: vi.fn(),
        }),
      })));

      renderWithProviders(<AppRouter />, '/customer/profile');
      
      expect(screen.getByTestId('customer-profile')).toBeInTheDocument();
    });
  });

  describe('Profile component content differences', () => {
    it('should render different content for each role profile', () => {
      // Test that each profile component renders unique content
      
      // Admin profile
      vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: mockUsers.admin,
          isLoading: false,
          logout: vi.fn(),
        }),
      })));

      const { rerender } = renderWithProviders(<AppRouter />, '/profile');
      expect(screen.getByText('Admin Profile Page')).toBeInTheDocument();

      // Trainer profile  
      vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: mockUsers.trainer,
          isLoading: false,
          logout: vi.fn(),
        }),
      })));

      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <Router hook={() => ['/profile', () => {}]}>
            <AppRouter />
          </Router>
        </QueryClientProvider>
      );
      expect(screen.getByText('Trainer Profile Page')).toBeInTheDocument();

      // Customer profile
      vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
        useAuth: () => ({
          user: mockUsers.customer,
          isLoading: false,
          logout: vi.fn(),
        }),
      })));

      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <Router hook={() => ['/profile', () => {}]}>
            <AppRouter />
          </Router>
        </QueryClientProvider>
      );
      expect(screen.getByText('Customer Profile Page')).toBeInTheDocument();
    });
  });
});

describe('Profile Route Security Tests', () => {
  it('should prevent non-admin users from accessing /admin/profile', () => {
    vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: mockUsers.trainer, // Non-admin user
        isLoading: false,
        logout: vi.fn(),
      }),
    })));

    renderWithProviders(<AppRouter />, '/admin/profile');
    
    // Should redirect or show access denied, not the admin profile
    expect(screen.queryByTestId('admin-profile')).not.toBeInTheDocument();
  });

  it('should prevent non-trainer users from accessing /trainer/profile', () => {
    vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: mockUsers.customer, // Non-trainer user
        isLoading: false,
        logout: vi.fn(),
      }),
    })));

    renderWithProviders(<AppRouter />, '/trainer/profile');
    
    // Should redirect or show access denied, not the trainer profile
    expect(screen.queryByTestId('trainer-profile')).not.toBeInTheDocument();
  });

  it('should prevent non-customer users from accessing /customer/profile', () => {
    vi.mocked(vi.doMock('../../client/src/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: mockUsers.admin, // Non-customer user
        isLoading: false,
        logout: vi.fn(),
      }),
    })));

    renderWithProviders(<AppRouter />, '/customer/profile');
    
    // Should redirect or show access denied, not the customer profile
    expect(screen.queryByTestId('customer-profile')).not.toBeInTheDocument();
  });
});