import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { storage } from '../storage';
import { z } from 'zod';
import { recipeGenerator } from '../services/recipeGenerator';

const adminRouter = Router();

// Protect all admin routes
adminRouter.use(requireAdmin);

// AI recipe generation
adminRouter.post('/generate', async (req, res) => {
    try {
      const { count = 10 } = req.body;
      // Do not await this, let it run in the background
      recipeGenerator.generateAndStoreRecipes({ count });
      res.status(202).json({ message: `Recipe generation started for ${count} recipes.` });
    } catch (error) {
      console.error("Error starting recipe generation:", error);
      res.status(500).json({ message: "Failed to start recipe generation" });
    }
});

const recipeFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  approved: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }, z.boolean().optional()),
  search: z.string().optional(),
});

adminRouter.get('/recipes', async (req, res) => {
  try {
    const query = recipeFilterSchema.parse(req.query);

    const { recipes, total } = await storage.searchRecipes({
      page: query.page,
      limit: query.limit,
      approved: query.approved,
      search: query.search,
    });
    
    res.json({ recipes, total });

  } catch (error) {
    console.error('Failed to fetch recipes for admin:', error);
    res.status(400).json({ error: 'Invalid filter parameters' });
  }
});

adminRouter.get('/stats', async (req, res) => {
  try {
    const stats = await storage.getRecipeStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    res.status(500).json({ error: 'Could not fetch stats' });
  }
});

adminRouter.patch('/recipes/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const recipe = await storage.updateRecipe(id, { isApproved: true });
        res.json(recipe);
    } catch (error) {
        console.error(`Failed to approve recipe ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to approve recipe' });
    }
});

adminRouter.delete('/recipes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await storage.deleteRecipe(id);
        res.status(204).send();
    } catch (error) {
        console.error(`Failed to delete recipe ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});

adminRouter.delete('/recipes', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request: "ids" must be a non-empty array.' });
    }
    await storage.bulkDeleteRecipes(ids);
    res.json({ message: `Successfully deleted ${ids.length} recipes.` });
  } catch (error) {
    console.error('Failed to bulk delete recipes:', error);
    res.status(500).json({ error: 'Failed to bulk delete recipes' });
  }
});

export default adminRouter; 