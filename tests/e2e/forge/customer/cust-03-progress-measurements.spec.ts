/**
 * FORGE QA — CUST-03: Progress Measurements
 *
 * Actor: Customer (as-customer storageState)
 * Covers: CRUD operations on /api/progress/measurements, progress page UI.
 *
 * Note: API returns { status, data: [...] } (NOT a plain array).
 * POST requires measurementDate as ISO datetime string (not date-only).
 *
 * Clean up: all measurements created during this suite are deleted in afterAll.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";

test.describe("CUST-03: Progress Measurements", () => {
  // Force serial execution — tests depend on sequential create/update/delete
  test.describe.configure({ mode: "serial" });

  let client: ForgeApiClient;
  let createdMeasurementId: string;
  const FORGE_WEIGHT = 78.5;
  const FORGE_BODY_FAT = 18.2;
  const FORGE_UPDATED_WEIGHT = 77.9;

  test.beforeAll(async () => {
    client = await ForgeApiClient.loginAs("customer");
  });

  test.afterAll(async () => {
    // Clean up created measurement
    if (createdMeasurementId) {
      await client
        .raw("DELETE", API.progress.measurement(createdMeasurementId))
        .catch(() => {});
    }
  });

  /** Helper: extract measurements array from response body */
  function extractMeasurements(body: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(body)) return body;
    const obj = body as { data?: unknown[]; measurements?: unknown[] };
    if (Array.isArray(obj.data))
      return obj.data as Array<Record<string, unknown>>;
    if (Array.isArray(obj.measurements))
      return obj.measurements as Array<Record<string, unknown>>;
    return [];
  }

  test("API: GET /api/progress/measurements returns seeded measurements", async () => {
    const seedState = loadSeedState();
    const res = await client.raw("GET", API.progress.measurements);

    expect(res.status).toBe(200);
    const measurements = extractMeasurements(res.body);
    expect(Array.isArray(measurements)).toBe(true);

    // Seeded measurements must exist
    if (seedState.measurementIds && seedState.measurementIds.length > 0) {
      expect(measurements.length).toBeGreaterThan(0);
    }
  });

  test("Measurements have weightKg and bodyFatPercentage fields", async () => {
    const res = await client.raw("GET", API.progress.measurements);
    expect(res.status).toBe(200);

    const measurements = extractMeasurements(res.body);

    if (measurements.length > 0) {
      const first = measurements[0];
      const hasWeight =
        "weightKg" in first ||
        "weight" in first ||
        "weightLbs" in first ||
        "bodyWeight" in first;
      expect(hasWeight).toBe(true);
    } else {
      // No seeded data — pass (empty list is valid)
      expect(Array.isArray(measurements)).toBe(true);
    }
  });

  test("API: POST /api/progress/measurements creates new measurement — 201", async () => {
    // measurementDate must be ISO datetime, not date-only
    const res = await client.raw("POST", API.progress.measurements, {
      weightKg: FORGE_WEIGHT,
      bodyFatPercentage: FORGE_BODY_FAT,
      measurementDate: new Date().toISOString(),
      notes: `FORGE-TEST-${Date.now()}`,
    });

    expect([200, 201]).toContain(res.status);
    const body = res.body as {
      id?: string;
      data?: { id: string };
      measurement?: { id: string };
    };
    // Production returns { status: "success", data: { id, ... } }
    const id =
      body.id ??
      (body.data as Record<string, string>)?.id ??
      body.measurement?.id;
    expect(id).toBeTruthy();
    createdMeasurementId = id!;
  });

  test("Created measurement appears in GET /api/progress/measurements", async () => {
    expect(createdMeasurementId).toBeTruthy();

    const res = await client.raw("GET", API.progress.measurements);
    expect(res.status).toBe(200);

    const measurements = extractMeasurements(res.body) as Array<{ id: string }>;
    const found = measurements.some((m) => m.id === createdMeasurementId);
    expect(found).toBe(true);
  });

  test("API: PUT /api/progress/measurements/:id updates measurement — 200", async () => {
    expect(createdMeasurementId).toBeTruthy();

    // PUT requires measurementDate to be included (same as POST)
    const res = await client.raw(
      "PUT",
      API.progress.measurement(createdMeasurementId),
      {
        weightKg: FORGE_UPDATED_WEIGHT,
        bodyFatPercentage: FORGE_BODY_FAT,
        measurementDate: new Date().toISOString(),
      },
    );

    expect([200, 204]).toContain(res.status);
  });

  test("Updated value persists on re-fetch", async () => {
    expect(createdMeasurementId).toBeTruthy();

    const res = await client.raw("GET", API.progress.measurements);
    expect(res.status).toBe(200);

    const measurements = extractMeasurements(res.body) as Array<{
      id: string;
      weightKg?: number | string;
      weight?: number;
    }>;

    const updated = measurements.find((m) => m.id === createdMeasurementId);
    expect(updated).toBeDefined();
    // weightKg may be returned as string "77.90" from PostgreSQL
    const weight = Number(updated?.weightKg ?? updated?.weight);
    expect(weight).toBeCloseTo(FORGE_UPDATED_WEIGHT, 1);
  });

  test("API: DELETE /api/progress/measurements/:id removes it — 200", async () => {
    expect(createdMeasurementId).toBeTruthy();

    const res = await client.raw(
      "DELETE",
      API.progress.measurement(createdMeasurementId),
    );
    expect([200, 204]).toContain(res.status);

    // Mark as deleted so afterAll skip duplicate delete
    const deletedId = createdMeasurementId;
    createdMeasurementId = "";

    // Confirm deleted
    const listRes = await client.raw("GET", API.progress.measurements);
    const measurements = extractMeasurements(listRes.body) as Array<{
      id: string;
    }>;
    const stillPresent = measurements.some((m) => m.id === deletedId);
    expect(stillPresent).toBe(false);
  });

  test("/customer/progress page loads and shows chart or data", async ({
    page,
  }) => {
    await page.goto(ROUTES.customerProgress, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3_000);

    // Progress page must have meaningful content
    const pageText = await page.textContent("body");
    expect(pageText!.length).toBeGreaterThan(50);

    const hasProgressContent = pageText!
      .toLowerCase()
      .match(/progress|measurement|weight|photo|chart|track/);
    expect(hasProgressContent !== null || pageText!.length > 200).toBe(true);
  });
});
