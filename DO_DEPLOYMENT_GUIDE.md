# DigitalOcean Production Deployment Guide

## 🚀 Quick Deployment Commands

### ⚠️ CRITICAL: Pre-Deployment Synchronization
**ALWAYS synchronize with GitHub before building to prevent deploying outdated code!**

```bash
# 0. MANDATORY: Synchronize with latest code from GitHub
git status                         # Check current branch and uncommitted changes
git checkout main                  # Ensure you're on the main branch
git pull origin main               # Pull latest changes from GitHub
git log --oneline -5              # Verify recent commits are present

# 1. Login to DigitalOcean Container Registry
doctl registry login

# 2. Build production Docker image (use --no-cache for clean build)
docker build --target prod -t fitnessmealplanner:prod . --no-cache

# 3. Tag for DigitalOcean registry
docker tag fitnessmealplanner:prod registry.digitalocean.com/bci/fitnessmealplanner:prod

# 4. Push to registry (triggers auto-deploy)
docker push registry.digitalocean.com/bci/fitnessmealplanner:prod
```

### 🛑 Pre-Build Checklist
- [ ] ✅ Verified on correct branch (`git branch`)
- [ ] ✅ All local changes committed (`git status`)
- [ ] ✅ Pulled latest from GitHub (`git pull origin main`)
- [ ] ✅ Recent commits verified (`git log --oneline -5`)
- [ ] ✅ Test features working in dev (`docker-compose --profile dev up -d`)

## 📋 Production App Details

| Setting | Value |
|---------|-------|
| **App Name** | `fitnessmealplanner-prod` |
| **App ID** | `600abc04-b784-426c-8799-0c09f8b9a958` |
| **Production URL** | https://evofitmeals.com |
| **DigitalOcean URL** | https://fitnessmealplanner-prod-vt7ek.ondigitalocean.app |
| **Region** | Toronto (tor) |
| **Registry** | `registry.digitalocean.com/bci/fitnessmealplanner` |
| **Deploy Tag** | `prod` |
| **Auto-deploy** | ✅ Enabled |

## 🔐 Authentication Setup

### DigitalOcean Container Registry
```bash
# Login with doctl (recommended - 30 day validity)
doctl registry login

# Or manual login with credentials (token stored in environment variable)
echo "$DIGITALOCEAN_TOKEN" | docker login registry.digitalocean.com -u bci --password-stdin
```

### Credentials
- **Registry User**: `bci`
- **Registry Token**: `$DIGITALOCEAN_TOKEN` (stored in environment variable)

## 🏗️ Build Configuration

### Dockerfile Target
- **Development**: `--target dev`
- **Production**: `--target prod`

### Key Build Features
- ✅ Multi-stage build (base → builder → prod)
- ✅ Drizzle config verification
- ✅ Automatic database migrations
- ✅ Security: non-root user
- ✅ Puppeteer/PDF support with Chromium

## 📊 Monitoring & Management

### Check App Status
```bash
# List all apps
doctl apps list

# Get specific app details
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958

# Check current deployment
doctl apps get-deployment 600abc04-b784-426c-8799-0c09f8b9a958 <deployment-id>

# View app logs
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958
```

### Registry Management
```bash
# List repositories
doctl registry repository list

# List images in repository
doctl registry repository list-tags bci/fitnessmealplanner

# Delete old images
doctl registry repository delete-tag bci/fitnessmealplanner <tag>
```

## 🌐 Environment Variables (Production)

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Auto-injected from managed database |
| `JWT_SECRET` | Authentication secret |
| `OPENAI_API_KEY` | AI recipe generation |
| `AWS_ACCESS_KEY_ID` | DigitalOcean Spaces (S3-compatible) |
| `AWS_ENDPOINT` | `https://tor1.digitaloceanspaces.com` |
| `S3_BUCKET_NAME` | `healthtech` |
| `GOOGLE_CLIENT_ID` | OAuth authentication |
| `RESEND_API_KEY` | Email service |

## 🗄️ Database Configuration

- **Engine**: PostgreSQL 17
- **Cluster**: `fitnessmealplanner-db`
- **Database**: `fitmeal`
- **SSL**: Required (`DB_SSL_MODE=require`)
- **Auto-migrate**: Enabled (`AUTO_MIGRATE=true`)

## 🚨 Troubleshooting

### Common Issues

#### ⚠️ Production Missing Recent Features/Fixes
**Symptom**: Features working in development are missing or broken in production
**Root Cause**: Local repository was not synchronized with GitHub before building

```bash
# SOLUTION: Always sync before building
git status                         # Check current state
git checkout main                  # Switch to main branch  
git pull origin main               # Pull ALL latest changes
git log --oneline -10              # Verify expected commits are present

# Look for specific commits that fixed the issue
git log --grep="saved plans" --oneline
git log --grep="blank page" --oneline

# Rebuild with clean cache to ensure all changes included
docker build --target prod -t fitnessmealplanner:prod . --no-cache

# Continue with tagging and pushing...
```

**Prevention**: 
- Always run `git pull origin main` before building
- Verify specific commits are present with `git log`
- Use `--no-cache` flag when building after fixes
- Test the specific feature in dev before deploying

#### Docker Push Fails with Network Errors
```bash
# Solution 1: Retry after network stabilizes
docker push registry.digitalocean.com/bci/fitnessmealplanner:prod

# Solution 2: Re-login and retry
doctl registry login
docker push registry.digitalocean.com/bci/fitnessmealplanner:prod

# Solution 3: Check Docker daemon status
docker system info
```

#### Build Fails - Missing client/dist Directory
```bash
# Check vite.config.ts build.outDir setting
# Should be: outDir: "../client/dist" (with root: "client")
```

#### Drizzle Config Not Found
```bash
# Ensure drizzle.config.ts exists in project root
ls -la drizzle.config.ts

# Check DATABASE_URL is set during build
echo $DATABASE_URL
```

### Deployment Status Check
```bash
# If deployment seems stuck, check status
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958

# Check deployment logs
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type build
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type run
```

## 🔄 Deployment Workflow

### ⚠️ IMPORTANT: Synchronization is Critical
**Failure to sync with GitHub before building can result in deploying outdated code!**

1. **Sync with GitHub** *(MANDATORY FIRST STEP)*:
   ```bash
   git status                    # Check for uncommitted changes
   git checkout main             # Switch to main branch
   git pull origin main          # Pull latest changes
   git log --oneline -5          # Verify recent commits are present
   ```

2. **Test Locally**: 
   ```bash
   docker-compose --profile dev up -d
   # Test the specific features you're deploying
   # Verify everything works as expected
   ```

3. **Build Production Image**:
   ```bash
   # Use --no-cache for critical deployments to ensure fresh build
   docker build --target prod -t fitnessmealplanner:prod . --no-cache
   ```

4. **Tag for Registry**:
   ```bash
   docker tag fitnessmealplanner:prod registry.digitalocean.com/bci/fitnessmealplanner:prod
   ```

5. **Push to Registry**:
   ```bash
   docker push registry.digitalocean.com/bci/fitnessmealplanner:prod
   ```

6. **Auto-Deploy**: DigitalOcean automatically deploys the new image (7-10 minutes)

7. **Verify Deployment**:
   - Check https://evofitmeals.com for successful deployment
   - Test the specific features that were deployed
   - Verify no functionality was lost

## 📝 Git Integration

While the app deploys from Container Registry, maintain Git workflow:

```bash
# Current branch for development
git checkout qa-ready

# Commit changes
git add .
git commit -m "feat: deployment update"
git push origin qa-ready

# The Git push does NOT trigger deployment
# Only Docker registry pushes trigger deployment
```

## 🎯 MCP Integration

The following MCP servers are configured for this project:
- **GitHub MCP**: Code repository management
- **Context7 MCP**: Technical documentation
- **DigitalOcean MCP**: Production infrastructure management

---

**Last Updated**: September 2, 2025  
**Critical Update**: Added mandatory GitHub synchronization steps to prevent deploying outdated code
**Next Review**: Check when deployment process or credentials change

### 📌 Key Lessons Learned
- **Always sync with GitHub before building** - Local code can be outdated
- **Verify specific commits are present** - Use `git log` to confirm fixes are included
- **Use `--no-cache` for critical builds** - Ensures fresh build with all changes
- **Test features in dev before deploying** - Catch issues before production