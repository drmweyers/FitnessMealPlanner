import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { storage } from '../storage';
import { eq, sql, and, desc, inArray } from 'drizzle-orm';
import { 
  personalizedRecipes, 
  personalizedMealPlans, 
  users, 
  progressMeasurements, 
  customerGoals, 
  trainerHealthProtocols,
  protocolAssignments,
  createHealthProtocolSchema,
  assignProtocolSchema,
  type MealPlan,
  type TrainerHealthProtocol,
  type ProtocolAssignment 
} from '@shared/schema';
import { db } from '../db';
import { z } from 'zod';

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
    const { recipeId } = req.query;
    
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
    
    // If recipeId is provided, get customers who have this specific recipe assigned
    let customersWithThisRecipe = new Set();
    if (recipeId) {
      const recipeAssignments = await db.select({
        customerId: personalizedRecipes.customerId,
      })
      .from(personalizedRecipes)
      .where(
        and(
          eq(personalizedRecipes.trainerId, trainerId),
          eq(personalizedRecipes.recipeId, recipeId as string)
        )
      );
      customersWithThisRecipe = new Set(recipeAssignments.map(a => a.customerId));
    }
    
    // Combine and deduplicate customers
    const customerMap = new Map();
    
    [...customersWithMealPlans, ...customersWithRecipes].forEach(customer => {
      if (!customerMap.has(customer.customerId)) {
        customerMap.set(customer.customerId, {
          id: customer.customerId,
          email: customer.customerEmail,
          role: 'customer',
          firstAssignedAt: customer.assignedAt,
          hasRecipe: recipeId ? customersWithThisRecipe.has(customer.customerId) : false,
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

// Get customer measurements (for trainer view)
trainerRouter.get('/customers/:customerId/measurements', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;
    
    // Verify the customer is assigned to this trainer
    const customerAssignments = await db.select()
      .from(personalizedMealPlans)
      .where(
        and(
          eq(personalizedMealPlans.trainerId, trainerId),
          eq(personalizedMealPlans.customerId, customerId)
        )
      )
      .limit(1);
    
    if (customerAssignments.length === 0) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Not authorized to view this customer\'s data',
        code: 'FORBIDDEN'
      });
    }
    
    const measurements = await db.select()
      .from(progressMeasurements)
      .where(eq(progressMeasurements.customerId, customerId))
      .orderBy(desc(progressMeasurements.measurementDate));
    
    res.json({
      status: 'success',
      data: measurements,
    });
  } catch (error) {
    console.error('Failed to fetch customer measurements:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch customer measurements',
      code: 'SERVER_ERROR'
    });
  }
});

// Get customer goals (for trainer view)
trainerRouter.get('/customers/:customerId/goals', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;
    
    // Verify the customer is assigned to this trainer
    const customerAssignments = await db.select()
      .from(personalizedMealPlans)
      .where(
        and(
          eq(personalizedMealPlans.trainerId, trainerId),
          eq(personalizedMealPlans.customerId, customerId)
        )
      )
      .limit(1);
    
    if (customerAssignments.length === 0) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Not authorized to view this customer\'s data',
        code: 'FORBIDDEN'
      });
    }
    
    const goals = await db.select()
      .from(customerGoals)
      .where(eq(customerGoals.customerId, customerId))
      .orderBy(desc(customerGoals.createdAt));
    
    res.json({
      status: 'success',
      data: goals,
    });
  } catch (error) {
    console.error('Failed to fetch customer goals:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch customer goals',
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

// Remove a meal plan assignment from customer
trainerRouter.delete('/assigned-meal-plans/:planId', requireAuth, requireRole('trainer'), async (req, res) => {
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

// === Trainer Meal Plan Management Routes ===

// Get all saved meal plans for the trainer
trainerRouter.get('/meal-plans', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const mealPlans = await storage.getTrainerMealPlans(trainerId);
    
    res.json({ 
      mealPlans,
      total: mealPlans.length 
    });
  } catch (error) {
    console.error('Failed to fetch trainer meal plans:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch meal plans',
      code: 'SERVER_ERROR'
    });
  }
});

// Save a new meal plan to trainer's library
const saveMealPlanSchema = z.object({
  mealPlanData: z.any(), // MealPlan schema
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
});

trainerRouter.post('/meal-plans', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { mealPlanData, notes, tags, isTemplate } = saveMealPlanSchema.parse(req.body);
    
    const savedPlan = await storage.createTrainerMealPlan({
      trainerId,
      mealPlanData,
      notes,
      tags,
      isTemplate,
    });
    
    res.status(201).json({ 
      mealPlan: savedPlan,
      message: 'Meal plan saved successfully'
    });
  } catch (error) {
    console.error('Failed to save meal plan:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to save meal plan',
      code: 'SERVER_ERROR'
    });
  }
});

// Get a specific meal plan
trainerRouter.get('/meal-plans/:planId', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { planId } = req.params;
    
    const plan = await storage.getTrainerMealPlan(planId);
    
    if (!plan || plan.trainerId !== trainerId) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Meal plan not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Get assignments for this plan
    const assignments = await storage.getMealPlanAssignments(planId);
    
    res.json({ 
      mealPlan: {
        ...plan,
        assignments,
        assignmentCount: assignments.length,
      }
    });
  } catch (error) {
    console.error('Failed to fetch meal plan:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch meal plan',
      code: 'SERVER_ERROR'
    });
  }
});

// Update a meal plan
const updateMealPlanSchema = z.object({
  mealPlanData: z.any().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
});

trainerRouter.put('/meal-plans/:planId', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { planId } = req.params;
    const updates = updateMealPlanSchema.parse(req.body);
    
    // Verify ownership
    const existing = await storage.getTrainerMealPlan(planId);
    if (!existing || existing.trainerId !== trainerId) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Meal plan not found',
        code: 'NOT_FOUND'
      });
    }
    
    const updated = await storage.updateTrainerMealPlan(planId, updates);
    
    res.json({ 
      mealPlan: updated,
      message: 'Meal plan updated successfully'
    });
  } catch (error) {
    console.error('Failed to update meal plan:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to update meal plan',
      code: 'SERVER_ERROR'
    });
  }
});

// Delete a saved meal plan
trainerRouter.delete('/meal-plans/:planId', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { planId } = req.params;
    
    // Verify ownership
    const existing = await storage.getTrainerMealPlan(planId);
    if (!existing || existing.trainerId !== trainerId) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Meal plan not found',
        code: 'NOT_FOUND'
      });
    }
    
    const deleted = await storage.deleteTrainerMealPlan(planId);
    
    if (!deleted) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Meal plan not found',
        code: 'NOT_FOUND'
      });
    }
    
    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Failed to delete meal plan:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to delete meal plan',
      code: 'SERVER_ERROR'
    });
  }
});

// Assign a saved meal plan to a customer
const assignSavedMealPlanSchema = z.object({
  customerId: z.string().uuid(),
  notes: z.string().optional(),
});

trainerRouter.post('/meal-plans/:planId/assign', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { planId } = req.params;
    const { customerId, notes } = assignSavedMealPlanSchema.parse(req.body);
    
    // Verify ownership of meal plan
    const plan = await storage.getTrainerMealPlan(planId);
    if (!plan || plan.trainerId !== trainerId) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Meal plan not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Verify customer exists
    const customer = await storage.getUser(customerId);
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ 
        status: 'error',
        message: 'Customer not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Create assignment
    const assignment = await storage.assignMealPlanToCustomer(planId, customerId, trainerId, notes);
    
    // Also create a personalized meal plan record for backward compatibility
    await storage.assignMealPlanToCustomers(trainerId, plan.mealPlanData as MealPlan, [customerId]);
    
    res.status(201).json({ 
      assignment,
      message: 'Meal plan assigned successfully'
    });
  } catch (error) {
    console.error('Failed to assign meal plan:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to assign meal plan',
      code: 'SERVER_ERROR'
    });
  }
});

// Unassign a meal plan from a customer
trainerRouter.delete('/meal-plans/:planId/assign/:customerId', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { planId, customerId } = req.params;
    
    // Verify ownership of meal plan
    const plan = await storage.getTrainerMealPlan(planId);
    if (!plan || plan.trainerId !== trainerId) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Meal plan not found',
        code: 'NOT_FOUND'
      });
    }
    
    const unassigned = await storage.unassignMealPlanFromCustomer(planId, customerId);
    
    if (!unassigned) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Assignment not found',
        code: 'NOT_FOUND'
      });
    }
    
    res.json({ message: 'Meal plan unassigned successfully' });
  } catch (error) {
    console.error('Failed to unassign meal plan:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to unassign meal plan',
      code: 'SERVER_ERROR'
    });
  }
});

// === Health Protocol Management Routes ===

// Get all health protocols created by this trainer
trainerRouter.get('/health-protocols', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    
    const protocols = await db.select()
      .from(trainerHealthProtocols)
      .where(eq(trainerHealthProtocols.trainerId, trainerId))
      .orderBy(desc(trainerHealthProtocols.createdAt));

    // Get assignment counts for each protocol
    const protocolsWithAssignments = await Promise.all(
      protocols.map(async (protocol) => {
        const assignments = await db.select()
          .from(protocolAssignments)
          .where(eq(protocolAssignments.protocolId, protocol.id));
        
        return {
          ...protocol,
          assignedClients: assignments.map(assignment => ({
            id: assignment.customerId,
            assignedAt: assignment.assignedAt,
            status: assignment.status,
          })),
        };
      })
    );

    res.json(protocolsWithAssignments);
  } catch (error) {
    console.error('Failed to fetch trainer health protocols:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch health protocols',
      code: 'SERVER_ERROR'
    });
  }
});

// Create a new health protocol
trainerRouter.post('/health-protocols', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const protocolData = createHealthProtocolSchema.parse(req.body);

    const [newProtocol] = await db.insert(trainerHealthProtocols)
      .values({
        trainerId,
        name: protocolData.name,
        description: protocolData.description,
        type: protocolData.type,
        duration: protocolData.duration,
        intensity: protocolData.intensity,
        config: protocolData.config,
        tags: protocolData.tags || [],
      })
      .returning();

    res.status(201).json({
      protocol: newProtocol,
      message: 'Health protocol created successfully'
    });
  } catch (error) {
    console.error('Failed to create health protocol:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create health protocol',
      code: 'SERVER_ERROR'
    });
  }
});

// Assign protocol to clients
trainerRouter.post('/health-protocols/assign', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const assignmentData = assignProtocolSchema.parse(req.body);

    // Verify the protocol belongs to this trainer
    const protocol = await db.select()
      .from(trainerHealthProtocols)
      .where(
        and(
          eq(trainerHealthProtocols.id, assignmentData.protocolId),
          eq(trainerHealthProtocols.trainerId, trainerId)
        )
      )
      .limit(1);

    if (protocol.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Protocol not found or not authorized',
        code: 'NOT_FOUND'
      });
    }

    // Verify all clients exist and are customers
    const clients = await db.select()
      .from(users)
      .where(
        and(
          inArray(users.id, assignmentData.clientIds),
          eq(users.role, 'customer')
        )
      );

    if (clients.length !== assignmentData.clientIds.length) {
      return res.status(400).json({
        status: 'error',
        message: 'One or more clients not found',
        code: 'INVALID_CLIENTS'
      });
    }

    // Create assignments for each client
    const assignments = assignmentData.clientIds.map(clientId => ({
      protocolId: assignmentData.protocolId,
      customerId: clientId,
      trainerId,
      startDate: assignmentData.startDate ? new Date(assignmentData.startDate) : new Date(),
      notes: assignmentData.notes || null,
    }));

    const createdAssignments = await db.insert(protocolAssignments)
      .values(assignments)
      .returning();

    res.status(201).json({
      assignments: createdAssignments,
      message: `Protocol assigned to ${assignments.length} client(s) successfully`
    });
  } catch (error) {
    console.error('Failed to assign protocol:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to assign protocol',
      code: 'SERVER_ERROR'
    });
  }
});

export default trainerRouter;