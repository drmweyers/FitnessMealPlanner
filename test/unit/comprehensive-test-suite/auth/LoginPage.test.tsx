import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import { AuthProvider } from '@/contexts/AuthContext';
import '@testing-library/jest-dom';

// Mock the auth context
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    login: vi.fn(),
    isLoading: false,
    user: null,
  }),
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('LoginPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Form rendering
  it('should render login form with all required fields', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  // Test 2: Email validation
  it('should validate email format', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  // Test 3: Password validation
  it('should require password to be at least 6 characters', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: '12345' } });
    fireEvent.blur(passwordInput);
    
    await waitFor(() => {
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  // Test 4: Form submission
  it('should handle successful login', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      user: null,
    });
    
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  // Test 5: Error handling
  it('should display error message on failed login', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      user: null,
    });
    
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});