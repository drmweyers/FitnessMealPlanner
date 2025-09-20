/**
 * Test utilities for measurement data generation
 * Provides realistic test data for weight and body measurement charts
 */

import { Measurement, WeightDataPoint, BodyMeasurementDataPoint } from '@/types/charts';

/**
 * Generates realistic measurement data for testing
 */
export class MeasurementTestDataGenerator {
  private static generateId = (index: number) => `measurement-${index}`;

  private static getDateString = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };

  /**
   * Generate weight loss scenario data
   */
  static generateWeightLossData(
    startingWeightLbs: number = 200,
    durationDays: number = 90,
    totalLossLbs: number = 20
  ): Measurement[] {
    const measurements: Measurement[] = [];
    const dataPoints = Math.floor(durationDays / 7); // Weekly measurements

    for (let i = 0; i < dataPoints; i++) {
      const daysAgo = durationDays - (i * 7);
      const progress = i / (dataPoints - 1);

      // Non-linear weight loss with plateaus and fluctuations
      const baseWeight = startingWeightLbs - (totalLossLbs * progress);
      const fluctuation = (Math.random() - 0.5) * 3; // ±1.5 lbs variation
      const currentWeightLbs = Math.max(baseWeight + fluctuation, startingWeightLbs - totalLossLbs);

      measurements.push({
        id: this.generateId(i),
        measurementDate: this.getDateString(daysAgo),
        weightLbs: currentWeightLbs.toFixed(1),
        weightKg: (currentWeightLbs * 0.453592).toFixed(1),
        waistCm: (90 - (progress * 10) + (Math.random() - 0.5) * 2).toFixed(1),
        chestCm: (100 - (progress * 5) + (Math.random() - 0.5) * 2).toFixed(1),
        hipsCm: (105 - (progress * 8) + (Math.random() - 0.5) * 2).toFixed(1),
        bodyFatPercentage: (25 - (progress * 5) + (Math.random() - 0.5) * 1).toFixed(1),
        createdAt: this.getDateString(daysAgo),
      });
    }

    return measurements.reverse(); // Chronological order
  }

  /**
   * Generate weight gain scenario data
   */
  static generateWeightGainData(
    startingWeightLbs: number = 150,
    durationDays: number = 120,
    totalGainLbs: number = 15
  ): Measurement[] {
    const measurements: Measurement[] = [];
    const dataPoints = Math.floor(durationDays / 10); // Every 10 days

    for (let i = 0; i < dataPoints; i++) {
      const daysAgo = durationDays - (i * 10);
      const progress = i / (dataPoints - 1);

      // Muscle gain with some fat gain
      const baseWeight = startingWeightLbs + (totalGainLbs * progress);
      const fluctuation = (Math.random() - 0.5) * 2; // ±1 lb variation
      const currentWeightLbs = baseWeight + fluctuation;

      measurements.push({
        id: this.generateId(i),
        measurementDate: this.getDateString(daysAgo),
        weightLbs: currentWeightLbs.toFixed(1),
        weightKg: (currentWeightLbs * 0.453592).toFixed(1),
        chestCm: (95 + (progress * 8) + (Math.random() - 0.5) * 1).toFixed(1),
        bicepLeftCm: (35 + (progress * 3) + (Math.random() - 0.5) * 0.5).toFixed(1),
        bicepRightCm: (35 + (progress * 3) + (Math.random() - 0.5) * 0.5).toFixed(1),
        shouldersCm: (110 + (progress * 5) + (Math.random() - 0.5) * 1).toFixed(1),
        muscleMassKg: (60 + (progress * 8) + (Math.random() - 0.5) * 1).toFixed(1),
        bodyFatPercentage: (15 + (progress * 2) + (Math.random() - 0.5) * 1).toFixed(1),
        createdAt: this.getDateString(daysAgo),
      });
    }

    return measurements.reverse();
  }

  /**
   * Generate weight maintenance scenario data
   */
  static generateWeightMaintenanceData(
    targetWeightLbs: number = 170,
    durationDays: number = 60
  ): Measurement[] {
    const measurements: Measurement[] = [];
    const dataPoints = Math.floor(durationDays / 5); // Every 5 days

    for (let i = 0; i < dataPoints; i++) {
      const daysAgo = durationDays - (i * 5);

      // Small fluctuations around target weight
      const fluctuation = (Math.random() - 0.5) * 4; // ±2 lbs variation
      const currentWeightLbs = targetWeightLbs + fluctuation;

      measurements.push({
        id: this.generateId(i),
        measurementDate: this.getDateString(daysAgo),
        weightLbs: currentWeightLbs.toFixed(1),
        weightKg: (currentWeightLbs * 0.453592).toFixed(1),
        waistCm: (80 + (Math.random() - 0.5) * 2).toFixed(1),
        chestCm: (98 + (Math.random() - 0.5) * 1).toFixed(1),
        hipsCm: (95 + (Math.random() - 0.5) * 2).toFixed(1),
        bodyFatPercentage: (18 + (Math.random() - 0.5) * 2).toFixed(1),
        createdAt: this.getDateString(daysAgo),
      });
    }

    return measurements.reverse();
  }

  /**
   * Generate comprehensive body measurement data
   */
  static generateComprehensiveBodyMeasurements(
    durationDays: number = 90
  ): Measurement[] {
    const measurements: Measurement[] = [];
    const dataPoints = Math.floor(durationDays / 14); // Bi-weekly measurements

    for (let i = 0; i < dataPoints; i++) {
      const daysAgo = durationDays - (i * 14);
      const progress = i / (dataPoints - 1);

      measurements.push({
        id: this.generateId(i),
        measurementDate: this.getDateString(daysAgo),
        weightLbs: (175 - (progress * 10) + (Math.random() - 0.5) * 3).toFixed(1),
        weightKg: (79.4 - (progress * 4.5) + (Math.random() - 0.5) * 1.4).toFixed(1),
        neckCm: (38 - (progress * 2) + (Math.random() - 0.5) * 0.5).toFixed(1),
        shouldersCm: (115 - (progress * 3) + (Math.random() - 0.5) * 1).toFixed(1),
        chestCm: (102 - (progress * 6) + (Math.random() - 0.5) * 1.5).toFixed(1),
        waistCm: (85 - (progress * 8) + (Math.random() - 0.5) * 2).toFixed(1),
        hipsCm: (100 - (progress * 5) + (Math.random() - 0.5) * 1.5).toFixed(1),
        bicepLeftCm: (36 - (progress * 2) + (Math.random() - 0.5) * 0.5).toFixed(1),
        bicepRightCm: (36 - (progress * 2) + (Math.random() - 0.5) * 0.5).toFixed(1),
        thighLeftCm: (58 - (progress * 3) + (Math.random() - 0.5) * 1).toFixed(1),
        thighRightCm: (58 - (progress * 3) + (Math.random() - 0.5) * 1).toFixed(1),
        calfLeftCm: (38 - (progress * 1) + (Math.random() - 0.5) * 0.5).toFixed(1),
        calfRightCm: (38 - (progress * 1) + (Math.random() - 0.5) * 0.5).toFixed(1),
        bodyFatPercentage: (22 - (progress * 6) + (Math.random() - 0.5) * 1).toFixed(1),
        muscleMassKg: (65 + (progress * 3) + (Math.random() - 0.5) * 1).toFixed(1),
        notes: i % 3 === 0 ? 'Feeling strong today' : undefined,
        createdAt: this.getDateString(daysAgo),
      });
    }

    return measurements.reverse();
  }

  /**
   * Generate edge case data with missing values and invalid dates
   */
  static generateEdgeCaseData(): Measurement[] {
    return [
      // Missing weight data
      {
        id: 'edge-1',
        measurementDate: this.getDateString(30),
        weightLbs: undefined,
        weightKg: undefined,
        waistCm: '85.0',
        chestCm: '100.0',
        createdAt: this.getDateString(30),
      },
      // Invalid date
      {
        id: 'edge-2',
        measurementDate: 'invalid-date',
        weightLbs: '170.0',
        weightKg: '77.1',
        waistCm: '82.0',
        createdAt: this.getDateString(25),
      },
      // Future date
      {
        id: 'edge-3',
        measurementDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        weightLbs: '168.5',
        weightKg: '76.4',
        waistCm: '81.0',
        createdAt: this.getDateString(20),
      },
      // Normal data point
      {
        id: 'edge-4',
        measurementDate: this.getDateString(15),
        weightLbs: '167.0',
        weightKg: '75.7',
        waistCm: '80.5',
        chestCm: '98.0',
        bodyFatPercentage: '16.5',
        createdAt: this.getDateString(15),
      },
    ];
  }

  /**
   * Generate empty measurement data
   */
  static generateEmptyData(): Measurement[] {
    return [];
  }

  /**
   * Generate single measurement data point
   */
  static generateSingleMeasurement(): Measurement[] {
    return [
      {
        id: 'single-1',
        measurementDate: this.getDateString(7),
        weightLbs: '170.0',
        weightKg: '77.1',
        waistCm: '82.0',
        chestCm: '100.0',
        hipsCm: '95.0',
        bodyFatPercentage: '18.0',
        createdAt: this.getDateString(7),
      },
    ];
  }

  /**
   * Generate data with only specific measurement types
   */
  static generatePartialMeasurements(): Measurement[] {
    const measurements: Measurement[] = [];

    for (let i = 0; i < 5; i++) {
      const daysAgo = 30 - (i * 7);

      measurements.push({
        id: `partial-${i}`,
        measurementDate: this.getDateString(daysAgo),
        weightLbs: (170 + i).toFixed(1),
        weightKg: ((170 + i) * 0.453592).toFixed(1),
        // Only waist and chest measurements
        waistCm: i % 2 === 0 ? (82 - i).toFixed(1) : undefined,
        chestCm: i % 3 === 0 ? (100 - i).toFixed(1) : undefined,
        createdAt: this.getDateString(daysAgo),
      });
    }

    return measurements.reverse();
  }
}

/**
 * Mock API responses for different scenarios
 */
export const mockApiResponses = {
  weightLoss: {
    data: MeasurementTestDataGenerator.generateWeightLossData(),
  },
  weightGain: {
    data: MeasurementTestDataGenerator.generateWeightGainData(),
  },
  maintenance: {
    data: MeasurementTestDataGenerator.generateWeightMaintenanceData(),
  },
  comprehensive: {
    data: MeasurementTestDataGenerator.generateComprehensiveBodyMeasurements(),
  },
  edgeCases: {
    data: MeasurementTestDataGenerator.generateEdgeCaseData(),
  },
  empty: {
    data: MeasurementTestDataGenerator.generateEmptyData(),
  },
  single: {
    data: MeasurementTestDataGenerator.generateSingleMeasurement(),
  },
  partial: {
    data: MeasurementTestDataGenerator.generatePartialMeasurements(),
  },
  error: null, // For error scenarios
};

/**
 * Calculate expected statistics for test validation
 */
export const calculateExpectedStats = (measurements: Measurement[], weightUnit: 'lbs' | 'kg' = 'lbs') => {
  const weights = measurements
    .map(m => {
      const weight = weightUnit === 'lbs' ? m.weightLbs : m.weightKg;
      return weight ? parseFloat(weight) : null;
    })
    .filter((w): w is number => w !== null && !isNaN(w));

  if (weights.length === 0) {
    return {
      current: null,
      highest: null,
      lowest: null,
      average: null,
      count: 0,
    };
  }

  return {
    current: weights[weights.length - 1],
    highest: Math.max(...weights),
    lowest: Math.min(...weights),
    average: weights.reduce((sum, w) => sum + w, 0) / weights.length,
    count: weights.length,
  };
};

/**
 * Calculate expected trend analysis
 */
export const calculateExpectedTrend = (measurements: Measurement[], weightUnit: 'lbs' | 'kg' = 'lbs') => {
  const weights = measurements
    .map(m => {
      const weight = weightUnit === 'lbs' ? m.weightLbs : m.weightKg;
      return weight ? parseFloat(weight) : null;
    })
    .filter((w): w is number => w !== null && !isNaN(w));

  if (weights.length < 2) return null;

  const recent = weights.slice(-5);
  const older = weights.slice(-10, -5);

  if (recent.length === 0 || older.length === 0) return null;

  const recentAvg = recent.reduce((sum, w) => sum + w, 0) / recent.length;
  const olderAvg = older.reduce((sum, w) => sum + w, 0) / older.length;
  const change = recentAvg - olderAvg;

  return {
    current: recentAvg,
    previous: olderAvg,
    change,
    changePercentage: Math.abs((change / olderAvg) * 100),
    trend: {
      trend: Math.abs(change) < 0.5 ? 'stable' : change > 0 ? 'up' : 'down',
      percentage: Math.abs((change / olderAvg) * 100),
      direction: Math.abs(change) < 0.5 ? 0 : change > 0 ? 1 : -1,
    },
    period: `last ${recent.length} measurements`,
  };
};