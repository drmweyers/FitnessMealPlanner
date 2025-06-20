/**
 * FitMeal Pro API Routes
 * 
 * This file defines all API endpoints for the FitMeal Pro application.
 * Routes are organized by functionality: authentication, public recipe access,
 * admin operations, and meal plan generation.
 * 
 * Security Model:
 * - Public routes: Recipe browsing and search
 * - Authenticated routes: Meal plan generation, user profile
 * - Admin routes: Recipe management, content moderation, analytics
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import { recipeGenerator } from "./services/recipeGenerator";
import { mealPlanGenerator } from "./services/mealPlanGenerator";
import { recipeFilterSchema, insertRecipeSchema, updateRecipeSchema, mealPlanGenerationSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * Register all API routes and middleware
 * 
 * Sets up authentication, defines all endpoints, and returns the HTTP server.
 * Routes are processed in order, so authentication must be set up first.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Replit authentication middleware
  await setupAuth(app);

  /**
   * Authentication Routes
   * 
   * Handles both Replit OIDC authentication and traditional email/password authentication
   * with role-based account creation.
   */
  
  // Register new user with role selection
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      
      // Validate role
      if (!['admin', 'trainer', 'client'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists with this email' });
      }
      
      // Create user with specified role
      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        password, // In production, this should be hashed
        role: role as 'admin' | 'trainer' | 'client'
      });
      
      res.status(201).json({
        message: 'Account created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Failed to create account' });
    }
  });
  
  // Login with email and password
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Find user and validate password
      const user = await storage.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Set session (mimicking Replit auth structure)
      req.session.passport = {
        user: {
          claims: {
            sub: user.id,
            email: user.email,
            given_name: user.firstName,
            family_name: user.lastName
          }
        }
      };
      
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });
  
  // Get current user profile (requires authentication)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  /**
   * Public Recipe Routes
   * 
   * These endpoints are accessible without authentication for browsing
   * and searching approved recipes. All public routes automatically
   * filter to only show approved content.
   */
  
  // Search and filter recipes with comprehensive query parameters
  app.get('/api/recipes', async (req, res) => {
    try {
      // Parse and validate query parameters with type conversion
      const filters = recipeFilterSchema.parse({
        ...req.query,
        // Convert string query params to numbers
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
        approved: true, // Security: Only show approved recipes to public
      });

      const result = await storage.searchRecipes(filters);
      res.json(result);
    } catch (error) {
      // Handle validation errors with user-friendly messages
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

  // Recipe routes - Admin protected
  app.get('/api/admin/recipes', isAuthenticated, async (req, res) => {
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
        approved: req.query.approved !== undefined ? 
          req.query.approved === 'true' ? true : 
          req.query.approved === 'false' ? false : 
          undefined : undefined,
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

  app.get('/api/admin/recipes/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/admin/recipes', isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.patch('/api/admin/recipes/:id', isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.patch('/api/admin/recipes/:id/approve', isAuthenticated, requireRole("admin"), async (req, res) => {
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

  app.delete('/api/admin/recipes/:id', isAuthenticated, requireRole("admin"), async (req, res) => {
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
  app.get('/api/admin/stats', isAuthenticated, requireRole("admin"), async (req, res) => {
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
  app.post('/api/admin/generate', isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const { count = 20 } = req.body;
      
      if (count > 100) {
        return res.status(400).json({ message: "Maximum 100 recipes per batch" });
      }

      // Environment safety check
      const isDevelopment = process.env.NODE_ENV === 'development';
      const environmentPrefix = isDevelopment ? '[DEV]' : '[PROD]';
      
      console.log(`${environmentPrefix} Admin bulk recipe generation requested: ${count} recipes`);

      // Start generation in background
      setImmediate(async () => {
        try {
          await recipeGenerator.generateAndStoreRecipes(count);
        } catch (error) {
          console.error(`${environmentPrefix} Background recipe generation failed:`, error);
        }
      });

      res.json({ 
        message: `${environmentPrefix} Recipe generation started for ${count} recipes. This will take a few minutes.`,
        count,
        started: true,
        environment: isDevelopment ? 'development' : 'production'
      });
    } catch (error) {
      console.error("Error starting recipe generation:", error);
      res.status(500).json({ message: "Failed to start recipe generation" });
    }
  });

  // Recipe generation - Custom with filters
  app.post('/api/admin/generate-recipes', isAuthenticated, requireRole("admin"), async (req, res) => {
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

      // Environment safety check
      const isDevelopment = process.env.NODE_ENV === 'development';
      const environmentPrefix = isDevelopment ? '[DEV]' : '[PROD]';
      
      console.log(`${environmentPrefix} Admin custom recipe generation requested: ${count} recipes with filters`);

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

  // Test endpoint
  app.get('/api/meal-plan/test', async (req, res) => {
    console.log("Test endpoint hit");
    res.json({ status: "ok", message: "Meal plan service is available" });
  });

  // Meal Plan Generation - Requires trainer or admin role
  app.post('/api/meal-plan/generate', isAuthenticated, requireRole("admin", "trainer"), async (req, res) => {
    console.log("POST /api/meal-plan/generate endpoint hit");
    console.log("Request body:", req.body);
    
    try {
      // Simple validation first
      if (!req.body) {
        return res.status(400).json({ message: "Request body is required" });
      }

      const userId = (req.user as any)?.claims?.sub || 'anonymous';
      console.log("User ID:", userId);
      
      // Basic required fields check
      const { planName, fitnessGoal, dailyCalorieTarget, days = 7, mealsPerDay = 3 } = req.body;
      
      if (!planName || !fitnessGoal || !dailyCalorieTarget) {
        return res.status(400).json({ 
          message: "Missing required fields: planName, fitnessGoal, dailyCalorieTarget" 
        });
      }

      const validatedData = {
        planName,
        fitnessGoal,
        dailyCalorieTarget: Number(dailyCalorieTarget),
        days: Number(days),
        mealsPerDay: Number(mealsPerDay),
        ...req.body
      };
      
      console.log("Validated data:", validatedData);
      
      const mealPlan = await mealPlanGenerator.generateMealPlan(validatedData, userId);
      const nutrition = mealPlanGenerator.calculateMealPlanNutrition(mealPlan);
      
      res.json({
        mealPlan,
        nutrition,
        message: `Successfully generated ${validatedData.days}-day meal plan`,
      });
    } catch (error) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ 
        message: (error as Error).message || "Failed to generate meal plan",
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Natural language meal plan parsing
  app.post('/api/meal-plan/parse-natural-language', async (req, res) => {
    try {
      const { naturalLanguageInput } = req.body;
      
      if (!naturalLanguageInput || typeof naturalLanguageInput !== 'string') {
        return res.status(400).json({ 
          message: "naturalLanguageInput is required and must be a string" 
        });
      }

      const { parseNaturalLanguageMealPlan } = await import('./services/openai');
      const parsedPlan = await parseNaturalLanguageMealPlan(naturalLanguageInput);
      
      res.json(parsedPlan);
    } catch (error) {
      console.error("Error parsing natural language meal plan:", error);
      res.status(500).json({ 
        message: "Failed to parse natural language input",
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // Legacy endpoint with authentication for backwards compatibility
  app.post('/api/generate-meal-plan', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const validatedData = mealPlanGenerationSchema.parse(req.body);
      
      const mealPlan = await mealPlanGenerator.generateMealPlan(validatedData, userId);
      const nutrition = mealPlanGenerator.calculateMealPlanNutrition(mealPlan);
      
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

  /**
   * Trainer Routes
   * 
   * Endpoints for trainers to manage their clients and meal plans
   */
  
  // Get trainer's clients
  app.get('/api/trainer/clients', isAuthenticated, requireRole("trainer"), async (req: any, res) => {
    try {
      const trainerId = req.dbUser.id;
      const clients = await storage.listClients(trainerId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching trainer clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Assign client to trainer
  app.post('/api/trainer/clients/:clientId/assign', isAuthenticated, requireRole("trainer"), async (req: any, res) => {
    try {
      const trainerId = req.dbUser.id;
      const { clientId } = req.params;
      
      const assignment = await storage.assignClient(trainerId, clientId);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning client:", error);
      res.status(500).json({ message: "Failed to assign client" });
    }
  });

  // Create/update meal plan for client
  app.post('/api/trainer/clients/:clientId/meal-plan', isAuthenticated, requireRole("trainer"), async (req: any, res) => {
    try {
      const trainerId = req.dbUser.id;
      const { clientId } = req.params;
      
      const validatedData = mealPlanGenerationSchema.parse(req.body);
      const mealPlan = await mealPlanGenerator.generateMealPlan(validatedData, trainerId);
      
      const storedPlan = await storage.createOrUpdateMealPlan(mealPlan, trainerId, clientId);
      res.status(201).json(storedPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error("Error creating meal plan for client:", error);
        res.status(500).json({ message: "Failed to create meal plan" });
      }
    }
  });

  // Get meal plans created by trainer
  app.get('/api/trainer/meal-plans', isAuthenticated, requireRole("trainer"), async (req: any, res) => {
    try {
      const trainerId = req.dbUser.id;
      const mealPlans = await storage.getMealPlansByTrainer(trainerId);
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching trainer meal plans:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  /**
   * Client Routes
   * 
   * Endpoints for clients to view their meal plans
   */
  
  // Get client's latest meal plan
  app.get('/api/client/meal-plan', isAuthenticated, requireRole("client", "trainer", "admin"), async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const targetId = req.query.userId || userId;
      
      // Only allow clients to view their own plans, trainers/admins can view any
      if (req.dbUser.role === "client" && targetId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const mealPlan = await storage.getLatestMealPlanForUser(targetId);
      res.json(mealPlan);
    } catch (error) {
      console.error("Error fetching client meal plan:", error);
      res.status(500).json({ message: "Failed to fetch meal plan" });
    }
  });

  // Get all meal plans for client
  app.get('/api/client/meal-plans', isAuthenticated, requireRole("client", "trainer", "admin"), async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const targetId = req.query.userId || userId;
      
      // Only allow clients to view their own plans, trainers/admins can view any
      if (req.dbUser.role === "client" && targetId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const mealPlans = await storage.getMealPlansForUser(targetId);
      res.json(mealPlans);
    } catch (error) {
      console.error("Error fetching client meal plans:", error);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  /**
   * Development Routes
   * 
   * Testing endpoints for role switching (development only)
   */
  
  // Role switching for testing (development only)
  app.post('/api/dev/switch-role', isAuthenticated, async (req: any, res) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        return res.status(404).json({ message: "Not found" });
      }

      const { role } = req.body;
      const userId = req.user.claims.sub;
      
      if (!['admin', 'trainer', 'client'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      await storage.upsertUser({
        id: userId,
        email: req.user.claims.email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
        role: role as "admin" | "trainer" | "client"
      });

      res.json({ message: "Role updated successfully", newRole: role });
    } catch (error) {
      console.error("Error switching role:", error);
      res.status(500).json({ message: "Failed to switch role" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
