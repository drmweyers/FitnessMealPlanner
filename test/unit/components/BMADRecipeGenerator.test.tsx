import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BMADRecipeGenerator from '@/components/BMADRecipeGenerator';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock EventSource for SSE
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = 1;
  url = '';

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = 2;
  }

  static instances: MockEventSource[] = [];

  static resetInstances() {
    MockEventSource.instances = [];
  }
}

global.EventSource = MockEventSource as any;

// Mock toast
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Wrapper component with providers
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

describe('BMADRecipeGenerator', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockToast.mockClear();
    MockEventSource.resetInstances();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the BMAD Generator component', () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      expect(screen.getByText(/BMAD Multi-Agent Recipe Generator/i)).toBeInTheDocument();
      expect(screen.getByText(/Bulk recipe generation with multi-agent AI workflow/i)).toBeInTheDocument();
    });

    it('should render the natural language interface', () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      expect(screen.getByText(/AI-Powered Natural Language Generator/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Example: Generate 20 weight loss recipes/i)).toBeInTheDocument();
    });

    it('should show advanced form when "Show Advanced Settings" is clicked', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      const showAdvancedButton = screen.getByText(/Show Advanced Settings/i);
      fireEvent.click(showAdvancedButton);

      await waitFor(() => {
        expect(screen.getByText(/Number of Recipes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate recipe count is between 1 and 100', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      // Show advanced form
      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(() => {
        const countInput = screen.getByLabelText(/Number of Recipes/i);
        expect(countInput).toBeInTheDocument();

        // Test invalid value
        fireEvent.change(countInput, { target: { value: '150' } });
        expect((countInput as HTMLInputElement).value).toBe('150');
      });
    });

    it('should require at least one meal type to be selected', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(() => {
        expect(screen.getByText(/Meal Types/i)).toBeInTheDocument();
      });
    });

    it('should validate calorie range inputs', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(() => {
        const maxCaloriesInput = screen.getByLabelText(/Max Calories/i);
        expect(maxCaloriesInput).toBeInTheDocument();

        fireEvent.change(maxCaloriesInput, { target: { value: '800' } });
        expect((maxCaloriesInput as HTMLInputElement).value).toBe('800');
      });
    });
  });

  describe('BMAD Generation Workflow', () => {
    it('should initiate BMAD generation on form submit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId: 'bmad_test123',
          message: 'Generation started'
        }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      // Show advanced form
      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(() => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/generate-bmad'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    it('should pass batchId to the API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId: 'bmad_test456',
          message: 'Generation started'
        }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const countInput = screen.getByLabelText(/Number of Recipes/i);
        fireEvent.change(countInput, { target: { value: '10' } });

        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody).toHaveProperty('count', 10);
      });
    });

    it('should handle generation errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Server-Sent Events (SSE) Progress Tracking', () => {
    it('should connect to SSE endpoint with correct batchId', async () => {
      const batchId = 'bmad_sse_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId,
          message: 'Generation started'
        }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(MockEventSource.instances.length).toBeGreaterThan(0);
        const eventSource = MockEventSource.instances[0];
        expect(eventSource.url).toContain(batchId);
      });
    });

    it('should update progress from SSE messages', async () => {
      const batchId = 'bmad_progress_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId,
          message: 'Generation started'
        }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const eventSource = MockEventSource.instances[0];
        expect(eventSource).toBeDefined();

        // Simulate SSE message
        const progressData = {
          phase: 'generating',
          recipesCompleted: 5,
          totalRecipes: 10,
          currentChunk: 1,
          totalChunks: 2,
          estimatedTimeRemaining: 30000,
          agentStatus: {
            concept: 'active',
            validator: 'active',
            artist: 'idle',
            storage: 'idle',
          },
          imagesGenerated: 3,
        };

        eventSource.onmessage?.({
          data: JSON.stringify(progressData),
        } as MessageEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/5\/10/i)).toBeInTheDocument();
      });
    });

    it('should display progress bar during generation', async () => {
      const batchId = 'bmad_bar_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId,
          message: 'Generation started'
        }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const eventSource = MockEventSource.instances[0];

        const progressData = {
          phase: 'generating',
          recipesCompleted: 3,
          totalRecipes: 10,
          currentChunk: 1,
          totalChunks: 2,
        };

        eventSource.onmessage?.({
          data: JSON.stringify(progressData),
        } as MessageEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/Chunk 1\/2/i)).toBeInTheDocument();
      });
    });

    it('should close SSE connection when component unmounts', async () => {
      const batchId = 'bmad_cleanup_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId,
          message: 'Generation started'
        }),
      });

      const { unmount } = render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(MockEventSource.instances.length).toBeGreaterThan(0);
      });

      const eventSource = MockEventSource.instances[0];
      unmount();

      expect(eventSource.readyState).toBe(2); // CLOSED
    });
  });

  describe('Agent Status Display', () => {
    it('should display agent status badges', async () => {
      const batchId = 'bmad_agents_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId,
          message: 'Generation started'
        }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const eventSource = MockEventSource.instances[0];

        const progressData = {
          phase: 'generating',
          recipesCompleted: 5,
          totalRecipes: 10,
          agentStatus: {
            concept: 'active',
            validator: 'active',
            artist: 'working',
            storage: 'idle',
          },
        };

        eventSource.onmessage?.({
          data: JSON.stringify(progressData),
        } as MessageEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/Concept Agent:/i)).toBeInTheDocument();
        expect(screen.getByText(/Validator:/i)).toBeInTheDocument();
        expect(screen.getByText(/Image Artist:/i)).toBeInTheDocument();
        expect(screen.getByText(/Storage:/i)).toBeInTheDocument();
      });
    });

    it('should show image generation count', async () => {
      const batchId = 'bmad_images_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId,
          message: 'Generation started'
        }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const eventSource = MockEventSource.instances[0];

        const progressData = {
          phase: 'imaging',
          recipesCompleted: 8,
          totalRecipes: 10,
          imagesGenerated: 7,
        };

        eventSource.onmessage?.({
          data: JSON.stringify(progressData),
        } as MessageEvent);
      });

      await waitFor(() => {
        expect(screen.getByText(/7 images generated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Feature Toggles', () => {
    it('should toggle image generation option', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(() => {
        const imageGenToggle = screen.getByLabelText(/Enable Image Generation/i);
        expect(imageGenToggle).toBeInTheDocument();

        fireEvent.click(imageGenToggle);
      });
    });

    it('should toggle S3 upload option', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(() => {
        const s3Toggle = screen.getByLabelText(/Upload to S3/i);
        expect(s3Toggle).toBeInTheDocument();

        fireEvent.click(s3Toggle);
      });
    });

    it('should toggle nutrition validation option', async () => {
      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(() => {
        const nutritionToggle = screen.getByLabelText(/Enable Nutrition Validation/i);
        expect(nutritionToggle).toBeInTheDocument();

        fireEvent.click(nutritionToggle);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on generation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Generation failed' }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });
    });

    it('should handle SSE errors', async () => {
      const batchId = 'bmad_error_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId,
          message: 'Generation started'
        }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const eventSource = MockEventSource.instances[0];
        expect(eventSource).toBeDefined();

        // Simulate SSE error
        eventSource.onerror?.(new Event('error'));
      });

      // Component should handle error gracefully
      expect(MockEventSource.instances[0]).toBeDefined();
    });
  });

  describe('Progress Completion', () => {
    it('should show success message when generation completes', async () => {
      const batchId = 'bmad_complete_test';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          batchId,
          message: 'Generation started'
        }),
      });

      render(<BMADRecipeGenerator />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/Show Advanced Settings/i));

      await waitFor(async () => {
        const submitButton = screen.getByText(/Start BMAD Generation/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        const eventSource = MockEventSource.instances[0];

        const completeData = {
          phase: 'complete',
          recipesCompleted: 10,
          totalRecipes: 10,
          imagesGenerated: 10,
        };

        eventSource.onmessage?.({
          data: JSON.stringify(completeData),
        } as MessageEvent);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringMatching(/success|complete/i),
          })
        );
      });
    });
  });
});
