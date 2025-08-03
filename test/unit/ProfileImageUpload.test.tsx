import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfileImageUpload, { ProfileAvatar } from '../../client/src/components/ProfileImageUpload';
import { apiRequest } from '../../client/src/lib/queryClient';
import { useToast } from '../../client/src/hooks/use-toast';

// Mock dependencies
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Camera: () => <div data-testid="camera-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}));

const mockApiRequest = vi.mocked(apiRequest);
const mockToast = vi.fn();
const mockUseToast = vi.mocked(useToast);

describe('ProfileImageUpload Component', () => {
  let queryClient: QueryClient;
  const mockOnImageUpdate = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    mockUseToast.mockReturnValue({ toast: mockToast });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      currentImageUrl: null,
      userEmail: 'test@example.com',
      size: 'lg' as const,
      onImageUpdate: mockOnImageUpdate,
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ProfileImageUpload {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Initial Render', () => {
    it('should render with user initials when no image is provided', () => {
      renderComponent();
      
      // Should show user initials
      expect(screen.getByText('TE')).toBeInTheDocument();
    });

    it('should render with existing image when provided', () => {
      renderComponent({ currentImageUrl: 'https://example.com/image.jpg' });
      
      // Should have image src
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should render upload button', () => {
      renderComponent();
      
      expect(screen.getByTestId('upload-icon')).toBeInTheDocument();
    });

    it('should render delete button when image exists', () => {
      renderComponent({ currentImageUrl: 'https://example.com/image.jpg' });
      
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('should not render delete button when no image exists', () => {
      renderComponent();
      
      expect(screen.queryByTestId('trash-icon')).not.toBeInTheDocument();
    });
  });

  describe('File Upload Functionality', () => {
    it('should handle successful image upload', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { profileImageUrl: 'https://example.com/new-image.jpg' }
        }),
      } as any);

      renderComponent();

      // Create a test file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('POST', '/api/profile/upload-image', expect.any(FormData));
      });

      await waitFor(() => {
        expect(mockOnImageUpdate).toHaveBeenCalledWith('https://example.com/new-image.jpg');
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Profile Image Updated',
        description: 'Your profile image has been successfully updated.',
      });
    });

    it('should handle upload error', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Upload failed' }),
      } as any);

      renderComponent();

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Upload Failed',
          description: 'Upload failed',
          variant: 'destructive',
        });
      });
    });

    it('should validate file type', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Create an invalid file type
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByRole('button', { name: /upload new image/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Invalid File Type',
        description: 'Please select a JPEG, PNG, or WebP image.',
        variant: 'destructive',
      });

      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('should validate file size', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, largeFile);
      }

      expect(mockToast).toHaveBeenCalledWith({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });

      expect(mockApiRequest).not.toHaveBeenCalled();
    });
  });

  describe('Image Deletion', () => {
    it('should handle successful image deletion', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as any);

      renderComponent({ currentImageUrl: 'https://example.com/image.jpg' });

      const deleteButton = screen.getByRole('button', { name: /remove image/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('DELETE', '/api/profile/delete-image');
      });

      await waitFor(() => {
        expect(mockOnImageUpdate).toHaveBeenCalledWith(null);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Profile Image Removed',
        description: 'Your profile image has been removed.',
      });
    });

    it('should handle deletion error', async () => {
      const user = userEvent.setup();
      mockApiRequest.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Delete failed' }),
      } as any);

      renderComponent({ currentImageUrl: 'https://example.com/image.jpg' });

      const deleteButton = screen.getByRole('button', { name: /remove image/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Delete Failed',
          description: 'Delete failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during upload', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockApiRequest.mockReturnValue(uploadPromise as any);

      renderComponent();

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }

      // Should show loading state
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ data: { profileImageUrl: 'test.jpg' } }),
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('should disable buttons during loading', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockApiRequest.mockReturnValue(uploadPromise as any);

      renderComponent({ currentImageUrl: 'https://example.com/image.jpg' });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }

      // Buttons should be disabled
      expect(screen.getByRole('button', { name: /upload new image/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /remove image/i })).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ data: { profileImageUrl: 'test.jpg' } }),
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload new image/i })).not.toBeDisabled();
      });
    });
  });

  describe('Size Variants', () => {
    it('should apply correct size classes', () => {
      const { rerender } = renderComponent({ size: 'sm' });
      expect(screen.getByRole('img').parentElement).toHaveClass('w-12', 'h-12');

      rerender(
        <QueryClientProvider client={queryClient}>
          <ProfileImageUpload
            currentImageUrl={null}
            userEmail="test@example.com"
            size="xl"
            onImageUpdate={mockOnImageUpdate}
          />
        </QueryClientProvider>
      );
      expect(screen.getByRole('img').parentElement).toHaveClass('w-32', 'h-32');
    });
  });

  describe('User Initials Generation', () => {
    it('should generate correct initials from email', () => {
      renderComponent({ userEmail: 'john.doe@example.com' });
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should handle single name emails', () => {
      renderComponent({ userEmail: 'john@example.com' });
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should handle complex email formats', () => {
      renderComponent({ userEmail: 'first.middle.last@example.com' });
      expect(screen.getByText('FML')).toBeInTheDocument();
    });
  });
});

describe('ProfileAvatar Component', () => {
  const renderProfileAvatar = (props = {}) => {
    const defaultProps = {
      imageUrl: null,
      userEmail: 'test@example.com',
      size: 'md' as const,
      ...props,
    };

    return render(<ProfileAvatar {...defaultProps} />);
  };

  it('should render with image when provided', () => {
    renderProfileAvatar({ imageUrl: 'https://example.com/image.jpg' });
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should render with initials when no image provided', () => {
    renderProfileAvatar({ userEmail: 'john.doe@example.com' });
    
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    renderProfileAvatar({ size: 'lg' });
    
    expect(screen.getByRole('img').parentElement).toHaveClass('w-24', 'h-24');
  });

  it('should apply custom className', () => {
    renderProfileAvatar({ className: 'custom-class' });
    
    expect(screen.getByRole('img').parentElement).toHaveClass('custom-class');
  });
});

describe('Accessibility', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockUseToast.mockReturnValue({ toast: mockToast });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      currentImageUrl: null,
      userEmail: 'test@example.com',
      size: 'lg' as const,
      onImageUpdate: vi.fn(),
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ProfileImageUpload {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it('should have proper ARIA labels and roles', () => {
    renderComponent();
    
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Profile');
    expect(screen.getByRole('button', { name: /upload new image/i })).toBeInTheDocument();
  });

  it('should have proper title attributes for tooltips', () => {
    renderComponent({ currentImageUrl: 'https://example.com/image.jpg' });
    
    expect(screen.getByRole('button', { name: /upload new image/i })).toHaveAttribute('title', 'Upload new image');
    expect(screen.getByRole('button', { name: /remove image/i })).toHaveAttribute('title', 'Remove image');
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const uploadButton = screen.getByRole('button', { name: /upload new image/i });
    
    // Should be focusable
    await user.tab();
    expect(uploadButton).toHaveFocus();
    
    // Should be activatable with Enter
    await user.keyboard('{Enter}');
    // File input should be triggered (though we can't easily test file selection in jsdom)
  });
});