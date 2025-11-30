# n8n Webhook Troubleshooting Guide

## ❌ Problem: Getting 404 "webhook not registered" errors

### Solution Checklist

#### 1. Verify Workflows Are Actually Active

**Check each workflow in n8n UI:**

1. Go to http://localhost:5678
2. Click **"Workflows"** in left sidebar
3. You should see 3 workflows:
   - Lead Capture - Meal Plan Generator
   - Welcome Email - New Customer Onboarding
   - Aha Moment - First Meal Plan Celebration

4. **For EACH workflow**, verify the **status indicator**:
   - ✅ **Should be:** Green dot + "Active" label
   - ❌ **If showing:** Gray dot + "Inactive" label → Click into workflow and toggle ON

**How to activate a workflow:**
1. Click on the workflow name
2. Look at the **top-right corner** of the editor
3. Find the **toggle switch** (should be next to "Execute Workflow")
4. Click the toggle to turn it **ON** (should turn blue/green)
5. You should see **"Active"** status appear
6. Click **"Save"** button if prompted

#### 2. Check Webhook Paths in n8n

**CRITICAL: Webhook paths must match exactly!**

For each workflow, verify the webhook node configuration:

1. Open workflow in n8n
2. Click on the **"Webhook"** node (first node)
3. Check the **"Path"** field in the parameters panel
4. **Expected values:**
   - Lead Capture: `lead-capture`
   - Welcome: `welcome`
   - Aha Moment: `aha-moment`

**If paths are wrong:**
1. Update the "Path" field to match expected value
2. Click **"Save"** at the top-right
3. Re-activate the workflow (toggle OFF then ON)

#### 3. Restart n8n (If workflows just imported)

Sometimes n8n needs a restart after importing workflows:

**Option A: Restart via Docker (if using Docker):**
```bash
docker restart n8n
```

**Option B: Restart via Process Manager:**
```bash
# Find n8n process
Get-Process | Where-Object {$_.ProcessName -like "*n8n*"}

# Kill and restart
# Or use your n8n startup command
```

**Option C: Restart via npm (if installed globally):**
```bash
# Stop n8n (Ctrl+C)
# Start again:
n8n start
```

#### 4. Test Webhook URLs After Activation

Run these curl commands AFTER ensuring workflows are active:

**Test 1: Lead Capture**
```bash
curl -X POST http://localhost:5678/webhook/lead-capture \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","leadSource":"test","timestamp":"2025-01-20T12:00:00Z"}'
```

**Expected Response (success):**
```json
{
  "success": true,
  "message": "Lead captured successfully",
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

**Test 2: Welcome**
```bash
curl -X POST http://localhost:5678/webhook/welcome \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","accountType":"starter","timestamp":"2025-01-20T12:00:00Z"}'
```

**Expected Response (success):**
```json
{
  "success": true,
  "message": "Welcome email queued",
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

**Test 3: Aha Moment**
```bash
curl -X POST http://localhost:5678/webhook/aha-moment \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","mealPlanId":"test123","timestamp":"2025-01-20T12:00:00Z"}'
```

**Expected Response (success):**
```json
{
  "success": true,
  "message": "Aha moment celebrated!",
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

## 🔍 Advanced Troubleshooting

### Check n8n Webhook Registration

**View registered webhooks in n8n:**
1. Go to http://localhost:5678
2. Click **"Settings"** (gear icon) in left sidebar
3. Click **"Webhooks"** section
4. You should see all 3 webhook paths listed with status "Active"

### Check n8n Logs

**If webhooks still not working, check n8n logs:**

```bash
# If using Docker
docker logs n8n --tail 50

# If using npm/local installation
# Check terminal where n8n is running for error messages
```

**Look for errors like:**
- "Webhook path already in use" → Delete duplicate workflows
- "Invalid webhook configuration" → Check webhook node settings
- "Database error" → n8n may need database migration

### Common Issues

#### Issue: "Webhook path already in use"
**Cause:** Multiple workflows using the same webhook path
**Solution:**
1. Delete duplicate workflows
2. Ensure each workflow has a unique webhook path
3. Restart n8n

#### Issue: Workflows show "Active" but still 404
**Cause:** n8n hasn't registered the webhook yet
**Solution:**
1. Toggle workflow OFF then ON again
2. Save the workflow
3. Wait 5 seconds
4. Test webhook URL again

#### Issue: Webhook works in "Test" mode but not Production
**Cause:** Workflow not saved after activation
**Solution:**
1. Open workflow
2. Make any small change (add a space in a node name)
3. Save the workflow
4. Ensure toggle is ON
5. Test production URL

## 📸 Visual Verification

**What an ACTIVE workflow looks like in n8n:**

```
┌────────────────────────────────────────────────┐
│  Lead Capture - Meal Plan Generator           │
│  ● Active                              [Save]  │
│  ┌──────────┐                                  │
│  │ Webhook  │ → [Other nodes...]              │
│  └──────────┘                                  │
│  Status: Active | Toggle: ● ON                 │
└────────────────────────────────────────────────┘
```

**Inactive workflow (WRONG):**
```
┌────────────────────────────────────────────────┐
│  Lead Capture - Meal Plan Generator           │
│  ○ Inactive                            [Save]  │
│  Status: Inactive | Toggle: ○ OFF              │
└────────────────────────────────────────────────┘
```

## ✅ Success Verification

**All webhooks working when:**
1. ✅ All 3 workflows show **green dot + "Active"** status
2. ✅ All 3 curl test commands return **success JSON responses** (not 404)
3. ✅ n8n **Executions** tab shows new workflow runs when you test
4. ✅ No errors in n8n logs

---

**Need more help?**
- n8n Webhook Docs: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- n8n Community Forum: https://community.n8n.io/
- FitnessMealPlanner Integration: See `README.md` in this directory
