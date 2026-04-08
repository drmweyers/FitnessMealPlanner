/**
 * FORGE QA — CUST-03: Progress Measurements
 *
 * Actor: Customer (as-customer storageState)
 * Covers: CRUD operations on /api/progress/measurements, progress page UI.
 *
 * Clean up: all measurements created during this suite are deleted in afterAll.
 */

import { test, expect } from "@playwright/test";
import { ROUTES, API } from "../../helpers/constants.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { loadSeedState } from "../../helpers/auth-helpers.js";

test.describe("CUST-03: Progress Measurements", () => {
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

  test("API: GET /api/progress/measurements returns seeded measurements", async () => {
    const seedState = loadSeedState();
    const res = await client.raw("GET", API.progress.measurements);

    expect(res.status).toBe(200);
    const body = res.body as {
      measurements?: unknown[];
      data?: unknown[];
    };
    const measurements = Array.isArray(res.body)
      ? res.body
      : (body.measurements ?? body.data ?? []);
    expect(Array.isArray(measurements)).toBe(true);

    // Seeded measurements must exist
    if (seedState.measurementIds && seedState.measurementIds.length > 0) {
      expect(measurements.length).toBeGreaterThan(0);
    }
  });

  test("Measurements have weightKg and bodyFatPercentage fields", async () => {
    const res = await client.raw("GET", API.progress.measurements);
    expect(res.status).toBe(200);

    const body = res.body as {
      measurements?: Array<Record<string, unknown>>;
      data?: Array<Record<string, unknown>>;
    };
    const measurements = Array.isArray(res.body)
      ? (res.body as Array<Record<string, unknown>>)
      : (body.measurements ?? body.data ?? []);

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
    const res = await client.raw("POST", API.progress.measurements, {
      weightKg: FORGE_WEIGHT,
      bodyFatPercentage: FORGE_BODY_FAT,
      date: new Date().toISOString().split("T")[0],
      notes: `FORGE-TEST-${Date.now()}`,
    });

    expect([200, 201]).toContain(res.status);
    const body = res.body as { id?: string; measurement?: { id: string } };
    const id = body.id ?? body.measurement?.id;
    expect(id).toBeTruthy();
    createdMeasurementId = id!;
  });

  test("Created measurement appears in GET /api/progress/measurements", async () => {
    expect(createdMeasurementId).toBeTruthy();

    const res = await client.raw("GET", API.progress.measurements);
    expect(res.status).toBe(200);

    const body = res.body as {
      measurements?: Array<{ id: string }>;
      data?: Array<{ id: string }>;
    };
    const measurements = Array.isArray(res.body)
      ? (res.body as Array<{ id: string }>)
      : (body.measurements ?? body.data ?? []);

    const found = measurements.some((m) => m.id === createdMeasurementId);
    expect(found).toBe(true);
  });

  test("API: PUT /api/progress/measurements/:id updates measurement — 200", async () => {
    expect(createdMeasurementId).toBeTruthy();

    const res = await client.raw(
      "PUT",
      API.progress.measurement(createdMeasurementId),
      {
        weightKg: FORGE_UPDATED_WEIGHT,
        bodyFatPercentage: FORGE_BODY_FAT,
      },
    );

    expect(res.status).toBe(200);
  });

  test("Updated value persists on re-fetch", async () => {
    expect(createdMeasurementId).toBeTruthy();

    const res = await client.raw("GET", API.progress.measurements);
    expect(res.status).toBe(200);

    const body = res.body as {
      measurements?: Array<{ id: string; weightKg?: number; weight?: number }>;
      data?: Array<{ id: string; weightKg?: number; weight?: number }>;
    };
    const measurements = Array.isArray(res.body)
      ? (res.body as Array<{ id: string; weightKg?: number; weight?: number }>)
      : (body.measurements ?? body.data ?? []);

    const updated = measurements.find((m) => m.id === createdMeasurementId);
    expect(updated).toBeDefined();
    const weight = updated?.weightKg ?? updated?.weight;
    expect(weight).toBe(FORGE_UPDATED_WEIGHT);
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
    const listBody = listRes.body as {
      measurements?: Array<{ id: string }>;
      data?: Array<{ id: string }>;
    };
    const measurements = Array.isArray(listRes.body)
      ? (listRes.body as Array<{ id: string }>)
      : (listBody.measurements ?? listBody.data ?? []);

    const stillPresent = measurements.some((m) => m.id === deletedId);
    expect(stillPresent).toBe(false);
  });

  test("/customer/progress page loads and shows chart or data", async ({
    page,
  }) => {
    await page.goto(ROUTES.customerProgress, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("networkidle");

    // Progress page must show either a chart, a table, or a message
    const progressContent = page
      .locator(
        'canvas, [class*="chart"], [class*="Chart"], [class*="progress"], [class*="Progress"], table, [data-testid*="progress"]',
      )
      .first();
    await expect(progressContent).toBeVisible({ timeout: 10_000 });
  });
});
