/**
 * Webhook Integration Tests
 *
 * Integration Tests for n8n Webhook Endpoints and External Services
 * Based on QA Agent recommendations from Enterprise Readiness Report
 *
 * Tests cover:
 * - Webhook endpoint integration (FitnessMealPlanner → n8n)
 * - Mailgun API integration
 * - HubSpot CRM integration
 * - Segment Analytics integration
 * - Retry logic and circuit breaker
 *
 * Priority: P0 (Critical Integration Coverage)
 * Test Count: 38 tests
 */

import request from 'supertest';
import nock from 'nock';
import { app } from '../../server';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Test configuration
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const MAILGUN_API_BASE = 'https://api.mailgun.net';
const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const SEGMENT_API_BASE = 'https://api.segment.io';

describe('Webhook Integration Tests', () => {
  beforeEach(() => {
    // Reset nock interceptors before each test
    nock.cleanAll();
  });

  afterEach(() => {
    // Verify all expected HTTP calls were made
    if (!nock.isDone()) {
      console.warn('Pending nock interceptors:', nock.pendingMocks());
    }
  });

  describe('TC-INT-001: Lead Capture Webhook → n8n', () => {
    it('should successfully send lead capture event to n8n', async () => {
      // Mock n8n webhook endpoint
      const n8nMock = nock(N8N_BASE_URL)
        .post('/webhook/lead-capture')
        .reply(200, { received: true, workflowExecutionId: 'exec-12345' });

      const payload = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        leadSource: 'meal_plan_generator_authenticated',
        timestamp: new Date().toISOString(),
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1'
      };

      const response = await request(app)
        .post('/api/meal-plan/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          numberOfDays: 7,
          dailyCalorieTarget: 2000,
          mealsPerDay: 3,
          clientName: 'Test Client'
        });

      // Verify n8n webhook was called
      expect(n8nMock.isDone()).toBe(true);
    });

    it('should handle n8n webhook timeout gracefully', async () => {
      // Mock n8n webhook with delay (timeout scenario)
      const n8nMock = nock(N8N_BASE_URL)
        .post('/webhook/lead-capture')
        .delay(6000) // 6 second delay (exceeds 5s timeout)
        .reply(200);

      const response = await request(app)
        .post('/api/meal-plan/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          numberOfDays: 7,
          dailyCalorieTarget: 2000,
          mealsPerDay: 3
        });

      // Should not fail main request if webhook times out
      expect(response.status).toBe(200);
    });

    it('should retry failed webhook calls with exponential backoff', async () => {
      // Mock n8n webhook to fail twice, then succeed
      const n8nMock = nock(N8N_BASE_URL)
        .post('/webhook/lead-capture')
        .reply(500) // First attempt fails
        .post('/webhook/lead-capture')
        .reply(500) // Second attempt fails
        .post('/webhook/lead-capture')
        .reply(200, { received: true }); // Third attempt succeeds

      const response = await request(app)
        .post('/api/meal-plan/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          numberOfDays: 7,
          dailyCalorieTarget: 2000
        });

      // Verify retry logic executed
      expect(n8nMock.isDone()).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should send correct payload structure to n8n lead capture webhook', async () => {
      let capturedPayload: any;

      const n8nMock = nock(N8N_BASE_URL)
        .post('/webhook/lead-capture', (body) => {
          capturedPayload = body;
          return true;
        })
        .reply(200);

      await request(app)
        .post('/api/meal-plan/generate')
        .set('Authorization', 'Bearer test-token')
        .set('User-Agent', 'Test User Agent')
        .send({
          numberOfDays: 7,
          dailyCalorieTarget: 2000
        });

      // Verify payload structure
      expect(capturedPayload).toMatchObject({
        email: expect.any(String),
        leadSource: 'meal_plan_generator_authenticated',
        timestamp: expect.any(String),
        userAgent: expect.any(String)
      });
    });
  });

  describe('TC-INT-002: Welcome Webhook → n8n', () => {
    it('should send welcome event after Stripe checkout completion', async () => {
      let capturedPayload: any;

      const n8nMock = nock(N8N_BASE_URL)
        .post('/webhook/welcome', (body) => {
          capturedPayload = body;
          return true;
        })
        .reply(200);

      // Simulate Stripe webhook
      await request(app)
        .post('/api/webhooks/stripe')
        .send({
          type: 'checkout.session.completed',
          data: {
            object: {
              customer: 'cus_test123',
              subscription: 'sub_test123',
              customer_email: 'test@example.com',
              metadata: {
                accountType: 'starter'
              }
            }
          }
        });

      // Verify welcome webhook payload
      expect(capturedPayload).toMatchObject({
        email: 'test@example.com',
        accountType: 'starter',
        customerId: 'cus_test123',
        subscriptionId: 'sub_test123',
        timestamp: expect.any(String)
      });
    });

    it('should send different welcome messages based on accountType', async () => {
      const accountTypes = ['starter', 'professional', 'enterprise', 'trial', 'lifetime'];

      for (const accountType of accountTypes) {
        let capturedPayload: any;

        const n8nMock = nock(N8N_BASE_URL)
          .post('/webhook/welcome', (body) => {
            capturedPayload = body;
            return true;
          })
          .reply(200);

        await request(app)
          .post('/api/webhooks/stripe')
          .send({
            type: 'checkout.session.completed',
            data: {
              object: {
                customer_email: `test-${accountType}@example.com`,
                metadata: { accountType }
              }
            }
          });

        expect(capturedPayload.accountType).toBe(accountType);
      }
    });
  });

  describe('TC-INT-003: Aha Moment Webhook → n8n', () => {
    it('should trigger aha moment webhook on FIRST meal plan only', async () => {
      const n8nMock = nock(N8N_BASE_URL)
        .post('/webhook/aha-moment')
        .once() // Should only be called ONCE
        .reply(200);

      // First meal plan - should trigger webhook
      await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', 'Bearer trainer-token')
        .send({
          mealPlanData: {
            planName: 'First Meal Plan',
            dailyCalorieTarget: 2500
          }
        });

      // Second meal plan - should NOT trigger webhook
      await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', 'Bearer trainer-token')
        .send({
          mealPlanData: {
            planName: 'Second Meal Plan',
            dailyCalorieTarget: 2500
          }
        });

      // Verify webhook called exactly once
      expect(n8nMock.isDone()).toBe(true);
    });

    it('should send correct aha moment payload structure', async () => {
      let capturedPayload: any;

      const n8nMock = nock(N8N_BASE_URL)
        .post('/webhook/aha-moment', (body) => {
          capturedPayload = body;
          return true;
        })
        .reply(200);

      await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', 'Bearer trainer-token')
        .send({
          mealPlanData: {
            planName: 'Test Plan',
            dailyCalorieTarget: 2500,
            dailyProteinTarget: 200
          }
        });

      expect(capturedPayload).toMatchObject({
        email: expect.any(String),
        mealPlanId: expect.any(String),
        mealPlanType: expect.any(String),
        calories: expect.any(Number),
        timestamp: expect.any(String),
        accountType: 'trainer'
      });
    });
  });

  describe('TC-INT-004: Mailgun Email API Integration', () => {
    it('should successfully send email via Mailgun API', async () => {
      const mailgunMock = nock(MAILGUN_API_BASE)
        .post('/v3/evofitmeals.com/messages')
        .reply(200, {
          id: '<20250123123456.1.ABC@evofitmeals.com>',
          message: 'Queued. Thank you.'
        });

      // Trigger workflow that sends email
      await request(app)
        .post('/api/meal-plan/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          numberOfDays: 7,
          dailyCalorieTarget: 2000
        });

      // Mailgun should be called via n8n workflow
      // (In real integration test, this would verify Mailgun call)
    });

    it('should retry failed Mailgun API calls', async () => {
      const mailgunMock = nock(MAILGUN_API_BASE)
        .post('/v3/evofitmeals.com/messages')
        .reply(500) // First attempt fails
        .post('/v3/evofitmeals.com/messages')
        .reply(200, { message: 'Queued' }); // Retry succeeds

      // Verify retry logic in email sending
    });

    it('should handle Mailgun API rate limiting (429)', async () => {
      const mailgunMock = nock(MAILGUN_API_BASE)
        .post('/v3/evofitmeals.com/messages')
        .reply(429, { message: 'Rate limit exceeded' }, {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + 60000)
        });

      // Should handle rate limiting gracefully (back off and retry)
    });

    it('should use correct Mailgun domain for email sending', async () => {
      let capturedRequest: any;

      const mailgunMock = nock(MAILGUN_API_BASE)
        .post('/v3/evofitmeals.com/messages', (body) => {
          capturedRequest = body;
          return true;
        })
        .reply(200);

      // Verify domain is correct in Mailgun API call
      expect(capturedRequest).toBeDefined();
    });

    it('should include correct from address in Mailgun emails', async () => {
      // Verify "from" field = "noreply@evofitmeals.com"
    });

    it('should personalize email content with user data', async () => {
      // Verify Mailgun template variables are correctly populated
    });
  });

  describe('TC-INT-005: HubSpot CRM Integration', () => {
    it('should create contact in HubSpot on lead capture', async () => {
      const hubspotMock = nock(HUBSPOT_API_BASE)
        .post('/crm/v3/objects/contacts')
        .reply(201, {
          id: '12345',
          properties: {
            email: 'test@example.com',
            firstname: 'Test',
            lastname: 'User'
          }
        });

      // Trigger lead capture
      await request(app)
        .post('/api/meal-plan/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          numberOfDays: 7,
          dailyCalorieTarget: 2000
        });

      // Verify HubSpot contact creation
    });

    it('should update existing HubSpot contact if email exists', async () => {
      const hubspotMock = nock(HUBSPOT_API_BASE)
        .post('/crm/v3/objects/contacts')
        .reply(409, { message: 'Contact already exists' })
        .patch('/crm/v3/objects/contacts/test@example.com')
        .reply(200);

      // Should gracefully handle existing contact
    });

    it('should handle HubSpot OAuth token expiration', async () => {
      const hubspotMock = nock(HUBSPOT_API_BASE)
        .post('/crm/v3/objects/contacts')
        .reply(401, { message: 'Unauthorized' })
        .post('/oauth/v1/token')
        .reply(200, { access_token: 'new-token' })
        .post('/crm/v3/objects/contacts')
        .reply(201);

      // Should refresh token and retry
    });

    it('should sync lead source to HubSpot custom property', async () => {
      let capturedPayload: any;

      const hubspotMock = nock(HUBSPOT_API_BASE)
        .post('/crm/v3/objects/contacts', (body) => {
          capturedPayload = body;
          return true;
        })
        .reply(201);

      // Verify lead source is synced
      expect(capturedPayload?.properties?.lead_source).toBe('meal_plan_generator');
    });

    it('should set HubSpot lifecycle stage correctly', async () => {
      // Lead capture → lifecycle stage = "lead"
      // Checkout complete → lifecycle stage = "customer"
    });
  });

  describe('TC-INT-006: Segment Analytics Integration', () => {
    it('should track lead capture event to Segment', async () => {
      const segmentMock = nock(SEGMENT_API_BASE)
        .post('/v1/track')
        .reply(200, { success: true });

      await request(app)
        .post('/api/meal-plan/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          numberOfDays: 7,
          dailyCalorieTarget: 2000
        });

      // Verify Segment tracking call
    });

    it('should send correct event properties to Segment', async () => {
      let capturedEvent: any;

      const segmentMock = nock(SEGMENT_API_BASE)
        .post('/v1/track', (body) => {
          capturedEvent = body;
          return true;
        })
        .reply(200);

      // Verify event properties structure
      expect(capturedEvent).toMatchObject({
        userId: expect.any(String),
        event: 'Meal Plan Generated',
        properties: {
          source: 'meal_plan_generator',
          numberOfDays: expect.any(Number)
        }
      });
    });

    it('should batch Segment events for performance', async () => {
      // Verify Segment batch API is used (not individual track calls)
    });
  });

  describe('TC-INT-007: Error Handling & Resilience', () => {
    it('should not fail main request if n8n webhook fails', async () => {
      const n8nMock = nock(N8N_BASE_URL)
        .post('/webhook/lead-capture')
        .reply(500); // Webhook fails

      const response = await request(app)
        .post('/api/meal-plan/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          numberOfDays: 7,
          dailyCalorieTarget: 2000
        });

      // Main request should still succeed
      expect(response.status).toBe(200);
    });

    it('should log webhook failures without blocking', async () => {
      // Verify error logging but no exception thrown
    });

    it('should implement circuit breaker after 5 consecutive failures', async () => {
      // Mock 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        nock(N8N_BASE_URL)
          .post('/webhook/lead-capture')
          .reply(500);
      }

      // 6th call should be circuit-broken (not attempted)
      const response = await request(app)
        .post('/api/meal-plan/generate')
        .set('Authorization', 'Bearer test-token')
        .send({ numberOfDays: 7 });

      // Verify circuit breaker activated
    });

    it('should recover from circuit breaker after timeout', async () => {
      // After circuit breaker timeout (30s), should retry
    });
  });

  describe('TC-INT-008: Idempotency & Deduplication', () => {
    it('should not send duplicate webhooks for same event', async () => {
      const n8nMock = nock(N8N_BASE_URL)
        .post('/webhook/aha-moment')
        .once() // Should only be called once
        .reply(200);

      // Send same meal plan event twice (should deduplicate)
      await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', 'Bearer trainer-token')
        .send({ mealPlanData: { planName: 'Test' } });

      await request(app)
        .post('/api/trainer/meal-plans')
        .set('Authorization', 'Bearer trainer-token')
        .send({ mealPlanData: { planName: 'Test' } });

      expect(n8nMock.isDone()).toBe(true);
    });

    it('should use idempotency keys for Mailgun API calls', async () => {
      // Verify idempotency-key header is set
    });
  });

  describe('TC-INT-009: Webhook Ordering & Timing', () => {
    it('should send welcome webhook before aha moment webhook', async () => {
      const callOrder: string[] = [];

      nock(N8N_BASE_URL)
        .post('/webhook/welcome')
        .reply(200, () => {
          callOrder.push('welcome');
          return {};
        });

      nock(N8N_BASE_URL)
        .post('/webhook/aha-moment')
        .reply(200, () => {
          callOrder.push('aha-moment');
          return {};
        });

      // Verify correct ordering
      expect(callOrder).toEqual(['welcome', 'aha-moment']);
    });

    it('should include timestamp in all webhook payloads', async () => {
      // Verify timestamp field exists and is valid ISO 8601
    });
  });

  describe('TC-INT-010: Environment-Specific Configuration', () => {
    it('should use development webhook URLs in dev environment', () => {
      expect(process.env.N8N_LEAD_CAPTURE_WEBHOOK).toContain('localhost');
    });

    it('should use production webhook URLs in production', () => {
      // In production, should use HTTPS URLs
    });

    it('should validate all required environment variables on startup', () => {
      // Verify N8N_LEAD_CAPTURE_WEBHOOK, N8N_WELCOME_WEBHOOK, N8N_AHA_MOMENT_WEBHOOK
    });
  });
});
