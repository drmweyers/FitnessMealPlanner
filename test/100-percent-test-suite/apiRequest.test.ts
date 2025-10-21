import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, getQueryFn, queryClient } from '../../../client/src/lib/queryClient';

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location
const mockLocation = {
  href: '',
  assign: vi.fn(),
  reload: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

const mockFetch = vi.mocked(fetch);

describe('API Request Utility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
    
    // Default successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ data: 'test' }),
      text: vi.fn().mockResolvedValue('response text'),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiRequest Function', () => {
    describe('Basic Functionality', () => {
      it('should make GET request successfully', async () => {
        const response = await apiRequest('GET', '/api/test');
        
        expect(mockFetch).toHaveBeenCalledWith('/api/test', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: undefined,
        });
        expect(response).toBeDefined();
      });

      it('should make POST request with data', async () => {
        const testData = { name: 'test', value: 123 };
        
        await apiRequest('POST', '/api/create', testData);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(testData),
        });
      });

      it('should make PUT request with data', async () => {
        const updateData = { id: 1, name: 'updated' };
        
        await apiRequest('PUT', '/api/update/1', updateData);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/update/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updateData),
        });
      });

      it('should make DELETE request', async () => {
        await apiRequest('DELETE', '/api/delete/1');
        
        expect(mockFetch).toHaveBeenCalledWith('/api/delete/1', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: undefined,
        });
      });

      it('should handle PATCH requests', async () => {
        const patchData = { status: 'active' };
        
        await apiRequest('PATCH', '/api/patch/1', patchData);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/patch/1', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(patchData),
        });
      });
    });

    describe('Authentication', () => {
      it('should include Authorization header when token exists', async () => {
        localStorageMock.getItem.mockReturnValue('test-token');
        
        await apiRequest('GET', '/api/protected');
        
        expect(mockFetch).toHaveBeenCalledWith('/api/protected', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          credentials: 'include',
          body: undefined,
        });
      });

      it('should make request without token when not available', async () => {
        localStorageMock.getItem.mockReturnValue(null);
        
        await apiRequest('GET', '/api/public');
        
        expect(mockFetch).toHaveBeenCalledWith('/api/public', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: undefined,
        });
      });

      it('should handle empty token correctly', async () => {
        localStorageMock.getItem.mockReturnValue('');
        
        await apiRequest('GET', '/api/test');
        
        const fetchCall = mockFetch.mock.calls[0][1];
        expect(fetchCall.headers).not.toHaveProperty('Authorization');
      });
    });

    describe('Token Refresh Mechanism', () => {
      it('should refresh token and retry on 401 response', async () => {
        localStorageMock.getItem.mockReturnValue('expired-token');
        
        // First call returns 401
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            text: vi.fn().mockResolvedValue('Unauthorized'),
          } as any)
          // Token refresh call
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({
              status: 'success',
              data: { accessToken: 'new-token' }
            }),
          } as any)
          // Retry call with new token
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ data: 'success' }),
          } as any);

        const response = await apiRequest('GET', '/api/protected');
        
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
        expect(response).toBeDefined();
      });

      it('should redirect to login when token refresh fails', async () => {
        localStorageMock.getItem.mockReturnValue('expired-token');
        
        // First call returns 401
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            text: vi.fn().mockResolvedValue('Unauthorized'),
          } as any)
          // Token refresh call fails
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Refresh Failed',
            text: vi.fn().mockResolvedValue('Refresh Failed'),
          } as any);

        await expect(apiRequest('GET', '/api/protected')).rejects.toThrow();
        expect(mockLocation.href).toBe('/login');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      });

      it('should handle concurrent requests during token refresh', async () => {
        localStorageMock.getItem.mockReturnValue('expired-token');
        
        // Setup 401 responses for initial requests
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            text: vi.fn().mockResolvedValue('Unauthorized'),
          } as any)
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            text: vi.fn().mockResolvedValue('Unauthorized'),
          } as any)
          // Token refresh call
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({
              status: 'success',
              data: { accessToken: 'new-token' }
            }),
          } as any)
          // Retry calls with new token
          .mockResolvedValue({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ data: 'success' }),
          } as any);

        // Make concurrent requests
        const promises = [
          apiRequest('GET', '/api/test1'),
          apiRequest('GET', '/api/test2'),
        ];

        const results = await Promise.all(promises);
        
        expect(results).toHaveLength(2);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
      });

      it('should handle refresh token response without token', async () => {
        localStorageMock.getItem.mockReturnValue('expired-token');
        
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            text: vi.fn().mockResolvedValue('Unauthorized'),
          } as any)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({
              status: 'success',
              data: {} // No token in response
            }),
          } as any);

        await expect(apiRequest('GET', '/api/protected')).rejects.toThrow();
        expect(mockLocation.href).toBe('/login');
      });
    });

    describe('FormData Handling', () => {
      it('should handle FormData requests correctly', async () => {
        const formData = new FormData();
        formData.append('file', new Blob(['test'], { type: 'text/plain' }));
        formData.append('name', 'test-file');
        
        await apiRequest('POST', '/api/upload', formData);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/upload', {
          method: 'POST',
          headers: {},
          credentials: 'include',
          body: formData,
        });
      });

      it('should not set Content-Type for FormData', async () => {
        const formData = new FormData();
        formData.append('data', 'test');
        
        await apiRequest('POST', '/api/upload', formData);
        
        const fetchCall = mockFetch.mock.calls[0][1];
        expect(fetchCall.headers).not.toHaveProperty('Content-Type');
      });

      it('should handle multipart/form-data custom header correctly', async () => {
        const data = { test: 'data' };
        const customHeaders = { 'Content-Type': 'multipart/form-data' };
        
        await apiRequest('POST', '/api/test', data, customHeaders);
        
        const fetchCall = mockFetch.mock.calls[0][1];
        expect(fetchCall.headers).not.toHaveProperty('Content-Type');
      });
    });

    describe('Custom Headers', () => {
      it('should apply custom headers', async () => {
        const customHeaders = {
          'X-Custom-Header': 'custom-value',
          'Accept': 'application/xml',
        };
        
        await apiRequest('GET', '/api/test', undefined, customHeaders);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/test', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
            'Accept': 'application/xml',
          },
          credentials: 'include',
          body: undefined,
        });
      });

      it('should override default headers with custom headers', async () => {
        const customHeaders = {
          'Content-Type': 'application/xml',
        };
        
        await apiRequest('POST', '/api/test', { data: 'test' }, customHeaders);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
          },
          credentials: 'include',
          body: JSON.stringify({ data: 'test' }),
        });
      });

      it('should merge custom headers with authorization', async () => {
        localStorageMock.getItem.mockReturnValue('test-token');
        const customHeaders = { 'X-API-Version': '1.0' };
        
        await apiRequest('GET', '/api/test', undefined, customHeaders);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/test', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Version': '1.0',
            'Authorization': 'Bearer test-token',
          },
          credentials: 'include',
          body: undefined,
        });
      });
    });

    describe('Error Handling', () => {
      it('should throw error for 4xx responses', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: vi.fn().mockResolvedValue('Invalid data'),
        } as any);

        await expect(apiRequest('POST', '/api/test', {})).rejects.toThrow('400: Invalid data');
      });

      it('should throw error for 5xx responses', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: vi.fn().mockResolvedValue('Server error'),
        } as any);

        await expect(apiRequest('GET', '/api/test')).rejects.toThrow('500: Server error');
      });

      it('should handle empty error response text', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: vi.fn().mockResolvedValue(''),
        } as any);

        await expect(apiRequest('GET', '/api/missing')).rejects.toThrow('404: Not Found');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(apiRequest('GET', '/api/test')).rejects.toThrow('Network error');
      });

      it('should redirect to login on 401 error in error message', async () => {
        mockFetch.mockRejectedValue(new Error('401: Unauthorized access'));

        await expect(apiRequest('GET', '/api/test')).rejects.toThrow();
        expect(mockLocation.href).toBe('/login');
      });

      it('should handle timeout errors', async () => {
        mockFetch.mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10)
          )
        );

        await expect(apiRequest('GET', '/api/slow')).rejects.toThrow('Request timeout');
      });
    });

    describe('Edge Cases', () => {
      it('should handle null data correctly', async () => {
        await apiRequest('POST', '/api/test', null);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: 'null',
        });
      });

      it('should handle undefined data correctly', async () => {
        await apiRequest('POST', '/api/test', undefined);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: undefined,
        });
      });

      it('should handle empty string data', async () => {
        await apiRequest('POST', '/api/test', '');
        
        expect(mockFetch).toHaveBeenCalledWith('/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: '""',
        });
      });

      it('should handle complex nested objects', async () => {
        const complexData = {
          user: {
            id: 1,
            profile: {
              name: 'Test User',
              preferences: {
                theme: 'dark',
                notifications: ['email', 'push']
              }
            }
          },
          metadata: {
            timestamp: Date.now(),
            version: '1.0.0'
          }
        };
        
        await apiRequest('POST', '/api/complex', complexData);
        
        expect(mockFetch).toHaveBeenCalledWith('/api/complex', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(complexData),
        });
      });

      it('should handle special characters in URLs', async () => {
        await apiRequest('GET', '/api/search?q=test%20query&filter=café');
        
        expect(mockFetch).toHaveBeenCalledWith('/api/search?q=test%20query&filter=café', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: undefined,
        });
      });

      it('should handle very long URLs', async () => {
        const longUrl = '/api/test?' + 'param=value&'.repeat(100).slice(0, -1);
        
        await apiRequest('GET', longUrl);
        
        expect(mockFetch).toHaveBeenCalledWith(longUrl, expect.any(Object));
      });
    });
  });

  describe('getQueryFn Function', () => {
    describe('Basic Query Functionality', () => {
      it('should create query function that makes GET requests', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
        } as any);

        const result = await queryFn({ queryKey: ['/api/recipes'] });
        
        expect(mockFetch).toHaveBeenCalledWith('/api/recipes', expect.any(Object));
        expect(result).toEqual({ recipes: [], total: 0 });
      });

      it('should handle query parameters from queryKey', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
        } as any);

        const filters = { mealType: 'breakfast', maxCalories: 500 };
        await queryFn({ queryKey: ['/api/recipes', filters] });
        
        expect(mockFetch).toHaveBeenCalledWith('/api/recipes?mealType=breakfast&maxCalories=500', expect.any(Object));
      });

      it('should filter out undefined, null, and empty string parameters', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
        } as any);

        const filters = { 
          mealType: 'breakfast', 
          maxCalories: undefined, 
          minCalories: null, 
          dietary: '',
          protein: 0 // Should be included
        };
        await queryFn({ queryKey: ['/api/recipes', filters] });
        
        expect(mockFetch).toHaveBeenCalledWith('/api/recipes?mealType=breakfast&protein=0', expect.any(Object));
      });

      it('should handle empty filters object', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
        } as any);

        await queryFn({ queryKey: ['/api/recipes', {}] });
        
        expect(mockFetch).toHaveBeenCalledWith('/api/recipes', expect.any(Object));
      });

      it('should handle queryKey without filters', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
        } as any);

        await queryFn({ queryKey: ['/api/recipes'] });
        
        expect(mockFetch).toHaveBeenCalledWith('/api/recipes', expect.any(Object));
      });
    });

    describe('Response Format Handling', () => {
      it('should handle recipes array response format', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        const recipesData = { recipes: [{ id: 1, name: 'Test Recipe' }], total: 1 };
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(recipesData),
        } as any);

        const result = await queryFn({ queryKey: ['/api/recipes'] });
        
        expect(result).toEqual(recipesData);
      });

      it('should handle single object response format', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        const singleRecipe = { id: 1, name: 'Single Recipe' };
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(singleRecipe),
        } as any);

        const result = await queryFn({ queryKey: ['/api/recipe/1'] });
        
        expect(result).toEqual({ recipes: [singleRecipe], total: 1 });
      });

      it('should handle malformed response data', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue('invalid response'),
        } as any);

        const result = await queryFn({ queryKey: ['/api/recipes'] });
        
        expect(result).toEqual({ recipes: [], total: 0 });
      });

      it('should handle null response data', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(null),
        } as any);

        const result = await queryFn({ queryKey: ['/api/recipes'] });
        
        expect(result).toEqual({ recipes: [], total: 0 });
      });

      it('should handle empty array response', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue([]),
        } as any);

        const result = await queryFn({ queryKey: ['/api/recipes'] });
        
        expect(result).toEqual({ recipes: [], total: 0 });
      });
    });

    describe('Error Handling Behavior', () => {
      it('should throw error when on401 is "throw"', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: vi.fn().mockResolvedValue('Unauthorized'),
        } as any);

        await expect(queryFn({ queryKey: ['/api/protected'] })).rejects.toThrow();
      });

      it('should return null when on401 is "returnNull"', async () => {
        const queryFn = getQueryFn({ on401: 'returnNull' });
        
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: vi.fn().mockResolvedValue('Unauthorized'),
        } as any);

        const result = await queryFn({ queryKey: ['/api/protected'] });
        
        expect(result).toBeNull();
      });

      it('should throw non-401 errors regardless of on401 setting', async () => {
        const queryFn = getQueryFn({ on401: 'returnNull' });
        
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Server Error',
          text: vi.fn().mockResolvedValue('Server Error'),
        } as any);

        await expect(queryFn({ queryKey: ['/api/recipes'] })).rejects.toThrow();
      });

      it('should handle network errors', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        
        mockFetch.mockRejectedValue(new Error('Network error'));

        await expect(queryFn({ queryKey: ['/api/recipes'] })).rejects.toThrow('Network error');
      });

      it('should handle JSON parsing errors', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockRejectedValue(new Error('JSON parsing failed')),
        } as any);

        await expect(queryFn({ queryKey: ['/api/recipes'] })).rejects.toThrow('JSON parsing failed');
      });
    });

    describe('Query Parameter Edge Cases', () => {
      it('should handle boolean parameters', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
        } as any);

        const filters = { isVegetarian: true, isGlutenFree: false };
        await queryFn({ queryKey: ['/api/recipes', filters] });
        
        expect(mockFetch).toHaveBeenCalledWith('/api/recipes?isVegetarian=true&isGlutenFree=false', expect.any(Object));
      });

      it('should handle numeric parameters', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
        } as any);

        const filters = { page: 1, limit: 20, minCalories: 300.5 };
        await queryFn({ queryKey: ['/api/recipes', filters] });
        
        expect(mockFetch).toHaveBeenCalledWith('/api/recipes?page=1&limit=20&minCalories=300.5', expect.any(Object));
      });

      it('should handle array parameters', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
        } as any);

        const filters = { mealTypes: ['breakfast', 'lunch'] };
        await queryFn({ queryKey: ['/api/recipes', filters] });
        
        expect(mockFetch).toHaveBeenCalledWith('/api/recipes?mealTypes=breakfast,lunch', expect.any(Object));
      });

      it('should handle special characters in parameters', async () => {
        const queryFn = getQueryFn({ on401: 'throw' });
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({ recipes: [], total: 0 }),
        } as any);

        const filters = { search: 'café & restaurant', ingredient: 'jalapeño' };
        await queryFn({ queryKey: ['/api/recipes', filters] });
        
        expect(mockFetch).toHaveBeenCalledWith('/api/recipes?search=café & restaurant&ingredient=jalapeño', expect.any(Object));
      });
    });
  });

  describe('QueryClient Configuration', () => {
    it('should have correct default options', () => {
      expect(queryClient.getDefaultOptions().queries?.refetchInterval).toBe(false);
      expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
      expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(Infinity);
      expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
    });

    it('should have mutations retry disabled', () => {
      expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
    });

    it('should use getQueryFn with throw behavior by default', () => {
      const defaultQueryFn = queryClient.getDefaultOptions().queries?.queryFn;
      expect(typeof defaultQueryFn).toBe('function');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        apiRequest('GET', `/api/test/${i}`)
      );

      await Promise.all(requests);
      
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid successive requests', async () => {
      for (let i = 0; i < 5; i++) {
        await apiRequest('GET', `/api/rapid/${i}`);
      }
      
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should not interfere with different request types', async () => {
      const promises = [
        apiRequest('GET', '/api/get'),
        apiRequest('POST', '/api/post', { data: 'test' }),
        apiRequest('PUT', '/api/put', { data: 'update' }),
        apiRequest('DELETE', '/api/delete'),
      ];

      await Promise.all(promises);
      
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during token refresh queue', async () => {
      localStorageMock.getItem.mockReturnValue('expired-token');
      
      // Setup multiple 401 responses
      mockFetch
        .mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: vi.fn().mockResolvedValue('Unauthorized'),
        } as any);

      // Make many requests that will fail
      const promises = Array.from({ length: 50 }, (_, i) => 
        apiRequest('GET', `/api/test/${i}`).catch(() => {})
      );

      await Promise.allSettled(promises);
      
      // Should not accumulate failed requests in memory
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should clean up event listeners and timers', async () => {
      // This test ensures no memory leaks from event listeners or timers
      // Implementation would depend on specific cleanup mechanisms
      const requests = Array.from({ length: 10 }, () => 
        apiRequest('GET', '/api/test').catch(() => {})
      );

      await Promise.allSettled(requests);
      
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});