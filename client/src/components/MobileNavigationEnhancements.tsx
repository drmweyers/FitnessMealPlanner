import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Menu, 
  Home, 
  ChefHat, 
  Calendar, 
  ShoppingCart, 
  User, 
  Settings,
  Heart,
  BarChart3,
  Bell,
  LogOut,
  X,
  ChevronDown,
  Search,
  Plus,
  Star,
  Clock,
  Target,
  Users,
  TrendingUp,
  BookOpen,
  Award
} from 'lucide-react';
import { cn } from '../lib/utils';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string | number;
  color?: string;
  description?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  color: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'trainer' | 'customer';
  avatar?: string;
}

interface MobileNavigationEnhancementsProps {
  user: User;
  navigationItems: NavigationItem[];
  quickActions?: QuickAction[];
  showNotificationBadge?: boolean;
  notificationCount?: number;
  onLogout: () => void;
  onSearch?: (query: string) => void;
  className?: string;
}

const MobileNavigationEnhancements: React.FC<MobileNavigationEnhancementsProps> = ({
  user,
  navigationItems,
  quickActions = [],
  showNotificationBadge = false,
  notificationCount = 0,
  onLogout,
  onSearch,
  className = ''
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  }, [onSearch, searchQuery]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'trainer':
        return 'bg-blue-100 text-blue-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const defaultQuickActions: QuickAction[] = [
    {
      id: 'add-recipe',
      label: 'Add Recipe',
      icon: Plus,
      action: () => {/* Handle add recipe */},
      color: 'bg-green-500 text-white'
    },
    {
      id: 'meal-plan',
      label: 'Create Plan',
      icon: Calendar,
      action: () => {/* Handle create meal plan */},
      color: 'bg-blue-500 text-white'
    },
    {
      id: 'quick-search',
      label: 'Search',
      icon: Search,
      action: () => setIsSearchOpen(true),
      color: 'bg-purple-500 text-white'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Heart,
      action: () => {/* Handle favorites */},
      color: 'bg-pink-500 text-white'
    }
  ];

  const allQuickActions = quickActions.length > 0 ? quickActions : defaultQuickActions;

  const getCurrentPageTitle = () => {
    const currentItem = navigationItems.find(item => item.href === location);
    return currentItem?.label || 'FitnessMealPlanner';
  };

  return (
    <div className={cn('bg-background border-b sticky top-0 z-50', className)}>
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between p-4">
        {/* Left: Menu Button */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden touch-target">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <SheetTitle className="text-base">{user.name}</SheetTitle>
                      <SheetDescription className="text-sm">
                        <Badge className={cn('text-xs', getRoleColor(user.role))}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </SheetDescription>
                    </div>
                  </div>
                  {showNotificationBadge && notificationCount > 0 && (
                    <div className="relative">
                      <Bell className="h-5 w-5" />
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                      >
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </Badge>
                    </div>
                  )}
                </div>
              </SheetHeader>

              {/* Quick Actions */}
              <div className="p-4 border-b">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {allQuickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          action.action();
                          setIsMenuOpen(false);
                        }}
                        className={cn(
                          'justify-start h-auto py-3 text-left',
                          action.color
                        )}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        <span className="text-xs">{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Navigation</h3>
                <div className="space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href;
                    
                    return (
                      <Link key={item.id} href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          size="sm"
                          className={cn(
                            'w-full justify-start touch-target',
                            isActive && 'bg-primary/10 text-primary border-primary/20',
                            item.color && !isActive && item.color
                          )}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t mt-auto">
                <div className="space-y-2">
                  <Button
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-start touch-target"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </Button>
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={onLogout}
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 touch-target"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Log Out
                  </Button>
                </div>
                
                <Separator className="my-3" />
                
                <div className="text-xs text-muted-foreground text-center">
                  <p>FitnessMealPlanner v2.0</p>
                  <p>© 2025 EvoFit</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Center: Page Title */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold truncate px-4">
            {getCurrentPageTitle()}
          </h1>
        </div>

        {/* Right: Profile & Actions */}
        <div className="flex items-center gap-2">
          {/* Search Button */}
          {onSearch && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex touch-target"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {/* Notifications */}
          {showNotificationBadge && (
            <Button variant="ghost" size="sm" className="relative touch-target">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
            </Button>
          )}

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full touch-target">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  <Badge className={cn('text-xs w-fit mt-1', getRoleColor(user.role))}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Heart className="mr-2 h-4 w-4" />
                Favorites
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="absolute inset-0 bg-background z-50 border-b">
          <div className="p-4">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search recipes, meal plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary touch-target"
                />
              </div>
              <Button type="submit" size="sm" className="touch-target">
                Search
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="touch-target"
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
            
            {/* Search Suggestions */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Quick Searches</h3>
              <div className="flex flex-wrap gap-2">
                {['High Protein', 'Vegetarian', 'Quick Meals', 'Breakfast', 'Low Carb'].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      handleSearch({ preventDefault: () => {} } as React.FormEvent);
                    }}
                    className="text-xs touch-target"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile (Optional) */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg touch-target h-12 w-12 p-0">
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allQuickActions.map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem key={action.id} onClick={action.action}>
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom Tab Bar for Mobile (Alternative Navigation) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden safe-area-bottom">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.id} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    'h-12 flex-col gap-1 touch-target text-xs',
                    isActive && 'text-primary-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileNavigationEnhancements;