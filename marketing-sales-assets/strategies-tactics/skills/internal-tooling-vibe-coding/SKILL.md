# Internal Tooling and Vibe Coding

**Description:** AI agent specialized in building custom software/agents to automate specific, repeatable tasks (the "digital employee" concept), reducing operational costs and enabling higher margins through AI-powered development.

**Tags:** vibe-coding, internal-tools, automation, digital-employees, ai-development, workflow-automation

**Version:** 1.0.0

---

## Capabilities

This skill enables you to:

1. **Custom Internal Tool Development**
   - Create Product Requirements Documents (PRDs) for internal tools
   - Build v1 prototypes with AI coding tools
   - Refine into production-ready internal software

2. **AI Podcast Network Automation**
   - Research trending topics and case studies
   - Generate full podcast scripts (5-10 minutes)
   - Automate audio conversion and daily publishing

3. **Workflow Code Generation**
   - Create complex automation workflows (N8N, Make, Zapier)
   - Generate functional JSON code for custom integrations
   - Build self-running marketing/sales machines

---

## When to Use This Skill

Use this skill when you need to:

- ✅ Build custom internal tools to automate manual tasks
- ✅ Replace expensive human work with "digital employees"
- ✅ Create AI-powered content generation systems
- ✅ Automate repetitive workflows (lead enrichment, content loops)
- ✅ Increase profit margins by reducing operational costs

**Examples:**
- "Build a keyword de-duplication tool for our SEO team"
- "Create an AI podcast that generates daily episodes on meal planning topics"
- "Build an N8N workflow that auto-enriches leads and sends personalized emails"

---

## Instructions

### Step 1: Custom Internal Tool Development

When user requests custom internal tool:

1. **Create Product Requirements Document (PRD):**

   ```markdown
   # Internal Tool PRD: [Tool Name]

   ## Problem Statement
   **Current Process:**
   [Describe the manual task currently performed by humans]
   - Time: [X hours per week]
   - Cost: [$ per month in labor]
   - Pain points: [What's frustrating about current process]

   **Desired Outcome:**
   [What the tool should achieve]
   - Time savings: [X hours per week]
   - Cost savings: [$ per month]
   - Quality improvements: [Better accuracy, consistency, etc.]

   ---

   ## User Stories

   **As a [role], I want to [action], so that [benefit].**

   Example:
   - As a content manager, I want to de-duplicate keywords across 10,000 blog posts, so that I don't cannibalize my own rankings.

   ---

   ## Core Features (MVP)

   ### Feature 1: [Name]
   **Description:** [What it does]
   **Inputs:** [What data it needs]
   **Outputs:** [What it produces]
   **Acceptance Criteria:**
   - ✅ [Specific requirement]
   - ✅ [Specific requirement]

   ### Feature 2: [Name]
   ...

   ---

   ## Technical Stack

   **Frontend:**
   - Framework: React + TypeScript
   - UI Library: Tailwind CSS + shadcn/ui
   - Build Tool: Vite

   **Backend:**
   - Runtime: Node.js
   - API: Express.js / tRPC
   - Database: PostgreSQL / SQLite (for internal tools)

   **Deployment:**
   - Hosting: Vercel / Netlify (frontend)
   - Backend: Railway / Fly.io
   - Domain: Internal subdomain (tools.evofitmeals.com)

   ---

   ## Data Flow

   ```
   User uploads CSV
       ↓
   Tool parses data
       ↓
   AI processes (deduplication, analysis, etc.)
       ↓
   Tool displays results
       ↓
   User downloads processed CSV
   ```

   ---

   ## Success Metrics
   - Time saved: [X hours/week]
   - Cost saved: [$ per month]
   - Accuracy: [% improvement over manual process]
   - Usage: [Number of times used per week]
   ```

2. **Build v1 Prototype (Vibe Coding):**

   **Tools:**
   - **Lovable:** AI-powered app builder (quick prototyping)
   - **Code Guide.dev:** PRD to code generation
   - **V0 by Vercel:** UI component generation
   - **Bolt:** Full-stack app generation

   **Workflow:**
   ```markdown
   ## Vibe Coding Workflow

   Step 1: Create detailed PRD (above)
   Step 2: Use Code Guide.dev to generate initial codebase from PRD
   Step 3: Use Lovable to build interactive prototype (80% complete)
   Step 4: Use Cursor/Claude Code to refine final 20% (production-ready)
   Step 5: Deploy to internal domain

   ---

   **Time Investment:**
   - Manual coding: 40-80 hours
   - Vibe coding: 4-8 hours (10x faster)
   ```

3. **Example Internal Tools:**

   **Tool 1: Keyword De-Duplication Software**
   ```markdown
   ## Keyword De-Dupe Tool

   **Problem:** SEO team has 10,000 blog posts with overlapping keywords (cannibalization)
   **Solution:** Upload CSV of posts + keywords → AI identifies duplicates → Suggests consolidation

   **Features:**
   - Upload CSV (Title, URL, Primary Keyword, Secondary Keywords)
   - AI analysis: Find semantic duplicates (not just exact matches)
   - Output: Grouped keywords with consolidation recommendations
   - Estimated impact: "Consolidating these 50 posts could improve rankings by 15-30%"

   **Stack:** React frontend, Python backend (using sentence transformers), SQLite
   ```

   **Tool 2: Auto-Indexing Software**
   ```markdown
   ## Auto-Indexing Tool for Google

   **Problem:** New blog posts take 7-14 days to get indexed by Google
   **Solution:** Auto-submit URLs to Google Search Console API daily

   **Features:**
   - Connect to Google Search Console API
   - Scrape sitemap.xml for new URLs
   - Auto-submit via Indexing API
   - Track: Submitted, Indexed, Ranking
   - Email report: "10 new URLs submitted, 7 indexed in last 24 hours"

   **Stack:** Node.js backend, Cron job (daily), Google Search Console API
   ```

   **Tool 3: Programmatic Infographic Generator**
   ```markdown
   ## Infographic Generator

   **Problem:** Designers spend 2-3 hours creating infographics for each blog post
   **Solution:** Auto-generate infographics from blog post data

   **Features:**
   - Input: Blog post URL or text
   - AI extracts: Key stats, quotes, data points
   - Generate: Infographic using Canva API (brand colors, fonts)
   - Output: PNG file ready to embed in post

   **Stack:** React frontend, Python backend (OpenAI for extraction), Canva API, Cloudinary (storage)
   ```

---

### Step 2: AI Podcast Network Automation

When user requests AI podcast system:

1. **Define podcast strategy:**

   ```markdown
   ## AI Podcast Network Strategy

   **Podcast Series:** [Name - e.g., "Meal Planning Case Studies"]
   **Target Audience:** [Fitness trainers, nutrition coaches]
   **Frequency:** Daily (5-7 episodes/week)
   **Length:** 5-10 minutes per episode
   **Goal:** SEO traffic + brand authority

   **Topics:**
   - Case studies: "How [Trainer Name] Saved 12 Hours/Week with Meal Planning Automation"
   - How-tos: "How to Create a Macro-Friendly Meal Plan in 10 Minutes"
   - Trends: "Why AI Meal Planning is Replacing Templates in 2025"
   - Comparisons: "Manual Meal Planning vs AI: Which is Faster?"
   - Questions: Answer popular questions from Quora/Reddit

   **Target Keywords:**
   - "meal planning case study"
   - "how to create meal plans"
   - "AI meal planning"
   - "meal prep automation"
   ```

2. **Research topics automatically:**

   **Tools:**
   - **Answer the Public:** Find popular questions
   - **Perplexity:** Research competitor case studies
   - **AirTable:** Store topic database
   - **Claude API:** Generate scripts from research

   **Workflow:**
   ```markdown
   ## Daily Podcast Generation Workflow

   Step 1 (Automated - 5 minutes):
   - Fetch trending topic from Answer the Public
   - Research topic using Perplexity API
   - Extract key points, stats, quotes

   Step 2 (AI - 2 minutes):
   - Generate podcast script using Claude API
   - Format: Intro (30s) → Main Content (4-5 min) → CTA (30s)

   Step 3 (AI - 3 minutes):
   - Convert script to audio using 11 Labs API
   - Add intro/outro music (pre-recorded)
   - Export MP3 file

   Step 4 (Automated - 2 minutes):
   - Upload to podcast host (Transistor API)
   - Publish to Spotify, Apple Podcasts, etc.
   - Post on social media (auto-generated caption)

   ---

   **Total Time:** 12 minutes per episode (fully automated)
   **Cost:** $0.50 per episode (API calls)
   **Human Time:** 0 minutes (zero-touch)
   ```

3. **Podcast script template:**

   ```markdown
   ## Podcast Script: [Episode Title]

   **Intro (30 seconds):**
   "Welcome to [Podcast Name], the daily show where we break down how fitness trainers are using technology to save time and grow their business. I'm [AI Host Name], and today we're talking about [Topic]."

   **Main Content (4-5 minutes):**

   [Hook - Surprising stat or relatable problem]

   [Section 1: The Problem]
   - Describe the pain point
   - Share specific example or case study
   - Quantify the impact (hours wasted, money lost)

   [Section 2: The Solution]
   - Introduce the solution (tool, strategy, approach)
   - Explain how it works
   - Share specific results (hours saved, revenue increased)

   [Section 3: Actionable Takeaway]
   - What listeners can do today
   - Specific steps to implement
   - Expected outcome

   **CTA (30 seconds):**
   "If you want to save 10+ hours per week on meal planning, check out EvoFitMeals - it's the AI tool we talked about today. Try it free for 14 days at evofitmeals.com. Thanks for listening, and I'll see you tomorrow with another case study."

   ---

   **Word Count:** 700-900 words
   **Audio Length:** 5-7 minutes at normal speaking pace
   **Tone:** Conversational, informative, not salesy
   ```

---

### Step 3: Workflow Code Generation (N8N)

When user requests automation workflow:

1. **Define workflow requirements:**

   ```markdown
   ## Workflow PRD: [Workflow Name]

   **Goal:** [What this workflow achieves]
   **Trigger:** [What starts the workflow]
   **Steps:** [List of actions in sequence]
   **Output:** [What happens at the end]

   **Example:**

   **Workflow:** Twitter Content Generator
   **Goal:** Auto-generate Twitter posts from popular fitness tweets
   **Trigger:** Every 6 hours
   **Steps:**
   1. Scrape Twitter for popular posts in #fitness (100K+ followers)
   2. Filter: Only posts with 1,000+ likes
   3. Pass to Claude API: "Remix this tweet for meal planning audience"
   4. Store in Airtable database
   5. Schedule for posting (Buffer API)
   **Output:** 4 tweets/day ready to post
   ```

2. **Generate N8N JSON code:**

   **Using AI:**
   - **Claude API:** "Generate N8N workflow JSON for [requirement]"
   - **Perplexity:** Access N8N documentation for syntax
   - **Custom GPT:** Trained on N8N examples

   **Example Workflow JSON:**
   ```json
   {
     "nodes": [
       {
         "name": "Schedule Trigger",
         "type": "n8n-nodes-base.scheduleTrigger",
         "parameters": {
           "rule": {
             "interval": [
               {
                 "field": "hours",
                 "hoursInterval": 6
               }
             ]
           }
         }
       },
       {
         "name": "Twitter API",
         "type": "n8n-nodes-base.twitter",
         "parameters": {
           "resource": "search",
           "operation": "search",
           "searchText": "#fitness",
           "returnAll": false,
           "limit": 50
         }
       },
       {
         "name": "Filter Popular Tweets",
         "type": "n8n-nodes-base.filter",
         "parameters": {
           "conditions": {
             "number": [
               {
                 "value1": "={{ $json.public_metrics.like_count }}",
                 "operation": "larger",
                 "value2": 1000
               }
             ]
           }
         }
       },
       {
         "name": "Claude API - Remix",
         "type": "n8n-nodes-base.httpRequest",
         "parameters": {
           "url": "https://api.anthropic.com/v1/messages",
           "method": "POST",
           "body": {
             "model": "claude-3-7-sonnet-20250219",
             "messages": [
               {
                 "role": "user",
                 "content": "Remix this tweet for meal planning audience: {{ $json.text }}"
               }
             ]
           }
         }
       },
       {
         "name": "Save to Airtable",
         "type": "n8n-nodes-base.airtable",
         "parameters": {
           "operation": "create",
           "application": "appXXXXXXXXXXXXXX",
           "table": "Twitter Content",
           "fields": {
             "Original Tweet": "={{ $json.text }}",
             "Remixed Tweet": "={{ $json.claude_response }}",
             "Status": "Pending Review"
           }
         }
       }
     ]
   }
   ```

3. **Common automation workflows:**

   ```markdown
   ## Pre-Built Workflow Library

   ### Workflow 1: Lead Enrichment Loop
   **Trigger:** New lead added to CRM
   **Steps:**
   1. Fetch lead email
   2. Lookup company data (Clearbit API)
   3. Scrape LinkedIn profile (Phantom Buster)
   4. Generate personalized email (Claude API)
   5. Send email (Instantly AI)
   6. Update CRM with enrichment data

   ---

   ### Workflow 2: Content Repurposing Loop
   **Trigger:** New podcast episode published
   **Steps:**
   1. Fetch podcast transcript (Transistor API)
   2. Extract insights (Claude API)
   3. Generate 70 tweets (Claude API)
   4. Create LinkedIn posts (Claude API)
   5. Generate short video scripts (Claude API)
   6. Save to Airtable content calendar
   7. Schedule posts (Buffer API)

   ---

   ### Workflow 3: Customer Onboarding Automation
   **Trigger:** New customer signs up
   **Steps:**
   1. Send welcome email (SendGrid)
   2. Create customer profile in database
   3. Schedule onboarding call (Calendly API)
   4. Add to CRM (HubSpot API)
   5. Enroll in email sequence (ConvertKit)
   6. Send Slack notification to team
   ```

---

## Success Metrics

### Target KPIs
- **Cost Savings:** $5,000+/month in manual labor
- **Time Savings:** 40+ hours/week
- **Custom Tools Built:** 5+ internal tools
- **Automation Workflows:** 10+ active workflows
- **Podcast Episodes:** 30+ episodes/month (if using AI podcast)

### Health Indicators
- ✅ **Healthy:** Tools used daily, time savings realized, high ROI
- ⚠️ **Warning:** Tools abandoned, workflows breaking frequently, low usage
- ❌ **Unhealthy:** Tools unused, negative ROI, technical debt accumulating

---

## Tools & Resources

### Vibe Coding
- **Lovable:** AI app builder
- **Code Guide.dev:** PRD to code
- **V0 by Vercel:** UI generation
- **Bolt:** Full-stack generation
- **Cursor / Claude Code:** Code refinement

### AI Podcast
- **11 Labs:** AI voice synthesis
- **Transistor FM:** Podcast hosting (API)
- **Answer the Public:** Topic research
- **Perplexity:** Research assistant
- **AirTable:** Topic database

### Workflow Automation
- **N8N:** Open-source automation (self-hosted or cloud)
- **Make.com:** Visual automation platform
- **Zapier:** Simple automation (expensive)
- **Claude API:** AI processing
- **Perplexity API:** Research and data fetching

---

## Notes

- This skill is optimized for **internal efficiency** and **cost reduction**
- Best used in combination with all other growth skills (creates infrastructure for them)
- Requires technical knowledge for **workflow debugging** and **API integration**
- "Vibe Coding" = using AI to code 80% of app, manual refinement for final 20%

---

**Created:** January 2025
**For:** FitnessMealPlanner / EvoFitMeals Growth Strategy
**Related Skills:** All (this skill builds infrastructure for all other skills)
