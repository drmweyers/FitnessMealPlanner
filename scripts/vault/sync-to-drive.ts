/**
 * sync-to-drive.ts — Copies vault PDFs and source content to BCI Google Drive.
 *
 * Usage:
 *   npx tsx scripts/vault/sync-to-drive.ts
 *
 * Destination: I:/My Drive/BCI Innovation Labs/Product/EvoFit Meals/Business Vault/
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRIVE_BASE =
  "I:/My Drive/BCI Innovation Labs/Product/EvoFit Meals/Business Vault";
const PDF_DIR = path.resolve(__dirname, "../../docs/business-vault/pdfs");
const CONTENT_DIR = path.resolve(
  __dirname,
  "../../docs/business-vault/content",
);
const DOCS_DIR = path.resolve(__dirname, "../../docs/business-vault");

const TIER_FOLDERS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyIfNewer(src: string, dest: string): boolean {
  if (!fs.existsSync(src)) return false;

  const srcStat = fs.statSync(src);
  if (fs.existsSync(dest)) {
    const destStat = fs.statSync(dest);
    if (srcStat.mtimeMs <= destStat.mtimeMs && srcStat.size === destStat.size) {
      return false;
    }
  }

  fs.copyFileSync(src, dest);
  return true;
}

function main() {
  if (!fs.existsSync("I:/My Drive/BCI Innovation Labs")) {
    console.error("Google Drive not mounted at I:/My Drive/");
    console.error("Make sure Google Drive for Desktop is running.");
    process.exit(1);
  }

  let copied = 0;
  let skipped = 0;

  console.log("--- Syncing PDFs ---");
  for (const [tier, folder] of Object.entries(TIER_FOLDERS)) {
    const srcDir = path.join(PDF_DIR, tier);
    const destDir = path.join(DRIVE_BASE, folder);
    ensureDir(destDir);

    if (!fs.existsSync(srcDir)) continue;

    for (const file of fs
      .readdirSync(srcDir)
      .filter((f) => f.endsWith(".pdf"))) {
      const src = path.join(srcDir, file);
      const dest = path.join(destDir, file);
      if (copyIfNewer(src, dest)) {
        console.log(`  COPY ${folder}/${file}`);
        copied++;
      } else {
        skipped++;
      }
    }
  }

  console.log("--- Syncing Source Content ---");
  for (const [tier] of Object.entries(TIER_FOLDERS)) {
    const srcDir = path.join(CONTENT_DIR, tier);
    const destDir = path.join(DRIVE_BASE, "_Source Content", tier);
    ensureDir(destDir);

    if (!fs.existsSync(srcDir)) continue;

    for (const file of fs
      .readdirSync(srcDir)
      .filter((f) => f.endsWith(".md"))) {
      const src = path.join(srcDir, file);
      const dest = path.join(destDir, file);
      if (copyIfNewer(src, dest)) {
        console.log(`  COPY _Source Content/${tier}/${file}`);
        copied++;
      } else {
        skipped++;
      }
    }
  }

  console.log("--- Syncing Specs ---");
  const specsDir = path.join(DRIVE_BASE, "_Specs & Strategy");
  ensureDir(specsDir);

  for (const file of ["business-vault-spec.md"]) {
    const src = path.join(DOCS_DIR, file);
    const dest = path.join(specsDir, file);
    if (copyIfNewer(src, dest)) {
      console.log(`  COPY _Specs & Strategy/${file}`);
      copied++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Copied: ${copied}, Up-to-date: ${skipped}`);
}

main();
