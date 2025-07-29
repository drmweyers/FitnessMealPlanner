/**
 * PDF Export Controller
 * 
 * Handles server-side PDF generation using Puppeteer
 * Implements EvoFit brand styling and layout
 */

import { Request, Response } from 'express';
import puppeteer, { Browser } from 'puppeteer';
import dayjs from 'dayjs';
import { compileHtmlTemplate, type MealPlanPdfData } from '../utils/pdfTemplate';
import { validateMealPlanData } from '../utils/pdfValidation';
import { storage } from '../storage';

interface ExportOptions {
  includeShoppingList?: boolean;
  includeMacroSummary?: boolean;
  includeRecipePhotos?: boolean;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter';
}

interface PdfExportRequest extends Request {
  body: {
    mealPlanData: any;
    customerName?: string;
    options?: ExportOptions;
  };
}

/**
 * Export meal plan data to PDF
 */
export async function exportPdfController(req: PdfExportRequest, res: Response): Promise<void> {
  let browser: Browser | null = null;
  
  try {
    // Validate request data
    const { mealPlanData, customerName, options = {} } = req.body;
    
    if (!mealPlanData) {
      res.status(400).json({ 
        status: 'error', 
        message: 'Meal plan data is required',
        code: 'MISSING_MEAL_PLAN_DATA'
      });
      return;
    }

    // Validate and transform meal plan data
    const validatedData = await validateMealPlanData(mealPlanData);
    
    // Set default options
    const exportOptions: ExportOptions = {
      includeShoppingList: true,
      includeMacroSummary: true,
      includeRecipePhotos: false, // Disabled for performance
      orientation: 'portrait',
      pageSize: 'A4',
      ...options
    };

    // Prepare data for template
    const templateData: MealPlanPdfData = {
      mealPlan: validatedData,
      customerName: customerName || 'Valued Client',
      generatedDate: dayjs().format('MMMM D, YYYY'),
      generatedBy: (req.user as any)?.email || 'EvoFit Trainer',
      options: exportOptions,
      brandInfo: {
        name: 'EvoFit Meals',
        tagline: 'Transform Your Nutrition, Transform Your Life',
        website: 'www.evofit.com',
        colors: {
          primary: '#EB5757',
          accent: '#27AE60',
          text: '#333333',
          grey: '#F2F2F2'
        }
      }
    };

    // Generate HTML from template
    const html = await compileHtmlTemplate(templateData);

    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      headless: true
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 });
    
    // Set content and wait for resources to load
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    // Generate PDF with optimal settings
    const pdf = await page.pdf({
      format: exportOptions.pageSize as any,
      printBackground: true,
      margin: { 
        top: '20mm', 
        bottom: '20mm', 
        left: '24mm', 
        right: '24mm' 
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false
    });

    await browser.close();
    browser = null;

    // Generate filename
    const safeCustomerName = (customerName || 'meal-plan')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const timestamp = dayjs().format('YYYY-MM-DD');
    const filename = `EvoFit_Meal_Plan_${safeCustomerName}_${timestamp}.pdf`;

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length.toString(),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Expires': '-1',
      'Pragma': 'no-cache'
    });

    // Send PDF as binary data
    res.end(pdf);

  } catch (error) {
    console.error('PDF export error:', error);
    
    // Ensure browser is closed on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }

    // Return error response
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate PDF',
        code: 'PDF_GENERATION_FAILED',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
}

/**
 * Export specific meal plan by ID to PDF
 */
export async function exportMealPlanPdfController(req: Request, res: Response): Promise<void> {
  try {
    const { planId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get meal plan data from database
    let mealPlan;
    
    if (userRole === 'admin') {
      // Admin can access any meal plan - we need to implement this in storage
      // For now, return error as this requires additional storage methods
      res.status(501).json({
        status: 'error',
        message: 'Admin meal plan access not yet implemented',
        code: 'NOT_IMPLEMENTED'
      });
      return;
    } else if (userRole === 'trainer') {
      // Get trainer's customers and their meal plans
      const customers = await (storage as any).getTrainerCustomers?.(userId);
      if (!customers) {
        res.status(404).json({
          status: 'error',
          message: 'No customers found',
          code: 'NO_CUSTOMERS'
        });
        return;
      }

      // Find the meal plan among trainer's customers
      let foundPlan = null;
      let customerName = '';
      
      for (const customer of customers) {
        const customerMealPlans = await storage.getPersonalizedMealPlans(customer.id);
        const targetPlan = customerMealPlans.find((plan: any) => plan.id === planId);
        if (targetPlan) {
          foundPlan = targetPlan;
          customerName = customer.email;
          break;
        }
      }

      if (!foundPlan) {
        res.status(404).json({
          status: 'error',
          message: 'Meal plan not found or access denied',
          code: 'MEAL_PLAN_NOT_FOUND'
        });
        return;
      }

      mealPlan = foundPlan;
    } else {
      // Customer access - get their own meal plans
      const customerMealPlans = await storage.getPersonalizedMealPlans(userId);
      const targetPlan = customerMealPlans.find((plan: any) => plan.id === planId);
      
      if (!targetPlan) {
        res.status(404).json({
          status: 'error',
          message: 'Meal plan not found',
          code: 'MEAL_PLAN_NOT_FOUND'
        });
        return;
      }

      mealPlan = targetPlan;
    }

    // Use the main export controller with the found meal plan
    req.body = {
      mealPlanData: mealPlan,
      customerName: (req.user as any)?.email,
      options: req.body.options || {}
    };

    await exportPdfController(req as PdfExportRequest, res);

  } catch (error) {
    console.error('Meal plan PDF export error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to export meal plan PDF',
        code: 'EXPORT_FAILED',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
}