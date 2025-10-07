/**
 * Automated Meal Plan Scheduling System
 * 
 * Intelligent scheduling system that optimizes meal timing based on:
 * - Fitness goals and workout schedules
 * - Customer lifestyle and availability
 * - Nutritional timing principles
 * - Meal prep efficiency
 * - Progressive adaptation over time
 * 
 * Key Features:
 * - Workout-nutrition synchronization
 * - Circadian rhythm optimization
 * - Batch cooking scheduling
 * - Habit formation support
 * - Adaptive scheduling based on feedback
 */

import type { MealPlan, User } from "@shared/schema";
import { customerPreferenceService } from "./customerPreferenceService";

// Scheduling data structures
export interface MealSchedule {
  mealPlanId: string;
  customerId: string;
  trainerId: string;
  schedulingProfile: SchedulingProfile;
  weeklySchedule: WeeklyMealSchedule;
  mealPrepSchedule: MealPrepSchedule;
  workoutIntegration?: WorkoutIntegration;
  adaptiveScheduling: AdaptiveScheduling;
  notifications: SchedulingNotification[];
  createdAt: Date;
  lastUpdated: Date;
}

interface SchedulingProfile {
  lifestyle: 'student' | 'working_professional' | 'parent' | 'retiree' | 'shift_worker' | 'entrepreneur';
  workSchedule: WorkSchedule;
  sleepSchedule: SleepSchedule;
  mealPrepPreference: 'daily' | 'batch_weekly' | 'batch_biweekly' | 'mixed';
  kitchenAvailability: KitchenAvailability;
  socialEatingPatterns: SocialEatingPattern[];
  timeConstraints: TimeConstraint[];
}

interface WorkSchedule {
  pattern: 'standard' | 'flexible' | 'shift' | 'irregular' | 'remote';
  workDays: string[]; // ['monday', 'tuesday', ...]
  workHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  lunchBreakDuration: number; // minutes
  commuteDuration: number; // minutes each way
}

interface SleepSchedule {
  bedtime: string; // "22:30"
  wakeTime: string; // "06:30"
  consistency: 'very_consistent' | 'consistent' | 'somewhat_variable' | 'highly_variable';
}

interface KitchenAvailability {
  morningAvailable: boolean;
  lunchAvailable: boolean;
  eveningAvailable: boolean;
  cookingSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  availableEquipment: string[];
  mealPrepSpace: 'limited' | 'adequate' | 'spacious';
}

interface SocialEatingPattern {
  occasion: 'family_dinner' | 'work_lunch' | 'weekend_brunch' | 'date_night';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'occasional';
  flexibility: 'rigid' | 'flexible' | 'very_flexible';
  impact: 'high' | 'medium' | 'low';
}

interface TimeConstraint {
  type: 'work_meeting' | 'gym_session' | 'family_time' | 'commute' | 'appointment';
  timeSlot: string; // "14:00-15:30"
  recurrence: 'daily' | 'weekly' | 'monthly' | 'specific_days';
  days?: string[]; // Which days if not daily
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface WeeklyMealSchedule {
  days: DailyMealSchedule[];
  totalPrepTime: number;
  efficiencyScore: number;
  adaptations: string[];
}

interface DailyMealSchedule {
  day: string;
  meals: ScheduledMeal[];
  dailyPrepTime: number;
  workoutTiming?: WorkoutTiming;
  specialConsiderations: string[];
}

interface ScheduledMeal {
  mealNumber: number;
  mealType: string;
  scheduledTime: string;
  prepTime: number;
  eatingDuration: number;
  location: 'home' | 'work' | 'gym' | 'on_the_go';
  prepMethod: 'fresh' | 'reheated' | 'assembled';
  nutritionalTiming: NutritionalTiming;
  flexibility: 'fixed' | 'flexible_30min' | 'flexible_1hour' | 'very_flexible';
}

interface WorkoutTiming {
  workoutTime: string;
  duration: number;
  intensity: 'low' | 'moderate' | 'high' | 'very_high';
  type: 'cardio' | 'strength' | 'mixed' | 'flexibility';
}

interface NutritionalTiming {
  preWorkout: boolean;
  postWorkout: boolean;
  fastingWindow: boolean;
  proteinEmphasis: boolean;
  carbTiming: 'high' | 'moderate' | 'low' | 'none';
  hydrationFocus: boolean;
}

interface MealPrepSchedule {
  primaryPrepDay: string;
  prepSessions: PrepSession[];
  totalWeeklyPrepTime: number;
  batchCookingOptimizations: BatchCookingOptimization[];
  shoppingSchedule: ShoppingSchedule;
}

interface PrepSession {
  day: string;
  startTime: string;
  duration: number;
  tasks: PrepTask[];
  difficulty: 'easy' | 'moderate' | 'challenging';
  batchSize: number; // Number of meals prepped
}

interface PrepTask {
  task: string;
  estimatedTime: number;
  prerequisites: string[];
  canBeDoneInParallel: string[];
  equipment: string[];
  priority: number;
}

interface BatchCookingOptimization {
  ingredient: string;
  totalQuantity: string;
  cookingMethod: string;
  storageMethod: string;
  usageSchedule: string[];
  efficiencySavings: number; // minutes saved
}

interface ShoppingSchedule {
  preferredDay: string;
  frequency: 'weekly' | 'biweekly' | 'as_needed';
  shoppingList: GroupedShoppingList;
  estimatedTime: number;
  budgetOptimization: boolean;
}

interface GroupedShoppingList {
  produce: ShoppingItem[];
  proteins: ShoppingItem[];
  grains: ShoppingItem[];
  dairy: ShoppingItem[];
  pantry: ShoppingItem[];
  frozen: ShoppingItem[];
}

interface ShoppingItem {
  item: string;
  quantity: string;
  estimatedCost: number;
  priority: 'essential' | 'important' | 'optional';
  substitutions: string[];
}

interface WorkoutIntegration {
  workoutSchedule: WorkoutSession[];
  nutritionTiming: WorkoutNutritionTiming[];
  hydrationReminders: HydrationReminder[];
  supplementSchedule?: SupplementSchedule[];
}

interface WorkoutSession {
  day: string;
  time: string;
  duration: number;
  type: string;
  intensity: string;
  nutritionalNeeds: {
    preWorkout: NutritionalNeeds;
    duringWorkout: NutritionalNeeds;
    postWorkout: NutritionalNeeds;
  };
}

interface NutritionalNeeds {
  calories?: number;
  protein?: number;
  carbs?: number;
  timing: string; // "30 minutes before"
  hydration: number; // ml
  recommendations: string[];
}

interface WorkoutNutritionTiming {
  mealNumber: number;
  timing: 'pre_workout' | 'post_workout' | 'during_workout';
  modifications: string[];
  importance: 'critical' | 'important' | 'beneficial';
}

interface HydrationReminder {
  time: string;
  amount: number; // ml
  type: 'water' | 'electrolyte' | 'protein_drink';
  context: string;
}

interface SupplementSchedule {
  supplement: string;
  dosage: string;
  timing: string;
  frequency: string;
  withMeal: boolean;
}

interface AdaptiveScheduling {
  learningHistory: SchedulingAdjustment[];
  currentOptimizations: ActiveOptimization[];
  performanceMetrics: SchedulingMetrics;
  nextReviewDate: Date;
}

interface SchedulingAdjustment {
  date: Date;
  adjustment: string;
  reason: string;
  outcome: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

interface ActiveOptimization {
  type: string;
  description: string;
  startDate: Date;
  expectedDuration: number; // days
  successMetrics: string[];
}

interface SchedulingMetrics {
  adherenceRate: number; // % of meals eaten on time
  prepEfficiency: number; // actual vs planned prep time
  satisfactionScore: number; // user feedback
  healthMarkers: string[];
  lastUpdated: Date;
}

interface SchedulingNotification {
  type: 'meal_reminder' | 'prep_reminder' | 'shopping_reminder' | 'adjustment_suggestion';
  time: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  recurring: boolean;
  enabled: boolean;
}

export class MealPlanSchedulerService {

  /**
   * Create an intelligent meal schedule based on meal plan and customer profile
   */
  async createIntelligentSchedule(
    mealPlan: MealPlan,
    customerId: string,
    customerProfile?: any
  ): Promise<MealSchedule> {
    console.log(`[Meal Plan Scheduler] Creating schedule for customer ${customerId}`);
    
    try {
      // Get customer preferences and lifestyle data
      const preferences = await customerPreferenceService.getCustomerPreferences(customerId);
      const schedulingProfile = await this.buildSchedulingProfile(customerId, customerProfile, preferences);
      
      // Generate optimized weekly schedule
      const weeklySchedule = this.generateWeeklySchedule(mealPlan, schedulingProfile);
      
      // Create meal prep schedule
      const mealPrepSchedule = this.generateMealPrepSchedule(mealPlan, schedulingProfile);
      
      // Generate workout integration if applicable
      const workoutIntegration = this.generateWorkoutIntegration(mealPlan, schedulingProfile);
      
      // Create adaptive scheduling framework
      const adaptiveScheduling = this.initializeAdaptiveScheduling();
      
      // Generate smart notifications
      const notifications = this.generateSchedulingNotifications(weeklySchedule, mealPrepSchedule);
      
      const schedule: MealSchedule = {
        mealPlanId: mealPlan.id,
        customerId: customerId,
        trainerId: mealPlan.generatedBy,
        schedulingProfile: schedulingProfile,
        weeklySchedule: weeklySchedule,
        mealPrepSchedule: mealPrepSchedule,
        workoutIntegration: workoutIntegration,
        adaptiveScheduling: adaptiveScheduling,
        notifications: notifications,
        createdAt: new Date(),
        lastUpdated: new Date()
      };
      
      console.log(`[Scheduler] Created schedule with ${weeklySchedule.days.length} days and ${mealPrepSchedule.prepSessions.length} prep sessions`);
      
      return schedule;
      
    } catch (error) {
      console.error('[Meal Plan Scheduler] Error creating schedule:', error);
      // Return basic schedule as fallback
      return this.createBasicSchedule(mealPlan, customerId);
    }
  }

  /**
   * Build comprehensive scheduling profile for customer
   */
  private async buildSchedulingProfile(
    customerId: string, 
    customerProfile: any, 
    preferences: any
  ): Promise<SchedulingProfile> {
    
    // In a real implementation, this would gather data from:
    // - Customer onboarding survey
    // - Previous meal plan feedback
    // - Wearable device data
    // - Calendar integration
    // - Location/timezone data
    
    // For now, create intelligent defaults based on common patterns
    return {
      lifestyle: this.inferLifestyle(customerProfile),
      workSchedule: this.inferWorkSchedule(customerProfile),
      sleepSchedule: this.inferSleepSchedule(customerProfile),
      mealPrepPreference: this.inferMealPrepPreference(preferences),
      kitchenAvailability: this.inferKitchenAvailability(preferences),
      socialEatingPatterns: this.inferSocialEatingPatterns(customerProfile),
      timeConstraints: this.inferTimeConstraints(customerProfile)
    };
  }

  /**
   * Generate optimized weekly meal schedule
   */
  private generateWeeklySchedule(
    mealPlan: MealPlan, 
    profile: SchedulingProfile
  ): WeeklyMealSchedule {
    
    const days: DailyMealSchedule[] = [];
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayName = daysOfWeek[dayIndex];
      const dayNumber = (dayIndex % mealPlan.days) + 1; // Cycle through meal plan days
      
      const dayMeals = mealPlan.meals.filter(meal => meal.day === dayNumber);
      const scheduledMeals: ScheduledMeal[] = [];
      
      dayMeals.forEach((meal, mealIndex) => {
        const scheduledTime = this.calculateOptimalMealTime(
          meal, 
          mealIndex, 
          dayName, 
          profile
        );
        
        const prepMethod = this.determinePrepMethod(
          meal, 
          mealIndex, 
          profile.mealPrepPreference
        );
        
        const location = this.determineOptimalLocation(
          scheduledTime, 
          dayName, 
          profile.workSchedule
        );
        
        scheduledMeals.push({
          mealNumber: meal.mealNumber,
          mealType: meal.mealType,
          scheduledTime: scheduledTime,
          prepTime: this.estimatePrepTime(meal, prepMethod),
          eatingDuration: this.estimateEatingDuration(meal),
          location: location,
          prepMethod: prepMethod,
          nutritionalTiming: this.determineNutritionalTiming(meal, scheduledTime),
          flexibility: this.determineFlexibility(meal, profile)
        });
      });
      
      days.push({
        day: dayName,
        meals: scheduledMeals,
        dailyPrepTime: scheduledMeals.reduce((total, meal) => total + meal.prepTime, 0),
        workoutTiming: this.inferWorkoutTiming(dayName, profile),
        specialConsiderations: this.identifySpecialConsiderations(dayName, profile)
      });
    }
    
    const totalPrepTime = days.reduce((total, day) => total + day.dailyPrepTime, 0);
    const efficiencyScore = this.calculateScheduleEfficiency(days, profile);
    const adaptations = this.identifyScheduleAdaptations(days, profile);
    
    return {
      days: days,
      totalPrepTime: totalPrepTime,
      efficiencyScore: efficiencyScore,
      adaptations: adaptations
    };
  }

  /**
   * Generate intelligent meal prep schedule
   */
  private generateMealPrepSchedule(
    mealPlan: MealPlan, 
    profile: SchedulingProfile
  ): MealPrepSchedule {
    
    // Determine optimal prep day based on lifestyle
    const primaryPrepDay = this.determinePrimaryPrepDay(profile);
    
    // Create prep sessions
    const prepSessions = this.generatePrepSessions(mealPlan, profile, primaryPrepDay);
    
    // Generate batch cooking optimizations
    const batchOptimizations = this.generateBatchCookingOptimizations(mealPlan);
    
    // Create shopping schedule
    const shoppingSchedule = this.generateShoppingSchedule(mealPlan, profile);
    
    const totalWeeklyPrepTime = prepSessions.reduce((total, session) => total + session.duration, 0);
    
    return {
      primaryPrepDay: primaryPrepDay,
      prepSessions: prepSessions,
      totalWeeklyPrepTime: totalWeeklyPrepTime,
      batchCookingOptimizations: batchOptimizations,
      shoppingSchedule: shoppingSchedule
    };
  }

  /**
   * Generate workout integration schedule
   */
  private generateWorkoutIntegration(
    mealPlan: MealPlan, 
    profile: SchedulingProfile
  ): WorkoutIntegration | undefined {
    
    // This would integrate with fitness tracking apps or manual input
    // For now, create basic workout integration for fitness-focused goals
    
    const fitnessGoals = ['muscle_gain', 'athletic_performance', 'weight_loss'];
    if (!fitnessGoals.some(goal => mealPlan.fitnessGoal?.toLowerCase().includes(goal))) {
      return undefined;
    }
    
    // Generate sample workout schedule
    const workoutSchedule: WorkoutSession[] = [
      {
        day: 'monday',
        time: '18:00',
        duration: 60,
        type: 'strength_training',
        intensity: 'high',
        nutritionalNeeds: {
          preWorkout: {
            carbs: 30,
            timing: '30-60 minutes before',
            hydration: 500,
            recommendations: ['Banana with coffee', 'Oatmeal with berries']
          },
          duringWorkout: {
            hydration: 250,
            timing: 'every 15-20 minutes',
            recommendations: ['Water or electrolyte drink']
          },
          postWorkout: {
            protein: 25,
            carbs: 40,
            timing: '30 minutes after',
            hydration: 500,
            recommendations: ['Protein shake with banana', 'Chocolate milk']
          }
        }
      }
    ];
    
    const nutritionTiming = this.generateWorkoutNutritionTiming(mealPlan, workoutSchedule);
    const hydrationReminders = this.generateHydrationReminders(workoutSchedule);
    
    return {
      workoutSchedule: workoutSchedule,
      nutritionTiming: nutritionTiming,
      hydrationReminders: hydrationReminders
    };
  }

  /**
   * Initialize adaptive scheduling framework
   */
  private initializeAdaptiveScheduling(): AdaptiveScheduling {
    return {
      learningHistory: [],
      currentOptimizations: [
        {
          type: 'schedule_adherence',
          description: 'Monitoring initial schedule adherence to optimize timing',
          startDate: new Date(),
          expectedDuration: 14,
          successMetrics: ['adherence_rate > 80%', 'satisfaction_score > 4.0']
        }
      ],
      performanceMetrics: {
        adherenceRate: 0,
        prepEfficiency: 0,
        satisfactionScore: 0,
        healthMarkers: [],
        lastUpdated: new Date()
      },
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
    };
  }

  /**
   * Generate intelligent scheduling notifications
   */
  private generateSchedulingNotifications(
    weeklySchedule: WeeklyMealSchedule,
    mealPrepSchedule: MealPrepSchedule
  ): SchedulingNotification[] {
    
    const notifications: SchedulingNotification[] = [];
    
    // Meal prep reminders
    mealPrepSchedule.prepSessions.forEach(session => {
      // Reminder 1 hour before prep session
      const reminderTime = this.subtractMinutes(session.startTime, 60);
      notifications.push({
        type: 'prep_reminder',
        time: `${session.day} ${reminderTime}`,
        message: `Meal prep session starting in 1 hour (${session.duration} min session)`,
        priority: 'medium',
        recurring: true,
        enabled: true
      });
    });
    
    // Shopping reminders
    notifications.push({
      type: 'shopping_reminder',
      time: `${mealPrepSchedule.shoppingSchedule.preferredDay} 09:00`,
      message: `Time for grocery shopping! Estimated time: ${mealPrepSchedule.shoppingSchedule.estimatedTime} minutes`,
      priority: 'medium',
      recurring: true,
      enabled: true
    });
    
    // Daily meal reminders (only for key meals)
    weeklySchedule.days.forEach(day => {
      const keyMeals = day.meals.filter(meal => 
        meal.mealType === 'breakfast' || 
        meal.nutritionalTiming.preWorkout || 
        meal.nutritionalTiming.postWorkout
      );
      
      keyMeals.forEach(meal => {
        const reminderTime = this.subtractMinutes(meal.scheduledTime, 15);
        notifications.push({
          type: 'meal_reminder',
          time: `${day.day} ${reminderTime}`,
          message: `${this.capitalizeFirst(meal.mealType)} in 15 minutes - ${meal.prepMethod} ${meal.location}`,
          priority: 'low',
          recurring: true,
          enabled: false // Default to disabled for less critical notifications
        });
      });
    });
    
    return notifications;
  }

  // Helper methods for building scheduling profile
  private inferLifestyle(profile: any): 'student' | 'working_professional' | 'parent' | 'retiree' | 'shift_worker' | 'entrepreneur' {
    // In a real implementation, this would analyze various profile indicators
    return 'working_professional'; // Default assumption
  }

  private inferWorkSchedule(profile: any): WorkSchedule {
    return {
      pattern: 'standard',
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      workHours: {
        start: '09:00',
        end: '17:00'
      },
      lunchBreakDuration: 60,
      commuteDuration: 30
    };
  }

  private inferSleepSchedule(profile: any): SleepSchedule {
    return {
      bedtime: '22:30',
      wakeTime: '06:30',
      consistency: 'consistent'
    };
  }

  private inferMealPrepPreference(preferences: any): 'daily' | 'batch_weekly' | 'batch_biweekly' | 'mixed' {
    // Analyze customer preferences for meal prep frequency
    return 'batch_weekly'; // Most efficient for busy lifestyles
  }

  private inferKitchenAvailability(preferences: any): KitchenAvailability {
    return {
      morningAvailable: true,
      lunchAvailable: false,
      eveningAvailable: true,
      cookingSkillLevel: 'intermediate',
      availableEquipment: ['oven', 'stovetop', 'microwave', 'refrigerator'],
      mealPrepSpace: 'adequate'
    };
  }

  private inferSocialEatingPatterns(profile: any): SocialEatingPattern[] {
    return [
      {
        occasion: 'family_dinner',
        frequency: 'weekly',
        flexibility: 'flexible',
        impact: 'medium'
      }
    ];
  }

  private inferTimeConstraints(profile: any): TimeConstraint[] {
    return [
      {
        type: 'work_meeting',
        timeSlot: '14:00-15:00',
        recurrence: 'weekly',
        days: ['tuesday', 'thursday'],
        priority: 'high'
      }
    ];
  }

  // Helper methods for schedule optimization
  private calculateOptimalMealTime(
    meal: any, 
    mealIndex: number, 
    dayName: string, 
    profile: SchedulingProfile
  ): string {
    
    // Base meal times
    const baseTimes = ['07:00', '12:00', '18:00', '20:30'];
    
    if (mealIndex < baseTimes.length) {
      let baseTime = baseTimes[mealIndex];
      
      // Adjust for work schedule
      if (meal.mealType === 'lunch' && profile.workSchedule.workDays.includes(dayName)) {
        const workStart = profile.workSchedule.workHours.start;
        const lunchTime = this.addMinutes(workStart, 240); // 4 hours after work start
        baseTime = lunchTime;
      }
      
      // Adjust for workout timing if applicable
      if (meal.mealType === 'breakfast') {
        const wakeTime = profile.sleepSchedule.wakeTime;
        baseTime = this.addMinutes(wakeTime, 30); // 30 minutes after wake
      }
      
      return baseTime;
    }
    
    return baseTimes[0]; // Fallback
  }

  private determinePrepMethod(
    meal: any, 
    mealIndex: number, 
    mealPrepPreference: string
  ): 'fresh' | 'reheated' | 'assembled' {
    
    if (mealPrepPreference === 'daily') {
      return 'fresh';
    }
    
    if (mealPrepPreference === 'batch_weekly') {
      // Breakfast and snacks often assembled, main meals reheated
      if (meal.mealType === 'breakfast' || meal.mealType === 'snack') {
        return 'assembled';
      }
      return 'reheated';
    }
    
    return 'reheated'; // Default for batch prep
  }

  private determineOptimalLocation(
    scheduledTime: string, 
    dayName: string, 
    workSchedule: WorkSchedule
  ): 'home' | 'work' | 'gym' | 'on_the_go' {
    
    if (!workSchedule.workDays.includes(dayName)) {
      return 'home';
    }
    
    const timeNum = this.timeToMinutes(scheduledTime);
    const workStart = this.timeToMinutes(workSchedule.workHours.start);
    const workEnd = this.timeToMinutes(workSchedule.workHours.end);
    
    if (timeNum >= workStart && timeNum <= workEnd) {
      return 'work';
    }
    
    return 'home';
  }

  private estimatePrepTime(meal: any, prepMethod: string): number {
    const basePrepTime = meal.recipe.prepTimeMinutes || 15;
    
    switch (prepMethod) {
      case 'fresh': return basePrepTime;
      case 'reheated': return Math.max(5, basePrepTime * 0.2);
      case 'assembled': return Math.max(3, basePrepTime * 0.1);
      default: return basePrepTime;
    }
  }

  private estimateEatingDuration(meal: any): number {
    // Estimate based on meal complexity and type
    const baseDuration = 15; // 15 minutes base eating time
    
    if (meal.mealType === 'snack') return 5;
    if (meal.mealType === 'breakfast') return 15;
    if (meal.mealType === 'lunch') return 20;
    if (meal.mealType === 'dinner') return 30;
    
    return baseDuration;
  }

  private determineNutritionalTiming(meal: any, scheduledTime: string): NutritionalTiming {
    // This would integrate with workout schedule in a full implementation
    return {
      preWorkout: false,
      postWorkout: false,
      fastingWindow: false,
      proteinEmphasis: meal.mealType === 'breakfast' || meal.mealType === 'post_workout',
      carbTiming: 'moderate',
      hydrationFocus: meal.mealType === 'breakfast'
    };
  }

  private determineFlexibility(
    meal: any, 
    profile: SchedulingProfile
  ): 'fixed' | 'flexible_30min' | 'flexible_1hour' | 'very_flexible' {
    
    // Meals during work hours are less flexible
    if (meal.location === 'work') {
      return 'flexible_30min';
    }
    
    // Weekend meals are more flexible
    if (meal.mealType === 'dinner' && profile.lifestyle !== 'shift_worker') {
      return 'flexible_1hour';
    }
    
    return 'flexible_30min'; // Default moderate flexibility
  }

  // Utility methods
  private determinePrimaryPrepDay(profile: SchedulingProfile): string {
    // Analyze work schedule to find best prep day
    if (!profile.workSchedule.workDays.includes('sunday')) {
      return 'sunday';
    }
    if (!profile.workSchedule.workDays.includes('saturday')) {
      return 'saturday';
    }
    return 'sunday'; // Default
  }

  private generatePrepSessions(
    mealPlan: MealPlan, 
    profile: SchedulingProfile, 
    primaryPrepDay: string
  ): PrepSession[] {
    
    const totalMeals = mealPlan.meals.length;
    const avgPrepTime = 20; // minutes per meal
    const primarySessionDuration = Math.min(180, totalMeals * avgPrepTime * 0.8); // 80% done on primary day
    
    return [
      {
        day: primaryPrepDay,
        startTime: '10:00',
        duration: primarySessionDuration,
        tasks: this.generatePrepTasks(mealPlan, 'primary'),
        difficulty: 'moderate',
        batchSize: Math.ceil(totalMeals * 0.8)
      },
      {
        day: 'wednesday', // Mid-week refresh
        startTime: '19:00',
        duration: 45,
        tasks: this.generatePrepTasks(mealPlan, 'refresh'),
        difficulty: 'easy',
        batchSize: Math.ceil(totalMeals * 0.2)
      }
    ];
  }

  private generatePrepTasks(mealPlan: MealPlan, sessionType: 'primary' | 'refresh'): PrepTask[] {
    if (sessionType === 'primary') {
      return [
        {
          task: 'Wash and prep all vegetables',
          estimatedTime: 30,
          prerequisites: [],
          canBeDoneInParallel: ['Cook grains'],
          equipment: ['cutting board', 'knife'],
          priority: 1
        },
        {
          task: 'Cook grains and legumes',
          estimatedTime: 45,
          prerequisites: [],
          canBeDoneInParallel: ['Prep vegetables'],
          equipment: ['stovetop', 'pots'],
          priority: 2
        },
        {
          task: 'Prepare and portion proteins',
          estimatedTime: 40,
          prerequisites: ['Cook grains and legumes'],
          canBeDoneInParallel: [],
          equipment: ['oven', 'containers'],
          priority: 3
        }
      ];
    } else {
      return [
        {
          task: 'Refresh vegetables and fruits',
          estimatedTime: 15,
          prerequisites: [],
          canBeDoneInParallel: [],
          equipment: ['cutting board'],
          priority: 1
        },
        {
          task: 'Prepare fresh components',
          estimatedTime: 20,
          prerequisites: [],
          canBeDoneInParallel: [],
          equipment: ['containers'],
          priority: 2
        }
      ];
    }
  }

  private generateBatchCookingOptimizations(mealPlan: MealPlan): BatchCookingOptimization[] {
    // This would analyze all meals to find ingredients that can be batch cooked
    return [
      {
        ingredient: 'Brown Rice',
        totalQuantity: '3 cups dry',
        cookingMethod: 'Rice cooker or stovetop',
        storageMethod: 'Refrigerate in portions',
        usageSchedule: ['Monday lunch', 'Tuesday dinner', 'Thursday lunch'],
        efficiencySavings: 25 // minutes saved vs cooking individually
      }
    ];
  }

  private generateShoppingSchedule(
    mealPlan: MealPlan, 
    profile: SchedulingProfile
  ): ShoppingSchedule {
    
    // Generate consolidated shopping list from meal plan
    const shoppingList = this.generateConsolidatedShoppingList(mealPlan);
    
    return {
      preferredDay: 'saturday',
      frequency: 'weekly',
      shoppingList: shoppingList,
      estimatedTime: 60,
      budgetOptimization: true
    };
  }

  private generateConsolidatedShoppingList(mealPlan: MealPlan): GroupedShoppingList {
    // This would analyze all meals and consolidate ingredients by category
    return {
      produce: [
        { item: 'Mixed greens', quantity: '2 bags', estimatedCost: 6, priority: 'essential', substitutions: ['Spinach', 'Arugula'] }
      ],
      proteins: [
        { item: 'Chicken breast', quantity: '2 lbs', estimatedCost: 12, priority: 'essential', substitutions: ['Turkey breast', 'Tofu'] }
      ],
      grains: [
        { item: 'Brown rice', quantity: '1 bag', estimatedCost: 4, priority: 'important', substitutions: ['Quinoa', 'Wild rice'] }
      ],
      dairy: [],
      pantry: [],
      frozen: []
    };
  }

  private generateWorkoutNutritionTiming(
    mealPlan: MealPlan, 
    workoutSchedule: WorkoutSession[]
  ): WorkoutNutritionTiming[] {
    return [
      {
        mealNumber: 1,
        timing: 'pre_workout',
        modifications: ['Increase carbs by 15-20g', 'Light and easily digestible'],
        importance: 'important'
      }
    ];
  }

  private generateHydrationReminders(workoutSchedule: WorkoutSession[]): HydrationReminder[] {
    return [
      {
        time: '17:30',
        amount: 500,
        type: 'water',
        context: '30 minutes before workout'
      }
    ];
  }

  private calculateScheduleEfficiency(days: DailyMealSchedule[], profile: SchedulingProfile): number {
    // Calculate efficiency score based on various factors
    let score = 0.7; // Base score
    
    // Analyze prep time distribution
    const avgDailyPrepTime = days.reduce((sum, day) => sum + day.dailyPrepTime, 0) / days.length;
    if (avgDailyPrepTime < 30) score += 0.1; // Efficient daily prep
    
    // Analyze meal timing conflicts
    const conflicts = this.identifyTimingConflicts(days, profile);
    score -= conflicts * 0.05; // Reduce score for each conflict
    
    return Math.max(0, Math.min(1, score));
  }

  private identifyScheduleAdaptations(days: DailyMealSchedule[], profile: SchedulingProfile): string[] {
    const adaptations: string[] = [];
    
    // Check for potential improvements
    const busyDays = days.filter(day => day.dailyPrepTime > 45);
    if (busyDays.length > 2) {
      adaptations.push('Consider additional batch cooking to reduce daily prep time');
    }
    
    const workDayMeals = days.filter(day => 
      profile.workSchedule.workDays.includes(day.day)
    );
    if (workDayMeals.some(day => day.meals.some(meal => meal.prepTime > 20))) {
      adaptations.push('Optimize work day meals for quicker preparation');
    }
    
    return adaptations;
  }

  private identifyTimingConflicts(days: DailyMealSchedule[], profile: SchedulingProfile): number {
    let conflicts = 0;
    
    days.forEach(day => {
      // Check for conflicts with work schedule
      if (profile.workSchedule.workDays.includes(day.day)) {
        const workStart = this.timeToMinutes(profile.workSchedule.workHours.start);
        const workEnd = this.timeToMinutes(profile.workSchedule.workHours.end);
        
        day.meals.forEach(meal => {
          const mealTime = this.timeToMinutes(meal.scheduledTime);
          if (mealTime >= workStart && mealTime <= workEnd && meal.location !== 'work') {
            conflicts++;
          }
        });
      }
    });
    
    return conflicts;
  }

  private identifySpecialConsiderations(dayName: string, profile: SchedulingProfile): string[] {
    const considerations: string[] = [];
    
    if (profile.workSchedule.workDays.includes(dayName)) {
      considerations.push('Work day - prioritize quick prep meals');
    }
    
    if (dayName === 'sunday') {
      considerations.push('Prep day - allow extra time for meal preparation');
    }
    
    return considerations;
  }

  private inferWorkoutTiming(dayName: string, profile: SchedulingProfile): WorkoutTiming | undefined {
    // This would integrate with actual workout schedules
    if (['monday', 'wednesday', 'friday'].includes(dayName)) {
      return {
        workoutTime: '18:00',
        duration: 60,
        intensity: 'moderate',
        type: 'mixed'
      };
    }
    return undefined;
  }

  private createBasicSchedule(mealPlan: MealPlan, customerId: string): MealSchedule {
    // Fallback basic schedule
    return {
      mealPlanId: mealPlan.id,
      customerId: customerId,
      trainerId: mealPlan.generatedBy,
      schedulingProfile: {} as SchedulingProfile,
      weeklySchedule: {} as WeeklyMealSchedule,
      mealPrepSchedule: {} as MealPrepSchedule,
      adaptiveScheduling: {} as AdaptiveScheduling,
      notifications: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    };
  }

  // Utility functions for time calculations
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private addMinutes(time: string, minutes: number): string {
    const totalMinutes = this.timeToMinutes(time) + minutes;
    return this.minutesToTime(totalMinutes);
  }

  private subtractMinutes(time: string, minutes: number): string {
    const totalMinutes = this.timeToMinutes(time) - minutes;
    return this.minutesToTime(Math.max(0, totalMinutes));
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Export singleton instance
export const mealPlanScheduler = new MealPlanSchedulerService();