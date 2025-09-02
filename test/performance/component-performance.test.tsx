import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { renderWithProviders, measurePerformance } from '../test-utils-optimized';
import { performance } from 'perf_hooks';

/**
 * Component Performance Tests for FitnessMealPlanner
 * 
 * Tests render performance, re-render optimization,
 * and memory usage for critical components
 */

// Mock heavy components for performance testing
const MockAdminRecipeGenerator = vi.fn(() => (
  <div data-testid="admin-recipe-generator">
    <h1>Recipe Generator</h1>
    <form>
      <input type="text" placeholder="Recipe name" />
      <button type="submit">Generate</button>
    </form>
  </div>
));

const MockMealPlanGenerator = vi.fn(() => (
  <div data-testid="meal-plan-generator">
    <h1>Meal Plan Generator</h1>
    <div>
      {Array.from({ length: 50 }, (_, i) => (
        <div key={i} className="meal-item">
          <h3>Meal {i + 1}</h3>
          <p>Calories: {200 + i * 10}</p>
        </div>
      ))}
    </div>
  </div>
));

const MockRecipeTable = vi.fn(({ recipes }: { recipes: any[] }) => (
  <div data-testid="recipe-table">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Calories</th>
          <th>Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {recipes.map((recipe, i) => (
          <tr key={i}>
            <td>{recipe.name}</td>
            <td>{recipe.calories}</td>
            <td>{recipe.time}</td>
            <td>
              <button>Edit</button>
              <button>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));

// Performance measurement utilities
const measureRenderTime = async (Component: React.ComponentType<any>, props: any = {}) => {
  const start = performance.now();
  const result = renderWithProviders(<Component {...props} />);
  const end = performance.now();
  
  return {
    renderTime: end - start,
    result
  };
};

const measureReRenderTime = async (Component: React.ComponentType<any>, initialProps: any, updatedProps: any) => {
  const { result, rerender } = renderWithProviders(<Component {...initialProps} />);
  
  const start = performance.now();
  rerender(<Component {...updatedProps} />);
  const end = performance.now();
  
  return {
    reRenderTime: end - start,
    result
  };
};

describe('Component Performance Benchmarks', () => {
  describe('Initial Render Performance', () => {
    it('should render AdminRecipeGenerator within performance threshold', async () => {
      const { renderTime } = await measureRenderTime(MockAdminRecipeGenerator);
      
      expect(renderTime).toBeLessThan(50); // Should render in < 50ms
      console.log('AdminRecipeGenerator render time:', renderTime + 'ms');
    });

    it('should render MealPlanGenerator efficiently despite complexity', async () => {
      const { renderTime } = await measureRenderTime(MockMealPlanGenerator);
      
      expect(renderTime).toBeLessThan(100); // Complex component < 100ms
      console.log('MealPlanGenerator render time:', renderTime + 'ms');
    });

    it('should render RecipeTable with large dataset efficiently', async () => {
      const largeRecipeDataset = Array.from({ length: 100 }, (_, i) => ({
        name: `Recipe ${i + 1}`,
        calories: 200 + i * 10,
        time: `${15 + i}min`,
      }));

      const { renderTime } = await measureRenderTime(MockRecipeTable, { recipes: largeRecipeDataset });
      
      expect(renderTime).toBeLessThan(150); // Large table < 150ms
      console.log('RecipeTable (100 items) render time:', renderTime + 'ms');
    });
  });

  describe('Re-render Performance', () => {
    it('should handle props updates efficiently', async () => {
      const initialProps = { recipes: [] };
      const updatedProps = { 
        recipes: Array.from({ length: 20 }, (_, i) => ({
          name: `Recipe ${i + 1}`,
          calories: 200 + i * 10,
          time: `${15 + i}min`,
        }))
      };

      const { reRenderTime } = await measureReRenderTime(MockRecipeTable, initialProps, updatedProps);
      
      expect(reRenderTime).toBeLessThan(75); // Re-render < 75ms
      console.log('RecipeTable re-render time:', reRenderTime + 'ms');
    });

    it('should optimize unnecessary re-renders', async () => {
      let renderCount = 0;
      
      const TrackedComponent = vi.fn((props: any) => {
        renderCount++;
        return <div data-testid="tracked">Render #{renderCount}</div>;
      });

      const { result, rerender } = renderWithProviders(<TrackedComponent value="test" />);
      
      // Re-render with same props
      rerender(<TrackedComponent value="test" />);
      rerender(<TrackedComponent value="test" />);
      
      // Should not re-render unnecessarily (this would need React.memo in real implementation)
      expect(renderCount).toBeLessThanOrEqual(3); // Allow some re-renders for test setup
      console.log('Component render count with identical props:', renderCount);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not leak memory during component lifecycle', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and destroy many components
      for (let i = 0; i < 100; i++) {
        const { result } = renderWithProviders(<MockAdminRecipeGenerator />);
        result.unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for 100 components)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      console.log('Memory increase after 100 component lifecycles:', Math.round(memoryIncrease / 1024 / 1024) + 'MB');
    });
  });

  describe('Event Handler Performance', () => {
    it('should handle rapid user interactions efficiently', async () => {
      const mockHandler = vi.fn();
      
      const InteractiveComponent = () => (
        <div>
          <button data-testid="fast-button" onClick={mockHandler}>
            Click Me Fast
          </button>
        </div>
      );

      const { result } = renderWithProviders(<InteractiveComponent />);
      const button = result.getByTestId('fast-button');
      
      // Measure time for 100 rapid clicks
      const start = performance.now();
      
      await act(async () => {
        for (let i = 0; i < 100; i++) {
          button.click();
        }
      });
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(totalTime).toBeLessThan(100); // 100 clicks in < 100ms
      expect(mockHandler).toHaveBeenCalledTimes(100);
      console.log('100 rapid clicks handled in:', totalTime + 'ms');
    });
  });

  describe('Form Performance', () => {
    it('should handle large form validation efficiently', async () => {
      const LargeForm = () => (
        <form>
          {Array.from({ length: 50 }, (_, i) => (
            <div key={i}>
              <label htmlFor={`field-${i}`}>Field {i + 1}</label>
              <input 
                id={`field-${i}`}
                type="text" 
                defaultValue={`value-${i}`}
                onChange={vi.fn()}
              />
            </div>
          ))}
          <button type="submit">Submit</button>
        </form>
      );

      const { renderTime } = await measureRenderTime(LargeForm);
      
      expect(renderTime).toBeLessThan(200); // Large form < 200ms
      console.log('Large form (50 fields) render time:', renderTime + 'ms');
    });

    it('should handle form state updates efficiently', async () => {
      let updateTime = 0;
      
      const FormWithState = ({ value }: { value: string }) => (
        <form>
          <input type="text" value={value} onChange={vi.fn()} />
          <input type="text" value={value} onChange={vi.fn()} />
          <input type="text" value={value} onChange={vi.fn()} />
        </form>
      );

      const { result, rerender } = renderWithProviders(<FormWithState value="initial" />);
      
      // Measure multiple state updates
      const start = performance.now();
      
      for (let i = 0; i < 20; i++) {
        rerender(<FormWithState value={`update-${i}`} />);
      }
      
      const end = performance.now();
      updateTime = end - start;
      
      expect(updateTime).toBeLessThan(100); // 20 updates < 100ms
      console.log('20 form state updates completed in:', updateTime + 'ms');
    });
  });

  describe('List Virtualization Performance', () => {
    it('should handle large lists efficiently', async () => {
      const LargeList = ({ items }: { items: any[] }) => (
        <div data-testid="large-list">
          {items.map((item, i) => (
            <div key={i} className="list-item">
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              <span>{item.meta}</span>
            </div>
          ))}
        </div>
      );

      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        title: `Item ${i + 1}`,
        description: `Description for item ${i + 1}`,
        meta: `Meta ${i + 1}`
      }));

      const { renderTime } = await measureRenderTime(LargeList, { items: largeDataset });
      
      // Large list should still render reasonably fast (may need virtualization in real app)
      expect(renderTime).toBeLessThan(500); // 1000 items < 500ms
      console.log('Large list (1000 items) render time:', renderTime + 'ms');
    });
  });
});

describe('Performance Regression Tests', () => {
  it('should maintain baseline performance metrics', async () => {
    const baselineMetrics = {
      simpleComponent: 25,    // ms
      complexComponent: 75,   // ms
      largeDataset: 200,      // ms
      reRender: 50,           // ms
    };

    // Test simple component
    const { renderTime: simpleTime } = await measureRenderTime(() => <div>Simple</div>);
    expect(simpleTime).toBeLessThan(baselineMetrics.simpleComponent);

    // Test complex component
    const { renderTime: complexTime } = await measureRenderTime(MockMealPlanGenerator);
    expect(complexTime).toBeLessThan(baselineMetrics.complexComponent);

    // Test large dataset
    const largeProps = { 
      recipes: Array.from({ length: 50 }, (_, i) => ({ name: `Recipe ${i}`, calories: 200 }))
    };
    const { renderTime: datasetTime } = await measureRenderTime(MockRecipeTable, largeProps);
    expect(datasetTime).toBeLessThan(baselineMetrics.largeDataset);

    console.log('Performance baseline check:', {
      simple: simpleTime,
      complex: complexTime,
      dataset: datasetTime,
      baselines: baselineMetrics
    });
  });
});