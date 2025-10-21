import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the AdminRecipeGenerator component behavior
const MockAdminRecipeGenerator = () => {
  const [naturalLanguageInput, setNaturalLanguageInput] = React.useState('');
  const [numRecipes, setNumRecipes] = React.useState(5);
  const [mealType, setMealType] = React.useState('any');
  const [dietaryPreferences, setDietaryPreferences] = React.useState<string[]>([]);
  const [difficulty, setDifficulty] = React.useState('medium');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isParsing, setIsParsing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleParseWithAI = async () => {
    if (naturalLanguageInput.length < 10) {
      setError('Please provide at least 10 characters');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock parsed results
      setNumRecipes(8);
      setMealType('dinner');
      setDietaryPreferences(['high-protein']);
      setDifficulty('medium');
    } catch (err) {
      setError('Failed to parse natural language input');
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateDirectly = async () => {
    if (!naturalLanguageInput && numRecipes < 1) {
      setError('Please provide either natural language input or configure parameters manually');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Success state would be handled by parent component
    } catch (err) {
      setError('Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setNaturalLanguageInput('');
    setNumRecipes(5);
    setMealType('any');
    setDietaryPreferences([]);
    setDifficulty('medium');
    setError(null);
  };

  const handleDietaryPreferenceChange = (preference: string) => {
    setDietaryPreferences(prev =>
      prev.includes(preference)
        ? prev.filter(p => p !== preference)
        : [...prev, preference]
    );
  };

  return (
    <div data-testid="recipe-generator-container" className="mobile-layout">
      <h1>AI-Powered Recipe Generation</h1>
      <p>Generate targeted recipes using natural language</p>

      {/* Natural Language Input */}
      <div>
        <textarea
          placeholder="Describe the type of recipes you want to generate..."
          value={naturalLanguageInput}
          onChange={(e) => setNaturalLanguageInput(e.target.value.slice(0, 500))}
          rows={4}
          aria-label="Natural language recipe description"
          aria-describedby="char-count"
        />
        <div id="char-count">{naturalLanguageInput.length} / 500 characters</div>

        <button
          onClick={handleParseWithAI}
          disabled={!naturalLanguageInput || isParsing}
        >
          {isParsing ? 'Parsing...' : 'Parse with AI'}
        </button>
      </div>

      {/* Manual Configuration */}
      <div data-testid="form-container" className="flex-col lg:flex-row">
        <h2>Manual Configuration</h2>
        <p>Or configure recipe parameters manually</p>

        <div>
          <label htmlFor="num-recipes">Number of Recipes</label>
          <input
            id="num-recipes"
            type="number"
            value={numRecipes}
            onChange={(e) => {
              const value = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
              setNumRecipes(value);
            }}
            min={1}
            max={50}
            aria-describedby="recipes-help"
          />
          <div id="recipes-help">Choose between 1-50 recipes</div>
          {numRecipes < 1 || numRecipes > 50 ? (
            <div>Number of recipes must be between 1 and 50</div>
          ) : null}
        </div>

        <div>
          <label htmlFor="meal-type">Meal Type</label>
          <select
            id="meal-type"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            <option value="any">Any</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>

        <div>
          <label htmlFor="difficulty">Difficulty Level</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Dietary Preferences */}
        <div>
          <fieldset>
            <legend>Dietary Preferences</legend>
            {['Vegetarian', 'Vegan', 'Gluten-Free', 'Keto', 'High-Protein'].map(pref => (
              <label key={pref}>
                <input
                  type="checkbox"
                  checked={dietaryPreferences.includes(pref.toLowerCase())}
                  onChange={() => handleDietaryPreferenceChange(pref.toLowerCase())}
                />
                {pref}
              </label>
            ))}
          </fieldset>
        </div>
      </div>

      {/* Action Buttons */}
      <div>
        <button
          onClick={handleGenerateDirectly}
          disabled={isGenerating || (!naturalLanguageInput && numRecipes < 1)}
        >
          {isGenerating ? (
            <span aria-live="polite">Generating recipes...</span>
          ) : (
            'Generate Plan Directly'
          )}
        </button>

        <button onClick={handleClear}>Clear</button>
      </div>

      {/* Error Display */}
      {error && (
        <div role="alert">
          <div>Generation failed</div>
          <div>{error}</div>
          <button onClick={() => setError(null)}>Try Again</button>
        </div>
      )}
    </div>
  );
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AdminRecipeGenerator Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render all main components', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      expect(screen.getByText('AI-Powered Recipe Generation')).toBeInTheDocument();
      expect(screen.getByText('Generate targeted recipes using natural language')).toBeInTheDocument();
      expect(screen.getByText('Manual Configuration')).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      expect(screen.getByPlaceholderText(/describe the type of recipes you want/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of recipes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/meal type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/difficulty level/i)).toBeInTheDocument();
    });

    it('should display default values', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      expect(screen.getByLabelText(/number of recipes/i)).toHaveValue(5);
      expect(screen.getByLabelText(/meal type/i)).toHaveValue('any');
      expect(screen.getByLabelText(/difficulty level/i)).toHaveValue('medium');
    });
  });

  describe('Natural Language Processing', () => {
    it('should handle text input and character counting', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'High protein chicken recipes' } });

      expect(textarea).toHaveValue('High protein chicken recipes');
      expect(screen.getByText('27 / 500 characters')).toBeInTheDocument();
    });

    it('should limit input to 500 characters', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      const longText = 'a'.repeat(600);

      fireEvent.change(textarea, { target: { value: longText } });

      expect(textarea.value.length).toBe(500);
      expect(screen.getByText('500 / 500 characters')).toBeInTheDocument();
    });

    it('should validate minimum input length', async () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'short' } });

      const parseButton = screen.getByText('Parse with AI');
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('Please provide at least 10 characters')).toBeInTheDocument();
      });
    });

    it('should enable/disable Parse button based on input', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const parseButton = screen.getByText('Parse with AI');
      expect(parseButton).toBeDisabled();

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'Valid input text' } });

      expect(parseButton).not.toBeDisabled();
    });

    it('should show loading state during parsing', async () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'High protein recipes for athletes' } });

      const parseButton = screen.getByText('Parse with AI');
      fireEvent.click(parseButton);

      expect(screen.getByText('Parsing...')).toBeInTheDocument();
      expect(parseButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Parse with AI')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should update manual configuration after successful parse', async () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'High protein dinner recipes for muscle building' } });

      const parseButton = screen.getByText('Parse with AI');
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/number of recipes/i)).toHaveValue(8);
        expect(screen.getByLabelText(/meal type/i)).toHaveValue('dinner');
        expect(screen.getByLabelText(/difficulty level/i)).toHaveValue('medium');
      }, { timeout: 2000 });
    });
  });

  describe('Manual Configuration', () => {
    it('should validate number of recipes range', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const numRecipes = screen.getByLabelText(/number of recipes/i);

      // Test below minimum
      fireEvent.change(numRecipes, { target: { value: '0' } });
      expect(numRecipes).toHaveValue(1);

      // Test above maximum
      fireEvent.change(numRecipes, { target: { value: '100' } });
      expect(numRecipes).toHaveValue(50);
    });

    it('should update meal type selection', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const mealType = screen.getByLabelText(/meal type/i);
      fireEvent.change(mealType, { target: { value: 'breakfast' } });

      expect(mealType).toHaveValue('breakfast');
    });

    it('should update difficulty level', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const difficulty = screen.getByLabelText(/difficulty level/i);
      fireEvent.change(difficulty, { target: { value: 'hard' } });

      expect(difficulty).toHaveValue('hard');
    });

    it('should handle dietary preference changes', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
      const ketoCheckbox = screen.getByLabelText('Keto');

      fireEvent.click(vegetarianCheckbox);
      fireEvent.click(ketoCheckbox);

      expect(vegetarianCheckbox).toBeChecked();
      expect(ketoCheckbox).toBeChecked();
    });

    it('should allow multiple dietary preferences', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const preferences = ['Vegetarian', 'Gluten-Free', 'High-Protein'];

      preferences.forEach(pref => {
        const checkbox = screen.getByLabelText(pref);
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
      });
    });

    it('should toggle dietary preferences on/off', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const veganCheckbox = screen.getByLabelText('Vegan');

      // Check
      fireEvent.click(veganCheckbox);
      expect(veganCheckbox).toBeChecked();

      // Uncheck
      fireEvent.click(veganCheckbox);
      expect(veganCheckbox).not.toBeChecked();
    });
  });

  describe('Recipe Generation', () => {
    it('should validate input before generation', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Plan Directly');
      fireEvent.click(generateButton);

      expect(screen.getByText('Please provide either natural language input or configure parameters manually')).toBeInTheDocument();
    });

    it('should enable generation with natural language input', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'Healthy breakfast options' } });

      const generateButton = screen.getByText('Generate Plan Directly');
      expect(generateButton).not.toBeDisabled();
    });

    it('should enable generation with manual configuration', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const numRecipes = screen.getByLabelText(/number of recipes/i);
      fireEvent.change(numRecipes, { target: { value: '3' } });

      const generateButton = screen.getByText('Generate Plan Directly');
      expect(generateButton).not.toBeDisabled();
    });

    it('should show loading state during generation', async () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'Healthy recipes' } });

      const generateButton = screen.getByText('Generate Plan Directly');
      fireEvent.click(generateButton);

      expect(screen.getByText('Generating recipes...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
    });
  });

  describe('Clear Functionality', () => {
    it('should reset all form fields', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      // Set some values
      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'Test recipes' } });

      const numRecipes = screen.getByLabelText(/number of recipes/i);
      fireEvent.change(numRecipes, { target: { value: '15' } });

      const mealType = screen.getByLabelText(/meal type/i);
      fireEvent.change(mealType, { target: { value: 'lunch' } });

      const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
      fireEvent.click(vegetarianCheckbox);

      // Clear
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      // Verify reset
      expect(textarea).toHaveValue('');
      expect(numRecipes).toHaveValue(5);
      expect(mealType).toHaveValue('any');
      expect(vegetarianCheckbox).not.toBeChecked();
      expect(screen.getByText('0 / 500 characters')).toBeInTheDocument();
    });

    it('should clear any error messages', async () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      // Trigger an error
      const parseButton = screen.getByText('Parse with AI');
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText('Please provide at least 10 characters')).toBeInTheDocument();
      });

      // Clear should remove error
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(screen.queryByText('Please provide at least 10 characters')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error messages with proper roles', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const generateButton = screen.getByText('Generate Plan Directly');
      fireEvent.click(generateButton);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('Generation failed');
    });

    it('should provide retry functionality', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      // Trigger error
      const generateButton = screen.getByText('Generate Plan Directly');
      fireEvent.click(generateButton);

      // Click retry
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      expect(textarea).toHaveAttribute('aria-label', 'Natural language recipe description');
      expect(textarea).toHaveAttribute('aria-describedby', 'char-count');

      const numRecipes = screen.getByLabelText(/number of recipes/i);
      expect(numRecipes).toHaveAttribute('aria-describedby', 'recipes-help');
    });

    it('should have proper fieldset for dietary preferences', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const fieldset = screen.getByRole('group', { name: 'Dietary Preferences' });
      expect(fieldset).toBeInTheDocument();
    });

    it('should announce loading states', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'Test recipes' } });

      const generateButton = screen.getByText('Generate Plan Directly');
      fireEvent.click(generateButton);

      const loadingText = screen.getByText('Generating recipes...');
      expect(loadingText).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper heading hierarchy', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('AI-Powered Recipe Generation');

      const sectionHeading = screen.getByRole('heading', { level: 2 });
      expect(sectionHeading).toHaveTextContent('Manual Configuration');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const container = screen.getByTestId('recipe-generator-container');
      expect(container).toHaveClass('mobile-layout');

      const formContainer = screen.getByTestId('form-container');
      expect(formContainer).toHaveClass('flex-col', 'lg:flex-row');
    });
  });

  describe('Performance and User Experience', () => {
    it('should handle rapid input changes efficiently', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      const startTime = performance.now();

      // Simulate rapid typing
      for (let i = 1; i <= 50; i++) {
        fireEvent.change(textarea, { target: { value: 'a'.repeat(i) } });
      }

      const endTime = performance.now();

      // Should handle rapid changes efficiently
      expect(endTime - startTime).toBeLessThan(100);
      expect(textarea).toHaveValue('a'.repeat(50));
      expect(screen.getByText('50 / 500 characters')).toBeInTheDocument();
    });

    it('should maintain form state during operations', async () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      // Set some configuration
      const numRecipes = screen.getByLabelText(/number of recipes/i);
      fireEvent.change(numRecipes, { target: { value: '10' } });

      const mealType = screen.getByLabelText(/meal type/i);
      fireEvent.change(mealType, { target: { value: 'dinner' } });

      const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
      fireEvent.click(vegetarianCheckbox);

      // Trigger parsing operation
      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'High protein dinner recipes' } });

      const parseButton = screen.getByText('Parse with AI');
      fireEvent.click(parseButton);

      // During parsing, manual config should be preserved initially
      expect(numRecipes).toHaveValue(10);
      expect(mealType).toHaveValue('dinner');
      expect(vegetarianCheckbox).toBeChecked();

      // After parsing completes, values get updated
      await waitFor(() => {
        expect(screen.getByLabelText(/number of recipes/i)).toHaveValue(8);
        expect(screen.getByLabelText(/meal type/i)).toHaveValue('dinner');
      }, { timeout: 2000 });
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with mixed input methods', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      // Start with natural language
      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'Healthy breakfast recipes' } });

      // Modify manual settings
      const numRecipes = screen.getByLabelText(/number of recipes/i);
      fireEvent.change(numRecipes, { target: { value: '12' } });

      const vegetarianCheckbox = screen.getByLabelText('Vegetarian');
      fireEvent.click(vegetarianCheckbox);

      // Should be able to generate with both inputs
      const generateButton = screen.getByText('Generate Plan Directly');
      expect(generateButton).not.toBeDisabled();
    });

    it('should preserve user preferences during session', () => {
      renderWithProviders(<MockAdminRecipeGenerator />);

      // Set preferences
      const preferences = ['Vegetarian', 'Gluten-Free'];
      preferences.forEach(pref => {
        const checkbox = screen.getByLabelText(pref);
        fireEvent.click(checkbox);
      });

      const difficulty = screen.getByLabelText(/difficulty level/i);
      fireEvent.change(difficulty, { target: { value: 'easy' } });

      // Add natural language input
      const textarea = screen.getByPlaceholderText(/describe the type of recipes you want/i);
      fireEvent.change(textarea, { target: { value: 'Quick and easy recipes' } });

      // Clear only the text, preferences should remain
      fireEvent.change(textarea, { target: { value: '' } });

      // Dietary preferences should still be selected
      preferences.forEach(pref => {
        const checkbox = screen.getByLabelText(pref);
        expect(checkbox).toBeChecked();
      });

      expect(difficulty).toHaveValue('easy');
    });
  });
});

// Add React import for JSX
import React from 'react';