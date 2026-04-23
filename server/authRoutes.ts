import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "./storage";
import {
  hashPassword,
  comparePasswords,
  generateTokens,
  verifyToken,
  verifyRefreshToken,
} from "./auth";
import { users } from "../shared/schema";
import crypto from "crypto";
import passport from "./passport-config";
import { requireAuth, requireAdmin, requireRole } from "./middleware/auth";
import {
  authRateLimiter,
  generalAuthRateLimiter,
  passwordResetRateLimiter,
} from "./middleware/rateLimiter";
import { AuditLogger } from "./services/auditLogger";
import { ExtendedSession } from "./types/auth";

const authRouter = Router();

// 2026-04-23: domain-aware OAuth callback. The legacy GOOGLE_CALLBACK_URL
// env is hardcoded to evofitmeals.com, which means users who start the
// Google flow from meals.evofit.io get bounced to the old domain after
// consent. Derive the callback from the request Host header instead, but
// restrict to an allowlist so we can't be tricked into an open redirect.
const OAUTH_ALLOWED_HOSTS = new Set([
  "evofitmeals.com",
  "meals.evofit.io",
  "localhost:4000",
  "localhost:5001",
]);

function googleCallbackURL(req: Request): string {
  const host = (req.get("host") || "").toLowerCase();
  if (OAUTH_ALLOWED_HOSTS.has(host)) {
    const proto = host.startsWith("localhost") ? "http" : "https";
    return `${proto}://${host}/api/auth/google/callback`;
  }
  // Fallback to the configured env value (which must exist in Google's
  // authorized redirect list) if the request Host is unexpected.
  return (
    process.env.GOOGLE_CALLBACK_URL ||
    "https://evofitmeals.com/api/auth/google/callback"
  );
}

// Enhanced registration schema with stronger validation
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
  role: z.enum(["admin", "trainer", "customer"]),
});

// Rate limiting for failed attempts (implement proper rate limiting middleware in production)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function checkLoginAttempts(email: string): boolean {
  const attempts = loginAttempts.get(email);
  if (!attempts) return true;

  if (Date.now() - attempts.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.delete(email);
    return true;
  }

  return attempts.count < MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(email: string) {
  const attempts = loginAttempts.get(email) || {
    count: 0,
    lastAttempt: Date.now(),
  };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(email, attempts);
}

authRouter.post(
  "/register",
  generalAuthRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { email, password, role } = registerSchema.parse(req.body);

      // Check for existing user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          status: "error",
          message: "User already exists",
          code: "USER_EXISTS",
        });
      }

      // For admin registration, require an existing admin token
      if (role === "admin") {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(403).json({
            status: "error",
            message: "Admin registration requires authorization",
            code: "ADMIN_AUTH_REQUIRED",
          });
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyToken(token);

        if (!decoded || decoded.role !== "admin") {
          return res.status(403).json({
            status: "error",
            message: "Only existing admins can create new admin accounts",
            code: "ADMIN_ONLY",
          });
        }
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        role,
      });

      const { accessToken, refreshToken } = generateTokens(newUser);

      const refreshTokenExpires = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ); // 30 days
      await storage.createRefreshToken(
        newUser.id,
        refreshToken,
        refreshTokenExpires,
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        expires: refreshTokenExpires,
      });

      res.status(201).json({
        status: "success",
        data: {
          accessToken,
          user: {
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            profilePicture: newUser.profilePicture,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: "error",
          message: fromZodError(error as any).toString(),
          code: "VALIDATION_ERROR",
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        code: "SERVER_ERROR",
      });
    }
  },
);

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

authRouter.post(
  "/login",
  authRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Check login attempts (backup to rate limiter)
      if (!checkLoginAttempts(email)) {
        // Log the lockout event
        await AuditLogger.logFailedLogin(
          req,
          email,
          "Account temporarily locked",
        );
        return res.status(429).json({
          status: "error",
          message: "Too many failed attempts. Please try again in 15 minutes.",
          code: "ACCOUNT_LOCKED",
          retryAfter: new Date(Date.now() + LOCKOUT_TIME).toISOString(),
        });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        recordLoginAttempt(email);
        // Log failed login attempt
        await AuditLogger.logFailedLogin(req, email, "User not found");
        return res.status(401).json({
          status: "error",
          message:
            "Invalid email or password. Please check your credentials and try again.",
          code: "AUTH_INVALID_CREDENTIALS",
          field: "email",
        });
      }

      if (!user.password) {
        // User registered via OAuth only
        await AuditLogger.logFailedLogin(req, email, "OAuth-only account");
        return res.status(401).json({
          status: "error",
          message:
            "This account uses social login. Please sign in with Google.",
          code: "AUTH_OAUTH_REQUIRED",
        });
      }
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        recordLoginAttempt(email);
        // Log failed login attempt
        await AuditLogger.logFailedLogin(req, email, "Invalid password");
        return res.status(401).json({
          status: "error",
          message:
            "Invalid email or password. Please check your credentials and try again.",
          code: "AUTH_INVALID_CREDENTIALS",
          field: "password",
        });
      }

      // Reset login attempts on successful login
      loginAttempts.delete(email);

      // Log successful login
      await AuditLogger.logLogin(req, user.id, "password");

      const { accessToken, refreshToken } = generateTokens(user);

      const refreshTokenExpires = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ); // 30 days
      await storage.createRefreshToken(
        user.id,
        refreshToken,
        refreshTokenExpires,
      );

      const accessTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Set the main access token as a secure, HttpOnly cookie
      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // Use 'lax' for better cross-site dev compatibility
        expires: accessTokenExpires,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // Use 'lax' for better cross-site dev compatibility
        expires: refreshTokenExpires,
      });

      res.json({
        status: "success",
        data: {
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          status: "error",
          message: fromZodError(error as any).toString(),
          code: "VALIDATION_ERROR",
        });
      }
      console.error("Login error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        code: "SERVER_ERROR",
      });
    }
  },
);

authRouter.post(
  "/refresh_token",
  generalAuthRateLimiter,
  async (req: Request, res: Response) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({
        status: "error",
        message: "Refresh token not found",
        code: "NO_REFRESH_TOKEN",
      });
    }

    try {
      // Verify refresh token using the correct verification function
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        res.clearCookie("token");
        res.clearCookie("refreshToken");
        return res.status(403).json({
          status: "error",
          message: "Invalid refresh token",
          code: "INVALID_REFRESH_TOKEN",
        });
      }

      // Validate refresh token in storage or grace period
      const storedToken = await storage.getRefreshToken(refreshToken);
      const { isTokenInGracePeriod } =
        await import("./middleware/tokenRefreshManager");
      const inGracePeriod = isTokenInGracePeriod(refreshToken);

      // Token must be in storage OR in grace period
      if (!storedToken && !inGracePeriod) {
        res.clearCookie("token");
        res.clearCookie("refreshToken");
        return res.status(403).json({
          status: "error",
          message: "Refresh token not found in store",
          code: "INVALID_REFRESH_TOKEN",
        });
      }

      // Check expiry only if token is in storage (grace period tokens are already validated)
      if (storedToken && new Date() > new Date(storedToken.expiresAt)) {
        await storage.deleteRefreshToken(refreshToken);
        res.clearCookie("token");
        res.clearCookie("refreshToken");
        return res.status(403).json({
          status: "error",
          message: "Refresh token expired",
          code: "EXPIRED_REFRESH_TOKEN",
        });
      }

      const user = await storage.getUser(decoded.id);
      if (!user) {
        res.clearCookie("token");
        res.clearCookie("refreshToken");
        return res.status(404).json({
          status: "error",
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Use token refresh manager for proper token rotation and deduplication
      const { refreshTokensWithDeduplication } =
        await import("./middleware/tokenRefreshManager");
      const { accessToken, refreshToken: newRefreshToken } =
        await refreshTokensWithDeduplication(user.id, refreshToken);

      // Set new cookies with updated tokens
      const accessTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const refreshTokenExpires = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ); // 30 days

      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: accessTokenExpires,
      });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: refreshTokenExpires,
      });

      res.json({
        status: "success",
        data: {
          accessToken,
          refreshToken: newRefreshToken, // Return new refresh token for clients that need it
        },
      });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.clearCookie("token");
      res.clearCookie("refreshToken");
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        code: "SERVER_ERROR",
      });
    }
  },
);

authRouter.post(
  "/logout",
  requireAuth,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      // Log the logout event if user is available
      if (req.user?.id) {
        await AuditLogger.logLogout(req, req.user.id);
      }

      const { refreshToken } = req.cookies;
      if (refreshToken) {
        await storage.deleteRefreshToken(refreshToken);
      }

      // Clear both tokens
      res.clearCookie("token");
      res.clearCookie("refreshToken");

      res.status(200).json({
        status: "success",
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear cookies even if logging fails
      res.clearCookie("token");
      res.clearCookie("refreshToken");
      res.status(200).json({
        status: "success",
        message: "Logged out successfully",
      });
    }
  },
);

interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: "admin" | "trainer" | "customer";
  };
}

// Authentication middleware is imported from ./middleware/auth.ts
// It includes automatic token refresh functionality

// Role-based middleware is imported from ./middleware/auth.ts

authRouter.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }
    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      code: "SERVER_ERROR",
    });
  }
});

// NOTE: Profile GET/PUT moved to server/routes/profileRoutes.ts (mounted at /api/profile).
// The previous handlers here returned hardcoded mock data and silently dropped writes;
// they were removed 2026-04-12 to fix the broken Edit Profile feature.

// Google OAuth Routes
// Note: passport-google-oauth20 accepts `callbackURL` at authenticate-time
// (docs: https://github.com/jaredhanson/passport-google-oauth2#re-ask-for-permissions)
// but @types/passport-google-oauth20 doesn't expose it, hence the `as any` casts.
authRouter.get("/google", (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    callbackURL: googleCallbackURL(req),
  } as any)(req, res, next);
});

authRouter.get(
  "/google/callback",
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("google", {
      failureRedirect: "/login?error=oauth_failed",
      callbackURL: googleCallbackURL(req),
    } as any)(req, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const user = req.user as {
        id: string;
        email: string;
        role: "admin" | "trainer" | "customer";
        name: string | null;
        googleId: string | null;
        profilePicture: string | null;
        password: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
      };
      console.log("Google OAuth callback - user:", user);

      if (!user) {
        console.error("No user returned from Google OAuth");
        return res.redirect("/login?error=no_user");
      }

      // Generate JWT tokens for the user
      const { accessToken, refreshToken } = generateTokens(
        user as unknown as import("@shared/schema").User,
      );
      console.log("Generated tokens for user:", user.email, "role:", user.role);

      // Set refresh token in HTTP-only cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Redirect to frontend with success based on user role
      let redirectPath = "/";
      switch (user.role) {
        case "admin":
          redirectPath = "/admin";
          break;
        case "trainer":
          redirectPath = "/trainer";
          break;
        case "customer":
          redirectPath = "/my-meal-plans";
          break;
      }

      // In development, we pass the token as a query parameter
      // In production, the cookie should be sufficient
      const redirectUrl =
        process.env.NODE_ENV === "production"
          ? redirectPath
          : `http://localhost:4000${redirectPath}?token=${accessToken}`;

      console.log("Redirecting to:", redirectUrl);
      console.log("User role:", user.role);
      console.log("Redirect path:", redirectPath);

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect("/login?error=auth_error");
    }
  },
);

// Route to initiate Google OAuth with role selection
authRouter.get(
  "/google/:role",
  (req: Request, res: Response, next: NextFunction) => {
    const { role } = req.params;

    if (!["trainer", "customer"].includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid role specified",
        code: "INVALID_ROLE",
      });
    }

    // Store the intended role in session
    (req.session as ExtendedSession).intendedRole = role as
      | "trainer"
      | "customer";

    passport.authenticate("google", {
      scope: ["profile", "email"],
      callbackURL: googleCallbackURL(req),
    } as any)(req, res, next);
  },
);

// Development endpoint to reset rate limiting for testing
if (process.env.NODE_ENV === "development") {
  authRouter.post("/dev/reset-rate-limits", (req: Request, res: Response) => {
    try {
      loginAttempts.clear();
      console.log("🧹 Rate limits reset for development testing");
      res.json({
        status: "success",
        message: "Rate limits reset successfully",
        resetCount: loginAttempts.size,
      });
    } catch (error) {
      console.error("Error resetting rate limits:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to reset rate limits",
        code: "RESET_ERROR",
      });
    }
  });
}

export default authRouter;
