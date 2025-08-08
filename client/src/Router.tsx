import React from "react";
import { Route, Switch, Redirect } from "wouter";
import { useAuth } from "./contexts/AuthContext";
import { useOAuthToken } from "./hooks/useOAuthToken";
import Landing from "./pages/Landing";
import Trainer from "./pages/Trainer";
import Admin from "./pages/Admin";
import Customer from "./pages/Customer";
import AdminProfile from "./pages/AdminProfile";
import TrainerProfile from "./pages/TrainerProfile";
import CustomerProfile from "./pages/CustomerProfile";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import FallbackUI from "./components/FallbackUI";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { OAuthCallback } from "./components/OAuthCallback";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";

export default function Router() {
  const { user, isLoading } = useAuth();
  
  // Check for OAuth token in URL
  useOAuthToken();

  // Check if this is an OAuth callback with a token
  const urlParams = new URLSearchParams(window.location.search);
  const hasToken = urlParams.has('token');
  
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

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/">
          <Redirect to="/login" />
        </Route>
        <Route path="*">
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => {
          switch (user.role) {
            case 'customer':
              return <Redirect to="/my-meal-plans" />;
            case 'trainer':
              return <Redirect to="/trainer" />;
            case 'admin':
              return <Redirect to="/admin" />;
            default:
              return <Trainer />;
          }
        }} />
        
        {/* Admin Routes */}
        <Route path="/admin" component={() => (
          <ProtectedRoute requiredRole="admin">
            <Admin />
          </ProtectedRoute>
        )} />
        
        {/* Customer Routes */}
        <Route path="/customer" component={() => {
          if (user.role !== 'customer') {
            return <Redirect to="/" />;
          }
          return <Customer />;
        }} />
        
        <Route path="/my-meal-plans" component={() => {
          if (user.role !== 'customer') {
            return <Redirect to="/" />;
          }
          return <Customer />;
        }} />
        
        {/* Trainer Routes - More specific routes first */}
        <Route path="/trainer/customers" component={() => {
          if (user.role !== 'trainer') {
            return <Redirect to="/" />;
          }
          return <Trainer />;
        }} />
        
        <Route path="/trainer/meal-plans" component={() => {
          if (user.role !== 'trainer') {
            return <Redirect to="/" />;
          }
          return <Trainer />;
        }} />
        
        <Route path="/trainer/health-protocols" component={() => {
          if (user.role !== 'trainer') {
            return <Redirect to="/" />;
          }
          return <Trainer />;
        }} />
        
        <Route path="/meal-plan-generator" component={() => {
          if (user.role !== 'trainer' && user.role !== 'admin') {
            return <Redirect to="/" />;
          }
          return <Trainer />;
        }} />
        
        <Route path="/trainer" component={() => {
          if (user.role !== 'trainer') {
            return <Redirect to="/" />;
          }
          return <Trainer />;
        }} />
        
        {/* Profile Routes */}
        <Route path="/profile" component={() => {
          switch (user.role) {
            case 'admin':
              return <AdminProfile />;
            case 'trainer':
              return <TrainerProfile />;
            case 'customer':
              return <CustomerProfile />;
            default:
              return <Redirect to="/" />;
          }
        }} />
        
        <Route path="/admin/profile" component={() => {
          if (user.role !== 'admin') {
            return <Redirect to="/" />;
          }
          return <AdminProfile />;
        }} />
        
        <Route path="/trainer/profile" component={() => {
          if (user.role !== 'trainer') {
            return <Redirect to="/" />;
          }
          return <TrainerProfile />;
        }} />
        
        <Route path="/customer/profile" component={() => {
          if (user.role !== 'customer') {
            return <Redirect to="/" />;
          }
          return <CustomerProfile />;
        }} />
        
        
        <Route path="*" component={NotFound} />
      </Switch>
    </Layout>
  );
} 