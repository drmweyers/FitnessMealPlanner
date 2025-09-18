/**
 * API utility functions for trainer customer detail view feature
 */

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
}

export interface CustomerMeasurement {
  id: string;
  customerId: string;
  measurementDate: string;
  weightLbs?: string;
  bodyFatPercentage?: string;
  chestCm?: string;
  waistCm?: string;
  hipsCm?: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerGoal {
  id: string;
  customerId: string;
  goalType: string;
  goalName: string;
  description?: string;
  targetValue: string;
  targetUnit: string;
  currentValue: string;
  startingValue: string;
  startDate: string;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  progressPercentage: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerMealPlan {
  id: string;
  planName: string;
  fitnessGoal: string;
  description?: string;
  dailyCalorieTarget: number;
  days: number;
  mealsPerDay: number;
  createdAt: string;
  meals?: any[];
}

export interface CustomerContext {
  customerId: string;
  customerEmail: string;
  healthMetrics: CustomerMeasurement[];
  goals: CustomerGoal[];
  recentMeasurements: CustomerMeasurement[];
}

export interface MealPlanData {
  planName: string;
  fitnessGoal: string;
  description?: string;
  dailyCalorieTarget: number;
  days: number;
  mealsPerDay: number;
  meals: any[];
}

/**
 * Validates required parameters
 */
function validateRequired(value: any, name: string): void {
  if (!value) {
    throw new Error(`${name} is required`);
  }
}

/**
 * Makes an authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Fetch customer measurements for trainer view
 */
export async function getTrainerCustomerMeasurements(
  customerId: string
): Promise<ApiResponse<CustomerMeasurement[]>> {
  validateRequired(customerId, 'Customer ID');

  try {
    return await apiRequest<CustomerMeasurement[]>(
      `/trainer/customers/${customerId}/measurements`
    );
  } catch (error) {
    throw new Error('Failed to fetch customer measurements');
  }
}

/**
 * Fetch customer goals for trainer view
 */
export async function getTrainerCustomerGoals(
  customerId: string
): Promise<ApiResponse<CustomerGoal[]>> {
  validateRequired(customerId, 'Customer ID');

  try {
    return await apiRequest<CustomerGoal[]>(
      `/trainer/customers/${customerId}/goals`
    );
  } catch (error) {
    throw new Error('Failed to fetch customer goals');
  }
}

/**
 * Fetch customer meal plans for trainer view
 */
export async function getTrainerCustomerMealPlans(
  customerId: string
): Promise<ApiResponse<CustomerMealPlan[]>> {
  validateRequired(customerId, 'Customer ID');

  try {
    const response = await apiRequest<CustomerMealPlan[]>(
      `/trainer/customers/${customerId}/meal-plans`
    );
    
    // Sort by creation date, most recent first
    if (response.data && Array.isArray(response.data)) {
      response.data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    
    return response;
  } catch (error) {
    throw new Error('Failed to fetch customer meal plans');
  }
}

/**
 * Assign a meal plan to a customer
 */
export async function assignMealPlanToCustomer(
  customerId: string,
  mealPlanData: MealPlanData,
  customerContext?: CustomerContext
): Promise<ApiResponse<{ id: string }>> {
  validateRequired(customerId, 'Customer ID');
  validateRequired(mealPlanData, 'Meal plan data');

  // Validate meal plan structure
  const requiredFields = [
    'planName',
    'fitnessGoal',
    'dailyCalorieTarget',
    'days',
    'mealsPerDay',
  ];

  for (const field of requiredFields) {
    if (!(field in mealPlanData) || mealPlanData[field as keyof MealPlanData] === undefined) {
      throw new Error(`Invalid meal plan data: missing ${field}`);
    }
  }

  // Validate meals structure if present
  if (mealPlanData.meals && Array.isArray(mealPlanData.meals)) {
    for (const meal of mealPlanData.meals) {
      if (!meal.day || !meal.mealNumber || !meal.mealType) {
        throw new Error('Invalid meal data: missing required fields');
      }
    }
  }

  try {
    const body = {
      mealPlanData,
      ...(customerContext && { customerContext }),
    };

    return await apiRequest<{ id: string }>(
      `/trainer/customers/${customerId}/meal-plans`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  } catch (error) {
    throw new Error('Failed to assign meal plan');
  }
}

// ============================================================================
// GROCERY LIST TYPES AND API FUNCTIONS
// ============================================================================

/**
 * Grocery List Item interface
 */
export interface GroceryListItem {
  id: string;
  groceryListId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  estimatedPrice?: number;
  brand?: string;
  recipeId?: string;
  recipeName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Grocery List interface
 */
export interface GroceryList {
  id: string;
  customerId?: string;
  mealPlanId?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items?: GroceryListItem[];
}

/**
 * Input types for creating/updating grocery lists
 */
export interface GroceryListInput {
  name: string;
  mealPlanId?: string;
}

export interface GroceryListItemInput {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  isChecked?: boolean;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  estimatedPrice?: number;
  brand?: string;
  recipeId?: string;
  recipeName?: string;
}

/**
 * API Response types for grocery lists
 */
export interface GroceryListsResponse {
  groceryLists: GroceryList[];
  total: number;
}

export interface GenerateFromMealPlanInput {
  mealPlanId: string;
  listName: string;
}

/**
 * Fetch all grocery lists for the authenticated customer
 */
export async function fetchGroceryLists(): Promise<ApiResponse<GroceryListsResponse>> {
  try {
    return await apiRequest<GroceryListsResponse>('/grocery-lists');
  } catch (error) {
    throw new Error('Failed to fetch grocery lists');
  }
}

/**
 * Fetch a specific grocery list with its items
 */
export async function fetchGroceryList(listId: string): Promise<ApiResponse<GroceryList>> {
  validateRequired(listId, 'List ID');

  try {
    return await apiRequest<GroceryList>(`/grocery-lists/${listId}`);
  } catch (error) {
    throw new Error('Failed to fetch grocery list');
  }
}

/**
 * Create a new grocery list
 */
export async function createGroceryList(data: GroceryListInput): Promise<ApiResponse<GroceryList>> {
  validateRequired(data.name, 'List name');

  try {
    return await apiRequest<GroceryList>('/grocery-lists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw new Error('Failed to create grocery list');
  }
}

/**
 * Update a grocery list
 */
export async function updateGroceryList(
  listId: string,
  updates: Partial<GroceryListInput>
): Promise<ApiResponse<GroceryList>> {
  validateRequired(listId, 'List ID');

  try {
    return await apiRequest<GroceryList>(`/grocery-lists/${listId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    throw new Error('Failed to update grocery list');
  }
}

/**
 * Delete a grocery list
 */
export async function deleteGroceryList(listId: string): Promise<ApiResponse<void>> {
  validateRequired(listId, 'List ID');

  try {
    return await apiRequest<void>(`/grocery-lists/${listId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    throw new Error('Failed to delete grocery list');
  }
}

/**
 * Add an item to a grocery list
 */
export async function addGroceryItem(
  listId: string,
  item: GroceryListItemInput
): Promise<ApiResponse<GroceryListItem>> {
  validateRequired(listId, 'List ID');
  validateRequired(item.name, 'Item name');

  try {
    return await apiRequest<GroceryListItem>(`/grocery-lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  } catch (error) {
    throw new Error('Failed to add grocery item');
  }
}

/**
 * Update a grocery list item
 */
export async function updateGroceryItem(
  listId: string,
  itemId: string,
  updates: Partial<GroceryListItemInput>
): Promise<ApiResponse<GroceryListItem>> {
  validateRequired(listId, 'List ID');
  validateRequired(itemId, 'Item ID');

  try {
    return await apiRequest<GroceryListItem>(`/grocery-lists/${listId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    throw new Error('Failed to update grocery item');
  }
}

/**
 * Delete a grocery list item
 */
export async function deleteGroceryItem(
  listId: string,
  itemId: string
): Promise<ApiResponse<void>> {
  validateRequired(listId, 'List ID');
  validateRequired(itemId, 'Item ID');

  try {
    return await apiRequest<void>(`/grocery-lists/${listId}/items/${itemId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    throw new Error('Failed to delete grocery item');
  }
}

/**
 * Generate a grocery list from a meal plan
 */
export async function generateFromMealPlan(
  data: GenerateFromMealPlanInput
): Promise<ApiResponse<GroceryList>> {
  validateRequired(data.mealPlanId, 'Meal plan ID');
  validateRequired(data.listName, 'List name');

  try {
    return await apiRequest<GroceryList>('/grocery-lists/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw new Error('Failed to generate grocery list from meal plan');
  }
}