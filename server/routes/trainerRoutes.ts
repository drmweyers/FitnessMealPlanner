import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { storage } from '../storage';
import { eq, sql, and } from 'drizzle-orm';
import { personalizedRecipes, personalizedMealPlans, users, type MealPlan } from '@shared/schema';
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

// Get all customers assigned to this trainer
trainerRouter.get('/customers', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    
    // Get unique customers who have meal plans or recipes assigned by this trainer
    const customersWithMealPlans = await db.select({
      customerId: personalizedMealPlans.customerId,
      customerEmail: users.email,
      assignedAt: personalizedMealPlans.assignedAt,
    })
    .from(personalizedMealPlans)
    .innerJoin(users, eq(users.id, personalizedMealPlans.customerId))
    .where(eq(personalizedMealPlans.trainerId, trainerId));
    
    const customersWithRecipes = await db.select({
      customerId: personalizedRecipes.customerId,
      customerEmail: users.email,
      assignedAt: personalizedRecipes.assignedAt,
    })
    .from(personalizedRecipes)
    .innerJoin(users, eq(users.id, personalizedRecipes.customerId))
    .where(eq(personalizedRecipes.trainerId, trainerId));
    
    // Combine and deduplicate customers
    const customerMap = new Map();
    
    [...customersWithMealPlans, ...customersWithRecipes].forEach(customer => {
      if (!customerMap.has(customer.customerId)) {
        customerMap.set(customer.customerId, {
          id: customer.customerId,
          email: customer.customerEmail,
          firstAssignedAt: customer.assignedAt,
        });
      } else {
        const existing = customerMap.get(customer.customerId);
        if (customer.assignedAt && existing.firstAssignedAt && customer.assignedAt < existing.firstAssignedAt) {
          existing.firstAssignedAt = customer.assignedAt;
        }
      }
    });
    
    const customers = Array.from(customerMap.values());
    res.json({ customers, total: customers.length });
  } catch (error) {
    console.error('Failed to fetch trainer customers:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch customers',
      code: 'SERVER_ERROR'
    });
  }
});

// Get all meal plans assigned to a specific customer by this trainer
trainerRouter.get('/customers/:customerId/meal-plans', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;
    
    const mealPlans = await db.select()
      .from(personalizedMealPlans)
      .where(
        and(
          eq(personalizedMealPlans.trainerId, trainerId),
          eq(personalizedMealPlans.customerId, customerId)
        )
      );
    
    res.json({ mealPlans, total: mealPlans.length });
  } catch (error) {
    console.error('Failed to fetch customer meal plans:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch customer meal plans',
      code: 'SERVER_ERROR'
    });
  }
});

// Assign a new meal plan to a customer
trainerRouter.post('/customers/:customerId/meal-plans', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;
    const { mealPlanData } = req.body;
    
    if (!mealPlanData) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Meal plan data is required',
        code: 'INVALID_INPUT'
      });
    }
    
    // Verify customer exists
    const customer = await db.select()
      .from(users)
      .where(and(eq(users.id, customerId), eq(users.role, 'customer')))
      .limit(1);
    
    if (customer.length === 0) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Customer not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Create the meal plan assignment
    const [newAssignment] = await db.insert(personalizedMealPlans)
      .values({
        customerId,
        trainerId,
        mealPlanData: mealPlanData as MealPlan,
      })
      .returning();
    
    res.status(201).json({ 
      assignment: newAssignment,
      message: 'Meal plan assigned successfully'
    });
  } catch (error) {
    console.error('Failed to assign meal plan:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to assign meal plan',
      code: 'SERVER_ERROR'
    });
  }
});

// Remove a meal plan assignment
trainerRouter.delete('/meal-plans/:planId', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { planId } = req.params;
    
    // Verify the meal plan belongs to this trainer
    const mealPlan = await db.select()
      .from(personalizedMealPlans)
      .where(
        and(
          eq(personalizedMealPlans.id, planId),
          eq(personalizedMealPlans.trainerId, trainerId)
        )
      )
      .limit(1);
    
    if (mealPlan.length === 0) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Meal plan not found or not authorized',
        code: 'NOT_FOUND'
      });
    }
    
    await db.delete(personalizedMealPlans)
      .where(eq(personalizedMealPlans.id, planId));
    
    res.json({ message: 'Meal plan assignment removed successfully' });
  } catch (error) {
    console.error('Failed to remove meal plan assignment:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to remove meal plan assignment',
      code: 'SERVER_ERROR'
    });
  }
});

export default trainerRouter;