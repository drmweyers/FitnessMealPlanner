import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireAdmin, requireTrainer, requireClient } from "./replitAuth";
import { recipeGenerator } from "./services/recipeGenerator";
import { mealPlanGenerator } from "./services/mealPlanGenerator";
import { recipeFilterSchema, insertRecipeSchema, updateRecipeSchema, mealPlanGenerationSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get additional profile info based on role
      let additionalData = {};
      if (user?.role === 'trainer') {
        const trainer = await storage.getTrainerByUserId(user.id);
        additionalData = { trainer };
      } else if (user?.role === 'client') {
        const client = await storage.getClientByUserId(user.id);
        additionalData = { client };
      }
      
      res.json({ ...user, ...additionalData });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Recipe routes - Public
  app.get('/api/recipes', async (req, res) => {
    try {
      const filters = recipeFilterSchema.parse({
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 12,
        maxPrepTime: req.query.maxPrepTime ? parseInt(req.query.maxPrepTime as string) : undefined,
        maxCalories: req.query.maxCalories ? parseInt(req.query.maxCalories as string) : undefined,
        minCalories: req.query.minCalories ? parseInt(req.query.minCalories as string) : undefined,
        minProtein: req.query.minProtein ? parseInt(req.query.minProtein as string) : undefined,
        maxProtein: req.query.maxProtein ? parseInt(req.query.maxProtein as string) : undefined,
        minCarbs: req.query.minCarbs ? parseInt(req.query.minCarbs as string) : undefined,
        maxCarbs: req.query.maxCarbs ? parseInt(req.query.maxCarbs as string) : undefined,
        minFat: req.query.minFat ? parseInt(req.query.minFat as string) : undefined,
        maxFat: req.query.maxFat ? parseInt(req.query.maxFat as string) : undefined,
        approved: true, // Only show approved recipes to public
      });

      const result = await storage.searchRecipes(filters);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error searching recipes:", error);
        res.status(500).json({ message: "Failed to search recipes" });
      }
    }
  });

  app.get('/api/recipes/:id', async (req, res) => {
    try {
      const recipe = await storage.getRecipe(req.params.id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      // Only show approved recipes to public unless admin
      if (!recipe.isApproved) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  // Initial Role Setup (for users without a role)
  app.post('/api/users/setup-role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!['admin', 'trainer', 'client'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be admin, trainer, or client" });
      }
      
      // Allow role changes for existing users
      
      const user = await storage.updateUserRole(userId, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create trainer or client profile based on new role
      if (role === 'trainer') {
        const existingTrainer = await storage.getTrainerByUserId(userId);
        if (!existingTrainer) {
          await storage.createTrainer({ userId });
        }
      } else if (role === 'client') {
        const existingClient = await storage.getClientByUserId(userId);
        if (!existingClient) {
          await storage.createClient({
            userId,
            fitnessGoals: [],
            dietaryRestrictions: [],
            activityLevel: "moderately_active",
          });
        }
      }
      
      res.json({ message: "Role assigned successfully", user });
    } catch (error) {
      console.error("Error setting up user role:", error);
      res.status(500).json({ message: "Failed to set up user role" });
    }
  });

  // Role Management Routes (Admin only)
  app.post('/api/admin/users/:userId/role', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'trainer', 'client'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be admin, trainer, or client" });
      }
      
      const user = await storage.updateUserRole(userId, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create trainer or client profile based on new role
      if (role === 'trainer') {
        const existingTrainer = await storage.getTrainerByUserId(userId);
        if (!existingTrainer) {
          await storage.createTrainer({ userId });
        }
      } else if (role === 'client') {
        const existingClient = await storage.getClientByUserId(userId);
        if (!existingClient) {
          await storage.createClient({
            userId,
            fitnessGoals: [],
            dietaryRestrictions: [],
            activityLevel: "moderately_active",
          });
        }
      }
      
      res.json({ message: "Role updated successfully", user });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Trainer Routes
  app.get('/api/trainer/clients', isAuthenticated, requireTrainer, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      
      if (!trainer) {
        return res.status(404).json({ message: "Trainer profile not found" });
      }
      
      const clients = await storage.getTrainerClients(trainer.id);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching trainer clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/trainer/meal-plans', isAuthenticated, requireTrainer, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trainer = await storage.getTrainerByUserId(userId);
      
      if (!trainer) {
        return res.status(404).json({ message: "Trainer profile not found" });
      }
      
      const mealPlans = await storage.getTrainerMealPlans(trainer.id);
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching trainer meal plans:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  // Client Routes
  app.get('/api/client/meal-plans', isAuthenticated, requireClient, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const client = await storage.getClientByUserId(userId);
      
      if (!client) {
        return res.status(404).json({ message: "Client profile not found" });
      }
      
      const mealPlans = await storage.getClientMealPlans(client.id);
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching client meal plans:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  // Recipe routes - Admin protected
  app.get('/api/admin/recipes', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const filters = recipeFilterSchema.parse({
        ...req.query,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 12,
        maxPrepTime: req.query.maxPrepTime ? parseInt(req.query.maxPrepTime as string) : undefined,
        maxCalories: req.query.maxCalories ? parseInt(req.query.maxCalories as string) : undefined,
        minCalories: req.query.minCalories ? parseInt(req.query.minCalories as string) : undefined,
        minProtein: req.query.minProtein ? parseInt(req.query.minProtein as string) : undefined,
        maxProtein: req.query.maxProtein ? parseInt(req.query.maxProtein as string) : undefined,
        minCarbs: req.query.minCarbs ? parseInt(req.query.minCarbs as string) : undefined,
        maxCarbs: req.query.maxCarbs ? parseInt(req.query.maxCarbs as string) : undefined,
        minFat: req.query.minFat ? parseInt(req.query.minFat as string) : undefined,
        maxFat: req.query.maxFat ? parseInt(req.query.maxFat as string) : undefined,
        approved: req.query.approved !== undefined ? req.query.approved === 'true' : undefined,
      });

      const result = await storage.searchRecipes(filters);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error searching recipes:", error);
        res.status(500).json({ message: "Failed to search recipes" });
      }
    }
  });

  app.get('/api/admin/recipes/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const recipe = await storage.getRecipe(req.params.id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.post('/api/admin/recipes', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const recipeData = insertRecipeSchema.parse(req.body);
      const recipe = await storage.createRecipe(recipeData);
      res.status(201).json(recipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error creating recipe:", error);
        res.status(500).json({ message: "Failed to create recipe" });
      }
    }
  });

  app.patch('/api/admin/recipes/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const updates = updateRecipeSchema.parse(req.body);
      const recipe = await storage.updateRecipe(req.params.id, updates);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error updating recipe:", error);
        res.status(500).json({ message: "Failed to update recipe" });
      }
    }
  });

  app.patch('/api/admin/recipes/:id/approve', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const recipe = await storage.approveRecipe(req.params.id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(recipe);
    } catch (error) {
      console.error("Error approving recipe:", error);
      res.status(500).json({ message: "Failed to approve recipe" });
    }
  });

  app.delete('/api/admin/recipes/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteRecipe(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  // Admin stats
  app.get('/api/admin/stats', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      // Disable caching for stats to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const stats = await storage.getRecipeStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Recipe generation - Bulk
  app.post('/api/admin/generate', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { count = 20 } = req.body;
      
      if (count > 100) {
        return res.status(400).json({ message: "Maximum 100 recipes per batch" });
      }

      // Start generation in background
      setImmediate(async () => {
        try {
          await recipeGenerator.generateAndStoreRecipes(count);
        } catch (error) {
          console.error("Background recipe generation failed:", error);
        }
      });

      res.json({ 
        message: `Recipe generation started for ${count} recipes. This will take a few minutes.`,
        count,
        started: true
      });
    } catch (error) {
      console.error("Error starting recipe generation:", error);
      res.status(500).json({ message: "Failed to start recipe generation" });
    }
  });

  // Recipe generation - Custom with filters
  app.post('/api/admin/generate-recipes', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { 
        count = 10, 
        mealType, 
        dietaryTag, 
        maxPrepTime, 
        maxCalories,
        minCalories,
        minProtein,
        maxProtein,
        minCarbs,
        maxCarbs,
        minFat,
        maxFat,
        focusIngredient,
        difficulty
      } = req.body;
      
      if (count > 50) {
        return res.status(400).json({ message: "Maximum 50 recipes per custom batch" });
      }

      // Build generation options
      const options = {
        mealType,
        dietaryPreferences: dietaryTag ? [dietaryTag] : undefined,
        maxPrepTime,
        maxCalories,
        minCalories,
        targetProtein: minProtein || maxProtein,
        targetCarbs: minCarbs || maxCarbs,
        targetFat: minFat || maxFat,
        focusIngredient,
        difficulty
      };

      // Start custom generation in background
      setImmediate(async () => {
        try {
          await recipeGenerator.generateAndStoreRecipes(count);
        } catch (error) {
          console.error("Background custom recipe generation failed:", error);
        }
      });

      let message = `Custom recipe generation started for ${count} recipes`;
      if (mealType) message += ` (${mealType})`;
      if (dietaryTag) message += ` with ${dietaryTag} focus`;
      if (focusIngredient) message += ` featuring ${focusIngredient}`;
      message += ". This will take a few minutes.";

      res.json({ 
        message,
        count,
        started: true
      });
    } catch (error) {
      console.error("Error starting custom recipe generation:", error);
      res.status(500).json({ message: "Failed to start custom recipe generation" });
    }
  });

  // Meal Plan Generation (Trainers only)
  app.post('/api/trainer/generate-meal-plan', isAuthenticated, requireTrainer, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const validatedData = mealPlanGenerationSchema.parse(req.body);
      
      // Get trainer profile
      const trainer = await storage.getTrainerByUserId(userId);
      if (!trainer) {
        return res.status(404).json({ message: "Trainer profile not found" });
      }
      
      // Generate the meal plan
      const mealPlan = await mealPlanGenerator.generateMealPlan(validatedData, userId);
      const nutrition = mealPlanGenerator.calculateMealPlanNutrition(mealPlan);
      
      // Store the meal plan in database if client is specified
      if (validatedData.clientName) {
        // Find client by name (simplified - in production you'd want client ID)
        const clients = await storage.getTrainerClients(trainer.id);
        const client = clients.find(c => 
          `${c.userId}`.toLowerCase().includes(validatedData.clientName!.toLowerCase())
        );
        
        if (client) {
          await storage.createMealPlan({
            planName: mealPlan.planName,
            fitnessGoal: mealPlan.fitnessGoal,
            description: mealPlan.description,
            dailyCalorieTarget: mealPlan.dailyCalorieTarget,
            days: mealPlan.days,
            mealsPerDay: mealPlan.mealsPerDay,
            clientId: client.id,
            trainerId: trainer.id,
            generatedBy: userId,
            mealsData: mealPlan.meals,
          });
        }
      }
      
      res.json({
        mealPlan,
        nutrition,
        message: `Successfully generated ${validatedData.days}-day meal plan${validatedData.clientName ? ` for ${validatedData.clientName}` : ''}`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error generating meal plan:", error);
        res.status(500).json({ message: (error as Error).message || "Failed to generate meal plan" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
