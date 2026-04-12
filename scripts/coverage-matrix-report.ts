/**
 * coverage-matrix-report.ts — FORGE QA Warfare v2 (Sprint 1 Story 1.5)
 *
 * Reads docs/plans/qa-warfare-coverage-matrix.csv (the seed scaffold) and
 * walks tests/e2e/simulations/ + test/integration/ for `// @cover TEST-ID`
 * annotations on test files. Marks each matched cell as `covered`.
 *
 * Emits:
 *   - tests/e2e/simulations/reports/coverage.json (full state)
 *   - stdout summary (suite × status counts)
 *   - exit code 1 if --gate is passed and any cell is `pending` after the run
 *     (optionally with --threshold N for "fail if more than N pending")
 *
 * Usage:
 *   npx tsx scripts/coverage-matrix-report.ts
 *   npx tsx scripts/coverage-matrix-report.ts --gate --threshold 50
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { glob } from "glob";

const ROOT = process.cwd();
const MATRIX_PATH = join(ROOT, "docs/plans/qa-warfare-coverage-matrix.csv");
const REPORT_PATH = join(ROOT, "tests/e2e/simulations/reports/coverage.json");
const SCAN_GLOBS = [
  "tests/e2e/simulations/**/*.spec.ts",
  "tests/e2e/forge/**/*.spec.ts",
  "test/integration/**/*.test.ts",
];

interface Cell {
  suite: string;
  role: string;
  endpointOrRoute: string;
  state: string;
  inputClass: string;
  assertionType: string;
  status: "pending" | "covered" | "n/a" | "blocked";
  testId: string;
  notes: string;
}

function parseCsv(text: string): Cell[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: Cell[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 9) continue;
    out.push({
      suite: cols[0],
      role: cols[1],
      endpointOrRoute: cols[2],
      state: cols[3],
      inputClass: cols[4],
      assertionType: cols[5],
      status: cols[6] as Cell["status"],
      testId: cols[7],
      notes: cols[8],
    });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function escapeCsv(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function toCsv(cells: Cell[]): string {
  const header =
    "suite,role,endpoint_or_route,state,input_class,assertion_type,status,test_id,notes";
  const rows = cells.map((c) =>
    [
      c.suite,
      c.role,
      c.endpointOrRoute,
      c.state,
      c.inputClass,
      c.assertionType,
      c.status,
      c.testId,
      c.notes,
    ]
      .map(escapeCsv)
      .join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

async function findCoverageAnnotations(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const pattern of SCAN_GLOBS) {
    const files = await glob(pattern, { cwd: ROOT });
    for (const file of files) {
      const text = await readFile(join(ROOT, file), "utf8");
      const matches = text.matchAll(/@cover\s+([A-Z]+-\d+)/g);
      for (const m of matches) {
        ids.add(m[1]);
      }
    }
  }
  return ids;
}

async function main() {
  const args = process.argv.slice(2);
  const gate = args.includes("--gate");
  const writeBack = args.includes("--write");
  const thresholdIdx = args.indexOf("--threshold");
  const threshold =
    thresholdIdx >= 0 ? parseInt(args[thresholdIdx + 1] || "0", 10) : 0;

  const csvText = await readFile(MATRIX_PATH, "utf8");
  const cells = parseCsv(csvText);
  console.log(`[matrix] Loaded ${cells.length} cells from ${MATRIX_PATH}`);

  const covered = await findCoverageAnnotations();
  console.log(
    `[matrix] Found ${covered.size} @cover annotations in test files`,
  );

  let newlyCovered = 0;
  for (const cell of cells) {
    if (covered.has(cell.testId) && cell.status === "pending") {
      cell.status = "covered";
      newlyCovered++;
    }
  }
  console.log(`[matrix] Newly covered: ${newlyCovered}`);

  // Bucket by suite × status
  const bySuite = new Map<string, Record<string, number>>();
  for (const c of cells) {
    if (!bySuite.has(c.suite)) {
      bySuite.set(c.suite, { pending: 0, covered: 0, "n/a": 0, blocked: 0 });
    }
    bySuite.get(c.suite)![c.status]++;
  }

  console.log("\nCoverage by suite:");
  console.log("suite                  pending  covered   n/a  blocked");
  console.log("------                 -------  -------  ----  -------");
  let totalPending = 0;
  let totalCovered = 0;
  for (const [suite, counts] of bySuite) {
    console.log(
      `${suite.padEnd(22)} ${String(counts.pending).padStart(7)}  ${String(
        counts.covered,
      ).padStart(7)}  ${String(counts["n/a"]).padStart(4)}  ${String(
        counts.blocked,
      ).padStart(7)}`,
    );
    totalPending += counts.pending;
    totalCovered += counts.covered;
  }
  console.log("------                 -------  -------  ----  -------");
  const percent = ((totalCovered / cells.length) * 100).toFixed(1);
  console.log(
    `TOTAL                  ${String(totalPending).padStart(7)}  ${String(
      totalCovered,
    ).padStart(7)}  ${"".padStart(4)}  ${"".padStart(7)}   (${percent}%)`,
  );

  await mkdir(join(ROOT, "tests/e2e/simulations/reports"), { recursive: true });
  await writeFile(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalCells: cells.length,
        covered: totalCovered,
        pending: totalPending,
        percentCovered: parseFloat(percent),
        bySuite: Object.fromEntries(bySuite),
      },
      null,
      2,
    ),
  );
  console.log(`\n[matrix] Report → ${REPORT_PATH}`);

  if (writeBack) {
    await writeFile(MATRIX_PATH, toCsv(cells));
    console.log(`[matrix] Updated matrix CSV with new coverage`);
  }

  if (gate && totalPending > threshold) {
    console.error(
      `\n❌ GATE FAILED: ${totalPending} pending cells > threshold ${threshold}`,
    );
    process.exit(1);
  }

  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("[matrix] FATAL:", err);
  process.exit(1);
});
