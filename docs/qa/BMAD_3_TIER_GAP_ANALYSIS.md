# BMAD 3-Tier System Gap Analysis

**QA Agent Analysis Date:** February 1, 2025
**Reviewed By:** BMAD QA Agent (Quinn)
**Status:** 🔴 CRITICAL GAPS IDENTIFIED
**Risk Level:** HIGH

---

## Executive Summary

This gap analysis compares the **TIER_COMPARISON.md** (complete feature list) against the **PRD Epic 2** and **architecture.md** implementation plans to identify missing features, incomplete specifications, and implementation risks.

**Critical Findings:**
- ✅ **8/16 feature categories** fully documented in implementation plan
- ⚠️ **8/16 feature categories** missing or incomplete in PRD/architecture
- 🔴 **26 specific features** missing implementation stories
- 🔴 **12 high-risk gaps** requiring immediate attention

---

## Gap Analysis Matrix

### ✅ FULLY DOCUMENTED (8 categories)

#### 1. Pricing & Access
- ✅ One-time payment model (Story 2.1)
- ✅ Tier pricing: $199/$299/$399 (Story 2.1)
- ✅ Lifetime access (Story 2.1)
- ✅ 30-day money-back guarantee (Story 2.1)

#### 2. Core Capacity Limits
- ✅ Customer slots: 9/20/50 (Story 2.3)
- ✅ Meal plans: 50/200/500 (Story 2.3)
- ✅ Usage tracking (Story 2.3)
- ✅ Storage (implied in architecture)

#### 3. Recipe Database Access
- ✅ Initial recipe library: 1,000/2,500/4,000 (Story 2.4)
- ✅ Monthly new recipes: +25/+50/+100 (Story 2.4)
- ✅ Meal type varieties: 5/10/15+ (Story 2.4)
- ✅ Seasonal recipes (Story 2.4)
- ✅ Exclusive enterprise recipes (Story 2.4)

#### 4. Meal Types
- ✅ All 17 meal types documented (architecture.md lines 388-391)
- ✅ Tier-based restrictions (Story 2.4)

#### 5. Feature Gating
- ✅ Server-side middleware (Story 2.2)
- ✅ Frontend FeatureGate component (Story 2.2)
- ✅ Upgrade prompts (Story 2.2)

#### 6. Tier Upgrades
- ✅ Upgrade pricing calculation (Story 2.5)
- ✅ Data preservation (Story 2.5)
- ✅ Immediate access grants (Story 2.5)

#### 7. Caching & Performance
- ✅ Redis caching with 5-min TTL (Story 2.6)
- ✅ Cache invalidation (Story 2.6)
- ✅ Graceful degradation (Story 2.6)

#### 8. Payment Processing
- ✅ Stripe Checkout integration (Story 2.1)
- ✅ Webhook processing (Story 2.1)
- ✅ Payment audit logging (Story 2.7)

---

## 🔴 CRITICAL GAPS (8 categories)

### 1. Export Formats ⚠️ HIGH RISK

**Tier Comparison Requirements:**
- Starter: PDF only
- Professional: PDF, CSV, Excel
- Enterprise: All formats + custom options

**Current Implementation Status:**
- ❌ **NO STORIES** for export format restrictions
- ❌ **NO MIDDLEWARE** for export gating documented
- ❌ **NO ACCEPTANCE CRITERIA** for CSV/Excel generation
- ❌ **NO SPECIFICATIONS** for "custom format options" in Enterprise

**Gap Details:**
```
MISSING STORY 2.9: Export Format Restrictions by Tier

Acceptance Criteria Needed:
1. Starter tier: Only PDF export available
2. Professional tier: PDF, CSV, Excel export enabled
3. Enterprise tier: All export formats + custom format builder
4. Export middleware checks tier entitlements before generation
5. Export buttons show/hide based on tier
6. Export requests return 403 if tier insufficient
7. Export format selection UI reflects tier capabilities
```

**Impact:** Users can currently export in any format regardless of tier (if implemented) or exports don't work at all.

**Risk Level:** HIGH - Revenue differentiation not enforced

---

### 2. Analytics & Reporting ⚠️ HIGH RISK

**Tier Comparison Requirements:**
- Starter: Basic statistics only
- Professional: Analytics dashboard
- Enterprise: Advanced analytics + custom reports + data visualization

**Current Implementation Status:**
- ❌ **NO STORIES** for analytics tier restrictions
- ❌ **NO DEFINITION** of "basic statistics" vs "analytics dashboard"
- ❌ **NO SPECIFICATIONS** for custom reports in Enterprise
- ❌ **NO UI COMPONENTS** documented for analytics features

**Gap Details:**
```
MISSING STORY 2.10: Analytics & Reporting Tier Differentiation

Acceptance Criteria Needed:
1. Starter tier: Basic stats (customer count, meal plan count, recipe usage)
2. Professional tier: Analytics dashboard with charts/graphs
3. Enterprise tier: Advanced analytics (trends, predictions, insights)
4. Enterprise tier: Custom report builder
5. Enterprise tier: Advanced data visualization (custom charts)
6. Analytics routes gated by requireFeature('analytics_dashboard')
7. Report generation gated by requireFeature('custom_reports')
8. UI components show/hide based on tier entitlements
```

**Impact:** No differentiation between tier analytics capabilities.

**Risk Level:** HIGH - Key enterprise selling point missing

---

### 3. Operations & Workflow ⚠️ MEDIUM RISK

**Tier Comparison Requirements:**
- Starter: Single recipe management only
- Professional: Bulk operations + batch recipe import
- Enterprise: Advanced automation tools

**Current Implementation Status:**
- ✅ Single recipe management (exists in current system)
- ❌ **NO STORIES** for bulk operations restrictions
- ❌ **NO SPECIFICATIONS** for batch recipe import
- ❌ **NO DEFINITION** of "automation tools" for Enterprise
- ❌ **NO TEMPLATE LIBRARY** tier differentiation documented

**Gap Details:**
```
MISSING STORY 2.11: Bulk Operations & Workflow Automation

Acceptance Criteria Needed:
1. Starter tier: Single recipe creation/editing only
2. Professional tier: Bulk recipe operations (multi-select, batch edit)
3. Professional tier: Batch recipe import (CSV upload)
4. Enterprise tier: Template library (basic vs advanced vs premium)
5. Enterprise tier: Automation tools (auto-meal plan generation, scheduling)
6. Bulk operation endpoints gated by requireFeature('bulk_operations')
7. Batch import UI hidden for Starter tier
8. Automation panel only visible to Enterprise tier
```

**Impact:** No workflow efficiency differentiation between tiers.

**Risk Level:** MEDIUM - Professional/Enterprise value proposition weakened

---

### 4. Branding & Customization ⚠️ CRITICAL RISK

**Tier Comparison Requirements:**
- Starter: Default EvoFitMeals branding only
- Professional: Custom branding (logo, colors)
- Enterprise: White-label (remove all branding) + custom domain

**Current Implementation Status:**
- ❌ **NO STORIES** for branding customization
- ❌ **NO DATABASE SCHEMA** for custom branding settings
- ❌ **NO API ENDPOINTS** for branding configuration
- ❌ **NO UI COMPONENTS** for branding editor
- ❌ **NO SPECIFICATIONS** for white-label implementation
- ❌ **NO CUSTOM DOMAIN** infrastructure documented

**Gap Details:**
```
MISSING STORY 2.12: Branding & Customization System

Acceptance Criteria Needed:
1. Professional tier: Logo upload (S3 storage)
2. Professional tier: Custom color palette (6 color pickers)
3. Professional tier: Branding preview before save
4. Enterprise tier: White-label mode (removes all EvoFitMeals references)
5. Enterprise tier: Custom domain configuration
6. Database table: trainer_branding_settings
7. API: GET/PUT /api/v1/tiers/branding
8. Frontend: BrandingEditor component (Professional+)
9. Frontend: Branding applied to meal plan PDFs
10. Frontend: Custom domain DNS configuration guide
```

**Impact:** CRITICAL - Enterprise tier's primary differentiation missing entirely.

**Risk Level:** CRITICAL - Cannot sell Enterprise tier without white-label

---

### 5. Support & Service ⚠️ LOW RISK (Operational)

**Tier Comparison Requirements:**
- Starter: 48-hour email support
- Professional: 24-hour priority support
- Enterprise: 4-hour dedicated support + phone + onboarding + account manager

**Current Implementation Status:**
- ❌ **NO TECHNICAL IMPLEMENTATION** needed (operational policy)
- ⚠️ **DOCUMENTATION NEEDED** for support tier SLAs
- ⚠️ **ZENDESK/SUPPORT SYSTEM** integration may be needed
- ❌ **NO TIER METADATA** in support tickets

**Gap Details:**
```
MISSING OPERATIONAL DOCUMENTATION: Support SLA Procedures

Requirements:
1. Support ticket system tags tickets with user tier
2. Support team dashboard shows tier-based SLA targets
3. Automated routing: Enterprise → dedicated team
4. Phone support contact info displayed only to Enterprise users
5. Onboarding call scheduling for Enterprise (post-purchase)
6. Account manager assignment for Enterprise users
7. Support response time tracking and reporting
```

**Impact:** Support differentiation not enforceable without tooling.

**Risk Level:** LOW - Operational, not technical gap

---

### 6. Storage Differentiation ⚠️ MEDIUM RISK

**Tier Comparison Requirements:**
- Starter: Standard storage
- Professional: Enhanced storage
- Enterprise: Premium storage

**Current Implementation Status:**
- ❌ **NO DEFINITION** of "standard" vs "enhanced" vs "premium"
- ❌ **NO STORAGE QUOTAS** documented
- ❌ **NO FILE UPLOAD LIMITS** by tier
- ❌ **NO S3 STORAGE TRACKING** by user

**Gap Details:**
```
MISSING STORY 2.13: Storage Quotas by Tier

Acceptance Criteria Needed:
1. Starter tier: 1GB storage limit (images, PDFs, documents)
2. Professional tier: 5GB storage limit
3. Enterprise tier: 25GB storage limit
4. Storage usage tracked per trainer
5. File upload blocked when quota exceeded
6. Storage usage displayed in UsageLimitIndicator
7. Image upload middleware checks storage quota
8. Upgrade prompt when approaching storage limit
```

**Impact:** Storage costs not controlled, abuse possible.

**Risk Level:** MEDIUM - Cost control issue

---

### 7. Recipe Access Enforcement ⚠️ HIGH RISK

**Tier Comparison Requirements:**
- Progressive access: Higher tiers see all lower-tier recipes
- Recipe queries filtered by tier

**Current Implementation Status:**
- ✅ Story 2.4 mentions recipe filtering
- ❌ **NO TECHNICAL SPECIFICATION** for filtering logic
- ❌ **NO DATABASE QUERIES** documented
- ❌ **NO RECIPE TAGGING SYSTEM** by tier

**Gap Details:**
```
MISSING TECHNICAL SPECIFICATION: Recipe Tier Filtering Implementation

Requirements:
1. Recipe table needs `tier_level` column (ENUM: starter, professional, enterprise)
2. Recipe query middleware: WHERE tier_level <= user.tier_level
3. Recipe count enforcement: Count user-accessible recipes only
4. Monthly recipe allocation stored in recipe_tier_access table
5. Cron job: Monthly script to allocate new recipes to tiers
6. Recipe seeding: Initial 1,000/2,500/4,000 recipes tagged appropriately
7. Admin recipe creator: Tier assignment dropdown
```

**Impact:** Recipe differentiation cannot be enforced without technical spec.

**Risk Level:** HIGH - Core tier value proposition at risk

---

### 8. Meal Type Restrictions ⚠️ HIGH RISK

**Tier Comparison Requirements:**
- 17 meal types with tier-specific availability

**Current Implementation Status:**
- ✅ Story 2.4 mentions meal type restrictions
- ✅ Architecture.md lists all 17 meal types by tier
- ❌ **NO DATABASE SCHEMA** for meal type tier mapping
- ❌ **NO MEAL TYPE FILTERING** in recipe queries
- ❌ **NO UI RESTRICTIONS** on meal type selection

**Gap Details:**
```
MISSING TECHNICAL SPECIFICATION: Meal Type Tier Enforcement

Requirements:
1. Table: recipe_type_categories (name, tier_level, is_seasonal)
2. Seed data: 17 meal types with tier assignments
3. Recipe query: JOIN recipe_type_categories, filter by user tier
4. Meal plan generator: Filter meal types by user tier
5. Recipe search: Meal type dropdown filtered by tier
6. Admin: Cannot create meal types unavailable to user's tier
7. Frontend: Meal type badges show lock icon if tier insufficient
```

**Impact:** Meal type restrictions not enforceable.

**Risk Level:** HIGH - Tier differentiation undermined

---

## Summary of Missing Stories

### Required New Stories

**Story 2.9: Export Format Tier Restrictions**
- Priority: HIGH
- Effort: Medium (2-3 days)
- Dependencies: Export system must exist

**Story 2.10: Analytics & Reporting Tier Differentiation**
- Priority: HIGH
- Effort: High (5-7 days)
- Dependencies: Analytics system must be built

**Story 2.11: Bulk Operations & Workflow Automation**
- Priority: MEDIUM
- Effort: High (5-7 days)
- Dependencies: None (new feature)

**Story 2.12: Branding & Customization System**
- Priority: CRITICAL
- Effort: Very High (10-14 days)
- Dependencies: S3 storage, PDF generation system

**Story 2.13: Storage Quotas by Tier**
- Priority: MEDIUM
- Effort: Medium (3-4 days)
- Dependencies: S3 tracking system

**Story 2.14: Recipe Tier Filtering Technical Implementation**
- Priority: HIGH
- Effort: Medium (4-5 days)
- Dependencies: Database migration

**Story 2.15: Meal Type Tier Enforcement**
- Priority: HIGH
- Effort: Medium (3-4 days)
- Dependencies: Database migration, recipe_type_categories table

---

## Database Schema Gaps

### Missing Tables

**1. trainer_branding_settings**
```sql
CREATE TABLE trainer_branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7),    -- Hex color
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),
  white_label_enabled BOOLEAN DEFAULT FALSE,
  custom_domain VARCHAR(255),
  custom_domain_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**2. trainer_storage_usage**
```sql
CREATE TABLE trainer_storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  total_bytes_used BIGINT DEFAULT 0,
  quota_bytes BIGINT NOT NULL,  -- Based on tier
  last_calculated TIMESTAMP DEFAULT NOW()
);
```

**3. recipe_export_logs**
```sql
CREATE TABLE recipe_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES users(id),
  export_format VARCHAR(50),  -- 'pdf', 'csv', 'excel', 'custom'
  recipe_count INTEGER,
  tier_at_export tier_level_enum,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Missing Columns

**recipes table:**
```sql
ALTER TABLE recipes
ADD COLUMN tier_level tier_level_enum DEFAULT 'starter',
ADD COLUMN is_seasonal BOOLEAN DEFAULT FALSE,
ADD COLUMN allocated_month VARCHAR(7);  -- '2025-02' for monthly tracking
```

### Missing Enum Values

**Export formats:**
```sql
CREATE TYPE export_format_enum AS ENUM ('pdf', 'csv', 'excel', 'json', 'custom');
```

---

## API Endpoint Gaps

### Missing Endpoints

**Branding:**
- `GET /api/v1/tiers/branding` - Fetch current branding settings
- `PUT /api/v1/tiers/branding` - Update branding (Professional+)
- `POST /api/v1/tiers/branding/logo` - Upload logo (Professional+)
- `DELETE /api/v1/tiers/branding/logo` - Remove logo
- `POST /api/v1/tiers/branding/verify-domain` - Verify custom domain (Enterprise)

**Analytics:**
- `GET /api/v1/analytics/dashboard` - Dashboard data (Professional+)
- `GET /api/v1/analytics/advanced` - Advanced analytics (Enterprise)
- `POST /api/v1/analytics/custom-report` - Generate custom report (Enterprise)

**Bulk Operations:**
- `POST /api/v1/recipes/bulk-create` - Batch recipe creation (Professional+)
- `PUT /api/v1/recipes/bulk-edit` - Batch recipe editing (Professional+)
- `POST /api/v1/recipes/import-csv` - CSV import (Professional+)

**Exports:**
- `POST /api/v1/export/csv` - CSV export (Professional+)
- `POST /api/v1/export/excel` - Excel export (Professional+)
- `POST /api/v1/export/custom` - Custom format export (Enterprise)

**Storage:**
- `GET /api/v1/tiers/storage` - Current storage usage

---

## Frontend Component Gaps

### Missing Components

**Branding:**
- `BrandingEditor.tsx` - Logo upload, color pickers (Professional+)
- `WhiteLabelToggle.tsx` - Enable/disable white-label (Enterprise)
- `CustomDomainSettings.tsx` - Domain configuration (Enterprise)

**Analytics:**
- `AnalyticsDashboard.tsx` - Charts and graphs (Professional+)
- `AdvancedAnalytics.tsx` - Trends, predictions (Enterprise)
- `CustomReportBuilder.tsx` - Report configuration (Enterprise)

**Bulk Operations:**
- `BulkRecipeEditor.tsx` - Multi-select editing (Professional+)
- `RecipeCSVImporter.tsx` - CSV upload and preview (Professional+)
- `AutomationPanel.tsx` - Workflow automation (Enterprise)

**Export:**
- `ExportFormatSelector.tsx` - Tier-aware format selection

**Storage:**
- `StorageUsageIndicator.tsx` - Storage quota display

---

## Middleware Gaps

### Missing Middleware Functions

**Feature gates:**
```typescript
requireFeature('bulk_operations')      // Professional+
requireFeature('analytics_dashboard')  // Professional+
requireFeature('custom_reports')       // Enterprise
requireFeature('white_label')          // Enterprise
requireFeature('csv_export')           // Professional+
requireFeature('excel_export')         // Professional+
requireFeature('custom_export')        // Enterprise
```

**Storage checks:**
```typescript
checkStorageQuota(fileSizeBytes)  // Before file upload
trackStorageUsage(fileSizeBytes)  // After file upload
```

---

## Test Coverage Gaps

### Unit Tests Needed (26 tests)

**TierManagementService:**
1. `getBrandingSettings()` - Returns branding for tier
2. `updateBranding()` - Only Professional+ can update
3. `enableWhiteLabel()` - Only Enterprise can enable
4. `getStorageQuota()` - Returns quota by tier
5. `checkStorageAvailable()` - Validates before upload

**StripePaymentService:**
6. `calculateUpgradePrice()` - Validates all tier combinations
7. `processRefund()` - Handles 30-day money-back

**ExportService:**
8. `exportToPDF()` - Available to all tiers
9. `exportToCSV()` - Blocked for Starter
10. `exportToExcel()` - Blocked for Starter
11. `exportCustomFormat()` - Blocked for Starter & Professional

**AnalyticsService:**
12. `getBasicStats()` - All tiers
13. `getDashboardData()` - Professional+ only
14. `getAdvancedAnalytics()` - Enterprise only
15. `generateCustomReport()` - Enterprise only

**RecipeService:**
16. `filterRecipesByTier()` - Progressive access
17. `filterMealTypesByTier()` - 5/10/15+ types
18. `getSeasonalRecipes()` - Professional+ only
19. `allocateMonthlyRecipes()` - Cron job logic

**BulkOperationService:**
20. `bulkCreateRecipes()` - Professional+ only
21. `bulkEditRecipes()` - Professional+ only
22. `importRecipesFromCSV()` - Professional+ only

### Integration Tests Needed (15 tests)

**Tier Purchase Flow:**
23. `POST /api/v1/tiers/purchase` - Creates Stripe session
24. `POST /api/v1/webhooks/stripe` - Grants tier on success
25. `GET /api/v1/tiers/current` - Returns correct entitlements

**Tier Upgrade Flow:**
26. `POST /api/v1/tiers/upgrade` - Calculates correct price
27. Upgrade preserves existing data
28. Upgrade expands recipe access immediately

**Export Restrictions:**
29. Starter cannot access CSV export (403)
30. Professional can access CSV/Excel
31. Enterprise can access custom exports

**Analytics Restrictions:**
32. Starter sees basic stats only
33. Professional sees analytics dashboard
34. Enterprise sees advanced analytics

**Branding:**
35. Professional can upload logo
36. Enterprise can enable white-label
37. Branding applied to PDF exports

### E2E Tests Needed (20 tests)

**Purchase Flow:**
38. Complete Starter tier purchase
39. Complete Professional tier purchase
40. Complete Enterprise tier purchase
41. Verify 30-day refund process

**Feature Access:**
42. Starter blocked from Professional features
43. Professional blocked from Enterprise features
44. Upgrade unlocks new features immediately

**Recipe Access:**
45. Starter sees 1,000 recipes max
46. Professional sees 2,500 recipes max
47. Enterprise sees 4,000 recipes max
48. Meal types filtered by tier

**Export Workflows:**
49. Starter exports PDF successfully
50. Starter blocked from CSV export
51. Professional exports CSV successfully
52. Enterprise exports custom format

**Branding Workflows:**
53. Professional uploads custom logo
54. Professional changes brand colors
55. Enterprise enables white-label mode
56. Branding appears in PDF exports

**Analytics Workflows:**
57. All tiers see basic statistics
58. Professional sees analytics dashboard
59. Enterprise sees advanced analytics
60. Enterprise generates custom report

---

## Risk Assessment

### Critical Risks (Must Fix Before Launch)

1. **Branding System Missing** - Enterprise tier unsellable
2. **Recipe Tier Filtering Missing** - Core value proposition broken
3. **Meal Type Restrictions Missing** - Tier differentiation undermined

### High Risks (Should Fix Before Launch)

4. **Export Format Restrictions Missing** - Revenue differentiation lost
5. **Analytics Differentiation Missing** - Professional/Enterprise value unclear
6. **Storage Quotas Missing** - Cost abuse possible

### Medium Risks (Can Fix Post-Launch)

7. **Bulk Operations Missing** - Workflow efficiency not differentiated
8. **Template Library Missing** - Mentioned but not specified

### Low Risks (Operational)

9. **Support SLA Tooling** - Can be handled manually initially

---

## Recommendations

### Phase 1: Critical Fixes (Before Launch)

1. **Create Stories 2.12, 2.14, 2.15** (Branding, Recipe Filtering, Meal Types)
2. **Implement Database Migrations** for missing tables/columns
3. **Build Core Tier Enforcement** logic for recipes and meal types
4. **Implement Branding System** MVP (logo + colors, white-label toggle)

### Phase 2: High-Priority Additions (Week 1 Post-Launch)

5. **Create Stories 2.9, 2.10** (Exports, Analytics)
6. **Implement Export Restrictions** middleware
7. **Build Analytics Dashboard** for Professional tier
8. **Build Advanced Analytics** for Enterprise tier

### Phase 3: Feature Enhancements (Month 1 Post-Launch)

9. **Create Stories 2.11, 2.13** (Bulk Operations, Storage)
10. **Implement Bulk Recipe Operations** for Professional+
11. **Implement Storage Quotas** and tracking
12. **Build Automation Tools** for Enterprise

### Phase 4: Polish & Optimization (Ongoing)

13. **Complete Test Suite** (61 tests total)
14. **Performance Optimization** for tier checks
15. **Documentation Updates** for all new features

---

## Conclusion

The current implementation plan (Stories 2.1-2.8) covers **50% of the tier system features**. The remaining **50% (8 feature categories, 26 specific features)** require **7 additional user stories** and significant development effort.

**Estimated Additional Effort:**
- 7 new user stories: 35-50 development days
- 61 comprehensive tests: 10-15 testing days
- **Total:** 45-65 additional days of work

**Critical Path:** Stories 2.12, 2.14, 2.15 must be completed before the tier system can launch. Without these, the tier differentiation is not enforceable and Enterprise tier cannot be sold.

**Next Steps:**
1. Review this gap analysis with stakeholders
2. Prioritize missing stories
3. Create detailed acceptance criteria for Stories 2.9-2.15
4. Implement critical path stories first
5. Build comprehensive test suite in parallel

---

**QA Gate Decision:** 🔴 **FAIL - CRITICAL GAPS MUST BE ADDRESSED**

**Recommendation:** Do not proceed with tier system launch until Stories 2.12, 2.14, and 2.15 are implemented and tested.
