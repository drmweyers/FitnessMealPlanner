# FitMeal Pro Deployment Guide

## Overview

This guide covers deployment strategies for FitMeal Pro, from development environment setup to production deployment on Replit and other platforms.

## Prerequisites

### System Requirements
- Node.js 20+ with npm
- PostgreSQL 14+ database
- OpenAI API key with GPT-4o access
- Replit account for authentication

### Environment Variables

#### Required Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# OpenAI Integration
OPENAI_API_KEY=sk-proj-...

# Replit Authentication
REPLIT_DB_URL=https://...
REPLIT_ENVIRONMENT=production

# Application Configuration
NODE_ENV=production
PORT=5000
```

#### Optional Variables
```bash
# Session Configuration
SESSION_SECRET=your-random-secret-key

# Redis Cache (if using)
REDIS_URL=redis://...

# Error Tracking
SENTRY_DSN=https://...
```

## Local Development

### Initial Setup
```bash
# Clone repository
git clone https://github.com/your-username/fitmeal-pro.git
cd fitmeal-pro

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:push

# Start development server
npm run dev
```

### Development Server
The development server runs on `http://localhost:5000` with:
- Hot module replacement for React
- Automatic server restart on changes
- API proxy for seamless frontend-backend integration
- Real-time error reporting

### Database Management
```bash
# Push schema changes to database
npm run db:push

# Generate database migration
npm run db:generate

# View database with Drizzle Studio
npm run db:studio
```

## Production Deployment

### Replit Deployment (Recommended)

#### Step 1: Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### Step 2: Configure Replit Project
1. Import repository into Replit
2. Configure environment variables in Secrets
3. Set up PostgreSQL database connection
4. Configure custom domain (if needed)

#### Step 3: Deploy
```bash
# Replit automatically detects and builds the project
# The deployment process includes:
# 1. npm install
# 2. npm run build
# 3. npm run start
```

#### Step 4: Verify Deployment
- Check application logs for errors
- Test API endpoints
- Verify database connectivity
- Confirm authentication flow

### Alternative Deployment Platforms

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
```

#### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "run", "start"]
```

```bash
# Build and run Docker container
docker build -t fitmeal-pro .
docker run -p 5000:5000 --env-file .env fitmeal-pro
```

## Database Setup

### PostgreSQL Configuration

#### Production Database Setup
```sql
-- Create database
CREATE DATABASE fitmeal_pro;

-- Create user
CREATE USER fitmeal_user WITH ENCRYPTED PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE fitmeal_pro TO fitmeal_user;
GRANT ALL ON SCHEMA public TO fitmeal_user;
```

#### Connection String Format
```bash
DATABASE_URL=postgresql://fitmeal_user:secure_password@localhost:5432/fitmeal_pro
```

#### Database Optimization
```sql
-- Indexes for performance
CREATE INDEX idx_recipes_meal_types ON recipes USING GIN (meal_types);
CREATE INDEX idx_recipes_dietary_tags ON recipes USING GIN (dietary_tags);
CREATE INDEX idx_recipes_approved ON recipes (is_approved);
CREATE INDEX idx_recipes_calories ON recipes (calories_kcal);

-- Connection pooling settings
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

### Recipe Data Seeding

#### Initial Recipe Generation
```bash
# Generate initial recipe set
node scripts/generateRecipes.js 100

# Add test recipes for development
node scripts/addTestRecipes.js
```

#### Recipe Approval Process
```bash
# Approve all generated recipes (admin only)
curl -X PATCH https://your-domain.com/api/recipes/bulk-approve \
  -H "Authorization: Bearer admin-token"
```

## SSL/TLS Configuration

### Replit Automatic HTTPS
- Replit provides automatic HTTPS for all deployments
- Custom domains receive free SSL certificates
- No additional configuration required

### Manual SSL Setup
```nginx
# Nginx configuration for SSL
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Performance Optimization

### Application Optimization

#### Build Optimization
```json
// package.json build configuration
{
  "scripts": {
    "build": "vite build --mode production",
    "build:analyze": "vite build --mode production --analyze"
  }
}
```

#### Caching Strategy
```typescript
// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
    },
  },
});
```

### Database Performance

#### Connection Pooling
```typescript
// Database connection configuration
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### Query Optimization
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM recipes 
WHERE meal_types @> '["breakfast"]' 
AND is_approved = true;

-- Optimize JSONB queries
CREATE INDEX CONCURRENTLY idx_recipes_meal_types_gin 
ON recipes USING GIN (meal_types);
```

## Monitoring and Logging

### Application Logging
```typescript
// Structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### Health Checks
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'checking...',
    openai: 'checking...',
  };
  
  try {
    // Check database connection
    await db.select().from(recipes).limit(1);
    health.database = 'connected';
  } catch (error) {
    health.database = 'error';
    health.status = 'error';
  }
  
  res.json(health);
});
```

### Performance Monitoring
```typescript
// Response time monitoring
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});
```

## Security Configuration

### Environment Security
```bash
# Secure environment variables
export NODE_ENV=production
export SESSION_SECRET=$(openssl rand -base64 32)
export DATABASE_SSL=require
```

### Application Security Headers
```typescript
// Security middleware
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Backup and Recovery

### Database Backup
```bash
# Automated daily backup
#!/bin/bash
DATE=$(date +%Y-%m-%d)
pg_dump $DATABASE_URL > backups/fitmeal-pro-$DATE.sql
aws s3 cp backups/fitmeal-pro-$DATE.sql s3://backups/
```

### Application Backup
```bash
# Code repository backup
git remote add backup https://backup-repo-url.git
git push backup main

# Environment configuration backup
cp .env .env.backup.$(date +%Y-%m-%d)
```

## Troubleshooting

### Common Deployment Issues

#### Database Connection Errors
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Verify connection string format
echo $DATABASE_URL | grep -E "^postgresql://"
```

#### OpenAI API Issues
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check quota and billing
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

### Log Analysis
```bash
# Monitor application logs
tail -f logs/combined.log | grep ERROR

# Database performance logs
grep "slow query" /var/log/postgresql/postgresql.log

# System resource usage
htop
iostat -x 1
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Session store externalization
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Memory optimization
- CPU utilization monitoring
- Database connection pooling
- Caching strategies

### Auto-scaling Configuration
```yaml
# Kubernetes auto-scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fitmeal-pro-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fitmeal-pro
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

This deployment guide covers all aspects of deploying FitMeal Pro from development to production. Follow the appropriate sections based on your deployment target and requirements.