# Marketing Strategy Reference for EvoFitMeals

**For:** BMAD PM Agent, Marketing Strategy Agent, and Strategic Planning
**Updated:** March 2026 (grounded in codebase audit)
**Location:** FitnessMealPlanner/marketing-sales-assets/strategies-tactics/

---

## PRODUCT TRUTH (From Phase 1 Audit)

All marketing claims MUST align with these verified capabilities:

### Verified Features (Safe to Claim)
- AI recipe generation (GPT-4, multiple methods: batch, enhanced, BMAD multi-agent)
- 8+ dietary protocols with ingredient exclusions and macro targets
- Natural language meal plan input
- Manual meal plan creation (zero AI cost)
- Client invitation system via email
- Meal plan assignment (single + bulk)
- Shareable meal plan links (public, token-based)
- Auto-generated grocery lists from meal plans
- Progress tracking (body measurements + progress photos)
- Recipe rating, favorites, and collections
- PDF export (client-side + server-side, EvoFit branding)
- Custom branding (Professional+: logo, colors; Enterprise: white-label, custom domain)
- Recipe approval workflow (admin controls quality)
- 3 roles: Admin, Trainer, Customer
- RBAC with data isolation per trainer
- Google OAuth + JWT authentication
- Stripe payment integration

### Verified Tier Limits
| Feature | Starter ($199) | Professional ($299) | Enterprise ($399) |
|---------|----------------|--------------------|--------------------|
| Max Clients | 9 | 20 | Unlimited |
| Max Meal Plans | 50 | 200 | Unlimited |
| Recipe Access | Base recipes | + Seasonal | All recipes |
| Meal Types | 5 | 10 | 17 |
| Monthly New Recipes | +25 | +50 | +100 |
| Custom Branding | No | Logo + Colors | White-label + Custom Domain |
| Export Formats | PDF | + CSV | + Excel |
| Analytics | Basic | Enhanced | Full |
| API Access | No | No | Yes |
| Bulk Operations | No | No | Yes |

### NOT Verified (Do NOT Claim)
- Offline access / PWA
- Push notifications
- Automated reminders
- CSV client import
- CRM integrations (Mailchimp, Slack, etc.)
- Annual plans
- HIPAA compliance
- Team role hierarchy (owner/coach/admin — only admin/trainer/customer exists)
- "10,000+ active trainers" (no data source)
- "2M+ recipes generated" (no data source)
- Revenue tracking dashboard (not specifically implemented)

### Removed/Disabled Features (NEVER Reference)
- Health Protocol — REMOVED (Aug 2025)
- Customer Goals — DISABLED (tables commented out)
- Usage enforcement middleware — temporarily disabled
- Recipe tier search filtering — not implemented

---

## STRATEGIC FRAMEWORK

### 1. Alex Hormozi Constraint Analysis (ALWAYS USE FIRST)
**Purpose:** Identify the ONE constraint limiting business growth
**Location:** `marketing-sales-assets/strategies-tactics/documents/alex-hormozi-playbook.md`
**Skill:** `~/.claude/skills/hormozi-constraint-analysis/SKILL.md`

**Framework:**
- **Theory of Constraints**: Only ONE factor limits growth at any time
- **4 Core Levers**: Traffic, Conversion, Price, Churn
- **5% Test**: Model 5% improvement to identify constraint
- **ICE Framework**: Impact x Confidence x Ease (solution prioritization)

**When to Use:**
- ALWAYS start with this before choosing tactics
- When user asks "what should I focus on for growth?"
- When multiple marketing ideas compete for resources
- Before creating PRDs for marketing features
- Monthly strategy reviews

---

### 2. Growth Hacking Playbook (5 Tactical Strategies)
**Purpose:** Tactical execution after constraint is identified
**Location:** `marketing-sales-assets/strategies-tactics/documents/growth-hacking-playbook.md`

**Strategies:**
1. **Paid Media Creative Testing** (for Traffic constraint)
2. **SEO & Answer Engine Optimization** (for Traffic constraint)
3. **Content Repurposing Flywheel** (for Brand/Traffic)
4. **Direct Outreach & Sales Automation** (for Lead Generation)
5. **Internal Tooling & Vibe Coding** (for Cost Reduction)

---

## AVAILABLE CLAUDE SKILLS (Loaded & Ready)

All 6 skills are loaded in `~/.claude/skills/`:

| # | Skill | Purpose | When |
|---|-------|---------|------|
| 0 | `hormozi-constraint-analysis` | Identify constraint + ICE-rank solutions | ALWAYS FIRST |
| 1 | `paid-media-creative-testing` | Ad generation, campaign management | Constraint = Traffic |
| 2 | `seo-answer-engine-optimization` | Organic traffic, keyword research | Constraint = Traffic |
| 3 | `content-repurposing-flywheel` | 70+ social posts/week from one piece | Brand/Traffic |
| 4 | `outreach-automation` | Lead lists, cold email, LinkedIn | Traffic/Leads |
| 5 | `internal-tooling-vibe-coding` | Custom tools, automation workflows | Cost/Efficiency |

---

## PRICING POSITIONING

**Model:** One-time payment, lifetime access
**Positioning:** "No monthly fees ever" — differentiator against subscription-based competitors
**Money-back:** 14-day guarantee

| Tier | Price | Target Segment |
|------|-------|----------------|
| Starter | $199 | New trainers, 1-9 clients |
| Professional | $299 | Growing practices, 10-20 clients |
| Enterprise | $399 | Gyms and teams, unlimited |

**Key messaging:**
- "Pay once, plan forever" (but soften — avoid implying no ongoing costs for AI usage)
- ROI calculator: Starter pays for itself with 2 clients
- Compare favorably to monthly competitors (Trainerize $100/mo, PlateJoy $12.99/mo)

---

## STRATEGIC DECISION MATRIX

| Constraint | Recommended Strategy | Skill | Timeline |
|------------|---------------------|-------|----------|
| **Traffic** (< 5K visitors/mo) | Paid Media OR SEO | paid-media / seo | 30-90 days |
| **Conversion** (< 2% landing page) | Landing page optimization | (architectural) | 14-30 days |
| **Price** (low AOV) | Pricing strategy, premium tier | (business model) | 30-60 days |
| **Churn** (> 10%/mo) | Customer success, retention | (product improvement) | 60-90 days |

**Budget-Based Recommendations:**

| Monthly Budget | Recommended Strategies | Expected ROI |
|----------------|----------------------|--------------|
| < $1K | SEO + Content Repurposing | 5-10x (long-term) |
| $1K - $5K | Paid Media + Outreach | 2-4x (medium-term) |
| > $5K | All 5 strategies (layered) | 3-5x blended |

---

## PM AGENT INTEGRATION

When creating PRDs for marketing features:

1. **Run constraint analysis** (hormozi-constraint-analysis skill)
2. **Align PRD with constraint** — don't build features that address the wrong lever
3. **Use ICE Framework** for feature prioritization (Impact x Confidence x Ease)
4. **Verify against Product Truth** — never claim features not in the codebase
5. **Include success metrics** from the playbooks

---

## SUCCESS METRICS

### Paid Media
- CPC: < $1.00 | CPA: < $50.00 | ROAS: 2-3x

### SEO & Content
- Organic Traffic: 10K+ visits/mo | Keywords in top 10: 50+

### Social Media
- Tweets: 70+/week | Engagement: 2-3% | Follower Growth: 5-10% MoM

### Outreach
- Lead List: 10K+ | Reply Rate: 5%+ (email) | Meetings: 20+/mo

---

## CONTENT INVENTORY

### Landing Page Content Files
| File | Purpose |
|------|---------|
| `public/landing/content/hero.md` | Hero section copy |
| `public/landing/content/features.md` | Feature descriptions |
| `public/landing/content/pricing.md` | Pricing tiers |

### Segment Landing Pages
| File | Audience |
|------|----------|
| `docs/marketing/landing/new-trainers.md` | New trainers (1-9 clients) |
| `docs/marketing/landing/established-trainers.md` | Established trainers (10-20 clients) |
| `docs/marketing/landing/online-coaches.md` | Remote/online coaches |
| `docs/marketing/landing/gym-owners.md` | Gym owners and teams |

### HTML Landing Pages
| File | Purpose |
|------|---------|
| `public/landing/index.html` | Main landing page |
| `public/landing/features.html` | Feature showcase + screenshots |
| `public/landing/comparison.html` | Competitor comparison |
| `public/landing/roi-calculator.html` | ROI/savings calculator |

### Strategy Documents
| File | Purpose |
|------|---------|
| `marketing-sales-assets/strategies-tactics/documents/alex-hormozi-playbook.md` | 50+ page Hormozi playbook |
| `marketing-sales-assets/strategies-tactics/documents/growth-hacking-playbook.md` | 100+ page growth playbook |
| `marketing-sales-assets/strategies-tactics/agents/marketing-strategy-agent.md` | Master orchestrator agent |

### Shared
| File | Purpose |
|------|---------|
| `docs/marketing/faq.md` | FAQ (shared across site, sales, support) |
| `BUSINESS_LOGIC.md` | Codebase audit (source of truth for feature claims) |

---

## CORE INSIGHT

**"Only ONE thing is limiting your growth at any time. Everything else is a distraction."**

- Always identify constraint FIRST (Hormozi skill)
- Then apply appropriate tactic (5 growth skills)
- Use ICE Framework to prioritize (Impact x Confidence x Ease)
- Verify all claims against `BUSINESS_LOGIC.md`
- Monitor metrics and identify next constraint (monthly)

---

**Created:** January 2025
**Last Updated:** March 2026 (Phase 1 codebase audit alignment)
**Status:** All 6 skills loaded and operational
**Version:** 2.0.0
