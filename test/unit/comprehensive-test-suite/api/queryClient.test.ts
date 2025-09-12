import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API request function and related utilities
const mockApiRequest = vi.fn();
const mockHandleResponse = vi.fn();
const mockGetAuthToken = vi.fn();

// Mock implementation of queryClient module
const queryClientModule = {
  apiRequest: mockApiRequest,
  handleResponse: mockHandleResponse,
  getAuthToken: mockGetAuthToken,
  
  // Base API configuration
  API_BASE_URL: '/api',
  
  // Default headers
  getDefaultHeaders: () => ({
    'Content-Type': 'application/json',
  }),
  
  // Enhanced API request function with error handling
  makeRequest: async (url: string, options: RequestInit = {}) => {
    const token = mockGetAuthToken();
    const headers = {
      ...queryClientModule.getDefaultHeaders(),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    
    const config = {
      ...options,
      headers,
      credentials: 'include' as RequestCredentials,
    };
    
    try {
      const response = await fetch(url, config);
      return mockHandleResponse(response);
    } catch (error) {
      throw new Error(`Network error: ${error.message}`);
    }
  },
  
  // GET request helper
  get: (url: string, options: RequestInit = {}) => {
    return queryClientModule.makeRequest(url, {
      method: 'GET',
      ...options,
    });
  },
  
  // POST request helper
  post: (url: string, data?: any, options: RequestInit = {}) => {
    return queryClientModule.makeRequest(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  },
  
  // PUT request helper
  put: (url: string, data?: any, options: RequestInit = {}) => {
    return queryClientModule.makeRequest(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  },
  
  // DELETE request helper
  delete: (url: string, options: RequestInit = {}) => {
    return queryClientModule.makeRequest(url, {
      method: 'DELETE',
      ...options,
    });
  },
  
  // Query key factories
  queryKeys: {
    recipes: {
      all: () => ['recipes'],
      lists: () => [...queryClientModule.queryKeys.recipes.all(), 'list'],
      list: (filters: any) => [...queryClientModule.queryKeys.recipes.lists(), filters],
      details: () => [...queryClientModule.queryKeys.recipes.all(), 'detail'],
      detail: (id: string) => [...queryClientModule.queryKeys.recipes.details(), id],
    },
    mealPlans: {
      all: () => ['meal-plans'],
      lists: () => [...queryClientModule.queryKeys.mealPlans.all(), 'list'],
      list: (filters: any) => [...queryClientModule.queryKeys.mealPlans.lists(), filters],
      details: () => [...queryClientModule.queryKeys.mealPlans.all(), 'detail'],
      detail: (id: string) => [...queryClientModule.queryKeys.mealPlans.details(), id],
    },
    user: {
      all: () => ['user'],
      profile: () => [...queryClientModule.queryKeys.user.all(), 'profile'],
      measurements: () => [...queryClientModule.queryKeys.user.all(), 'measurements'],
      goals: () => [...queryClientModule.queryKeys.user.all(), 'goals'],
      photos: () => [...queryClientModule.queryKeys.user.all(), 'photos'],
    },
  },
};

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Query Client API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthToken.mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('makeRequest', () => {
    it('makes HTTP request with proper configuration', async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'test' }) };
      mockFetch.mockResolvedValue(mockResponse);
      mockHandleResponse.mockResolvedValue({ data: 'test' });

      await queryClientModule.makeRequest('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        credentials: 'include',
      });
    });

    it('includes auth token in headers when available', async () => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse);
      mockHandleResponse.mockResolvedValue({});
      mockGetAuthToken.mockReturnValue('test-token-123');

      await queryClientModule.makeRequest('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', 
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123',
          }),
        })
      );
    });

    it('omits auth header when no token available', async () => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse);
      mockHandleResponse.mockResolvedValue({});
      mockGetAuthToken.mockReturnValue(null);

      await queryClientModule.makeRequest('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', 
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });

    it('merges custom headers with defaults', async () => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse);
      mockHandleResponse.mockResolvedValue({});

      await queryClientModule.makeRequest('/api/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Content-Type': 'multipart/form-data', // Override default
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', 
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': 'Bearer mock-token',
            'X-Custom-Header': 'custom-value',
          },
        })
      );
    });

    it('includes credentials for cross-origin requests', async () => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse);
      mockHandleResponse.mockResolvedValue({});

      await queryClientModule.makeRequest('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', 
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failed'));

      await expect(queryClientModule.makeRequest('/api/test')).rejects.toThrow('Network error: Network failed');
    });

    it('calls response handler with fetch response', async () => {
      const mockResponse = { ok: true, status: 200 };
      mockFetch.mockResolvedValue(mockResponse);
      mockHandleResponse.mockResolvedValue({ data: 'handled' });

      const result = await queryClientModule.makeRequest('/api/test');

      expect(mockHandleResponse).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual({ data: 'handled' });
    });
  });

  describe('HTTP Method Helpers', () => {
    beforeEach(() => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse);
      mockHandleResponse.mockResolvedValue({ success: true });
    });

    describe('get', () => {
      it('makes GET request with correct method', async () => {
        await queryClientModule.get('/api/recipes');

        expect(mockFetch).toHaveBeenCalledWith('/api/recipes', 
          expect.objectContaining({
            method: 'GET',
          })
        );
      });

      it('merges additional options', async () => {
        await queryClientModule.get('/api/recipes', {
          headers: { 'X-Filter': 'active' },
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/recipes', 
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'X-Filter': 'active',
            }),
          })
        );
      });
    });

    describe('post', () => {
      it('makes POST request with correct method and body', async () => {
        const data = { title: 'New Recipe', calories: 300 };
        
        await queryClientModule.post('/api/recipes', data);

        expect(mockFetch).toHaveBeenCalledWith('/api/recipes', 
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(data),
          })
        );
      });

      it('handles POST request without body', async () => {
        await queryClientModule.post('/api/recipes/generate');

        expect(mockFetch).toHaveBeenCalledWith('/api/recipes/generate', 
          expect.objectContaining({
            method: 'POST',
            body: undefined,
          })
        );
      });

      it('merges additional options for POST', async () => {
        const data = { title: 'Test' };
        
        await queryClientModule.post('/api/recipes', data, {
          headers: { 'X-Source': 'app' },
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/recipes', 
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(data),
            headers: expect.objectContaining({
              'X-Source': 'app',
            }),
          })
        );
      });
    });

    describe('put', () => {
      it('makes PUT request with correct method and body', async () => {
        const data = { id: '1', title: 'Updated Recipe' };
        
        await queryClientModule.put('/api/recipes/1', data);

        expect(mockFetch).toHaveBeenCalledWith('/api/recipes/1', 
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(data),
          })
        );
      });

      it('handles PUT request without body', async () => {
        await queryClientModule.put('/api/recipes/1/approve');

        expect(mockFetch).toHaveBeenCalledWith('/api/recipes/1/approve', 
          expect.objectContaining({
            method: 'PUT',
            body: undefined,
          })
        );
      });
    });

    describe('delete', () => {
      it('makes DELETE request with correct method', async () => {
        await queryClientModule.delete('/api/recipes/1');

        expect(mockFetch).toHaveBeenCalledWith('/api/recipes/1', 
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });

      it('merges additional options for DELETE', async () => {
        await queryClientModule.delete('/api/recipes/1', {
          headers: { 'X-Reason': 'cleanup' },
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/recipes/1', 
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.objectContaining({
              'X-Reason': 'cleanup',
            }),
          })
        );
      });
    });
  });

  describe('Query Key Factories', () => {
    describe('recipes query keys', () => {
      it('generates correct keys for all recipes', () => {
        expect(queryClientModule.queryKeys.recipes.all()).toEqual(['recipes']);
      });

      it('generates correct keys for recipe lists', () => {
        expect(queryClientModule.queryKeys.recipes.lists()).toEqual(['recipes', 'list']);
      });

      it('generates correct keys for filtered recipe lists', () => {
        const filters = { cuisine: 'italian', calories: { max: 500 } };
        expect(queryClientModule.queryKeys.recipes.list(filters)).toEqual([
          'recipes', 'list', filters
        ]);
      });

      it('generates correct keys for recipe details', () => {
        expect(queryClientModule.queryKeys.recipes.details()).toEqual(['recipes', 'detail']);
      });

      it('generates correct keys for specific recipe detail', () => {
        expect(queryClientModule.queryKeys.recipes.detail('recipe-123')).toEqual([
          'recipes', 'detail', 'recipe-123'
        ]);
      });
    });

    describe('meal plans query keys', () => {
      it('generates correct keys for all meal plans', () => {
        expect(queryClientModule.queryKeys.mealPlans.all()).toEqual(['meal-plans']);
      });

      it('generates correct keys for meal plan lists', () => {
        expect(queryClientModule.queryKeys.mealPlans.lists()).toEqual(['meal-plans', 'list']);
      });

      it('generates correct keys for filtered meal plan lists', () => {
        const filters = { status: 'active', dateRange: '2024-01' };
        expect(queryClientModule.queryKeys.mealPlans.list(filters)).toEqual([
          'meal-plans', 'list', filters
        ]);
      });

      it('generates correct keys for meal plan details', () => {
        expect(queryClientModule.queryKeys.mealPlans.details()).toEqual(['meal-plans', 'detail']);
      });

      it('generates correct keys for specific meal plan detail', () => {
        expect(queryClientModule.queryKeys.mealPlans.detail('plan-456')).toEqual([
          'meal-plans', 'detail', 'plan-456'
        ]);
      });
    });

    describe('user query keys', () => {
      it('generates correct keys for all user data', () => {
        expect(queryClientModule.queryKeys.user.all()).toEqual(['user']);
      });

      it('generates correct keys for user profile', () => {
        expect(queryClientModule.queryKeys.user.profile()).toEqual(['user', 'profile']);
      });

      it('generates correct keys for user measurements', () => {
        expect(queryClientModule.queryKeys.user.measurements()).toEqual(['user', 'measurements']);
      });

      it('generates correct keys for user goals', () => {
        expect(queryClientModule.queryKeys.user.goals()).toEqual(['user', 'goals']);
      });

      it('generates correct keys for user photos', () => {
        expect(queryClientModule.queryKeys.user.photos()).toEqual(['user', 'photos']);
      });
    });

    describe('query key consistency', () => {
      it('ensures hierarchical key structure for cache invalidation', () => {
        const allRecipes = queryClientModule.queryKeys.recipes.all();
        const recipesList = queryClientModule.queryKeys.recipes.lists();
        const specificList = queryClientModule.queryKeys.recipes.list({ cuisine: 'italian' });
        
        // Lists should start with all
        expect(recipesList.slice(0, allRecipes.length)).toEqual(allRecipes);
        
        // Specific list should start with lists
        expect(specificList.slice(0, recipesList.length)).toEqual(recipesList);
      });

      it('ensures detail keys follow proper hierarchy', () => {
        const allRecipes = queryClientModule.queryKeys.recipes.all();
        const recipeDetails = queryClientModule.queryKeys.recipes.details();
        const specificDetail = queryClientModule.queryKeys.recipes.detail('123');
        
        // Details should start with all
        expect(recipeDetails.slice(0, allRecipes.length)).toEqual(allRecipes);
        
        // Specific detail should start with details
        expect(specificDetail.slice(0, recipeDetails.length)).toEqual(recipeDetails);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles fetch rejection', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      await expect(queryClientModule.makeRequest('/api/test')).rejects.toThrow(
        'Network error: Connection refused'
      );
    });

    it('handles response handler errors', async () => {
      const mockResponse = { ok: false, status: 500 };
      mockFetch.mockResolvedValue(mockResponse);
      mockHandleResponse.mockRejectedValue(new Error('Server error'));

      await expect(queryClientModule.makeRequest('/api/test')).rejects.toThrow('Server error');
    });

    it('preserves error context in network failures', async () => {
      mockFetch.mockRejectedValue(new Error('DNS resolution failed'));

      try {
        await queryClientModule.makeRequest('/api/test');
      } catch (error) {
        expect(error.message).toContain('Network error:');
        expect(error.message).toContain('DNS resolution failed');
      }
    });
  });

  describe('Request Configuration', () => {
    it('sets correct default headers', () => {
      const headers = queryClientModule.getDefaultHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('uses correct base URL', () => {
      expect(queryClientModule.API_BASE_URL).toBe('/api');
    });

    it('handles complex request options', async () => {
      const mockResponse = { ok: true };
      mockFetch.mockResolvedValue(mockResponse);
      mockHandleResponse.mockResolvedValue({});

      const complexOptions = {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Custom': 'value',
        },
        body: 'key=value',
        cache: 'no-cache' as RequestCache,
        redirect: 'follow' as RequestRedirect,
      };

      await queryClientModule.makeRequest('/api/test', complexOptions);

      expect(mockFetch).toHaveBeenCalledWith('/api/test', 
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Custom': 'value',
            'Authorization': 'Bearer mock-token',
          }),
          body: 'key=value',
          cache: 'no-cache',
          redirect: 'follow',
          credentials: 'include',
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('handles successful API workflow', async () => {
      // Mock successful responses
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      mockHandleResponse.mockResolvedValue({ data: 'success' });

      // Simulate getting recipes, then creating a meal plan
      const recipesResult = await queryClientModule.get('/api/recipes');
      const mealPlanResult = await queryClientModule.post('/api/meal-plans', {
        title: 'My Plan',
        recipes: ['1', '2'],
      });

      expect(recipesResult).toEqual({ data: 'success' });
      expect(mealPlanResult).toEqual({ data: 'success' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('handles authentication error workflow', async () => {
      // First request fails with 401
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
      mockHandleResponse.mockRejectedValueOnce(new Error('Unauthorized'));

      // Second request succeeds after token refresh
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      mockHandleResponse.mockResolvedValueOnce({ data: 'success' });

      await expect(queryClientModule.get('/api/protected')).rejects.toThrow('Unauthorized');
      
      // Simulate token refresh and retry
      mockGetAuthToken.mockReturnValue('new-token');
      const result = await queryClientModule.get('/api/protected');
      
      expect(result).toEqual({ data: 'success' });
    });

    it('handles file upload workflow', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 201 });
      mockHandleResponse.mockResolvedValue({ url: '/uploads/image.jpg' });

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'image/jpeg' }));

      await queryClientModule.post('/api/upload', formData, {
        headers: {
          // Don't set Content-Type for FormData - let browser set it
          'Content-Type': undefined,
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/upload', 
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      );
    });
  });
});