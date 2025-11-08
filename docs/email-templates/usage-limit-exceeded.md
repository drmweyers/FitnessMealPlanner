# Usage Limit Exceeded Email

**Subject:** You've Reached Your Monthly Meal Plan Limit

---

## Email Body

Hi [Customer Name],

You've reached your monthly meal plan generation limit for [Month].

### Current Status

🚫 **[Monthly Limit] of [Monthly Limit] meal plans used** (100%)

You cannot generate new meal plans until [Reset Date] when your usage counter resets.

### Your Options

**Option 1: Wait for Reset (FREE)**
Your usage counter automatically resets on **[Reset Date]** at midnight.
After reset, you'll have [Monthly Limit] meal plans available again.

**Option 2: Upgrade to Subscription (RECOMMENDED) ⚡**
Get unlimited meal plan generation right now with a subscription plan:

| Plan | Monthly Price | What You Get |
|------|--------------|--------------|
| Starter Subscription | $19/month | ✅ UNLIMITED meal plans |
| Professional Subscription | $49/month | ✅ UNLIMITED meal plans |
| Enterprise Subscription | $99/month | ✅ UNLIMITED meal plans + priority support |

**Upgrade now and generate your next meal plan in seconds!**

[⚡ Upgrade to Unlimited](https://evofitmeals.com/pricing?upgrade=true&from=limit-exceeded)

### Why Subscription?

If you're hitting your monthly limit, a subscription plan will:

✅ **Save you time** - No more waiting for monthly resets
✅ **Save you money** - More cost-effective than multiple one-time purchases
✅ **Remove limits** - Generate unlimited meal plans every month
✅ **Flexible** - Cancel anytime with no penalties

### How Many Meal Plans Do You Need?

**Average Usage by Trainer Type:**

- **Personal Trainers (1-10 clients):** 15-30 meal plans/month → ✅ Starter Subscription
- **Nutrition Coaches (10-25 clients):** 40-80 meal plans/month → ✅ Professional Subscription
- **Gym Owners (25+ clients):** 100+ meal plans/month → ✅ Enterprise Subscription

### Your Usage This Month

- **Meal Plans Generated:** [Current Usage]
- **Peak Usage Day:** [Peak Date]
- **Average per Week:** [Weekly Average]

[📊 View Full Usage Report](https://evofitmeals.com/usage/report)

### Need Help Deciding?

We're here to help you choose the right plan:

- **Email:** support@evofitmeals.com
- **FAQ:** [evofitmeals.com/faq#upgrade](https://evofitmeals.com/faq#upgrade)
- **Compare Plans:** [evofitmeals.com/pricing](https://evofitmeals.com/pricing)

### What Happens to My One-Time Payment?

If you upgrade to a subscription:
- ✅ Your one-time payment remains valid
- ✅ You can switch back to one-time plan anytime
- ✅ No money lost - you keep both options

We appreciate your business and want to help you serve your clients without limits!

Best regards,
The EvoFit Meals Team

---

## Email Footer

**P.S.** Upgrade today and get your first month for 20% off with code: **UPGRADE20**

---

## Technical Details (for sending)

- **Recipient Segment:** One-time payment users at 100% usage
- **Send Trigger:** When user attempts to generate meal plan and receives 429 error
- **Send Once:** Yes (only send once per month at 100% threshold)
- **Priority:** High
- **From:** EvoFit Meals Team <noreply@evofitmeals.com>
- **Reply-To:** support@evofitmeals.com
- **Tracking:** Open rate, upgrade click-through rate, conversion rate
- **A/B Test:** Test different discount codes (20% vs $10 off first month)
- **Variables:**
  - `[Customer Name]`
  - `[Monthly Limit]`
  - `[Month]`
  - `[Reset Date]`
  - `[Current Usage]`
  - `[Peak Date]`
  - `[Weekly Average]`
