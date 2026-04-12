/**
 * AUTH-04: Edit Profile (Trainer + Customer)
 *
 * Validates the GET/PUT /api/profile endpoints AND the in-app Edit Profile UI
 * actually persist user-entered data. This was missing from the original FORGE
 * suite — the form was non-functional in production until 2026-04-12.
 *
 * Actor: Mixed (trainer + customer storageState; API tests build their own clients)
 * Runs in: 'as-trainer' project
 */

import { test, expect } from "@playwright/test";
import { ForgeApiClient } from "../../helpers/api-client.js";
import { API, ROUTES, TIMEOUTS } from "../../helpers/constants.js";

test.describe("AUTH-04 — Edit Profile", () => {
  // ---------------------------------------------------------------------------
  // API: GET /api/profile returns full profile shape
  // ---------------------------------------------------------------------------

  test("GET /api/profile returns full trainer profile shape", async () => {
    const client = await ForgeApiClient.loginAs("trainer");
    const profile = await client.get<any>(API.profile);

    expect(profile.id).toBeTruthy();
    expect(profile.email).toBe("trainer.test@evofitmeals.com");
    expect(profile.role).toBe("trainer");
    // Shape — fields exist (may be null/empty before seed runs)
    expect(profile).toHaveProperty("bio");
    expect(profile).toHaveProperty("specializations");
    expect(profile).toHaveProperty("certifications");
    expect(profile).toHaveProperty("yearsExperience");
    expect(Array.isArray(profile.specializations)).toBe(true);
    expect(Array.isArray(profile.certifications)).toBe(true);
  });

  test("GET /api/profile returns full customer profile shape", async () => {
    const client = await ForgeApiClient.loginAs("customer");
    const profile = await client.get<any>(API.profile);

    expect(profile.role).toBe("customer");
    expect(profile).toHaveProperty("fitnessGoals");
    expect(profile).toHaveProperty("dietaryRestrictions");
    expect(profile).toHaveProperty("preferredCuisines");
    expect(profile).toHaveProperty("activityLevel");
    expect(profile).toHaveProperty("age");
    expect(profile).toHaveProperty("weight");
    expect(profile).toHaveProperty("height");
  });

  // ---------------------------------------------------------------------------
  // API: PUT /api/profile persists trainer fields
  // ---------------------------------------------------------------------------

  test("PUT /api/profile persists trainer profile fields and read-back matches", async () => {
    const client = await ForgeApiClient.loginAs("trainer");

    const stamp = `auth04-${Date.now()}`;
    const payload = {
      bio: `FORGE AUTH-04 trainer bio (${stamp})`,
      specializations: ["Weight Loss", "Sports Nutrition", "Habit Coaching"],
      certifications: ["NASM-CPT", "Precision Nutrition L1"],
      yearsExperience: 9,
    };

    const res = await client.put<any>(API.profile, payload);
    expect(res.status).toBe("success");
    expect(res.data.bio).toBe(payload.bio);
    expect(res.data.specializations).toEqual(payload.specializations);
    expect(res.data.certifications).toEqual(payload.certifications);
    expect(res.data.yearsExperience).toBe(9);

    // Read-back via GET — proves it was persisted, not just echoed
    const refetched = await client.get<any>(API.profile);
    expect(refetched.bio).toBe(payload.bio);
    expect(refetched.specializations).toEqual(payload.specializations);
    expect(refetched.certifications).toEqual(payload.certifications);
    expect(refetched.yearsExperience).toBe(9);
  });

  // ---------------------------------------------------------------------------
  // API: PUT /api/profile persists customer fields including numeric weight/height
  // ---------------------------------------------------------------------------

  test("PUT /api/profile persists customer profile fields including weight/height", async () => {
    const client = await ForgeApiClient.loginAs("customer");

    const payload = {
      bio: "FORGE AUTH-04 customer bio",
      fitnessGoals: ["Weight Loss", "Endurance"],
      dietaryRestrictions: ["Gluten-Free"],
      preferredCuisines: ["Mediterranean", "Asian"],
      activityLevel: "moderately_active" as const,
      age: 35,
      weight: 80.5,
      height: 178,
    };

    const res = await client.put<any>(API.profile, payload);
    expect(res.status).toBe("success");

    const refetched = await client.get<any>(API.profile);
    expect(refetched.bio).toBe(payload.bio);
    expect(refetched.fitnessGoals).toEqual(payload.fitnessGoals);
    expect(refetched.dietaryRestrictions).toEqual(payload.dietaryRestrictions);
    expect(refetched.preferredCuisines).toEqual(payload.preferredCuisines);
    expect(refetched.activityLevel).toBe("moderately_active");
    expect(refetched.age).toBe(35);
    expect(Number(refetched.weight)).toBeCloseTo(80.5, 2);
    expect(Number(refetched.height)).toBeCloseTo(178, 2);
  });

  // ---------------------------------------------------------------------------
  // API: validation
  // ---------------------------------------------------------------------------

  test("PUT /api/profile rejects invalid activityLevel", async () => {
    const client = await ForgeApiClient.loginAs("customer");
    let status = 0;
    try {
      await client.put(API.profile, { activityLevel: "supersonic" });
    } catch (e: any) {
      status = e.status || 0;
    }
    expect(status).toBe(400);
  });

  test("PUT /api/profile rejects out-of-range age", async () => {
    const client = await ForgeApiClient.loginAs("customer");
    let status = 0;
    try {
      await client.put(API.profile, { age: 5 });
    } catch (e: any) {
      status = e.status || 0;
    }
    expect(status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // UI: Trainer Edit Profile end-to-end via the actual form
  // ---------------------------------------------------------------------------

  test("Trainer Edit Profile form persists changes via UI", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto(ROUTES.trainerProfile, { waitUntil: "domcontentloaded" });

    // Click Edit
    const editButton = page.getByRole("button", { name: /edit/i }).first();
    await expect(editButton).toBeVisible({ timeout: TIMEOUTS.action });
    await editButton.click();

    // Fill bio
    const stamp = `ui-${Date.now()}`;
    const bioText = `UI Edit Profile bio ${stamp}`;
    const bioField = page.locator('textarea').first();
    await expect(bioField).toBeVisible({ timeout: TIMEOUTS.action });
    await bioField.fill(bioText);

    // Save
    const saveButton = page.getByRole("button", { name: /save/i }).first();
    await saveButton.click();

    // Wait for the toast or for the form to exit edit mode
    await page.waitForTimeout(1500);

    // Verify via API that the change actually persisted
    const client = await ForgeApiClient.loginAs("trainer");
    const refetched = await client.get<any>(API.profile);
    expect(refetched.bio).toBe(bioText);
  });
});
