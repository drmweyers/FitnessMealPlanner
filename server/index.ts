/**
 * FitMeal Pro Server Entry Point
 * 
 * This is the main server file that initializes the Express application,
 * sets up middleware for logging and error handling, and configures
 * both development (Vite) and production (static) environments.
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { recipeRouter } from './routes/recipes';
import { mealPlanRouter } from './routes/mealPlan';
import authRouter from './authRoutes';
import invitationRouter from './invitationRoutes';
import adminRouter from './routes/adminRoutes';
import trainerRouter from './routes/trainerRoutes';
import customerRouter from './routes/customerRoutes';
import pdfRouter from './routes/pdf';
import progressRouter from './routes/progressRoutes';
import profileRouter from './routes/profileRoutes';
import path from 'path';
import { fileURLToPath } from 'url';
import ViteExpress from 'vite-express';
import passport from './passport-config';
import { requireAuth, requireAdmin, requireTrainerOrAdmin, requireRole } from './middleware/auth';

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

// Performance optimizations
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Good balance between compression speed and ratio
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Set request size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key'));

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh_token', authLimiter);

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

// Security and performance headers
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Performance headers
  res.setHeader('X-Powered-By', ''); // Remove X-Powered-By header for security
  
  // Cache control for API responses
  if (req.path.startsWith('/api/')) {
    // Most API responses shouldn't be cached
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Cache static assets
  if (req.path.startsWith('/uploads/') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  }
  
  next();
});

// Enhanced health check endpoint with comprehensive monitoring
app.get('/health', async (req, res) => {
  const healthcheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100,
      rss: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100
    },
    pid: process.pid,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    database: 'checking...',
    version: process.env.APP_VERSION || '1.0.0'
  };
  
  // Database connectivity check
  try {
    const { db } = await import('./db/db.js');
    const { recipes } = await import('./db/schema.js');
    await db.select().from(recipes).limit(1);
    healthcheck.database = 'connected';
  } catch (error) {
    healthcheck.status = 'DEGRADED';
    healthcheck.database = `error: ${error instanceof Error ? error.message : 'unknown'}`;
  }
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  const statusCode = healthcheck.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(healthcheck);
});

// Metrics endpoint for Prometheus monitoring
app.get('/api/metrics', (req, res) => {
  const memory = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  const metrics = [
    `# HELP nodejs_memory_heap_used_bytes Process heap memory currently in use`,
    `# TYPE nodejs_memory_heap_used_bytes gauge`,
    `nodejs_memory_heap_used_bytes ${memory.heapUsed}`,
    ``,
    `# HELP nodejs_memory_heap_total_bytes Total heap memory available`,
    `# TYPE nodejs_memory_heap_total_bytes gauge`,
    `nodejs_memory_heap_total_bytes ${memory.heapTotal}`,
    ``,
    `# HELP nodejs_memory_rss_bytes Resident set size memory`,
    `# TYPE nodejs_memory_rss_bytes gauge`,
    `nodejs_memory_rss_bytes ${memory.rss}`,
    ``,
    `# HELP nodejs_process_uptime_seconds Process uptime in seconds`,
    `# TYPE nodejs_process_uptime_seconds gauge`,
    `nodejs_process_uptime_seconds ${process.uptime()}`,
    ``,
    `# HELP nodejs_cpu_user_seconds_total User CPU time spent in seconds`,
    `# TYPE nodejs_cpu_user_seconds_total counter`,
    `nodejs_cpu_user_seconds_total ${cpuUsage.user / 1000000}`,
    ``,
    `# HELP nodejs_cpu_system_seconds_total System CPU time spent in seconds`,
    `# TYPE nodejs_cpu_system_seconds_total counter`,
    `nodejs_cpu_system_seconds_total ${cpuUsage.system / 1000000}`,
    ``
  ].join('\n');
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(metrics);
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

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

// Debug endpoint to test profile routes
app.get('/api/debug/routes', (req, res) => {
  const routes = app._router.stack
    .filter((r: any) => r.route)
    .map((r: any) => ({
      path: r.route.path,
      methods: Object.keys(r.route.methods)
    }));
  res.json({ routes });
});

// API Routes - These must be defined BEFORE ViteExpress
// Public routes (no authentication required)
app.use('/api/auth', authRouter);

// Protected routes with authentication middleware
app.use('/api/invitations', requireAuth, invitationRouter);
app.use('/api/recipes', requireAuth, recipeRouter);
app.use('/api/admin', requireAdmin, adminRouter);
app.use('/api/trainer', requireTrainerOrAdmin, trainerRouter);
app.use('/api/customer', requireRole('customer'), customerRouter);
app.use('/api/meal-plan', requireAuth, mealPlanRouter);
app.use('/api/pdf', requireAuth, pdfRouter);
app.use('/api/progress', requireAuth, progressRouter);
app.use('/api/profile', requireAuth, profileRouter);

// Serve uploaded files with optimized cache headers
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads'), {
  maxAge: '1d', // Cache uploaded files for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set specific cache headers for images
    if (path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  }
}));

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // The "catchall" handler: for any request that doesn't match one above,
  // send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const port = process.env.PORT || 5000;

// In development, ViteExpress handles the frontend, but API routes should be handled by Express first
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
  // Configure ViteExpress to use the vite.config.ts file
  ViteExpress.config({
    mode: 'development',
    viteConfigFile: path.join(__dirname, '../vite.config.ts')
  });
  
  ViteExpress.listen(app, Number(port), () =>
    console.log(`Server is listening on port ${port}...`),
  );
} else {
  app.listen(Number(port), () =>
    console.log(`Server is listening on port ${port}...`),
  );
}

export { app };
