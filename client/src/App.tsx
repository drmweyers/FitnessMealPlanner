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

import { Toaster } from "@/components/ui/toaster";
// import { TooltipProvider } from "@/components/ui/tooltip";
import Router from "./Router";
import { AuthProvider } from "./contexts/AuthContext";

/**
 * Root Application Component
 * 
 * Sets up global providers and context for the entire application:
 * - TooltipProvider: UI tooltip functionality
 * - Toaster: Global toast notification system
 * - Router: Application routing logic
 */
function App() {
  return (
    <AuthProvider>
      {/* <TooltipProvider> */}
        <Toaster />
        <Router />
      {/* </TooltipProvider> */}
    </AuthProvider>
  );
}

export default App;
