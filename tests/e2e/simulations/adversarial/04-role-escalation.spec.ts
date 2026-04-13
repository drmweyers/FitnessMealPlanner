/**
 * @cover ADV-004 — Role Escalation: Trainer Hits Admin-Only Endpoints
 * Role: attacker (trainer) | Endpoint: admin-only routes
 * Input-class: malicious | Assertion-type: http
 *
 * A trainer must receive 403 on all admin-only endpoints, even with a valid JWT.
 */

import { test, expect } from "@playwright/test";
import { AttackerActor } from "../actors/index.js";
import { API, BASE_URL } from "../../helpers/constants.js";

const ADMIN_ONLY: Array<{
  method: string;
  path: string;
  label: string;
  body?: unknown;
}> = [
  { method: "GET", path: "/api/admin/users", label: "GET /api/admin/users" },
  {
    method: "POST",
    path: "/api/admin/grant-tier",
    label: "POST grant-tier",
    body: { email: "trainer.test@evofitmeals.com", tier: "enterprise" },
  },
  {
    method: "POST",
    path: API.admin.generate,
    body: { count: 1 },
    label: "POST bulk-generate",
  },
  {
    method: "POST",
    path: API.admin.generateBmad,
    body: {},
    label: "POST BMAD generate",
  },
  { method: "GET", path: API.admin.customers, label: "GET admin/customers" },
  {
    method: "POST",
    path: "/api/admin/recipes/bulk-delete",
    body: { ids: [] },
    label: "POST bulk-delete recipes",
  },
  { method: "POST", path: "/api/admin/cache/clear", label: "POST clearCache" },
  { method: "GET", path: API.admin.apiUsage, label: "GET apiUsage" },
];

for (const { method, path, label, body } of ADMIN_ONLY) {
  test(`@cover ADV-004 — trainer hits ${label} → 403`, async () => {
    const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
    const { status } = await attacker.callAdminEndpoint(method, path, body);
    // Admin endpoints should refuse non-admin callers with 403 (or 404 to avoid leaking route existence)
    expect([403, 404]).toContain(status);
  });
}
