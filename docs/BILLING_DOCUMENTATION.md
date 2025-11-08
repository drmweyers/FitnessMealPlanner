# EvoFit Meals - Billing Documentation

## Table of Contents

1. [Overview](#overview)
2. [Payment Processing](#payment-processing)
3. [Subscription Billing](#subscription-billing)
4. [One-Time Payment Billing](#one-time-payment-billing)
5. [Billing Management](#billing-management)
6. [Invoices](#invoices)
7. [Refund Policy](#refund-policy)
8. [Failed Payments](#failed-payments)
9. [Tax Information](#tax-information)
10. [Security & Compliance](#security--compliance)

---

## Overview

### Payment Models

EvoFit Meals offers two payment models:

**1. Subscription Plans** (Recurring Monthly Billing)
- Charged automatically each month
- Unlimited meal plan generation
- Cancel anytime, no commitment

**2. One-Time Payment Plans** (Pay Once, Use Forever)
- Single payment, no recurring charges
- Limited monthly meal plan generation (20, 50, or 150)
- Lifetime access to platform

### Pricing Tiers

| Tier | Subscription | One-Time Payment |
|------|-------------|------------------|
| **Starter** | $19/month | $29 one-time |
| **Professional** | $49/month | $59 one-time |
| **Enterprise** | $99/month | $149 one-time |

### Currency

All prices are in **USD (United States Dollars)**.

---

## Payment Processing

### Payment Provider

EvoFit Meals uses **Stripe** for all payment processing:

- ✅ PCI-DSS Level 1 certified (highest security standard)
- ✅ Trusted by millions of businesses worldwide
- ✅ 256-bit SSL encryption
- ✅ Credit card information never stored on our servers

**We never see or store your full credit card number.**

### Accepted Payment Methods

**Credit & Debit Cards:**
- ✅ Visa
- ✅ Mastercard
- ✅ American Express
- ✅ Discover
- ✅ Diners Club
- ✅ JCB

**Other Payment Methods:**
- ❌ PayPal (not currently supported)
- ❌ Bank transfers (not currently supported)
- ❌ Cryptocurrency (not currently supported)

### Payment Authorization

**When you sign up:**

1. **Authorization hold:** We place a $1 authorization hold on your card to verify it's valid
2. **Hold release:** The $1 hold is automatically released within 1-3 business days
3. **Actual charge:** Your card is charged the full amount of your selected plan

**This is standard practice to prevent fraud.**

### Billing Descriptor

Your credit card statement will show:
```
EVOFITMEAL*SUBSCRIPTION
```
or
```
EVOFITMEAL*ONETIME
```

---

## Subscription Billing

### Billing Cycle

**Monthly billing cycle:**
- Charged on the same day each month
- Example: Sign up Jan 15 → Charged Jan 15, Feb 15, Mar 15, etc.

### First Charge

**When you subscribe:**
- ✅ Charged immediately upon sign-up
- ✅ Unlimited access starts right away
- ✅ Billing date set to today's date

**Example:**
- Sign up: January 15, 2025 at 2:30 PM
- First charge: January 15, 2025 at 2:30 PM ($19/$49/$99)
- Next charge: February 15, 2025 at 12:00 AM

### Recurring Charges

**Monthly recurring charges:**
- Automatically charged on your billing date each month
- Email reminder sent 3 days before billing date
- Email receipt sent immediately after successful charge

**Billing time:**
- Charged at **12:00 AM UTC** on your billing date
- Example: If billing date is the 15th, charged at midnight UTC on the 15th

### Pro-Rated Charges (Upgrades)

**When you upgrade mid-cycle:**

1. **Calculate days remaining** in current billing period
2. **Calculate prorated amount** for new tier
3. **Charge the difference** immediately
4. **Next month:** Charged full price of new tier

**Formula:**
```
Prorated Charge = (New Tier Price - Old Tier Price) × (Days Remaining / Days in Month)
```

**Example:**
- Current: Starter ($19/month), billing date is 15th
- Upgrade on: Jan 7 (8 days into 31-day month)
- New: Professional ($49/month)
- Days remaining: 23 days
- Prorated charge: ($49 - $19) × (23 / 31) = $22.26
- Next billing (Feb 15): $49 (full Professional price)

### Downgrades

**When you downgrade:**
- ✅ Downgrade takes effect at **end of current billing period**
- ✅ You keep current tier benefits until then
- ✅ **No refund** for the difference
- ✅ Next month: Charged lower tier price

**Example:**
- Current: Enterprise ($99/month), billing date is 15th
- Downgrade on: Jan 7
- Until Feb 15: Still have Enterprise access ($99 already paid)
- Feb 15 onwards: Switched to Professional ($49/month)

### Billing Reminders

**3 Days Before Renewal:**
- Email sent to registered email address
- Subject: "Your EvoFit Meals Subscription Renews in 3 Days"
- Includes: renewal date, amount, payment method

### Payment Receipts

**After Every Successful Charge:**
- Email receipt sent immediately
- Subject: "Receipt for Your EvoFit Meals Subscription"
- Includes: invoice number, amount, date, plan details
- PDF invoice attached (download available in billing dashboard)

---

## One-Time Payment Billing

### Single Charge

**When you purchase:**
- ✅ Charged once, immediately upon purchase
- ✅ Lifetime access to platform
- ✅ **No recurring charges** ever

### No Monthly Billing

One-time payment customers are **never charged again** unless they:
1. Upgrade to a subscription plan (monthly billing starts)
2. Purchase a different tier (new one-time charge)

### Usage Limits

**Monthly usage limits apply:**
- Starter: 20 meal plans/month
- Professional: 50 meal plans/month
- Enterprise: 150 meal plans/month

**Limits reset on the 1st of each month at midnight UTC.**

### Adding Payment Method (Optional)

One-time payment customers **do not need** to keep a payment method on file.

**Payment method only needed if you want to:**
- Upgrade to a subscription plan later
- Have it ready for future purchases

---

## Billing Management

### Accessing Billing Dashboard

**URL:** [evofitmeals.com/billing](https://evofitmeals.com/billing)

**What you can do:**
- ✅ View current plan and pricing
- ✅ See next billing date (subscriptions)
- ✅ Update payment method
- ✅ View billing history
- ✅ Download invoices
- ✅ Change plan (upgrade/downgrade)
- ✅ Cancel subscription

### Updating Payment Method

**How to update your card:**

1. Go to **[Billing Dashboard](https://evofitmeals.com/billing)**
2. Click **"Payment Method"** tab
3. Click **"Update Payment Method"**
4. Enter new card information
5. Click **"Save Changes"**

**When changes take effect:**
- ✅ Immediately for future charges
- ✅ Your next billing will use the new card

**Security:**
- ✅ Old card information is securely deleted from Stripe
- ✅ New card information encrypted and stored on Stripe's servers
- ✅ We never store full card numbers

### Viewing Billing History

**Access billing history:**

1. Go to **[Billing Dashboard](https://evofitmeals.com/billing)**
2. Click **"Billing History"** tab
3. See all past charges

**Each entry shows:**
- Date of charge
- Amount charged
- Status (Succeeded, Failed, Refunded)
- Invoice number
- Download link for PDF invoice

**History retention:**
- ✅ All charges retained permanently
- ✅ Access invoices anytime
- ✅ Export to CSV for accounting

---

## Invoices

### Automatic Invoice Generation

**Invoices automatically generated for:**
- ✅ Every subscription charge
- ✅ Every one-time payment
- ✅ Every upgrade/downgrade charge

### Accessing Invoices

**Method 1: Email**
- PDF invoice attached to payment receipt email
- Subject: "Receipt for Your EvoFit Meals [Subscription/Payment]"

**Method 2: Billing Dashboard**
1. Go to **[Billing History](https://evofitmeals.com/billing/history)**
2. Find the charge
3. Click **"Download Invoice"**
4. PDF downloads automatically

**Method 3: Direct Link**
- Each invoice has a unique URL
- Format: `https://evofitmeals.com/invoices/[invoice-id]`
- Accessible anytime (requires login)

### Invoice Contents

**Every invoice includes:**

```
═══════════════════════════════════════════════════════════
                        INVOICE
                      EvoFit Meals
                  support@evofitmeals.com
═══════════════════════════════════════════════════════════

Invoice #: INV-2025-00001
Date: January 15, 2025
Status: PAID

───────────────────────────────────────────────────────────
BILL TO:
[Business Name]
[Business Address]
[Tax ID / VAT Number]

───────────────────────────────────────────────────────────
DESCRIPTION                          QTY      PRICE    AMOUNT
───────────────────────────────────────────────────────────
Professional Subscription             1     $49.00    $49.00
Billing Period: Jan 15 - Feb 14, 2025

───────────────────────────────────────────────────────────
                                      SUBTOTAL:      $49.00
                                      TAX:           $0.00
                                      ═══════════════════════
                                      TOTAL:         $49.00
───────────────────────────────────────────────────────────

PAYMENT METHOD: Visa ending in 4242
PAYMENT DATE: January 15, 2025

Thank you for your business!

Questions? Contact support@evofitmeals.com
═══════════════════════════════════════════════════════════
```

### Adding Business Information to Invoices

**To include your business details on invoices:**

1. Go to **[Profile Settings](https://evofitmeals.com/profile)**
2. Under **"Business Information"**, add:
   - Business name
   - Business address
   - Tax ID / VAT number (optional)
   - Company email (optional)
3. Click **"Save Changes"**

**Future invoices will include this information automatically.**

### Invoice Numbering

**Format:** `INV-YYYY-#####`
- `INV` = Invoice prefix
- `YYYY` = Year
- `#####` = Sequential number (5 digits)

**Example:** `INV-2025-00142`

---

## Refund Policy

### Subscription Plans

**Monthly subscription charges:**
- ❌ **No refunds** on monthly subscription payments
- ✅ You keep access for the full billing period you paid for
- ✅ Cancel anytime to avoid future charges

**Why no refunds:**
- Subscriptions are month-to-month with no commitment
- You receive immediate unlimited access upon payment
- Services are rendered immediately (digital product)

**Example:**
- Charged $49 on Jan 15 for Jan 15 - Feb 14
- Request refund on Jan 20
- Refund denied, but you keep access until Feb 15
- Cancel to avoid Feb 15 charge

### One-Time Payments

**30-day money-back guarantee:**
- ✅ Full refund within 30 days of purchase
- ✅ No questions asked
- ✅ Contact support@evofitmeals.com to request

**After 30 days:**
- ❌ No refunds
- ✅ Lifetime access remains valid

**Refund process:**
1. Email **support@evofitmeals.com** with:
   - Account email
   - Reason for refund (optional but appreciated)
   - Purchase date
2. Receive response within 24 hours
3. Refund processed within 3-5 business days
4. Refund appears on card within 5-10 business days

### Exceptions

**Refunds may be denied if:**
- ❌ You've violated Terms of Service
- ❌ Account flagged for abuse or fraud
- ❌ Excessive usage before refund request (subscription users)

### Partial Refunds

**Partial refunds are NOT available:**
- ❌ Cannot refund part of a subscription month
- ❌ Cannot refund unused meal plan credits (one-time payments)

---

## Failed Payments

### Why Payments Fail

**Common reasons:**
- Insufficient funds
- Expired credit card
- Incorrect card information
- Card issuer declined charge
- Card reported lost or stolen
- Fraud prevention triggered

### What Happens When Payment Fails

**Immediate:**
1. ❌ Payment fails
2. 📧 Email notification sent: "Your EvoFit Meals Payment Failed"
3. ⚠️ Account status changed to "Past Due"

**Retry Schedule:**

**Retry 1:** 3 days after failure
- Automatic retry attempt
- Email notification if still fails

**Retry 2:** 7 days after failure
- Second automatic retry
- Email notification if still fails

**Retry 3:** 14 days after failure
- Final automatic retry
- Email notification if still fails

**After All Retries Fail:**
- Account status: "Suspended"
- Subscription canceled automatically
- Access restricted (cannot generate new meal plans)

### During "Past Due" Status

**What you CAN do:**
- ✅ View existing meal plans
- ✅ Access client data
- ✅ Update payment method

**What you CANNOT do:**
- ❌ Generate new meal plans
- ❌ Create new recipes
- ❌ Invite new clients

### Updating Payment Method After Failure

**How to fix failed payment:**

1. Go to **[Billing Dashboard](https://evofitmeals.com/billing/payment-method)**
2. Click **"Update Payment Method"**
3. Enter valid card information
4. Click **"Save"**
5. We'll automatically retry the charge immediately
6. If successful, account status returns to "Active"

### Reactivating After Suspension

**If your subscription was canceled due to failed payment:**

1. Go to **[Billing Dashboard](https://evofitmeals.com/billing/reactivate)**
2. Click **"Reactivate Subscription"**
3. Enter valid payment information
4. Click **"Reactivate"**
5. You'll be charged for a new billing cycle
6. Unlimited access resumes immediately

---

## Tax Information

### Sales Tax / VAT

**Current policy:**
- Taxes are **NOT currently collected** for digital services
- May change based on your location and local regulations

**If taxes are collected in the future:**
- You'll be notified 30 days in advance
- Invoices will clearly show tax amounts
- Tax information will be included on invoices

### Tax ID / VAT Number

**Adding your Tax ID:**

1. Go to **[Profile Settings](https://evofitmeals.com/profile)**
2. Under **"Business Information"**
3. Add **"Tax ID / VAT Number"**
4. Click **"Save"**

**This information will appear on future invoices.**

### Business Expense Deduction

**Is EvoFit Meals tax-deductible?**

Consult your tax professional, but generally:
- ✅ Likely deductible as a business expense for fitness professionals
- ✅ Categorize as: "Software" or "Business Tools"
- ✅ Keep invoices for tax records

**We are not tax professionals. Consult your accountant.**

---

## Security & Compliance

### PCI DSS Compliance

**Stripe (our payment processor) is:**
- ✅ PCI-DSS Level 1 certified (highest security level)
- ✅ Audited annually by independent security firms
- ✅ Compliant with all credit card industry standards

**EvoFit Meals:**
- ✅ Never stores full credit card numbers
- ✅ Never has access to full card data
- ✅ Uses Stripe's secure tokenization system

### Data Encryption

**All payment data is encrypted:**
- ✅ **In transit:** 256-bit SSL/TLS encryption
- ✅ **At rest:** AES-256 encryption on Stripe's servers
- ✅ **Tokenization:** Card data replaced with secure tokens

### GDPR Compliance

**For EU customers:**
- ✅ Right to access your data
- ✅ Right to delete your data
- ✅ Right to data portability
- ✅ Transparent data processing

**Exercise your rights:**
- Email **privacy@evofitmeals.com**
- See our [Privacy Policy](https://evofitmeals.com/privacy)

### Fraud Prevention

**Automated fraud detection:**
- ✅ Stripe Radar monitors all transactions
- ✅ Machine learning identifies suspicious patterns
- ✅ High-risk transactions automatically blocked

**If your payment is flagged:**
- Email sent: "Payment Requires Verification"
- Contact support@evofitmeals.com to verify
- Provide proof of identity and card ownership

### Secure Billing Dashboard

**Your billing dashboard is protected:**
- ✅ Requires login (email + password)
- ✅ Two-factor authentication available (recommended)
- ✅ Session timeout after 30 minutes of inactivity
- ✅ SSL encryption for all traffic

---

## Frequently Asked Questions

### Can I change my billing date?

**No.** Your billing date is set when you first subscribe and cannot be changed.

**Workaround:**
1. Cancel your current subscription
2. Wait until your desired billing date
3. Re-subscribe on that date (new billing date set)

### Do you offer annual billing?

**Not currently.** All subscriptions are monthly only.

**Annual billing may be added in the future** - sign up for our newsletter to stay updated.

### Can I share my account with team members?

**No.** Each account is for individual use only.

**For teams:**
- Each team member needs their own account
- Contact **enterprise@evofitmeals.com** for bulk pricing options

### What happens if I have both a subscription and one-time payment?

**Your subscription takes priority:**
- ✅ Unlimited access while subscription is active
- ✅ Monthly billing continues
- ✅ If you cancel subscription, you revert to one-time payment plan
- ✅ One-time payment remains valid as a "backup plan"

### Can I transfer my subscription to another email?

**No.** Subscriptions are tied to the account email and cannot be transferred.

**To use a different email:**
1. Cancel current subscription
2. Create new account with new email
3. Subscribe with new account

**Note:** This creates a new billing cycle and you lose grandfather status (if applicable).

### How do I delete my payment information?

**Subscription customers:**
- ❌ Cannot delete while subscription is active (needed for recurring billing)
- ✅ Cancel subscription first, then delete payment method

**One-time payment customers:**
1. Go to **[Billing Dashboard](https://evofitmeals.com/billing/payment-method)**
2. Click **"Remove Payment Method"**
3. Confirm deletion

---

## Contact Billing Support

**Need help with billing?**

- **📧 Email:** billing@evofitmeals.com (response within 24 hours)
- **💬 Live Chat:** [evofitmeals.com](https://evofitmeals.com) (Mon-Fri, 9am-5pm EST)
- **📞 Phone:** Not currently available (email preferred)

**For urgent billing issues (failed payment, suspended account):**
- Mark email as **"URGENT: Billing Issue"**
- We'll prioritize and respond within 4 hours during business hours

---

**Last Updated:** [Current Date]
**Version:** 2.0 (Hybrid Pricing Model)
