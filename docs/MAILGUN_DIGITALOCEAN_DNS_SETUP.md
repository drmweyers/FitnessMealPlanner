# Mailgun DNS Setup for DigitalOcean
**Domain:** evofit.io
**Created:** November 11, 2025
**Estimated Time:** 30-40 minutes
**Status:** Step-by-step guide

---

## 📋 **Prerequisites**

Before you begin, make sure you have:
- ✅ DigitalOcean account credentials
- ✅ Mailgun account created (sandbox domain already configured)
- ✅ Access to: https://cloud.digitalocean.com
- ✅ Access to: https://app.mailgun.com

**Important:** Your nameservers are pointing to DigitalOcean, so **all DNS changes must be made in DigitalOcean**, not Namecheap.

---

## 🎯 **What You'll Accomplish**

By the end of this guide, you will have:
1. Added evofit.io as a verified domain in Mailgun
2. Added 5 DNS records to DigitalOcean
3. Verified DNS records in Mailgun
4. Enabled sending emails from `hello@evofit.io`

---

## 📝 **STEP 1: Add evofit.io Domain in Mailgun** (10 minutes)

### **Why do this first?**
Mailgun will generate the exact DNS records you need to add. Get these values before going to DigitalOcean.

### **Instructions:**

**1. Open Mailgun Dashboard:**
   - Go to: **https://app.mailgun.com**
   - Log in with your credentials
   - You should see the main dashboard

**2. Navigate to Domains:**
   - In the left sidebar, click **"Sending"**
   - Click **"Domains"**
   - You'll see your sandbox domain listed

**3. Add New Domain:**
   - Look for the **"Add New Domain"** button (usually top-right)
   - Click it

**4. Enter Domain Information:**

   **Domain Name:**
   - Enter exactly: `evofit.io`
   - ⚠️ **Do NOT include:**
     - www
     - https://
     - http://
   - Just: `evofit.io`

   **Region:**
   - Select: **"US"** (recommended for North America)
   - If your customers are primarily in Europe, select **"EU"**

   **Settings:**
   - ✅ Keep "Use Mailgun for tracking" checked
   - ✅ Keep "Create DKIM Authority" checked (should be default)

**5. Submit:**
   - Click **"Add Domain"** button at bottom

**6. DNS Records Page:**
   - Mailgun will now show you a page titled something like:
     - "Domain Verification & DNS"
     - OR "Setup Instructions for evofit.io"
   - You'll see **4-5 DNS records** to add
   - **⚠️ KEEP THIS TAB OPEN** - You'll copy from here

---

## 📝 **STEP 2: Copy DNS Records from Mailgun** (5 minutes)

### **What You'll See:**

Mailgun displays DNS records in a table. Here's what to look for:

### **Record 1: SPF (TXT Record)**

**Look for:**
- **Record Type:** TXT
- **Hostname:** @ or evofit.io
- **Value:** `v=spf1 include:mailgun.org ~all`

**What to do:**
1. Find the **Value** field for the SPF TXT record
2. Click the **"Copy"** icon/button next to it
3. Open Notepad or TextEdit
4. Paste the value
5. Label it: "SPF TXT Record"

**Expected value:**
```
v=spf1 include:mailgun.org ~all
```

---

### **Record 2: DKIM (TXT Record)**

**Look for:**
- **Record Type:** TXT
- **Hostname:** `smtp._domainkey` or `smtp._domainkey.evofit.io`
- **Value:** Very long string starting with `k=rsa; p=MIGfMA0GCS...`

**What to do:**
1. Find the DKIM TXT record
2. Click **"Copy"** next to the value
3. Paste into your notepad
4. Label it: "DKIM TXT Record"
5. **⚠️ Important:** This value is 200+ characters - make sure you copied the entire thing

**Expected value format:**
```
k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC... [VERY LONG STRING] ...QIDAQAB
```

---

### **Record 3 & 4: MX Records (2 records)**

**Look for:**
- **Record Type:** MX
- **Hostname:** @ or evofit.io
- **Priority:** 10
- **Value:** `mxa.mailgun.org` and `mxb.mailgun.org`

**What to do:**
1. Find both MX records
2. Copy each value separately
3. Save to notepad:

```
MX Record 1: mxa.mailgun.org (Priority: 10)
MX Record 2: mxb.mailgun.org (Priority: 10)
```

---

### **Record 5: CNAME (Tracking Record)**

**Look for:**
- **Record Type:** CNAME
- **Hostname:** `email` or `email.evofit.io`
- **Value:** `mailgun.org`

**What to do:**
1. Find the CNAME record
2. Copy the value
3. Save to notepad: "CNAME: mailgun.org"

---

**✅ Checkpoint:** You should now have 5 DNS records saved in notepad

---

## 📝 **STEP 3: Open DigitalOcean DNS Manager** (2 minutes)

### **Instructions:**

**1. Open DigitalOcean:**
   - Go to: **https://cloud.digitalocean.com**
   - Log in with your credentials

**2. Navigate to Networking:**
   - On the left sidebar, look for **"Manage"** section
   - Click **"Networking"**
   - You'll see several tabs at the top

**3. Go to Domains:**
   - Click the **"Domains"** tab at the top
   - You should see **evofit.io** listed
   - If not listed, you may need to add it first

**4. Select evofit.io:**
   - Click on **"evofit.io"** in the list
   - You'll see the DNS records page

**5. What You'll See:**
   - Existing DNS records (A, AAAA, CNAME, etc.)
   - A section to create new records
   - Drop-down menu for record types

---

## 📝 **STEP 4: Add DNS Records to DigitalOcean** (15 minutes)

### **Important Notes Before Starting:**

- **Hostname field:** Use `@` to represent the root domain (evofit.io)
- **Trailing dots:** DigitalOcean may auto-add these - don't worry
- **Existing records:** Don't delete existing A, AAAA, or CNAME records for your website
- **MX conflicts:** If you see existing MX records, note them down (you may need to remove old email service MX records)

---

### **ADD RECORD 1: SPF (TXT Record)**

**Step-by-step:**

1. **Locate "Create new record" section** (usually at top of page)

2. **Select record type:**
   - Click the dropdown menu
   - Select: **"TXT"**

3. **Fill in fields:**

   **Hostname (or Name):**
   - Enter: `@`
   - (This means "root domain" = evofit.io)

   **Value (or Data):**
   - Paste: `v=spf1 include:mailgun.org ~all`
   - ⚠️ Make sure there are NO extra spaces

   **TTL (Time To Live):**
   - Enter: `3600`
   - OR select "3600 seconds" from dropdown
   - OR leave as default

4. **Create:**
   - Click **"Create Record"** button

5. **Verify:**
   - New TXT record should appear in the list below
   - Check that Hostname = `@` and Value matches what you entered

---

### **ADD RECORD 2: DKIM (TXT Record)**

**Step-by-step:**

1. **Select record type:**
   - Dropdown: **"TXT"**

2. **Fill in fields:**

   **Hostname:**
   - Enter: `smtp._domainkey`
   - ⚠️ Important: Use underscore `_`, not hyphen `-`

   **Value:**
   - Paste the LONG DKIM value from your notepad
   - Should start with: `k=rsa; p=MIGfMA0GCS...`
   - Make sure you copied the entire string (200+ characters)

   **TTL:**
   - `3600`

3. **Create:**
   - Click **"Create Record"**

4. **Verify:**
   - Check that Hostname = `smtp._domainkey`
   - Value should be very long

---

### **ADD RECORD 3: MX Record 1**

**Step-by-step:**

1. **Select record type:**
   - Dropdown: **"MX"**

2. **Fill in fields:**

   **Hostname:**
   - Enter: `@`

   **Mail server (or Value):**
   - Enter: `mxa.mailgun.org`
   - ⚠️ Some interfaces require trailing dot: `mxa.mailgun.org.`
   - DigitalOcean usually auto-adds this

   **Priority:**
   - Enter: `10`

   **TTL:**
   - `3600`

3. **Create:**
   - Click **"Create Record"**

4. **Verify:**
   - Hostname = `@`
   - Mail server = `mxa.mailgun.org` or `mxa.mailgun.org.`
   - Priority = `10`

---

### **ADD RECORD 4: MX Record 2**

**Step-by-step:**

1. **Select record type:**
   - Dropdown: **"MX"**

2. **Fill in fields:**

   **Hostname:**
   - Enter: `@`

   **Mail server:**
   - Enter: `mxb.mailgun.org`

   **Priority:**
   - Enter: `10`

   **TTL:**
   - `3600`

3. **Create:**
   - Click **"Create Record"**

4. **Verify:**
   - You should now see TWO MX records:
     - mxa.mailgun.org (Priority 10)
     - mxb.mailgun.org (Priority 10)

---

### **ADD RECORD 5: CNAME (Tracking Record)**

**Step-by-step:**

1. **Select record type:**
   - Dropdown: **"CNAME"**

2. **Fill in fields:**

   **Hostname:**
   - Enter: `email`
   - This creates: `email.evofit.io`

   **Alias to (or Value):**
   - Enter: `mailgun.org`
   - May require trailing dot: `mailgun.org.`

   **TTL:**
   - `3600`

3. **Create:**
   - Click **"Create Record"**

4. **Verify:**
   - Hostname = `email` or `email.evofit.io`
   - Points to = `mailgun.org` or `mailgun.org.`

---

**✅ Checkpoint:** You should now have 5 new DNS records in DigitalOcean

**Your DNS records should look like:**
```
Type    Hostname            Value/Data                          Priority  TTL
----    --------            ----------                          --------  ---
TXT     @                   v=spf1 include:mailgun.org ~all                3600
TXT     smtp._domainkey     k=rsa; p=MIGfMA0GCS... [LONG]                 3600
MX      @                   mxa.mailgun.org                     10        3600
MX      @                   mxb.mailgun.org                     10        3600
CNAME   email               mailgun.org                                   3600
```

---

## 📝 **STEP 5: Wait for DNS Propagation** (15-30 minutes)

### **What is DNS Propagation?**

DNS changes don't take effect immediately. They need to "propagate" across the internet's DNS servers.

### **Typical Wait Times:**

- **Minimum:** 5-10 minutes (for quick updates)
- **Average:** 15-30 minutes (most common)
- **Maximum:** 24-48 hours (rare, usually much faster)

### **What to Do:**

1. **Set a timer for 20 minutes** ⏰

2. **Take a break:**
   - ☕ Get coffee
   - 📧 Check emails
   - 🚶 Take a walk
   - Don't close the Mailgun tab!

3. **While waiting (optional):**
   - You can check DNS propagation status at: https://dnschecker.org
   - Enter: `evofit.io`
   - Select: `TXT` record type
   - Look for the SPF record appearing globally

---

## 📝 **STEP 6: Verify DNS in Mailgun** (5 minutes)

### **After waiting 15-30 minutes:**

**1. Return to Mailgun tab:**
   - Should still be on the DNS records page
   - If you closed it: https://app.mailgun.com → Sending → Domains → evofit.io

**2. Find "Verify DNS Settings" button:**
   - Usually at the bottom of the DNS records section
   - May say "Check DNS Records" or similar

**3. Click the button:**
   - Mailgun will check your DNS records
   - This takes 5-10 seconds

**4. Check results:**
   - You'll see status indicators next to each record:
     - ✅ **Green checkmark** = Verified (Good!)
     - ⏳ **Yellow warning** = Still propagating (Wait longer)
     - ❌ **Red X** = Not found (Check if record was entered correctly)

**5. Expected result:**
   - All 5 records show ✅ green checkmarks
   - Domain status changes to: **"Active"** or **"Verified"**

---

### **If Some Records Not Verified:**

**Option A: Wait Longer**
- DNS can take up to 24 hours (though rare)
- Wait another 15-30 minutes
- Click "Verify DNS Settings" again

**Option B: Check for Errors**
1. Go back to DigitalOcean DNS page
2. Review each record you added
3. Compare with Mailgun's requirements
4. Common mistakes:
   - Extra spaces in values
   - Wrong hostname (@ vs smtp._domainkey)
   - Missing underscore in `smtp._domainkey`
   - Priority not set to 10 for MX records

**Option C: Use DNS Checker Tool**
1. Go to: https://mxtoolbox.com/SuperTool.aspx
2. Enter: `evofit.io`
3. Select "TXT Lookup" - should see SPF and DKIM
4. Select "MX Lookup" - should see mxa and mxb.mailgun.org

---

**✅ Checkpoint:** All DNS records verified in Mailgun ✅

---

## 📝 **STEP 7: Update .env File** (ALREADY DONE ✅)

**Status:** This was already completed when you provided your API key.

**Current configuration:**
```env
MAILGUN_API_KEY="key-YOUR_MAILGUN_API_KEY_HERE"
MAILGUN_DOMAIN="evofit.io"
MAILGUN_API_BASE_URL="https://api.mailgun.net/v3"
FROM_EMAIL="EvoFitMeals <hello@evofit.io>"
```

**⚠️ IMPORTANT - After DNS Verification:**

Once evofit.io is verified in Mailgun, you need to update this line:

**Change from:**
```env
MAILGUN_DOMAIN="sandbox7f37b71996344471910147658f98f8e5.mailgun.org"
```

**Change to:**
```env
MAILGUN_DOMAIN="evofit.io"
```

**How to update:**
1. Open: `C:\Users\drmwe\Claude\FitnessMealPlanner\.env`
2. Find line: `MAILGUN_DOMAIN="sandbox...`
3. Replace with: `MAILGUN_DOMAIN="evofit.io"`
4. Save file

---

## 🎯 **Next Steps After DNS Verification**

### **1. Update MAILGUN_DOMAIN in .env**
```env
MAILGUN_DOMAIN="evofit.io"  # Change from sandbox
```

### **2. Install Mailgun Package**
```bash
cd C:\Users\drmwe\Claude\FitnessMealPlanner
npm install mailgun.js form-data
```

### **3. Update emailService.ts**
The email service code needs to be updated to use Mailgun instead of Resend.

### **4. Restart Development Server**
```bash
docker-compose --profile dev restart
```

### **5. Test Email Sending**
- Login as trainer
- Send customer invitation
- Verify email received

---

## 🔍 **Troubleshooting**

### **Problem: Can't find evofit.io in DigitalOcean Domains**

**Solution:**
1. Make sure you're in the right DigitalOcean account
2. Check if domain is under a different project
3. Add the domain manually:
   - Networking → Domains → "Add a domain"
   - Enter: `evofit.io`

---

### **Problem: DNS Records Not Verifying After 1+ Hour**

**Checklist:**
- [ ] Are you adding records in DigitalOcean (not Namecheap)?
- [ ] Is the Hostname exactly `@` for SPF/MX records?
- [ ] Is the DKIM hostname exactly `smtp._domainkey` (with underscore)?
- [ ] Did you copy the entire DKIM value (200+ characters)?
- [ ] Are MX priorities both set to `10`?
- [ ] Is CNAME hostname exactly `email`?

---

### **Problem: Existing MX Records Conflict**

**If you see old MX records (e.g., from another email service):**

1. **Check if they're needed:**
   - If you're using another email service (Gmail, Outlook, etc.), you may need those
   - If not, you can delete them

2. **To delete:**
   - In DigitalOcean DNS page
   - Find the old MX record
   - Click the trash/delete icon
   - Confirm deletion

3. **Then add Mailgun MX records**

---

### **Problem: "Domain already exists" in Mailgun**

**Solution:**
- The domain may already be added from a previous attempt
- Go to: Sending → Domains
- Click on evofit.io
- Proceed to verify DNS

---

## 📊 **DNS Records Summary**

**Copy this for reference:**

| Record Type | Hostname          | Value/Data                          | Priority | TTL  |
|-------------|-------------------|-------------------------------------|----------|------|
| TXT         | @                 | v=spf1 include:mailgun.org ~all     | -        | 3600 |
| TXT         | smtp._domainkey   | k=rsa; p=MIGfMA0GCS... [LONG KEY]   | -        | 3600 |
| MX          | @                 | mxa.mailgun.org                     | 10       | 3600 |
| MX          | @                 | mxb.mailgun.org                     | 10       | 3600 |
| CNAME       | email             | mailgun.org                         | -        | 3600 |

---

## ✅ **Completion Checklist**

- [ ] Logged into Mailgun
- [ ] Added evofit.io domain in Mailgun
- [ ] Copied all 5 DNS records to notepad
- [ ] Logged into DigitalOcean
- [ ] Navigated to Networking → Domains → evofit.io
- [ ] Added TXT record (SPF)
- [ ] Added TXT record (DKIM)
- [ ] Added MX record 1 (mxa.mailgun.org)
- [ ] Added MX record 2 (mxb.mailgun.org)
- [ ] Added CNAME record (email → mailgun.org)
- [ ] Waited 15-30 minutes
- [ ] Verified DNS in Mailgun (all ✅ green)
- [ ] Updated MAILGUN_DOMAIN in .env to "evofit.io"
- [ ] Ready to install mailgun.js package
- [ ] Ready to update emailService.ts

---

## 📞 **Need Help?**

**If you get stuck:**
1. Check this guide's Troubleshooting section
2. Use DNS checker: https://mxtoolbox.com/SuperTool.aspx
3. Reference main guide: `docs/MAILGUN_SETUP_GUIDE.md`
4. Check Mailgun documentation: https://documentation.mailgun.com

---

## 🎉 **Success!**

Once all DNS records are verified in Mailgun:
- ✅ evofit.io domain is ready for sending emails
- ✅ Emails will come from `hello@evofit.io`
- ✅ Ready to proceed with code implementation
- ✅ No more sandbox domain limitations

---

**Created:** November 11, 2025
**Last Updated:** November 11, 2025
**Status:** Ready for use

---

**END OF GUIDE**
