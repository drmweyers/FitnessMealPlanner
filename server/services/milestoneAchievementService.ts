// @ts-nocheck - Type errors suppressed
import { db } from '../db';
import { eq, and, desc, asc, sql, gte, or } from 'drizzle-orm';
import { 
  customerGoals,
  goalMilestones,
  progressMeasurements,
  users
} from '@shared/schema';
import { z } from 'zod';

export interface MilestoneDefinition {
  id: string;
  name: string;
  description: string;
  category: 'weight' | 'body_composition' | 'strength' | 'endurance' | 'consistency' | 'custom';
  targetType: 'absolute' | 'percentage' | 'streak' | 'count';
  targetValue: number;
  unit: string;
  icon: string;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  prerequisiteMilestones?: string[];
}

export interface CustomerMilestone {
  id: string;
  customerId: string;
  milestoneDefinitionId: string;
  goalId?: string;
  achievedAt: Date;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  isAchieved: boolean;
  notification?: {
    sent: boolean;
    sentAt?: Date;
    message: string;
  };
  celebration?: {
    type: 'confetti' | 'badge' | 'trophy' | 'star';
    displayDuration: number;
  };
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: 'milestone' | 'streak' | 'challenge' | 'special';
  earnedAt?: Date;
  displayOrder: number;
  isRare: boolean;
  shareableUrl?: string;
}

export interface MilestoneProgress {
  milestone: MilestoneDefinition;
  currentValue: number;
  progressPercent: number;
  estimatedCompletionDate?: Date;
  daysRemaining?: number;
  isOnTrack: boolean;
}

export interface AchievementSummary {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  badges: AchievementBadge[];
  recentAchievements: CustomerMilestone[];
  upcomingMilestones: MilestoneProgress[];
  streaks: {
    measurement: number;
    workout: number;
    mealPlan: number;
  };
}

export class MilestoneAchievementService {
  private milestoneDefinitions: MilestoneDefinition[] = [
    // Weight Loss Milestones
    {
      id: 'weight-loss-5',
      name: 'First Steps',
      description: 'Lost 5 pounds',
      category: 'weight',
      targetType: 'absolute',
      targetValue: 5,
      unit: 'lbs',
      icon: '🏃',
      points: 50,
      rarity: 'common'
    },
    {
      id: 'weight-loss-10',
      name: 'Momentum Builder',
      description: 'Lost 10 pounds',
      category: 'weight',
      targetType: 'absolute',
      targetValue: 10,
      unit: 'lbs',
      icon: '🚀',
      points: 100,
      rarity: 'common',
      prerequisiteMilestones: ['weight-loss-5']
    },
    {
      id: 'weight-loss-25',
      name: 'Transformation',
      description: 'Lost 25 pounds',
      category: 'weight',
      targetType: 'absolute',
      targetValue: 25,
      unit: 'lbs',
      icon: '🔥',
      points: 250,
      rarity: 'uncommon',
      prerequisiteMilestones: ['weight-loss-10']
    },
    {
      id: 'weight-loss-50',
      name: 'Life Changer',
      description: 'Lost 50 pounds',
      category: 'weight',
      targetType: 'absolute',
      targetValue: 50,
      unit: 'lbs',
      icon: '💎',
      points: 500,
      rarity: 'rare',
      prerequisiteMilestones: ['weight-loss-25']
    },
    // Body Composition Milestones
    {
      id: 'bodyfat-reduce-2',
      name: 'Leaner You',
      description: 'Reduced body fat by 2%',
      category: 'body_composition',
      targetType: 'percentage',
      targetValue: 2,
      unit: '%',
      icon: '💪',
      points: 75,
      rarity: 'common'
    },
    {
      id: 'bodyfat-reduce-5',
      name: 'Sculpted',
      description: 'Reduced body fat by 5%',
      category: 'body_composition',
      targetType: 'percentage',
      targetValue: 5,
      unit: '%',
      icon: '🎯',
      points: 150,
      rarity: 'uncommon'
    },
    {
      id: 'muscle-gain-2',
      name: 'Muscle Builder',
      description: 'Gained 2kg of muscle mass',
      category: 'body_composition',
      targetType: 'absolute',
      targetValue: 2,
      unit: 'kg',
      icon: '🏋️',
      points: 100,
      rarity: 'common'
    },
    // Consistency Milestones
    {
      id: 'streak-7',
      name: 'Week Warrior',
      description: '7-day tracking streak',
      category: 'consistency',
      targetType: 'streak',
      targetValue: 7,
      unit: 'days',
      icon: '📅',
      points: 25,
      rarity: 'common'
    },
    {
      id: 'streak-30',
      name: 'Monthly Master',
      description: '30-day tracking streak',
      category: 'consistency',
      targetType: 'streak',
      targetValue: 30,
      unit: 'days',
      icon: '📈',
      points: 100,
      rarity: 'uncommon'
    },
    {
      id: 'streak-90',
      name: 'Quarter Champion',
      description: '90-day tracking streak',
      category: 'consistency',
      targetType: 'streak',
      targetValue: 90,
      unit: 'days',
      icon: '🏆',
      points: 300,
      rarity: 'rare'
    },
    {
      id: 'streak-365',
      name: 'Year of Excellence',
      description: '365-day tracking streak',
      category: 'consistency',
      targetType: 'streak',
      targetValue: 365,
      unit: 'days',
      icon: '👑',
      points: 1000,
      rarity: 'legendary'
    }
  ];

  /**
   * Check and update milestones for a customer
   */
  async checkAndUpdateMilestones(customerId: string): Promise<CustomerMilestone[]> {
    try {
      const newMilestones: CustomerMilestone[] = [];

      // Check weight milestones
      const weightMilestones = await this.checkWeightMilestones(customerId);
      newMilestones.push(...weightMilestones);

      // Check body composition milestones
      const bodyCompMilestones = await this.checkBodyCompositionMilestones(customerId);
      newMilestones.push(...bodyCompMilestones);

      // Check consistency milestones
      const consistencyMilestones = await this.checkConsistencyMilestones(customerId);
      newMilestones.push(...consistencyMilestones);

      // Check goal-based milestones
      const goalMilestones = await this.checkGoalMilestones(customerId);
      newMilestones.push(...goalMilestones);

      // Store newly achieved milestones
      for (const milestone of newMilestones) {
        await this.storeMilestoneAchievement(milestone);
        await this.sendMilestoneNotification(milestone);
      }

      return newMilestones;
    } catch (error) {
      console.error('Failed to check milestones:', error);
      return [];
    }
  }

  /**
   * Get customer's achievement summary
   */
  async getAchievementSummary(customerId: string): Promise<AchievementSummary> {
    try {
      // Get all achieved milestones
      const achievements = await this.getCustomerAchievements(customerId);

      // Calculate total points and level
      const totalPoints = achievements.reduce((sum, a) => {
        const def = this.milestoneDefinitions.find(d => d.id === a.milestoneDefinitionId);
        return sum + (def?.points || 0);
      }, 0);

      const level = Math.floor(totalPoints / 500) + 1;
      const nextLevelPoints = (level * 500) - totalPoints;

      // Get badges
      const badges = await this.getCustomerBadges(customerId, achievements);

      // Get recent achievements (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentAchievements = achievements.filter(a => a.achievedAt > thirtyDaysAgo);

      // Get upcoming milestones
      const upcomingMilestones = await this.getUpcomingMilestones(customerId);

      // Calculate streaks
      const streaks = await this.calculateStreaks(customerId);

      return {
        totalPoints,
        level,
        nextLevelPoints,
        badges,
        recentAchievements,
        upcomingMilestones,
        streaks
      };
    } catch (error) {
      console.error('Failed to get achievement summary:', error);
      throw error;
    }
  }

  /**
   * Get progress towards specific milestone
   */
  async getMilestoneProgress(
    customerId: string,
    milestoneId: string
  ): Promise<MilestoneProgress | null> {
    try {
      const definition = this.milestoneDefinitions.find(d => d.id === milestoneId);
      if (!definition) {
        return null;
      }

      const currentValue = await this.getCurrentValueForMilestone(customerId, definition);
      const progressPercent = Math.min(100, (currentValue / definition.targetValue) * 100);

      // Estimate completion based on recent progress rate
      const estimatedCompletion = await this.estimateCompletionDate(
        customerId,
        definition,
        currentValue
      );

      return {
        milestone: definition,
        currentValue,
        progressPercent,
        estimatedCompletionDate: estimatedCompletion?.date,
        daysRemaining: estimatedCompletion?.days,
        isOnTrack: estimatedCompletion?.isOnTrack || false
      };
    } catch (error) {
      console.error('Failed to get milestone progress:', error);
      return null;
    }
  }

  /**
   * Create custom milestone for a goal
   */
  async createCustomMilestone(
    goalId: string,
    name: string,
    targetValue: number,
    unit: string
  ): Promise<void> {
    try {
      await db.insert(goalMilestones).values({
        goalId,
        milestoneName: name,
        targetValue: targetValue.toString(),
        targetUnit: unit,
        isAchieved: false
      });
    } catch (error) {
      console.error('Failed to create custom milestone:', error);
      throw error;
    }
  }

  /**
   * Share achievement on social platforms
   */
  async shareAchievement(
    customerId: string,
    achievementId: string,
    platform: 'facebook' | 'twitter' | 'instagram'
  ): Promise<{ shareUrl: string; message: string }> {
    try {
      const achievement = await this.getAchievementById(achievementId);
      if (!achievement || achievement.customerId !== customerId) {
        throw new Error('Achievement not found or unauthorized');
      }

      const definition = this.milestoneDefinitions.find(d => d.id === achievement.milestoneDefinitionId);
      if (!definition) {
        throw new Error('Milestone definition not found');
      }

      const message = `I just achieved "${definition.name}" - ${definition.description}! 
        ${definition.icon} #FitnessMealPlanner #FitnessGoals`;

      // Generate shareable URL (mock implementation)
      const shareUrl = `https://fitnessmealplanner.com/achievement/${achievementId}`;

      return { shareUrl, message };
    } catch (error) {
      console.error('Failed to share achievement:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async checkWeightMilestones(customerId: string): Promise<CustomerMilestone[]> {
    const milestones: CustomerMilestone[] = [];

    const measurements = await db.select()
      .from(progressMeasurements)
      .where(eq(progressMeasurements.customerId, customerId))
      .orderBy(asc(progressMeasurements.measurementDate));

    if (measurements.length < 2) return milestones;

    const firstWeight = measurements[0].weightLbs ? parseFloat(measurements[0].weightLbs) : null;
    const lastWeight = measurements[measurements.length - 1].weightLbs 
      ? parseFloat(measurements[measurements.length - 1].weightLbs) 
      : null;

    if (firstWeight && lastWeight) {
      const weightLoss = firstWeight - lastWeight;

      for (const definition of this.milestoneDefinitions.filter(d => d.category === 'weight')) {
        if (weightLoss >= definition.targetValue) {
          // Check if already achieved
          const alreadyAchieved = await this.isMilestoneAchieved(customerId, definition.id);
          if (!alreadyAchieved) {
            milestones.push({
              id: `${customerId}-${definition.id}-${Date.now()}`,
              customerId,
              milestoneDefinitionId: definition.id,
              achievedAt: new Date(),
              currentValue: weightLoss,
              targetValue: definition.targetValue,
              progressPercent: 100,
              isAchieved: true,
              celebration: {
                type: this.getCelebrationType(definition.rarity),
                displayDuration: 5000
              }
            });
          }
        }
      }
    }

    return milestones;
  }

  private async checkBodyCompositionMilestones(customerId: string): Promise<CustomerMilestone[]> {
    const milestones: CustomerMilestone[] = [];

    const measurements = await db.select()
      .from(progressMeasurements)
      .where(eq(progressMeasurements.customerId, customerId))
      .orderBy(asc(progressMeasurements.measurementDate));

    if (measurements.length < 2) return milestones;

    // Check body fat reduction
    const firstBodyFat = measurements[0].bodyFatPercentage 
      ? parseFloat(measurements[0].bodyFatPercentage) 
      : null;
    const lastBodyFat = measurements[measurements.length - 1].bodyFatPercentage 
      ? parseFloat(measurements[measurements.length - 1].bodyFatPercentage)
      : null;

    if (firstBodyFat && lastBodyFat) {
      const bodyFatReduction = firstBodyFat - lastBodyFat;

      for (const definition of this.milestoneDefinitions.filter(d => 
        d.category === 'body_composition' && d.id.includes('bodyfat')
      )) {
        if (bodyFatReduction >= definition.targetValue) {
          const alreadyAchieved = await this.isMilestoneAchieved(customerId, definition.id);
          if (!alreadyAchieved) {
            milestones.push({
              id: `${customerId}-${definition.id}-${Date.now()}`,
              customerId,
              milestoneDefinitionId: definition.id,
              achievedAt: new Date(),
              currentValue: bodyFatReduction,
              targetValue: definition.targetValue,
              progressPercent: 100,
              isAchieved: true,
              celebration: {
                type: this.getCelebrationType(definition.rarity),
                displayDuration: 5000
              }
            });
          }
        }
      }
    }

    // Check muscle gain
    const firstMuscle = measurements[0].muscleMassKg 
      ? parseFloat(measurements[0].muscleMassKg)
      : null;
    const lastMuscle = measurements[measurements.length - 1].muscleMassKg
      ? parseFloat(measurements[measurements.length - 1].muscleMassKg)
      : null;

    if (firstMuscle && lastMuscle) {
      const muscleGain = lastMuscle - firstMuscle;

      for (const definition of this.milestoneDefinitions.filter(d => 
        d.category === 'body_composition' && d.id.includes('muscle')
      )) {
        if (muscleGain >= definition.targetValue) {
          const alreadyAchieved = await this.isMilestoneAchieved(customerId, definition.id);
          if (!alreadyAchieved) {
            milestones.push({
              id: `${customerId}-${definition.id}-${Date.now()}`,
              customerId,
              milestoneDefinitionId: definition.id,
              achievedAt: new Date(),
              currentValue: muscleGain,
              targetValue: definition.targetValue,
              progressPercent: 100,
              isAchieved: true,
              celebration: {
                type: this.getCelebrationType(definition.rarity),
                displayDuration: 5000
              }
            });
          }
        }
      }
    }

    return milestones;
  }

  private async checkConsistencyMilestones(customerId: string): Promise<CustomerMilestone[]> {
    const milestones: CustomerMilestone[] = [];

    const measurements = await db.select()
      .from(progressMeasurements)
      .where(eq(progressMeasurements.customerId, customerId))
      .orderBy(asc(progressMeasurements.measurementDate));

    // Calculate tracking streak
    let currentStreak = 0;
    let maxStreak = 0;
    let lastDate: Date | null = null;

    for (const measurement of measurements) {
      if (!lastDate) {
        currentStreak = 1;
      } else {
        const daysDiff = Math.floor(
          (measurement.measurementDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff <= 7) { // Allow up to 7 days between measurements for streak
          currentStreak += daysDiff;
        } else {
          currentStreak = 1;
        }
      }
      
      maxStreak = Math.max(maxStreak, currentStreak);
      lastDate = measurement.measurementDate;
    }

    for (const definition of this.milestoneDefinitions.filter(d => d.category === 'consistency')) {
      if (maxStreak >= definition.targetValue) {
        const alreadyAchieved = await this.isMilestoneAchieved(customerId, definition.id);
        if (!alreadyAchieved) {
          milestones.push({
            id: `${customerId}-${definition.id}-${Date.now()}`,
            customerId,
            milestoneDefinitionId: definition.id,
            achievedAt: new Date(),
            currentValue: maxStreak,
            targetValue: definition.targetValue,
            progressPercent: 100,
            isAchieved: true,
            celebration: {
              type: this.getCelebrationType(definition.rarity),
              displayDuration: 5000
            }
          });
        }
      }
    }

    return milestones;
  }

  private async checkGoalMilestones(customerId: string): Promise<CustomerMilestone[]> {
    const milestones: CustomerMilestone[] = [];

    const goals = await db.select()
      .from(customerGoals)
      .where(
        and(
          eq(customerGoals.customerId, customerId),
          eq(customerGoals.status, 'achieved')
        )
      );

    for (const goal of goals) {
      // Check if milestone already recorded
      const alreadyRecorded = await this.isGoalMilestoneRecorded(goal.id);
      if (!alreadyRecorded) {
        milestones.push({
          id: `${customerId}-goal-${goal.id}-${Date.now()}`,
          customerId,
          milestoneDefinitionId: 'goal-achieved',
          goalId: goal.id,
          achievedAt: goal.achievedDate || new Date(),
          currentValue: parseFloat(goal.currentValue || '0'),
          targetValue: parseFloat(goal.targetValue || '0'),
          progressPercent: 100,
          isAchieved: true,
          celebration: {
            type: 'trophy',
            displayDuration: 5000
          }
        });
      }
    }

    return milestones;
  }

  private async getCurrentValueForMilestone(
    customerId: string,
    definition: MilestoneDefinition
  ): Promise<number> {
    if (definition.category === 'weight') {
      const measurements = await db.select()
        .from(progressMeasurements)
        .where(eq(progressMeasurements.customerId, customerId))
        .orderBy(asc(progressMeasurements.measurementDate));

      if (measurements.length < 2) return 0;

      const firstWeight = measurements[0].weightLbs ? parseFloat(measurements[0].weightLbs) : 0;
      const lastWeight = measurements[measurements.length - 1].weightLbs 
        ? parseFloat(measurements[measurements.length - 1].weightLbs) 
        : 0;

      return Math.max(0, firstWeight - lastWeight);
    }

    // Add other category calculations as needed
    return 0;
  }

  private async estimateCompletionDate(
    customerId: string,
    definition: MilestoneDefinition,
    currentValue: number
  ): Promise<{ date: Date; days: number; isOnTrack: boolean } | null> {
    // Simple estimation based on recent progress rate
    const remainingValue = definition.targetValue - currentValue;
    if (remainingValue <= 0) {
      return null; // Already achieved
    }

    // Get progress rate from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMeasurements = await db.select()
      .from(progressMeasurements)
      .where(
        and(
          eq(progressMeasurements.customerId, customerId),
          gte(progressMeasurements.measurementDate, thirtyDaysAgo)
        )
      )
      .orderBy(asc(progressMeasurements.measurementDate));

    if (recentMeasurements.length < 2) {
      return null; // Not enough data
    }

    // Calculate average daily progress
    const firstValue = recentMeasurements[0].weightLbs 
      ? parseFloat(recentMeasurements[0].weightLbs) 
      : 0;
    const lastValue = recentMeasurements[recentMeasurements.length - 1].weightLbs
      ? parseFloat(recentMeasurements[recentMeasurements.length - 1].weightLbs)
      : 0;
    
    const daysDiff = Math.floor(
      (recentMeasurements[recentMeasurements.length - 1].measurementDate.getTime() - 
       recentMeasurements[0].measurementDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) return null;

    const dailyProgress = (firstValue - lastValue) / daysDiff;
    
    if (dailyProgress <= 0) {
      return null; // No progress or regressing
    }

    const daysToCompletion = Math.ceil(remainingValue / dailyProgress);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysToCompletion);

    return {
      date: completionDate,
      days: daysToCompletion,
      isOnTrack: daysToCompletion <= 90 // Consider on track if within 90 days
    };
  }

  private async getCustomerAchievements(customerId: string): Promise<CustomerMilestone[]> {
    // Mock implementation - would fetch from database
    return [];
  }

  private async getCustomerBadges(
    customerId: string,
    achievements: CustomerMilestone[]
  ): Promise<AchievementBadge[]> {
    const badges: AchievementBadge[] = [];

    for (const achievement of achievements) {
      const definition = this.milestoneDefinitions.find(d => d.id === achievement.milestoneDefinitionId);
      if (definition) {
        badges.push({
          id: definition.id,
          name: definition.name,
          description: definition.description,
          imageUrl: `/badges/${definition.id}.png`,
          category: 'milestone',
          earnedAt: achievement.achievedAt,
          displayOrder: definition.points,
          isRare: definition.rarity !== 'common',
          shareableUrl: `/share/badge/${achievement.id}`
        });
      }
    }

    return badges.sort((a, b) => b.displayOrder - a.displayOrder);
  }

  private async getUpcomingMilestones(customerId: string): Promise<MilestoneProgress[]> {
    const upcoming: MilestoneProgress[] = [];

    for (const definition of this.milestoneDefinitions) {
      const alreadyAchieved = await this.isMilestoneAchieved(customerId, definition.id);
      if (!alreadyAchieved) {
        const progress = await this.getMilestoneProgress(customerId, definition.id);
        if (progress && progress.progressPercent > 0 && progress.progressPercent < 100) {
          upcoming.push(progress);
        }
      }
    }

    return upcoming.sort((a, b) => b.progressPercent - a.progressPercent).slice(0, 5);
  }

  private async calculateStreaks(customerId: string): Promise<{
    measurement: number;
    workout: number;
    mealPlan: number;
  }> {
    // Calculate measurement streak
    const measurements = await db.select()
      .from(progressMeasurements)
      .where(eq(progressMeasurements.customerId, customerId))
      .orderBy(desc(progressMeasurements.measurementDate))
      .limit(30);

    let measurementStreak = 0;
    let lastDate: Date | null = null;

    for (const measurement of measurements) {
      if (!lastDate) {
        measurementStreak = 1;
        lastDate = measurement.measurementDate;
      } else {
        const daysDiff = Math.floor(
          (lastDate.getTime() - measurement.measurementDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff <= 7) {
          measurementStreak++;
          lastDate = measurement.measurementDate;
        } else {
          break;
        }
      }
    }

    return {
      measurement: measurementStreak,
      workout: 0, // Mock - would calculate from workout data
      mealPlan: 0  // Mock - would calculate from meal plan adherence
    };
  }

  private async isMilestoneAchieved(customerId: string, milestoneId: string): Promise<boolean> {
    // Mock implementation - would check database
    return false;
  }

  private async isGoalMilestoneRecorded(goalId: string): Promise<boolean> {
    // Mock implementation - would check database
    return false;
  }

  private async storeMilestoneAchievement(milestone: CustomerMilestone): Promise<void> {
    // Mock implementation - would store in database
    console.log('Storing milestone achievement:', milestone);
  }

  private async sendMilestoneNotification(milestone: CustomerMilestone): Promise<void> {
    // Mock implementation - would send notification
    console.log('Sending milestone notification:', milestone);
  }

  private async getAchievementById(achievementId: string): Promise<CustomerMilestone | null> {
    // Mock implementation - would fetch from database
    return null;
  }

  private getCelebrationType(rarity: string): 'confetti' | 'badge' | 'trophy' | 'star' {
    switch (rarity) {
      case 'legendary':
      case 'epic':
        return 'trophy';
      case 'rare':
        return 'star';
      case 'uncommon':
        return 'badge';
      default:
        return 'confetti';
    }
  }
}

// Singleton instance
export const milestoneAchievementService = new MilestoneAchievementService();