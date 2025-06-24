import { createContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import type { User, UserRole } from '@/hooks/useAuth';

const API_BASE_URL = '/api';

// Custom event for cross-tab auth state synchronization
const AUTH_STATE_CHANGE_EVENT = 'authStateChange';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
  role: 'customer' | 'trainer' | 'admin';
}

// Support both old and new response formats
interface LegacyAuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

interface NewAuthResponse {
  status: 'success' | 'error';
  data?: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: UserRole;
    };
  };
  message?: string;
  code?: string;
}

type AuthResponse = LegacyAuthResponse | NewAuthResponse;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error?: Error;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (credentials: RegisterCredentials) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to normalize response
function normalizeAuthResponse(response: AuthResponse): { token: string; user: User } {
  if ('status' in response) {
    // New format
    if (response.status === 'error' || !response.data) {
      throw new Error(response.message || 'Authentication failed');
    }
    return { token: response.data.accessToken, user: response.data.user };
  } else {
    // Legacy format
    return response;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleStorageChange = () => {
      setAuthToken(localStorage.getItem('token'));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear auth token and notify other tabs
      localStorage.removeItem('token');
      window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT));
      setAuthToken(null);
      
      // Clear all queries from the cache
      queryClient.clear();
      
      // Reset the user query data
      queryClient.setQueryData([`${API_BASE_URL}/auth/me`], null);

      // Navigate to login
      navigate('/login');
    }
  };

  const { data: user, isLoading, error } = useQuery({
    queryKey: [`${API_BASE_URL}/auth/me`],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        
        if (response.status === 401) {
          // Token is expired or invalid
          await handleLogout();
          throw new Error('Session expired. Please login again.');
        }

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        const normalized = normalizeAuthResponse(data);
        return normalized.user;
      } catch (error) {
        if (error instanceof Error && error.message.includes('Session expired')) {
          throw error;
        }
        console.error('Auth check failed:', error);
        throw new Error('Failed to validate session');
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 errors
      if (error instanceof Error && error.message.includes('Session expired')) {
        return false;
      }
      return failureCount < 1;
    },
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!authToken, // Only fetch user data if we have a token
    throwOnError: false
  });

  // If authentication fails due to server issues, treat as unauthenticated
  // but don't block the UI from loading
  const isAuthError = error && (error as any)?.status >= 500;

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      const { token, user } = normalizeAuthResponse(data);
      
      if (!token || !user || !user.role) {
        throw new Error('Invalid response from server');
      }

      // Store the token and notify other tabs
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT));
      setAuthToken(token);

      // Update the cached user data
      queryClient.setQueryData([`${API_BASE_URL}/auth/me`], user);

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error instanceof Error ? error : new Error('Login failed');
    }
  };

  const register = async (credentials: RegisterCredentials): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(credentials.role === 'admin' && authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data: AuthResponse = await response.json();
      const { token, user } = normalizeAuthResponse(data);
      
      if (!token || !user || !user.role) {
        console.error('Invalid server response:', data);
        throw new Error('Invalid response from server');
      }

      // Store the token and notify other tabs
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT));
      setAuthToken(token);

      // Update the cached user data
      queryClient.setQueryData([`${API_BASE_URL}/auth/me`], user);

      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error instanceof Error ? error : new Error('Registration failed');
    }
  };

  const value = {
    user: user as User | null,
    isLoading: isLoading && !isAuthError,
    isAuthenticated: !!user && !error,
    error: error as Error | undefined,
    login,
    register,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Re-export the useAuth hook for backward compatibility
export { useAuth } from '@/hooks/useAuth'; 