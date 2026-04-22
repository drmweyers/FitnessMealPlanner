import React from "react";
import { Route, Switch, Redirect } from "wouter";
import { useAuth } from "./contexts/AuthContext";
import { useOAuthToken } from "./hooks/useOAuthToken";
import Trainer from "./pages/Trainer";
import Admin from "./pages/Admin";
import Customer from "./pages/Customer";
import AdminProfile from "./pages/AdminProfile";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminDashboard from "./pages/AdminDashboard";
import BulkRecipeGeneration from "./pages/BulkRecipeGeneration";
import TrainerProfile from "./pages/TrainerProfile";
import CustomerProfile from "./pages/CustomerProfile";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AccessDenied from "./components/AccessDenied";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import SharedMealPlanView from "./components/SharedMealPlanView";
import MacroTrackingDashboard from "./components/MacroTrackingDashboard";
import GroceryListWrapper from "./components/GroceryListWrapper";
import HybridPricing from "./pages/HybridPricing";
import Billing from "./pages/Billing";
import FunnelLanding from "./pages/FunnelLanding";
import StarterSalesPage from "./pages/StarterSalesPage";
import ProfessionalSalesPage from "./pages/ProfessionalSalesPage";
import EnterpriseSalesPage from "./pages/EnterpriseSalesPage";
import LeadMagnetPage from "./pages/LeadMagnetPage";
import TripwirePage from "./pages/TripwirePage";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutCancel from "./pages/CheckoutCancel";
import ComparisonPage from "./pages/ComparisonPage";
import ROICalculatorPage from "./pages/ROICalculatorPage";
import Vault from "./pages/Vault";

export default function Router() {
  const { user, isLoading } = useAuth();

  // Check for OAuth token in URL
  useOAuthToken();

  // Check if this is an OAuth callback with a token
  const urlParams = new URLSearchParams(window.location.search);
  const hasToken = urlParams.has("token");

  // If we have a token in the URL, show the OAuth callback page
  if (hasToken) {
    return <OAuthCallbackPage />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if this is a shared meal plan route (public access)
  if (window.location.pathname.startsWith("/shared/")) {
    return <SharedMealPlanView />;
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/pricing" component={HybridPricing} />
        <Route path="/get-started" component={FunnelLanding} />
        <Route path="/starter" component={StarterSalesPage} />
        <Route path="/professional" component={ProfessionalSalesPage} />
        <Route path="/enterprise" component={EnterpriseSalesPage} />
        <Route path="/free-blueprint" component={LeadMagnetPage} />
        <Route path="/special-offer" component={TripwirePage} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/comparison" component={ComparisonPage} />
        <Route path="/roi-calculator" component={ROICalculatorPage} />
        <Route path="/payment/success" component={CheckoutSuccess} />
        <Route path="/checkout/cancel" component={CheckoutCancel} />
        <Route path="/">
          <Redirect to="/get-started" />
        </Route>
        <Route path="*">
          <Redirect to="/get-started" />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      {/* Public/marketing routes — no app Layout, regardless of auth state */}
      <Route path="/get-started" component={FunnelLanding} />
      <Route path="/starter" component={StarterSalesPage} />
      <Route path="/professional" component={ProfessionalSalesPage} />
      <Route path="/enterprise" component={EnterpriseSalesPage} />
      <Route path="/free-blueprint" component={LeadMagnetPage} />
      <Route path="/special-offer" component={TripwirePage} />
      <Route path="/pricing" component={HybridPricing} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/comparison" component={ComparisonPage} />
      <Route path="/roi-calculator" component={ROICalculatorPage} />
      <Route path="/payment/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />

      {/* App routes — all wrapped in Layout */}
      <Route>
        <Layout>
          <Switch>
            <Route
              path="/"
              component={() => {
                switch (user.role) {
                  case "customer":
                    return <Redirect to="/my-meal-plans" />;
                  case "trainer":
                    return <Redirect to="/trainer" />;
                  case "admin":
                    return <Redirect to="/admin" />;
                  default:
                    return <Trainer />;
                }
              }}
            />
            <Route
              path="/billing"
              component={() => (
                <ProtectedRoute requiredRole="trainer">
                  <Billing />
                </ProtectedRoute>
              )}
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              component={() => (
                <ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              )}
            />

            <Route
              path="/admin/analytics"
              component={() => (
                <ProtectedRoute requiredRole="admin">
                  <AdminAnalytics />
                </ProtectedRoute>
              )}
            />

            <Route
              path="/admin/dashboard"
              component={() => (
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              )}
            />

            <Route
              path="/admin/bulk-generation"
              component={() => (
                <ProtectedRoute requiredRole="admin">
                  <BulkRecipeGeneration />
                </ProtectedRoute>
              )}
            />

            {/* Customer Routes */}
            <Route
              path="/customer"
              component={() => {
                if (user.role !== "customer") {
                  return <Redirect to="/" />;
                }
                return <Customer />;
              }}
            />

            <Route
              path="/customer/meal-plans"
              component={() => {
                if (user.role !== "customer") {
                  return <Redirect to="/" />;
                }
                return <Customer />;
              }}
            />

            <Route
              path="/customer/progress"
              component={() => {
                if (user.role !== "customer") {
                  return <Redirect to="/" />;
                }
                const Component = Customer;
                return <Component initialTab="progress" />;
              }}
            />

            <Route
              path="/customer/grocery-list"
              component={() => {
                if (user.role !== "customer") {
                  return <Redirect to="/" />;
                }
                const Component = Customer;
                return <Component initialTab="grocery-list" />;
              }}
            />

            <Route
              path="/my-meal-plans"
              component={() => {
                if (user.role !== "customer") {
                  return <Redirect to="/" />;
                }
                return <Customer />;
              }}
            />

            {/* New Milestone 9 Routes - Customer only */}
            <Route
              path="/nutrition"
              component={() => {
                if (user.role !== "customer") {
                  return <Redirect to="/" />;
                }
                return (
                  <MacroTrackingDashboard
                    userId={user.id}
                    userRole={user.role}
                  />
                );
              }}
            />

            <Route
              path="/grocery-list"
              component={() => {
                if (user.role !== "customer") {
                  return <Redirect to="/" />;
                }
                return <GroceryListWrapper />;
              }}
            />

            {/* Common Routes */}
            <Route
              path="/recipes"
              component={() => {
                // Recipes page accessible to all authenticated users
                return <Trainer />;
              }}
            />

            <Route
              path="/favorites"
              component={() => {
                // Favorites page accessible to trainers and customers
                if (user.role === "admin") {
                  return <Redirect to="/" />;
                }
                return <Trainer />;
              }}
            />

            {/* Trainer Routes - More specific routes first */}
            <Route
              path="/trainer/customers"
              component={() => {
                if (user.role !== "trainer") {
                  return (
                    <AccessDenied message="Trainer access required. You don't have permission to view customer management." />
                  );
                }
                return <Trainer />;
              }}
            />

            <Route
              path="/trainer/meal-plans"
              component={() => {
                if (user.role !== "trainer") {
                  return (
                    <AccessDenied message="Trainer access required. You don't have permission to view meal plans management." />
                  );
                }
                return <Trainer />;
              }}
            />

            <Route
              path="/trainer/manual-meal-plan"
              component={() => {
                if (user.role !== "trainer") {
                  return (
                    <AccessDenied message="Trainer access required. You don't have permission to create meal plans." />
                  );
                }
                return <Trainer />;
              }}
            />

            <Route
              path="/meal-plan-generator"
              component={() => {
                if (user.role !== "trainer" && user.role !== "admin") {
                  return (
                    <AccessDenied message="Trainer or Admin access required. You don't have permission to generate meal plans." />
                  );
                }
                return <Trainer />;
              }}
            />

            <Route
              path="/trainer"
              component={() => {
                if (user.role !== "trainer") {
                  return (
                    <AccessDenied message="Trainer access required. You don't have permission to access the trainer dashboard." />
                  );
                }
                return <Trainer />;
              }}
            />

            <Route
              path="/vault"
              component={() => {
                if (user.role !== "trainer") {
                  return (
                    <AccessDenied message="Trainer access required. The Business Vault is available to trainers only." />
                  );
                }
                return <Vault />;
              }}
            />

            {/* Profile Routes */}
            <Route
              path="/profile"
              component={() => {
                switch (user.role) {
                  case "admin":
                    return <AdminProfile />;
                  case "trainer":
                    return <TrainerProfile />;
                  case "customer":
                    return <CustomerProfile />;
                  default:
                    return <Redirect to="/" />;
                }
              }}
            />

            <Route
              path="/admin/profile"
              component={() => {
                if (user.role !== "admin") {
                  return <Redirect to="/" />;
                }
                return <AdminProfile />;
              }}
            />

            <Route
              path="/trainer/profile"
              component={() => {
                if (user.role !== "trainer") {
                  return <Redirect to="/" />;
                }
                return <TrainerProfile />;
              }}
            />

            <Route
              path="/customer/profile"
              component={() => {
                if (user.role !== "customer") {
                  return <Redirect to="/" />;
                }
                return <CustomerProfile />;
              }}
            />

            <Route path="*" component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}
