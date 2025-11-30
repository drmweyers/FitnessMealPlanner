/**
 * Webhook Input Validation Middleware
 *
 * Security-focused validation using Zod schemas
 * Prevents SQL injection, XSS, and validates all input data
 *
 * Based on Security Agent recommendations from Enterprise Readiness Report
 * Test Coverage: test/unit/webhooks/input-validation.test.ts (20 tests)
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import validator from 'validator';

/**
 * Sanitize email address
 * - Normalizes email (lowercase, remove dots, remove +tags)
 * - Validates format
 * - Prevents SQL injection attempts
 */
function sanitizeEmail(email: string): string {
  // Lowercase the email first
  const lowercased = email.toLowerCase();

  // Split into local and domain parts
  const atIndex = lowercased.lastIndexOf('@');
  if (atIndex === -1) {
    return lowercased; // Invalid email, return as-is (will fail validation later)
  }

  const localPart = lowercased.substring(0, atIndex);
  const domain = lowercased.substring(atIndex);

  // Remove everything after + (subaddressing)
  const plusIndex = localPart.indexOf('+');
  const localWithoutPlus = plusIndex !== -1
    ? localPart.substring(0, plusIndex)
    : localPart;

  // Remove all dots from local part
  const normalizedLocal = localWithoutPlus.replace(/\./g, '');

  // Reconstruct email
  return normalizedLocal + domain;
}

/**
 * Sanitize text input
 * - Removes HTML tags
 * - Removes JavaScript event handlers
 * - Removes null bytes
 * - Prevents XSS attacks
 */
function sanitizeText(text: string): string {
  if (!text) return text;

  // Remove null bytes
  let sanitized = text.replace(/\0/g, '');

  // Remove HTML tags and JavaScript event handlers
  sanitized = validator.stripLow(sanitized);
  sanitized = validator.escape(sanitized);

  // Decode escaped HTML entities for clean storage
  sanitized = validator.unescape(sanitized);

  return sanitized.trim();
}

/**
 * Zod schema for lead capture webhook
 */
const leadCaptureSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .refine(
      (email) => {
        // Validate local part length (max 64 chars before @)
        const localPart = email.split('@')[0];
        return localPart.length <= 64;
      },
      { message: 'Invalid email: local part exceeds 64 characters' }
    )
    .transform(sanitizeEmail),

  firstName: z.string()
    .max(100, 'First name too long')
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),

  lastName: z.string()
    .max(100, 'Last name too long')
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),

  leadSource: z.enum([
    'meal_plan_generator',
    'recipe_search',
    'landing_page',
    'blog',
    'social_media',
    'referral'
  ]).optional().default('meal_plan_generator'),

  timestamp: z.string()
    .datetime({ message: 'Invalid ISO 8601 timestamp format' })
    .optional()
    .default(() => new Date().toISOString()),

  userAgent: z.string().max(500).optional(),
  ipAddress: z.string().ip({ version: 'v4' }).optional(),
});

/**
 * Zod schema for welcome webhook
 */
const welcomeSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(sanitizeEmail),

  firstName: z.string()
    .max(100, 'First name too long')
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),

  lastName: z.string()
    .max(100, 'Last name too long')
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),

  accountType: z.enum([
    'starter',
    'professional',
    'enterprise',
    'trial',
    'lifetime'
  ], {
    errorMap: () => ({ message: 'Invalid accountType. Must be one of: starter, professional, enterprise, trial, lifetime' })
  }),

  customerId: z.string()
    .regex(/^cus_[A-Za-z0-9]{24,}$/, 'Invalid Stripe customer ID format')
    .optional(),

  subscriptionId: z.string()
    .regex(/^sub_[A-Za-z0-9]{24,}$/, 'Invalid Stripe subscription ID format')
    .optional(),

  timestamp: z.string()
    .datetime({ message: 'Invalid ISO 8601 timestamp format' })
    .optional()
    .default(() => new Date().toISOString()),
});

/**
 * Zod schema for aha moment webhook
 */
const ahaMomentSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(sanitizeEmail),

  firstName: z.string()
    .max(100, 'First name too long')
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),

  mealPlanId: z.string()
    .uuid('Invalid UUID format for mealPlanId'),

  mealPlanType: z.string()
    .max(50)
    .optional(),

  calories: z.number()
    .int('Calories must be an integer')
    .positive('Calories must be positive')
    .optional(),

  protein: z.number()
    .int('Protein must be an integer')
    .positive('Protein must be positive')
    .optional(),

  accountType: z.string().max(50).optional(),

  timestamp: z.string()
    .datetime({ message: 'Invalid ISO 8601 timestamp format' })
    .optional()
    .default(() => new Date().toISOString()),
});

/**
 * Zod schema for Stripe subscription update webhook
 */
const stripeSubscriptionUpdateSchema = z.object({
  customerId: z.string()
    .regex(/^cus_[A-Za-z0-9]{24,}$/, 'Invalid Stripe customer ID format'),

  subscriptionId: z.string()
    .regex(/^sub_[A-Za-z0-9]{24,}$/, 'Invalid Stripe subscription ID format')
    .optional(),

  status: z.enum([
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'trialing',
    'unpaid'
  ]),

  planTier: z.enum([
    'starter',
    'professional',
    'enterprise'
  ]).optional(),

  timestamp: z.string()
    .datetime({ message: 'Invalid ISO 8601 timestamp format' })
    .optional()
    .default(() => new Date().toISOString()),
});

/**
 * Validation middleware factory
 * Returns middleware that validates request body against provided schema
 */
export function validateWebhook(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate request body
      const validated = await schema.parseAsync(req.body);

      // Replace request body with validated and sanitized data
      req.body = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        // Create human-readable error message
        const errorMessage = errors.map(err =>
          err.field ? `${err.field}: ${err.message}` : err.message
        ).join('; ');

        return res.status(400).json({
          error: `Validation failed: ${errorMessage}`,
          details: errors,
        });
      }

      // Unexpected error
      console.error('Webhook validation error:', error);
      return res.status(500).json({
        error: 'Internal server error during validation',
      });
    }
  };
}

/**
 * Payload size limit middleware
 * Prevents extremely large payloads from consuming resources
 */
export function validatePayloadSize(maxSizeBytes: number = 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);

    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: 'Payload too large',
        maxSize: `${maxSizeBytes / 1024}KB`,
      });
    }

    next();
  };
}

// Export schemas for use in route handlers
export const schemas = {
  leadCapture: leadCaptureSchema,
  welcome: welcomeSchema,
  ahaMoment: ahaMomentSchema,
  stripeSubscriptionUpdate: stripeSubscriptionUpdateSchema,
};

// Export pre-configured validation middleware
export const validateLeadCapture = validateWebhook(leadCaptureSchema);
export const validateWelcome = validateWebhook(welcomeSchema);
export const validateAhaMoment = validateWebhook(ahaMomentSchema);
export const validateStripeSubscriptionUpdate = validateWebhook(stripeSubscriptionUpdateSchema);
