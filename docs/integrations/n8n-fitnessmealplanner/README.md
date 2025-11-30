# N8N ↔ FitnessMealPlanner Integration

**Version:** 2025-01-23
**Status:** Production Ready (Testing Phase)
**Primary Repository:** N8N_Automation

---

## 🎯 Quick Links

- [Architecture Overview](./ARCHITECTURE.md)
- [Webhook Specification](./WEBHOOK_SPECIFICATION.md)
- [Implementation Status](./IMPLEMENTATION_STATUS.md)
- [Test Results](./TEST_RESULTS.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

## 📋 What This Integration Does

This integration connects **n8n workflow automation** with **FitnessMealPlanner** to enable:

### 1. Email Marketing Automation
- **Lead Magnet Delivery** - Automatic free meal plan delivery to new leads
- **7-Day Nurture Sequence** - Automated email campaign with strategic timing
- **Long-Term Nurture** - Monthly engagement emails with promo codes
- **Welcome Onboarding** - Tier-specific welcome emails for new customers
- **Aha Moment Celebration** - Celebrate customer's first meal plan creation

### 2. Service Integrations
- **Mailgun** - Transactional email delivery (replacing SendGrid)
- **HubSpot CRM** - Contact management and lifecycle tracking
- **Segment Analytics** - Event tracking and user behavior analysis
- **Slack** - Error notifications and monitoring alerts

### 3. Workflow Orchestration
- **Webhook-Triggered Workflows** - Real-time event processing
- **Scheduled Workflows** - Time-based automation campaigns
- **Rate Limiting** - Batch processing for scalability
- **Retry Logic** - Automatic retry with exponential backoff

---

## ⚡ Quick Start (5 Minutes)

### Prerequisites

- ✅ n8n instance running (Docker: `docker ps | grep n8n`)
- ✅ FitnessMealPlanner backend accessible
- ✅ Environment variables configured (see [Deployment Guide](./DEPLOYMENT_GUIDE.md))

### Setup Steps

1. **Start n8n**:
   ```bash
   cd C:\Users\drmwe\Claude\N8N_Automation
   docker-compose up -d
   ```

2. **Import Workflows**:
   - Navigate to: http://localhost:5678
   - Import from: `production/` folder
   - Activate all 5 workflows

3. **Configure Credentials**:
   - Mailgun API (HTTP Basic Auth)
   - HubSpot OAuth2
   - Segment API
   - Slack Webhook URL

4. **Test Webhooks**:
   ```bash
   # Test lead capture
   curl -X POST http://localhost:5678/webhook/lead-capture \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","firstName":"Test"}'
   ```

5. **Verify**:
   - Check n8n executions: http://localhost:5678/executions
   - Check Mailgun logs: https://app.mailgun.com/logs
   - Check FitnessMealPlanner webhook logs

---

## 🏗️ Architecture Overview

```
FitnessMealPlanner          n8n Workflows           External Services
─────────────────          ──────────────          ─────────────────

User Action
  │
  ├─► Meal Plan Generated ──► /webhook/aha-moment ──► Mailgun Email
  │                            │                        │
  │                            ├─► HubSpot Update      │
  │                            └─► Segment Track       │
  │                                                     │
  ├─► Payment Completed ──────► /webhook/welcome ──────┤
  │                                                     │
  └─► Lead Capture ───────────► /webhook/lead-capture ─┘

Scheduled Workflows:

  ⏰ Daily 9am EST ──────► 7-Day Nurture Check ──► Batch Email Send
  ⏰ 1st of Month ───────► Long-Term Nurture ────► Monthly Emails
```

**Key Design Principles:**
1. **Non-blocking** - Webhooks return 200 immediately, process asynchronously
2. **Fault-tolerant** - Retry logic with exponential backoff (max 3 attempts)
3. **Scalable** - Batch processing mode for >10K executions/day
4. **Observable** - Slack notifications for errors, Segment tracking for success

---

## 📂 Project Structure

```
docs/integrations/n8n-fitnessmealplanner/
├── README.md                          # This file - Quick start & overview
├── ARCHITECTURE.md                    # System architecture & data flow
├── WEBHOOK_SPECIFICATION.md           # Webhook contracts & endpoints
├── IMPLEMENTATION_STATUS.md           # Current implementation state
├── TEST_RESULTS.md                    # Test reports & validation
├── DEPLOYMENT_GUIDE.md                # Deployment procedures
├── TROUBLESHOOTING.md                 # Common issues & solutions
├── workflows/                         # N8N workflow documentation
│   ├── lead-magnet-delivery.md
│   ├── 7-day-nurture-sequence.md
│   ├── long-term-nurture.md
│   ├── welcome-onboarding.md
│   └── aha-moment-celebration.md
├── api/                               # FitnessMealPlanner API docs
│   ├── endpoints.md                   # Webhook trigger endpoints
│   └── payload-schemas.md             # Data structures
└── changelog/                         # Integration evolution
    └── CHANGELOG.md                   # Aggregated changes
```

---

## 🚀 Production Workflows

### 1. Lead Magnet Delivery ✅
**Trigger:** Webhook `/lead-capture`
**Purpose:** Deliver free meal plan to new leads
**Email:** "Your Free Meal Planning Tool - Get Started Now!"

### 2. 7-Day Nurture Sequence ✅
**Trigger:** Schedule (Daily 9am EST)
**Purpose:** Convert leads to paying customers
**Emails:** Days 1, 3, 5, 7, 10 (strategic timing)

### 3. Long-Term Nurture ✅
**Trigger:** Schedule (1st of month)
**Purpose:** Re-engage inactive users
**Email:** Monthly personalized message + COMEBACK50 promo

### 4. Welcome Onboarding ✅
**Trigger:** Webhook `/welcome`
**Purpose:** Onboard new paying customers
**Email:** Tier-specific welcome (Starter/Professional/Enterprise/Trial/Lifetime)

### 5. Aha Moment Celebration ✅
**Trigger:** Webhook `/aha-moment`
**Purpose:** Celebrate first meal plan creation
**Email:** "🎉 Amazing! You Created Your First Meal Plan"

---

## 📊 Current Status

**Implementation:** ✅ 100% Complete
**Testing:** ✅ 26/26 Unit Tests Passing
**Integration Tests:** ⚠️ Pending (credentials not configured)
**Production Deployment:** ⏳ Awaiting infrastructure (PostgreSQL, Redis, HTTPS)

**Last Updated:** January 23, 2025
**See:** [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for detailed status

---

## 🔧 Maintenance

### Regular Tasks

**Weekly:**
- [ ] Review n8n execution logs
- [ ] Check Mailgun delivery rates
- [ ] Monitor Slack error notifications

**Monthly:**
- [ ] Update email templates
- [ ] Review workflow performance metrics
- [ ] Sync documentation between repos

**Quarterly:**
- [ ] Audit integration dependencies
- [ ] Review and update troubleshooting guide
- [ ] Performance optimization review

### Sync Process

This documentation is maintained in **N8N_Automation** (source of truth) and synced to **FitnessMealPlanner** using git subtree.

**To sync documentation in FitnessMealPlanner:**
```bash
cd C:\Users\drmwe\Claude\FitnessMealPlanner
npm run docs:sync n8n-fitnessmealplanner
```

**See:** [Integration Documentation Governance Process](./GOVERNANCE.md) for details

---

## 🆘 Need Help?

**Common Issues:**
- Webhook returning 404? Check workflow activation status
- Email not sending? Verify Mailgun credentials
- HubSpot not updating? Check OAuth2 token expiration

**Full troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

**Support Channels:**
- Internal: FitnessMealPlanner team Slack channel
- n8n Community: https://community.n8n.io/
- Documentation: This folder

---

## 📚 Additional Resources

- **n8n Documentation:** https://docs.n8n.io/
- **Mailgun Docs:** https://documentation.mailgun.com/
- **HubSpot API:** https://developers.hubspot.com/
- **Segment Docs:** https://segment.com/docs/

---

**Maintained by:** Backend Team
**Integration Owner:** Backend Lead
**Questions?** See [GOVERNANCE.md](./GOVERNANCE.md) for ownership details
