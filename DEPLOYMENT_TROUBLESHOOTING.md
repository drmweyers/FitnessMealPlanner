# FitMeal Pro - Deployment Troubleshooting Guide

## Quick Issue Resolution

This guide addresses the most common deployment issues based on historical failures.

---

## 🔥 Critical Issues

### Issue 0: "ERR_CONNECTION_REFUSED" in development ⚡ NEW

**Frequency:** Very common in local development
**Impact:** Blocks development entirely

**Symptoms:**
```
Browser: ERR_CONNECTION_REFUSED
Terminal: Error: listen EADDRINUSE: address already in use :::5001
```

**Root Cause:**
- Port 5001 already occupied by previous server instance
- Server process not properly terminated
- Zombie process running in background

**Fix:**

**Quick Solution (Automated):**
```bash
npm run dev
# Now includes automatic port cleanup!
```

**Manual Solution:**
```bash
# 1. Clean up the port
npm run cleanup-port

# 2. Start server
npm run dev
```

**Platform-Specific Manual Cleanup:**
```bash
# Windows
netstat -ano | findstr :5001
powershell -Command "Stop-Process -Id <PID> -Force"

# Linux/Mac
lsof -ti:5001 | xargs kill -9
```

**Alternative: Use Different Port:**
```bash
PORT=5002 npm run dev
```

**Prevention:**
- ✅ **Automatic:** `npm run dev` now includes port cleanup
- ✅ **Graceful shutdown:** Server properly handles Ctrl+C
- ✅ **Error messages:** Clear instructions if port conflict occurs
- ✅ **Unit tests:** 15 tests verify port handling

**See:** `docs/PORT_CONFLICT_FIX.md` for complete documentation

---

### Issue 1: "drizzle.config.ts not found" during Docker build

**Git History:** This has caused multiple deployment failures

**Symptoms:**
```
Error: Could not find config file
Error: ENOENT: no such file or directory, open 'drizzle.config.ts'
```

**Root Cause:**
- File not copied in Dockerfile
- File deleted or not committed to git

**Fix:**

1. Verify file exists locally:
```bash
ls -la drizzle.config.ts
```

2. If missing, restore from git:
```bash
git checkout drizzle.config.ts
```

3. Verify Dockerfile includes copy commands:
```dockerfile
# In builder stage
COPY . .

# In production stage
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
```

4. Add verification to Dockerfile:
```dockerfile
RUN echo "Verifying drizzle.config.ts exists..." && \
    ls -la drizzle.config.ts || exit 1
```

**Prevention:**
- Add to pre-commit hook
- Include in CI/CD verification
- Run `bash scripts/verify-deployment.sh` before deploying

---

### Issue 2: React app returns 404 (blank page)

**Git History:** Fixed multiple times (commits: ecaa5a4, 7e72ec5, 6232a42)

**Symptoms:**
- Server starts successfully
- Browser shows blank page or 404
- Console shows 404 for assets

**Root Cause:**
- `client/dist` not copied to Docker image
- Static file serving misconfigured
- Wrong paths in production

**Fix:**

1. Rebuild client:
```bash
npm run build
ls -la client/dist/index.html  # Should exist
```

2. Verify Dockerfile copies client build:
```dockerfile
# In production stage
COPY --from=builder /app/client/dist ./client/dist
```

3. Check server serves static files (server/index.ts):
```typescript
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}
```

4. Verify in container:
```bash
docker run --rm <image> ls -la client/dist/
```

**Prevention:**
- Add verification step in Dockerfile
- Test Docker build locally before pushing
- Include in deployment test script

---

### Issue 3: Database connection fails on startup

**Git History:** Multiple SSL and connection fixes

**Symptoms:**
```
Error: Connection terminated unexpectedly
Error: SSL/TLS required
Unable to connect to database
```

**Root Cause:**
- Incorrect DATABASE_URL
- SSL configuration mismatch
- Missing NODE_EXTRA_CA_CERTS

**Fix:**

1. Verify DATABASE_URL format:
```bash
# Should look like:
# postgresql://user:pass@host:port/database
# OR
# postgresql://user:pass@host:port/database?sslmode=require

echo $DATABASE_URL
```

2. For production with SSL, check drizzle.config.ts:
```typescript
const sslConfig = getSslConfigForDrizzle();
// Should return { rejectUnauthorized: false } or handle CA cert
```

3. If using custom CA certificate:
```bash
# Set environment variable
export NODE_EXTRA_CA_CERTS=/path/to/ca.pem

# Or in Dockerfile:
RUN echo "$DATABASE_CA_CERT" > /tmp/ca.pem
ENV NODE_EXTRA_CA_CERTS=/tmp/ca.pem
```

4. Test connection:
```bash
psql "$DATABASE_URL" -c "SELECT 1;"
```

**Prevention:**
- Test database connection before deploying
- Keep separate dev/prod database URLs
- Document SSL requirements

---

### Issue 4: Missing static assets (images, PDFs)

**Git History:** Multiple fixes (commits: 899b8d3, 97cdef7, c7da5b8)

**Symptoms:**
- Images return 404
- PDF export fails
- Landing page broken

**Root Cause:**
- Public files not copied to Docker image
- server/views not included
- Wrong asset paths

**Fix:**

1. Verify public assets exist:
```bash
ls -la client/public/
ls -la server/views/
```

2. Update Dockerfile to copy public assets:
```dockerfile
# Copy public assets if they exist
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/server/views ./server/views
```

3. Check server serves public files:
```typescript
app.use('/public', express.static('client/public'));
```

4. Verify in container:
```bash
docker run --rm <image> ls -la client/public/
docker run --rm <image> ls -la server/views/
```

**Prevention:**
- Keep assets in version control
- Add to Dockerfile with verification
- Test asset loading after deployment

---

### Issue 5: Environment variables not loaded

**Git History:** Multiple configuration fixes

**Symptoms:**
```
OpenAI API key not configured
Session secret missing
S3 bucket not found
```

**Root Cause:**
- .env not sourced
- Variables not set in deployment platform
- Wrong variable names

**Fix:**

1. For Docker Compose, check env_file:
```yaml
app:
  env_file:
    - .env
```

2. For production deployment, set variables in platform:
```bash
# Digital Ocean example
doctl apps update <app-id> \
  --env DATABASE_URL="your-url" \
  --env OPENAI_API_KEY="your-key"
```

3. Verify variables are set:
```bash
# In running container
docker exec <container> printenv | grep DATABASE_URL
```

4. Check variable names match:
```typescript
// In code
process.env.DATABASE_URL  // Must match exactly
```

**Prevention:**
- Use deployment checklist
- Keep .env.example updated
- Document required variables

---

### Issue 6: Build fails with TypeScript errors

**Git History:** Fixed syntax errors (commit: bc4e7c7, 8ffd638)

**Symptoms:**
```
TS error: Type 'X' is not assignable to type 'Y'
Build failed with TypeScript errors
```

**Root Cause:**
- Type errors in code
- Missing type definitions
- tsconfig misconfiguration

**Fix:**

1. Run type check locally:
```bash
npm run check
```

2. Fix reported errors

3. If types are correct but check fails, update tsconfig.json:
```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true  // May help with dependency types
  }
}
```

4. For third-party type errors:
```bash
npm install --save-dev @types/<package-name>
```

**Prevention:**
- Run `npm run check` before committing
- Use pre-commit hooks
- Enable TypeScript in IDE

---

### Issue 7: Port conflicts during deployment

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::5001
Port 5001 is already allocated
```

**Root Cause:**
- Previous instance still running
- Another service using same port
- Docker container not stopped

**Fix:**

1. Find process using port:
```bash
# Linux/Mac
lsof -i :5001

# Windows
netstat -ano | findstr :5001
```

2. Stop the process:
```bash
# Kill by PID
kill -9 <PID>

# Or stop Docker containers
docker stop $(docker ps -q)
```

3. For Docker Compose:
```bash
docker-compose down
docker-compose --profile dev up
```

4. Use different port if needed:
```bash
PORT=5002 npm start
```

**Prevention:**
- Use docker-compose down before redeploying
- Clear port in deployment script
- Use unique ports for dev/prod

---

### Issue 8: Migrations fail on startup

**Symptoms:**
```
Migration failed
Error: relation "table_name" does not exist
Drizzle push failed
```

**Root Cause:**
- drizzle.config.ts not accessible
- Database permissions issue
- SSL/connection problem

**Fix:**

1. Test migration locally:
```bash
DATABASE_URL="your-test-db" npx drizzle-kit push
```

2. Check drizzle.config.ts is in container:
```bash
docker run --rm <image> cat drizzle.config.ts
```

3. Verify database permissions:
```bash
psql "$DATABASE_URL" -c "CREATE TABLE test_table (id serial);"
psql "$DATABASE_URL" -c "DROP TABLE test_table;"
```

4. For SSL issues, check NODE_EXTRA_CA_CERTS:
```bash
echo $NODE_EXTRA_CA_CERTS
```

5. Manual migration if needed:
```bash
# Connect to database
psql "$DATABASE_URL"

# Run migrations manually
\i migrations/0001_initial.sql
```

**Prevention:**
- Test migrations on staging first
- Keep migrations folder in version control
- Backup database before running migrations

---

## 🔍 Debugging Tools

### Check Container Health
```bash
# View running containers
docker ps

# Check logs
docker logs <container-id>

# Follow logs
docker logs -f <container-id>

# Execute command in container
docker exec -it <container-id> sh

# Inspect container
docker inspect <container-id>
```

### Check Application Health
```bash
# Health endpoint
curl http://localhost:5001/health

# Test API
curl http://localhost:5001/api/auth/check

# Check database connection
docker exec <container> npx drizzle-kit push
```

### Check Build Outputs
```bash
# Verify builds
ls -la dist/index.js
ls -la client/dist/index.html

# Check file sizes
du -sh dist/
du -sh client/dist/

# Verify critical files
ls -la drizzle.config.ts
ls -la Dockerfile
```

---

## 📱 Quick Commands Reference

### Pre-Deployment
```bash
# Full verification
bash scripts/verify-deployment.sh

# Test deployment
bash scripts/test-deployment.sh

# Type check
npm run check

# Run tests
npm test
```

### Build & Deploy
```bash
# Clean install
rm -rf node_modules && npm install

# Build
npm run build

# Docker build
docker build -t fitmeal:latest .

# Docker Compose
docker-compose --profile prod up --build
```

### Troubleshooting
```bash
# View logs
docker-compose logs -f

# Restart
docker-compose down && docker-compose --profile prod up

# Check inside container
docker exec -it <container> sh

# Database connection test
psql "$DATABASE_URL" -c "SELECT version();"
```

### Rollback
```bash
# Stop current deployment
docker-compose down

# Revert git changes
git revert HEAD
git push

# Deploy previous version
git checkout <previous-tag>
docker-compose --profile prod up --build
```

---

## 🎯 Deployment Checklist Quick Reference

Before deploying, ensure:

- [ ] `bash scripts/verify-deployment.sh` passes
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] `docker build` succeeds
- [ ] Environment variables set
- [ ] Database connection works
- [ ] All commits pushed
- [ ] On correct branch

---

## 📞 Emergency Contacts

If all else fails:

1. Check server logs: `docker logs -f <container>`
2. Check database logs
3. Rollback to previous version
4. Restore database backup if needed
5. Review git history: `git log --oneline -20`

---

## 🔗 Related Documentation

- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Full deployment checklist
- [FINAL_TEST_REPORT.md](./FINAL_TEST_REPORT.md) - Test status
- [.env.example](./.env.example) - Required environment variables
- [Dockerfile](./Dockerfile) - Container configuration
