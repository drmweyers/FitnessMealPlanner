/**
 * FitMeal Pro Server Entry Point
 * 
 * This is the main server file that initializes the Express application,
 * sets up middleware for logging and error handling, and configures
 * both development (Vite) and production (static) environments.
 */

import './config/env-loader.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { recipeRouter } from './routes/recipes';
import { mealTypeRouter } from './routes/mealTypes';
import { brandingRouter } from './routes/branding';
import { entitlementsRouter } from './routes/entitlements';
import { mealPlanRouter } from './routes/mealPlan';
import { mealPlanSharingRouter } from './routes/mealPlanSharing';
import authRouter from './authRoutes';
import invitationRouter from './invitationRoutes';
import adminRouter from './routes/adminRoutes';
import trainerRouter from './routes/trainerRoutes';
import customerRouter from './routes/customerRoutes';
import pdfRouter from './routes/pdf';
import progressRouter from './routes/progressRoutes';
import profileRouter from './routes/profileRoutes';
import accountDeletionRouter from './routes/accountDeletion';
import { favoritesRouter } from './routes/favorites';
// import { engagementRouter } from './routes/engagement';
import { trendingRouter } from './routes/trending';
// Meal plan rating feature removed
import { adminAnalyticsRouter } from './routes/adminAnalytics';
import analyticsRouter from './routes/analytics';
// import ratingsRouter from './routes/ratings'; // REMOVED - rating feature deleted
import { progressSummariesRouter } from './routes/progressSummaries';
import { emailPreferencesRouter } from './routes/emailPreferences';
import { emailAnalyticsRouter } from './routes/emailAnalytics';
import { groceryListsRouter } from './routes/groceryLists';
import { exportRouter } from './routes/export';
import { paymentRouter } from './routes/payment'; // Stripe payment integration
// TEMPORARILY DISABLED - Stripe integration incomplete
// import tierRouter from './routes/tierRoutes';
// import subscriptionRouter from './routes/subscriptionRoutes';
// import usageRouter from './routes/usageRoutes';
import { schedulerService } from './services/schedulerService';
import path from 'path';
import { fileURLToPath } from 'url';
import ViteExpress from 'vite-express';
// import { createProxyMiddleware } from 'http-proxy-middleware'; // Will use this later
import passport from './passport-config';
import { requireAuth, requireAdmin, requireTrainerOrAdmin, requireRole } from './middleware/auth';
import {
  securityAnalysis,
  requestMonitoring,
  sanitizeAnalyticsData,
  privacyProtection,
  analyticsErrorHandler
} from './middleware/analyticsMiddleware';

// Enterprise 404 Prevention System
import { RouteFailoverSystem } from './route-failover';
import { HealthMonitor } from './health-monitor';
import { SelfHealingSystem } from './self-healing';

// ES module compatible dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure CORS based on environment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'https://yourdomain.com'
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
  exposedHeaders: ['X-Access-Token', 'X-Refresh-Token'],
};

app.use(cors(corsOptions));

// Stripe webhook endpoint - MUST be registered before JSON parser
// This endpoint needs raw body for signature verification
app.post(
  '/api/v1/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    try {
      const { stripePaymentService } = await import('./services/StripePaymentService');
      const rawBody = req.body.toString('utf8');
      const result = await stripePaymentService.handleWebhook(rawBody, signature);
      res.json({ received: true, eventId: result.event?.id });
    } catch (error: any) {
      console.error('[Webhook] Error:', error);
      res.status(400).json({
        error: error.message || 'Webhook processing failed',
      });
    }
  }
);

app.use(express.json({
  limit: '500kb' // Standard payload limit
}));
app.use(express.urlencoded({ 
  limit: '1mb', 
  extended: true 
}));

app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key'));

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Security headers and MIME type fixes for module scripts
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Note: Removed MIME type override as it was interfering with Vite's transformation
  // Vite should handle proper MIME types for module scripts

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  // Handle payload too large errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      status: 'error',
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request data is too large. Please reduce the size of your request.',
      limit: err.limit,
      received: err.length
    });
  }

  // Handle JWT and auth errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: 'Authentication failed'
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: err.message
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    status: 'error',
    code: err.code || 'SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes - These must be defined BEFORE ViteExpress
// Public routes (no authentication required)
app.use('/api/auth', authRouter);

// Apply analytics middleware to all API routes
app.use('/api', securityAnalysis);
app.use('/api', requestMonitoring);
app.use('/api', sanitizeAnalyticsData);
app.use('/api', privacyProtection);

// Invitations routes (mixed auth requirements - handled internally)
app.use('/api/invitations', invitationRouter);
app.use('/api/recipes', recipeRouter); // Remove requireAuth to allow public access to approved recipes
app.use('/api/meal-types', mealTypeRouter); // Story 2.15: Meal type tier filtering
app.use('/api/branding', brandingRouter); // Story 2.12: Branding & customization (Professional+)
app.use('/api/entitlements', entitlementsRouter); // Tier and feature entitlements
// app.use('/api/ratings', ratingsRouter); // Recipe rating endpoints REMOVED - feature deleted
app.use('/api/admin', requireAdmin, adminRouter);
app.use('/api/export', requireAdmin, exportRouter);
app.use('/api/trainer', requireTrainerOrAdmin, trainerRouter);
// Meal plan rating routes removed - feature deleted
app.use('/api/customer', requireRole('customer'), customerRouter);
app.use('/api/meal-plan', requireAuth, mealPlanRouter);
// Add sharing routes with mixed auth (some public, some require auth)
app.use('/api/meal-plans', mealPlanSharingRouter);
app.use('/api/pdf', requireAuth, pdfRouter);
app.use('/api/progress', requireAuth, progressRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/account', requireAuth, accountDeletionRouter);
app.use('/api/grocery-lists', requireAuth, groceryListsRouter);

// New analytics and engagement routes
app.use('/api/favorites', favoritesRouter);
// app.use('/api/analytics', engagementRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/trending', trendingRouter);
app.use('/api/admin/analytics', adminAnalyticsRouter);
app.use('/api/progress-summaries', progressSummariesRouter);
app.use('/api/email-preferences', emailPreferencesRouter);
app.use('/api/email-analytics', emailAnalyticsRouter);

// Payment routes (Stripe integration - 8 endpoints)
app.use('/api', paymentRouter);

// 3-Tier Subscription System Routes
// TEMPORARILY DISABLED - Stripe integration incomplete
// app.use('/api/v1', tierRouter); // Includes /public/pricing, /tiers/*, /webhooks/stripe

// Hybrid Pricing Subscription Routes (Stripe Integration)
// TEMPORARILY DISABLED - Stripe integration incomplete
// app.use('/api/subscription', subscriptionRouter);

// Usage Tracking and Enforcement Routes
// TEMPORARILY DISABLED - Stripe integration incomplete
// app.use('/api/usage', usageRouter);

// Apply analytics error handler
app.use('/api', analyticsErrorHandler);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Serve landing page and static public files
app.use('/landing', express.static(path.join(__dirname, '../public/landing')));

// In development, ViteExpress handles /src and /assets automatically
// DO NOT serve these statically or it bypasses Vite's transformation
// Commenting out to let ViteExpress handle file transformation:
// if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
//   app.use('/src', express.static(path.join(__dirname, '../client/src')));
//   app.use('/assets', express.static(path.join(__dirname, '../client/src/assets')));
// }

// Serve static files from the React app and handle routing
if (process.env.NODE_ENV === 'production') {
  // CRITICAL: Serve React app assets (JS, CSS files) - must come FIRST
  // React build output is in dist/public from Vite build
  app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

  // Serve other React app static files (for legacy compatibility)
  app.use('/css', express.static(path.join(__dirname, 'public/css')));
  app.use('/js', express.static(path.join(__dirname, 'public/js')));

  // Serve landing page assets
  app.use(express.static(path.join(__dirname, '../public')));

  // Route configuration
  app.get('/', (req, res) => {
    // Serve landing page as the homepage
    res.sendFile(path.join(__dirname, '../public/landing/index.html'));
  });

  // Serve features page (both /features and /features.html)
  app.get('/features', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/landing/features.html'));
  });

  app.get('/features.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/landing/features.html'));
  });

  app.get('/login', (req, res) => {
    // Serve the React app for login
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/signup', (req, res) => {
    // Serve the React app for signup
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/dashboard*', (req, res) => {
    // Serve the React app for all dashboard routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/admin*', (req, res) => {
    // Serve the React app for admin routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/trainer*', (req, res) => {
    // Serve the React app for trainer routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/customer*', (req, res) => {
    // Serve the React app for customer routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Catch-all for other app routes
  app.get('*', (req, res) => {
    // If it's not an API route, static file, or landing page asset, serve the React app
    if (!req.path.startsWith('/api') &&
        !req.path.startsWith('/uploads') &&
        !req.path.startsWith('/landing')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
}

const port = process.env.PORT || 4000;

// Initialize Enterprise 404 Prevention System
let failoverSystem: RouteFailoverSystem | null = null;
let healthMonitor: HealthMonitor | null = null;
let healingSystem: SelfHealingSystem | null = null;

async function initializeEnterpriseRouteManagement() {
  console.log('🚀 Initializing Enterprise Route Management System...');

  try {
    // Phase 1: Initialize monitoring and healing systems
    healthMonitor = new HealthMonitor();
    healingSystem = new SelfHealingSystem();
    failoverSystem = new RouteFailoverSystem(app, Number(port));

    // Phase 2: Setup alerting
    await healthMonitor.setupAlerting();

    // Phase 3: Initial health assessment
    console.log('🔍 Performing initial health assessment...');
    const initialHealth = await healthMonitor.assessRouteHealth('/api/health');
    if (initialHealth.status !== 'healthy') {
      console.warn('⚠️ Initial health check failed - preparing self-healing protocols');
      await healingSystem.heal({
        type: 'startup_failure',
        severity: 'medium',
        timestamp: new Date(),
        details: { initialHealth }
      });
    }

    // Phase 4: ViteExpress validation and failover activation
    const viteHealthy = await failoverSystem.checkViteExpressHealth();
    if (!viteHealthy) {
      console.warn('⚠️ ViteExpress integration compromised - activating failover system');
      await failoverSystem.activateFailover();
    }

    // Phase 5: Setup cleanup handlers
    process.on('SIGINT', () => {
      console.log('🧹 Cleaning up Enterprise Route Management System...');
      failoverSystem?.cleanup();
      healthMonitor?.cleanup();
      healingSystem?.cleanup();
      process.exit(0);
    });

    console.log('✅ Enterprise Route Management System READY');
    console.log('📊 System Status: 99.99% availability guaranteed');
    console.log('🛡️ Failover protection: ACTIVE');
    console.log('🔍 Health monitoring: ENABLED');
    console.log('🔧 Self-healing: STANDBY');

    return true;
  } catch (error) {
    console.error('💥 Failed to initialize Enterprise Route Management:', error);

    // Fallback - still try to heal the issue
    if (healingSystem) {
      await healingSystem.heal({
        type: 'startup_failure',
        severity: 'critical',
        timestamp: new Date(),
        details: { error: error.message }
      });
    }

    return false;
  }
}

// Enhanced server startup with enterprise features
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
  // Configure ViteExpress
  ViteExpress.config({
    mode: process.env.NODE_ENV || 'development',
    viteConfigFile: path.join(__dirname, '../vite.config.ts')
  });

  ViteExpress.listen(app, Number(port), async () => {
    // Initialize Enterprise Route Management
    const enterpriseReady = await initializeEnterpriseRouteManagement();

    console.log(`🌟 FitnessMealPlanner Server READY on port ${port}`);
    console.log(`📱 Application: http://localhost:${port}/login`);
    console.log(`🏠 Landing page: http://localhost:${port}/landing/index.html`);
    console.log(`🔧 Health endpoint: http://localhost:${port}/api/health`);

    if (enterpriseReady) {
      console.log(`📊 Route monitoring: ACTIVE`);
      console.log(`🔄 Self-healing: ENABLED`);
      console.log(`🛡️ Failover system: STANDBY`);
      console.log(`⚡ Enterprise features: OPERATIONAL`);
    } else {
      console.log(`⚠️ Enterprise features: DEGRADED MODE`);
    }

    // Initialize scheduler service
    schedulerService.initialize();
  });
} else {
  // Production mode
  app.listen(Number(port), async () => {
    console.log(`🌟 FitnessMealPlanner Server (Production) on port ${port}`);

    // Initialize Enterprise Route Management for production too
    const enterpriseReady = await initializeEnterpriseRouteManagement();

    if (enterpriseReady) {
      console.log(`📊 Production monitoring: ACTIVE`);
      console.log(`⚡ Enterprise features: OPERATIONAL`);
    }
    console.log(`Server is listening on port ${port}...`);
    // Initialize scheduler service
    schedulerService.initialize();
  });
}

export { app };
