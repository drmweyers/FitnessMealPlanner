/**
 * API Client with Automatic Token Refresh and Retry Logic
 *
 * This module provides a robust fetch wrapper that handles:
 * - Automatic JWT token refresh on 401 errors
 * - Exponential backoff retry for transient failures
 * - Request deduplication for concurrent requests
 * - Proper error handling and logging
 */

const API_BASE_URL = '/api';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Pending refresh promise to prevent duplicate refresh requests
 */
let pendingRefresh: Promise<string | null> | null = null;

/**
 * Refresh the access token using the refresh token
 *
 * @returns New access token or null if refresh failed
 */
async function refreshAccessToken(): Promise<string | null> {
  // If refresh already in progress, return existing promise
  if (pendingRefresh) {
    console.log('[ApiClient] Deduplicating refresh request');
    return pendingRefresh;
  }

  pendingRefresh = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh_token`, {
        method: 'POST',
        credentials: 'include', // Important for cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Refresh token expired - clear auth state
          localStorage.removeItem('token');
          window.location.href = '/login?reason=session_expired';
          return null;
        }
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      if (data.status === 'success' && data.data?.accessToken) {
        const newToken = data.data.accessToken;
        localStorage.setItem('token', newToken);
        return newToken;
      }
      return null;
    } catch (error) {
      console.error('[ApiClient] Token refresh failed:', error);
      localStorage.removeItem('token');
      return null;
    } finally {
      // Clear pending refresh after completion
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

/**
 * Sleep for a specified duration with exponential backoff
 *
 * @param retryCount - Current retry attempt (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise that resolves after delay
 */
function exponentialBackoff(retryCount: number, baseDelay: number = INITIAL_RETRY_DELAY): Promise<void> {
  const delay = baseDelay * Math.pow(2, retryCount);
  const jitter = Math.random() * 0.3 * delay; // Add ±30% jitter
  const totalDelay = delay + jitter;

  console.log(`[ApiClient] Retrying in ${Math.round(totalDelay)}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);

  return new Promise(resolve => setTimeout(resolve, totalDelay));
}

/**
 * Check if an error is retryable
 *
 * @param status - HTTP status code
 * @param error - Error object
 * @returns true if the error is retryable
 */
function isRetryableError(status: number | undefined, error: Error): boolean {
  // Don't retry client errors (except 401 and 408)
  if (status && status >= 400 && status < 500) {
    return status === 401 || status === 408; // Unauthorized or Request Timeout
  }

  // Retry server errors and network errors
  return true;
}

/**
 * Enhanced fetch with automatic token refresh and retry logic
 *
 * Features:
 * - Automatically refreshes token on 401 errors
 * - Retries failed requests with exponential backoff
 * - Deduplicates concurrent refresh requests
 * - Includes authentication headers
 *
 * @param endpoint - API endpoint (e.g., '/users/me')
 * @param options - Fetch options
 * @returns Promise resolving to Response object
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  let lastError: Error | undefined;
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Get current token
      const token = localStorage.getItem('token');

      // Prepare request with auth header if token exists
      const requestOptions: RequestInit = {
        ...options,
        credentials: 'include', // Always include cookies
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      };

      // Make the request
      const response = await fetch(url, requestOptions);

      // Handle 401 Unauthorized - token invalid or expired
      if (response.status === 401) {
        console.log('[ApiClient] 401 error - attempting token refresh');

        // Try to refresh token
        const newToken = await refreshAccessToken();

        if (!newToken) {
          // Refresh failed - redirect to login
          console.error('[ApiClient] Token refresh failed - redirecting to login');
          window.location.href = '/login?reason=session_expired';
          throw new Error('Session expired');
        }

        // Retry request with new token
        console.log('[ApiClient] Token refreshed - retrying request');
        const retryOptions: RequestInit = {
          ...options,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          },
        };

        const retryResponse = await fetch(url, retryOptions);

        // If retry still fails with 401, give up
        if (retryResponse.status === 401) {
          console.error('[ApiClient] Retry after refresh failed with 401');
          window.location.href = '/login?reason=session_expired';
          throw new Error('Session expired');
        }

        return retryResponse;
      }

      // If request succeeded, return response
      if (response.ok) {
        return response;
      }

      // Request failed - check if retryable
      lastStatus = response.status;
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      if (!isRetryableError(response.status, lastError)) {
        // Not retryable - throw immediately
        throw lastError;
      }

      // If this is the last attempt, throw
      if (attempt === MAX_RETRIES) {
        throw lastError;
      }

      // Wait before retry
      await exponentialBackoff(attempt);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // If error is not retryable or last attempt, throw
      if (!isRetryableError(lastStatus, lastError) || attempt === MAX_RETRIES) {
        throw lastError;
      }

      // Wait before retry
      await exponentialBackoff(attempt);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Request failed after retries');
}

/**
 * Type-safe JSON fetch wrapper
 *
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Promise resolving to parsed JSON data
 */
export async function apiFetchJSON<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await apiFetch(endpoint, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET request helper
 */
export function apiGet<T>(endpoint: string): Promise<T> {
  return apiFetchJSON<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiFetchJSON<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 */
export function apiPut<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiFetchJSON<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 */
export function apiPatch<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiFetchJSON<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiFetchJSON<T>(endpoint, { method: 'DELETE' });
}
