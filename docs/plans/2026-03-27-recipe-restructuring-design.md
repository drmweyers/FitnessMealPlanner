# Recipe Restructuring Design — Scaled Spec
**Date:** 2026-03-27
**Status:** Approved

## Goal
Restructure the production recipe library to match the scaled EvoFit 4,000 Recipe Roadmap with increased targets:

| Tier | Unique Recipes | Cumulative Access |
|------|---------------|-------------------|
| Starter | 1,500 | 1,500 |
| Professional | 1,500 | 3,000 |
| Enterprise | 3,000 | 6,000 |

## Current Production State (2026-03-27)
- Total: 6,158
- Starter: 2,837 (target 1,500 — over by 1,337)
- Professional: 2,199 (target 1,500 — over by 699)
- Enterprise: 1,122 (target 3,000 — under by 1,878)
- Orphans (no image): 52

## Approach: Proportional Scale-Up
Keep original block ratios, scale proportionally to hit new totals.

## Starter Tier — 1,500 (scaled 1.5x from original 1,000)

| Block | ID | Category | Target | Action |
|-------|----|----------|--------|--------|
| A | A1 | Chicken — Weight Loss | 150 | Trim excess |
| A | A2 | Chicken — Muscle Building | 150 | Trim excess |
| A | A3 | Chicken — Breakfast | 150 | Trim excess |
| A | A4 | Chicken — Snacks | 75 | Trim excess |
| B | B1 | Salmon | 150 | Trim excess |
| B | B2 | White Fish | 150 | OK (~151) |
| B | B3 | Shrimp | 150 | Trim excess |
| C | C1 | Legumes | 150 | Generate +28 |
| C | C2 | Eggs | 150 | Generate +59 |
| C | C3 | Tofu/Tempeh | 75 | Trim excess |
| D | D1 | Ground Turkey | 75 | Trim excess |
| D | D2 | Lean Beef | 75 | Trim excess |
| **Total** | | | **1,500** | |

## Professional Tier — 1,500 unique (unchanged from original spec)

| Block | ID | Category | Target | Action |
|-------|----|----------|--------|--------|
| E | E1 | Keto | 100 | Audit/trim |
| E | E2 | Paleo | 100 | Audit/trim |
| E | E3 | Gluten-Free | 100 | Audit/trim |
| E | E4 | Dairy-Free | 100 | Audit/trim |
| F | F1 | Pork Tenderloin | 100 | Trim excess |
| F | F2 | Duck/Game | 50 | Trim excess |
| F | F3 | Lamb | 50 | Trim excess |
| F | F4 | Mixed Seafood | 100 | OK |
| F | F5 | Bison/Venison | 100 | Generate +50 |
| G | G1 | High-Protein Vegan | 100 | Generate +50 |
| G | G2 | Legume Variety | 100 | Generate +70 |
| G | G3 | Whole Food Vegan | 100 | Generate +50 |
| H | H1 | Meal Prep Proteins | 100 | Generate +100 |
| H | H2 | Batch Cook Bases | 100 | Generate +100 |
| I | I1 | Endurance/Athletic | 100 | Generate +100 |
| I | I2 | Bodybuilding/Competition | 100 | Generate +100 |
| **Total** | | | **1,500** | |

## Enterprise Tier — 3,000 unique (scaled 2x from original 1,500)

| Block | ID | Category | Target | Action |
|-------|----|----------|--------|--------|
| J | J1 | Fine Dining Inspired | 200 | Generate ~+100 |
| J | J2 | International Gourmet | 200 | Generate ~+100 |
| J | J3 | Chef's Specials | 200 | Generate ~+150 |
| K | K1 | Mediterranean | 160 | Generate ~+110 |
| K | K2 | Asian | 160 | Generate ~+110 |
| K | K3 | Mexican/Latin | 160 | Generate ~+110 |
| K | K4 | Indian | 160 | Generate ~+110 |
| K | K5 | Middle Eastern | 160 | Generate ~+110 |
| L | L1 | AIP | 150 | Generate ~+120 |
| L | L2 | Low-FODMAP | 150 | Generate ~+120 |
| L | L3 | Carnivore | 150 | Generate ~+100 |
| L | L4 | Whole30 | 150 | Generate ~+120 |
| M | M1 | Wagyu/Premium Beef | 100 | Generate ~+50 |
| M | M2 | Lobster/Crab | 100 | Generate +50 |
| M | M3 | Exotic Fish | 100 | Generate ~+80 |
| M | M4 | Heritage Poultry | 100 | Generate ~+50 |
| N | N1 | Post-Surgery Recovery | 100 | Generate ~+70 |
| N | N2 | Pregnancy/Postpartum | 100 | Generate ~+70 |
| N | N3 | Senior Nutrition | 100 | Generate ~+70 |
| N | N4 | Teen Athletes | 100 | Generate ~+70 |
| O | O1 | Protein Desserts | 100 | Generate ~+70 |
| O | O2 | Low-Cal Treats | 100 | Generate ~+70 |
| **Total** | | | **3,000** | |

## Execution Strategy

### Phase 0: Cleanup
1. Delete all 52 orphan recipes (NULL imageUrl)
2. Precise audit of each block using API filters

### Phase 1: Trim Over-Populated Blocks
- Delete newest/excess recipes from blocks over target
- Preserve approved recipes with images
- Delete unapproved first, then oldest duplicates

### Phase 2: Generate Under-Populated Blocks
- Use batch executor with chunk-size 10
- DALL-E images + S3 upload for every recipe
- Ralph Loop: retry until each block hits exact target

### Phase 3: Verification
- Final audit confirms exact counts per block
- Zero orphans (no image)
- All recipes approved

## Success Criteria
- Starter: exactly 1,500 recipes
- Professional: exactly 1,500 unique recipes
- Enterprise: exactly 3,000 unique recipes
- Total: exactly 6,000 recipes
- Zero recipes with NULL imageUrl
- Every block within +/-5 of target
