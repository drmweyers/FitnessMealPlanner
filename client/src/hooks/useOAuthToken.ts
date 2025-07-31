import { useEffect } from 'react';
import { useLocation } from 'wouter';

const AUTH_STATE_CHANGE_EVENT = 'authStateChange';

export function useOAuthToken() {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Check for OAuth token in URL on component mount
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      console.log('OAuth token detected in URL, processing...');
      
      // Store the token and trigger auth state update
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT));
      
      // Clean up the URL to remove the token
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Force a re-render by navigating to the same path
      // This ensures the Router re-evaluates authentication state
      setTimeout(() => {
        navigate(window.location.pathname);
      }, 100);
    }
  }, [navigate]);
}