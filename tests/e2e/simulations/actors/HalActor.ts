import { BASE_URL } from "../../helpers/constants.js";
import { BaseActor, RoleName } from "./BaseActor.js";
import { ForgeApiClient } from "../../helpers/api-client.js";

/**
 * HalActor — OpenClaw bot integration.
 * Hits the bug-pipeline polling/claim endpoints with HAL_API_KEY.
 * Critical for the dual-claim race regression and the bug pipeline workflow.
 */
export class HalActor extends BaseActor {
  readonly role: RoleName = "hal";
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = BASE_URL) {
    super(new ForgeApiClient(baseUrl));
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  static create(
    apiKey: string = process.env.HAL_API_KEY || "test-hal-key",
    baseUrl?: string,
  ): HalActor {
    return new HalActor(apiKey, baseUrl);
  }

  private async hit(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: unknown }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* keep raw text */
    }
    return { status: res.status, body: parsed };
  }

  /** GET /api/bugs/pending — list untriaged, unclaimed bugs */
  pollPending() {
    return this.hit("GET", "/api/bugs/pending");
  }

  /** PATCH /api/bugs/:id/assign — atomic claim. 200 win / 409 lose / 404 missing. */
  claim(bugId: string) {
    return this.hit("PATCH", `/api/bugs/${bugId}/assign`);
  }

  /** Race two parallel claims against the same bug. */
  async raceClaims(bugId: string, n = 2) {
    return Promise.all(Array.from({ length: n }, () => this.claim(bugId)));
  }
}
