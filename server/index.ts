/**
 * FitMeal Pro Server Entry Point
 * 
 * This is the main server file that initializes the Express application,
 * sets up middleware for logging and error handling, and configures
 * both development (Vite) and production (static) environments.
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Initialize Express application
const app = express();

// Parse JSON payloads up to 100kb (default limit)
app.use(express.json());

// Parse URL-encoded form data (for traditional form submissions)
app.use(express.urlencoded({ extended: false }));

/**
 * Request Logging Middleware
 * 
 * This middleware captures and logs all API requests with timing information.
 * It intercepts the response JSON to include response data in logs for debugging.
 * Only logs API routes (paths starting with "/api") to avoid cluttering logs
 * with static asset requests.
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Monkey-patch res.json to capture response data for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log when response is complete
  res.on("finish", () => {
    const duration = Date.now() - start;
    
    // Only log API routes to reduce noise
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Include response data in logs for debugging
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Truncate long log lines to keep terminal readable
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Application Bootstrap Function
 * 
 * This async IIFE handles the complete server initialization process:
 * 1. Registers all API routes and authentication
 * 2. Sets up error handling middleware
 * 3. Configures development/production environments
 * 4. Starts the HTTP server
 */
(async () => {
  // Register all API routes, authentication middleware, and get HTTP server instance
  const server = await registerRoutes(app);

  /**
   * Global Error Handler Middleware
   * 
   * Catches any unhandled errors thrown in route handlers and formats
   * them as JSON responses. This must be registered after all routes
   * to ensure it catches errors from any route handler.
   */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  /**
   * Environment-Specific Setup
   * 
   * Development: Sets up Vite development server with hot module replacement
   * Production: Serves pre-built static assets from dist folder
   * 
   * IMPORTANT: Vite setup must come AFTER all API routes to prevent
   * the catch-all route from interfering with API endpoints
   */
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  /**
   * Server Startup
   * 
   * Port 5000 is required as it's the only non-firewalled port in Replit.
   * The server binds to 0.0.0.0 to accept connections from any interface,
   * and reusePort allows multiple processes to bind to the same port.
   */
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
