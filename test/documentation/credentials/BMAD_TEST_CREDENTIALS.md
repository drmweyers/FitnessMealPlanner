# 🔐 BMAD Process - Official Test Credentials

## Critical Information
**These credentials MUST be active on both DEVELOPMENT and PRODUCTION environments**

## Official Test Accounts

### 1. Admin Account
```
Email: admin@fitmeal.pro
Password: AdminPass123
Role: admin
```
**Access Level:** 
- Full system administration
- Analytics dashboard
- User management
- Recipe approval
- All features

### 2. Trainer Account
```
Email: trainer.test@evofitmeals.com
Password: TestTrainer123!
Role: trainer
```
**Access Level:**
- Customer management
- Meal plan creation
- Recipe generation
- Progress tracking
- PDF exports

### 3. Customer Account
```
Email: customer.test@evofitmeals.com
Password: TestCustomer123!
Role: customer
```
**Access Level:**
- View assigned meal plans
- Progress tracking
- Recipe viewing
- PDF downloads
- Redirects to: `/my-meal-plans`

## Environment URLs

### Development
- **Application:** http://localhost:4000
- **API:** http://localhost:4000/api
- **Database:** PostgreSQL on port 5433

### Production
- **Application:** https://evofitmeals.com
- **API:** https://evofitmeals.com/api
- **Platform:** DigitalOcean App Platform

## Database Seeding Commands

To ensure these accounts exist in the database, run:

```sql
-- Admin Account
INSERT INTO users (email, password_hash, role, created_at, updated_at)
VALUES ('admin@fitmeal.pro', '$2b$10$[hashed_password]', 'admin', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Trainer Account
INSERT INTO users (email, password_hash, role, created_at, updated_at)
VALUES ('trainer.test@evofitmeals.com', '$2b$10$[hashed_password]', 'trainer', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Customer Account
INSERT INTO users (email, password_hash, role, created_at, updated_at)
VALUES ('customer.test@evofitmeals.com', '$2b$10$[hashed_password]', 'customer', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
```

## Testing Verification

### Playwright Tests
All test files use these credentials:
- `/test/e2e/qa-auth-test.spec.ts`
- `/test/e2e/qa-critical-features.spec.ts`
- `/test/e2e/qa-admin-comprehensive.spec.ts`
- `/test/e2e/qa-final-comprehensive.spec.ts`

### Manual Testing Steps
1. **Admin:** Login → Verify redirect to `/admin`
2. **Trainer:** Login → Verify redirect to `/trainer`
3. **Customer:** Login → Verify redirect to `/my-meal-plans`

## BMAD Process Integration

These credentials are used throughout the BMAD development process:
- **Story 1.1:** Multi-Role Authentication System ✅
- **Story 1.5:** Trainer-Customer Management ✅
- **Story 1.6:** Progress Tracking System ✅
- **Story 1.9:** Analytics Dashboard ✅

## Important Notes

⚠️ **CRITICAL:** These accounts MUST remain active at all times
- Do NOT delete these accounts from production
- Do NOT change passwords without updating documentation
- These are the ONLY official test credentials
- All QA tests depend on these exact credentials

## Verification Status

| Account | Dev Status | Prod Status | Last Verified |
|---------|------------|-------------|---------------|
| Admin | ✅ Active | ✅ Active | Sept 1, 2025 |
| Trainer | ✅ Active | ✅ Active | Sept 1, 2025 |
| Customer | ✅ Active | ✅ Active | Sept 1, 2025 |

## Quick Test Command

Run this to verify all accounts:
```bash
npx playwright test test/e2e/qa-auth-test.spec.ts --project=chromium
```

---

**Document Owner:** BMAD CCA-CTO
**Last Updated:** September 1, 2025
**Status:** ACTIVE - DO NOT MODIFY WITHOUT APPROVAL