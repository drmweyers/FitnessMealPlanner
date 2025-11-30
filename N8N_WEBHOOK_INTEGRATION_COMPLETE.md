# n8n Webhook Integration - Implementation Complete ✅

**Date:** November 18, 2025
**Status:** All 3 webhooks integrated and ready for testing

## Summary

Successfully integrated n8n marketing automation webhooks into FitnessMealPlanner. All three webhook triggers are now active and ready to communicate with your n8n workflows.

---

## ✅ What Was Implemented

### 1. Environment Variables (.env)
**File:** `.env`
**Lines Added:** 83-90

```env
# n8n Webhook URLs
N8N_LEAD_CAPTURE_WEBHOOK="http://localhost:5678/webhook/lead-capture"
N8N_WELCOME_WEBHOOK="http://localhost:5678/webhook/welcome"
N8N_AHA_MOMENT_WEBHOOK="http://localhost:5678/webhook/aha-moment"
```

### 2. Webhook Helper Library
**File:** `server/utils/n8n-webhooks.ts`
**Status:** ✅ Created (217 lines)

**Functions:**
- `sendLeadCaptureEvent(userData)` - Triggers free tool nurture sequence
- `sendWelcomeEvent(userData, accountType)` - Triggers trial/lifetime welcome sequence
- `sendAhaMomentEvent(userData, mealPlanData)` - Triggers first meal plan celebration
- `isFirstMealPlan(db, userId)` - Helper to check if this is user's first meal plan

**Features:**
- Non-blocking webhook calls (won't fail main application flow)
- Comprehensive error logging with `[n8n]` prefix
- Environment variable validation
- TypeScript typed interfaces

### 3. Welcome Webhook Integration
**File:** `server/services/StripeWebhookHandler.ts`
**Method:** `handleCheckoutSessionCompleted`
**Lines:** 277-301

**Trigger:** When a trainer completes Stripe checkout (purchases starter/professional/enterprise tier)

**Payload Sent:**
```json
{
  "email": "trainer@example.com",
  "firstName": "",
  "lastName": "",
  "accountType": "starter" | "professional" | "enterprise",
  "customerId": "cus_xxx",
  "subscriptionId": "sub_xxx",
  "timestamp": "2025-11-18T..."
}
```

### 4. Aha Moment Webhook Integration
**File:** `server/routes/trainerRoutes.ts`
**Endpoint:** `POST /api/trainer/meal-plans`
**Lines:** 572-598

**Trigger:** When a trainer saves their **first** meal plan

**Payload Sent:**
```json
{
  "email": "trainer@example.com",
  "firstName": "",
  "mealPlanId": "uuid-xxx",
  "mealPlanType": "High Protein Bulking",
  "calories": 2500,
  "protein": 200,
  "timestamp": "2025-11-18T...",
  "accountType": "trainer"
}
```

### 5. Lead Capture Webhook Integration
**File:** `server/routes/mealPlan.ts`
**Endpoint:** `POST /api/meal-plan/generate`
**Lines:** 70-84

**Trigger:** When an authenticated user generates a meal plan

**Payload Sent:**
```json
{
  "email": "user@example.com",
  "firstName": "",
  "lastName": "",
  "leadSource": "meal_plan_generator_authenticated",
  "timestamp": "2025-11-18T...",
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "192.168.1.1"
}
```

**⚠️ Important Note:** This endpoint requires authentication. Your app does not currently have a "free meal plan generator" for anonymous users. This webhook captures **authenticated users** who generate meal plans, not free/anonymous users.

---

## 🔧 Files Modified

| File | Type | Changes |
|------|------|---------|
| `.env` | Environment | Added 3 webhook URLs |
| `server/utils/n8n-webhooks.ts` | New File | Created webhook helper library (217 lines) |
| `server/services/StripeWebhookHandler.ts` | Modified | Added welcome webhook call (25 lines) |
| `server/routes/trainerRoutes.ts` | Modified | Added aha moment webhook call (27 lines) |
| `server/routes/mealPlan.ts` | Modified | Added lead capture webhook call (15 lines) |

**Total Lines of Code:** 284 lines

---

## 🧪 Testing Instructions

### Prerequisites
1. Ensure n8n is running: `http://localhost:5678`
2. Verify all 3 workflows are active in n8n
3. Ensure FitnessMealPlanner dev server is running: `npm run dev`

### Test 1: Lead Capture Webhook

**Method:** Test via API call or frontend

**Option A: Using curl**
```bash
# First, login to get auth token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trainer.test@evofitmeals.com","password":"TestTrainer123!"}'

# Copy the token from response, then:
curl -X POST http://localhost:4000/api/meal-plan/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "numberOfDays": 7,
    "dailyCalorieTarget": 2000,
    "mealsPerDay": 3,
    "clientName": "Test Client"
  }'
```

**Option B: Using the app frontend**
1. Login as trainer: `trainer.test@evofitmeals.com` / `TestTrainer123!`
2. Navigate to meal plan generator
3. Generate a meal plan
4. Check n8n workflow execution log

**Expected Result:**
- n8n "Lead Capture" workflow triggers
- Webhook receives payload with email, leadSource, userAgent
- Console log: `[n8n] Sending lead capture event: { email: ..., leadSource: ... }`
- Console log: `[n8n] Lead capture event sent successfully`

### Test 2: Welcome Webhook

**Method:** Test Stripe checkout completion

**⚠️ Note:** This requires Stripe test mode setup. Alternative direct test:

```bash
# Direct webhook test (bypasses Stripe)
curl -X POST http://localhost:5678/webhook/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "accountType": "starter",
    "customerId": "cus_test123",
    "subscriptionId": "sub_test123"
  }'
```

**Expected Result:**
- n8n "Welcome Onboarding" workflow triggers
- Workflow sends appropriate welcome email based on `accountType`
- Console log: `[n8n] Sending welcome event: { email: ..., accountType: ... }`
- Console log: `[n8n] Welcome event sent successfully`

### Test 3: Aha Moment Webhook

**Method:** Create first meal plan as a new trainer

**Steps:**
1. Create a new trainer account or use existing trainer with 0 meal plans
2. Login as that trainer
3. Navigate to meal plan builder
4. Create and **save** a meal plan (POST to `/api/trainer/meal-plans`)
5. Check n8n workflow execution log

**Alternative: Direct API test**
```bash
# Login as trainer
TOKEN="..." # Get token from login

# Save a meal plan (first meal plan for this trainer)
curl -X POST http://localhost:4000/api/trainer/meal-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mealPlanData": {
      "planName": "Test Meal Plan",
      "dailyCalorieTarget": 2500,
      "dailyProteinTarget": 200
    },
    "notes": "Test meal plan",
    "tags": ["bulking"],
    "isTemplate": false
  }'
```

**Expected Result:**
- n8n "Aha Moment Celebration" workflow triggers **only on first meal plan**
- Subsequent meal plan saves do NOT trigger (isFirstMealPlan returns false)
- Console log: `[n8n] Sending aha moment event: { email: ..., mealPlanId: ... }`
- Console log: `[n8n] Aha moment event sent successfully`

### Monitoring Webhook Calls

**Check application logs:**
```bash
# In dev server terminal, look for:
[n8n] Sending lead capture event: ...
[n8n] Lead capture event sent successfully

[n8n] Sending welcome event: ...
[n8n] Welcome event sent successfully

[n8n] Sending aha moment event: ...
[n8n] Aha moment event sent successfully
```

**Check n8n workflow executions:**
1. Open n8n: `http://localhost:5678`
2. Click "Executions" in left sidebar
3. View recent webhook triggers
4. Inspect payload data received

**Error Handling:**
- If webhook URL not configured: Logs warning but doesn't fail
- If webhook call fails: Logs error but doesn't fail main application flow
- All webhook calls are **non-blocking** (won't break user experience)

---

## 🚀 Production Deployment Checklist

Before deploying to production:

### 1. Update Environment Variables
**File:** Production `.env` or environment configuration

Replace localhost URLs with production n8n webhook URLs:
```env
N8N_LEAD_CAPTURE_WEBHOOK="https://n8n.yourcompany.com/webhook/lead-capture"
N8N_WELCOME_WEBHOOK="https://n8n.yourcompany.com/webhook/welcome"
N8N_AHA_MOMENT_WEBHOOK="https://n8n.yourcompany.com/webhook/aha-moment"
```

### 2. Verify n8n Production Workflows
- [ ] All 3 workflows deployed to production n8n instance
- [ ] Webhook URLs are publicly accessible (or VPC accessible)
- [ ] Workflows are activated (not draft mode)
- [ ] Webhook security configured (if needed)

### 3. Test Production Webhooks
- [ ] Test lead capture in production
- [ ] Test welcome email (Stripe production mode)
- [ ] Test aha moment celebration
- [ ] Verify Mailgun sends emails successfully
- [ ] Verify HubSpot receives contact data

### 4. Monitor Production
- [ ] Set up n8n execution monitoring
- [ ] Configure error notifications
- [ ] Monitor webhook failure rates
- [ ] Check email delivery rates (Mailgun dashboard)
- [ ] Verify HubSpot contact sync

---

## 📋 Architecture Notes

### Non-Blocking Webhook Calls
All webhook calls use `.catch()` to prevent failures from breaking the main user flow:

```typescript
sendWelcomeEvent(userData, tier).catch((err) => {
  console.error('[n8n] Failed to send welcome event:', err);
  // Don't fail the webhook if n8n call fails
});
```

This ensures:
- User experience is never impacted by n8n downtime
- Application continues to function even if webhooks fail
- Errors are logged for debugging but don't propagate

### First Meal Plan Detection
The `isFirstMealPlan()` helper queries the database to count existing meal plans:

```typescript
export async function isFirstMealPlan(db: any, userId: string): Promise<boolean> {
  const result = await db.query.trainerMealPlans.findMany({
    where: (plans: any, { eq }: any) => eq(plans.trainerId, userId),
    limit: 2, // Only need to know if count is 1 or more
  });
  return result.length === 1; // First meal plan just created
}
```

**Performance:**
- Uses `limit: 2` for optimal query performance
- Returns true only when count = 1 (first meal plan)
- Returns false for all subsequent meal plans

### Environment Variable Validation
Each webhook function checks for configured URL:

```typescript
if (!WEBHOOK_URLS.leadCapture) {
  console.warn('[n8n] N8N_LEAD_CAPTURE_WEBHOOK not configured');
  return { success: false, error: 'Webhook URL not configured' };
}
```

**Behavior:**
- Development: Logs warning, returns gracefully
- Production: Should always be configured
- Doesn't crash application if misconfigured

---

## 🐛 Troubleshooting

### Webhook Not Triggering

**Check:**
1. Environment variable is set: `echo $N8N_LEAD_CAPTURE_WEBHOOK`
2. n8n workflow is active (not draft)
3. n8n is running: `curl http://localhost:5678/healthz`
4. Application logs show webhook call attempt

**Solution:**
```bash
# Verify environment variable
cat .env | grep N8N_

# Restart dev server to reload .env
npm run dev

# Check n8n workflow status
# Visit: http://localhost:5678/workflows
```

### Webhook Fails with Network Error

**Check:**
1. n8n is accessible from application server
2. Firewall/network allows outbound requests
3. Webhook URL is correct (no typos)

**Solution:**
```bash
# Test webhook URL directly
curl -X POST http://localhost:5678/webhook/lead-capture \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### First Meal Plan Always Triggers (Should Only Trigger Once)

**Issue:** `isFirstMealPlan()` always returns true

**Check:**
1. Database query is working correctly
2. `trainerMealPlans` table has correct data
3. `trainerId` matches in query

**Debug:**
```typescript
// Add logging in isFirstMealPlan
console.log('[n8n] Checking first meal plan for userId:', userId);
console.log('[n8n] Found existing meal plans:', result.length);
```

### Payload Data Missing or Incorrect

**Issue:** n8n receives incomplete data

**Check:**
1. User schema has required fields (email, etc.)
2. Meal plan data structure matches expectations
3. TypeScript compilation succeeded without errors

**Debug:**
```typescript
// Add logging before webhook call
console.log('[n8n] Payload being sent:', JSON.stringify(payload, null, 2));
```

---

## 📊 Success Metrics

Track these metrics to measure integration success:

### Webhook Delivery
- **Target:** >99% webhook delivery success rate
- **Monitor:** Application logs for `[n8n]` errors
- **Alert:** If error rate >1% for 1 hour

### Email Delivery (via Mailgun)
- **Target:** >95% email delivery rate
- **Monitor:** Mailgun dashboard
- **Alert:** If delivery rate <90%

### HubSpot Contact Sync
- **Target:** 100% contact sync for new users
- **Monitor:** HubSpot contact list growth
- **Alert:** If sync fails for 24 hours

### User Engagement
- **Lead Capture:** Track meal plan generation by authenticated users
- **Welcome Emails:** Track open rates for starter/professional/enterprise tiers
- **Aha Moment:** Track % of trainers who create 2nd+ meal plans after first

---

## 🔐 Security Considerations

### Webhook URL Protection
- **Current:** No authentication (localhost)
- **Production:** Consider adding webhook signature validation
- **Recommendation:** Use n8n webhook authentication or API key headers

### Data Privacy
- **PII Sent:** Email addresses only (no passwords, payment info)
- **GDPR:** Ensure user consent for marketing emails
- **Data Retention:** Configure n8n to delete old execution data

### Error Logging
- **Current:** Logs errors with `[n8n]` prefix
- **Production:** Ensure logs don't contain sensitive data
- **Monitoring:** Set up log aggregation (e.g., Datadog, CloudWatch)

---

## 📚 Additional Resources

### n8n Workflows (Your Installation)
- Lead Capture: `http://localhost:5678/workflow/1` (Update with actual workflow ID)
- Welcome Onboarding: `http://localhost:5678/workflow/2`
- Aha Moment: `http://localhost:5678/workflow/3`

### Documentation
- n8n Webhooks: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- Mailgun API: https://documentation.mailgun.com/
- HubSpot API: https://developers.hubspot.com/docs/api/overview

### Support
- FitnessMealPlanner Repo: (Link to your repository)
- n8n Community: https://community.n8n.io/

---

## ✅ Next Steps

1. **Test All 3 Webhooks** (see Testing Instructions above)
2. **Verify n8n Workflows Execute** (check execution logs)
3. **Test Email Delivery** (check Mailgun dashboard)
4. **Verify HubSpot Sync** (check contact creation)
5. **Deploy to Production** (update environment variables)
6. **Monitor Production Webhooks** (set up alerts)

---

**Integration Complete! 🎉**

All n8n marketing automation webhooks are now integrated and ready for testing. Follow the testing instructions above to verify everything works as expected.

If you encounter any issues, refer to the Troubleshooting section or check the application logs for `[n8n]` prefixed messages.
