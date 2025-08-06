# DigitalOcean Production Deployment Guide

## 🚀 Quick Deployment Commands

```bash
# 1. Login to DigitalOcean Container Registry
doctl registry login

# 2. Build production Docker image
docker build --target prod -t fitnessmealplanner:prod .

# 3. Tag for DigitalOcean registry
docker tag fitnessmealplanner:prod registry.digitalocean.com/bci/fitnessmealplanner:prod

# 4. Push to registry (triggers auto-deploy)
docker push registry.digitalocean.com/bci/fitnessmealplanner:prod
```

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

1. **Code Changes**: Make changes to local codebase
2. **Test Locally**: `npm run docker:dev` to test in Docker
3. **Build**: `docker build --target prod -t fitnessmealplanner:prod .`
4. **Tag**: `docker tag fitnessmealplanner:prod registry.digitalocean.com/bci/fitnessmealplanner:prod`
5. **Push**: `docker push registry.digitalocean.com/bci/fitnessmealplanner:prod`
6. **Auto-Deploy**: DigitalOcean automatically deploys the new image
7. **Verify**: Check https://evofitmeals.com for successful deployment

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

**Last Updated**: August 5, 2025  
**Next Review**: Check when deployment process or credentials change