# Social Media Graphics - EvoFitMeals

## Overview
Professional social media graphics for EvoFitMeals lead generation campaign, designed to drive traffic to the landing page and ROI calculator.

## Files Created

### Instagram
- **post-1-template.html** (1080x1080px) - Square post format
- **story-1-template.html** (1080x1920px) - Vertical story format

### LinkedIn
- **post-1-template.html** (1200x627px) - Professional B2B format

### Facebook
- **post-1-template.html** (1200x630px) - General social format

## Design Philosophy

**Aesthetic:** Modern, bold, data-driven
- Uses EvoFitMeals brand colors (Purple #9333EA, Green #3CDBB1, Yellow #F5C842)
- Typography: Space Grotesk (headings) + Crimson Pro (body)
- Focus: Time savings, ROI, professionalism
- Avoids: Generic purple gradients, centered layouts, Inter font

## How to Generate Image Files

These are HTML templates that need to be converted to images. Use one of these methods:

### Method 1: Browser Screenshot (Recommended)
1. Open the HTML file in Chrome or Firefox
2. Press F12 to open DevTools
3. Press Ctrl+Shift+M to toggle device toolbar
4. Set custom dimensions:
   - Instagram post: 1080x1080
   - Instagram story: 1080x1920
   - LinkedIn: 1200x627
   - Facebook: 1200x630
5. Right-click on the canvas area
6. Select "Capture node screenshot"

### Method 2: Playwright/Puppeteer
```javascript
const playwright = require('playwright');

async function screenshot(file, width, height, output) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(`file://${file}`);
  await page.screenshot({ path: output });
  await browser.close();
}

// Generate all graphics
screenshot('instagram/post-1-template.html', 1080, 1080, 'instagram/post-1.png');
screenshot('instagram/story-1-template.html', 1080, 1920, 'instagram/story-1.png');
screenshot('linkedin/post-1-template.html', 1200, 627, 'linkedin/post-1.png');
screenshot('facebook/post-1-template.html', 1200, 630, 'facebook/post-1.png');
```

### Method 3: Online Tools
- Upload HTML to: https://html2canvas.hertzen.com/
- Or use: https://www.browserframe.com/

## Content Themes

### Instagram Post (post-1)
- **Hook:** "64hrs Saved Per Month"
- **Message:** Stop spending weekends on meal plans
- **CTA:** Calculate Yours →
- **Best for:** Awareness, stopping scroll

### Instagram Story (story-1)
- **Hook:** Multiple stats (64hrs, $46K, +6 clients)
- **Message:** Visual data showcase
- **CTA:** Swipe Up to calculate
- **Best for:** Direct response, link clicks

### LinkedIn Post
- **Hook:** "Stop Wasting Weekends on Meal Plans"
- **Message:** Professional, B2B focused
- **CTA:** Calculate Your ROI →
- **Best for:** Fitness professionals, business owners

### Facebook Post
- **Hook:** "Save 64 Hours Every Month"
- **Message:** Broad appeal, value-focused
- **CTA:** Calculate Your ROI →
- **Best for:** General fitness community

## Usage Guidelines

### Posting Frequency
- Instagram: 3-5x per week
- LinkedIn: 2-3x per week
- Facebook: 2-4x per week

### Caption Templates

**Instagram:**
```
🍴 Fitness trainers: How much time do you waste on meal planning?

The average trainer spends 8-10 hours EVERY WEEK creating custom meal plans.

That's 64+ hours per month. 😱

What if AI could do it in minutes?

✅ 80% time reduction
✅ $46K annual savings
✅ Serve 6+ more clients

Calculate your exact ROI (link in bio)

#FitnessTrainer #NutritionCoach #MealPlanning #AIForFitness #FitnessBusinessOwner #OnlineCoach
```

**LinkedIn:**
```
Fitness professionals: Stop trading your weekends for meal plans.

The data is clear:
→ Average trainer spends 64hrs/month on meal planning
→ That's $46,000/year in opportunity cost
→ Manual processes limit your client capacity

EvoFitMeals uses AI to:
• Generate personalized meal plans in seconds
• Free up 64+ hours monthly
• Enable you to serve 6+ additional clients
• Scale your nutrition coaching business

Want to see your exact ROI? Calculate it free:
[Link to ROI calculator]

#FitnessIndustry #NutritionCoaching #BusinessGrowth #AIinFitness
```

**Facebook:**
```
Calling all fitness trainers! 📣

Are you spending entire weekends creating meal plans for your clients?

Here's what the average trainer experiences:
🕐 64 hours per month on meal planning
💰 $46,000 annual opportunity cost
📉 Limited client capacity

But what if AI could handle meal planning in seconds?

With EvoFitMeals:
✅ Save 64+ hours every month
✅ Take on 6+ more clients
✅ Scale your business without burnout

Calculate your exact savings (it's free!):
[Link to landing page]

👇 Comment "ROI" and I'll send you the calculator!
```

## Best Practices

### Hashtags
- **Instagram:** 15-20 hashtags (mix of popular and niche)
- **LinkedIn:** 3-5 hashtags (professional)
- **Facebook:** 1-3 hashtags (minimal)

### Posting Times (EST)
- **Instagram:** 11am-1pm, 7pm-9pm
- **LinkedIn:** 7am-9am, 12pm-1pm, 5pm-6pm
- **Facebook:** 1pm-3pm, 7pm-9pm

### Engagement Strategy
1. Post graphic
2. Engage with comments within first hour
3. Share to Stories (Instagram)
4. Cross-post to relevant groups
5. Track click-through rate to landing page

## Performance Metrics

Track these for each graphic:

- **Impressions:** Total views
- **Engagement Rate:** Likes, comments, shares
- **Click-Through Rate:** Link clicks
- **Saves:** (Instagram) - High intent signal
- **Shares:** Viral indicator
- **Cost Per Click:** If running ads

### Success Benchmarks
- Engagement Rate: 3-5% (organic), 1-2% (paid)
- Click-Through Rate: 0.5-2%
- Cost Per Click: $0.50-$2.00

## A/B Testing Ideas

### Variations to Test
1. **Different numbers:**
   - "64 Hours" vs "$46K Saved" vs "+6 Clients"

2. **Different CTAs:**
   - "Calculate Yours" vs "See Your ROI" vs "Get Started"

3. **Different colors:**
   - Purple focus vs Green focus vs Yellow CTA

4. **Different formats:**
   - Stats-heavy vs Testimonial-focused vs Problem-solution

## Integration with Campaign

These graphics support the overall lead gen funnel:

```
Social Post → Landing Page → ROI Calculator → Email Capture → Sales
```

### Attribution Tracking
Use UTM parameters in links:
```
?utm_source=instagram&utm_medium=social&utm_campaign=roi-calculator&utm_content=post-1
```

## Files Structure
```
graphics/
├── instagram/
│   ├── post-1-template.html
│   ├── story-1-template.html
│   └── [generated PNGs here]
├── linkedin/
│   ├── post-1-template.html
│   └── [generated PNGs here]
├── facebook/
│   ├── post-1-template.html
│   └── [generated PNGs here]
└── README.md (this file)
```

---

**Created:** January 15, 2025
**Version:** 1.0.0
**Status:** ✅ Templates Complete | ⏳ PNG Generation Pending
