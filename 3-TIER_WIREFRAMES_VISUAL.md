# 3-Tier Trainer Profile System - Visual Wireframes & UI Mockups

Note: Export rules and versioned API
- Tier 2 exports: CSV only
- Tier 3 exports: CSV, Excel, PDF (and API analytics access)
- All HTTP endpoints are versioned under /api/v1

**Document Version:** 1.0
**Last Updated:** September 21, 2025
**Companion to:** 3-TIER_UX_UI_STRATEGY.md

---

## Desktop Wireframes

### 1. Tier Selection Page (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          🏋️ FitnessMealPlanner                                           │
│                                        Choose Your Growth Path                                           │
│                                   Find the perfect fit for your business                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                         │
│    ┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐      │
│    │     NEW TRAINER         │      │  GROWING PROFESSIONAL   │      │  ESTABLISHED BUSINESS   │      │
│    │        $199            │      │         $299            │      │         $399            │      │
│    │                        │      │      [MOST POPULAR]     │      │                        │      │
│    │  ┌─────────────────┐   │      │  ┌─────────────────┐   │      │  ┌─────────────────┐   │      │
│    │  │ 👶 Beginner    │   │      │  │ 🚀 Growing     │   │      │  │ 🏢 Enterprise  │   │      │
│    │  │     Icon       │   │      │  │     Icon       │   │      │  │     Icon       │   │      │
│    │  └─────────────────┘   │      │  └─────────────────┘   │      │  └─────────────────┘   │      │
│    │                        │      │                        │      │                        │      │
│    │ Perfect for trainers    │      │ Ideal for expanding    │      │ Built for established   │      │
│    │ just starting out       │      │ fitness businesses     │      │ fitness enterprises     │      │
│    │                        │      │                        │      │                        │      │
│    │ ✓ 9 customers          │      │ ✓ 20 customers         │      │ ✓ Unlimited customers   │      │
│    │ ✓ 1,000 meal plans     │      │ ✓ 2,500 meal plans     │      │ ✓ 5,000+ meal plans    │      │
│    │ ✓ Email support        │      │ ✓ Analytics dashboard  │      │ ✓ Advanced analytics    │      │
│    │ ✓ PDF exports          │      │ ✓ Customer groups      │      │ ✓ API access           │      │
│    │                        │      │ ✓ Priority support     │      │ ✓ White-label branding │      │
│    │                        │      │ ✓ Bulk operations      │      │ ✓ Dedicated manager    │      │
│    │                        │      │                        │      │                        │      │
│    │ ┌─────────────────────┐ │      │ ┌─────────────────────┐ │      │ ┌─────────────────────┐ │      │
│    │ │   Start 14-Day     │ │      │ │   Start 14-Day     │ │      │ │   Start 14-Day     │ │      │
│    │ │      Trial         │ │      │ │      Trial         │ │      │ │      Trial         │ │      │
│    │ └─────────────────────┘ │      │ └─────────────────────┘ │      │ └─────────────────────┘ │      │
│    │                        │      │                        │      │                        │      │
│    │   [Learn More]         │      │   [Learn More]         │      │   [Learn More]         │      │
│    └─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘      │
│                                                                                                         │
│                                                                                                         │
│                                  [📊 Compare All Features]                                             │
│                                                                                                         │
│    ┌─────────────────────────────────────────────────────────────────────────────────────────────┐   │
│    │                              💡 Not sure which plan is right?                                │   │
│    │                    Take our 2-minute assessment to get a recommendation                      │   │
│    │                                    [Take Assessment]                                         │   │
│    └─────────────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Tier 1 Dashboard (New Trainer)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏋️ FitnessMealPlanner    Welcome back, Alex!                                              [Tier 1] 👑    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │   🎉 Welcome to your fitness business journey!                                                 │   │
│  │   Everything you need to get started with your first clients                                   │   │
│  │                                                      [Quick Tour] [Settings] [Help]          │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                         │
│  ┌─────────────────────────────────────┐    ┌─────────────────────────────────────────────────────┐   │
│  │             My Customers            │    │                Quick Actions                        │   │
│  │        [6 / 9 customers] 📊        │    │                                                     │   │
│  ├─────────────────────────────────────┤    │  ┌───────────────────────────────────────────────┐ │   │
│  │                                     │    │  │ 📖 Browse Meal Plans (1,000 available)     │ │   │
│  │  👤 Sarah Johnson                   │    │  └───────────────────────────────────────────────┘ │   │
│  │      Weight Loss • Active           │    │  ┌───────────────────────────────────────────────┐ │   │
│  │      Last login: 2 hours ago        │    │  │ 🍽️ Generate Meal Plan                        │ │   │
│  │                                     │    │  └───────────────────────────────────────────────┘ │   │
│  │  👤 Mike Chen                       │    │  ┌───────────────────────────────────────────────┐ │   │
│  │      Muscle Gain • Active           │    │  │ 📄 Export PDF                               │ │   │
│  │      Last login: 1 day ago          │    │  └───────────────────────────────────────────────┘ │   │
│  │                                     │    │  ┌───────────────────────────────────────────────┐ │   │
│  │  👤 Emma Wilson                     │    │  │ 📧 Invite Customer                           │ │   │
│  │      Maintenance • Inactive         │    │  └───────────────────────────────────────────────┘ │   │
│  │      Last login: 5 days ago         │    │                                                     │   │
│  │                                     │    │                                                     │   │
│  │  ┌─────────────────────────────────┐ │    │                                                     │   │
│  │  │     ➕ Invite Customer          │ │    │                                                     │   │
│  │  │     (3 slots remaining)         │ │    │                                                     │   │
│  │  └─────────────────────────────────┘ │    │                                                     │   │
│  └─────────────────────────────────────┘    └─────────────────────────────────────────────────────┘   │
│                                                                                                         │
│  ⚠️ Want to see how your business is growing?                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │   📊 Unlock Analytics Dashboard - Available in Professional Plan                               │   │
│  │                                                                                                 │   │
│  │   See insights like:                                                                           │   │
│  │   • Customer engagement trends                                                                 │   │
│  │   • Most popular meal plans                                                                    │   │
│  │   • Progress achievement rates                                                                 │   │
│  │   • Revenue and growth metrics                                                                 │   │
│  │                                                                                                 │   │
│  │   [Upgrade to Professional - $100] [Learn More]                                               │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                 Recent Activity                                                │   │
│  ├─────────────────────────────────────────────────────────────────────────────────────────────────┤   │
│  │  🍽️ Created "Keto Weight Loss Plan" for Sarah Johnson                          2 hours ago    │   │
│  │  👤 Mike Chen completed Week 1 measurements                                     1 day ago      │   │
│  │  📄 Exported PDF meal plan for Emma Wilson                                      3 days ago     │   │
│  │  📧 Sent invitation to new customer: james@example.com                         1 week ago     │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Tier 2 Dashboard (Growing Professional)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏋️ FitnessMealPlanner    Professional Dashboard                                        [Tier 2] 💎       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                                    │
│  │📊 Customers │  │📅 Plans     │  │📈 Engagement│  │💰 Revenue   │                                    │
│  │     18      │  │     42      │  │    85%      │  │   $3,200    │                                    │
│  │    +2 ↗️    │  │    +5 ↗️    │  │   +12% ↗️   │  │   +18% ↗️   │                                    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘                                    │
│                                                                                                         │
│  ┌───────────────────────────────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │                    Customer Groups                        │  │        Quick Analytics          │   │
│  ├───────────────────────────────────────────────────────────┤  ├─────────────────────────────────┤   │
│  │                                                           │  │                                 │   │
│  │  🎯 Weight Loss Group (8 customers)                      │  │  Goal Achievement               │   │
│  │      • Sarah J. • Mike P. • Lisa K. • David R.           │  │  ████████████░░░░░░░ 72%        │   │
│  │      • Emma S. • John D. • Maya L. • Chris T.            │  │                                 │   │
│  │      📊 Avg engagement: 92%                              │  │  Customer Engagement            │   │
│  │                                                           │  │  ██████████████░░░░░ 85%        │   │
│  │  💪 Muscle Building Group (6 customers)                  │  │                                 │   │
│  │      • Alex M. • Jordan K. • Taylor W.                   │  │  Plan Completion                │   │
│  │      • Sam B. • Casey F. • Riley H.                      │  │  █████████████████░░ 91%        │   │
│  │      📊 Avg engagement: 88%                              │  │                                 │   │
│  │                                                           │  │                                 │   │
│  │  🏃 Athletes Group (4 customers)                         │  │                                 │   │
│  │      • Morgan T. • Avery L. • Quinn S. • Blake C.        │  │                                 │   │
│  │      📊 Avg engagement: 95%                              │  │                                 │   │
│  │                                                           │  │                                 │   │
│  │  ┌─────────────────────────────────────────────────────┐ │  │                                 │   │
│  │  │              ➕ Create New Group                     │ │  │                                 │   │
│  │  └─────────────────────────────────────────────────────┘ │  │                                 │   │
│  └───────────────────────────────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                                                         │
│  ⭐ Want to unlock advanced features?                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │   🚀 Upgrade to Established Business Plan                                                      │   │
│  │                                                                                                 │   │
│  │   Unlock enterprise features:                                                                  │   │
│  │   • Unlimited customers                  • Advanced analytics                                 │   │
│  │   • API access                          • Custom branding                                     │   │
│  │   • Team collaboration                  • Dedicated account manager                          │   │
│  │                                                                                                 │   │
│  │   [Upgrade for $100] [Learn More]                                                             │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                         │
│  ┌───────────────────────────────────────┐  ┌─────────────────────────────────────────────────────┐   │
│  │         Top Performing Plans          │  │             Customer Progress                       │   │
│  ├───────────────────────────────────────┤  ├─────────────────────────────────────────────────────┤   │
│  │                                       │  │                                                     │   │
│  │  1. Keto Weight Loss Plan             │  │  📈 This Week's Highlights:                        │   │
│  │     8 assignments • 94% completion    │  │                                                     │   │
│  │                                       │  │  🎯 3 customers reached weight goals               │   │
│  │  2. Quick Muscle Builder              │  │  💪 2 customers gained muscle mass                 │   │
│  │     6 assignments • 87% completion    │  │  📊 5 customers updated measurements               │   │
│  │                                       │  │  📸 8 new progress photos uploaded                │   │
│  │  3. Mediterranean Maintenance         │  │                                                     │   │
│  │     4 assignments • 91% completion    │  │  ⚠️ Attention needed:                              │   │
│  │                                       │  │  • Emma S. - Low engagement (3 days)              │   │
│  │  4. HIIT Nutrition Protocol           │  │  • John D. - Missed check-in                      │   │
│  │     3 assignments • 85% completion    │  │                                                     │   │
│  │                                       │  │  [Send Follow-up Messages]                         │   │
│  └───────────────────────────────────────┘  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile Wireframes

### 4. Mobile Tier Selection

```
┌─────────────────────┐
│ ☰  FitnessMealPlan │
├─────────────────────┤
│                     │
│   Choose Your Plan  │
│                     │
│ ○ ● ○               │
│                     │
│┌───────────────────┐│
││  GROWING PRO      ││
││     $299          ││
││                   ││
││  [MOST POPULAR]   ││
││                   ││
││ 🚀 Perfect for    ││
││   expanding       ││
││   businesses      ││
││                   ││
││ ✓ 20 customers    ││
││ ✓ 2,500 plans     ││
││ ✓ Analytics       ││
││ ✓ Customer groups ││
││ ✓ Priority support││
││                   ││
│└───────────────────┘│
│                     │
│ [Start Free Trial]  │
│                     │
│ [Compare All Plans] │
│                     │
│ Need help choosing? │
│ [Take Assessment]   │
└─────────────────────┘
```

### 5. Mobile Dashboard (Tier 1)

```
┌─────────────────────┐
│ Dashboard    [T1] 👑│
├─────────────────────┤
│Overview│Customers│Plans│
│   ●    │    ○    │  ○ │
├─────────────────────┤
│                     │
│ 👋 Welcome Alex!    │
│ New Trainer Plan    │
│                     │
│┌───────────────────┐│
││ My Customers      ││
││     6 / 9         ││
││                   ││
││ 👤 Sarah Johnson  ││
││ 👤 Mike Chen      ││
││ 👤 Emma Wilson    ││
││                   ││
││ [➕ Invite More]  ││
│└───────────────────┘│
│                     │
│┌───────────────────┐│
││ Quick Actions     ││
││                   ││
││ 📖 Browse Plans   ││
││ 🍽️ Generate Plan  ││
││ 📄 Export PDF     ││
││ 📧 Invite Customer││
│└───────────────────┘│
│                     │
│┌───────────────────┐│
││ 📊 Want Analytics?││
││ Upgrade to Pro    ││
││ [Learn More]      ││
│└───────────────────┘│
│                     │
├─────────────────────┤
│🏠 📊 👥 ⚙️ (nav)   │
└─────────────────────┘
```

### 6. Mobile Upgrade Flow

```
Step 1: Comparison
┌─────────────────────┐
│ ← Upgrade Plan   📊│
├─────────────────────┤
│ ● ○ ○               │
│                     │
│ Current: NEW TRAINER│
│        $199         │
│                     │
│ Upgrade to:         │
│┌───────────────────┐│
││ GROWING PRO       ││
││    $299           ││
││                   ││
││ What you get:     ││
││ ✓ 20 customers    ││
││   (vs 9 current)  ││
││ ✓ Analytics       ││
││ ✓ Customer groups ││
││ ✓ 2,500+ plans    ││
││                   ││
││ Upgrade cost:     ││
││ +$100 one-time    ││
│└───────────────────┘│
│                     │
│ [Continue] [Cancel] │
└─────────────────────┘

Step 2: Payment
┌─────────────────────┐
│ ← Payment        📊│
├─────────────────────┤
│ ○ ● ○               │
│                     │
│ Order Summary:      │
│┌───────────────────┐│
││ Growing Pro Plan  ││
││ Upgrade Fee: $100 ││
││ Current: New ($199)││
││ New Total: $299   ││
││                   ││
││ 💳 Payment Method ││
││ [Credit Card]     ││
││                   ││
││ Card ending •••42 ││
││ [Change]          ││
│└───────────────────┘│
│                     │
│ [ ] I agree to ToS  │
│                     │
│ [Complete Upgrade]  │
│                     │
│ 🔒 Secure checkout  │
└─────────────────────┘

Step 3: Success
┌─────────────────────┐
│ Success!         📊│
├─────────────────────┤
│ ○ ○ ●               │
│                     │
│       🎉            │
│                     │
│ Welcome to          │
│ Growing Professional│
│                     │
│ Your new features:  │
│ ✓ Analytics unlocked│
│ ✓ Customer groups   │
│ ✓ 2,500+ meal plans │
│ ✓ Priority support  │
│                     │
│ [Explore Features]  │
│                     │
│ [Go to Dashboard]   │
│                     │
│ Email receipt sent  │
│ to: alex@email.com  │
└─────────────────────┘
```

---

## Feature Gating Visual Examples

### 7. Analytics Feature Gate (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      📊 Customer Analytics                                             │
│                                    [Professional Feature]                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                         │
│  Get powerful insights into your customers' progress and engagement with detailed analytics.            │
│                                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │ [Blurred/Grayed Analytics Preview]                                                             │   │
│  │                                                                                                 │   │
│  │  📈 Customer Engagement Trends        📊 Goal Achievement Rates                                │   │
│  │  ████████████░░░░░░░░░░                ██████████████░░░░░░                                    │   │
│  │                                                                                                 │   │
│  │  💰 Revenue Growth                    👥 Customer Retention                                    │   │
│  │  ████████████████░░░░                 ████████████████████░                                   │   │
│  │                                                                                                 │   │
│  │                                    🔒                                                          │   │
│  │                            LOCKED FEATURE                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                         │
│  🎯 What you'll unlock with Professional:                                                              │
│                                                                                                         │
│  ✓ Customer engagement metrics and trends                                                              │
│  ✓ Progress tracking and goal achievement analytics                                                    │
│  ✓ Business performance insights and revenue tracking                                                  │
│  ✓ Monthly automated reports delivered to your email                                                   │
│  ✓ Customer segmentation and group analytics                                                           │
│  ✓ Meal plan performance and popularity metrics                                                        │
│                                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                   Upgrade Information                                           │   │
│  │                                                                                                 │   │
│  │   Current Plan: New Trainer ($199)                                                             │   │
│  │   Upgrade to: Growing Professional ($299)                                                      │   │
│  │   Upgrade Cost: $100 (one-time fee)                                                            │   │
│  │                                                                                                 │   │
│  │   [Upgrade Now - $100]        [Learn More]        [Maybe Later]                               │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                         │
│  💬 "Analytics helped me identify which customers needed extra support and increased                   │
│      my retention rate by 30%!" - Jennifer K., Professional Plan User                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8. Customer Limit Warning (Mobile)

```
┌─────────────────────┐
│ ⚠️ Customer Limit   │
├─────────────────────┤
│                     │
│ You've reached your │
│ customer limit      │
│                     │
│ 👥 9 / 9 customers  │
│ ████████████████████│
│                     │
│ To add more         │
│ customers, upgrade  │
│ to Professional:    │
│                     │
│┌───────────────────┐│
││ Growing Pro       ││
││ ✓ 20 customers    ││
││ ✓ Analytics       ││
││ ✓ Customer groups ││
││ ✓ Priority support││
││                   ││
││ Upgrade: +$100    ││
│└───────────────────┘│
│                     │
│ [Upgrade Now]       │
│                     │
│ [Learn More]        │
│                     │
│ [Maybe Later]       │
└─────────────────────┘
```

---

## Interactive Elements & States

### 9. Tier Card Hover States

```
Normal State:
┌─────────────────────────┐
│     GROWING PRO         │
│        $299            │
│                        │
│ 🚀 Ideal for expanding │
│    fitness businesses  │
│                        │
│ ✓ 20 customers         │
│ ✓ 2,500 meal plans     │
│ ✓ Analytics dashboard  │
│                        │
│ [Start Trial]          │
│ [Learn More]           │
└─────────────────────────┘

Hover State:
┌═════════════════════════┐ ← Elevated shadow
║     GROWING PRO         ║ ← Slight scale (105%)
║        $299            ║
║                        ║
║ 🚀 Ideal for expanding ║
║    fitness businesses  ║
║                        ║
║ ✓ 20 customers         ║ ← Checkmarks animate
║ ✓ 2,500 meal plans     ║
║ ✓ Analytics dashboard  ║
║                        ║
║ [Start Trial] ←────────║ ← Button highlights
║ [Learn More]           ║
╚═════════════════════════╝

Selected State:
┌─────────────────────────┐
│     GROWING PRO         │ ← Blue border glow
│        $299            │
│    [SELECTED] 👍       │ ← Selection indicator
│ 🚀 Ideal for expanding │
│    fitness businesses  │
│                        │
│ ✓ 20 customers         │
│ ✓ 2,500 meal plans     │
│ ✓ Analytics dashboard  │
│                        │
│ [Confirm Selection]    │ ← Changed CTA
│ [Learn More]           │
└─────────────────────────┘
```

### 10. Usage Meter Components

```
Customer Usage (Near Limit):
┌─────────────────────────────┐
│ Customers: 7 of 9          │
│ ████████████████░░░░        │ ← 78% filled, orange
│ 2 slots remaining          │
└─────────────────────────────┘

Customer Usage (At Limit):
┌─────────────────────────────┐
│ Customers: 9 of 9          │
│ ████████████████████        │ ← 100% filled, red
│ ⚠️ Limit reached           │
│ [Upgrade to add more]      │
└─────────────────────────────┘

Meal Plan Access:
┌─────────────────────────────┐
│ Meal Plans Available       │
│ 1,000 curated plans        │
│ ████████████████████        │ ← Full access indicator
│ New Trainer Tier           │
└─────────────────────────────┘
```

---

## Responsive Breakpoints

### 11. Tier Selection Responsive Layout

```
Desktop (1200px+):
┌─────────────────────────────────────────────────────────────────┐
│  [Tier 1]    [Tier 2]    [Tier 3]                              │
│   Card        Card        Card                                  │
│  Side by     Side by     Side by                                │
│   Side        Side        Side                                  │
└─────────────────────────────────────────────────────────────────┘

Tablet (768px - 1199px):
┌─────────────────────────────────────┐
│         [Tier 1]                    │
│          Card                       │
│                                     │
│         [Tier 2]                    │
│          Card                       │
│                                     │
│         [Tier 3]                    │
│          Card                       │
└─────────────────────────────────────┘

Mobile (320px - 767px):
┌─────────────────────┐
│   ← [Tier Card] →   │ ← Swipeable carousel
│        ● ○ ○        │ ← Dot indicators
│                     │
│   [Compare Plans]   │ ← Stack vertically
│   [Take Assessment] │
└─────────────────────┘
```

---

## Animation & Micro-interactions

### 12. Upgrade Success Animation

```
Step 1: Loading
┌─────────────────────┐
│   Processing...     │
│                     │
│       ⏳            │
│   [Spinner]         │
│                     │
│ Upgrading your      │
│ account...          │
└─────────────────────┘

Step 2: Success
┌─────────────────────┐
│     Success!        │
│                     │
│        ✅           │ ← Animated checkmark
│   [Bounce in]       │
│                     │
│ Welcome to          │
│ Professional!       │ ← Text slides up
└─────────────────────┘

Step 3: Feature Unlock
┌─────────────────────┐
│ New Features        │
│ Unlocked!           │
│                     │
│ 📊 ← Analytics      │ ← Icons animate in
│ 👥 ← Groups         │   sequence
│ 📈 ← Reports        │
│                     │
│ [Explore Features]  │
└─────────────────────┘
```

This wireframe document provides detailed visual specifications for implementing the 3-tier trainer profile system, complementing the comprehensive UX/UI strategy. Each wireframe shows exact layouts, spacing, and interactive states needed for development.