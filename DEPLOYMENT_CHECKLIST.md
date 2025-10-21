# FitMeal Pro Deployment Checklist

## Pre-Deployment Verification

This checklist ensures smooth deployments to both dev and production servers with no interruptions.

### Common Deployment Issues (From History)

Based on git history, these are the most common deployment failures:

1. ❌ **Missing Files in Docker Build**
   - Missing `drizzle.config.ts`
   - Missing `client/dist` (React build)
   - Missing `server/views` (PDF templates)
   - Missing public assets (images, landing page)

2. ❌ **Path Issues**
   - Asset paths not matching between dev/prod
   - Navigation routes broken
   - Static file serving incorrect

3. ❌ **Database Configuration**
   - SSL configuration mismatch
   - Missing `NODE_EXTRA_CA_CERTS` in production
   - Database URL not set correctly

4. ❌ **Build Failures**
   - TypeScript errors
   - CSS syntax errors
   - Missing dependencies

5. ❌ **Environment Variables**
   - Missing required env vars
   - Incorrect secrets
   - S3 credentials mismatch

---

## 🚀 Deployment Checklist

### Phase 1: Pre-Deployment (Local)

- [ ] **Run Verification Script**
  ```bash
  bash scripts/verify-deployment.sh
  ```

- [ ] **Check Git Status**
  ```bash
  git status
  # Ensure you're on the correct branch (main for production)
  # Commit all changes
  ```

- [ ] **Verify Environment Variables**
  - [ ] `DATABASE_URL` is set
  - [ ] `OPENAI_API_KEY` is set
  - [ ] `SESSION_SECRET` is set
  - [ ] `JWT_SECRET` is set
  - [ ] `S3_BUCKET_NAME` is set (if using S3)
  - [ ] `AWS_REGION` is set
  - [ ] `AWS_ACCESS_KEY_ID` is set
  - [ ] `AWS_SECRET_ACCESS_KEY` is set

- [ ] **Build and Test Locally**
  ```bash
  # Clean install
  rm -rf node_modules package-lock.json
  npm install

  # Run tests
  npm test

  # Build application
  npm run build

  # Verify builds exist
  ls -la client/dist/index.html
  ls -la dist/index.js
  ```

- [ ] **Verify Critical Files Exist**
  ```bash
  # Must exist in project root
  ls -la drizzle.config.ts
  ls -la Dockerfile
  ls -la docker-compose.yml
  ls -la package.json

  # Must exist for builds
  ls -la vite.config.ts
  ls -la tsconfig.json

  # Must exist for functionality
  ls -la server/views/  # PDF templates
  ls -la client/public/ # Static assets
  ```

### Phase 2: Docker Build Verification

- [ ] **Test Docker Build**
  ```bash
  # Build production image
  docker build --target prod -t fitmeal-prod:test .

  # If build fails, check:
  # - Is drizzle.config.ts being copied?
  # - Are client/dist files being copied?
  # - Are server/views being copied?
  # - Are dependencies installing correctly?
  ```

- [ ] **Test Docker Image**
  ```bash
  # Run the built image
  docker run -p 5001:5001 \
    -e DATABASE_URL="your-db-url" \
    -e OPENAI_API_KEY="your-key" \
    -e SESSION_SECRET="your-secret" \
    -e JWT_SECRET="your-jwt-secret" \
    fitmeal-prod:test

  # Test endpoints
  curl http://localhost:5001/health
  # Should return: OK
  ```

- [ ] **Verify Files Inside Container**
  ```bash
  # Check if critical files exist in container
  docker run fitmeal-prod:test ls -la drizzle.config.ts
  docker run fitmeal-prod:test ls -la dist/index.js
  docker run fitmeal-prod:test ls -la client/dist/index.html
  ```

### Phase 3: Database Migration Verification

- [ ] **Test Database Migrations**
  ```bash
  # Generate migrations if needed
  npm run db:generate

  # Test migration locally
  DATABASE_URL="your-test-db-url" npx drizzle-kit push

  # Verify migrations folder
  ls -la migrations/
  ```

- [ ] **Verify Database Connection**
  ```bash
  # Test connection with psql or your db client
  psql "$DATABASE_URL" -c "SELECT version();"
  ```

### Phase 4: Dev Server Deployment

- [ ] **Set Environment Variables on Dev Server**
  - Use Digital Ocean console or CLI
  - Verify all required env vars are set
  - Don't use production database for dev!

- [ ] **Deploy to Dev**
  ```bash
  # If using Digital Ocean App Platform
  doctl apps create-deployment <app-id>

  # Or using docker-compose
  docker-compose --profile dev up -d
  ```

- [ ] **Monitor Dev Deployment**
  ```bash
  # Check logs
  doctl apps logs <app-id> --follow

  # Or with docker-compose
  docker-compose logs -f app-dev
  ```

- [ ] **Verify Dev Deployment**
  - [ ] Health check responds: `curl https://dev.yourdomain.com/health`
  - [ ] Can login as test user
  - [ ] Can generate a meal plan
  - [ ] Can view grocery lists
  - [ ] PDF export works
  - [ ] Images load correctly

### Phase 5: Production Deployment

⚠️ **CRITICAL: Only deploy to production after successful dev deployment!**

- [ ] **Final Pre-Production Checks**
  - [ ] All tests passing
  - [ ] Dev deployment verified
  - [ ] Database backup created
  - [ ] Production env vars verified
  - [ ] SSL certificates valid

- [ ] **Deploy to Production**
  ```bash
  # Tag the release
  git tag -a v1.x.x -m "Release v1.x.x"
  git push origin v1.x.x

  # Deploy (example with Digital Ocean)
  doctl apps create-deployment <prod-app-id>
  ```

- [ ] **Monitor Production Deployment**
  ```bash
  # Watch logs
  doctl apps logs <prod-app-id> --follow

  # Check for errors
  doctl apps logs <prod-app-id> | grep -i error
  ```

- [ ] **Verify Production Deployment**
  - [ ] Health check responds
  - [ ] SSL certificate valid
  - [ ] Login works
  - [ ] Core features work
  - [ ] Error tracking active

### Phase 6: Post-Deployment Verification

- [ ] **Smoke Tests**
  - [ ] Homepage loads
  - [ ] Authentication works
  - [ ] Meal plan generation works
  - [ ] Grocery lists work
  - [ ] PDF export works
  - [ ] Images load
  - [ ] Mobile responsive

- [ ] **Performance Checks**
  - [ ] Page load times acceptable
  - [ ] API response times normal
  - [ ] Database queries efficient

- [ ] **Monitor for Issues**
  - Watch logs for 15-30 minutes
  - Check error rates
  - Monitor user reports

---

## 🔧 Troubleshooting Common Issues

### Issue: "drizzle.config.ts not found"

**Symptoms:** Build fails with drizzle-kit error

**Fix:**
```bash
# Verify file exists
ls -la drizzle.config.ts

# If missing, it was accidentally deleted - restore from git
git checkout drizzle.config.ts

# Verify Dockerfile copies it
grep "drizzle.config.ts" Dockerfile
```

### Issue: "React app not loading (404s)"

**Symptoms:** Server starts but frontend shows 404

**Fix:**
```bash
# Rebuild client
npm run build

# Verify client/dist exists
ls -la client/dist/index.html

# Check Dockerfile copies client/dist
grep "client/dist" Dockerfile

# Check server index.ts serves static files
grep "express.static" server/index.ts
```

### Issue: "Database connection failed"

**Symptoms:** Server crashes on startup with database error

**Fix:**
```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Check SSL configuration in drizzle.config.ts
cat drizzle.config.ts | grep -A 10 "ssl"

# For production with SSL, ensure NODE_EXTRA_CA_CERTS is set
```

### Issue: "Environment variables not loaded"

**Symptoms:** App starts but features fail (OpenAI, S3, etc.)

**Fix:**
```bash
# Check .env file
cat .env

# Verify variables are exported
printenv | grep DATABASE_URL
printenv | grep OPENAI_API_KEY

# For Docker, verify env_file in docker-compose.yml
cat docker-compose.yml | grep -A 5 "env_file"

# For Digital Ocean, check app spec
doctl apps spec get <app-id>
```

### Issue: "Port already in use"

**Symptoms:** "EADDRINUSE: address already in use"

**Fix:**
```bash
# Find process using port
lsof -i :5001

# Kill the process
kill -9 <PID>

# Or use different port
PORT=5002 npm start
```

### Issue: "Out of memory during build"

**Symptoms:** Build crashes or Docker build fails

**Fix:**
```bash
# Increase Docker memory limit
# Docker Desktop > Settings > Resources > Memory

# Or build with less parallelism
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Use .dockerignore to exclude heavy files
echo "node_modules" >> .dockerignore
echo "*.test.ts" >> .dockerignore
```

### Issue: "Migrations fail on startup"

**Symptoms:** "Migration error" in logs

**Fix:**
```bash
# Test migrations locally first
DATABASE_URL="your-test-db" npx drizzle-kit push

# Check if drizzle.config.ts is accessible
docker run <image> cat drizzle.config.ts

# Verify NODE_EXTRA_CA_CERTS for SSL
export NODE_EXTRA_CA_CERTS=/path/to/ca.pem
```

---

## 📋 Quick Reference Commands

### Local Development
```bash
npm install           # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm test             # Run tests
npm run db:push      # Push schema changes
npm run db:generate  # Generate migrations
```

### Docker
```bash
# Development
docker-compose --profile dev up

# Production
docker-compose --profile prod up

# Rebuild
docker-compose --profile prod up --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Digital Ocean (if applicable)
```bash
# List apps
doctl apps list

# View logs
doctl apps logs <app-id> --follow

# Deploy
doctl apps create-deployment <app-id>

# Get app config
doctl apps spec get <app-id>

# Update app
doctl apps update <app-id> --spec app.yaml
```

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ Health check endpoint returns 200
- ✅ Authentication works (login/logout)
- ✅ Meal plan generation completes
- ✅ Grocery lists load and update
- ✅ PDF export generates without errors
- ✅ All images load correctly
- ✅ No console errors in browser
- ✅ No server errors in logs
- ✅ Database migrations applied
- ✅ API endpoints respond correctly

---

## 📞 Emergency Rollback

If deployment fails:

```bash
# 1. Rollback to previous deployment (Digital Ocean)
doctl apps deployment rollback <app-id> <previous-deployment-id>

# 2. Or revert git commit
git revert HEAD
git push

# 3. Restore database if needed
# (Use your database backup strategy)

# 4. Monitor logs
doctl apps logs <app-id> --follow
```

---

## 📝 Notes

- Always test on dev before production
- Keep DATABASE_URL for dev and prod separate
- Never commit secrets to git
- Create database backups before major deployments
- Monitor logs for 30 minutes after deployment
- Keep rollback plan ready
