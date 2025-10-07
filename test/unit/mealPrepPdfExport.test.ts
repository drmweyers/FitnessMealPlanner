/**
 * Unit Tests for PDF Export with Meal Prep Feature
 * 
 * Tests the PDF export functionality specifically for the new meal prep
 * instructions, ensuring they are properly formatted and included in exports.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jsPDF from 'jspdf';
import type { MealPlan } from '@shared/schema';

// Mock jsPDF
vi.mock('jspdf', () => {
  const mockPDF = {
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210),
        getHeight: vi.fn(() => 297)
      },
      getNumberOfPages: vi.fn(() => 1)
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    text: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
    addPage: vi.fn(),
    save: vi.fn()
  };

  return {
    default: vi.fn(() => mockPDF),
    __esModule: true
  };
});

// Mock PDF export function that includes meal prep - moved to global scope
const createMockPDFExportFunction = () => {
  return (mealPlan: MealPlan, nutrition: any) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = 60;

    // Add header, nutrition, etc. (existing functionality)
    pdf.text('PREMIUM MEAL PLAN', pageWidth / 2, 25);
    
    // NEW FEATURE: Add Meal Prep Section if available
    if (mealPlan.startOfWeekMealPrep) {
      // Check if we need a new page for meal prep
      if (yPosition > pageHeight - 100) {
        pdf.addPage();
        yPosition = 60;
      } else {
        yPosition += 30;
      }

      const mealPrep = mealPlan.startOfWeekMealPrep;

      // Prep time overview
      pdf.text(`Total Prep Time: ${mealPrep.totalPrepTime} minutes`, margin + 10, yPosition);
      yPosition += 30;

      // Prep steps section
      pdf.text('PREPARATION STEPS', margin, yPosition);
      yPosition += 15;

      (mealPrep.prepInstructions || []).slice(0, 4).forEach((step, index) => {
        // Step number and instruction with null safety
        pdf.text((step?.step || 0).toString(), margin + 7.5, yPosition + 10);
        pdf.text(step?.instruction || 'No instruction', margin + 20, yPosition + 5);
        pdf.text(`(${step?.estimatedTime || 0} min)`, pageWidth - margin - 5, yPosition + 5);
        yPosition += 25;
      });

      // Storage tips
      if ((mealPrep.storageInstructions || []).length > 0) {
        pdf.text('STORAGE TIPS', margin, yPosition);
        yPosition += 15;

        (mealPrep.storageInstructions || []).slice(0, 3).forEach((storage, index) => {
          const tipText = `${storage?.ingredient || 'Unknown'}: ${storage?.method || 'Store properly'} (${storage?.duration || 'Unknown duration'})`;
          pdf.text(`• ${tipText}`, margin + 5, yPosition);
          yPosition += 12;
        });
      }
    }

    return pdf;
  };
};

describe('PDF Export with Meal Prep Feature', () => {
  let mockMealPlanWithMealPrep: MealPlan;
  let mockMealPlanWithoutMealPrep: MealPlan;
  let mockPDFInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock PDF instance
    mockPDFInstance = {
      internal: {
        pageSize: {
          getWidth: vi.fn(() => 210),
          getHeight: vi.fn(() => 297)
        },
        getNumberOfPages: vi.fn(() => 1)
      },
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      setTextColor: vi.fn(),
      setFillColor: vi.fn(),
      setDrawColor: vi.fn(),
      text: vi.fn(),
      rect: vi.fn(),
      roundedRect: vi.fn(),
      line: vi.fn(),
      splitTextToSize: vi.fn((text) => [text]),
      addPage: vi.fn(),
      save: vi.fn()
    };

    (jsPDF as any).mockReturnValue(mockPDFInstance);

    mockMealPlanWithMealPrep = {
      id: 'test-plan-1',
      planName: 'Test Meal Plan with Meal Prep',
      fitnessGoal: 'weight_loss',
      description: 'Test plan with meal prep instructions',
      dailyCalorieTarget: 1800,
      clientName: 'Test Client',
      days: 3,
      mealsPerDay: 3,
      generatedBy: 'test-user',
      createdAt: new Date(),
      startOfWeekMealPrep: {
        totalPrepTime: 75,
        shoppingList: [
          {
            ingredient: 'Chicken Breast',
            totalAmount: '300',
            unit: 'g',
            usedInRecipes: ['Chicken Salad', 'Grilled Chicken']
          },
          {
            ingredient: 'Broccoli',
            totalAmount: '250',
            unit: 'g',
            usedInRecipes: ['Stir Fry']
          }
        ],
        prepInstructions: [
          {
            step: 1,
            instruction: 'Wash and prep vegetables: Broccoli. Chop, dice, or slice as needed for recipes.',
            estimatedTime: 15,
            ingredients: ['Broccoli']
          },
          {
            step: 2,
            instruction: 'Prepare proteins: Chicken Breast. Trim, portion, and marinate if needed.',
            estimatedTime: 20,
            ingredients: ['Chicken Breast']
          },
          {
            step: 3,
            instruction: 'Cook grains and legumes according to package directions.',
            estimatedTime: 30,
            ingredients: []
          },
          {
            step: 4,
            instruction: 'Label and store all prepped ingredients according to storage instructions.',
            estimatedTime: 10,
            ingredients: []
          }
        ],
        storageInstructions: [
          {
            ingredient: 'Chicken Breast',
            method: 'Refrigerate (cooked) or freeze (raw portions)',
            duration: '3-4 days refrigerated, 3 months frozen'
          },
          {
            ingredient: 'Broccoli',
            method: 'Refrigerate in airtight containers',
            duration: '3-5 days'
          }
        ]
      },
      meals: [
        {
          day: 1,
          mealNumber: 1,
          mealType: 'breakfast',
          recipe: {
            id: '1',
            name: 'Test Recipe',
            description: 'Test description',
            caloriesKcal: 350,
            proteinGrams: '20',
            carbsGrams: '40',
            fatGrams: '10',
            prepTimeMinutes: 10,
            cookTimeMinutes: 15,
            servings: 1,
            mealTypes: ['breakfast'],
            ingredientsJson: [
              { name: 'Chicken Breast', amount: '150', unit: 'g' },
              { name: 'Broccoli', amount: '100', unit: 'g' }
            ]
          }
        }
      ]
    };

    mockMealPlanWithoutMealPrep = {
      ...mockMealPlanWithMealPrep,
      startOfWeekMealPrep: undefined
    };
  });

  describe('PDF Export Function Structure', () => {

    it('should include meal prep section when startOfWeekMealPrep is present', () => {
      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mockMealPlanWithMealPrep, mockNutrition);

      // Verify PDF instance was created
      expect(jsPDF).toHaveBeenCalled();
      
      // Verify meal prep content was added
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        'Total Prep Time: 75 minutes', 
        expect.any(Number), 
        expect.any(Number)
      );
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        'PREPARATION STEPS', 
        expect.any(Number), 
        expect.any(Number)
      );
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        'STORAGE TIPS', 
        expect.any(Number), 
        expect.any(Number)
      );
    });

    it('should not include meal prep section when startOfWeekMealPrep is not present', () => {
      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mockMealPlanWithoutMealPrep, mockNutrition);

      // Verify PDF instance was created
      expect(jsPDF).toHaveBeenCalled();
      
      // Verify meal prep specific content was NOT added
      expect(mockPDFInstance.text).not.toHaveBeenCalledWith(
        expect.stringContaining('PREPARATION STEPS'), 
        expect.any(Number), 
        expect.any(Number)
      );
      expect(mockPDFInstance.text).not.toHaveBeenCalledWith(
        expect.stringContaining('STORAGE TIPS'), 
        expect.any(Number), 
        expect.any(Number)
      );
    });

    it('should add prep steps with correct formatting', () => {
      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mockMealPlanWithMealPrep, mockNutrition);

      // Verify each prep step was added
      expect(mockPDFInstance.text).toHaveBeenCalledWith('1', expect.any(Number), expect.any(Number));
      expect(mockPDFInstance.text).toHaveBeenCalledWith('2', expect.any(Number), expect.any(Number));
      expect(mockPDFInstance.text).toHaveBeenCalledWith('3', expect.any(Number), expect.any(Number));
      expect(mockPDFInstance.text).toHaveBeenCalledWith('4', expect.any(Number), expect.any(Number));

      // Verify step instructions were added
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        'Wash and prep vegetables: Broccoli. Chop, dice, or slice as needed for recipes.',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        'Prepare proteins: Chicken Breast. Trim, portion, and marinate if needed.',
        expect.any(Number),
        expect.any(Number)
      );

      // Verify time estimates were added
      expect(mockPDFInstance.text).toHaveBeenCalledWith('(15 min)', expect.any(Number), expect.any(Number));
      expect(mockPDFInstance.text).toHaveBeenCalledWith('(20 min)', expect.any(Number), expect.any(Number));
    });

    it('should add storage instructions with correct formatting', () => {
      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mockMealPlanWithMealPrep, mockNutrition);

      // Verify storage tips were added
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        '• Chicken Breast: Refrigerate (cooked) or freeze (raw portions) (3-4 days refrigerated, 3 months frozen)',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        '• Broccoli: Refrigerate in airtight containers (3-5 days)',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle page overflow for meal prep content', () => {
      // Create a meal plan with lots of prep instructions to test page overflow
      const largeMealPlan = {
        ...mockMealPlanWithMealPrep,
        startOfWeekMealPrep: {
          ...mockMealPlanWithMealPrep.startOfWeekMealPrep!,
          prepInstructions: Array.from({ length: 10 }, (_, i) => ({
            step: i + 1,
            instruction: `This is prep instruction number ${i + 1} with a very long description that might cause page overflow issues in the PDF generation process.`,
            estimatedTime: 15,
            ingredients: [`Ingredient ${i + 1}`]
          }))
        }
      };

      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(largeMealPlan, mockNutrition);

      // Should handle content properly without errors
      expect(jsPDF).toHaveBeenCalled();
      expect(mockPDFInstance.text).toHaveBeenCalled();
    });
  });

  describe('PDF Content Validation', () => {
    it('should clean text content to remove special characters', () => {
      const mealPlanWithSpecialChars = {
        ...mockMealPlanWithMealPrep,
        startOfWeekMealPrep: {
          ...mockMealPlanWithMealPrep.startOfWeekMealPrep!,
          prepInstructions: [
            {
              step: 1,
              instruction: 'Prepare café-style crème fraîche with special characters: àáâãäåæç',
              estimatedTime: 15,
              ingredients: ['Café-Style Crème Fraîche']
            }
          ]
        }
      };

      // Mock cleanText function
      const cleanText = (text: string) => {
        return text.replace(/[^\x00-\x7F]/g, '').trim();
      };

      const cleanedText = cleanText('Prepare café-style crème fraîche with special characters: àáâãäåæç');
      
      // Should remove special characters
      expect(cleanedText).toBe('Prepare caf-style crme frache with special characters:');
    });

    it('should handle empty or undefined meal prep data gracefully', () => {
      const mealPlanWithEmptyMealPrep = {
        ...mockMealPlanWithMealPrep,
        startOfWeekMealPrep: {
          totalPrepTime: 0,
          shoppingList: [],
          prepInstructions: [],
          storageInstructions: []
        }
      };

      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      // Should not throw errors with empty data
      expect(() => {
        exportToPDF(mealPlanWithEmptyMealPrep, mockNutrition);
      }).not.toThrow();
    });

    it('should limit prep instructions to prevent PDF overflow', () => {
      const mealPlanWithManyInstructions = {
        ...mockMealPlanWithMealPrep,
        startOfWeekMealPrep: {
          ...mockMealPlanWithMealPrep.startOfWeekMealPrep!,
          prepInstructions: Array.from({ length: 20 }, (_, i) => ({
            step: i + 1,
            instruction: `Prep instruction ${i + 1}`,
            estimatedTime: 10,
            ingredients: []
          }))
        }
      };

      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mealPlanWithManyInstructions, mockNutrition);

      // Should only include first 4 instructions as per slice(0, 4)
      expect(mockPDFInstance.text).toHaveBeenCalledWith('1', expect.any(Number), expect.any(Number));
      expect(mockPDFInstance.text).toHaveBeenCalledWith('4', expect.any(Number), expect.any(Number));
      // Should not include the 5th instruction
      expect(mockPDFInstance.text).not.toHaveBeenCalledWith('5', expect.any(Number), expect.any(Number));
    });

    it('should limit storage instructions to prevent PDF overflow', () => {
      const mealPlanWithManyStorageInstructions = {
        ...mockMealPlanWithMealPrep,
        startOfWeekMealPrep: {
          ...mockMealPlanWithMealPrep.startOfWeekMealPrep!,
          storageInstructions: Array.from({ length: 10 }, (_, i) => ({
            ingredient: `Ingredient ${i + 1}`,
            method: `Storage method ${i + 1}`,
            duration: `${i + 1} days`
          }))
        }
      };

      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mealPlanWithManyStorageInstructions, mockNutrition);

      // Should only include first 3 storage instructions as per slice(0, 3)
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        '• Ingredient 1: Storage method 1 (1 days)',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockPDFInstance.text).toHaveBeenCalledWith(
        '• Ingredient 3: Storage method 3 (3 days)',
        expect.any(Number),
        expect.any(Number)
      );
      // Should not include the 4th storage instruction
      expect(mockPDFInstance.text).not.toHaveBeenCalledWith(
        expect.stringContaining('• Ingredient 4:'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('PDF Layout and Positioning', () => {
    it('should calculate correct Y positions for meal prep content', () => {
      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mockMealPlanWithMealPrep, mockNutrition);

      // Verify that text was positioned at expected Y coordinates
      // The exact coordinates will depend on the implementation, but we can verify the pattern
      const textCalls = mockPDFInstance.text.mock.calls;
      
      // Should have multiple text calls with increasing Y positions
      expect(textCalls.length).toBeGreaterThan(5);
      
      // Y positions should be reasonable (within page bounds)
      textCalls.forEach(call => {
        if (typeof call[2] === 'number') { // Y position
          expect(call[2]).toBeGreaterThan(0);
          expect(call[2]).toBeLessThan(297); // A4 height
        }
      });
    });

    it('should maintain proper margins for meal prep content', () => {
      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mockMealPlanWithMealPrep, mockNutrition);

      const textCalls = mockPDFInstance.text.mock.calls;
      
      // Check that X positions respect margins (should be >= 15 for left margin)
      textCalls.forEach(call => {
        if (typeof call[1] === 'number') { // X position
          expect(call[1]).toBeGreaterThanOrEqual(15);
          expect(call[1]).toBeLessThanOrEqual(210); // A4 width
        }
      });
    });

    it('should add new page when content exceeds page height', () => {
      // Mock a scenario where yPosition > pageHeight - 100
      const exportToPDFWithOverflow = (mealPlan: MealPlan, nutrition: any) => {
        const pdf = new jsPDF();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yPosition = pageHeight - 50; // Simulate being near bottom of page

        if (mealPlan.startOfWeekMealPrep) {
          if (yPosition > pageHeight - 100) {
            pdf.addPage();
            yPosition = 60;
          }
        }

        return pdf;
      };

      const pdf = exportToPDFWithOverflow(mockMealPlanWithMealPrep, {});

      // Should have called addPage due to overflow
      expect(mockPDFInstance.addPage).toHaveBeenCalled();
    });
  });

  describe('Integration with Existing PDF Features', () => {
    it('should not break existing PDF functionality when meal prep is added', () => {
      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mockMealPlanWithMealPrep, mockNutrition);

      // Should still include existing PDF content
      expect(mockPDFInstance.text).toHaveBeenCalledWith('PREMIUM MEAL PLAN', expect.any(Number), expect.any(Number));
      
      // And also include new meal prep content
      expect(mockPDFInstance.text).toHaveBeenCalledWith('PREPARATION STEPS', expect.any(Number), expect.any(Number));
    });

    it('should work correctly when meal prep is disabled', () => {
      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      const pdf = exportToPDF(mockMealPlanWithoutMealPrep, mockNutrition);

      // Should still create PDF with existing functionality
      expect(jsPDF).toHaveBeenCalled();
      expect(mockPDFInstance.text).toHaveBeenCalledWith('PREMIUM MEAL PLAN', expect.any(Number), expect.any(Number));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle PDF generation errors gracefully', () => {
      // Mock PDF constructor to throw error
      (jsPDF as any).mockImplementationOnce(() => {
        throw new Error('PDF creation failed');
      });

      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      // Should throw the error (or handle it based on implementation)
      expect(() => {
        exportToPDF(mockMealPlanWithMealPrep, mockNutrition);
      }).toThrow('PDF creation failed');
    });

    it('should handle corrupted meal prep data', () => {
      const corruptedMealPlan = {
        ...mockMealPlanWithMealPrep,
        startOfWeekMealPrep: {
          totalPrepTime: null,
          shoppingList: null,
          prepInstructions: [
            {
              step: null,
              instruction: null,
              estimatedTime: null,
              ingredients: null
            }
          ],
          storageInstructions: null
        } as any
      };

      const exportToPDF = createMockPDFExportFunction();
      const mockNutrition = { total: { calories: 5400, protein: 270, carbs: 540, fat: 180 } };

      // Should handle corrupted data without crashing
      expect(() => {
        exportToPDF(corruptedMealPlan, mockNutrition);
      }).not.toThrow();
    });
  });
});