import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { storage } from '../storage';
import { eq, sql } from 'drizzle-orm';
import { personalizedRecipes, personalizedMealPlans } from '@shared/schema';
import { db } from '../db';

const customerRouter = Router();

// Customer profile statistics endpoint
customerRouter.get('/profile/stats', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const customerId = req.user!.id;
    
    // Get count of assigned meal plans
    const [mealPlansCount] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(personalizedMealPlans)
    .where(eq(personalizedMealPlans.customerId, customerId));

    // Get count of assigned recipes
    const [recipesCount] = await db.select({
      count: sql<number>`count(*)::int`,
    })
    .from(personalizedRecipes)
    .where(eq(personalizedRecipes.customerId, customerId));

    // Calculate completed days (mock calculation based on meal plans)
    const mealPlans = await db.select()
      .from(personalizedMealPlans)
      .where(eq(personalizedMealPlans.customerId, customerId));

    const totalPlanDays = mealPlans.reduce((sum, plan) => {
      return sum + (plan.mealPlanData as any)?.days || 0;
    }, 0);

    // Mock completed days (in reality, this would track user progress)
    const completedDays = Math.floor(totalPlanDays * 0.6); // 60% completion rate
    
    // Calculate average calories (mock calculation)
    const avgCaloriesPerDay = mealPlans.length > 0 
      ? Math.floor(mealPlans.reduce((sum, plan) => {
          return sum + ((plan.mealPlanData as any)?.dailyCalorieTarget || 2000);
        }, 0) / mealPlans.length)
      : 0;

    const stats = {
      totalMealPlans: mealPlansCount?.count || 0,
      completedDays: completedDays,
      favoriteRecipes: recipesCount?.count || 0, // Simplified - using assigned recipes
      avgCaloriesPerDay: avgCaloriesPerDay,
      currentStreak: Math.min(7, completedDays), // Mock streak calculation
    };

    res.json(stats);
  } catch (error) {
    console.error('Customer stats error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch customer statistics',
      code: 'SERVER_ERROR'
    });
  }
});

export default customerRouter;