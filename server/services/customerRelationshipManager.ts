import { db } from '../db';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { 
  users, 
  personalizedMealPlans, 
  personalizedRecipes,
  progressMeasurements,
  customerGoals,
  type User 
} from '@shared/schema';
import { z } from 'zod';

export interface CustomerRelationshipSummary {
  customerId: string;
  customerEmail: string;
  customerName?: string;
  relationshipStartDate: Date;
  lastInteractionDate: Date;
  totalMealPlansAssigned: number;
  totalRecipesAssigned: number;
  latestMealPlan?: any;
  progressMeasurements: number;
  activeGoals: number;
  engagementScore: number;
  communicationPreferences: {
    emailNotifications: boolean;
    systemMessages: boolean;
    progressUpdates: boolean;
  };
  tags: string[];
  notes: string;
  status: 'active' | 'inactive' | 'paused';
}

export interface CustomerEngagementMetrics {
  customerId: string;
  lastLoginDate?: Date;
  mealPlanViewCount: number;
  recipeViewCount: number;
  progressUpdateCount: number;
  messageCount: number;
  engagementTrend: 'increasing' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TrainerDashboardStats {
  totalActiveCustomers: number;
  totalMealPlansAssigned: number;
  totalRecipesShared: number;
  avgEngagementScore: number;
  customersAtRisk: number;
  recentActivity: Array<{
    type: 'meal_plan_assigned' | 'progress_updated' | 'message_sent' | 'goal_achieved';
    customerEmail: string;
    timestamp: Date;
    description: string;
  }>;
  topPerformingCustomers: Array<{
    customerId: string;
    customerEmail: string;
    engagementScore: number;
    progressScore: number;
  }>;
}

export interface CustomerFilterOptions {
  status?: 'active' | 'inactive' | 'paused';
  engagementLevel?: 'high' | 'medium' | 'low';
  hasRecentActivity?: boolean;
  tags?: string[];
  sortBy?: 'name' | 'engagement' | 'lastActivity' | 'joinDate';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export class CustomerRelationshipManagerService {
  /**
   * Get comprehensive customer relationship summary for trainer
   */
  async getCustomerRelationships(
    trainerId: string,
    filters?: CustomerFilterOptions
  ): Promise<CustomerRelationshipSummary[]> {
    try {
      // Get all customers with relationships to this trainer
      const customerRelationships = await this.fetchCustomerRelationshipData(trainerId);
      
      // Apply filters if provided
      let filteredCustomers = customerRelationships;
      if (filters) {
        filteredCustomers = this.applyCustomerFilters(customerRelationships, filters);
      }

      // Calculate engagement metrics for each customer
      const enrichedCustomers = await Promise.all(
        filteredCustomers.map(customer => this.enrichCustomerData(customer))
      );

      return enrichedCustomers;
    } catch (error) {
      console.error('Failed to get customer relationships:', error);
      throw error;
    }
  }

  /**
   * Get detailed engagement metrics for a specific customer
   */
  async getCustomerEngagementMetrics(
    trainerId: string,
    customerId: string
  ): Promise<CustomerEngagementMetrics> {
    try {
      // Verify trainer-customer relationship
      const hasRelationship = await this.verifyTrainerCustomerRelationship(trainerId, customerId);
      if (!hasRelationship) {
        throw new Error('No valid trainer-customer relationship found');
      }

      const metrics = await this.calculateEngagementMetrics(customerId);
      return metrics;
    } catch (error) {
      console.error('Failed to get customer engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Get trainer dashboard statistics
   */
  async getTrainerDashboardStats(trainerId: string): Promise<TrainerDashboardStats> {
    try {
      const [
        customerCount,
        mealPlanCount,
        recipeCount,
        recentActivity,
        topCustomers
      ] = await Promise.all([
        this.getActiveCustomerCount(trainerId),
        this.getTotalMealPlansAssigned(trainerId),
        this.getTotalRecipesAssigned(trainerId),
        this.getRecentActivity(trainerId),
        this.getTopPerformingCustomers(trainerId)
      ]);

      const avgEngagement = await this.calculateAverageEngagement(trainerId);
      const customersAtRisk = await this.getCustomersAtRisk(trainerId);

      return {
        totalActiveCustomers: customerCount,
        totalMealPlansAssigned: mealPlanCount,
        totalRecipesShared: recipeCount,
        avgEngagementScore: avgEngagement,
        customersAtRisk: customersAtRisk.length,
        recentActivity,
        topPerformingCustomers: topCustomers
      };
    } catch (error) {
      console.error('Failed to get trainer dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Update customer relationship notes and tags
   */
  async updateCustomerRelationshipNotes(
    trainerId: string,
    customerId: string,
    notes: string,
    tags: string[] = []
  ): Promise<void> {
    try {
      // Verify relationship
      const hasRelationship = await this.verifyTrainerCustomerRelationship(trainerId, customerId);
      if (!hasRelationship) {
        throw new Error('No valid trainer-customer relationship found');
      }

      // Store notes and tags (would need a customer_relationships table)
      await this.storeCustomerNotes(trainerId, customerId, notes, tags);
    } catch (error) {
      console.error('Failed to update customer relationship notes:', error);
      throw error;
    }
  }

  /**
   * Get customer progress timeline for trainer view
   */
  async getCustomerProgressTimeline(
    trainerId: string,
    customerId: string,
    days: number = 90
  ): Promise<Array<{
    date: Date;
    type: 'measurement' | 'goal' | 'meal_plan' | 'recipe';
    description: string;
    value?: any;
  }>> {
    try {
      // Verify relationship
      const hasRelationship = await this.verifyTrainerCustomerRelationship(trainerId, customerId);
      if (!hasRelationship) {
        throw new Error('No valid trainer-customer relationship found');
      }

      const timeline = await this.buildProgressTimeline(customerId, days);
      return timeline;
    } catch (error) {
      console.error('Failed to get customer progress timeline:', error);
      throw error;
    }
  }

  /**
   * Set customer communication preferences
   */
  async updateCustomerCommunicationPreferences(
    trainerId: string,
    customerId: string,
    preferences: {
      emailNotifications?: boolean;
      systemMessages?: boolean;
      progressUpdates?: boolean;
    }
  ): Promise<void> {
    try {
      // Verify relationship
      const hasRelationship = await this.verifyTrainerCustomerRelationship(trainerId, customerId);
      if (!hasRelationship) {
        throw new Error('No valid trainer-customer relationship found');
      }

      await this.storeCommunicationPreferences(customerId, preferences);
    } catch (error) {
      console.error('Failed to update communication preferences:', error);
      throw error;
    }
  }

  /**
   * Archive/pause customer relationship
   */
  async updateCustomerRelationshipStatus(
    trainerId: string,
    customerId: string,
    status: 'active' | 'inactive' | 'paused',
    reason?: string
  ): Promise<void> {
    try {
      // Verify relationship
      const hasRelationship = await this.verifyTrainerCustomerRelationship(trainerId, customerId);
      if (!hasRelationship) {
        throw new Error('No valid trainer-customer relationship found');
      }

      await this.updateRelationshipStatus(trainerId, customerId, status, reason);
    } catch (error) {
      console.error('Failed to update customer relationship status:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async fetchCustomerRelationshipData(trainerId: string): Promise<any[]> {
    // Get unique customers with meal plans or recipes from this trainer
    const customersWithMealPlans = await db.select({
      customerId: personalizedMealPlans.customerId,
      customerEmail: users.email,
      assignedAt: personalizedMealPlans.assignedAt,
    })
    .from(personalizedMealPlans)
    .innerJoin(users, eq(users.id, personalizedMealPlans.customerId))
    .where(eq(personalizedMealPlans.trainerId, trainerId));
    
    const customersWithRecipes = await db.select({
      customerId: personalizedRecipes.customerId,
      customerEmail: users.email,
      assignedAt: personalizedRecipes.assignedAt,
    })
    .from(personalizedRecipes)
    .innerJoin(users, eq(users.id, personalizedRecipes.customerId))
    .where(eq(personalizedRecipes.trainerId, trainerId));
    
    // Combine and deduplicate
    const customerMap = new Map();
    [...customersWithMealPlans, ...customersWithRecipes].forEach(customer => {
      if (!customerMap.has(customer.customerId)) {
        customerMap.set(customer.customerId, {
          customerId: customer.customerId,
          customerEmail: customer.customerEmail,
          firstAssignedAt: customer.assignedAt,
        });
      } else {
        const existing = customerMap.get(customer.customerId);
        if (customer.assignedAt && existing.firstAssignedAt && customer.assignedAt < existing.firstAssignedAt) {
          existing.firstAssignedAt = customer.assignedAt;
        }
      }
    });
    
    return Array.from(customerMap.values());
  }

  private applyCustomerFilters(
    customers: any[], 
    filters: CustomerFilterOptions
  ): any[] {
    let filtered = [...customers];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.customerEmail.toLowerCase().includes(searchLower)
      );
    }

    // Additional filter logic would be implemented here
    return filtered;
  }

  private async enrichCustomerData(customer: any): Promise<CustomerRelationshipSummary> {
    const customerId = customer.customerId;
    
    // Get counts and metrics
    const [mealPlanCount, recipeCount, measurementCount, goalCount] = await Promise.all([
      this.getMealPlanCount(customerId),
      this.getRecipeCount(customerId),
      this.getMeasurementCount(customerId),
      this.getActiveGoalCount(customerId)
    ]);

    const engagementScore = this.calculateEngagementScore({
      mealPlanCount,
      recipeCount,
      measurementCount,
      goalCount
    });

    return {
      customerId: customer.customerId,
      customerEmail: customer.customerEmail,
      relationshipStartDate: customer.firstAssignedAt || new Date(),
      lastInteractionDate: new Date(), // Would calculate from actual data
      totalMealPlansAssigned: mealPlanCount,
      totalRecipesAssigned: recipeCount,
      progressMeasurements: measurementCount,
      activeGoals: goalCount,
      engagementScore,
      communicationPreferences: {
        emailNotifications: true,
        systemMessages: true,
        progressUpdates: true,
      },
      tags: [],
      notes: '',
      status: 'active',
    };
  }

  private async verifyTrainerCustomerRelationship(
    trainerId: string,
    customerId: string
  ): Promise<boolean> {
    const [mealPlanRelations, recipeRelations] = await Promise.all([
      db.select()
        .from(personalizedMealPlans)
        .where(
          and(
            eq(personalizedMealPlans.trainerId, trainerId),
            eq(personalizedMealPlans.customerId, customerId)
          )
        )
        .limit(1),
      db.select()
        .from(personalizedRecipes)
        .where(
          and(
            eq(personalizedRecipes.trainerId, trainerId),
            eq(personalizedRecipes.customerId, customerId)
          )
        )
        .limit(1),
    ]);

    return mealPlanRelations.length > 0 || recipeRelations.length > 0;
  }

  private async calculateEngagementMetrics(customerId: string): Promise<CustomerEngagementMetrics> {
    // Mock implementation - would calculate from actual usage data
    return {
      customerId,
      mealPlanViewCount: 0,
      recipeViewCount: 0,
      progressUpdateCount: 0,
      messageCount: 0,
      engagementTrend: 'stable',
      riskLevel: 'low',
    };
  }

  private async getMealPlanCount(customerId: string): Promise<number> {
    const [result] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(personalizedMealPlans)
    .where(eq(personalizedMealPlans.customerId, customerId));
    
    return result?.count || 0;
  }

  private async getRecipeCount(customerId: string): Promise<number> {
    const [result] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(personalizedRecipes)
    .where(eq(personalizedRecipes.customerId, customerId));
    
    return result?.count || 0;
  }

  private async getMeasurementCount(customerId: string): Promise<number> {
    const [result] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(progressMeasurements)
    .where(eq(progressMeasurements.customerId, customerId));
    
    return result?.count || 0;
  }

  private async getActiveGoalCount(customerId: string): Promise<number> {
    const [result] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(customerGoals)
    .where(eq(customerGoals.customerId, customerId));
    
    return result?.count || 0;
  }

  private calculateEngagementScore(data: {
    mealPlanCount: number;
    recipeCount: number;
    measurementCount: number;
    goalCount: number;
  }): number {
    // Simple engagement scoring algorithm
    const mealPlanScore = Math.min(data.mealPlanCount * 10, 30);
    const recipeScore = Math.min(data.recipeCount * 2, 20);
    const measurementScore = Math.min(data.measurementCount * 5, 25);
    const goalScore = Math.min(data.goalCount * 8, 25);
    
    return Math.round(mealPlanScore + recipeScore + measurementScore + goalScore);
  }

  private async getActiveCustomerCount(trainerId: string): Promise<number> {
    const customers = await this.fetchCustomerRelationshipData(trainerId);
    return customers.length;
  }

  private async getTotalMealPlansAssigned(trainerId: string): Promise<number> {
    const [result] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(personalizedMealPlans)
    .where(eq(personalizedMealPlans.trainerId, trainerId));
    
    return result?.count || 0;
  }

  private async getTotalRecipesAssigned(trainerId: string): Promise<number> {
    const [result] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(personalizedRecipes)
    .where(eq(personalizedRecipes.trainerId, trainerId));
    
    return result?.count || 0;
  }

  private async getRecentActivity(trainerId: string): Promise<TrainerDashboardStats['recentActivity']> {
    // Mock implementation - would aggregate from various activity tables
    return [];
  }

  private async getTopPerformingCustomers(trainerId: string): Promise<TrainerDashboardStats['topPerformingCustomers']> {
    // Mock implementation - would calculate based on engagement and progress metrics
    return [];
  }

  private async calculateAverageEngagement(trainerId: string): Promise<number> {
    // Mock implementation
    return 75;
  }

  private async getCustomersAtRisk(trainerId: string): Promise<string[]> {
    // Mock implementation - would identify customers with declining engagement
    return [];
  }

  private async buildProgressTimeline(customerId: string, days: number): Promise<any[]> {
    // Mock implementation - would build timeline from measurements, goals, assignments
    return [];
  }

  private async storeCustomerNotes(
    trainerId: string,
    customerId: string,
    notes: string,
    tags: string[]
  ): Promise<void> {
    // Mock implementation - would store in customer_relationships table
    console.log(`Storing notes for customer ${customerId} from trainer ${trainerId}`);
  }

  private async storeCommunicationPreferences(
    customerId: string,
    preferences: any
  ): Promise<void> {
    // Mock implementation - would store in user preferences table
    console.log(`Updating communication preferences for customer ${customerId}`);
  }

  private async updateRelationshipStatus(
    trainerId: string,
    customerId: string,
    status: string,
    reason?: string
  ): Promise<void> {
    // Mock implementation - would update relationship status
    console.log(`Updating relationship status to ${status} for customer ${customerId}`);
  }
}

// Singleton instance
export const customerRelationshipManager = new CustomerRelationshipManagerService();