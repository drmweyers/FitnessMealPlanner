# 🗄️ Database Setup Guide

**Issue:** "Internal Server Error" when logging in
**Root Cause:** PostgreSQL database not running
**Status:** ✅ FIXED - Automated startup script created

---

## Problem Identified

**Symptom:**
- "Internal server error" when trying to log in
- Server logs show: `ECONNREFUSED` to `localhost:5432`
- Login endpoint fails with HTTP 500 error

**Root Cause:**
PostgreSQL database is not running. The application requires a PostgreSQL database at `localhost:5432`, but the database service is not started.

**Error Details:**
```
Login error: AggregateError [ECONNREFUSED]:
  Error: connect ECONNREFUSED ::1:5432
  Error: connect ECONNREFUSED 127.0.0.1:5432
```

---

## Quick Fix (3 Steps)

### 1. Start Docker Desktop
Make sure Docker Desktop is running on your system.

**Windows:**
- Open Docker Desktop from Start Menu
- Wait for it to show "Docker Desktop is running"

**Mac:**
- Open Docker Desktop from Applications
- Wait for the whale icon to stop animating

**Linux:**
- Start Docker daemon: `sudo systemctl start docker`

### 2. Start the Database
```bash
npm run db:start
```

This will:
- ✅ Wait for Docker to be ready
- ✅ Start PostgreSQL container
- ✅ Wait for database to be healthy
- ✅ Show database status

### 3. Seed Test Accounts
```bash
npm run seed-test-accounts
```

This will create the official test accounts:
- `admin@fitmeal.pro` / `AdminPass123`
- `trainer.test@evofitmeals.com` / `TestTrainer123!`
- `customer.test@evofitmeals.com` / `TestCustomer123!`

---

## Database Commands

### Start Database
```bash
npm run db:start
```

### Stop Database
```bash
npm run db:stop
```

### Check Database Status
```bash
npm run db:status
```

### View Database Logs
```bash
docker-compose --profile dev logs postgres
```

### Access Database Shell
```bash
docker-compose --profile dev exec postgres psql -U postgres -d fitmeal
```

---

## Manual Docker Commands

If the automated scripts don't work, use these commands:

### Start PostgreSQL
```bash
docker-compose --profile dev up -d postgres
```

### Stop PostgreSQL
```bash
docker-compose --profile dev down
```

### Restart PostgreSQL
```bash
docker-compose --profile dev restart postgres
```

### View All Containers
```bash
docker ps -a
```

---

## Development Workflow

### First Time Setup
1. **Start Docker Desktop**
   - Wait for it to be fully running

2. **Start Database**
   ```bash
   npm run db:start
   ```

3. **Seed Test Accounts**
   ```bash
   npm run seed-test-accounts
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Daily Development
1. **Start Docker Desktop** (if not already running)
2. **Start Database** (if not already running)
   ```bash
   npm run db:start
   ```
3. **Start Dev Server**
   ```bash
   npm run dev
   ```

### Ending Development Session
```bash
# Stop dev server: Ctrl+C

# Optionally stop database (or leave it running for next session)
npm run db:stop
```

---

## Troubleshooting

### Issue: "Docker Desktop is not ready"

**Solution:**
1. Open Docker Desktop manually
2. Wait 30-60 seconds for it to fully start
3. Run `npm run db:start` again

### Issue: "Port 5432 already in use"

**Solution:**
```bash
# Find what's using port 5432
netstat -ano | findstr :5432

# Or stop all Docker containers
docker-compose --profile dev down
```

### Issue: "Database connection failed"

**Check:**
1. Is Docker Desktop running?
   ```bash
   docker ps
   ```

2. Is PostgreSQL container running?
   ```bash
   npm run db:status
   ```

3. Are the credentials correct?
   - Check `.env.local`: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fitmeal"`
   - Check `docker-compose.yml`: matches credentials

### Issue: "No test accounts in database"

**Solution:**
```bash
npm run seed-test-accounts
```

This will create or update all test accounts with the correct passwords.

### Issue: "Internal server error" persists

**Debug Steps:**
1. Check server logs for database errors
2. Verify database is running: `npm run db:status`
3. Test database connection:
   ```bash
   docker-compose --profile dev exec postgres psql -U postgres -d fitmeal -c "SELECT 1;"
   ```
4. Check if tables exist:
   ```bash
   docker-compose --profile dev exec postgres psql -U postgres -d fitmeal -c "\dt"
   ```

---

## Database Configuration

### Environment Variables (.env.local)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fitmeal"
```

### Docker Compose (docker-compose.yml)
```yaml
postgres:
  image: postgres:16-alpine
  environment:
    - POSTGRES_DB=fitmeal
    - POSTGRES_USER=postgres
    - POSTGRES_PASSWORD=postgres
  ports:
    - "5432:5432"
```

**Important:** These credentials must match!

---

## CI/CD and Deployment

### Development Server
```bash
# Start database before deploying
npm run db:start

# Run migrations
npm run db:push

# Seed test accounts
npm run seed-test-accounts

# Start application
npm run dev
```

### Production Server
Production uses a managed PostgreSQL instance, not Docker Compose.

**Environment variables:**
- `DATABASE_URL` points to production database
- No need to run `db:start`
- Migrations run automatically on deployment

---

## Database Backup and Restore

### Backup Database
```bash
docker-compose --profile dev exec postgres pg_dump -U postgres fitmeal > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker-compose --profile dev exec -T postgres psql -U postgres fitmeal
```

### Reset Database (Delete All Data)
```bash
docker-compose --profile dev down -v
npm run db:start
npm run db:push
npm run seed-test-accounts
```

---

## Common Errors and Fixes

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED ::1:5432` | Database not running | `npm run db:start` |
| `Docker Desktop not ready` | Docker not started | Start Docker Desktop and wait |
| `Port 5432 already in use` | Conflict with another service | Stop conflicting service or change port |
| `Invalid email or password` | Test accounts not seeded | `npm run seed-test-accounts` |
| `Database connection timeout` | Database still starting | Wait 10-15 seconds and retry |

---

## Prevention Measures

### 1. Automated Checks
The database startup script automatically:
- ✅ Waits for Docker to be ready
- ✅ Starts PostgreSQL if not running
- ✅ Waits for database to be healthy
- ✅ Shows clear error messages

### 2. Pre-Development Checklist
- [ ] Docker Desktop is running
- [ ] Database is started: `npm run db:status`
- [ ] Test accounts are seeded
- [ ] Server can connect to database

### 3. Deployment Checklist
Added to `DEPLOYMENT_CHECKLIST.md`:
- [ ] Verify `DATABASE_URL` is set correctly
- [ ] Run database migrations: `npm run db:push`
- [ ] Seed test accounts (dev/staging only)
- [ ] Test database connection before starting server

---

## Scripts Overview

| Script | Command | Description |
|--------|---------|-------------|
| **Start DB** | `npm run db:start` | Start PostgreSQL with Docker |
| **Stop DB** | `npm run db:stop` | Stop PostgreSQL container |
| **DB Status** | `npm run db:status` | Show database container status |
| **Seed Accounts** | `npm run seed-test-accounts` | Create/update test accounts |
| **Dev Server** | `npm run dev` | Start development server |

---

## Next Steps

After fixing the database issue:

1. ✅ Database is running
2. ✅ Test accounts are seeded
3. ✅ Server connects to database successfully
4. ✅ Login works without "internal server error"

**Verify the fix:**
```bash
# Test login
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

---

**Document Version:** 1.0
**Last Updated:** October 6, 2025
**Status:** Active - Required for development setup

**Related Documentation:**
- [TEST_CREDENTIALS.md](./TEST_CREDENTIALS.md) - Official test account credentials
- [DEPLOYMENT_READY_SUMMARY.md](./DEPLOYMENT_READY_SUMMARY.md) - Deployment preparation
- [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md) - Deployment issues
