import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { storage } from '../storage';
import { eq, sql } from 'drizzle-orm';
import { personalizedRecipes, personalizedMealPlans, users } from '@shared/schema';
import { db } from '../db';

const trainerRouter = Router();

// Trainer profile statistics endpoint
trainerRouter.get('/profile/stats', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    
    // Get count of clients (customers with assigned meal plans/recipes from this trainer)
    const [clientsWithMealPlans] = await db.select({
      count: sql<number>`count(distinct ${personalizedMealPlans.customerId})::int`,
    })
    .from(personalizedMealPlans)
    .where(eq(personalizedMealPlans.trainerId, trainerId));

    const [clientsWithRecipes] = await db.select({
      count: sql<number>`count(distinct ${personalizedRecipes.customerId})::int`,
    })
    .from(personalizedRecipes)
    .where(eq(personalizedRecipes.trainerId, trainerId));

    // Get total meal plans created by this trainer
    const [mealPlansCreated] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(personalizedMealPlans)
    .where(eq(personalizedMealPlans.trainerId, trainerId));

    // Get total recipes assigned by this trainer
    const [recipesAssigned] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(personalizedRecipes)
    .where(eq(personalizedRecipes.trainerId, trainerId));

    // Calculate unique clients (union of clients with meal plans and recipes)
    const uniqueClients = Math.max(
      clientsWithMealPlans?.count || 0,
      clientsWithRecipes?.count || 0
    );

    const stats = {
      totalClients: uniqueClients,
      totalMealPlansCreated: mealPlansCreated?.count || 0,
      totalRecipesAssigned: recipesAssigned?.count || 0,
      activeMealPlans: mealPlansCreated?.count || 0, // Simplified for now
      clientSatisfactionRate: 95, // Mock data - would be calculated from client feedback
    };

    res.json(stats);
  } catch (error) {
    console.error('Trainer stats error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch trainer statistics',
      code: 'SERVER_ERROR'
    });
  }
});

export default trainerRouter;