# 🚨 URGENT: Fix Production Deployment Configuration

**Created:** November 8, 2025
**Status:** ⚠️ CRITICAL - Production deploying OLD code (October 28-29)
**Issue:** evofitmeals.com is 10 days behind latest code

---

## 🔍 Problem Summary

**Current State:**
- Production is deploying from **DigitalOcean Container Registry** (DOCR)
- Container image is from **October 28-29, 2025**
- Latest code changes (BMAD Bulk Generator updates) from **November 7** are NOT deployed
- Docker push fails due to proxy/network blocking

**Root Cause:**
- App Spec configured to use `image:` (Container Registry) instead of `github:` (GitHub Repository)
- Container Registry image is outdated and cannot be updated due to network restrictions

---

## ✅ Solution: Switch to GitHub Deployment

Change the App Spec to deploy directly from GitHub repository instead of Container Registry.

---

## 📋 Step-by-Step Instructions

### Step 1: Access DigitalOcean App Settings

1. **Navigate to:** https://cloud.digitalocean.com/apps/600abc04-b784-426c-8799-0c09f8b9a958
2. **Click:** "Settings" tab (left sidebar)
3. **Scroll to:** "App Spec" section
4. **Click:** "Edit" button next to "App Spec"

### Step 2: Locate the Service Configuration

In the App Spec YAML editor, find the `services:` section (around line 70-75).

**You'll see this:**
```yaml
services:
- envs:
  - key: DATABASE_URL
    scope: RUN_TIME
    value: ${fitnessmealplanner-db.DATABASE_URL}
  - key: DATABASE_CA_CERT
    scope: RUN_AND_BUILD_TIME
    value: ${fitnessmealplanner-db.CA_CERT}
  - key: NODE_EXTRA_CA_CERTS
    scope: RUN_AND_BUILD_TIME
    value: /app/digitalocean-ca-cert.pem
  - key: NODE_ENV
    scope: RUN_AND_BUILD_TIME
    value: production
  - key: REDIS_URL
    scope: RUN_TIME
    value: ${REDIS_URL}  # Set in DigitalOcean environment
  http_port: 5001
  image:                           # ← DELETE FROM HERE
    deploy_on_push:
      enabled: true
    registry: bci
    registry_type: DOCR
    repository: fitnessmealplanner
    tag: prod                      # ← DELETE TO HERE
  instance_count: 1
  instance_size_slug: apps-s-1vcpu-1gb
  name: fitnessmealplanner-prod
```

### Step 3: Replace Image Configuration with GitHub Configuration

**DELETE these lines:**
```yaml
  image:
    deploy_on_push:
      enabled: true
    registry: bci
    registry_type: DOCR
    repository: fitnessmealplanner
    tag: prod
```

**REPLACE with these lines:**
```yaml
  github:
    branch: main
    deploy_on_push: true
    repo: drmweyers/FitnessMealPlanner
```

**Result should look like this:**
```yaml
services:
- envs:
  - key: DATABASE_URL
    scope: RUN_TIME
    value: ${fitnessmealplanner-db.DATABASE_URL}
  - key: DATABASE_CA_CERT
    scope: RUN_AND_BUILD_TIME
    value: ${fitnessmealplanner-db.CA_CERT}
  - key: NODE_EXTRA_CA_CERTS
    scope: RUN_AND_BUILD_TIME
    value: /app/digitalocean-ca-cert.pem
  - key: NODE_ENV
    scope: RUN_AND_BUILD_TIME
    value: production
  - key: REDIS_URL
    scope: RUN_TIME
    value: ${REDIS_URL}  # Set in DigitalOcean environment
  http_port: 5001
  github:                          # ← NEW CONFIGURATION
    branch: main
    deploy_on_push: true
    repo: drmweyers/FitnessMealPlanner
  instance_count: 1
  instance_size_slug: apps-s-1vcpu-1gb
  name: fitnessmealplanner-prod
```

### Step 4: Save and Authorize

1. **Click:** "Save" button at the bottom of the App Spec editor
2. **DigitalOcean will prompt you to authorize GitHub access**
   - Click "Authorize DigitalOcean"
   - Log in to GitHub if needed
   - Grant permissions to the repository
3. **DigitalOcean will automatically trigger a new deployment**

### Step 5: Monitor Deployment

**CRITICAL: Wait 7-10 minutes for deployment to complete**

1. **Click:** "Deployments" tab
2. **Watch for:**
   - Status: "Deploying..." → "Active"
   - Green checkmark indicating success
3. **Check logs for confirmation:**
   - Files should be dated **November 7-8, 2025** (NOT October 28-29)
   - Look for: `-rwxr-xr-x 1 appuser appgroup ... Nov  7 ... server/index.ts`

### Step 6: Verify on Production

After deployment completes:

1. **Login to:** https://evofitmeals.com/login
   - Email: `admin@fitmeal.pro`
   - Password: `AdminPass123`

2. **Navigate to:** Admin Dashboard

3. **Check Recipe Library Tab (1st tab):**
   - ❌ Should NOT see "Generate Recipes" button
   - ✅ Should ONLY see "Review Queue" and "Export Data" buttons

4. **Check BMAD Bulk Generator Tab (3rd or 4th tab):**
   - ✅ Should see "Focus Ingredient" field
   - ✅ Should see "Difficulty Level" dropdown
   - ✅ Should see "Recipe Preferences" textarea
   - ❌ Should NOT see "Daily Calorie Goal", "Description", "Number of Days", "Meals Per Day"

---

## 🎯 Expected Outcome

**After completing these steps:**

✅ Production will deploy from **GitHub main branch**
✅ Latest code changes (November 7 BMAD updates) will be live
✅ Auto-deploy will work on future commits to `main`
✅ No more dependency on Docker push (which fails due to proxy)

**Benefits:**

- ✅ **Automatic deployments** when you push to `main` branch
- ✅ **No more Docker registry issues** - deploys directly from GitHub
- ✅ **Always up-to-date** - production matches GitHub main branch
- ✅ **Version control integration** - easy rollbacks via GitHub

---

## 📊 Verification Checklist

After deployment, verify:

- [ ] Deployment status shows "Active" with green checkmark
- [ ] Deployment timestamp is **today's date**
- [ ] Log files show dates of **Nov 7-8, 2025** (not Oct 28-29)
- [ ] Production site loads: https://evofitmeals.com
- [ ] Admin login works: https://evofitmeals.com/login
- [ ] Recipe Library tab shows correct buttons (no "Generate Recipes")
- [ ] BMAD Bulk Generator tab shows new fields (Focus Ingredient, Difficulty Level, Recipe Preferences)
- [ ] New fields removed from BMAD tab (no Daily Calorie Goal, Description, Days, Meals Per Day)

---

## ⚠️ Important Notes

**Before Making Changes:**
- This change is **safe** - it only changes the deployment source
- Your database and environment variables will NOT be affected
- The app will rebuild from GitHub (same code, different source)

**During Deployment:**
- The site will remain online during deployment (zero-downtime)
- Wait the **full 7-10 minutes** for deployment to complete
- Do NOT refresh the site until deployment shows "Active"

**After Changes:**
- Future commits to `main` branch will auto-deploy
- You can still manually trigger deployments via "Force Rebuild and Deploy"
- Container Registry image will no longer be used

---

## 🆘 Troubleshooting

### If GitHub Authorization Fails:
1. Go to GitHub Settings → Applications → Authorized OAuth Apps
2. Revoke DigitalOcean access if it exists
3. Try authorizing again in DigitalOcean

### If Deployment Fails:
1. Check "Runtime Logs" tab for error messages
2. Verify the repository name is correct: `drmweyers/FitnessMealPlanner`
3. Verify the branch name is correct: `main`
4. Check that GitHub repository is accessible (not private without proper permissions)

### If Changes Still Not Visible:
1. Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Check deployment logs show **November 7-8 dates**
3. Verify deployment completed successfully (green checkmark)
4. Check "Runtime Logs" for any startup errors

---

## 📚 Reference Information

**App ID:** `600abc04-b784-426c-8799-0c09f8b9a958`
**App Name:** `fitnessmealplanner-prod`
**GitHub Repo:** `drmweyers/FitnessMealPlanner`
**Branch:** `main`
**Production URL:** https://evofitmeals.com
**Latest Commit:** `e14b82f` (November 7, 2025 - BMAD Bulk Generator updates)

**Related Documentation:**
- `CLAUDE.md` - Section: "Production Deployment (Manual Process)"
- `DEPLOYMENT_PROCESS_DOCUMENTATION.md` - Complete deployment pipeline
- `DEPLOYMENT_BEST_PRACTICES.md` - Deployment procedures

---

## ✅ Completion

**Once completed, mark this todo as done:**
- [ ] App Spec updated to use GitHub deployment
- [ ] GitHub authorized successfully
- [ ] Deployment completed with "Active" status
- [ ] Production verified with latest code (November 7 changes)
- [ ] All verification checklist items passed

**Then delete or archive this file:** `URGENT_PRODUCTION_DEPLOYMENT_FIX.md`

---

**Last Updated:** November 8, 2025
**Next Session Action:** Follow steps above to fix production deployment
**Priority:** 🚨 URGENT - Production is 10 days behind
