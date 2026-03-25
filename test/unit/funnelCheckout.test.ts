/**
 * Funnel Checkout Route Tests
 *
 * Tests the public /api/create-checkout-session endpoint.
 * Uses mocked Stripe to avoid real API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { funnelCheckoutRouter, setStripeInstance } from '../../server/routes/funnelCheckout';

// Build a minimal Express app for testing
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', funnelCheckoutRouter);
  return app;
}

// Mock Stripe checkout session create
function mockStripe(overrides: Partial<{ url: string; id: string }> = {}) {
  const createMock = vi.fn().mockResolvedValue({
    url: overrides.url ?? 'https://checkout.stripe.com/test_session',
    id: overrides.id ?? 'cs_test_123',
  });

  const fakeStripe = {
    checkout: {
      sessions: {
        create: createMock,
      },
    },
  };

  setStripeInstance(fakeStripe as any);
  return createMock;
}

describe('POST /api/create-checkout-session', () => {
  let app: express.Express;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    app = buildApp();
  });

  afterEach(() => {
    setStripeInstance(null);
  });

  it('returns 400 when tier is missing', async () => {
    mockStripe();
    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid tier');
  });

  it('returns 400 for invalid tier', async () => {
    mockStripe();
    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({ tier: 'platinum' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid tier');
  });

  it('creates a one-time payment session for starter tier', async () => {
    const createMock = mockStripe();
    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({ tier: 'starter' });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://checkout.stripe.com/test_session');
    expect(res.body.sessionId).toBe('cs_test_123');

    // Verify Stripe was called with payment mode
    expect(createMock).toHaveBeenCalledOnce();
    const args = createMock.mock.calls[0][0];
    expect(args.mode).toBe('payment');
    expect(args.metadata.tier).toBe('starter');
    expect(args.metadata.saas).toBe('false');
  });

  it('creates a one-time payment session for professional tier', async () => {
    const createMock = mockStripe();
    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({ tier: 'professional' });

    expect(res.status).toBe(200);
    const args = createMock.mock.calls[0][0];
    expect(args.mode).toBe('payment');
    expect(args.metadata.tier).toBe('professional');
  });

  it('creates a one-time payment session for enterprise tier', async () => {
    const createMock = mockStripe();
    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({ tier: 'enterprise' });

    expect(res.status).toBe(200);
    const args = createMock.mock.calls[0][0];
    expect(args.mode).toBe('payment');
    expect(args.metadata.tier).toBe('enterprise');
  });

  it('creates a subscription session when saas=true', async () => {
    const createMock = mockStripe();
    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({ tier: 'starter', saas: true });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://checkout.stripe.com/test_session');

    const args = createMock.mock.calls[0][0];
    expect(args.mode).toBe('subscription');
    expect(args.metadata.tier).toBe('starter');
    expect(args.metadata.saas).toBe('true');
  });

  it('creates a payment session when saas=false', async () => {
    const createMock = mockStripe();
    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({ tier: 'professional', saas: false });

    expect(res.status).toBe(200);
    const args = createMock.mock.calls[0][0];
    expect(args.mode).toBe('payment');
  });

  it('returns 500 when Stripe throws an error', async () => {
    const createMock = vi.fn().mockRejectedValue(new Error('Stripe is down'));
    setStripeInstance({
      checkout: { sessions: { create: createMock } },
    } as any);

    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({ tier: 'starter' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to create checkout session');
  });

  it('includes success and cancel URLs in session creation', async () => {
    const createMock = mockStripe();
    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({ tier: 'starter' });

    expect(res.status).toBe(200);
    const args = createMock.mock.calls[0][0];
    expect(args.success_url).toContain('/landing/checkout-success.html');
    expect(args.cancel_url).toContain('/landing/checkout-cancel.html');
  });
});
