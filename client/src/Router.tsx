import React from "react";
import { Route, Switch, Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Admin from "@/pages/Admin";
import Customer from "@/pages/Customer";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import NotFound from "@/pages/NotFound";
import FallbackUI from "@/components/FallbackUI";
import Layout from "@/components/Layout";

export default function Router() {
  const { user, isLoading } = useAuth();

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
              return <Home />;
            case 'admin':
              return <Redirect to="/admin" />;
            default:
              return <Home />;
          }
        }} />
        {user.role === 'admin' && <Route path="/admin" component={Admin} />}
        {user.role === 'customer' && (
          <>
            <Route path="/customer" component={Customer} />
            <Route path="/my-meal-plans" component={Customer} />
          </>
        )}
        {user.role === 'trainer' && (
          <>
            <Route path="/meal-plan-generator" component={Home} />
          </>
        )}
        <Route path="*" component={NotFound} />
      </Switch>
    </Layout>
  );
} 