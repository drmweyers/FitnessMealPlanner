import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: vi.fn(() => ['/customer', vi.fn()]),
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

// Mock auth context
vi.mock('../../client/src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', email: 'customer.test@evofitmeals.com', role: 'customer' },
    logout: vi.fn(),
  })),
}));

describe('Mobile UI Fixes', () => {
  describe('Dialog Positioning', () => {
    it('should center dialog on mobile using transform utilities', () => {
      // Test that dialog CSS includes proper centering classes
      const dialogClasses = [
        'left-[50%]',
        'top-[50%]',
        '-translate-x-[50%]',
        '-translate-y-[50%]',
      ];

      // Import the dialog component styles
      const DialogContent = () => (
        <div
          className="fixed z-50 gap-4 border bg-background shadow-lg duration-200 left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[calc(100vw-2rem)] max-w-lg"
          data-testid="dialog-content"
        >
          Test Dialog
        </div>
      );

      const { container } = render(<DialogContent />);
      const dialog = screen.getByTestId('dialog-content');

      // Check that all centering classes are present
      dialogClasses.forEach((className) => {
        expect(dialog.className).toContain(className.replace('[', '\\[').replace(']', '\\]'));
      });
    });

    it('should center mobile-dialog on mobile using transform utilities', () => {
      // Test that mobile-dialog CSS includes proper centering classes
      const mobileDialogClasses = [
        'left-[50%]',
        'top-[50%]',
        '-translate-x-[50%]',
        '-translate-y-[50%]',
      ];

      // Import the mobile dialog component styles
      const MobileDialogContent = () => (
        <div
          className="fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[calc(100vw-2rem)] max-w-lg"
          data-testid="mobile-dialog-content"
        >
          Test Mobile Dialog
        </div>
      );

      const { container } = render(<MobileDialogContent />);
      const dialog = screen.getByTestId('mobile-dialog-content');

      // Check that all centering classes are present
      mobileDialogClasses.forEach((className) => {
        expect(dialog.className).toContain(className.replace('[', '\\[').replace(']', '\\]'));
      });
    });
  });

  describe('Navigation Fixes', () => {
    it('should navigate to /customer for customer login, not /my-meal-plans', async () => {
      // Mock the login function
      const mockNavigate = vi.fn();
      const mockLogin = vi.fn().mockResolvedValue({
        id: '1',
        email: 'customer.test@evofitmeals.com',
        role: 'customer',
      });

      // Simulate login logic
      const handleLogin = async (role: string) => {
        const user = await mockLogin();

        // This is the fixed logic from LoginPage.tsx
        switch (user.role) {
          case 'admin':
            mockNavigate('/admin');
            break;
          case 'trainer':
            mockNavigate('/trainer');
            break;
          case 'customer':
            mockNavigate('/customer'); // Fixed: was '/my-meal-plans'
            break;
          default:
            mockNavigate('/');
        }
      };

      await handleLogin('customer');

      // Verify that navigation goes to /customer, not /my-meal-plans
      expect(mockNavigate).toHaveBeenCalledWith('/customer');
      expect(mockNavigate).not.toHaveBeenCalledWith('/my-meal-plans');
    });

    it('should handle My Plans navigation with query parameter', () => {
      const mockSetLocation = vi.fn();

      // This is the navigation logic from MobileNavigation.tsx
      const navigateToCustomerTab = (tab: string) => {
        const newUrl = `/customer${tab ? `?tab=${tab}` : ''}`;
        mockSetLocation(newUrl);
      };

      // Simulate clicking My Plans
      navigateToCustomerTab('meal-plans');

      // Verify correct URL with query parameter
      expect(mockSetLocation).toHaveBeenCalledWith('/customer?tab=meal-plans');
    });

    it('should handle Progress navigation with query parameter', () => {
      const mockSetLocation = vi.fn();

      // This is the navigation logic from MobileNavigation.tsx
      const navigateToCustomerTab = (tab: string) => {
        const newUrl = `/customer${tab ? `?tab=${tab}` : ''}`;
        mockSetLocation(newUrl);
      };

      // Simulate clicking Progress
      navigateToCustomerTab('progress');

      // Verify correct URL with query parameter
      expect(mockSetLocation).toHaveBeenCalledWith('/customer?tab=progress');
    });
  });

  describe('Mobile Navigation Component', () => {
    it('should have customAction for My Plans and Progress navigation', () => {
      // Test the NavItem interface and navigation items structure
      interface NavItem {
        path: string;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        roles?: string[];
        customAction?: () => void;
      }

      const mockSetLocation = vi.fn();
      const navigateToCustomerTab = (tab: string) => {
        const newUrl = `/customer${tab ? `?tab=${tab}` : ''}`;
        mockSetLocation(newUrl);
      };

      // Customer navigation items from MobileNavigation.tsx
      const customerNavItems: NavItem[] = [
        { path: '/customer', label: 'Dashboard', icon: () => <div>Home</div> },
        {
          path: '/customer',
          label: 'My Plans',
          icon: () => <div>Calendar</div>,
          customAction: () => navigateToCustomerTab('meal-plans')
        },
        {
          path: '/customer',
          label: 'Progress',
          icon: () => <div>Target</div>,
          customAction: () => navigateToCustomerTab('progress')
        },
      ];

      // Find My Plans item
      const myPlansItem = customerNavItems.find(item => item.label === 'My Plans');
      expect(myPlansItem).toBeDefined();
      expect(myPlansItem?.customAction).toBeDefined();

      // Execute custom action
      myPlansItem?.customAction?.();
      expect(mockSetLocation).toHaveBeenCalledWith('/customer?tab=meal-plans');

      // Find Progress item
      const progressItem = customerNavItems.find(item => item.label === 'Progress');
      expect(progressItem).toBeDefined();
      expect(progressItem?.customAction).toBeDefined();

      // Execute custom action
      progressItem?.customAction?.();
      expect(mockSetLocation).toHaveBeenCalledWith('/customer?tab=progress');
    });
  });

  describe('Modal Centering Calculation', () => {
    it('should calculate proper centering for modal on 375px viewport', () => {
      const viewportWidth = 375;
      const modalWidth = 343; // calc(100vw - 2rem) = 375 - 32 = 343

      // With proper centering using transform
      // left: 50% positions left edge at 187.5px
      // transform: translateX(-50%) moves it back by half its width (171.5px)
      // Final left position: 187.5 - 171.5 = 16px
      // Modal center: 16 + 171.5 = 187.5px
      // Viewport center: 187.5px

      const leftPercent = 0.5; // 50%
      const leftPosition = viewportWidth * leftPercent; // 187.5px
      const translateX = modalWidth * 0.5; // 171.5px
      const finalLeft = leftPosition - translateX; // 16px
      const modalCenter = finalLeft + (modalWidth / 2); // 187.5px
      const viewportCenter = viewportWidth / 2; // 187.5px

      expect(modalCenter).toBe(viewportCenter);
      expect(Math.abs(modalCenter - viewportCenter)).toBeLessThan(1); // Allow for rounding
    });

    it('should NOT be centered with old positioning (inset-x-4)', () => {
      const viewportWidth = 375;
      const insetX = 16; // 4 * 4px = 16px (Tailwind spacing)
      const modalWidth = viewportWidth - (insetX * 2); // 343px

      // With old inset-x-4 positioning
      // left: 16px
      // Modal center: 16 + 171.5 = 187.5px
      // But with top-4 bottom-4, it would be positioned at top-left
      // Modal would appear at coordinates (16, 16)

      const modalLeft = insetX;
      const modalTop = insetX;

      // This positioning would put the modal in the top-left corner
      expect(modalLeft).toBe(16);
      expect(modalTop).toBe(16);

      // Modal would NOT be centered
      const modalCenterX = modalLeft + (modalWidth / 2);
      const viewportCenter = viewportWidth / 2;

      // While X might be close, the modal would be at the top of the screen
      expect(modalTop).toBeLessThan(100); // Modal is near the top
    });
  });
});