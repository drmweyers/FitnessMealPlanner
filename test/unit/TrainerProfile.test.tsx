import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithUser, mockUsers, mockApiRequest } from '../test-utils';
import TrainerProfile from '../../client/src/pages/TrainerProfile';

// Mock API request
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

// Mock the toast hook
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock all Lucide React icons
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
  Dumbbell: () => <div data-testid="dumbbell-icon" />,
  Users: () => <div data-testid="users-icon" />,
  ChefHat: () => <div data-testid="chef-hat-icon" />,
  Target: () => <div data-testid="target-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Edit2: () => <div data-testid="edit-icon" />,
  Save: () => <div data-testid="save-icon" />,
  X: () => <div data-testid="x-icon" />,
  Award: () => <div data-testid="award-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Download: () => <div data-testid="download-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
}));

// Mock API request utility
vi.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock PDFExportButton component
vi.mock('../../client/src/components/PDFExportButton', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="pdf-export-button">{children}</button>
  ),
}));

// Mock ProfileImageUpload component to ensure it's not imported
vi.mock('../../client/src/components/ProfileImageUpload', () => ({
  default: () => <div data-testid="profile-image-upload" />,
  ProfileAvatar: () => <div data-testid="profile-avatar" />,
}));

const renderTrainerProfile = () => {
  // Mock API responses that TrainerProfile component needs
  mockApiRequest.mockImplementation((method: string, url: string) => {
    if (url === '/api/trainer/profile/stats') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          totalClients: 5,
          totalMealPlansCreated: 15,
          totalRecipesAssigned: 45,
          activeMealPlans: 8,
          clientSatisfactionRate: 92,
        }),
      });
    }
    
    if (url === '/api/profile') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'trainer-1',
          email: 'trainer@example.com',
          role: 'trainer',
          createdAt: '2024-01-01',
          specializations: ['weight-loss', 'strength-training'],
          bio: 'Professional fitness trainer',
        }),
      });
    }
    
    if (url === '/api/trainer/customers') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          customers: [
            { id: '1', name: 'John Doe', email: 'john@example.com' },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
          ]
        }),
      });
    }
    
    // Default empty response for other API calls
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  // Mock fetch for invitations endpoint
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url === '/api/invitations') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });
  
  return renderWithUser(<TrainerProfile />, mockUsers.trainer);
};

describe('TrainerProfile Component - Text Removal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display only the "Trainer Profile" title without subtitle', async () => {
    renderTrainerProfile();
    
    // Wait for loading to complete
    await screen.findByText(/total clients/i, {}, { timeout: 3000 });
    
    // Should show the main title
    expect(screen.getByRole('heading', { name: /trainer profile/i })).toBeInTheDocument();
    
    // Should NOT show the removed subtitle text
    expect(screen.queryByText(/professional fitness trainer dashboard and settings/i)).not.toBeInTheDocument();
  });

  it('should not display the "Personal Trainer" badge', () => {
    renderTrainerProfile();
    
    // Should NOT show the removed badge text
    expect(screen.queryByText(/personal trainer/i)).not.toBeInTheDocument();
  });

  it('should not display any Profile Image upload section text', () => {
    renderTrainerProfile();
    
    // Should NOT show profile image related text
    expect(screen.queryByText(/profile image/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/upload a professional profile image/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recommended.*square image/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/max file size.*5mb/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/supported formats.*jpeg.*png.*webp/i)).not.toBeInTheDocument();
  });

  it('should not import or render ProfileImageUpload component', () => {
    renderTrainerProfile();
    
    // Should NOT show the ProfileImageUpload component
    expect(screen.queryByTestId('profile-image-upload')).not.toBeInTheDocument();
  });

  it('should still show essential trainer profile content', () => {
    renderTrainerProfile();
    
    // Should still show important sections
    expect(screen.getByText(/account details/i)).toBeInTheDocument();
    expect(screen.getByText(/performance overview/i)).toBeInTheDocument();
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
  });

  it('should maintain correct header structure without removed elements', () => {
    renderTrainerProfile();
    
    // Check that header exists with dumbbell icon but without subtitle
    expect(screen.getByTestId('dumbbell-icon')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /trainer profile/i })).toBeInTheDocument();
    
    // Verify the structure is clean (no dangling paragraphs with removed text)
    const headerSection = screen.getByRole('heading', { name: /trainer profile/i }).closest('div');
    expect(headerSection).not.toHaveTextContent('Professional fitness trainer dashboard and settings');
  });
});

describe('TrainerProfile Component - Content Verification', () => {
  it('should show trainer-specific statistics', () => {
    renderTrainerProfile();
    
    // Should show trainer-related statistics sections
    expect(screen.getByText(/total clients/i)).toBeInTheDocument();
    expect(screen.getByText(/meal plans/i)).toBeInTheDocument();
    expect(screen.getByText(/active plans/i)).toBeInTheDocument();
    expect(screen.getByText(/satisfaction/i)).toBeInTheDocument();
  });

  it('should show quick action buttons', () => {
    renderTrainerProfile();
    
    // Should show trainer action buttons
    expect(screen.getByText(/browse recipes/i)).toBeInTheDocument();
    expect(screen.getByText(/create meal plan/i)).toBeInTheDocument();
    expect(screen.getByText(/send customer invitation/i)).toBeInTheDocument();
    expect(screen.getByText(/manage clients/i)).toBeInTheDocument();
    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
  });

  it('should show PDF export functionality', () => {
    renderTrainerProfile();
    
    // Should show PDF export section
    expect(screen.getByText(/recipe card export/i)).toBeInTheDocument();
  });
});