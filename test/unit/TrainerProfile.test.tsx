import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrainerProfile from '../../client/src/pages/TrainerProfile';

// Mock the auth context
const mockUser = {
  id: 'trainer-1',
  email: 'trainer@example.com',
  role: 'trainer' as const,
  profilePicture: null,
};

const mockLogout = vi.fn();

vi.mock('../../client/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
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

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('TrainerProfile Component - Text Removal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display only the "Trainer Profile" title without subtitle', () => {
    renderWithProviders(<TrainerProfile />);
    
    // Should show the main title
    expect(screen.getByRole('heading', { name: /trainer profile/i })).toBeInTheDocument();
    
    // Should NOT show the removed subtitle text
    expect(screen.queryByText(/professional fitness trainer dashboard and settings/i)).not.toBeInTheDocument();
  });

  it('should not display the "Personal Trainer" badge', () => {
    renderWithProviders(<TrainerProfile />);
    
    // Should NOT show the removed badge text
    expect(screen.queryByText(/personal trainer/i)).not.toBeInTheDocument();
  });

  it('should not display any Profile Image upload section text', () => {
    renderWithProviders(<TrainerProfile />);
    
    // Should NOT show profile image related text
    expect(screen.queryByText(/profile image/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/upload a professional profile image/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recommended.*square image/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/max file size.*5mb/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/supported formats.*jpeg.*png.*webp/i)).not.toBeInTheDocument();
  });

  it('should not import or render ProfileImageUpload component', () => {
    renderWithProviders(<TrainerProfile />);
    
    // Should NOT show the ProfileImageUpload component
    expect(screen.queryByTestId('profile-image-upload')).not.toBeInTheDocument();
  });

  it('should still show essential trainer profile content', () => {
    renderWithProviders(<TrainerProfile />);
    
    // Should still show important sections
    expect(screen.getByText(/account details/i)).toBeInTheDocument();
    expect(screen.getByText(/performance overview/i)).toBeInTheDocument();
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
  });

  it('should maintain correct header structure without removed elements', () => {
    renderWithProviders(<TrainerProfile />);
    
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
    renderWithProviders(<TrainerProfile />);
    
    // Should show trainer-related statistics sections
    expect(screen.getByText(/total clients/i)).toBeInTheDocument();
    expect(screen.getByText(/meal plans/i)).toBeInTheDocument();
    expect(screen.getByText(/active plans/i)).toBeInTheDocument();
    expect(screen.getByText(/satisfaction/i)).toBeInTheDocument();
  });

  it('should show quick action buttons', () => {
    renderWithProviders(<TrainerProfile />);
    
    // Should show trainer action buttons
    expect(screen.getByText(/browse recipes/i)).toBeInTheDocument();
    expect(screen.getByText(/create meal plan/i)).toBeInTheDocument();
    expect(screen.getByText(/send customer invitation/i)).toBeInTheDocument();
    expect(screen.getByText(/manage clients/i)).toBeInTheDocument();
    expect(screen.getByText(/sign out/i)).toBeInTheDocument();
  });

  it('should show PDF export functionality', () => {
    renderWithProviders(<TrainerProfile />);
    
    // Should show PDF export section
    expect(screen.getByText(/recipe card export/i)).toBeInTheDocument();
  });
});