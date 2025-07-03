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

interface AuthResponse {
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

function normalizeAuthResponse(response: AuthResponse): { token: string; user: User } {
  if (response.status === 'error' || !response.data) {
    throw new Error(response.message || 'Authentication failed');
  }
  return { token: response.data.accessToken, user: response.data.user };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [, navigate] = useLocation();

  // Handle token refresh
  const refreshToken = async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh_token`, {
        method: 'POST',
        credentials: 'include', // Important for cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid auth state
          localStorage.removeItem('token');
          setAuthToken(null);
          return null;
        }
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      if (data.status === 'success' && data.data?.accessToken) {
        localStorage.setItem('token', data.data.accessToken);
        setAuthToken(data.data.accessToken);
        return data.data.accessToken;
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  };

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
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear auth state and notify other tabs
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
        const makeRequest = async (token: string) => {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return response;
        };

        let response;
        try {
          // Try with current token
          response = await makeRequest(authToken!);
        } catch (error) {
          if (error instanceof Error && error.message.includes('401')) {
            // Try to refresh token
            const newToken = await refreshToken();
            if (!newToken) {
              throw new Error('Session expired. Please login again.');
            }
            // Retry with new token
            response = await makeRequest(newToken);
          } else {
            throw error;
          }
        }
        
        const data = await response.json();
        const normalized = normalizeAuthResponse(data);
        return normalized.user;
      } catch (error) {
        if (error instanceof Error && error.message.includes('Session expired')) {
          await handleLogout();
        }
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && 
         (error.message.includes('Session expired') || 
          error.message.includes('401'))) {
        return false;
      }
      return failureCount < 1;
    },
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!authToken,
    throwOnError: false
  });

  const login = async (credentials: LoginCredentials): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
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
      console.error('Registration error:', error);
      throw error instanceof Error ? error : new Error('Registration failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user,
        error: error as Error | undefined,
        login,
        register,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Re-export the useAuth hook for backward compatibility
export { useAuth } from '@/hooks/useAuth'; 