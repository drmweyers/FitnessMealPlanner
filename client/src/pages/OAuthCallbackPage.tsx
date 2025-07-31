import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';

const AUTH_STATE_CHANGE_EVENT = 'authStateChange';

export default function OAuthCallbackPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate(`/login?error=${error}`);
        return;
      }

      if (token) {
        console.log('Processing OAuth token...');
        
        // Store the token
        localStorage.setItem('token', token);
        
        // Trigger auth state update
        window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT));
        
        // Wait a bit for auth state to update
        setTimeout(() => {
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 100);
      } else {
        // No token, redirect to login
        navigate('/login');
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  // Once user is loaded, redirect based on role
  useEffect(() => {
    if (!isLoading && user) {
      console.log('User loaded, redirecting based on role:', user.role);
      
      // Add a small delay to ensure the auth state is fully propagated
      setTimeout(() => {
        switch (user.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'trainer':
            navigate('/trainer');
            break;
          case 'customer':
            navigate('/my-meal-plans');
            break;
          default:
            navigate('/');
        }
      }, 500);
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}