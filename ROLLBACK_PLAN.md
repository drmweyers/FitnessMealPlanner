# FitnessMealPlanner Rollback Plan

This document provides comprehensive emergency procedures and recovery steps for the FitnessMealPlanner application in case of deployment issues or critical failures.

## Table of Contents
- [Emergency Contact Information](#emergency-contact-information)
- [Quick Rollback Procedures](#quick-rollback-procedures)
- [Rollback Decision Matrix](#rollback-decision-matrix)
- [Step-by-Step Rollback Guide](#step-by-step-rollback-guide)
- [Database Rollback Procedures](#database-rollback-procedures)
- [Verification and Testing](#verification-and-testing)
- [Post-Rollback Actions](#post-rollback-actions)
- [Prevention Strategies](#prevention-strategies)

## Emergency Contact Information

### Primary Contacts
- **Development Team Lead**: [Contact Information]
- **DevOps Engineer**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **Product Owner**: [Contact Information]

### Escalation Chain
1. **Level 1**: Development Team (Response time: 15 minutes)
2. **Level 2**: Senior Engineer (Response time: 30 minutes)
3. **Level 3**: Technical Lead (Response time: 1 hour)
4. **Level 4**: CTO/Management (Response time: 2 hours)

### Communication Channels
- **Slack**: #emergency-response
- **Email**: emergency@yourdomain.com
- **Phone**: Emergency hotline number
- **Status Page**: https://status.evofitmeals.com

## Quick Rollback Procedures

### Immediate Actions (0-5 minutes)

#### 1. Assess Severity
```bash
# Quick health check
curl -f https://evofitmeals.com/api/health || echo "CRITICAL: API DOWN"
curl -f https://evofitmeals.com || echo "CRITICAL: FRONTEND DOWN"

# Check error rates
tail -n 50 /var/log/application.log | grep ERROR | wc -l
```

#### 2. Emergency Stop (if necessary)
```bash
# Stop application immediately if causing data corruption
docker stop fitnessmealplanner-prod
# OR
pm2 stop fitnessmealplanner
# OR
sudo systemctl stop fitnessmealplanner
```

#### 3. Enable Maintenance Mode
```bash
# Deploy maintenance page
cp maintenance.html /var/www/html/index.html
# OR update load balancer to show maintenance page
```

### Fast Rollback (5-10 minutes)

#### Docker Rollback
```bash
# 1. Find previous working image
docker images fitnessmealplanner --format "table {{.Tag}}\t{{.CreatedAt}}"

# 2. Stop current container
docker stop fitnessmealplanner-prod

# 3. Start previous version
docker run -d --name fitnessmealplanner-prod-rollback \
  -p 5001:5001 \
  --env-file .env \
  --restart unless-stopped \
  fitnessmealplanner:<previous-tag>

# 4. Verify rollback
curl -f https://evofitmeals.com/api/health
```

#### Git Rollback
```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Create rollback branch
git checkout -b emergency-rollback-$(date +%Y%m%d-%H%M)

# 3. Revert to previous version
git reset --hard <last-good-commit>

# 4. Force deploy (if using git-based deployment)
git push --force-with-lease origin main
```

## Rollback Decision Matrix

### Severity Levels

#### Level 1: Critical (Immediate Rollback)
- **Conditions**:
  - Application completely down
  - Data corruption detected
  - Security breach identified
  - > 50% error rate
- **Action**: Immediate rollback within 5 minutes
- **Authority**: Any engineer can initiate

#### Level 2: High (Rollback within 15 minutes)
- **Conditions**:
  - Major feature broken
  - 20-50% error rate
  - Performance degradation > 50%
  - Multiple customer complaints
- **Action**: Rollback within 15 minutes
- **Authority**: Senior engineer approval required

#### Level 3: Medium (Consider rollback within 1 hour)
- **Conditions**:
  - Minor feature issues
  - 5-20% error rate
  - Performance degradation 20-50%
  - Single feature impact
- **Action**: Evaluate fix vs. rollback
- **Authority**: Team lead decision

#### Level 4: Low (No immediate rollback)
- **Conditions**:
  - Cosmetic issues
  - < 5% error rate
  - Minor performance impact
  - Non-critical features affected
- **Action**: Fix in next deployment
- **Authority**: Developer decision

### Decision Flowchart
```
Issue Detected
    ↓
Is the application down? → YES → Level 1: Immediate Rollback
    ↓ NO
Are users unable to complete core actions? → YES → Level 2: Quick Rollback
    ↓ NO
Is there significant performance degradation? → YES → Level 3: Evaluate
    ↓ NO
Level 4: Monitor and Fix
```

## Step-by-Step Rollback Guide

### Pre-Rollback Checklist
- [ ] Issue severity assessed and documented
- [ ] Stakeholders notified
- [ ] Backup verification completed
- [ ] Rollback method selected
- [ ] Team members assigned roles

### Docker Deployment Rollback

#### Step 1: Preparation (2 minutes)
```bash
# Create emergency response directory
mkdir -p /tmp/emergency-$(date +%Y%m%d-%H%M)
cd /tmp/emergency-$(date +%Y%m%d-%H%M)

# Log current system state
docker ps > current-containers.log
docker images > current-images.log
curl -s https://evofitmeals.com/api/health > current-health.json
```

#### Step 2: Database Backup (3 minutes)
```bash
# Quick database backup before rollback
pg_dump $DATABASE_URL > emergency-backup-$(date +%Y%m%d-%H%M).sql

# Verify backup
file emergency-backup-*.sql
```

#### Step 3: Application Rollback (5 minutes)
```bash
# Stop current application
docker stop fitnessmealplanner-prod
docker rename fitnessmealplanner-prod fitnessmealplanner-failed-$(date +%Y%m%d-%H%M)

# Start previous version
PREVIOUS_TAG=$(docker images fitnessmealplanner --format "{{.Tag}}" | sed -n '2p')
echo "Rolling back to tag: $PREVIOUS_TAG"

docker run -d \
  --name fitnessmealplanner-prod \
  -p 5001:5001 \
  --env-file .env \
  --restart unless-stopped \
  fitnessmealplanner:$PREVIOUS_TAG
```

#### Step 4: Verification (2 minutes)
```bash
# Wait for application to start
sleep 30

# Verify health
curl -f https://evofitmeals.com/api/health || echo "Rollback verification failed"

# Check logs
docker logs fitnessmealplanner-prod --tail 20
```

### Manual Deployment Rollback

#### Step 1: Preparation
```bash
# Navigate to application directory
cd /var/www/fitnessmealplanner

# Backup current state
cp -r . ../backup-failed-$(date +%Y%m%d-%H%M)
```

#### Step 2: Git Rollback
```bash
# Find last known good commit
git log --oneline -10

# Checkout previous version
git checkout <last-good-commit>

# Alternative: Use previous release tag
git checkout v1.0.0
```

#### Step 3: Rebuild and Deploy
```bash
# Install dependencies (if needed)
npm ci --only=production

# Build application
npm run build

# Restart services
pm2 restart fitnessmealplanner
# OR
sudo systemctl restart fitnessmealplanner
```

### DigitalOcean App Platform Rollback

#### Method 1: Dashboard Rollback
1. **Navigate** to https://cloud.digitalocean.com/apps
2. **Find** fitnessmealplanner-prod app
3. **Click** "Deployments" tab
4. **Select** previous successful deployment
5. **Click** "Redeploy" with previous version

#### Method 2: Registry Rollback
```bash
# Push previous image tag to trigger rollback
docker pull registry.digitalocean.com/bci/fitnessmealplanner:previous-tag
docker tag registry.digitalocean.com/bci/fitnessmealplanner:previous-tag \
  registry.digitalocean.com/bci/fitnessmealplanner:prod
docker push registry.digitalocean.com/bci/fitnessmealplanner:prod
```

## Database Rollback Procedures

### When Database Rollback is Needed
- Schema changes that break the application
- Data corruption from faulty migrations
- Performance issues from database changes

### Database Rollback Steps

#### Step 1: Stop Application
```bash
# Prevent further database writes
docker stop fitnessmealplanner-prod
```

#### Step 2: Assess Database State
```bash
# Check recent database changes
psql $DATABASE_URL -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Check for recent data changes
psql $DATABASE_URL -c "
SELECT count(*) as recent_recipes 
FROM recipes 
WHERE created_at > NOW() - INTERVAL '1 hour';"
```

#### Step 3: Database Backup (Current State)
```bash
# Backup current database state before rollback
pg_dump $DATABASE_URL > pre-rollback-backup-$(date +%Y%m%d-%H%M).sql
```

#### Step 4: Restore Previous Backup
```bash
# Restore from pre-deployment backup
psql $DATABASE_URL < backup-before-deployment.sql

# OR use point-in-time recovery (if available)
# Contact database administrator for PITR procedures
```

#### Step 5: Verify Database State
```bash
# Check database health
psql $DATABASE_URL -c "SELECT version();"

# Verify data integrity
psql $DATABASE_URL -c "
SELECT 
  COUNT(*) as total_recipes,
  COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_recipes,
  MAX(created_at) as latest_recipe
FROM recipes;"
```

### Database Rollback Checklist
- [ ] Application stopped to prevent writes
- [ ] Current database state backed up
- [ ] Previous backup restored successfully
- [ ] Data integrity verified
- [ ] Application restarted with previous version
- [ ] Full system verification completed

## Verification and Testing

### Post-Rollback Verification Checklist

#### Application Health
- [ ] Application starts successfully
- [ ] Health check endpoints responding
- [ ] No error logs in application
- [ ] Previous functionality working

#### Database Verification
- [ ] Database connection successful
- [ ] Core data queries working
- [ ] No data corruption detected
- [ ] Recent changes preserved (if possible)

#### User Functionality
- [ ] User authentication working
- [ ] Recipe management functional
- [ ] Meal plan generation operational
- [ ] PDF export working
- [ ] Admin interface accessible

#### Performance Verification
- [ ] Response times within normal ranges
- [ ] Memory usage stable
- [ ] CPU usage normal
- [ ] No resource leaks detected

### Verification Commands
```bash
# Application health
curl -f https://evofitmeals.com/api/health
curl -f https://evofitmeals.com/api/auth/status

# Test core functionality
curl -f https://evofitmeals.com/api/recipes?limit=5
curl -f https://evofitmeals.com/api/meal-plans

# Check error rates
tail -n 100 /var/log/application.log | grep ERROR | wc -l

# Performance check
time curl -s https://evofitmeals.com > /dev/null
```

### User Acceptance Testing
1. **Admin Login**: Verify admin can access admin panel
2. **Recipe Management**: Test recipe creation and approval
3. **Meal Plan Generation**: Generate a test meal plan
4. **PDF Export**: Export meal plan to PDF
5. **Customer Flow**: Test customer registration and login

## Post-Rollback Actions

### Immediate Actions (within 1 hour)

#### 1. Stakeholder Communication
```markdown
**ROLLBACK NOTIFICATION**

Subject: Production Rollback Completed - Service Restored

Team,

We have successfully completed a rollback of the FitnessMealPlanner application due to [issue description].

Status: ✅ Service Restored
Rollback Time: [timestamp]
Previous Version: v1.0.0
Impact Duration: [duration]

Next Steps:
- Root cause analysis in progress
- Fix development planned
- Timeline update within 4 hours

Contact: [emergency contact] for questions
```

#### 2. Monitoring Enhancement
```bash
# Increase monitoring frequency
# Monitor application health every 1 minute for next 2 hours
watch -n 60 'curl -s https://evofitmeals.com/api/health'

# Monitor error logs continuously
tail -f /var/log/application.log | grep -E "(ERROR|WARN|CRITICAL)"
```

#### 3. System Stabilization
- Monitor application performance for 2+ hours
- Verify no cascading failures
- Ensure all services are stable
- Check database performance

### Follow-up Actions (within 24 hours)

#### 1. Root Cause Analysis
- Identify what caused the issue
- Document timeline of events
- Analyze logs and error patterns
- Interview team members involved

#### 2. Incident Documentation
```markdown
**INCIDENT REPORT**

Incident ID: INC-[date]-001
Date: [date]
Duration: [start] - [end]
Severity: [level]

Timeline:
- [time]: Issue detected
- [time]: Rollback initiated
- [time]: Service restored

Root Cause: [detailed analysis]
Impact: [user impact assessment]
Resolution: [rollback details]

Action Items:
1. [prevention item 1] - Owner: [name] - Due: [date]
2. [prevention item 2] - Owner: [name] - Due: [date]
```

#### 3. Prevention Planning
- Update deployment procedures
- Improve testing coverage
- Enhance monitoring
- Review rollback procedures

### Long-term Actions (within 1 week)

#### 1. Process Improvements
- Update deployment checklist
- Enhance automated testing
- Improve monitoring alerting
- Review approval processes

#### 2. Team Training
- Review rollback procedures with team
- Practice emergency scenarios
- Update documentation
- Improve communication protocols

## Prevention Strategies

### Pre-Deployment Prevention

#### 1. Enhanced Testing
```bash
# Comprehensive test suite before deployment
npm run test:all
npm run test:integration
npm run test:e2e
npm run test:performance
```

#### 2. Staging Environment Validation
- Deploy to staging first
- Run full test suite in staging
- Performance testing in staging
- Security scanning before production

#### 3. Gradual Deployment
- Blue-green deployment strategy
- Canary releases for major changes
- Feature flags for new functionality
- A/B testing for UI changes

### Monitoring and Alerting

#### 1. Enhanced Monitoring
```yaml
# Monitoring alerts configuration
alerts:
  - name: application_down
    condition: http_status != 200
    threshold: 3_consecutive_failures
    action: immediate_notification
    
  - name: high_error_rate
    condition: error_rate > 5%
    threshold: 5_minutes
    action: escalate_to_on_call
    
  - name: slow_response_time
    condition: response_time > 2_seconds
    threshold: 10_minutes
    action: notify_development_team
```

#### 2. Automated Health Checks
```bash
# Automated health monitoring
#!/bin/bash
while true; do
  if ! curl -f https://evofitmeals.com/api/health > /dev/null 2>&1; then
    echo "ALERT: Health check failed at $(date)"
    # Send notification
  fi
  sleep 60
done
```

### Backup and Recovery Preparation

#### 1. Automated Backups
```bash
# Daily automated backups
0 2 * * * pg_dump $DATABASE_URL > /backups/daily-$(date +\%Y\%m\%d).sql
0 2 * * 0 pg_dump $DATABASE_URL > /backups/weekly-$(date +\%Y\%U).sql
```

#### 2. Backup Verification
```bash
# Weekly backup verification
#!/bin/bash
LATEST_BACKUP=$(ls -t /backups/daily-*.sql | head -1)
if psql test_database < $LATEST_BACKUP; then
  echo "Backup verification successful"
else
  echo "ALERT: Backup verification failed"
fi
```

## Recovery Time Objectives

### Target Recovery Times
- **Critical Issues**: < 5 minutes
- **High Priority**: < 15 minutes
- **Medium Priority**: < 1 hour
- **Low Priority**: < 4 hours

### Service Level Objectives
- **Uptime**: 99.9% (8.76 hours downtime per year)
- **Response Time**: < 2 seconds for 95% of requests
- **Error Rate**: < 0.1% for all requests

---

## Emergency Procedures Quick Reference

### Critical Issue Response
1. **Assess** (1 min): Confirm issue severity
2. **Stop** (1 min): Stop application if needed
3. **Backup** (3 min): Quick database backup
4. **Rollback** (5 min): Execute rollback procedure
5. **Verify** (3 min): Confirm rollback success
6. **Communicate** (2 min): Notify stakeholders

### Contact Tree
```
Issue Detected
    ↓
Development Team (15 min response)
    ↓ (if unavailable)
Senior Engineer (30 min response)
    ↓ (if unavailable)
Technical Lead (1 hour response)
    ↓ (if unavailable)
CTO/Management (2 hour response)
```

---

This rollback plan should be reviewed and updated quarterly to ensure all procedures remain current and effective.