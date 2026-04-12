/**
 * FORGE QA Constants — EvoFitMeals
 *
 * Single source of truth for all test credentials, routes, API paths, and tier limits.
 * Every spec file imports from here — never hardcode values.
 */

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------
export const BASE_URL = process.env.BASE_URL || "https://evofitmeals.com";

// ---------------------------------------------------------------------------
// Test Credentials
// ---------------------------------------------------------------------------
export const CREDENTIALS = {
  trainer: {
    email: "trainer.test@evofitmeals.com",
    password: "TestTrainer123!",
  },
  customer: {
    email: "customer.test@evofitmeals.com",
    password: "TestCustomer123!",
  },
  admin: {
    email: "admin@fitmeal.pro",
    password: "AdminPass123",
  },
  // Tier-specific trainer accounts (seeded via seed-tier-test-accounts.ts)
  trainerStarter: {
    email: "trainer.starter@test.com",
    password: "TestPass123!",
  },
  trainerProfessional: {
    email: "trainer.professional@test.com",
    password: "TestPass123!",
  },
  trainerEnterprise: {
    email: "trainer.enterprise@test.com",
    password: "TestPass123!",
  },
} as const;

// ---------------------------------------------------------------------------
// Tier Limits
// ---------------------------------------------------------------------------
export const TIER_LIMITS = {
  starter: { customers: 9, mealPlans: 50, recipes: 1500 },
  professional: { customers: 20, mealPlans: 200, recipes: 3000 },
  enterprise: { customers: -1, mealPlans: -1, recipes: 6000 },
} as const;

// ---------------------------------------------------------------------------
// Frontend Routes
// ---------------------------------------------------------------------------
export const ROUTES = {
  // Public
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  getStarted: "/get-started",
  starter: "/starter",
  professional: "/professional",
  enterprise: "/enterprise",
  freeBlueprint: "/free-blueprint",
  specialOffer: "/special-offer",
  pricing: "/pricing",
  blog: "/blog",

  // Trainer
  trainerDashboard: "/trainer",
  trainerCustomers: "/trainer/customers",
  trainerMealPlans: "/trainer/meal-plans",
  manualMealPlan: "/trainer/manual-meal-plan",
  mealPlanGenerator: "/meal-plan-generator",
  recipes: "/recipes",
  favorites: "/favorites",
  billing: "/billing",
  trainerProfile: "/trainer/profile",

  // Customer
  customerDashboard: "/customer",
  customerMealPlans: "/customer/meal-plans",
  customerProgress: "/customer/progress",
  customerGroceryList: "/customer/grocery-list",
  nutrition: "/nutrition",
  groceryList: "/grocery-list",

  // Admin
  admin: "/admin",
  adminAnalytics: "/admin/analytics",
  adminDashboard: "/admin/dashboard",
  adminBulkGeneration: "/admin/bulk-generation",
  adminProfile: "/admin/profile",

  // Shared
  shared: (token: string) => `/shared/${token}`,
} as const;

// ---------------------------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------------------------
export const API = {
  // Auth
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    register: "/api/auth/register",
    refresh: "/api/auth/refresh",
    me: "/api/auth/me",
  },

  // Profile (current user)
  profile: "/api/profile",

  // Invitations
  invitations: {
    send: "/api/invitations/send",
    accept: "/api/invitations/accept",
    validate: (token: string) => `/api/invitations/validate/${token}`,
    list: "/api/invitations/list",
  },

  // Trainer
  trainer: {
    customers: "/api/trainer/customers",
    customerMealPlans: (customerId: string) =>
      `/api/trainer/customers/${customerId}/meal-plans`,
    customerMeasurements: (customerId: string) =>
      `/api/trainer/customers/${customerId}/measurements`,
    customerGoals: (customerId: string) =>
      `/api/trainer/customers/${customerId}/goals`,
    customerEngagement: (customerId: string) =>
      `/api/trainer/customers/${customerId}/engagement`,
    customerProgressTimeline: (customerId: string) =>
      `/api/trainer/customers/${customerId}/progress-timeline`,
    customerAssignmentHistory: (customerId: string) =>
      `/api/trainer/customers/${customerId}/assignment-history`,
    customerRelationship: (customerId: string) =>
      `/api/trainer/customers/${customerId}/relationship`,
    mealPlans: "/api/trainer/meal-plans",
    mealPlan: (id: string) => `/api/trainer/meal-plans/${id}`,
    mealPlanAssign: (id: string) => `/api/trainer/meal-plans/${id}/assign`,
    mealPlanUnassign: (id: string, customerId: string) =>
      `/api/trainer/meal-plans/${id}/assign/${customerId}`,
    assignMealPlanBulk: "/api/trainer/assign-meal-plan-bulk",
    customerRelationships: "/api/trainer/customer-relationships",
    dashboardStats: "/api/trainer/dashboard-stats",
    profileStats: "/api/trainer/profile/stats",
    assignmentHistory: "/api/trainer/assignment-history",
    assignmentStatistics: "/api/trainer/assignment-statistics",
    assignmentTrends: "/api/trainer/assignment-trends",
    trackAssignment: "/api/trainer/track-assignment",
    exportAssignments: "/api/trainer/export-assignments",
  },

  // Customer
  customer: {
    profileStats: "/api/customer/profile/stats",
  },

  // Meal Plans
  mealPlans: {
    share: (id: string) => `/api/meal-plans/${id}/share`,
    shared: (token: string) => `/api/meal-plans/shared/${token}`,
    generate: "/api/meal-plan/generate",
  },

  // Recipes
  recipes: {
    list: "/api/recipes",
    get: (id: string) => `/api/recipes/${id}`,
  },

  // Favorites
  favorites: "/api/favorites",

  // Progress
  progress: {
    measurements: "/api/progress/measurements",
    measurement: (id: string) => `/api/progress/measurements/${id}`,
    photos: "/api/progress/photos",
    photo: (id: string) => `/api/progress/photos/${id}`,
  },

  // Grocery Lists
  grocery: {
    lists: "/api/grocery-lists",
    list: (id: string) => `/api/grocery-lists/${id}`,
    items: (listId: string) => `/api/grocery-lists/${listId}/items`,
    item: (listId: string, itemId: string) =>
      `/api/grocery-lists/${listId}/items/${itemId}`,
    fromMealPlan: "/api/grocery-lists/from-meal-plan",
    generateFromMealPlan: "/api/grocery-lists/generate-from-meal-plan",
  },

  // PDF
  pdf: {
    export: "/api/pdf/export",
    exportPlan: (planId: string) => `/api/pdf/export/meal-plan/${planId}`,
    exportProgressReport: "/api/pdf/export/progress-report",
  },

  // Tiers
  tiers: {
    publicPricing: "/api/v1/tiers/public/pricing",
    purchase: "/api/v1/tiers/purchase",
    upgrade: "/api/v1/tiers/upgrade",
    cancel: "/api/v1/tiers/cancel",
    current: "/api/v1/tiers/current",
    usage: "/api/v1/tiers/usage",
    billingPortal: "/api/v1/tiers/billing-portal",
  },

  // Entitlements
  entitlements: "/api/entitlements",

  // Usage
  usage: {
    stats: "/api/usage/stats",
    history: "/api/usage/history",
    analytics: "/api/usage/analytics",
  },

  // Admin
  admin: {
    customers: "/api/admin/customers",
    generate: "/api/admin/generate",
    generateRecipes: "/api/admin/generate-recipes",
    generateBmad: "/api/admin/generate-bmad",
    bmadProgress: (batchId: string) => `/api/admin/bmad-progress/${batchId}`,
    bmadMetrics: "/api/admin/bmad-metrics",
    apiUsage: "/api/admin/api-usage",
    assignRecipe: "/api/admin/assign-recipe",
    assignMealPlan: "/api/admin/assign-meal-plan",
  },

  // Health
  health: "/api/health",
} as const;

// ---------------------------------------------------------------------------
// Seed State Interface
// ---------------------------------------------------------------------------
export interface SeedState {
  trainerUserId: string;
  customerUserId: string;
  adminUserId: string;
  planIds: {
    weightLoss: string;
    muscleGain: string;
    balanced: string;
  };
  assignmentIds: {
    primary: string;
  };
  shareToken: string;
  groceryListId: string;
  measurementIds: string[];
  recipeIds: string[];
  favoritedRecipeId: string;
}

// ---------------------------------------------------------------------------
// Auth State Paths
// ---------------------------------------------------------------------------
export const AUTH_STATE = {
  trainer: "tests/e2e/auth-state/trainer.json",
  customer: "tests/e2e/auth-state/client.json",
  admin: "tests/e2e/auth-state/admin.json",
} as const;

// ---------------------------------------------------------------------------
// Timeouts
// ---------------------------------------------------------------------------
export const TIMEOUTS = {
  action: 15_000,
  navigation: 30_000,
  api: 10_000,
  sse: 60_000,
} as const;
