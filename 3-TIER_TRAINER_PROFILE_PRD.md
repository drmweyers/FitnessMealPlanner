# 3-Tier Trainer Profile System - Product Requirements Document (PRD)

**Document Version:** 1.0
**Last Updated:** September 21, 2025
**Product Strategy Agent:** Claude Code
**Project:** FitnessMealPlanner 3-Tier Enhancement

---

## Executive Summary

### Vision Statement
Transform FitnessMealPlanner from a single-tier service into a comprehensive 3-tier trainer platform that scales with fitness professionals' business growth, combining one-time payments with optional AI-powered subscriptions to maximize revenue while providing exceptional value at every level.

### Business Opportunity
- **Market Validation:** Strong demand for ownership-based pricing in fitness software
- **Revenue Model:** Hybrid one-time payments + optional AI subscriptions
- **Target Pricing:** Tier 1 ($199), Tier 2 ($299), Tier 3 ($399)
- **Customer Segments:** New Trainer → Growing Professional → Established Business

### Canonical Policy Alignment (October 2025)
- API versioning: All endpoints are standardized under /api/v1
- Analytics exports: Tier 2 is CSV-only; Tier 3 supports CSV, Excel, PDF, and Analytics API access
- Trials: 14-day, tier-limited trials (no full access); all gating applies
- AI subscriptions: Starter (100 generations/month), Professional (500/month), Enterprise (unlimited; fair use)
- AI cancellation: Cancelling AI disables AI features only; purchased tiers remain unchanged

### Success Metrics
- **Conversion Rate:** 80% of trial users upgrade to paid tier within 30 days
- **Tier Distribution:** 40% Tier 1, 35% Tier 2, 25% Tier 3
- **Revenue Growth:** 250% increase in average revenue per trainer
- **Customer Satisfaction:** 4.8+ rating across all tiers

---

## 1. Product Strategy & Market Positioning

### 1.1 Market Analysis

#### Target Customer Segments

**Tier 1: New Trainer ($199)**
- **Profile:** Newly certified fitness professionals (0-2 years experience)
- **Client Base:** 1-9 clients, building initial clientele
- **Business Stage:** Solo practice, minimal systems
- **Pain Points:** Budget constraints, learning curve, basic needs
- **Value Drivers:** Affordability, simplicity, professional tools

**Tier 2: Growing Professional ($299)**
- **Profile:** Established trainers (2-5 years experience)
- **Client Base:** 10-20 clients, expanding business
- **Business Stage:** Small studio or growing practice
- **Pain Points:** Client management complexity, time efficiency, scaling challenges
- **Value Drivers:** Advanced features, analytics, automation

**Tier 3: Established Business ($399)**
- **Profile:** Experienced trainers/gym owners (5+ years experience)
- **Client Base:** 20+ clients, team management
- **Business Stage:** Multiple locations, staff, complex operations
- **Pain Points:** Enterprise-level needs, unlimited scalability, advanced analytics
- **Value Drivers:** Unlimited features, AI automation, comprehensive analytics

#### Competitive Differentiation
- **Ownership Model:** One-time payment vs. recurring subscriptions
- **AI Integration:** Optional AI subscriptions for enhanced automation
- **Comprehensive Platform:** Meal planning + progress tracking + analytics
- **Professional Quality:** Enterprise-grade features at accessible pricing
- **Scalability:** Grows with trainer's business journey

### 1.2 Business Model Innovation

#### Hybrid Revenue Structure
1. **Base Platform:** One-time purchase for core functionality
2. **AI Subscriptions:** Optional monthly add-ons for AI features
3. **Tier Upgrades:** One-time upgrade fees between tiers
4. **Enterprise Services:** Custom solutions for large organizations

#### AI Subscription Tiers
- **AI Starter:** $19/month - Basic AI recipe generation (100 recipes/month)
- **AI Professional:** $39/month - Advanced AI + meal plan optimization (500 recipes/month)
- **AI Enterprise:** $79/month - Full AI suite + custom automation (unlimited)

---

## 2. Detailed Feature Matrix

### 2.1 Core Platform Features by Tier

| Feature Category | Tier 1 (New Trainer) | Tier 2 (Growing Professional) | Tier 3 (Established Business) |
|------------------|----------------------|--------------------------------|--------------------------------|
| **Customer Management** |
| Maximum Customers | 9 customers | 20 customers | Unlimited |
| Customer Invitations | Unlimited | Unlimited | Unlimited |
| Customer Progress Tracking | Basic view | Advanced analytics | Comprehensive reporting |
| Customer Communication | Email invitations | In-app messaging | Multi-channel communication |
| Customer Grouping | ❌ | Basic groups (5 groups) | Advanced segmentation |
| **Meal Plan Access** |
| Pre-built Meal Plans | 1,000 curated plans | 2,500 premium plans | Complete library (5,000+) |
| Meal Plan Categories | 8 basic categories | 15 specialized categories | All 25+ categories |
| Dietary Restrictions | 5 common types | 10 specialized types | All 15+ restriction types |
| Meal Plan Customization | Basic editing | Advanced customization | Full white-label customization |
| Meal Plan Templates | 10 starter templates | 50 professional templates | Unlimited custom templates |
| **Analytics & Reporting** |
| Customer Analytics | ❌ | Basic metrics dashboard | Advanced analytics suite |
| Business Insights | ❌ | Monthly reports | Real-time business intelligence |
| Progress Tracking | ❌ | Customer progress summaries | Comprehensive progress analytics |
| Export Capabilities | PDF meal plans only | PDF + Excel reports | All formats + API access |
| Custom Reports | ❌ | 5 pre-built reports | Unlimited custom reports |
| **System Features** |
| Recipe Database Access | Approved recipes only | Full recipe search | Admin recipe management |
| PDF Export Quality | Standard templates | Professional branding | Custom branded templates |
| API Access | ❌ | Read-only API | Full API access |
| Data Backup | Manual export | Automated weekly backup | Real-time sync + backup |
| Support Level | Email support | Priority email + chat | Dedicated account manager |

Note: Export Capabilities correction — Tier 2 export is CSV only; Tier 3 exports include CSV, Excel, PDF and API access.

Corrected Analytics & Reporting (Authoritative):

| Feature (Analytics & Reporting) | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Customer Analytics | ❌ | Basic metrics dashboard | Advanced analytics suite |
| Business Insights | ❌ | Monthly reports | Real-time business intelligence |
| Progress Tracking | ❌ | Customer progress summaries | Comprehensive progress analytics |
| Export Capabilities | PDF meal plans only | CSV only | CSV, Excel, PDF + API access |
| Custom Reports | ❌ | 5 pre-built reports | Unlimited custom reports |

### 2.2 AI Subscription Features (Optional Add-on)

| AI Feature | AI Starter ($19/mo) | AI Professional ($39/mo) | AI Enterprise ($79/mo) |
|------------|---------------------|--------------------------|------------------------|
| **Recipe Generation** |
| Monthly Recipe Limit | 100 recipes | 500 recipes | Unlimited |
| Generation Speed | Standard queue | Priority processing | Instant generation |
| Customization Level | Basic parameters | Advanced dietary control | Full customization |
| **Meal Plan Generation** |
| AI Meal Plans | ❌ | 50 plans/month | Unlimited |
| Optimization Engine | ❌ | Basic optimization | Advanced AI optimization |
| Learning Algorithms | ❌ | Customer preference learning | Full ML personalization |
| **Advanced Features** |
| Nutritional Analysis | ❌ | Basic analysis | Advanced nutritional AI |
| Shopping List Generation | ❌ | Basic lists | Smart shopping optimization |
| Seasonal Adaptation | ❌ | ❌ | Automatic seasonal menus |
| **Integration & Automation** |
| Workflow Automation | ❌ | Basic automation | Advanced workflow AI |
| Third-party Integrations | ❌ | 5 integrations | Unlimited integrations |
| Custom AI Training | ❌ | ❌ | Custom model training |

---

## 3. Customer Management Capabilities

### 3.1 Tier 1: Foundational Customer Management (Up to 9 Customers)

#### Core Features
- **Customer Profiles:** Basic contact information, dietary preferences, fitness goals
- **Invitation System:** Email-based customer invitations with secure registration
- **Meal Plan Assignment:** Assign from 1,000 pre-built meal plans
- **Progress Viewing:** View customer measurements and photos (read-only)
- **Communication:** Email notifications for meal plan assignments

#### User Experience
```
Tier 1 Customer Dashboard:
┌─────────────────────────────────────────────┐
│ My Customers (6/9 limit)                    │
├─────────────────────────────────────────────┤
│ 📊 Basic Stats: Active Plans, Last Login   │
│ 👥 Customer List: Name, Goal, Status       │
│ ➕ Add Customer (if under limit)           │
│ 📋 Quick Actions: Assign Plan, View Progress│
└─────────────────────────────────────────────┘
```

#### Limitation Handling
- **Soft Limit Warning:** At 7 customers, show "2 slots remaining" notification
- **Hard Limit Stop:** At 9 customers, disable "Add Customer" button
- **Upgrade Prompt:** Clear call-to-action: "Need more customers? Upgrade to Professional for 20 customer slots"

### 3.2 Tier 2: Professional Customer Management (Up to 20 Customers)

#### Enhanced Features
- **Customer Segmentation:** Create up to 5 customer groups (e.g., "Weight Loss", "Muscle Gain")
- **Advanced Progress Analytics:** Trend analysis, goal achievement tracking
- **In-App Messaging:** Direct communication with customers
- **Bulk Operations:** Assign meal plans to multiple customers simultaneously
- **Customer Journey Tracking:** View complete customer history and engagement

#### User Experience
```
Tier 2 Customer Dashboard:
┌─────────────────────────────────────────────┐
│ My Customers (15/20 limit) | Groups (3/5)   │
├─────────────────────────────────────────────┤
│ 📊 Advanced Analytics: Engagement Trends   │
│ 👥 Grouped View: Filter by segment         │
│ 💬 Messages (3 unread)                     │
│ 📈 Progress Reports: Weekly summaries      │
│ ⚡ Bulk Actions: Multi-customer operations │
└─────────────────────────────────────────────┘
```

#### Business Logic
- **Group Management:** Customers can belong to multiple groups
- **Analytics Scope:** 90-day historical data analysis
- **Message Threading:** Full conversation history with customers
- **Automation Triggers:** Automated follow-ups for inactive customers

### 3.3 Tier 3: Enterprise Customer Management (Unlimited)

#### Advanced Features
- **Unlimited Customers:** No restrictions on customer count
- **Advanced Segmentation:** Custom customer attributes and filtering
- **Team Collaboration:** Multiple trainers can access customer data (with permissions)
- **White-label Branding:** Custom branded customer portal
- **API Integration:** Connect with existing CRM/business systems
- **Advanced Analytics:** Predictive analytics, churn prediction, lifetime value

#### User Experience
```
Tier 3 Customer Dashboard:
┌─────────────────────────────────────────────┐
│ My Customers (47 total) | Teams | Analytics │
├─────────────────────────────────────────────┤
│ 🤖 AI Insights: Churn risk, Growth opps    │
│ 🏢 Team Management: Trainer assignments    │
│ 📊 Business Intelligence: Revenue analytics│
│ 🔗 Integrations: CRM sync status          │
│ 🎨 Branding: Custom portal settings       │
└─────────────────────────────────────────────┘
```

#### Enterprise Features
- **Role-Based Access:** Owner, Manager, Trainer permission levels
- **Custom Workflows:** Automated customer onboarding sequences
- **Integration Hub:** Zapier, fitness trackers, payment systems
- **White-label Portal:** Customers see trainer's branding throughout

---

## 4. Meal Plan Access Framework

### 4.1 Tier 1: Curated Meal Plan Library (1,000 Plans)

#### Content Strategy
- **Quality Over Quantity:** Hand-selected, beginner-friendly meal plans
- **Common Goals:** Weight loss, muscle gain, general health
- **Popular Diets:** Standard, keto, vegetarian, gluten-free, Mediterranean
- **Plan Durations:** 3, 7, 14, 21-day options
- **Difficulty Levels:** Beginner and intermediate cooking complexity

#### Categories Available (8 Total)
1. **Weight Loss Plans** (200 plans)
2. **Muscle Building Plans** (150 plans)
3. **Maintenance Plans** (150 plans)
4. **Quick Prep Plans** (125 plans)
5. **Vegetarian Plans** (125 plans)
6. **Keto Plans** (100 plans)
7. **Family-Friendly Plans** (100 plans)
8. **Starter Plans** (50 plans)

#### User Experience
```
Tier 1 Meal Plan Browser:
┌─────────────────────────────────────────────┐
│ 🔍 Search: "Weight loss, 7 days"           │
├─────────────────────────────────────────────┤
│ 📂 Categories (8 available)                │
│ 🏷️ Filter: Goal, Duration, Diet Type       │
│ 📋 Results: 24 matching plans              │
│ 👁️ Preview: Nutrition summary, sample day  │
│ ➕ Assign: Select customers to assign      │
└─────────────────────────────────────────────┘
```

### 4.2 Tier 2: Premium Meal Plan Collection (2,500 Plans)

#### Enhanced Content
- **Specialized Plans:** Sports nutrition, medical diets, cultural cuisines
- **Advanced Customization:** Modify portions, swap ingredients
- **Meal Prep Integration:** Batch cooking instructions, shopping lists
- **Seasonal Menus:** Holiday-specific and seasonal ingredient focus
- **Professional Templates:** Save and reuse custom modifications

#### Categories Available (15 Total)
*Includes all Tier 1 categories plus:*
9. **Performance Plans** (300 plans)
10. **Medical Diet Plans** (250 plans)
11. **Cultural Cuisine Plans** (200 plans)
12. **Seasonal Plans** (150 plans)
13. **Advanced Keto Plans** (125 plans)
14. **Intermittent Fasting Plans** (100 plans)
15. **Competition Prep Plans** (75 plans)

#### Advanced Features
- **Plan Customization:** Modify individual days and meals
- **Ingredient Substitution:** Smart swaps for allergies/preferences
- **Portion Scaling:** Automatically adjust for different calorie targets
- **Template Creation:** Save modified plans as personal templates
- **Bulk Assignment:** Assign plans to customer groups

### 4.3 Tier 3: Complete Meal Plan Universe (5,000+ Plans)

#### Comprehensive Library
- **Complete Access:** All meal plans including experimental and niche
- **Custom Plan Builder:** Create plans from scratch with AI assistance
- **Professional Protocols:** Evidence-based nutrition protocols
- **Research-Backed Plans:** Latest nutrition science implementations
- **International Cuisines:** 25+ cultural cuisine specializations

#### Categories Available (25+ Total)
*Includes all previous categories plus:*
16. **Therapeutic Nutrition Plans** (200 plans)
17. **Elite Athlete Plans** (150 plans)
18. **Pregnancy/Postpartum Plans** (125 plans)
19. **Senior Nutrition Plans** (100 plans)
20. **Youth Athlete Plans** (100 plans)
21. **Recovery/Rehabilitation Plans** (75 plans)
22. **Autoimmune Support Plans** (75 plans)
23. **Gut Health Plans** (75 plans)
24. **Anti-Inflammatory Plans** (75 plans)
25. **Research Protocol Plans** (50 plans)

#### Enterprise Features
- **Custom Plan Builder:** Full meal plan creation suite
- **AI Plan Generation:** Unlimited AI-generated meal plans (with subscription)
- **White-label Templates:** Brand meal plans with trainer's identity
- **API Access:** Integrate with external nutrition software
- **Research Portal:** Access to latest nutrition research and protocols

---

## 5. Analytics & Reporting System

### 5.1 Tier 1: No Analytics Access

#### Design Philosophy
- **Focus on Core Value:** Keep new trainers focused on client delivery
- **Reduced Cognitive Load:** Eliminate overwhelm from complex data
- **Clear Upgrade Path:** Demonstrate value of analytics through examples

#### What's Hidden
- Customer engagement metrics
- Business performance indicators
- Progress trend analysis
- Comparative statistics
- Revenue tracking

#### Educational Elements
```
Tier 1 Analytics Preview:
┌─────────────────────────────────────────────┐
│ 📊 Analytics Preview (Upgrade to unlock)   │
├─────────────────────────────────────────────┤
│ "See how your business is growing!"         │
│ • Customer engagement trends               │
│ • Most popular meal plans                  │
│ • Progress achievement rates               │
│ • Revenue and growth metrics              │
│                                            │
│ [Upgrade to Professional] [Learn More]    │
└─────────────────────────────────────────────┘
```

### 5.2 Tier 2: Professional Analytics Dashboard

#### Core Metrics Provided
- **Customer Engagement:** Login frequency, meal plan usage, message activity
- **Business Growth:** New customers, retention rates, revenue trends
- **Content Performance:** Most popular meal plans, recipe favorites
- **Progress Tracking:** Customer achievement rates, goal completion
- **Efficiency Metrics:** Time saved, automation usage

#### Dashboard Layout
```
Tier 2 Analytics Dashboard:
┌─────────────────────────────────────────────┐
│ 📈 Business Overview (Last 30 days)        │
├─────────────────────────────────────────────┤
│ 👥 20 Customers | 💰 $3,200 Revenue        │
│ 📊 85% Engagement | 🎯 12 Goals Achieved   │
├─────────────────────────────────────────────┤
│ 📋 Top Performing Content:                 │
│ 1. "Keto Weight Loss Plan" (8 assignments) │
│ 2. "Quick Muscle Builder" (6 assignments)  │
├─────────────────────────────────────────────┤
│ ⚠️  Customer Insights:                     │
│ • 3 customers at risk of churn            │
│ • 5 customers ready for plan updates      │
└─────────────────────────────────────────────┘
```

#### Reporting Capabilities
- **Monthly Business Report:** Automated email summary
- **Customer Progress Reports:** Individual customer analytics
- **Content Performance Report:** Best and worst performing meal plans
- **Export Options:** CSV only
- **Time Periods:** 7, 30, 90-day views

### 5.3 Tier 3: Advanced Business Intelligence

#### Comprehensive Analytics Suite
- **Predictive Analytics:** Customer lifetime value, churn prediction
- **Financial Modeling:** Revenue forecasting, growth projections
- **Competitive Analysis:** Industry benchmarking, market positioning
- **Custom Dashboards:** Personalized KPI tracking
- **Real-time Monitoring:** Live business metrics and alerts

#### Advanced Features
```
Tier 3 Business Intelligence:
┌─────────────────────────────────────────────┐
│ 🤖 AI Business Insights                    │
├─────────────────────────────────────────────┤
│ Churn Risk: Sarah M. (85% likely to leave) │
│ Growth Opportunity: Keto plans (+40% demand)│
│ Revenue Forecast: $12K next quarter (+15%) │
├─────────────────────────────────────────────┤
│ 📊 Custom Dashboards (5 active)           │
│ 🔔 Smart Alerts (2 notifications)         │
│ 📈 Benchmarking: Top 15% of trainers      │
│ 🔗 Integrations: 3 connected systems      │
└─────────────────────────────────────────────┘
```

#### Enterprise Reporting
- **White-label Reports:** Branded client reports
- **Automated Insights:** Weekly business recommendations
- **Competitive Intelligence:** Industry trend analysis
- **Custom KPIs:** Business-specific metrics tracking
- **API Analytics:** Track third-party integrations

---

## 6. User Experience Flow Design

### 6.1 Tier Discovery and Education

#### Progressive Disclosure Strategy
1. **Initial Assessment:** "What best describes your practice?"
   - Just starting out (0-9 clients) → Recommend Tier 1
   - Growing practice (10-20 clients) → Recommend Tier 2
   - Established business (20+ clients) → Recommend Tier 3

2. **Feature Preview:** Interactive demos for each tier
3. **Trial Experience:** 14-day trial with tier-specific limitations
4. **Upgrade Prompts:** Context-aware suggestions when limits are reached

#### Onboarding Flow by Tier

**Tier 1 Onboarding:**
```
Welcome → Quick Setup → Import 3 Customers →
Assign First Meal Plan → View Customer Progress →
Setup Complete (20 minutes)
```

**Tier 2 Onboarding:**
```
Welcome → Business Setup → Import Customers →
Create Customer Groups → Setup Analytics →
Configure Messaging → Advanced Setup Complete (35 minutes)
```

**Tier 3 Onboarding:**
```
Welcome → Enterprise Setup → Team Configuration →
White-label Branding → Integration Setup →
Custom Workflows → Enterprise Ready (60 minutes)
```

### 6.2 Limitation Handling Strategy

#### Soft Limits (Warning Phase)
- **80% Threshold:** "You're using 7 of 9 customer slots"
- **90% Threshold:** "Only 1 customer slot remaining"
- **95% Threshold:** "Almost at your limit - consider upgrading"

#### Hard Limits (Graceful Stops)
- **Reached Limit:** Clear messaging with specific benefits of upgrading
- **Feature Preview:** Show what they would gain with upgrade
- **One-Click Upgrade:** Seamless upgrade process

#### Example Limitation UI
```
┌─────────────────────────────────────────────┐
│ ⚠️  Customer Limit Reached (9/9)           │
├─────────────────────────────────────────────┤
│ You've reached your Tier 1 customer limit. │
│                                            │
│ Upgrade to Professional to get:           │
│ ✓ 20 customer slots (+11 more)           │
│ ✓ Advanced analytics dashboard           │
│ ✓ Customer messaging system              │
│ ✓ Bulk meal plan assignment              │
│                                          │
│ [Upgrade Now - $100] [Learn More]       │
└─────────────────────────────────────────────┘
```

### 6.3 Upgrade Experience Design

#### Trigger Points for Upgrades
1. **Customer Limit:** Reached maximum customers for tier
2. **Feature Discovery:** Attempted to use locked feature
3. **Success Milestone:** Business growth indicators
4. **Seasonal Promotion:** Time-based upgrade incentives

#### Upgrade Value Communication
- **ROI Calculator:** Show potential revenue increase with more customers
- **Feature Comparison:** Side-by-side benefit comparison
- **Success Stories:** Testimonials from upgraded trainers
- **Money-Back Guarantee:** Risk-free upgrade experience

---

## 7. Administrative Controls & Enforcement

### 7.1 Tier Enforcement Mechanisms

#### Database-Level Controls
```sql
-- Trainer tier configuration table
CREATE TABLE trainer_tiers (
  trainer_id UUID PRIMARY KEY,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1, 2, 3)),
  purchase_date TIMESTAMP NOT NULL,
  upgrade_date TIMESTAMP,
  customer_limit INTEGER NOT NULL,
  analytics_enabled BOOLEAN DEFAULT FALSE,
  api_access_enabled BOOLEAN DEFAULT FALSE,
  ai_subscription_level INTEGER DEFAULT 0,
  ai_subscription_expires TIMESTAMP,
  custom_branding_enabled BOOLEAN DEFAULT FALSE
);

-- Customer count enforcement
CREATE OR REPLACE FUNCTION check_customer_limit()
RETURNS TRIGGER AS $$
BEGIN
  DECLARE
    current_count INTEGER;
    customer_limit INTEGER;
  BEGIN
    SELECT COUNT(*) INTO current_count
    FROM customer_invitations ci
    JOIN users u ON ci.customer_id = u.id
    WHERE ci.trainer_id = NEW.trainer_id AND u.role = 'customer';

    SELECT tt.customer_limit INTO customer_limit
    FROM trainer_tiers tt
    WHERE tt.trainer_id = NEW.trainer_id;

    IF current_count >= customer_limit THEN
      RAISE EXCEPTION 'Customer limit exceeded for tier. Upgrade required.';
    END IF;

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;
```

#### API-Level Enforcement
```typescript
// Middleware for tier-based access control
export const tierGuard = (requiredTier: number, feature?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const trainer = await getTrainerTier(req.user.id);

    if (trainer.tierLevel < requiredTier) {
      return res.status(403).json({
        status: 'error',
        message: `This feature requires Tier ${requiredTier}`,
        upgrade: {
          currentTier: trainer.tierLevel,
          requiredTier,
          feature,
          upgradeUrl: `/upgrade?from=${trainer.tierLevel}&to=${requiredTier}`
        }
      });
    }

    next();
  };
};

// Usage monitoring and alerts
export const usageTracker = {
  async checkCustomerLimit(trainerId: string): Promise<boolean> {
    const tier = await getTrainerTier(trainerId);
    const customerCount = await getCustomerCount(trainerId);

    if (customerCount >= tier.customerLimit) {
      await sendUpgradeAlert(trainerId, 'customer_limit_reached');
      return false;
    }

    if (customerCount >= tier.customerLimit * 0.8) {
      await sendUpgradeWarning(trainerId, 'customer_limit_warning');
    }

    return true;
  }
};
```

### 7.2 Billing and Subscription Management

#### Tier Upgrade Pricing Matrix
```typescript
const TIER_UPGRADE_PRICING = {
  '1_to_2': 100, // $100 to upgrade from Tier 1 to Tier 2
  '1_to_3': 200, // $200 to upgrade from Tier 1 to Tier 3
  '2_to_3': 100  // $100 to upgrade from Tier 2 to Tier 3
};

const AI_SUBSCRIPTION_PRICING = {
  starter: { monthly: 19, annual: 190 },    // 2 months free
  professional: { monthly: 39, annual: 390 }, // 2 months free
  enterprise: { monthly: 79, annual: 790 }    // 2 months free
};
```

#### Subscription Lifecycle Management
```typescript
interface TrainerSubscription {
  trainerId: string;
  tierLevel: 1 | 2 | 3;
  aiSubscriptionLevel: 0 | 1 | 2 | 3; // 0 = none, 1 = starter, 2 = pro, 3 = enterprise
  billingStatus: 'active' | 'past_due' | 'cancelled' | 'trial';
  trialEndsAt?: Date;
  nextBillingDate?: Date;
  subscriptionId?: string; // Stripe subscription ID
}

// Automated tier enforcement
export const subscriptionEnforcer = {
  async enforcePaymentStatus(trainerId: string) {
    const subscription = await getTrainerSubscription(trainerId);

    if (subscription.billingStatus === 'past_due') {
      // Graceful degradation: read-only access for 7 days
      await enableReadOnlyMode(trainerId);
      await sendPaymentReminder(trainerId);
    }

    if (subscription.billingStatus === 'cancelled') {
      // Cancel AI features only; do not alter one-time purchased tier
      await disableAIFeatures(trainerId);
      await setAISubscriptionLevel(trainerId, 0);
    }
  }
};
```

### 7.3 Usage Monitoring and Analytics

#### Administrative Dashboard
```
Admin Tier Management Dashboard:
┌─────────────────────────────────────────────┐
│ 📊 Tier Distribution                       │
├─────────────────────────────────────────────┤
│ Tier 1: 245 trainers (45%) | $48,755 One-time revenue │
│ Tier 2: 189 trainers (35%) | $56,511 One-time revenue │
│ Tier 3: 108 trainers (20%) | $43,092 One-time revenue │
├─────────────────────────────────────────────┤
│ 🎯 Conversion Metrics                      │
│ Trial→Paid: 76% | T1→T2: 23% | T2→T3: 18% │
├─────────────────────────────────────────────┤
│ ⚡ AI Subscription Adoption                │
│ AI Starter: 89 subs | AI Pro: 45 subs     │
│ AI Enterprise: 12 subs | Total: $5,847    │
└─────────────────────────────────────────────┘
```

#### Feature Usage Analytics
```typescript
interface FeatureUsageMetrics {
  featureName: string;
  tierLevel: number;
  usageCount: number;
  uniqueUsers: number;
  conversionTrigger: boolean; // Does this feature trigger upgrades?
  satisfactionScore: number;
}

// Track feature usage for tier optimization
export const featureAnalytics = {
  async trackFeatureUsage(trainerId: string, feature: string) {
    const tier = await getTrainerTier(trainerId);

    await logFeatureUsage({
      trainerId,
      tierLevel: tier.tierLevel,
      feature,
      timestamp: new Date(),
      sessionId: req.sessionId
    });

    // Trigger upgrade prompts for high-value features
    if (UPGRADE_TRIGGER_FEATURES.includes(feature) && tier.tierLevel < 3) {
      await queueUpgradePrompt(trainerId, feature);
    }
  }
};
```

---

## 8. Technical Implementation Strategy

### 8.1 Database Schema Enhancements

#### New Tables Required
```sql
-- Trainer tier management
CREATE TABLE trainer_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1, 2, 3)),
  purchase_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  upgrade_date TIMESTAMP,
  expires_at TIMESTAMP, -- For subscription model if needed

  -- Tier-specific limits
  customer_limit INTEGER NOT NULL,
  meal_plan_limit INTEGER NOT NULL,
  analytics_enabled BOOLEAN DEFAULT FALSE,
  api_access_enabled BOOLEAN DEFAULT FALSE,
  custom_branding_enabled BOOLEAN DEFAULT FALSE,

  -- AI subscription
  ai_subscription_level INTEGER DEFAULT 0 CHECK (ai_subscription_level IN (0, 1, 2, 3)),
  ai_subscription_expires TIMESTAMP,
  ai_monthly_usage INTEGER DEFAULT 0,
  ai_usage_reset_date DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feature usage tracking
CREATE TABLE feature_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id),
  feature_name VARCHAR(255) NOT NULL,
  tier_level INTEGER NOT NULL,
  usage_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(255),
  blocked BOOLEAN DEFAULT FALSE, -- Was feature blocked due to tier limit?

  INDEX idx_trainer_feature (trainer_id, feature_name),
  INDEX idx_usage_timestamp (usage_timestamp)
);

-- Meal plan access tracking
CREATE TABLE meal_plan_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id),
  access_type VARCHAR(50) NOT NULL, -- 'view', 'assign', 'customize'
  allowed BOOLEAN NOT NULL,
  tier_level INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer group management (Tier 2+)
CREATE TABLE customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id),
  group_name VARCHAR(255) NOT NULL,
  description TEXT,
  color_code VARCHAR(7), -- Hex color for UI
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(trainer_id, group_name)
);

CREATE TABLE customer_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  group_id UUID NOT NULL REFERENCES customer_groups(id),
  added_by UUID NOT NULL REFERENCES users(id),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(customer_id, group_id)
);
```

### 8.2 API Enhancements

Note: All endpoints are versioned under the /api/v1 prefix in production.

#### Tier Management Endpoints
```typescript
// Tier information and management
app.get('/api/v1/tiers/current', authMiddleware, async (req, res) => {
  const tierInfo = await getTrainerTierInfo(req.user.id);
  res.json({
    status: 'success',
    data: {
      currentTier: tierInfo.tierLevel,
      customerLimit: tierInfo.customerLimit,
      currentCustomerCount: tierInfo.currentCustomerCount,
      analyticsEnabled: tierInfo.analyticsEnabled,
      aiSubscription: tierInfo.aiSubscriptionLevel,
      upgradeOptions: getUpgradeOptions(tierInfo.tierLevel)
    }
  });
});

// Customer limit checking
app.post('/api/v1/customers/invite',
  authMiddleware,
  tierGuard(1), // All tiers can invite customers
  async (req, res) => {
    const canAddCustomer = await usageTracker.checkCustomerLimit(req.user.id);

    if (!canAddCustomer) {
      return res.status(403).json({
        status: 'error',
        message: 'Customer limit reached',
        upgrade: {
          currentLimit: await getCustomerLimit(req.user.id),
          nextTierLimit: await getNextTierCustomerLimit(req.user.id),
          upgradeUrl: '/upgrade'
        }
      });
    }

    // Proceed with invitation logic
  }
);

// Analytics access (Tier 2+ only)
app.get('/api/v1/analytics/dashboard',
  authMiddleware,
  tierGuard(2, 'analytics_dashboard'),
  async (req, res) => {
    const analytics = await generateAnalyticsDashboard(req.user.id);
    res.json({ status: 'success', data: analytics });
  }
);

// Meal plan library access with tier filtering
app.get('/api/v1/meal-plans/library',
  authMiddleware,
  async (req, res) => {
    const tierInfo = await getTrainerTierInfo(req.user.id);
    const mealPlans = await getMealPlanLibrary(tierInfo.tierLevel, req.query);

    res.json({
      status: 'success',
      data: {
        mealPlans: mealPlans.data,
        totalAvailable: mealPlans.total,
        tierLimits: {
          tier1: 1000,
          tier2: 2500,
          tier3: 5000
        },
        currentAccess: getTierMealPlanLimit(tierInfo.tierLevel)
      }
    });
  }
);
```

#### AI Subscription Management
```typescript
// AI recipe generation with usage tracking
app.post('/api/v1/ai/generate-recipes',
  authMiddleware,
  aiSubscriptionGuard('starter'), // Requires AI subscription
  async (req, res) => {
    const usage = await checkAIUsage(req.user.id);

    if (usage.exceeded) {
      return res.status(403).json({
        status: 'error',
        message: 'Monthly AI usage limit exceeded',
        usage: {
          current: usage.current,
          limit: usage.limit,
          resetDate: usage.resetDate
        },
        upgrade: getAIUpgradeOptions(usage.subscriptionLevel)
      });
    }

    // Proceed with AI generation
    const recipes = await generateRecipesWithAI(req.body);
    await incrementAIUsage(req.user.id, recipes.length);

    res.json({ status: 'success', data: recipes });
  }
);
```

### 8.3 Frontend Implementation

#### Tier-Aware Component System
```typescript
// React component for tier-gated features
export const TierGatedFeature: React.FC<{
  requiredTier: number;
  feature: string;
  children: React.ReactNode;
}> = ({ requiredTier, feature, children }) => {
  const { tierInfo, loading } = useTrainerTier();

  if (loading) return <Skeleton />;

  if (tierInfo.tierLevel < requiredTier) {
    return (
      <UpgradePrompt
        currentTier={tierInfo.tierLevel}
        requiredTier={requiredTier}
        feature={feature}
      />
    );
  }

  return <>{children}</>;
};

// Usage limit indicator component
export const UsageLimitIndicator: React.FC<{
  current: number;
  limit: number;
  type: 'customers' | 'meal-plans' | 'ai-recipes';
}> = ({ current, limit, type }) => {
  const percentage = (current / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= limit;

  return (
    <div className={`usage-indicator ${isNearLimit ? 'warning' : ''} ${isAtLimit ? 'at-limit' : ''}`}>
      <div className="usage-bar">
        <div
          className="usage-progress"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="usage-text">
        {current} of {limit} {type.replace('-', ' ')} used
      </span>
      {isNearLimit && (
        <UpgradeButton size="small" reason={`${type}_limit_warning`} />
      )}
    </div>
  );
};
```

#### Tier-Specific Dashboard Components
```typescript
// Tier 1 Dashboard
export const Tier1Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <WelcomeCard tier={1} />
      <CustomerLimitCard current={6} limit={9} />
      <RecentCustomers />
      <QuickActions />
      <AnalyticsUpgradePrompt />
    </DashboardLayout>
  );
};

// Tier 2 Dashboard
export const Tier2Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <AnalyticsSummary />
      <CustomerGroupsCard />
      <EngagementMetrics />
      <RecentActivity />
      <AdvancedFeaturesPrompt />
    </DashboardLayout>
  );
};

// Tier 3 Dashboard
export const Tier3Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <BusinessIntelligence />
      <TeamManagement />
      <CustomBranding />
      <IntegrationHub />
      <AdvancedAnalytics />
    </DashboardLayout>
  );
};
```

---

## 9. Migration Strategy for Existing Users

### 9.1 Current User Transition Plan

#### Automatic Tier Assignment Logic
```typescript
const assignInitialTier = async (trainerId: string) => {
  const trainerData = await getTrainerMetrics(trainerId);

  // Tier assignment based on current usage
  let recommendedTier = 1;

  if (trainerData.customerCount > 9) {
    recommendedTier = 2;
  }

  if (trainerData.customerCount > 20 || trainerData.isUsingAdvancedFeatures) {
    recommendedTier = 3;
  }

  // Grandfathering logic: Give existing users tier that matches their current usage
  await assignTrainerTier(trainerId, {
    tierLevel: recommendedTier,
    grandfathered: true,
    transitionPeriod: 90 // days
  });
};
```

#### Grandfathering Strategy
1. **Grace Period:** 90 days to explore new features without restrictions
2. **Usage Analysis:** Track current usage patterns to recommend optimal tier
3. **Gentle Transition:** Soft limits with educational messaging
4. **Value Demonstration:** Show benefits of features they're missing

#### Migration Communication Plan
```
Migration Email Sequence:
┌─────────────────────────────────────────────┐
│ Week 1: "Exciting Updates Coming"           │
│ Week 2: "Your Recommended Tier"            │
│ Week 3: "New Features Preview"             │
│ Week 4: "Upgrade Options & Benefits"       │
│ Week 5: "Implementation Begins"            │
└─────────────────────────────────────────────┘
```

### 9.2 Data Preservation and Enhancement

#### Current Data Mapping
- All existing customers maintained
- Current meal plan assignments preserved
- Progress tracking data enhanced
- Recipe favorites migrated to new system

#### Enhanced Features for Existing Users
- Retroactive analytics for users with sufficient history
- Automatic customer grouping based on meal plan patterns
- AI recommendations based on historical preferences

---

## 10. Success Metrics and KPIs

### 10.1 Product Success Metrics

#### Primary Metrics
- **Tier Conversion Rate:** 80% of trial users purchase within 30 days
- **Tier Distribution:** 40% Tier 1, 35% Tier 2, 25% Tier 3
- **Upgrade Rate:** 25% Tier 1→2, 20% Tier 2→3 within 6 months
- **Revenue per User:** $299 average (including AI subscriptions)
- **Customer Lifetime Value:** $450 per trainer

#### Secondary Metrics
- **Feature Adoption:** 90% of Tier 2+ users use analytics monthly
- **AI Subscription Uptake:** 65% of users add AI within 3 months
- **Customer Satisfaction:** 4.8+ rating across all tiers
- **Support Ticket Reduction:** 40% decrease through self-service

#### Tier-Specific Success Indicators

**Tier 1 Success:**
- 95% complete onboarding
- Average 6.5 customers per trainer
- 70% use all core features monthly
- 25% upgrade within 6 months

**Tier 2 Success:**
- 85% use analytics weekly
- Average 15 customers per trainer
- 90% use customer grouping
- 60% consider Tier 3 upgrade

**Tier 3 Success:**
- 75% use advanced analytics
- Average 35 customers per trainer
- 50% integrate with external systems
- 90% retention after 12 months

### 10.2 Business Impact Measurements

#### Revenue Projections
```
Year 1 Revenue Forecast:
┌─────────────────────────────────────────────┐
│ Tier 1: 350 users × $199 = $69,650         │
│ Tier 2: 400 users × $299 = $119,600        │
│ Tier 3: 150 users × $399 = $59,850         │
│ AI Subs: 585 subs ≈ $232,500               │
│                                            │
│ Total Year 1 Revenue: $461,600             │
│ Baseline Customers: 900                    │
│ Trial Policy: 14-day tier-limited          │
└─────────────────────────────────────────────┘
```

#### Market Penetration Goals
- **Year 1:** 900 paid trainers across all tiers
- **Year 2:** 12,000 paid trainers with 40% AI adoption
- **Year 3:** 25,000 paid trainers with 60% AI adoption

#### Competitive Positioning
- **Price Point:** 30-50% less than comparable enterprise solutions
- **Feature Richness:** 2x more features than direct competitors
- **User Experience:** 4.8+ rating vs. industry average 3.2
- **Market Share:** Capture 15% of addressable fitness software market

---

## 11. Risk Assessment and Mitigation

### 11.1 Product Risks

#### Tier Complexity Risk
- **Risk:** Users overwhelmed by tier choices
- **Mitigation:** Smart tier recommendation, 14-day trial period
- **Monitoring:** Track decision time and support requests

#### Feature Discovery Risk
- **Risk:** Users don't understand value of higher tiers
- **Mitigation:** Progressive feature education, usage analytics
- **Monitoring:** Feature usage heatmaps, upgrade conversion funnels

#### Pricing Resistance Risk
- **Risk:** Market resistance to tier pricing model
- **Mitigation:** Competitive analysis, value demonstration, flexible payment options
- **Monitoring:** Conversion rates, competitor pricing tracking

### 11.2 Technical Risks

#### Performance Impact Risk
- **Risk:** Tier checking impacts system performance
- **Mitigation:** Efficient caching, optimized database queries
- **Monitoring:** API response times, database performance metrics

#### Data Migration Risk
- **Risk:** Issues migrating existing users to tier system
- **Mitigation:** Thorough testing, gradual rollout, rollback plan
- **Monitoring:** Migration success rates, user feedback

#### Billing Integration Risk
- **Risk:** Complex billing scenarios with upgrades/downgrades
- **Mitigation:** Comprehensive billing logic testing, Stripe integration
- **Monitoring:** Payment success rates, billing dispute tracking

### 11.3 Business Risks

#### Market Acceptance Risk
- **Risk:** Users prefer simple pricing over tiered model
- **Mitigation:** A/B testing, user feedback collection, pricing flexibility
- **Monitoring:** Conversion rates by pricing model, user surveys

#### Competitive Response Risk
- **Risk:** Competitors copy tiered model or undercut pricing
- **Mitigation:** Feature differentiation, customer loyalty programs
- **Monitoring:** Competitive intelligence, customer retention rates

#### Support Complexity Risk
- **Risk:** Increased support burden from tier-specific issues
- **Mitigation:** Comprehensive documentation, self-service tools
- **Monitoring:** Support ticket volume and resolution time

---

## 12. Implementation Timeline

### 12.1 Development Phases

#### Phase 1: Foundation (Weeks 1-4)
- Database schema design and implementation
- Basic tier management system
- Tier-based access control middleware
- Unit tests for tier logic

#### Phase 2: Core Features (Weeks 5-8)
- Customer limit enforcement
- Meal plan library filtering
- Basic analytics dashboard (Tier 2)
- Frontend tier indication components

#### Phase 3: Advanced Features (Weeks 9-12)
- Advanced analytics suite (Tier 3)
- AI subscription integration
- Customer grouping system
- White-label branding options

#### Phase 4: Polish & Testing (Weeks 13-16)
- Comprehensive testing across all tiers
- Performance optimization
- User experience refinement
- Documentation completion

#### Phase 5: Launch Preparation (Weeks 17-18)
- Migration scripts for existing users
- Support documentation
- Marketing material creation
- Staff training

#### Phase 6: Launch & Monitor (Weeks 19-20)
- Gradual rollout to existing users
- Performance monitoring
- User feedback collection
- Iterative improvements

### 12.2 Success Validation Timeline

#### Week 1-2: Initial Metrics
- Tier assignment accuracy for existing users
- System performance under tier-based load
- Basic feature usage patterns

#### Month 1: Early Success Indicators
- User tier selection patterns
- Conversion from trial to paid
- Feature adoption rates by tier

#### Month 3: Stabilization Metrics
- Tier upgrade rates
- Customer satisfaction scores
- Revenue impact assessment

#### Month 6: Long-term Success
- Customer lifetime value by tier
- Market penetration analysis
- Competitive positioning review

---

## 13. Launch Strategy

### 13.1 Go-to-Market Approach

#### Soft Launch (Existing Users)
1. **Announcement:** Email campaign explaining new tier structure
2. **Grandfathering:** All existing users maintain current functionality for 90 days
3. **Education:** Webinars and tutorials on new features
4. **Feedback Collection:** Survey existing users on tier preferences

#### Public Launch (New Users)
1. **Marketing Campaign:** "Choose Your Growth Path" messaging
2. **Free Trial:** 14-day trial with tier-specific experience
3. **Success Stories:** Case studies from beta users
4. **Referral Program:** Existing users receive credits for referrals

#### Content Marketing Strategy
- **Blog Series:** "Growing Your Fitness Business" with tier-specific advice
- **Video Tutorials:** Feature demonstrations for each tier
- **Webinar Series:** Monthly training sessions for each tier
- **Social Proof:** User testimonials and success metrics

### 13.2 Pricing Strategy

#### Launch Pricing
- **Early Bird Discount:** 20% off for first 1,000 users
- **Upgrade Incentive:** Free AI subscription month with tier upgrade
- **Annual Discount:** 15% off for annual tier purchases

#### Long-term Pricing Evolution
- **Tier 1:** Maintain at $199 for market penetration
- **Tier 2:** Potential increase to $349 after feature expansion
- **Tier 3:** Potential increase to $499 with enterprise features
- **AI Subscriptions:** Price optimization based on usage patterns

---

## 14. Post-Launch Optimization

### 14.1 Continuous Improvement Framework

#### Monthly Reviews
- Tier conversion analysis
- Feature usage heatmaps
- Customer feedback synthesis
- Revenue performance assessment

#### Quarterly Enhancements
- New features for underperforming tiers
- Pricing optimization based on data
- Competitive feature gaps analysis
- User experience improvements

#### Annual Strategy Review
- Tier structure effectiveness
- Market positioning assessment
- Technology stack evaluation
- Long-term roadmap planning

### 14.2 Future Tier Evolution

#### Potential Tier 4: Enterprise Plus
- Multi-location management
- Advanced team collaboration
- Custom integrations
- Dedicated success manager
- White-label mobile app

#### Specialized Tier Options
- **Gym Owner Tier:** Multi-trainer management
- **Nutritionist Tier:** Medical integration features
- **Online Coach Tier:** Remote client management
- **Corporate Tier:** Employee wellness programs

---

## Conclusion

This comprehensive 3-Tier Trainer Profile System represents a strategic evolution of FitnessMealPlanner from a single-tier service to a scalable, growth-oriented platform. The tier structure aligns with natural business progression of fitness professionals while maximizing revenue potential through innovative hybrid pricing.

### Key Success Factors

1. **Clear Value Proposition:** Each tier solves specific problems for trainers at different business stages
2. **Seamless Upgrade Path:** Natural progression encourages tier advancement
3. **Flexible Pricing:** Hybrid model accommodates different budget preferences
4. **Feature Differentiation:** Meaningful differences justify tier pricing
5. **User Experience:** Tier complexity hidden behind intuitive design

### Expected Outcomes

- **Revenue Growth:** 250% increase in average revenue per trainer
- **Market Expansion:** Access to broader trainer market segments
- **Competitive Advantage:** Unique hybrid pricing model differentiation
- **User Satisfaction:** Tier-appropriate features improve user experience
- **Business Scalability:** Platform grows with user business success

This PRD provides the foundation for transforming FitnessMealPlanner into a market-leading, tiered fitness business platform that scales with trainer success while maximizing platform revenue and user satisfaction.

---

*Document prepared by: Product Strategy Agent*
*Review Status: Ready for Technical Architecture Review*
*Next Phase: Technical Implementation Planning*