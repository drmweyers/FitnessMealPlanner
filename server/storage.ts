import {
  users,
  recipes,
  type User,
  type UpsertUser,
  type Recipe,
  type InsertRecipe,
  type UpdateRecipe,
  type RecipeFilter,
} from "@shared/schema";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private recipes: Map<string, Recipe> = new Map();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);
    const user: User = {
      ...userData,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userData.id, user);
    return user;
  }

  // Recipe operations
  async createRecipe(recipeData: InsertRecipe): Promise<Recipe> {
    const id = crypto.randomUUID();
    const now = new Date();
    const recipe: Recipe = {
      ...recipeData,
      id,
      creationTimestamp: now,
      lastUpdatedTimestamp: now,
    };
    this.recipes.set(id, recipe);
    return recipe;
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    return this.recipes.get(id);
  }

  async updateRecipe(id: string, updates: UpdateRecipe): Promise<Recipe | undefined> {
    const recipe = this.recipes.get(id);
    if (!recipe) return undefined;

    const updatedRecipe: Recipe = {
      ...recipe,
      ...updates,
      lastUpdatedTimestamp: new Date(),
    };
    this.recipes.set(id, updatedRecipe);
    return updatedRecipe;
  }

  async deleteRecipe(id: string): Promise<boolean> {
    return this.recipes.delete(id);
  }

  async approveRecipe(id: string): Promise<Recipe | undefined> {
    return this.updateRecipe(id, { isApproved: true });
  }

  async searchRecipes(filters: RecipeFilter): Promise<{ recipes: Recipe[]; total: number }> {
    let filteredRecipes = Array.from(this.recipes.values());

    // Apply filters
    if (filters.approved !== undefined) {
      filteredRecipes = filteredRecipes.filter(r => r.isApproved === filters.approved);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredRecipes = filteredRecipes.filter(r => 
        r.name.toLowerCase().includes(searchTerm) ||
        r.description?.toLowerCase().includes(searchTerm) ||
        r.ingredientsJson.some(ing => ing.name.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.mealType) {
      filteredRecipes = filteredRecipes.filter(r => 
        r.mealTypes.includes(filters.mealType!)
      );
    }

    if (filters.dietaryTag) {
      filteredRecipes = filteredRecipes.filter(r => 
        r.dietaryTags.includes(filters.dietaryTag!)
      );
    }

    if (filters.maxPrepTime) {
      filteredRecipes = filteredRecipes.filter(r => 
        r.prepTimeMinutes <= filters.maxPrepTime!
      );
    }

    if (filters.maxCalories) {
      filteredRecipes = filteredRecipes.filter(r => 
        r.caloriesKcal <= filters.maxCalories!
      );
    }

    if (filters.minProtein) {
      filteredRecipes = filteredRecipes.filter(r => 
        Number(r.proteinGrams) >= filters.minProtein!
      );
    }

    if (filters.maxCarbs) {
      filteredRecipes = filteredRecipes.filter(r => 
        Number(r.carbsGrams) <= filters.maxCarbs!
      );
    }

    if (filters.includeIngredients?.length) {
      filteredRecipes = filteredRecipes.filter(r => 
        filters.includeIngredients!.some(ing => 
          r.ingredientsJson.some(recipeIng => 
            recipeIng.name.toLowerCase().includes(ing.toLowerCase())
          )
        )
      );
    }

    if (filters.excludeIngredients?.length) {
      filteredRecipes = filteredRecipes.filter(r => 
        !filters.excludeIngredients!.some(ing => 
          r.ingredientsJson.some(recipeIng => 
            recipeIng.name.toLowerCase().includes(ing.toLowerCase())
          )
        )
      );
    }

    // Sort by creation date (newest first)
    filteredRecipes.sort((a, b) => 
      new Date(b.creationTimestamp || 0).getTime() - new Date(a.creationTimestamp || 0).getTime()
    );

    const total = filteredRecipes.length;
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const offset = (page - 1) * limit;
    const paginatedRecipes = filteredRecipes.slice(offset, offset + limit);

    return { recipes: paginatedRecipes, total };
  }

  async getRecipeStats(): Promise<{
    total: number;
    approved: number;
    pending: number;
    avgRating: number;
  }> {
    const allRecipes = Array.from(this.recipes.values());
    const total = allRecipes.length;
    const approved = allRecipes.filter(r => r.isApproved).length;
    const pending = total - approved;
    
    return {
      total,
      approved,
      pending,
      avgRating: 4.6, // Mock average rating
    };
  }
}

export const storage = new MemStorage();
