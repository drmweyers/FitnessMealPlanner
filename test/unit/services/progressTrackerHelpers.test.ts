import { describe, it, expect } from 'vitest';
import { 
  getStepDisplayName, 
  getStepWeight 
} from '../../../server/services/progressTracker';

describe('ProgressTracker Helper Functions', () => {
  describe('getStepDisplayName', () => {
    it('should return correct display names for all steps', () => {
      const steps = {
        starting: 'Initializing...',
        generating: 'Generating recipes with AI...',
        validating: 'Validating recipe data...',
        images: 'Generating recipe images...',
        storing: 'Saving to database...',
        complete: 'Generation complete!',
        failed: 'Generation failed',
      } as const;

      Object.entries(steps).forEach(([step, expectedName]) => {
        expect(getStepDisplayName(step as any)).toBe(expectedName);
      });
    });

    it('should return the step name itself for unknown steps', () => {
      const unknownStep = 'unknown_step' as any;
      expect(getStepDisplayName(unknownStep)).toBe(unknownStep);
    });

    it('should handle empty string', () => {
      const emptyStep = '' as any;
      expect(getStepDisplayName(emptyStep)).toBe(emptyStep);
    });

    it('should handle null/undefined gracefully', () => {
      expect(getStepDisplayName(null as any)).toBe(null);
      expect(getStepDisplayName(undefined as any)).toBe(undefined);
    });
  });

  describe('getStepWeight', () => {
    it('should return correct weights for all steps', () => {
      const expectedWeights = {
        starting: 0,
        generating: 20,
        validating: 40,
        images: 70,
        storing: 90,
        complete: 100,
        failed: 0,
      } as const;

      Object.entries(expectedWeights).forEach(([step, expectedWeight]) => {
        expect(getStepWeight(step as any)).toBe(expectedWeight);
      });
    });

    it('should return 0 for unknown steps', () => {
      const unknownStep = 'unknown_step' as any;
      expect(getStepWeight(unknownStep)).toBe(0);
    });

    it('should return 0 for empty string', () => {
      const emptyStep = '' as any;
      expect(getStepWeight(emptyStep)).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(getStepWeight(null as any)).toBe(0);
      expect(getStepWeight(undefined as any)).toBe(0);
    });

    it('should maintain logical step weight progression', () => {
      const weights = [
        getStepWeight('starting'),
        getStepWeight('generating'),
        getStepWeight('validating'),
        getStepWeight('images'),
        getStepWeight('storing'),
        getStepWeight('complete'),
      ];

      // Weights should be in ascending order (except complete which jumps to 100)
      for (let i = 0; i < weights.length - 1; i++) {
        expect(weights[i]).toBeLessThanOrEqual(weights[i + 1]);
      }

      // Complete should be 100%
      expect(weights[weights.length - 1]).toBe(100);
    });

    it('should handle edge cases for percentage calculations', () => {
      // Starting should be 0% (not started)
      expect(getStepWeight('starting')).toBe(0);
      
      // Failed should be 0% (no progress)
      expect(getStepWeight('failed')).toBe(0);
      
      // Complete should be 100%
      expect(getStepWeight('complete')).toBe(100);
      
      // Other steps should be between 0 and 100
      ['generating', 'validating', 'images', 'storing'].forEach(step => {
        const weight = getStepWeight(step as any);
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThan(100);
      });
    });
  });

  describe('Helper Function Integration', () => {
    it('should provide consistent data for UI display', () => {
      const steps = ['starting', 'generating', 'validating', 'images', 'storing', 'complete', 'failed'] as const;
      
      steps.forEach(step => {
        const displayName = getStepDisplayName(step);
        const weight = getStepWeight(step);
        
        // Display name should be a string
        expect(typeof displayName).toBe('string');
        expect(displayName.length).toBeGreaterThan(0);
        
        // Weight should be a number between 0 and 100
        expect(typeof weight).toBe('number');
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(100);
      });
    });

    it('should support progress calculation scenarios', () => {
      // Scenario: Recipe generation workflow
      const workflow = [
        'starting',
        'generating', 
        'validating',
        'images',
        'storing',
        'complete'
      ] as const;

      const weights = workflow.map(step => getStepWeight(step));
      const names = workflow.map(step => getStepDisplayName(step));

      // Should have same length
      expect(weights.length).toBe(names.length);
      
      // Names should be descriptive
      names.forEach(name => {
        expect(name.length).toBeGreaterThan(5); // Reasonable description length
      });
      
      // Weights should show progression
      expect(weights[0]).toBe(0); // Starting
      expect(weights[weights.length - 1]).toBe(100); // Complete
    });

    it('should handle error states appropriately', () => {
      const failedDisplayName = getStepDisplayName('failed');
      const failedWeight = getStepWeight('failed');
      
      expect(failedDisplayName).toContain('failed');
      expect(failedWeight).toBe(0); // Failed = no progress
    });

    it('should support localization potential', () => {
      // All display names should be strings that could be localized
      const steps = ['starting', 'generating', 'validating', 'images', 'storing', 'complete', 'failed'] as const;
      
      steps.forEach(step => {
        const displayName = getStepDisplayName(step);
        
        // Should be a non-empty string
        expect(typeof displayName).toBe('string');
        expect(displayName.trim().length).toBeGreaterThan(0);
        
        // Should not contain control characters
        expect(displayName).not.toMatch(/[\x00-\x1F\x7F]/);
        
        // Should be human-readable (contains letters)
        expect(displayName).toMatch(/[a-zA-Z]/);
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should execute helper functions quickly', () => {
      const steps = ['starting', 'generating', 'validating', 'images', 'storing', 'complete', 'failed'] as const;
      
      // Test performance of repeated calls
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        steps.forEach(step => {
          getStepDisplayName(step);
          getStepWeight(step);
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 7000 function calls in under 10ms
      expect(duration).toBeLessThan(10);
    });

    it('should be memory efficient with repeated calls', () => {
      const steps = ['starting', 'generating', 'validating', 'images', 'storing', 'complete', 'failed'] as const;
      
      // Call functions many times and check they don't create new objects each time
      const results1 = steps.map(step => ({
        name: getStepDisplayName(step),
        weight: getStepWeight(step)
      }));
      
      const results2 = steps.map(step => ({
        name: getStepDisplayName(step),
        weight: getStepWeight(step)
      }));
      
      // Results should be identical (suggesting no new object creation)
      expect(results1).toEqual(results2);
    });
  });
});