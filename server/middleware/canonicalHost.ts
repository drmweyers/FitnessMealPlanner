import { Request, Response, NextFunction } from "express";

// Canonical domain decision (Mark, 2026-06-10): meals.evofit.io is the one
// true host. evofitmeals.com served identical content with no redirect,
// splitting SEO between two domains while og:url pointed at the wrong one.
export const CANONICAL_HOST = "meals.evofit.io";
const LEGACY_HOSTS = new Set(["evofitmeals.com", "www.evofitmeals.com"]);

export function canonicalHostRedirect(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const host = (req.headers.host || "").toLowerCase().split(":")[0];
  if (LEGACY_HOSTS.has(host)) {
    res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
    return;
  }
  next();
}
