import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrainerProfile from '../../client/src/pages/TrainerProfile';

/**
 * FUNCTIONAL TEST - Actually renders TrainerProfile and verifies what's displayed
 * This test will tell us exactly what text is being rendered in the DOM
 */

// Mock the auth context with a trainer user
vi.mock('../../client/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'trainer-test-123',
      email: 'trainer@test.com',
      role: 'trainer',
      profilePicture: null,
    },
    logout: vi.fn(),
  }),
}));

// Mock the toast hook
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock all icons to simple divs to avoid rendering issues
vi.mock('lucide-react', () => {
  const iconNames = [
    'User', 'Dumbbell', 'Users', 'ChefHat', 'Target', 'TrendingUp',
    'Calendar', 'Edit2', 'Save', 'X', 'Award', 'Clock', 'Heart',
    'Mail', 'Plus', 'Copy', 'FileText', 'Download', 'ChevronDown'
  ];
  
  const mockIcons: Record<string, React.ComponentType> = {};
  iconNames.forEach(name => {
    mockIcons[name] = ({ className }: { className?: string }) => (
      <div data-testid={`${name.toLowerCase()}-icon`} className={className}>
        {name}
      </div>
    );
  });
  
  return mockIcons;
});

// Mock API calls with realistic data
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn().mockImplementation((method, url) => {
    if (url.includes('/stats')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          totalClients: 5,
          totalMealPlansCreated: 12,
          totalRecipesAssigned: 25,
          activeMealPlans: 8,
          clientSatisfactionRate: 95,
        }),
      });
    }
    if (url.includes('/profile')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'trainer-test-123',
          email: 'trainer@test.com',
          role: 'trainer',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastLoginAt: '2024-08-05T12:00:00.000Z',
          bio: 'Test trainer bio',
          specializations: ['Weight Loss', 'Strength Training'],
          certifications: ['NASM-CPT', 'ACE'],
          yearsExperience: 5,
          profilePicture: null,
        }),
      });
    }
    if (url.includes('/invitations')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { invitations: [] } }),
      });
    }
    if (url.includes('/customers')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ customers: [] }),
      });
    }
    
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  }),
}));

// Mock other components that might cause issues
vi.mock('../../client/src/components/PDFExportButton', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="pdf-export-button">{children}</button>
  ),
}));

// Critical: Make sure ProfileImageUpload throws error if imported
vi.mock('../../client/src/components/ProfileImageUpload', () => ({
  default: () => {
    throw new Error('CRITICAL: ProfileImageUpload should NOT be imported in TrainerProfile!');
  },
  ProfileAvatar: () => {
    throw new Error('CRITICAL: ProfileAvatar should NOT be imported in TrainerProfile!');
  },
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    },
    mutations: {
      retry: false,
    },
  },
});

const renderTrainerProfile = () => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <TrainerProfile />
    </QueryClientProvider>
  );
};

describe('🔍 FUNCTIONAL TEST: TrainerProfile DOM Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('🎯 CRITICAL: Header Text Analysis', () => {
    it('should render ONLY "Trainer Profile" in header - NO subtitle', async () => {
      renderTrainerProfile();
      
      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getByText('Trainer Profile')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Get the entire rendered HTML to analyze
      const container = screen.getByText('Trainer Profile').closest('div');
      const headerHTML = container?.innerHTML || '';
      
      console.log('🔍 HEADER HTML ANALYSIS:');
      console.log('='.repeat(60));
      console.log(headerHTML);
      console.log('='.repeat(60));
      
      // CRITICAL CHECKS - These should all PASS
      expect(screen.queryByText('Professional fitness trainer dashboard and settings')).not.toBeInTheDocument();
      expect(screen.queryByText(/professional fitness trainer dashboard/i)).not.toBeInTheDocument();
      
      // Verify main title exists
      expect(screen.getByText('Trainer Profile')).toBeInTheDocument();
    });

    it('should NOT render "Personal Trainer" badge anywhere', async () => {
      renderTrainerProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Trainer Profile')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Get full page content
      const body = document.body;
      const fullHTML = body.innerHTML;
      
      console.log('🔍 FULL PAGE BADGE ANALYSIS:');
      console.log('Searching for "Personal Trainer" in rendered DOM...');
      
      // CRITICAL: Should NOT find "Personal Trainer" anywhere
      expect(screen.queryByText('Personal Trainer')).not.toBeInTheDocument();
      expect(screen.queryByText(/personal trainer/i)).not.toBeInTheDocument();
      
      // Double-check by searching HTML directly
      expect(fullHTML).not.toContain('Personal Trainer');
      
      console.log('✅ Badge verification: PASSED - No "Personal Trainer" badge found');
    });
  });

  describe('🚫 PROFILE IMAGE MODULE VERIFICATION', () => {
    it('should NOT render any profile image upload content', async () => {
      // This test will fail if ProfileImageUpload is imported due to our mock
      expect(() => renderTrainerProfile()).not.toThrow();
      
      await waitFor(() => {
        expect(screen.getByText('Trainer Profile')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Check for profile image related text
      const profileImageTexts = [
        'Profile Image',
        'Upload a professional profile image',
        'Recommended: Square image',
        'Max file size: 5MB',
        'Supported formats: JPEG, PNG, WebP',
      ];
      
      profileImageTexts.forEach(text => {
        expect(screen.queryByText(text)).not.toBeInTheDocument();
        expect(screen.queryByText(new RegExp(text, 'i'))).not.toBeInTheDocument();
      });
      
      console.log('✅ Profile Image verification: PASSED - No profile image content found');
    });
  });

  describe('✅ ESSENTIAL CONTENT PRESERVATION', () => {
    it('should still render essential trainer profile sections', async () => {
      renderTrainerProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Trainer Profile')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Wait a bit more for all content to load
      await waitFor(() => {
        expect(screen.getByText('Account Details')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Verify essential sections are present
      expect(screen.getByText('Account Details')).toBeInTheDocument();
      expect(screen.getByText('Performance Overview')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      
      console.log('✅ Essential content verification: PASSED');
    });
  });

  describe('🔬 DEEP DOM ANALYSIS', () => {
    it('should analyze the complete rendered DOM structure', async () => {
      const { container } = renderTrainerProfile();
      
      await waitFor(() => {
        expect(screen.getByText('Trainer Profile')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      // Get the complete HTML of the rendered component
      const fullHTML = container.innerHTML;
      
      console.log('🔬 COMPLETE DOM ANALYSIS:');
      console.log('Length of rendered HTML:', fullHTML.length);
      console.log('Contains "Trainer Profile":', fullHTML.includes('Trainer Profile'));
      console.log('Contains "Professional fitness":', fullHTML.includes('Professional fitness'));
      console.log('Contains "Personal Trainer":', fullHTML.includes('Personal Trainer'));
      console.log('Contains "Profile Image":', fullHTML.includes('Profile Image'));
      
      // Final assertions based on DOM analysis
      expect(fullHTML).toContain('Trainer Profile');
      expect(fullHTML).not.toContain('Professional fitness trainer dashboard and settings');
      expect(fullHTML).not.toContain('Personal Trainer');
      expect(fullHTML).not.toContain('Profile Image');
      
      console.log('✅ DOM Analysis: All checks PASSED');
    });
  });
});