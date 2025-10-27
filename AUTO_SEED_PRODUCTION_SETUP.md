# 🌱 Auto-Seed Production Test Accounts

**Status:** ✅ ENABLED - Runs automatically on every production deployment

---

## How It Works

Every time the production app deploys to DigitalOcean, it **automatically** creates/updates the three official test accounts:

1. **Admin:** `admin@fitmeal.pro` / `AdminPass123`
2. **Trainer:** `trainer.test@evofitmeals.com` / `TestTrainer123!`
3. **Customer:** `customer.test@evofitmeals.com` / `TestCustomer123!`

---

## Deployment Flow

```
1. Docker build starts
2. App builds successfully
3. Container starts
4. ⚡ Migrations run (drizzle-kit push)
5. 🌱 Auto-seed runs (npm run seed:production)  ← TEST ACCOUNTS CREATED HERE
6. 🎉 App starts
```

---

## Files Involved

### 1. Auto-Seed Script
**File:** `server/db/seeds/auto-seed-production.ts`
- Creates/updates test accounts using idempotent SQL
- Uses pre-computed bcrypt hashes
- Safe to run multiple times (ON CONFLICT)
- Non-fatal (app continues even if seeding fails)

### 2. Package Script
**File:** `package.json`
```json
"seed:production": "tsx server/db/seeds/auto-seed-production.ts"
```

### 3. Dockerfile Integration
**File:** `Dockerfile` (lines 206-207)
```bash
echo 'echo "🌱 Auto-seeding test accounts..."' >> start.sh
echo 'npm run seed:production || echo "⚠️ Test account seeding failed (non-fatal)"' >> start.sh
```

---

## Verification

After deployment, check the deployment logs:

```
⚡ Running migrations with drizzle.config.ts...
✅ Migrations completed

🌱 Auto-seeding test accounts...
✅ Production test accounts auto-seeded successfully!
📋 Accounts:
   admin      admin@fitmeal.pro                  Test Admin
   customer   customer.test@evofitmeals.com       Test Customer
   trainer    trainer.test@evofitmeals.com        Test Trainer

🔐 Test Credentials:
   Admin:    admin@fitmeal.pro / AdminPass123
   Trainer:  trainer.test@evofitmeals.com / TestTrainer123!
   Customer: customer.test@evofitmeals.com / TestCustomer123!

🎉 Starting application...
```

---

## Manual Testing

Test accounts should work immediately at: https://evofitmeals.com

If they don't work after deployment:
1. Check deployment logs for auto-seed output
2. Manually run: `npm run seed:production` (requires DATABASE_URL)
3. Check for database connection issues

---

## Local Development

Test accounts are also available locally:
- Run: `npm run seed:production`
- Or use: `npm run reset:test-accounts`

---

## Safety Features

✅ **Idempotent:** Safe to run multiple times
✅ **Non-destructive:** Only creates/updates 3 specific accounts
✅ **Non-fatal:** App starts even if seeding fails
✅ **No user data affected:** Only test accounts modified
✅ **Pre-computed hashes:** Consistent passwords across deployments

---

## Disabling Auto-Seed (If Needed)

To disable auto-seeding in production:

1. **Edit Dockerfile** (remove lines 206-207):
   ```bash
   # echo 'echo "🌱 Auto-seeding test accounts..."' >> start.sh
   # echo 'npm run seed:production || echo "⚠️ Test account seeding failed (non-fatal)"' >> start.sh
   ```

2. **Rebuild and deploy**

---

## Troubleshooting

### Issue: Test accounts not appearing after deployment

**Check:**
1. Deployment logs show auto-seed step
2. DATABASE_URL is set correctly
3. Database is accessible from production

**Solution:**
Run manually via DigitalOcean console:
```bash
doctl apps console YOUR_APP_ID web
npm run seed:production
```

### Issue: "Test account seeding failed (non-fatal)"

**This is expected if:**
- DATABASE_URL not set (dev environment)
- Database connection issues
- Schema not yet migrated

**App will still start normally.**

---

**Created:** October 27, 2025
**Last Updated:** October 27, 2025
**Status:** ✅ Production Ready
