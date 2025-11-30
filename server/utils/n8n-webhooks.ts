/**
 * n8n Webhook Integration Helper
 * Sends events to n8n marketing automation workflows
 *
 * @created November 18, 2025
 * @description Integrates FitnessMealPlanner with n8n marketing automation
 */

interface WebhookResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const WEBHOOK_URLS = {
  leadCapture: process.env.N8N_LEAD_CAPTURE_WEBHOOK,
  welcome: process.env.N8N_WELCOME_WEBHOOK,
  ahaMoment: process.env.N8N_AHA_MOMENT_WEBHOOK,
};

/**
 * Send lead capture event to n8n
 * Triggers free tool nurture sequence
 *
 * @param userData - User data including email, name, and metadata
 * @returns Promise<WebhookResponse>
 */
export async function sendLeadCaptureEvent(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  leadSource?: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<WebhookResponse> {
  try {
    if (!WEBHOOK_URLS.leadCapture) {
      console.warn('[n8n] N8N_LEAD_CAPTURE_WEBHOOK not configured');
      return { success: false, error: 'Webhook URL not configured' };
    }

    const payload = {
      email: userData.email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      leadSource: userData.leadSource || 'meal_plan_generator',
      timestamp: new Date().toISOString(),
      userAgent: userData.userAgent || '',
      ipAddress: userData.ipAddress || '',
    };

    console.log('[n8n] Sending lead capture event:', { email: payload.email, leadSource: payload.leadSource });

    const response = await fetch(WEBHOOK_URLS.leadCapture, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[n8n] Lead capture event sent successfully');
    return { success: true, data };
  } catch (error: any) {
    console.error('[n8n] Lead capture webhook error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email event to n8n
 * Triggers trial or lifetime welcome sequence
 *
 * @param userData - User data including email, name, and Stripe info
 * @param accountType - 'trial' or 'lifetime'
 * @returns Promise<WebhookResponse>
 */
export async function sendWelcomeEvent(
  userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  },
  accountType: 'trial' | 'lifetime' | 'starter' | 'professional' | 'enterprise'
): Promise<WebhookResponse> {
  try {
    if (!WEBHOOK_URLS.welcome) {
      console.warn('[n8n] N8N_WELCOME_WEBHOOK not configured');
      return { success: false, error: 'Webhook URL not configured' };
    }

    const payload = {
      email: userData.email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      accountType,
      customerId: userData.stripeCustomerId || '',
      subscriptionId: userData.stripeSubscriptionId || '',
      timestamp: new Date().toISOString(),
    };

    console.log('[n8n] Sending welcome event:', { email: payload.email, accountType: payload.accountType });

    const response = await fetch(WEBHOOK_URLS.welcome, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[n8n] Welcome event sent successfully');
    return { success: true, data };
  } catch (error: any) {
    console.error('[n8n] Welcome webhook error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send aha moment celebration event to n8n
 * Triggers when user generates their first meal plan
 *
 * @param userData - User data including email and name
 * @param mealPlanData - Meal plan details
 * @returns Promise<WebhookResponse>
 */
export async function sendAhaMomentEvent(
  userData: {
    email: string;
    firstName?: string;
    accountType?: string;
  },
  mealPlanData: {
    id: string;
    type?: string;
    calories?: number;
    protein?: number;
  }
): Promise<WebhookResponse> {
  try {
    if (!WEBHOOK_URLS.ahaMoment) {
      console.warn('[n8n] N8N_AHA_MOMENT_WEBHOOK not configured');
      return { success: false, error: 'Webhook URL not configured' };
    }

    const payload = {
      email: userData.email,
      firstName: userData.firstName || '',
      mealPlanId: mealPlanData.id,
      mealPlanType: mealPlanData.type || 'custom',
      calories: mealPlanData.calories || 0,
      protein: mealPlanData.protein || 0,
      timestamp: new Date().toISOString(),
      accountType: userData.accountType || 'free',
    };

    console.log('[n8n] Sending aha moment event:', { email: payload.email, mealPlanId: payload.mealPlanId });

    const response = await fetch(WEBHOOK_URLS.ahaMoment, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[n8n] Aha moment event sent successfully');
    return { success: true, data };
  } catch (error: any) {
    console.error('[n8n] Aha moment webhook error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to check if this is user's first meal plan
 *
 * @param db - Database instance
 * @param userId - User ID
 * @returns Promise<boolean> - True if this is the first meal plan
 */
export async function isFirstMealPlan(db: any, userId: string): Promise<boolean> {
  try {
    // Query database to count meal plans for this trainer
    const result = await db.query.trainerMealPlans.findMany({
      where: (plans: any, { eq }: any) => eq(plans.trainerId, userId),
      limit: 2, // Only need to know if count is 1 or more
    });

    return result.length === 1; // First meal plan just created
  } catch (error) {
    console.error('[n8n] Error checking first meal plan:', error);
    return false; // Fail silently, don't block the main flow
  }
}
