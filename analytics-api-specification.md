# 🔌 **ANALYTICS API SPECIFICATIONS**

Note: Versioning and export rules
- All analytics endpoints are versioned under /api/v1
- Export rules: Tier 2 supports CSV-only exports; Tier 3 supports CSV, Excel, PDF (and API analytics access)

### Canonical Policy Alignment
- Trial: 14-day, tier-limited trial; access is limited to the selected tier’s capabilities (no full-platform trial)
- AI subscriptions (add-on, separate from purchased tiers): Starter (100 generations/month), Professional (500 generations/month), Enterprise (unlimited; fair use)
- AI cancellation: Cancelling AI disables only AI features; it does not downgrade or alter purchased trainer tiers
- Tier 3 includes programmatic API analytics access in addition to CSV, Excel, and PDF exports

## FitnessMealPlanner 3-Tier Analytics System

---

## **🛡️ TIER-BASED ACCESS CONTROL**

### **Middleware: Analytics Tier Enforcement**

```typescript
// server/middleware/analyticsAuth.ts
interface AnalyticsPermission {
  tier: 'tier1_basic' | 'tier2_analytics' | 'tier3_advanced';
  feature: string;
  isEnabled: boolean;
  usageLimit?: number;
  currentUsage?: number;
}

export const requireAnalyticsTier = (requiredTier: string, feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as AuthenticatedRequest;

    // Tier 1: Block ALL analytics
    if (user.subscriptionTier === 'tier1_basic') {
      return res.status(403).json({
        error: 'Analytics not available in basic tier',
        upgradeUrl: '/upgrade',
        requiredTier
      });
    }

    // Check feature access for Tier 2/3
    const hasAccess = await checkFeatureAccess(user.id, feature);
    if (!hasAccess) {
      return res.status(403).json({
        error: `Feature '${feature}' not available in your current tier`,
        currentTier: user.subscriptionTier,
        requiredTier
      });
    }

    next();
  };
};
```

---

## **📊 TIER 2 ANALYTICS APIs**

### **Basic Dashboard Endpoints**

#### **GET** `/api/v1/analytics/dashboard/overview`
```typescript
// Basic trainer dashboard overview
interface DashboardOverview {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  totalMealPlans: number;
  totalRecipes: number;
  avgClientEngagement: number; // 0-100 score
  recentActivity: ActivityItem[];
}

// Usage: Tier 2+ only
router.get('/dashboard/overview',
  requireAnalyticsTier('tier2_analytics', 'basic_dashboard'),
  async (req, res) => {
    const trainerId = req.user.id;
    const overview = await getTrainerDashboardOverview(trainerId);
    res.json(overview);
  }
);
```

#### **GET** `/api/v1/analytics/clients/metrics`
```typescript
// Client performance metrics
interface ClientMetrics {
  clientId: string;
  name: string;
  email: string;
  engagementScore: number;
  lastActive: Date;
  mealPlansCompleted: number;
  progressUpdates: number;
  favoriteRecipes: number;
  averageRating: number;
  progressTrend: 'improving' | 'stable' | 'declining';
}

router.get('/clients/metrics',
  requireAnalyticsTier('tier2_analytics', 'client_metrics'),
  async (req, res) => {
    const { timeframe = '30d', sortBy = 'engagement' } = req.query;
    const metrics = await getClientMetrics(req.user.id, { timeframe, sortBy });
    res.json(metrics);
  }
);
```

#### **GET** `/api/v1/analytics/reports/basic`
```typescript
// Basic business reports
interface BasicReport {
  reportType: 'weekly_summary' | 'monthly_overview' | 'client_progress';
  generatedAt: Date;
  data: {
    clientGrowth: number[];
    engagementTrends: number[];
    mealPlanActivity: number[];
    topRecipes: Array<{
      name: string;
      rating: number;
      favorites: number;
    }>;
  };
  insights: string[];
}

// Rate limited: 10 reports per month for Tier 2
router.get('/reports/basic/:reportType',
  requireAnalyticsTier('tier2_analytics', 'business_reports'),
  rateLimitByTier(10, 'month'), // Tier 2 limit
  async (req, res) => {
    const report = await generateBasicReport(req.user.id, req.params.reportType);
    await trackReportGeneration(req.user.id, req.params.reportType);
    res.json(report);
  }
);
```

### **Client Engagement APIs**

#### **GET** `/api/v1/analytics/engagement/timeline`
```typescript
// Client engagement over time
interface EngagementTimeline {
  clientId: string;
  timeframe: 'week' | 'month' | 'quarter';
  dataPoints: Array<{
    date: Date;
    engagementScore: number;
    sessionDuration: number;
    activitiesCompleted: number;
  }>;
}

router.get('/engagement/timeline/:clientId',
  requireAnalyticsTier('tier2_analytics', 'client_metrics'),
  async (req, res) => {
    const timeline = await getEngagementTimeline(
      req.params.clientId,
      req.query.timeframe as string
    );
    res.json(timeline);
  }
);
```

---

## **🚀 TIER 3 ADVANCED ANALYTICS APIs**

### **Predictive Insights**

#### **GET** `/api/v1/analytics/predictions/churn-risk`
```typescript
// AI-powered churn prediction
interface ChurnPrediction {
  clientId: string;
  churnProbability: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  recommendations: Array<{
    action: string;
    expectedImpact: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  confidenceScore: number;
}

router.get('/predictions/churn-risk',
  requireAnalyticsTier('tier3_advanced', 'predictive_insights'),
  async (req, res) => {
    const predictions = await generateChurnPredictions(req.user.id);
    res.json(predictions);
  }
);
```

#### **GET** `/api/v1/analytics/predictions/revenue-forecast`
```typescript
// Revenue forecasting with confidence intervals
interface RevenueForecast {
  timeframe: 'next_month' | 'next_quarter' | 'next_year';
  predictions: Array<{
    period: Date;
    predictedRevenue: number;
    confidenceLower: number;
    confidenceUpper: number;
    confidenceLevel: number; // 0-100
  }>;
  growthFactors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
}

router.get('/predictions/revenue-forecast',
  requireAnalyticsTier('tier3_advanced', 'revenue_analytics'),
  async (req, res) => {
    const forecast = await generateRevenueForecast(req.user.id, req.query.timeframe);
    res.json(forecast);
  }
);
```

### **Customer Segmentation**

#### **GET** `/api/v1/analytics/segmentation/clusters`
```typescript
// AI-powered customer segmentation
interface CustomerSegment {
  segmentId: string;
  segmentName: string;
  description: string;
  clientCount: number;
  characteristics: Array<{
    trait: string;
    strength: number; // 0-1
    description: string;
  }>;
  recommendedActions: string[];
  averageValue: {
    ltv: number;
    engagementScore: number;
    retentionRate: number;
  };
  clients: Array<{
    clientId: string;
    name: string;
    segmentFit: number; // How well they fit this segment
  }>;
}

router.get('/segmentation/clusters',
  requireAnalyticsTier('tier3_advanced', 'customer_segmentation'),
  async (req, res) => {
    const segments = await generateCustomerSegments(req.user.id);
    res.json(segments);
  }
);
```

### **Custom Dashboards**

#### **POST** `/api/v1/analytics/dashboards/custom`
```typescript
// Create custom dashboard (Tier 3 only)
interface CustomDashboard {
  name: string;
  description?: string;
  widgets: Array<{
    type: 'chart' | 'metric' | 'table' | 'heatmap';
    config: WidgetConfig;
    position: { x: number; y: number; w: number; h: number };
  }>;
  layout: GridLayout;
  isDefault: boolean;
}

// Limited to 5 custom dashboards for Tier 3
router.post('/dashboards/custom',
  requireAnalyticsTier('tier3_advanced', 'custom_dashboards'),
  validateDashboardLimit(5), // Tier 3 limit
  async (req, res) => {
    const dashboard = await createCustomDashboard(req.user.id, req.body);
    res.json(dashboard);
  }
);
```

#### **GET** `/api/v1/analytics/widgets/available`
```typescript
// Available widget types for custom dashboards
interface AvailableWidget {
  type: string;
  name: string;
  description: string;
  configSchema: JSONSchema;
  supportedDataSources: string[];
  tier: 'tier2_analytics' | 'tier3_advanced';
}

const availableWidgets: AvailableWidget[] = [
  // Tier 2 widgets
  {
    type: 'client_overview',
    name: 'Client Overview',
    description: 'Summary of client metrics',
    tier: 'tier2_analytics',
    configSchema: { /* ... */ }
  },
  // Tier 3 widgets
  {
    type: 'churn_prediction',
    name: 'Churn Risk Analysis',
    description: 'AI-powered churn prediction',
    tier: 'tier3_advanced',
    configSchema: { /* ... */ }
  },
  // ... more widgets
];
```

### **Business Intelligence**

#### **GET** `/api/analytics/bi/competitive-analysis`
```typescript
// Competitive intelligence (Tier 3 only)
interface CompetitiveAnalysis {
  marketPosition: {
    ranking: number;
    marketShare: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  benchmarks: Array<{
    metric: string;
    yourValue: number;
    industryAverage: number;
    topQuartile: number;
    performanceRating: 'above_average' | 'average' | 'below_average';
  }>;
  opportunities: Array<{
    area: string;
    potential: number;
    effort: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  recipeTrends: Array<{
    category: string;
    trend: 'hot' | 'rising' | 'stable' | 'declining';
    gapScore: number; // Opportunity score
  }>;
}

router.get('/bi/competitive-analysis',
  requireAnalyticsTier('tier3_advanced', 'competitive_intelligence'),
  async (req, res) => {
    const analysis = await generateCompetitiveAnalysis(req.user.id);
    res.json(analysis);
  }
);
```

---

## **📈 REAL-TIME ANALYTICS**

### **WebSocket Endpoints (Tier 2+)**

```typescript
// Real-time analytics updates
interface AnalyticsWebSocketMessage {
  type: 'metric_update' | 'client_activity' | 'goal_achieved';
  data: any;
  timestamp: Date;
  tier: string;
}

// WebSocket connection with tier-aware subscriptions
io.on('connection', (socket) => {
  socket.on('subscribe_analytics', async (data) => {
    const { user } = socket.handshake;

    // Block Tier 1 from real-time analytics
    if (user.subscriptionTier === 'tier1_basic') {
      socket.emit('analytics_error', {
        message: 'Real-time analytics not available in basic tier'
      });
      return;
    }

    // Subscribe to appropriate channels based on tier
    const channels = getTierChannels(user.subscriptionTier);
    channels.forEach(channel => socket.join(channel));
  });
});
```

---

## **🔒 PRIVACY & COMPLIANCE APIs**

### **Data Privacy Management**

#### **GET** `/api/analytics/privacy/preferences`
```typescript
// Get user's analytics privacy preferences
interface AnalyticsPrivacyPreferences {
  allowUsageAnalytics: boolean;
  allowPerformanceTracking: boolean;
  allowBehavioralAnalysis: boolean;
  allowPredictiveModeling: boolean;
  dataRetentionDays: number;
}

router.get('/privacy/preferences',
  authenticate,
  async (req, res) => {
    const preferences = await getAnalyticsPrivacyPreferences(req.user.id);
    res.json(preferences);
  }
);
```

#### **POST** `/api/analytics/gdpr/data-export`
```typescript
// GDPR data export
interface DataExportRequest {
  userId: string;
  dataTypes: string[];
  format: 'json' | 'csv' | 'pdf';
  includeAnalytics: boolean;
}

router.post('/gdpr/data-export',
  authenticate,
  async (req, res) => {
    const exportJob = await initiateDataExport(req.user.id, req.body);
    res.json({ jobId: exportJob.id, estimatedCompletion: exportJob.eta });
  }
);
```

---

## **⚡ PERFORMANCE OPTIMIZATIONS**

### **Caching Strategy**

```typescript
// Redis caching for analytics data
const CACHE_DURATIONS = {
  dashboard_overview: 300, // 5 minutes
  client_metrics: 600,     // 10 minutes
  predictions: 3600,       // 1 hour
  competitive_data: 86400  // 24 hours
};

// Cached analytics endpoint
router.get('/dashboard/overview',
  requireAnalyticsTier('tier2_analytics', 'basic_dashboard'),
  cacheMiddleware('dashboard_overview', CACHE_DURATIONS.dashboard_overview),
  async (req, res) => {
    // ... endpoint logic
  }
);
```

### **Rate Limiting by Tier**

```typescript
// Tier-specific rate limits
const RATE_LIMITS = {
  tier1_basic: { requests: 0, window: '1h' },     // No analytics access
  tier2_analytics: { requests: 100, window: '1h' }, // 100 requests/hour
  tier3_advanced: { requests: 500, window: '1h' }   // 500 requests/hour
};

export const rateLimitByTier = () => {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: (req) => {
      const tier = req.user?.subscriptionTier || 'tier1_basic';
      return RATE_LIMITS[tier].requests;
    },
    message: 'Analytics rate limit exceeded for your tier'
  });
};
```

---

## **📋 API RESPONSE FORMATS**

### **Standard Response Structure**

```typescript
interface AnalyticsAPIResponse<T> {
  success: boolean;
  data: T;
  meta: {
    tier: string;
    timestamp: Date;
    cached: boolean;
    rateLimit: {
      remaining: number;
      resetTime: Date;
    };
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

interface AnalyticsAPIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  upgradeInfo?: {
    currentTier: string;
    requiredTier: string;
    upgradeUrl: string;
    benefits: string[];
  };
}
```

---

## **🔧 MONITORING & METRICS**

### **Analytics Usage Tracking**

```typescript
// Track analytics feature usage
interface AnalyticsUsageMetric {
  userId: string;
  feature: string;
  endpoint: string;
  tier: string;
  responseTime: number;
  success: boolean;
  timestamp: Date;
}

// Middleware to track usage
export const trackAnalyticsUsage = (feature: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      trackUsage({
        userId: req.user?.id,
        feature,
        endpoint: req.path,
        tier: req.user?.subscriptionTier,
        responseTime,
        success: res.statusCode < 400,
        timestamp: new Date()
      });
    });

    next();
  };
};
```

This comprehensive API specification provides:

1. **Tier-based access control** with automatic enforcement
2. **Complete endpoint coverage** for all analytics features
3. **Real-time capabilities** with WebSocket support
4. **Privacy compliance** built into the API design
5. **Performance optimizations** with caching and rate limiting
6. **Monitoring and tracking** for usage analytics

The API design ensures that Tier 1 users have zero access to analytics, Tier 2 gets essential business metrics, and Tier 3 receives advanced AI-powered insights and customization capabilities.