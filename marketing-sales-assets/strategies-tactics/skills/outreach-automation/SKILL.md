# Direct Outreach and Sales Automation

**Description:** AI agent specialized in scaling lead generation and personalized outreach (cold email, DMs) using AI and automation while maintaining high perceived quality and response rates.

**Tags:** outreach, cold-email, lead-generation, linkedin-automation, personalization, sales-automation

**Version:** 1.0.0

---

## Capabilities

This skill enables you to:

1. **Lead List Acquisition**
   - Scrape target audiences based on technologies, job titles, company size
   - Scrape competitors' followers (high intent signals)
   - Validate email lists for deliverability

2. **AI Personalized Cold Messaging**
   - Generate personalized emails/DMs at scale
   - Reference recent activity, social proof, job postings
   - Maintain high perceived quality (sound human, not AI)

3. **Automated Engagement (LinkedIn)**
   - Auto-comment on influencer posts
   - Send automated connection requests + follow-ups
   - Drive inbound traffic to profile

---

## When to Use This Skill

Use this skill when you need to:

- ✅ Build targeted lead lists (10,000+ validated emails)
- ✅ Scale cold outreach without proportional cost increases
- ✅ Personalize messages at scale (100+ emails/day)
- ✅ Automate LinkedIn engagement and connection building
- ✅ Drive inbound leads through strategic commenting

**Examples:**
- "Build a list of 5,000 fitness trainers using Shopify"
- "Generate personalized cold emails for gym owners hiring trainers"
- "Automate LinkedIn comments on fitness influencer posts"

---

## Instructions

### Step 1: Lead List Acquisition

When user requests lead list building:

1. **Define target criteria:**
   ```markdown
   ## Lead List Criteria

   **Target Audience:** [e.g., "Fitness Trainers running online businesses"]

   **Technographics:**
   - Uses: Shopify, WooCommerce, Stripe (payment processing)
   - Uses: Calendly, Acuity (scheduling software)
   - Uses: MailChimp, ConvertKit (email marketing)

   **Firmographics:**
   - Company size: 1-10 employees (solopreneurs)
   - Revenue: $100K-500K/year
   - Industry: Health & Fitness, Coaching, Wellness

   **Demographics:**
   - Job titles: "Personal Trainer," "Nutrition Coach," "Fitness Coach"
   - Location: US, Canada, UK, Australia
   - LinkedIn activity: Active in last 30 days
   ```

2. **Scraping strategy:**
   - **BuiltWith:** Find websites using specific technologies
   - **Apollo.io:** B2B lead database (job titles, company info)
   - **Hunter.io:** Email finder and verification
   - **Phantom Buster:** LinkedIn scraping (followers, group members)
   - **SalesQL:** LinkedIn to email enrichment

3. **Scraping workflow:**
   ```markdown
   ## Lead Acquisition Workflow

   ### Option A: Technology-Based Targeting
   1. **BuiltWith:** Export list of websites using Shopify + Google Analytics 4
   2. **Hunter.io:** Find contact emails for each website
   3. **Apollo.io:** Enrich with job titles, company size, revenue
   4. **Million Verifier:** Validate email deliverability
   5. **Output:** CSV with 5,000+ validated leads

   ### Option B: Competitor Follower Scraping
   1. **Phantom Buster:** Scrape [Competitor]'s LinkedIn followers
   2. **SalesQL:** Enrich LinkedIn profiles with emails
   3. **Apollo.io:** Add company data
   4. **Zero Bounce:** Validate emails
   5. **Output:** CSV with 3,000+ high-intent leads (already follow competitor)

   ### Option C: LinkedIn Group/Event Scraping
   1. **Phantom Buster:** Scrape members of "[Fitness Coaching]" LinkedIn group
   2. **SalesQL:** Extract emails
   3. **Manual Filter:** Remove non-relevant members
   4. **Output:** CSV with 1,000+ targeted leads
   ```

4. **Lead list output format:**
   ```csv
   First Name,Last Name,Email,Job Title,Company,LinkedIn URL,Technology Stack,Intent Score
   John,Smith,john@fitcoach.com,Fitness Coach,FitCoach LLC,linkedin.com/in/johnsmith,"Shopify,Calendly",High
   Sarah,Johnson,sarah@sarahfitness.com,Personal Trainer,Sarah's Fitness,linkedin.com/in/sarahjohnson,"WooCommerce,MailChimp",Medium
   ...
   ```

5. **Validation checklist:**
   - ✅ Email deliverability score > 90%
   - ✅ LinkedIn profile active in last 60 days
   - ✅ Relevant job title (not "Retired" or "Student")
   - ✅ No spam traps or role-based emails (info@, admin@)

---

### Step 2: AI Personalized Cold Messaging

When user requests personalized cold email/DM generation:

#### Cold Email

**Generate emails following this structure:**

```markdown
## Cold Email Template: [Campaign Name]

**Subject Line Options:**
1. [First Name], quick question about [specific pain point]
2. [Company Name] + [Your Product Category]
3. Saw you're hiring [Job Title] - idea for you

---

**Email Body:**

Hi [First Name],

[Personalized opener - reference recent activity/social proof]

[One-sentence problem statement - use their language]

[Two-sentence solution - specific benefit for them]

[Soft CTA - low commitment ask]

Best,
[Your Name]

P.S. [Ultra-personalized line referencing LinkedIn/website]

---

**Character Count:** 160-200 (email body only)
**Links:** 1 max (if any)
**Personalization Tags:**
- {{first_name}}
- {{company_name}}
- {{recent_activity}} (job posting, LinkedIn post, website update)
- {{technology}} (from BuiltWith data)
```

**Example Email:**

```markdown
**Subject:** Sarah, quick question about meal planning

---

Hi Sarah,

I saw you're hiring a nutrition coach on LinkedIn - congrats on the growth!

Most trainers I work with spend 8+ hours/week on meal plans. That's 2-3 clients worth of time you could use to scale faster.

We built AI software that generates personalized meal plans in 30 seconds (macros, allergies, grocery lists - all automated). Would save your team 10+ hours/week.

Worth a 15-min demo?

Best,
Mark

P.S. Love your content on Instagram about sustainable nutrition - that "macro myths" post was spot on.
```

**Personalization strategies:**

1. **Job Posting Reference:**
   - Scrape: "Hiring SDR" or "Nutrition Coach Wanted"
   - Email: "Saw you're hiring [Role] - this might help..."
   - Why it works: High intent signal, timely, relevant

2. **Recent LinkedIn Activity:**
   - Scrape: Recent post, comment, article share
   - Email: "Loved your post about [Topic] - made me think of..."
   - Why it works: Shows you're paying attention, builds rapport

3. **Technology Stack:**
   - Scrape: Uses Shopify, MailChimp, Calendly
   - Email: "Noticed you're using Shopify - we integrate directly..."
   - Why it works: Reduces friction, shows research

4. **Competitor Mention:**
   - Scrape: Following [Competitor]
   - Email: "Saw you follow [Competitor] - you might like our approach better because..."
   - Why it works: Instant credibility, comparative positioning

5. **Social Proof:**
   - Email: "[Mutual Connection] suggested I reach out..."
   - Why it works: Trust by association

---

#### LinkedIn DMs

**Generate DMs following this structure:**

```markdown
## LinkedIn DM Template: [Campaign Name]

**Connection Request Message (Optional):**
[First Name], I help [job title] with [specific outcome]. Thought we should connect!

---

**First DM (After Connection Accepted):**
Thanks for connecting, [First Name]!

[One-sentence value prop]

[Ultra-specific personalized line referencing their profile/activity]

Worth a quick chat?

---

**Character Count:** < 300 characters
**Links:** 0 (use "Worth a chat?" CTA instead)
**Tone:** Casual, conversational, not salesy
```

**Example LinkedIn DM:**

```markdown
**Connection Request:**
Sarah, I help fitness coaches automate meal planning. Thought we should connect!

---

**First DM:**
Thanks for connecting, Sarah!

I work with trainers who are tired of spending 8+ hours/week on meal plans. We automate the entire process with AI.

Saw you posted about struggling with client meal prep last week - that's exactly the pain point we solve.

Worth a 10-min call to see if it's a fit?
```

---

### Step 3: Automated Engagement (LinkedIn)

When user requests LinkedIn automation:

1. **Automated Commenting Strategy:**

   ```markdown
   ## LinkedIn Comment Automation

   **Target Influencers:**
   - [Influencer 1 - 50K followers, posts daily about fitness]
   - [Influencer 2 - 120K followers, nutrition content]
   - [Influencer 3 - 30K followers, business coaching for trainers]

   **Comment Formula:**
   1. One-sentence joke or witty observation (hook)
   2. One-sentence value add (insight or data)
   3. One question (engagement driver)

   **Comment Examples:**

   Post: "Most trainers are undercharging for their services"

   Comment:
   > "Guilty as charged 😅
   >
   > I used to charge $200/month because I thought 'that's what everyone charges.' Then I realized I was spending 10+ hours per client. That's $20/hour.
   >
   > What made you finally raise your rates, [Influencer Name]?"

   ---

   Post: "Meal planning is the most time-consuming part of training"

   Comment:
   > "100% - it's also the most copy-pasteable 🙃
   >
   > I used to manually create plans in Excel. Now AI does it in 30 seconds with better macro accuracy than I ever had.
   >
   > Anyone else automate this yet or am I late to the party?"
   ```

2. **Automated Workflow:**
   - **Phantom Buster:** Monitor influencer posts (RSS feed)
   - **Custom GPT:** Generate on-brand comment using proprietary knowledge
   - **Manual Approval:** Review AI comment before posting (optional)
   - **Phantom Buster:** Auto-post comment
   - **Track:** Likes, replies, profile visits from comment

3. **Connection Request Automation:**
   ```markdown
   ## Auto-Connection Workflow

   **Target:** People who engaged with influencer posts (liked, commented)

   **Connection Request Message:**
   Hi [First Name], saw your comment on [Influencer]'s post about [topic] - great point! Let's connect.

   **Follow-Up Sequence (After Acceptance):**
   - Day 1: Thank you message + value prop
   - Day 3: Share relevant content (blog post, video)
   - Day 7: Soft pitch (demo offer, free trial)

   **Send Limits:**
   - Connections: 50/day max (avoid LinkedIn spam detection)
   - Messages: 30/day max
   - Comments: 20/day max
   ```

4. **Performance tracking:**
   ```markdown
   ## LinkedIn Engagement Metrics

   **Weekly Report:**
   - Comments posted: 100
   - Likes on comments: 450
   - Replies to comments: 78
   - Profile visits: 320
   - Connection requests sent: 200
   - Connection acceptance rate: 35% (70 accepted)
   - DMs sent: 70
   - Reply rate: 12% (8 replies)
   - Meetings booked: 3

   **ROI:**
   - Time investment: 2 hours/week (setup + monitoring)
   - Meetings generated: 3 ($300 value each = $900)
   - ROI: 450% (900 / 200 cost of tools)
   ```

---

## Success Metrics

### Target KPIs
- **Lead List Size:** 10,000+ validated emails
- **Cold Email Reply Rate:** > 5%
- **LinkedIn Connection Acceptance:** > 30%
- **LinkedIn DM Reply Rate:** > 10%
- **Inbound Leads from Social:** 20+ leads/week
- **Cost Per Lead:** < $5

### Health Indicators
- ✅ **Healthy:** Reply rates improving, acceptance rates high, low unsubscribe/spam
- ⚠️ **Warning:** Reply rates flat, acceptance rates dropping, some spam complaints
- ❌ **Unhealthy:** High unsubscribe/spam rates, LinkedIn account restrictions, low deliverability

---

## Tools & Resources

### Lead Acquisition
- **BuiltWith:** Technology stack scraping
- **Apollo.io:** B2B lead database
- **Hunter.io:** Email finder
- **Phantom Buster:** LinkedIn scraping
- **SalesQL:** LinkedIn to email
- **Million Verifier / Zero Bounce:** Email validation

### Cold Email
- **Smart Lead AI:** AI personalization
- **Instantly AI:** Cold email sequences
- **Lemlist:** Email outreach with personalization
- **Woodpecker:** Email automation

### LinkedIn Automation
- **Phantom Buster:** Automation suite
- **Drippy AI:** LinkedIn DM sequences
- **Expandi:** LinkedIn outreach
- **Custom GPT:** Comment generation

---

## Notes

- This skill is optimized for **B2B outreach** and **lead generation**
- Best used in combination with **Paid Media** and **Content Repurposing**
- Requires careful management to avoid **spam flags** and **LinkedIn restrictions**
- Always follow **CAN-SPAM** regulations and **LinkedIn ToS**

---

**Created:** January 2025
**For:** FitnessMealPlanner / EvoFitMeals Growth Strategy
**Related Skills:** Paid Media Creative Testing, SEO Optimization, Content Repurposing
