import { BASE_URL } from "../../helpers/constants.js";
import { BaseActor, RoleName } from "./BaseActor.js";
import { ForgeApiClient } from "../../helpers/api-client.js";
import * as crypto from "crypto";

/**
 * StripeActor — synthetic Stripe webhook signer.
 * Posts crafted webhook events to /api/subscription/webhook (and the v1
 * variant) so we can test entitlement updates without real Stripe traffic.
 *
 * If STRIPE_WEBHOOK_SECRET is unset, the server accepts unsigned payloads
 * (dev mode) — we still send a fake signature so request shape matches prod.
 */
export class StripeActor extends BaseActor {
  readonly role: RoleName = "stripe";
  private secret?: string;
  private baseUrl: string;

  constructor(secret: string | undefined, baseUrl: string = BASE_URL) {
    super(new ForgeApiClient(baseUrl));
    this.secret = secret;
    this.baseUrl = baseUrl;
  }

  static create(
    secret: string | undefined = process.env.STRIPE_WEBHOOK_SECRET,
    baseUrl?: string,
  ): StripeActor {
    return new StripeActor(secret, baseUrl);
  }

  private sign(payload: string): string {
    if (!this.secret) return "t=0,v1=dev";
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto
      .createHmac("sha256", this.secret)
      .update(`${ts}.${payload}`)
      .digest("hex");
    return `t=${ts},v1=${sig}`;
  }

  private async post(
    path: string,
    event: object,
  ): Promise<{ status: number; body: unknown }> {
    const payload = JSON.stringify(event);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": this.sign(payload),
      },
      body: payload,
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

  /** Send a customer.subscription.updated event for a given trainer. */
  subscriptionUpdated(opts: {
    trainerId: string;
    stripeSubscriptionId: string;
    tier: "starter" | "professional" | "enterprise";
    status?: "active" | "past_due" | "unpaid" | "canceled" | "trialing";
  }) {
    const now = Math.floor(Date.now() / 1000);
    return this.post("/api/subscription/webhook", {
      id: `evt_${crypto.randomUUID()}`,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: opts.stripeSubscriptionId,
          customer: `cus_${opts.trainerId.slice(0, 8)}`,
          status: opts.status || "active",
          metadata: { trainerId: opts.trainerId, tier: opts.tier },
          current_period_start: now,
          current_period_end: now + 30 * 86400,
          cancel_at_period_end: false,
          trial_end: null,
          items: { data: [] },
        },
      },
    });
  }

  /** Send a customer.subscription.deleted event. */
  subscriptionDeleted(stripeSubscriptionId: string) {
    return this.post("/api/subscription/webhook", {
      id: `evt_${crypto.randomUUID()}`,
      type: "customer.subscription.deleted",
      data: { object: { id: stripeSubscriptionId, status: "canceled" } },
    });
  }

  /** Send invoice.payment_failed. */
  paymentFailed(stripeSubscriptionId: string, trainerId: string) {
    return this.post("/api/subscription/webhook", {
      id: `evt_${crypto.randomUUID()}`,
      type: "invoice.payment_failed",
      data: {
        object: {
          subscription: stripeSubscriptionId,
          customer: `cus_${trainerId.slice(0, 8)}`,
        },
      },
    });
  }
}
