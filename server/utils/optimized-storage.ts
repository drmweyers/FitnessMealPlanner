/**
 * Optimized Storage Wrapper
 * 
 * This wrapper adds performance optimizations like caching, query batching,
 * and database connection pooling to the existing storage layer.
 */

import { IStorage, DatabaseStorage } from '../storage';
import { queryOptimizer } from './query-optimizer';
import { RecipeFilter, Recipe } from '@shared/schema';

export class OptimizedStorage implements IStorage {
  private baseStorage: DatabaseStorage;

  constructor() {
    this.baseStorage = new DatabaseStorage();
  }

  // Optimized recipe search with caching
  async searchRecipes(filters: RecipeFilter): Promise<{ recipes: Recipe[]; total: number }> {
    const cacheKey = queryOptimizer.generateRecipeSearchKey(filters);
    
    return await queryOptimizer.optimizeRecipeSearch(
      cacheKey,
      () => this.baseStorage.searchRecipes(filters),
      5 * 60 * 1000 // 5 minute cache
    );
  }

  // Optimized recipe fetch with caching
  async getRecipe(id: string): Promise<Recipe | undefined> {
    const cacheKey = `recipe:${id}`;
    
    return await queryOptimizer.optimizeRecipeSearch(
      cacheKey,
      () => this.baseStorage.getRecipe(id),
      10 * 60 * 1000 // 10 minute cache for individual recipes
    );
  }

  // Batch recipe fetching
  async getRecipesBatch(ids: string[]): Promise<(Recipe | undefined)[]> {
    const batchPromises = ids.map(id => 
      queryOptimizer.batchQuery(() => this.getRecipe(id))
    );
    
    return Promise.all(batchPromises);
  }

  // Optimized personalized recipes with caching
  async getPersonalizedRecipes(customerId: string): Promise<Recipe[]> {
    const cacheKey = `personalized_recipes:${customerId}`;
    
    return await queryOptimizer.optimizeRecipeSearch(
      cacheKey,
      () => this.baseStorage.getPersonalizedRecipes(customerId),
      3 * 60 * 1000 // 3 minute cache
    );
  }

  // Optimized meal plans with caching
  async getPersonalizedMealPlans(customerId: string): Promise<any[]> {
    const cacheKey = `personalized_meal_plans:${customerId}`;
    
    return await queryOptimizer.optimizeRecipeSearch(
      cacheKey,
      () => this.baseStorage.getPersonalizedMealPlans(customerId),
      3 * 60 * 1000 // 3 minute cache
    );
  }

  // Cache invalidation helpers
  invalidateRecipeCache(recipeId?: string): void {
    if (recipeId) {
      queryOptimizer.clearCache();
    } else {
      // Clear all recipe-related cache
      queryOptimizer.clearCache();
    }
  }

  invalidateUserCache(userId?: string): void {
    if (userId) {
      queryOptimizer.clearCache();
    } else {
      queryOptimizer.clearCache();
    }
  }

  // Delegate all other methods to base storage
  async getUser(id: string) {
    return this.baseStorage.getUser(id);
  }

  async getUserById(id: string) {
    return this.baseStorage.getUserById(id);
  }

  async getUserByEmail(email: string) {
    return this.baseStorage.getUserByEmail(email);
  }

  async getUserByGoogleId(googleId: string) {
    return this.baseStorage.getUserByGoogleId(googleId);
  }

  async createUser(user: any) {
    const result = await this.baseStorage.createUser(user);
    this.invalidateUserCache();
    return result;
  }

  async createGoogleUser(user: any) {
    const result = await this.baseStorage.createGoogleUser(user);
    this.invalidateUserCache();
    return result;
  }

  async linkGoogleAccount(userId: string, googleId: string) {
    const result = await this.baseStorage.linkGoogleAccount(userId, googleId);
    this.invalidateUserCache(userId);
    return result;
  }

  async updateUserPassword(userId: string, password: string) {
    const result = await this.baseStorage.updateUserPassword(userId, password);
    this.invalidateUserCache(userId);
    return result;
  }

  async updateUserEmail(userId: string, email: string) {
    const result = await this.baseStorage.updateUserEmail(userId, email);
    this.invalidateUserCache(userId);
    return result;
  }

  async getCustomers(recipeId?: string, mealPlanId?: string) {
    return this.baseStorage.getCustomers(recipeId, mealPlanId);
  }

  // Password Reset
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    return this.baseStorage.createPasswordResetToken(userId, token, expiresAt);
  }

  async getPasswordResetToken(token: string) {
    return this.baseStorage.getPasswordResetToken(token);
  }

  async deletePasswordResetToken(token: string) {
    return this.baseStorage.deletePasswordResetToken(token);
  }

  // Refresh Token Operations
  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return this.baseStorage.createRefreshToken(userId, token, expiresAt);
  }

  async getRefreshToken(token: string) {
    return this.baseStorage.getRefreshToken(token);
  }

  async deleteRefreshToken(token: string) {
    return this.baseStorage.deleteRefreshToken(token);
  }

  // Customer Invitation Operations
  async createInvitation(invitation: any) {
    return this.baseStorage.createInvitation(invitation);
  }

  async getInvitation(token: string) {
    return this.baseStorage.getInvitation(token);
  }

  async getInvitationsByTrainer(trainerId: string) {
    return this.baseStorage.getInvitationsByTrainer(trainerId);
  }

  async markInvitationAsUsed(token: string) {
    return this.baseStorage.markInvitationAsUsed(token);
  }

  async deleteExpiredInvitations() {
    return this.baseStorage.deleteExpiredInvitations();
  }

  // Recipe CRUD operations
  async createRecipe(recipe: any) {
    const result = await this.baseStorage.createRecipe(recipe);
    this.invalidateRecipeCache();
    return result;
  }

  async updateRecipe(id: string, updates: any) {
    const result = await this.baseStorage.updateRecipe(id, updates);
    this.invalidateRecipeCache(id);
    return result;
  }

  async deleteRecipe(id: string) {
    const result = await this.baseStorage.deleteRecipe(id);
    this.invalidateRecipeCache(id);
    return result;
  }

  async bulkDeleteRecipes(ids: string[]) {
    const result = await this.baseStorage.bulkDeleteRecipes(ids);
    this.invalidateRecipeCache();
    return result;
  }

  async approveRecipe(id: string) {
    const result = await this.baseStorage.approveRecipe(id);
    this.invalidateRecipeCache(id);
    return result;
  }

  async getRecipeStats() {
    return this.baseStorage.getRecipeStats();
  }

  async assignRecipeToCustomers(trainerId: string, recipeId: string, customerIds: string[]) {
    const result = await this.baseStorage.assignRecipeToCustomers(trainerId, recipeId, customerIds);
    // Invalidate personalized recipes cache for affected customers
    customerIds.forEach(customerId => this.invalidateUserCache(customerId));
    return result;
  }

  async assignMealPlanToCustomers(trainerId: string, mealPlanData: any, customerIds: string[]) {
    const result = await this.baseStorage.assignMealPlanToCustomers(trainerId, mealPlanData, customerIds);
    // Invalidate personalized meal plans cache for affected customers
    customerIds.forEach(customerId => this.invalidateUserCache(customerId));
    return result;
  }

  // Trainer meal plans
  async createTrainerMealPlan(mealPlan: any) {
    return this.baseStorage.createTrainerMealPlan(mealPlan);
  }

  async getTrainerMealPlan(id: string) {
    return this.baseStorage.getTrainerMealPlan(id);
  }

  async getTrainerMealPlans(trainerId: string) {
    return this.baseStorage.getTrainerMealPlans(trainerId);
  }

  async updateTrainerMealPlan(id: string, updates: any) {
    return this.baseStorage.updateTrainerMealPlan(id, updates);
  }

  async deleteTrainerMealPlan(id: string) {
    return this.baseStorage.deleteTrainerMealPlan(id);
  }

  // Meal plan assignments
  async assignMealPlanToCustomer(mealPlanId: string, customerId: string, assignedBy: string, notes?: string) {
    return this.baseStorage.assignMealPlanToCustomer(mealPlanId, customerId, assignedBy, notes);
  }

  async unassignMealPlanFromCustomer(mealPlanId: string, customerId: string) {
    return this.baseStorage.unassignMealPlanFromCustomer(mealPlanId, customerId);
  }

  async getMealPlanAssignments(mealPlanId: string) {
    return this.baseStorage.getMealPlanAssignments(mealPlanId);
  }

  // Customer management
  async getTrainerCustomers(trainerId: string) {
    return this.baseStorage.getTrainerCustomers(trainerId);
  }

  async getCustomerMealPlans(trainerId: string, customerId: string) {
    return this.baseStorage.getCustomerMealPlans(trainerId, customerId);
  }

  async removeMealPlanAssignment(trainerId: string, assignmentId: string) {
    return this.baseStorage.removeMealPlanAssignment(trainerId, assignmentId);
  }

  // Transaction support
  async transaction<T>(action: (trx: any) => Promise<T>) {
    return this.baseStorage.transaction(action);
  }
}

// Export singleton instance
export const optimizedStorage = new OptimizedStorage();