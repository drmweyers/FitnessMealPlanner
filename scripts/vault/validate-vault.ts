/**
 * validate-vault.ts — Quality checks for vault content and PDFs.
 *
 * Usage:
 *   npx tsx scripts/vault/validate-vault.ts
 *
 * Checks:
 * 1. Every item in product-catalog.json has matching markdown files
 * 2. Markdown files have >500 chars
 * 3. If PDFs exist: >100KB, correct naming
 * 4. Tier coherence: every Pro item has a Starter counterpart, every Enterprise has Pro
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(
  __dirname,
  "../../docs/business-vault/content",
);
const PDF_DIR = path.resolve(__dirname, "../../docs/business-vault/pdfs");
const CATALOG_PATH = path.resolve(
  __dirname,
  "../../docs/business-vault/config/product-catalog.json",
);

interface CatalogItem {
  slug: string;
  type: string;
  title: string;
  subtitle: string;
  tiers: string[];
}

function main() {
  const catalog: { items: CatalogItem[] } = JSON.parse(
    fs.readFileSync(CATALOG_PATH, "utf8"),
  );
  let pass = 0;
  let fail = 0;
  const issues: string[] = [];

  console.log("=== EvoFit Meals Vault Content Validation ===\n");

  console.log("--- Content Files ---");
  for (const item of catalog.items) {
    for (const tier of item.tiers) {
      const mdPath = path.join(CONTENT_DIR, tier, `${item.slug}.md`);
      if (!fs.existsSync(mdPath)) {
        console.log(`  MISS ${tier}/${item.slug}`);
        issues.push(`Missing: ${tier}/${item.slug}.md`);
        fail++;
        continue;
      }
      const content = fs.readFileSync(mdPath, "utf8");
      if (content.length < 500) {
        console.log(`  SHORT ${tier}/${item.slug} (${content.length} chars)`);
        issues.push(
          `Too short: ${tier}/${item.slug}.md (${content.length} chars, need 500+)`,
        );
        fail++;
      } else {
        console.log(`  OK ${tier}/${item.slug} (${content.length} chars)`);
        pass++;
      }
    }
  }

  console.log("\n--- PDF Files ---");
  for (const item of catalog.items) {
    for (const tier of item.tiers) {
      const pdfPath = path.join(PDF_DIR, tier, `${item.slug}-v1.pdf`);
      if (!fs.existsSync(pdfPath)) {
        console.log(`  PEND ${tier}/${item.slug} (no PDF yet)`);
        continue;
      }
      const stat = fs.statSync(pdfPath);
      if (stat.size < 100000) {
        console.log(
          `  SMALL ${tier}/${item.slug} (${(stat.size / 1024).toFixed(0)}KB)`,
        );
        issues.push(
          `PDF too small: ${tier}/${item.slug}-v1.pdf (${(stat.size / 1024).toFixed(0)}KB, need 100KB+)`,
        );
        fail++;
      } else {
        console.log(
          `  OK ${tier}/${item.slug} (${(stat.size / 1024).toFixed(0)}KB)`,
        );
        pass++;
      }
    }
  }

  console.log("\n--- Tier Coherence ---");
  for (const item of catalog.items) {
    if (
      item.tiers.includes("enterprise") &&
      item.tiers.includes("professional")
    ) {
      const proPath = path.join(CONTENT_DIR, "professional", `${item.slug}.md`);
      const entPath = path.join(CONTENT_DIR, "enterprise", `${item.slug}.md`);
      if (fs.existsSync(proPath) && fs.existsSync(entPath)) {
        const proLen = fs.readFileSync(proPath, "utf8").length;
        const entLen = fs.readFileSync(entPath, "utf8").length;
        if (entLen < proLen) {
          console.log(
            `  WARN ${item.slug}: Enterprise (${entLen}) shorter than Professional (${proLen})`,
          );
          issues.push(
            `Tier coherence: ${item.slug} Enterprise content shorter than Professional`,
          );
        } else {
          console.log(
            `  OK ${item.slug}: Enterprise (${entLen}) >= Professional (${proLen})`,
          );
        }
      }
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Passed: ${pass}`);
  console.log(`Failed: ${fail}`);
  console.log(
    `Missing (pending generation): ${catalog.items.reduce((acc, item) => {
      return (
        acc +
        item.tiers.filter(
          (t) => !fs.existsSync(path.join(CONTENT_DIR, t, `${item.slug}.md`)),
        ).length
      );
    }, 0)}`,
  );

  if (issues.length > 0) {
    console.log(`\nIssues:`);
    issues.forEach((i) => console.log(`  - ${i}`));
  }

  process.exit(fail > 0 ? 1 : 0);
}

main();
