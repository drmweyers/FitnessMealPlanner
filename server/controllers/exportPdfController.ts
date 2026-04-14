/**
 * PDF Export Controller
 *
 * Handles server-side PDF generation using Puppeteer
 * Implements EvoFit brand styling and layout
 */

import { Request, Response } from "express";
import puppeteer, { Browser } from "puppeteer";
import dayjs from "dayjs";
import {
  compileHtmlTemplate,
  type MealPlanPdfData,
} from "../utils/pdfTemplate";
import { validateMealPlanData } from "../utils/pdfValidation";
import { storage } from "../storage";

interface ExportOptions {
  includeShoppingList?: boolean;
  includeMacroSummary?: boolean;
  includeRecipePhotos?: boolean;
  orientation?: "portrait" | "landscape";
  pageSize?: "A4" | "Letter";
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
export async function exportPdfController(
  req: PdfExportRequest,
  res: Response,
): Promise<void> {
  let browser: Browser | null = null;

  try {
    // Validate request data
    const { mealPlanData, customerName, options = {} } = req.body;

    if (!mealPlanData) {
      res.status(400).json({
        status: "error",
        message: "Meal plan data is required",
        code: "MISSING_MEAL_PLAN_DATA",
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
      orientation: "portrait",
      pageSize: "A4",
      ...options,
    };

    // Prepare data for template
    const templateData: MealPlanPdfData = {
      mealPlan: validatedData,
      customerName: customerName || "Valued Client",
      generatedDate: dayjs().format("MMMM D, YYYY"),
      generatedBy: (req.user as any)?.email || "EvoFit Trainer",
      options: exportOptions,
      brandInfo: {
        name: "EvoFit Meals",
        tagline: "Transform Your Nutrition, Transform Your Life",
        website: "evofitmeals.com",
        colors: {
          primary: "#9333EA",
          accent: "#F97316",
          text: "#1a1a2e",
          grey: "#F4F4F8",
        },
      },
    };

    // Generate HTML from template
    const html = await compileHtmlTemplate(templateData);

    // Calculate meal count for dynamic timeout
    const mealCount = validatedData.meals?.length || 0;

    // Dynamic timeout based on meal count
    // Small plans (<28 meals): 60 seconds
    // Medium plans (28-56 meals): 120 seconds (2 minutes)
    // Large plans (56-100 meals): 180 seconds (3 minutes)
    // Very large plans (100+ meals): 300 seconds (5 minutes)
    let timeout: number;
    if (mealCount <= 28) {
      timeout = 60000;
    } else if (mealCount <= 56) {
      timeout = 120000;
    } else if (mealCount <= 100) {
      timeout = 180000;
    } else {
      timeout = 300000;
    }

    console.log(
      `PDF Export: Processing ${mealCount} meals with ${timeout}ms timeout`,
    );

    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
      headless: true,
    });

    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 });

    // Set content and wait for resources to load
    await page.setContent(html, {
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout,
    });

    // Puppeteer footer — renders in the margin area, never covers content.
    // The EJS template's position:fixed footer is hidden (display:none).
    // Cover page uses negative CSS margins to bleed to page edges.
    const footerTemplate = `
      <div style="font-family: Outfit, Helvetica, sans-serif; font-size: 8pt;
        color: #94949E; padding: 0 24px; width: 100%; display: flex;
        justify-content: space-between; align-items: center;
        border-top: 1px solid #E8E8F0; box-sizing: border-box; height: 100%;">
        <span>
          <span style="font-weight: 600; color: #9333EA;">${templateData.brandInfo.name}</span>
          ${templateData.generatedBy ? `&nbsp;|&nbsp; Trainer: ${templateData.generatedBy}` : ""}
        </span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          &nbsp;&bull;&nbsp; ${templateData.brandInfo.website}
        </span>
      </div>`;

    const pdf = await page.pdf({
      format: exportOptions.pageSize as any,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "10mm", right: "10mm", bottom: "15mm", left: "10mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate,
      timeout,
    });

    await browser.close();
    browser = null;

    // Generate filename
    const safeCustomerName = (customerName || "meal-plan")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    const timestamp = dayjs().format("YYYY-MM-DD");
    const filename = `EvoFit_Meal_Plan_${safeCustomerName}_${timestamp}.pdf`;

    // Set response headers
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdf.length.toString(),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Expires: "-1",
      Pragma: "no-cache",
    });

    // Send PDF as binary data
    res.end(pdf);
  } catch (error) {
    console.error("PDF export error:", error);

    // Ensure browser is closed on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }

    // Return error response
    if (!res.headersSent) {
      res.status(500).json({
        status: "error",
        message: "Failed to generate PDF",
        code: "PDF_GENERATION_FAILED",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      });
    }
  }
}

/**
 * Export specific meal plan by ID to PDF
 */
export async function exportMealPlanPdfController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { planId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get meal plan data from database
    let mealPlan;

    if (userRole === "admin") {
      // Admin can access any meal plan - we need to implement this in storage
      // For now, return error as this requires additional storage methods
      res.status(501).json({
        status: "error",
        message: "Admin meal plan access not yet implemented",
        code: "NOT_IMPLEMENTED",
      });
      return;
    } else if (userRole === "trainer") {
      // Get trainer's customers and their meal plans
      const customers = await (storage as any).getTrainerCustomers?.(userId);
      if (!customers) {
        res.status(404).json({
          status: "error",
          message: "No customers found",
          code: "NO_CUSTOMERS",
        });
        return;
      }

      // Find the meal plan among trainer's customers
      let foundPlan = null;
      let customerName = "";

      for (const customer of customers) {
        const customerMealPlans = await storage.getPersonalizedMealPlans(
          customer.id,
        );
        const targetPlan = customerMealPlans.find(
          (plan: any) => plan.id === planId,
        );
        if (targetPlan) {
          foundPlan = targetPlan;
          customerName = customer.email;
          break;
        }
      }

      if (!foundPlan) {
        res.status(404).json({
          status: "error",
          message: "Meal plan not found or access denied",
          code: "MEAL_PLAN_NOT_FOUND",
        });
        return;
      }

      mealPlan = foundPlan;
    } else {
      // Customer access - get their own meal plans
      const customerMealPlans = await storage.getPersonalizedMealPlans(userId);
      const targetPlan = customerMealPlans.find(
        (plan: any) => plan.id === planId,
      );

      if (!targetPlan) {
        res.status(404).json({
          status: "error",
          message: "Meal plan not found",
          code: "MEAL_PLAN_NOT_FOUND",
        });
        return;
      }

      mealPlan = targetPlan;
    }

    // Use the main export controller with the found meal plan
    req.body = {
      mealPlanData: mealPlan,
      customerName: (req.user as any)?.email,
      options: req.body.options || {},
    };

    await exportPdfController(req as PdfExportRequest, res);
  } catch (error) {
    console.error("Meal plan PDF export error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        status: "error",
        message: "Failed to export meal plan PDF",
        code: "EXPORT_FAILED",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      });
    }
  }
}
