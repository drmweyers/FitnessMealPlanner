# BMAD To Do List

Last Updated: 2025-01-15
Scope: BMAD documentation tasks and follow-ups tied to the canonical database and policy spec

## ✅ Recently Completed (January 15, 2025)

- [x] Mailgun Email Invitation Testing Campaign
  - [x] Created comprehensive unit test suite (13 tests) - `test/unit/services/emailService.test.ts`
  - [x] Created E2E test suite (20+ tests) - `test/e2e/email-invitation-system.spec.ts`
  - [x] Enhanced auth helpers with customizable credentials - `test/e2e/helpers/auth.ts`
  - [x] Launched Playwright GUI for visual test confirmation
  - [x] Created comprehensive session documentation - `BMAD_MAILGUN_TESTING_SESSION_JANUARY_2025.md`
  - [x] Achieved 100% unit test pass rate (13/13 passing)
  - [x] Total: 33+ comprehensive tests (13 unit + 20+ E2E)
  - [x] Status: ✅ **PRODUCTION READY**

## ✅ Previously Completed (December 8, 2024)

- [x] Comprehensive Recipe Generation Testing Suite
  - [x] Created integration tests (40+ tests) - `test/integration/recipeGeneration.integration.test.ts`
  - [x] Created enhanced E2E tests (60+ tests) - `test/e2e/admin-recipe-generation-comprehensive.spec.ts`
  - [x] Created test automation runner - `test/run-comprehensive-recipe-tests.ts`
  - [x] Created comprehensive documentation (4,100+ lines)
    - [x] `RECIPE_GENERATION_TEST_GUIDE.md` - Complete testing guide
    - [x] `COMPREHENSIVE_TEST_IMPLEMENTATION_REPORT.md` - Implementation report
    - [x] `QUICK_TEST_REFERENCE.md` - Quick reference card
  - [x] Created BMAD session document - `BMAD_RECIPE_TESTING_SESSION_DECEMBER_2024.md`
  - [x] Achieved 88% code coverage (target: 85%+)
  - [x] Total: 270+ comprehensive tests
  - [x] Status: ✅ **PRODUCTION READY**

## Pending items

- [ ] Harmonize feature matrix in 3-TIER_TRAINER_PROFILE_PRD.md to canonical policy
  - [ ] Update Export Capabilities row: Tier 2 = CSV only; Tier 3 = CSV, Excel, PDF + Analytics API access
  - [ ] Update Analytics API Access row: Tier 1 = ❌, Tier 2 = ❌, Tier 3 = ✅
  - Notes: Keep the existing “Corrected Analytics & Reporting (Authoritative)” section; this task is to align the earlier table rows for consistency.

- [ ] Create Pull Request for docs alignment (PRD/BMAD)
  - Branch: mealplangeneratorapp → Base: main
  - Includes changes to: PRD.md, 3-TIER_TRAINER_PROFILE_PRD.md, docs/BMAD_3_TIER_TRAINER_PROFILE_PLAN.md
  - Using GitHub CLI (after authentication):
    - gh auth login
    - gh pr create --repo drmweyers/FitnessMealPlanner --base main --head mealplangeneratorapp --title "Docs: align PRD/BMAD with canonical spec" --body "Align PRD and BMAD docs with canonical spec: /api/v1 versioning; Tier 2 CSV-only; Tier 3 CSV/Excel/PDF + Analytics API; 14-day tier-limited trial; AI plans Starter/Pro/Enterprise; AI cancellation doesn't downgrade tiers; reference canonical schema for RLS & secure payments."
  - Or via browser link:
    - https://github.com/drmweyers/FitnessMealPlanner/compare/main...mealplangeneratorapp?expand=1

- [ ] Post-PR steps
  - [ ] Review wording for clarity and consistency
  - [ ] Address any reviewer feedback
  - [ ] Merge PR when approved
  - [ ] Optionally delete branch mealplangeneratorapp after merge

Context references

- Canonical schema and policies: docs/CANONICAL_DATABASE_SCHEMA.sql
- Policy alignment applied to: analytics-api-specification.md, API_DOCUMENTATION.md, docs/BMAD_3_TIER_TECHNICAL_GAP_ANALYSIS.md, PRD.md, 3-TIER_TRAINER_PROFILE_PRD.md, docs/BMAD_3_TIER_TRAINER_PROFILE_PLAN.md
