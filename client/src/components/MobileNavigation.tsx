import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
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
  Settings,
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
}

const MobileNavigation: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
          { path: '/customer?tab=meal-plans', label: 'My Plans', icon: Calendar },
          { path: '/customer?tab=progress', label: 'Progress', icon: Target },
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

  const handleLogout = async () => {
    await logout();
    setLocation('/login');
  };

  // Don't show navigation on auth pages
  if (location === '/login' || location === '/register') {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <header className={`lg:hidden fixed top-0 left-0 right-0 bg-white z-40 transition-shadow ${
        isScrolled ? 'shadow-md' : ''
      }`}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsSideMenuOpen(true)}
            className="p-2 -ml-2 touch-feedback touch-target"
            aria-label="Open menu"
            data-testid="mobile-header-menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">
            FitMeal Pro
          </h1>
          
          <button
            onClick={() => setLocation('/profile')}
            className="p-2 -mr-2 touch-feedback touch-target"
            aria-label="Profile"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="lg:hidden h-14" />

      {/* Bottom Navigation Bar (Mobile Only) */}
      <nav className="mobile-nav lg:hidden">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
        
        <button
          onClick={() => setIsSideMenuOpen(true)}
          className="mobile-nav-item"
          aria-label="More options"
          data-testid="mobile-nav-more"
        >
          <Menu className="w-6 h-6" />
          <span className="text-xs mt-1">More</span>
        </button>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="lg:hidden h-16" />

      {/* Side Menu Overlay */}
      {isSideMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={() => setIsSideMenuOpen(false)}
        />
      )}

      {/* Side Menu */}
      <div className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85%] bg-white z-50 transform transition-transform lg:hidden ${
        isSideMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Menu</h2>
            <button
              onClick={() => setIsSideMenuOpen(false)}
              className="p-2 -mr-2 touch-feedback touch-target"
              aria-label="Close menu"
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
                const isActive = location === item.path;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
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
                onClick={() => setLocation('/settings')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
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