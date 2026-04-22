// @vitest-environment node
import { describe, it, expect } from "vitest";

// GET /api/recipes/dietary-tags must return a normalized, deduped list of
// dietary tags pulled from the approved recipes table. The meal plan
// generator's dietary tag dropdown reads from this endpoint so trainers
// always see the real catalogue (not a hardcoded list that drifts from DB).
//
// Public endpoint (no auth) — it's a content catalogue, not user data.
// Run against localhost:4000. Override with BASE_URL.

// NOTE: vitest/vite injects BASE_URL="/" into process.env, so we can't rely
// on `process.env.BASE_URL || fallback` — we require it to look like a URL.
const rawBase =
  typeof process !== "undefined" && process.env
    ? process.env.BASE_URL
    : undefined;
const BASE =
  rawBase && /^https?:\/\//.test(rawBase) ? rawBase : "http://localhost:4000";

async function fetchTags(withAuth: boolean): Promise<{
  status: number;
  body: any;
  cacheControl: string | null;
}> {
  const headers: Record<string, string> = {};
  if (withAuth)
    headers["Authorization"] = "Bearer invalid-token-for-public-test";
  const res = await fetch(`${BASE}/api/recipes/dietary-tags`, { headers });
  const body = await res.json();
  return {
    status: res.status,
    body,
    cacheControl: res.headers.get("cache-control"),
  };
}

describe("GET /api/recipes/dietary-tags", () => {
  it("returns 200 with { tags: string[] } shape (public, no auth)", async () => {
    const { status, body } = await fetchTags(false);
    expect(
      status,
      `expected 200, got ${status}: ${JSON.stringify(body).slice(0, 200)}`,
    ).toBe(200);
    expect(body).toBeDefined();
    expect(Array.isArray(body.tags)).toBe(true);
  });

  it("returns at least 5 tags — fails loudly if DB is under-seeded", async () => {
    const { body } = await fetchTags(false);
    expect(
      body.tags.length,
      `Expected >= 5 dietary tags, got ${body.tags.length}. DB may be under-seeded.`,
    ).toBeGreaterThanOrEqual(5);
  });

  it("all tags are lowercase and hyphenated (no spaces, no capitals)", async () => {
    const { body } = await fetchTags(false);
    for (const tag of body.tags) {
      expect(typeof tag).toBe("string");
      expect(tag, `Tag "${tag}" must be lowercase`).toBe(tag.toLowerCase());
      expect(tag, `Tag "${tag}" must not contain spaces`).not.toMatch(/\s/);
    }
  });

  it("includes 'high-protein' (known universal tag)", async () => {
    const { body } = await fetchTags(false);
    expect(body.tags).toContain("high-protein");
  });

  it("tags are deduped and sorted alphabetically", async () => {
    const { body } = await fetchTags(false);
    const unique = Array.from(new Set(body.tags));
    expect(body.tags.length).toBe(unique.length);
    const sorted = [...body.tags].sort();
    expect(body.tags).toEqual(sorted);
  });

  it("is publicly accessible (no auth header required)", async () => {
    const { status } = await fetchTags(false);
    expect(status).toBe(200);
  });

  it("sets Cache-Control: public, max-age=300", async () => {
    const { cacheControl } = await fetchTags(false);
    expect(cacheControl, "Cache-Control header must be set").toBeTruthy();
    expect(cacheControl!.toLowerCase()).toContain("public");
    expect(cacheControl!.toLowerCase()).toContain("max-age=300");
  });
});
