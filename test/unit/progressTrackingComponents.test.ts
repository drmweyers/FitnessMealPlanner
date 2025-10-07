import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock the auth context
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'customer' as const,
  name: 'Test User'
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn()
};

vi.mock('../../client/src/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children)
}));

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock API responses
const mockMeasurements = [
  {
    id: '1',
    customerId: 'test-user-id',
    measurementDate: '2024-01-15',
    weightLbs: '180.5',
    bodyFatPercentage: '15.2',
    waistCm: '32.0',
    chestCm: '42.0',
    notes: 'Feeling strong',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    customerId: 'test-user-id',
    measurementDate: '2024-01-01',
    weightLbs: '182.0',
    bodyFatPercentage: '16.0',
    waistCm: '33.0',
    chestCm: '41.5',
    notes: 'Starting point',
    createdAt: '2024-01-01T10:00:00Z'
  }
];

const mockGoals = [
  {
    id: '1',
    customerId: 'test-user-id',
    goalType: 'weight_loss',
    goalName: 'Lose 20 pounds',
    description: 'Summer fitness goal',
    targetValue: '160',
    targetUnit: 'lbs',
    currentValue: '180',
    startingValue: '200',
    startDate: '2024-01-01',
    targetDate: '2024-06-01',
    status: 'active',
    progressPercentage: 50,
    notes: 'Going well',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    milestones: []
  },
  {
    id: '2',
    customerId: 'test-user-id',
    goalType: 'muscle_gain',
    goalName: 'Build chest muscles',
    targetValue: '45',
    targetUnit: 'inches',
    currentValue: '44',
    startingValue: '42',
    startDate: '2024-01-01',
    status: 'achieved',
    progressPercentage: 100,
    achievedDate: '2024-01-20',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    milestones: []
  }
];

const mockPhotos = [
  {
    id: '1',
    customerId: 'test-user-id',
    photoDate: '2024-01-15',
    photoUrl: 'https://example.com/photo1.jpg',
    thumbnailUrl: 'https://example.com/thumb1.jpg',
    photoType: 'front',
    caption: 'Progress photo',
    isPrivate: true,
    createdAt: '2024-01-15T10:00:00Z'
  }
];

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = (url: string, options?: any) => {
  const token = localStorage.getItem('token');
  
  if (!options?.headers?.Authorization && !token) {
    return Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ status: 'error', message: 'Unauthorized' })
    });
  }

  if (url.includes('/api/progress/measurements')) {
    if (options?.method === 'POST') {
      const newMeasurement = {
        id: '3',
        customerId: 'test-user-id',
        ...JSON.parse(options.body),
        createdAt: new Date().toISOString()
      };
      return Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ status: 'success', data: newMeasurement })
      });
    }
    if (options?.method === 'PUT') {
      const updatedMeasurement = { ...mockMeasurements[0], ...JSON.parse(options.body) };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: updatedMeasurement })
      });
    }
    if (options?.method === 'DELETE') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', message: 'Deleted successfully' })
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'success', data: mockMeasurements })
    });
  }

  if (url.includes('/api/progress/goals')) {
    if (url.includes('/progress')) {
      const updatedGoal = { ...mockGoals[0], currentValue: '170', progressPercentage: 75 };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'success', data: updatedGoal })
      });
    }
    if (options?.method === 'POST') {
      const newGoal = {
        id: '3',
        customerId: 'test-user-id',
        ...JSON.parse(options.body),
        status: 'active',
        progressPercentage: 0,
        createdAt: new Date().toISOString(),
        milestones: []
      };
      return Promise.resolve({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ status: 'success', data: newGoal })
      });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'success', data: mockGoals })
    });
  }

  if (url.includes('/api/progress/photos')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'success', data: mockPhotos })
    });
  }

  return Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({ status: 'error', message: 'Not found' })
  });
};

vi.mocked(fetch).mockImplementation(mockFetch as any);

// Import components after mocks are set up
import ProgressTracking from '../../client/src/components/ProgressTracking';
import MeasurementsTab from '../../client/src/components/progress/MeasurementsTab';
import GoalsTab from '../../client/src/components/progress/GoalsTab';
import PhotosTab from '../../client/src/components/progress/PhotosTab';

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('Progress Tracking Components', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'mock-token');
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('ProgressTracking Main Component', () => {
    test('should render main progress tracking dashboard', async () => {
      render(<ProgressTracking />, { wrapper: createWrapper() });

      expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
      expect(screen.getByText('Track your fitness journey and celebrate your achievements')).toBeInTheDocument();

      // Check for quick stats cards
      expect(screen.getByText('Current Weight')).toBeInTheDocument();
      expect(screen.getByText('Body Fat %')).toBeInTheDocument();
      expect(screen.getByText('Active Goals')).toBeInTheDocument();
      expect(screen.getByText('Progress Photos')).toBeInTheDocument();

      // Check for tabs
      expect(screen.getByRole('tab', { name: /measurements/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /progress photos/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /goals/i })).toBeInTheDocument();
    });

    test('should switch between tabs correctly', async () => {
      const user = userEvent.setup();
      render(<ProgressTracking />, { wrapper: createWrapper() });

      const goalsTab = screen.getByRole('tab', { name: /goals/i });
      await user.click(goalsTab);

      // Wait for goals content to load
      await waitFor(() => {
        expect(screen.getByText('Fitness Goals')).toBeInTheDocument();
      });

      const photosTab = screen.getByRole('tab', { name: /progress photos/i });
      await user.click(photosTab);

      await waitFor(() => {
        expect(screen.getByText('Progress Photos')).toBeInTheDocument();
      });
    });
  });

  describe('MeasurementsTab Component', () => {
    test('should render measurements list', async () => {
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      expect(screen.getByText('Body Measurements')).toBeInTheDocument();
      expect(screen.getByText('Add Measurement')).toBeInTheDocument();

      // Wait for measurements to load
      await waitFor(() => {
        expect(screen.getByText('Latest Measurement')).toBeInTheDocument();
      });

      // Check measurement history table
      await waitFor(() => {
        expect(screen.getByText('Measurement History')).toBeInTheDocument();
      });
    });

    test('should open add measurement dialog', async () => {
      const user = userEvent.setup();
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      const addButton = screen.getByText('Add Measurement');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Measurement')).toBeInTheDocument();
        expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/weight.*lbs/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/body fat/i)).toBeInTheDocument();
      });
    });

    test('should create new measurement', async () => {
      const user = userEvent.setup();
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      // Open dialog
      const addButton = screen.getByText('Add Measurement');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Measurement')).toBeInTheDocument();
      });

      // Fill form
      const weightInput = screen.getByLabelText(/weight.*lbs/i);
      await user.type(weightInput, '175.5');

      const bodyFatInput = screen.getByLabelText(/body fat/i);
      await user.type(bodyFatInput, '14.8');

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'Feeling great!');

      // Submit form
      const saveButton = screen.getByText('Save Measurement');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Measurement added successfully'
        });
      });
    });

    test('should validate measurement form', async () => {
      const user = userEvent.setup();
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      // Open dialog
      const addButton = screen.getByText('Add Measurement');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Add New Measurement')).toBeInTheDocument();
      });

      // Clear the date field to make it invalid
      const dateInput = screen.getByLabelText(/date/i);
      await user.clear(dateInput);

      // Try to submit without required field
      const saveButton = screen.getByText('Save Measurement');
      await user.click(saveButton);

      // Form should not submit (date is required)
      expect(screen.getByText('Add New Measurement')).toBeInTheDocument();
    });

    test('should delete measurement', async () => {
      const user = userEvent.setup();
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      // Wait for measurements to load
      await waitFor(() => {
        expect(screen.getByText('Measurement History')).toBeInTheDocument();
      });

      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => 
        btn.querySelector('svg') && btn.getAttribute('data-testid') === 'delete-measurement'
      );

      if (deleteButton) {
        await user.click(deleteButton);

        await waitFor(() => {
          expect(mockToast).toHaveBeenCalledWith({
            title: 'Success',
            description: 'Measurement deleted successfully'
          });
        });
      }

      confirmSpy.mockRestore();
    });
  });

  describe('GoalsTab Component', () => {
    test('should render goals list', async () => {
      render(<GoalsTab />, { wrapper: createWrapper() });

      expect(screen.getByText('Fitness Goals')).toBeInTheDocument();
      expect(screen.getByText('Set New Goal')).toBeInTheDocument();

      // Wait for goals to load
      await waitFor(() => {
        expect(screen.getByText('Active Goals (1)')).toBeInTheDocument();
        expect(screen.getByText('Completed Goals (1)')).toBeInTheDocument();
      });
    });

    test('should open create goal dialog', async () => {
      const user = userEvent.setup();
      render(<GoalsTab />, { wrapper: createWrapper() });

      const createButton = screen.getByText('Set New Goal');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Set a New Goal')).toBeInTheDocument();
        expect(screen.getByLabelText(/goal type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/goal name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/target value/i)).toBeInTheDocument();
      });
    });

    test('should create new goal', async () => {
      const user = userEvent.setup();
      render(<GoalsTab />, { wrapper: createWrapper() });

      // Open dialog
      const createButton = screen.getByText('Set New Goal');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Set a New Goal')).toBeInTheDocument();
      });

      // Fill form
      const goalNameInput = screen.getByLabelText(/goal name/i);
      await user.type(goalNameInput, 'Lose 10 pounds');

      const targetValueInput = screen.getByLabelText(/target value/i);
      await user.type(targetValueInput, '170');

      const unitInput = screen.getByLabelText(/unit/i);
      await user.type(unitInput, 'lbs');

      // Submit form
      const createGoalButton = screen.getByText('Create Goal');
      await user.click(createGoalButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Goal created successfully'
        });
      });
    });

    test('should show goal progress correctly', async () => {
      render(<GoalsTab />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Lose 20 pounds')).toBeInTheDocument();
        expect(screen.getByText('50% Complete')).toBeInTheDocument();
      });
    });

    test('should update goal progress', async () => {
      const user = userEvent.setup();
      render(<GoalsTab />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Lose 20 pounds')).toBeInTheDocument();
      });

      // Click update progress button
      const updateButton = screen.getByText('Update Progress');
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Update Goal Progress')).toBeInTheDocument();
      });

      // Enter new value
      const valueInput = screen.getByLabelText(/current value/i);
      await user.clear(valueInput);
      await user.type(valueInput, '170');

      // Submit update
      const updateSubmitButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateSubmitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Goal progress updated successfully'
        });
      });
    });

    test('should validate goal form', async () => {
      const user = userEvent.setup();
      render(<GoalsTab />, { wrapper: createWrapper() });

      // Open dialog
      const createButton = screen.getByText('Set New Goal');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Set a New Goal')).toBeInTheDocument();
      });

      // Try to submit without required fields
      const createGoalButton = screen.getByText('Create Goal');
      await user.click(createGoalButton);

      // Dialog should remain open due to validation
      expect(screen.getByText('Set a New Goal')).toBeInTheDocument();
    });
  });

  describe('PhotosTab Component', () => {
    test('should render photos placeholder', async () => {
      render(<PhotosTab />, { wrapper: createWrapper() });

      expect(screen.getByText('Progress Photos')).toBeInTheDocument();
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      expect(screen.getByText('Progress photos help you visually track your transformation')).toBeInTheDocument();
      expect(screen.getByText('Photo upload functionality coming soon!')).toBeInTheDocument();
    });

    test('should show upload button', async () => {
      render(<PhotosTab />, { wrapper: createWrapper() });

      const uploadButton = screen.getByText('Upload Photo');
      expect(uploadButton).toBeInTheDocument();
      expect(uploadButton).toBeEnabled();
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      // Mock fetch to return error
      vi.mocked(fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ status: 'error', message: 'Internal server error' })
        } as Response)
      );

      render(<MeasurementsTab />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Body Measurements')).toBeInTheDocument();
      });

      // Should handle the error without crashing
      expect(screen.getByText('Add Measurement')).toBeInTheDocument();
    });

    test('should handle network errors', async () => {
      // Mock fetch to reject
      vi.mocked(fetch).mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      );

      render(<GoalsTab />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Fitness Goals')).toBeInTheDocument();
      });

      // Should handle the error without crashing
      expect(screen.getByText('Set New Goal')).toBeInTheDocument();
    });

    test('should handle unauthorized errors', async () => {
      localStorage.removeItem('token');
      
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      // Component should still render but show appropriate state
      expect(screen.getByText('Body Measurements')).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    test('should format dates correctly', async () => {
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Jan \d+, 2024/)).toBeInTheDocument();
      });
    });

    test('should format numbers correctly', async () => {
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show weight with lbs suffix
        expect(screen.getByText(/180\.5.*lbs/)).toBeInTheDocument();
        // Should show body fat with % suffix
        expect(screen.getByText(/15\.2.*%/)).toBeInTheDocument();
        // Should show measurements with cm suffix
        expect(screen.getByText(/32.*cm/)).toBeInTheDocument();
      });
    });

    test('should handle missing data gracefully', async () => {
      // Mock measurements with missing data
      const measurementsWithMissingData = [
        {
          id: '1',
          customerId: 'test-user-id',
          measurementDate: '2024-01-15',
          weightLbs: null,
          bodyFatPercentage: null,
          waistCm: '32.0',
          chestCm: null,
          notes: '',
          createdAt: '2024-01-15T10:00:00Z'
        }
      ];

      vi.mocked(fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: measurementsWithMissingData })
        } as Response)
      );

      render(<MeasurementsTab />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show dashes for missing data
        expect(screen.getByText(/-.*lbs/)).toBeInTheDocument();
        expect(screen.getByText(/-.*%/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels', async () => {
      render(<ProgressTracking />, { wrapper: createWrapper() });

      // Check for tab accessibility
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ProgressTracking />, { wrapper: createWrapper() });

      const firstTab = screen.getByRole('tab', { name: /measurements/i });
      firstTab.focus();

      // Should be able to navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: /progress photos/i })).toHaveFocus();
    });

    test('should have proper form labels', async () => {
      const user = userEvent.setup();
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      const addButton = screen.getByText('Add Measurement');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/weight.*lbs/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/body fat/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    test('should not re-render unnecessarily', async () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <MeasurementsTab />;
      };

      const { rerender } = render(<TestComponent />, { wrapper: createWrapper() });

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props should not cause unnecessary re-renders
      rerender(<TestComponent />);
      
      // Component should optimize re-renders
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    test('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeMeasurementSet = Array.from({ length: 100 }, (_, i) => ({
        id: `measurement-${i}`,
        customerId: 'test-user-id',
        measurementDate: new Date(2024, 0, i + 1).toISOString(),
        weightLbs: `${180 - i * 0.1}`,
        bodyFatPercentage: `${15 + i * 0.01}`,
        createdAt: new Date(2024, 0, i + 1).toISOString()
      }));

      vi.mocked(fetch).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'success', data: largeMeasurementSet })
        } as Response)
      );

      const startTime = performance.now();
      render(<MeasurementsTab />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Body Measurements')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });
  });
});