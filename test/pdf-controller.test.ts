/**
 * PDF Export Controller Tests
 * 
 * Tests for server/controllers/exportPdfController.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { exportPdfController, exportMealPlanPdfController } from '../server/controllers/exportPdfController';

// Mock Puppeteer
vi.mock('puppeteer', () => {
  const mockPage = {
    setViewport: vi.fn(),
    setContent: vi.fn(),
    pdf: vi.fn().mockResolvedValue(Buffer.from('PDF content'))
  };
  
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn()
  };

  return {
    default: {
      launch: vi.fn().mockResolvedValue(mockBrowser)
    }
  };
});

// Mock template utilities
vi.mock('../server/utils/pdfTemplate', () => ({
  compileHtmlTemplate: vi.fn().mockResolvedValue('<html>Mock PDF Template</html>')
}));

// Mock validation utilities
vi.mock('../server/utils/pdfValidation', () => ({
  validateMealPlanData: vi.fn().mockReturnValue({
    id: 'test-plan',
    planName: 'Test Plan',
    fitnessGoal: 'muscle_building',
    dailyCalorieTarget: 2500,
    days: 7,
    mealsPerDay: 3,
    meals: []
  })
}));

// Mock storage
vi.mock('../server/storage', () => ({
  storage: {
    getPersonalizedMealPlans: vi.fn()
  }
}));

// Mock dayjs
vi.mock('dayjs', () => ({
  default: vi.fn(() => ({
    format: vi.fn().mockReturnValue('January 1, 2024')
  }))
}));

describe('PDF Export Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let responseData: any;
  let statusCode: number;

  beforeEach(() => {
    responseData = null;
    statusCode = 200;

    mockReq = {
      body: {},
      user: { id: 'user-123', role: 'trainer', email: 'trainer@test.com' },
      params: {}
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((data) => {
        responseData = data;
        return mockRes;
      }),
      set: vi.fn().mockReturnThis(),
      send: vi.fn().mockImplementation((data) => {
        responseData = data;
        return mockRes;
      }),
      headersSent: false
    };

    // Reset mocks - handled within the mock declarations
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exportPdfController', () => {
    it('should successfully generate PDF with valid meal plan data', async () => {
      mockReq.body = {
        mealPlanData: {
          planName: 'Test Plan',
          fitnessGoal: 'muscle_building',
          dailyCalorieTarget: 2500,
          days: 7,
          mealsPerDay: 3,
          meals: []
        },
        customerName: 'John Doe',
        options: {
          includeShoppingList: true,
          includeMacroSummary: true
        }
      };

      await exportPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Length': '16',
        'Content-Disposition': expect.stringContaining('EvoFit_Meal_Plan_'),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Expires': '-1',
        'Pragma': 'no-cache'
      });

      expect(mockRes.send).toHaveBeenCalledWith(expect.any(Buffer));
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should return 400 error when meal plan data is missing', async () => {
      mockReq.body = {};

      await exportPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Meal plan data is required',
        code: 'MISSING_MEAL_PLAN_DATA'
      });
    });

    it('should handle Puppeteer errors gracefully', async () => {
      mockReq.body = {
        mealPlanData: {
          planName: 'Test Plan',
          fitnessGoal: 'muscle_building',
          dailyCalorieTarget: 2500,
          days: 7,
          mealsPerDay: 3,
          meals: []
        }
      };

      // Mock Puppeteer to throw an error
      mockBrowser.newPage.mockRejectedValue(new Error('Puppeteer launch failed'));

      await exportPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to generate PDF',
        code: 'PDF_GENERATION_FAILED',
        details: 'Puppeteer launch failed'
      });
    });

    it('should ensure browser is closed on error', async () => {
      mockReq.body = {
        mealPlanData: {
          planName: 'Test Plan',
          fitnessGoal: 'muscle_building',
          dailyCalorieTarget: 2500,
          days: 7,
          mealsPerDay: 3,
          meals: []
        }
      };

      // Mock page.pdf to throw an error after browser is created
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      await exportPdfController(mockReq as any, mockRes as Response);

      expect(mockBrowser.close).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should use default customer name when not provided', async () => {
      mockReq.body = {
        mealPlanData: {
          planName: 'Test Plan',
          fitnessGoal: 'muscle_building',
          dailyCalorieTarget: 2500,
          days: 7,
          mealsPerDay: 3,
          meals: []
        }
      };

      await exportPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining('meal-plan')
        })
      );
    });

    it('should apply default export options', async () => {
      mockReq.body = {
        mealPlanData: {
          planName: 'Test Plan',
          fitnessGoal: 'muscle_building',
          dailyCalorieTarget: 2500,
          days: 7,
          mealsPerDay: 3,
          meals: []
        }
      };

      await exportPdfController(mockReq as any, mockRes as Response);

      // Should succeed with default options
      expect(mockRes.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should handle validation errors', async () => {
      const { validateMealPlanData } = await import('../server/utils/pdfValidation');
      (validateMealPlanData as any).mockImplementation(() => {
        throw new Error('Validation failed: Invalid data');
      });

      mockReq.body = {
        mealPlanData: { invalid: 'data' }
      };

      await exportPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(responseData.message).toBe('Failed to generate PDF');
    });
  });

  describe('exportMealPlanPdfController', () => {
    beforeEach(() => {
      mockReq.params = { planId: 'plan-123' };
      mockReq.user = { id: 'user-123', role: 'trainer' };
      mockReq.body = { options: {} };
    });

    it('should return 501 for admin users (not yet implemented)', async () => {
      mockReq.user = { id: 'admin-123', role: 'admin' };

      await exportMealPlanPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Admin meal plan access not yet implemented',
        code: 'NOT_IMPLEMENTED'
      });
    });

    it('should handle trainer access with no customers', async () => {
      const { storage } = await import('../server/storage');
      (storage as any).getTrainerCustomers = vi.fn().mockResolvedValue(null);

      await exportMealPlanPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'No customers found',
        code: 'NO_CUSTOMERS'
      });
    });

    it('should handle trainer access with meal plan not found', async () => {
      const { storage } = await import('../server/storage');
      (storage as any).getTrainerCustomers = vi.fn().mockResolvedValue([
        { id: 'customer-1', email: 'customer@test.com' }
      ]);
      storage.getPersonalizedMealPlans = vi.fn().mockResolvedValue([]);

      await exportMealPlanPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Meal plan not found or access denied',
        code: 'MEAL_PLAN_NOT_FOUND'
      });
    });

    it('should successfully export meal plan for trainer', async () => {
      const mockMealPlan = {
        id: 'plan-123',
        planName: 'Customer Plan',
        meals: []
      };

      const { storage } = await import('../server/storage');
      (storage as any).getTrainerCustomers = vi.fn().mockResolvedValue([
        { id: 'customer-1', email: 'customer@test.com' }
      ]);
      storage.getPersonalizedMealPlans = vi.fn().mockResolvedValue([mockMealPlan]);

      await exportMealPlanPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should handle customer access successfully', async () => {
      mockReq.user = { id: 'customer-123', role: 'customer' };
      
      const mockMealPlan = {
        id: 'plan-123',
        planName: 'My Plan',
        meals: []
      };

      const { storage } = await import('../server/storage');
      storage.getPersonalizedMealPlans = vi.fn().mockResolvedValue([mockMealPlan]);

      await exportMealPlanPdfController(mockReq as any, mockRes as Response);

      expect(storage.getPersonalizedMealPlans).toHaveBeenCalledWith('customer-123');
      expect(mockRes.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should handle customer access with meal plan not found', async () => {
      mockReq.user = { id: 'customer-123', role: 'customer' };
      
      const { storage } = await import('../server/storage');
      storage.getPersonalizedMealPlans = vi.fn().mockResolvedValue([]);

      await exportMealPlanPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Meal plan not found',
        code: 'MEAL_PLAN_NOT_FOUND'
      });
    });

    it('should handle errors gracefully', async () => {
      const { storage } = await import('../server/storage');
      storage.getPersonalizedMealPlans = vi.fn().mockRejectedValue(new Error('Database error'));

      mockReq.user = { id: 'customer-123', role: 'customer' };

      await exportMealPlanPdfController(mockReq as any, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to export meal plan PDF',
        code: 'EXPORT_FAILED',
        details: 'Database error'
      });
    });
  });
});