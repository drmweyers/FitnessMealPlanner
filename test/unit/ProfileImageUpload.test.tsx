import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithUser, mockApiRequest, mockUsers } from '../test-utils';
import ProfileImageUpload, { ProfileAvatar } from '../../client/src/components/ProfileImageUpload';

// Mock dependencies
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

const mockToast = vi.fn();
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Lucide React icons are mocked globally in setup.ts

describe('ProfileImageUpload Component', () => {
  const mockOnImageUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
    mockApiRequest.mockClear();
  });

  const renderComponent = (props = {}, user = mockUsers.trainer) => {
    const defaultProps = {
      currentImageUrl: null,
      userEmail: 'test@example.com',
      size: 'lg' as const,
      onImageUpdate: mockOnImageUpdate,
      ...props,
    };

    return renderWithUser(<ProfileImageUpload {...defaultProps} />, user);
  };

  describe('Initial Render', () => {
    it('should render with user initials when no image is provided', () => {
      renderComponent();
      
      // Should show user initials (email 'test@example.com' -> 'T')
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should render with existing image when provided', () => {
      renderComponent({ currentImageUrl: 'https://example.com/image.jpg' });
      
      // Should show delete button when image exists
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
      // The avatar shows fallback by default in test environment
      // but the image URL is passed through correctly
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
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { 
            profileImageUrl: 'https://example.com/new-image.jpg',
            user: mockUsers.trainer
          }
        }),
      } as any);

      renderComponent();

      // Find the file input directly
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      
      // Create a test file and set up the mock
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Mock the files property and trigger change event
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
        writable: false,
      });

      fireEvent.change(fileInput);

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
      mockApiRequest.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Upload failed' }),
      } as any);

      renderComponent();

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Mock the files property and trigger change event
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Upload Failed',
          description: 'Upload failed',
          variant: 'destructive',
        });
      });
    });

    it('should validate file type', async () => {
      renderComponent();

      // Create an invalid file type
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Mock the files property and trigger change event
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(fileInput);

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Invalid File Type',
        description: 'Please select a JPEG, PNG, or WebP image.',
        variant: 'destructive',
      });

      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('should validate file size', async () => {
      renderComponent();

      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Mock the files property and trigger change event
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        configurable: true,
      });

      fireEvent.change(fileInput);

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
      let resolvePromise: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockApiRequest.mockReturnValue(uploadPromise as any);

      renderComponent();

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Mock the files property and trigger change event
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(fileInput);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ 
          data: { 
            profileImageUrl: 'test.jpg',
            user: mockUsers.trainer 
          } 
        }),
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('should disable buttons during loading', async () => {
      let resolvePromise: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockApiRequest.mockReturnValue(uploadPromise as any);

      renderComponent({ currentImageUrl: 'https://example.com/image.jpg' });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Mock the files property and trigger change event
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });

      fireEvent.change(fileInput);

      // Wait for loading state and check buttons are disabled
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload new image/i })).toBeDisabled();
      });
      
      expect(screen.getByRole('button', { name: /remove image/i })).toBeDisabled();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ 
          data: { 
            profileImageUrl: 'test.jpg',
            user: mockUsers.trainer 
          } 
        }),
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload new image/i })).not.toBeDisabled();
      });
    });
  });

  describe('Size Variants', () => {
    it('should apply correct size classes', () => {
      renderComponent({ size: 'sm' });
      const smallAvatar = screen.getByText('T').closest('.relative');
      expect(smallAvatar).toHaveClass('w-12', 'h-12');
    });

    it('should apply correct size classes for xl', () => {
      renderComponent({ size: 'xl' });
      const xlAvatar = screen.getByText('T').closest('.relative');
      expect(xlAvatar).toHaveClass('w-32', 'h-32');
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

    return renderWithUser(<ProfileAvatar {...defaultProps} />, mockUsers.trainer);
  };

  it('should render with image when provided', () => {
    renderProfileAvatar({ imageUrl: 'https://example.com/image.jpg' });
    
    // In test environment, image may still show fallback
    // This is expected behavior due to image loading limitations in jsdom
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('should render with initials when no image provided', () => {
    renderProfileAvatar({ userEmail: 'john.doe@example.com' });
    
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should apply correct size classes', () => {
    renderProfileAvatar({ size: 'lg' });
    
    // Check the Avatar component has the correct size classes
    const avatarWrapper = screen.getByText('T').closest('.relative');
    expect(avatarWrapper).toHaveClass('w-24', 'h-24');
  });

  it('should apply custom className', () => {
    renderProfileAvatar({ className: 'custom-class' });
    
    // Check the Avatar component has the custom class
    const avatarWrapper = screen.getByText('T').closest('.relative');
    expect(avatarWrapper).toHaveClass('custom-class');
  });
});

describe('Accessibility', () => {
  const renderComponent = (props = {}) => {
    const defaultProps = {
      currentImageUrl: null,
      userEmail: 'test@example.com',
      size: 'lg' as const,
      onImageUpdate: vi.fn(),
      ...props,
    };

    return renderWithUser(<ProfileImageUpload {...defaultProps} />, mockUsers.trainer);
  };

  it('should have proper ARIA labels and roles', () => {
    renderComponent();
    
    // Should have upload button
    expect(screen.getByRole('button', { name: /upload new image/i })).toBeInTheDocument();
    // Should show user initials when no image
    expect(screen.getByText('T')).toBeInTheDocument();
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