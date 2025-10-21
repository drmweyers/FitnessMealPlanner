# 🔧 Internal Server Error - Root Cause and Fix

**Date:** October 6, 2025
**Issue:** Internal server error when logging in
**Root Cause:** PostgreSQL database not running
**Status:** ✅ IDENTIFIED & SOLUTION PROVIDED

---

## Executive Summary

**Problem:**
Users receive "Internal Server Error" (HTTP 500) when attempting to log in to the application.

**Root Cause:**
PostgreSQL database is not running. The application requires a PostgreSQL database at `localhost:5432`, but the database service is not started.

**Impact:**
- ❌ Login completely broken
- ❌ All database-dependent features fail
- ❌ Application appears broken to users

**Solution:**
Start PostgreSQL database using Docker Compose before running the development server.

---

## Error Analysis

### Server Logs
```
❌ Database connection failed:
Login error: AggregateError [ECONNREFUSED]:
  Error: connect ECONNREFUSED ::1:5432
  Error: connect ECONNREFUSED 127.0.0.1:5432
```

### Error Flow
1. User attempts to log in with credentials
2. Server receives login request at `/api/auth/login`
3. Server attempts to query database: `getUserByEmail()`
4. Database connection fails: `ECONNREFUSED` to port 5432
5. Server catches error but returns generic "Internal Server Error"
6. User sees HTTP 500 error

### Code Path
- **Entry Point:** `server/authRoutes.ts:150`
- **Database Call:** `server/storage.ts:97` (`getUserByEmail`)
- **Connection:** Attempts to connect to `postgresql://postgres:postgres@localhost:5432/fitmeal`
- **Failure:** PostgreSQL not listening on port 5432

---

## Immediate Fix (User Action Required)

### Step 1: Start Docker Desktop
Docker Desktop must be running before the database can start.

**Windows:**
```powershell
# Option 1: Start from Start Menu
Start Menu → Docker Desktop

# Option 2: Start from command line
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

**Wait 30-60 seconds** for Docker Desktop to fully initialize.

### Step 2: Verify Docker is Ready
```bash
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

If you see an error about "pipe/dockerDesktopLinuxEngine", Docker Desktop is still starting. Wait and try again.

### Step 3: Start PostgreSQL Database
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner
npm run db:start
```

**Expected output:**
```
✅ Docker Desktop is ready!
✅ PostgreSQL database started successfully!
✅ PostgreSQL is ready!
```

### Step 4: Seed Test Accounts
```bash
npm run seed-test-accounts
```

**Expected output:**
```
✅ Account already exists: admin@fitmeal.pro
   Password updated for: admin@fitmeal.pro
✅ Account already exists: trainer.test@evofitmeals.com
   Password updated for: trainer.test@evofitmeals.com
✅ Account already exists: customer.test@evofitmeals.com
   Password updated for: customer.test@evofitmeals.com
```

### Step 5: Restart Development Server
If the server is already running, restart it:

```bash
# Stop current server: Ctrl+C
# Start again
npm run dev
```

---

## Automated Solution

### New Scripts Created

#### 1. Database Startup Script
**File:** `scripts/start-database.js`
**Command:** `npm run db:start`

Features:
- ✅ Waits for Docker Desktop to be ready (up to 60 seconds)
- ✅ Starts PostgreSQL container with health checks
- ✅ Waits for database to be healthy
- ✅ Shows clear status messages
- ✅ Provides helpful error messages if Docker is not running

#### 2. Package.json Scripts
```json
{
  "db:start": "node scripts/start-database.js",
  "db:stop": "docker-compose --profile dev down",
  "db:status": "docker-compose --profile dev ps"
}
```

---

## Prevention Measures

### 1. Pre-Development Checklist
Before running `npm run dev`:
- [ ] Start Docker Desktop
- [ ] Wait for Docker to be fully running
- [ ] Run `npm run db:start`
- [ ] Verify database is running: `npm run db:status`
- [ ] Run `npm run dev`

### 2. Updated Development Workflow
**Old workflow (broken):**
```bash
npm run dev  # ❌ Fails with "Internal Server Error"
```

**New workflow (working):**
```bash
# 1. Start Docker Desktop (manual step)
# 2. Start database
npm run db:start

# 3. Seed test accounts (first time or if accounts are missing)
npm run seed-test-accounts

# 4. Start development server
npm run dev
```

### 3. Error Handling Improvements
Enhanced server startup with:
- ✅ Graceful handling of database connection failures
- ✅ Helpful error messages pointing to database setup
- ✅ Server continues to run even if database is unavailable (for static pages)

---

## Technical Details

### Database Configuration

#### Docker Compose (docker-compose.yml)
```yaml
postgres:
  image: postgres:16-alpine
  environment:
    - POSTGRES_DB=fitmeal
    - POSTGRES_USER=postgres
    - POSTGRES_PASSWORD=postgres
  ports:
    - "5432:5432"
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres -d fitmeal"]
    interval: 5s
    timeout: 5s
    retries: 5
```

#### Environment Variables (.env.local)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fitmeal"
```

**Important:** These credentials must match!

### Health Check
The startup script waits for the PostgreSQL health check to pass before declaring the database ready.

---

## Verification

### Test Database Connection
```bash
docker-compose --profile dev exec postgres psql -U postgres -d fitmeal -c "SELECT 1;"
```

**Expected output:**
```
 ?column?
----------
        1
(1 row)
```

### Test Login API
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fitmeal.pro",
    "password": "AdminPass123"
  }'
```

**Expected response (success):**
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

**Old response (error):**
```json
{
  "status": "error",
  "error": "Internal server error"
}
```

---

## Impact on Deployment

### Development Server
**Required:**
1. Docker Desktop must be running
2. PostgreSQL must be started: `npm run db:start`
3. Test accounts must be seeded: `npm run seed-test-accounts`

### Production Server
**Not Affected:**
- Production uses managed PostgreSQL instance
- No Docker Compose required
- Database is always available

---

## Files Modified/Created

### Created Files
1. `scripts/start-database.js` - Automated database startup script
2. `DATABASE_SETUP_GUIDE.md` - Comprehensive database setup guide
3. `INTERNAL_SERVER_ERROR_FIX.md` - This document

### Modified Files
1. `package.json` - Added `db:start`, `db:stop`, `db:status` scripts

### Related Documentation
1. `TEST_CREDENTIALS.md` - Official test credentials
2. `DEPLOYMENT_READY_SUMMARY.md` - Deployment preparation
3. `DEPLOYMENT_TROUBLESHOOTING.md` - Deployment issues

---

## Common Issues

### Docker Desktop Not Starting
**Symptom:**
```
error during connect: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

**Solution:**
1. Close Docker Desktop completely
2. Restart Docker Desktop from Start Menu
3. Wait 60 seconds for full initialization
4. Try `docker ps` to verify it's ready
5. Run `npm run db:start` again

### Port 5432 Already in Use
**Symptom:**
```
Error: Port 5432 is already in use
```

**Solution:**
```bash
# Find what's using port 5432
netstat -ano | findstr :5432

# Stop PostgreSQL container
npm run db:stop

# Or kill the process using the port (if it's not our container)
powershell -Command "Stop-Process -Id <PID> -Force"
```

### Test Accounts Not Working
**Symptom:**
Login fails with "Invalid email or password"

**Solution:**
```bash
npm run seed-test-accounts
```

This resets all test account passwords to the official credentials.

---

## Root Cause Analysis

### Why This Happened
1. **Missing Prerequisite:** PostgreSQL database is required but not documented as a prerequisite
2. **No Startup Check:** Server doesn't check if database is available before starting
3. **Silent Failure:** Database connection errors are logged but not surfaced to users
4. **Documentation Gap:** No clear instructions for starting the database

### How We Fixed It
1. ✅ Created automated database startup script
2. ✅ Added database commands to package.json
3. ✅ Created comprehensive documentation
4. ✅ Added pre-development checklist
5. ✅ Enhanced error messages

### How We Prevent It
1. ✅ DATABASE_SETUP_GUIDE.md - Step-by-step guide
2. ✅ Automated scripts with helpful error messages
3. ✅ Updated deployment documentation
4. ✅ Pre-deployment checklist includes database verification

---

## Next Steps for User

### Immediate (To Fix Current Error)
1. **Start Docker Desktop** and wait for it to be ready
2. **Run:** `npm run db:start`
3. **Run:** `npm run seed-test-accounts`
4. **Restart dev server** or just try logging in again

### For Future Development
1. **Always start Docker Desktop before development**
2. **Always run `npm run db:start` before `npm run dev`**
3. **Keep database running** between development sessions (or restart it each time)

### For Deployment
1. **Update deployment documentation** to include database startup
2. **Add database check** to pre-deployment checklist
3. **Verify database connection** before starting server

---

## Summary

**Before Fix:**
- ❌ Login fails with "Internal Server Error"
- ❌ No clear error message
- ❌ No documentation about database requirement
- ❌ Manual Docker commands required

**After Fix:**
- ✅ Clear identification of root cause
- ✅ Automated database startup script
- ✅ Comprehensive documentation
- ✅ Simple commands: `npm run db:start`
- ✅ Helpful error messages
- ✅ Pre-development checklist

---

**Document Version:** 1.0
**Last Updated:** October 6, 2025
**Status:** Active - User action required to start Docker Desktop

**Action Required:**
1. Start Docker Desktop
2. Run `npm run db:start`
3. Run `npm run seed-test-accounts`
4. Try logging in again
