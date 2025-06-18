import {
  users,
  recipes,
  trainers,
  clients,
  mealPlans,
  type User,
  type UpsertUser,
  type Recipe,
  type InsertRecipe,
  type UpdateRecipe,
  type RecipeFilter,
  type Trainer,
  type InsertTrainer,
  type Client,
  type InsertClient,
  type StoredMealPlan,
  type InsertMealPlan,
  type UserRole,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, lte, gte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: UserRole): Promise<User | undefined>;
  
  // Trainer operations
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  getTrainer(id: string): Promise<Trainer | undefined>;
  getTrainerByUserId(userId: string): Promise<Trainer | undefined>;
  getTrainerClients(trainerId: string): Promise<Client[]>;
  
  // Client operations
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: string): Promise<Client | undefined>;
  getClientByUserId(userId: string): Promise<Client | undefined>;
  assignClientToTrainer(clientId: string, trainerId: string): Promise<Client | undefined>;
  
  // Meal plan operations
  createMealPlan(mealPlan: InsertMealPlan): Promise<StoredMealPlan>;
  getMealPlan(id: string): Promise<StoredMealPlan | undefined>;
  getClientMealPlans(clientId: string): Promise<StoredMealPlan[]>;
  getTrainerMealPlans(trainerId: string): Promise<StoredMealPlan[]>;
  updateMealPlan(id: string, updates: Partial<InsertMealPlan>): Promise<StoredMealPlan | undefined>;
  deleteMealPlan(id: string): Promise<boolean>;
  
  // Recipe operations
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe | undefined>;
  deleteRecipe(id: string): Promise<boolean>;
  searchRecipes(filters: RecipeFilter): Promise<{ recipes: Recipe[]; total: number }>;
  approveRecipe(id: string): Promise<Recipe | undefined>;
  getRecipeStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    avgRating: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Trainer operations
  async createTrainer(trainerData: InsertTrainer): Promise<Trainer> {
    const [trainer] = await db
      .insert(trainers)
      .values(trainerData)
      .returning();
    return trainer;
  }

  async getTrainer(id: string): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.id, id));
    return trainer;
  }

  async getTrainerByUserId(userId: string): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.userId, userId));
    return trainer;
  }

  async getTrainerClients(trainerId: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.trainerId, trainerId));
  }

  // Client operations
  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(clientData)
      .returning();
    return client;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client;
  }

  async assignClientToTrainer(clientId: string, trainerId: string): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ trainerId })
      .where(eq(clients.id, clientId))
      .returning();
    return client;
  }

  // Meal plan operations
  async createMealPlan(mealPlanData: InsertMealPlan): Promise<StoredMealPlan> {
    const [mealPlan] = await db
      .insert(mealPlans)
      .values(mealPlanData)
      .returning();
    return mealPlan;
  }

  async getMealPlan(id: string): Promise<StoredMealPlan | undefined> {
    const [mealPlan] = await db.select().from(mealPlans).where(eq(mealPlans.id, id));
    return mealPlan;
  }

  async getClientMealPlans(clientId: string): Promise<StoredMealPlan[]> {
    return await db.select().from(mealPlans).where(eq(mealPlans.clientId, clientId));
  }

  async getTrainerMealPlans(trainerId: string): Promise<StoredMealPlan[]> {
    return await db.select().from(mealPlans).where(eq(mealPlans.trainerId, trainerId));
  }

  async updateMealPlan(id: string, updates: Partial<InsertMealPlan>): Promise<StoredMealPlan | undefined> {
    const [mealPlan] = await db
      .update(mealPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mealPlans.id, id))
      .returning();
    return mealPlan;
  }

  async deleteMealPlan(id: string): Promise<boolean> {
    const result = await db.delete(mealPlans).where(eq(mealPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Recipe operations
  async createRecipe(recipeData: InsertRecipe): Promise<Recipe> {
    const [recipe] = await db.insert(recipes).values(recipeData).returning();
    return recipe;
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    // Validate UUID format to prevent database errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return undefined;
    }
    
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe | undefined> {
    const [recipe] = await db
      .update(recipes)
      .set({ ...updates, lastUpdatedTimestamp: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    return recipe;
  }

  async deleteRecipe(id: string): Promise<boolean> {
    const result = await db.delete(recipes).where(eq(recipes.id, id));
    return result.rowCount > 0;
  }

  async approveRecipe(id: string): Promise<Recipe | undefined> {
    return this.updateRecipe(id, { isApproved: true });
  }

  async searchRecipes(filters: RecipeFilter): Promise<{ recipes: Recipe[]; total: number }> {
    const conditions = [];

    // Apply filters
    if (filters.approved !== undefined) {
      conditions.push(eq(recipes.isApproved, filters.approved));
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
    avgRating: number;
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
      avgRating: 4.6, // Static average rating
    };
  }
}

export const storage = new DatabaseStorage();
