/**
 * PDF Export Routes
 * 
 * Handles PDF generation for meal plans and progress reports using Puppeteer
 * Protected routes requiring appropriate authentication
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { exportPdfController, exportMealPlanPdfController } from '../controllers/exportPdfController';
import { pdfGenerationService } from '../services/pdfGenerationService';

const pdfRouter = Router();

/**
 * POST /api/pdf/export
 * Export meal plan to PDF
 * 
 * Body: { mealPlanData: MealPlan, customerName?: string, options?: ExportOptions }
 * Returns: PDF file stream
 */
pdfRouter.post('/export', requireAuth, (req, res, next) => {
  const userRole = (req as any).user?.role;
  if (userRole === 'trainer' || userRole === 'admin') {
    return next();
  }
  return res.status(403).json({ 
    status: 'error',
    message: 'Insufficient permissions',
    code: 'FORBIDDEN'
  });
}, exportPdfController);

/**
 * POST /api/pdf/test-export
 * Test PDF export without authentication (for development only)
 * 
 * Body: { mealPlanData: MealPlan, customerName?: string, options?: ExportOptions }
 * Returns: PDF file stream
 */
pdfRouter.post('/test-export', exportPdfController);

/**
 * POST /api/pdf/export/meal-plan/:planId
 * Export specific meal plan by ID to PDF
 * 
 * Returns: PDF file stream
 */
pdfRouter.post('/export/meal-plan/:planId', requireAuth, (req, res, next) => {
  const userRole = (req as any).user?.role;
  if (userRole === 'trainer' || userRole === 'admin') {
    return next();
  }
  return res.status(403).json({ 
    status: 'error',
    message: 'Insufficient permissions',
    code: 'FORBIDDEN'
  });
}, exportMealPlanPdfController);

/**
 * POST /api/pdf/export/progress-report
 * Generate progress report PDF for a customer
 * 
 * Body: { 
 *   customerId: string, 
 *   dateRange?: { start: Date, end: Date },
 *   options?: ProgressReportPdfOptions 
 * }
 * Returns: PDF file stream
 */
pdfRouter.post('/export/progress-report', requireAuth, async (req, res) => {
  try {
    const { customerId, dateRange, options = {} } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Authorization check
    if (userRole === 'customer' && customerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Customers can only export their own progress reports',
        code: 'FORBIDDEN'
      });
    }

    if (userRole === 'trainer') {
      // Check if customer belongs to trainer
      // This would need implementation in storage
    }

    // Generate progress report PDF
    const result = await pdfGenerationService.generateProgressReportPdf(
      customerId,
      { ...options, dateRange }
    );

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: result.error || 'Failed to generate progress report',
        code: 'PDF_GENERATION_FAILED'
      });
    }

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': result.pdfBuffer!.length.toString(),
      'Content-Disposition': `attachment; filename="${result.fileName}"`,
      'Cache-Control': 'private, no-cache, no-store, must-revalidate'
    });

    // Send PDF
    res.end(result.pdfBuffer);

  } catch (error) {
    console.error('Progress report PDF export error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export progress report',
      code: 'EXPORT_FAILED'
    });
  }
});

/**
 * POST /api/pdf/export/batch
 * Generate multiple PDFs in batch
 * 
 * Body: { 
 *   items: Array<{ type: 'meal-plan' | 'progress-report', id: string, options?: any }>,
 *   combinedPdf?: boolean 
 * }
 * Returns: Array of PDF results or combined PDF
 */
pdfRouter.post('/export/batch', requireAuth, async (req, res) => {
  try {
    const { items, combinedPdf = false } = req.body;
    const userRole = (req as any).user?.role;

    // Only trainers and admins can batch export
    if (userRole !== 'trainer' && userRole !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions for batch export',
        code: 'FORBIDDEN'
      });
    }

    // Generate batch PDFs
    const results = await pdfGenerationService.generateBatchPdfs(items, combinedPdf);

    // Check if all succeeded
    const allSuccessful = results.every(r => r.success);

    if (!allSuccessful) {
      return res.status(207).json({
        status: 'partial',
        message: 'Some PDFs failed to generate',
        data: results
      });
    }

    // If combined PDF requested and all successful
    if (combinedPdf && results.length > 0) {
      const combinedResult = results[0]; // Assuming combined PDF is returned as first result
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': combinedResult.pdfBuffer!.length.toString(),
        'Content-Disposition': `attachment; filename="combined_export.pdf"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      });
      res.end(combinedResult.pdfBuffer);
    } else {
      // Return success with metadata
      res.json({
        status: 'success',
        message: `Successfully generated ${results.length} PDFs`,
        data: results.map(r => ({
          success: r.success,
          fileName: r.fileName,
          metadata: r.metadata
        }))
      });
    }

  } catch (error) {
    console.error('Batch PDF export error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export batch PDFs',
      code: 'BATCH_EXPORT_FAILED'
    });
  }
});

/**
 * GET /api/pdf/templates
 * Get available PDF templates and their options
 * 
 * Returns: List of available templates with configuration options
 */
pdfRouter.get('/templates', requireAuth, (req, res) => {
  const templates = {
    mealPlan: {
      name: 'Meal Plan PDF',
      description: 'Professional meal plan with recipes and nutritional information',
      options: {
        includeShoppingList: { type: 'boolean', default: true },
        includeMacroSummary: { type: 'boolean', default: true },
        includeRecipePhotos: { type: 'boolean', default: false },
        includePrepSchedule: { type: 'boolean', default: true },
        includeNutritionalCharts: { type: 'boolean', default: true },
        groupByDay: { type: 'boolean', default: true },
        format: { type: 'enum', values: ['A4', 'Letter'], default: 'A4' },
        orientation: { type: 'enum', values: ['portrait', 'landscape'], default: 'portrait' }
      }
    },
    progressReport: {
      name: 'Progress Report PDF',
      description: 'Comprehensive progress tracking report with measurements and goals',
      options: {
        includeMeasurements: { type: 'boolean', default: true },
        includeGoals: { type: 'boolean', default: true },
        includePhotos: { type: 'boolean', default: true },
        includeMilestones: { type: 'boolean', default: true },
        includeCharts: { type: 'boolean', default: true },
        includeComparisons: { type: 'boolean', default: true },
        photoPrivacy: { type: 'enum', values: ['none', 'blur', 'exclude'], default: 'none' },
        format: { type: 'enum', values: ['A4', 'Letter'], default: 'A4' },
        orientation: { type: 'enum', values: ['portrait', 'landscape'], default: 'portrait' }
      }
    }
  };

  res.json({
    status: 'success',
    data: templates
  });
});

export default pdfRouter;