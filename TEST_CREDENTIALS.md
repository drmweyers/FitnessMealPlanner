# 🔐 Official Test Credentials

**⚠️ WARNING: THESE CREDENTIALS MUST NEVER CHANGE**

**Last Updated:** October 6, 2025 - All files synchronized to these credentials

These are the **ONLY** official test accounts for FitnessMealPlanner.
All tests, documentation, and development workflows depend on these exact credentials.

**✅ ALL FILES UPDATED:** All references to test credentials have been standardized to these values.

---

## Official Test Accounts

### 👨‍💼 ADMIN Account
```
Email:    admin@fitmeal.pro
Password: AdminPass123
Role:     admin
Name:     Test Admin
```

**Use for:**
- Admin dashboard testing
- User management testing
- System configuration testing
- Administrative workflow testing

---

### 🏋️ TRAINER Account
```
Email:    trainer.test@evofitmeals.com
Password: TestTrainer123!
Role:     trainer
Name:     Test Trainer
```

**Use for:**
- Trainer dashboard testing
- Customer management testing
- Meal plan creation testing
- Trainer-customer relationship testing

---

### 👤 CUSTOMER Account
```
Email:    customer.test@evofitmeals.com
Password: TestCustomer123!
Role:     customer
Name:     Test Customer
```

**Use for:**
- Customer dashboard testing
- Meal plan viewing testing
- Progress tracking testing
- Customer features testing

---

## How to Reset/Create Test Accounts

If test accounts are missing or have wrong passwords, run:

```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner
tsx server/db/seeds/test-accounts.ts
```

This will:
1. Check if accounts exist
2. Update passwords to match official credentials
3. Create accounts if they don't exist

**Output should show:**
```
🌱 Seeding test accounts...
✅ Account already exists: admin@fitmeal.pro
   Password updated for: admin@fitmeal.pro
✅ Account already exists: trainer.test@evofitmeals.com
   Password updated for: trainer.test@evofitmeals.com
✅ Account already exists: customer.test@evofitmeals.com
   Password updated for: customer.test@evofitmeals.com
🎉 Test accounts seeding complete!
```

---

## Verification

### Quick Login Test
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fitmeal.pro",
    "password": "AdminPass123"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGci...",
    "user": {
      "id": "...",
      "email": "admin@fitmeal.pro",
      "role": "admin"
    }
  }
}
```

### Run Test Suite
```bash
npm run test:server
```

All authentication tests should pass with these credentials.

---

## Where These Credentials Are Used

### 1. Seed File (Source of Truth)
**File:** `server/db/seeds/test-accounts.ts`
- Lines 14-33: Official credentials definition
- This is the canonical source

### 2. Test Files
- `test/integration/comprehensive-api-integration.test.ts`
- `test/e2e/test-accounts-verification.spec.ts`
- `test/e2e/comprehensive-system-e2e.spec.ts`
- All E2E and integration tests

### 3. Documentation
- `BMAD_SESSION_OCTOBER_2_2025.md` (lines 101-117)
- `TEST_CREDENTIALS.md` (this file)
- `DEPLOYMENT_CHECKLIST.md`

### 4. Manual Testing
- Developer local testing
- QA manual verification
- Deployment validation

---

## ⚠️ CRITICAL RULES

### ✅ DO
- Use these exact credentials for all testing
- Run seed script if credentials are wrong
- Update this file if credentials ever need to change (with team approval)
- Keep passwords in seed file for consistency

### ❌ DON'T
- Change these credentials without team discussion
- Use different test credentials
- Hardcode different credentials in tests
- Delete test accounts from database
- Change passwords in database manually

---

## Troubleshooting

### Issue: "Invalid email or password"

**Solution:**
```bash
# Re-seed test accounts
tsx server/db/seeds/test-accounts.ts
```

### Issue: "User not found"

**Check:**
1. Is database running?
   ```bash
   psql $DATABASE_URL -c "SELECT email, role FROM users WHERE email LIKE '%test%' OR email LIKE '%admin@fitmeal%';"
   ```

2. Does user exist?
   ```bash
   # Re-seed if not found
   tsx server/db/seeds/test-accounts.ts
   ```

### Issue: "Account credentials changed"

**Fix:**
```bash
# Always re-seed to restore official credentials
tsx server/db/seeds/test-accounts.ts
```

The seed script will:
- Update existing accounts to correct passwords
- Create missing accounts
- Display all credentials at completion

---

## Production vs Development

### Development/Staging
- ✅ Use these test accounts
- ✅ Test accounts are auto-created
- ✅ Passwords match this document

### Production
- ⚠️ Test accounts may exist but with different passwords
- ⚠️ Do NOT use for real customer data
- ⚠️ Verify test accounts are disabled or removed in production

---

## Password Security Notes

**Why are passwords in source control?**
- These are TEST accounts only
- Not used in production
- Required for automated testing
- No sensitive data associated with them

**Database storage:**
- Passwords are bcrypt hashed (10 rounds)
- Never stored in plain text
- Seed script hashes before storing

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│        FITNESSMEALPLANNER TEST ACCOUNTS         │
├─────────────────────────────────────────────────┤
│ ADMIN                                           │
│ admin@fitmeal.pro / AdminPass123                │
├─────────────────────────────────────────────────┤
│ TRAINER                                         │
│ trainer.test@evofitmeals.com / TestTrainer123!  │
├─────────────────────────────────────────────────┤
│ CUSTOMER                                        │
│ customer.test@evofitmeals.com / TestCustomer123!│
└─────────────────────────────────────────────────┘
```

**Reset Command:**
```bash
tsx server/db/seeds/test-accounts.ts
```

---

**Document Version:** 1.0
**Last Verified:** October 6, 2025
**Status:** CANONICAL REFERENCE - DO NOT MODIFY WITHOUT TEAM APPROVAL

**If credentials have changed, run: `tsx server/db/seeds/test-accounts.ts`**
