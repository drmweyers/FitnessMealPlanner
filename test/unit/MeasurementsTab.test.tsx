import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import MeasurementsTab from '../../client/src/components/progress/MeasurementsTab';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Mock dependencies
vi.mock('@/hooks/use-toast');
vi.mock('@/lib/queryClient');
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    const d = new Date(date);
    if (formatStr === 'MMM d, yyyy') {
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }
    return d.toLocaleDateString();
  },
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className} data-testid="card-title">{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, type = 'button' }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      type={type}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children, className }: any) => <table className={className} data-testid="table">{children}</table>,
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children, className }: any) => <td className={className} data-testid="table-cell">{children}</td>,
  TableHead: ({ children, className }: any) => <th className={className} data-testid="table-head">{children}</th>,
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, value, placeholder, type = 'text', id, className, min, step }: any) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      className={className}
      min={min}
      step={step}
      data-testid={`input-${id}`}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ onChange, value, placeholder, id, className }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      className={className}
      data-testid={`textarea-${id}`}
    />
  ),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Plus: () => <span>PlusIcon</span>,
  Edit2: () => <span>Edit2Icon</span>,
  Trash2: () => <span>Trash2Icon</span>,
  Save: () => <span>SaveIcon</span>,
  X: () => <span>XIcon</span>,
}));

// Mock measurement data
const mockMeasurements = [
  {
    id: '1',
    measurementDate: '2024-01-01T00:00:00Z',
    weightLbs: '175',
    bodyFatPercentage: '18.5',
    waistCm: '85',
    chestCm: '102',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    measurementDate: '2024-01-15T00:00:00Z',
    weightLbs: '173',
    bodyFatPercentage: '18.0',
    waistCm: '84',
    chestCm: '103',
    createdAt: '2024-01-15T00:00:00Z',
  },
];

// Test utility to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('MeasurementsTab Component', () => {
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    (apiRequest as any).mockImplementation((method: string, url: string) => {
      if (method === 'GET' && url.includes('/api/progress/measurements')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockMeasurements }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { success: true } }),
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the measurements header', () => {
      renderWithProviders(<MeasurementsTab />);
      
      expect(screen.getByText('Body Measurements')).toBeInTheDocument();
      expect(screen.getByText(/Track your body measurements/i)).toBeInTheDocument();
    });

    it('should render the add measurement button', () => {
      renderWithProviders(<MeasurementsTab />);
      
      const addButton = screen.getByRole('button', { name: /add measurement/i });
      expect(addButton).toBeInTheDocument();
      expect(screen.getByText('PlusIcon')).toBeInTheDocument();
    });

    it('should render loading state initially', () => {
      renderWithProviders(<MeasurementsTab />);
      
      expect(screen.getByText(/loading measurements/i)).toBeInTheDocument();
    });

    it('should render measurement history after loading', async () => {
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByText('Measurement History')).toBeInTheDocument();
        expect(screen.getByTestId('table')).toBeInTheDocument();
      });
    });

    it('should display table headers correctly', async () => {
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        const headers = screen.getAllByTestId('table-head');
        expect(headers[0]).toHaveTextContent('Date');
        expect(headers[1]).toHaveTextContent('Weight');
        expect(headers[2]).toHaveTextContent('Body Fat %');
        expect(headers[3]).toHaveTextContent('Waist');
        expect(headers[4]).toHaveTextContent('Chest');
        expect(headers[5]).toHaveTextContent('Actions');
      });
    });

    it('should render empty state when no measurements', async () => {
      (apiRequest as any).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        })
      );
      
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByText(/No measurements recorded yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Add Measurement Dialog', () => {
    it('should open dialog when add button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add New Measurement')).toBeInTheDocument();
    });

    it('should render all form fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/weight \(lbs\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/body fat percentage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/neck/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shoulders/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/chest/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/waist/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/hips/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/left bicep/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/right bicep/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/left thigh/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/right thigh/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/left calf/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/right calf/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should handle input changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      
      const weightInput = screen.getByLabelText(/weight \(lbs\)/i) as HTMLInputElement;
      await user.type(weightInput, '180');
      
      expect(weightInput.value).toBe('180');
    });

    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      await waitFor(() => {
        expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form data when save is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      
      const weightInput = screen.getByLabelText(/weight \(lbs\)/i);
      await user.type(weightInput, '180');
      
      const bodyFatInput = screen.getByLabelText(/body fat percentage/i);
      await user.type(bodyFatInput, '17.5');
      
      await user.click(screen.getByRole('button', { name: /save measurement/i }));
      
      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/progress/measurements',
          expect.objectContaining({
            weightLbs: 180,
            bodyFatPercentage: 17.5,
          })
        );
      });
    });

    it('should show success toast on successful submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      await user.click(screen.getByRole('button', { name: /save measurement/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Success',
            description: 'Measurement added successfully',
          })
        );
      });
    });

    it('should show error toast on failed submission', async () => {
      (apiRequest as any).mockImplementationOnce((method: string) => {
        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockMeasurements }),
          });
        }
        return Promise.reject(new Error('API Error'));
      });
      
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      await user.click(screen.getByRole('button', { name: /save measurement/i }));
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            variant: 'destructive',
          })
        );
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      
      const saveButton = screen.getByRole('button', { name: /save measurement/i });
      
      await user.click(saveButton);
      
      // During submission, button should be disabled
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Delete Functionality', () => {
    it('should render delete buttons for each measurement', async () => {
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Trash2Icon');
        expect(deleteButtons).toHaveLength(mockMeasurements.length);
      });
    });

    it('should call delete API when delete is clicked', async () => {
      window.confirm = vi.fn(() => true);
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Trash2Icon')).toHaveLength(mockMeasurements.length);
      });

      const deleteButtons = screen.getAllByText('Trash2Icon');
      await user.click(deleteButtons[0].parentElement as HTMLElement);
      
      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          'DELETE',
          '/api/progress/measurements/1'
        );
      });
    });

    it('should show success toast on successful deletion', async () => {
      window.confirm = vi.fn(() => true);
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Trash2Icon')).toHaveLength(mockMeasurements.length);
      });

      const deleteButtons = screen.getAllByText('Trash2Icon');
      await user.click(deleteButtons[0].parentElement as HTMLElement);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Success',
            description: 'Measurement deleted successfully',
          })
        );
      });
    });

    it('should not delete if confirmation is cancelled', async () => {
      window.confirm = vi.fn(() => false);
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Trash2Icon')).toHaveLength(mockMeasurements.length);
      });

      const deleteButtons = screen.getAllByText('Trash2Icon');
      await user.click(deleteButtons[0].parentElement as HTMLElement);
      
      await waitFor(() => {
        expect(apiRequest).not.toHaveBeenCalledWith(
          'DELETE',
          expect.any(String)
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

    it('should apply responsive table classes', async () => {
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        const table = screen.getByTestId('table');
        expect(table.className).toContain('min-w-[600px]');
        expect(table.className).toContain('sm:min-w-full');
      });
    });

    it('should hide certain columns on mobile', async () => {
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        const headers = screen.getAllByTestId('table-head');
        expect(headers[2].className).toContain('hidden');
        expect(headers[2].className).toContain('sm:table-cell');
      });
    });

    it('should format dates differently on mobile', async () => {
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        const cells = screen.getAllByTestId('table-cell');
        const dateCell = cells[0];
        expect(dateCell.querySelector('.sm\\:hidden')).toBeInTheDocument();
      });
    });
  });

  describe('Data Processing', () => {
    it('should handle numeric inputs correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      
      const weightInput = screen.getByLabelText(/weight \(lbs\)/i) as HTMLInputElement;
      await user.type(weightInput, '175.5');
      
      expect(weightInput.value).toBe('175.5');
    });

    it('should handle empty fields gracefully', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      
      // Submit with only weight filled
      const weightInput = screen.getByLabelText(/weight \(lbs\)/i);
      await user.type(weightInput, '175');
      
      await user.click(screen.getByRole('button', { name: /save measurement/i }));
      
      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/progress/measurements',
          expect.objectContaining({
            weightLbs: 175,
          })
        );
      });
    });

    it('should format date correctly in submission', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MeasurementsTab />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add measurement/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add measurement/i }));
      
      const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
      await user.clear(dateInput);
      await user.type(dateInput, '2024-02-15');
      
      await user.click(screen.getByRole('button', { name: /save measurement/i }));
      
      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/progress/measurements',
          expect.objectContaining({
            measurementDate: expect.stringContaining('2024-02-15'),
          })
        );
      });
    });
  });
});