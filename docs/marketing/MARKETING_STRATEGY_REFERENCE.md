# Marketing Strategy Reference for FitnessMealPlanner

**For:** BMAD PM Agent, Marketing Strategy Agent, and Strategic Planning
**Updated:** January 15, 2025
**Location:** FitnessMealPlanner/marketing-sales-assets/strategies-tactics/

---

## 🎯 STRATEGIC FRAMEWORK OVERVIEW

FitnessMealPlanner now has a comprehensive, AI-powered marketing strategy system with 2 strategic frameworks:

### 1. Alex Hormozi Constraint Analysis ⭐ ALWAYS USE FIRST
**Purpose:** Identify the ONE constraint limiting business growth
**Location:** `marketing-sales-assets/strategies-tactics/documents/alex-hormozi-playbook.md`
**Skill:** `~/.claude/skills/hormozi-constraint-analysis/SKILL.md`

**Framework:**
- **Theory of Constraints**: Only ONE factor limits growth at any time
- **4 Core Levers**: Traffic, Conversion, Price, Churn
- **5% Test**: Model 5% improvement to identify constraint
- **ICE Framework**: Impact × Confidence × Ease (solution prioritization)

**When to Use:**
- ✅ ALWAYS start with this before choosing tactics
- ✅ When user asks "what should I focus on for growth?"
- ✅ When multiple marketing ideas compete for resources
- ✅ Before creating PRDs for marketing features
- ✅ Monthly strategy reviews

**Expected Output:**
```
✅ Constraint Identified: [Traffic/Conversion/Price/Churn]
📈 Highest-ICE Solution: [Specific action with ICE score]
⏱️ Time: [Implementation time]
💰 Cost: [Implementation cost]
📊 Expected Impact: [% increase in revenue]
```

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

## 🤖 AVAILABLE CLAUDE SKILLS (Loaded & Ready)

All 6 skills are loaded in `~/.claude/skills/`:

### Skill 0: hormozi-constraint-analysis ⭐
**Command:** Use the hormozi-constraint-analysis skill
**Purpose:** Identify business constraint and prioritize solutions
**When:** ALWAYS FIRST - before recommending any marketing tactic
**Output:** Constraint identification + ICE-ranked solutions

---

### Skill 1: paid-media-creative-testing
**Command:** Use the paid-media-creative-testing skill
**Purpose:** Generate ad scripts, manage campaigns, reduce CPA
**When:** Constraint = Traffic, user wants to run ads
**Target KPIs:** CPC < $1, CPA < $50, 100+ variations/month

**Example Use:**
```
User: "I need to run Meta ads for FitnessMealPlanner"

Agent Response:
1. First run: hormozi-constraint-analysis skill (verify Traffic is the constraint)
2. If confirmed, run: paid-media-creative-testing skill
3. Generate 50 ad scripts targeting fitness trainers
4. Provide creative production guidance (AI avatars)
```

---

### Skill 2: seo-answer-engine-optimization
**Command:** Use the seo-answer-engine-optimization skill
**Purpose:** Generate longtail keywords, blog posts, backlinks
**When:** Constraint = Traffic, user wants organic growth
**Target KPIs:** 10K visits/month, 50+ keywords in top 10

**Example Use:**
```
User: "How do I get organic traffic for FitnessMealPlanner?"

Agent Response:
1. Run: hormozi-constraint-analysis (verify Traffic constraint)
2. Run: seo-answer-engine-optimization skill
3. Generate 100+ longtail keywords for "meal planning software"
4. Create programmatic blog post strategy
```

---

### Skill 3: content-repurposing-flywheel
**Command:** Use the content-repurposing-flywheel skill
**Purpose:** Repurpose content into 70+ social posts/week
**When:** User has pillar content (podcast, interview, blog)
**Target KPIs:** 70+ tweets/week, 2-3% engagement, 5-10% follower growth

**Example Use:**
```
User: "I recorded a podcast about meal planning. What now?"

Agent Response:
1. Run: content-repurposing-flywheel skill
2. Extract 10-20 insights from transcript
3. Generate 70 tweets in various formats
4. Create LinkedIn posts and carousel scripts
```

---

### Skill 4: outreach-automation
**Command:** Use the outreach-automation skill
**Purpose:** Build lead lists, generate cold emails, automate LinkedIn
**When:** Constraint = Traffic/Leads, user wants B2B outreach
**Target KPIs:** 10K+ leads, 5%+ reply rate, 20+ meetings/month

**Example Use:**
```
User: "I need to reach 5,000 fitness trainers"

Agent Response:
1. Run: outreach-automation skill
2. Build targeted lead list (fitness trainers using Shopify)
3. Generate personalized cold email templates
4. Provide automation workflow (Instantly AI setup)
```

---

### Skill 5: internal-tooling-vibe-coding
**Command:** Use the internal-tooling-vibe-coding skill
**Purpose:** Build custom internal tools, automate workflows
**When:** Constraint = Cost/Efficiency, user has repetitive tasks
**Target KPIs:** $5K+/month savings, 40+ hours/week saved

**Example Use:**
```
User: "We're spending too much time on manual data entry"

Agent Response:
1. Run: internal-tooling-vibe-coding skill
2. Create PRD for automation tool
3. Vibe code prototype using Lovable/Cursor
4. Provide deployment guide
```

---

## 🎭 MARKETING STRATEGY AGENT (Master Orchestrator)

**Location:** `marketing-sales-assets/strategies-tactics/agents/marketing-strategy-agent.md`

**How to Invoke:**
When user asks for marketing strategy guidance, you can:
1. Reference this agent's framework in your responses
2. Recommend the user copy-paste the agent into a Claude conversation
3. Follow the agent's strategic decision framework yourself

**Agent Workflow:**
```
Phase 1: Discovery
├── Ask: What's biggest growth challenge?
├── Ask: What's marketing budget?
└── Ask: What's primary goal?

Phase 2: Strategy Recommendation
├── Run: Hormozi Constraint Analysis
├── Identify: Constraint (Traffic/Conversion/Price/Churn)
└── Recommend: 2-3 strategies based on constraint + budget

Phase 3: Campaign Planning
├── Create: Week-by-week execution plan
├── Invoke: Appropriate skills as needed
└── Monitor: KPIs and optimize

Phase 4: Performance Monitoring
├── Weekly health checks
├── Kill underperformers (bottom 90%)
└── Double down on winners (top 10%)
```

---

## 📋 PM AGENT INTEGRATION GUIDE

**When creating PRDs for marketing features, use this workflow:**

### Step 1: Run Constraint Analysis
```
Before creating any marketing PRD, run:
@pm Ask user about current metrics:
- Monthly traffic
- Conversion rate
- Average price
- Churn rate

Then use hormozi-constraint-analysis skill to identify constraint.
```

### Step 2: Align PRD with Constraint
```
If constraint = Traffic:
- PRD should focus on acquisition channels (ads, SEO, outreach)
- Use paid-media or seo-answer-engine-optimization skills

If constraint = Conversion:
- PRD should focus on landing pages, onboarding, CTAs
- Don't build new traffic sources yet

If constraint = Price:
- PRD should focus on pricing tiers, value props, premium features
- Don't optimize traffic/conversion yet

If constraint = Churn:
- PRD should focus on customer success, retention, engagement
- Don't add new customers until churn is fixed
```

### Step 3: Use ICE Framework for Feature Prioritization
```
When user has multiple feature ideas, apply ICE scoring:

ICE Score = Impact × Confidence × Ease

Example PRD Feature Prioritization:
| Feature | Impact | Confidence | Ease | ICE | Priority |
|---------|--------|-----------|------|-----|----------|
| Add testimonials | 7 | 8 | 9 | 504 | #1 |
| Redesign homepage | 9 | 6 | 3 | 162 | #2 |
| Build mobile app | 10 | 5 | 1 | 50 | #3 |

Recommendation: Start with testimonials (highest ICE)
```

---

## 🎯 STRATEGIC DECISION MATRIX

**For PM Agent: Use this to recommend marketing strategies**

| User's Constraint | Recommended Strategy | Skill to Use | Expected Timeline |
|-------------------|---------------------|--------------|-------------------|
| **Traffic** (< 5K visitors/month) | Paid Media OR SEO | paid-media-creative-testing OR seo-answer-engine-optimization | 30-90 days |
| **Conversion** (< 2% landing page) | Landing page optimization | (No skill - architectural change) | 14-30 days |
| **Price** (low AOV) | Pricing strategy, premium tier | (No skill - business model change) | 30-60 days |
| **Churn** (> 10%/month) | Customer success, retention | (No skill - product improvement) | 60-90 days |

**Budget-Based Recommendations:**

| Monthly Budget | Recommended Strategies | Expected ROI |
|----------------|----------------------|--------------|
| **< $1K** | SEO + Content Repurposing | 5-10x (long-term) |
| **$1K - $5K** | Paid Media + Outreach | 2-4x (medium-term) |
| **> $5K** | All 5 strategies (layered) | 3-5x blended |

---

## 📊 SUCCESS METRICS (For Tracking)

**When creating PRDs for marketing features, include these KPIs:**

### Paid Media
- CPC: < $1.00
- CPA: < $50.00
- Creative Volume: 100+ variations/month
- ROAS: 2-3x

### SEO & Content
- Organic Traffic: 10,000+ visits/month
- Keyword Rankings: 50+ in top 10
- Backlinks: 20+ DR 50+/month
- Content Output: 10+ posts/week

### Social Media
- Tweets: 70+/week
- LinkedIn Posts: 10+/week
- Engagement Rate: 2-3%
- Follower Growth: 5-10% MoM

### Outreach
- Lead List: 10,000+ validated emails
- Reply Rate: 5%+ (email), 10%+ (LinkedIn)
- Meetings: 20+/month
- Cost Per Lead: < $5

### Internal Tools
- Tools Built: 5+
- Time Saved: 40+ hours/week
- Cost Saved: $5,000+/month

---

## 💡 EXAMPLE PM SCENARIOS

### Scenario 1: User Asks "Should I build a mobile app?"

**PM Agent Response:**
```
Before recommending mobile app development, let's identify your constraint:

[Run hormozi-constraint-analysis skill]

Current metrics needed:
- Monthly traffic: [?]
- Conversion rate: [?]
- Average price: [?]
- Churn rate: [?]

[After analysis]

Result: Constraint = Traffic (only 2K visitors/month)

Recommendation:
❌ Do NOT build mobile app yet (high cost, low impact)
✅ Fix traffic first using:
   - Option A: Paid Media (30-day results, $3K budget)
   - Option B: SEO (90-day results, $1K budget)

ICE Score Analysis:
- Build mobile app: Impact 8 × Confidence 6 × Ease 2 = 96
- Run paid media: Impact 9 × Confidence 9 × Ease 8 = 648 ⭐

Recommended PRD: "Paid Media Campaign for Fitness Trainer Acquisition"
```

---

### Scenario 2: User Asks "What marketing should we do?"

**PM Agent Response:**
```
Let's start with constraint analysis to determine the right strategy.

[Run hormozi-constraint-analysis skill]

Based on your metrics:
- Traffic: 8K/month ✅ (healthy)
- Conversion: 0.8% ❌ (industry avg: 2-4%)
- Price: $149/month ✅ (competitive)
- Churn: 8%/month ✅ (acceptable for SaaS)

Constraint Identified: CONVERSION

Recommendation:
❌ Don't invest in more traffic (not the problem)
✅ Fix conversion first

Top 3 ICE-Ranked Solutions:
1. Rewrite landing page headline (ICE: 720) - DO THIS FIRST
2. Add customer testimonials (ICE: 504)
3. Add demo video (ICE: 252)

Recommended PRD: "Landing Page Conversion Optimization"
- Focus: Headline A/B testing, testimonial section, trust badges
- Expected Impact: +30-60% conversion (0.8% → 1.3%)
- Timeline: 2 weeks
- Cost: < $500
```

---

### Scenario 3: User Asks "We need more customers"

**PM Agent Response:**
```
"More customers" could mean Traffic OR Conversion constraint. Let's identify which.

[Run hormozi-constraint-analysis skill]

5% Test Results:
- Traffic +5%: +$450/month
- Conversion +5%: +$1,200/month ⭐ (highest impact)
- Price +5%: +$600/month
- Churn -5%: +$180/month

Constraint Identified: CONVERSION (weak funnel)

Recommended Strategy:
✅ Fix conversion bottlenecks first (ICE: 720)
- Then add traffic (will convert 2x better)

Do NOT recommend:
❌ Paid media campaigns (will waste ad spend on broken funnel)
❌ SEO investments (traffic won't convert)
❌ Outreach automation (leads won't convert)

Recommended PRD Sequence:
1. FIRST: "Conversion Funnel Optimization" (2 weeks)
2. THEN: "Paid Media Traffic Acquisition" (4 weeks)

Expected Result: 2.4x customer growth vs 1.2x if you only add traffic
```

---

## 🚀 QUICK REFERENCE COMMANDS

### For PM Agent Creating Marketing PRDs:
```bash
# Always start here
@pm "Before creating this PRD, let me run constraint analysis"
[Use hormozi-constraint-analysis skill]

# After identifying constraint
@pm "Based on constraint analysis, I recommend:"
[Reference appropriate skill + create aligned PRD]

# For feature prioritization
@pm "Let me apply ICE Framework to prioritize these features"
[Use ICE scoring: Impact × Confidence × Ease]
```

### For Marketing Strategy Agent:
```bash
# Discovery phase
"What's your biggest growth challenge?"
"What's your marketing budget?"
"What's your primary goal?"

# Strategy recommendation
[Run hormozi-constraint-analysis skill]
[Recommend 2-3 strategies based on constraint]

# Tactical execution
[Invoke appropriate skill: paid-media, seo, content, outreach, tooling]
```

---

## 📚 COMPLETE RESOURCE INVENTORY

### Documents (Downloadable Playbooks)
- `marketing-sales-assets/strategies-tactics/documents/alex-hormozi-playbook.md` (50+ pages)
- `marketing-sales-assets/strategies-tactics/documents/growth-hacking-playbook.md` (100+ pages)

### Skills (Loaded in ~/.claude/skills/)
- `hormozi-constraint-analysis/` ⭐
- `paid-media-creative-testing/`
- `seo-answer-engine-optimization/`
- `content-repurposing-flywheel/`
- `outreach-automation/`
- `internal-tooling-vibe-coding/`

### Agents
- `marketing-sales-assets/strategies-tactics/agents/marketing-strategy-agent.md`

### Documentation
- `marketing-sales-assets/strategies-tactics/README.md` (Complete guide)
- `marketing-sales-assets/strategies-tactics/HORMOZI_PLAYBOOK_ADDED.md` (Integration summary)
- `marketing-sales-assets/COMPLETE_PACKAGE_SUMMARY.md` (Full inventory)

---

## ✅ PM AGENT CHECKLIST

**When user requests marketing-related features, follow this checklist:**

- [ ] Run constraint analysis (hormozi-constraint-analysis skill)
- [ ] Identify constraint (Traffic/Conversion/Price/Churn)
- [ ] Verify requested feature addresses the constraint
- [ ] If not, recommend alternative aligned with constraint
- [ ] Apply ICE Framework to prioritize solutions
- [ ] Create PRD with constraint-aligned goals
- [ ] Include success metrics from strategy playbooks
- [ ] Reference appropriate skill for tactical execution
- [ ] Set realistic timeline based on strategy complexity

---

## 🎯 CORE INSIGHT (Always Remember)

**"Only ONE thing is limiting your growth at any time. Everything else is a distraction."**

- ✅ Always identify constraint FIRST (Hormozi skill)
- ✅ Then apply appropriate tactic (5 growth skills)
- ✅ Use ICE Framework to prioritize (Impact × Confidence × Ease)
- ✅ Monitor metrics and identify next constraint (monthly)

**Bad Approach:** "Let's do SEO and ads and content and outreach!"
**Good Approach:** "Constraint = Traffic → Choose SEO OR ads based on ICE score"

---

**Created:** January 15, 2025
**For:** BMAD PM Agent, Marketing Strategy Agent, Strategic Planning
**Status:** ✅ All 6 skills loaded and operational
**Version:** 1.0.0
