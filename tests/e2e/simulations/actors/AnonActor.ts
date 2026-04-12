import { ForgeApiClient } from "../../helpers/api-client.js";
import { BaseActor, RoleName } from "./BaseActor.js";

/**
 * AnonActor — unauthenticated visitor.
 * Used to prove every gated endpoint returns 401, every public endpoint
 * returns 200, and the funnel pages render without auth.
 */
export class AnonActor extends BaseActor {
  readonly role: RoleName = "anon";

  static create(baseUrl?: string): AnonActor {
    return new AnonActor(new ForgeApiClient(baseUrl));
  }

  // ---------- Public endpoints ----------
  publicPricing() {
    return this.client.raw("GET", "/api/v1/tiers/public/pricing");
  }
  health() {
    return this.client.raw("GET", "/api/health");
  }

  // ---------- Probe gated endpoints (expect 401) ----------
  probe(method: string, path: string, body?: unknown) {
    return this.client.raw(method, path, body);
  }

  // ---------- Funnel page fetches (expect 200 HTML) ----------
  fetchPage(route: string) {
    return this.client.raw("GET", route);
  }

  // ---------- Auth surface ----------
  register(payload: { email: string; password: string; role?: string }) {
    return this.client.raw("POST", "/api/auth/register", payload);
  }
  login(email: string, password: string) {
    return this.client.raw("POST", "/api/auth/login", { email, password });
  }
}
