import React, { Suspense } from "react";
import { Route, Switch, Redirect } from "wouter";
import { useAuth } from "./contexts/AuthContext";
import { useOAuthToken } from "./hooks/useOAuthToken";
import FallbackUI from "./components/FallbackUI";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { OAuthCallback } from "./components/OAuthCallback";

// Lazy load heavy page components to reduce initial bundle size
const Landing = React.lazy(() => import("./pages/Landing"));
const Trainer = React.lazy(() => import("./pages/Trainer"));
const Admin = React.lazy(() => import("./pages/Admin"));
const Customer = React.lazy(() => import("./pages/Customer"));
const AdminProfile = React.lazy(() => import("./pages/AdminProfile"));
const TrainerProfile = React.lazy(() => import("./pages/TrainerProfile"));
const CustomerProfile = React.lazy(() => import("./pages/CustomerProfile"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const RegisterPage = React.lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const OAuthCallbackPage = React.lazy(() => import("./pages/OAuthCallbackPage"));

export default function Router() {
  const { user, isLoading } = useAuth();
  
  // Check for OAuth token in URL
  useOAuthToken();

  // Check if this is an OAuth callback with a token
  const urlParams = new URLSearchParams(window.location.search);
  const hasToken = urlParams.has('token');
  
  // If we have a token in the URL, show the OAuth callback page
  if (hasToken) {
    return (
      <Suspense fallback={<FallbackUI />}>
        <OAuthCallbackPage />
      </Suspense>
    );
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
      <Suspense fallback={<FallbackUI />}>
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
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<FallbackUI />}>
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
      </Suspense>
    </Layout>
  );
} 