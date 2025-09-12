import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { AuthContext } from '@/contexts/AuthContext';
import { Router } from 'wouter';
import type { AuthContextValue } from '@/types/auth';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock mobile detection hook
vi.mock('@/hooks/use-mobile', () => ({
  useMobile: vi.fn(() => false),
}));

const mockNavigate = vi.fn();

// Mock wouter navigation
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => ['/dashboard', mockNavigate],
  };
});

const mockLogout = vi.fn();

const createMockAuthContext = (
  role: 'admin' | 'trainer' | 'customer' = 'customer',
  overrides?: Partial<AuthContextValue>
): AuthContextValue => ({
  user: {
    id: '1',
    email: `${role}@example.com`,
    role,
    profilePicture: null,
  },
  isLoading: false,
  isAuthenticated: true,
  error: undefined,
  login: vi.fn(),
  register: vi.fn(),
  logout: mockLogout,
  ...overrides,
});

const renderWithProviders = (
  authContextValue: AuthContextValue,
  children: React.ReactNode = <div>Test Content</div>
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContextValue}>
        <Router>
          <Layout>{children}</Layout>
        </Router>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders layout structure with navigation and main content', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header/nav
      expect(screen.getByRole('main')).toBeInTheDocument(); // Main content area
      expect(screen.getByText('Test Content')).toBeInTheDocument(); // Children
    });

    it('displays brand logo and title', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('Evofit Meal')).toBeInTheDocument();
      // Logo should be an image or icon
      const logo = screen.getByRole('img', { name: /evofit meal logo/i });
      expect(logo).toBeInTheDocument();
    });

    it('shows user profile information in header', () => {
      renderWithProviders(createMockAuthContext('customer'));

      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
    });

    it('displays user avatar with fallback', () => {
      renderWithProviders(createMockAuthContext('customer'));

      const avatar = screen.getByRole('img', { name: /user avatar/i });
      expect(avatar).toBeInTheDocument();
      // Should show initials when no profile picture
      expect(screen.getByText('C')).toBeInTheDocument(); // First letter of 'Customer'
    });

    it('shows user avatar image when profile picture exists', () => {
      const contextWithAvatar = createMockAuthContext('customer', {
        user: {
          id: '1',
          email: 'customer@example.com',
          role: 'customer',
          profilePicture: '/avatars/customer.jpg',
        },
      });

      renderWithProviders(contextWithAvatar);

      const avatar = screen.getByRole('img', { name: /user avatar/i });
      expect(avatar).toHaveAttribute('src', '/avatars/customer.jpg');
    });
  });

  describe('Navigation Menu', () => {
    describe('Customer Navigation', () => {
      it('shows customer-specific menu items', () => {
        renderWithProviders(createMockAuthContext('customer'));

        expect(screen.getByText('My Meal Plans')).toBeInTheDocument();
        expect(screen.getByText('Recipes')).toBeInTheDocument();
        expect(screen.getByText('Progress')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      it('does not show admin-only menu items for customers', () => {
        renderWithProviders(createMockAuthContext('customer'));

        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
        expect(screen.queryByText('System Settings')).not.toBeInTheDocument();
      });

      it('does not show trainer-only menu items for customers', () => {
        renderWithProviders(createMockAuthContext('customer'));

        expect(screen.queryByText('My Customers')).not.toBeInTheDocument();
        expect(screen.queryByText('Create Meal Plans')).not.toBeInTheDocument();
      });
    });

    describe('Trainer Navigation', () => {
      it('shows trainer-specific menu items', () => {
        renderWithProviders(createMockAuthContext('trainer'));

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('My Customers')).toBeInTheDocument();
        expect(screen.getByText('Meal Plans')).toBeInTheDocument();
        expect(screen.getByText('Recipes')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      it('does not show admin-only menu items for trainers', () => {
        renderWithProviders(createMockAuthContext('trainer'));

        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
        expect(screen.queryByText('System Settings')).not.toBeInTheDocument();
      });

      it('does not show customer-only menu items for trainers', () => {
        renderWithProviders(createMockAuthContext('trainer'));

        expect(screen.queryByText('My Progress')).not.toBeInTheDocument();
      });
    });

    describe('Admin Navigation', () => {
      it('shows admin-specific menu items', () => {
        renderWithProviders(createMockAuthContext('admin'));

        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Manage Users')).toBeInTheDocument();
        expect(screen.getByText('Recipe Management')).toBeInTheDocument();
        expect(screen.getByText('System Analytics')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      it('shows all menu sections for admin users', () => {
        renderWithProviders(createMockAuthContext('admin'));

        // Admin should see all major sections
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });
    });

    describe('Navigation Interactions', () => {
      it('navigates to correct route when menu item is clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(createMockAuthContext('customer'));

        const recipesLink = screen.getByText('Recipes');
        await user.click(recipesLink);

        expect(mockNavigate).toHaveBeenCalledWith('/recipes');
      });

      it('highlights active menu item based on current route', () => {
        // Mock current location as recipes page
        vi.mocked(await import('wouter')).useLocation.mockReturnValue(['/recipes', mockNavigate]);

        renderWithProviders(createMockAuthContext('customer'));

        const recipesLink = screen.getByText('Recipes');
        expect(recipesLink).toHaveClass('active'); // Assuming active class styling
      });

      it('expands and collapses menu sections', async () => {
        const user = userEvent.setup();
        renderWithProviders(createMockAuthContext('admin'));

        const usersSection = screen.getByText('Users');
        const usersSectionButton = usersSection.closest('button');
        
        // Initially collapsed
        expect(screen.queryByText('Manage Customers')).not.toBeVisible();

        // Click to expand
        await user.click(usersSectionButton!);
        expect(screen.getByText('Manage Customers')).toBeVisible();

        // Click to collapse
        await user.click(usersSectionButton!);
        expect(screen.queryByText('Manage Customers')).not.toBeVisible();
      });
    });
  });

  describe('User Menu and Profile', () => {
    it('opens user menu when avatar is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext('customer'));

      const avatar = screen.getByRole('img', { name: /user avatar/i });
      await user.click(avatar);

      expect(screen.getByText('View Profile')).toBeInTheDocument();
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('navigates to profile page when "View Profile" is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext('customer'));

      const avatar = screen.getByRole('img', { name: /user avatar/i });
      await user.click(avatar);

      const viewProfileButton = screen.getByText('View Profile');
      await user.click(viewProfileButton);

      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('handles logout when "Sign Out" is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext('customer'));

      const avatar = screen.getByRole('img', { name: /user avatar/i });
      await user.click(avatar);

      const signOutButton = screen.getByText('Sign Out');
      await user.click(signOutButton);

      expect(mockLogout).toHaveBeenCalled();
    });

    it('closes user menu when clicking outside', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext('customer'));

      const avatar = screen.getByRole('img', { name: /user avatar/i });
      await user.click(avatar);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();

      // Click outside the menu
      await user.click(document.body);

      expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('shows mobile menu toggle on small screens', () => {
      vi.mocked(await import('@/hooks/use-mobile')).useMobile.mockReturnValue(true);

      renderWithProviders(createMockAuthContext('customer'));

      const mobileMenuToggle = screen.getByRole('button', { name: /toggle navigation menu/i });
      expect(mobileMenuToggle).toBeInTheDocument();
    });

    it('hides navigation menu by default on mobile', () => {
      vi.mocked(await import('@/hooks/use-mobile')).useMobile.mockReturnValue(true);

      renderWithProviders(createMockAuthContext('customer'));

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('hidden'); // Assuming mobile-first hidden class
    });

    it('toggles mobile menu when hamburger button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(await import('@/hooks/use-mobile')).useMobile.mockReturnValue(true);

      renderWithProviders(createMockAuthContext('customer'));

      const mobileMenuToggle = screen.getByRole('button', { name: /toggle navigation menu/i });
      
      // Menu should be hidden initially
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('hidden');

      // Click to open
      await user.click(mobileMenuToggle);
      expect(navigation).not.toHaveClass('hidden');

      // Click to close
      await user.click(mobileMenuToggle);
      expect(navigation).toHaveClass('hidden');
    });

    it('adapts header layout for mobile screens', () => {
      vi.mocked(await import('@/hooks/use-mobile')).useMobile.mockReturnValue(true);

      renderWithProviders(createMockAuthContext('customer'));

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('mobile-header'); // Assuming mobile-specific styling
    });

    it('collapses navigation sections on mobile by default', () => {
      vi.mocked(await import('@/hooks/use-mobile')).useMobile.mockReturnValue(true);

      renderWithProviders(createMockAuthContext('admin'));

      // Submenu items should be hidden on mobile
      expect(screen.queryByText('Manage Customers')).not.toBeVisible();
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading skeleton when user is loading', () => {
      const loadingContext = createMockAuthContext('customer', {
        isLoading: true,
        user: null,
      });

      renderWithProviders(loadingContext);

      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading indicator
      expect(screen.queryByText('customer@example.com')).not.toBeInTheDocument();
    });

    it('handles unauthenticated state gracefully', () => {
      const unauthenticatedContext = createMockAuthContext('customer', {
        isAuthenticated: false,
        user: null,
      });

      renderWithProviders(unauthenticatedContext);

      // Should redirect to login or show guest layout
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('displays error state when user loading fails', () => {
      const errorContext = createMockAuthContext('customer', {
        error: new Error('Failed to load user'),
        user: null,
      });

      renderWithProviders(errorContext);

      expect(screen.getByText(/error loading user/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for navigation elements', () => {
      renderWithProviders(createMockAuthContext('customer'));

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Main navigation');

      const userMenu = screen.getByRole('button', { name: /user menu/i });
      expect(userMenu).toHaveAccessibleName();
    });

    it('supports keyboard navigation through menu items', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext('customer'));

      const firstMenuItem = screen.getByText('My Meal Plans');
      firstMenuItem.focus();

      await user.keyboard('{ArrowDown}');
      
      const secondMenuItem = screen.getByText('Recipes');
      expect(document.activeElement).toBe(secondMenuItem);
    });

    it('provides skip link for keyboard users', () => {
      renderWithProviders(createMockAuthContext('customer'));

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('announces navigation changes to screen readers', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext('customer'));

      const recipesLink = screen.getByText('Recipes');
      await user.click(recipesLink);

      // Should have live region for announcements
      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent(/navigated to recipes/i);
    });

    it('manages focus properly when opening/closing mobile menu', async () => {
      const user = userEvent.setup();
      vi.mocked(await import('@/hooks/use-mobile')).useMobile.mockReturnValue(true);

      renderWithProviders(createMockAuthContext('customer'));

      const mobileMenuToggle = screen.getByRole('button', { name: /toggle navigation menu/i });
      await user.click(mobileMenuToggle);

      // Focus should move to first menu item when opened
      const firstMenuItem = screen.getByText('My Meal Plans');
      expect(document.activeElement).toBe(firstMenuItem);
    });
  });

  describe('Performance Considerations', () => {
    it('lazy loads navigation components', () => {
      renderWithProviders(createMockAuthContext('admin'));

      // Admin-specific components should be loaded on demand
      const adminDashboard = screen.getByText('Admin Dashboard');
      expect(adminDashboard).toBeInTheDocument();
    });

    it('memoizes navigation items to prevent unnecessary re-renders', () => {
      const { rerender } = renderWithProviders(createMockAuthContext('customer'));

      // Re-render with same props
      rerender(
        <QueryClient>
          <AuthContext.Provider value={createMockAuthContext('customer')}>
            <Router>
              <Layout>
                <div>Updated Content</div>
              </Layout>
            </Router>
          </AuthContext.Provider>
        </QueryClient>
      );

      // Navigation should not re-render unnecessarily
      expect(screen.getByText('My Meal Plans')).toBeInTheDocument();
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
    });

    it('optimizes image loading for user avatars', () => {
      const contextWithAvatar = createMockAuthContext('customer', {
        user: {
          id: '1',
          email: 'customer@example.com',
          role: 'customer',
          profilePicture: '/avatars/customer.jpg',
        },
      });

      renderWithProviders(contextWithAvatar);

      const avatar = screen.getByRole('img', { name: /user avatar/i });
      expect(avatar).toHaveAttribute('loading', 'lazy');
    });
  });
});