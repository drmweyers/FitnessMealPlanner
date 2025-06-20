/**
 * FitMeal Pro Frontend Application
 * 
 * Main application component that sets up the React app with routing,
 * state management, and UI providers. Uses Wouter for client-side routing
 * and TanStack Query for server state management.
 * 
 * Architecture:
 * - Authentication-based routing (landing vs authenticated pages)
 * - Global state management via React Query
 * - UI components from shadcn/ui library
 * - Toast notifications for user feedback
 */

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import MealPlanGeneratorPage from "@/pages/MealPlanGenerator";
import TrainerDashboard from "@/pages/TrainerDashboard";
import ClientDashboard from "@/pages/ClientDashboard";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";

/**
 * Application Router
 * 
 * Handles client-side routing with authentication-based access control.
 * Unauthenticated users see only the landing page, while authenticated
 * users have access to the full application.
 */
function Router() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/admin" component={Admin} />
            <Route path="/meal-plan-generator" component={MealPlanGeneratorPage} />
            <Route path="/trainer" component={TrainerDashboard} />
            <Route path="/my-meal-plan" component={ClientDashboard} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      )}
      {/* Catch-all route for 404 errors */}
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Root Application Component
 * 
 * Sets up global providers and context for the entire application:
 * - QueryClientProvider: Server state management and caching
 * - TooltipProvider: UI tooltip functionality
 * - Toaster: Global toast notification system
 * - Router: Application routing logic
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
