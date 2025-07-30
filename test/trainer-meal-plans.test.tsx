import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrainerMealPlans from '../client/src/components/TrainerMealPlans';
import { useAuth } from '../client/src/contexts/AuthContext';
import { apiRequest } from '../client/src/lib/queryClient';

// Mock dependencies
vi.mock('../client/src/contexts/AuthContext');
vi.mock('../client/src/lib/queryClient');
vi.mock('../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Utensils: () => <div data-testid="utensils-icon" />,
  Search: () => <div data-testid="search-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
}));

// Mock UI components
vi.mock('../client/src/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  CardContent: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  CardHeader: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  CardTitle: ({ children, className, ...props }: any) => <h3 className={className} {...props}>{children}</h3>,
  CardDescription: ({ children, className, ...props }: any) => <p className={className} {...props}>{children}</p>,
}));

vi.mock('../client/src/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button onClick={onClick} className={className} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../client/src/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={className} data-variant={variant}>{children}</span>
  ),
}));

vi.mock('../client/src/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, className, ...props }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      {...props}
    />
  ),
}));

vi.mock('../client/src/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick} role="menuitem">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../client/src/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('../client/src/components/MealPlanModal', () => ({
  default: ({ mealPlan, onClose }: any) => (
    <div data-testid="meal-plan-modal">
      <h3>Meal Plan: {mealPlan?.mealPlanData?.planName}</h3>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('TrainerMealPlans Component', () => {
  let queryClient: QueryClient;
  const mockUser = {
    id: 'trainer-123',
    email: 'trainer@test.com',
    role: 'trainer' as const,
  };

  const mockMealPlans = {
    mealPlans: [
      {
        id: 'plan-1',
        trainerId: 'trainer-123',
        mealPlanData: {
          planName: 'Weight Loss Plan',
          days: 7,
          mealsPerDay: 3,
          dailyCalorieTarget: 1800,
          fitnessGoal: 'weight_loss',
          description: 'A comprehensive weight loss meal plan',
        },
        isTemplate: false,
        tags: ['weight-loss', 'low-calorie'],
        notes: 'Great for beginners',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        assignmentCount: 2,
      },
      {
        id: 'plan-2',
        trainerId: 'trainer-123',
        mealPlanData: {
          planName: 'Muscle Gain Plan',
          days: 5,
          mealsPerDay: 4,
          dailyCalorieTarget: 2500,
          fitnessGoal: 'muscle_gain',
          description: 'High protein meal plan for muscle building',
        },
        isTemplate: true,
        tags: ['muscle-gain', 'high-protein'],
        notes: 'Advanced level plan',
        createdAt: '2024-01-10T08:00:00Z',
        updatedAt: '2024-01-10T08:00:00Z',
        assignmentCount: 0,
      },
    ],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    });

    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMealPlans),
    } as any);
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TrainerMealPlans />
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    renderComponent();
    expect(screen.getByRole('progressbar') || screen.getByText(/loading/i)).toBeTruthy();
  });

  it('displays meal plans after loading', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
    });
  });

  it('shows meal plan details correctly', async () => {
    renderComponent();

    await waitFor(() => {
      // Check first plan details
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      expect(screen.getByText(/7 days, 3 meals\/day/)).toBeInTheDocument();
      expect(screen.getByText(/1800 cal\/day/)).toBeInTheDocument();
      expect(screen.getByText(/Assigned to 2 customers/)).toBeInTheDocument();
      expect(screen.getByText('weight loss')).toBeInTheDocument();

      // Check second plan details
      expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
      expect(screen.getByText(/5 days, 4 meals\/day/)).toBeInTheDocument();
      expect(screen.getByText(/2500 cal\/day/)).toBeInTheDocument();
      expect(screen.getByText('muscle gain')).toBeInTheDocument();
    });
  });

  it('displays tags correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('weight-loss')).toBeInTheDocument();
      expect(screen.getByText('low-calorie')).toBeInTheDocument();
      expect(screen.getByText('muscle-gain')).toBeInTheDocument();
      expect(screen.getByText('high-protein')).toBeInTheDocument();
    });
  });

  it('shows template badge for template plans', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Template')).toBeInTheDocument();
    });
  });

  it('displays notes when available', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('"Great for beginners"')).toBeInTheDocument();
      expect(screen.getByText('"Advanced level plan"')).toBeInTheDocument();
    });
  });

  it('filters meal plans based on search input', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      expect(screen.getByText('Muscle Gain Plan')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search meal plans/i);
    fireEvent.change(searchInput, { target: { value: 'weight' } });

    await waitFor(() => {
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
      expect(screen.queryByText('Muscle Gain Plan')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no plans exist', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ mealPlans: [] }),
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/haven't saved any meal plans yet/i)).toBeInTheDocument();
    });
  });

  it('shows empty search results message', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search meal plans/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText(/no meal plans match your search/i)).toBeInTheDocument();
    });
  });

  it('opens meal plan modal when view details is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
    });

    // Find and click the view details option
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
      expect(screen.getByText('Meal Plan: Weight Loss Plan')).toBeInTheDocument();
    });
  });

  it('opens delete confirmation dialog', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
    });

    // Find and click the delete option
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Meal Plan')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    });
  });

  it('handles delete meal plan action', async () => {
    const deleteMockResponse = { ok: true, json: () => Promise.resolve({ success: true }) };
    vi.mocked(apiRequest).mockImplementation((method, url) => {
      if (method === 'DELETE') {
        return Promise.resolve(deleteMockResponse as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMealPlans),
      } as any);
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
    });

    // Open delete dialog
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    // Confirm deletion
    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('DELETE', '/api/trainer/meal-plans/plan-1');
    });
  });

  it('closes meal plan modal when close button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Weight Loss Plan')).toBeInTheDocument();
    });

    // Open modal
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByTestId('meal-plan-modal')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('meal-plan-modal')).not.toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('API Error'));

    renderComponent();

    // Component should handle the error without crashing
    await waitFor(() => {
      // Should show empty state or error message
      expect(screen.getByText(/haven't saved any meal plans yet/i) || screen.getByText(/error/i)).toBeTruthy();
    });
  });

  it('formats dates correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Created Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Created Jan 10, 2024/)).toBeInTheDocument();
    });
  });

  it('handles assignment count display correctly', async () => {
    renderComponent();

    await waitFor(() => {
      // Plan with assignments
      expect(screen.getByText(/Assigned to 2 customers/)).toBeInTheDocument();
      
      // Plan without assignments should not show assignment count
      const planElements = screen.getAllByText(/Muscle Gain Plan/);
      expect(planElements.length).toBeGreaterThan(0);
      expect(screen.queryByText(/Assigned to 0 customers/)).not.toBeInTheDocument();
    });
  });
});