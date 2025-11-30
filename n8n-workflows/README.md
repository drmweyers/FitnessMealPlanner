# n8n Workflows for FitnessMealPlanner Marketing Automation

This directory contains 3 n8n workflows that integrate with FitnessMealPlanner to automate marketing and customer engagement.

## 📦 Workflow Files

1. **lead-capture-workflow.json** - Lead Capture from Meal Plan Generator
2. **welcome-email-workflow.json** - Welcome Email for New Customers
3. **aha-moment-workflow.json** - First Meal Plan Celebration

## 🚀 Quick Setup (5 minutes)

### Step 1: Import Workflows into n8n

1. Open n8n at: http://localhost:5678
2. Click **"Workflows"** in the left sidebar
3. Click **"+ Add workflow"** (top right)
4. Click the **"..."** menu (top right) → **"Import from File"**
5. Select `lead-capture-workflow.json`
6. Click **"Import"**
7. Repeat steps 3-6 for `welcome-email-workflow.json` and `aha-moment-workflow.json`

### Step 2: Activate Workflows

**CRITICAL: Workflows must be ACTIVE for webhooks to work!**

For each imported workflow:
1. Open the workflow
2. Click the **toggle switch** in the top-right corner (should turn blue/green)
3. Verify it says **"Active"**

### Step 3: Verify Webhook URLs

After activating, verify the webhook URLs match your `.env` file:

**Expected URLs:**
- Lead Capture: `http://localhost:5678/webhook/lead-capture`
- Welcome: `http://localhost:5678/webhook/welcome`
- Aha Moment: `http://localhost:5678/webhook/aha-moment`

**Check `.env` file:**
```env
N8N_LEAD_CAPTURE_WEBHOOK="http://localhost:5678/webhook/lead-capture"
N8N_WELCOME_WEBHOOK="http://localhost:5678/webhook/welcome"
N8N_AHA_MOMENT_WEBHOOK="http://localhost:5678/webhook/aha-moment"
```

✅ If URLs match, you're ready to test!

## 🧪 Test Each Workflow

### Test 1: Lead Capture Webhook

```bash
curl -X POST http://localhost:5678/webhook/lead-capture \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "leadSource": "meal_plan_generator",
    "userAgent": "Mozilla/5.0",
    "ipAddress": "127.0.0.1",
    "timestamp": "2025-01-20T12:00:00Z"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Lead captured successfully",
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

### Test 2: Welcome Email Webhook

```bash
curl -X POST http://localhost:5678/webhook/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trainer@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "accountType": "professional",
    "customerId": "cus_test123",
    "subscriptionId": "sub_test456",
    "timestamp": "2025-01-20T12:00:00Z"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Welcome email queued",
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

### Test 3: Aha Moment Webhook

```bash
curl -X POST http://localhost:5678/webhook/aha-moment \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trainer@example.com",
    "firstName": "Jane",
    "mealPlanId": "plan_abc123",
    "mealPlanType": "muscle_gain",
    "calories": 2500,
    "protein": 200,
    "accountType": "trainer",
    "timestamp": "2025-01-20T12:00:00Z"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Aha moment celebrated!",
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

## ✅ Verification Checklist

- [ ] All 3 workflows imported successfully
- [ ] All 3 workflows are **ACTIVE** (toggle is ON)
- [ ] Webhook URLs match `.env` configuration
- [ ] All 3 test curl commands return success responses
- [ ] Workflow executions appear in n8n **Executions** tab

## 🔄 End-to-End Testing with FitnessMealPlanner

Once workflows are active, test the full integration:

### Test 1: Lead Capture (Meal Plan Generation)
1. Navigate to http://localhost:4000
2. Login as customer: `customer.test@evofitmeals.com` / `TestCustomer123!`
3. Generate a meal plan
4. Check n8n **Executions** tab for "Lead Capture" workflow run
5. Check server logs for: `[n8n] Lead capture event sent successfully`

### Test 2: Welcome Email (Stripe Webhook)
1. Use Stripe CLI to simulate checkout:
   ```bash
   stripe trigger checkout.session.completed
   ```
2. Check n8n **Executions** tab for "Welcome Email" workflow run
3. Check server logs for: `[n8n] Welcome event sent successfully`

### Test 3: Aha Moment (First Meal Plan)
1. Login as trainer: `trainer.test@evofitmeals.com` / `TestTrainer123!`
2. Create your FIRST meal plan for a customer
3. Check n8n **Executions** tab for "Aha Moment" workflow run
4. Check server logs for: `[n8n] Aha moment event sent successfully`
5. Create a SECOND meal plan (should NOT trigger webhook)

## 🛠️ Customizing Workflows

### Replace Placeholder Nodes

The workflows use **Set nodes** as placeholders. In production, replace with:

1. **Email Nodes** → SendGrid, Mailgun, Gmail, Outlook
2. **Database Nodes** → MongoDB, PostgreSQL, MySQL
3. **CRM Nodes** → Salesforce, HubSpot, Pipedrive
4. **Analytics Nodes** → Mixpanel, Segment, Google Analytics
5. **Notification Nodes** → Slack, Discord, Teams

### Example: Adding Real Email Node

1. Open workflow in n8n
2. Delete the "Set" placeholder node
3. Add **SendGrid** node (or your email provider)
4. Configure with your API credentials
5. Map the email fields (to, subject, body)
6. Save and test

## 📊 Monitoring Workflow Executions

1. Go to n8n dashboard: http://localhost:5678
2. Click **"Executions"** in the left sidebar
3. View all webhook triggers and results
4. Click any execution to see detailed node outputs
5. Check for errors (red indicators)

## 🐛 Troubleshooting

### Webhooks returning 404

**Problem:** n8n returns `"The requested webhook is not registered"`

**Solutions:**
1. ✅ Ensure workflows are **ACTIVE** (toggle must be ON)
2. ✅ Check webhook path matches (e.g., `/webhook/lead-capture`)
3. ✅ Restart n8n if workflows were just imported
4. ✅ Verify n8n is running: `curl http://localhost:5678`

### Webhooks not triggering from FitnessMealPlanner

**Problem:** Server sends webhook but n8n doesn't receive it

**Solutions:**
1. ✅ Check `.env` file has correct webhook URLs
2. ✅ Restart dev server: `docker-compose --profile dev restart`
3. ✅ Check server logs for: `[n8n] Sending {event} event:`
4. ✅ Verify n8n is accessible from dev server: `curl http://localhost:5678/webhook/lead-capture`

### Workflow executions failing

**Problem:** Workflow triggers but fails during execution

**Solutions:**
1. Click **"Executions"** → Open failed execution
2. Check which node failed (red indicator)
3. Review error message in node output
4. Fix node configuration
5. Test workflow with **"Test workflow"** button

## 📚 Documentation

- **n8n Official Docs:** https://docs.n8n.io/
- **Webhook Node:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- **FitnessMealPlanner Integration:** See `N8N_WEBHOOK_INTEGRATION_COMPLETE.md`

## 🎉 Success Criteria

All systems operational when:
- ✅ All 3 workflows show **"Active"** status
- ✅ Test curl commands return success responses
- ✅ n8n **Executions** tab shows successful workflow runs
- ✅ FitnessMealPlanner triggers webhooks automatically
- ✅ Server logs show: `[n8n] {event} event sent successfully`

---

**Created:** November 20, 2025
**Version:** 1.0.0
**Status:** Production Ready
