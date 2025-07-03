import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Track if we're currently refreshing the token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

async function refreshAccessToken(): Promise<string> {
  try {
    const res = await fetch('/api/auth/refresh_token', {
      method: 'POST',
      credentials: 'include', // Important for cookies
    });

    if (!res.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await res.json();
    if (data.status === 'success' && data.data.accessToken) {
      localStorage.setItem('token', data.data.accessToken);
      return data.data.accessToken;
    }
    throw new Error('No token in refresh response');
  } catch (error) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw error;
  }
}

async function handleTokenRefresh(): Promise<string> {
  try {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      processQueue(null, newToken);
      return newToken;
    } else {
      // Wait for the ongoing refresh
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
    }
  } catch (error) {
    isRefreshing = false;
    processQueue(error);
    throw error;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const makeRequest = async (token?: string) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      method,
      headers,
      credentials: 'include', // Important for cookies
      body: data ? JSON.stringify(data) : undefined,
    });
  };

  try {
    // First attempt with current token
    const token = localStorage.getItem('token');
    const res = await makeRequest(token || undefined);

    // If unauthorized, try token refresh
    if (res.status === 401) {
      try {
        const newToken = await handleTokenRefresh();
        // Retry request with new token
        const retryRes = await makeRequest(newToken);
        await throwIfResNotOk(retryRes);
        return retryRes;
      } catch (error) {
        // If refresh fails, redirect to login
        window.location.href = '/login';
        throw error;
      }
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Check if the error response indicates token issues
    if (error instanceof Error && error.message.includes('401')) {
      window.location.href = '/login';
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // If there are additional query parameters in the queryKey
    if (queryKey.length > 1 && queryKey[1]) {
      const params = new URLSearchParams();
      const filters = queryKey[1] as Record<string, any>;
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    try {
      const res = await apiRequest('GET', url);
      const data = await res.json();

      // Handle different response formats
      if (data && Array.isArray(data.recipes)) {
        return data;
      }
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return { recipes: [data], total: 1 };
      }
      return { recipes: [], total: 0 };
    } catch (error) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
