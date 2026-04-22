/**
 * Business Vault Routes
 *
 * Tier-gated access to the Business Vault digital products (PDFs).
 * Trainers only — customers and non-trainers cannot access.
 *
 * GET /api/vault/items             → list items available for current tier
 * GET /api/vault/download/:slug    → stream the tier-appropriate PDF
 */

import { Router } from "express";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { trainerSubscriptions } from "../../shared/schema";
import {
  VAULT_CATALOG_VERSION,
  VAULT_ITEMS,
  VaultTier,
  itemsForTier,
  resolveItem,
  resolvePdfTier,
} from "../../shared/vault-catalog";

export const vaultRouter = Router();

const PDF_ROOT = path.resolve(process.cwd(), "docs", "business-vault", "pdfs");

async function getUserTier(userId: string): Promise<VaultTier> {
  const subscription = await db.query.trainerSubscriptions.findFirst({
    where: eq(trainerSubscriptions.trainerId, userId),
    orderBy: (subs, { desc }) => [desc(subs.createdAt)],
  });
  if (!subscription || subscription.status !== "active") {
    return "starter";
  }
  return subscription.tier as VaultTier;
}

/**
 * GET /api/vault/items
 * Returns the catalog of vault items the current trainer can access.
 */
vaultRouter.get("/items", requireAuth, async (req, res) => {
  try {
    const userRole = req.user!.role;

    if (userRole !== "trainer") {
      return res.status(403).json({
        success: false,
        error: "Business Vault is available to trainers only.",
        code: "TRAINER_ONLY",
      });
    }

    const tier = await getUserTier(req.user!.id);
    const available = itemsForTier(tier);
    const lockedCount = VAULT_ITEMS.length - available.length;

    res.json({
      success: true,
      tier,
      catalogVersion: VAULT_CATALOG_VERSION,
      items: available.map((item) => ({
        slug: item.slug,
        title: item.title,
        subtitle: item.subtitle,
        type: item.type,
        deliveredTier: resolvePdfTier(item, tier),
      })),
      locked: VAULT_ITEMS.filter((item) => !available.includes(item)).map(
        (item) => ({
          slug: item.slug,
          title: item.title,
          type: item.type,
          requiredTier: item.tiers[0],
        }),
      ),
      lockedCount,
    });
  } catch (error) {
    console.error("[Vault API] Failed to list items:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load vault items.",
    });
  }
});

/**
 * GET /api/vault/download/:slug
 * Streams the PDF for the requested item at the highest tier the user
 * is entitled to. 403 if the user's tier doesn't include the item.
 */
vaultRouter.get("/download/:slug", requireAuth, async (req, res) => {
  try {
    const userRole = req.user!.role;
    const { slug } = req.params;

    if (userRole !== "trainer") {
      return res.status(403).json({
        success: false,
        error: "Business Vault is available to trainers only.",
        code: "TRAINER_ONLY",
      });
    }

    const item = resolveItem(slug);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Vault item not found.",
        code: "NOT_FOUND",
      });
    }

    const tier = await getUserTier(req.user!.id);
    const pdfTier = resolvePdfTier(item, tier);
    if (!pdfTier) {
      return res.status(403).json({
        success: false,
        error: `This item requires a ${item.tiers[0]} subscription or higher.`,
        code: "TIER_UPGRADE_REQUIRED",
        requiredTier: item.tiers[0],
      });
    }

    const filename = `${slug}-${VAULT_CATALOG_VERSION}.pdf`;
    const pdfPath = path.join(PDF_ROOT, pdfTier, filename);

    if (!fs.existsSync(pdfPath)) {
      console.error(
        `[Vault API] PDF missing on disk: ${pdfPath} (user tier: ${tier}, resolved: ${pdfTier})`,
      );
      return res.status(500).json({
        success: false,
        error: "Vault PDF is temporarily unavailable. Please try again later.",
        code: "FILE_MISSING",
      });
    }

    const downloadName = `evofit-${slug}-${pdfTier}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadName}"`,
    );

    fs.createReadStream(pdfPath)
      .on("error", (streamError) => {
        console.error(`[Vault API] Stream error for ${pdfPath}:`, streamError);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: "Failed to stream vault PDF.",
          });
        } else {
          res.destroy();
        }
      })
      .pipe(res);
  } catch (error) {
    console.error("[Vault API] Download failed:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Failed to download vault item.",
      });
    }
  }
});
