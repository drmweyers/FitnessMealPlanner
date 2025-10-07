import express from 'express';
import { db } from '../db';
import { sharedMealPlans, trainerMealPlans, users } from '@shared/schema';
import { requireAuth } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';
import { createShareSchema, updateShareSchema } from '@shared/schema';
import type { CreateShare, UpdateShare } from '@shared/schema';
import { z } from 'zod';

const mealPlanSharingRouter = express.Router();

/**
 * POST /api/meal-plans/:id/share
 * Generate a shareable link for a meal plan
 */
mealPlanSharingRouter.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const mealPlanId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate the request body
    const validationResult = createShareSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.errors 
      });
    }

    // Verify the meal plan exists and belongs to the user
    const [mealPlan] = await db
      .select()
      .from(trainerMealPlans)
      .where(and(
        eq(trainerMealPlans.id, mealPlanId),
        eq(trainerMealPlans.trainerId, userId)
      ))
      .limit(1);

    if (!mealPlan) {
      return res.status(404).json({ 
        error: 'Meal plan not found or you do not have permission to share it' 
      });
    }

    // Check if there's already an active share for this meal plan
    const [existingShare] = await db
      .select()
      .from(sharedMealPlans)
      .where(and(
        eq(sharedMealPlans.mealPlanId, mealPlanId),
        eq(sharedMealPlans.isActive, true)
      ))
      .limit(1);

    if (existingShare) {
      // Return the existing share instead of creating a new one
      const shareUrl = `${req.protocol}://${req.get('host')}/shared/${existingShare.shareToken}`;
      return res.json({
        shareToken: existingShare.shareToken,
        shareUrl,
        expiresAt: existingShare.expiresAt,
        viewCount: existingShare.viewCount,
        createdAt: existingShare.createdAt,
        message: 'Share link already exists'
      });
    }

    // Parse expiration date if provided
    const expiresAt = validationResult.data.expiresAt 
      ? new Date(validationResult.data.expiresAt)
      : null;

    // Set default expiration to 30 days from now if not specified
    const defaultExpiresAt = new Date();
    defaultExpiresAt.setDate(defaultExpiresAt.getDate() + 30);

    // Create the new share
    const [newShare] = await db
      .insert(sharedMealPlans)
      .values({
        mealPlanId,
        createdBy: userId,
        expiresAt: expiresAt || defaultExpiresAt,
        viewCount: 0,
        isActive: true,
      })
      .returning();

    const shareUrl = `${req.protocol}://${req.get('host')}/shared/${newShare.shareToken}`;

    res.status(201).json({
      shareToken: newShare.shareToken,
      shareUrl,
      expiresAt: newShare.expiresAt,
      viewCount: newShare.viewCount,
      createdAt: newShare.createdAt,
      message: 'Share link created successfully'
    });

  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

/**
 * GET /api/shared/:token
 * View a shared meal plan (public access, no authentication required)
 */
mealPlanSharingRouter.get('/shared/:token', async (req, res) => {
  try {
    const shareToken = req.params.token;

    // Validate that the token is a valid UUID
    if (!z.string().uuid().safeParse(shareToken).success) {
      return res.status(400).json({ error: 'Invalid share token format' });
    }

    // Find the shared meal plan with all related data
    const [sharedMealPlan] = await db
      .select({
        id: sharedMealPlans.id,
        shareToken: sharedMealPlans.shareToken,
        expiresAt: sharedMealPlans.expiresAt,
        viewCount: sharedMealPlans.viewCount,
        isActive: sharedMealPlans.isActive,
        createdAt: sharedMealPlans.createdAt,
        mealPlanData: trainerMealPlans.mealPlanData,
        mealPlanNotes: trainerMealPlans.notes,
        mealPlanTags: trainerMealPlans.tags,
        createdByName: users.name,
        createdByEmail: users.email,
      })
      .from(sharedMealPlans)
      .innerJoin(trainerMealPlans, eq(sharedMealPlans.mealPlanId, trainerMealPlans.id))
      .innerJoin(users, eq(sharedMealPlans.createdBy, users.id))
      .where(eq(sharedMealPlans.shareToken, shareToken))
      .limit(1);

    if (!sharedMealPlan) {
      return res.status(404).json({ error: 'Shared meal plan not found' });
    }

    // Check if the share is still active
    if (!sharedMealPlan.isActive) {
      return res.status(410).json({ error: 'This shared meal plan is no longer available' });
    }

    // Check if the share has expired
    if (sharedMealPlan.expiresAt && sharedMealPlan.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This shared meal plan has expired' });
    }

    // Increment view count
    await db
      .update(sharedMealPlans)
      .set({ 
        viewCount: sharedMealPlan.viewCount + 1,
        updatedAt: new Date()
      })
      .where(eq(sharedMealPlans.shareToken, shareToken));

    // Return the shared meal plan data
    res.json({
      shareToken: sharedMealPlan.shareToken,
      mealPlan: sharedMealPlan.mealPlanData,
      notes: sharedMealPlan.mealPlanNotes,
      tags: sharedMealPlan.mealPlanTags,
      viewCount: sharedMealPlan.viewCount + 1, // Include the incremented count
      createdAt: sharedMealPlan.createdAt,
      expiresAt: sharedMealPlan.expiresAt,
      createdBy: {
        name: sharedMealPlan.createdByName,
        // Don't expose full email for privacy
        email: sharedMealPlan.createdByEmail?.split('@')[0] + '@***'
      },
      isPublic: true, // Flag to indicate this is a public view
    });

  } catch (error) {
    console.error('Error fetching shared meal plan:', error);
    res.status(500).json({ error: 'Failed to fetch shared meal plan' });
  }
});

/**
 * DELETE /api/meal-plans/:id/share
 * Revoke/disable a shared meal plan link
 */
mealPlanSharingRouter.delete('/:id/share', requireAuth, async (req, res) => {
  try {
    const mealPlanId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify the meal plan belongs to the user and find the active share
    const [existingShare] = await db
      .select({
        id: sharedMealPlans.id,
        shareToken: sharedMealPlans.shareToken,
      })
      .from(sharedMealPlans)
      .innerJoin(trainerMealPlans, eq(sharedMealPlans.mealPlanId, trainerMealPlans.id))
      .where(and(
        eq(sharedMealPlans.mealPlanId, mealPlanId),
        eq(trainerMealPlans.trainerId, userId),
        eq(sharedMealPlans.isActive, true)
      ))
      .limit(1);

    if (!existingShare) {
      return res.status(404).json({ 
        error: 'No active share found for this meal plan or you do not have permission to revoke it' 
      });
    }

    // Deactivate the share (don't delete to preserve analytics)
    await db
      .update(sharedMealPlans)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(sharedMealPlans.id, existingShare.id));

    res.json({ 
      message: 'Share link has been revoked successfully',
      shareToken: existingShare.shareToken 
    });

  } catch (error) {
    console.error('Error revoking share link:', error);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

/**
 * GET /api/meal-plans/:id/shares
 * List all shares for a specific meal plan (active and inactive)
 */
mealPlanSharingRouter.get('/:id/shares', requireAuth, async (req, res) => {
  try {
    const mealPlanId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify the meal plan belongs to the user
    const [mealPlan] = await db
      .select()
      .from(trainerMealPlans)
      .where(and(
        eq(trainerMealPlans.id, mealPlanId),
        eq(trainerMealPlans.trainerId, userId)
      ))
      .limit(1);

    if (!mealPlan) {
      return res.status(404).json({ 
        error: 'Meal plan not found or you do not have permission to view its shares' 
      });
    }

    // Get all shares for this meal plan
    const shares = await db
      .select({
        id: sharedMealPlans.id,
        shareToken: sharedMealPlans.shareToken,
        expiresAt: sharedMealPlans.expiresAt,
        viewCount: sharedMealPlans.viewCount,
        isActive: sharedMealPlans.isActive,
        createdAt: sharedMealPlans.createdAt,
        updatedAt: sharedMealPlans.updatedAt,
      })
      .from(sharedMealPlans)
      .where(eq(sharedMealPlans.mealPlanId, mealPlanId))
      .orderBy(sharedMealPlans.createdAt);

    // Add share URLs to each share
    const sharesWithUrls = shares.map(share => ({
      ...share,
      shareUrl: `${req.protocol}://${req.get('host')}/shared/${share.shareToken}`,
      isExpired: share.expiresAt ? share.expiresAt < new Date() : false,
    }));

    res.json({
      mealPlanId,
      shares: sharesWithUrls,
      totalShares: shares.length,
      activeShares: shares.filter(s => s.isActive).length,
      totalViews: shares.reduce((sum, s) => sum + s.viewCount, 0),
    });

  } catch (error) {
    console.error('Error fetching meal plan shares:', error);
    res.status(500).json({ error: 'Failed to fetch meal plan shares' });
  }
});

/**
 * PUT /api/meal-plans/:id/share
 * Update an existing share (extend expiration, activate/deactivate)
 */
mealPlanSharingRouter.put('/:id/share', requireAuth, async (req, res) => {
  try {
    const mealPlanId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate the request body
    const validationResult = updateShareSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.errors 
      });
    }

    // Find the existing share
    const [existingShare] = await db
      .select({
        id: sharedMealPlans.id,
        shareToken: sharedMealPlans.shareToken,
      })
      .from(sharedMealPlans)
      .innerJoin(trainerMealPlans, eq(sharedMealPlans.mealPlanId, trainerMealPlans.id))
      .where(and(
        eq(sharedMealPlans.mealPlanId, mealPlanId),
        eq(trainerMealPlans.trainerId, userId)
      ))
      .limit(1);

    if (!existingShare) {
      return res.status(404).json({ 
        error: 'No share found for this meal plan or you do not have permission to update it' 
      });
    }

    // Prepare update data
    const updateData: any = { updatedAt: new Date() };
    
    if (validationResult.data.expiresAt !== undefined) {
      updateData.expiresAt = validationResult.data.expiresAt 
        ? new Date(validationResult.data.expiresAt)
        : null;
    }
    
    if (validationResult.data.isActive !== undefined) {
      updateData.isActive = validationResult.data.isActive;
    }

    // Update the share
    const [updatedShare] = await db
      .update(sharedMealPlans)
      .set(updateData)
      .where(eq(sharedMealPlans.id, existingShare.id))
      .returning();

    const shareUrl = `${req.protocol}://${req.get('host')}/shared/${updatedShare.shareToken}`;

    res.json({
      shareToken: updatedShare.shareToken,
      shareUrl,
      expiresAt: updatedShare.expiresAt,
      isActive: updatedShare.isActive,
      viewCount: updatedShare.viewCount,
      updatedAt: updatedShare.updatedAt,
      message: 'Share link updated successfully'
    });

  } catch (error) {
    console.error('Error updating share link:', error);
    res.status(500).json({ error: 'Failed to update share link' });
  }
});

export { mealPlanSharingRouter };