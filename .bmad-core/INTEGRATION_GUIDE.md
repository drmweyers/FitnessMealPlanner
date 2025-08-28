# 🔌 BMAD Core Integration Guide

## Overview
This guide explains how to integrate the BMAD (Business Model Architecture Design) Core system with the FitnessMealPlanner application to enable strategic business intelligence, automation, and optimization capabilities.

## Table of Contents
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Integration Points](#integration-points)
4. [API Usage](#api-usage)
5. [Event System](#event-system)
6. [Monitoring & Analytics](#monitoring--analytics)
7. [Best Practices](#best-practices)

## Installation

### Step 1: Install Dependencies
```bash
cd .bmad-core
npm install
```

### Step 2: Build the Module
```bash
npm run build
```

### Step 3: Initialize BMAD Core
```bash
npm run bmad:init
```

## Configuration

### Server Integration (server/index.ts)
```typescript
import { bmadCore, BMADConfig } from '../.bmad-core';

// Configure BMAD Core
const bmadConfig: BMADConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  analytics: {
    enabled: true,
    trackingId: process.env.ANALYTICS_ID
  },
  monitoring: {
    interval: 60000, // 1 minute
    metrics: ['revenue', 'users', 'engagement', 'operations']
  }
};

// Initialize BMAD Core
async function initializeBMAD() {
  await bmadCore.initialize();
  
  // Set up initial business metrics
  bmadCore.strategyEngine.updateMetrics({
    revenue: {
      mrr: await calculateMRR(),
      arr: await calculateARR(),
      growthRate: await calculateGrowthRate(),
      churnRate: await calculateChurnRate(),
      ltv: await calculateLTV(),
      cac: await calculateCAC()
    },
    users: {
      total: await getTotalUsers(),
      active: await getActiveUsers(),
      new: await getNewUsers(),
      churn: await getChurnedUsers(),
      segments: await getUserSegments()
    },
    engagement: {
      dau: await getDAU(),
      mau: await getMAU(),
      sessionDuration: await getAvgSessionDuration(),
      featuresUsed: await getFeatureUsage()
    },
    operational: {
      costPerUser: await getCostPerUser(),
      serverCosts: await getServerCosts(),
      supportTickets: await getSupportTickets(),
      responseTime: await getAvgResponseTime()
    }
  });
}

// Start BMAD Core with server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeBMAD();
});
```

## Integration Points

### 1. User Registration Hook
```typescript
// server/authRoutes.ts
import { customerIntelligence, workflowEngine } from '../.bmad-core';

router.post('/register', async (req, res) => {
  // ... existing registration logic ...
  
  // After successful registration
  if (user) {
    // Analyze new customer
    customerIntelligence.analyzeCustomer(user.id, {
      role: user.role,
      registrationDate: new Date(),
      subscription: {
        tier: 'trial',
        startDate: new Date(),
        mrr: 0,
        status: 'active'
      }
    });
    
    // Trigger onboarding workflow
    await workflowEngine.executeWorkflow('customer-onboarding', {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.username
      }
    });
  }
});
```

### 2. Subscription Management
```typescript
// server/routes/subscription.ts
import { businessStrategy, customerIntelligence } from '../.bmad-core';

router.post('/upgrade', async (req, res) => {
  const { userId, newTier } = req.body;
  
  // Get optimal pricing
  const marketConditions = {
    demand: 0.7, // High demand
    competition: 0.5, // Average competition
    seasonality: 0.6 // Slightly above average
  };
  
  const optimalPrice = businessStrategy.calculateOptimalPricing(
    `trainer-${newTier}`,
    marketConditions
  );
  
  // ... process upgrade with optimal price ...
  
  // Update customer profile
  customerIntelligence.analyzeCustomer(userId, {
    subscription: {
      tier: newTier,
      mrr: optimalPrice,
      status: 'active'
    }
  });
});
```

### 3. Engagement Tracking
```typescript
// server/middleware/trackingMiddleware.ts
import { customerIntelligence } from '../.bmad-core';

export const trackEngagement = async (req, res, next) => {
  if (req.user) {
    const { userId } = req.user;
    
    // Track feature usage
    const feature = req.path.split('/')[2]; // Extract feature from path
    
    // Update customer behavior
    customerIntelligence.analyzeCustomer(userId, {
      lastActiveDate: new Date(),
      behavior: {
        featuresUsed: new Set([feature]),
        lastActions: [req.method + ' ' + req.path]
      }
    });
  }
  
  next();
};
```

### 4. Churn Prevention
```typescript
// server/services/churnMonitor.ts
import { customerIntelligence, workflowEngine } from '../.bmad-core';

export async function monitorChurnRisk() {
  const users = await getAllActiveUsers();
  
  for (const user of users) {
    // Predict churn probability
    const churnPrediction = customerIntelligence.predictChurn(user.id);
    
    if (churnPrediction.probability > 0.7) {
      // High risk - trigger retention workflow
      await workflowEngine.executeWorkflow('churn-prevention', {
        customerId: user.id,
        churnProbability: churnPrediction.probability,
        riskFactors: churnPrediction.riskFactors,
        preventionStrategies: churnPrediction.preventionStrategies
      });
    }
  }
}

// Run daily
setInterval(monitorChurnRisk, 86400000);
```

### 5. Recipe Quality Control
```typescript
// server/routes/recipes.ts
import { workflowEngine } from '../.bmad-core';

router.post('/recipes', async (req, res) => {
  // ... create recipe logic ...
  
  if (recipe) {
    // Trigger quality control workflow
    await workflowEngine.executeWorkflow('content-quality', {
      recipe: {
        id: recipe.id,
        title: recipe.title,
        ingredients: recipe.ingredients,
        nutrition: recipe.nutrition
      }
    });
  }
});
```

## API Usage

### Get Business Recommendations
```typescript
// server/routes/admin.ts
router.get('/api/bmad/recommendations', async (req, res) => {
  const recommendations = await bmadCore.getRecommendations();
  res.json({ recommendations });
});
```

### Get Business Metrics
```typescript
router.get('/api/bmad/metrics', async (req, res) => {
  const metrics = bmadCore.getMetrics();
  res.json({ metrics });
});
```

### Execute Custom Workflow
```typescript
router.post('/api/bmad/workflow', async (req, res) => {
  const { workflowId, input } = req.body;
  const execution = await bmadCore.executeWorkflow(workflowId, input);
  res.json({ execution });
});
```

### Get Customer Intelligence
```typescript
router.get('/api/bmad/customer/:id', async (req, res) => {
  const { id } = req.params;
  const nextAction = customerIntelligence.getNextBestAction(id);
  const journey = customerIntelligence.getCustomerJourney(id);
  const segments = customerIntelligence.getSegmentRecommendations(id);
  
  res.json({
    nextAction,
    journey,
    segments
  });
});
```

## Event System

### Listening to BMAD Events
```typescript
import { bmadCore } from '../.bmad-core';

// Strategy events
bmadCore.on('health-warning', (score) => {
  console.warn(`Business health score: ${score}`);
  // Send alert to admin
});

bmadCore.on('alerts', (alerts) => {
  console.error('BMAD Alerts:', alerts);
  // Send notifications
});

// Workflow events
workflowEngine.on('workflow-failed', (execution) => {
  console.error(`Workflow ${execution.workflowId} failed:`, execution.error);
  // Log to error tracking service
});

// Customer events
customerIntelligence.on('customer-segmented', ({ customerId, segmentId }) => {
  console.log(`Customer ${customerId} added to segment ${segmentId}`);
  // Update marketing lists
});
```

### Emitting Custom Events
```typescript
// Emit custom events for BMAD to process
bmadCore.emit('custom-event', {
  type: 'feature-used',
  userId: req.user.id,
  feature: 'pdf-export',
  timestamp: new Date()
});
```

## Monitoring & Analytics

### Dashboard Integration
```typescript
// client/src/pages/Admin.tsx
import { useEffect, useState } from 'react';

function BMADDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  
  useEffect(() => {
    // Fetch BMAD metrics
    fetch('/api/bmad/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data.metrics));
    
    // Fetch recommendations
    fetch('/api/bmad/recommendations')
      .then(res => res.json())
      .then(data => setRecommendations(data.recommendations));
  }, []);
  
  return (
    <div className="bmad-dashboard">
      <h2>Business Intelligence Dashboard</h2>
      
      {/* Health Score */}
      <div className="health-score">
        <h3>Business Health: {metrics?.overall.healthScore}%</h3>
      </div>
      
      {/* Strategic Recommendations */}
      <div className="recommendations">
        <h3>Strategic Recommendations</h3>
        {recommendations.map(rec => (
          <div key={rec.id} className={`rec-${rec.priority}`}>
            <h4>{rec.title}</h4>
            <p>{rec.description}</p>
            <span>Confidence: {(rec.confidence * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
      
      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard 
          title="MRR" 
          value={`$${metrics?.strategy.metrics.revenue?.mrr || 0}`} 
        />
        <MetricCard 
          title="Active Users" 
          value={metrics?.strategy.metrics.users?.active || 0} 
        />
        <MetricCard 
          title="Churn Rate" 
          value={`${(metrics?.strategy.metrics.revenue?.churnRate * 100 || 0).toFixed(1)}%`} 
        />
        <MetricCard 
          title="Avg Engagement" 
          value={`${metrics?.intelligence.avgEngagementScore || 0}/100`} 
        />
      </div>
    </div>
  );
}
```

### Metrics Collection
```typescript
// server/services/metricsCollector.ts
import { bmadCore } from '../.bmad-core';

export async function collectBusinessMetrics() {
  const metrics = {
    revenue: {
      mrr: await db.query('SELECT SUM(mrr) FROM subscriptions WHERE status = "active"'),
      // ... other metrics
    },
    users: {
      total: await db.query('SELECT COUNT(*) FROM users'),
      active: await db.query('SELECT COUNT(*) FROM users WHERE last_login > DATE_SUB(NOW(), INTERVAL 30 DAY)'),
      // ... other metrics
    },
    // ... other categories
  };
  
  bmadCore.strategyEngine.updateMetrics(metrics);
}

// Run every hour
setInterval(collectBusinessMetrics, 3600000);
```

## Best Practices

### 1. Data Privacy
- Ensure customer data is anonymized when used for analytics
- Comply with GDPR/CCPA regulations
- Implement data retention policies

### 2. Performance
- Use Redis caching for frequently accessed metrics
- Batch workflow executions during off-peak hours
- Implement rate limiting for workflow triggers

### 3. Error Handling
```typescript
try {
  await bmadCore.executeWorkflow('critical-workflow', data);
} catch (error) {
  console.error('BMAD workflow failed:', error);
  // Fallback to manual process
  await manualProcess(data);
}
```

### 4. Testing
```typescript
// test/bmad.test.ts
import { bmadCore } from '../.bmad-core';

describe('BMAD Integration', () => {
  beforeAll(async () => {
    await bmadCore.initialize();
  });
  
  afterAll(() => {
    bmadCore.shutdown();
  });
  
  test('should generate recommendations', async () => {
    const recommendations = await bmadCore.getRecommendations();
    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
  });
  
  test('should calculate business health', () => {
    const metrics = bmadCore.getMetrics();
    expect(metrics.overall.healthScore).toBeGreaterThanOrEqual(0);
    expect(metrics.overall.healthScore).toBeLessThanOrEqual(100);
  });
});
```

### 5. Gradual Rollout
1. Start with monitoring and analytics only
2. Enable automated workflows for low-risk operations
3. Gradually increase automation based on confidence
4. Monitor impact and adjust strategies

## Environment Variables
```env
# BMAD Configuration
BMAD_ENABLED=true
BMAD_REDIS_HOST=localhost
BMAD_REDIS_PORT=6379
BMAD_MONITORING_INTERVAL=60000
BMAD_ANALYTICS_ENABLED=true
BMAD_WORKFLOW_CONCURRENCY=5
```

## Troubleshooting

### Common Issues

#### BMAD Core not initializing
```typescript
// Check Redis connection
const redis = require('redis');
const client = redis.createClient();
client.on('error', (err) => console.error('Redis error:', err));
```

#### Workflows not executing
```typescript
// Check workflow status
const stats = workflowEngine.getWorkflowStats('workflow-id');
console.log('Workflow stats:', stats);
```

#### Metrics not updating
```typescript
// Manually trigger metric collection
await collectBusinessMetrics();
const metrics = bmadCore.getMetrics();
console.log('Current metrics:', metrics);
```

## Support
For issues or questions about BMAD Core integration, consult the development team or refer to the inline documentation in the source code.