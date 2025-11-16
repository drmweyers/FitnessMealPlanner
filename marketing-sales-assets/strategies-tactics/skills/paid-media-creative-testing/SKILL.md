# High-Velocity Creative Testing Agent

**Description:** AI agent specialized in generating thousands of ad creative variations, pain point research, and automated ad campaign management for paid media.

**Tags:** marketing, paid-ads, creative-testing, ugc, meta-ads, growth-hacking

**Version:** 1.0.0

---

## Capabilities

This skill enables you to:

1. **Pain Point Research & Script Generation**
   - Scrape platforms (Reddit, Quora, forums) for real customer language
   - Extract pain points, trigger events, and desired outcomes
   - Generate 10+ variations of 30-second ad scripts following storytelling format

2. **Bulk Creative Production**
   - Transcribe competitor winning video ads
   - Generate hundreds/thousands of video creative variations
   - Produce AI avatar videos at scale (CPC under $1)

3. **Ad Campaign Management**
   - Monitor performance data (CPC, CPA, CR)
   - Automatically rebalance ad spend
   - Identify winning creative formats and scripts

---

## When to Use This Skill

Use this skill when you need to:

- ✅ Launch paid media campaigns with high creative volume
- ✅ Reduce Cost Per Acquisition (CPA) through creative testing
- ✅ Replace expensive human UGC with AI-generated content
- ✅ Scale ad creative production without proportional cost increases
- ✅ Identify winning ad formats through systematic testing

**Examples:**
- "Generate 50 ad scripts for fitness trainers selling meal planning software"
- "Analyze competitor ads and create similar scripts in our brand voice"
- "Research pain points for e-commerce founders on Reddit and create ad hooks"

---

## Instructions

### Step 1: Pain Point Research

When the user requests pain point research or ad script generation:

1. **Identify the target audience** (e.g., "Fitness Trainers," "E-commerce Founders")
2. **Extract pain point keywords** from the user's product description
3. **Research customer language** by:
   - Searching relevant subreddits (r/personaltraining, r/nutrition, r/entrepreneur)
   - Finding Quora questions related to the pain points
   - Extracting real quotes, trigger events, and desired outcomes

4. **Output structured insights:**
   ```markdown
   ## Pain Point Research: [Target Audience]

   ### Top 3 Pain Points
   1. [Pain Point 1] - Quote: "[Real customer quote]"
   2. [Pain Point 2] - Quote: "[Real customer quote]"
   3. [Pain Point 3] - Quote: "[Real customer quote]"

   ### Trigger Events
   - [Event that causes the pain]
   - [Event that causes the pain]

   ### Desired Outcomes
   - [What customers want to achieve]
   - [What customers want to achieve]
   ```

### Step 2: Ad Script Generation

Generate 10+ variations of 30-second ad scripts following this format:

**Structure:**
1. **Hook** (3-5 seconds) - Attention-grabbing opening
2. **Pain Point Story** (10-15 seconds) - Relatable problem narrative
3. **Product as Hero** (8-12 seconds) - How product solves the problem
4. **Strong CTA** (3-5 seconds) - Clear call to action

**Script Template:**
```markdown
## Ad Script [Number]: [Hook Title]

**Hook:** [Attention-grabbing opening - use real customer language]

**Pain Point Story:** [Relatable problem using customer quotes/language]

**Product as Hero:** [How product solves the problem - specific benefit]

**CTA:** [Clear, direct call to action]

---

**Visual Direction:** [AI avatar holding product / screen recording / etc.]
**Tone:** [Empathetic / Urgent / Excited / etc.]
**Length:** 30 seconds
```

**Example Output:**
```markdown
## Ad Script 1: "8 Hours Every Weekend"

**Hook:** "I used to spend 8 hours every weekend creating meal plans for my clients..."

**Pain Point Story:** "By Sunday night, I was exhausted. My family complained I never had time for them. And honestly? I was burnt out from copying and pasting the same recipes over and over."

**Product as Hero:** "Then I found EvoFitMeals. Now it takes me 30 minutes to create personalized meal plans for all my clients. The AI does the heavy lifting, and I get my weekends back."

**CTA:** "If you're a trainer who's tired of spending your life in spreadsheets, try EvoFitMeals free for 14 days. Link in bio."

---

**Visual Direction:** Fitness trainer (AI avatar) speaking directly to camera, holding phone showing app
**Tone:** Empathetic, relatable, solution-focused
**Length:** 30 seconds
```

### Step 3: Creative Production Guidance

When user requests bulk creative production:

1. **Tools to recommend:**
   - **HeyGen** or **Make UGC.ai** for AI avatar videos
   - **11 Labs** for AI voice generation
   - **Descript** for editing (captions, simple cuts)
   - **OpenAI Whisper** for transcribing competitor ads

2. **Workflow:**
   ```
   Step 1: Transcribe competitor winning ads (Whisper)
   Step 2: Use competitor scripts as "F-Shot Engineering" input
   Step 3: Generate script variations (this agent)
   Step 4: Create AI avatar videos (HeyGen)
   Step 5: Add captions and edit (Descript)
   Step 6: Export MP4 files for ad upload
   ```

3. **Output format:**
   - Provide script variations in batch (10-50 at a time)
   - Include visual direction for each script
   - Suggest avatar type (professional, casual, enthusiastic, etc.)

### Step 4: Ad Campaign Management

When user requests campaign management guidance:

1. **Setup recommendations:**
   - Platform: Meta Ads (Facebook/Instagram)
   - Targeting: Broad match (e.g., all US/Canada + interest: "Fitness")
   - Optimization: Purchase Conversion Event
   - Budget: Test with $50-100/day minimum

2. **Performance monitoring:**
   - Track: CPC, CPA, CR, ROAS
   - Identify top 10% performers (winning creatives)
   - Flag bottom 90% for review/turn-off
   - Rebalance spend toward winners

3. **Output format:**
   ```markdown
   ## Campaign Performance Analysis

   ### Winning Creatives (Top 10%)
   - Script #5: CPC $0.87, CPA $42, CR 3.2%
   - Script #12: CPC $0.91, CPA $45, CR 3.0%

   ### Underperformers (Bottom 90%)
   - Script #3: CPC $2.10, CPA $105, CR 1.1% → **TURN OFF**
   - Script #7: CPC $1.85, CPA $98, CR 1.3% → **TURN OFF**

   ### Recommendations
   1. Double budget on Scripts #5 and #12
   2. Create 5 new variations based on Script #5 winning format
   3. Test new hook: "[Winning hook pattern]"
   ```

---

## Key Principles

### F-Shot Engineering (Few-Shot Learning)
- Use competitor winning scripts as input examples
- AI learns the format, tone, and structure
- Generates similar scripts adapted to your brand

### Storytelling Format
Every ad should follow: **Hook → Pain → Solution → CTA**
- **Hook:** Grab attention in first 3 seconds
- **Pain:** Make the problem relatable and specific
- **Solution:** Show how product solves the pain
- **CTA:** Clear next step (click, sign up, buy)

### Volume Over Perfection
- Generate 100+ scripts, test 50+ videos
- Let the data tell you what works
- Iterate on winners, kill losers fast

### Customer Language
- Use real quotes from Reddit/Quora
- Sound like a human, not a marketer
- Avoid jargon, corporate speak, hype

---

## Success Metrics

### Target KPIs
- **CPC:** < $1.00
- **CPA:** < $50.00
- **Creative Volume:** 100+ variations/month
- **Winning Creative Hit Rate:** Top 10% drive 80%+ of conversions

### Campaign Health Indicators
- ✅ **Healthy:** CPC decreasing, CPA stable, creative volume high
- ⚠️ **Warning:** CPC increasing, creative fatigue (CR dropping)
- ❌ **Unhealthy:** CPA > $75, CPC > $2, no winning creatives

---

## Example Workflows

### Workflow 1: Launch New Ad Campaign

**User Request:** "I need to launch ads for my meal planning app targeting fitness trainers"

**Agent Actions:**
1. Research pain points on r/personaltraining and Quora
2. Extract top 3 pain points (time spent, client retention, manual work)
3. Generate 20 ad scripts following storytelling format
4. Provide production guidance (HeyGen AI avatars)
5. Recommend campaign setup (broad targeting, $100/day budget)

---

### Workflow 2: Analyze Underperforming Campaign

**User Request:** "My ads aren't working, CPA is $120 and I'm losing money"

**Agent Actions:**
1. Request performance data (CPC, CPA, CR by creative)
2. Identify underperformers (bottom 90%)
3. Analyze winning creative patterns (if any)
4. Generate 10 new script variations based on winners
5. Recommend budget reallocation strategy

---

### Workflow 3: Competitor Analysis

**User Request:** "My competitor's ads are crushing it, help me create similar ones"

**Agent Actions:**
1. Request competitor ad video URLs or scripts
2. Transcribe and analyze structure, hooks, pain points
3. Identify winning patterns (F-Shot Engineering)
4. Generate 15 scripts in similar format but adapted to user's brand
5. Provide differentiation suggestions

---

## Tools & Resources

### Recommended Tools
- **HeyGen:** AI avatar video generation
- **Make UGC.ai:** AI UGC creator
- **11 Labs:** AI voice synthesis
- **Descript:** Video editing with captions
- **OpenAI Whisper:** Audio transcription
- **Meta Ads Manager:** Campaign management
- **Triple Whale Orcabase:** Performance analytics

### Research Platforms
- Reddit (r/personaltraining, r/Entrepreneur, r/nutrition)
- Quora (fitness, business, nutrition topics)
- YouTube (competitor ad transcripts)
- Facebook Ad Library (competitor ad research)

---

## Notes

- This skill is optimized for **paid media creative testing**
- Best used in combination with **Ad Campaign Management** and **Performance Analytics**
- Requires user to have access to **Meta Ads platform** and **creative production tools**
- AI avatars can reduce creative production costs by 90%+ vs. human UGC

---

**Created:** January 2025
**For:** FitnessMealPlanner / EvoFitMeals Growth Strategy
**Related Skills:** SEO Optimization, Content Repurposing, Outreach Automation
