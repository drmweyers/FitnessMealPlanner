import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  Home, 
  User, 
  LogOut, 
  Menu,
  ChevronDown,
  Bell,
  Utensils,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const navigation = [
    // Customer navigation
    ...(user?.role === 'customer' 
      ? [{ name: 'My Meal Plans', href: '/my-meal-plans', icon: User }] 
      : []),
    
    // Trainer navigation
    ...(user?.role === 'trainer'
      ? [
          { name: 'Trainer Dashboard', href: '/trainer', icon: Home },
          { name: 'Meal Plan Generator', href: '/meal-plan-generator', icon: Utensils }
        ]
      : []),
    
    // Admin navigation
    ...(user?.role === 'admin' 
      ? [{ name: 'Admin', href: '/admin', icon: User }] 
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex-shrink-0">
                <h1 className="text-lg sm:text-xl font-bold text-primary truncate">
                  Evofit Meal
                </h1>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:ml-6 xl:ml-8 lg:flex lg:space-x-4 xl:space-x-8">
                {navigation.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation(item.href);
                      }}
                      className={cn(
                        "inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap",
                        isActive
                          ? "border-primary text-gray-900"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      )}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      <span className="hidden xl:inline">{item.name}</span>
                      <span className="xl:hidden">{item.name.split(' ')[0]}</span>
                    </a>
                  );
                })}
              </nav>
            </div>

            {/* Right side items */}
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              {/* Notifications - Hidden on small screens */}
              <button className="hidden sm:block p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 transition-colors duration-200">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2">
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                        {user?.email ? getInitials(user.email) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 sm:w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium truncate">{user?.email}</span>
                      <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <div className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white shadow-lg">
            <div className="space-y-1 px-3 py-3 sm:px-4">
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </a>
                );
              })}
              
              {/* Mobile-only notifications */}
              <div className="sm:hidden pt-2 border-t border-gray-200 mt-2">
                <a
                  href="#notifications"
                  className="flex items-center px-3 py-3 text-base font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                >
                  <Bell className="w-5 h-5 mr-3" />
                  Notifications
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
              © {new Date().getFullYear()} EvoFitMeals. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-end space-x-4 sm:space-x-6">
              <a href="/privacy" className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Terms of Service
              </a>
              <a href="/contact" className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 