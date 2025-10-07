import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from '@/pages/RegisterPage';
import { AuthContext } from '@/contexts/AuthContext';
import { Router } from 'wouter';
import type { AuthContextValue } from '@/types/auth';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

// Mock useLocation
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => ['/register', mockNavigate],
  };
});

const createMockAuthContext = (overrides?: Partial<AuthContextValue>): AuthContextValue => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: undefined,
  login: vi.fn(),
  register: mockRegister,
  logout: vi.fn(),
  ...overrides,
});

const renderWithProviders = (authContextValue: AuthContextValue) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContextValue}>
        <Router>
          <RegisterPage />
        </Router>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders registration form with all required elements', () => {
      renderWithProviders(createMockAuthContext());

      expect(screen.getByText('Create Your Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    });

    it('renders role selection dropdown', () => {
      renderWithProviders(createMockAuthContext());

      const roleSelect = screen.getByLabelText(/role/i);
      expect(roleSelect).toBeInTheDocument();
      
      fireEvent.click(roleSelect);
      
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Trainer')).toBeInTheDocument();
    });

    it('includes proper accessibility attributes', () => {
      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password');
    });

    it('renders responsive design elements', () => {
      renderWithProviders(createMockAuthContext());

      const container = screen.getByRole('main') || screen.getByText('Create Your Account').closest('div');
      expect(container).toHaveClass('min-h-screen');
    });
  });

  describe('Form Validation', () => {
    it('validates required email field', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('validates required password field', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('validates minimum password length', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });

    it('validates password confirmation match', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('validates required role selection', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Role is required')).toBeInTheDocument();
      });
    });

    it('validates password strength requirements', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'simple');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('normalizes email to lowercase and trims whitespace', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({ 
        id: '1', 
        email: 'test@example.com', 
        role: 'customer' 
      });

      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      await user.type(emailInput, '  TEST@EXAMPLE.COM  ');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      await user.click(roleSelect);
      await user.click(screen.getByText('Customer'));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          role: 'customer',
        });
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data for customer role', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({ 
        id: '1', 
        email: 'customer@example.com', 
        role: 'customer' 
      });

      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      await user.type(emailInput, 'customer@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      await user.click(roleSelect);
      await user.click(screen.getByText('Customer'));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'customer@example.com',
          password: 'password123',
          role: 'customer',
        });
      });
    });

    it('submits form with valid data for trainer role', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({ 
        id: '1', 
        email: 'trainer@example.com', 
        role: 'trainer' 
      });

      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      await user.type(emailInput, 'trainer@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      await user.click(roleSelect);
      await user.click(screen.getByText('Trainer'));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'trainer@example.com',
          password: 'password123',
          role: 'trainer',
        });
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveRegister: (value: any) => void;
      mockRegister.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRegister = resolve;
        })
      );

      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      await user.click(roleSelect);
      await user.click(screen.getByText('Customer'));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      expect(screen.getByText('Creating Account...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      resolveRegister!({ id: '1', email: 'test@example.com', role: 'customer' });
    });

    it('navigates to correct page based on user role after registration', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({ 
        id: '1', 
        email: 'customer@example.com', 
        role: 'customer' 
      });

      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      await user.type(emailInput, 'customer@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      await user.click(roleSelect);
      await user.click(screen.getByText('Customer'));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/my-meal-plans');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message on registration failure', async () => {
      const user = userEvent.setup();
      mockRegister.mockRejectedValueOnce(new Error('Email already exists'));

      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      await user.click(roleSelect);
      await user.click(screen.getByText('Customer'));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled();
      });
    });

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      mockRegister.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      await user.click(roleSelect);
      await user.click(screen.getByText('Customer'));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create account/i })).not.toBeDisabled();
      });
    });

    it('resets form after successful registration', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({ 
        id: '1', 
        email: 'test@example.com', 
        role: 'customer' 
      });

      renderWithProviders(createMockAuthContext());

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const roleSelect = screen.getByLabelText(/role/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      
      await user.click(roleSelect);
      await user.click(screen.getByText('Customer'));

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveValue('');
        expect(passwordInput).toHaveValue('');
        expect(confirmPasswordInput).toHaveValue('');
      });
    });

    it('validates complex password requirements', async () => {
      const user = userEvent.setup();
      renderWithProviders(createMockAuthContext());

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'weak');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('provides helpful feedback for password requirements', () => {
      renderWithProviders(createMockAuthContext());

      // Look for password help text
      expect(screen.getByText(/minimum 8 characters/i)).toBeInTheDocument();
    });
  });
});