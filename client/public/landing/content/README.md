# Landing Page Content Management Guide

## 📝 How to Edit Landing Page Content

All landing page content is stored in markdown files in this directory. You can edit these files directly to update the website content without touching any HTML code.

## 📂 Content Files

Each file corresponds to a specific section of the landing page:

| File | Section | Description |
|------|---------|-------------|
| `hero.md` | Hero Section | Main headline, subheadline, and CTAs |
| `stats.md` | Statistics Bar | Key metrics (users, recipes, etc.) |
| `problem.md` | Problem Section | Pain points you solve |
| `solution.md` | Solution Section | Your AI-powered solution |
| `features.md` | Features Grid | 6 main features with descriptions |
| `testimonials.md` | Testimonials | Customer success stories |
| `pricing.md` | Pricing Plans | Three pricing tiers |
| `faq.md` | FAQ Section | Common questions and answers |
| `cta.md` | Call to Action | Final conversion section |
| `footer.md` | Footer | Links and company info |

## ✏️ Editing Instructions

### Basic Format

Each markdown file follows a hierarchical structure:

```markdown
# Section Name

## Subsection
Content here

### Property
Value
```

### Example: Editing the Hero Section

Open `hero.md` and modify the content:

```markdown
# Hero Section

## Headline
Your New Headline Here
Goes On Multiple Lines

## Subheadline
Your new subheadline text describing the value proposition.

## Primary Button
Get Started Today
```

### Example: Adding a New Testimonial

Open `testimonials.md` and add a new testimonial:

```markdown
## Testimonial 4
### Quote
This platform transformed my business completely!
### Name
John Smith
### Title
Fitness Coach
### Rating
5
```

### Example: Updating Pricing

Open `pricing.md` and modify prices:

```markdown
## Plan 1 - Starter
### Price
$39
### Period
/month
### Features
- Up to 15 clients
- 150 recipes/month
- etc...
```

## 🔄 How Changes Are Applied

### Development Mode
1. Edit any markdown file in this directory
2. Save the file
3. Refresh your browser - the content loader will automatically fetch the updated content

### Production Mode
1. Edit markdown files
2. Commit changes to git
3. Deploy to production
4. Changes will be live immediately

## 📋 Content Guidelines

### Headlines
- Keep headlines concise and impactful
- Use action-oriented language
- Focus on benefits, not features

### Statistics
- Use real, verifiable numbers
- Update regularly to maintain accuracy
- Include units (%, hrs, etc.)

### Testimonials
- Use real customer feedback
- Include full names and titles
- Keep quotes concise and specific

### Pricing
- Be transparent about what's included
- Highlight the most popular plan
- Keep feature lists scannable

### FAQs
- Answer real customer questions
- Keep answers concise but complete
- Update based on customer feedback

## 🎨 Formatting Tips

### Lists
Use `-` for bullet points:
```markdown
### Features
- Feature one
- Feature two
- Feature three
```

### Multi-line Content
Just continue on the next line:
```markdown
### Description
This is a long description that
spans multiple lines and will be
properly formatted on the website.
```

### Special Characters
- Use straight quotes: " not curly quotes: ""
- Use standard apostrophes: ' not '
- Emojis are supported: 🚀 ✅ 💪

## 🚀 Quick Start

1. **To change the main headline:**
   - Edit `hero.md`
   - Find `## Headline`
   - Update the text below it

2. **To update pricing:**
   - Edit `pricing.md`
   - Find the plan you want to update
   - Change the price and features

3. **To add a FAQ:**
   - Edit `faq.md`
   - Add a new FAQ section with incrementing number
   - Include both Question and Answer

## 📱 Testing Your Changes

1. Make your edits
2. Save the markdown file
3. Open http://localhost:4000/landing/index.html
4. Refresh the page (Ctrl+F5 for hard refresh)
5. Your changes should appear immediately

## ⚠️ Important Notes

- **Don't change the structure** - Keep the #, ##, ### hierarchy
- **Don't delete sections** - If you don't want something, leave it blank
- **Test before deploying** - Always check your changes locally first
- **Keep backups** - Save original content before major changes

## 🆘 Troubleshooting

### Changes not appearing?
1. Hard refresh the browser (Ctrl+F5)
2. Check browser console for errors
3. Ensure markdown syntax is correct
4. Verify file was saved

### Content looks broken?
1. Check for unclosed quotes or brackets
2. Ensure proper markdown hierarchy
3. Look for special characters that need escaping
4. Revert to backup if needed

## 📞 Need Help?

If you need assistance with content updates:
1. Check this guide first
2. Review the example markdown files
3. Test changes locally before production
4. Contact support if issues persist

---

## Example: Complete Hero Section

```markdown
# Hero Section

## Badge
🚀 Used by 10,000+ Fitness Professionals

## Headline
Scale Your Nutrition Business
with AI-Powered Meal Planning

## Subheadline
Generate 500+ personalized recipes in 60 seconds. Save 20+ hours per week while managing 3X more clients.

## Primary Button
Start Your Free 14-Day Trial

## Secondary Button
Watch 2-Min Demo

## Bottom Text
No credit card required • Setup in 60 seconds
```

This structure makes it easy to update any part of the landing page content without technical knowledge!