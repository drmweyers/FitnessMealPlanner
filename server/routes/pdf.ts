/**
 * PDF Export Routes
 * 
 * Handles PDF generation for meal plans using Puppeteer
 * Protected routes requiring trainer or admin authentication
 */

import { Router } from 'express';
import { requireAuth } from '../authRoutes';
import { exportPdfController, exportMealPlanPdfController } from '../controllers/exportPdfController';

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

export default pdfRouter;