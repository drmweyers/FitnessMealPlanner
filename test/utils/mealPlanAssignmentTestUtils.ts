/**
 * Meal Plan Assignment Test Utilities
 * 
 * Specialized test utilities and mock factories for meal plan assignment functionality:
 * - Mock data factories for meal plans, customers, and assignments
 * - API mock helpers with realistic behavior
 * - Test scenario builders for complex workflows
 * - Query state management helpers
 * - Common assertion helpers for assignment testing
 */

import { vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { TrainerMealPlanWithAssignments, CustomerMealPlan } from '@shared/schema';

export interface MockCustomer {
  id: string;
  email: string;
  role: 'customer';
  firstAssignedAt?: string;
}

export interface MockMealPlanAssignment {
  id: string;
  customerId: string;
  trainerId: string;
  mealPlanData: any;
  assignedAt: string;
}

export interface MockAssignmentState {
  mealPlans: TrainerMealPlanWithAssignments[];
  customers: MockCustomer[];
  assignments: MockMealPlanAssignment[];
}

/**
 * Factory for creating mock trainer meal plans
 */
export const createMockTrainerMealPlan = (
  overrides?: Partial<TrainerMealPlanWithAssignments>
): TrainerMealPlanWithAssignments => ({
  id: `plan-${Math.random().toString(36).substr(2, 9)}`,
  trainerId: 'trainer-1',
  mealPlanData: {
    planName: 'Test Meal Plan',
    fitnessGoal: 'weight_loss',
    days: 7,
    mealsPerDay: 3,
    dailyCalorieTarget: 1800,
    description: 'A test meal plan',
  },
  notes: 'Test notes',
  tags: ['test'],
  isTemplate: false,
  assignmentCount: 0,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

/**
 * Factory for creating mock customers
 */
export const createMockCustomer = (
  overrides?: Partial<MockCustomer>
): MockCustomer => ({
  id: `customer-${Math.random().toString(36).substr(2, 9)}`,
  email: `customer${Math.random().toString(36).substr(2, 5)}@test.com`,
  role: 'customer',
  firstAssignedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

/**
 * Factory for creating mock meal plan assignments
 */
export const createMockAssignment = (
  overrides?: Partial<MockMealPlanAssignment>
): MockMealPlanAssignment => ({
  id: `assignment-${Math.random().toString(36).substr(2, 9)}`,
  customerId: 'customer-1',
  trainerId: 'trainer-1',
  mealPlanData: {
    planName: 'Assigned Meal Plan',
    fitnessGoal: 'weight_loss',
    days: 7,
    dailyCalorieTarget: 1800,
  },
  assignedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a set of meal plans with varying assignment counts
 */
export const createMealPlanSet = (): TrainerMealPlanWithAssignments[] => [
  createMockTrainerMealPlan({
    id: 'plan-weight-loss',
    mealPlanData: {
      planName: 'Weight Loss Plan',
      fitnessGoal: 'weight_loss',
      days: 7,
      mealsPerDay: 3,
      dailyCalorieTarget: 1800,
      description: 'Comprehensive weight loss plan',
    },
    tags: ['weight-loss', 'beginner'],
    assignmentCount: 0,
  }),
  createMockTrainerMealPlan({
    id: 'plan-muscle-gain',
    mealPlanData: {
      planName: 'Muscle Gain Plan',
      fitnessGoal: 'muscle_gain',
      days: 14,
      mealsPerDay: 4,
      dailyCalorieTarget: 2500,
      description: 'High protein muscle building plan',
    },
    tags: ['muscle-gain', 'advanced'],
    isTemplate: true,
    assignmentCount: 2,
  }),
  createMockTrainerMealPlan({
    id: 'plan-maintenance',
    mealPlanData: {
      planName: 'Maintenance Plan',
      fitnessGoal: 'maintenance',
      days: 10,
      mealsPerDay: 3,
      dailyCalorieTarget: 2000,
      description: 'Balanced maintenance plan',
    },
    tags: ['maintenance'],
    assignmentCount: 1,
  }),
];

/**
 * Creates a set of test customers
 */
export const createCustomerSet = (): MockCustomer[] => [
  createMockCustomer({
    id: 'customer-1',
    email: 'customer1@test.com',
    firstAssignedAt: '2024-01-15T10:00:00Z',
  }),
  createMockCustomer({
    id: 'customer-2',
    email: 'customer2@test.com',
    firstAssignedAt: '2024-01-20T15:30:00Z',
  }),
  createMockCustomer({
    id: 'customer-3',
    email: 'customer3@test.com',
    firstAssignedAt: '2024-01-25T09:15:00Z',
  }),
];

/**
 * Assignment State Manager
 * Manages mock assignment state throughout tests
 */
export class AssignmentStateManager {
  private state: MockAssignmentState;

  constructor(initialState?: Partial<MockAssignmentState>) {
    this.state = {
      mealPlans: initialState?.mealPlans || createMealPlanSet(),
      customers: initialState?.customers || createCustomerSet(),
      assignments: initialState?.assignments || [],
    };
  }

  /**
   * Get current state
   */
  getState(): MockAssignmentState {
    return { ...this.state };
  }

  /**
   * Get meal plans with updated assignment counts
   */
  getMealPlansWithCounts(): TrainerMealPlanWithAssignments[] {
    return this.state.mealPlans.map(plan => ({
      ...plan,
      assignmentCount: this.state.assignments.filter(assignment =>
        assignment.mealPlanData.planName === plan.mealPlanData.planName
      ).length,
    }));
  }

  /**
   * Get assignments for a specific customer
   */
  getCustomerAssignments(customerId: string): MockMealPlanAssignment[] {
    return this.state.assignments.filter(assignment => assignment.customerId === customerId);
  }

  /**
   * Add an assignment
   */
  addAssignment(planId: string, customerId: string): MockMealPlanAssignment {
    const plan = this.state.mealPlans.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const assignment = createMockAssignment({
      customerId,
      mealPlanData: plan.mealPlanData,
    });

    this.state.assignments.push(assignment);
    return assignment;
  }

  /**
   * Remove an assignment
   */
  removeAssignment(assignmentId: string): boolean {
    const index = this.state.assignments.findIndex(a => a.id === assignmentId);
    if (index > -1) {
      this.state.assignments.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = {
      mealPlans: createMealPlanSet(),
      customers: createCustomerSet(),
      assignments: [],
    };
  }
}

/**
 * API Mock Builder
 * Creates realistic API mocks for meal plan assignment testing
 */
export class ApiMockBuilder {
  private stateManager: AssignmentStateManager;
  private mockImplementation: any;

  constructor(stateManager: AssignmentStateManager) {
    this.stateManager = stateManager;
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    this.mockImplementation = (method: string, url: string, body?: any) => {
      // GET /api/trainer/meal-plans
      if (method === 'GET' && url === '/api/trainer/meal-plans') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            mealPlans: this.stateManager.getMealPlansWithCounts()
          }),
        } as Response);
      }

      // GET /api/trainer/customers
      if (method === 'GET' && url === '/api/trainer/customers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            customers: this.stateManager.getState().customers
          }),
        } as Response);
      }

      // GET /api/trainer/customers/{id}/meal-plans
      if (method === 'GET' && url.includes('/meal-plans') && url.includes('/customers/')) {
        const customerId = url.split('/customers/')[1].split('/meal-plans')[0];
        const assignments = this.stateManager.getCustomerAssignments(customerId);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            mealPlans: assignments,
            total: assignments.length
          }),
        } as Response);
      }

      // POST /api/trainer/meal-plans/{id}/assign
      if (method === 'POST' && url.includes('/assign')) {
        const planId = url.split('/meal-plans/')[1].split('/assign')[0];
        const { customerId } = body as any;

        try {
          const assignment = this.stateManager.addAssignment(planId, customerId);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              assignment,
              message: 'Meal plan assigned successfully'
            }),
          } as Response);
        } catch (error) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: (error as Error).message }),
          } as Response);
        }
      }

      // DELETE /api/trainer/meal-plans/{id}
      if (method === 'DELETE' && url.includes('/meal-plans/')) {
        const assignmentId = url.split('/meal-plans/')[1];
        const removed = this.stateManager.removeAssignment(assignmentId);
        
        if (removed) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: 'Assignment removed' }),
          } as Response);
        }

        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Assignment not found' }),
        } as Response);
      }

      // Default response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    };
  }

  /**
   * Get the mock implementation
   */
  getMockImplementation() {
    return this.mockImplementation;
  }

  /**
   * Add custom response for specific endpoint
   */
  addCustomResponse(
    method: string,
    urlPattern: string,
    response: any
  ): this {
    const originalImplementation = this.mockImplementation;
    
    this.mockImplementation = (reqMethod: string, reqUrl: string, body?: any) => {
      if (reqMethod === method && reqUrl.includes(urlPattern)) {
        return Promise.resolve(response);
      }
      return originalImplementation(reqMethod, reqUrl, body);
    };

    return this;
  }

  /**
   * Simulate network error for specific endpoint
   */
  addNetworkError(
    method: string,
    urlPattern: string,
    error: Error = new Error('Network error')
  ): this {
    const originalImplementation = this.mockImplementation;
    
    this.mockImplementation = (reqMethod: string, reqUrl: string, body?: any) => {
      if (reqMethod === method && reqUrl.includes(urlPattern)) {
        return Promise.reject(error);
      }
      return originalImplementation(reqMethod, reqUrl, body);
    };

    return this;
  }

  /**
   * Simulate server error for specific endpoint
   */
  addServerError(
    method: string,
    urlPattern: string,
    status: number = 500,
    message: string = 'Server error'
  ): this {
    return this.addCustomResponse(method, urlPattern, {
      ok: false,
      status,
      json: () => Promise.resolve({ error: message }),
    } as Response);
  }
}

/**
 * Test Scenario Builder
 * Creates common test scenarios for meal plan assignment
 */
export class TestScenarioBuilder {
  private stateManager: AssignmentStateManager;
  private apiMockBuilder: ApiMockBuilder;

  constructor() {
    this.stateManager = new AssignmentStateManager();
    this.apiMockBuilder = new ApiMockBuilder(this.stateManager);
  }

  /**
   * Scenario: Fresh trainer with no assignments
   */
  freshTrainer(): this {
    this.stateManager.reset();
    return this;
  }

  /**
   * Scenario: Trainer with existing assignments
   */
  trainerWithAssignments(): this {
    this.stateManager.reset();
    this.stateManager.addAssignment('plan-weight-loss', 'customer-1');
    this.stateManager.addAssignment('plan-muscle-gain', 'customer-1');
    this.stateManager.addAssignment('plan-muscle-gain', 'customer-2');
    return this;
  }

  /**
   * Scenario: No customers available
   */
  noCustomers(): this {
    this.stateManager = new AssignmentStateManager({
      mealPlans: createMealPlanSet(),
      customers: [],
      assignments: [],
    });
    this.apiMockBuilder = new ApiMockBuilder(this.stateManager);
    return this;
  }

  /**
   * Scenario: Assignment API failure
   */
  assignmentFailure(): this {
    this.apiMockBuilder.addServerError('POST', '/assign', 500, 'Assignment failed');
    return this;
  }

  /**
   * Scenario: Customer loading failure
   */
  customerLoadingFailure(): this {
    this.apiMockBuilder.addNetworkError('GET', '/api/trainer/customers');
    return this;
  }

  /**
   * Get the configured state manager
   */
  getStateManager(): AssignmentStateManager {
    return this.stateManager;
  }

  /**
   * Get the configured API mock
   */
  getApiMock() {
    return this.apiMockBuilder.getMockImplementation();
  }
}

/**
 * Query Test Helpers
 */
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
        gcTime: 0,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: process.env.NODE_ENV === 'test' ? () => {} : console.error,
    },
  });
};

/**
 * Assertion Helpers
 */
export const assertionHelpers = {
  /**
   * Assert meal plan assignment count
   */
  expectAssignmentCount: (planName: string, expectedCount: number, container: HTMLElement) => {
    const planElement = container.querySelector(`[data-testid*="${planName}"]`) ||
                       [...container.querySelectorAll('*')].find(el => 
                         el.textContent?.includes(planName)
                       );
    
    if (!planElement) {
      throw new Error(`Meal plan "${planName}" not found`);
    }

    const countText = planElement.textContent || '';
    const countMatch = countText.match(/Assigned to (\d+) customer/);
    const actualCount = countMatch ? parseInt(countMatch[1], 10) : 0;
    
    if (actualCount !== expectedCount) {
      throw new Error(
        `Expected ${planName} to have ${expectedCount} assignments, but found ${actualCount}`
      );
    }
  },

  /**
   * Assert customer meal plan count
   */
  expectCustomerMealPlanCount: (customerEmail: string, expectedCount: number, container: HTMLElement) => {
    const customerElement = [...container.querySelectorAll('*')].find(el => 
      el.textContent?.includes(customerEmail)
    );
    
    if (!customerElement) {
      throw new Error(`Customer "${customerEmail}" not found`);
    }

    // This would need to be implemented based on the actual customer detail view structure
    // For now, this serves as a placeholder for the pattern
  },

  /**
   * Assert toast notification
   */
  expectToastCalled: (mockToast: any, title: string, description?: string) => {
    const calls = mockToast.mock.calls;
    const matchingCall = calls.find((call: any) => {
      const arg = call[0];
      return arg.title === title && (description ? arg.description === description : true);
    });

    if (!matchingCall) {
      throw new Error(
        `Expected toast with title "${title}"${description ? ` and description "${description}"` : ''}, but not found`
      );
    }
  },
};

/**
 * Convenience function to setup a complete test environment
 */
export const setupAssignmentTest = (scenario?: 'fresh' | 'withAssignments' | 'noCustomers' | 'assignmentFailure' | 'customerLoadingFailure') => {
  const builder = new TestScenarioBuilder();

  switch (scenario) {
    case 'fresh':
      builder.freshTrainer();
      break;
    case 'withAssignments':
      builder.trainerWithAssignments();
      break;
    case 'noCustomers':
      builder.noCustomers();
      break;
    case 'assignmentFailure':
      builder.assignmentFailure();
      break;
    case 'customerLoadingFailure':
      builder.customerLoadingFailure();
      break;
    default:
      builder.freshTrainer();
  }

  const queryClient = createTestQueryClient();
  const stateManager = builder.getStateManager();
  const apiMock = builder.getApiMock();

  return {
    queryClient,
    stateManager,
    apiMock,
    builder,
  };
};