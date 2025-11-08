# Stripe Hybrid Pricing - Quick Start Guide
**Status:** ✅ Code Complete - Ready for Stripe Configuration
**Estimated Time:** 45-60 minutes

---

## 🎉 **What's Already Done**

✅ **Backend Infrastructure** - Stripe service, API routes, webhook handler (800+ lines)
✅ **Frontend Pricing Page** - Beautiful hybrid pricing UI with toggle (580 lines)
✅ **Database Schema** - Migration ready with subscription fields
✅ **Server Integration** - Routes registered in server/index.ts
✅ **Client Routing** - Pricing page accessible at /pricing
✅ **Environment Configuration** - .env.example updated with Stripe variables

**Your Next Steps:** Configure Stripe account & test the system

---

## 📋 **Step-by-Step Configuration (45 min)**

### **Step 1: Create Stripe Account** (5 minutes)

1. Visit: https://dashboard.stripe.com/register
2. Sign up with your email
3. Complete business information
4. Skip business verification for test mode (do later for production)

---

### **Step 2: Create Subscription Products** (15 minutes)

1. **Go to Products:** https://dashboard.stripe.com/products
2. **Click "Add product"**

#### **Product 1: Starter Pro**
- **Name:** Starter Pro
- **Description:** Perfect for new trainers - Up to 9 clients, unlimited meal plans
- **Pricing:**
  - **Price:** $14.99
  - **Billing period:** Monthly
  - **Currency:** USD
- **Click "Save product"**
- **📋 COPY the Price ID** (format: `price_xxxxx`) → Save this!

#### **Product 2: Professional Pro**
- **Name:** Professional Pro
- **Description:** For growing practices - Up to 20 clients, unlimited meal plans
- **Pricing:**
  - **Price:** $29.99
  - **Billing period:** Monthly
  - **Currency:** USD
- **Click "Save product"**
- **📋 COPY the Price ID** → Save this!

#### **Product 3: Enterprise Pro**
- **Name:** Enterprise Pro
- **Description:** For teams and gyms - Up to 50 clients, unlimited meal plans
- **Pricing:**
  - **Price:** $59.99
  - **Billing period:** Monthly
  - **Currency:** USD
- **Click "Save product"**
- **📋 COPY the Price ID** → Save this!

---

### **Step 3: Get API Keys** (5 minutes)

1. **Go to:** https://dashboard.stripe.com/apikeys
2. **Find "Secret key"** in the "Standard keys" section
3. **Click "Reveal test key"** (starts with `sk_test_`)
4. **📋 COPY the Secret Key** → Save this!

**⚠️ Important:** Use test keys for development, live keys for production

---

### **Step 4: Configure Webhook** (10 minutes)

1. **Go to:** https://dashboard.stripe.com/webhooks
2. **Click "Add endpoint"**
3. **Endpoint URL:** `http://localhost:4000/api/subscription/webhook` (for development)
4. **Description:** FitnessMealPlanner Subscription Events
5. **Select events to listen to:**
   - Click "Select events"
   - Find and check:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_failed`
6. **Click "Add endpoint"**
7. **📋 COPY the Signing secret** (starts with `whsec_`) → Save this!

**📝 Note:** For production, update the endpoint URL to your live domain

---

### **Step 5: Update .env File** (5 minutes)

1. **Open** `C:\Users\drmwe\Claude\FitnessMealPlanner\.env`
2. **Add these lines** (replace with your actual values):

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET_HERE
STRIPE_PRICE_ID_STARTER_MONTHLY=price_YOUR_STARTER_PRICE_ID
STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY=price_YOUR_PROFESSIONAL_PRICE_ID
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_YOUR_ENTERPRISE_PRICE_ID
```

3. **Save the file**

**✅ Your .env file should now have all Stripe configuration!**

---

### **Step 6: Run Database Migration** (5 minutes)

Open PowerShell in the project directory:

```powershell
# Navigate to project
cd C:\Users\drmwe\Claude\FitnessMealPlanner

# Backup database first (IMPORTANT!)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
docker exec fitnessmealplanner-db pg_dump -U postgres fitnessmealplanner > "backup_$timestamp.sql"

# Run the migration
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fitnessmealplanner"
npm run migrate 0020_add_subscription_fields.sql
```

**✅ Database is now ready for subscriptions!**

---

### **Step 7: Start Development Server** (2 minutes)

```powershell
# Start Docker containers (if not already running)
docker-compose --profile dev up -d

# Wait 30 seconds for containers to start

# Start the development server
npm run dev
```

**✅ Server starting at http://localhost:4000**

---

### **Step 8: Test the System** (15 minutes)

#### **Test 1: View Pricing Page**
1. **Open browser:** http://localhost:4000/pricing
2. **Verify:** You see the hybrid pricing page
3. **Toggle:** Switch between "Monthly Subscription" and "One-Time Payment"
4. **Check:** All 3 tiers display correctly (Starter, Professional, Enterprise)

**✅ Expected:** Beautiful pricing page with toggle working

---

#### **Test 2: Test Subscription Checkout**
1. **On pricing page:** Click "Get Started" on any tier (with "Monthly Subscription" selected)
2. **Verify:** Redirects to Stripe Checkout
3. **Fill in test data:**
   - **Email:** test@example.com
   - **Card number:** 4242 4242 4242 4242
   - **Expiry:** Any future date (e.g., 12/25)
   - **CVC:** Any 3 digits (e.g., 123)
   - **Name:** Test User
4. **Click "Subscribe"**
5. **Verify:** Redirects back to your site (success page)

**✅ Expected:** Payment succeeds, webhook received

---

#### **Test 3: Verify Webhook Received**
1. **Check server logs:** Look for "Webhook event received"
2. **Check database:**
   ```sql
   SELECT email, stripe_customer_id, stripe_subscription_id, subscription_status
   FROM users
   WHERE email = 'test@example.com';
   ```
3. **Verify:** User has Stripe customer ID and subscription ID

**✅ Expected:** Database updated with subscription info

---

#### **Test 4: Test One-Time Payment**
1. **On pricing page:** Toggle to "One-Time Payment"
2. **Click "Get Started"** on any tier
3. **Complete test payment** (same test card: 4242 4242 4242 4242)
4. **Verify:** Payment succeeds

**✅ Expected:** One-time payment processed successfully

---

## ✅ **Success Checklist**

After completing all steps, you should have:

- ✅ Stripe account created
- ✅ 3 subscription products created ($14.99, $29.99, $59.99)
- ✅ Price IDs copied and added to .env
- ✅ API keys copied and added to .env
- ✅ Webhook endpoint configured
- ✅ Database migration completed
- ✅ Development server running
- ✅ Pricing page accessible at /pricing
- ✅ Subscription checkout working
- ✅ Webhooks being received
- ✅ Database updating with subscription data
- ✅ One-time payment working

---

## 🚨 **Troubleshooting**

### **Issue 1: "Price ID not configured for tier"**
**Cause:** Environment variables not loaded
**Fix:**
1. Verify .env file has STRIPE_PRICE_ID_* variables
2. Restart server: `npm run dev`
3. Check server logs for "Stripe Price ID" messages

---

### **Issue 2: Webhook not received**
**Cause:** Webhook endpoint not reachable
**Fix (Development):**
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:4000/api/subscription/webhook`
3. Copy the webhook secret it gives you
4. Add to .env: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

### **Issue 3: Checkout session creation fails**
**Cause:** Invalid Stripe API key
**Fix:**
1. Go to: https://dashboard.stripe.com/apikeys
2. Verify you're using the correct test key
3. Make sure key starts with `sk_test_` (not `sk_live_`)
4. Update .env and restart server

---

### **Issue 4: Database migration fails**
**Cause:** Migration already run or syntax error
**Fix:**
```sql
-- Check if migration ran
SELECT * FROM users LIMIT 1;
-- If you see stripe_customer_id column, migration succeeded

-- If stuck, reset migration:
-- (WARNING: Only in development!)
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
-- Then re-run migration
```

---

## 📊 **Next Steps After Testing**

### **Immediate (This Week):**
- ✅ Test all 3 subscription tiers
- ✅ Test one-time payments
- ✅ Verify webhooks for all events
- ✅ Test cancellation flow
- ✅ Test customer portal access

### **Short-Term (Next 2 Weeks):**
- Implement usage limit enforcement
- Add usage dashboard for customers
- Create grandfather policy for existing users
- Draft customer communication emails
- Update FAQ with subscription info

### **Medium-Term (Month 1-3):**
- Deploy to production with live Stripe keys
- Set up production webhook endpoint
- Launch marketing campaign for new pricing
- Monitor conversion rates (target: 30% subscription adoption)
- A/B test pricing variations

---

## 📈 **Expected Business Impact**

**Current Model (One-Time Only):**
- 10-year profit: **-$91,360 loss** ❌
- Break-even: Year 8-9
- Unsustainable

**Hybrid Model (After Launch):**
- 10-year profit: **+$1,828,547** ✅
- Break-even: Year 1
- Sustainable & scalable

**First 90 Days Target:**
- 100 new customers
- 30% subscription adoption
- $38,400 revenue
- Path to profitability: CONFIRMED ✅

---

## 💡 **Pro Tips**

1. **Use Stripe Test Mode** for all development
2. **Test with multiple browsers** (Chrome, Firefox, Safari)
3. **Test mobile responsive** pricing page
4. **Monitor Stripe Dashboard** for real-time payment activity
5. **Set up Stripe alerts** for failed payments
6. **Document your test results** in a spreadsheet

---

## 📞 **Need Help?**

### **Stripe Resources:**
- Dashboard: https://dashboard.stripe.com
- Documentation: https://stripe.com/docs
- Testing Guide: https://stripe.com/docs/testing
- Webhook Testing: https://stripe.com/docs/webhooks/test

### **Project Documentation:**
- Financial Analysis: `docs/financial/EXECUTIVE_SUMMARY_FINANCIALS.md`
- Implementation Guide: `docs/HYBRID_PRICING_IMPLEMENTATION_SUMMARY.md`
- API Routes: `server/routes/subscriptionRoutes.ts` (inline comments)

---

## 🎉 **You're Ready to Launch!**

Once all tests pass, you're ready to:
1. Deploy to production
2. Switch to live Stripe keys
3. Launch marketing campaign
4. Transform your business model from loss to profit

**Congratulations on implementing the hybrid pricing model!** 🚀

---

**Document Created:** November 5, 2025
**Status:** Ready for User Configuration
**Next Update:** After successful testing
