/**
 * FitMeal Pro Server Entry Point
 * 
 * This is the main server file that initializes the Express application,
 * sets up middleware for logging and error handling, and configures
 * both development (Vite) and production (static) environments.
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { recipeRouter } from './routes/recipes';
import { mealPlanRouter } from './routes/mealPlan';
import authRouter from './authRoutes';
import invitationRouter from './invitationRoutes';
import adminRouter from './routes/adminRoutes';
import trainerRouter from './routes/trainerRoutes';
import customerRouter from './routes/customerRoutes';
import path from 'path';
import { fileURLToPath } from 'url';
import ViteExpress from 'vite-express';

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
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key'));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
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

// API Routes - These must be defined BEFORE ViteExpress
app.use('/api/auth', authRouter);
app.use('/api/invitations', invitationRouter);
app.use('/api/recipes', recipeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/trainer', trainerRouter);
app.use('/api/customer', customerRouter);
app.use('/api/meal-plan', mealPlanRouter);

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // The "catchall" handler: for any request that doesn't match one above,
  // send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const port = process.env.PORT || 5001;

// In development, ViteExpress handles the frontend, but API routes should be handled by Express first
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
  // Configure ViteExpress with the correct client directory
  ViteExpress.config({
    mode: 'development',
    viteOptions: {
      root: path.join(__dirname, '../client'),
      server: {
        middlewareMode: true
      }
    }
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
