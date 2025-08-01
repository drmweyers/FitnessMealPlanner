import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth'; 

export const recipeRouter = Router();

// Schema for public recipe filtering
const getRecipesSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
});

// GET /api/recipes - Fetch public, approved recipes
recipeRouter.get('/', async (req, res) => {
  try {
    const query = getRecipesSchema.parse(req.query);
    const { recipes, total } = await storage.searchRecipes({
      ...query,
      approved: true, // Public users only see approved recipes
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