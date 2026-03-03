# EvoFit Meals - BCI Projects Page Panel
**Created:** 2026-03-03
**For:** https://bci-labs-website.vercel.app/projects

---

## Contents

| File | Purpose |
|------|---------|
| `evofitmeals-panel.html` | Drop-in HTML replacement for the EvoFitMeals panel on the BCI projects page. Copy this into the BCI website codebase. |
| `evofitmeals-panel-preview.html` | Standalone preview page (open in browser to see how the panel looks) |
| `evofitmeals-meal-plan-generator.png` | **PRIMARY screenshot** - Trainer AI Meal Plan Generator view (shows NLP input, tier system, 4000+ recipes) |
| `evofitmeals-admin-dashboard.png` | **SECONDARY screenshot** - Admin Dashboard with recipe library (overlaid in corner) |
| `panel-preview-screenshot.png` | Screenshot of the rendered preview for reference |
| `current-bci-evofitmeals-panel.png` | Screenshot of the CURRENT BCI page (before update) for comparison |

---

## How to Deploy

### 1. Upload Screenshots
Copy to the BCI website's public assets:
```
evofitmeals-meal-plan-generator.png -> /images/projects/evofit/meal-plan-generator.png
evofitmeals-admin-dashboard.png     -> /images/projects/evofit/admin-dashboard.png
```

### 2. Replace Panel HTML
In the BCI website source, find the EvoFitMeals project section and replace it with the contents of `evofitmeals-panel.html`.

### 3. Verify
- Confirm screenshots load at correct paths
- Check responsive layout on mobile
- Verify "View Live Site" link goes to https://evofitmeals.com

---

## What Changed from Current Panel

| Element | Before | After |
|---------|--------|-------|
| **Recipe count** | 100+ | 4,000+ AI-generated |
| **Lead feature** | Generic AI generation | NLP meal plan generation ("describe in plain English") |
| **Dietary protocols** | Not mentioned | 8+ protocols (keto, vegan, paleo, halal, etc.) |
| **Shareable links** | Not mentioned | Token-based shareable meal plan links |
| **Branding** | Not mentioned | Custom branding, white-label (Enterprise) |
| **Grocery lists** | Not mentioned | Auto-generated grocery lists |
| **Tech stack** | 6 items | 9 items (added Express, Drizzle ORM, Stripe) |
| **Metrics** | 1,510+ Tests | 4,000+ Recipes (more impressive) |
| **Screenshot** | Admin grid only | Dual: AI Generator (main) + Admin Dashboard (overlay) |
| **Student quote** | Generic | Specific: "AI-powered SaaS with real users and revenue" |
| **Description** | Brief | Detailed: GPT-4, NLP, branded PDFs, one-time payment model |
