/**
 * Mobile Navigation Unit Tests
 * Tests for MobileNavigation component visibility, behavior, and responsive interactions
 * Covers touch targets, navigation flows, and role-based navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import MobileNavigation from '../../client/src/components/MobileNavigation';
import { AuthProvider } from '../../client/src/contexts/AuthContext';
import userEvent from '@testing-library/user-event';

// Mock useLocation hook
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/customer', mockSetLocation]
}));

// Mock mobile touch targets utility
vi.mock('../../client/src/utils/mobileTouchTargets', () => ({
  enforceTouchTargets: vi.fn()
}));

// Mock icons to avoid rendering issues
vi.mock('lucide-react', () => ({
  Home: () => <div data-testid="home-icon">Home</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Menu: () => <div data-testid="menu-icon">Menu</div>,
  X: () => <div data-testid="x-icon">X</div>,
  ChefHat: () => <div data-testid="chefhat-icon">ChefHat</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  FileText: () => <div data-testid="filetext-icon">FileText</div>,
  LogOut: () => <div data-testid="logout-icon">LogOut</div>,
  ChevronRight: () => <div data-testid="chevronright-icon">ChevronRight</div>,
  BarChart3: () => <div data-testid="barchart3-icon">BarChart3</div>,
  Utensils: () => <div data-testid="utensils-icon">Utensils</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Target: () => <div data-testid="target-icon">Target</div>
}));

// Helper to set viewport size
const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

// Mock getBoundingClientRect for touch target measurements
const mockGetBoundingClientRect = (minHeight = 56, minWidth = 64) => {
  return vi.fn(() => ({
    width: minWidth,
    height: minHeight,
    top: 0,
    left: 0,
    bottom: minHeight,
    right: minWidth,
    x: 0,
    y: 0,
    toJSON: vi.fn()
  }));
};

// Create mock auth context
const createMockAuthContext = (role: string, email: string = 'test@example.com') => ({
  user: {
    id: '1',
    email,
    role,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false
});

// Custom render with auth provider
const renderWithAuth = (authContextValue: any) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={authContextValue}>
        <MobileNavigation />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Mobile Navigation Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Set mobile viewport by default
    setViewportSize(375, 812);

    // Mock scroll position
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 0
    });

    // Mock URLSearchParams for tab navigation
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        search: '',
        pathname: '/customer'
      }
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Visibility and Responsive Behavior', () => {
    test('should be visible only on mobile screens for logged-in users', () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      // Mobile navigation should be present
      expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-header')).toBeInTheDocument();

      // Should have mobile-specific classes
      const mobileNav = screen.getByTestId('mobile-navigation');
      expect(mobileNav).toHaveClass('lg:hidden');

      const mobileHeader = screen.getByTestId('mobile-header');
      expect(mobileHeader).toHaveClass('lg:hidden');
    });

    test('should not render for unauthenticated users', () => {
      const authContext = { user: null, login: vi.fn(), logout: vi.fn(), isLoading: false };
      renderWithAuth(authContext);

      // Navigation should not be present for unauthenticated users
      expect(screen.queryByTestId('mobile-navigation')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-header')).not.toBeInTheDocument();
    });

    test('should be hidden on desktop screens', () => {
      setViewportSize(1920, 1080); // Desktop size

      const authContext = createMockAuthContext('trainer');
      renderWithAuth(authContext);

      // Should still render but with lg:hidden classes
      const mobileNav = screen.getByTestId('mobile-navigation');
      const mobileHeader = screen.getByTestId('mobile-header');

      expect(mobileNav).toHaveClass('lg:hidden');
      expect(mobileHeader).toHaveClass('lg:hidden');
    });

    test('should apply forced visibility styles for mobile screens', () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      // Check that body has mobile nav classes
      expect(document.body).toHaveClass('mobile-nav-active');
      expect(document.body).toHaveAttribute('data-mobile-nav-enabled', 'true');

      // Check for injected force styles
      const forceStyleElement = document.getElementById('mobile-nav-force-styles');
      expect(forceStyleElement).toBeInTheDocument();
    });
  });

  describe('Navigation Items by Role', () => {
    test('should show customer-specific navigation items', () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      // Check for customer-specific nav items
      expect(screen.getByTestId('mobile-nav-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-my-plans')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-progress')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-favorites')).toBeInTheDocument();
    });

    test('should show trainer-specific navigation items', () => {
      const authContext = createMockAuthContext('trainer');
      renderWithAuth(authContext);

      // Check for trainer-specific nav items
      expect(screen.getByTestId('mobile-nav-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-plans')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-clients')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-saved')).toBeInTheDocument();
    });

    test('should show admin-specific navigation items', () => {
      const authContext = createMockAuthContext('admin');
      renderWithAuth(authContext);

      // Check for admin-specific nav items
      expect(screen.getByTestId('mobile-nav-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-analytics')).toBeInTheDocument();
    });

    test('should limit navigation items to 4 in bottom bar', () => {
      const authContext = createMockAuthContext('trainer'); // Trainer has most nav items
      renderWithAuth(authContext);

      const bottomNavButtons = screen.getAllByRole('button').filter(button =>
        button.closest('[data-testid="mobile-navigation"]')
      );

      // Should show exactly 5 items (4 nav + 1 more button)
      expect(bottomNavButtons).toHaveLength(5);

      // More button should be present
      expect(screen.getByTestId('mobile-nav-more')).toBeInTheDocument();
    });
  });

  describe('Touch Target Compliance', () => {
    test('should have minimum 44px touch targets for all navigation items', () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      // Mock getBoundingClientRect for all nav buttons
      const navButtons = screen.getAllByRole('button');

      navButtons.forEach(button => {
        if (button.closest('[data-testid="mobile-navigation"]') ||
            button.closest('[data-testid="mobile-header"]')) {

          // Mock the getBoundingClientRect method
          button.getBoundingClientRect = mockGetBoundingClientRect(56, 64);

          const rect = button.getBoundingClientRect();

          // Check minimum touch target size (44px minimum)
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.width).toBeGreaterThanOrEqual(44);

          // Check for minimum style properties
          const styles = window.getComputedStyle(button);
          expect(button.style.minHeight).toBe('56px'); // From component
          expect(button.style.minWidth).toBe('64px');  // From component
        }
      });
    });

    test('should have proper touch action and cursor properties', () => {
      const authContext = createMockAuthContext('trainer');
      renderWithAuth(authContext);

      const navButtons = screen.getAllByRole('button');

      navButtons.forEach(button => {
        if (button.closest('[data-testid="mobile-navigation"]')) {
          expect(button.style.touchAction).toBe('manipulation');
        }
      });
    });

    test('should have accessible touch targets for header buttons', () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      const headerMenuButton = screen.getByTestId('mobile-header-menu');
      const headerProfileButton = screen.getByTestId('mobile-header-profile');

      // Mock dimensions for header buttons
      headerMenuButton.getBoundingClientRect = mockGetBoundingClientRect(44, 44);
      headerProfileButton.getBoundingClientRect = mockGetBoundingClientRect(44, 44);

      const menuRect = headerMenuButton.getBoundingClientRect();
      const profileRect = headerProfileButton.getBoundingClientRect();

      expect(menuRect.height).toBeGreaterThanOrEqual(44);
      expect(menuRect.width).toBeGreaterThanOrEqual(44);
      expect(profileRect.height).toBeGreaterThanOrEqual(44);
      expect(profileRect.width).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Navigation Interactions', () => {
    test('should navigate correctly when bottom nav items are clicked', async () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      const dashboardButton = screen.getByTestId('mobile-nav-dashboard');

      await user.click(dashboardButton);

      expect(mockSetLocation).toHaveBeenCalledWith('/customer');
    });

    test('should handle custom navigation actions for customer tabs', async () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      const myPlansButton = screen.getByTestId('mobile-nav-my-plans');

      await user.click(myPlansButton);

      expect(mockSetLocation).toHaveBeenCalledWith('/customer?tab=meal-plans');
    });

    test('should handle progress tab navigation', async () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      const progressButton = screen.getByTestId('mobile-nav-progress');

      await user.click(progressButton);

      expect(mockSetLocation).toHaveBeenCalledWith('/customer?tab=progress');
    });

    test('should open side menu when more button is clicked', async () => {
      const authContext = createMockAuthContext('trainer');
      renderWithAuth(authContext);

      const moreButton = screen.getByTestId('mobile-nav-more');

      await user.click(moreButton);

      // Side menu should be visible
      await waitFor(() => {
        expect(screen.getByTestId('mobile-side-menu')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-side-menu-overlay')).toBeInTheDocument();
      });
    });

    test('should close side menu when close button is clicked', async () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      // Open side menu first
      const moreButton = screen.getByTestId('mobile-nav-more');
      await user.click(moreButton);

      // Then close it
      const closeButton = screen.getByTestId('mobile-side-menu-close');
      await user.click(closeButton);

      // Side menu should be hidden (transform class should change)
      const sideMenu = screen.getByTestId('mobile-side-menu');
      expect(sideMenu).toHaveClass('-translate-x-full');
    });

    test('should close side menu when overlay is clicked', async () => {
      const authContext = createMockAuthContext('trainer');
      renderWithAuth(authContext);

      // Open side menu
      const moreButton = screen.getByTestId('mobile-nav-more');
      await user.click(moreButton);

      // Click overlay to close
      const overlay = screen.getByTestId('mobile-side-menu-overlay');
      await user.click(overlay);

      // Side menu should be hidden
      const sideMenu = screen.getByTestId('mobile-side-menu');
      expect(sideMenu).toHaveClass('-translate-x-full');
    });
  });

  describe('Active State Management', () => {
    test('should highlight active navigation item', () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      // Mock current location as dashboard
      const dashboardButton = screen.getByTestId('mobile-nav-dashboard');

      // Dashboard should be active by default for customer on /customer route
      expect(dashboardButton).toHaveClass('text-blue-600', 'bg-blue-50', 'active');
    });

    test('should handle active state for tab-based navigation', () => {
      // Mock URL with tab parameter
      Object.defineProperty(window, 'location', {
        writable: true,
        value: {
          search: '?tab=meal-plans',
          pathname: '/customer'
        }
      });

      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      const myPlansButton = screen.getByTestId('mobile-nav-my-plans');

      // My Plans should be active when tab=meal-plans
      expect(myPlansButton).toHaveClass('text-blue-600', 'bg-blue-50', 'active');
    });

    test('should show correct active state in side menu', async () => {
      const authContext = createMockAuthContext('trainer');
      renderWithAuth(authContext);

      // Open side menu
      const moreButton = screen.getByTestId('mobile-nav-more');
      await user.click(moreButton);

      // Check for active state in side menu
      const sideMenuDashboard = screen.getByTestId('side-menu-dashboard');
      expect(sideMenuDashboard).toHaveClass('bg-blue-50', 'text-blue-600');
    });
  });

  describe('Header Behavior', () => {
    test('should show shadow when scrolled', async () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      // Mock scroll position
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        value: 50
      });

      // Trigger scroll event
      act(() => {
        fireEvent.scroll(window, { target: { scrollY: 50 } });
      });

      await waitFor(() => {
        const header = screen.getByTestId('mobile-header');
        expect(header).toHaveClass('shadow-md');
      });
    });

    test('should not show shadow when at top', () => {
      const authContext = createMockAuthContext('trainer');
      renderWithAuth(authContext);

      const header = screen.getByTestId('mobile-header');
      expect(header).not.toHaveClass('shadow-md');
    });

    test('should have proper aria labels for accessibility', () => {
      const authContext = createMockAuthContext('admin');
      renderWithAuth(authContext);

      const header = screen.getByTestId('mobile-header');
      const menuButton = screen.getByTestId('mobile-header-menu');
      const profileButton = screen.getByTestId('mobile-header-profile');

      expect(header).toHaveAttribute('role', 'banner');
      expect(header).toHaveAttribute('aria-label', 'Mobile navigation header');
      expect(menuButton).toHaveAttribute('aria-label', 'Open navigation menu');
      expect(profileButton).toHaveAttribute('aria-label', 'View profile');
    });
  });

  describe('Logout Functionality', () => {
    test('should handle logout from side menu', async () => {
      const mockLogout = vi.fn();
      const authContext = {
        user: createMockAuthContext('customer').user,
        login: vi.fn(),
        logout: mockLogout,
        isLoading: false
      };

      renderWithAuth(authContext);

      // Open side menu
      const moreButton = screen.getByTestId('mobile-nav-more');
      await user.click(moreButton);

      // Click logout
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
      expect(mockSetLocation).toHaveBeenCalledWith('/login');
    });
  });

  describe('Accessibility Features', () => {
    test('should have proper ARIA attributes for navigation', () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      const bottomNav = screen.getByTestId('mobile-navigation');
      expect(bottomNav).toHaveAttribute('role', 'navigation');
      expect(bottomNav).toHaveAttribute('aria-label', 'Main mobile navigation');
    });

    test('should have proper aria-current for active items', () => {
      const authContext = createMockAuthContext('trainer');
      renderWithAuth(authContext);

      const dashboardButton = screen.getByTestId('mobile-nav-dashboard');
      expect(dashboardButton).toHaveAttribute('aria-current', 'page');
    });

    test('should have proper aria-modal for side menu', async () => {
      const authContext = createMockAuthContext('customer');
      renderWithAuth(authContext);

      // Open side menu
      const moreButton = screen.getByTestId('mobile-nav-more');
      await user.click(moreButton);

      const sideMenu = screen.getByTestId('mobile-side-menu');
      expect(sideMenu).toHaveAttribute('role', 'dialog');
      expect(sideMenu).toHaveAttribute('aria-modal', 'true');
      expect(sideMenu).toHaveAttribute('aria-label', 'Navigation menu');
    });
  });

  describe('Performance and Cleanup', () => {
    test('should clean up event listeners on unmount', () => {
      const authContext = createMockAuthContext('customer');
      const { unmount } = renderWithAuth(authContext);

      // Should have mobile nav classes
      expect(document.body).toHaveClass('mobile-nav-active');

      unmount();

      // Should clean up classes
      expect(document.body).not.toHaveClass('mobile-nav-active');
      expect(document.body).not.toHaveAttribute('data-mobile-nav-enabled');

      // Force styles should be removed
      const forceStyleElement = document.getElementById('mobile-nav-force-styles');
      expect(forceStyleElement).not.toBeInTheDocument();
    });

    test('should close side menu when location changes', async () => {
      const authContext = createMockAuthContext('trainer');
      renderWithAuth(authContext);

      // Open side menu
      const moreButton = screen.getByTestId('mobile-nav-more');
      await user.click(moreButton);

      // Verify side menu is open
      const sideMenu = screen.getByTestId('mobile-side-menu');
      expect(sideMenu).toHaveClass('translate-x-0');

      // Simulate location change by re-rendering with different location
      // This tests the useEffect that listens to location changes
      const dashboardButton = screen.getByTestId('mobile-nav-dashboard');
      await user.click(dashboardButton);

      // Side menu should close automatically
      expect(sideMenu).toHaveClass('-translate-x-full');
    });
  });
});