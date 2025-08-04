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

// GET /api/recipes - Fetch public, approved recipes (optimized)
recipeRouter.get('/', async (req, res) => {
  try {
    const query = getRecipesSchema.parse(req.query);
    
    // Set appropriate cache headers
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.setHeader('Vary', 'Accept-Encoding');
    
    const { recipes, total } = await storage.searchRecipes({
      ...query,
      approved: true, // Public users only see approved recipes
    });
    
    // Optimize response by removing unnecessary fields for list view
    const optimizedRecipes = recipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      caloriesKcal: recipe.caloriesKcal,
      prepTimeMinutes: recipe.prepTimeMinutes,
      servings: recipe.servings,
      mealTypes: recipe.mealTypes,
      dietaryTags: recipe.dietaryTags,
      imageUrl: recipe.imageUrl,
      // Exclude large fields like ingredientsJson and instructionsText for list view
    }));
    
    res.json({ recipes: optimizedRecipes, total });
  } catch (error) {
    console.error('Failed to fetch public recipes:', error);
    res.status(400).json({ error: 'Invalid filter parameters' });
  }
});

// GET /api/recipes/personalized - Fetch recipes for the logged-in user (optimized)
recipeRouter.get('/personalized', requireAuth, async (req, res) => {
  try {
    // req.user is populated by the requireAuth middleware
    const userId = req.user!.id;
    
    // Set private cache for personalized content
    res.setHeader('Cache-Control', 'private, max-age=180'); // 3 minutes
    
    const recipes = await storage.getPersonalizedRecipes(userId);
    
    res.json({ recipes, total: recipes.length });
  } catch (error) {
    console.error('Failed to fetch personalized recipes:', error);
    res.status(500).json({ error: 'Failed to fetch personalized recipes' });
  }
});

// GET /api/recipes/:id - Fetch a single public recipe by ID (optimized)
recipeRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Set longer cache for individual recipes
    res.setHeader('Cache-Control', 'public, max-age=600'); // 10 minutes
    res.setHeader('Vary', 'Accept-Encoding');
    
    const recipe = await storage.getRecipe(id);
    
    // Ensure the recipe exists and is approved for public view
    if (!recipe || !recipe.isApproved) {
      res.setHeader('Cache-Control', 'no-cache'); // Don't cache 404s
      return res.status(404).json({ error: 'Recipe not found or not approved' });
    }
    
    res.json(recipe);
  } catch (error) {
    console.error(`Failed to fetch recipe ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
}); 