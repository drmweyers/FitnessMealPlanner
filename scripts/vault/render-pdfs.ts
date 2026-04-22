/**
 * render-pdfs.ts — Renders vault HTML files to PDF using Puppeteer.
 *
 * Usage:
 *   npx tsx scripts/vault/render-pdfs.ts                    # render all
 *   npx tsx scripts/vault/render-pdfs.ts --slug nutrition-sales-scripts --tier starter
 *
 * Reads HTML from docs/business-vault/html/{tier}/{slug}.html
 * Outputs PDF to docs/business-vault/pdfs/{tier}/{slug}-v1.pdf
 *
 * CRITICAL: Uses page.setContent() — NEVER page.goto() (SPA router trap).
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_DIR = path.resolve(__dirname, "../../docs/business-vault/html");
const PDF_DIR = path.resolve(__dirname, "../../docs/business-vault/pdfs");
const CHECKPOINT_PATH = path.resolve(
  __dirname,
  "../../docs/business-vault/pipeline-checkpoint.json",
);

interface CheckpointItem {
  htmlSize: number;
  pdfSize: number;
  pdfPages: number;
  status: "complete" | "failed";
  error?: string;
  timestamp: string;
}

interface Checkpoint {
  stage: string;
  timestamp: string;
  items: Record<string, Record<string, CheckpointItem>>;
}

function loadCheckpoint(): Checkpoint {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"));
  } catch {
    return { stage: "render", timestamp: new Date().toISOString(), items: {} };
  }
}

function saveCheckpoint(cp: Checkpoint) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

async function renderPdf(
  htmlPath: string,
  pdfPath: string,
): Promise<{ size: number; pages: number }> {
  const puppeteer = await import("puppeteer");
  const html = fs.readFileSync(htmlPath, "utf8");

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 1500));

    const bodyLen = await page.evaluate(() => document.body.innerText.length);
    if (bodyLen < 200) {
      throw new Error(
        `HTML did not render — body text length is only ${bodyLen} chars`,
      );
    }

    const pageCount = await page.evaluate(
      () => document.querySelectorAll(".page").length,
    );

    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      preferCSSPageSize: true,
    });

    const stat = fs.statSync(pdfPath);
    if (stat.size < 50000) {
      throw new Error(
        `PDF too small (${stat.size} bytes) — likely blank render`,
      );
    }

    return { size: stat.size, pages: pageCount };
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg =
    args.indexOf("--slug") >= 0 ? args[args.indexOf("--slug") + 1] : null;
  const tierArg =
    args.indexOf("--tier") >= 0 ? args[args.indexOf("--tier") + 1] : null;

  const tiers = tierArg ? [tierArg] : ["starter", "professional", "enterprise"];
  const checkpoint = loadCheckpoint();
  let rendered = 0;
  let failed = 0;

  for (const tier of tiers) {
    const tierHtmlDir = path.join(HTML_DIR, tier);
    if (!fs.existsSync(tierHtmlDir)) continue;

    const files = fs
      .readdirSync(tierHtmlDir)
      .filter((f) => f.endsWith(".html"));

    for (const file of files) {
      const slug = file.replace(".html", "");
      if (slugArg && slug !== slugArg) continue;

      if (checkpoint.items[slug]?.[tier]?.status === "complete") {
        const htmlStat = fs.statSync(path.join(tierHtmlDir, file));
        if (checkpoint.items[slug][tier].htmlSize === htmlStat.size) {
          console.log(`  SKIP ${tier}/${slug} (already rendered, same size)`);
          continue;
        }
      }

      const htmlPath = path.join(tierHtmlDir, file);
      const pdfPath = path.join(PDF_DIR, tier, `${slug}-v1.pdf`);

      console.log(`  RENDER ${tier}/${slug}...`);

      try {
        const result = await renderPdf(htmlPath, pdfPath);
        if (!checkpoint.items[slug]) checkpoint.items[slug] = {};
        checkpoint.items[slug][tier] = {
          htmlSize: fs.statSync(htmlPath).size,
          pdfSize: result.size,
          pdfPages: result.pages,
          status: "complete",
          timestamp: new Date().toISOString(),
        };
        console.log(
          `    OK — ${result.pages} pages, ${(result.size / 1024).toFixed(0)}KB`,
        );
        rendered++;
      } catch (err: any) {
        if (!checkpoint.items[slug]) checkpoint.items[slug] = {};
        checkpoint.items[slug][tier] = {
          htmlSize: 0,
          pdfSize: 0,
          pdfPages: 0,
          status: "failed",
          error: err.message,
          timestamp: new Date().toISOString(),
        };
        console.error(`    FAIL — ${err.message}`);
        failed++;
      }

      saveCheckpoint(checkpoint);
    }
  }

  console.log(`\nDone. Rendered: ${rendered}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
