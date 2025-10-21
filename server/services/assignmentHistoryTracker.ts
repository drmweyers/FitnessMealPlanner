import { db } from '../db';
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import {
  personalizedMealPlans,
  personalizedRecipes,
  users,
  type MealPlan
} from '@shared/schema';
import { z } from 'zod';
import { normalizeToUTCMidnight } from '../utils/dateUtils';

export interface AssignmentHistoryItem {
  id: string;
  type: 'meal_plan' | 'recipe';
  trainerId: string;
  trainerEmail: string;
  customerId: string;
  customerEmail: string;
  assignedAt: Date;
  data: MealPlan | any;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  customerFeedback?: {
    rating?: number;
    comment?: string;
    submittedAt?: Date;
  };
  metrics?: {
    adherenceRate?: number;
    completionRate?: number;
    satisfactionScore?: number;
  };
}

export interface AssignmentStatistics {
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  cancelledAssignments: number;
  avgAdherenceRate: number;
  avgSatisfactionScore: number;
  recentAssignments: AssignmentHistoryItem[];
  mostAssignedCustomers: Array<{
    customerId: string;
    customerEmail: string;
    assignmentCount: number;
    lastAssignedAt: Date;
  }>;
}

export interface AssignmentFilters {
  trainerId?: string;
  customerId?: string;
  type?: 'meal_plan' | 'recipe';
  status?: 'active' | 'completed' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'date' | 'customer' | 'type' | 'status';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AssignmentTrends {
  period: 'daily' | 'weekly' | 'monthly';
  data: Array<{
    date: string;
    mealPlansAssigned: number;
    recipesAssigned: number;
    totalAssignments: number;
    uniqueCustomers: number;
  }>;
  growthRate: number;
  peakDay: string;
  peakAssignments: number;
}

export class AssignmentHistoryTrackerService {
  /**
   * Get assignment history with filters
   */
  async getAssignmentHistory(filters: AssignmentFilters): Promise<AssignmentHistoryItem[]> {
    try {
      const assignments: AssignmentHistoryItem[] = [];

      // Fetch meal plan assignments
      if (!filters.type || filters.type === 'meal_plan') {
        const mealPlanAssignments = await this.fetchMealPlanAssignments(filters);
        assignments.push(...mealPlanAssignments);
      }

      // Fetch recipe assignments
      if (!filters.type || filters.type === 'recipe') {
        const recipeAssignments = await this.fetchRecipeAssignments(filters);
        assignments.push(...recipeAssignments);
      }

      // Sort combined results
      const sorted = this.sortAssignments(assignments, filters.sortBy, filters.sortOrder);

      // Apply pagination
      const start = filters.offset || 0;
      const end = filters.limit ? start + filters.limit : undefined;
      
      return sorted.slice(start, end);
    } catch (error) {
      console.error('Failed to get assignment history:', error);
      throw error;
    }
  }

  /**
   * Get assignment statistics for a trainer
   */
  async getAssignmentStatistics(trainerId: string, days: number = 30): Promise<AssignmentStatistics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all assignments for the period
      const assignments = await this.getAssignmentHistory({
        trainerId,
        startDate,
        endDate: new Date()
      });

      // Calculate statistics
      const stats = this.calculateStatistics(assignments);

      // Get most assigned customers
      const mostAssigned = await this.getMostAssignedCustomers(trainerId, days);

      return {
        ...stats,
        recentAssignments: assignments.slice(0, 10),
        mostAssignedCustomers: mostAssigned
      };
    } catch (error) {
      console.error('Failed to get assignment statistics:', error);
      throw error;
    }
  }

  /**
   * Track new assignment
   */
  async trackAssignment(
    type: 'meal_plan' | 'recipe',
    trainerId: string,
    customerId: string,
    data: any,
    notes?: string
  ): Promise<AssignmentHistoryItem> {
    try {
      // Get user details
      const [trainer, customer] = await Promise.all([
        db.select().from(users).where(eq(users.id, trainerId)).limit(1),
        db.select().from(users).where(eq(users.id, customerId)).limit(1)
      ]);

      if (!trainer.length || !customer.length) {
        throw new Error('Trainer or customer not found');
      }

      const assignment: AssignmentHistoryItem = {
        id: this.generateAssignmentId(),
        type,
        trainerId,
        trainerEmail: trainer[0].email,
        customerId,
        customerEmail: customer[0].email,
        assignedAt: normalizeToUTCMidnight(),
        data,
        status: 'active',
        notes
      };

      // Store assignment (would need proper table)
      await this.storeAssignment(assignment);

      return assignment;
    } catch (error) {
      console.error('Failed to track assignment:', error);
      throw error;
    }
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: 'active' | 'completed' | 'cancelled',
    reason?: string
  ): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (status === 'completed') {
        updateData.completedAt = new Date();
      } else if (status === 'cancelled') {
        updateData.cancelledAt = new Date();
        updateData.cancelReason = reason;
      }

      await this.updateAssignment(assignmentId, updateData);
    } catch (error) {
      console.error('Failed to update assignment status:', error);
      throw error;
    }
  }

  /**
   * Add customer feedback to assignment
   */
  async addCustomerFeedback(
    assignmentId: string,
    customerId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    try {
      // Verify customer owns this assignment
      const assignment = await this.getAssignmentById(assignmentId);
      if (!assignment || assignment.customerId !== customerId) {
        throw new Error('Assignment not found or unauthorized');
      }

      const feedback = {
        rating,
        comment,
        submittedAt: new Date()
      };

      await this.updateAssignment(assignmentId, { customerFeedback: feedback });
    } catch (error) {
      console.error('Failed to add customer feedback:', error);
      throw error;
    }
  }

  /**
   * Get assignment trends over time
   */
  async getAssignmentTrends(
    trainerId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly',
    duration: number = 12
  ): Promise<AssignmentTrends> {
    try {
      const trends = await this.calculateTrends(trainerId, period, duration);
      return trends;
    } catch (error) {
      console.error('Failed to get assignment trends:', error);
      throw error;
    }
  }

  /**
   * Get customer assignment history
   */
  async getCustomerAssignmentHistory(
    trainerId: string,
    customerId: string
  ): Promise<AssignmentHistoryItem[]> {
    try {
      // Verify trainer-customer relationship
      const hasRelationship = await this.verifyTrainerCustomerRelationship(trainerId, customerId);
      if (!hasRelationship) {
        throw new Error('No valid trainer-customer relationship');
      }

      const assignments = await this.getAssignmentHistory({
        trainerId,
        customerId,
        sortBy: 'date',
        sortOrder: 'desc'
      });

      return assignments;
    } catch (error) {
      console.error('Failed to get customer assignment history:', error);
      throw error;
    }
  }

  /**
   * Export assignment history
   */
  async exportAssignmentHistory(
    trainerId: string,
    format: 'json' | 'csv',
    filters?: AssignmentFilters
  ): Promise<string | object> {
    try {
      const assignments = await this.getAssignmentHistory({
        ...filters,
        trainerId
      });

      if (format === 'json') {
        return assignments;
      } else {
        return this.convertToCSV(assignments);
      }
    } catch (error) {
      console.error('Failed to export assignment history:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async fetchMealPlanAssignments(filters: AssignmentFilters): Promise<AssignmentHistoryItem[]> {
    let query = db.select({
      id: personalizedMealPlans.id,
      trainerId: personalizedMealPlans.trainerId,
      customerId: personalizedMealPlans.customerId,
      mealPlanData: personalizedMealPlans.mealPlanData,
      assignedAt: personalizedMealPlans.assignedAt,
      trainerEmail: users.email,
    })
    .from(personalizedMealPlans)
    .innerJoin(users, eq(users.id, personalizedMealPlans.trainerId));

    // Apply filters
    const conditions = [];
    if (filters.trainerId) {
      conditions.push(eq(personalizedMealPlans.trainerId, filters.trainerId));
    }
    if (filters.customerId) {
      conditions.push(eq(personalizedMealPlans.customerId, filters.customerId));
    }
    if (filters.startDate) {
      conditions.push(gte(personalizedMealPlans.assignedAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(personalizedMealPlans.assignedAt, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query;

    // Get customer emails
    const customerIds = [...new Set(results.map(r => r.customerId))];
    const customers = await db.select({
      id: users.id,
      email: users.email
    })
    .from(users)
    .where(sql`${users.id} = ANY(${customerIds})`);

    const customerMap = new Map(customers.map(c => [c.id, c.email]));

    return results.map(r => ({
      id: r.id,
      type: 'meal_plan' as const,
      trainerId: r.trainerId,
      trainerEmail: r.trainerEmail,
      customerId: r.customerId,
      customerEmail: customerMap.get(r.customerId) || '',
      assignedAt: r.assignedAt || normalizeToUTCMidnight(),
      data: r.mealPlanData,
      status: 'active' as const,
    }));
  }

  private async fetchRecipeAssignments(filters: AssignmentFilters): Promise<AssignmentHistoryItem[]> {
    let query = db.select({
      id: personalizedRecipes.id,
      trainerId: personalizedRecipes.trainerId,
      customerId: personalizedRecipes.customerId,
      recipeId: personalizedRecipes.recipeId,
      assignedAt: personalizedRecipes.assignedAt,
      trainerEmail: users.email,
    })
    .from(personalizedRecipes)
    .innerJoin(users, eq(users.id, personalizedRecipes.trainerId));

    // Apply filters
    const conditions = [];
    if (filters.trainerId) {
      conditions.push(eq(personalizedRecipes.trainerId, filters.trainerId));
    }
    if (filters.customerId) {
      conditions.push(eq(personalizedRecipes.customerId, filters.customerId));
    }
    if (filters.startDate) {
      conditions.push(gte(personalizedRecipes.assignedAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(personalizedRecipes.assignedAt, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query;

    // Get customer emails
    const customerIds = [...new Set(results.map(r => r.customerId))];
    const customers = await db.select({
      id: users.id,
      email: users.email
    })
    .from(users)
    .where(sql`${users.id} = ANY(${customerIds})`);

    const customerMap = new Map(customers.map(c => [c.id, c.email]));

    return results.map(r => ({
      id: r.id,
      type: 'recipe' as const,
      trainerId: r.trainerId,
      trainerEmail: r.trainerEmail,
      customerId: r.customerId,
      customerEmail: customerMap.get(r.customerId) || '',
      assignedAt: r.assignedAt || normalizeToUTCMidnight(),
      data: { recipeId: r.recipeId },
      status: 'active' as const,
    }));
  }

  private sortAssignments(
    assignments: AssignmentHistoryItem[],
    sortBy: string = 'date',
    sortOrder: string = 'desc'
  ): AssignmentHistoryItem[] {
    return assignments.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = a.assignedAt.getTime() - b.assignedAt.getTime();
          break;
        case 'customer':
          comparison = a.customerEmail.localeCompare(b.customerEmail);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = a.assignedAt.getTime() - b.assignedAt.getTime();
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  private calculateStatistics(assignments: AssignmentHistoryItem[]): Omit<AssignmentStatistics, 'recentAssignments' | 'mostAssignedCustomers'> {
    const total = assignments.length;
    const active = assignments.filter(a => a.status === 'active').length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const cancelled = assignments.filter(a => a.status === 'cancelled').length;

    // Calculate average adherence and satisfaction (mock data for now)
    const avgAdherence = assignments
      .filter(a => a.metrics?.adherenceRate)
      .reduce((sum, a) => sum + (a.metrics?.adherenceRate || 0), 0) / total || 85;

    const avgSatisfaction = assignments
      .filter(a => a.customerFeedback?.rating)
      .reduce((sum, a) => sum + (a.customerFeedback?.rating || 0), 0) / total || 4.5;

    return {
      totalAssignments: total,
      activeAssignments: active,
      completedAssignments: completed,
      cancelledAssignments: cancelled,
      avgAdherenceRate: avgAdherence,
      avgSatisfactionScore: avgSatisfaction
    };
  }

  private async getMostAssignedCustomers(trainerId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get meal plan assignments
    const mealPlanAssignments = await db.select({
      customerId: personalizedMealPlans.customerId,
      customerEmail: users.email,
      assignedAt: personalizedMealPlans.assignedAt,
    })
    .from(personalizedMealPlans)
    .innerJoin(users, eq(users.id, personalizedMealPlans.customerId))
    .where(
      and(
        eq(personalizedMealPlans.trainerId, trainerId),
        gte(personalizedMealPlans.assignedAt, startDate)
      )
    );

    // Count assignments per customer
    const customerCounts = new Map<string, { email: string; count: number; lastDate: Date }>();
    
    mealPlanAssignments.forEach(assignment => {
      const existing = customerCounts.get(assignment.customerId);
      if (!existing) {
        customerCounts.set(assignment.customerId, {
          email: assignment.customerEmail,
          count: 1,
          lastDate: assignment.assignedAt || normalizeToUTCMidnight()
        });
      } else {
        existing.count++;
        if (assignment.assignedAt && assignment.assignedAt > existing.lastDate) {
          existing.lastDate = assignment.assignedAt;
        }
      }
    });

    // Convert to array and sort by count
    const sorted = Array.from(customerCounts.entries())
      .map(([customerId, data]) => ({
        customerId,
        customerEmail: data.email,
        assignmentCount: data.count,
        lastAssignedAt: data.lastDate
      }))
      .sort((a, b) => b.assignmentCount - a.assignmentCount)
      .slice(0, 5);

    return sorted;
  }

  private async verifyTrainerCustomerRelationship(trainerId: string, customerId: string): Promise<boolean> {
    const [mealPlans, recipes] = await Promise.all([
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
        .limit(1)
    ]);

    return mealPlans.length > 0 || recipes.length > 0;
  }

  private async calculateTrends(
    trainerId: string,
    period: 'daily' | 'weekly' | 'monthly',
    duration: number
  ): Promise<AssignmentTrends> {
    // Mock implementation - would calculate actual trends from data
    return {
      period,
      data: [],
      growthRate: 15,
      peakDay: 'Monday',
      peakAssignments: 8
    };
  }

  private generateAssignmentId(): string {
    return `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeAssignment(assignment: AssignmentHistoryItem): Promise<void> {
    // Mock implementation - would store in assignment_history table
    console.log('Storing assignment:', assignment.id);
  }

  private async updateAssignment(assignmentId: string, data: any): Promise<void> {
    // Mock implementation - would update assignment_history table
    console.log('Updating assignment:', assignmentId, data);
  }

  private async getAssignmentById(assignmentId: string): Promise<AssignmentHistoryItem | null> {
    // Mock implementation - would fetch from assignment_history table
    return null;
  }

  private convertToCSV(assignments: AssignmentHistoryItem[]): string {
    const headers = ['Date', 'Type', 'Customer', 'Status', 'Notes'];
    const rows = assignments.map(a => [
      a.assignedAt.toISOString(),
      a.type,
      a.customerEmail,
      a.status,
      a.notes || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Singleton instance
export const assignmentHistoryTracker = new AssignmentHistoryTrackerService();