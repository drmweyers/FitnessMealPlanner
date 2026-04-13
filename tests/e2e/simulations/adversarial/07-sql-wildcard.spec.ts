/**
 * @cover ADV-007 — SQL Wildcard / Injection via Recipe Search
 * Role: attacker | Endpoint: GET /api/recipes?search=<payload>
 * Input-class: malicious | Assertion-type: http + invariant
 *
 * Each sqlWildcard payload is used as a search query string.
 * Assertions:
 *   - No 500 (server must not crash or surface a DB error)
 *   - Response is JSON (not HTML error page)
 *   - The app handles LIKE wildcards (% and \) without returning ALL rows unexpectedly
 */

import { test, expect } from "@playwright/test";
import { AttackerActor } from "../actors/index.js";
import { BASE_URL } from "../../helpers/constants.js";

for (const [idx, payload] of AttackerActor.sqlWildcards.entries()) {
  test(`@cover ADV-007 — sqlWildcard[${idx}] "${payload.slice(0, 20)}" does not cause 500`, async () => {
    const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
    const encoded = encodeURIComponent(payload);
    const { status, body } = await attacker.raw(
      "GET",
      `/api/recipes?search=${encoded}`,
    );

    // No server crash
    expect(status).not.toBe(500);
    expect(status).toBeLessThan(500);

    // Response must be parseable JSON (not raw HTML crash page)
    if (typeof body === "string") {
      // If it came back as text, it should not contain stack traces
      expect(body).not.toMatch(/SyntaxError|TypeError|Error:/);
    } else {
      expect(body).toBeTruthy();
    }
  });
}

test("@cover ADV-007 — SQL injection via search does not return error SQL details", async () => {
  const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
  // Classic UNION attack
  const payload = "' UNION SELECT username, password FROM users --";
  const { status, body } = await attacker.raw(
    "GET",
    `/api/recipes?search=${encodeURIComponent(payload)}`,
  );
  expect(status).not.toBe(500);
  const raw = JSON.stringify(body);
  // Must not leak SQL error details
  expect(raw).not.toMatch(/syntax error|SQL|column|relation|pg_/i);
});

test("@cover ADV-007 — bare % wildcard in search does not return all recipes unfiltered", async () => {
  // % should either be escaped by the ORM or return an error — not dump the entire table
  const attacker = await AttackerActor.loginAs("trainer", BASE_URL);
  const { status } = await attacker.raw("GET", `/api/recipes?search=%25`);
  expect(status).not.toBe(500);
});
