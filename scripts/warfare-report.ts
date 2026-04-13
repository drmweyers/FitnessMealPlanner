/**
 * warfare-report.ts — FORGE QA Warfare v2 Sprint 6
 *
 * Generates a human-readable warfare run report by joining:
 *   - tests/e2e/reports/warfare-results.json (Playwright JSON reporter)
 *   - tests/e2e/simulations/reports/coverage.json (matrix tracker)
 *
 * Output:
 *   - tests/e2e/reports/warfare-summary.md (markdown table)
 *   - stdout summary
 *   - exit 1 if any required suite has failures
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const ROOT = process.cwd();
const PW_RESULTS = join(ROOT, "tests/e2e/reports/warfare-results.json");
const COVERAGE = join(ROOT, "tests/e2e/simulations/reports/coverage.json");
const OUT = join(ROOT, "tests/e2e/reports/warfare-summary.md");

interface PwSuite {
  title: string;
  specs?: PwSpec[];
  suites?: PwSuite[];
}
interface PwSpec {
  title: string;
  ok: boolean;
  tests: PwTest[];
}
interface PwTest {
  results: { status: string; error?: { message?: string } }[];
}

function walkSuites(suites: PwSuite[] | undefined): PwSpec[] {
  if (!suites) return [];
  const out: PwSpec[] = [];
  for (const s of suites) {
    if (s.specs) out.push(...s.specs);
    if (s.suites) out.push(...walkSuites(s.suites));
  }
  return out;
}

async function main() {
  let pwResults: { suites?: PwSuite[] } | null = null;
  try {
    pwResults = JSON.parse(await readFile(PW_RESULTS, "utf8"));
  } catch {
    console.warn(
      `[report] No Playwright results at ${PW_RESULTS} — skipping suite section`,
    );
  }

  let coverage: {
    totalCells: number;
    covered: number;
    pending: number;
    percentCovered: number;
    bySuite: Record<string, Record<string, number>>;
  } | null = null;
  try {
    coverage = JSON.parse(await readFile(COVERAGE, "utf8"));
  } catch {
    console.warn(`[report] No coverage report at ${COVERAGE}`);
  }

  const specs = walkSuites(pwResults?.suites);
  const passed = specs.filter((s) => s.ok).length;
  const failed = specs.filter((s) => !s.ok);

  const lines: string[] = [];
  lines.push(`# FORGE QA Warfare v2 — Run Report`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`## Suite results`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Total specs | ${specs.length} |`);
  lines.push(`| Passed | ${passed} |`);
  lines.push(`| Failed | ${failed.length} |`);
  lines.push(
    `| Pass rate | ${specs.length ? ((passed / specs.length) * 100).toFixed(1) : "0.0"}% |`,
  );
  lines.push("");

  if (failed.length > 0) {
    lines.push(`## Failures`);
    lines.push("");
    for (const f of failed) {
      const err = f.tests[0]?.results[0]?.error?.message || "no error message";
      lines.push(`- **${f.title}**`);
      lines.push(`  - ${err.split("\n")[0].slice(0, 200)}`);
    }
    lines.push("");
  }

  if (coverage) {
    lines.push(`## Coverage matrix`);
    lines.push("");
    lines.push(
      `**${coverage.percentCovered}%** covered (${coverage.covered}/${coverage.totalCells} cells)`,
    );
    lines.push("");
    lines.push(`| Suite | Pending | Covered | Blocked |`);
    lines.push(`| --- | ---: | ---: | ---: |`);
    for (const [suite, counts] of Object.entries(coverage.bySuite)) {
      lines.push(
        `| ${suite} | ${counts.pending} | ${counts.covered} | ${counts.blocked || 0} |`,
      );
    }
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`*Run: \`npm run warfare:full\`*`);

  await mkdir(join(ROOT, "tests/e2e/reports"), { recursive: true });
  await writeFile(OUT, lines.join("\n"));
  console.log(`[report] Wrote ${OUT}`);
  console.log(
    `[report] Specs: ${passed}/${specs.length} passed; coverage: ${coverage?.percentCovered ?? 0}%`,
  );

  if (failed.length > 0) {
    console.error(`\n❌ ${failed.length} spec(s) failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[report] FATAL:", err);
  process.exit(1);
});
