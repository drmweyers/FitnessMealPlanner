# Test Accounts Relationship Fix

## Problem

The role interaction unit tests were passing, but the test accounts were not properly connected in the actual database. Specifically:

- ✅ **Admin account existed**: `admin@fitmeal.pro`
- ✅ **Trainer account existed**: `trainer.test@evofitmeals.com`
- ✅ **Customer account existed**: `customer.test@evofitmeals.com`
- ❌ **No relationship** between trainer and customer

This meant that when logging in as the trainer, the customer would not appear in the "Customers" tab.

## Root Cause

The trainer-customer relationship is established through the `customer_invitations` table. A trainer can only see customers who have either:

1. **Accepted an invitation** from that trainer (tracked in `customer_invitations` table with `used_at` timestamp), OR
2. Been assigned a **meal plan** by that trainer (tracked in `personalized_meal_plans` table)

The test accounts seeding script creates the user accounts, but does not establish these relationships.

## Solution

Created an automated setup script that:

1. Creates the `customer_invitations` table (if missing)
2. Establishes a trainer-customer relationship via accepted invitation
3. Verifies the relationship was created successfully

## Usage

### Quick Setup (Recommended)

```bash
npm run setup:test-relationships
```

This will:
- ✅ Create necessary tables if missing
- ✅ Link trainer.test@evofitmeals.com → customer.test@evofitmeals.com
- ✅ Verify the relationship

### Manual Setup

If you prefer to run the SQL directly:

```bash
bash scripts/setup-test-relationships.sh
```

Or execute the SQL file:

```bash
docker exec fitnessmealplanner-postgres psql -U postgres -d fitmeal -f /path/to/setup-test-relationships.sql
```

## Verification

After running the setup script, verify the relationship:

### 1. Via Database Query

```bash
docker exec fitnessmealplanner-postgres psql -U postgres -d fitmeal -c "
SELECT
  u_trainer.email AS trainer_email,
  ci.customer_email,
  ci.used_at AS invitation_accepted_at
FROM customer_invitations ci
JOIN users u_trainer ON u_trainer.id = ci.trainer_id
WHERE u_trainer.email = 'trainer.test@evofitmeals.com'
  AND ci.customer_email = 'customer.test@evofitmeals.com';
"
```

Expected output:
```
        trainer_email         |        customer_email         |    invitation_accepted_at
------------------------------+-------------------------------+---------------------------
 trainer.test@evofitmeals.com | customer.test@evofitmeals.com | 2025-10-13 XX:XX:XX.XXXXXX
```

### 2. Via Web Application

1. Start the development server: `docker-compose --profile dev up -d`
2. Navigate to: http://localhost:4000
3. Login as trainer:
   - Email: `trainer.test@evofitmeals.com`
   - Password: `TestTrainer123!`
4. Click on the **"Customers"** tab
5. ✅ You should see: `customer.test@evofitmeals.com`

### 3. Via Unit Tests

Run the role interaction unit tests:

```bash
npm run test -- test/unit/services/roleInteractions.test.ts
```

Expected: **30 tests passing** ✅

## Files Created

1. **`scripts/setup-test-relationships.sh`** - Main setup script
2. **`scripts/setup-test-relationships.sql`** - SQL version (alternative)
3. **`package.json`** - Added `setup:test-relationships` npm script
4. **`TEST_ACCOUNTS_RELATIONSHIP_FIX.md`** - This documentation

## When to Run This Script

Run `npm run setup:test-relationships` after:

1. ✅ Fresh database setup
2. ✅ Running `npm run seed:test-accounts`
3. ✅ Resetting test accounts with `npm run reset:test-accounts`
4. ✅ Database migrations that drop/recreate tables

## Test Account Credentials

### Admin
- **Email**: `admin@fitmeal.pro`
- **Password**: `AdminPass123`

### Trainer
- **Email**: `trainer.test@evofitmeals.com`
- **Password**: `TestTrainer123!`

### Customer
- **Email**: `customer.test@evofitmeals.com`
- **Password**: `TestCustomer123!`

## Technical Details

### Database Schema

The `customer_invitations` table structure:

```sql
CREATE TABLE customer_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_email varchar(255) NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  used_at timestamp,  -- NULL = not yet accepted, timestamp = accepted
  created_at timestamp DEFAULT now()
);
```

### How Trainer-Customer Relationships Work

From `server/routes/trainerRoutes.ts:117-240`:

```typescript
// Get all customers assigned to this trainer
trainerRouter.get('/customers', async (req, res) => {
  // 1. Get customers who have accepted invitations
  const invitedCustomers = await db.select()
    .from(customerInvitations)
    .where(
      and(
        eq(customerInvitations.trainerId, trainerId),
        sql`${customerInvitations.usedAt} IS NOT NULL`  // Accepted invitations only
      )
    );

  // 2. Get customers from meal plan assignments
  const customersWithMealPlans = await db.select()
    .from(personalizedMealPlans)
    .where(eq(personalizedMealPlans.trainerId, trainerId));

  // 3. Combine and deduplicate
  // ...
});
```

## Troubleshooting

### Issue: "Test accounts not found"

**Cause**: Test accounts haven't been seeded yet.

**Solution**:
```bash
npm run seed:test-accounts
npm run setup:test-relationships
```

### Issue: "Duplicate key violation"

**Cause**: Relationship already exists (this is safe to ignore).

**Solution**: The script uses `ON CONFLICT DO NOTHING`, so this shouldn't happen. If it does, the relationship is already set up correctly.

### Issue: Customer still not visible in Trainer UI

**Possible causes**:

1. **Database not updated**: Verify relationship exists via SQL query (see Verification section)
2. **Cache issue**: Clear browser cache and reload
3. **Wrong database**: Ensure you're using the `fitmeal` database, not `fitnessmealplanner`
4. **Frontend not refreshed**: Hard refresh the page (Ctrl+F5)

## Related Documentation

- **Test Credentials**: `OFFICIAL_TEST_CREDENTIALS.md`
- **Seed Scripts**: `server/db/seeds/test-accounts.ts`
- **Trainer Routes**: `server/routes/trainerRoutes.ts`
- **Database Schema**: `shared/schema.ts`

## Future Improvements

Consider adding to the main seed script:

```typescript
// In server/db/seeds/test-accounts.ts
async function seedTestRelationships() {
  // Create trainer-customer relationship automatically
  await db.insert(customerInvitations).values({
    trainerId: trainerUser.id,
    customerEmail: 'customer.test@evofitmeals.com',
    token: `test-invitation-${Date.now()}`,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    usedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  });
}
```

---

**Issue Fixed**: October 14, 2025
**Affected Tests**: Role Interaction Unit Test Suite (30 tests)
**Status**: ✅ **RESOLVED**
