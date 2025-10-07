import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import CustomerProfile from '../../client/src/pages/CustomerProfile';
import { AuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Mock dependencies
vi.mock('@/hooks/use-toast');
vi.mock('@/lib/queryClient');
vi.mock('../../client/src/components/ProfileImageUpload', () => ({
  default: ({ currentImage, onImageChange, onImageDelete }: any) => (
    <div data-testid="profile-image-upload">
      <button onClick={() => onImageChange('new-image.jpg')}>Change Image</button>
      <button onClick={onImageDelete}>Delete Image</button>
      {currentImage && <img src={currentImage} alt="Profile" />}
    </div>
  ),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  User: () => <span>UserIcon</span>,
  Mail: () => <span>MailIcon</span>,
  Phone: () => <span>PhoneIcon</span>,
  MapPin: () => <span>MapPinIcon</span>,
  Calendar: () => <span>CalendarIcon</span>,
  Activity: () => <span>ActivityIcon</span>,
  Target: () => <span>TargetIcon</span>,
  TrendingUp: () => <span>TrendingUpIcon</span>,
  Edit2: () => <span>Edit2Icon</span>,
  Save: () => <span>SaveIcon</span>,
  X: () => <span>XIcon</span>,
  Lock: () => <span>LockIcon</span>,
  Eye: () => <span>EyeIcon</span>,
  EyeOff: () => <span>EyeOffIcon</span>,
  ChefHat: () => <span>ChefHatIcon</span>,
  Utensils: () => <span>UtensilsIcon</span>,
  Heart: () => <span>HeartIcon</span>,
  AlertCircle: () => <span>AlertCircleIcon</span>,
}));

// Mock user data
const mockUser = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-1234',
  address: '123 Main St',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  dateOfBirth: '1990-01-01',
  gender: 'male',
  height: 180,
  currentWeight: 75,
  goalWeight: 70,
  activityLevel: 'moderate',
  profileImageUrl: 'profile.jpg',
  role: 'customer',
  trainer: {
    firstName: 'Jane',
    lastName: 'Smith',
  },
};

// Test utility to render with providers
const renderWithProviders = (component: React.ReactElement, authValue: any = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={authValue}>
          {component}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CustomerProfile Component', () => {
  const mockToast = vi.fn();
  const mockSignOut = vi.fn();
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    (apiRequest as any).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockUser }),
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render user profile after loading', async () => {
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      });
    });

    it('should display all main sections', async () => {
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByText(/Personal Information/i)).toBeInTheDocument();
        expect(screen.getByText(/Fitness Details/i)).toBeInTheDocument();
        expect(screen.getByText(/Account Settings/i)).toBeInTheDocument();
      });
    });

    it('should show BMI calculation', async () => {
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        const bmiElement = screen.getByText(/BMI:/i);
        expect(bmiElement).toBeInTheDocument();
      });
    });

    it('should display trainer information', async () => {
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode Functionality', () => {
    it('should enter edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit profile/i }));
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should pre-fill form with current user data in edit mode', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit profile/i }));
      
      const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      
      expect(firstNameInput.value).toBe('John');
      expect(emailInput.value).toBe('john.doe@example.com');
    });

    it('should cancel edit mode and restore original data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit profile/i }));
      
      const firstNameInput = screen.getByLabelText(/first name/i) as HTMLInputElement;
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form data when save is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit profile/i }));
      
      const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
      await user.clear(phoneInput);
      await user.type(phoneInput, '555-5678');
      
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      
      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          'PUT',
          '/api/profile',
          expect.objectContaining({
            phone: '555-5678',
          })
        );
      });
    });

    it('should show success toast on successful update', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit profile/i }));
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Success'),
          })
        );
      });
    });

    it('should show error toast on failed update', async () => {
      (apiRequest as any).mockRejectedValueOnce(new Error('Update failed'));
      
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit profile/i }));
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Password Change', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit profile/i }));
      
      const newPasswordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
      expect(newPasswordInput.type).toBe('password');
      
      const toggleButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('span')?.textContent === 'EyeIcon'
      );
      
      if (toggleButton) {
        await user.click(toggleButton);
        expect(newPasswordInput.type).toBe('text');
      }
    });

    it('should validate password confirmation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /edit profile/i }));
      
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(newPasswordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'DifferentPass123!');
      
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringContaining('passwords do not match'),
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 640px'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
    });

    it('should apply responsive classes for mobile view', async () => {
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        const container = screen.getByText(/Personal Information/i).closest('div');
        expect(container?.className).toContain('grid');
        expect(container?.className).toContain('sm:grid-cols-2');
      });
    });

    it('should stack sections vertically on mobile', async () => {
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        const sections = screen.getAllByText(/Personal Information|Fitness Details|Account Settings/i);
        sections.forEach(section => {
          const parent = section.closest('.space-y-6');
          expect(parent).toBeInTheDocument();
        });
      });
    });
  });

  describe('Profile Image Upload', () => {
    it('should handle image change', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('profile-image-upload')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Change Image'));
      
      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          'PUT',
          '/api/profile/image',
          expect.objectContaining({
            profileImageUrl: 'new-image.jpg',
          })
        );
      });
    });

    it('should handle image deletion', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByTestId('profile-image-upload')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Delete Image'));
      
      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          'DELETE',
          '/api/profile/image'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when profile fetch fails', async () => {
      (apiRequest as any).mockRejectedValueOnce(new Error('Network error'));
      
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByText(/error loading profile/i)).toBeInTheDocument();
      });
    });

    it('should handle missing user data gracefully', async () => {
      (apiRequest as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });
      
      renderWithProviders(<CustomerProfile />, { user: mockUser });
      
      await waitFor(() => {
        expect(screen.getByText(/no profile data/i)).toBeInTheDocument();
      });
    });
  });
});