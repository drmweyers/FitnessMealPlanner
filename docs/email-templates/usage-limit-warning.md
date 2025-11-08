# Usage Limit Warning Email (80% Threshold)

**Subject:** You're Approaching Your Monthly Meal Plan Limit

---

## Email Body

Hi [Customer Name],

Just a friendly heads-up about your EvoFit Meals account usage this month.

### Current Usage Status

📊 **[Current Usage] of [Monthly Limit] meal plans used** ([Percentage]%)

You have **[Remaining] meal plans remaining** for this month.

### Your Plan Details

- **Plan Type:** One-Time Payment
- **Tier Level:** [Starter | Professional | Enterprise]
- **Monthly Limit:** [20 | 50 | 150] meal plans
- **Usage Resets:** [Reset Date]

### What Happens When You Reach Your Limit?

When you reach your monthly limit, you'll see a message asking you to:
1. **Wait until [Reset Date]** when your usage counter resets, OR
2. **Upgrade to a subscription plan** for unlimited meal plan generation

### Want Unlimited Meal Plans? Upgrade Today!

Stop worrying about monthly limits. Switch to a subscription plan and enjoy:

✅ **UNLIMITED meal plan generation** every month
✅ **No usage counters** - generate as many plans as you need
✅ **Cancel anytime** - no long-term commitment
✅ **Same great features** - plus unlimited access

**Subscription Pricing:**

| Plan | Monthly Price | Your Savings |
|------|--------------|--------------|
| Starter Subscription | $19/month | Compare to $29 one-time |
| Professional Subscription | $49/month | Compare to $59 one-time |
| Enterprise Subscription | $99/month | Compare to $149 one-time |

[⚡ Upgrade to Subscription](https://evofitmeals.com/pricing?upgrade=true&from=usage-warning)

### No Action Needed (Yet)

This is just a friendly reminder. You still have **[Remaining] meal plans** available this month. We'll send another notification if you reach your limit.

### Track Your Usage Anytime

View your real-time usage statistics in your dashboard:

[📊 View Usage Dashboard](https://evofitmeals.com/usage)

### Questions?

If you have questions about your usage or subscription options:

- **Email:** support@evofitmeals.com
- **FAQ:** [evofitmeals.com/faq#usage-limits](https://evofitmeals.com/faq#usage-limits)
- **Help Center:** [evofitmeals.com/help/billing](https://evofitmeals.com/help/billing)

Keep building amazing meal plans!

Best regards,
The EvoFit Meals Team

---

## Email Footer

**P.S.** Subscriptions can be canceled anytime with no penalties. Try it risk-free!

---

## Technical Details (for sending)

- **Recipient Segment:** One-time payment users at 80% usage
- **Send Trigger:** When `mealPlansGeneratedThisMonth >= (usageLimit * 0.8)`
- **Send Once:** Yes (only send once per month at 80% threshold)
- **Priority:** Medium
- **From:** EvoFit Meals Team <noreply@evofitmeals.com>
- **Reply-To:** support@evofitmeals.com
- **Tracking:** Open rate, upgrade click-through rate
- **Variables:**
  - `[Customer Name]`
  - `[Current Usage]`
  - `[Monthly Limit]`
  - `[Percentage]`
  - `[Remaining]`
  - `[Reset Date]`
  - `[Tier Level]`
