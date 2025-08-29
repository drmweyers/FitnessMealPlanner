import express from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { 
  emailPreferences, 
  users,
  emailPreferencesSchema,
  updateEmailPreferencesSchema,
  type EmailPreferences,
  type EmailPreferencesInput,
  type UpdateEmailPreferencesInput
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const emailPreferencesRouter = express.Router();

/**
 * GET /api/email-preferences
 * Get current user's email preferences
 */
emailPreferencesRouter.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get or create email preferences for the user
    let [preferences] = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.userId, userId))
      .limit(1);

    // If no preferences exist, create default ones
    if (!preferences) {
      const defaultPreferences: EmailPreferencesInput = {
        weeklyProgressSummaries: true,
        mealPlanUpdates: true,
        recipeRecommendations: true,
        systemNotifications: true,
        marketingEmails: false,
        frequency: 'weekly'
      };

      [preferences] = await db
        .insert(emailPreferences)
        .values({
          userId,
          ...defaultPreferences
        })
        .returning();
    }

    res.json({
      success: true,
      preferences: {
        weeklyProgressSummaries: preferences.weeklyProgressSummaries,
        mealPlanUpdates: preferences.mealPlanUpdates,
        recipeRecommendations: preferences.recipeRecommendations,
        systemNotifications: preferences.systemNotifications,
        marketingEmails: preferences.marketingEmails,
        frequency: preferences.frequency,
        lastUpdated: preferences.updatedAt
      },
      message: 'Email preferences retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching email preferences:', error);
    res.status(500).json({ error: 'Failed to fetch email preferences' });
  }
});

/**
 * PUT /api/email-preferences
 * Update current user's email preferences
 */
emailPreferencesRouter.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const validationResult = updateEmailPreferencesSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid preferences data',
        details: validationResult.error.errors
      });
    }

    const updates = validationResult.data;

    // Update preferences (create if doesn't exist)
    const [updatedPreferences] = await db
      .insert(emailPreferences)
      .values({
        userId,
        ...updates,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: emailPreferences.userId,
        set: {
          ...updates,
          updatedAt: new Date()
        }
      })
      .returning();

    res.json({
      success: true,
      preferences: {
        weeklyProgressSummaries: updatedPreferences.weeklyProgressSummaries,
        mealPlanUpdates: updatedPreferences.mealPlanUpdates,
        recipeRecommendations: updatedPreferences.recipeRecommendations,
        systemNotifications: updatedPreferences.systemNotifications,
        marketingEmails: updatedPreferences.marketingEmails,
        frequency: updatedPreferences.frequency,
        lastUpdated: updatedPreferences.updatedAt
      },
      message: 'Email preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
});

/**
 * POST /api/email-preferences/unsubscribe
 * Unsubscribe from all non-essential emails (keep system notifications)
 */
emailPreferencesRouter.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Update preferences to disable all non-essential emails
    const [updatedPreferences] = await db
      .insert(emailPreferences)
      .values({
        userId,
        weeklyProgressSummaries: false,
        mealPlanUpdates: false,
        recipeRecommendations: false,
        systemNotifications: true, // Keep system notifications enabled
        marketingEmails: false,
        frequency: 'weekly',
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: emailPreferences.userId,
        set: {
          weeklyProgressSummaries: false,
          mealPlanUpdates: false,
          recipeRecommendations: false,
          marketingEmails: false,
          updatedAt: new Date()
        }
      })
      .returning();

    res.json({
      success: true,
      message: 'Successfully unsubscribed from non-essential emails. System notifications remain enabled.',
      preferences: {
        weeklyProgressSummaries: updatedPreferences.weeklyProgressSummaries,
        mealPlanUpdates: updatedPreferences.mealPlanUpdates,
        recipeRecommendations: updatedPreferences.recipeRecommendations,
        systemNotifications: updatedPreferences.systemNotifications,
        marketingEmails: updatedPreferences.marketingEmails,
        frequency: updatedPreferences.frequency,
        lastUpdated: updatedPreferences.updatedAt
      }
    });

  } catch (error) {
    console.error('Error unsubscribing from emails:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from emails' });
  }
});

/**
 * GET /api/email-preferences/unsubscribe/:userId
 * Public unsubscribe endpoint (for email links)
 */
emailPreferencesRouter.get('/unsubscribe/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!z.string().uuid().safeParse(userId).success) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Verify user exists
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update preferences to disable all non-essential emails
    const [updatedPreferences] = await db
      .insert(emailPreferences)
      .values({
        userId,
        weeklyProgressSummaries: false,
        mealPlanUpdates: false,
        recipeRecommendations: false,
        systemNotifications: true, // Keep system notifications enabled
        marketingEmails: false,
        frequency: 'weekly',
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: emailPreferences.userId,
        set: {
          weeklyProgressSummaries: false,
          mealPlanUpdates: false,
          recipeRecommendations: false,
          marketingEmails: false,
          updatedAt: new Date()
        }
      })
      .returning();

    // Return a simple HTML page confirming unsubscribe
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribed - EvoFitMeals</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f8fafc;
            color: #333;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 20px;
        }
        h1 {
            color: #1f2937;
            margin-bottom: 20px;
        }
        p {
            line-height: 1.6;
            color: #6b7280;
            margin-bottom: 15px;
        }
        .success {
            color: #10b981;
            font-weight: 600;
        }
        .note {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🏋️ EvoFitMeals</div>
        <h1>Unsubscribed Successfully</h1>
        <p class="success">You have been unsubscribed from non-essential emails.</p>
        <p>You will no longer receive:</p>
        <ul style="text-align: left; display: inline-block;">
            <li>Weekly progress summaries</li>
            <li>Meal plan update notifications</li>
            <li>Recipe recommendations</li>
            <li>Marketing emails</li>
        </ul>
        <div class="note">
            <strong>Note:</strong> You will still receive important system notifications related to your account security and service updates.
        </div>
        <p>You can update your email preferences anytime by logging into your account.</p>
    </div>
</body>
</html>
    `);

  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribe Error - EvoFitMeals</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
    <h1>Unsubscribe Error</h1>
    <p>We encountered an error processing your unsubscribe request. Please try again later or contact support.</p>
</body>
</html>
    `);
  }
});

export { emailPreferencesRouter };