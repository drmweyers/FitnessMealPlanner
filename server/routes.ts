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
import authRouter from "./authRoutes";
import { requireAuth, requireRole } from "./middleware/auth";
import passwordRouter from "./passwordRoutes";
import recipeRouter from "./recipeRoutes";
import invitationRouter from "./invitationRoutes";
import adminRouter from "./routes/adminRoutes";
import trainerRouter from "./routes/trainerRoutes";
import pdfRouter from "./routes/pdf";
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
  // Authentication routes
  app.use('/api/auth', authRouter);
  app.use('/api/password', passwordRouter);
  app.use('/api/recipes', recipeRouter);
  app.use('/api/invitations', invitationRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/trainer', trainerRouter);
  app.use('/api/pdf', pdfRouter);

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
        
        // Return empty results for database connection issues to allow UI to function
        if ((error as Error).message.includes("Connection") || 
            (error as Error).message.includes("timeout") ||
            (error as Error).message.includes("Control plane")) {
          res.json({ recipes: [], total: 0 });
        } else {
          res.status(500).json({ message: "Failed to search recipes" });
        }
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

  // Meal Plan Generation - Public endpoint for core functionality
  app.post('/api/meal-plan/generate', async (req, res) => {
    console.log("POST /api/meal-plan/generate endpoint hit");
    console.log("Request body:", req.body);
    
    try {
      // Simple validation first
      if (!req.body) {
        return res.status(400).json({ message: "Request body is required" });
      }

      // Allow anonymous users for public meal plan generation
      const userId = (req as any).user?.claims?.sub || 'anonymous';
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
        clientName: req.body.clientName || "",
        description: req.body.description || "",
        // Optional filters
        mealType: req.body.mealType || undefined,
        dietaryTag: req.body.dietaryTag || undefined,
        maxPrepTime: req.body.maxPrepTime ? Number(req.body.maxPrepTime) : undefined,
        maxCalories: req.body.maxCalories ? Number(req.body.maxCalories) : undefined,
        minCalories: req.body.minCalories ? Number(req.body.minCalories) : undefined,
        minProtein: req.body.minProtein ? Number(req.body.minProtein) : undefined,
        maxProtein: req.body.maxProtein ? Number(req.body.maxProtein) : undefined,
        minCarbs: req.body.minCarbs ? Number(req.body.minCarbs) : undefined,
        maxCarbs: req.body.maxCarbs ? Number(req.body.maxCarbs) : undefined,
        minFat: req.body.minFat ? Number(req.body.minFat) : undefined,
        maxFat: req.body.maxFat ? Number(req.body.maxFat) : undefined,
      };
      
      console.log("Validated data:", validatedData);
      
      const mealPlan = await mealPlanGenerator.generateMealPlan(validatedData, userId);
      const nutrition = mealPlanGenerator.calculateMealPlanNutrition(mealPlan);
      
      res.json({
        mealPlan,
        nutrition,
        message: `Successfully generated ${validatedData.days}-day meal plan`,
        completed: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating meal plan:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to generate meal plan";
      if ((error as Error).message.includes("No approved recipes")) {
        errorMessage = "No recipes available in the database. Please add some recipes first.";
      } else if ((error as Error).message.includes("Connection")) {
        errorMessage = "Database connection issue. Please try again.";
      } else {
        errorMessage = (error as Error).message || errorMessage;
      }
      
      res.status(500).json({ 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
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

  // Parse natural language recipe requirements for admin
  app.post('/api/admin/parse-recipe-requirements', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { naturalLanguageInput } = req.body;
      
      if (!naturalLanguageInput || typeof naturalLanguageInput !== 'string') {
        return res.status(400).json({ message: "Natural language input is required" });
      }

      const { parseNaturalLanguageRecipeRequirements } = await import('./services/openai');
      const parsedRequirements = await parseNaturalLanguageRecipeRequirements(naturalLanguageInput);
      
      res.json(parsedRequirements);
    } catch (error) {
      console.error("Error parsing natural language recipe requirements:", error);
      res.status(500).json({ 
        message: "Failed to parse natural language input",
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // Legacy endpoint with authentication for backwards compatibility
  app.post('/api/generate-meal-plan', requireAuth, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
