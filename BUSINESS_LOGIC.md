# EvoFitMeals — Business Logic Documentation
**Last Updated:** 2026-03-03
**Audited From:** Codebase (`shared/schema.ts`, `server/routes/*`, `server/controllers/*`, `client/src/pages/*`)
**Production URL:** https://evofitmeals.com

---

## 1. System Overview

EvoFitMeals (FitnessMealPlanner) is a B2B SaaS meal planning platform designed for fitness trainers. It enables trainers to generate AI-powered meal plans, manage recipe libraries, assign personalized nutrition plans to clients, and track customer progress — all within a tiered subscription model.

**Core Value Proposition:** Trainers save hours per week by using AI to generate customized meal plans for their clients, complete with grocery lists, nutritional analysis, and progress tracking.

**Tech Stack:**
- **Frontend:** React + TypeScript + TailwindCSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL + Drizzle ORM
- **AI:** OpenAI API (recipe generation, NLP parsing)
- **Payments:** Stripe (subscriptions + one-time payments)
- **Image Storage:** S3-compatible
- **Deployment:** DigitalOcean App Platform (Docker + docker-compose for local dev)

---

## 2. User Roles & Permissions

### 2.1 Role Enum
Defined in `shared/schema.ts:32-36`:
```
userRoleEnum: "admin" | "trainer" | "customer"
```

### 2.2 Admin
Full system access. Manages recipes, users, and platform operations.

| Capability | Route Reference |
|-----------|----------------|
| Generate recipes (AI, enhanced, BMAD multi-agent) | `POST /api/admin/generate`, `/generate-recipes`, `/generate-bmad` |
| Generate recipes from natural language | `POST /api/admin/generate-recipes-from-prompt` |
| Generate meal plans from natural language | `POST /api/admin/generate-from-prompt` |
| Parse natural language prompts | `POST /api/admin/parse-recipe-prompt` |
| View/search all recipes (including unapproved) | `GET /api/admin/recipes` |
| Approve/unapprove recipes (single + bulk) | `PATCH /api/admin/recipes/:id/approve`, `POST /api/admin/recipes/bulk-approve` |
| Approve all pending recipes | `POST /api/admin/recipes/approve-all-pending` |
| Delete recipes (single + bulk) | `DELETE /api/admin/recipes/:id`, `DELETE /api/admin/recipes` |
| View platform statistics | `GET /api/admin/stats`, `GET /api/admin/profile/stats` |
| List all customers | `GET /api/admin/customers` |
| Assign recipes to customers | `POST /api/admin/assign-recipe` |
| Assign meal plans to customers | `POST /api/admin/assign-meal-plan` |
| Export data (recipes, users, meal plans) | `GET /api/admin/export?type=` |
| Monitor BMAD generation progress | `GET /api/admin/bmad-progress/:batchId` |
| View BMAD agent metrics | `GET /api/admin/bmad-metrics` |
| SSE real-time BMAD progress | `GET /api/admin/bmad-progress-stream/:batchId` |
| SSE real-time recipe progress | `GET /api/admin/recipe-progress-stream/:jobId` |
| View API usage/cost stats | `GET /api/admin/api-usage` |
| View image generation alerts | `GET /api/admin/bmad-image-alerts` |
| View active generation jobs | `GET /api/admin/generation-jobs` |
| Admin analytics dashboard | `GET /api/admin-analytics/*` |

### 2.3 Trainer
Customer management, meal plan creation, and assignment.

| Capability | Route Reference |
|-----------|----------------|
| View profile statistics | `GET /api/trainer/profile/stats` |
| View dashboard stats | `GET /api/trainer/dashboard-stats` |
| List assigned customers | `GET /api/trainer/customers` |
| View customer meal plans | `GET /api/trainer/customers/:id/meal-plans` |
| View customer measurements | `GET /api/trainer/customers/:id/measurements` |
| View customer goals (disabled) | `GET /api/trainer/customers/:id/goals` |
| View customer engagement metrics | `GET /api/trainer/customers/:id/engagement` |
| View customer progress timeline | `GET /api/trainer/customers/:id/progress-timeline` |
| Update customer relationship | `PUT /api/trainer/customers/:id/relationship` |
| Update customer status | `PUT /api/trainer/customers/:id/status` |
| List customer relationships | `GET /api/trainer/customer-relationships` |
| Save meal plans to library | `POST /api/trainer/meal-plans` |
| List saved meal plans | `GET /api/trainer/meal-plans` |
| View specific meal plan | `GET /api/trainer/meal-plans/:id` |
| Update saved meal plan | `PUT /api/trainer/meal-plans/:id` |
| Delete saved meal plan | `DELETE /api/trainer/meal-plans/:id` |
| Assign saved plan to customer | `POST /api/trainer/meal-plans/:id/assign` |
| Bulk assign meal plan | `POST /api/trainer/assign-meal-plan-bulk` |
| Unassign plan from customer | `DELETE /api/trainer/meal-plans/:id/assign/:customerId` |
| Assign new plan to customer | `POST /api/trainer/customers/:id/meal-plans` |
| Remove assigned plan | `DELETE /api/trainer/assigned-meal-plans/:id` |
| Create manual meal plan | `POST /api/trainer/manual-meal-plan` |
| Parse manual meal entries | `POST /api/trainer/parse-manual-meals` |
| View assignment history | `GET /api/trainer/assignment-history` |
| View assignment statistics | `GET /api/trainer/assignment-statistics` |
| View assignment trends | `GET /api/trainer/assignment-trends` |
| Track assignment | `POST /api/trainer/track-assignment` |
| Export assignment history | `GET /api/trainer/export-assignments` |
| View customer assignment history | `GET /api/trainer/customers/:id/assignment-history` |
| Generate meal plans (AI) | `POST /api/meal-plan/generate` |
| Parse NL for meal plans | `POST /api/meal-plan/parse-natural-language` |
| Send customer invitations | via invitation routes |
| Purchase/manage subscription | `POST /api/v1/tiers/purchase` |
| Manage branding settings | `GET/PUT /api/branding/settings` |
| Share meal plans via link | `POST /api/meal-plan-sharing/share` |

### 2.4 Customer
View assigned plans, track progress, manage grocery lists.

| Capability | Route Reference |
|-----------|----------------|
| View profile statistics | `GET /api/customer/profile/stats` |
| View assigned meal plans | via personalized meal plans queries |
| View personalized recipes | `GET /api/recipes/personalized` |
| Browse approved recipes | `GET /api/recipes` |
| Search recipes | `GET /api/recipes/search` |
| Rate recipes | `POST /api/ratings` |
| Favorite recipes | `POST /api/favorites` |
| Manage grocery lists | `GET/POST/PUT/DELETE /api/grocery-lists/*` |
| Generate grocery list from meal plan | `POST /api/grocery-lists/from-meal-plan` |
| Track progress (measurements) | `POST /api/progress/measurements` |
| Upload progress photos | `POST /api/progress/photos` |
| View progress history | `GET /api/progress/measurements` |
| Manage email preferences | `GET/PUT /api/email-preferences` |
| View shared meal plans | `GET /api/meal-plan-sharing/shared/:token` |

### 2.5 Permission Matrix

| Action | Admin | Trainer | Customer | Public |
|--------|:-----:|:-------:|:--------:|:------:|
| Generate recipes (AI) | Yes | No | No | No |
| Approve recipes | Yes | No | No | No |
| Browse approved recipes | Yes | Yes | Yes | Yes |
| Generate meal plans | Yes | Yes | No | No |
| Assign meal plans | Yes | Yes | No | No |
| View assigned meal plans | Yes | Yes (own) | Yes (own) | No |
| Manage grocery lists | No | No | Yes | No |
| Track progress | No | View | Yes | No |
| Rate/favorite recipes | Yes | Yes | Yes | No |
| Purchase subscription | No | Yes | No | No |
| Manage branding | No | Yes (Pro+) | No | No |
| Export data | Yes | Yes (own) | No | No |
| Invite customers | No | Yes | No | No |
| View shared meal plan | - | - | - | Yes (with token) |

---

## 3. Subscription Tiers

### 3.1 Tier Enum
Defined in `shared/schema.ts:39-43`:
```
tierLevelEnum: "starter" | "professional" | "enterprise"
```

### 3.2 Tier Limits
From `server/routes/entitlements.ts:25-29`:

| Feature | Starter | Professional | Enterprise |
|---------|---------|-------------|------------|
| Max Customers | 9 | 20 | Unlimited |
| Max Meal Plans | 50 | 200 | Unlimited |
| Recipe Access | Base recipes | + Seasonal | All recipes |
| Meal Types | 5 | 10 | 17 |
| Monthly New Recipes | +25 | +50 | +100 |
| Custom Branding | No | Logo + Colors | + White-label + Custom Domain |
| Export Formats | PDF | + CSV | + Excel |
| Analytics | Basic | Enhanced | Full |
| API Access | No | No | Yes |
| Bulk Operations | No | No | Yes |

### 3.3 Tier Enforcement
- **Entitlements endpoint:** `GET /api/entitlements` returns current tier, usage counts, and feature flags
- **Usage tracking table:** `tier_usage_tracking` counts customers, meal plans, AI generations, exports per billing period
- **Tier middleware:** `attachRecipeTierFilter` and `getUserTierLevel` in `server/middleware/tierEnforcement.ts`
- **Note:** Usage enforcement middleware is **TEMPORARILY DISABLED** (commented out in `mealPlan.ts:11-13`). Stripe integration incomplete for real-time usage enforcement.

### 3.4 Subscription Infrastructure
- **Stripe integration:** `server/services/StripePaymentService.ts` and `server/services/stripeService.ts`
- **Tables:** `trainer_subscriptions`, `subscription_items`, `payment_logs`, `webhook_events`
- **Checkout flow:** `POST /api/v1/tiers/purchase` creates Stripe checkout session
- **Billing portal:** `POST /api/v1/billing/portal` creates Stripe customer portal session
- **Webhook processing:** Idempotent via `webhook_events` table

---

## 4. Recipe System

### 4.1 Recipe Table
Defined in `shared/schema.ts:214-263`. Key fields:
- **Core:** name, description, ingredients (JSONB), instructions (text), prep/cook time, servings
- **Nutrition:** calories, protein, carbs, fat (all required)
- **Categorization:** mealTypes (JSONB array), dietaryTags (JSONB array), mainIngredientTags (JSONB array)
- **Tier:** tierLevel (starter/professional/enterprise), isSeasonal, allocatedMonth
- **Moderation:** isApproved (boolean) — recipes must be approved before public visibility
- **Media:** imageUrl (generated or uploaded)

### 4.2 Recipe Generation (AI)
Multiple generation pathways, all admin-only:

| Method | Endpoint | Description |
|--------|----------|-------------|
| Basic batch | `POST /api/admin/generate` | Generate 1-500 recipes with options |
| Custom parameters | `POST /api/admin/generate-recipes` | 1-50 recipes with tier assignment |
| Natural language | `POST /api/admin/generate-recipes-from-prompt` | Parse NL then generate recipes |
| Enhanced (quality scored) | `POST /api/admin/generate-enhanced` | Single recipe with retry + quality scoring |
| BMAD multi-agent | `POST /api/admin/generate-bmad` | 1-100 recipes with image generation, nutrition validation, S3 upload |

### 4.3 BMAD Multi-Agent Recipe Generation
Production-ready system with 8 agents:
- **BaseAgent, RecipeConceptAgent:** Core recipe creation
- **NutritionalValidatorAgent:** Validates macro accuracy
- **ImageGenerationAgent, ImageStorageAgent:** Generate and store recipe images
- **DatabaseOrchestratorAgent:** Persists to database
- **ProgressMonitorAgent:** Tracks batch progress
- **BMADCoordinator:** Orchestrates the pipeline

Real-time progress via SSE: `GET /api/admin/bmad-progress-stream/:batchId`

### 4.4 Approval Workflow
1. Recipes are generated with `isApproved: false`
2. Admin reviews via `GET /api/admin/recipes` (can filter by approval status)
3. Admin approves: `PATCH /api/admin/recipes/:id/approve`
4. Bulk approve: `POST /api/admin/recipes/bulk-approve`
5. Approve all pending: `POST /api/admin/recipes/approve-all-pending`
6. Only approved recipes visible to trainers/customers via `GET /api/recipes`

### 4.5 Recipe Search
- **Basic search:** `GET /api/recipes?search=&page=&limit=`
- **Advanced search:** `GET /api/recipes/search` with filters for meal types, dietary tags, calories, protein, carbs, fat, prep time, cook time, sort order
- **Search metadata:** `GET /api/recipes/search/metadata` returns available filter values
- **Search statistics:** `GET /api/recipes/search/statistics` (auth required)

### 4.6 Rating System
Tables: `recipe_ratings`, `recipe_rating_summary`, `rating_helpfulness`
- Users rate recipes 1-5 stars with optional review text
- Cooking difficulty rating (1-5)
- "Would cook again" flag
- Helpfulness voting on reviews
- Aggregated summaries per recipe (avg rating, distribution, counts)

### 4.7 Favorites & Collections
Tables: `recipe_favorites`, `recipe_collections`, `collection_recipes`
- Users can favorite individual recipes
- Users can create named collections (like playlists)
- Collections can be public or private
- Recipes within collections support custom ordering

### 4.8 Recipe Engagement & Recommendations
Tables: `recipe_interactions`, `recipe_recommendations`, `user_activity_sessions`
- Tracks views, ratings, cooking attempts, shares, searches
- AI-generated recommendations (similar, trending, personalized, new)
- Recommendations have expiration dates for freshness
- Session tracking for analytics

### 4.9 Tier-Based Recipe Access
Tables: `recipe_tier_access`, `recipe_type_categories`
- Monthly recipe allocations per tier (+25/+50/+100)
- Meal type categories gated by tier level
- Seasonal recipes available to Professional+ only
- **Note:** Actual tier filtering in recipe search is partially implemented — comments in `recipes.ts` say "tier system not implemented" for the search filter.

---

## 5. Meal Plan System

### 5.1 Meal Plan Tables

| Table | Purpose |
|-------|---------|
| `trainer_meal_plans` | Trainer's saved meal plan library (templates, drafts) |
| `meal_plan_assignments` | Links saved plans to customers (many-to-many) |
| `personalized_meal_plans` | Direct plan assignments (legacy + active) |
| `personalized_recipes` | Individual recipe assignments to customers |

### 5.2 Meal Plan Structure (JSONB)
Defined in `shared/schema.ts:459-556`. A meal plan contains:
- **Metadata:** planName, fitnessGoal, description, dailyCalorieTarget, clientName
- **Structure:** days (1-30), mealsPerDay (1-6)
- **Start-of-Week Meal Prep:** shopping list, prep instructions, storage instructions (optional)
- **Meals array:** Each meal has day, mealNumber, mealType, and either:
  - A full recipe object (from database)
  - Manual meal entry (free text + optional nutrition)

### 5.3 Generation Flow
1. **Natural language parsing:** `POST /api/meal-plan/parse-natural-language` — converts free text to structured params
2. **AI generation:** `POST /api/meal-plan/generate` — generates plan from structured params using approved recipes
3. **Intelligent generation:** Uses `intelligentMealPlanGenerator` service for smarter recipe selection
4. **Manual creation:** `POST /api/trainer/manual-meal-plan` — trainers type meals directly (zero AI cost)

### 5.4 Assignment Workflow
1. Trainer generates or creates meal plan
2. Saves to library: `POST /api/trainer/meal-plans`
3. Assigns to customer(s): `POST /api/trainer/meal-plans/:id/assign` or bulk via `POST /api/trainer/assign-meal-plan-bulk`
4. Customer sees plan in their dashboard
5. Trainer can unassign: `DELETE /api/trainer/meal-plans/:id/assign/:customerId`

### 5.5 Meal Plan Sharing
Table: `shared_meal_plans`
- Trainers generate shareable links for meal plans
- Links contain a unique `shareToken` (UUID)
- Optional expiration date
- View count tracking
- Can be deactivated
- Public access without authentication via token

---

## 6. Grocery List System

### 6.1 Tables
- `grocery_lists` — List metadata, linked to customer and optionally to a meal plan
- `grocery_list_items` — Individual items with category, quantity, unit, checked status, priority, estimated price, brand, recipe reference

### 6.2 Features
- Full CRUD for lists and items (customer-only access)
- Auto-generation from meal plans: `POST /api/grocery-lists/from-meal-plan`
- Smart ingredient consolidation (aggregate quantities across recipes)
- Categories: produce, meat, dairy, pantry, beverages, snacks, other
- Priority levels: low, medium, high
- Check/uncheck items while shopping
- Recipe linkage (which recipe needs this ingredient)
- Enhanced generation with better quantity parsing

### 6.3 Controllers
- `groceryListController.ts` — CRUD operations, ownership verification
- `mealPlanGroceryController.ts` — Meal plan to grocery list conversion logic

---

## 7. Customer Management

### 7.1 Invitation System
Table: `customer_invitations`
- Trainers invite customers via email
- Invitation contains: trainer ID, customer email, token, expiration (7 days)
- Customer accepts invitation during registration
- Acceptance links customer to trainer automatically
- Token marked as `usedAt` upon acceptance
- Password requirements enforced: 8+ chars, uppercase, lowercase, number, special char

### 7.2 Customer-Trainer Relationship
- Established through invitation acceptance or meal plan assignment
- Trainers see customers from multiple sources: invitations, meal_plan_assignments, personalized_meal_plans
- Relationship management with notes and tags
- Status tracking: active/paused/inactive
- Engagement metrics calculated per relationship

### 7.3 Progress Tracking
Table: `progress_measurements`
- Body measurements: weight (kg/lbs), neck, shoulders, chest, waist, hips, biceps, thighs, calves
- Body composition: body fat %, muscle mass
- Timestamped entries with notes
- Trainers can view their customers' measurements (with authorization check)

### 7.4 Progress Photos
Table: `progress_photos`
- Photo types: front, side, back, other
- Privacy control (isPrivate flag)
- Thumbnail support
- Caption support

### 7.5 Progress Summaries
Route: `GET /api/progress-summaries/*`
- Aggregated progress data over time periods
- Trainer and customer views

### 7.6 Customer Goals
**STATUS: REMOVED/DISABLED**
- Tables `customer_goals` and `goal_milestones` are **commented out** in schema (`shared/schema.ts:696-758`)
- Stub exports exist to prevent import errors (`shared/schema.ts:767-774`)
- Trainer goals endpoint returns empty array (`trainerRoutes.ts:317-355`)

---

## 8. Billing & Payments

### 8.1 Stripe Integration
Two payment service files exist:
- `server/services/StripePaymentService.ts` — Newer, for 3-tier subscription system
- `server/services/stripeService.ts` — Older, supports both subscription and one-time payments

### 8.2 Checkout Flow
1. Public pricing: `GET /api/v1/public/pricing`
2. Trainer selects tier: `POST /api/v1/tiers/purchase`
3. Stripe checkout session created
4. Redirect to Stripe payment page
5. Success/cancel redirects back to app
6. Webhook processes payment confirmation

### 8.3 Subscription Lifecycle
- **States:** trialing, active, past_due, unpaid, canceled
- **Tables:** `trainer_subscriptions` (primary), `subscription_items` (tier + AI add-on)
- **Cancel at period end:** Supported via billing portal
- **Trial support:** Via `trialEnd` field

### 8.4 Payment Logging
Table: `payment_logs`
- Immutable audit trail
- Event types: purchase, upgrade, downgrade, refund, chargeback, failed
- Links to Stripe invoice, payment intent, and charge IDs

### 8.5 Webhook Processing
Table: `webhook_events`
- Idempotent processing (unique event ID from Stripe)
- Status tracking: pending, processed, failed
- Retry count and error logging
- Payload metadata stored (no PII)

### 8.6 Test Accounts
Test accounts bypass Stripe checkout with specific error handling for `TEST_ACCOUNT:` prefix errors.

---

## 9. Email System

### 9.1 Email Preferences
Table: `email_preferences`
- Per-user toggle for: weekly progress summaries, meal plan updates, recipe recommendations, system notifications, marketing emails
- Frequency setting: daily, weekly, monthly
- Route: `GET/PUT /api/email-preferences`

### 9.2 Email Send Log
Table: `email_send_log`
- Tracks all sent emails
- Fields: emailType, subject, recipientEmail, status, messageId, errorMessage
- Status values: sent, failed, delivered, bounced

### 9.3 Email Analytics
Route: `GET /api/email-analytics/*`
- Send counts, delivery rates, bounce tracking

---

## 10. PDF Export

### 10.1 Implementation
Two export methods:
- **Client-side:** jsPDF (in-browser generation)
- **Server-side:** Puppeteer (via `exportPdfController.ts`)
- EvoFit branding applied to exports

### 10.2 Endpoints
- `POST /api/pdf/export` — General PDF export (authenticated)
- `POST /api/pdf/test-export` — Development testing only
- `POST /api/pdf/export/meal-plan/:planId` — Export specific meal plan as PDF
- Additional export routes in `server/routes/export.ts`

---

## 11. Analytics

### 11.1 Admin Analytics
Route: `GET /api/admin-analytics/*`
- Platform-wide statistics
- User counts by role
- Recipe and meal plan counts
- Generation job monitoring

### 11.2 Usage Tracking
Table: `tier_usage_tracking`
- Per-trainer per-period counters
- Tracks: customers, meal plans, AI generations, CSV/Excel/PDF exports
- Route: `GET /api/usage/*`

### 11.3 Recipe Engagement Analytics
Tables: `recipe_interactions`, `user_activity_sessions`
- View counts, rating aggregates
- Trending score calculation
- Session-based browsing analytics

### 11.4 Trending
Route: `GET /api/trending/*`
- Trending recipes based on engagement metrics

---

## 12. Authentication & Security

### 12.1 Authentication
- **JWT + Refresh Tokens:** Access token (short-lived) + refresh token (table: `refresh_tokens`)
- **Google OAuth:** Supported via `googleId` field on users table. Password optional for OAuth users.
- **Password Reset:** Token-based via `password_reset_tokens` table with expiration
- **Middleware:** `requireAuth` (any authenticated user), `requireRole('admin'|'trainer'|'customer')`, `requireAdmin`, `requireTrainerOrAdmin`

### 12.2 Account Deletion
Route: `DELETE /api/account-deletion/*`
- Self-service account deletion
- Cascading deletes configured on foreign keys throughout schema

### 12.3 RBAC Enforcement
- Every route has explicit auth middleware
- Role checks at route level AND within handlers for data isolation
- Trainers can only see their own customers' data
- Customers can only see data assigned to them
- Admin has full access

---

## 13. Branding System

### 13.1 Trainer Branding Settings
Table: `trainer_branding_settings`
- **Professional+:** Logo upload, primary/secondary/accent color customization
- **Enterprise:** White-label mode, custom domain with DNS verification
- Route: `GET/PUT /api/branding/settings`

### 13.2 Branding Audit Log
Table: `branding_audit_log`
- Tracks all branding changes with old/new values
- IP address and user agent recorded

---

## 14. API Reference Summary

### Authentication Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login (JWT) |
| POST | /api/auth/refresh | No | Refresh access token |
| POST | /api/auth/forgot-password | No | Request password reset |
| POST | /api/auth/reset-password | No | Reset password with token |
| GET | /api/auth/google | No | Google OAuth redirect |

### Admin Routes (`/api/admin/*`)
| Method | Path | Description |
|--------|------|-------------|
| POST | /generate | Batch recipe generation |
| POST | /generate-recipes | Custom recipe generation |
| POST | /generate-enhanced | Enhanced single recipe |
| POST | /generate-bmad | BMAD multi-agent generation |
| POST | /generate-from-prompt | NL meal plan generation |
| POST | /generate-recipes-from-prompt | NL recipe generation |
| POST | /parse-recipe-prompt | Parse NL to params |
| GET | /recipes | List all recipes (admin) |
| GET | /recipes/:id | Get single recipe |
| PATCH | /recipes/:id/approve | Approve recipe |
| PATCH | /recipes/:id/unapprove | Unapprove recipe |
| POST | /recipes/bulk-approve | Bulk approve |
| POST | /recipes/bulk-unapprove | Bulk unapprove |
| POST | /recipes/approve-all-pending | Approve all pending |
| DELETE | /recipes/:id | Delete recipe |
| DELETE | /recipes | Bulk delete recipes |
| GET | /stats | Platform stats |
| GET | /profile/stats | Admin profile stats |
| GET | /customers | List all customers |
| POST | /assign-recipe | Assign recipe to customers |
| POST | /assign-meal-plan | Assign meal plan |
| GET | /export | Export data |
| GET | /bmad-progress/:id | BMAD batch progress |
| GET | /bmad-metrics | BMAD agent metrics |
| GET | /bmad-progress-stream/:id | SSE BMAD progress |
| GET | /recipe-progress-stream/:id | SSE recipe progress |
| GET | /generation-progress/:id | Generation job progress |
| GET | /generation-jobs | Active generation jobs |
| GET | /api-usage | API cost stats |
| GET | /bmad-image-alerts | Image generation alerts |
| GET | /bmad-sse-stats | SSE connection stats |

### Trainer Routes (`/api/trainer/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /profile/stats | Trainer statistics |
| GET | /dashboard-stats | Dashboard overview |
| GET | /customers | List trainer's customers |
| GET | /customers/:id/meal-plans | Customer's meal plans |
| GET | /customers/:id/measurements | Customer measurements |
| GET | /customers/:id/goals | Customer goals (disabled) |
| GET | /customers/:id/engagement | Engagement metrics |
| GET | /customers/:id/progress-timeline | Progress timeline |
| PUT | /customers/:id/relationship | Update relationship |
| PUT | /customers/:id/status | Update customer status |
| GET | /customers/:id/assignment-history | Customer assignment history |
| GET | /customer-relationships | All customer relationships |
| GET | /meal-plans | Trainer's saved plans |
| POST | /meal-plans | Save new meal plan |
| GET | /meal-plans/:id | Get specific plan |
| PUT | /meal-plans/:id | Update plan |
| DELETE | /meal-plans/:id | Delete plan |
| POST | /meal-plans/:id/assign | Assign plan to customer |
| DELETE | /meal-plans/:id/assign/:cid | Unassign from customer |
| POST | /customers/:id/meal-plans | Assign new plan |
| DELETE | /assigned-meal-plans/:id | Remove assignment |
| POST | /assign-meal-plan-bulk | Bulk assign plan |
| POST | /manual-meal-plan | Create manual meal plan |
| POST | /parse-manual-meals | Parse manual meal text |
| GET | /category-image-pool-health | Image pool health |
| GET | /assignment-history | Assignment history |
| GET | /assignment-statistics | Assignment stats |
| GET | /assignment-trends | Assignment trends |
| POST | /track-assignment | Track assignment |
| GET | /export-assignments | Export assignments |

### Customer Routes (`/api/customer/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /profile/stats | Customer statistics |

### Recipe Routes (`/api/recipes/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | Browse approved recipes |
| GET | /personalized | User's assigned recipes |
| GET | /:id | Single recipe detail |
| GET | /search | Advanced recipe search |
| GET | /search/metadata | Available filters |
| GET | /search/statistics | Search stats |

### Meal Plan Routes (`/api/meal-plan/*`)
| Method | Path | Description |
|--------|------|-------------|
| POST | /parse-natural-language | Parse NL input |
| POST | /generate | Generate meal plan |

### Grocery List Routes (`/api/grocery-lists/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List customer's grocery lists |
| GET | /:id | Get list with items |
| POST | / | Create grocery list |
| PUT | /:id | Update grocery list |
| DELETE | /:id | Delete grocery list |
| POST | /:id/items | Add item |
| PUT | /:id/items/:itemId | Update item |
| DELETE | /:id/items/:itemId | Delete item |
| POST | /from-meal-plan | Generate from meal plan |

### Payment Routes (`/api/payment/*` and `/api/v1/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /v1/public/pricing | Public tier pricing |
| POST | /v1/tiers/purchase | Create checkout session |
| POST | /v1/billing/portal | Stripe billing portal |

### Other Routes
| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | /api/email-preferences | Email preferences |
| GET | /api/email-analytics/* | Email analytics |
| GET | /api/entitlements | User tier & entitlements |
| GET | /api/ratings/* | Recipe ratings |
| GET/POST | /api/favorites/* | Recipe favorites |
| GET/POST | /api/meal-plan-sharing/* | Meal plan sharing |
| GET | /api/trending/* | Trending recipes |
| GET | /api/usage/* | Usage tracking |
| GET | /api/analytics/* | General analytics |
| GET | /api/admin-analytics/* | Admin analytics |
| GET/PUT | /api/branding/* | Trainer branding |
| GET | /api/progress/* | Progress tracking |
| GET | /api/progress-summaries/* | Progress summaries |
| GET | /api/meal-types/* | Meal type categories |
| DELETE | /api/account-deletion/* | Account deletion |
| GET/PUT | /api/profile/* | User profile |
| GET | /api/subscription/* | Subscription management |
| GET | /api/tier/* | Tier information |

---

## 15. Dead Code & Unused Features

### Removed Features
| Feature | Status | Evidence |
|---------|--------|----------|
| **Health Protocol** | REMOVED (Aug 2025) | Tables and components deleted. Confirmed via QA review. |
| **Customer Goals** | DISABLED | Tables commented out in schema (`schema.ts:696-758`). Stub exports prevent import errors. Endpoint returns `[]`. |

### Disabled/Incomplete Code
| Item | Status | Evidence |
|------|--------|----------|
| `engagement.ts.backup` | Dead file | Backup of engagement routes |
| `engagement.ts.disabled` | Dead file | Disabled engagement routes |
| Usage enforcement middleware | Temporarily disabled | Comments in `mealPlan.ts:11-13`: "TEMPORARILY DISABLED - Stripe integration incomplete" |
| Recipe tier search filtering | Not implemented | Comments in `recipes.ts:41`: "tierLevel removed - tier system not implemented" |
| `stripeCustomerId` on users table | Not in schema | Referenced in `subscriptionRoutes.ts:62` but not defined in `shared/schema.ts` users table |

### Potentially Underused Tables
| Table | Observation |
|-------|-------------|
| `recipe_recommendations` | Pre-computed recommendations with expiration — may not be actively populated |
| `user_activity_sessions` | Session tracking — unclear if actively used by frontend |
| `recipe_type_categories` | Seed data table for tier meal types — may need seeding |
| `recipe_tier_access` | Monthly allocation tracking — may not be actively enforced |

---

## 16. Database Schema Summary

### Tables (34 active + 2 commented out)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | User accounts (all roles) |
| 2 | `email_preferences` | Email communication settings |
| 3 | `email_send_log` | Email delivery tracking |
| 4 | `password_reset_tokens` | Password reset flow |
| 5 | `refresh_tokens` | JWT refresh tokens |
| 6 | `customer_invitations` | Trainer-to-customer invitations |
| 7 | `recipes` | Recipe library |
| 8 | `personalized_recipes` | Recipe-to-customer assignments |
| 9 | `personalized_meal_plans` | Direct meal plan assignments |
| 10 | `trainer_meal_plans` | Trainer's saved meal plans |
| 11 | `meal_plan_assignments` | Saved plan-to-customer links |
| 12 | `grocery_lists` | Customer grocery lists |
| 13 | `grocery_list_items` | Grocery list items |
| 14 | `progress_measurements` | Body measurements |
| 15 | `progress_photos` | Progress photo metadata |
| 16 | `recipe_favorites` | User recipe favorites |
| 17 | `recipe_collections` | User recipe collections |
| 18 | `collection_recipes` | Collection-recipe links |
| 19 | `recipe_interactions` | Engagement tracking |
| 20 | `recipe_recommendations` | AI recommendations |
| 21 | `user_activity_sessions` | Session analytics |
| 22 | `recipe_ratings` | User ratings/reviews |
| 23 | `recipe_rating_summary` | Aggregated rating stats |
| 24 | `rating_helpfulness` | Review helpfulness votes |
| 25 | `shared_meal_plans` | Shareable meal plan links |
| 26 | `recipe_tier_access` | Monthly tier recipe allocations |
| 27 | `recipe_type_categories` | Meal type tier gating |
| 28 | `trainer_subscriptions` | Stripe subscriptions |
| 29 | `subscription_items` | Subscription line items |
| 30 | `tier_usage_tracking` | Usage counters per period |
| 31 | `trainer_branding_settings` | Custom branding |
| 32 | `branding_audit_log` | Branding change audit |
| 33 | `payment_logs` | Payment event audit trail |
| 34 | `webhook_events` | Stripe webhook processing |
| -- | ~~`customer_goals`~~ | COMMENTED OUT |
| -- | ~~`goal_milestones`~~ | COMMENTED OUT |

### Enums (7)

| Enum | Values |
|------|--------|
| `user_role` | admin, trainer, customer |
| `tier_level` | starter, professional, enterprise |
| `subscription_status` | trialing, active, past_due, unpaid, canceled |
| `subscription_item_kind` | tier, ai |
| `payment_event_type` | purchase, upgrade, downgrade, refund, chargeback, failed |
| `payment_status` | pending, completed, failed, refunded |
| `webhook_event_status` | pending, processed, failed |

---

## 17. Deployment & Infrastructure

### Production Environment

| Item | Value |
|------|-------|
| **Platform** | DigitalOcean App Platform |
| **Production URL** | https://evofitmeals.com |
| **Deploy Branch** | `main` (auto-deploy on push) |
| **Port** | 5001 |
| **Runtime** | Node.js |
| **Database** | DigitalOcean Managed PostgreSQL 14 |
| **Config** | `.do/app.yaml` |

### CORS Configuration
- **Production:** `FRONTEND_URL` env var or fallback to `https://evofitmeals.com` (see `server/index.ts:77-79`)
- **Development:** `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`

### Local Development
- **Docker:** `docker-compose --profile dev up -d` (PostgreSQL + app on port 4000)
- **Port override:** Production uses `PORT=5001` via `.do/app.yaml`; local defaults to `process.env.PORT || 4000`

### Health Check
- **Endpoint:** `GET /api/health`
- **Used by:** DigitalOcean App Platform for readiness/liveness checks
