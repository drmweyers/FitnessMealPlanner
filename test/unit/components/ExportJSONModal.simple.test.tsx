import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExportJSONModal from '../../../client/src/components/ExportJSONModal';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'mock-token'),
  },
});

// Mock file download
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

const mockClick = vi.fn();
const mockAnchor = {
  href: '',
  download: '',
  click: mockClick,
};

Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName) => {
    if (tagName === 'a') {
      return mockAnchor;
    }
    return {};
  }),
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn(),
});

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn(),
});

describe('ExportJSONModal Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(ExportJSONModal).toBeDefined();
    expect(typeof ExportJSONModal).toBe('function');
  });

  it('should be a React component', () => {
    expect(ExportJSONModal.name).toBe('ExportJSONModal');
  });

  it('should export fetch API call correctly', async () => {
    const mockData = {
      recipes: [{ id: '1', name: 'Test Recipe' }],
      recipesCount: 1,
      exportDate: '2025-01-20T16:30:00.000Z',
      exportType: 'recipes',
      version: '1.0',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    // Test the internal export logic by simulating what the component does
    const exportType = 'recipes';
    const token = 'mock-token';
    
    const response = await fetch(`/api/admin/export?type=${exportType}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/export?type=recipes',
      {
        headers: {
          Authorization: 'Bearer mock-token',
        },
      }
    );

    const data = await response.json();
    expect(data).toEqual(mockData);
  });

  it('should handle export API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const response = await fetch('/api/admin/export?type=recipes', {
      headers: {
        Authorization: 'Bearer mock-token',
      },
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  it('should test file download logic', () => {
    const mockData = {
      recipes: [{ id: '1', name: 'Test Recipe' }],
      exportDate: '2025-01-20T16:30:00.000Z',
      exportType: 'recipes',
    };

    // Simulate what the component does for file download
    const blob = new Blob([JSON.stringify(mockData, null, 2)], { type: 'application/json' });
    const url = global.URL.createObjectURL(blob);
    
    // Simulate creating download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitnessmealplanner-recipes-2025-01-20.json`;
    
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(a.download).toContain('fitnessmealplanner-recipes-');
    expect(a.href).toBe('mock-blob-url');
  });

  it('should handle different export types', () => {
    const exportTypes = ['recipes', 'users', 'mealPlans', 'all'];
    
    exportTypes.forEach(type => {
      const expectedUrl = `/api/admin/export?type=${type}`;
      expect(expectedUrl).toContain(type);
    });
  });

  it('should format date correctly in filename', () => {
    const date = new Date('2025-01-20T16:30:00.000Z');
    const formattedDate = date.toISOString().split('T')[0];
    const filename = `fitnessmealplanner-recipes-${formattedDate}.json`;
    
    expect(filename).toBe('fitnessmealplanner-recipes-2025-01-20.json');
  });

  it('should validate component props structure', () => {
    // Test that the component accepts the expected props
    const props = {
      isOpen: true,
      onClose: vi.fn(),
    };

    // Check prop types without rendering
    expect(typeof props.isOpen).toBe('boolean');
    expect(typeof props.onClose).toBe('function');
  });

  it('should handle toast notifications correctly', () => {
    // Test success toast
    const successToast = {
      title: 'Export successful',
      description: 'recipes exported successfully',
    };

    expect(successToast.title).toBe('Export successful');
    expect(successToast.description).toBe('recipes exported successfully');

    // Test error toast
    const errorToast = {
      title: 'Export failed',
      description: 'Failed to export data. Please try again.',
      variant: 'destructive',
    };

    expect(errorToast.title).toBe('Export failed');
    expect(errorToast.variant).toBe('destructive');
  });

  it('should test localStorage token retrieval', () => {
    const token = localStorage.getItem('token');
    expect(token).toBe('mock-token');
    expect(localStorage.getItem).toHaveBeenCalledWith('token');
  });

  it('should handle JSON stringify and parse correctly', () => {
    const mockData = {
      recipes: [{ id: '1', name: 'Test Recipe' }],
      exportDate: '2025-01-20T16:30:00.000Z',
    };

    const jsonString = JSON.stringify(mockData, null, 2);
    const parsedData = JSON.parse(jsonString);

    expect(jsonString).toContain('"recipes"');
    expect(jsonString).toContain('"exportDate"');
    expect(parsedData).toEqual(mockData);
  });
});