# FitnessMealPlanner Deployment Guide

This guide provides comprehensive instructions for deploying the FitnessMealPlanner application from the qa-ready branch to production.

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Requirements](#environment-requirements)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment Process](#manual-deployment-process)
- [Database Migration](#database-migration)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

### ✅ Code Quality Verification
```bash
# 1. Ensure you're on the qa-ready branch
git checkout qa-ready
git pull origin qa-ready

# 2. Run full test suite
npm run test:all

# 3. Run type checking
npm run check

# 4. Build production version
npm run build

# 5. Verify Docker build
docker build --target prod -t fitnessmealplanner:test .
```

### ✅ Security Checks
- [ ] No sensitive data in frontend code
- [ ] Environment variables properly configured
- [ ] API keys not exposed in client-side code
- [ ] HTTPS enforced in production
- [ ] CORS properly configured

### ✅ Database Preparation
- [ ] Database backup completed
- [ ] Migration scripts ready (if any)
- [ ] Connection string updated for production
- [ ] SSL mode configured appropriately

### ✅ Infrastructure Readiness
- [ ] Production server accessible
- [ ] Docker registry available
- [ ] Load balancer configured (if applicable)
- [ ] SSL certificates valid
- [ ] DNS settings correct

## Environment Requirements

### Required Environment Variables

Create a `.env` file in the production environment with these variables:

```bash
# Application Configuration
NODE_ENV=production
PORT=5001

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
DB_SSL_MODE=require

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key
SESSION_SECRET=your-super-secure-session-secret

# OpenAI Integration (if using AI features)
OPENAI_API_KEY=your-openai-api-key

# AWS S3 Configuration (for image uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-aws-region
AWS_S3_BUCKET=your-s3-bucket-name

# Email Service (optional)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Application URLs
CLIENT_URL=https://yourdomain.com
SERVER_URL=https://yourdomain.com
```

### Docker Environment Variables
```bash
# Docker-specific settings
POSTGRES_DB=fitmeal
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-db-password
```

## Docker Deployment

### Method 1: Automated Deployment (Recommended)

#### For DigitalOcean Container Registry:
```bash
# 1. Build and tag the production image
docker build --target prod -t fitnessmealplanner:prod .
docker tag fitnessmealplanner:prod registry.digitalocean.com/bci/fitnessmealplanner:prod

# 2. Push to registry (if network allows)
docker push registry.digitalocean.com/bci/fitnessmealplanner:prod

# 3. Trigger deployment via DigitalOcean dashboard
# Navigate to: https://cloud.digitalocean.com/apps
# Find app: fitnessmealplanner-prod
# Click "Deploy" or "Force Rebuild and Deploy"
```

### Method 2: Manual Deployment (Network Issues Fallback)

If Docker push fails due to network/proxy issues:

#### Step 1: Build Image Locally
```bash
docker build --target prod -t fitnessmealplanner:prod .
```

#### Step 2: Manual Registry Upload
1. **Navigate to DigitalOcean Dashboard**:
   - URL: https://cloud.digitalocean.com/apps
   - App ID: `600abc04-b784-426c-8799-0c09f8b9a958`
   - App Name: `fitnessmealplanner-prod`

2. **Trigger Manual Deployment**:
   - Click on the app name
   - Look for "Deploy" button (blue, top-right)
   - Or use "Actions" → "Force Rebuild and Deploy"
   - Confirm deployment when prompted

3. **Monitor Deployment**:
   - Watch progress (typically 3-5 minutes)
   - Check logs for any errors
   - Verify successful completion

### Method 3: Local Docker Compose (Development/Testing)

```bash
# Start production stack locally
docker-compose --profile prod up -d

# Verify containers are running
docker ps

# Check logs
docker logs fitnessmealplanner-prod -f

# Access application
# Frontend: http://localhost:5001
# Database: localhost:5433
```

## Manual Deployment Process

### Step 1: Prepare Production Server
```bash
# SSH into production server
ssh user@your-production-server

# Navigate to application directory
cd /path/to/your/app

# Backup current version
cp -r . ../backup-$(date +%Y%m%d-%H%M%S)
```

### Step 2: Deploy Code
```bash
# Pull latest changes
git fetch origin
git checkout qa-ready
git pull origin qa-ready

# Install dependencies
npm ci --only=production

# Build application
npm run build
```

### Step 3: Database Setup
```bash
# Run database migrations (if any)
npm run migrate

# Verify database connection
npm run setup:check
```

### Step 4: Start Services
```bash
# Stop existing services
pm2 stop fitnessmealplanner
# OR
sudo systemctl stop fitnessmealplanner

# Start new version
pm2 start ecosystem.config.js
# OR
sudo systemctl start fitnessmealplanner

# Enable auto-start
pm2 save
# OR
sudo systemctl enable fitnessmealplanner
```

## Database Migration

### Current Release (v1.1.0)
**No database migrations required** - all changes are backwards compatible.

### Future Migrations
If database changes are needed:

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Run migration
npm run migrate

# 3. Verify migration
npm run setup:check
```

### Migration Rollback
```bash
# If migration fails, restore from backup
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
```

## Post-Deployment Verification

### Health Checks
```bash
# 1. Verify application is responding
curl -f https://yourdomain.com/health || echo "Health check failed"

# 2. Check database connectivity
curl -f https://yourdomain.com/api/health || echo "API health check failed"

# 3. Test authentication
curl -f https://yourdomain.com/api/auth/status || echo "Auth check failed"
```

### Functional Testing
```bash
# Run automated E2E tests against production
npm run test:playwright -- --config=playwright.production.config.ts

# Test critical user flows
npm run test:business-logic
```

### Performance Verification
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] No console errors in browser
- [ ] Memory usage within normal ranges
- [ ] CPU usage stable

### Feature-Specific Checks
- [ ] Recipe generation progress tracking works
- [ ] Bulk operations function correctly
- [ ] Pagination loads properly
- [ ] View toggles work (card/table)
- [ ] PDF export generates successfully
- [ ] Image uploads work (if S3 configured)

## Rollback Procedures

### Quick Rollback (Critical Issues)
```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Revert to previous version
git reset --hard <previous-commit-hash>

# 3. Rebuild and restart
npm run build
pm2 restart fitnessmealplanner
```

### Docker Rollback
```bash
# 1. List recent image tags
docker images fitnessmealplanner

# 2. Run previous version
docker stop fitnessmealplanner-prod
docker run -d --name fitnessmealplanner-prod-rollback \
  -p 5001:5001 \
  --env-file .env \
  fitnessmealplanner:<previous-tag>
```

### Database Rollback
```bash
# Only if database changes were made
psql $DATABASE_URL < backup-before-deployment.sql
```

### Emergency Rollback Checklist
- [ ] Stop current application
- [ ] Restore previous code version
- [ ] Restore database (if needed)
- [ ] Restart services
- [ ] Verify functionality
- [ ] Update DNS/load balancer (if needed)
- [ ] Notify stakeholders

## Troubleshooting

### Common Issues

#### Issue: Docker build fails
```bash
# Check Docker daemon
docker info

# Clear build cache
docker builder prune

# Rebuild with verbose output
docker build --no-cache --progress=plain -t fitnessmealplanner:prod .
```

#### Issue: Database connection fails
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check SSL requirements
psql "$DATABASE_URL?sslmode=require" -c "SELECT version();"
```

#### Issue: npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### Issue: Port already in use
```bash
# Find process using port
lsof -i :5001

# Kill process
kill -9 <PID>

# Or use different port
PORT=5002 npm start
```

#### Issue: Permission denied
```bash
# Fix file permissions
chmod -R 755 .
chown -R $USER:$USER .

# For Docker
sudo usermod -aG docker $USER
```

### Performance Issues
```bash
# Check memory usage
free -h
df -h

# Check application logs
tail -f logs/application.log

# Monitor in real-time
htop
```

### Logging and Monitoring
```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Database logs (if accessible)
tail -f /var/log/postgresql/postgresql.log

# System logs
journalctl -u fitnessmealplanner -f
```

## Recovery Time Objectives

- **Rollback Time**: < 10 minutes for critical issues
- **Full Deployment**: < 30 minutes including verification
- **Database Restoration**: < 15 minutes for schema issues
- **Service Recovery**: < 5 minutes for application restarts

## Emergency Contacts

- **Development Team**: [Contact Information]
- **Infrastructure Team**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **On-call Engineer**: [Contact Information]

## Production URLs

- **Application**: https://evofitmeals.com
- **Admin Panel**: https://evofitmeals.com/admin
- **API Health**: https://evofitmeals.com/api/health
- **DigitalOcean App**: https://cloud.digitalocean.com/apps (App ID: 600abc04-b784-426c-8799-0c09f8b9a958)

---

**Note**: This deployment guide is version-controlled and should be updated with each release. Always refer to the latest version in the qa-ready branch before deployment.
