# Environment Variable Testing & Validation Guide

**Last Updated:** October 6, 2025
**Status:** ✅ All Credentials Valid

---

## Executive Summary

This guide documents the comprehensive environment variable testing framework that ensures all credentials are:
- **Present** - Required variables exist
- **Valid** - Correct format and not placeholders
- **Working** - Credentials not expired and functional

---

## Quick Start

### Run All Environment Checks
```bash
# Comprehensive verification (recommended)
npm run verify:env

# Fast format-only checks
npm run test:env

# Full credential expiration tests
npm run test:credentials
```

### When to Run These Tests

**Daily/Before Work:**
- ✅ `npm run test:env` (10 seconds) - Quick validation

**Weekly:**
- ✅ `npm run verify:env` (30 seconds) - Full credential check

**Before Deployment:**
- ✅ `npm run verify:env` - Ensure credentials work

**After Restoring from Backup:**
- ✅ `npm run verify:env` - Verify restore succeeded

**When Debugging Credential Issues:**
- ✅ `npm run verify:env` - Identify which credential is broken

---

## Test Framework Components

### 1. Environment Validation Tests
**File:** `test/infrastructure/environment-validation.test.ts`

**Purpose:** Fast format and existence checks

**What It Tests:**
- ✅ All required environment variables exist
- ✅ Variables have correct format (e.g., OPENAI_API_KEY starts with "sk-")
- ✅ No MinIO test credentials in production
- ✅ Secrets have sufficient length for security
- ✅ No placeholder values (e.g., "your-key-here")
- ✅ AWS_ENDPOINT is configured for DigitalOcean Spaces

**Run:** `npm run test:env`

**Time:** ~10 seconds

### 2. Credentials Expiration Tests
**File:** `test/infrastructure/credentials-expiration.test.ts`

**Purpose:** Verify credentials actually work and aren't expired

**What It Tests:**
- ✅ OpenAI API key is valid (makes test API call)
- ✅ OpenAI API key not expired or rate limited
- ✅ S3/DigitalOcean Spaces credentials are valid
- ✅ S3 bucket is accessible
- ✅ Database connection works
- ✅ Database schema is correct
- ✅ Security checks (no test credentials)

**Run:** `npm run test:credentials`

**Time:** ~30 seconds

### 3. Comprehensive Verification Script
**File:** `scripts/verify-env-credentials.js`

**Purpose:** Beautiful, comprehensive environment validation with detailed reporting

**Features:**
- 🎨 Color-coded output (✅ green, ❌ red, ⚠️ yellow)
- 📊 Detailed summary report
- 🔍 Specific error messages with fix suggestions
- 📋 Security warnings
- 💡 Recommendations for best practices

**Run:** `npm run verify:env`

**Time:** ~30 seconds

**Sample Output:**
```
╔════════════════════════════════════════════════════════════╗
║  Environment Credentials Verification Script              ║
║  Last Updated: October 6, 2025                            ║
╚════════════════════════════════════════════════════════════╝

============================================================
1. Environment Variables - Existence & Format
============================================================
✅ DATABASE_URL is valid
✅ OPENAI_API_KEY is valid
✅ JWT_SECRET is valid
✅ SESSION_SECRET is valid
✅ AWS_ACCESS_KEY_ID is valid
✅ AWS_SECRET_ACCESS_KEY is valid
✅ AWS_ENDPOINT is valid
✅ S3_BUCKET_NAME is valid
✅ AWS_REGION is valid

============================================================
2. OpenAI API Key - Validity & Expiration
============================================================
ℹ️  Testing OpenAI API connection...
✅ OpenAI API key is VALID and NOT EXPIRED
ℹ️     Model used: gpt-4o-mini-2024-07-18
ℹ️     Response ID: chatcmpl-ABC123...

============================================================
3. S3/DigitalOcean Spaces - Credentials Validity
============================================================
ℹ️  Testing S3/DigitalOcean Spaces connection...
✅ S3 credentials are VALID (found 6 buckets)
✅ Target bucket "pti" is accessible

============================================================
Summary Report
============================================================

Total Tests Run: 16
✅ Passed: 16
❌ Failed: 0
⚠️  Warnings: 0

🎉 ALL CHECKS PASSED! Environment is properly configured.
```

---

## Environment Variables Tested

### Critical Variables (Required)

#### Database
- **DATABASE_URL** - PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - Tested: Connection works, schema exists

#### OpenAI
- **OPENAI_API_KEY** - OpenAI API key for recipe generation
  - Format: `sk-...` (starts with "sk-")
  - Tested: Valid, not expired, can make API calls
  - Rotation: Every 90 days recommended

#### S3/DigitalOcean Spaces
- **AWS_ACCESS_KEY_ID** - DigitalOcean Spaces access key
  - Format: 20-character alphanumeric
  - NOT: "minioadmin" (MinIO test credential)
  - Tested: Valid, can access buckets

- **AWS_SECRET_ACCESS_KEY** - DigitalOcean Spaces secret key
  - Format: 40-character alphanumeric
  - NOT: "minioadmin" (MinIO test credential)
  - Tested: Valid, signatures match

- **AWS_ENDPOINT** - DigitalOcean Spaces endpoint (CRITICAL)
  - Format: `https://tor1.digitaloceanspaces.com`
  - REQUIRED: Without this, SDK connects to AWS instead of DigitalOcean
  - Tested: Endpoint is DigitalOcean Spaces

- **S3_BUCKET_NAME** - Target bucket name
  - Value: "pti"
  - Tested: Bucket exists and is accessible

- **AWS_REGION** - Region for DigitalOcean Spaces
  - Value: "tor1"

#### Security
- **JWT_SECRET** - JWT token signing secret
  - Minimum: 32 characters
  - Tested: Sufficient length

- **SESSION_SECRET** - Session encryption secret
  - Minimum: 20 characters
  - Tested: Not a placeholder value

### Optional Variables

#### Redis (Caching)
- REDIS_URL
- REDIS_HOST
- REDIS_PORT
- REDIS_PASSWORD
- REDIS_DB

#### Feature Flags
- CACHE_ENABLED
- RATE_LIMIT_ENABLED
- CACHE_MIDDLEWARE_ENABLED
- REDIS_SESSION_STORE_ENABLED

---

## Test Results Interpretation

### ✅ All Tests Passed
```
🎉 ALL CHECKS PASSED! Environment is properly configured.

Recommendations:
  • Run this check weekly to catch expiration early
  • Rotate OpenAI API keys every 90 days
  • Rotate S3 credentials every 180 days
  • Keep .env.BACKUP file updated
```
**Action:** None required. Environment is healthy.

### ⚠️ Tests Passed with Warnings
```
⚠️ CHECKS PASSED with warnings. Review warnings above.
```
**Action:** Review warnings. System will work but some non-critical issues exist.

**Common Warnings:**
- Missing non-critical table (e.g., meal_plans)
- Optional features not configured
- Rotation recommendations

### ❌ Tests Failed
```
❌ CHECKS FAILED! Fix the errors above before deploying.

Quick Fix Guide:
  1. Check .env.BACKUP for correct credentials
  2. Review BMAD_SESSION_OCTOBER_6_2025_RECIPE_GENERATION_FIX.md
  3. Run: node test-s3-connection.js (for S3 issues)
  4. Run: node test-openai-direct.js (for OpenAI issues)
```

**Action:** Fix errors immediately. System will not work properly.

---

## Common Errors & Solutions

### Error: OpenAI API key is INVALID or EXPIRED
```
❌ OpenAI API key is INVALID or EXPIRED
   Action required: Update OPENAI_API_KEY in .env
```

**Solution:**
1. Generate new API key at https://platform.openai.com/api-keys
2. Update OPENAI_API_KEY in .env
3. Restart server
4. Run `npm run verify:env` to confirm

### Error: S3 Access Key ID is INVALID
```
❌ S3 Access Key ID is INVALID
   Check AWS_ACCESS_KEY_ID in .env
```

**Solution:**
1. Check .env.BACKUP for correct credentials
2. Copy DigitalOcean Spaces credentials from dev-env-variables.txt
3. Ensure NOT using "minioadmin" (MinIO test credential)
4. Run `npm run verify:env` to confirm

### Error: AWS_ENDPOINT is missing
```
❌ AWS_ENDPOINT is missing (CRITICAL for DigitalOcean Spaces)
   Without AWS_ENDPOINT, SDK will try to connect to AWS S3
```

**Solution:**
1. Add to .env: `AWS_ENDPOINT="https://tor1.digitaloceanspaces.com"`
2. This variable is CRITICAL for DigitalOcean Spaces
3. Run `npm run verify:env` to confirm

### Error: Database connection failed
```
❌ Database connection failed: connection refused
   Check DATABASE_URL in .env
```

**Solution:**
1. Ensure PostgreSQL is running: `npm run db:status`
2. If not running: `npm run db:start`
3. Verify DATABASE_URL format is correct
4. Run `npm run verify:env` to confirm

---

## Credential Rotation Best Practices

### OpenAI API Key
- **Rotation Frequency:** Every 90 days
- **Why:** Security best practice for API keys
- **How:**
  1. Generate new key at OpenAI dashboard
  2. Test new key: Update .env, run `npm run verify:env`
  3. Deploy new key to production
  4. Delete old key after 7 days

### DigitalOcean Spaces Credentials
- **Rotation Frequency:** Every 180 days
- **Why:** Security best practice for access keys
- **How:**
  1. Generate new key at DigitalOcean Spaces dashboard
  2. Update .env with new credentials
  3. Test: `npm run verify:env`
  4. Update .env.BACKUP
  5. Delete old key after 7 days

### JWT_SECRET
- **Rotation Frequency:** Only if compromised
- **Why:** Rotating invalidates all user sessions
- **How:**
  1. Generate new 32+ character secret
  2. Update .env
  3. Deploy during low-traffic period
  4. Inform users they need to log in again

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Environment Validation

on:
  push:
    branches: [main, staging]
  schedule:
    - cron: '0 0 * * 1' # Weekly on Monday

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run verify:env
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_ENDPOINT: ${{ secrets.AWS_ENDPOINT }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
```

### Pre-deployment Hook
```bash
#!/bin/bash
# deploy.sh

echo "🔍 Verifying environment credentials..."
npm run verify:env

if [ $? -ne 0 ]; then
  echo "❌ Environment validation failed! Aborting deployment."
  exit 1
fi

echo "✅ Environment validated. Proceeding with deployment..."
# ... deployment commands
```

---

## Monitoring & Alerts

### Weekly Cron Job
```cron
# Run every Monday at 9 AM
0 9 * * 1 cd /path/to/FitnessMealPlanner && npm run verify:env >> /var/log/env-checks.log 2>&1
```

### Email Alerts
Add to `scripts/verify-env-credentials.js`:
```javascript
// At the end of main()
if (failedTests > 0) {
  // Send email alert
  sendEmailAlert({
    subject: '❌ Environment Credentials Failed',
    body: `${failedTests} environment checks failed. Check logs.`
  });
}
```

---

## Troubleshooting

### Tests are slow
- **Cause:** Network latency to OpenAI or DigitalOcean
- **Solution:** Run `npm run test:env` for fast format-only checks

### Tests fail in CI but pass locally
- **Cause:** Different environment variables in CI
- **Solution:** Check GitHub Secrets match local .env

### "Invalid credentials" but keys look correct
- **Cause:** Trailing spaces, quotes, or encoding issues
- **Solution:**
  ```bash
  # Check for hidden characters
  cat .env | grep AWS_ACCESS_KEY_ID | od -c

  # Remove quotes if present
  AWS_ACCESS_KEY_ID=DO00Q343F2BG3ZGALNDE  # Correct
  AWS_ACCESS_KEY_ID="DO00Q343F2BG3ZGALNDE" # May cause issues
  ```

---

## Files Created in This Testing Framework

1. **test/infrastructure/environment-validation.test.ts**
   - Fast format and existence checks
   - No API calls, instant results

2. **test/infrastructure/credentials-expiration.test.ts**
   - Full credential validation with API calls
   - Tests expiration and functionality

3. **scripts/verify-env-credentials.js**
   - Comprehensive standalone verification script
   - Beautiful output with detailed reports

4. **ENV_TESTING_GUIDE.md** (This File)
   - Complete documentation
   - Usage guide and troubleshooting

---

## Summary

### Available Commands
```bash
npm run verify:env        # Comprehensive verification (recommended)
npm run test:env          # Fast format checks
npm run test:credentials  # Full expiration tests
```

### When to Run
- **Daily:** Quick format check before starting work
- **Weekly:** Full credential verification
- **Before Deploy:** Ensure credentials work
- **After Changes:** Verify updates didn't break anything

### What Gets Tested
- ✅ OpenAI API key (valid, not expired)
- ✅ S3/DigitalOcean Spaces (valid, accessible)
- ✅ Database (connection, schema)
- ✅ Security (no test credentials, sufficient lengths)
- ✅ Format (correct patterns, no placeholders)

### Exit Codes
- **0** - All checks passed (or passed with warnings)
- **1** - Checks failed (fix required)

---

## Related Documentation

- `.env.BACKUP` - Backup of S3 credentials
- `BMAD_SESSION_OCTOBER_6_2025_RECIPE_GENERATION_FIX.md` - S3 fix session
- `S3_CONFIGURATION_FIX.md` - S3 configuration guide
- `WHY_THIS_HAPPENED.md` - Why credentials got deleted
- `dev-env-variables.txt` - Original credential source

---

**Last Verification:** October 6, 2025
**Status:** ✅ 16/16 Tests Passed
**Next Check:** October 13, 2025 (recommended weekly)
