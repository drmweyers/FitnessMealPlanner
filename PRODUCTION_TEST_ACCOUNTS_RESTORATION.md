# Production Test Accounts Restoration Guide

**Issue:** Test accounts not active on production (https://evofitmeals.com)

**Solution:** Run the production seed script to restore the three official test accounts.

---

## 🔐 Official Test Credentials

These credentials are **PERMANENT** and should **NEVER** change:

### Admin Account
- **Email:** `admin@fitmeal.pro`
- **Password:** `AdminPass123`
- **Role:** admin

### Trainer Account
- **Email:** `trainer.test@evofitmeals.com`
- **Password:** `TestTrainer123!`
- **Role:** trainer

### Customer Account
- **Email:** `customer.test@evofitmeals.com`
- **Password:** `TestCustomer123!`
- **Role:** customer

---

## 🚀 Quick Restoration Methods

### Method 1: Via DigitalOcean Database Console (RECOMMENDED)

1. **Access DigitalOcean Database:**
   - Go to: https://cloud.digitalocean.com/databases
   - Find your PostgreSQL database cluster
   - Click "Console" tab

2. **Select Database:**
   ```sql
   \c fitmeal
   ```

3. **Run Seed Script:**
   - Copy the entire contents of `server/db/migrations/seed-test-accounts-production.sql`
   - Paste into the console
   - Press Enter to execute

4. **Verify:**
   - You should see output showing 3 accounts created/updated
   - Test by logging in at https://evofitmeals.com

### Method 2: Via API Endpoint (If Available)

If your production app has a seed endpoint:

```bash
# POST to seed endpoint (requires admin authentication)
curl -X POST https://evofitmeals.com/api/seed/test-accounts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Method 3: Via Database Connection String

If you have direct database access:

```bash
# Connect to production database
psql "postgresql://USERNAME:PASSWORD@HOST:PORT/fitmeal?sslmode=require"

# Run the seed script
\i server/db/migrations/seed-test-accounts-production.sql
```

---

## 📋 Migration Script Details

**File:** `server/db/migrations/seed-test-accounts-production.sql`

**What it does:**
- Creates/updates admin@fitmeal.pro account
- Creates/updates trainer.test@evofitmeals.com account
- Creates/updates customer.test@evofitmeals.com account
- Uses pre-computed bcrypt hashes (secure, consistent)
- **Idempotent:** Safe to run multiple times (uses `ON CONFLICT`)

**Safety:**
- ✅ Does NOT delete any existing data
- ✅ Only creates/updates the 3 specific test accounts
- ✅ Does NOT modify production user data
- ✅ Safe to run on production database

---

## ✅ Verification Steps

After running the migration:

1. **Check Database:**
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

   Expected output:
   ```
                email             |   role   |     name
   -------------------------------+----------+---------------
    admin@fitmeal.pro             | admin    | Test Admin
    customer.test@evofitmeals.com | customer | Test Customer
    trainer.test@evofitmeals.com  | trainer  | Test Trainer
   ```

2. **Test Logins:**
   - Navigate to https://evofitmeals.com
   - Try logging in with each account using credentials above
   - All three should successfully authenticate

---

## 🔄 Automated Script (Future Enhancement)

To automate this in the future, add to `package.json`:

```json
{
  "scripts": {
    "seed:production:test-accounts": "doctl databases db exec YOUR_DB_ID --command \"$(cat server/db/migrations/seed-test-accounts-production.sql)\""
  }
}
```

---

## 📞 Troubleshooting

### Issue: "relation 'users' does not exist"
**Solution:** Ensure you're connected to the correct database (`fitmeal`) and schema is up to date.

### Issue: "permission denied"
**Solution:** Ensure database user has INSERT and UPDATE permissions on `users` table.

### Issue: Accounts created but can't login
**Solution:**
1. Verify bcrypt hashes match exactly
2. Check password validation logic in auth code
3. Ensure no middleware is blocking test accounts

### Issue: Different UUIDs than expected
**Not a problem:** The script uses `ON CONFLICT (email)` so UUIDs may differ. Only email, password, role, and name matter.

---

## 📝 Deployment Checklist

- [ ] Local database verified with test accounts
- [ ] Production migration script created
- [ ] Migration committed to GitHub
- [ ] Pushed to main branch
- [ ] Production database accessed
- [ ] Migration script executed
- [ ] Test accounts verified in database
- [ ] Login tested for all 3 accounts
- [ ] Documented in session notes

---

**Created:** October 27, 2025
**Last Updated:** October 27, 2025
**Status:** Ready for production deployment
