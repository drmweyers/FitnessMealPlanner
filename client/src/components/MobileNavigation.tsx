import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { enforceTouchTargets } from '../utils/mobileTouchTargets';
import {
  Home,
  Search,
  Heart,
  User,
  Menu,
  X,
  ChefHat,
  Users,
  FileText,
  LogOut,
  ChevronRight,
  BarChart3,
  Utensils,
  Calendar,
  Target
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  customAction?: () => void;
}

const MobileNavigation: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Helper function to navigate with tab parameter
  const navigateToCustomerTab = (tab: string) => {
    const newUrl = `/customer${tab ? `?tab=${tab}` : ''}`;
    setLocation(newUrl);
  };

  // Define navigation items based on user role
  const getNavItems = (): NavItem[] => {
    if (!user) return [];

    const baseItems: NavItem[] = [
      { path: '/', label: 'Home', icon: Home },
      { path: '/recipes', label: 'Recipes', icon: ChefHat },
    ];

    switch (user.role) {
      case 'admin':
        return [
          { path: '/admin', label: 'Dashboard', icon: Home },
          { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        ];

      case 'trainer':
        return [
          ...baseItems,
          { path: '/trainer', label: 'Dashboard', icon: Home },
          { path: '/meal-plan-generator', label: 'Plans', icon: Utensils },
          { path: '/trainer/customers', label: 'Clients', icon: Users },
          { path: '/trainer/meal-plans', label: 'Saved', icon: Calendar },
          { path: '/favorites', label: 'Favorites', icon: Heart },
        ];

      case 'customer':
        return [
          ...baseItems,
          { path: '/customer', label: 'Dashboard', icon: Home },
          { path: '/customer', label: 'My Plans', icon: Calendar, customAction: () => navigateToCustomerTab('meal-plans') },
          { path: '/customer', label: 'Progress', icon: Target, customAction: () => navigateToCustomerTab('progress') },
          { path: '/favorites', label: 'Favorites', icon: Heart },
        ];

      default:
        return baseItems;
    }
  };

  const navItems = getNavItems();

  // Handle scroll detection for header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close side menu when location changes
  useEffect(() => {
    setIsSideMenuOpen(false);
  }, [location]);

  // Force mobile navigation visibility for logged-in users
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      // Add a class to body to indicate mobile navigation is active
      document.body.classList.add('mobile-nav-active');
      document.body.setAttribute('data-mobile-nav-enabled', 'true');

      // Apply forced styles to ensure visibility
      const style = document.createElement('style');
      style.id = 'mobile-nav-force-styles';
      style.innerHTML = `
        @media (max-width: 1023px) {
          .mobile-nav-active .mobile-nav,
          .mobile-nav-active [class*="mobile-nav"],
          .mobile-nav-active nav.mobile,
          .mobile-nav-active #mobile-bottom-navigation,
          .mobile-nav-active [data-testid="mobile-navigation"] {
            display: flex !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 50 !important;
            background: white !important;
            visibility: visible !important;
            opacity: 1 !important;
            border-top: 1px solid #e5e7eb !important;
            box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1) !important;
          }

          .mobile-nav-active .mobile-header,
          .mobile-nav-active [data-testid="mobile-header"] {
            display: flex !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 40 !important;
            background: white !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          .mobile-nav-active main {
            padding-bottom: 80px !important;
            margin-bottom: 72px !important;
            padding-top: 60px !important;
          }

          /* Force all nav items to be visible and touchable */
          .mobile-nav-active .mobile-nav-item,
          .mobile-nav-active [data-testid*="mobile-nav-"] {
            display: flex !important;
            min-height: 56px !important;
            min-width: 64px !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        }
      `;

      // Remove existing style if present
      const existingStyle = document.getElementById('mobile-nav-force-styles');
      if (existingStyle) {
        existingStyle.remove();
      }

      document.head.appendChild(style);

      // Ensure mobile navigation elements are visible with multiple passes
      const ensureVisibility = () => {
        const mobileNavElements = document.querySelectorAll(`
          .mobile-nav,
          [class*="mobile-nav"],
          [data-testid="mobile-navigation"],
          [data-testid="mobile-header"],
          #mobile-bottom-navigation
        `);

        mobileNavElements.forEach(element => {
          const htmlElement = element as HTMLElement;
          htmlElement.style.display = 'flex';
          htmlElement.style.visibility = 'visible';
          htmlElement.style.opacity = '1';
          htmlElement.setAttribute('data-mobile-nav-forced-visible', 'true');
        });

        // Enforce touch targets after mobile nav is rendered
        setTimeout(enforceTouchTargets, 100);
      };

      // Run visibility enforcement multiple times to ensure it works
      setTimeout(ensureVisibility, 50);
      setTimeout(ensureVisibility, 100);
      setTimeout(ensureVisibility, 200);
      setTimeout(ensureVisibility, 500);
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.body.classList.remove('mobile-nav-active');
        document.body.removeAttribute('data-mobile-nav-enabled');
        const style = document.getElementById('mobile-nav-force-styles');
        if (style) {
          style.remove();
        }
      }
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  // Don't show navigation on auth pages or when user is not logged in
  if (location === '/login' || location === '/register' || !user) {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <header
        className={`mobile-header lg:hidden fixed top-0 left-0 right-0 bg-white z-40 transition-shadow ${
          isScrolled ? 'shadow-md' : ''
        }`}
        data-testid="mobile-header"
        data-mobile-header="true"
        role="banner"
        aria-label="Mobile navigation header"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsSideMenuOpen(true)}
            className="p-2 -ml-2 touch-feedback touch-target hamburger menu-button"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Open navigation menu"
            data-testid="mobile-header-menu"
            data-mobile-menu-trigger="true"
          >
            <Menu className="w-6 h-6" />
          </button>

          <h1
            className="text-lg font-semibold text-gray-900"
            data-testid="mobile-header-title"
          >
            FitMeal Pro
          </h1>

          <button
            onClick={() => setLocation('/profile')}
            className="p-2 -mr-2 touch-feedback touch-target"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="View profile"
            data-testid="mobile-header-profile"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="lg:hidden h-14" />

      {/* Bottom Navigation Bar (Mobile Only) - Force Visibility */}
      <nav
        className="mobile-nav bottom-nav lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg"
        style={{
          display: 'flex !important',
          visibility: 'visible !important',
          opacity: '1 !important'
        }}
        data-testid="mobile-navigation"
        data-mobile-nav="true"
        data-mobile-nav-visible="true"
        data-mobile-bottom-nav="true"
        role="navigation"
        aria-label="Main mobile navigation"
        id="mobile-bottom-navigation"
      >
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          // For items with customAction, check active state based on current tab
          const isActive = item.customAction
            ? (location.includes('/customer') &&
               ((item.label === 'My Plans' && new URLSearchParams(window.location.search).get('tab') === 'meal-plans') ||
                (item.label === 'Progress' && new URLSearchParams(window.location.search).get('tab') === 'progress') ||
                (item.label === 'Dashboard' && !new URLSearchParams(window.location.search).get('tab'))))
            : location === item.path;

          return (
            <button
              key={`${item.path}-${item.label}`}
              onClick={() => item.customAction ? item.customAction() : setLocation(item.path)}
              className={`mobile-nav-item flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors ${
                isActive ? 'text-blue-600 bg-blue-50 active' : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{
                minHeight: '56px',
                minWidth: '64px',
                touchAction: 'manipulation'
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setIsSideMenuOpen(true)}
          className="mobile-nav-item flex flex-col items-center justify-center flex-1 py-2 px-1 text-gray-600 hover:text-gray-900 transition-colors hamburger menu-button"
          style={{
            minHeight: '56px',
            minWidth: '64px',
            touchAction: 'manipulation'
          }}
          aria-label="More options"
          data-testid="mobile-nav-more"
        >
          <Menu className="w-6 h-6" />
          <span className="text-xs mt-1 font-medium">More</span>
        </button>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="lg:hidden h-16" />

      {/* Side Menu Overlay */}
      {isSideMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={() => setIsSideMenuOpen(false)}
          data-testid="mobile-side-menu-overlay"
          aria-label="Close menu overlay"
        />
      )}

      {/* Side Menu */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85%] bg-white z-50 transform transition-transform lg:hidden ${
          isSideMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="mobile-side-menu"
        data-mobile-side-menu="true"
        data-mobile-side-menu-open={isSideMenuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        id="mobile-side-menu"
      >
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Menu</h2>
            <button
              onClick={() => setIsSideMenuOpen(false)}
              className="p-2 -mr-2 touch-feedback touch-target close-button"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Close navigation menu"
              data-testid="mobile-side-menu-close"
              data-mobile-menu-close="true"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{user.email}</p>
                  <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                // For items with customAction, check active state based on current tab
                const isActive = item.customAction
                  ? (location.includes('/customer') &&
                     ((item.label === 'My Plans' && new URLSearchParams(window.location.search).get('tab') === 'meal-plans') ||
                      (item.label === 'Progress' && new URLSearchParams(window.location.search).get('tab') === 'progress') ||
                      (item.label === 'Dashboard' && !new URLSearchParams(window.location.search).get('tab'))))
                  : location === item.path;

                return (
                  <button
                    key={`${item.path}-${item.label}`}
                    onClick={() => item.customAction ? item.customAction() : setLocation(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    style={{
                      minHeight: '48px',
                      touchAction: 'manipulation'
                    }}
                    data-testid={`side-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                );
              })}
            </nav>

            {/* Additional Options */}
            <div className="border-t mx-4 my-2" />

            <div className="p-4 space-y-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                style={{
                  minHeight: '48px',
                  touchAction: 'manipulation'
                }}
              >
                <div className="flex items-center space-x-3">
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </div>
              </button>
            </div>
          </div>

          {/* Menu Footer */}
          <div className="p-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              FitnessMealPlanner v2.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;