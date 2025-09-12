import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import { Router } from 'wouter';
import type { User } from '@/types/auth';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock location and navigation
const mockNavigate = vi.fn();
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => ['/current-path', mockNavigate],
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          {children}
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
};

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  role: 'customer',
  profilePicture: null,
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Mock window events
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Hook Initialization', () => {
    it('throws error when used outside AuthProvider', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.error).toEqual(
        new Error('useAuth must be used within an AuthProvider')
      );
    });

    it('provides default values when no user is authenticated', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('loads token from localStorage on initialization', () => {
      mockLocalStorage.getItem.mockReturnValue('stored-token');

      renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
    });

    it('sets up event listeners for cross-tab synchronization', () => {
      renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('authStateChange', expect.any(Function));
    });
  });

  describe('User Authentication Query', () => {
    it('fetches user data when token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: {
            accessToken: 'valid-token',
            user: mockUser,
          },
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
        credentials: 'include',
      });
    });

    it('does not fetch user data when no token exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles 401 errors by attempting token refresh', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token');
      
      // First call fails with 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            data: {
              accessToken: 'new-token',
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            data: {
              accessToken: 'new-token',
              user: mockUser,
            },
          }),
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh_token', {
        method: 'POST',
        credentials: 'include',
      });
    });

    it('clears auth state when token refresh fails', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      });
    });
  });

  describe('Login Function', () => {
    it('successfully logs in user with valid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: {
            accessToken: 'login-token',
            user: mockUser,
          },
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      let loginResult;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(loginResult).toEqual(mockUser);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'login-token');
      expect(window.dispatchEvent).toHaveBeenCalledWith(new Event('authStateChange'));
    });

    it('throws error on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          message: 'Invalid credentials',
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('handles network errors during login', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Network error');
    });

    it('validates response structure from login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: {
            // Missing accessToken
            user: mockUser,
          },
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid response from server');
    });
  });

  describe('Register Function', () => {
    it('successfully registers new user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'success',
          data: {
            accessToken: 'register-token',
            user: mockUser,
          },
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      let registerResult;
      await act(async () => {
        registerResult = await result.current.register({
          email: 'newuser@example.com',
          password: 'password123',
          role: 'customer',
        });
      });

      expect(registerResult).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          role: 'customer',
        }),
      });
    });

    it('handles registration errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          message: 'Email already exists',
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.register({
          email: 'existing@example.com',
          password: 'password123',
          role: 'customer',
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('Logout Function', () => {
    it('successfully logs out user', async () => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(window.dispatchEvent).toHaveBeenCalledWith(new Event('authStateChange'));
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('clears auth state even if logout request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Error Handling', () => {
    it('provides error state when user fetch fails', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token');
      mockFetch.mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });

    it('handles malformed server responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'error',
          message: 'Server error',
        }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Server error');
    });
  });

  describe('Cross-tab Synchronization', () => {
    it('updates auth state when localStorage changes in another tab', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Simulate storage event from another tab
      mockLocalStorage.getItem.mockReturnValue('new-token');
      const storageEvent = new Event('storage');
      
      // Get the event listener function
      const addEventListenerCalls = (window.addEventListener as any).mock.calls;
      const storageListener = addEventListenerCalls.find(call => call[0] === 'storage')[1];

      act(() => {
        storageListener(storageEvent);
      });

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('token');
    });

    it('removes event listeners on component unmount', () => {
      const { unmount } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('authStateChange', expect.any(Function));
    });
  });
});