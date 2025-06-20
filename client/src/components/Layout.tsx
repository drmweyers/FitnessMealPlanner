/**
 * Shared Layout Component
 * 
 * Provides consistent navigation and structure across all authenticated pages.
 * Includes role-based tab navigation and user profile information.
 */

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import RoleSwitcher from "@/components/RoleSwitcher";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, role } = useAuth();
  const [location, navigate] = useLocation();

  // Determine active tab based on URL
  const getActiveTab = () => {
    if (location === '/admin') return 'admin';
    if (location === '/meal-plan-generator') return 'meal-plan';
    if (location === '/trainer') return 'trainer';
    if (location === '/my-meal-plan') return 'client';
    return 'recipes';
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'admin':
        navigate('/admin');
        break;
      case 'meal-plan':
        navigate('/meal-plan-generator');
        break;
      case 'trainer':
        navigate('/trainer');
        break;
      case 'client':
        navigate('/my-meal-plan');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <i className="fas fa-utensils text-2xl text-blue-600"></i>
              <span className="text-xl font-bold text-slate-800">FitMeal Pro</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors">
                  <img 
                    src={user?.profileImageUrl || '/api/placeholder/32/32'} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="hidden sm:block font-medium">
                    {user?.firstName || user?.email || 'User'}
                  </span>
                </button>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Switcher for Testing */}
        <div className="mb-8 flex justify-end">
          <RoleSwitcher />
        </div>

        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full ${role === 'admin' ? 'grid-cols-3' : role === 'trainer' ? 'grid-cols-2' : 'grid-cols-1'} mb-8`}>
            <TabsTrigger value="recipes">
              <i className="fas fa-book-open mr-2"></i>
              Browse Recipes
            </TabsTrigger>
            
            {(role === 'admin' || role === 'trainer') && (
              <TabsTrigger value="meal-plan">
                <i className="fas fa-utensils mr-2"></i>
                Meal Plan Generator
              </TabsTrigger>
            )}
            
            {role === 'admin' && (
              <TabsTrigger value="admin">
                <i className="fas fa-cog mr-2"></i>
                Admin
              </TabsTrigger>
            )}
            
            {role === 'trainer' && (
              <TabsTrigger value="trainer">
                <i className="fas fa-users mr-2"></i>
                Trainer Dashboard
              </TabsTrigger>
            )}
            
            {role === 'client' && (
              <TabsTrigger value="client">
                <i className="fas fa-user mr-2"></i>
                My Meal Plan
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="recipes" className="mt-0">
            {getActiveTab() === 'recipes' && children}
          </TabsContent>
          <TabsContent value="meal-plan" className="mt-0">
            {getActiveTab() === 'meal-plan' && children}
          </TabsContent>
          <TabsContent value="admin" className="mt-0">
            {getActiveTab() === 'admin' && children}
          </TabsContent>
          <TabsContent value="trainer" className="mt-0">
            {getActiveTab() === 'trainer' && children}
          </TabsContent>
          <TabsContent value="client" className="mt-0">
            {getActiveTab() === 'client' && children}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}