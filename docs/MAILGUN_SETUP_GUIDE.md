# Mailgun Email Service Setup Guide

**Created:** November 9, 2025
**Status:** 🚨 URGENT - HIGH PRIORITY
**Purpose:** Replace Resend with Mailgun for customer invitation emails
**New Email:** hello@evofit.io
**Estimated Time:** 80 minutes total

---

## 📋 **Overview**

This guide walks through replacing the current Resend email service with Mailgun to enable trainers to send customer invitations using the new `hello@evofit.io` email address.

### **Current Status**
- ✅ Email system exists in `server/services/emailService.ts`
- ✅ Invitation flow working with Resend test domain
- ❌ Domain `bcinnovationlabs.com` NOT verified with Resend
- ❌ Cannot send to external customers with current setup
- 🎯 **Goal:** Switch to Mailgun with verified `evofit.io` domain

### **Why Mailgun?**
- Free tier: 5,000 emails/month for 3 months
- Better deliverability than Resend for production
- Simple DNS verification process
- Reliable API for transactional emails

---

## 🎯 **10-Step Process** (Complete in Order)

### **Progress Tracker**
- [ ] Step 1: Create Mailgun account and verify email (15 min)
- [ ] Step 2: Add evofit.io domain to Mailgun (5 min)
- [ ] Step 3: Copy DNS records from Mailgun dashboard (5 min)
- [ ] Step 4: Add DNS records to domain provider (30 min)
- [ ] Step 5: Verify DNS records in Mailgun (15 min wait + 2 min verify)
- [ ] Step 6: Copy Mailgun API key and save it (5 min)
- [ ] Step 7: Update .env file with Mailgun credentials (2 min)
- [ ] Step 8: Install Mailgun npm package (1 min)
- [ ] Step 9: Update emailService.ts to use Mailgun (20 min)
- [ ] Step 10: Test email sending with Mailgun (10 min)

---

## 📝 **STEP 1: Create Mailgun Account** (15 minutes)

### **Detailed Instructions:**

**1. Open your web browser**
   - Use Chrome, Firefox, Edge, or Safari

**2. Navigate to Mailgun signup:**
   - URL: **https://signup.mailgun.com/new/signup**
   - Press Enter

**3. Complete the signup form:**

   **Email Address:**
   - Enter your primary email (one you check regularly)
   - Example: `yourname@gmail.com`

   **Password:**
   - Minimum 8 characters
   - Include: uppercase, lowercase, number, symbol
   - Example: `MyMailgun2025!`

   **Company Name:**
   - Enter: `EvoFit` or `EvoFitMeals`

   **First Name & Last Name:**
   - Your actual name

**4. Accept terms:**
   - ☑ Check "I agree to the Terms of Service"
   - ☑ Complete CAPTCHA if shown

**5. Submit:**
   - Click **"Create Account"** button

**6. Verify email:**
   - Check inbox for: `Mailgun <noreply@mailgun.com>`
   - Subject: "Please verify your email address"
   - **Click verification link** in email

**7. Select plan:**
   - Choose **"Foundation"** plan
   - Free tier: 5,000 emails/month for 3 months
   - Click **"Continue"**

**8. Payment verification:**
   - May require credit card for verification
   - **Note:** Won't be charged unless you exceed free limits
   - Enter card details
   - Click **"Continue"**

**9. Access dashboard:**
   - Should see Mailgun Dashboard
   - Left sidebar shows: Sending, Domains, etc.

**✅ Checkpoint:** You should now be at the Mailgun Dashboard

---

## 📝 **STEP 2: Add evofit.io Domain** (5 minutes)

### **Detailed Instructions:**

**1. Navigate to Domains:**
   - In Mailgun dashboard left sidebar
   - Click **"Sending"** → **"Domains"**

**2. Add new domain:**
   - Click **"Add New Domain"** button (top right)

**3. Enter domain information:**

   **Domain Name:**
   - Enter: `evofit.io`
   - **Important:** Do NOT include "www" or "https://"
   - Just: `evofit.io`

   **Region:**
   - Select **"US"** (recommended for North America)
   - OR **"EU"** (if targeting Europe)

**4. Domain settings:**
   - Leave **"Use Mailgun for tracking"** checked ✅
   - Click **"Add Domain"**

**5. DNS Records page:**
   - Mailgun will show you DNS records to add
   - **DO NOT CLOSE THIS PAGE** - keep it open

**✅ Checkpoint:** You should see a page with 4-5 DNS records to add

---

## 📝 **STEP 3: Copy DNS Records** (5 minutes)

### **What You'll See:**

Mailgun shows **4 types of DNS records**. You need to copy ALL of them.

### **1. SPF Record (TXT)**
```
Type: TXT
Name/Host: @ (or evofit.io)
Value: v=spf1 include:mailgun.org ~all
TTL: 3600 (or Auto)
```

**Action:**
- Click **"Copy"** button next to the TXT record value
- Paste into notepad or text file temporarily
- Label it: "SPF Record"

### **2. DKIM Record (TXT)**
```
Type: TXT
Name/Host: smtp._domainkey (or smtp._domainkey.evofit.io)
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBA... [LONG STRING]
TTL: 3600
```

**Action:**
- Click **"Copy"** next to DKIM value
- Save to notepad
- Label it: "DKIM Record"
- **Important:** This value is VERY LONG - copy entire thing

### **3. MX Records (2 records)**

**First MX Record:**
```
Type: MX
Name/Host: @ (or evofit.io)
Priority: 10
Value: mxa.mailgun.org
TTL: 3600
```

**Second MX Record:**
```
Type: MX
Name/Host: @ (or evofit.io)
Priority: 10
Value: mxb.mailgun.org
TTL: 3600
```

**Action:**
- Copy both MX record values
- Save to notepad
- Label: "MX Record 1" and "MX Record 2"

### **4. CNAME Record (Tracking)**
```
Type: CNAME
Name/Host: email (or email.evofit.io)
Value: mailgun.org
TTL: 3600
```

**Action:**
- Copy CNAME value
- Save to notepad
- Label: "CNAME Record"

**✅ Checkpoint:** You have 5 DNS records saved in notepad (1 SPF, 1 DKIM, 2 MX, 1 CNAME)

---

## 📝 **STEP 4: Add DNS Records to Domain Provider** (30 minutes)

### **First: Find Where You Bought evofit.io**

**Common domain providers:**
- GoDaddy
- Namecheap
- Google Domains
- Cloudflare
- Hover
- Network Solutions

**Question:** Where did you purchase evofit.io domain?

---

### **Option A: GoDaddy Instructions**

**1. Log in to GoDaddy:**
   - Go to: https://www.godaddy.com
   - Click **"Sign In"** (top right)
   - Enter credentials

**2. Navigate to DNS:**
   - Click **"My Products"**
   - Find **"Domains"** section
   - Click **"DNS"** next to evofit.io

**3. Add SPF Record (TXT):**
   - Click **"Add"** button
   - Type: Select **"TXT"**
   - Host: Enter `@`
   - TXT Value: Paste `v=spf1 include:mailgun.org ~all`
   - TTL: Leave default (or 3600)
   - Click **"Save"**

**4. Add DKIM Record (TXT):**
   - Click **"Add"** button
   - Type: **"TXT"**
   - Host: Enter `smtp._domainkey`
   - TXT Value: Paste the LONG DKIM value from Mailgun
   - TTL: 3600
   - Click **"Save"**

**5. Add MX Record 1:**
   - Click **"Add"**
   - Type: **"MX"**
   - Host: `@`
   - Points to: `mxa.mailgun.org`
   - Priority: `10`
   - TTL: 3600
   - Click **"Save"**

**6. Add MX Record 2:**
   - Click **"Add"**
   - Type: **"MX"**
   - Host: `@`
   - Points to: `mxb.mailgun.org`
   - Priority: `10`
   - TTL: 3600
   - Click **"Save"**

**7. Add CNAME Record:**
   - Click **"Add"**
   - Type: **"CNAME"**
   - Host: `email`
   - Points to: `mailgun.org`
   - TTL: 3600
   - Click **"Save"**

---

### **Option B: Namecheap Instructions**

**1. Log in to Namecheap:**
   - Go to: https://www.namecheap.com
   - Click **"Sign In"**

**2. Navigate to DNS:**
   - Click **"Domain List"**
   - Click **"Manage"** next to evofit.io
   - Click **"Advanced DNS"** tab

**3. Add SPF Record:**
   - Click **"Add New Record"**
   - Type: **"TXT Record"**
   - Host: `@`
   - Value: `v=spf1 include:mailgun.org ~all`
   - TTL: Automatic
   - Click ✅ to save

**4. Add DKIM Record:**
   - Click **"Add New Record"**
   - Type: **"TXT Record"**
   - Host: `smtp._domainkey`
   - Value: [Paste LONG DKIM value]
   - TTL: Automatic
   - Click ✅ to save

**5. Add MX Records (2):**
   - Click **"Add New Record"**
   - Type: **"MX Record"**
   - Host: `@`
   - Value: `mxa.mailgun.org`
   - Priority: `10`
   - Click ✅

   - Click **"Add New Record"** again
   - Type: **"MX Record"**
   - Host: `@`
   - Value: `mxb.mailgun.org`
   - Priority: `10`
   - Click ✅

**6. Add CNAME Record:**
   - Click **"Add New Record"**
   - Type: **"CNAME Record"**
   - Host: `email`
   - Value: `mailgun.org`
   - TTL: Automatic
   - Click ✅

---

### **Option C: Cloudflare Instructions**

**1. Log in to Cloudflare:**
   - Go to: https://dash.cloudflare.com
   - Sign in

**2. Select domain:**
   - Click on **evofit.io** domain

**3. Go to DNS:**
   - Click **"DNS"** tab on top menu

**4. Add SPF Record:**
   - Click **"Add record"**
   - Type: **"TXT"**
   - Name: `@`
   - Content: `v=spf1 include:mailgun.org ~all`
   - TTL: Auto
   - Click **"Save"**

**5. Add DKIM Record:**
   - Click **"Add record"**
   - Type: **"TXT"**
   - Name: `smtp._domainkey`
   - Content: [Paste LONG DKIM value]
   - TTL: Auto
   - Click **"Save"**

**6. Add MX Records:**
   - Click **"Add record"**
   - Type: **"MX"**
   - Name: `@`
   - Mail server: `mxa.mailgun.org`
   - Priority: `10`
   - Click **"Save"**

   - Click **"Add record"**
   - Type: **"MX"**
   - Name: `@`
   - Mail server: `mxb.mailgun.org`
   - Priority: `10`
   - Click **"Save"**

**7. Add CNAME Record:**
   - Click **"Add record"**
   - Type: **"CNAME"**
   - Name: `email`
   - Target: `mailgun.org`
   - Proxy status: DNS only (gray cloud)
   - TTL: Auto
   - Click **"Save"**

**✅ Checkpoint:** All 5 DNS records added to domain provider

---

## 📝 **STEP 5: Verify DNS Records** (Wait 15 min + 2 min verify)

### **Wait for DNS Propagation:**
DNS changes take time to propagate across the internet.

**Typical wait times:**
- Minimum: 5-10 minutes
- Average: 15-30 minutes
- Maximum: 24-48 hours (rare)

**What to do while waiting:**
- Take a break ☕
- Check email
- Come back in 15-20 minutes

---

### **Verify in Mailgun:**

**After 15+ minutes:**

**1. Return to Mailgun Dashboard:**
   - Go to: https://app.mailgun.com
   - Log in if needed

**2. Navigate to your domain:**
   - Click **"Sending"** → **"Domains"**
   - Click on **"evofit.io"**

**3. Check DNS status:**
   - Look for DNS records section
   - You'll see status indicators next to each record:
     - ✅ Green checkmark = Verified
     - ⏳ Yellow warning = Pending
     - ❌ Red X = Not found

**4. Click "Verify DNS Settings":**
   - Click button at bottom of DNS records
   - Mailgun will re-check your DNS

**5. Expected result:**
   - All records show ✅ green checkmarks
   - Status changes to **"Active"** or **"Verified"**

**If records NOT verified yet:**
- Wait another 10-15 minutes
- Click "Verify DNS Settings" again
- If still not working after 1 hour, double-check DNS records were entered correctly

**✅ Checkpoint:** Domain status shows "Active" with all DNS records verified ✅

---

## 📝 **STEP 6: Copy Mailgun API Key** (5 minutes)

### **Get Your API Credentials:**

**1. In Mailgun dashboard:**
   - Click **"Settings"** in left sidebar
   - Click **"API Keys"**

**2. Find "Private API key":**
   - Look for section labeled **"Private API key"**
   - You'll see a key that looks like: `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**3. Copy API key:**
   - Click **"Copy"** button next to the key
   - **OR** click the "eye" icon to reveal and copy manually

**4. Save securely:**
   - Open notepad or text editor
   - Paste the API key
   - Label it: "MAILGUN_API_KEY"
   - **Keep this safe** - treat like a password

**5. Note your region:**
   - If you selected **US region**: API URL is `https://api.mailgun.net/v3`
   - If you selected **EU region**: API URL is `https://api.eu.mailgun.net/v3`
   - Save this as: "MAILGUN_API_BASE_URL"

**Example of what you should have:**
```
MAILGUN_API_KEY=key-abc123def456ghi789jkl012mno345pq
MAILGUN_DOMAIN=evofit.io
MAILGUN_API_BASE_URL=https://api.mailgun.net/v3
FROM_EMAIL=EvoFitMeals <hello@evofit.io>
```

**✅ Checkpoint:** You have your API key, domain, and base URL saved

---

## 📝 **STEP 7: Update .env File** (2 minutes)

### **Modify Environment Variables:**

**1. Open .env file:**
   - Location: `C:\Users\drmwe\Claude\FitnessMealPlanner\.env`
   - Open in text editor (VS Code, Notepad++, etc.)

**2. Find Resend configuration:**
   - Look for lines:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxx
   FROM_EMAIL=EvoFitMeals <onboarding@resend.dev>
   ```

**3. Comment out Resend (keep for backup):**
   - Add `#` at start of each line:
   ```bash
   # RESEND_API_KEY=re_xxxxxxxxxxxx
   # FROM_EMAIL=EvoFitMeals <onboarding@resend.dev>
   ```

**4. Add Mailgun configuration:**
   - Below the commented Resend lines, add:
   ```bash
   # Mailgun Email Configuration
   MAILGUN_API_KEY=key-YOUR_ACTUAL_API_KEY_HERE
   MAILGUN_DOMAIN=evofit.io
   MAILGUN_API_BASE_URL=https://api.mailgun.net/v3
   FROM_EMAIL=EvoFitMeals <hello@evofit.io>
   ```

**5. Replace placeholder:**
   - Replace `key-YOUR_ACTUAL_API_KEY_HERE` with the actual key you copied in Step 6

**6. Save file:**
   - Save `.env` file
   - **Important:** Do NOT commit this file to git

**✅ Checkpoint:** .env file updated with Mailgun credentials

---

## 📝 **STEP 8: Install Mailgun Package** (1 minute)

### **Install Required npm Packages:**

**1. Open terminal:**
   - Open Git Bash or PowerShell
   - Navigate to project directory:
   ```bash
   cd C:\Users\drmwe\Claude\FitnessMealPlanner
   ```

**2. Install Mailgun SDK:**
   ```bash
   npm install mailgun.js form-data
   ```

**3. Wait for installation:**
   - Should take 10-30 seconds
   - You'll see progress output

**4. Verify installation:**
   ```bash
   npm list mailgun.js
   ```
   - Should show: `mailgun.js@9.x.x` or similar

**✅ Checkpoint:** Mailgun.js package installed successfully

---

## 📝 **STEP 9: Update emailService.ts** (20 minutes)

### **Code Changes Required:**

**File to modify:** `server/services/emailService.ts`

**Summary of changes:**
1. Replace Resend import with Mailgun
2. Update initialization code
3. Modify email sending methods
4. Keep all HTML templates (no changes)

**I'll create the updated file for you in the next step.**

**✅ Checkpoint:** Ready for code implementation (I'll help with this)

---

## 📝 **STEP 10: Test Email Sending** (10 minutes)

### **Verify Everything Works:**

**1. Restart development server:**
   ```bash
   docker-compose --profile dev restart
   ```

**2. Test email endpoint (admin only):**
   ```bash
   # First, login as admin to get JWT token
   # Then test email:
   curl -X POST http://localhost:4000/api/invitations/test-email \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"email": "your-real-email@gmail.com"}'
   ```

**3. Check your inbox:**
   - Should receive test email within 1-2 minutes
   - From: `EvoFitMeals <hello@evofit.io>`
   - Subject: "EvoFitMeals Email Test"

**4. Test trainer invitation flow:**
   - Login as trainer account
   - Send invitation to a test customer email
   - Check customer email inbox
   - Verify invitation email received

**5. Check Mailgun logs:**
   - Go to Mailgun dashboard
   - Click **"Sending"** → **"Logs"**
   - Should see sent emails listed

**✅ Success Criteria:**
- Test email received ✅
- Invitation email works ✅
- Emails appear in Mailgun logs ✅

---

## 🔧 **Troubleshooting**

### **Common Issues:**

**Issue 1: DNS Not Verifying**
- **Solution:** Wait longer (up to 24 hours)
- Check DNS records were entered correctly
- Use DNS checker: https://mxtoolbox.com/SuperTool.aspx

**Issue 2: API Key Invalid**
- **Solution:** Copy key again from Mailgun dashboard
- Ensure no extra spaces in .env file
- Check key starts with `key-`

**Issue 3: Emails Not Sending**
- **Solution:** Check Mailgun logs for errors
- Verify domain status is "Active"
- Check .env file has correct FROM_EMAIL

**Issue 4: Emails Go to Spam**
- **Solution:** Ensure all DNS records verified
- Wait 24-48 hours for reputation to build
- Check SPF/DKIM records are correct

---

## 📚 **Reference Links**

- **Mailgun Dashboard:** https://app.mailgun.com
- **Mailgun Documentation:** https://documentation.mailgun.com
- **DNS Checker:** https://mxtoolbox.com/SuperTool.aspx
- **Mailgun API Docs:** https://documentation.mailgun.com/en/latest/api_reference.html

---

## 🎯 **Next Session Tasks**

**When you return to this:**
1. Start with Step 1 if not yet begun
2. Complete all 10 steps in order
3. Mark each checkbox as you complete it
4. Test thoroughly before deploying to production

**Estimated total time:** ~80 minutes

---

## 📝 **Session Notes**

**Session Date:** November 9, 2025
**Session Summary:** Created comprehensive Mailgun setup guide
**Status:** Ready to begin implementation
**Next Action:** Start Step 1 - Create Mailgun account

---

**END OF GUIDE**
