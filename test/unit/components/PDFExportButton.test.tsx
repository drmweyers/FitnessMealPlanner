/**
 * PDFExportButton Component Tests
 * 
 * Comprehensive tests for the PDFExportButton component covering:
 * - PDF generation triggering
 * - Loading states and user feedback
 * - Error handling and recovery
 * - Different export formats and options
 * - Integration with external PDF libraries
 * - Accessibility and user experience
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PDFExportButton from '@/components/PDFExportButton';
import { renderWithProviders, createMockMealPlan } from '../../test-utils';

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockAddPage = vi.fn();

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    text: mockText,
    setFontSize: mockSetFontSize,
    addPage: mockAddPage,
    save: mockSave,
    internal: {
      pageSize: { width: 210, height: 297 },
    },
  })),
}));

// Mock html2canvas
const mockHtml2Canvas = vi.fn();
vi.mock('html2canvas', () => ({
  default: mockHtml2Canvas.mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock-image-data'),
  }),
}));

// Mock API requests
const mockApiRequest = vi.fn();
vi.mock('@/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
}));

describe('PDFExportButton', () => {
  const mockMealPlan = createMockMealPlan({
    id: 'test-meal-plan',
    name: 'Test Meal Plan for Export',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockClear();
    mockSave.mockClear();
    mockText.mockClear();
    mockSetFontSize.mockClear();
    mockAddPage.mockClear();
    mockHtml2Canvas.mockClear();
  });

  describe('Basic Rendering', () => {
    it('renders export button correctly', () => {
      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });

    it('shows appropriate button text', () => {
      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      expect(screen.getByText(/export pdf/i)).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      renderWithProviders(
        <PDFExportButton 
          mealPlan={mockMealPlan} 
          className="custom-export-button"
        />
      );

      const button = screen.getByRole('button', { name: /export pdf/i });
      expect(button).toHaveClass('custom-export-button');
    });

    it('renders with custom children', () => {
      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan}>
          <span>Custom Export Text</span>
        </PDFExportButton>
      );

      expect(screen.getByText('Custom Export Text')).toBeInTheDocument();
    });
  });

  describe('PDF Export Functionality', () => {
    it('triggers PDF export on click', async () => {
      const user = userEvent.setup();

      mockApiRequest.mockResolvedValueOnce({
        success: true,
        pdfUrl: 'http://example.com/test-meal-plan.pdf',
      });

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith({
          method: 'POST',
          endpoint: '/pdf/export/meal-plan/test-meal-plan',
        });
      });
    });

    it('shows loading state during export', async () => {
      const user = userEvent.setup();

      // Mock a delayed response
      mockApiRequest.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            pdfUrl: 'http://example.com/test-meal-plan.pdf',
          }), 100)
        )
      );

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      // Should show loading state
      expect(screen.getByText(/exporting/i)).toBeInTheDocument();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(exportButton).toBeDisabled();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText(/exporting/i)).not.toBeInTheDocument();
      });
    });

    it('handles successful server-side PDF generation', async () => {
      const user = userEvent.setup();
      const mockUrl = 'http://example.com/generated-meal-plan.pdf';

      mockApiRequest.mockResolvedValueOnce({
        success: true,
        pdfUrl: mockUrl,
      });

      // Mock URL creation and download
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock fetch for PDF download
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['mock-pdf-data'], { type: 'application/pdf' })),
      });

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledWith({
          method: 'POST',
          endpoint: '/pdf/export/meal-plan/test-meal-plan',
        });
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(mockUrl);
      });
    });

    it('falls back to client-side generation on server error', async () => {
      const user = userEvent.setup();

      // Mock server error
      mockApiRequest.mockRejectedValueOnce(new Error('Server PDF generation failed'));

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });

      // Should fall back to client-side generation
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith('Test Meal Plan for Export.pdf');
      });
    });

    it('uses client-side generation when specified', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} useClientSide={true} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      // Should not call server API
      expect(mockApiRequest).not.toHaveBeenCalled();

      // Should use jsPDF directly
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith('Test Meal Plan for Export.pdf');
      });
    });
  });

  describe('Client-side PDF Generation', () => {
    it('generates PDF with correct meal plan content', async () => {
      const user = userEvent.setup();

      const detailedMealPlan = createMockMealPlan({
        name: 'Detailed Test Plan',
        targetCalories: 2000,
        targetProtein: 150,
        days: 7,
      });

      renderWithProviders(
        <PDFExportButton mealPlan={detailedMealPlan} useClientSide={true} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockText).toHaveBeenCalledWith(
          expect.stringContaining('Detailed Test Plan'),
          expect.any(Number),
          expect.any(Number)
        );
      });

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('2000 calories'),
        expect.any(Number),
        expect.any(Number)
      );

      expect(mockSave).toHaveBeenCalledWith('Detailed Test Plan.pdf');
    });

    it('handles PDF generation with meal data', async () => {
      const user = userEvent.setup();

      const mealPlanWithMeals = createMockMealPlan({
        name: 'Plan with Meals',
        meals: [
          {
            day: 1,
            mealType: 'breakfast',
            recipe: {
              name: 'Protein Pancakes',
              caloriesKcal: 350,
              proteinGrams: '25',
            },
          },
        ],
      });

      renderWithProviders(
        <PDFExportButton mealPlan={mealPlanWithMeals} useClientSide={true} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockText).toHaveBeenCalledWith(
          expect.stringContaining('Protein Pancakes'),
          expect.any(Number),
          expect.any(Number)
        );
      });
    });

    it('adds page breaks for long content', async () => {
      const user = userEvent.setup();

      // Create meal plan with many meals to trigger page breaks
      const longMealPlan = createMockMealPlan({
        meals: Array.from({ length: 50 }, (_, i) => ({
          day: Math.floor(i / 3) + 1,
          mealType: ['breakfast', 'lunch', 'dinner'][i % 3],
          recipe: {
            name: `Recipe ${i + 1}`,
            caloriesKcal: 300,
            proteinGrams: '20',
          },
        })),
      });

      renderWithProviders(
        <PDFExportButton mealPlan={longMealPlan} useClientSide={true} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockAddPage).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles server-side export errors gracefully', async () => {
      const user = userEvent.setup();

      mockApiRequest.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });

    it('handles client-side generation errors', async () => {
      const user = userEvent.setup();

      // Mock jsPDF constructor to throw error
      vi.mocked(require('jspdf').default).mockImplementationOnce(() => {
        throw new Error('PDF generation failed');
      });

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} useClientSide={true} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });
    });

    it('shows retry option after error', async () => {
      const user = userEvent.setup();

      mockApiRequest.mockRejectedValueOnce(new Error('First attempt failed'));
      mockApiRequest.mockResolvedValueOnce({
        success: true,
        pdfUrl: 'http://example.com/retry-success.pdf',
      });

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/export failed/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User Experience', () => {
    it('provides progress feedback during export', async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockApiRequest.mockReturnValueOnce(pendingPromise);

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      // Should show progress
      expect(screen.getByText(/exporting/i)).toBeInTheDocument();
      expect(exportButton).toBeDisabled();

      // Complete the export
      resolvePromise!({
        success: true,
        pdfUrl: 'http://example.com/completed.pdf',
      });

      await waitFor(() => {
        expect(screen.queryByText(/exporting/i)).not.toBeInTheDocument();
      });
    });

    it('shows success message after completion', async () => {
      const user = userEvent.setup();

      mockApiRequest.mockResolvedValueOnce({
        success: true,
        pdfUrl: 'http://example.com/success.pdf',
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['pdf-data'])),
      });

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/pdf exported successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const button = screen.getByRole('button', { name: /export pdf/i });
      expect(button).toHaveAttribute('type', 'button');
    });

    it('provides screen reader feedback during loading', async () => {
      const user = userEvent.setup();

      mockApiRequest.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({ success: true, pdfUrl: 'test.pdf' }), 100)
        )
      );

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      expect(screen.getByLabelText(/exporting pdf/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      mockApiRequest.mockResolvedValueOnce({
        success: true,
        pdfUrl: 'http://example.com/keyboard.pdf',
      });

      renderWithProviders(
        <PDFExportButton mealPlan={mockMealPlan} />
      );

      // Tab to button and press Enter
      await user.tab();
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      expect(exportButton).toHaveFocus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockApiRequest).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles meal plan with no name', async () => {
      const user = userEvent.setup();

      const namelessPlan = createMockMealPlan({
        name: '',
      });

      renderWithProviders(
        <PDFExportButton mealPlan={namelessPlan} useClientSide={true} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith('Meal Plan.pdf');
      });
    });

    it('handles meal plan with special characters in name', async () => {
      const user = userEvent.setup();

      const specialCharPlan = createMockMealPlan({
        name: 'Plan with "Special" Characters & Symbols!',
      });

      renderWithProviders(
        <PDFExportButton mealPlan={specialCharPlan} useClientSide={true} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith('Plan with Special Characters & Symbols!.pdf');
      });
    });

    it('handles meal plan with empty meals array', async () => {
      const user = userEvent.setup();

      const emptyMealPlan = createMockMealPlan({
        meals: [],
      });

      renderWithProviders(
        <PDFExportButton mealPlan={emptyMealPlan} useClientSide={true} />
      );

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalled();
      });
    });
  });
});