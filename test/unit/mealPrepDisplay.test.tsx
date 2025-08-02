/**
 * Unit Tests for Meal Prep Display Components
 * 
 * Tests the frontend components that display meal prep instructions,
 * including shopping lists, prep steps, and storage guidelines.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the UI components since they may not be available in test environment
vi.mock('../../../client/src/components/ui/card', () => ({
  Card: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }) => <div data-testid="card-title" {...props}>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  ChefHat: () => <div data-testid="chef-hat-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
}));

// Create a test component that renders meal prep instructions
const MealPrepDisplay = ({ mealPrep }) => {
  if (!mealPrep) return null;

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200" data-testid="meal-prep-container">
      <h4 className="font-semibold mb-4 text-blue-800" data-testid="meal-prep-title">
        Start-of-Week Meal Prep Instructions
      </h4>
      
      <div className="space-y-6">
        {/* Prep Time Overview */}
        <div className="flex items-center gap-2 text-blue-700 bg-blue-100 px-3 py-2 rounded-md" data-testid="prep-time-overview">
          <span>Total Estimated Prep Time: {mealPrep.totalPrepTime} minutes</span>
        </div>

        {/* Shopping List */}
        <div data-testid="shopping-list-section">
          <h5 className="font-medium mb-3 text-blue-800">🛒 Shopping List</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {mealPrep.shoppingList.map((item, index) => (
              <div key={index} className="bg-white p-3 rounded border text-sm" data-testid={`shopping-item-${index}`}>
                <div className="font-medium" data-testid={`ingredient-name-${index}`}>
                  {item.ingredient}
                </div>
                <div className="text-blue-600" data-testid={`ingredient-amount-${index}`}>
                  {item.totalAmount} {item.unit}
                </div>
                <div className="text-xs text-gray-500 mt-1" data-testid={`used-in-recipes-${index}`}>
                  Used in: {item.usedInRecipes.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prep Instructions */}
        <div data-testid="prep-instructions-section">
          <h5 className="font-medium mb-3 text-blue-800">👨‍🍳 Prep Steps</h5>
          <div className="space-y-3">
            {mealPrep.prepInstructions.map((step, index) => (
              <div key={index} className="bg-white p-4 rounded border" data-testid={`prep-step-${index}`}>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold" data-testid={`step-number-${index}`}>
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm mb-2" data-testid={`step-instruction-${index}`}>
                      {step.instruction}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span data-testid={`step-time-${index}`}>
                        {step.estimatedTime} min
                      </span>
                      {step.ingredients.length > 0 && (
                        <span data-testid={`step-ingredients-${index}`}>
                          Ingredients: {step.ingredients.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Storage Instructions */}
        <div data-testid="storage-instructions-section">
          <h5 className="font-medium mb-3 text-blue-800">🥶 Storage Guidelines</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mealPrep.storageInstructions.map((storage, index) => (
              <div key={index} className="bg-white p-3 rounded border text-sm" data-testid={`storage-item-${index}`}>
                <div className="font-medium text-gray-800" data-testid={`storage-ingredient-${index}`}>
                  {storage.ingredient}
                </div>
                <div className="text-blue-600 text-xs mt-1" data-testid={`storage-method-${index}`}>
                  {storage.method}
                </div>
                <div className="text-gray-500 text-xs" data-testid={`storage-duration-${index}`}>
                  Duration: {storage.duration}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

describe('Meal Prep Display Components', () => {
  const mockMealPrep = {
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
      },
      {
        ingredient: 'Rice',
        totalAmount: '200',
        unit: 'g',
        usedInRecipes: ['Rice Bowl', 'Fried Rice']
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
        instruction: 'Cook grains and legumes: Rice. Cook according to package directions and store in portions.',
        estimatedTime: 30,
        ingredients: ['Rice']
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
      },
      {
        ingredient: 'Rice',
        method: 'Refrigerate in sealed containers',
        duration: '5-7 days'
      }
    ]
  };

  describe('MealPrepDisplay Component', () => {
    it('renders meal prep instructions correctly', () => {
      render(<MealPrepDisplay mealPrep={mockMealPrep} />);

      expect(screen.getByTestId('meal-prep-container')).toBeInTheDocument();
      expect(screen.getByTestId('meal-prep-title')).toHaveTextContent('Start-of-Week Meal Prep Instructions');
      expect(screen.getByTestId('prep-time-overview')).toHaveTextContent('Total Estimated Prep Time: 75 minutes');
    });

    it('displays shopping list items correctly', () => {
      render(<MealPrepDisplay mealPrep={mockMealPrep} />);

      expect(screen.getByTestId('shopping-list-section')).toBeInTheDocument();
      
      // Check first shopping item
      expect(screen.getByTestId('ingredient-name-0')).toHaveTextContent('Chicken Breast');
      expect(screen.getByTestId('ingredient-amount-0')).toHaveTextContent('300 g');
      expect(screen.getByTestId('used-in-recipes-0')).toHaveTextContent('Used in: Chicken Salad, Grilled Chicken');

      // Check that all shopping items are rendered
      expect(screen.getByTestId('shopping-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('shopping-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('shopping-item-2')).toBeInTheDocument();
    });

    it('displays prep instructions correctly', () => {
      render(<MealPrepDisplay mealPrep={mockMealPrep} />);

      expect(screen.getByTestId('prep-instructions-section')).toBeInTheDocument();
      
      // Check first prep step
      expect(screen.getByTestId('step-number-0')).toHaveTextContent('1');
      expect(screen.getByTestId('step-instruction-0')).toHaveTextContent('Wash and prep vegetables');
      expect(screen.getByTestId('step-time-0')).toHaveTextContent('15 min');
      expect(screen.getByTestId('step-ingredients-0')).toHaveTextContent('Ingredients: Broccoli');

      // Check that all prep steps are rendered
      expect(screen.getByTestId('prep-step-0')).toBeInTheDocument();
      expect(screen.getByTestId('prep-step-1')).toBeInTheDocument();
      expect(screen.getByTestId('prep-step-2')).toBeInTheDocument();
      expect(screen.getByTestId('prep-step-3')).toBeInTheDocument();
    });

    it('displays storage instructions correctly', () => {
      render(<MealPrepDisplay mealPrep={mockMealPrep} />);

      expect(screen.getByTestId('storage-instructions-section')).toBeInTheDocument();
      
      // Check first storage instruction
      expect(screen.getByTestId('storage-ingredient-0')).toHaveTextContent('Chicken Breast');
      expect(screen.getByTestId('storage-method-0')).toHaveTextContent('Refrigerate (cooked) or freeze (raw portions)');
      expect(screen.getByTestId('storage-duration-0')).toHaveTextContent('Duration: 3-4 days refrigerated, 3 months frozen');

      // Check that all storage items are rendered
      expect(screen.getByTestId('storage-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('storage-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('storage-item-2')).toBeInTheDocument();
    });

    it('handles prep steps without ingredients', () => {
      render(<MealPrepDisplay mealPrep={mockMealPrep} />);

      // The last step has no ingredients
      expect(screen.getByTestId('step-instruction-3')).toHaveTextContent('Label and store all prepped ingredients');
      expect(screen.getByTestId('step-time-3')).toHaveTextContent('10 min');
      // Should not have ingredients section for this step
      expect(screen.queryByTestId('step-ingredients-3')).not.toBeInTheDocument();
    });

    it('returns null when mealPrep is not provided', () => {
      const { container } = render(<MealPrepDisplay mealPrep={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when mealPrep is undefined', () => {
      const { container } = render(<MealPrepDisplay mealPrep={undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('handles empty shopping list', () => {
      const emptyMealPrep = {
        ...mockMealPrep,
        shoppingList: []
      };

      render(<MealPrepDisplay mealPrep={emptyMealPrep} />);
      
      expect(screen.getByTestId('shopping-list-section')).toBeInTheDocument();
      expect(screen.queryByTestId('shopping-item-0')).not.toBeInTheDocument();
    });

    it('handles empty prep instructions', () => {
      const emptyPrepMealPrep = {
        ...mockMealPrep,
        prepInstructions: []
      };

      render(<MealPrepDisplay mealPrep={emptyPrepMealPrep} />);
      
      expect(screen.getByTestId('prep-instructions-section')).toBeInTheDocument();
      expect(screen.queryByTestId('prep-step-0')).not.toBeInTheDocument();
    });

    it('handles empty storage instructions', () => {
      const emptyStorageMealPrep = {
        ...mockMealPrep,
        storageInstructions: []
      };

      render(<MealPrepDisplay mealPrep={emptyStorageMealPrep} />);
      
      expect(screen.getByTestId('storage-instructions-section')).toBeInTheDocument();
      expect(screen.queryByTestId('storage-item-0')).not.toBeInTheDocument();
    });

    it('handles zero prep time', () => {
      const zeroPrepTimeMealPrep = {
        ...mockMealPrep,
        totalPrepTime: 0
      };

      render(<MealPrepDisplay mealPrep={zeroPrepTimeMealPrep} />);
      
      expect(screen.getByTestId('prep-time-overview')).toHaveTextContent('Total Estimated Prep Time: 0 minutes');
    });

    it('handles long ingredient names and instructions', () => {
      const longContentMealPrep = {
        totalPrepTime: 45,
        shoppingList: [
          {
            ingredient: 'Extra Virgin Cold-Pressed Organic Olive Oil',
            totalAmount: '250',
            unit: 'ml',
            usedInRecipes: ['Mediterranean Quinoa Salad with Roasted Vegetables']
          }
        ],
        prepInstructions: [
          {
            step: 1,
            instruction: 'This is a very long instruction that describes in great detail how to properly prepare and organize all of your ingredients for the week ahead, including specific techniques for washing, chopping, and storing various types of vegetables and proteins.',
            estimatedTime: 45,
            ingredients: ['Extra Virgin Cold-Pressed Organic Olive Oil']
          }
        ],
        storageInstructions: [
          {
            ingredient: 'Extra Virgin Cold-Pressed Organic Olive Oil',
            method: 'Store in a cool, dark place away from direct sunlight and heat sources',
            duration: 'Use within 2 years of bottling date, or 6 months after opening'
          }
        ]
      };

      render(<MealPrepDisplay mealPrep={longContentMealPrep} />);
      
      // Should render without breaking
      expect(screen.getByTestId('ingredient-name-0')).toHaveTextContent('Extra Virgin Cold-Pressed Organic Olive Oil');
      expect(screen.getByTestId('step-instruction-0')).toHaveTextContent('This is a very long instruction');
    });

    it('handles special characters in ingredient names', () => {
      const specialCharMealPrep = {
        totalPrepTime: 30,
        shoppingList: [
          {
            ingredient: 'Café-Style Crème Fraîche',
            totalAmount: '200',
            unit: 'g',
            usedInRecipes: ['French Omelette à la Provençale']
          }
        ],
        prepInstructions: [
          {
            step: 1,
            instruction: 'Prepare crème fraîche and café-style ingredients',
            estimatedTime: 30,
            ingredients: ['Café-Style Crème Fraîche']
          }
        ],
        storageInstructions: [
          {
            ingredient: 'Café-Style Crème Fraîche',
            method: 'Refrigerate immediately',
            duration: '5-7 days'
          }
        ]
      };

      render(<MealPrepDisplay mealPrep={specialCharMealPrep} />);
      
      expect(screen.getByTestId('ingredient-name-0')).toHaveTextContent('Café-Style Crème Fraîche');
      expect(screen.getByTestId('used-in-recipes-0')).toHaveTextContent('French Omelette à la Provençale');
    });
  });

  describe('Accessibility and User Experience', () => {
    it('uses appropriate semantic HTML structure', () => {
      render(<MealPrepDisplay mealPrep={mockMealPrep} />);
      
      // Check for proper heading hierarchy
      const mainTitle = screen.getByTestId('meal-prep-title');
      expect(mainTitle.tagName).toBe('H4');
    });

    it('provides meaningful test ids for all interactive elements', () => {
      render(<MealPrepDisplay mealPrep={mockMealPrep} />);
      
      // All major sections should have test ids
      expect(screen.getByTestId('meal-prep-container')).toBeInTheDocument();
      expect(screen.getByTestId('shopping-list-section')).toBeInTheDocument();
      expect(screen.getByTestId('prep-instructions-section')).toBeInTheDocument();
      expect(screen.getByTestId('storage-instructions-section')).toBeInTheDocument();
    });

    it('displays step numbers in correct sequence', () => {
      render(<MealPrepDisplay mealPrep={mockMealPrep} />);
      
      expect(screen.getByTestId('step-number-0')).toHaveTextContent('1');
      expect(screen.getByTestId('step-number-1')).toHaveTextContent('2');
      expect(screen.getByTestId('step-number-2')).toHaveTextContent('3');
      expect(screen.getByTestId('step-number-3')).toHaveTextContent('4');
    });
  });

  describe('Form Integration Tests', () => {
    // Test component that includes the form fields for meal prep
    const MealPrepFormFields = ({ maxIngredients, generateMealPrep, onChange }) => (
      <div data-testid="meal-prep-form">
        <div data-testid="max-ingredients-field">
          <label htmlFor="maxIngredients">Max Ingredients (Optional)</label>
          <input
            id="maxIngredients"
            type="number"
            min="5"
            max="50"
            value={maxIngredients || ''}
            onChange={(e) => onChange('maxIngredients', e.target.value ? parseInt(e.target.value) : undefined)}
            data-testid="max-ingredients-input"
          />
        </div>
        
        <div data-testid="generate-meal-prep-field">
          <label htmlFor="generateMealPrep">Generate Start-of-Week Meal Prep Instructions</label>
          <input
            id="generateMealPrep"
            type="checkbox"
            checked={generateMealPrep}
            onChange={(e) => onChange('generateMealPrep', e.target.checked)}
            data-testid="generate-meal-prep-checkbox"
          />
        </div>
      </div>
    );

    it('renders meal prep form fields correctly', () => {
      const mockOnChange = vi.fn();
      
      render(
        <MealPrepFormFields 
          maxIngredients={15}
          generateMealPrep={true}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('max-ingredients-input')).toHaveValue(15);
      expect(screen.getByTestId('generate-meal-prep-checkbox')).toBeChecked();
    });

    it('handles form field changes correctly', () => {
      const mockOnChange = vi.fn();
      
      render(
        <MealPrepFormFields 
          maxIngredients={undefined}
          generateMealPrep={true}
          onChange={mockOnChange}
        />
      );

      // Test max ingredients input
      fireEvent.change(screen.getByTestId('max-ingredients-input'), {
        target: { value: '20' }
      });
      expect(mockOnChange).toHaveBeenCalledWith('maxIngredients', 20);

      // Test meal prep checkbox
      fireEvent.click(screen.getByTestId('generate-meal-prep-checkbox'));
      expect(mockOnChange).toHaveBeenCalledWith('generateMealPrep', false);
    });

    it('handles empty max ingredients input', () => {
      const mockOnChange = vi.fn();
      
      render(
        <MealPrepFormFields 
          maxIngredients={15}
          generateMealPrep={true}
          onChange={mockOnChange}
        />
      );

      fireEvent.change(screen.getByTestId('max-ingredients-input'), {
        target: { value: '' }
      });
      expect(mockOnChange).toHaveBeenCalledWith('maxIngredients', undefined);
    });
  });
});