# Auto-Seeding System Testing Guide

This guide explains how to test the automatic test account seeding system.

## Quick Start

### 1. Verify the Seed Script (No Database Required)

```bash
npm run seed:verify
```

This checks that the SQL file is valid and contains all required components.

**Expected output:**
```
================================
SUCCESS: All required checks passed (11 total)
================================

The seed script is valid and ready to use!
```

### 2. Test Manual Seeding

**Start the database:**
```bash
npm run docker:dev
```

**Run migrations:**
```bash
npm run migrate
```

**Seed test accounts:**
```bash
npm run seed:test
```

**Expected output:**
```
================================
Test Accounts Seeded Successfully!
================================

Available test accounts:
  Admin:    admin@fitmeal.pro / AdminPass123
  Trainer:  trainer.test@evofitmeals.com / TestTrainer123!
  Customer: customer.test@evofitmeals.com / TestCustomer123!
```

### 3. Test Docker Auto-Seeding

**Clean slate test (removes all data):**
```bash
# Stop and remove containers and volumes
npm run docker:dev:stop
docker volume rm fitnessmealplanner_postgres_data

# Start fresh - this will auto-seed
npm run docker:dev
```

**Check the logs:**
```bash
npm run docker:dev:logs
```

Look for output like:
```
Auto-Seeding Test Accounts
PostgreSQL is ready!
Running auto-seed script...
Test accounts seeded successfully!
```

### 4. Verify Accounts Exist

**Connect to the database:**
```bash
docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal
```

**Query the accounts:**
```sql
SELECT email, role, name, created_at
FROM users
WHERE email IN (
  'admin@fitmeal.pro',
  'trainer.test@evofitmeals.com',
  'customer.test@evofitmeals.com'
)
ORDER BY role;
```

**Exit psql:**
```
\q
```

## Test Cases

### Test 1: Fresh Database (Auto-Seed)

**Objective:** Verify automatic seeding on first Docker startup

**Steps:**
1. Stop all containers: `npm run docker:dev:stop`
2. Remove postgres volume: `docker volume rm fitnessmealplanner_postgres_data`
3. Start containers: `npm run docker:dev`
4. Wait for healthcheck to pass (30 seconds)
5. Check logs: `npm run docker:dev:logs`
6. Verify accounts exist (see "Verify Accounts Exist" above)

**Expected Result:**
- All 3 accounts created
- Logs show "Test accounts seeded successfully!"
- Accounts can be queried from database

### Test 2: Existing Database (Idempotency)

**Objective:** Verify script can run multiple times without errors

**Steps:**
1. Ensure database is running with test accounts
2. Run manual seed: `npm run seed:test`
3. Verify no errors
4. Check accounts still exist and haven't been duplicated

**Expected Result:**
- No errors
- Accounts updated (updated_at timestamp changed)
- No duplicate accounts
- Passwords still work

### Test 3: Manual Seeding

**Objective:** Verify manual seeding works independently

**Steps:**
1. Start database: `npm run docker:dev`
2. Run migrations: `npm run migrate`
3. Run seed: `npm run seed:test`
4. Verify output shows success

**Expected Result:**
- Script completes successfully
- Verification table displays 3 accounts
- All accounts have correct roles

### Test 4: Script Verification

**Objective:** Verify SQL syntax without database

**Steps:**
1. Run verification: `npm run seed:verify`
2. Check all checks pass

**Expected Result:**
- All 9 required checks pass (✓)
- Optional checks may pass (✓) or skip (○)
- No failures (✗)

### Test 5: Login Test

**Objective:** Verify accounts can be used for authentication

**Steps:**
1. Start the application: `npm run dev`
2. Navigate to login page
3. Try logging in with each account:
   - admin@fitmeal.pro / AdminPass123
   - trainer.test@evofitmeals.com / TestTrainer123!
   - customer.test@evofitmeals.com / TestCustomer123!

**Expected Result:**
- All accounts can log in successfully
- Correct role displayed after login
- No authentication errors

### Test 6: Relationship Data

**Objective:** Verify trainer-customer relationships are created

**Steps:**
1. Seed database: `npm run seed:test`
2. Query relationships:
```sql
-- Check invitation
SELECT * FROM customer_invitations
WHERE customer_email = 'customer.test@evofitmeals.com';

-- Check meal plan
SELECT * FROM trainer_meal_plans
WHERE trainer_id = 'e4ae14a6-fa78-4146-be61-c8fa9a4472f5';

-- Check assignment
SELECT * FROM meal_plan_assignments
WHERE customer_id = 'f32890cc-af72-40dc-b92e-beef32118ca0';
```

**Expected Result:**
- Customer invitation exists and is marked as used
- Sample meal plan exists for trainer
- Meal plan assignment links trainer, customer, and plan

### Test 7: Database Connection Failure

**Objective:** Verify graceful error handling

**Steps:**
1. Stop database: `npm run docker:dev:stop`
2. Run manual seed: `npm run seed:test`

**Expected Result:**
- Clear error message about connection failure
- Suggestion to start Docker
- No stack trace spam

### Test 8: Container Restart

**Objective:** Verify seeding persists after restart

**Steps:**
1. Start containers: `npm run docker:dev`
2. Verify accounts exist
3. Restart containers: `npm run docker:dev:restart`
4. Verify accounts still exist

**Expected Result:**
- Accounts persist across restarts
- No duplicate accounts created

## Troubleshooting

### Issue: "Auto-seed script not found"

**Symptoms:**
- Docker logs show "WARNING: Seed file not found"
- No accounts created automatically

**Solution:**
```bash
# Ensure files exist
ls docker-entrypoint-initdb.d/

# Should show:
# 01-seed-test-accounts.sh
# auto-seed.sql

# If missing, copy from source:
cp server/db/seeds/auto-seed.sql docker-entrypoint-initdb.d/
```

### Issue: "Script not executable"

**Symptoms:**
- Docker logs show permission errors

**Solution:**
```bash
chmod +x docker-entrypoint-initdb.d/01-seed-test-accounts.sh
```

### Issue: "Table does not exist"

**Symptoms:**
- Seed script fails with "relation does not exist"

**Solution:**
```bash
# Run migrations first
npm run migrate

# Then seed
npm run seed:test
```

### Issue: Accounts not auto-seeding

**Symptoms:**
- Docker starts but no accounts created
- No seed logs in container output

**Cause:** PostgreSQL only runs initdb scripts on first startup (empty volume)

**Solution:**
```bash
# Remove volume and start fresh
npm run docker:dev:stop
docker volume rm fitnessmealplanner_postgres_data
npm run docker:dev
```

### Issue: "Duplicate key violation"

**Symptoms:**
- Error about unique constraint violation

**Cause:** The ON CONFLICT clause should handle this, so this indicates a bug

**Solution:**
```bash
# Verify the SQL file has ON CONFLICT clauses
npm run seed:verify

# Check the auto-seed.sql file for:
# "ON CONFLICT (email) DO UPDATE SET"
```

## CI/CD Integration

The auto-seeding system is designed to work in CI/CD pipelines:

### GitHub Actions Example:

```yaml
- name: Start Database
  run: docker-compose --profile dev up -d postgres

- name: Wait for Database
  run: |
    timeout 60 bash -c 'until docker exec fitnessmealplanner-postgres pg_isready -U postgres; do sleep 1; done'

- name: Verify Test Accounts
  run: |
    docker exec fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "
      SELECT COUNT(*) FROM users
      WHERE email IN (
        'admin@fitmeal.pro',
        'trainer.test@evofitmeals.com',
        'customer.test@evofitmeals.com'
      );
    "
```

### Manual Seeding in CI:

If auto-seeding doesn't work in CI, use manual seeding:

```yaml
- name: Seed Test Accounts
  run: npm run seed:test
```

## Performance Notes

- **Seed Time:** < 1 second for all 3 accounts
- **Database Impact:** Minimal (3 INSERT statements)
- **Idempotency:** Safe to run multiple times
- **Startup Delay:** Adds ~1-2 seconds to Docker startup

## Security Checklist

- [ ] Never use these credentials in production
- [ ] Ensure .env file is not committed
- [ ] Verify test accounts are only created in dev/test databases
- [ ] Check that seed scripts are not included in production builds
- [ ] Confirm Docker volumes are not shared between environments

## Success Criteria

All tests should pass with:
- ✓ Script verification passes
- ✓ Manual seeding works
- ✓ Docker auto-seeding works
- ✓ Accounts can log in
- ✓ Relationships are created
- ✓ Idempotency is maintained
- ✓ Error handling works gracefully

## Next Steps

After confirming the seeding system works:

1. Update test suites to rely on these accounts
2. Document the credentials in test files
3. Add seeding to CI/CD pipeline
4. Create cleanup scripts if needed
5. Monitor for any seed failures in logs
