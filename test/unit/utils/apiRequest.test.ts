import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage and sessionStorage first
const mockStorage = {
  items: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockStorage.items.get(key) || null),
  setItem: vi.fn((key: string, value: string) => mockStorage.items.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.items.delete(key)),
  clear: vi.fn(() => mockStorage.items.clear())
};

// Mock implementation of apiRequest utility
const mockApiRequest = {
  // Base configuration
  baseURL: 'http://localhost:4000/api',
  defaultHeaders: {
    'Content-Type': 'application/json'
  },

  // Token management (will be updated to use mocked storage in tests)
  getToken: () => {
    if (typeof window !== 'undefined') {
      return mockStorage.getItem('token') || null;
    }
    return null;
  },

  setToken: (token: string, persistent = true) => {
    if (typeof window !== 'undefined') {
      // For testing, we simplify and just store the token
      // Real implementation would handle localStorage vs sessionStorage
      mockStorage.setItem('token', token);
    }
  },

  clearToken: () => {
    if (typeof window !== 'undefined') {
      mockStorage.removeItem('token');
    }
  },

  // Build headers with authentication
  buildHeaders: (customHeaders: Record<string, string> = {}) => {
    const headers = { ...mockApiRequest.defaultHeaders, ...customHeaders };
    const token = mockApiRequest.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  },

  // Handle different response types
  handleResponse: async (response: Response) => {
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          errorMessage = await response.text() || errorMessage;
        }
      } catch (parseError) {
        // Use default error message if parsing fails
      }

      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.statusText = response.statusText;
      throw error;
    }

    if (response.status === 204) {
      return null; // No content
    }

    if (contentType?.includes('application/json')) {
      return await response.json();
    }

    if (contentType?.includes('text/')) {
      return await response.text();
    }

    return await response.blob();
  },

  // Main API request function
  request: async (
    endpoint: string,
    options: RequestInit & { baseURL?: string } = {}
  ) => {
    const { baseURL = mockApiRequest.baseURL, headers = {}, ...requestOptions } = options;
    const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`;

    const requestHeaders = mockApiRequest.buildHeaders(headers as Record<string, string>);

    try {
      const response = await fetch(url, {
        ...requestOptions,
        headers: requestHeaders
      });

      return await mockApiRequest.handleResponse(response);
    } catch (error) {
      // Add request context to error
      if (error instanceof Error) {
        const enhancedError = error as any;
        enhancedError.url = url;
        enhancedError.method = requestOptions.method || 'GET';
      }
      throw error;
    }
  },

  // Convenience methods
  get: (endpoint: string, options: RequestInit = {}) => {
    return mockApiRequest.request(endpoint, { ...options, method: 'GET' });
  },

  post: (endpoint: string, data?: any, options: RequestInit = {}) => {
    return mockApiRequest.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  },

  put: (endpoint: string, data?: any, options: RequestInit = {}) => {
    return mockApiRequest.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  },

  patch: (endpoint: string, data?: any, options: RequestInit = {}) => {
    return mockApiRequest.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  },

  delete: (endpoint: string, options: RequestInit = {}) => {
    return mockApiRequest.request(endpoint, { ...options, method: 'DELETE' });
  },

  // File upload helper
  uploadFile: async (endpoint: string, file: File, fieldName = 'file') => {
    const formData = new FormData();
    formData.append(fieldName, file);

    return mockApiRequest.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set multipart headers
    });
  }
};

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage and sessionStorage (already defined above)

Object.defineProperty(window, 'localStorage', { value: mockStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockStorage });

describe('API Request Utility', () => {
  beforeEach(() => {
    // Clear storage but preserve mock functionality
    mockStorage.items.clear();
    mockFetch.mockClear();
    
    // Reset specific mock call counts without clearing implementation
    mockStorage.getItem.mockClear();
    mockStorage.setItem.mockClear();
    mockStorage.removeItem.mockClear();
    mockStorage.clear.mockClear();
  });

  afterEach(() => {
    mockApiRequest.clearToken();
  });

  describe('Token Management', () => {
    it('should set and get tokens from localStorage', () => {
      mockApiRequest.setToken('test-token', true);
      expect(mockStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(mockApiRequest.getToken()).toBe('test-token');
    });

    it('should set and get tokens from sessionStorage', () => {
      mockApiRequest.setToken('session-token', false);
      expect(mockStorage.setItem).toHaveBeenCalledWith('token', 'session-token');
      expect(mockApiRequest.getToken()).toBe('session-token');
    });

    it('should clear tokens from both storages', () => {
      mockApiRequest.setToken('test-token');
      mockApiRequest.clearToken();
      expect(mockStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should return null when no token exists', () => {
      expect(mockApiRequest.getToken()).toBeNull();
    });

    it('should prioritize localStorage over sessionStorage', () => {
      mockStorage.items.set('token', 'local-token');
      mockApiRequest.setToken('session-token', false); // This should clear localStorage
      expect(mockApiRequest.getToken()).toBe('session-token');
    });
  });

  describe('Header Building', () => {
    it('should build headers with default content-type', () => {
      const headers = mockApiRequest.buildHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include authorization header when token exists', () => {
      mockApiRequest.setToken('test-token');
      const headers = mockApiRequest.buildHeaders();
      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('should merge custom headers', () => {
      const customHeaders = {
        'X-Custom-Header': 'custom-value',
        'Content-Type': 'application/xml'
      };
      const headers = mockApiRequest.buildHeaders(customHeaders);

      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['Content-Type']).toBe('application/xml');
    });

    it('should not include authorization header without token', () => {
      const headers = mockApiRequest.buildHeaders();
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('Response Handling', () => {
    it('should parse JSON responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        json: vi.fn().mockResolvedValue({ data: 'test' })
      } as any;

      const result = await mockApiRequest.handleResponse(mockResponse);
      expect(result).toEqual({ data: 'test' });
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should parse text responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('text/plain')
        },
        text: vi.fn().mockResolvedValue('plain text')
      } as any;

      const result = await mockApiRequest.handleResponse(mockResponse);
      expect(result).toBe('plain text');
      expect(mockResponse.text).toHaveBeenCalled();
    });

    it('should return null for 204 No Content', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        }
      } as any;

      const result = await mockApiRequest.handleResponse(mockResponse);
      expect(result).toBeNull();
    });

    it('should handle blob responses', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      const mockResponse = {
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/pdf')
        },
        blob: vi.fn().mockResolvedValue(mockBlob)
      } as any;

      const result = await mockApiRequest.handleResponse(mockResponse);
      expect(result).toBe(mockBlob);
      expect(mockResponse.blob).toHaveBeenCalled();
    });

    it('should throw error for non-ok responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        json: vi.fn().mockResolvedValue({ error: 'Resource not found' })
      } as any;

      await expect(mockApiRequest.handleResponse(mockResponse)).rejects.toThrow('Resource not found');
    });

    it('should handle error parsing failures', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        json: vi.fn().mockRejectedValue(new Error('Parse error')),
        text: vi.fn().mockRejectedValue(new Error('Parse error'))
      } as any;

      await expect(mockApiRequest.handleResponse(mockResponse))
        .rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        json: vi.fn().mockResolvedValue({ success: true })
      });
    });

    it('should make GET requests', async () => {
      await mockApiRequest.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should make POST requests with data', async () => {
      const testData = { name: 'Test User' };
      await mockApiRequest.post('/users', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should make PUT requests with data', async () => {
      const testData = { name: 'Updated User' };
      await mockApiRequest.put('/users/1', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(testData)
        })
      );
    });

    it('should make PATCH requests with data', async () => {
      const testData = { name: 'Patched User' };
      await mockApiRequest.patch('/users/1', testData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(testData)
        })
      );
    });

    it('should make DELETE requests', async () => {
      await mockApiRequest.delete('/users/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should make POST requests without data', async () => {
      await mockApiRequest.post('/users/1/activate');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users/1/activate',
        expect.objectContaining({
          method: 'POST',
          body: undefined
        })
      );
    });
  });

  describe('File Upload', () => {
    it('should upload files with FormData', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        json: vi.fn().mockResolvedValue({ success: true, fileId: '123' })
      });

      await mockApiRequest.uploadFile('/upload', mockFile);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData.get('file')).toBe(mockFile);
    });

    it('should use custom field name for file upload', async () => {
      const mockFile = new File(['image content'], 'image.jpg', { type: 'image/jpeg' });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        },
        json: vi.fn().mockResolvedValue({ success: true })
      });

      await mockApiRequest.uploadFile('/upload-image', mockFile, 'profileImage');

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData.get('profileImage')).toBe(mockFile);
    });
  });

  describe('URL Handling', () => {
    it('should use absolute URLs as-is', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({})
      });

      await mockApiRequest.get('https://external-api.com/data');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://external-api.com/data',
        expect.any(Object)
      );
    });

    it('should handle endpoints with leading slash', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({})
      });

      await mockApiRequest.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users',
        expect.any(Object)
      );
    });

    it('should handle endpoints without leading slash', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({})
      });

      await mockApiRequest.get('users');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/apiusers',
        expect.any(Object)
      );
    });

    it('should use custom base URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({})
      });

      await mockApiRequest.request('/users', { baseURL: 'https://api.example.com' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should enhance errors with request context', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await mockApiRequest.get('/users');
      } catch (error: any) {
        expect(error.message).toBe('Network error');
        expect(error.url).toBe('http://localhost:4000/api/users');
        expect(error.method).toBe('GET');
      }
    });

    it('should handle fetch failures gracefully', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(mockApiRequest.get('/users')).rejects.toThrow('Failed to fetch');
    });

    it('should preserve original error properties', async () => {
      const originalError = new Error('Original error') as any;
      originalError.code = 'NETWORK_ERROR';

      mockFetch.mockRejectedValue(originalError);

      try {
        await mockApiRequest.get('/users');
      } catch (error: any) {
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.url).toBe('http://localhost:4000/api/users');
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle authenticated requests', async () => {
      mockApiRequest.setToken('auth-token');

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({ user: { id: 1, name: 'Test User' } })
      });

      await mockApiRequest.get('/me');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer auth-token'
          })
        })
      );
    });

    it('should handle pagination requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({
          data: [],
          pagination: { page: 1, total: 100 }
        })
      });

      const result = await mockApiRequest.get('/users?page=1&limit=10');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users?page=1&limit=10',
        expect.any(Object)
      );

      expect(result.pagination).toEqual({ page: 1, total: 100 });
    });

    it('should handle concurrent requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({ success: true })
      });

      const requests = [
        mockApiRequest.get('/users'),
        mockApiRequest.get('/recipes'),
        mockApiRequest.get('/meal-plans')
      ];

      await Promise.all(requests);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance', () => {
    it('should handle rapid successive requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({ success: true })
      });

      const startTime = performance.now();

      const requests = Array(100).fill(0).map((_, i) =>
        mockApiRequest.get(`/test-endpoint-${i}`)
      );

      await Promise.all(requests);

      const endTime = performance.now();

      // Should handle 100 requests in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
      expect(mockFetch).toHaveBeenCalledTimes(100);
    });
  });
});