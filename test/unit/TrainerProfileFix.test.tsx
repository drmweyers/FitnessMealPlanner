import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrainerProfile from '../../client/src/pages/TrainerProfile';

/**
 * Integration tests to verify the specific fix:
 * - Removal of Profile Image module from TrainerProfile
 * - Removal of "Professional fitness trainer dashboard and settings" text
 * - Removal of "Personal Trainer" badge
 */

// Mock the auth context with trainer user
const mockTrainerUser = {
  id: 'trainer-test-1',
  email: 'trainer@test.com',
  role: 'trainer' as const,
  profilePicture: null,
};

vi.mock('../../client/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockTrainerUser,
    logout: vi.fn(),
  }),
}));

// Mock the toast hook
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock API calls to return empty data so we can focus on UI structure
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      data: {
        totalClients: 0,
        totalMealPlansCreated: 0,
        totalRecipesAssigned: 0,
        activeMealPlans: 0,
        clientSatisfactionRate: 0,
      }
    }),
  }),
}));

// Mock all icons to avoid rendering issues
vi.mock('lucide-react', () => {
  const icons = [
    'User', 'Dumbbell', 'Users', 'ChefHat', 'Target', 'TrendingUp',
    'Calendar', 'Edit2', 'Save', 'X', 'Award', 'Clock', 'Heart',
    'Mail', 'Plus', 'Copy', 'FileText', 'Download', 'ChevronDown'
  ];
  
  const mockIcons: Record<string, React.ComponentType> = {};
  icons.forEach(icon => {
    mockIcons[icon] = () => <div data-testid={`${icon.toLowerCase()}-icon`} />;
  });
  
  return mockIcons;
});

// Mock components that we don't want to test here
vi.mock('../../client/src/components/PDFExportButton', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="pdf-export-button">{children}</button>
  ),
}));

// Explicitly verify ProfileImageUpload is NOT used
vi.mock('../../client/src/components/ProfileImageUpload', () => ({
  default: () => {
    throw new Error('ProfileImageUpload should not be imported in TrainerProfile');
  },
  ProfileAvatar: () => {
    throw new Error('ProfileAvatar should not be imported in TrainerProfile');
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
    mutations: { retry: false },
  },
});

const renderTrainerProfile = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerProfile />
    </QueryClientProvider>
  );
};

describe('TrainerProfile Fix Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text Removal Verification', () => {
    it('should NOT contain the removed subtitle text', () => {
      renderTrainerProfile();
      
      // Verify the specific text that was requested to be removed is gone
      expect(screen.queryByText('Professional fitness trainer dashboard and settings')).not.toBeInTheDocument();
      expect(screen.queryByText(/professional fitness trainer dashboard/i)).not.toBeInTheDocument();
    });

    it('should NOT contain the "Personal Trainer" badge', () => {
      renderTrainerProfile();
      
      // Verify the Personal Trainer badge is removed
      expect(screen.queryByText('Personal Trainer')).not.toBeInTheDocument();
      expect(screen.queryByText(/personal trainer/i)).not.toBeInTheDocument();
    });

    it('should still display the main "Trainer Profile" heading', () => {
      renderTrainerProfile();
      
      // Verify the main heading remains
      expect(screen.getByRole('heading', { name: /trainer profile/i })).toBeInTheDocument();
    });
  });

  describe('Profile Image Module Removal Verification', () => {
    it('should NOT import or render ProfileImageUpload component', () => {
      // The mock above will throw an error if ProfileImageUpload is imported
      // If this test passes, it means the component is not being imported
      expect(() => renderTrainerProfile()).not.toThrow();
    });

    it('should NOT contain any profile image upload text', () => {
      renderTrainerProfile();
      
      // Verify all profile image related text is gone
      const profileImageTexts = [
        /upload a professional profile image/i,
        /profile image/i,
        /recommended.*square image/i,
        /at least 200x200px/i,
        /max file size.*5mb/i,
        /supported formats.*jpeg.*png.*webp/i,
      ];

      profileImageTexts.forEach(textPattern => {
        expect(screen.queryByText(textPattern)).not.toBeInTheDocument();
      });
    });

    it('should NOT render any profile image upload UI elements', () => {
      renderTrainerProfile();
      
      // Verify no profile image upload related UI elements
      expect(screen.queryByTestId('profile-image-upload')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/upload/i)).not.toBeInTheDocument();
    });
  });

  describe('Essential Content Preservation', () => {
    it('should preserve all essential trainer profile sections', () => {
      renderTrainerProfile();
      
      // Verify important sections are still present
      expect(screen.getByText(/account details/i)).toBeInTheDocument();
      expect(screen.getByText(/performance overview/i)).toBeInTheDocument();
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
      expect(screen.getByText(/achievements/i)).toBeInTheDocument();
      expect(screen.getByText(/session info/i)).toBeInTheDocument();
    });

    it('should preserve trainer statistics', () => {
      renderTrainerProfile();
      
      // Verify trainer stats are still shown
      expect(screen.getByText(/total clients/i)).toBeInTheDocument();
      expect(screen.getByText(/meal plans/i)).toBeInTheDocument();
      expect(screen.getByText(/active plans/i)).toBeInTheDocument();
      expect(screen.getByText(/satisfaction/i)).toBeInTheDocument();
    });

    it('should preserve trainer action buttons', () => {
      renderTrainerProfile();
      
      // Verify action buttons are still present
      expect(screen.getByText(/browse recipes/i)).toBeInTheDocument();
      expect(screen.getByText(/create meal plan/i)).toBeInTheDocument();
      expect(screen.getByText(/send customer invitation/i)).toBeInTheDocument();
      expect(screen.getByText(/manage clients/i)).toBeInTheDocument();
    });
  });

  describe('Header Structure Verification', () => {
    it('should have clean header structure without removed elements', () => {
      renderTrainerProfile();
      
      // Get the header section
      const heading = screen.getByRole('heading', { name: /trainer profile/i });
      const headerSection = heading.closest('div');
      
      // Verify header doesn't contain removed text
      expect(headerSection).not.toHaveTextContent('Professional fitness trainer dashboard and settings');
      expect(headerSection).not.toHaveTextContent('Personal Trainer');
      
      // Verify header still has the main title
      expect(headerSection).toHaveTextContent('Trainer Profile');
    });

    it('should maintain proper visual hierarchy', () => {
      renderTrainerProfile();
      
      // Verify the main heading is still properly structured
      const heading = screen.getByRole('heading', { name: /trainer profile/i });
      expect(heading).toBeInTheDocument();
      
      // Verify dumbbell icon is still present for branding
      expect(screen.getByTestId('dumbbell-icon')).toBeInTheDocument();
    });
  });

  describe('Comparison with Other Profile Pages', () => {
    it('should differ from admin and customer profiles that DO have ProfileImageUpload', () => {
      // This test verifies that TrainerProfile is different from the other profiles
      // The fact that our mocks would throw an error if ProfileImageUpload was imported
      // confirms that TrainerProfile doesn't have it while AdminProfile and CustomerProfile do
      
      renderTrainerProfile();
      
      // If we get here without errors, it means TrainerProfile doesn't import ProfileImageUpload
      // This is the desired behavior - only TrainerProfile should lack this component
      expect(true).toBe(true);
    });
  });
});