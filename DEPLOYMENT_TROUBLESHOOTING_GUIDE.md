# Deployment Troubleshooting Guide
## Comprehensive Problem Resolution for DigitalOcean Container Registry Deployments

**Based on successful Health Protocol removal deployment analysis and common issues**

---

## 🎯 Overview

This guide provides detailed troubleshooting procedures for common deployment issues, with specific solutions tested during our production deployments. Each issue includes symptoms, root causes, and step-by-step resolution procedures.

---

## 🚨 Critical Issue: Docker Push Appears to Timeout But Actually Succeeds

### Symptoms
- `docker push` command appears to hang or timeout
- No clear success/failure message
- Uncertainty about whether registry was updated
- Deployment status unclear

### Root Cause Analysis
**Key Finding**: Registry push can complete successfully even when the Docker CLI doesn't provide clear feedback due to network proxy/firewall configurations.

### Resolution Procedure
```bash
# Step 1: Don't panic - check registry directly
doctl registry repository list-tags fitnessmealplanner

# Step 2: Look for updated timestamp on 'prod' tag
# Example successful output:
# Tag    Compressed Size    Updated At                       Manifest Digest
# prod   4.95 kB           2025-08-20 21:05:14 +0000 UTC    sha256:f0167...

# Step 3: If timestamp is recent (within last 10 minutes), push was successful
# Step 4: Check if auto-deployment was triggered
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958

# Step 5: Look for "Updated At" timestamp change - indicates deployment triggered
```

### Prevention
- Monitor registry timestamps during push
- Use verbose Docker output: `docker push --verbose`
- Set up registry push notifications if possible

---

## ⏰ Deployment Timing and Verification Issues

### Issue: Premature Deployment Verification
**Symptom**: Checking production too quickly after push, before deployment completes

### Resolution Protocol
```bash
# Wait Strategy: 7-10 minute deployment window
echo "Registry push completed at: $(date)"
echo "Waiting 7 minutes for deployment to complete..."

# Monitor deployment progress every 60 seconds
for i in {1..7}; do
  echo "Minute $i: Checking deployment status..."
  doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958 | grep "Updated At"
  sleep 60
done

echo "Deployment window complete - safe to verify"
```

### Issue: Deployment Status Confusion  
**Symptom**: Unclear whether deployment is complete or still in progress

### Status Interpretation Guide
```bash
# Command to check deployment status
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958

# Status Indicators:
# 1. "Updated At" timestamp = Last deployment trigger time
# 2. "Active Deployment ID" = Currently running deployment
# 3. "In Progress Deployment ID" = blank means no active deployment

# Get detailed deployment status
doctl apps get-deployment 600abc04-b784-426c-8799-0c09f8b9a958 <deployment-id>
# Look for: Progress: 7/7, Phase: ACTIVE
```

---

## 🏗️ Docker Build and Registry Issues

### Issue: Docker Build Fails - Missing Dependencies
```bash
# Symptom: Build fails during dependency installation
# Error: Cannot find module 'xyz' or package not found

# Solution 1: Clear Docker cache and rebuild
docker builder prune -a
docker build --target prod --no-cache -t fitnessmealplanner:prod .

# Solution 2: Check package.json vs package-lock.json consistency
npm install  # Regenerate lock file if needed

# Solution 3: Verify Dockerfile COPY commands
# Ensure package.json is copied before npm install
```

### Issue: Registry Authentication Failure
```bash
# Symptom: "unauthorized: authentication required"
# Error during docker push command

# Solution 1: Re-authenticate with DigitalOcean
doctl registry login

# Solution 2: Check token validity
doctl auth list
doctl account get  # Should return account info

# Solution 3: Manual authentication if doctl fails
echo "$DIGITALOCEAN_TOKEN" | docker login registry.digitalocean.com -u bci --password-stdin

# Solution 4: Verify registry exists
doctl registry get
```

### Issue: Image Build Succeeds But Push Fails
```bash
# Symptom: Local build works, but registry push fails

# Diagnostic commands
docker images | grep fitnessmealplanner  # Verify image exists locally
docker tag fitnessmealplanner:prod registry.digitalocean.com/bci/fitnessmealplanner:prod
docker push registry.digitalocean.com/bci/fitnessmealplanner:prod --verbose

# If push still fails, check network connectivity
curl -I https://registry.digitalocean.com
ping registry.digitalocean.com

# Alternative: Use doctl to create deployment directly
doctl apps create-deployment 600abc04-b784-426c-8799-0c09f8b9a958
```

---

## 🔄 Auto-Deployment Issues

### Issue: Registry Push Succeeds But Deployment Doesn't Trigger
```bash
# Symptom: Registry shows updated image but app doesn't deploy

# Step 1: Verify auto-deployment is enabled
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958 | grep -i "auto"

# Step 2: Check if deployment is stuck
doctl apps list-deployments 600abc04-b784-426c-8799-0c09f8b9a958

# Step 3: Manual deployment trigger if needed
doctl apps create-deployment 600abc04-b784-426c-8799-0c09f8b9a958

# Step 4: Check deployment logs for errors
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type build
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type run
```

### Issue: Deployment Stuck in Progress
```bash
# Symptom: Deployment shows "In Progress" for >15 minutes

# Step 1: Check deployment details
doctl apps get-deployment 600abc04-b784-426c-8799-0c09f8b9a958 <deployment-id>

# Step 2: Check for resource constraints
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type build | tail -50

# Step 3: If truly stuck, cancel and retry
doctl apps cancel-deployment 600abc04-b784-426c-8799-0c09f8b9a958
doctl apps create-deployment 600abc04-b784-426c-8799-0c09f8b9a958
```

---

## 🗄️ Database and Migration Issues

### Issue: Database Migration Failures During Deployment
```bash
# Symptom: Deployment fails during database migration phase

# Step 1: Check migration logs
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type run | grep -i migration

# Step 2: Verify database connectivity
# Use a database client to connect to production DB
# Connection string from DigitalOcean dashboard

# Step 3: Check if migrations can be run manually
# Connect to database and check migration status

# Step 4: Rollback if migrations are problematic
# Use previous deployment or manual database rollback
```

### Issue: Database Connection Timeouts
```bash
# Symptom: App starts but can't connect to database

# Check database cluster status
doctl databases list
doctl databases get <database-id>

# Check connection pool settings in application
# Verify DATABASE_URL environment variable

# Monitor database connections
doctl databases get-connection-info <database-id>
```

---

## 🌐 Network and Connectivity Issues

### Issue: Production App Returns 502/503 Errors
```bash
# Symptom: evofitmeals.com returns server errors

# Step 1: Check app status
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958

# Step 2: Check application logs
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type run | tail -100

# Step 3: Check health endpoints
curl -v https://evofitmeals.com/api/health  # If health endpoint exists
curl -v https://evofitmeals.com  # Basic connectivity

# Step 4: Verify all environment variables are set
# Check DigitalOcean dashboard app settings
```

### Issue: DNS/CDN Caching Problems
```bash
# Symptom: Old version still visible after successful deployment

# Step 1: Check direct app URL (bypasses CDN)
curl -H "Cache-Control: no-cache" https://fitnessmealplanner-prod-vt7ek.ondigitalocean.app

# Step 2: Clear browser cache or test in incognito
# Step 3: Check CDN settings if using custom domain

# Step 4: Force browser refresh
# Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
```

---

## 🔒 Security and Authentication Issues

### Issue: Environment Variables Not Loading
```bash
# Symptom: App starts but features fail due to missing env vars

# Check environment variables in DigitalOcean dashboard
# Apps → fitnessmealplanner-prod → Settings → Environment Variables

# Common missing variables:
# - JWT_SECRET
# - OPENAI_API_KEY  
# - AWS_ACCESS_KEY_ID
# - RESEND_API_KEY

# Test specific functionality that depends on env vars
curl -X POST https://evofitmeals.com/api/auth/login -d '{"email":"test","password":"test"}'
```

### Issue: SSL/HTTPS Certificate Problems
```bash
# Symptom: HTTPS not working or certificate errors

# Check certificate status
curl -vI https://evofitmeals.com 2>&1 | grep -i certificate

# DigitalOcean manages SSL automatically, but check:
# Apps → fitnessmealplanner-prod → Settings → Domain → SSL Certificate

# Force SSL renewal if needed (contact DigitalOcean support)
```

---

## 🧪 Testing and Verification Troubleshooting

### Issue: Production Tests Fail After Deployment
```bash
# Symptom: Basic functionality doesn't work in production

# Step 1: Test authentication
curl -X POST https://evofitmeals.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@evofitmeals.com","password":"your-password"}'

# Step 2: Test API endpoints
curl -H "Authorization: Bearer <token>" https://evofitmeals.com/api/recipes

# Step 3: Test database connectivity
# Login to app and check if data loads

# Step 4: Check browser developer console for errors
# Look for JavaScript errors, network failures, etc.
```

### Issue: Feature Removal Not Complete
```bash
# Symptom: Removed features still accessible or causing errors

# Step 1: Test removed endpoints directly
curl -I https://evofitmeals.com/trainer/health-protocols
# Should return: HTTP 404 Not Found

# Step 2: Check for frontend route cleanup
# View page source and search for removed feature references

# Step 3: Check database queries for removed feature calls
# Monitor application logs for references to removed features
```

---

## 🔧 Emergency Recovery Procedures

### Emergency Rollback to Previous Version
```bash
# Step 1: Identify previous working deployment
doctl apps list-deployments 600abc04-b784-426c-8799-0c09f8b9a958

# Step 2: Get previous image tag from registry
doctl registry repository list-tags fitnessmealplanner

# Step 3: Re-tag and push previous version
docker pull registry.digitalocean.com/bci/fitnessmealplanner:<previous-tag>
docker tag registry.digitalocean.com/bci/fitnessmealplanner:<previous-tag> \
           registry.digitalocean.com/bci/fitnessmealplanner:prod
docker push registry.digitalocean.com/bci/fitnessmealplanner:prod

# Step 4: Monitor rollback deployment
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958
```

### Database Rollback (If Needed)
```bash
# WARNING: Only if database migrations caused issues
# This requires database backup restoration
# Contact database administrator or DigitalOcean support

# Step 1: Stop application
doctl apps cancel-deployment 600abc04-b784-426c-8799-0c09f8b9a958

# Step 2: Restore database backup (requires manual intervention)
# Step 3: Deploy previous application version
# Step 4: Verify functionality
```

---

## 📋 Diagnostic Command Reference

### Quick Status Check Commands
```bash
# Overall app status
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958

# Registry status
doctl registry repository list-tags fitnessmealplanner

# Recent deployments
doctl apps list-deployments 600abc04-b784-426c-8799-0c09f8b9a958 | head -5

# Application logs (last 100 lines)
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type run | tail -100

# Build logs (if build issues)
doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958 --type build | tail -100
```

### Network Connectivity Tests
```bash
# Basic connectivity
ping registry.digitalocean.com
curl -I https://registry.digitalocean.com

# Production app connectivity
curl -I https://evofitmeals.com
curl -I https://fitnessmealplanner-prod-vt7ek.ondigitalocean.app

# API connectivity
curl -I https://evofitmeals.com/api/health  # If health endpoint exists
```

### Database Connectivity Tests
```bash
# Check database cluster
doctl databases list
doctl databases get <database-id>

# Test connection (requires connection string)
# Use your preferred PostgreSQL client
psql "$DATABASE_URL" -c "SELECT 1;"
```

---

## 📊 Troubleshooting Decision Tree

### When Deployment Appears to Fail

1. **Check registry first**: `doctl registry repository list-tags fitnessmealplanner`
   - If updated timestamp is recent → Push succeeded, wait for deployment
   - If no recent timestamp → Push failed, retry push

2. **Check deployment status**: `doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958`
   - If "Updated At" is recent → Deployment triggered
   - If no recent update → Auto-deployment failed, manual trigger needed

3. **Wait appropriate time**: 7-10 minutes for full deployment
   - Monitor with `doctl apps get-deployment`
   - Check Progress: X/7 and Phase: status

4. **Verify production**: Test actual functionality
   - HTTP status codes
   - Core features
   - Database connectivity
   - Removed features return 404

5. **If still failing**: Check logs and consider rollback
   - `doctl apps logs` for detailed error information
   - Emergency rollback if critical

---

## 📞 Escalation Procedures

### When to Escalate
- Database corruption or data loss
- Complete application downtime >15 minutes
- Security breach suspected
- Infrastructure failures outside app control

### Internal Escalation
1. **Level 1**: Development team troubleshooting (this guide)
2. **Level 2**: Senior developer review and advanced diagnostics  
3. **Level 3**: Infrastructure team (DigitalOcean support if needed)

### External Support
- **DigitalOcean Support**: For infrastructure, database, or platform issues
- **Registry Issues**: DigitalOcean Container Registry support
- **DNS/CDN Issues**: Domain provider support

---

## 📝 Post-Incident Documentation

### Required Information for Post-Mortem
- Timeline of events
- Commands executed and outputs
- Error messages and logs
- Resolution steps taken
- Time to resolution
- Impact assessment
- Prevention recommendations

### Learning Integration
- Update this troubleshooting guide with new issues
- Improve deployment procedures based on lessons learned
- Add monitoring/alerting to prevent recurrence
- Training updates for team members

---

**Last Updated**: August 20, 2025  
**Based On**: Health Protocol Removal Deployment Analysis  
**Next Review**: After next incident or monthly review cycle