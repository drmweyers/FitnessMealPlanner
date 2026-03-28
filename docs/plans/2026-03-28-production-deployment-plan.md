# Production Deployment + Enhancement Plan
**Date:** 2026-03-28
**Status:** EXECUTING

## 8 Parallel Workstreams

### 1. Deploy to Production
- Push to main → DigitalOcean auto-deploys
- Includes: 6 funnel pages, auth fix, zod fix, pricing updates

### 2. Lead Magnet PDF (12-page Blueprint)
- Generate with nano-banana images + HTML→PDF
- Save to client/public/downloads/

### 3. Tripwire OTO (50 Meal Plan Templates)
- Generate 50 JSON meal plans (8 dietary protocols × 6 + 2 bonus)
- Build upload/import API endpoint
- Save as downloadable bundle

### 4. Redesign PDF Export Template
- Rebuild pdfTemplate.ejs to match premium dark brand
- Use Clash Display font, purple/orange accents
- Generate sample PDF for verification

### 5. Rebrand Registration Page
- Match funnel dark premium aesthetic
- Add value propositions and trust elements

### 6. PWA Support
- Copy from EvoFitTrainer: manifest, SW, install prompt
- Adapt for EvoFitMeals brand colors and routes

### 7. Update CLAUDE.md Brand DNA
- Document brand consistency rules
- Colors, fonts, design tokens

### 8. Generate Sample PDF
- Create a real meal plan PDF with new template
- Save for download verification
