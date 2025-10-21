# 🚀 Deploy FitMeal Pro - Quick Start

**Ready to deploy?** Follow these steps for a smooth deployment.

---

## ⚡ Quick Deploy (5 Minutes)

### 1. Pre-Flight Check (2 minutes)

```bash
# Run verification script
bash scripts/verify-deployment.sh

# ✅ Expected: All checks pass or only warnings
# ❌ If checks fail, see DEPLOYMENT_TROUBLESHOOTING.md
```

### 2. Set Environment Variables (1 minute)

**On your deployment platform** (Digital Ocean, AWS, etc.):

```bash
# Required
DATABASE_URL="postgresql://user:pass@host:port/database"
OPENAI_API_KEY="sk-proj-your-actual-key"
SESSION_SECRET="min-32-character-random-string"
JWT_SECRET="min-32-character-random-string"
NODE_ENV="production"
PORT="5001"

# For image uploads
S3_BUCKET_NAME="your-bucket"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
```

See `.env.example` for all variables.

### 3. Deploy (2 minutes)

#### Option A: Docker Compose (Local/VPS)

```bash
# Build and start
docker-compose --profile prod up -d

# Check logs
docker-compose logs -f

# Verify
curl http://localhost:5001/health
# Should return: OK
```

#### Option B: Docker Build + Push (Cloud Platform)

```bash
# Build production image
docker build --target prod -t your-registry/fitmeal:latest .

# Push to registry
docker push your-registry/fitmeal:latest

# Deploy on your platform
# (Follow platform-specific instructions)
```

#### Option C: Digital Ocean App Platform

```bash
# Push to git
git push origin main

# Deploy (if auto-deploy enabled)
# Or manually trigger deployment:
doctl apps create-deployment <app-id>

# Monitor
doctl apps logs <app-id> --follow
```

---

## ✅ Verify Deployment Success

After deployment, check:

```bash
# 1. Health check
curl https://your-domain.com/health
# Should return: OK

# 2. Try logging in
# Open browser: https://your-domain.com
# Login with your admin account

# 3. Generate a test meal plan
# Should complete without errors

# 4. Check server logs
# No error messages for 10+ minutes = success!
```

---

## 🆘 Troubleshooting

### Deployment fails immediately

**Check:** Are all required environment variables set?
```bash
# On your platform, verify these are set:
DATABASE_URL
OPENAI_API_KEY
SESSION_SECRET
JWT_SECRET
```

### "drizzle.config.ts not found" error

**Fix:**
```bash
# Verify file exists locally
ls -la drizzle.config.ts

# If missing, restore it
git checkout drizzle.config.ts

# Rebuild and redeploy
```

### React app shows blank page (404)

**Fix:**
```bash
# Rebuild locally
npm run build

# Verify client build
ls -la client/dist/index.html

# Rebuild Docker image and redeploy
```

### Database connection fails

**Check:**
1. Is `DATABASE_URL` correct?
2. Can you connect manually? `psql "$DATABASE_URL" -c "SELECT 1;"`
3. For SSL issues, see DEPLOYMENT_TROUBLESHOOTING.md section "Database connection fails"

### Other issues

**See:** [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md)

---

## 📋 Full Deployment Documentation

For comprehensive guidance:

1. **[DEPLOYMENT_READY_SUMMARY.md](./DEPLOYMENT_READY_SUMMARY.md)** - Overall status and results
2. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Detailed step-by-step guide
3. **[DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md)** - Issue resolution
4. **[.env.example](./.env.example)** - All environment variables

---

## 🎯 Deploy to Dev First!

**⚠️  Always deploy to dev before production**

1. Deploy to dev server
2. Test all features
3. Monitor for 24 hours
4. If stable, deploy to production

---

## 🔐 Security Reminders

- ✅ All secrets in environment variables (not in code)
- ✅ `.env` in `.gitignore` (never committed)
- ✅ Use different database for dev/prod
- ✅ Use production OpenAI key for production
- ✅ Database backup before production deployment

---

## 🚦 Deployment Status Indicators

### ✅ Safe to Deploy
- All tests passing
- No uncommitted changes
- Verification script passes
- Environment variables set

### ⚠️ Deploy with Caution
- Warnings from verification script
- TypeScript errors (non-critical)
- Some tests failing (but not critical functionality)

### ❌ Do Not Deploy
- Build fails
- Critical tests failing
- Verification script fails with errors
- Missing required environment variables

---

## 📞 Quick Commands

```bash
# Verify before deploy
bash scripts/verify-deployment.sh

# Full deployment test (recommended)
bash scripts/test-deployment.sh

# Build
npm run build

# Docker build
docker build --target prod -t fitmeal:latest .

# Docker Compose up
docker-compose --profile prod up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🎉 You're Ready!

Everything is set up for smooth deployments. Just:

1. Run verification
2. Set environment variables
3. Deploy
4. Monitor and verify

**Good luck with your deployment!** 🚀

---

*For issues during deployment, consult DEPLOYMENT_TROUBLESHOOTING.md*
