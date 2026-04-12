import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';
import { hashPassword, comparePasswords } from '../auth';

const profileRouter = Router();

const profileUpdateSchema = z.object({
  email: z.string().email().optional(),
  bio: z.string().max(500).nullable().optional(),
  specializations: z.array(z.string().max(80)).max(20).nullable().optional(),
  certifications: z.array(z.string().max(80)).max(20).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(70).nullable().optional(),
  fitnessGoals: z.array(z.string().max(80)).max(20).nullable().optional(),
  dietaryRestrictions: z.array(z.string().max(80)).max(20).nullable().optional(),
  preferredCuisines: z.array(z.string().max(80)).max(20).nullable().optional(),
  activityLevel: z
    .enum([
      'sedentary',
      'lightly_active',
      'moderately_active',
      'very_active',
      'extremely_active',
    ])
    .nullable()
    .optional(),
  age: z.number().int().min(13).max(120).nullable().optional(),
  weight: z.number().min(20).max(500).nullable().optional(),
  height: z.number().min(50).max(300).nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

function serializeProfile(user: any) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name ?? null,
    profilePicture: user.profilePicture ?? null,
    bio: user.bio ?? null,
    specializations: user.specializations ?? [],
    certifications: user.certifications ?? [],
    yearsExperience: user.yearsExperience ?? null,
    fitnessGoals: user.fitnessGoals ?? [],
    dietaryRestrictions: user.dietaryRestrictions ?? [],
    preferredCuisines: user.preferredCuisines ?? [],
    activityLevel: user.activityLevel ?? null,
    age: user.age ?? null,
    weight: user.weight !== null && user.weight !== undefined ? Number(user.weight) : null,
    height: user.height !== null && user.height !== undefined ? Number(user.height) : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Get current user profile
 * GET /api/profile
 */
profileRouter.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json(serializeProfile(user));
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * Update current user profile
 * PUT /api/profile
 *
 * Handles email change, password change, and profile field updates in one call.
 */
profileRouter.put('/', requireAuth, async (req, res) => {
  try {
    const data = profileUpdateSchema.parse(req.body);
    const userId = req.user!.id;

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Password change
    if (data.newPassword) {
      if (!data.currentPassword) {
        return res.status(400).json({
          status: 'error',
          message: 'Current password is required to change password',
          code: 'CURRENT_PASSWORD_REQUIRED',
        });
      }
      if (!user.password) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot change password for OAuth users',
          code: 'OAUTH_USER_PASSWORD_CHANGE',
        });
      }
      const valid = await comparePasswords(data.currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({
          status: 'error',
          message: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD',
        });
      }
      const hashed = await hashPassword(data.newPassword);
      await storage.updateUserPassword(userId, hashed);
    }

    // Email change
    if (data.email && data.email !== user.email) {
      const existing = await storage.getUserByEmail(data.email);
      if (existing && existing.id !== userId) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already in use',
          code: 'EMAIL_IN_USE',
        });
      }
      await storage.updateUserEmail(userId, data.email);
    }

    // Profile field updates
    const profileFields: Record<string, any> = {};
    const updatable = [
      'bio',
      'specializations',
      'certifications',
      'yearsExperience',
      'fitnessGoals',
      'dietaryRestrictions',
      'preferredCuisines',
      'activityLevel',
      'age',
      'weight',
      'height',
    ] as const;
    for (const key of updatable) {
      if (key in data) {
        const value = (data as any)[key];
        // weight/height stored as decimal → string in pg, accept number from API
        profileFields[key] =
          (key === 'weight' || key === 'height') && typeof value === 'number'
            ? value.toString()
            : value;
      }
    }
    if (Object.keys(profileFields).length > 0) {
      await storage.updateUserProfile(userId, profileFields);
    }

    // Return fresh, full profile
    const [refreshed] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: serializeProfile(refreshed),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        code: 'VALIDATION_ERROR',
      });
    }
    console.error('Profile update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      code: 'UPDATE_ERROR',
    });
  }
});

export default profileRouter;
