import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import RoleSetup from "@/pages/RoleSetup";
import MealPlanGeneratorPage from "@/pages/MealPlanGenerator";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Switch>
      {user?.role === 'admin' ? (
        <>
          <Route path="/" component={Admin} />
          <Route path="/admin" component={Admin} />
        </>
      ) : user?.role === 'trainer' ? (
        <>
          <Route path="/" component={RoleSetup} />
          <Route path="/trainer" component={RoleSetup} />
          <Route path="/meal-plan-generator" component={MealPlanGeneratorPage} />
        </>
      ) : user?.role === 'client' ? (
        <>
          <Route path="/" component={RoleSetup} />
          <Route path="/client" component={RoleSetup} />
        </>
      ) : (
        <Route path="/" component={RoleSetup} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

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
