import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import ExportJSONModal from '../../../client/src/components/ExportJSONModal';
import { renderWithProviders, mockUsers } from '../../test-utils';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

// Mock DOM methods for file download
const mockClick = vi.fn();
const mockRemoveChild = vi.fn();
const mockAppendChild = vi.fn();

// Create a mock anchor element
const mockAnchor = {
  href: '',
  download: '',
  click: mockClick,
};

// Mock document methods
Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName) => {
    if (tagName === 'a') {
      return mockAnchor;
    }
    return {};
  }),
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild,
});

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild,
});

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'mock-token'),
  },
});

// Use the standard test utilities instead of custom render function

describe('ExportJSONModal', () => {
  const mockOnClose = vi.fn();
  const adminAuthContext = { 
    user: mockUsers.admin, 
    isAuthenticated: true, 
    isLoading: false, 
    error: undefined, 
    login: vi.fn(), 
    register: vi.fn(), 
    logout: vi.fn() 
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should not render when isOpen is false', () => {
    renderWithProviders(
      <ExportJSONModal isOpen={false} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    expect(screen.queryByText('Export Data as JSON')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    expect(screen.getByText('Export Data as JSON')).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Meal Plans')).toBeInTheDocument();
    expect(screen.getByText('Export All')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const closeButton = screen.getByRole('button', { name: /×/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('should call onClose when Close button is clicked', () => {
    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('should export recipes successfully', async () => {
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

    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const recipesCard = screen.getByText('Recipes').closest('div')?.parentElement;
    expect(recipesCard).toBeInTheDocument();
    
    if (recipesCard) {
      fireEvent.click(recipesCard);
    }

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/export?type=recipes',
        {
          headers: {
            Authorization: 'Bearer mock-token',
          },
        }
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export successful',
        description: 'recipes exported successfully',
      });
    });

    // Verify file download
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toContain('fitnessmealplanner-recipes-');
    expect(mockClick).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should export users successfully', async () => {
    const mockData = {
      users: [{ id: '1', email: 'test@example.com' }],
      usersCount: 1,
      exportDate: '2025-01-20T16:30:00.000Z',
      exportType: 'users',
      version: '1.0',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const usersCard = screen.getByText('Users').closest('div')?.parentElement;
    if (usersCard) {
      fireEvent.click(usersCard);
    }

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/export?type=users',
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        })
      );
    });
  });

  it('should export all data successfully', async () => {
    const mockData = {
      recipes: [{ id: '1', name: 'Test Recipe' }],
      recipesCount: 1,
      users: [{ id: '1', email: 'test@example.com' }],
      usersCount: 1,
      mealPlans: [{ id: '1', planName: 'Test Plan' }],
      mealPlansCount: 1,
      exportDate: '2025-01-20T16:30:00.000Z',
      exportType: 'all',
      version: '1.0',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const allCard = screen.getByText('Export All').closest('div')?.parentElement;
    if (allCard) {
      fireEvent.click(allCard);
    }

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/export?type=all',
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        })
      );
    });

    await waitFor(() => {
      expect(mockAnchor.download).toContain('fitnessmealplanner-all-');
    });
  });

  it('should handle export failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const recipesCard = screen.getByText('Recipes').closest('div')?.parentElement;
    if (recipesCard) {
      fireEvent.click(recipesCard);
    }

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    });
  });

  it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const recipesCard = screen.getByText('Recipes').closest('div')?.parentElement;
    if (recipesCard) {
      fireEvent.click(recipesCard);
    }

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export failed',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      });
    });
  });

  it('should disable interactions during export', async () => {
    // Mock a slow response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000)
      )
    );

    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const recipesCard = screen.getByText('Recipes').closest('div')?.parentElement;
    if (recipesCard) {
      fireEvent.click(recipesCard);
    }

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByTestId('loader2-icon')).toBeInTheDocument();
    }, { timeout: 100 });

    // Close button should be disabled
    const closeButton = screen.getByRole('button', { name: /×/i });
    expect(closeButton).toBeDisabled();
  });

  it('should show success checkmarks after export', async () => {
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

    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const recipesCard = screen.getByText('Recipes').closest('div')?.parentElement;
    if (recipesCard) {
      fireEvent.click(recipesCard);
    }

    await waitFor(() => {
      expect(screen.getByTestId('checkcircle-icon')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should auto-close modal after successful export', async () => {
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

    vi.useFakeTimers();

    renderWithProviders(
      <ExportJSONModal isOpen={true} onClose={mockOnClose} />,
      { authContextValue: adminAuthContext }
    );
    
    const recipesCard = screen.getByText('Recipes').closest('div')?.parentElement;
    if (recipesCard) {
      fireEvent.click(recipesCard);
    }

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });

    // Fast-forward time
    vi.advanceTimersByTime(1500);

    expect(mockOnClose).toHaveBeenCalled();
    
    vi.useRealTimers();
  });
});