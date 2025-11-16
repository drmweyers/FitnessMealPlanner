import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth';
import { recipeSearchService } from '../services/recipeSearchService';
import { attachRecipeTierFilter, getUserTierLevel } from '../middleware/tierEnforcement';
import { db } from "../db";
import { 
  recipeRatings, 
  recipeRatingSummary, 
  ratingHelpfulness,
  users,
  recipes,
  createRatingSchema,
  updateRatingSchema,
  voteHelpfulnessSchema,
  type RecipeRatingWithUser 
} from "@shared/schema";
import { eq, and, desc, asc, sql, count } from "drizzle-orm"; 

export const recipeRouter = Router();

// Schema for public recipe filtering
const getRecipesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
});

// GET /api/recipes - Fetch public, approved recipes
// Story 2.14: Apply tier filtering for progressive recipe access
recipeRouter.get('/', attachRecipeTierFilter, async (req, res) => {
  try {
    const query = getRecipesSchema.parse(req.query);
    const userTier = getUserTierLevel(req);

    const { recipes, total } = await storage.searchRecipes({
      ...query,
      approved: true, // Public users only see approved recipes
      // tierLevel removed - tier system not implemented
    });
    res.json({ recipes, total });
  } catch (error) {
    console.error('Failed to fetch public recipes:', error);
    res.status(400).json({ error: 'Invalid filter parameters' });
  }
});

// GET /api/recipes/personalized - Fetch recipes for the logged-in user
recipeRouter.get('/personalized', requireAuth, async (req, res) => {
  try {
    // req.user is populated by the requireAuth middleware
    const userId = req.user!.id;
    const recipes = await storage.getPersonalizedRecipes(userId);
    res.json({ recipes, total: recipes.length });
  } catch (error) {
    console.error('Failed to fetch personalized recipes:', error);
    res.status(500).json({ error: 'Failed to fetch personalized recipes' });
  }
});

// GET /api/recipes/:id - Fetch a single public recipe by ID
recipeRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await storage.getRecipe(id);
    // Ensure the recipe exists and is approved for public view
    if (!recipe || !recipe.isApproved) {
      return res.status(404).json({ error: 'Recipe not found or not approved' });
    }
    res.json(recipe);
  } catch (error) {
    console.error(`Failed to fetch recipe ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Enhanced recipe search with comprehensive filtering
// Story 2.14: Apply tier filtering for progressive recipe access
recipeRouter.get('/search', attachRecipeTierFilter, async (req, res) => {
  try {
    console.log('[Recipe Search API] Received search request:', req.query);
    const userTier = getUserTierLevel(req);

    const filters = {
      search: req.query.search as string,
      mealTypes: req.query.mealTypes ? (req.query.mealTypes as string).split(',') : undefined,
      dietaryTags: req.query.dietaryTags ? (req.query.dietaryTags as string).split(',') : undefined,
      calories: req.query.caloriesMin || req.query.caloriesMax ? {
        min: req.query.caloriesMin ? Number(req.query.caloriesMin) : undefined,
        max: req.query.caloriesMax ? Number(req.query.caloriesMax) : undefined
      } : undefined,
      protein: req.query.proteinMin || req.query.proteinMax ? {
        min: req.query.proteinMin ? Number(req.query.proteinMin) : undefined,
        max: req.query.proteinMax ? Number(req.query.proteinMax) : undefined
      } : undefined,
      carbs: req.query.carbsMin || req.query.carbsMax ? {
        min: req.query.carbsMin ? Number(req.query.carbsMin) : undefined,
        max: req.query.carbsMax ? Number(req.query.carbsMax) : undefined
      } : undefined,
      fat: req.query.fatMin || req.query.fatMax ? {
        min: req.query.fatMin ? Number(req.query.fatMin) : undefined,
        max: req.query.fatMax ? Number(req.query.fatMax) : undefined
      } : undefined,
      prepTime: req.query.prepTimeMin || req.query.prepTimeMax ? {
        min: req.query.prepTimeMin ? Number(req.query.prepTimeMin) : undefined,
        max: req.query.prepTimeMax ? Number(req.query.prepTimeMax) : undefined
      } : undefined,
      cookTime: req.query.cookTimeMin || req.query.cookTimeMax ? {
        min: req.query.cookTimeMin ? Number(req.query.cookTimeMin) : undefined,
        max: req.query.cookTimeMax ? Number(req.query.cookTimeMax) : undefined
      } : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      page: req.query.page ? Number(req.query.page) : 1,
      limit: Math.min(Number(req.query.limit) || 20, 50) // Cap at 50 for performance
      // tierLevel removed - tier system not implemented
    };

    const results = await recipeSearchService.searchRecipes(filters);

    console.log(`[Recipe Search API] Returning ${results.recipes.length} recipes out of ${results.total} total (tier: ${userTier})`);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[Recipe Search API] Search failed:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid search parameters',
      message: error.message
    });
  }
});

// Get search metadata (available filters)
recipeRouter.get('/search/metadata', async (req, res) => {
  try {
    console.log('[Recipe Search API] Fetching metadata...');
    
    const metadata = await recipeSearchService.getSearchMetadata();
    
    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('[Recipe Search API] Failed to get search metadata:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get search metadata' 
    });
  }
});

// Get search statistics (for admin analytics)
recipeRouter.get('/search/statistics', requireAuth, async (req, res) => {
  try {
    console.log('[Recipe Search API] Fetching statistics...');
    
    const statistics = await recipeSearchService.getSearchStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('[Recipe Search API] Failed to get search statistics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get search statistics' 
    });
  }
}); 