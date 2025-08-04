/**
 * FitMeal Pro Storage Layer
 * 
 * This module provides a clean abstraction layer over the database using the
 * Repository pattern. It handles all CRUD operations for users and recipes,
 * with comprehensive filtering, search capabilities, and proper error handling.
 * 
 * Architecture:
 * - IStorage interface defines the contract for all storage operations
 * - DatabaseStorage implements the interface using Drizzle ORM
 * - All database queries are centralized here for consistency
 * - Type safety is maintained through imported schema types
 */

import {
  users,
  recipes,
  personalizedRecipes,
  personalizedMealPlans,
  customerInvitations,
  trainerMealPlans,
  mealPlanAssignments,
  type User,
  type InsertUser,
  type Recipe,
  type InsertRecipe,
  type UpdateRecipe,
  type RecipeFilter,
  type MealPlan,
  type CustomerInvitation,
  type InsertCustomerInvitation,
  type TrainerMealPlan,
  type InsertTrainerMealPlan,
  type TrainerMealPlanWithAssignments,
  type MealPlanAssignment,
  passwordResetTokens,
  refreshTokens,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, lte, gte, desc, sql } from "drizzle-orm";
import { inArray } from "drizzle-orm";

/**
 * Storage Interface
 * 
 * Defines all storage operations available in the application.
 * This interface allows for easy testing and potential future
 * implementations (e.g., in-memory storage for tests).
 */
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createGoogleUser(user: { email: string; googleId: string; name: string; profilePicture?: string; role: 'admin' | 'trainer' | 'customer' }): Promise<User>;
  linkGoogleAccount(userId: string, googleId: string): Promise<void>;
  updateUserPassword(userId: string, password: string): Promise<void>;
  updateUserEmail(userId: string, email: string): Promise<void>;
  getCustomers(recipeId?: string, mealPlanId?: string): Promise<(User & { hasRecipe?: boolean; hasMealPlan?: boolean })[]>;
  
  // Password Reset
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ userId: string, expiresAt: Date } | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  
  // Refresh Token Operations
  createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getRefreshToken(token: string): Promise<{ userId: string, expiresAt: Date } | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
  
  // Customer Invitation Operations
  createInvitation(invitation: InsertCustomerInvitation): Promise<CustomerInvitation>;
  getInvitation(token: string): Promise<CustomerInvitation | undefined>;
  getInvitationsByTrainer(trainerId: string): Promise<CustomerInvitation[]>;
  markInvitationAsUsed(token: string): Promise<void>;
  deleteExpiredInvitations(): Promise<number>;
  
  // Recipe CRUD operations
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe | undefined>;
  deleteRecipe(id: string): Promise<boolean>;
  bulkDeleteRecipes(ids: string[]): Promise<number>;
  
  // Advanced recipe operations
  searchRecipes(filters: RecipeFilter): Promise<{ recipes: Recipe[]; total: number }>;
  approveRecipe(id: string): Promise<Recipe | undefined>;
  
  // Analytics and reporting
  getRecipeStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
  }>;

  // Personalized recipes
  getPersonalizedRecipes(customerId: string): Promise<Recipe[]>;
  assignRecipeToCustomers(trainerId: string, recipeId: string, customerIds: string[]): Promise<void>;
  
  // Personalized meal plans
  assignMealPlanToCustomers(trainerId: string, mealPlanData: MealPlan, customerIds: string[]): Promise<void>;
  getPersonalizedMealPlans(customerId: string): Promise<any[]>;
  
  // Trainer meal plans
  createTrainerMealPlan(mealPlan: InsertTrainerMealPlan): Promise<TrainerMealPlan>;
  getTrainerMealPlan(id: string): Promise<TrainerMealPlan | undefined>;
  getTrainerMealPlans(trainerId: string): Promise<TrainerMealPlanWithAssignments[]>;
  updateTrainerMealPlan(id: string, updates: Partial<InsertTrainerMealPlan>): Promise<TrainerMealPlan | undefined>;
  deleteTrainerMealPlan(id: string): Promise<boolean>;
  
  // Meal plan assignments
  assignMealPlanToCustomer(mealPlanId: string, customerId: string, assignedBy: string, notes?: string): Promise<MealPlanAssignment>;
  unassignMealPlanFromCustomer(mealPlanId: string, customerId: string): Promise<boolean>;
  getMealPlanAssignments(mealPlanId: string): Promise<MealPlanAssignment[]>;
  
  // Customer management
  getTrainerCustomers(trainerId: string): Promise<{id: string; email: string; firstAssignedAt: string}[]>;
  getCustomerMealPlans(trainerId: string, customerId: string): Promise<any[]>;
  removeMealPlanAssignment(trainerId: string, assignmentId: string): Promise<boolean>;
  
  // Transaction support
  transaction<T>(action: (trx: any) => Promise<T>): Promise<T>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async createGoogleUser(userData: { email: string; googleId: string; name: string; profilePicture?: string; role: 'admin' | 'trainer' | 'customer' }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: userData.email,
      googleId: userData.googleId,
      name: userData.name,
      profilePicture: userData.profilePicture,
      role: userData.role,
      password: null, // No password for Google OAuth users
    }).returning();
    return user;
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<void> {
    await db.update(users).set({ googleId }).where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, password: string): Promise<void> {
    await db.update(users).set({ password }).where(eq(users.id, userId));
  }

  async updateUserEmail(userId: string, email: string): Promise<void> {
    await db.update(users).set({ email }).where(eq(users.id, userId));
  }

  async getCustomers(recipeId?: string, mealPlanId?: string): Promise<(User & { hasRecipe?: boolean; hasMealPlan?: boolean })[]> {
    // Optimized version: Use single query with LEFT JOINs to avoid N+1 pattern
    const query = db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        role: users.role,
        googleId: users.googleId,
        name: users.name,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        hasRecipe: sql<boolean>`CASE WHEN ${personalizedRecipes.customerId} IS NOT NULL THEN true ELSE false END`,
        hasMealPlan: sql<boolean>`CASE WHEN ${personalizedMealPlans.customerId} IS NOT NULL THEN true ELSE false END`
      })
      .from(users)
      .leftJoin(
        personalizedRecipes, 
        and(
          eq(users.id, personalizedRecipes.customerId),
          recipeId ? eq(personalizedRecipes.recipeId, recipeId) : sql`true`
        )
      )
      .leftJoin(
        personalizedMealPlans, 
        eq(users.id, personalizedMealPlans.customerId)
      )
      .where(eq(users.role, 'customer'))
      .groupBy(
        users.id, users.email, users.password, users.role, 
        users.googleId, users.name, users.profilePicture, 
        users.createdAt, users.updatedAt,
        personalizedRecipes.customerId, personalizedMealPlans.customerId
      );
    
    const results = await query;
    
    // Deduplicate customers (since JOINs might create multiple rows per customer)
    const customerMap = new Map();
    results.forEach(result => {
      const customerId = result.id;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          id: result.id,
          email: result.email,
          password: result.password,
          role: result.role,
          googleId: result.googleId,
          name: result.name,
          profilePicture: result.profilePicture,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          hasRecipe: result.hasRecipe,
          hasMealPlan: result.hasMealPlan
        });
      } else {
        // Merge boolean flags (OR operation)
        const existing = customerMap.get(customerId);
        existing.hasRecipe = existing.hasRecipe || result.hasRecipe;
        existing.hasMealPlan = existing.hasMealPlan || result.hasMealPlan;
      }
    });
    
    return Array.from(customerMap.values());
  }

  // Password Reset
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  }

  async getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; } | undefined> {
    const [result] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return result;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  }

  // Refresh Token Operations
  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(refreshTokens).values({ userId, token, expiresAt });
  }

  async getRefreshToken(token: string): Promise<{ userId: string; expiresAt: Date; } | undefined> {
    const [result] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
    return result;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  // Recipe operations
  async createRecipe(recipeData: InsertRecipe): Promise<Recipe> {
    const [recipe] = await db.insert(recipes).values(recipeData as any).returning();
    return recipe;
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe | undefined> {
    const updateData: any = { 
      ...updates, 
      lastUpdatedTimestamp: new Date() 
    };
    
    // Ensure array fields are properly handled
    if (updates.mealTypes) updateData.mealTypes = updates.mealTypes;
    if (updates.dietaryTags) updateData.dietaryTags = updates.dietaryTags;
    if (updates.mainIngredientTags) updateData.mainIngredientTags = updates.mainIngredientTags;
    if (updates.ingredientsJson) updateData.ingredientsJson = updates.ingredientsJson;
    
    const [recipe] = await db
      .update(recipes)
      .set(updateData)
      .where(eq(recipes.id, id))
      .returning();
    return recipe;
  }

  async deleteRecipe(id: string): Promise<boolean> {
    try {
      // First check if recipe exists
      const existingRecipe = await this.getRecipe(id);
      if (!existingRecipe) {
        return false;
      }
      
      await db.delete(recipes).where(eq(recipes.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return false;
    }
  }

  async bulkDeleteRecipes(ids: string[]): Promise<number> {
    try {
      const result = await db.delete(recipes).where(inArray(recipes.id, ids));
      return Number(result.rowCount) || 0;
    } catch (error) {
      console.error('Error bulk deleting recipes:', error);
      return 0;
    }
  }

  async approveRecipe(id: string): Promise<Recipe | undefined> {
    return this.updateRecipe(id, { isApproved: true });
  }

  async getPersonalizedRecipes(customerId: string): Promise<Recipe[]> {
    const assignedRecipes = await db
      .select({
        recipe: recipes,
      })
      .from(personalizedRecipes)
      .leftJoin(recipes, eq(personalizedRecipes.recipeId, recipes.id))
      .where(eq(personalizedRecipes.customerId, customerId))
      .orderBy(desc(personalizedRecipes.assignedAt));

    return assignedRecipes.map(r => r.recipe).filter((r): r is Recipe => r !== null);
  }

  async assignRecipeToCustomers(trainerId: string, recipeId: string, customerIds: string[]): Promise<void> {
    // Get current assignments for this recipe
    const currentAssignments = await db
      .select()
      .from(personalizedRecipes)
      .where(eq(personalizedRecipes.recipeId, recipeId));
    
    const currentlyAssignedIds = new Set(currentAssignments.map(a => a.customerId));
    
    // Determine which customers to add and remove
    const toAdd = customerIds.filter(id => !currentlyAssignedIds.has(id));
    const toRemove = Array.from(currentlyAssignedIds).filter(id => !customerIds.includes(id));
    
    // Remove assignments that are no longer needed
    if (toRemove.length > 0) {
      await db
        .delete(personalizedRecipes)
        .where(
          and(
            eq(personalizedRecipes.recipeId, recipeId),
            inArray(personalizedRecipes.customerId, toRemove)
          )
        );
    }
    
    // Add new assignments
    if (toAdd.length > 0) {
      const assignments = toAdd.map(customerId => ({
        customerId,
        trainerId,
        recipeId,
      }));
      
      await db.insert(personalizedRecipes).values(assignments);
    }
  }

  async assignMealPlanToCustomers(trainerId: string, mealPlanData: MealPlan, customerIds: string[]): Promise<void> {
    // Add new meal plan assignments without removing existing ones
    // This allows customers to have multiple meal plans assigned
    if (customerIds.length > 0) {
      const assignments = customerIds.map(customerId => ({
        customerId,
        trainerId,
        mealPlanData,
      }));
      
      await db.insert(personalizedMealPlans).values(assignments);
    }
  }

  async getPersonalizedMealPlans(customerId: string): Promise<any[]> {
    const assignedMealPlans = await db
      .select({
        id: personalizedMealPlans.id,
        customerId: personalizedMealPlans.customerId,
        trainerId: personalizedMealPlans.trainerId,
        mealPlanData: personalizedMealPlans.mealPlanData,
        assignedAt: personalizedMealPlans.assignedAt,
      })
      .from(personalizedMealPlans)
      .where(eq(personalizedMealPlans.customerId, customerId))
      .orderBy(desc(personalizedMealPlans.assignedAt));

    return assignedMealPlans;
  }

  async searchRecipes(filters: RecipeFilter): Promise<{ recipes: Recipe[]; total: number }> {
    const conditions = [];

    // Apply filters
    if (filters.approved !== undefined) {
      conditions.push(eq(recipes.isApproved, filters.approved));
    }

    if (filters.search) {
      // Use full-text search for better performance with large datasets
      const searchQuery = filters.search.trim().replace(/\s+/g, ' & ');
      conditions.push(
        sql`(
          to_tsvector('english', coalesce(${recipes.name}, '') || ' ' || coalesce(${recipes.description}, '')) @@ plainto_tsquery('english', ${filters.search})
          OR LOWER(${recipes.name}) ILIKE ${'%' + filters.search.toLowerCase() + '%'}
          OR LOWER(${recipes.ingredientsJson}::text) ILIKE ${'%' + filters.search.toLowerCase() + '%'}
        )`
      );
    }

    if (filters.mealType) {
      // Use GIN index for JSONB array containment
      conditions.push(sql`${recipes.mealTypes} @> ${JSON.stringify([filters.mealType])}`);
    }

    if (filters.dietaryTag) {
      // Use GIN index for JSONB array containment
      conditions.push(sql`${recipes.dietaryTags} @> ${JSON.stringify([filters.dietaryTag])}`);
    }

    if (filters.maxPrepTime) {
      conditions.push(lte(recipes.prepTimeMinutes, filters.maxPrepTime));
    }

    if (filters.maxCalories) {
      conditions.push(lte(recipes.caloriesKcal, filters.maxCalories));
    }

    if (filters.minCalories) {
      conditions.push(gte(recipes.caloriesKcal, filters.minCalories));
    }

    if (filters.minProtein) {
      conditions.push(gte(recipes.proteinGrams, filters.minProtein.toString()));
    }

    if (filters.maxProtein) {
      conditions.push(lte(recipes.proteinGrams, filters.maxProtein.toString()));
    }

    if (filters.minCarbs) {
      conditions.push(gte(recipes.carbsGrams, filters.minCarbs.toString()));
    }

    if (filters.maxCarbs) {
      conditions.push(lte(recipes.carbsGrams, filters.maxCarbs.toString()));
    }

    if (filters.minFat) {
      conditions.push(gte(recipes.fatGrams, filters.minFat.toString()));
    }

    if (filters.maxFat) {
      conditions.push(lte(recipes.fatGrams, filters.maxFat.toString()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(recipes)
      .where(whereClause);

    // Get paginated results
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const offset = (page - 1) * limit;

    // Optimize ordering based on search vs browsing
    let orderBy;
    if (filters.search) {
      // For search queries, use relevance-based ordering
      orderBy = sql`ts_rank(to_tsvector('english', coalesce(${recipes.name}, '') || ' ' || coalesce(${recipes.description}, '')), plainto_tsquery('english', ${filters.search})) DESC, ${recipes.creationTimestamp} DESC`;
    } else {
      // For browsing, use creation timestamp
      orderBy = desc(recipes.creationTimestamp);
    }
    
    const recipeResults = await db
      .select()
      .from(recipes)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return { recipes: recipeResults, total: count };
  }

  async getRecipeStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
  }> {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        approved: sql<number>`count(*) filter (where is_approved = true)`,
        pending: sql<number>`count(*) filter (where is_approved = false)`,
      })
      .from(recipes);

    return {
      total: stats.total,
      approved: stats.approved,
      pending: stats.pending,
    };
  }
  
  // Customer Invitation Operations
  async createInvitation(invitationData: InsertCustomerInvitation): Promise<CustomerInvitation> {
    const [invitation] = await db.insert(customerInvitations).values(invitationData).returning();
    return invitation;
  }

  async getInvitation(token: string): Promise<CustomerInvitation | undefined> {
    const [invitation] = await db.select().from(customerInvitations).where(eq(customerInvitations.token, token));
    return invitation;
  }

  async getInvitationsByTrainer(trainerId: string): Promise<CustomerInvitation[]> {
    return await db
      .select()
      .from(customerInvitations)
      .where(eq(customerInvitations.trainerId, trainerId))
      .orderBy(desc(customerInvitations.createdAt));
  }

  async markInvitationAsUsed(token: string): Promise<void> {
    await db
      .update(customerInvitations)
      .set({ usedAt: new Date() })
      .where(eq(customerInvitations.token, token));
  }

  async deleteExpiredInvitations(): Promise<number> {
    try {
      const result = await db
        .delete(customerInvitations)
        .where(lte(customerInvitations.expiresAt, new Date()));
      return Number(result.rowCount) || 0;
    } catch (error) {
      console.error('Error deleting expired invitations:', error);
      return 0;
    }
  }

  // Trainer meal plans
  async createTrainerMealPlan(mealPlan: InsertTrainerMealPlan): Promise<TrainerMealPlan> {
    const [created] = await db.insert(trainerMealPlans).values(mealPlan).returning();
    return created;
  }

  async getTrainerMealPlan(id: string): Promise<TrainerMealPlan | undefined> {
    const [plan] = await db.select().from(trainerMealPlans).where(eq(trainerMealPlans.id, id));
    return plan;
  }

  async getTrainerMealPlans(trainerId: string): Promise<TrainerMealPlanWithAssignments[]> {
    // Get all meal plans for the trainer
    const plans = await db
      .select()
      .from(trainerMealPlans)
      .where(eq(trainerMealPlans.trainerId, trainerId))
      .orderBy(desc(trainerMealPlans.createdAt));

    // Get assignments for each plan
    const plansWithAssignments = await Promise.all(
      plans.map(async (plan) => {
        const assignments = await db
          .select({
            customerId: mealPlanAssignments.customerId,
            customerEmail: users.email,
            assignedAt: mealPlanAssignments.assignedAt,
          })
          .from(mealPlanAssignments)
          .leftJoin(users, eq(users.id, mealPlanAssignments.customerId))
          .where(eq(mealPlanAssignments.mealPlanId, plan.id));

        return {
          ...plan,
          assignments: assignments.map(a => ({
            customerId: a.customerId,
            customerEmail: a.customerEmail || '',
            assignedAt: a.assignedAt || new Date(),
          })),
          assignmentCount: assignments.length,
        };
      })
    );

    return plansWithAssignments;
  }

  async updateTrainerMealPlan(id: string, updates: Partial<InsertTrainerMealPlan>): Promise<TrainerMealPlan | undefined> {
    const [updated] = await db
      .update(trainerMealPlans)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(trainerMealPlans.id, id))
      .returning();
    return updated;
  }

  async deleteTrainerMealPlan(id: string): Promise<boolean> {
    const result = await db.delete(trainerMealPlans).where(eq(trainerMealPlans.id, id));
    return Number(result.rowCount) > 0;
  }

  // Meal plan assignments
  async assignMealPlanToCustomer(mealPlanId: string, customerId: string, assignedBy: string, notes?: string): Promise<MealPlanAssignment> {
    const [assignment] = await db
      .insert(mealPlanAssignments)
      .values({
        mealPlanId,
        customerId,
        assignedBy,
        notes,
      })
      .returning();
    return assignment;
  }

  async unassignMealPlanFromCustomer(mealPlanId: string, customerId: string): Promise<boolean> {
    const result = await db
      .delete(mealPlanAssignments)
      .where(
        and(
          eq(mealPlanAssignments.mealPlanId, mealPlanId),
          eq(mealPlanAssignments.customerId, customerId)
        )
      );
    return Number(result.rowCount) > 0;
  }

  async getMealPlanAssignments(mealPlanId: string): Promise<MealPlanAssignment[]> {
    return await db
      .select()
      .from(mealPlanAssignments)
      .where(eq(mealPlanAssignments.mealPlanId, mealPlanId));
  }

  // Customer management functions
  async getTrainerCustomers(trainerId: string): Promise<{id: string; email: string; firstAssignedAt: string}[]> {
    // Optimized version: Single query with UNION to get all customers at once
    const customersQuery = sql`
      SELECT DISTINCT
        u.id,
        u.email,
        MIN(earliest_assignment) as first_assigned_at
      FROM users u
      INNER JOIN (
        SELECT 
          customer_id,
          assigned_at as earliest_assignment
        FROM personalized_meal_plans 
        WHERE trainer_id = ${trainerId}
        
        UNION ALL
        
        SELECT 
          customer_id,
          assigned_at as earliest_assignment
        FROM personalized_recipes 
        WHERE trainer_id = ${trainerId}
      ) assignments ON u.id = assignments.customer_id
      WHERE u.role = 'customer'
      GROUP BY u.id, u.email
      ORDER BY first_assigned_at DESC
    `;
    
    const results = await db.execute(customersQuery);
    
    return results.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      firstAssignedAt: row.first_assigned_at?.toISOString() || new Date().toISOString(),
    }));
  }

  async getCustomerMealPlans(trainerId: string, customerId: string): Promise<any[]> {
    return await db.select()
      .from(personalizedMealPlans)
      .where(
        and(
          eq(personalizedMealPlans.trainerId, trainerId),
          eq(personalizedMealPlans.customerId, customerId)
        )
      );
  }

  async removeMealPlanAssignment(trainerId: string, assignmentId: string): Promise<boolean> {
    try {
      const result = await db.delete(personalizedMealPlans)
        .where(
          and(
            eq(personalizedMealPlans.id, assignmentId),
            eq(personalizedMealPlans.trainerId, trainerId)
          )
        );
      return true;
    } catch (error) {
      console.error('Error removing meal plan assignment:', error);
      return false;
    }
  }

  // Transaction support
  async transaction<T>(action: (trx: any) => Promise<T>): Promise<T> {
    return db.transaction(action);
  }
}

export const storage: IStorage = new DatabaseStorage();
