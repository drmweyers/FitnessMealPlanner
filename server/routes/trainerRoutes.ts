/**
 * @fileoverview Trainer Routes Module
 * 
 * This module provides API endpoints for trainer-specific functionality including
 * profile statistics, customer management, meal plan assignments, and progress tracking.
 * All routes require trainer authentication and role-based authorization.
 * 
 * @module trainerRoutes
 * @requires express
 * @requires drizzle-orm
 * @requires ../middleware/auth
 * @requires ../storage
 * @requires ../db
 */

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
  type MealPlan
} from '@shared/schema';
import { db } from '../db';
import { z } from 'zod';
import { manualMealPlanService, type ManualMealEntry } from '../services/manualMealPlanService';

const trainerRouter = Router();

/**
 * Get Trainer Profile Statistics
 * 
 * Retrieves comprehensive statistics for the authenticated trainer including:
 * - Total number of unique clients
 * - Number of meal plans created
 * - Number of recipes assigned
 * - Client activity metrics
 * 
 * @route GET /api/trainer/profile/stats
 * @access Private (Trainer only)
 * @returns {Object} Profile statistics object
 * @returns {number} returns.totalClients - Total unique clients
 * @returns {number} returns.mealPlansCreated - Total meal plans created
 * @returns {number} returns.recipesAssigned - Total recipes assigned
 * @returns {number} returns.activeClients - Clients with recent activity
 * 
 * @example
 * // Response
 * {
 *   "totalClients": 15,
 *   "mealPlansCreated": 45,
 *   "recipesAssigned": 120,
 *   "activeClients": 12
 * }
 */
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
    
    // Import customerInvitations and mealPlanAssignments if not already imported
    const { customerInvitations, mealPlanAssignments } = await import('@shared/schema');
    
    // Get customers who have accepted invitations from this trainer
    const invitedCustomers = await db.select({
      customerId: users.id,
      customerEmail: users.email,
      invitedAt: customerInvitations.createdAt,
    })
    .from(customerInvitations)
    .innerJoin(users, eq(users.email, customerInvitations.customerEmail))
    .where(
      and(
        eq(customerInvitations.trainerId, trainerId),
        sql`${customerInvitations.usedAt} IS NOT NULL`,
        eq(users.role, 'customer')
      )
    );
    
    // Get customers from meal_plan_assignments table (new trainer_meal_plans workflow)
    const customersFromAssignments = await db.select({
      customerId: mealPlanAssignments.customerId,
      customerEmail: users.email,
      assignedAt: mealPlanAssignments.assignedAt,
    })
    .from(mealPlanAssignments)
    .innerJoin(users, eq(users.id, mealPlanAssignments.customerId))
    .where(eq(mealPlanAssignments.assignedBy, trainerId));
    
    // Get unique customers who have meal plans assigned by this trainer
    const customersWithMealPlans = await db.select({
      customerId: personalizedMealPlans.customerId,
      customerEmail: users.email,
      assignedAt: personalizedMealPlans.assignedAt,
    })
    .from(personalizedMealPlans)
    .innerJoin(users, eq(users.id, personalizedMealPlans.customerId))
    .where(eq(personalizedMealPlans.trainerId, trainerId));

    // No personalizedRecipes table - just use empty array
    const customersWithRecipes: any[] = [];
    
    // If recipeId is provided, get customers who have this specific recipe assigned
    let customersWithThisRecipe = new Set();
    if (recipeId) {
      // Since we don't have personalizedRecipes table, skip this
      // In future, we could check meal plan recipes
      customersWithThisRecipe = new Set();
    }
    
    // Combine and deduplicate customers from all sources
    const customerMap = new Map();
    
    // First add invited customers
    invitedCustomers.forEach(customer => {
      customerMap.set(customer.customerId, {
        id: customer.customerId,
        email: customer.customerEmail,
        role: 'customer',
        firstAssignedAt: customer.invitedAt,
        hasRecipe: recipeId ? customersWithThisRecipe.has(customer.customerId) : false,
        hasMealPlan: false, // Will be updated if they have meal plans
      });
    });
    
    // Add customers from meal_plan_assignments (new workflow)
    customersFromAssignments.forEach(customer => {
      if (!customerMap.has(customer.customerId)) {
        customerMap.set(customer.customerId, {
          id: customer.customerId,
          email: customer.customerEmail,
          role: 'customer',
          firstAssignedAt: customer.assignedAt,
          hasRecipe: recipeId ? customersWithThisRecipe.has(customer.customerId) : false,
          hasMealPlan: true, // They have a meal plan from the new assignments table
        });
      } else {
        const existing = customerMap.get(customer.customerId);
        existing.hasMealPlan = true;
        if (customer.assignedAt && existing.firstAssignedAt && customer.assignedAt < existing.firstAssignedAt) {
          existing.firstAssignedAt = customer.assignedAt;
        }
      }
    });
    
    // Then add/update with customers who have assignments from old workflow
    [...customersWithMealPlans, ...customersWithRecipes].forEach(customer => {
      if (!customerMap.has(customer.customerId)) {
        customerMap.set(customer.customerId, {
          id: customer.customerId,
          email: customer.customerEmail,
          role: 'customer',
          firstAssignedAt: customer.assignedAt,
          hasRecipe: recipeId ? customersWithThisRecipe.has(customer.customerId) : false,
          hasMealPlan: customersWithMealPlans.some(c => c.customerId === customer.customerId),
        });
      } else {
        const existing = customerMap.get(customer.customerId);
        if (customer.assignedAt && existing.firstAssignedAt && customer.assignedAt < existing.firstAssignedAt) {
          existing.firstAssignedAt = customer.assignedAt;
        }
        // Update hasMealPlan flag if this customer has meal plans
        if (customersWithMealPlans.some(c => c.customerId === customer.customerId)) {
          existing.hasMealPlan = true;
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
    
    // Create assignment (single source of truth - no duplication)
    const assignment = await storage.assignMealPlanToCustomer(planId, customerId, trainerId, notes);

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

// === Story 1.5: Enhanced Trainer-Customer Relationship Management ===

import { customerRelationshipManager } from '../services/customerRelationshipManager';
import { assignmentHistoryTracker } from '../services/assignmentHistoryTracker';

// Get comprehensive customer relationships with engagement metrics
trainerRouter.get('/customer-relationships', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const filters = {
      status: req.query.status as any,
      engagementLevel: req.query.engagementLevel as any,
      hasRecentActivity: req.query.hasRecentActivity === 'true',
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      search: req.query.search as string
    };

    const relationships = await customerRelationshipManager.getCustomerRelationships(trainerId, filters);

    res.json({
      status: 'success',
      data: {
        relationships,
        total: relationships.length
      }
    });
  } catch (error) {
    console.error('Failed to get customer relationships:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customer relationships',
      code: 'SERVER_ERROR'
    });
  }
});

// Get customer engagement metrics
trainerRouter.get('/customers/:customerId/engagement', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;

    const metrics = await customerRelationshipManager.getCustomerEngagementMetrics(trainerId, customerId);

    res.json({
      status: 'success',
      data: metrics
    });
  } catch (error) {
    console.error('Failed to get customer engagement metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch engagement metrics',
      code: 'SERVER_ERROR'
    });
  }
});

// Get trainer dashboard with comprehensive stats
trainerRouter.get('/dashboard-stats', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const stats = await customerRelationshipManager.getTrainerDashboardStats(trainerId);

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard statistics',
      code: 'SERVER_ERROR'
    });
  }
});

// Update customer relationship notes and tags
trainerRouter.put('/customers/:customerId/relationship', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;
    const { notes, tags } = req.body;

    await customerRelationshipManager.updateCustomerRelationshipNotes(trainerId, customerId, notes, tags);

    res.json({
      status: 'success',
      message: 'Customer relationship updated successfully'
    });
  } catch (error) {
    console.error('Failed to update customer relationship:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update customer relationship',
      code: 'SERVER_ERROR'
    });
  }
});

// Get customer progress timeline
trainerRouter.get('/customers/:customerId/progress-timeline', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;
    const days = parseInt(req.query.days as string) || 90;

    const timeline = await customerRelationshipManager.getCustomerProgressTimeline(trainerId, customerId, days);

    res.json({
      status: 'success',
      data: timeline
    });
  } catch (error) {
    console.error('Failed to get progress timeline:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch progress timeline',
      code: 'SERVER_ERROR'
    });
  }
});

// Get assignment history with advanced filtering
trainerRouter.get('/assignment-history', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const filters = {
      trainerId,
      customerId: req.query.customerId as string,
      type: req.query.type as any,
      status: req.query.status as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const history = await assignmentHistoryTracker.getAssignmentHistory(filters);

    res.json({
      status: 'success',
      data: {
        assignments: history,
        total: history.length
      }
    });
  } catch (error) {
    console.error('Failed to get assignment history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch assignment history',
      code: 'SERVER_ERROR'
    });
  }
});

// Get assignment statistics
trainerRouter.get('/assignment-statistics', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const days = parseInt(req.query.days as string) || 30;

    const statistics = await assignmentHistoryTracker.getAssignmentStatistics(trainerId, days);

    res.json({
      status: 'success',
      data: statistics
    });
  } catch (error) {
    console.error('Failed to get assignment statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch assignment statistics',
      code: 'SERVER_ERROR'
    });
  }
});

// Get assignment trends
trainerRouter.get('/assignment-trends', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const period = req.query.period as any || 'weekly';
    const duration = parseInt(req.query.duration as string) || 12;

    const trends = await assignmentHistoryTracker.getAssignmentTrends(trainerId, period, duration);

    res.json({
      status: 'success',
      data: trends
    });
  } catch (error) {
    console.error('Failed to get assignment trends:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch assignment trends',
      code: 'SERVER_ERROR'
    });
  }
});

// Track new assignment (enhanced)
trainerRouter.post('/track-assignment', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { type, customerId, data, notes } = req.body;

    const assignment = await assignmentHistoryTracker.trackAssignment(
      type,
      trainerId,
      customerId,
      data,
      notes
    );

    res.status(201).json({
      status: 'success',
      data: assignment
    });
  } catch (error) {
    console.error('Failed to track assignment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track assignment',
      code: 'SERVER_ERROR'
    });
  }
});

// Export assignment history
trainerRouter.get('/export-assignments', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const format = req.query.format as 'json' | 'csv' || 'json';
    const filters = {
      customerId: req.query.customerId as string,
      type: req.query.type as any,
      status: req.query.status as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const exported = await assignmentHistoryTracker.exportAssignmentHistory(trainerId, format, filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="assignment-history.csv"');
      res.send(exported);
    } else {
      res.json({
        status: 'success',
        data: exported
      });
    }
  } catch (error) {
    console.error('Failed to export assignments:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export assignment history',
      code: 'SERVER_ERROR'
    });
  }
});

// Get specific customer assignment history
trainerRouter.get('/customers/:customerId/assignment-history', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;

    const history = await assignmentHistoryTracker.getCustomerAssignmentHistory(trainerId, customerId);

    res.json({
      status: 'success',
      data: {
        assignments: history,
        total: history.length
      }
    });
  } catch (error) {
    console.error('Failed to get customer assignment history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customer assignment history',
      code: 'SERVER_ERROR'
    });
  }
});

// Update customer relationship status (active/paused/inactive)
trainerRouter.put('/customers/:customerId/status', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { customerId } = req.params;
    const { status, reason } = req.body;

    await customerRelationshipManager.updateCustomerRelationshipStatus(trainerId, customerId, status, reason);

    res.json({
      status: 'success',
      message: 'Customer status updated successfully'
    });
  } catch (error) {
    console.error('Failed to update customer status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update customer status',
      code: 'SERVER_ERROR'
    });
  }
});

// =============================================================================
// MANUAL MEAL PLAN CREATION (Story 1.0 - URGENT P0)
// =============================================================================

/**
 * Parse Manual Meal Entries
 *
 * Parses free-form meal entry text into structured meals with auto-detected categories
 *
 * @route POST /api/trainer/parse-manual-meals
 * @access Private (Trainer only)
 * @body {string} text - Free-form meal entry text (one meal per line)
 * @returns {Object} Parsed meals with auto-detected categories
 */
const parseMealSchema = z.object({
  text: z.string().min(1, 'Meal text is required').max(10000, 'Text too long')
});

trainerRouter.post('/parse-manual-meals', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const { text } = parseMealSchema.parse(req.body);

    const meals = manualMealPlanService.parseMealEntries(text);

    if (meals.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid meals found in text',
        code: 'NO_MEALS_FOUND'
      });
    }

    res.json({
      status: 'success',
      data: {
        meals,
        count: meals.length
      }
    });
  } catch (error) {
    console.error('Failed to parse meals:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to parse meals',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Create Manual Meal Plan
 *
 * Creates a manual meal plan with category-based images (zero AI costs)
 *
 * @route POST /api/trainer/manual-meal-plan
 * @access Private (Trainer only)
 * @body {string} planName - Name of the meal plan
 * @body {Array} meals - Array of manual meal entries with categories
 * @body {string} notes - Optional notes for the meal plan
 * @body {Array<string>} tags - Optional tags for organization
 * @body {boolean} isTemplate - Whether this is a reusable template
 * @returns {Object} Created meal plan with images
 */
const manualMealPlanSchema = z.object({
  planName: z.string().min(1, 'Plan name is required').max(100, 'Plan name too long'),
  meals: z.array(z.object({
    mealName: z.string().min(1).max(200),
    category: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
    description: z.string().optional(),
    ingredients: z.array(z.object({
      ingredient: z.string(),
      amount: z.string(),
      unit: z.string()
    })).optional(),
    instructions: z.string().optional()
  })).min(1, 'At least one meal is required').max(50, 'Maximum 50 meals per plan'),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional().default(false)
});

trainerRouter.post('/manual-meal-plan', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const trainerId = req.user!.id;
    const { planName, meals, notes, tags, isTemplate } = manualMealPlanSchema.parse(req.body);

    // Create manual meal plan with category images
    const mealPlan = await manualMealPlanService.createManualMealPlan(
      meals,
      trainerId,
      planName
    );

    // Save to database
    const savedPlan = await storage.createTrainerMealPlan({
      trainerId,
      mealPlanData: mealPlan as any,
      notes: notes || 'Manual meal plan created by trainer',
      tags: tags || [],
      isTemplate: isTemplate || false
    });

    res.status(201).json({
      status: 'success',
      data: savedPlan,
      message: 'Manual meal plan created successfully'
    });
  } catch (error) {
    console.error('Failed to create manual meal plan:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create manual meal plan',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Get Category Image Pool Health
 *
 * Returns health statistics for the category image pools
 * Useful for monitoring and admin dashboard
 *
 * @route GET /api/trainer/category-image-pool-health
 * @access Private (Trainer only)
 * @returns {Object} Image pool health statistics
 */
trainerRouter.get('/category-image-pool-health', requireAuth, requireRole('trainer'), async (req, res) => {
  try {
    const health = await manualMealPlanService.validateCategoryImagePool();

    res.json({
      status: 'success',
      data: health
    });
  } catch (error) {
    console.error('Failed to check image pool health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check image pool health',
      code: 'SERVER_ERROR'
    });
  }
});

export default trainerRouter;