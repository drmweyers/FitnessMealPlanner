# doctl CLI Setup Guide for FitnessMealPlanner Production

**Date:** November 15, 2025
**Purpose:** Configure doctl CLI to manage DigitalOcean production environment
**Time Required:** 10-15 minutes

---

## 📋 Prerequisites

- ✅ DigitalOcean account with access to `fitnessmealplanner-prod` app
- ✅ Windows PowerShell or Git Bash
- ✅ Internet connection

---

## 🚀 Step-by-Step Installation

### Step 1: Install doctl via Scoop (Recommended for Windows)

**Option A: If you have Scoop installed:**
```powershell
scoop install doctl
```

**Option B: If you DON'T have Scoop, install Scoop first:**
```powershell
# Run this in PowerShell (as regular user, NOT admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Then install doctl
scoop install doctl
```

**Option C: Manual Download (if Scoop fails):**
1. Go to: https://github.com/digitalocean/doctl/releases
2. Download: `doctl-<version>-windows-amd64.zip`
3. Extract to: `C:\Program Files\doctl\`
4. Add to PATH: `C:\Program Files\doctl`

### Step 2: Verify Installation

```bash
doctl version
```

**Expected output:**
```
doctl version 1.x.x-release
Git commit hash: ...
```

---

## 🔑 Step 3: Authenticate with DigitalOcean

### Create API Token

1. **Go to DigitalOcean API page:**
   - URL: https://cloud.digitalocean.com/account/api/tokens

2. **Generate New Token:**
   - Click: **"Generate New Token"**
   - Name: `doctl-fitnessmealplanner`
   - Scopes: ✅ Read and Write
   - Click: **"Generate Token"**

3. **Copy Token:**
   - Copy the token immediately (you'll only see it once)
   - Example: `dop_v1_abc123def456...`

### Initialize doctl

```bash
doctl auth init
```

**Prompt:**
```
Please authenticate doctl for use with your DigitalOcean account. You can generate a token in the control panel at https://cloud.digitalocean.com/account/api/tokens

Enter your access token:
```

**Paste your token** and press Enter.

**Expected output:**
```
Validating token... OK
```

---

## ✅ Step 4: Verify Access to Production App

### Test App Access

```bash
doctl apps list
```

**Expected output (should show your app):**
```
ID                                      Spec Name                   Default Ingress    Active Deployment ID    In Progress Deployment ID    Created At              Updated At
600abc04-b784-426c-8799-0c09f8b9a958    fitnessmealplanner-prod     evofitmeals.com    ...                     ...                          2025-01-12 ...          2025-11-15 ...
```

### Test App Details

```bash
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958
```

**If this works,** you're all set! ✅

**If you get 403 error:**
- Token doesn't have correct permissions
- Account doesn't have access to the app
- Token expired or invalid

---

## 🎯 Step 5: Add Mailgun Environment Variables to Production

### Method 1: Update App Spec (Recommended)

```bash
# Get current app spec
doctl apps spec get 600abc04-b784-426c-8799-0c09f8b9a958 > app-spec.yaml

# Edit app-spec.yaml and add under 'envs:' section:
# - key: MAILGUN_API_KEY
#   value: "[GET_FROM_.ENV.LOCAL_FILE]"
# - key: MAILGUN_DOMAIN
#   value: "evofitmeals.com"
# - key: MAILGUN_API_BASE_URL
#   value: "https://api.mailgun.net"
# - key: FROM_EMAIL
#   value: "EvoFit Meals <invites@evofitmeals.com>"

# Apply updated spec
doctl apps update 600abc04-b784-426c-8799-0c09f8b9a958 --spec app-spec.yaml
```

### Method 2: Manual Dashboard (Easier)

1. Go to: https://cloud.digitalocean.com/apps
2. Click: `fitnessmealplanner-prod`
3. Click: **Settings** tab
4. Scroll to: **App-Level Environment Variables**
5. Click: **Edit**
6. Add 4 variables (get API key from `.env.local` file):
   ```
   MAILGUN_API_KEY = [YOUR_API_KEY_FROM_.ENV.LOCAL]
   MAILGUN_DOMAIN = evofitmeals.com
   MAILGUN_API_BASE_URL = https://api.mailgun.net
   FROM_EMAIL = EvoFit Meals <invites@evofitmeals.com>
   ```
7. Click: **Save**
8. App will auto-redeploy (wait ~5 minutes)

---

## 🧪 Step 6: Test Production Email

### After Deployment Completes

1. **Go to:** https://evofitmeals.com
2. **Login as trainer:**
   - Email: `trainer.test@evofitmeals.com`
   - Password: `TestTrainer123!`
3. **Navigate to:** Customers tab
4. **Click:** "Send Invitation"
5. **Enter your email** (use your real email to test)
6. **Click:** "Send Invitation"
7. **Check your inbox** for email from `EvoFit Meals <invites@evofitmeals.com>`

### Verify Email Received

- ✅ Email from: `EvoFit Meals <invites@evofitmeals.com>`
- ✅ Subject: Contains "invitation"
- ✅ Link works: Click invitation link
- ✅ Registration page loads

---

## 🔍 Troubleshooting

### Issue: 403 Unauthorized

**Solution:**
- Regenerate API token with Read/Write access
- Re-run `doctl auth init`

### Issue: App Not Found

**Solution:**
- Verify app ID: `600abc04-b784-426c-8799-0c09f8b9a958`
- Check account has access to the app
- Verify you're logged into correct DigitalOcean account

### Issue: Email Not Sending in Production

**Check:**
1. Environment variables saved correctly
2. Deployment completed successfully
3. Check production logs:
   ```bash
   doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type run
   ```
4. Verify Mailgun dashboard for send attempts

### Issue: Email Goes to Spam

**Solution:**
- Mailgun domain is verified (✅ already done)
- DNS records are valid (✅ already done)
- Check Mailgun reputation: https://app.mailgun.com/app/sending/domains/evofitmeals.com
- May need to warm up domain (send small batches first)

---

## 📚 Useful Commands Reference

```bash
# List all apps
doctl apps list

# Get app details
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958

# View app logs
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type run

# List deployments
doctl apps list-deployments 600abc04-b784-426c-8799-0c09f8b9a958

# Create new deployment
doctl apps create-deployment 600abc04-b784-426c-8799-0c09f8b9a958

# Get app spec
doctl apps spec get 600abc04-b784-426c-8799-0c09f8b9a958

# Update app with new spec
doctl apps update 600abc04-b784-426c-8799-0c09f8b9a958 --spec app-spec.yaml
```

---

## ✅ Success Checklist

- [ ] doctl installed and version verified
- [ ] DigitalOcean API token created
- [ ] doctl authenticated (`doctl auth init`)
- [ ] App access verified (`doctl apps list`)
- [ ] Mailgun environment variables added to production
- [ ] Production redeployed successfully
- [ ] Test email sent from production
- [ ] Email received in inbox
- [ ] Invitation link works

---

## 🎯 What This Enables

With doctl configured, you can:
- ✅ Deploy production updates from command line
- ✅ View production logs without dashboard
- ✅ Manage environment variables programmatically
- ✅ Monitor deployment status
- ✅ Troubleshoot production issues faster

---

**Prepared by:** Claude (CTO AI Assistant)
**Date:** November 15, 2025
**Next Steps:** Follow Step 1 to install doctl
