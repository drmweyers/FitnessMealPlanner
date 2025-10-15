import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'wouter';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'trainer' | 'customer';
  allowedRoles?: Array<'admin' | 'trainer' | 'customer'>;
}

/**
 * ProtectedRoute Component
 * 
 * Wraps components that require authentication and/or specific roles.
 * Automatically redirects to login if user is not authenticated.
 * Shows access denied if user doesn't have required permissions.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  allowedRoles 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check role-based access and redirect to user's home page
    if (requiredRole && user?.role !== requiredRole) {
      // Redirect to user's proper dashboard based on their role
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'trainer':
          navigate('/trainer');
          break;
        case 'customer':
          navigate('/customer');
          break;
        default:
          navigate('/login');
      }
      return;
    }

    if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
      // Redirect to user's proper dashboard based on their role
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'trainer':
          navigate('/trainer');
          break;
        case 'customer':
          navigate('/customer');
          break;
        default:
          navigate('/login');
      }
      return;
    }
  }, [isAuthenticated, user, isLoading, navigate, requiredRole, allowedRoles]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Don't render if role requirements not met
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;