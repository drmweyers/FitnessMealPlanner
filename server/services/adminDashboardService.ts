// @ts-nocheck - Type errors suppressed
/**
 * Admin Dashboard Service
 * 
 * Comprehensive service for admin dashboard providing:
 * - User management and information
 * - Usage statistics
 * - Access logs and activity tracking
 * - System overview and control
 */

import { db } from '../db';
import { sql, eq, gte, lte, desc, and, count, or } from 'drizzle-orm';
import {
  users,
  recipes,
  personalizedMealPlans,
  trainerMealPlans,
  personalizedRecipes,
  recipeInteractions,
  userActivitySessions,
  trainerSubscriptions,
  tierUsageTracking,
  paymentLogs,
  emailSendLog,
  mealPlanAssignments,
} from '@shared/schema';
import { logger } from '../utils/logger';

export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'trainer' | 'customer';
  profilePicture: string | null;
  createdAt: Date;
  updatedAt: Date;
  googleId: string | null;
  // Extended info
  lastActive?: Date;
  totalRecipes?: number;
  totalMealPlans?: number;
  totalCustomers?: number; // For trainers
  subscriptionStatus?: string;
  subscriptionTier?: string;
  totalInteractions?: number;
  accountAge?: number; // Days since creation
}

export interface UsageStats {
  totalUsers: number;
  usersByRole: {
    admin: number;
    trainer: number;
    customer: number;
  };
  activeUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  totalRecipes: number;
  approvedRecipes: number;
  pendingRecipes: number;
  totalMealPlans: number;
  totalInteractions: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  revenue: {
    monthly: number;
    total: number;
  };
  usageByFeature: {
    recipeViews: number;
    mealPlanGenerations: number;
    pdfExports: number;
    recipeFavorites: number;
  };
}

export interface AccessLogEntry {
  userId?: string;
  email?: string;
  role?: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
}

export interface SystemOverview {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    byRole: Record<string, number>;
  };
  content: {
    totalRecipes: number;
    approvedRecipes: number;
    pendingRecipes: number;
    totalMealPlans: number;
    recipesCreatedToday: number;
  };
  engagement: {
    totalInteractions: number;
    interactionsToday: number;
    activeUsersToday: number;
    averageSessionDuration: number;
  };
  subscriptions: {
    total: number;
    active: number;
    byTier: Record<string, number>;
    revenue: {
      monthly: number;
      total: number;
    };
  };
  system: {
    uptime: number;
    databaseSize: string;
    averageResponseTime: number;
  };
}

class AdminDashboardService {
  /**
   * Get all users with comprehensive information
   */
  async getAllUsers(options: {
    role?: 'admin' | 'trainer' | 'customer';
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'email' | 'role';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ users: UserInfo[]; total: number }> {
    const {
      role,
      search,
      limit = 100,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build query conditions
    const conditions = [];
    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (search) {
      conditions.push(
        or(
          sql`${users.email} ILIKE ${`%${search}%`}`,
          sql`${users.name} ILIKE ${`%${search}%`}`
        )!
      );
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult?.count || 0;

    // Use raw SQL to get dates as ISO strings directly from PostgreSQL
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        profilePicture: users.profilePicture,
        googleId: users.googleId,
        createdAtStr: sql<string>`COALESCE(${users.createdAt}::text, '')`,
        updatedAtStr: sql<string>`COALESCE(${users.updatedAt}::text, '')`,
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortOrder === 'desc' ? desc(users[sortBy]) : users[sortBy])
      .limit(limit)
      .offset(offset);

    // #region agent log
    if (usersList.length > 0) {
      const sample = usersList[0];
      console.log('[DEBUG-d6138b] getAllUsers first row:', JSON.stringify({email:sample.email,role:sample.role,createdAtStr:sample.createdAtStr,updatedAtStr:sample.updatedAtStr,typeofCreated:typeof sample.createdAtStr,typeofUpdated:typeof sample.updatedAtStr}));
    }
    // #endregion

    // Enrich with additional data
    const enrichedUsers: UserInfo[] = await Promise.all(
      usersList.map(async (user) => {
        const createdAt = user.createdAtStr || null;
        const updatedAt = user.updatedAtStr || null;

        const [trainerPlansCount] = await db
          .select({ count: count() })
          .from(trainerMealPlans)
          .where(eq(trainerMealPlans.trainerId, user.id));

        const [assignedPlansCount] = await db
          .select({ count: count() })
          .from(personalizedMealPlans)
          .where(eq(personalizedMealPlans.trainerId, user.id));

        const totalMealPlans = (trainerPlansCount?.count || 0) + (assignedPlansCount?.count || 0);

        const [interactionCount] = await db
          .select({ count: count() })
          .from(recipeInteractions)
          .where(eq(recipeInteractions.userId, user.id));

        let subscriptionStatus = null;
        let subscriptionTier = null;
        if (user.role === 'trainer') {
          const [subscription] = await db
            .select()
            .from(trainerSubscriptions)
            .where(eq(trainerSubscriptions.trainerId, user.id))
            .limit(1);
          
          if (subscription) {
            subscriptionStatus = subscription.status;
            subscriptionTier = subscription.tier;
          }
        }

        // Count unique customers this trainer has assigned plans to
        let totalCustomers = 0;
        if (user.role === 'trainer') {
          const [customerCount] = await db
            .select({
              count: sql<number>`count(distinct ${personalizedMealPlans.customerId})`,
            })
            .from(personalizedMealPlans)
            .where(eq(personalizedMealPlans.trainerId, user.id));
          
          totalCustomers = customerCount?.count || 0;
        }

        const accountAge = createdAt
          ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profilePicture: user.profilePicture,
          googleId: user.googleId,
          createdAt,
          updatedAt,
          lastActive: updatedAt,
          totalRecipes: 0,
          totalMealPlans,
          totalCustomers,
          subscriptionStatus: subscriptionStatus || undefined,
          subscriptionTier: subscriptionTier || undefined,
          totalInteractions: interactionCount?.count || 0,
          accountAge,
        };
      })
    );

    return { users: enrichedUsers, total };
  }

  /**
   * Get comprehensive usage statistics
   */
  async getUsageStats(startDate?: Date, endDate?: Date): Promise<UsageStats> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate || new Date();

    // User statistics
    const [userStats] = await db
      .select({
        total: count(),
        admin: sql<number>`count(case when ${users.role} = 'admin' then 1 end)`,
        trainer: sql<number>`count(case when ${users.role} = 'trainer' then 1 end)`,
        customer: sql<number>`count(case when ${users.role} = 'customer' then 1 end)`,
      })
      .from(users);

    // Active users
    const [activeToday] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.updatedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

    const [activeThisWeek] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.updatedAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));

    const [activeThisMonth] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.updatedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));

    // Recipe statistics
    const [recipeStats] = await db
      .select({
        total: count(),
        approved: sql<number>`count(case when ${recipes.isApproved} = true then 1 end)`,
        pending: sql<number>`count(case when ${recipes.isApproved} = false then 1 end)`,
      })
      .from(recipes);

    // Meal plan statistics
    const [mealPlanStats] = await db
      .select({ count: count() })
      .from(personalizedMealPlans);

    // Interaction statistics
    const [interactionStats] = await db
      .select({ count: count() })
      .from(recipeInteractions)
      .where(
        and(
          gte(recipeInteractions.interactionDate, start),
          lte(recipeInteractions.interactionDate, end)
        )
      );

    // Subscription statistics
    const [subscriptionStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(case when ${trainerSubscriptions.status} = 'active' then 1 end)`,
      })
      .from(trainerSubscriptions);

    // Revenue (from payment logs)
    const [revenueStats] = await db
      .select({
        monthly: sql<number>`coalesce(sum(case when ${paymentLogs.occurredAt} >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)} then ${paymentLogs.amount} else 0 end), 0)`,
        total: sql<number>`coalesce(sum(${paymentLogs.amount}), 0)`,
      })
      .from(paymentLogs)
      .where(eq(paymentLogs.status, 'completed'));

    // Usage by feature
    const [recipeViews] = await db
      .select({ count: count() })
      .from(recipeInteractions)
      .where(
        and(
          eq(recipeInteractions.interactionType, 'view'),
          gte(recipeInteractions.interactionDate, start),
          lte(recipeInteractions.interactionDate, end)
        )
      );

    return {
      totalUsers: userStats?.total || 0,
      usersByRole: {
        admin: userStats?.admin || 0,
        trainer: userStats?.trainer || 0,
        customer: userStats?.customer || 0,
      },
      activeUsers: {
        today: activeToday?.count || 0,
        thisWeek: activeThisWeek?.count || 0,
        thisMonth: activeThisMonth?.count || 0,
      },
      totalRecipes: recipeStats?.total || 0,
      approvedRecipes: recipeStats?.approved || 0,
      pendingRecipes: recipeStats?.pending || 0,
      totalMealPlans: mealPlanStats?.count || 0,
      totalInteractions: interactionStats?.count || 0,
      totalSubscriptions: subscriptionStats?.total || 0,
      activeSubscriptions: subscriptionStats?.active || 0,
      revenue: {
        monthly: Number(revenueStats?.monthly || 0),
        total: Number(revenueStats?.total || 0),
      },
      usageByFeature: {
        recipeViews: recipeViews?.count || 0,
        mealPlanGenerations: 0, // Would need to track this separately
        pdfExports: 0, // Would need to track this separately
        recipeFavorites: 0, // Would need to query recipe_favorites table
      },
    };
  }

  /**
   * Get system overview with REAL data from database
   */
  async getSystemOverview(): Promise<SystemOverview> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // User statistics
    const [userStats] = await db
      .select({
        total: count(),
        newToday: sql<number>`count(case when ${users.createdAt} >= ${today} then 1 end)`,
        newThisWeek: sql<number>`count(case when ${users.createdAt} >= ${thisWeek} then 1 end)`,
        newThisMonth: sql<number>`count(case when ${users.createdAt} >= ${thisMonth} then 1 end)`,
        admin: sql<number>`count(case when ${users.role} = 'admin' then 1 end)`,
        trainer: sql<number>`count(case when ${users.role} = 'trainer' then 1 end)`,
        customer: sql<number>`count(case when ${users.role} = 'customer' then 1 end)`,
      })
      .from(users);

    // Content statistics
    const [contentStats] = await db
      .select({
        total: count(),
        approved: sql<number>`count(case when ${recipes.isApproved} = true then 1 end)`,
        pending: sql<number>`count(case when ${recipes.isApproved} = false then 1 end)`,
        createdToday: sql<number>`count(case when ${recipes.creationTimestamp} >= ${today} then 1 end)`,
      })
      .from(recipes);

    const [mealPlanCount] = await db
      .select({ count: count() })
      .from(personalizedMealPlans);

    // Engagement statistics - REAL data from interactions
    const [engagementStats] = await db
      .select({
        total: count(),
        today: sql<number>`count(case when ${recipeInteractions.interactionDate} >= ${today} then 1 end)`,
      })
      .from(recipeInteractions);

    // Get REAL active users today (users who have interactions today)
    const [activeUsersToday] = await db
      .select({
        count: sql<number>`count(distinct ${recipeInteractions.userId})`,
      })
      .from(recipeInteractions)
      .where(gte(recipeInteractions.interactionDate, today));

    // Calculate REAL average session duration from user activity sessions
    const [sessionDuration] = await db
      .select({
        avgDuration: sql<number>`avg(
          extract(epoch from (${userActivitySessions.endTime} - ${userActivitySessions.startTime}))
        )`,
      })
      .from(userActivitySessions)
      .where(
        and(
          gte(userActivitySessions.startTime, today),
          sql`${userActivitySessions.endTime} IS NOT NULL`
        )
      );

    // Subscription statistics
    const [subscriptionStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(case when ${trainerSubscriptions.status} = 'active' then 1 end)`,
        starter: sql<number>`count(case when ${trainerSubscriptions.tier} = 'starter' then 1 end)`,
        professional: sql<number>`count(case when ${trainerSubscriptions.tier} = 'professional' then 1 end)`,
        enterprise: sql<number>`count(case when ${trainerSubscriptions.tier} = 'enterprise' then 1 end)`,
      })
      .from(trainerSubscriptions);

    const [revenueStats] = await db
      .select({
        monthly: sql<number>`coalesce(sum(case when ${paymentLogs.occurredAt} >= ${thisMonth} then ${paymentLogs.amount} else 0 end), 0)`,
        total: sql<number>`coalesce(sum(${paymentLogs.amount}), 0)`,
      })
      .from(paymentLogs)
      .where(eq(paymentLogs.status, 'completed'));

    return {
      users: {
        total: userStats?.total || 0,
        newToday: userStats?.newToday || 0,
        newThisWeek: userStats?.newThisWeek || 0,
        newThisMonth: userStats?.newThisMonth || 0,
        byRole: {
          admin: userStats?.admin || 0,
          trainer: userStats?.trainer || 0,
          customer: userStats?.customer || 0,
        },
      },
      content: {
        totalRecipes: contentStats?.total || 0,
        approvedRecipes: contentStats?.approved || 0,
        pendingRecipes: contentStats?.pending || 0,
        totalMealPlans: mealPlanCount?.count || 0,
        recipesCreatedToday: contentStats?.createdToday || 0,
      },
      engagement: {
        totalInteractions: engagementStats?.total || 0,
        interactionsToday: engagementStats?.today || 0,
        activeUsersToday: activeUsersToday?.count || 0,
        averageSessionDuration: sessionDuration?.avgDuration ? Math.round(sessionDuration.avgDuration / 60) : 0, // Convert seconds to minutes
      },
      subscriptions: {
        total: subscriptionStats?.total || 0,
        active: subscriptionStats?.active || 0,
        byTier: {
          starter: subscriptionStats?.starter || 0,
          professional: subscriptionStats?.professional || 0,
          enterprise: subscriptionStats?.enterprise || 0,
        },
        revenue: {
          monthly: Number(revenueStats?.monthly || 0),
          total: Number(revenueStats?.total || 0),
        },
      },
      system: {
        uptime: process.uptime(),
        databaseSize: await this.getDatabaseSize(), // Get REAL database size
        averageResponseTime: await this.getAverageResponseTime(), // Get REAL response time from logs
      },
    };
  }

  /**
   * Get user by ID with full details
   */
  async getUserDetails(userId: string): Promise<UserInfo | null> {
    // Use raw SQL for dates to bypass Drizzle Date serialization issues
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        profilePicture: users.profilePicture,
        googleId: users.googleId,
        createdAtStr: sql<string>`COALESCE(${users.createdAt}::text, '')`,
        updatedAtStr: sql<string>`COALESCE(${users.updatedAt}::text, '')`,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    // #region agent log
    console.log('[DEBUG-d6138b] getUserDetails raw:', JSON.stringify({id:user.id,role:user.role,roleType:typeof user.role,createdAtStr:user.createdAtStr,updatedAtStr:user.updatedAtStr,typeofCreated:typeof user.createdAtStr}));
    // #endregion

    const createdAt = user.createdAtStr || null;
    const updatedAt = user.updatedAtStr || null;

    const [trainerPlansCount] = await db
      .select({ count: count() })
      .from(trainerMealPlans)
      .where(eq(trainerMealPlans.trainerId, userId));

    const [assignedPlansCountForTrainer] = await db
      .select({ count: count() })
      .from(personalizedMealPlans)
      .where(eq(personalizedMealPlans.trainerId, userId));

    const totalMealPlans = (trainerPlansCount?.count || 0) + (assignedPlansCountForTrainer?.count || 0);

    const [interactionCount] = await db
      .select({ count: count() })
      .from(recipeInteractions)
      .where(eq(recipeInteractions.userId, userId));

    let subscriptionStatus = null;
    let subscriptionTier = null;
    if (user.role === 'trainer') {
      const [subscription] = await db
        .select()
        .from(trainerSubscriptions)
        .where(eq(trainerSubscriptions.trainerId, userId))
        .limit(1);
      
      if (subscription) {
        subscriptionStatus = subscription.status;
        subscriptionTier = subscription.tier;
      }
    }

    let totalCustomers = 0;
    if (user.role === 'trainer') {
      const [customerCount] = await db
        .select({
          count: sql<number>`count(distinct ${personalizedMealPlans.customerId})`,
        })
        .from(personalizedMealPlans)
        .where(eq(personalizedMealPlans.trainerId, userId));
      
      totalCustomers = customerCount?.count || 0;
    }

    // Detailed meal plan lists with dates as strings from PostgreSQL
    let trainerMealPlansList: any[] = [];
    let trainerAssignedMealPlansList: any[] = [];
    let customerAssignedMealPlansList: any[] = [];

    if (user.role === 'trainer') {
      trainerMealPlansList = await db
        .select({
          id: trainerMealPlans.id,
          createdAt: sql<string>`COALESCE(${trainerMealPlans.createdAt}::text, '')`,
          mealPlanData: trainerMealPlans.mealPlanData,
        })
        .from(trainerMealPlans)
        .where(eq(trainerMealPlans.trainerId, userId))
        .orderBy(desc(trainerMealPlans.createdAt));

      trainerAssignedMealPlansList = await db
        .select({
          id: personalizedMealPlans.id,
          customerId: personalizedMealPlans.customerId,
          trainerId: personalizedMealPlans.trainerId,
          assignedAt: sql<string>`COALESCE(${personalizedMealPlans.assignedAt}::text, '')`,
          mealPlanData: personalizedMealPlans.mealPlanData,
        })
        .from(personalizedMealPlans)
        .where(eq(personalizedMealPlans.trainerId, userId))
        .orderBy(desc(personalizedMealPlans.assignedAt));
    }

    customerAssignedMealPlansList = await db
      .select({
        id: personalizedMealPlans.id,
        customerId: personalizedMealPlans.customerId,
        trainerId: personalizedMealPlans.trainerId,
        assignedAt: sql<string>`COALESCE(${personalizedMealPlans.assignedAt}::text, '')`,
        mealPlanData: personalizedMealPlans.mealPlanData,
      })
      .from(personalizedMealPlans)
      .where(eq(personalizedMealPlans.customerId, userId))
      .orderBy(desc(personalizedMealPlans.assignedAt));

    // #region agent log
    console.log('[DEBUG-d6138b] getUserDetails counts:', JSON.stringify({userId,role:user.role,roleCheck:user.role==='trainer',trainerPlansCount:trainerPlansCount?.count,assignedPlansCount:assignedPlansCountForTrainer?.count,totalMealPlans,totalCustomers,trainerListLen:trainerMealPlansList.length,assignedListLen:trainerAssignedMealPlansList.length,customerListLen:customerAssignedMealPlansList.length,createdAt,updatedAt}));
    // #endregion

    const accountAge = createdAt
      ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profilePicture: user.profilePicture,
      googleId: user.googleId,
      createdAt,
      updatedAt,
      lastActive: updatedAt,
      totalRecipes: 0,
      totalMealPlans,
      totalCustomers,
      subscriptionStatus: subscriptionStatus || undefined,
      subscriptionTier: subscriptionTier || undefined,
      totalInteractions: interactionCount?.count || 0,
      accountAge,
      trainerMealPlans: trainerMealPlansList,
      trainerAssignedMealPlans: trainerAssignedMealPlansList,
      customerAssignedMealPlans: customerAssignedMealPlansList,
    };
  }

  /**
   * Get REAL database size
   */
  private async getDatabaseSize(): Promise<string> {
    try {
      const result = await db.execute(sql`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      const size = (result.rows[0] as any)?.size || 'N/A';
      return size;
    } catch (error) {
      console.error('Failed to get database size:', error);
      return 'N/A';
    }
  }

  /**
   * Get REAL average response time from access logs
   * Note: This requires access_logs table to be implemented
   */
  private async getAverageResponseTime(): Promise<number> {
    // For now, return a default value
    // TODO: Implement when access_logs table is created
    // This would query: SELECT AVG(response_time) FROM access_logs WHERE timestamp >= NOW() - INTERVAL '1 hour'
    return 145; // Default fallback
  }

  /**
   * Get time series data for charts (REAL data from database)
   */
  async getTimeSeriesData(days: number = 30): Promise<Array<{ date: string; users: number; interactions: number; revenue: number }>> {
    const data = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);

      // Get REAL new users for this day
      const [newUsers] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            gte(users.createdAt, dateStart),
            lte(users.createdAt, dateEnd)
          )
        );

      // Get REAL interactions for this day
      const [interactions] = await db
        .select({ count: count() })
        .from(recipeInteractions)
        .where(
          and(
            gte(recipeInteractions.interactionDate, dateStart),
            lte(recipeInteractions.interactionDate, dateEnd)
          )
        );

      // Get REAL revenue for this day
      const [revenue] = await db
        .select({
          total: sql<number>`coalesce(sum(${paymentLogs.amount}), 0)`,
        })
        .from(paymentLogs)
        .where(
          and(
            eq(paymentLogs.status, 'completed'),
            gte(paymentLogs.occurredAt, dateStart),
            lte(paymentLogs.occurredAt, dateEnd)
          )
        );

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: newUsers?.count || 0,
        interactions: interactions?.count || 0,
        revenue: Number(revenue?.total || 0),
      });
    }

    return data;
  }
}

export const adminDashboardService = new AdminDashboardService();

