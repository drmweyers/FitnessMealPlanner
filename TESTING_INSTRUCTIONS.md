# Auto-Seed System Testing Instructions

## Prerequisites

Before testing, ensure you have:
- Docker installed and running
- Node.js and npm installed
- Git repository cloned
- `.env` file configured

## Testing Scenarios

### Scenario 1: Complete Fresh Setup (Recommended First Test)

This tests the full Docker auto-seeding flow from scratch.

**Steps:**

1. **Clean Environment**
   ```bash
   # Stop any running containers
   npm run docker:dev:stop

   # Remove the postgres volume completely
   docker volume rm fitnessmealplanner_postgres_data

   # Verify volume is removed
   docker volume ls | grep fitnessmealplanner
   ```

2. **Start Docker with Auto-Seed**
   ```bash
   # This will create a fresh database and auto-seed
   npm run docker:dev
   ```

3. **Monitor the Logs**
   ```bash
   # In a new terminal, watch the logs
   npm run docker:dev:logs

   # Look for these messages:
   # - "Auto-Seeding Test Accounts"
   # - "PostgreSQL is ready!"
   # - "Test accounts seeded successfully!"
   ```

4. **Verify Accounts Exist**
   ```bash
   # Connect to the database
   docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal
   ```

   Then run this query:
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

   Expected output: 3 rows with admin, customer, and trainer roles

   Exit psql:
   ```
   \q
   ```

5. **Test Login with Each Account**
   ```bash
   # Start the application
   npm run dev
   ```

   Navigate to `http://localhost:4000` and test login with:
   - admin@fitmeal.pro / AdminPass123
   - trainer.test@evofitmeals.com / TestTrainer123!
   - customer.test@evofitmeals.com / TestCustomer123!

**Expected Result:** All accounts log in successfully with correct roles displayed.

---

### Scenario 2: Manual Seeding (Existing Database)

This tests manual seeding when Docker is already running.

**Steps:**

1. **Ensure Database is Running**
   ```bash
   npm run docker:dev
   ```

2. **Run Migrations (if needed)**
   ```bash
   npm run migrate
   ```

3. **Run Manual Seed**
   ```bash
   npm run seed:test
   ```

4. **Check Output**
   Expected output should include:
   ```
   ================================
   Test Accounts Seeded Successfully!
   ================================

   Available test accounts:
     Admin:    admin@fitmeal.pro / AdminPass123
     Trainer:  trainer.test@evofitmeals.com / TestTrainer123!
     Customer: customer.test@evofitmeals.com / TestCustomer123!
   ```

**Expected Result:** Script completes without errors and displays verification table.

---

### Scenario 3: Idempotency Test

This tests that the script can run multiple times safely.

**Steps:**

1. **Seed Once**
   ```bash
   npm run seed:test
   ```

2. **Note the Timestamps**
   Check the `updated_at` timestamp for one account:
   ```bash
   docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "SELECT email, updated_at FROM users WHERE email = 'admin@fitmeal.pro';"
   ```

3. **Seed Again (Immediately)**
   ```bash
   npm run seed:test
   ```

4. **Compare Timestamps**
   ```bash
   docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "SELECT email, updated_at FROM users WHERE email = 'admin@fitmeal.pro';"
   ```

5. **Verify No Duplicates**
   ```bash
   docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;"
   ```

**Expected Result:**
- Timestamps updated on second run
- No duplicate accounts
- No errors

---

### Scenario 4: Verification (No Database)

This tests the validation tool without needing a database.

**Steps:**

1. **Run Verification**
   ```bash
   npm run seed:verify
   ```

2. **Check Output**
   Should show 11 checks with all passing (✓):
   - Admin account insertion [REQUIRED]
   - Trainer account insertion [REQUIRED]
   - Customer account insertion [REQUIRED]
   - Idempotency (ON CONFLICT) [REQUIRED]
   - UUID generation [REQUIRED]
   - Bcrypt hashes [REQUIRED]
   - AdminPass123 hash [REQUIRED]
   - TestTrainer123! hash [REQUIRED]
   - TestCustomer123! hash [REQUIRED]
   - Table existence check [OPTIONAL]
   - Trainer-Customer relationship [OPTIONAL]

**Expected Result:** All required checks pass, script completes successfully.

---

### Scenario 5: Error Handling Test

This tests graceful error handling when database is not available.

**Steps:**

1. **Stop Database**
   ```bash
   npm run docker:dev:stop
   ```

2. **Try Manual Seed**
   ```bash
   npm run seed:test
   ```

3. **Check Error Message**
   Should display:
   ```
   ERROR: Failed to seed test accounts
   Could not connect to the database.
   Please ensure PostgreSQL is running and accessible.

   To start the database with Docker:
     npm run docker:dev
   ```

**Expected Result:** Clear error message with helpful instructions, no stack trace spam.

---

### Scenario 6: Container Restart Persistence

This tests that seeded data persists across container restarts.

**Steps:**

1. **Seed Accounts**
   ```bash
   npm run docker:dev
   npm run seed:test
   ```

2. **Verify Accounts Exist**
   ```bash
   docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "SELECT COUNT(*) FROM users WHERE email IN ('admin@fitmeal.pro', 'trainer.test@evofitmeals.com', 'customer.test@evofitmeals.com');"
   ```
   Should return: 3

3. **Restart Container**
   ```bash
   npm run docker:dev:restart
   ```

4. **Wait for Healthcheck**
   ```bash
   # Wait ~30 seconds for container to be healthy
   docker ps | grep fitnessmealplanner-postgres
   ```

5. **Verify Accounts Still Exist**
   ```bash
   docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "SELECT COUNT(*) FROM users WHERE email IN ('admin@fitmeal.pro', 'trainer.test@evofitmeals.com', 'customer.test@evofitmeals.com');"
   ```
   Should still return: 3

**Expected Result:** Data persists, no duplicate accounts created.

---

### Scenario 7: Relationship Data Verification

This tests that relationships are created correctly.

**Steps:**

1. **Seed Database**
   ```bash
   npm run seed:test
   ```

2. **Check Invitation**
   ```bash
   docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "SELECT * FROM customer_invitations WHERE customer_email = 'customer.test@evofitmeals.com';"
   ```

3. **Check Meal Plan**
   ```bash
   docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "SELECT id, trainer_id, is_template FROM trainer_meal_plans WHERE trainer_id = 'e4ae14a6-fa78-4146-be61-c8fa9a4472f5';"
   ```

4. **Check Assignment**
   ```bash
   docker exec -it fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "SELECT * FROM meal_plan_assignments WHERE customer_id = 'f32890cc-af72-40dc-b92e-beef32118ca0';"
   ```

**Expected Result:**
- Invitation exists and is marked as used
- Meal plan exists for trainer
- Assignment links trainer, customer, and meal plan

**Note:** If these tables don't exist yet, the script should complete without errors (it checks table existence first).

---

### Scenario 8: Integration with Tests

This tests using seeded accounts in your test suite.

**Steps:**

1. **Seed Database**
   ```bash
   npm run docker:dev
   npm run seed:test
   ```

2. **Run Test Suite**
   ```bash
   # Run a simple test that uses authentication
   npm run test:auth
   ```

3. **Verify Tests Pass**
   Tests should be able to:
   - Log in with test credentials
   - Access role-specific endpoints
   - Create/modify data as test users

**Expected Result:** Tests pass using seeded credentials.

---

## Troubleshooting Guide

### Problem: "Seed file not found"

**Solution:**
```bash
# Verify files exist
ls -la server/db/seeds/auto-seed.sql
ls -la docker-entrypoint-initdb.d/auto-seed.sql

# If missing, copy from source
cp server/db/seeds/auto-seed.sql docker-entrypoint-initdb.d/
```

### Problem: "Table does not exist"

**Solution:**
```bash
# Run migrations first
npm run migrate

# Then seed
npm run seed:test
```

### Problem: Docker auto-seed doesn't run

**Cause:** PostgreSQL only runs initdb scripts on first startup (empty volume)

**Solution:**
```bash
# Remove volume and start fresh
npm run docker:dev:stop
docker volume rm fitnessmealplanner_postgres_data
npm run docker:dev
```

### Problem: "Permission denied" on bash script

**Solution:**
```bash
chmod +x docker-entrypoint-initdb.d/01-seed-test-accounts.sh
```

### Problem: Accounts created but can't log in

**Possible Causes:**
1. Password hash mismatch
2. bcrypt version mismatch
3. Authentication logic error

**Solution:**
```bash
# Verify hashes in SQL file match expected values
npm run seed:verify

# Check that bcrypt cost is 10
grep "\$2b\$10\$" server/db/seeds/auto-seed.sql

# Re-seed with fresh data
npm run seed:test
```

---

## Success Checklist

After testing, verify:

- [ ] Verification passes: `npm run seed:verify`
- [ ] Manual seed works: `npm run seed:test`
- [ ] Docker auto-seeds on fresh start
- [ ] All 3 accounts exist in database
- [ ] All 3 accounts can log in
- [ ] Idempotency works (can run multiple times)
- [ ] Data persists across container restarts
- [ ] Error handling shows helpful messages
- [ ] Relationships are created (if tables exist)
- [ ] Tests can use seeded credentials

---

## Next Steps After Testing

1. **Update Test Suites**
   - Modify tests to use these credentials
   - Remove any hardcoded test account creation
   - Add seeding to test setup scripts

2. **CI/CD Integration**
   - Add seed verification to CI pipeline
   - Ensure Docker auto-seeds in CI environment
   - Add seed step to test workflows

3. **Documentation**
   - Update main README.md with seed instructions
   - Add to developer onboarding docs
   - Create quick reference for team

4. **Monitoring**
   - Monitor Docker logs for seed failures
   - Track seed execution in CI/CD
   - Alert on seed errors

---

## Quick Commands Reference

```bash
# Verify SQL (no database)
npm run seed:verify

# Manual seed (database required)
npm run seed:test

# Start Docker (auto-seeds if fresh)
npm run docker:dev

# Fresh start (removes all data)
npm run docker:dev:stop && \
docker volume rm fitnessmealplanner_postgres_data && \
npm run docker:dev

# Check logs
npm run docker:dev:logs

# Query accounts
docker exec -it fitnessmealplanner-postgres \
  psql -U postgres -d fitmeal -c \
  "SELECT email, role FROM users WHERE email LIKE '%@%fitmeal%' OR email LIKE '%@evofitmeals.com';"
```

---

## Support

For detailed documentation, see:
- **Testing Guide:** `AUTO_SEED_TESTING_GUIDE.md`
- **Implementation Details:** `AUTO_SEED_IMPLEMENTATION_SUMMARY.md`
- **Quick Reference:** `AUTO_SEED_QUICK_REFERENCE.md`
- **Seed README:** `server/db/seeds/README.md`

For issues or questions, check the troubleshooting sections in these guides.
