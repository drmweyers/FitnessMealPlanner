import { Router } from 'express';
import { requireAdmin, requireTrainerOrAdmin } from '../middleware/auth';
import { storage } from '../storage';
import { z } from 'zod';
import { recipeGenerator } from '../services/recipeGenerator';
import { eq } from 'drizzle-orm';
import { personalizedRecipes } from '@shared/schema';
import { db } from '../db';

const adminRouter = Router();

// Admin-only routes
adminRouter.post('/generate', requireAdmin, async (req, res) => {
  try {
    const { 
      count, 
      mealTypes,
      dietaryRestrictions,
      targetCalories,
      mainIngredient,
      fitnessGoal,
      naturalLanguagePrompt,
      maxPrepTime,
      maxCalories,
      minProtein,
      maxProtein,
      minCarbs,
      maxCarbs,
      minFat,
      maxFat
    } = req.body;
    
    // Validate required count parameter
    if (!count || count < 1 || count > 100) {
      return res.status(400).json({ 
        message: "Count is required and must be between 1 and 100" 
      });
    }
    
    // Prepare generation options with context
    const generationOptions = {
      count,
      mealTypes,
      dietaryRestrictions,
      targetCalories,
      mainIngredient,
      fitnessGoal,
      naturalLanguagePrompt,
      maxPrepTime,
      maxCalories,
      minProtein,
      maxProtein,
      minCarbs,
      maxCarbs,
      minFat,
      maxFat
    };
    
    console.log('Recipe generation started with context:', generationOptions);
    
    // Do not await this, let it run in the background
    recipeGenerator.generateAndStoreRecipes(generationOptions);
    
    const contextMessage = naturalLanguagePrompt || fitnessGoal || mealTypes?.length || dietaryRestrictions?.length
      ? ` with context-based targeting`
      : '';
    
    res.status(202).json({ 
      message: `Recipe generation started for ${count} recipes${contextMessage}.` 
    });
  } catch (error) {
    console.error("Error starting recipe generation:", error);
    res.status(500).json({ message: "Failed to start recipe generation" });
  }
});

// Routes accessible by both trainers and admins
adminRouter.get('/customers', requireTrainerOrAdmin, async (req, res) => {
  try {
    const { recipeId } = req.query;
    const customers = await storage.getCustomers(recipeId as string | undefined);
    res.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Assign recipe to customers
const assignRecipeSchema = z.object({
  recipeId: z.string().uuid(),
  customerIds: z.array(z.string().uuid()),
});

adminRouter.post('/assign-recipe', requireTrainerOrAdmin, async (req, res) => {
  try {
    const { recipeId, customerIds } = assignRecipeSchema.parse(req.body);
    const trainerId = req.user!.id;
    
    // Get current assignments to determine what changed
    const currentAssignments = await db
      .select()
      .from(personalizedRecipes)
      .where(eq(personalizedRecipes.recipeId, recipeId));
    
    const currentlyAssignedIds = new Set(currentAssignments.map(a => a.customerId));
    const toAdd = customerIds.filter(id => !currentlyAssignedIds.has(id));
    const toRemove = Array.from(currentlyAssignedIds).filter(id => !customerIds.includes(id));
    
    await storage.assignRecipeToCustomers(trainerId, recipeId, customerIds);
    
    // Create a descriptive message about what changed
    const changes = [];
    if (toAdd.length > 0) {
      changes.push(`assigned to ${toAdd.length} customer(s)`);
    }
    if (toRemove.length > 0) {
      changes.push(`unassigned from ${toRemove.length} customer(s)`);
    }
    
    res.json({ 
      message: changes.length > 0 
        ? `Recipe ${changes.join(' and ')} successfully`
        : 'No changes were made to recipe assignments',
      added: toAdd.length,
      removed: toRemove.length,
    });
  } catch (error) {
    console.error('Failed to assign recipe:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to assign recipe' });
    }
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

adminRouter.get('/recipes', requireAdmin, async (req, res) => {
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

adminRouter.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await storage.getRecipeStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    res.status(500).json({ error: 'Could not fetch stats' });
  }
});

adminRouter.patch('/recipes/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await storage.updateRecipe(id, { isApproved: true });
    res.json(recipe);
  } catch (error) {
    console.error(`Failed to approve recipe ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to approve recipe' });
  }
});

// Add unapprove endpoint
adminRouter.patch('/recipes/:id/unapprove', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await storage.updateRecipe(id, { isApproved: false });
    res.json(recipe);
  } catch (error) {
    console.error(`Failed to unapprove recipe ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to unapprove recipe' });
  }
});

// Add bulk unapprove endpoint
adminRouter.post('/recipes/bulk-unapprove', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request: "ids" must be a non-empty array.' });
    }
    
    // Update all recipes to unapproved state
    await Promise.all(ids.map(id => storage.updateRecipe(id, { isApproved: false })));
    
    res.json({ message: `Successfully unapproved ${ids.length} recipes.` });
  } catch (error) {
    console.error('Failed to bulk unapprove recipes:', error);
    res.status(500).json({ error: 'Failed to bulk unapprove recipes' });
  }
});

adminRouter.delete('/recipes/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteRecipe(id);
    res.status(204).send();
  } catch (error) {
    console.error(`Failed to delete recipe ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

adminRouter.delete('/recipes', requireAdmin, async (req, res) => {
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