/**
 * Comprehensive Input Validation Schemas
 * 
 * Centralized validation schemas using Zod for all API endpoints
 * to ensure data integrity and security.
 */

import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Invalid email format').max(254);
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const uuidSchema = z.string().uuid('Invalid UUID format');
const nameSchema = z.string().min(1).max(100).regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters');
const urlSchema = z.string().url('Invalid URL format').max(2048);

// User-related schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema.optional(),
  role: z.enum(['admin', 'trainer', 'customer']).default('customer'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  profilePicture: urlSchema.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const confirmResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

// Recipe-related schemas
export const createRecipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required').max(200),
  description: z.string().max(2000).optional(),
  instructions: z.string().min(1, 'Instructions are required').max(10000),
  ingredients: z.string().min(1, 'Ingredients are required').max(5000),
  prepTimeMinutes: z.number().int().min(0).max(1440), // Max 24 hours
  cookTimeMinutes: z.number().int().min(0).max(1440),
  servings: z.number().int().min(1).max(50),
  caloriesKcal: z.number().min(0).max(10000),
  proteinGrams: z.number().min(0).max(500),
  carbsGrams: z.number().min(0).max(1000),
  fatGrams: z.number().min(0).max(500),
  fiberGrams: z.number().min(0).max(200).optional(),
  sugarGrams: z.number().min(0).max(500).optional(),
  sodiumMg: z.number().min(0).max(50000).optional(),
  dietaryTags: z.array(z.string().max(50)).max(20).optional(),
  mealTypes: z.array(z.enum(['breakfast', 'lunch', 'dinner', 'snack'])).min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  cuisine: z.string().max(50).optional(),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export const recipeSearchSchema = z.object({
  query: z.string().max(200).optional(),
  cuisines: z.array(z.string().max(50)).max(10).optional(),
  dietaryTags: z.array(z.string().max(50)).max(10).optional(),
  mealTypes: z.array(z.enum(['breakfast', 'lunch', 'dinner', 'snack'])).max(4).optional(),
  minCalories: z.number().int().min(0).max(10000).optional(),
  maxCalories: z.number().int().min(0).max(10000).optional(),
  minProtein: z.number().min(0).max(500).optional(),
  maxProtein: z.number().min(0).max(500).optional(),
  maxPrepTime: z.number().int().min(0).max(1440).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  sortBy: z.enum(['name', 'calories', 'protein', 'prepTime', 'rating', 'created']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Meal plan schemas
export const createMealPlanSchema = z.object({
  name: z.string().min(1, 'Meal plan name is required').max(200),
  description: z.string().max(1000).optional(),
  customerId: uuidSchema.optional(),
  targetCalories: z.number().int().min(500).max(5000),
  targetProtein: z.number().min(0).max(500).optional(),
  targetCarbs: z.number().min(0).max(1000).optional(),
  targetFat: z.number().min(0).max(500).optional(),
  daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).min(1),
  mealsPerDay: z.number().int().min(1).max(8),
  restrictions: z.array(z.string().max(50)).max(20).optional(),
  preferences: z.array(z.string().max(50)).max(20).optional(),
});

export const updateMealPlanSchema = createMealPlanSchema.partial();

export const mealPlanGenerationSchema = z.object({
  customerId: uuidSchema,
  planName: z.string().min(1).max(200),
  targetCalories: z.number().int().min(800).max(5000),
  durationDays: z.number().int().min(1).max(90),
  mealsPerDay: z.number().int().min(2).max(6),
  dietaryRestrictions: z.array(z.string().max(50)).max(10).optional(),
  cuisinePreferences: z.array(z.string().max(50)).max(10).optional(),
  excludeIngredients: z.array(z.string().max(50)).max(20).optional(),
  proteinTarget: z.number().min(0).max(500).optional(),
  carbTarget: z.number().min(0).max(1000).optional(),
  fatTarget: z.number().min(0).max(500).optional(),
});

// Customer invitation schemas
export const inviteCustomerSchema = z.object({
  email: emailSchema,
  name: nameSchema.optional(),
  message: z.string().max(500).optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  password: passwordSchema,
  name: nameSchema.optional(),
});

// Progress tracking schemas
export const logProgressSchema = z.object({
  weight: z.number().min(20).max(500).optional(), // kg
  bodyFatPercentage: z.number().min(0).max(100).optional(),
  muscleMass: z.number().min(0).max(200).optional(), // kg
  measurements: z.object({
    chest: z.number().min(0).max(200).optional(), // cm
    waist: z.number().min(0).max(200).optional(),
    hips: z.number().min(0).max(200).optional(),
    thigh: z.number().min(0).max(100).optional(),
    bicep: z.number().min(0).max(100).optional(),
  }).optional(),
  notes: z.string().max(1000).optional(),
});

export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetValue: z.number().min(0).max(1000),
  unit: z.string().max(20),
  targetDate: z.string().datetime().optional(),
  milestoneType: z.enum(['weight_loss', 'strength_gain', 'consistency', 'custom']),
});

// Rating and feedback schemas
export const rateRecipeSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

export const rateMealPlanSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

// Admin schemas
export const bulkActionSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
  action: z.enum(['approve', 'unapprove', 'delete']),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(['admin', 'trainer', 'customer']).optional(),
  active: z.boolean().optional(),
});

// File upload schemas
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.string().regex(/^(image\/(jpeg|jpg|png|gif|webp))|(application\/pdf)$/, 'Invalid file type'),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
});

// Analytics schemas
export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  metrics: z.array(z.string()).max(20).optional(),
});

// Pagination schema (reusable)
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Common query filters
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const searchSchema = z.object({
  query: z.string().max(200).optional(),
  filters: z.record(z.any()).optional(),
});

// Validation helper functions
export const validateRequest = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedError = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        throw new ValidationError('Validation failed', formattedError);
      }
      throw error;
    }
  };
};

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}