import { describe, it, expect } from 'vitest';
import {
  calculateBatchDelta,
  shouldSkipBatch,
  adjustBatchTarget,
  type BatchRunResult,
} from '../../../scripts/batch-utils/verification';

describe('batch-generation: executor-verification', () => {
  describe('calculateBatchDelta', () => {
    it('calculates positive delta correctly', () => {
      expect(calculateBatchDelta(10, 25)).toBe(15);
    });

    it('returns 0 when counts are equal', () => {
      expect(calculateBatchDelta(10, 10)).toBe(0);
    });

    it('returns 0 when final is less than baseline (edge case)', () => {
      expect(calculateBatchDelta(10, 5)).toBe(0);
    });
  });

  describe('shouldSkipBatch', () => {
    it('skips when DB count >= target', () => {
      expect(shouldSkipBatch(100, 100)).toBe(true);
      expect(shouldSkipBatch(150, 100)).toBe(true);
    });

    it('does not skip when DB count < target', () => {
      expect(shouldSkipBatch(50, 100)).toBe(false);
      expect(shouldSkipBatch(0, 100)).toBe(false);
    });
  });

  describe('adjustBatchTarget', () => {
    it('reduces target by existing count', () => {
      expect(adjustBatchTarget(100, 60)).toBe(40);
    });

    it('returns 0 when already at target', () => {
      expect(adjustBatchTarget(100, 100)).toBe(0);
    });

    it('returns 0 when over target', () => {
      expect(adjustBatchTarget(100, 120)).toBe(0);
    });

    it('returns full target when no existing recipes', () => {
      expect(adjustBatchTarget(100, 0)).toBe(100);
    });
  });

  describe('BatchRunResult type', () => {
    it('can represent a successful batch run', () => {
      const result: BatchRunResult = {
        batchId: 'A1',
        baselineCount: 10,
        finalCount: 25,
        delta: 15,
        target: 100,
        success: true,
      };
      expect(result.success).toBe(true);
      expect(result.delta).toBe(15);
    });

    it('can represent a failed batch run', () => {
      const result: BatchRunResult = {
        batchId: 'A2',
        baselineCount: 10,
        finalCount: 10,
        delta: 0,
        target: 100,
        success: false,
      };
      expect(result.success).toBe(false);
    });
  });
});
