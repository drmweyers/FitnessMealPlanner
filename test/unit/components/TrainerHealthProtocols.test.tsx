/**
 * Unit Tests for TrainerHealthProtocols React Component
 * 
 * Tests the following functionality:
 * - Rendering of the component and its tabs
 * - Protocol creation form handling
 * - Protocol listing and management
 * - Client assignment modal functionality
 * - Error handling and loading states
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TrainerHealthProtocols from '@/components/TrainerHealthProtocols';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock the auth context
const mockUser = {
  id: 'trainer-123',
  email: 'trainer@test.com',
  role: 'trainer',
  profilePicture: null
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

// Mock the SpecializedProtocolsPanel component
vi.mock('@/components/SpecializedProtocolsPanel', () => ({
  default: ({ onSaveProtocol, trainerMode, showSaveButton }: any) => (
    <div data-testid="specialized-protocols-panel">
      <button 
        data-testid="save-protocol-btn"
        onClick={() => onSaveProtocol?.({
          fastingStrategy: '16:8',
          calorieRestriction: 'mild',
          antioxidantFocus: ['berries'],
          includeAntiInflammatory: true,
          includeBrainHealth: true,
          targetServings: { vegetables: 5, antioxidantFoods: 3, omega3Sources: 2 }
        }, 'longevity')}
      >
        Save Protocol
      </button>
      <div data-testid="trainer-mode">{trainerMode ? 'true' : 'false'}</div>
      <div data-testid="show-save-button">{showSaveButton ? 'true' : 'false'}</div>
    </div>
  )
}));

// Mock fetch for API calls
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('TrainerHealthProtocols Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToast.mockClear();
    
    // Default fetch mocks
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/trainer/health-protocols') && !url.includes('assign')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/trainer/customers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ customers: [], total: 0 }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render all three tabs', () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Create Protocols')).toBeInTheDocument();
      expect(screen.getByText('Manage Protocols')).toBeInTheDocument();
      expect(screen.getByText('Client Assignments')).toBeInTheDocument();
    });

    it('should render create tab by default', () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      expect(screen.getByText('Create New Health Protocol')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., 30-Day Longevity Protocol')).toBeInTheDocument();
      expect(screen.getByTestId('specialized-protocols-panel')).toBeInTheDocument();
    });

    it('should pass correct props to SpecializedProtocolsPanel', () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      expect(screen.getByTestId('trainer-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('show-save-button')).toHaveTextContent('true');
    });

    it('should render protocol name and description inputs', () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      const nameInput = screen.getByLabelText('Protocol Name');
      const descriptionInput = screen.getByLabelText('Description');
      
      expect(nameInput).toBeInTheDocument();
      expect(descriptionInput).toBeInTheDocument();
      
      // Test input functionality
      fireEvent.change(nameInput, { target: { value: 'Test Protocol' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
      
      expect(nameInput).toHaveValue('Test Protocol');
      expect(descriptionInput).toHaveValue('Test Description');
    });
  });

  describe('Protocol Creation', () => {
    it('should handle protocol creation successfully', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            protocol: {
              id: 'new-protocol-id',
              name: 'Test Protocol',
              type: 'longevity'
            },
            message: 'Protocol created successfully'
          })
        })
      );

      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Fill in the form
      const nameInput = screen.getByLabelText('Protocol Name');
      const descriptionInput = screen.getByLabelText('Description');
      
      fireEvent.change(nameInput, { target: { value: 'Test Protocol' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
      
      // Click save protocol button
      fireEvent.click(screen.getByTestId('save-protocol-btn'));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Protocol Saved',
          description: 'Your health protocol has been saved successfully.',
        });
      });
      
      // Should clear form after save
      expect(nameInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
    });

    it('should show error when protocol name is missing', async () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Don't fill in name, just click save
      fireEvent.click(screen.getByTestId('save-protocol-btn'));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Missing Information',
          description: 'Please enter a name for your protocol.',
          variant: 'destructive',
        });
      });
    });

    it('should handle protocol creation API errors', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      );

      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Fill in the form
      const nameInput = screen.getByLabelText('Protocol Name');
      fireEvent.change(nameInput, { target: { value: 'Test Protocol' } });
      
      // Click save protocol button
      fireEvent.click(screen.getByTestId('save-protocol-btn'));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Save Failed',
          description: 'Failed to save protocol',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Protocol Management Tab', () => {
    it('should render empty state when no protocols exist', async () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Switch to manage tab
      fireEvent.click(screen.getByText('Manage Protocols'));
      
      await waitFor(() => {
        expect(screen.getByText('No Protocols Yet')).toBeInTheDocument();
        expect(screen.getByText('Create your first health protocol to get started with specialized client programs.')).toBeInTheDocument();
      });
    });

    it('should render protocols list when protocols exist', async () => {
      const mockProtocols = [
        {
          id: 'protocol-1',
          name: 'Longevity Protocol',
          description: '30-day longevity optimization',
          type: 'longevity',
          duration: 30,
          intensity: 'moderate',
          assignedClients: [
            { id: 'client-1', assignedAt: new Date(), status: 'active' }
          ],
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
        {
          id: 'protocol-2',
          name: 'Parasite Cleanse',
          description: '14-day gentle cleanse',
          type: 'parasite_cleanse',
          duration: 14,
          intensity: 'gentle',
          assignedClients: [],
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
        }
      ];

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/trainer/health-protocols')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProtocols),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Switch to manage tab
      fireEvent.click(screen.getByText('Manage Protocols'));
      
      await waitFor(() => {
        expect(screen.getByText('Longevity Protocol')).toBeInTheDocument();
        expect(screen.getByText('Parasite Cleanse')).toBeInTheDocument();
        expect(screen.getByText('30 days')).toBeInTheDocument();
        expect(screen.getByText('1 clients')).toBeInTheDocument();
        expect(screen.getByText('0 clients')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching protocols', () => {
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Switch to manage tab
      fireEvent.click(screen.getByText('Manage Protocols'));
      
      expect(screen.getByText('Loading protocols...')).toBeInTheDocument();
    });

    it('should handle protocol badges correctly', async () => {
      const mockProtocols = [
        {
          id: 'protocol-1',
          name: 'Longevity Protocol',
          type: 'longevity',
          assignedClients: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'protocol-2',
          name: 'Cleanse Protocol',
          type: 'parasite_cleanse',
          assignedClients: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      (global.fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProtocols),
        })
      );

      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Switch to manage tab
      fireEvent.click(screen.getByText('Manage Protocols'));
      
      await waitFor(() => {
        expect(screen.getByText('Longevity')).toBeInTheDocument();
        expect(screen.getByText('Parasite Cleanse')).toBeInTheDocument();
      });
    });
  });

  describe('Client Assignment Modal', () => {
    const mockProtocol = {
      id: 'protocol-1',
      name: 'Test Protocol',
      description: 'Test protocol description',
      type: 'longevity' as const,
      assignedClients: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockClients = [
      { id: 'client-1', name: 'John Doe', email: 'john@test.com' },
      { id: 'client-2', name: 'Jane Smith', email: 'jane@test.com' },
    ];

    beforeEach(() => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/trainer/health-protocols') && !url.includes('assign')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockProtocol]),
          });
        }
        if (url.includes('/api/trainer/customers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ customers: mockClients, total: 2 }),
          });
        }
        return Promise.resolve({ ok: false });
      });
    });

    it('should open assignment modal when assign button is clicked', async () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Switch to manage tab
      fireEvent.click(screen.getByText('Manage Protocols'));
      
      // Wait for protocol to load and click assign button
      await waitFor(() => {
        const assignButton = screen.getByText('Assign');
        fireEvent.click(assignButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Assign Protocol to Clients')).toBeInTheDocument();
        expect(screen.getByText('Test Protocol')).toBeInTheDocument();
        expect(screen.getByText('Test protocol description')).toBeInTheDocument();
      });
    });

    it('should load and display clients in assignment modal', async () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Switch to manage tab and open assignment modal
      fireEvent.click(screen.getByText('Manage Protocols'));
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Assign'));
      });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe (john@test.com)')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith (jane@test.com)')).toBeInTheDocument();
      });
    });

    it('should handle client selection in assignment modal', async () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Open assignment modal
      fireEvent.click(screen.getByText('Manage Protocols'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Assign'));
      });
      
      // Select clients
      await waitFor(() => {
        const checkbox1 = screen.getByLabelText('John Doe (john@test.com)');
        const checkbox2 = screen.getByLabelText('Jane Smith (jane@test.com)');
        
        fireEvent.click(checkbox1);
        fireEvent.click(checkbox2);
        
        expect(checkbox1).toBeChecked();
        expect(checkbox2).toBeChecked();
      });
    });

    it('should successfully assign protocol to selected clients', async () => {
      (global.fetch as any).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/trainer/health-protocols/assign')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              assignments: [{ id: 'assignment-1', customerId: 'client-1' }],
              message: 'Protocol assigned to 1 client(s) successfully'
            }),
          });
        }
        if (url.includes('/api/trainer/health-protocols') && !url.includes('assign')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockProtocol]),
          });
        }
        if (url.includes('/api/trainer/customers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ customers: mockClients, total: 2 }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Open assignment modal
      fireEvent.click(screen.getByText('Manage Protocols'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Assign'));
      });
      
      // Select a client and assign
      await waitFor(() => {
        const checkbox = screen.getByLabelText('John Doe (john@test.com)');
        fireEvent.click(checkbox);
        
        const assignButton = screen.getByText('Assign Protocol');
        fireEvent.click(assignButton);
      });
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Protocol Assigned',
          description: 'The health protocol has been assigned to selected clients.',
        });
      });
    });

    it('should handle assignment errors gracefully', async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/trainer/health-protocols/assign')) {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        if (url.includes('/api/trainer/health-protocols') && !url.includes('assign')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockProtocol]),
          });
        }
        if (url.includes('/api/trainer/customers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ customers: mockClients, total: 2 }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Open assignment modal and attempt assignment
      fireEvent.click(screen.getByText('Manage Protocols'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Assign'));
      });
      
      await waitFor(() => {
        const checkbox = screen.getByLabelText('John Doe (john@test.com)');
        fireEvent.click(checkbox);
        
        const assignButton = screen.getByText('Assign Protocol');
        fireEvent.click(assignButton);
      });
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Assignment Failed',
          description: 'Failed to assign protocol',
          variant: 'destructive',
        });
      });
    });

    it('should close assignment modal when cancel is clicked', async () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Open assignment modal
      fireEvent.click(screen.getByText('Manage Protocols'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Assign'));
      });
      
      // Click cancel
      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });
      
      // Modal should be closed
      expect(screen.queryByText('Assign Protocol to Clients')).not.toBeInTheDocument();
    });

    it('should disable assign button when no clients selected', async () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Open assignment modal
      fireEvent.click(screen.getByText('Manage Protocols'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Assign'));
      });
      
      await waitFor(() => {
        const assignButton = screen.getByText('Assign Protocol');
        expect(assignButton).toBeDisabled();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Should start on create tab
      expect(screen.getByText('Create New Health Protocol')).toBeInTheDocument();
      
      // Switch to manage tab
      fireEvent.click(screen.getByText('Manage Protocols'));
      expect(screen.getByText('Your Health Protocols')).toBeInTheDocument();
      
      // Switch to assignments tab
      fireEvent.click(screen.getByText('Client Assignments'));
      expect(screen.getByText('Protocol Assignments')).toBeInTheDocument();
      expect(screen.getByText('View and manage protocol assignments for your clients.')).toBeInTheDocument();
      
      // Switch back to create tab
      fireEvent.click(screen.getByText('Create Protocols'));
      expect(screen.getByText('Create New Health Protocol')).toBeInTheDocument();
    });

    it('should render assignments tab placeholder', () => {
      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Switch to assignments tab
      fireEvent.click(screen.getByText('Client Assignments'));
      
      expect(screen.getByText('Assignment Overview')).toBeInTheDocument();
      expect(screen.getByText('Track your clients\' progress on assigned health protocols.')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Switch to manage tab to trigger fetch
      fireEvent.click(screen.getByText('Manage Protocols'));
      
      // Should not crash and should show empty state
      await waitFor(() => {
        expect(screen.getByText('No Protocols Yet')).toBeInTheDocument();
      });
    });

    it('should handle customers fetch errors in assignment modal', async () => {
      const mockProtocol = {
        id: 'protocol-1',
        name: 'Test Protocol',
        description: 'Test description',
        type: 'longevity' as const,
        assignedClients: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/trainer/health-protocols')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([mockProtocol]),
          });
        }
        if (url.includes('/api/trainer/customers')) {
          return Promise.resolve({
            ok: false,
            status: 500,
          });
        }
        return Promise.resolve({ ok: false });
      });

      render(<TrainerHealthProtocols />, { wrapper: createWrapper() });
      
      // Open assignment modal
      fireEvent.click(screen.getByText('Manage Protocols'));
      await waitFor(() => {
        fireEvent.click(screen.getByText('Assign'));
      });
      
      // Should show error message instead of crashing
      await waitFor(() => {
        expect(screen.getByText('No clients available. Invite clients to start assigning protocols.')).toBeInTheDocument();
      });
    });
  });
});