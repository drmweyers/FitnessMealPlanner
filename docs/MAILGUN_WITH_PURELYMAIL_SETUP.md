# Mailgun + PurelyMail Email Setup
**Updated:** January 13, 2025
**Status:** ✅ Operational

---

## 📋 **Overview**

**Current Setup:**
- ✅ PurelyMail handles **evofit.io** domain (regular business email)
- ✅ Mailgun handles **evofitmeals.com** domain (app transactional emails)
- ✅ Complete separation - no conflicts!

**Email Domains:**
- **evofit.io** → PurelyMail (hello@evofit.io for business)
- **evofitmeals.com** → Mailgun (invites@evofitmeals.com for app)

**Why This Setup?**
- ✅ Better email deliverability (domain matches website)
- ✅ Cleaner separation of concerns
- ✅ Save money (only pay for one Mailgun domain)
- ✅ Professional branding (invites come from evofitmeals.com)

---

## 🎯 **Step 1: Check Existing DNS in DigitalOcean**

### **What to do:**

1. **Log in to DigitalOcean:**
   - https://cloud.digitalocean.com

2. **Navigate to DNS:**
   - **Networking** → **Domains** → **evofit.io**

3. **Look for existing records:**

**You should see PurelyMail records like:**
```
Type    Hostname    Value                           Priority    TTL
MX      @           mailserver.purelymail.com       10          3600
TXT     @           v=spf1 include:purelymail.com ~all         3600
TXT     pm._domainkey  [DKIM key from PurelyMail]              3600
```

**⚠️ IMPORTANT:** Take a screenshot or write down these existing records - **DO NOT DELETE THEM**

---

## 🎯 **Step 2: Update SPF Record (TXT)**

### **Problem:**
You likely have an SPF record for PurelyMail already:
```
v=spf1 include:purelymail.com ~all
```

### **Solution: Merge Both Services**

**You need to UPDATE (not replace) the SPF record to include BOTH:**

**Find this record in DigitalOcean:**
```
Type: TXT
Hostname: @
Value: v=spf1 include:purelymail.com ~all
```

**Change it to:**
```
Type: TXT
Hostname: @
Value: v=spf1 include:purelymail.com include:mailgun.org ~all
```

**How to update:**
1. In DigitalOcean DNS page, find the existing SPF TXT record
2. Click **"Edit"** or the pencil icon
3. Update the **Value** field to include both `purelymail.com` and `mailgun.org`
4. Click **"Save"**

**✅ Result:** Both PurelyMail and Mailgun can send emails on behalf of evofit.io

---

## 🎯 **Step 3: Add Mailgun DKIM Record (TXT)**

### **Get DKIM from Mailgun:**

1. Go to: https://app.mailgun.com
2. **Sending** → **Domains** → Add `evofit.io` domain
3. Copy the DKIM TXT record value

**Add in DigitalOcean:**

```
Type: TXT
Hostname: smtp._domainkey
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBA... [LONG STRING FROM MAILGUN]
TTL: 3600
```

**Notes:**
- Hostname must be **exactly** `smtp._domainkey` (with underscore)
- This is DIFFERENT from PurelyMail's DKIM (which uses `pm._domainkey`)
- Both DKIM records can coexist

**✅ Result:** Mailgun emails will have valid DKIM signature

---

## 🎯 **Step 4: Add Mailgun CNAME Record**

**Add in DigitalOcean:**

```
Type: CNAME
Hostname: email
Value: mailgun.org
TTL: 3600
```

**Purpose:** Enables Mailgun click and open tracking

**✅ Result:** Email tracking works for Mailgun-sent emails

---

## 🎯 **Step 5: SKIP Mailgun MX Records**

### **⚠️ DO NOT ADD THESE:**
```
❌ MX  @  mxa.mailgun.org  10
❌ MX  @  mxb.mailgun.org  10
```

**Why skip?**
- Your PurelyMail MX records handle incoming mail
- Mailgun MX records are only needed for bounce handling
- You can send emails without Mailgun MX records
- Adding them would conflict with PurelyMail

**✅ Result:** PurelyMail continues receiving all emails to hello@evofit.io

---

## 📊 **Final DNS Records Summary**

**After completing all steps, you should have:**

| Type  | Hostname          | Value                                      | Priority | Notes              |
|-------|-------------------|--------------------------------------------|----------|--------------------|
| MX    | @                 | mailserver.purelymail.com                  | 10       | PurelyMail (keep)  |
| TXT   | @                 | v=spf1 include:purelymail.com include:mailgun.org ~all | -  | Updated SPF      |
| TXT   | pm._domainkey     | [PurelyMail DKIM key]                      | -        | PurelyMail (keep)  |
| TXT   | smtp._domainkey   | k=rsa; p=MIGf... [Mailgun DKIM]            | -        | Mailgun (new)      |
| CNAME | email             | mailgun.org                                | -        | Mailgun (new)      |

**✅ Total additions: 2 records (updated SPF + new DKIM + new CNAME)**

---

## 🎯 **Step 6: Verify DNS Propagation**

### **Wait 15-30 minutes** for DNS changes to propagate

**Then verify:**

1. **Check SPF record:**
   - Go to: https://mxtoolbox.com/spf.aspx
   - Enter: `evofit.io`
   - Should show: `v=spf1 include:purelymail.com include:mailgun.org ~all`

2. **Check DKIM records:**
   - Go to: https://mxtoolbox.com/SuperTool.aspx
   - Enter: `smtp._domainkey.evofit.io`
   - Select: "TXT Lookup"
   - Should show Mailgun DKIM key

3. **Check MX records:**
   - Go to: https://mxtoolbox.com/mx.aspx
   - Enter: `evofit.io`
   - Should show: `mailserver.purelymail.com` (PurelyMail only)

---

## 🎯 **Step 7: Update Mailgun Domain in .env**

**Once DNS is verified in Mailgun:**

1. Open: `C:\Users\drmwe\Claude\FitnessMealPlanner\.env`

2. Find this line:
   ```env
   MAILGUN_DOMAIN="sandbox7f37b71996344471910147658f98f8e5.mailgun.org"
   ```

3. Change to:
   ```env
   MAILGUN_DOMAIN="evofit.io"
   ```

4. Verify full Mailgun config:
   ```env
   MAILGUN_API_KEY="key-YOUR_MAILGUN_API_KEY_HERE"
   MAILGUN_DOMAIN="evofit.io"
   MAILGUN_API_BASE_URL="https://api.mailgun.net/v3"
   FROM_EMAIL="EvoFitMeals <hello@evofit.io>"
   ```

5. Save file

---

## ✅ **How This Works**

### **Receiving Emails (PurelyMail):**
```
Someone sends email to: hello@evofit.io
    ↓
DNS MX record points to: mailserver.purelymail.com
    ↓
PurelyMail receives and stores in your inbox
    ↓
You read it in PurelyMail web interface
```

### **Sending Emails (Mailgun):**
```
Web app needs to send invitation
    ↓
App calls Mailgun API with your credentials
    ↓
Mailgun sends email from: hello@evofit.io
    ↓
Email passes SPF check (include:mailgun.org)
    ↓
Email passes DKIM check (smtp._domainkey)
    ↓
Customer receives invitation email
```

**Both work independently!**

---

## 🔍 **Troubleshooting**

### **Problem: "SPF record already exists" error**

**Solution:**
- Don't ADD a new SPF record
- UPDATE the existing one to include both services
- Only ONE SPF record is allowed per domain

---

### **Problem: Emails going to spam**

**Checklist:**
- [ ] SPF record includes both `purelymail.com` and `mailgun.org`
- [ ] Mailgun DKIM record verified (smtp._domainkey)
- [ ] FROM_EMAIL matches `hello@evofit.io`
- [ ] Domain verified in Mailgun dashboard
- [ ] Wait 24-48 hours for sender reputation to build

---

### **Problem: Can't receive emails to hello@evofit.io**

**Solution:**
- Make sure you kept PurelyMail MX records
- Don't delete or modify `mailserver.purelymail.com` MX record
- Check PurelyMail dashboard to verify domain is still active

---

### **Problem: Mailgun says "Domain not verified"**

**Checklist:**
- [ ] SPF record updated (not replaced) with `include:mailgun.org`
- [ ] DKIM record added at `smtp._domainkey` hostname
- [ ] CNAME record added at `email` hostname
- [ ] Waited 15-30 minutes for DNS propagation
- [ ] Clicked "Verify DNS Settings" in Mailgun dashboard

---

## 📋 **Implementation Checklist**

### **DNS Configuration:**
- [ ] Logged into DigitalOcean
- [ ] Navigated to Networking → Domains → evofit.io
- [ ] Noted existing PurelyMail MX records (don't delete)
- [ ] Updated SPF TXT record to include both services
- [ ] Added Mailgun DKIM TXT record (smtp._domainkey)
- [ ] Added Mailgun CNAME record (email → mailgun.org)
- [ ] Did NOT add Mailgun MX records
- [ ] Waited 15-30 minutes for propagation

### **Mailgun Verification:**
- [ ] Added evofit.io domain in Mailgun dashboard
- [ ] Clicked "Verify DNS Settings" in Mailgun
- [ ] All records show green checkmarks (except MX - that's OK)
- [ ] Domain status shows "Active" or "Verified"

### **Application Configuration:**
- [ ] Updated MAILGUN_DOMAIN in .env to "evofit.io"
- [ ] Installed mailgun.js package: `npm install mailgun.js form-data`
- [ ] Updated emailService.ts to use Mailgun
- [ ] Restarted development server

### **Testing:**
- [ ] Sent test email via Mailgun
- [ ] Email received by customer
- [ ] Checked Mailgun logs (should show delivered)
- [ ] PurelyMail still receiving emails to hello@evofit.io

---

## 🎉 **Success Criteria**

**When everything works:**
- ✅ Web app can send invitations via Mailgun
- ✅ Emails come from `hello@evofit.io`
- ✅ Emails don't go to spam
- ✅ You can still receive emails in PurelyMail inbox
- ✅ Mailgun dashboard shows sent emails
- ✅ No DNS conflicts between services

---

## 📚 **Additional Resources**

- **DigitalOcean DNS Management:** https://cloud.digitalocean.com/networking/domains
- **Mailgun Dashboard:** https://app.mailgun.com
- **PurelyMail Dashboard:** https://purelymail.com
- **SPF Record Checker:** https://mxtoolbox.com/spf.aspx
- **DKIM Record Checker:** https://mxtoolbox.com/dkim.aspx
- **MX Record Checker:** https://mxtoolbox.com/mx.aspx

---

## 💡 **Pro Tips**

1. **Always keep PurelyMail MX records** - They handle incoming mail
2. **Update SPF, don't replace** - Both services need to be listed
3. **Different DKIM hostnames** - PurelyMail uses `pm._domainkey`, Mailgun uses `smtp._domainkey`
4. **Monitor both services** - Check PurelyMail for receives, Mailgun for sends
5. **Keep backups** - Screenshot your DNS before making changes

---

**Created:** November 11, 2025
**Status:** Production-ready dual email setup guide
**Use Case:** Receiving via PurelyMail + Sending via Mailgun

---

**END OF GUIDE**
