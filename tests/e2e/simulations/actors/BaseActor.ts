/**
 * BaseActor — FORGE QA Warfare v2
 *
 * All actors share the same low-level HTTP plumbing (auth, retry, raw access).
 * Workflow methods live on the role-specific subclasses; BaseActor is just the
 * transport layer + a coverage matrix annotation hook.
 */

import { ForgeApiClient } from "../../helpers/api-client.js";

export type RoleName =
  | "trainer"
  | "client"
  | "admin"
  | "anon"
  | "attacker"
  | "hal"
  | "stripe";

export interface CoverageCell {
  suite: string;
  role: RoleName;
  endpoint: string;
  state?: string;
  inputClass?:
    | "valid"
    | "boundary"
    | "malformed"
    | "malicious"
    | "idempotent-repeat"
    | "concurrent"
    | "no-auth";
  assertionType?:
    | "http"
    | "db-row"
    | "side-effect"
    | "cross-role-view"
    | "audit-log"
    | "invariant";
  testId?: string;
}

const coverageHits: CoverageCell[] = [];

export function recordCoverage(cell: CoverageCell): void {
  coverageHits.push(cell);
}

export function flushCoverage(): CoverageCell[] {
  const out = coverageHits.slice();
  coverageHits.length = 0;
  return out;
}

export abstract class BaseActor {
  abstract readonly role: RoleName;
  protected client: ForgeApiClient;

  constructor(client: ForgeApiClient) {
    this.client = client;
  }

  /**
   * Annotate the next request as a coverage cell. Call inside test bodies.
   */
  cover(cell: Omit<CoverageCell, "role">): this {
    recordCoverage({ ...cell, role: this.role });
    return this;
  }

  /**
   * Raw access for adversarial / status-asserting tests.
   */
  raw(method: string, path: string, body?: unknown) {
    return this.client.raw(method, path, body);
  }

  get http() {
    return this.client;
  }
}
