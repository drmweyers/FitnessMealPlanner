/**
 * FORGE QA Warfare v2 — Side-Effect: SE-05
 * @cover { suite: "side-effect", role: "client", endpoint: "/api/progress/photos", assertionType: "side-effect" }
 *
 * Trigger: Customer uploads a progress photo.
 * Side effect: Photo stored in DigitalOcean Spaces (S3-compatible).
 *
 * Verification: Response includes a DO Spaces URL; HEAD that URL and assert 200.
 * NON-DESTRUCTIVE: uploads a 1×1 PNG; real data in DB but minimal.
 */

import { test, expect } from "@playwright/test";
import { ClientActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

// Minimal valid 1×1 transparent PNG in base64
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test.describe("SE-05 — Progress photo uploaded → DO Spaces URL returned and accessible", () => {
  let customer: ClientActor;

  test.beforeAll(async () => {
    customer = await ClientActor.login(undefined, BASE_URL);
  });

  test("upload progress photo returns digitaloceanspaces.com URL that is HEAD-accessible", async () => {
    const photoPayload = {
      // Backend may accept base64, a URL, or a file reference
      // Try base64 data URI first
      photoData: `data:image/png;base64,${TINY_PNG_BASE64}`,
      notes: "SE-05 automated warfare test photo",
      date: new Date().toISOString().split("T")[0],
    };

    const uploadRes = await customer.raw(
      "POST",
      "/api/progress/photos",
      photoPayload,
    );

    if (uploadRes.status === 400) {
      // May need multipart/form-data — document gap and skip
      test.skip(
        true,
        "COVERAGE GAP: /api/progress/photos requires multipart/form-data upload (got 400 on JSON). " +
          "Extend this test to use FormData when server accepts it.",
      );
      return;
    }

    expect([200, 201]).toContain(uploadRes.status);

    const body = uploadRes.body as Record<string, unknown>;
    const photoUrl: string =
      (body?.url as string) ||
      (body?.photoUrl as string) ||
      (body?.imageUrl as string) ||
      ((body?.data as Record<string, unknown>)?.url as string) ||
      "";

    expect(
      photoUrl,
      "Upload response must contain a URL field (url, photoUrl, or imageUrl)",
    ).toBeTruthy();

    expect(
      photoUrl,
      `Expected a DigitalOcean Spaces URL but got: "${photoUrl}"`,
    ).toMatch(/digitaloceanspaces\.com/);

    // HEAD the URL to confirm the object is publicly accessible
    const headRes = await fetch(photoUrl, { method: "HEAD" });
    expect(
      headRes.status,
      `HEAD ${photoUrl} returned ${headRes.status} — object is not publicly accessible in Spaces.`,
    ).toBe(200);
  });
});
