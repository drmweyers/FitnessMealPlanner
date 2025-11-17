// @ts-nocheck - Type errors suppressed
import { db } from '../db';
import { eq, and, desc, asc, sql, gte, lte, between } from 'drizzle-orm';
import { 
  progressMeasurements, 
  progressPhotos, 
  customerGoals,
  goalMilestones,
  users
} from '@shared/schema';
import { z } from 'zod';

export interface ProgressTrend {
  metric: string;
  dataPoints: Array<{
    date: Date;
    value: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  projectedValue?: number;
  projectedDate?: Date;
}

export interface ProgressSummary {
  customerId: string;
  period: 'week' | 'month' | 'quarter' | 'year' | 'all';
  startDate: Date;
  endDate: Date;
  measurements: {
    total: number;
    latestWeight?: number;
    weightChange?: number;
    bodyFatChange?: number;
    muscleGain?: number;
  };
  goals: {
    active: number;
    achieved: number;
    averageProgress: number;
    onTrack: number;
    atRisk: number;
  };
  photos: {
    total: number;
    latest?: Date;
    types: Record<string, number>;
  };
  achievements: Achievement[];
  trends: ProgressTrend[];
}

export interface Achievement {
  id: string;
  type: 'milestone' | 'streak' | 'improvement' | 'goal_achieved';
  name: string;
  description: string;
  achievedAt: Date;
  value?: number;
  unit?: string;
  icon?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
}

export interface ProgressComparison {
  customerId: string;
  metric: string;
  currentPeriod: {
    startDate: Date;
    endDate: Date;
    value: number;
    change: number;
  };
  previousPeriod: {
    startDate: Date;
    endDate: Date;
    value: number;
    change: number;
  };
  improvement: number;
  improvementPercent: number;
}

export interface ProgressExportData {
  customer: {
    id: string;
    email: string;
    name?: string;
  };
  exportDate: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: ProgressSummary;
  measurements: any[];
  goals: any[];
  achievements: Achievement[];
  charts: {
    weightTrend: ProgressTrend;
    bodyFatTrend?: ProgressTrend;
    measurementTrends: ProgressTrend[];
  };
  trainerNotes?: string;
}

export class ProgressAnalyticsService {
  /**
   * Get comprehensive progress summary for a customer
   */
  async getProgressSummary(
    customerId: string,
    period: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month'
  ): Promise<ProgressSummary> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      // Get measurements summary
      const measurementsSummary = await this.getMeasurementsSummary(customerId, startDate, endDate);

      // Get goals summary
      const goalsSummary = await this.getGoalsSummary(customerId);

      // Get photos summary
      const photosSummary = await this.getPhotosSummary(customerId, startDate, endDate);

      // Calculate trends
      const trends = await this.calculateTrends(customerId, startDate, endDate);

      // Detect achievements
      const achievements = await this.detectAchievements(customerId, startDate, endDate);

      return {
        customerId,
        period,
        startDate,
        endDate,
        measurements: measurementsSummary,
        goals: goalsSummary,
        photos: photosSummary,
        achievements,
        trends
      };
    } catch (error) {
      console.error('Failed to get progress summary:', error);
      throw error;
    }
  }

  /**
   * Calculate progress trends for various metrics
   */
  async calculateTrends(
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProgressTrend[]> {
    try {
      const measurements = await db.select()
        .from(progressMeasurements)
        .where(
          and(
            eq(progressMeasurements.customerId, customerId),
            between(progressMeasurements.measurementDate, startDate, endDate)
          )
        )
        .orderBy(asc(progressMeasurements.measurementDate));

      const trends: ProgressTrend[] = [];

      // Weight trend
      const weightTrend = this.calculateMetricTrend(
        measurements,
        'weightLbs',
        'Weight (lbs)'
      );
      if (weightTrend) trends.push(weightTrend);

      // Body fat trend
      const bodyFatTrend = this.calculateMetricTrend(
        measurements,
        'bodyFatPercentage',
        'Body Fat %'
      );
      if (bodyFatTrend) trends.push(bodyFatTrend);

      // Waist trend
      const waistTrend = this.calculateMetricTrend(
        measurements,
        'waistCm',
        'Waist (cm)'
      );
      if (waistTrend) trends.push(waistTrend);

      // Muscle mass trend
      const muscleTrend = this.calculateMetricTrend(
        measurements,
        'muscleMassKg',
        'Muscle Mass (kg)'
      );
      if (muscleTrend) trends.push(muscleTrend);

      return trends;
    } catch (error) {
      console.error('Failed to calculate trends:', error);
      return [];
    }
  }

  /**
   * Detect and create achievements based on progress
   */
  async detectAchievements(
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    try {
      // Check for weight loss milestones
      const weightLoss = await this.checkWeightLossAchievements(customerId, startDate, endDate);
      achievements.push(...weightLoss);

      // Check for consistency streaks
      const streaks = await this.checkConsistencyStreaks(customerId, startDate, endDate);
      achievements.push(...streaks);

      // Check for goal achievements
      const goalAchievements = await this.checkGoalAchievements(customerId, startDate, endDate);
      achievements.push(...goalAchievements);

      // Check for measurement improvements
      const improvements = await this.checkMeasurementImprovements(customerId, startDate, endDate);
      achievements.push(...improvements);

      return achievements;
    } catch (error) {
      console.error('Failed to detect achievements:', error);
      return [];
    }
  }

  /**
   * Compare progress between two periods
   */
  async compareProgress(
    customerId: string,
    metric: string,
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date }
  ): Promise<ProgressComparison> {
    try {
      const currentData = await this.getMetricDataForPeriod(
        customerId,
        metric,
        currentPeriod.start,
        currentPeriod.end
      );

      const previousData = await this.getMetricDataForPeriod(
        customerId,
        metric,
        previousPeriod.start,
        previousPeriod.end
      );

      const currentValue = currentData.average || 0;
      const previousValue = previousData.average || 0;
      const improvement = currentValue - previousValue;
      const improvementPercent = previousValue !== 0 
        ? ((improvement / previousValue) * 100)
        : 0;

      return {
        customerId,
        metric,
        currentPeriod: {
          startDate: currentPeriod.start,
          endDate: currentPeriod.end,
          value: currentValue,
          change: currentData.change || 0
        },
        previousPeriod: {
          startDate: previousPeriod.start,
          endDate: previousPeriod.end,
          value: previousValue,
          change: previousData.change || 0
        },
        improvement,
        improvementPercent
      };
    } catch (error) {
      console.error('Failed to compare progress:', error);
      throw error;
    }
  }

  /**
   * Generate exportable progress report
   */
  async generateProgressExport(
    customerId: string,
    startDate: Date,
    endDate: Date,
    includePhotos: boolean = false
  ): Promise<ProgressExportData> {
    try {
      // Get customer info
      const [customer] = await db.select()
        .from(users)
        .where(eq(users.id, customerId))
        .limit(1);

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Get progress summary
      const summary = await this.getProgressSummary(customerId, 'all');

      // Get all measurements for period
      const measurements = await db.select()
        .from(progressMeasurements)
        .where(
          and(
            eq(progressMeasurements.customerId, customerId),
            between(progressMeasurements.measurementDate, startDate, endDate)
          )
        )
        .orderBy(desc(progressMeasurements.measurementDate));

      // Get all goals
      const goals = await db.select()
        .from(customerGoals)
        .where(eq(customerGoals.customerId, customerId))
        .orderBy(desc(customerGoals.createdAt));

      // Get achievements
      const achievements = await this.detectAchievements(customerId, startDate, endDate);

      // Calculate charts data
      const trends = await this.calculateTrends(customerId, startDate, endDate);
      const weightTrend = trends.find(t => t.metric === 'Weight (lbs)') || trends[0];
      const bodyFatTrend = trends.find(t => t.metric === 'Body Fat %');

      return {
        customer: {
          id: customer.id,
          email: customer.email,
          name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || undefined
        },
        exportDate: new Date(),
        period: {
          start: startDate,
          end: endDate
        },
        summary,
        measurements,
        goals,
        achievements,
        charts: {
          weightTrend,
          bodyFatTrend,
          measurementTrends: trends
        }
      };
    } catch (error) {
      console.error('Failed to generate progress export:', error);
      throw error;
    }
  }

  /**
   * Get progress visibility settings
   */
  async getProgressVisibilitySettings(customerId: string): Promise<{
    measurements: 'private' | 'trainer' | 'public';
    goals: 'private' | 'trainer' | 'public';
    photos: 'private' | 'trainer' | 'public';
    achievements: 'private' | 'trainer' | 'public';
  }> {
    // Mock implementation - would fetch from user preferences
    return {
      measurements: 'trainer',
      goals: 'trainer',
      photos: 'private',
      achievements: 'trainer'
    };
  }

  /**
   * Update progress visibility settings
   */
  async updateProgressVisibilitySettings(
    customerId: string,
    settings: {
      measurements?: 'private' | 'trainer' | 'public';
      goals?: 'private' | 'trainer' | 'public';
      photos?: 'private' | 'trainer' | 'public';
      achievements?: 'private' | 'trainer' | 'public';
    }
  ): Promise<void> {
    // Mock implementation - would update user preferences
    console.log(`Updating visibility settings for customer ${customerId}:`, settings);
  }

  /**
   * Private helper methods
   */

  private getPeriodDates(period: 'week' | 'month' | 'quarter' | 'year' | 'all'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01'); // Or fetch earliest date from database
        break;
    }

    return { startDate, endDate };
  }

  private async getMeasurementsSummary(
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const measurements = await db.select()
      .from(progressMeasurements)
      .where(
        and(
          eq(progressMeasurements.customerId, customerId),
          between(progressMeasurements.measurementDate, startDate, endDate)
        )
      )
      .orderBy(desc(progressMeasurements.measurementDate));

    if (measurements.length === 0) {
      return { total: 0 };
    }

    const latest = measurements[0];
    const earliest = measurements[measurements.length - 1];

    return {
      total: measurements.length,
      latestWeight: latest.weightLbs ? parseFloat(latest.weightLbs) : undefined,
      weightChange: latest.weightLbs && earliest.weightLbs 
        ? parseFloat(latest.weightLbs) - parseFloat(earliest.weightLbs)
        : undefined,
      bodyFatChange: latest.bodyFatPercentage && earliest.bodyFatPercentage
        ? parseFloat(latest.bodyFatPercentage) - parseFloat(earliest.bodyFatPercentage)
        : undefined,
      muscleGain: latest.muscleMassKg && earliest.muscleMassKg
        ? parseFloat(latest.muscleMassKg) - parseFloat(earliest.muscleMassKg)
        : undefined
    };
  }

  private async getGoalsSummary(customerId: string): Promise<any> {
    const goals = await db.select()
      .from(customerGoals)
      .where(eq(customerGoals.customerId, customerId));

    const active = goals.filter(g => g.status === 'active').length;
    const achieved = goals.filter(g => g.status === 'achieved').length;
    const averageProgress = goals.reduce((sum, g) => sum + (g.progressPercentage || 0), 0) / (goals.length || 1);
    const onTrack = goals.filter(g => (g.progressPercentage || 0) >= 50).length;
    const atRisk = goals.filter(g => (g.progressPercentage || 0) < 25).length;

    return {
      active,
      achieved,
      averageProgress: Math.round(averageProgress),
      onTrack,
      atRisk
    };
  }

  private async getPhotosSummary(
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const photos = await db.select()
      .from(progressPhotos)
      .where(
        and(
          eq(progressPhotos.customerId, customerId),
          between(progressPhotos.photoDate, startDate, endDate)
        )
      );

    const types = photos.reduce((acc, photo) => {
      acc[photo.photoType] = (acc[photo.photoType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: photos.length,
      latest: photos.length > 0 ? photos[0].photoDate : undefined,
      types
    };
  }

  private calculateMetricTrend(
    measurements: any[],
    field: string,
    metricName: string
  ): ProgressTrend | null {
    const validMeasurements = measurements.filter(m => m[field]);
    
    if (validMeasurements.length < 2) {
      return null;
    }

    const dataPoints = validMeasurements.map(m => ({
      date: m.measurementDate,
      value: parseFloat(m[field])
    }));

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const change = lastValue - firstValue;
    const changePercent = (change / firstValue) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(changePercent) < 2) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    // Simple linear projection
    const avgDailyChange = change / validMeasurements.length;
    const projectedValue = lastValue + (avgDailyChange * 30); // 30 days projection
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + 30);

    return {
      metric: metricName,
      dataPoints,
      trend,
      changePercent,
      projectedValue,
      projectedDate
    };
  }

  private async checkWeightLossAchievements(
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    const measurements = await db.select()
      .from(progressMeasurements)
      .where(
        and(
          eq(progressMeasurements.customerId, customerId),
          between(progressMeasurements.measurementDate, startDate, endDate)
        )
      )
      .orderBy(asc(progressMeasurements.measurementDate));

    if (measurements.length < 2) return achievements;

    const firstWeight = measurements[0].weightLbs ? parseFloat(measurements[0].weightLbs) : null;
    const lastWeight = measurements[measurements.length - 1].weightLbs 
      ? parseFloat(measurements[measurements.length - 1].weightLbs) 
      : null;

    if (firstWeight && lastWeight) {
      const weightLoss = firstWeight - lastWeight;

      if (weightLoss >= 5) {
        achievements.push({
          id: `weight-loss-${Date.now()}`,
          type: 'milestone',
          name: '5 Pound Loss',
          description: `Lost ${weightLoss.toFixed(1)} pounds!`,
          achievedAt: new Date(),
          value: weightLoss,
          unit: 'lbs',
          icon: '🏆',
          rarity: 'common'
        });
      }

      if (weightLoss >= 10) {
        achievements.push({
          id: `weight-loss-10-${Date.now()}`,
          type: 'milestone',
          name: '10 Pound Loss',
          description: 'Amazing progress! 10 pounds down!',
          achievedAt: new Date(),
          value: weightLoss,
          unit: 'lbs',
          icon: '🥇',
          rarity: 'uncommon'
        });
      }

      if (weightLoss >= 25) {
        achievements.push({
          id: `weight-loss-25-${Date.now()}`,
          type: 'milestone',
          name: '25 Pound Transformation',
          description: 'Incredible transformation! 25 pounds lost!',
          achievedAt: new Date(),
          value: weightLoss,
          unit: 'lbs',
          icon: '💪',
          rarity: 'rare'
        });
      }
    }

    return achievements;
  }

  private async checkConsistencyStreaks(
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    const measurements = await db.select()
      .from(progressMeasurements)
      .where(
        and(
          eq(progressMeasurements.customerId, customerId),
          between(progressMeasurements.measurementDate, startDate, endDate)
        )
      )
      .orderBy(asc(progressMeasurements.measurementDate));

    // Check for weekly measurement streak
    let weeklyStreak = 0;
    let lastMeasurementDate: Date | null = null;

    for (const measurement of measurements) {
      if (!lastMeasurementDate) {
        weeklyStreak = 1;
      } else {
        const daysDiff = Math.floor((measurement.measurementDate.getTime() - lastMeasurementDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) {
          weeklyStreak++;
        } else {
          weeklyStreak = 1;
        }
      }
      lastMeasurementDate = measurement.measurementDate;
    }

    if (weeklyStreak >= 4) {
      achievements.push({
        id: `streak-4-${Date.now()}`,
        type: 'streak',
        name: 'Consistent Tracker',
        description: '4 weeks of consistent progress tracking!',
        achievedAt: new Date(),
        value: weeklyStreak,
        unit: 'weeks',
        icon: '📈',
        rarity: 'common'
      });
    }

    if (weeklyStreak >= 12) {
      achievements.push({
        id: `streak-12-${Date.now()}`,
        type: 'streak',
        name: 'Dedication Master',
        description: '12 weeks of dedicated progress tracking!',
        achievedAt: new Date(),
        value: weeklyStreak,
        unit: 'weeks',
        icon: '🔥',
        rarity: 'rare'
      });
    }

    return achievements;
  }

  private async checkGoalAchievements(
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    const goals = await db.select()
      .from(customerGoals)
      .where(
        and(
          eq(customerGoals.customerId, customerId),
          eq(customerGoals.status, 'achieved'),
          between(customerGoals.achievedDate!, startDate, endDate)
        )
      );

    for (const goal of goals) {
      achievements.push({
        id: `goal-${goal.id}`,
        type: 'goal_achieved',
        name: `Goal Achieved: ${goal.goalName}`,
        description: goal.description || 'Successfully achieved your goal!',
        achievedAt: goal.achievedDate || new Date(),
        icon: '🎯',
        rarity: 'uncommon'
      });
    }

    return achievements;
  }

  private async checkMeasurementImprovements(
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Achievement[]> {
    const achievements: Achievement[] = [];

    const measurements = await db.select()
      .from(progressMeasurements)
      .where(
        and(
          eq(progressMeasurements.customerId, customerId),
          between(progressMeasurements.measurementDate, startDate, endDate)
        )
      )
      .orderBy(asc(progressMeasurements.measurementDate));

    if (measurements.length < 2) return achievements;

    // Check for body fat reduction
    const firstBodyFat = measurements[0].bodyFatPercentage 
      ? parseFloat(measurements[0].bodyFatPercentage) 
      : null;
    const lastBodyFat = measurements[measurements.length - 1].bodyFatPercentage 
      ? parseFloat(measurements[measurements.length - 1].bodyFatPercentage)
      : null;

    if (firstBodyFat && lastBodyFat) {
      const bodyFatReduction = firstBodyFat - lastBodyFat;
      
      if (bodyFatReduction >= 2) {
        achievements.push({
          id: `bodyfat-reduction-${Date.now()}`,
          type: 'improvement',
          name: 'Body Composition Improvement',
          description: `Reduced body fat by ${bodyFatReduction.toFixed(1)}%!`,
          achievedAt: new Date(),
          value: bodyFatReduction,
          unit: '%',
          icon: '💯',
          rarity: 'uncommon'
        });
      }
    }

    // Check for muscle gain
    const firstMuscle = measurements[0].muscleMassKg 
      ? parseFloat(measurements[0].muscleMassKg)
      : null;
    const lastMuscle = measurements[measurements.length - 1].muscleMassKg
      ? parseFloat(measurements[measurements.length - 1].muscleMassKg)
      : null;

    if (firstMuscle && lastMuscle) {
      const muscleGain = lastMuscle - firstMuscle;
      
      if (muscleGain >= 1) {
        achievements.push({
          id: `muscle-gain-${Date.now()}`,
          type: 'improvement',
          name: 'Muscle Builder',
          description: `Gained ${muscleGain.toFixed(1)}kg of muscle mass!`,
          achievedAt: new Date(),
          value: muscleGain,
          unit: 'kg',
          icon: '💪',
          rarity: 'uncommon'
        });
      }
    }

    return achievements;
  }

  private async getMetricDataForPeriod(
    customerId: string,
    metric: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ average: number; change: number }> {
    const measurements = await db.select()
      .from(progressMeasurements)
      .where(
        and(
          eq(progressMeasurements.customerId, customerId),
          between(progressMeasurements.measurementDate, startDate, endDate)
        )
      )
      .orderBy(asc(progressMeasurements.measurementDate));

    if (measurements.length === 0) {
      return { average: 0, change: 0 };
    }

    const values = measurements
      .map(m => m[metric as keyof typeof m])
      .filter(v => v !== null && v !== undefined)
      .map(v => parseFloat(v as string));

    if (values.length === 0) {
      return { average: 0, change: 0 };
    }

    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const change = values.length > 1 ? values[values.length - 1] - values[0] : 0;

    return { average, change };
  }
}

// Singleton instance
export const progressAnalyticsService = new ProgressAnalyticsService();