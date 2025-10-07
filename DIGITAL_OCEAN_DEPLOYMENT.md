# Digital Ocean Production Deployment Guide

## 🚀 Digital Ocean Deployment Strategy for FitnessMealPlanner

### Prerequisites

1. **Digital Ocean Account** with access to:
   - App Platform (for application hosting)
   - Managed PostgreSQL Database (for production database)
   - Spaces (for file storage - profile images)

2. **GitHub Repository** with qa-ready branch

3. **Environment Variables** configured for production

## Deployment Steps

### Step 1: Create Digital Ocean PostgreSQL Database

1. **Login to Digital Ocean Dashboard**
2. **Navigate to Databases** → Create Database
3. **Configure Database**:
   - Engine: PostgreSQL
   - Version: 14+
   - Plan: Basic ($15/month minimum for production)
   - Region: Choose closest to your users
   - Database Name: `fitmeal`
   - User: `postgres` (or custom user)

4. **Note Database Connection Details**:
   - Host, Port, Username, Password, Database Name
   - Connection String format: `postgresql://username:password@host:port/database?sslmode=require`

### Step 2: Create Digital Ocean App Platform Application

1. **Navigate to App Platform** → Create App
2. **Connect GitHub Repository**:
   - Select your FitnessMealPlanner repository
   - Choose `qa-ready` branch
   - Auto-deploy on branch updates: ✅

3. **Configure Application Settings**:
   - **Name**: `fitnessmealplanner-prod`
   - **Region**: Same as database
   - **Plan**: Professional ($12/month minimum)
   - **Instance Count**: 1 (can scale later)

### Step 3: Configure Environment Variables

In App Platform → Settings → Environment Variables, add:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@your-db-host:25060/fitmeal?sslmode=require

# Application Configuration
NODE_ENV=production
PORT=8080

# OpenAI API (for recipe generation)
OPENAI_API_KEY=sk-proj-your-openai-key

# JWT Secrets
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret

# Session Configuration
SESSION_SECRET=your-session-secret
COOKIE_SECRET=your-cookie-secret

# Email Configuration (Resend)
RESEND_API_KEY=re_your-resend-key
FROM_EMAIL="EvoFitMeals <evofitmeals@bcinnovationlabs.com>"

# AWS S3 Configuration (for profile images)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=fitnessmealplanner-uploads

# Frontend URL (for CORS)
FRONTEND_URL=https://your-app-name.ondigitalocean.app
```

### Step 4: Configure Build & Run Settings

**Build Command:**
```bash
npm ci && npm run build
```

**Run Command:**
```bash
npm start
```

**Dockerfile (Alternative)**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 8080

# Start application
CMD ["npm", "start"]
```

### Step 5: Configure Custom Domain (Optional)

1. **In App Platform** → Settings → Domains
2. **Add Domain**: `yourdomain.com`
3. **Update DNS Records** at your domain provider:
   - Add CNAME record pointing to your App Platform URL
4. **SSL Certificate**: Automatically provisioned by Digital Ocean

### Step 6: Database Migration & Setup

After deployment, the application will automatically run database migrations. You can verify by:

1. **Check App Logs** in Digital Ocean Dashboard
2. **Verify Tables Created** using database console
3. **Create Admin User** (if needed):

```bash
# Connect to your app's console and run:
npm run create-admin
```

### Step 7: Configure File Storage

For profile images, set up Digital Ocean Spaces:

1. **Create Spaces Bucket**:
   - Name: `fitnessmealplanner-uploads`
   - Region: Same as your app
   - CDN: Enable for faster image delivery

2. **Update Environment Variables**:
```bash
AWS_S3_BUCKET=fitnessmealplanner-uploads
AWS_ENDPOINT=https://nyc3.digitaloceanspaces.com  # Adjust for your region
```

## Production Checklist

### ✅ Pre-Deployment
- [ ] All tests passing on qa-ready branch
- [ ] Environment variables configured
- [ ] Database created and accessible
- [ ] Domain DNS configured (if using custom domain)
- [ ] SSL certificate ready

### ✅ Post-Deployment Verification
- [ ] Application loads at production URL
- [ ] Database connection successful
- [ ] User authentication working
- [ ] Recipe generation functional
- [ ] PDF export working
- [ ] Profile image upload functional
- [ ] Email sending working
- [ ] All API endpoints responding

### ✅ Security Configuration
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Database SSL required
- [ ] Secrets properly configured

## Monitoring & Maintenance

### Health Checks
Access your health check endpoint:
```
GET https://your-app.ondigitalocean.app/api/health
```

### Log Monitoring
- Digital Ocean provides built-in log aggregation
- Monitor for errors, performance issues, and security events
- Set up alerts for critical failures

### Database Backups
- Digital Ocean automatically backs up managed databases
- Consider additional backups for critical data
- Test restore procedures regularly

### Performance Monitoring
- Monitor response times through App Platform metrics
- Set up alerts for high CPU/memory usage
- Consider upgrading plan if consistently hitting limits

## Scaling & Optimization

### Horizontal Scaling
```yaml
# In App Platform, configure auto-scaling:
instances:
  min: 1
  max: 3
scaling:
  cpu_percent: 70
  memory_percent: 80
```

### Database Optimization
- Monitor slow queries in database dashboard
- Consider read replicas for high traffic
- Optimize indexes based on usage patterns

### CDN Configuration
- Enable Digital Ocean Spaces CDN for static assets
- Configure caching headers for optimal performance
- Consider additional CDN for global distribution

## Troubleshooting

### Common Issues

**Database Connection Fails:**
```bash
# Check connection string format
# Ensure SSL mode is required
# Verify database is in same region
```

**Build Failures:**
```bash
# Check build logs in App Platform
# Verify all dependencies in package.json
# Ensure TypeScript compilation succeeds
```

**Memory Issues:**
```bash
# Monitor memory usage in App Platform
# Consider upgrading to higher memory plan
# Optimize Node.js memory settings
```

### Support Resources
- Digital Ocean Community Documentation
- App Platform troubleshooting guides
- Database management best practices

## Cost Estimation

### Monthly Costs (USD)
- **App Platform Professional**: $12/month (1 container)
- **Managed PostgreSQL Basic**: $15/month
- **Spaces Storage**: $5/month (250GB)
- **CDN Bandwidth**: $0.01/GB
- **Total Estimated**: ~$35-40/month

### Cost Optimization
- Use Basic database plan for development
- Monitor bandwidth usage
- Optimize image storage and delivery
- Consider reserved pricing for production

---

This deployment guide will get your FitnessMealPlanner application running in production on Digital Ocean with proper security, monitoring, and scalability considerations.