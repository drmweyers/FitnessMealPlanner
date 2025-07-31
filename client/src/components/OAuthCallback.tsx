import { useEffect } from 'react';
import { useLocation } from 'wouter';

const AUTH_STATE_CHANGE_EVENT = 'authStateChange';

export function OAuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Get the token from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error) {
      // Handle OAuth error
      console.error('OAuth error:', error);
      navigate(`/login?error=${error}`);
      return;
    }

    if (token) {
      // Store the token and trigger auth state update
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT));
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // The AuthContext will handle the redirect based on user role
      // once it fetches the user data with the new token
    } else {
      // No token in URL, redirect to login
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}