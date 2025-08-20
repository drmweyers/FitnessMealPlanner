import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../../client/src/contexts/AuthContext';
import ProfileImageUpload from '../../client/src/components/ProfileImageUpload';
import { ProfileAvatar } from '../../client/src/components/ProfileImageUpload';
import Layout from '../../client/src/components/Layout';

// Mock the API
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Lucide React icons are mocked globally in setup.ts

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/profile', mockSetLocation],
}));

describe('Profile Image Integration Tests', () => {
  let queryClient: QueryClient;
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'customer' as const,
    profilePicture: null,
  };

  const mockAuthContext = {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    error: undefined,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    vi.clearAllMocks();
    
    // Get the mocked function from the module
    const { apiRequest } = await import('../../client/src/lib/queryClient');
    vi.mocked(apiRequest).mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <QueryClientProvider client={queryClient}>
          {component}
        </QueryClientProvider>
      </AuthContext.Provider>
    );
  };

  describe('Complete Upload Workflow', () => {
    it('should complete full upload workflow with optimistic updates', async () => {
      const user = userEvent.setup();
      const onImageUpdate = vi.fn();
      const { apiRequest } = await import('../../client/src/lib/queryClient');
      const mockApiRequest = vi.mocked(apiRequest);

      // Mock successful upload
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            profileImageUrl: 'https://example.com/new-image.jpg',
            user: { ...mockUser, profilePicture: 'https://example.com/new-image.jpg' }
          }
        }),
      });

      renderWithProviders(
        <ProfileImageUpload
          currentImageUrl={null}
          userEmail="test@example.com"
          size="lg"
          onImageUpdate={onImageUpdate}
        />
      );

      // Initial state - should show initials
      expect(screen.getByText('TE')).toBeInTheDocument();

      // Upload a file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i })
        .parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      });

      // Wait for upload to complete
      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/profile/upload-image',
          expect.any(FormData)
        );
      });

      // Should call onImageUpdate with new URL
      await waitFor(() => {
        expect(onImageUpdate).toHaveBeenCalledWith('https://example.com/new-image.jpg');
      });

      // Should show success toast
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Profile Image Updated',
        description: 'Your profile image has been successfully updated.',
      });
    });

    it('should handle upload error and maintain previous state', async () => {
      const user = userEvent.setup();
      const onImageUpdate = vi.fn();

      // Mock failed upload
      mockApiRequest.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Upload failed' }),
      });

      renderWithProviders(
        <ProfileImageUpload
          currentImageUrl={null}
          userEmail="test@example.com"
          size="lg"
          onImageUpdate={onImageUpdate}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i })
        .parentElement?.querySelector('input[type="file"]');
      
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

      // Should not call onImageUpdate
      expect(onImageUpdate).not.toHaveBeenCalled();

      // Should still show initials
      expect(screen.getByText('TE')).toBeInTheDocument();
    });
  });

  describe('Complete Deletion Workflow', () => {
    it('should complete full deletion workflow', async () => {
      const user = userEvent.setup();
      const onImageUpdate = vi.fn();

      // Mock successful deletion
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: { ...mockUser, profilePicture: null }
          }
        }),
      });

      renderWithProviders(
        <ProfileImageUpload
          currentImageUrl="https://example.com/existing-image.jpg"
          userEmail="test@example.com"
          size="lg"
          onImageUpdate={onImageUpdate}
        />
      );

      // Should show existing image
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://example.com/existing-image.jpg');

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /remove image/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith('DELETE', '/api/profile/delete-image');
      });

      // Should call onImageUpdate with null
      await waitFor(() => {
        expect(onImageUpdate).toHaveBeenCalledWith(null);
      });

      // Should show success toast
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Profile Image Removed',
        description: 'Your profile image has been removed.',
      });
    });
  });

  describe('Header Integration', () => {
    it('should update header avatar when image changes', () => {
      const userWithImage = {
        ...mockUser,
        profilePicture: 'https://example.com/image.jpg'
      };

      const contextWithImage = {
        ...mockAuthContext,
        user: userWithImage,
      };

      render(
        <AuthContext.Provider value={contextWithImage}>
          <QueryClientProvider client={queryClient}>
            <Layout>
              <div>Test content</div>
            </Layout>
          </QueryClientProvider>
        </AuthContext.Provider>
      );

      // Should render ProfileAvatar in header
      const headerImage = screen.getByRole('img');
      expect(headerImage).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should show initials in header when no image', () => {
      render(
        <AuthContext.Provider value={mockAuthContext}>
          <QueryClientProvider client={queryClient}>
            <Layout>
              <div>Test content</div>
            </Layout>
          </QueryClientProvider>
        </AuthContext.Provider>
      );

      // Should show user initials
      expect(screen.getByText('TE')).toBeInTheDocument();
    });
  });

  describe('Different User Roles', () => {
    it('should work for admin users', async () => {
      const adminUser = {
        ...mockUser,
        role: 'admin' as const,
        email: 'admin@example.com'
      };

      const adminContext = {
        ...mockAuthContext,
        user: adminUser,
      };

      render(
        <AuthContext.Provider value={adminContext}>
          <QueryClientProvider client={queryClient}>
            <ProfileImageUpload
              currentImageUrl={null}
              userEmail="admin@example.com"
              size="lg"
              onImageUpdate={vi.fn()}
            />
          </QueryClientProvider>
        </AuthContext.Provider>
      );

      // Should show admin initials
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should work for trainer users', async () => {
      const trainerUser = {
        ...mockUser,
        role: 'trainer' as const,
        email: 'trainer@example.com'
      };

      const trainerContext = {
        ...mockAuthContext,
        user: trainerUser,
      };

      render(
        <AuthContext.Provider value={trainerContext}>
          <QueryClientProvider client={queryClient}>
            <ProfileImageUpload
              currentImageUrl={null}
              userEmail="trainer@example.com"
              size="lg"
              onImageUpdate={vi.fn()}
            />
          </QueryClientProvider>
        </AuthContext.Provider>
      );

      // Should show trainer initials
      expect(screen.getByText('T')).toBeInTheDocument();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate relevant queries after upload', async () => {
      const user = userEvent.setup();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { profileImageUrl: 'https://example.com/new-image.jpg' }
        }),
      });

      renderWithProviders(
        <ProfileImageUpload
          currentImageUrl={null}
          userEmail="test@example.com"
          size="lg"
          onImageUpdate={vi.fn()}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i })
        .parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['user'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
      });
    });

    it('should invalidate relevant queries after deletion', async () => {
      const user = userEvent.setup();
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { user: { ...mockUser, profilePicture: null } }
        }),
      });

      renderWithProviders(
        <ProfileImageUpload
          currentImageUrl="https://example.com/image.jpg"
          userEmail="test@example.com"
          size="lg"
          onImageUpdate={vi.fn()}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /remove image/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['user'] });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockApiRequest.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <ProfileImageUpload
          currentImageUrl={null}
          userEmail="test@example.com"
          size="lg"
          onImageUpdate={vi.fn()}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i })
        .parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Upload Failed',
          description: 'Network error',
          variant: 'destructive',
        });
      });
    });

    it('should handle malformed API responses', async () => {
      const user = userEvent.setup();
      
      mockApiRequest.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      });

      renderWithProviders(
        <ProfileImageUpload
          currentImageUrl={null}
          userEmail="test@example.com"
          size="lg"
          onImageUpdate={vi.fn()}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload new image/i })
        .parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Profile Image Updated',
          description: 'Your profile image has been successfully updated.',
        });
      });
    });
  });
});