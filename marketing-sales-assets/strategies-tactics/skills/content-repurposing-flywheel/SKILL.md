# Content Repurposing and Distribution Flywheel

**Description:** AI agent specialized in maximizing content output from pillar content (podcasts, interviews) and ensuring distribution across all native channels to create a self-sustaining content flywheel.

**Tags:** content-repurposing, social-media, content-flywheel, distribution, shorts, tweets

**Version:** 1.0.0

---

## Capabilities

This skill enables you to:

1. **Pillar Content Extraction**
   - Extract 10-20 key insights from long-form transcripts
   - Generate blog posts and email newsletters
   - Identify viral-worthy moments

2. **Short-Form Content Generation**
   - Create 70+ tweets/week from single piece of content
   - Generate LinkedIn posts, carousels, and short videos
   - Adapt content to each platform's native format

3. **Social Content Optimization**
   - Monitor performance (impressions, engagement)
   - Use top-performing content as seeds for new content
   - Create automated learning loops

---

## When to Use This Skill

Use this skill when you need to:

- ✅ Repurpose podcast episodes or interviews into 50+ pieces of content
- ✅ Create high-volume social media content (70+ posts/week)
- ✅ Distribute content across multiple platforms (Twitter, LinkedIn, YouTube, etc.)
- ✅ Build a self-sustaining content flywheel
- ✅ Maximize ROI from pillar content creation

**Examples:**
- "Turn this podcast transcript into 70 tweets and 10 LinkedIn posts"
- "Extract key insights from this interview and create a content calendar"
- "Generate short video scripts from this blog post"

---

## Instructions

### Step 1: Pillar Content Extraction

When user provides long-form content (podcast transcript, interview, fireside chat):

1. **Read the full transcript** (Claude large context window)

2. **Extract 10-20 key insights** following this format:
   ```markdown
   ## Key Insights from [Content Title]

   ### Insight #1: [Catchy Title]
   **Core Idea:** [1-2 sentence summary]
   **Quote:** "[Most impactful quote from content]"
   **Application:** [How reader can apply this]
   **Viral Potential:** [High/Medium/Low + reason]

   ### Insight #2: [Catchy Title]
   ...
   ```

3. **Categorize insights:**
   - **Tactical** (how-to, step-by-step, actionable)
   - **Strategic** (big-picture thinking, frameworks)
   - **Controversial** (contrarian opinions, hot takes)
   - **Inspirational** (stories, motivation, mindset)
   - **Educational** (teaching concepts, explaining ideas)

4. **Output blog post draft:**
   ```markdown
   # [SEO-Optimized Title Based on Main Theme]

   **Introduction:**
   [Hook based on most interesting insight]
   [Preview what reader will learn]

   ## Section 1: [Insight Category]
   [Expand on insights #1-3]
   [Include quotes from original content]

   ## Section 2: [Insight Category]
   [Expand on insights #4-6]

   ...

   ## Conclusion
   [Recap key takeaways]
   [CTA to related content or product]

   ---

   **Word Count:** 1,200-1,500 words
   **Reading Time:** 6-8 minutes
   ```

5. **Output email newsletter draft:**
   ```markdown
   **Subject Line:** [Intriguing question or bold claim from content]

   Hey [First Name],

   [Personal opening - casual tone, 1-2 sentences]

   [Main insight - storytelling format, 3-4 paragraphs]

   [Tactical takeaway - specific action reader can take]

   [CTA - link to full episode/article or product]

   [Sign-off in brand voice]

   ---

   **Length:** 250-350 words
   **Links:** 1-2 (full content + CTA)
   **Tone:** [Conversational / Professional / Friendly - match brand]
   ```

---

### Step 2: Short-Form Content Generation

When user requests social media content from extracted insights:

#### Twitter/X Content

**Generate 70+ tweets/week following these formats:**

1. **One-Liner Format** (Best for engagement)
   ```
   [Bold statement or contrarian opinion]

   [5-word max follow-up or question]

   No periods. No caps. Simple.
   ```

   **Example:**
   ```
   most trainers are wasting 8 hours a week on meal plans

   thats 400 hours per year

   on copy paste
   ```

2. **Thread Format** (Best for teaching)
   ```
   Tweet 1: [Hook - bold claim or question]

   Tweet 2-5: [Each tweet = 1 insight, max 280 characters]

   Tweet 6: [Conclusion + CTA]
   ```

   **Example:**
   ```
   1/ AI is replacing meal planning templates

   And trainers who dont adapt will lose clients

   Heres why:

   2/ Your clients dont want generic meal plans

   They want personalized nutrition based on their goals, preferences, and lifestyle

   3/ Manual meal planning cant scale

   You hit a ceiling at 20-30 clients max

   Then you burn out

   4/ AI meal planning tools can generate personalized plans in 30 seconds

   With perfect macro calculations

   For unlimited clients

   5/ The trainers winning in 2025 are using AI as leverage

   Not as replacement

   6/ If youre still doing meal plans manually, youre working 10x harder than necessary

   Try [EvoFitMeals] free for 14 days → [link]
   ```

3. **Question Format** (Best for engagement farming)
   ```
   [Provocative question related to insight]

   Reply with your answer
   ```

   **Example:**
   ```
   How many hours do you spend per week creating meal plans for clients?

   Reply with a number
   ```

4. **Listicle Format** (Best for value)
   ```
   [Number] [Thing] that [Desired Outcome]:

   1. [Item]
   2. [Item]
   3. [Item]
   ...
   ```

   **Example:**
   ```
   5 tools that save trainers 10+ hours per week:

   1. AI meal planner (EvoFitMeals)
   2. Automated scheduling (Calendly)
   3. Client CRM (Trainerize)
   4. Video messaging (Loom)
   5. Form builder (Typeform)

   Your time is worth $75-150/hr

   Stop doing $10/hr work
   ```

**Output format:**
```markdown
## Twitter Content Calendar: [Week of Date]

### Monday (10 tweets)
1. [Tweet #1 - One-liner format]
2. [Tweet #2 - Question format]
...

### Tuesday (10 tweets)
1. [Tweet #1 - Thread starter]
2. [Tweet #2 - Thread continuation]
...

---

**Total:** 70 tweets
**Formats:** 20 one-liners, 10 threads (5 tweets each), 15 questions, 15 listicles, 10 insights
**Tone:** [Zen Master / Unhinged / Controversial / Educational - specify]
```

---

#### LinkedIn Content

**Generate 5-10 LinkedIn posts/week following these formats:**

1. **Story Format** (Best for engagement)
   ```markdown
   [Hook - relatable problem or surprising stat]

   [Story - 3-4 paragraphs, conversational]

   [Lesson - what you learned]

   [Call to Action]

   ---

   **Length:** 150-300 words
   **Line Breaks:** Frequent (mobile-friendly)
   **Hashtags:** 3-5 relevant
   ```

   **Example:**
   ```markdown
   I used to spend 12 hours every week creating meal plans for my clients.

   By Sunday night, I was exhausted. My family complained I never had time for them. And honestly? I was burnt out from copying and pasting the same recipes over and over.

   Then a client asked me: "Why don't you automate this?"

   At first, I resisted. "Meal plans need to be personalized!" I thought. "AI can't do what I do!"

   But I was wrong.

   I tried an AI meal planning tool (EvoFitMeals) and it generated a perfectly personalized plan in 30 seconds. Macros calculated. Allergies accounted for. Grocery list included.

   Now I spend 30 minutes per week on meal planning instead of 12 hours.

   That's 574 hours per year I got back. Time I now spend with my family, growing my business, or just... living.

   If you're a trainer spending hours on meal plans, you're working 40x harder than necessary.

   Technology isn't here to replace you. It's here to give you leverage.

   What tasks are you still doing manually that could be automated?

   ---

   #FitnessTrainers #MealPlanning #AI #Productivity #Entrepreneurship
   ```

2. **Carousel Format** (Best for teaching)
   ```markdown
   **Slide 1 (Cover):**
   [Number] [Thing] that [Outcome]
   [Subtitle or context]

   **Slide 2-9:**
   [Each slide = 1 insight]
   [Headline + 2-3 bullet points]

   **Slide 10 (CTA):**
   [Summary + call to action]

   ---

   **Design:** Use Canva templates (auto-generate via API)
   **Colors:** Brand colors (Purple #9333EA, Green #3CDBB1, Yellow #F5C842)
   ```

---

#### Short Video Scripts

**Generate 5-10 short video scripts/week (30-60 seconds):**

```markdown
## Video Script: [Title]

**Platform:** [TikTok / Instagram Reels / YouTube Shorts]
**Length:** [30 / 60] seconds
**Format:** [Talking head / B-roll / Screen recording]

---

**Hook (0-3 seconds):**
[Attention-grabbing opening - text overlay + voiceover]

**Problem (3-15 seconds):**
[Relatable pain point - show, don't tell]

**Solution (15-45 seconds):**
[How to solve it - specific steps or demo]

**CTA (45-60 seconds):**
[Clear next step - link in bio, comment keyword, etc.]

---

**Visual Direction:**
- [Shot 1: Description]
- [Shot 2: Description]
- [Text Overlay: Key phrases]

**Audio:**
- [Voiceover script]
- [Background music: upbeat / chill / motivational]

**Captions:** Auto-generate (required for most viewers)
```

**Example:**
```markdown
## Video Script: "8 Hours to 30 Minutes"

**Platform:** Instagram Reels
**Length:** 45 seconds
**Format:** Talking head with text overlays

---

**Hook (0-3 seconds):**
TEXT: "I used to spend 8 hours every Sunday..."
VOICEOVER: "...creating meal plans for my clients."

**Problem (3-20 seconds):**
TEXT: "By Sunday night I was exhausted"
VOICEOVER: "My family complained I never had time for them. And I was burnt out from copying and pasting the same recipes over and over."

**Solution (20-40 seconds):**
TEXT: "Then I found AI meal planning"
VOICEOVER: "Now it takes me 30 minutes per week total. The AI handles all the macro calculations, automatically adjusts for allergies, and even generates grocery lists."

**CTA (40-45 seconds):**
TEXT: "Link in bio for free trial"
VOICEOVER: "If you're spending more than an hour on meal planning, check out EvoFitMeals. Link in bio."

---

**Visual Direction:**
- Shot 1: Trainer at computer, stressed (0-20s)
- Shot 2: Trainer on phone showing app, smiling (20-40s)
- Shot 3: CTA screen (40-45s)

**Audio:**
- Voiceover: Conversational, empathetic tone
- Background music: Upbeat, motivational (low volume)

**Captions:** Auto-generate word-by-word
```

---

### Step 3: Social Content Optimization

When user requests performance-based optimization:

1. **Monitor performance daily:**
   - Track impressions, likes, comments, shares, saves (Instagram)
   - Track impressions, likes, retweets, replies (Twitter)
   - Track impressions, reactions, comments, shares (LinkedIn)

2. **Identify top performers:**
   ```markdown
   ## Daily Performance Report: [Date]

   ### Top 3 Tweets (Highest Engagement)
   1. "[Tweet text]" - 12.5K impressions, 450 likes, 78 replies
      - **Why it worked:** [Controversial opinion + question format]
   2. "[Tweet text]" - 9.2K impressions, 320 likes, 45 replies
      - **Why it worked:** [Relatable pain point + specific numbers]
   3. "[Tweet text]" - 7.8K impressions, 280 likes, 32 replies
      - **Why it worked:** [Actionable listicle + CTA]

   ### Bottom 3 Tweets (Lowest Engagement)
   1. "[Tweet text]" - 320 impressions, 8 likes, 0 replies
      - **Why it failed:** [Too promotional / generic / no hook]
   ...

   ### Action Items
   - Create 5 new tweets using format from Top Tweet #1
   - Avoid promotional language (Bottom Tweet #1 pattern)
   - Test: Controversial opinions (seems to be working)
   ```

3. **Use top performers as seeds for new content:**
   - Extract the pattern/format from winning content
   - Generate 10 new variations following the same structure
   - Test different angles on the same theme

4. **Create automated learning loop:**
   ```markdown
   ## Content Feedback Loop

   Step 1: Post 70 tweets/week
   Step 2: Monitor performance (daily)
   Step 3: Identify top 10% (7 tweets)
   Step 4: Analyze winning patterns
   Step 5: Generate next week's content based on winners
   Step 6: Repeat

   ---

   **Result:** Continuous improvement in engagement rates
   **Target:** 2-3% engagement rate (likes + replies / impressions)
   ```

---

## Success Metrics

### Target KPIs
- **Content Output:** 70+ tweets/week, 10+ LinkedIn posts/week, 5+ short videos/week
- **Engagement Rate:** 2-3% (likes + comments / impressions)
- **Follower Growth:** 5-10% MoM
- **Referral Traffic:** 500+ visits/month from social to website

### Health Indicators
- ✅ **Healthy:** Engagement increasing, followers growing, content performing consistently
- ⚠️ **Warning:** Engagement flat, follower growth stagnant, repetitive content
- ❌ **Unhealthy:** Engagement decreasing, losing followers, spam signals

---

## Tools & Resources

### Content Extraction
- Swell AI (podcast transcription + insights)
- Claude API (large context window)
- Descript (transcription + editing)

### Short-Form Generation
- Claude API (with custom prompts)
- Canva API (for LinkedIn carousels)
- Custom content generation scripts

### Performance Monitoring
- Twitter/X Analytics
- LinkedIn Analytics
- Instagram Insights
- Buffer / Hootsuite (scheduling + analytics)

---

## Notes

- This skill is optimized for **high-volume content repurposing**
- Best used in combination with **SEO Optimization** and **Paid Media**
- Requires commitment to **consistent posting** (daily)
- Pillar content should be created **weekly** (1 podcast/interview = 1 week of content)

---

**Created:** January 2025
**For:** FitnessMealPlanner / EvoFitMeals Growth Strategy
**Related Skills:** Paid Media Creative Testing, SEO Optimization, Outreach Automation
