/**
 * format-html.ts — Converts vault markdown content into branded HTML using templates.
 *
 * Usage:
 *   npx tsx scripts/vault/format-html.ts                    # format all
 *   npx tsx scripts/vault/format-html.ts --slug nutrition-revenue-accelerator --tier starter
 *
 * Reads markdown from docs/business-vault/content/{tier}/{slug}.md
 * Reads template from docs/business-vault/templates/base-template.html
 * Outputs HTML to docs/business-vault/html/{tier}/{slug}.html
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(
  __dirname,
  "../../docs/business-vault/content",
);
const TEMPLATE_DIR = path.resolve(
  __dirname,
  "../../docs/business-vault/templates",
);
const HTML_DIR = path.resolve(__dirname, "../../docs/business-vault/html");
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

function markdownToHtml(md: string): string {
  let html = md;

  html = html.replace(/^---+$/gm, "");
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(
    /^## (.+)$/gm,
    '</div></div><div class="page page-light"><div class="page-inner"><div class="section-header"><h2>$1</h2></div>',
  );
  html = html.replace(/^# (.+)$/gm, "");

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  html = html.replace(
    /^> "(.+)"$/gm,
    '<div class="dialogue dialogue-you"><div class="dialogue-label">You</div><div class="dialogue-text">"$1"</div></div>',
  );
  html = html.replace(/^> (.+)$/gm, '<div class="callout"><p>$1</p></div>');

  html = html.replace(/^- \[ \] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^(\d+)\. (.+)$/gm, "<li><strong>$1.</strong> $2</li>");

  html = html.replace(
    /(<li>.+<\/li>\n?)+/g,
    (match) => `<ul class="checklist">${match}</ul>`,
  );

  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match
      .split("|")
      .filter(Boolean)
      .map((c) => c.trim());
    if (cells.every((c) => /^[-:]+$/.test(c))) return "";
    const tag = cells[0] && /^\*\*/.test(cells[0]) ? "th" : "td";
    const row = cells
      .map((c) => `<${tag}>${c.replace(/\*\*/g, "")}</${tag}>`)
      .join("");
    return `<tr>${row}</tr>`;
  });

  html = html.replace(/^(?!<[a-z/])((?!\s*$).+)$/gm, "<p>$1</p>");

  html = html.replace(/<p>\s*<\/p>/g, "");
  html = html.replace(/<p><\/div>/g, "</div>");

  return html;
}

function main() {
  const args = process.argv.slice(2);
  const slugArg =
    args.indexOf("--slug") >= 0 ? args[args.indexOf("--slug") + 1] : null;
  const tierArg =
    args.indexOf("--tier") >= 0 ? args[args.indexOf("--tier") + 1] : null;

  const catalog: { items: CatalogItem[] } = JSON.parse(
    fs.readFileSync(CATALOG_PATH, "utf8"),
  );
  const baseTemplate = fs.readFileSync(
    path.join(TEMPLATE_DIR, "base-template.html"),
    "utf8",
  );

  let formatted = 0;

  for (const item of catalog.items) {
    if (slugArg && item.slug !== slugArg) continue;

    const tiers = tierArg ? [tierArg] : item.tiers;

    for (const tier of tiers) {
      const mdPath = path.join(CONTENT_DIR, tier, `${item.slug}.md`);
      if (!fs.existsSync(mdPath)) {
        console.log(`  SKIP ${tier}/${item.slug} (no markdown file)`);
        continue;
      }

      const md = fs.readFileSync(mdPath, "utf8");

      if (md.length < 500) {
        console.error(
          `  FAIL ${tier}/${item.slug} — content too short (${md.length} chars)`,
        );
        process.exit(1);
      }

      const contentHtml = markdownToHtml(md);
      const wrappedContent = `<div class="page page-light"><div class="page-inner">${contentHtml}</div></div>`;

      const html = baseTemplate
        .replace("{{TITLE}}", item.title)
        .replace("{{SUBTITLE}}", item.subtitle)
        .replace("{{CONTENT}}", wrappedContent);

      const outDir = path.join(HTML_DIR, tier);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, `${item.slug}.html`), html);

      console.log(
        `  FORMAT ${tier}/${item.slug} — ${(html.length / 1024).toFixed(0)}KB`,
      );
      formatted++;
    }
  }

  console.log(`\nDone. Formatted: ${formatted} HTML files`);
}

main();
