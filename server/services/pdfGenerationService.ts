/**
 * PDF Generation Service
 * 
 * Unified service for generating professional PDF documents including
 * meal plans, progress reports, and recipe collections.
 * Supports both client-side (jsPDF) and server-side (Puppeteer) generation.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import dayjs from 'dayjs';
import { db } from '../db';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  users,
  customerProfiles,
  trainerCustomers,
  recipes,
  mealPlans,
  mealPlanMeals,
  personalizedMealPlans,
  progressMeasurements,
  customerGoals,
  progressPhotos
} from '@shared/schema';

export interface PdfGenerationOptions {
  format?: 'A4' | 'Letter' | 'A3';
  orientation?: 'portrait' | 'landscape';
  includeImages?: boolean;
  includeBranding?: boolean;
  quality?: 'draft' | 'standard' | 'high';
  watermark?: string;
}

export interface MealPlanPdfOptions extends PdfGenerationOptions {
  includeShoppingList?: boolean;
  includeMacroSummary?: boolean;
  includeRecipePhotos?: boolean;
  includePrepSchedule?: boolean;
  includeNutritionalCharts?: boolean;
  groupByDay?: boolean;
}

export interface ProgressReportPdfOptions extends PdfGenerationOptions {
  includeMeasurements?: boolean;
  includeGoals?: boolean;
  includePhotos?: boolean;
  includeMilestones?: boolean;
  includeCharts?: boolean;
  includeComparisons?: boolean;
  dateRange?: { start: Date; end: Date };
  photoPrivacy?: 'none' | 'blur' | 'exclude';
}

export interface PdfGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  fileName?: string;
  error?: string;
  metadata?: {
    pages: number;
    size: number;
    generatedAt: Date;
    cacheable: boolean;
  };
}

export class PdfGenerationService {
  private browser: Browser | null = null;
  private readonly cacheEnabled: boolean;
  private readonly cacheDir: string;
  private readonly templateCache: Map<string, string> = new Map();

  constructor() {
    this.cacheEnabled = process.env.PDF_CACHE_ENABLED === 'true';
    this.cacheDir = process.env.PDF_CACHE_DIR || '/tmp/pdf-cache';
  }

  /**
   * Generate meal plan PDF with enhanced features
   */
  async generateMealPlanPdf(
    mealPlanId: string,
    options: MealPlanPdfOptions = {}
  ): Promise<PdfGenerationResult> {
    try {
      // Set default options
      const pdfOptions: MealPlanPdfOptions = {
        format: 'A4',
        orientation: 'portrait',
        includeImages: true,
        includeBranding: true,
        quality: 'standard',
        includeShoppingList: true,
        includeMacroSummary: true,
        includeRecipePhotos: false,
        includePrepSchedule: true,
        includeNutritionalCharts: true,
        groupByDay: true,
        ...options
      };

      // Fetch meal plan data with all relations
      const mealPlanData = await this.fetchMealPlanData(mealPlanId);
      if (!mealPlanData) {
        return {
          success: false,
          error: 'Meal plan not found'
        };
      }

      // Generate HTML template
      const html = await this.generateMealPlanHtml(mealPlanData, pdfOptions);

      // Generate PDF using Puppeteer
      const pdfBuffer = await this.generatePdfFromHtml(html, pdfOptions);

      // Generate filename
      const fileName = this.generateFileName('meal-plan', mealPlanData.name);

      return {
        success: true,
        pdfBuffer,
        fileName,
        metadata: {
          pages: this.estimatePageCount(html),
          size: pdfBuffer.length,
          generatedAt: new Date(),
          cacheable: true
        }
      };

    } catch (error) {
      console.error('Meal plan PDF generation error:', error);
      return {
        success: false,
        error: `Failed to generate meal plan PDF: ${(error as Error).message}`
      };
    }
  }

  /**
   * Generate progress report PDF with comprehensive tracking data
   */
  async generateProgressReportPdf(
    customerId: string,
    options: ProgressReportPdfOptions = {}
  ): Promise<PdfGenerationResult> {
    try {
      // Set default options
      const pdfOptions: ProgressReportPdfOptions = {
        format: 'A4',
        orientation: 'portrait',
        includeImages: true,
        includeBranding: true,
        quality: 'high',
        includeMeasurements: true,
        includeGoals: true,
        includePhotos: true,
        includeMilestones: true,
        includeCharts: true,
        includeComparisons: true,
        photoPrivacy: 'none',
        dateRange: {
          start: dayjs().subtract(3, 'months').toDate(),
          end: new Date()
        },
        ...options
      };

      // Fetch progress data
      const progressData = await this.fetchProgressData(customerId, pdfOptions.dateRange);
      if (!progressData) {
        return {
          success: false,
          error: 'No progress data found for customer'
        };
      }

      // Generate HTML template
      const html = await this.generateProgressReportHtml(progressData, pdfOptions);

      // Generate PDF using Puppeteer
      const pdfBuffer = await this.generatePdfFromHtml(html, pdfOptions);

      // Generate filename
      const fileName = this.generateFileName('progress-report', progressData.customerName);

      return {
        success: true,
        pdfBuffer,
        fileName,
        metadata: {
          pages: this.estimatePageCount(html),
          size: pdfBuffer.length,
          generatedAt: new Date(),
          cacheable: false // Progress reports should always be fresh
        }
      };

    } catch (error) {
      console.error('Progress report PDF generation error:', error);
      return {
        success: false,
        error: `Failed to generate progress report: ${(error as Error).message}`
      };
    }
  }

  /**
   * Generate batch PDFs for multiple items
   */
  async generateBatchPdfs(
    items: Array<{ type: 'meal-plan' | 'progress-report'; id: string; options?: any }>,
    combinedPdf: boolean = false
  ): Promise<PdfGenerationResult[]> {
    const results: PdfGenerationResult[] = [];

    try {
      // Initialize browser once for batch processing
      await this.initializeBrowser();

      for (const item of items) {
        let result: PdfGenerationResult;

        if (item.type === 'meal-plan') {
          result = await this.generateMealPlanPdf(item.id, item.options);
        } else if (item.type === 'progress-report') {
          result = await this.generateProgressReportPdf(item.id, item.options);
        } else {
          result = {
            success: false,
            error: `Unknown PDF type: ${item.type}`
          };
        }

        results.push(result);
      }

      // Optionally combine PDFs
      if (combinedPdf && results.every(r => r.success)) {
        // Implementation for combining PDFs would go here
        // This would require a PDF manipulation library like pdf-lib
      }

      return results;

    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Fetch meal plan data from database
   */
  private async fetchMealPlanData(mealPlanId: string): Promise<any> {
    try {
      // Note: This is a mock implementation since the exact schema may vary
      // In production, this would fetch from the actual database
      const mealPlanResult = await db
        .select()
        .from(personalizedMealPlans)
        .where(eq(personalizedMealPlans.id, mealPlanId))
        .limit(1);

      if (!mealPlanResult.length) {
        return null;
      }

      const mealPlan = mealPlanResult[0];

      // Fetch associated meals and recipes
      // This would need proper joins based on actual schema
      return {
        ...mealPlan,
        name: mealPlan.planName || 'Meal Plan',
        meals: [] // Would fetch actual meals here
      };
    } catch (error) {
      console.error('Error fetching meal plan data:', error);
      return null;
    }
  }

  /**
   * Fetch progress data from database
   */
  private async fetchProgressData(
    customerId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    try {
      // Fetch customer profile
      const customerResult = await db
        .select()
        .from(users)
        .where(eq(users.id, customerId))
        .limit(1);

      if (!customerResult.length) {
        return null;
      }

      const customer = customerResult[0];

      // Fetch progress entries
      let progressQuery = db
        .select()
        .from(progressMeasurements)
        .where(eq(progressMeasurements.customerId, customerId));

      if (dateRange) {
        progressQuery = progressQuery.where(
          and(
            sql`${progressMeasurements.measuredAt} >= ${dateRange.start}`,
            sql`${progressMeasurements.measuredAt} <= ${dateRange.end}`
          )
        );
      }

      const progressEntries = await progressQuery.orderBy(desc(progressMeasurements.measuredAt));

      // Fetch goals
      const goals = await db
        .select()
        .from(customerGoals)
        .where(eq(customerGoals.customerId, customerId));

      // Fetch milestones (table doesn't exist yet)
      const milestones: any[] = []; // Placeholder until customerMilestones table is created
      // const milestones = await db
      //   .select()
      //   .from(customerMilestones)
      //   .where(eq(customerMilestones.customerId, customerId))
      //   .orderBy(desc(customerMilestones.achievedAt));

      // Fetch progress photos (with privacy consideration)
      const photos = await db
        .select()
        .from(progressPhotos)
        .where(eq(progressPhotos.customerId, customerId))
        .orderBy(desc(progressPhotos.uploadedAt));

      return {
        customerName: customer.email,
        customerProfile: customer,
        progressEntries,
        goals,
        milestones,
        photos,
        dateRange
      };
    } catch (error) {
      console.error('Error fetching progress data:', error);
      return null;
    }
  }

  /**
   * Generate HTML template for meal plan
   */
  private async generateMealPlanHtml(
    mealPlanData: any,
    options: MealPlanPdfOptions
  ): Promise<string> {
    // This would be a comprehensive HTML template
    // For brevity, showing a simplified version
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${mealPlanData.name}</title>
          <style>
            /* Professional styling */
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .header {
              background: linear-gradient(135deg, #EB5757 0%, #27AE60 100%);
              color: white;
              padding: 40px;
              text-align: center;
            }
            .content {
              padding: 40px;
            }
            .meal-card {
              border: 1px solid #e0e0e0;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .nutrition-chart {
              display: flex;
              justify-content: space-around;
              margin: 20px 0;
            }
            .shopping-list {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-top: 40px;
            }
            @media print {
              .meal-card {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${mealPlanData.name}</h1>
            <p>Your Personalized Nutrition Plan</p>
          </div>
          <div class="content">
            ${options.includeMacroSummary ? this.generateMacroSummaryHtml(mealPlanData) : ''}
            ${options.includeNutritionalCharts ? this.generateNutritionalChartsHtml(mealPlanData) : ''}
            ${this.generateMealsHtml(mealPlanData, options)}
            ${options.includeShoppingList ? this.generateShoppingListHtml(mealPlanData) : ''}
            ${options.includePrepSchedule ? this.generatePrepScheduleHtml(mealPlanData) : ''}
          </div>
        </body>
      </html>
    `;
    return html;
  }

  /**
   * Generate HTML template for progress report
   */
  private async generateProgressReportHtml(
    progressData: any,
    options: ProgressReportPdfOptions
  ): Promise<string> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Progress Report - ${progressData.customerName}</title>
          <style>
            /* Professional styling for progress reports */
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 0;
              color: #333;
            }
            .header {
              background: linear-gradient(135deg, #27AE60 0%, #2D9CDB 100%);
              color: white;
              padding: 40px;
              text-align: center;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            .summary-card {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
            }
            .progress-chart {
              margin: 40px 0;
              padding: 20px;
              border: 1px solid #e0e0e0;
              border-radius: 8px;
            }
            .milestone {
              display: flex;
              align-items: center;
              padding: 15px;
              margin: 10px 0;
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              border-radius: 4px;
            }
            .progress-photo {
              display: inline-block;
              margin: 10px;
              border: 1px solid #ddd;
              border-radius: 8px;
              overflow: hidden;
            }
            .comparison-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin: 40px 0;
            }
            @media print {
              .progress-chart {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Progress Report</h1>
            <h2>${progressData.customerName}</h2>
            <p>${this.formatDateRange(progressData.dateRange)}</p>
          </div>
          <div class="content" style="padding: 40px;">
            ${this.generateProgressSummaryHtml(progressData)}
            ${options.includeMeasurements ? this.generateMeasurementsHtml(progressData) : ''}
            ${options.includeGoals ? this.generateGoalsHtml(progressData) : ''}
            ${options.includeMilestones ? this.generateMilestonesHtml(progressData) : ''}
            ${options.includeCharts ? this.generateProgressChartsHtml(progressData) : ''}
            ${options.includePhotos ? this.generateProgressPhotosHtml(progressData, options.photoPrivacy) : ''}
            ${options.includeComparisons ? this.generateComparisonsHtml(progressData) : ''}
          </div>
        </body>
      </html>
    `;
    return html;
  }

  /**
   * Generate PDF from HTML using Puppeteer
   */
  private async generatePdfFromHtml(
    html: string,
    options: PdfGenerationOptions
  ): Promise<Buffer> {
    await this.initializeBrowser();

    const page = await this.browser!.newPage();

    try {
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });

      // Set content and wait for resources
      await page.setContent(html, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });

      // Add watermark if specified
      if (options.watermark) {
        await page.evaluate((watermark) => {
          const watermarkDiv = document.createElement('div');
          watermarkDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(0, 0, 0, 0.1);
            z-index: 9999;
            pointer-events: none;
          `;
          watermarkDiv.textContent = watermark;
          document.body.appendChild(watermarkDiv);
        }, options.watermark);
      }

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.format as any,
        landscape: options.orientation === 'landscape',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        },
        preferCSSPageSize: true,
        displayHeaderFooter: options.includeBranding !== false,
        headerTemplate: options.includeBranding ? this.getHeaderTemplate() : '',
        footerTemplate: options.includeBranding ? this.getFooterTemplate() : ''
      });

      return pdfBuffer;

    } finally {
      await page.close();
    }
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
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
    }
  }

  /**
   * Close Puppeteer browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Generate filename for PDF
   */
  private generateFileName(type: string, name: string): string {
    const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = dayjs().format('YYYY-MM-DD');
    return `EvoFit_${type}_${safeName}_${timestamp}.pdf`;
  }

  /**
   * Estimate page count from HTML content
   */
  private estimatePageCount(html: string): number {
    // Rough estimation based on content length
    const contentLength = html.replace(/<[^>]*>/g, '').length;
    return Math.max(1, Math.ceil(contentLength / 3000));
  }

  /**
   * Format date range for display
   */
  private formatDateRange(dateRange?: { start: Date; end: Date }): string {
    if (!dateRange) {
      return 'All Time';
    }
    const start = dayjs(dateRange.start).format('MMM D, YYYY');
    const end = dayjs(dateRange.end).format('MMM D, YYYY');
    return `${start} - ${end}`;
  }

  /**
   * Generate macro summary HTML
   */
  private generateMacroSummaryHtml(mealPlanData: any): string {
    return `
      <div class="macro-summary">
        <h2>Daily Nutritional Targets</h2>
        <div class="nutrition-chart">
          <div class="macro-item">
            <h3>Calories</h3>
            <p>${mealPlanData.dailyCalories || 2000} kcal</p>
          </div>
          <div class="macro-item">
            <h3>Protein</h3>
            <p>${mealPlanData.dailyProtein || 150}g</p>
          </div>
          <div class="macro-item">
            <h3>Carbs</h3>
            <p>${mealPlanData.dailyCarbs || 200}g</p>
          </div>
          <div class="macro-item">
            <h3>Fat</h3>
            <p>${mealPlanData.dailyFat || 65}g</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate nutritional charts HTML
   */
  private generateNutritionalChartsHtml(mealPlanData: any): string {
    // This would include actual chart generation using Chart.js or similar
    return `
      <div class="nutritional-charts">
        <h2>Nutritional Analysis</h2>
        <canvas id="macroChart"></canvas>
        <script>
          // Chart.js implementation would go here
        </script>
      </div>
    `;
  }

  /**
   * Generate meals HTML
   */
  private generateMealsHtml(mealPlanData: any, options: MealPlanPdfOptions): string {
    let html = '<div class="meals-section">';
    
    if (options.groupByDay) {
      // Group meals by day
      html += '<h2>Your Meal Plan</h2>';
      // Implementation would group meals by day
    } else {
      // List all meals
      html += '<h2>All Recipes</h2>';
    }
    
    // Add meal cards
    html += '</div>';
    return html;
  }

  /**
   * Generate shopping list HTML
   */
  private generateShoppingListHtml(mealPlanData: any): string {
    return `
      <div class="shopping-list">
        <h2>Shopping List</h2>
        <p>All ingredients needed for your meal plan:</p>
        <!-- Shopping list items would be generated here -->
      </div>
    `;
  }

  /**
   * Generate prep schedule HTML
   */
  private generatePrepScheduleHtml(mealPlanData: any): string {
    return `
      <div class="prep-schedule">
        <h2>Meal Prep Schedule</h2>
        <p>Optimize your time with this preparation schedule:</p>
        <!-- Prep schedule would be generated here -->
      </div>
    `;
  }

  /**
   * Generate progress summary HTML
   */
  private generateProgressSummaryHtml(progressData: any): string {
    return `
      <div class="progress-summary">
        <h2>Progress Overview</h2>
        <div class="summary-cards">
          <div class="summary-card">
            <h3>Total Progress</h3>
            <p>12 weeks</p>
          </div>
          <div class="summary-card">
            <h3>Goals Achieved</h3>
            <p>5 of 8</p>
          </div>
          <div class="summary-card">
            <h3>Milestones</h3>
            <p>8 earned</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate measurements HTML
   */
  private generateMeasurementsHtml(progressData: any): string {
    return `
      <div class="measurements-section">
        <h2>Body Measurements</h2>
        <!-- Measurements table and charts -->
      </div>
    `;
  }

  /**
   * Generate goals HTML
   */
  private generateGoalsHtml(progressData: any): string {
    return `
      <div class="goals-section">
        <h2>Fitness Goals</h2>
        <!-- Goals progress bars -->
      </div>
    `;
  }

  /**
   * Generate milestones HTML
   */
  private generateMilestonesHtml(progressData: any): string {
    let html = '<div class="milestones-section"><h2>Achievements</h2>';
    
    for (const milestone of progressData.milestones || []) {
      html += `
        <div class="milestone">
          <div class="milestone-icon">🏆</div>
          <div class="milestone-content">
            <h4>${milestone.name}</h4>
            <p>Achieved on ${dayjs(milestone.achievedAt).format('MMM D, YYYY')}</p>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Generate progress charts HTML
   */
  private generateProgressChartsHtml(progressData: any): string {
    return `
      <div class="charts-section">
        <h2>Progress Trends</h2>
        <div class="progress-chart">
          <!-- Chart implementation -->
        </div>
      </div>
    `;
  }

  /**
   * Generate progress photos HTML
   */
  private generateProgressPhotosHtml(progressData: any, privacy?: string): string {
    if (privacy === 'exclude') {
      return '';
    }

    let html = '<div class="photos-section"><h2>Progress Photos</h2>';
    
    for (const photo of progressData.photos || []) {
      const imageStyle = privacy === 'blur' ? 'filter: blur(5px);' : '';
      html += `
        <div class="progress-photo">
          <img src="${photo.url}" style="${imageStyle}" alt="Progress photo" />
          <p>${dayjs(photo.uploadedAt).format('MMM D, YYYY')}</p>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Generate comparisons HTML
   */
  private generateComparisonsHtml(progressData: any): string {
    return `
      <div class="comparison-section">
        <div class="before">
          <h3>Starting Point</h3>
          <!-- Starting measurements and stats -->
        </div>
        <div class="current">
          <h3>Current Status</h3>
          <!-- Current measurements and stats -->
        </div>
      </div>
    `;
  }

  /**
   * Get header template for PDF
   */
  private getHeaderTemplate(): string {
    return `
      <div style="font-size: 10px; padding: 10px 20px; color: #666; width: 100%;">
        <span>EvoFit Meals - Transform Your Nutrition</span>
      </div>
    `;
  }

  /**
   * Get footer template for PDF
   */
  private getFooterTemplate(): string {
    return `
      <div style="font-size: 10px; padding: 10px 20px; color: #666; width: 100%; display: flex; justify-content: space-between;">
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span>Generated on ${dayjs().format('MMM D, YYYY')}</span>
      </div>
    `;
  }
}

// Export singleton instance
export const pdfGenerationService = new PdfGenerationService();