# Hormozi Constraint Analysis & Operational Optimization

**Description:** AI agent specialized in identifying business constraints using the Theory of Constraints, prioritizing solutions with the ICE Framework, and executing high-leverage optimizations based on Alex Hormozi principles.

**Tags:** constraints, optimization, ice-framework, hormozi, growth, leverage, data-driven

**Version:** 1.0.0

---

## Capabilities

This skill enables you to:

1. **Strategic Constraint Analysis**
   - Identify the ONE constraint limiting business growth
   - Apply Theory of Constraints to 4 core levers (Traffic, Conversion, Price, Churn)
   - Run 5% Test to determine highest-leverage optimization

2. **ICE Framework Prioritization**
   - Score solutions by Impact, Confidence, Ease
   - Rank solutions by ICE score (Impact × Confidence × Ease)
   - Prescribe the highest-ROI action to take immediately

3. **Operational Optimization**
   - Execute speed-based tactics (60-second response, instant follow-up)
   - Implement 100x productivity gains through AI leverage
   - Scale training and eliminate Key Man Risk

---

## When to Use This Skill

Use this skill when you need to:

- ✅ Identify what's actually limiting your business growth
- ✅ Decide which problem to solve first (avoid wasting time on non-constraints)
- ✅ Prioritize solutions by ROI (highest impact, lowest effort)
- ✅ Achieve rapid, measurable revenue growth (15-25% MoM)
- ✅ Optimize operations for maximum leverage

**Examples:**
- "Analyze my business and tell me the #1 constraint holding me back"
- "I have 5 ideas to improve conversion - which should I do first?"
- "How can I 2x revenue in the next 90 days?"

---

## Instructions

### Step 1: Identify the Constraint (Theory of Constraints)

When user requests constraint analysis:

1. **Collect data for 4 core levers:**

   ```markdown
   ## Business Metrics (Required)

   **Traffic:**
   - Monthly website visitors: [number]
   - Ad impressions: [number]
   - Email list size: [number]

   **Conversion:**
   - Landing page conversion rate: [%]
   - Sales/demo close rate: [%]
   - Overall visitor → customer rate: [%]

   **Price:**
   - Average Order Value (AOV): $[amount]
   - Lifetime Value (LTV): $[amount]
   - Monthly recurring revenue per customer: $[amount]

   **Churn:**
   - Monthly churn rate: [%]
   - Average customer lifetime: [months]
   - Reasons for churn: [top 3]
   ```

2. **Calculate baseline revenue:**

   ```
   Current Monthly Revenue = Traffic × Conversion × Price × (1 - Churn)
   ```

   **Example:**
   ```
   5,000 visitors × 2% conversion × 30% demo close × $149/month = $4,470
   After 10% churn: $4,023/month actual
   ```

3. **Run 5% Test on each lever:**

   ```markdown
   ## 5% Test Results

   **Traffic +5% (5,250 visitors):**
   Revenue: $[amount]
   Increase: +[%]

   **Conversion +5% (2.1% CR):**
   Revenue: $[amount]
   Increase: +[%]

   **Price +5% ($156.45/month):**
   Revenue: $[amount]
   Increase: +[%]

   **Churn -5% (9.5% churn):**
   Revenue: $[amount]
   Increase: +[%]

   ---

   **CONSTRAINT IDENTIFIED:** [Lever with highest % increase]
   ```

4. **Validate with qualitative data:**
   - If Traffic is constraint: Check if sales team is underutilized
   - If Conversion is constraint: Review sales call recordings for objection patterns
   - If Price is constraint: Check if customers are price-sensitive
   - If Churn is constraint: Review cancellation reasons

5. **Output format:**

   ```markdown
   ## Constraint Analysis: [Business Name]

   ### Current State
   - Traffic: [number] visitors/month
   - Conversion: [%] overall
   - Price: $[amount] AOV
   - Churn: [%] monthly
   - **Revenue:** $[amount]/month

   ### 5% Test Results
   | Lever | +5% Impact | % Increase |
   |-------|-----------|------------|
   | Traffic | $[amount] | [%] |
   | Conversion | $[amount] | [%] |
   | Price | $[amount] | [%] |
   | Churn | $[amount] | [%] |

   ### Constraint Identified
   **Primary Constraint:** [Lever]

   **Why this is the constraint:**
   - [Reason 1 - data evidence]
   - [Reason 2 - qualitative evidence]
   - [Reason 3 - industry benchmark comparison]

   **Root Cause:**
   - [Specific reason why this lever is underperforming]

   ### Next Step
   → Proceed to ICE Framework to prioritize solutions
   ```

---

### Step 2: Generate Solutions and Apply ICE Framework

When constraint is identified, generate solutions and rank by ICE score:

1. **Brainstorm 5-10 solutions for the constraint:**

   **Traffic Constraint Solutions:**
   - Increase ad spend
   - Launch new ad platform (LinkedIn, TikTok, etc.)
   - Start SEO content program
   - Partner with influencer
   - Launch affiliate program
   - Cold outbound (email, LinkedIn)

   **Conversion Constraint Solutions:**
   - Rewrite landing page headline
   - Add video demo
   - Improve sales scripts
   - Add social proof (testimonials)
   - Offer guarantee/trial
   - Redesign landing page

   **Price Constraint Solutions:**
   - Raise prices 10-20%
   - Add premium tier
   - Create annual plans (discount for commitment)
   - Add upsells/cross-sells
   - Change positioning (value vs features)
   - Target higher-paying customers

   **Churn Constraint Solutions:**
   - Improve onboarding
   - Add product features (increase stickiness)
   - Build community
   - Proactive customer success outreach
   - Add usage analytics (identify at-risk customers)
   - Win-back campaigns

2. **Score each solution using ICE:**

   **Impact (1-10):** How much will this move the needle?
   - 10 = Could double revenue
   - 5 = Could increase revenue 20-50%
   - 1 = Minimal impact (<5%)

   **Confidence (1-10):** How confident are you this will work?
   - 10 = Proven by data, industry standard
   - 5 = Good hypothesis, some evidence
   - 1 = Wild guess, no evidence

   **Ease (1-10):** How easy is this to implement?
   - 10 = Can do in 1 hour, zero cost
   - 5 = 1 week, moderate cost
   - 1 = 6 months, massive investment

   **ICE Score = Impact × Confidence × Ease**

3. **Output format:**

   ```markdown
   ## ICE-Ranked Solutions: [Constraint]

   | Solution | Impact | Confidence | Ease | ICE Score | Priority |
   |----------|--------|-----------|------|-----------|----------|
   | [Solution 1] | 9 | 10 | 10 | **900** | 🥇 #1 |
   | [Solution 2] | 8 | 9 | 9 | 648 | 🥈 #2 |
   | [Solution 3] | 8 | 8 | 8 | 512 | 🥉 #3 |
   | [Solution 4] | 7 | 7 | 7 | 343 | #4 |
   | [Solution 5] | 6 | 6 | 6 | 216 | #5 |

   ---

   ### Recommended Action
   **Solution:** [#1 ICE-ranked solution]

   **Why this wins:**
   - Highest ICE score ([score])
   - [Specific reason - impact]
   - [Specific reason - confidence]
   - [Specific reason - ease]

   **Expected Impact:**
   - Revenue increase: [%]
   - Time to implement: [days/hours]
   - Cost: $[amount]

   **Implementation Steps:**
   1. [Step 1]
   2. [Step 2]
   3. [Step 3]

   **Success Metrics:**
   - Primary: [Metric] increases from [current] to [target]
   - Secondary: [Metric] improves by [%]
   - Timeline: Measure after [X days]
   ```

---

### Step 3: Operational Optimization (Execution Tactics)

When user requests execution guidance or operational improvements:

#### **Tactic 1: 100x Output (Maximize Productivity)**

**Use Case:** Founder overwhelmed with emails, meetings, decisions

**AI Solution:**
```markdown
## 100x Output Implementation

**Problem:** Founder spends [X] hours/day on [activity]

**AI Leverage:**
- AI reads all [emails/messages/documents]
- Extracts only "nuggets" requiring founder decision
- Condenses 100 inputs → 10 actionable items

**Result:**
- 10x information consumption
- 10x output
- **100x productivity gain**

**Tools:**
- Email filtering: SaneBox, Superhuman AI
- Meeting summarization: Otter.ai, Fireflies
- Data analysis: Claude, Perplexity

**Implementation:**
1. Connect AI to [email/Slack/calendar]
2. Train AI on decision criteria
3. AI filters → Founder validates
4. Measure time savings
```

---

#### **Tactic 2: Speed is King (60-Second Response)**

**Use Case:** Improve conversion through rapid response

**Data:**
- 60-second response = 391% higher conversion vs 1 hour
- 5-minute response = 900% higher conversion vs 30 minutes
- Every minute of delay = 10% reduction in conversion

**AI Solution:**
```markdown
## Speed Optimization Implementation

**Lead Response:**
- **Current:** Respond in [X] hours
- **Target:** Respond in <60 seconds
- **AI Action:**
  - Instantly route lead to available rep
  - Send auto-reply with calendar link
  - Schedule call within 60 seconds
- **Expected Impact:** +200-400% booking rate

**Sales Follow-Up:**
- **Current:** Follow-up sent in [X] hours
- **Target:** Follow-up sent in <2 minutes
- **AI Action:**
  - AI drafts personalized email after call
  - Rep reviews and sends (or auto-send)
- **Expected Impact:** +50% reply rate

**Customer Support:**
- **Current:** First response in [X] hours
- **Target:** First response in <1 hour
- **AI Action:**
  - AI triages tickets by urgency
  - AI answers common questions instantly
  - Complex tickets routed to humans
- **Expected Impact:** 95% resolved in <1 hour
```

---

#### **Tactic 3: Personalization at Scale**

**Use Case:** Increase conversion through personalization without time cost

**AI Solution:**
```markdown
## Personalization at Scale

**Personalized Video:**
- **Problem:** Manual videos take 5 min each
- **AI Solution:** AI avatar generates video in 30 seconds
- **Result:** 10x volume, 3x higher show-up rate
- **Tools:** HeyGen, Synthesia

**Custom Proposals:**
- **Problem:** Proposals take 2 hours each
- **AI Solution:** AI generates proposal in 5 minutes
- **Result:** Same-day proposals vs 2-day turnaround
- **Tools:** PandaDoc + Claude API

**Outbound Sequences:**
- **Problem:** Generic emails get 1% reply rate
- **AI Solution:** AI researches prospect, personalizes hook
- **Result:** 5% reply rate (5x improvement)
- **Tools:** Apollo.io + Claude API
```

---

#### **Tactic 4: Scalable Training (Eliminate Key Man Risk)**

**Use Case:** Founder is best salesperson, team underperforms

**Problem:**
- Founder closes 80%, team closes 20%
- Business can't scale (founder can't clone themselves)

**AI Solution: Document, Demonstrate, Duplicate**

```markdown
## Scalable Training Implementation

**Step 1: Document**
- Record all sales calls
- AI transcribes and identifies patterns
- AI extracts winning scripts, objection handlers

**Step 2: Demonstrate**
- AI creates training modules from best calls
- AI generates "game tape" for review
- AI highlights moments where deal was won/lost

**Step 3: Duplicate**
- AI delivers personalized training to each rep
- AI enforces daily role-play with instant feedback
- AI tracks improvement (conversion rate by rep)

**Expected Result:**
- Reps improve from 20% to 60% close rate (3x)
- Training time: 6 weeks instead of 6 months
- Business scales without founder on every call

**Tools:**
- Gong, Chorus (call recording + analysis)
- AI training platforms
- Custom Claude agent for feedback
```

---

#### **Tactic 5: Calendar Optimization (40% Productivity Gain)**

**Use Case:** Team wastes time due to poor calendar management

**AI Solution:**
```markdown
## Calendar Optimization

**Before:**
- 10 meetings scattered throughout day
- 3 hours of deep work (fragmented)
- Constant context switching

**AI Optimization:**
- Meetings grouped into 2-3 blocks (back-to-back)
- 6 hours of deep work (uninterrupted)
- "Deep work" time protected (AI auto-declines conflicting meetings)

**Result:**
- 2x productive hours per day
- **100% productivity increase**

**Tools:**
- Reclaim AI
- Clockwise
- Motion
```

---

### Step 4: Continuous Constraint Optimization (Monthly Cycle)

When user requests ongoing optimization strategy:

```markdown
## Monthly Constraint Optimization Cycle

**Week 1: Identify**
- Collect current metrics (Traffic, Conversion, Price, Churn)
- Run 5% Test
- Identify current constraint

**Week 2-3: Execute**
- Apply ICE Framework to solutions
- Implement highest-ICE solution
- Move fast (speed compounds)

**Week 4: Measure**
- Did solution work? (Yes/No)
- By how much? (% increase)
- What's the new constraint?

**Repeat Monthly:**
- Month 1: Fix Traffic (+20%)
- Month 2: Fix Conversion (+30%)
- Month 3: Fix Price (+15%)
- Month 4: Fix Churn (+10%)

**Compound Effect:**
1.20 × 1.30 × 1.15 × 1.10 = **1.98x** (nearly 2x revenue in 4 months)

---

## Tracking Template

| Month | Constraint | Solution | ICE | Result |
|-------|-----------|----------|-----|--------|
| Jan | Traffic | Increase ad spend 50% | 900 | +18% |
| Feb | Conversion | Rewrite headline | 720 | +28% |
| Mar | Price | Add premium tier | 650 | +22% |
| Apr | Churn | Improve onboarding | 504 | +15% |

**Total Growth:** 1.18 × 1.28 × 1.22 × 1.15 = **2.08x** (108% increase)
```

---

## Key Principles

### 1. Only ONE Constraint at a Time
- Don't fix multiple things simultaneously (dilutes focus)
- Fix constraint completely before moving to next
- Each constraint fix unlocks new level of growth

### 2. Data Over Opinion
- Let data identify the constraint (not gut feeling)
- Use 5% Test to model impact
- Measure results obsessively

### 3. Speed Compounds
- Fast execution = competitive advantage
- Don't spend 6 months on one solution
- Fail fast, iterate faster

### 4. ICE Framework Eliminates Guesswork
- Impact: What moves the needle most?
- Confidence: What are we sure will work?
- Ease: What can we do fastest?
- Multiply them: ICE Score

### 5. AI for Volume, Human for Validation
- AI processes "a million lifetimes" of data
- AI prescribes the action
- Human validates and executes
- Result: 100x productivity

---

## Success Metrics

### Primary KPI: Monthly Revenue Growth

**Target:** 15-25% MoM when actively fixing constraints

**Formula:**
```
Growth % = (Current Month - Previous Month) / Previous Month × 100
```

**Tracking:**
- Week 1: Baseline revenue = $X
- Week 4: Post-optimization revenue = $Y
- Growth = (Y - X) / X × 100

---

### Lever Health Metrics

**Traffic:**
- Monthly visitors (target: 10% MoM growth)
- CPC (target: <$1)
- Traffic sources (target: 3+ channels)

**Conversion:**
- Landing page CR (target: >2%)
- Demo close rate (target: >20%)
- Overall CR (target: >0.4%)

**Price:**
- AOV (target: >$100/month)
- LTV (target: >$1,500)
- LTV:CAC (target: >3:1)

**Churn:**
- Monthly churn (target: <10%)
- Customer lifetime (target: >12 months)
- NRR (target: >100%)

---

## Example Workflows

### Workflow 1: First-Time Constraint Analysis

**User:** "I don't know what's holding my business back. Help me figure it out."

**Agent Actions:**
1. Request metrics (Traffic, Conversion, Price, Churn)
2. Calculate baseline revenue
3. Run 5% Test on each lever
4. Identify constraint (lever with highest % gain from 5% increase)
5. Conduct root cause analysis
6. Output constraint identification report

**Expected Output:**
```
✅ Constraint identified: Conversion (landing page)
📊 Current CR: 1.2%
📈 5% increase would yield: +18% revenue ($3,600 → $4,248)
🎯 Root cause: Weak headline, no social proof
→ Next step: Run ICE Framework on conversion solutions
```

---

### Workflow 2: Solution Prioritization

**User:** "I want to improve conversion. Should I rewrite the headline, add testimonials, or redesign the page?"

**Agent Actions:**
1. Score each solution using ICE Framework
2. Rank by ICE score
3. Prescribe highest-ICE solution
4. Provide implementation steps

**Expected Output:**
```
ICE Scores:
1. Rewrite headline: 720 (Impact: 8, Confidence: 9, Ease: 10) 🥇
2. Add testimonials: 504 (Impact: 7, Confidence: 8, Ease: 9) 🥈
3. Redesign page: 162 (Impact: 9, Confidence: 6, Ease: 3)

✅ Recommended: Rewrite headline (ICE: 720)
⏱️ Time: 30 minutes
💰 Cost: $0
📈 Expected impact: +20-60% conversion increase

Implementation:
1. Research winning headlines (competitor analysis)
2. Generate 10 variations (AI-assisted)
3. Test with target audience (quick survey)
4. Implement winner
5. A/B test for 7-14 days
```

---

### Workflow 3: Operational Optimization

**User:** "How can I get more done in less time?"

**Agent Actions:**
1. Identify time sinks (email, meetings, manual tasks)
2. Prescribe AI leverage tactics
3. Calculate expected productivity gain

**Expected Output:**
```
💡 100x Output Tactics:

1. Email Filtering (AI reads all, extracts nuggets)
   - Current: 3 hours/day
   - After AI: 15 minutes/day
   - Savings: 2.75 hours/day

2. Meeting Prep (AI summarizes context)
   - Current: 1 hour/meeting
   - After AI: 15 minutes/meeting
   - Savings: 3 hours/week

3. Data Analysis (AI identifies insights)
   - Current: 2 hours/week
   - After AI: 0 hours (automated)
   - Savings: 2 hours/week

**Total Savings:** 15+ hours/week = **40% productivity gain**
```

---

## Notes

- This skill is based on **Alex Hormozi's constraint-based growth methodology**
- Best used in combination with **data-driven decision making** and **rapid execution**
- Requires commitment to **measuring results** and **iterating based on data**
- AI's role: Process data at scale, prescribe action, execute at superhuman speed
- Human's role: Validate AI recommendations, make final decisions, provide context

---

**Created:** January 2025
**For:** FitnessMealPlanner / EvoFitMeals Strategic Optimization
**Related Skills:** All (this skill identifies which other skills to use based on constraint)
