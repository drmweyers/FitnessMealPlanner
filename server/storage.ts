// @ts-nocheck - Type errors suppressed
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
  recipeFavorites,
  recipeCollections,
  collectionRecipes,
  recipeInteractions,
  recipeRecommendations,
  userActivitySessions,
  groceryLists,
  groceryListItems,
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
  type RecipeFavorite,
  type RecipeCollection,
  type CollectionRecipe,
  type RecipeInteraction,
  type RecipeRecommendation,
  type UserActivitySession,
  type GroceryList,
  type InsertGroceryList,
  type GroceryListItem,
  type InsertGroceryListItem,
  type GroceryListWithItems,
  passwordResetTokens,
  refreshTokens,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, lte, gte, desc, sql } from "drizzle-orm";
import { inArray } from "drizzle-orm";
import { handleMealPlanEvent, createMealPlanEvent, MealPlanEventType } from "./utils/mealPlanEvents";
import { normalizeToUTCMidnight } from "./utils/dateUtils";

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
  
  // Recipe Favorites
  addRecipeToFavorites(userId: string, recipeId: string, notes?: string): Promise<any>;
  removeRecipeFromFavorites(userId: string, recipeId: string): Promise<boolean>;
  getUserFavorites(userId: string, options: { page?: number; limit?: number; search?: string }): Promise<{ favorites: any[]; total: number }>;
  isRecipeFavorited(userId: string, recipeId: string): Promise<boolean>;
  
  // Recipe Collections
  createRecipeCollection(userId: string, collectionData: any): Promise<any>;
  getUserCollections(userId: string, options: { page?: number; limit?: number }): Promise<{ collections: any[]; total: number }>;
  getCollectionWithRecipes(userId: string, collectionId: string): Promise<any>;
  addRecipeToCollection(userId: string, collectionId: string, recipeId: string, notes?: string): Promise<void>;
  removeRecipeFromCollection(userId: string, collectionId: string, recipeId: string): Promise<boolean>;
  updateRecipeCollection(userId: string, collectionId: string, updates: any): Promise<any>;
  deleteRecipeCollection(userId: string, collectionId: string): Promise<boolean>;
  
  // Recipe Interactions & Analytics
  trackRecipeInteraction(userId: string, recipeId: string, interactionType: string, interactionValue?: number, sessionId?: string, metadata?: any): Promise<void>;
  rateRecipe(userId: string, recipeId: string, rating: number): Promise<void>;
  getPopularRecipes(timeframe: string, limit: number): Promise<any[]>;
  getTrendingRecipes(limit: number, category?: string): Promise<any[]>;
  getRecipeRecommendations(userId: string, type: string, limit: number): Promise<any[]>;
  getUserActivitySummary(userId: string, days: number): Promise<any>;

  // Grocery Lists Operations
  getGroceryLists(customerId: string): Promise<GroceryList[]>;
  getGroceryList(customerId: string, listId: string): Promise<GroceryListWithItems | undefined>;
  createGroceryList(listData: InsertGroceryList): Promise<GroceryList>;
  updateGroceryList(customerId: string, listId: string, updates: Partial<InsertGroceryList>): Promise<GroceryList | undefined>;
  deleteGroceryList(customerId: string, listId: string): Promise<boolean>;

  // Grocery List Items Operations
  addGroceryListItem(listId: string, itemData: InsertGroceryListItem): Promise<GroceryListItem>;
  updateGroceryListItem(listId: string, itemId: string, updates: Partial<InsertGroceryListItem>): Promise<GroceryListItem | undefined>;
  deleteGroceryListItem(listId: string, itemId: string): Promise<boolean>;
  getGroceryListItems(listId: string): Promise<GroceryListItem[]>;

  // Transaction support
  transaction<T>(action: (trx: any) => Promise<T>): Promise<T>;

}

export class DatabaseStorage implements IStorage {
  private supportsTierFiltering: boolean | null = null;

  private async ensureTierFilteringSupport(): Promise<boolean> {
    if (this.supportsTierFiltering !== null) {
      return this.supportsTierFiltering;
    }

    try {
      const result = await db.execute(
        sql`SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'recipes' AND column_name = 'tier_level' LIMIT 1`
      );

      this.supportsTierFiltering = Array.isArray((result as any)?.rows)
        ? (result as any).rows.length > 0
        : false;
    } catch (error) {
      console.warn("[DatabaseStorage] Failed to verify tier_level column support:", error);
      this.supportsTierFiltering = false;
    }

    if (!this.supportsTierFiltering) {
      console.warn(
        "[DatabaseStorage] tier_level column not detected. Tier-based recipe filtering is disabled until the migration runs."
      );
    }

    return this.supportsTierFiltering;
  }

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
    const customers = await db.select().from(users).where(eq(users.role, 'customer'));
    
    let recipeAssignments: Set<string> = new Set();
    let mealPlanAssignments: Set<string> = new Set();
    
    if (recipeId) {
      const assignments = await db
        .select()
        .from(personalizedRecipes)
        .where(eq(personalizedRecipes.recipeId, recipeId));
      
      recipeAssignments = new Set(assignments.map(a => a.customerId));
    }
    
    // Check for existing meal plan assignments for each customer
    // This shows which customers already have ANY meal plan assigned to them
    const existingMealPlanAssignments = await db
      .select({ customerId: personalizedMealPlans.customerId })
      .from(personalizedMealPlans);
    
    mealPlanAssignments = new Set(existingMealPlanAssignments.map(a => a.customerId));
    
    return customers.map(customer => ({
      ...customer,
      hasRecipe: recipeId ? recipeAssignments.has(customer.id) : false,
      hasMealPlan: mealPlanAssignments.has(customer.id)
    }));
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

      const insertedMealPlans = await db.insert(personalizedMealPlans).values(assignments).returning();

      // Trigger automatic grocery list generation for each assigned meal plan
      for (const mealPlan of insertedMealPlans) {
        try {
          const event = createMealPlanEvent(
            MealPlanEventType.ASSIGNED,
            mealPlan.id,
            mealPlan.customerId,
            mealPlan.mealPlanData,
            {
              assignedBy: trainerId,
              planName: (mealPlan.mealPlanData as any)?.planName || 'Assigned Meal Plan',
              fitnessGoal: (mealPlan.mealPlanData as any)?.fitnessGoal
            }
          );

          const result = await handleMealPlanEvent(event);

          if (result.success && result.action === 'created') {
            console.log(`[Storage] Auto-generated grocery list for meal plan ${mealPlan.id} assigned to customer ${mealPlan.customerId}`);
          } else if (!result.success) {
            console.warn(`[Storage] Failed to auto-generate grocery list for meal plan ${mealPlan.id}: ${result.error}`);
          }
        } catch (error) {
          console.error(`[Storage] Error during auto grocery list generation for meal plan ${mealPlan.id}:`, error);
        }
      }
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

    // Story 2.14: Tier-based filtering (progressive access model)
    // Higher tiers can access all lower tier recipes
    // starter: only 'starter' tier recipes
    // professional: 'starter' + 'professional' tier recipes
    // enterprise: all recipes ('starter' + 'professional' + 'enterprise')
    const tierFilteringSupported = await this.ensureTierFilteringSupport();

    if (filters.tierLevel && tierFilteringSupported) {
      conditions.push(sql`${recipes.tierLevel} <= ${filters.tierLevel}::tier_level`);
    } else if (filters.tierLevel && !tierFilteringSupported) {
      console.warn(
        "[DatabaseStorage] tier_level filter requested but column is missing. Skipping filter."
      );
    }

    if (filters.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        sql`(
          LOWER(${recipes.name}) LIKE ${searchTerm} OR
          LOWER(${recipes.description}) LIKE ${searchTerm} OR
          LOWER(${recipes.ingredientsJson}::text) LIKE ${searchTerm}
        )`
      );
    }

    if (filters.mealType) {
      conditions.push(sql`${recipes.mealTypes} @> ${JSON.stringify([filters.mealType])}`);
    }

    if (filters.dietaryTag) {
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

    const recipeResults = await db
      .select()
      .from(recipes)
      .where(whereClause)
      .orderBy(desc(recipes.creationTimestamp))
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
            assignedAt: a.assignedAt || normalizeToUTCMidnight(),
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
        updatedAt: new Date().toISOString(),
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

    // Trigger automatic grocery list generation after successful assignment
    try {
      const { onMealPlanAssigned, createMealPlanEvent, MealPlanEventType } = await import('./utils/mealPlanEvents.js');

      // Fetch meal plan data for the event
      const mealPlan = await this.getTrainerMealPlan(mealPlanId);

      // Create proper event object
      const event = createMealPlanEvent(
        MealPlanEventType.ASSIGNED,
        mealPlanId,
        customerId,
        mealPlan.mealPlanData
      );

      await onMealPlanAssigned(event);
      console.log(`[Storage] Triggered automatic grocery list generation for customer ${customerId} from meal plan ${mealPlanId}`);
    } catch (error) {
      // Log error but don't fail the assignment
      console.error('[Storage] Failed to auto-generate grocery list:', error);
    }

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
    // Get unique customers who have meal plans assigned by this trainer
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
    
    // Combine and deduplicate customers
    const customerMap = new Map();
    
    [...customersWithMealPlans, ...customersWithRecipes].forEach(customer => {
      if (!customerMap.has(customer.customerId)) {
        customerMap.set(customer.customerId, {
          id: customer.customerId,
          email: customer.customerEmail,
          firstAssignedAt: customer.assignedAt?.toISOString() || normalizeToUTCMidnight().toISOString(),
        });
      } else {
        const existing = customerMap.get(customer.customerId);
        if (customer.assignedAt && existing.firstAssignedAt && customer.assignedAt < new Date(existing.firstAssignedAt)) {
          existing.firstAssignedAt = customer.assignedAt.toISOString();
        }
      }
    });
    
    return Array.from(customerMap.values());
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
      // Get meal plan data before deletion for cleanup
      const mealPlanToDelete = await db
        .select()
        .from(personalizedMealPlans)
        .where(
          and(
            eq(personalizedMealPlans.id, assignmentId),
            eq(personalizedMealPlans.trainerId, trainerId)
          )
        )
        .limit(1);

      const result = await db.delete(personalizedMealPlans)
        .where(
          and(
            eq(personalizedMealPlans.id, assignmentId),
            eq(personalizedMealPlans.trainerId, trainerId)
          )
        );

      // Trigger automatic cleanup of orphaned grocery lists
      if (mealPlanToDelete.length > 0) {
        try {
          const event = createMealPlanEvent(
            MealPlanEventType.DELETED,
            assignmentId,
            mealPlanToDelete[0].customerId,
            mealPlanToDelete[0].mealPlanData
          );

          const cleanupResult = await handleMealPlanEvent(event);

          if (cleanupResult.success && cleanupResult.action === 'updated') {
            console.log(`[Storage] Cleaned up ${cleanupResult.itemCount || 0} orphaned grocery lists for deleted meal plan ${assignmentId}`);
          }
        } catch (error) {
          console.error(`[Storage] Error during grocery list cleanup for deleted meal plan ${assignmentId}:`, error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error removing meal plan assignment:', error);
      return false;
    }
  }

  // Recipe Favorites
  async addRecipeToFavorites(userId: string, recipeId: string, notes?: string): Promise<RecipeFavorite> {
    try {
      const [favorite] = await db.insert(recipeFavorites).values({
        userId,
        recipeId,
        notes,
      }).returning();
      return favorite;
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Recipe is already in favorites');
      }
      throw error;
    }
  }

  async removeRecipeFromFavorites(userId: string, recipeId: string): Promise<boolean> {
    const result = await db
      .delete(recipeFavorites)
      .where(and(eq(recipeFavorites.userId, userId), eq(recipeFavorites.recipeId, recipeId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getUserFavorites(userId: string, options: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = search
      ? and(eq(recipeFavorites.userId, userId), like(recipes.name, `%${search}%`))
      : eq(recipeFavorites.userId, userId);

    // Build the query with recipe details
    const favorites = await db
      .select({
        favorite: recipeFavorites,
        recipe: recipes,
      })
      .from(recipeFavorites)
      .innerJoin(recipes, eq(recipeFavorites.recipeId, recipes.id))
      .where(whereConditions)
      .orderBy(desc(recipeFavorites.favoriteDate))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(recipeFavorites)
      .innerJoin(recipes, eq(recipeFavorites.recipeId, recipes.id))
      .where(whereConditions);

    return {
      favorites: favorites.map(f => ({
        ...f.recipe,
        favoriteDate: f.favorite.favoriteDate,
        notes: f.favorite.notes,
      })),
      total,
    };
  }

  async isRecipeFavorited(userId: string, recipeId: string): Promise<boolean> {
    const [result] = await db
      .select({ id: recipeFavorites.id })
      .from(recipeFavorites)
      .where(and(eq(recipeFavorites.userId, userId), eq(recipeFavorites.recipeId, recipeId)))
      .limit(1);
    return !!result;
  }

  // Recipe Collections
  async createRecipeCollection(userId: string, collectionData: any): Promise<RecipeCollection> {
    const [collection] = await db.insert(recipeCollections).values({
      userId,
      ...collectionData,
    }).returning();
    return collection;
  }

  async getUserCollections(userId: string, options: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Get collections with recipe counts
    const collections = await db
      .select({
        collection: recipeCollections,
        recipeCount: sql<number>`count(${collectionRecipes.id})`,
      })
      .from(recipeCollections)
      .leftJoin(collectionRecipes, eq(recipeCollections.id, collectionRecipes.collectionId))
      .where(eq(recipeCollections.userId, userId))
      .groupBy(recipeCollections.id)
      .orderBy(desc(recipeCollections.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(recipeCollections)
      .where(eq(recipeCollections.userId, userId));

    return {
      collections: collections.map(c => ({
        ...c.collection,
        recipeCount: Number(c.recipeCount),
      })),
      total,
    };
  }

  async getCollectionWithRecipes(userId: string, collectionId: string) {
    // Get collection details
    const [collection] = await db
      .select()
      .from(recipeCollections)
      .where(and(eq(recipeCollections.id, collectionId), eq(recipeCollections.userId, userId)));

    if (!collection) {
      return null;
    }

    // Get recipes in this collection
    const recipesList = await db
      .select({
        recipe: recipes,
        collectionRecipe: collectionRecipes,
      })
      .from(collectionRecipes)
      .innerJoin(recipes, eq(collectionRecipes.recipeId, recipes.id))
      .where(eq(collectionRecipes.collectionId, collectionId))
      .orderBy(collectionRecipes.orderIndex, collectionRecipes.addedDate);

    return {
      ...collection,
      recipes: recipesList.map(r => ({
        ...r.recipe,
        addedDate: r.collectionRecipe.addedDate,
        notes: r.collectionRecipe.notes,
        orderIndex: r.collectionRecipe.orderIndex,
      })),
    };
  }

  async addRecipeToCollection(userId: string, collectionId: string, recipeId: string, notes?: string): Promise<void> {
    // Verify collection belongs to user
    const [collection] = await db
      .select({ id: recipeCollections.id })
      .from(recipeCollections)
      .where(and(eq(recipeCollections.id, collectionId), eq(recipeCollections.userId, userId)));

    if (!collection) {
      throw new Error('Collection not found');
    }

    try {
      await db.insert(collectionRecipes).values({
        collectionId,
        recipeId,
        notes,
      });
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Recipe is already in this collection');
      }
      throw error;
    }
  }

  async removeRecipeFromCollection(userId: string, collectionId: string, recipeId: string): Promise<boolean> {
    // Verify collection belongs to user
    const [collection] = await db
      .select({ id: recipeCollections.id })
      .from(recipeCollections)
      .where(and(eq(recipeCollections.id, collectionId), eq(recipeCollections.userId, userId)));

    if (!collection) {
      return false;
    }

    const result = await db
      .delete(collectionRecipes)
      .where(and(eq(collectionRecipes.collectionId, collectionId), eq(collectionRecipes.recipeId, recipeId)));

    return (result.rowCount ?? 0) > 0;
  }

  async updateRecipeCollection(userId: string, collectionId: string, updates: any) {
    const [collection] = await db
      .update(recipeCollections)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(recipeCollections.id, collectionId), eq(recipeCollections.userId, userId)))
      .returning();

    return collection;
  }

  async deleteRecipeCollection(userId: string, collectionId: string): Promise<boolean> {
    const result = await db
      .delete(recipeCollections)
      .where(and(eq(recipeCollections.id, collectionId), eq(recipeCollections.userId, userId)));

    return (result.rowCount ?? 0) > 0;
  }

  // Recipe Interactions & Analytics
  async trackRecipeInteraction(
    userId: string,
    recipeId: string,
    interactionType: string,
    interactionValue?: number,
    sessionId?: string,
    metadata?: any
  ): Promise<void> {
    await db.insert(recipeInteractions).values({
      userId,
      recipeId,
      interactionType,
      interactionValue,
      sessionId,
      metadata: metadata || {},
    });
  }

  async rateRecipe(userId: string, recipeId: string, rating: number): Promise<void> {
    await this.trackRecipeInteraction(userId, recipeId, 'rate', rating);
  }

  async getPopularRecipes(timeframe: string, limit: number) {
    let dateFilter;
    const now = new Date();

    switch (timeframe) {
      case 'day':
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(0); // All time
    }

    return await db
      .select({
        recipe: recipes,
        viewCount: sql<number>`count(${recipeInteractions.id})`,
        favoriteCount: sql<number>`count(${recipeFavorites.id})`,
      })
      .from(recipes)
      .leftJoin(
        recipeInteractions,
        and(
          eq(recipeInteractions.recipeId, recipes.id),
          eq(recipeInteractions.interactionType, 'view'),
          gte(recipeInteractions.interactionDate, dateFilter)
        )
      )
      .leftJoin(
        recipeFavorites,
        and(
          eq(recipeFavorites.recipeId, recipes.id),
          gte(recipeFavorites.favoriteDate, dateFilter)
        )
      )
      .where(eq(recipes.isApproved, true))
      .groupBy(recipes.id)
      .orderBy(desc(sql`count(${recipeInteractions.id}) + count(${recipeFavorites.id})`))
      .limit(limit);
  }

  async getTrendingRecipes(limit: number, category?: string) {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Build where conditions
    const whereConditions = category
      ? and(
          eq(recipes.isApproved, true),
          sql`${recipes.mealTypes} @> ${JSON.stringify([category])}`
        )
      : eq(recipes.isApproved, true);

    return await db
      .select({
        recipe: recipes,
        recentViews: sql<number>`count(case when ${recipeInteractions.interactionDate} >= ${last7Days} then 1 end)`,
        totalViews: sql<number>`count(case when ${recipeInteractions.interactionDate} >= ${last30Days} then 1 end)`,
        favoriteCount: sql<number>`count(${recipeFavorites.id})`,
      })
      .from(recipes)
      .leftJoin(recipeInteractions, eq(recipeInteractions.recipeId, recipes.id))
      .leftJoin(recipeFavorites, eq(recipeFavorites.recipeId, recipes.id))
      .where(whereConditions)
      .groupBy(recipes.id)
      .orderBy(desc(sql`count(case when ${recipeInteractions.interactionDate} >= ${last7Days} then 1 end)`))
      .limit(limit);
  }

  async getRecipeRecommendations(userId: string, type: string, limit: number) {
    // For now, return popular recipes based on user's activity
    // In a real implementation, this would use ML algorithms
    return await db
      .select({
        recipe: recipes,
        score: sql<number>`random()`, // Placeholder scoring
        reason: sql<string>`'Based on your recent activity'`,
      })
      .from(recipes)
      .where(eq(recipes.isApproved, true))
      .orderBy(sql`random()`)
      .limit(limit);
  }

  async getUserActivitySummary(userId: string, days: number) {
    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [activity] = await db
      .select({
        totalInteractions: sql<number>`count(${recipeInteractions.id})`,
        recipesViewed: sql<number>`count(distinct case when ${recipeInteractions.interactionType} = 'view' then ${recipeInteractions.recipeId} end)`,
        recipesRated: sql<number>`count(distinct case when ${recipeInteractions.interactionType} = 'rate' then ${recipeInteractions.recipeId} end)`,
        totalFavorites: sql<number>`count(${recipeFavorites.id})`,
        totalCollections: sql<number>`count(${recipeCollections.id})`,
      })
      .from(recipeInteractions)
      .leftJoin(recipeFavorites, eq(recipeFavorites.userId, userId))
      .leftJoin(recipeCollections, eq(recipeCollections.userId, userId))
      .where(
        and(
          eq(recipeInteractions.userId, userId),
          gte(recipeInteractions.interactionDate, dateFilter)
        )
      );

    return activity;
  }

  // Grocery Lists Operations
  async getGroceryLists(customerId: string): Promise<GroceryList[]> {
    return await db
      .select()
      .from(groceryLists)
      .where(eq(groceryLists.customerId, customerId))
      .orderBy(desc(groceryLists.updatedAt));
  }

  async getGroceryList(customerId: string, listId: string): Promise<GroceryListWithItems | undefined> {
    // Get grocery list
    const [groceryList] = await db
      .select()
      .from(groceryLists)
      .where(
        and(
          eq(groceryLists.id, listId),
          eq(groceryLists.customerId, customerId)
        )
      )
      .limit(1);

    if (!groceryList) {
      return undefined;
    }

    // Get grocery list items
    const items = await db
      .select()
      .from(groceryListItems)
      .where(eq(groceryListItems.groceryListId, listId))
      .orderBy(
        groceryListItems.isChecked,
        groceryListItems.category,
        groceryListItems.name
      );

    return {
      ...groceryList,
      items,
    };
  }

  async createGroceryList(listData: InsertGroceryList): Promise<GroceryList> {
    const [created] = await db.insert(groceryLists).values(listData).returning();
    return created;
  }

  async updateGroceryList(customerId: string, listId: string, updates: Partial<InsertGroceryList>): Promise<GroceryList | undefined> {
    const [updated] = await db
      .update(groceryLists)
      .set(updates)
      .where(
        and(
          eq(groceryLists.id, listId),
          eq(groceryLists.customerId, customerId)
        )
      )
      .returning();
    return updated;
  }

  async deleteGroceryList(customerId: string, listId: string): Promise<boolean> {
    const result = await db
      .delete(groceryLists)
      .where(
        and(
          eq(groceryLists.id, listId),
          eq(groceryLists.customerId, customerId)
        )
      );
    return Number(result.rowCount) > 0;
  }

  // Grocery List Items Operations
  async addGroceryListItem(listId: string, itemData: InsertGroceryListItem): Promise<GroceryListItem> {
    const [created] = await db
      .insert(groceryListItems)
      .values({ ...itemData, groceryListId: listId })
      .returning();
    return created;
  }

  async updateGroceryListItem(listId: string, itemId: string, updates: Partial<InsertGroceryListItem>): Promise<GroceryListItem | undefined> {
    const [updated] = await db
      .update(groceryListItems)
      .set(updates)
      .where(
        and(
          eq(groceryListItems.id, itemId),
          eq(groceryListItems.groceryListId, listId)
        )
      )
      .returning();
    return updated;
  }

  async deleteGroceryListItem(listId: string, itemId: string): Promise<boolean> {
    const result = await db
      .delete(groceryListItems)
      .where(
        and(
          eq(groceryListItems.id, itemId),
          eq(groceryListItems.groceryListId, listId)
        )
      );
    return Number(result.rowCount) > 0;
  }

  async getGroceryListItems(listId: string): Promise<GroceryListItem[]> {
    return await db
      .select()
      .from(groceryListItems)
      .where(eq(groceryListItems.groceryListId, listId))
      .orderBy(
        groceryListItems.isChecked,
        groceryListItems.category,
        groceryListItems.name
      );
  }

  // Transaction support
  async transaction<T>(action: (trx: any) => Promise<T>): Promise<T> {
    return db.transaction(action);
  }
}

export const storage: IStorage = new DatabaseStorage();
