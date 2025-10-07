/**
 * Grocery Lists API Routes
 *
 * Defines all HTTP endpoints for grocery list operations.
 * Requires customer authentication for all endpoints.
 * Provides comprehensive CRUD operations and meal plan integration.
 *
 * Endpoints:
 * - GET /api/grocery-lists - Get all customer grocery lists
 * - GET /api/grocery-lists/:id - Get specific grocery list with items
 * - POST /api/grocery-lists - Create new grocery list
 * - PUT /api/grocery-lists/:id - Update grocery list
 * - DELETE /api/grocery-lists/:id - Delete grocery list
 * - POST /api/grocery-lists/:id/items - Add item to grocery list
 * - PUT /api/grocery-lists/:id/items/:itemId - Update grocery list item
 * - DELETE /api/grocery-lists/:id/items/:itemId - Delete grocery list item
 * - POST /api/grocery-lists/from-meal-plan - Generate grocery list from meal plan
 *
 * @author FitnessMealPlanner Team
 * @since 1.0.0
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getGroceryLists,
  getGroceryList,
  createGroceryList,
  updateGroceryList,
  deleteGroceryList,
  addGroceryListItem,
  updateGroceryListItem,
  deleteGroceryListItem,
  generateGroceryListFromMealPlan,
  generateEnhancedGroceryListFromMealPlan,
} from '../controllers/groceryListController';

const router = express.Router();

// All routes require customer authentication
const requireCustomer = requireRole('customer');

/**
 * Grocery Lists CRUD Operations
 */

// GET /api/grocery-lists
// Get all grocery lists for the authenticated customer
// Returns array of grocery lists with item counts
router.get('/', requireCustomer, getGroceryLists);

// GET /api/grocery-lists/:id
// Get a specific grocery list with all its items
// Returns grocery list object with items array
router.get('/:id', requireCustomer, getGroceryList);

// POST /api/grocery-lists
// Create a new grocery list for the authenticated customer
// Body: { name: string }
// Returns created grocery list
router.post('/', requireCustomer, createGroceryList);

// PUT /api/grocery-lists/:id
// Update an existing grocery list
// Body: { name?: string }
// Returns updated grocery list
router.put('/:id', requireCustomer, updateGroceryList);

// DELETE /api/grocery-lists/:id
// Delete a grocery list and all its items
// Returns success confirmation
router.delete('/:id', requireCustomer, deleteGroceryList);

/**
 * Grocery List Items CRUD Operations
 */

// POST /api/grocery-lists/:id/items
// Add a new item to a grocery list
// Body: GroceryListItemInput (see schema)
// Returns created item
router.post('/:id/items', requireCustomer, addGroceryListItem);

// PUT /api/grocery-lists/:id/items/:itemId
// Update a specific grocery list item
// Body: Partial<GroceryListItemInput>
// Returns updated item
router.put('/:id/items/:itemId', requireCustomer, updateGroceryListItem);

// DELETE /api/grocery-lists/:id/items/:itemId
// Delete a specific grocery list item
// Returns success confirmation
router.delete('/:id/items/:itemId', requireCustomer, deleteGroceryListItem);

/**
 * Meal Plan Integration
 */

// POST /api/grocery-lists/from-meal-plan
// Generate a grocery list from an existing meal plan (legacy endpoint)
// Body: { mealPlanId: string, listName?: string }
// Returns created grocery list with generated items
router.post('/from-meal-plan', requireCustomer, generateGroceryListFromMealPlan);

// POST /api/grocery-lists/generate-from-meal-plan
// Enhanced grocery list generation with smart aggregation and unit conversion
// Body: { mealPlanId: string, listName?: string, includeAllIngredients?: boolean, aggregateQuantities?: boolean, roundUpQuantities?: boolean }
// Returns created grocery list with enhanced processing summary
router.post('/generate-from-meal-plan', requireCustomer, generateEnhancedGroceryListFromMealPlan);

export { router as groceryListsRouter };