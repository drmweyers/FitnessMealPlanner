---
name: evofit-meals-demo-simulator
description: Demo simulation system for EvoFit Meals. Seeds realistic demo data via API calls and validates 100% of platform usability via Playwright E2E tests. Invoke after every production deploy or for weekly health checks.
---

# EvoFit Meals Demo Simulator

## Description

Comprehensive demo simulation system for EvoFit Meals. Seeds realistic demo data via API calls to the production environment and validates platform usability via Playwright E2E tests covering 10 critical flows.

## Arguments

The skill accepts one argument specifying the mode:
- `seed` — Populate demo data via API calls to production
- `test` — Run Playwright E2E test suite against production
- `full` — Run both seed + test (complete simulation) — **recommended**
- `status` — Check current demo data state without changes

## Instructions

### Mode: seed

Run the API seed script to populate demo data:

```bash
cd ~/.openclaw/workspace/FitnessMealPlanner
npx tsx scripts/seed-demo-data.ts
```

This creates:
- 3 meal plans (Weight Loss 4-Week, Muscle Gain 6-Week, Balanced Maintenance)
- 3 client meal plan assignments
- 63 daily nutrition logs (3 weeks × 3 clients)
- 12 progress measurements (4 weeks × 3 clients)
- 9 nutrition goals (3 per client)
- 3 shopping lists for active assignments

Target: `https://evofitmeals.com`  
Accounts: `nutritionist.sarah@evofitmeals.com` / `Demo1234!`

The script is idempotent — 409 Conflict responses are handled gracefully.

Override environment:
```bash
BASE_URL=http://localhost:4000 npx tsx scripts/seed-demo-data.ts
```

Dry run:
```bash
npx tsx scripts/seed-demo-data.ts --dry-run
```

### Mode: test

Run the Playwright E2E test suite:

```bash
cd ~/.openclaw/workspace/FitnessMealPlanner
npx playwright test --config=playwright.simulation.config.ts --reporter=html
```

Tests cover 10 flows:
1. Login & Authentication (nutritionist + client)
2. Nutritionist Dashboard
3. Client Management (list, view, search)
4. Meal Plan Library (browse, view, detail)
5. Recipe Library (search, filter, detail)
6. Nutrition Logging (client perspective)
7. Progress Tracking (measurements, charts)
8. Shopping List Generation
9. Admin Dashboard
10. Responsive & Mobile Layouts

Screenshots are saved to `tests/e2e/screenshots/`.

Open HTML report:
```bash
npx playwright show-report tests/e2e/reports/simulation
```

### Mode: full

Run seed first, then tests:

```bash
cd ~/.openclaw/workspace/FitnessMealPlanner
npx tsx scripts/seed-demo-data.ts && npx playwright test --config=playwright.simulation.config.ts --reporter=html
```

This is the recommended mode for a complete demo simulation.

### Mode: status

Check current demo data state:

```bash
node -e "
const BASE = 'https://evofitmeals.com';
async function check() {
  const login = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nutritionist.sarah@evofitmeals.com', password: 'Demo1234!' })
  });
  const auth = await login.json();
  const token = auth.accessToken || auth.token || (auth.data?.accessToken);
  if (!token) { console.log('AUTH: FAILED'); return; }
  console.log('AUTH: OK');
  const h = { Authorization: 'Bearer ' + token };
  const checks = [
    ['/api/clients', 'Clients (expect 3+)'],
    ['/api/meal-plans', 'Meal Plans (expect 3+)'],
    ['/api/recipes', 'Recipes (expect 50+)'],
    ['/api/nutrition/logs', 'Nutrition Logs (expect 20+)'],
  ];
  for (const [path, label] of checks) {
    try {
      const r = await fetch(BASE + path, { headers: h });
      const d = await r.json();
      const arr = d.data || d.mealPlans || d.recipes || d.clients || d.logs || d;
      console.log(label + ': ' + (Array.isArray(arr) ? arr.length : 'N/A'));
    } catch(e) { console.log(path + ': ERROR'); }
  }
}
check();
"
```

Expected:
- Clients: 3+
- Meal Plans: 3+
- Recipes: 50+
- Nutrition Logs: 20+

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| BASE_URL | https://evofitmeals.com | Target environment |
| NUTRITIONIST_EMAIL | nutritionist.sarah@evofitmeals.com | Nutritionist account |
| PASSWORD | Demo1234! | Demo account password |

## Prerequisites

- Node.js 18+ (for native fetch)
- `tsx` (via npx, for TypeScript scripts)
- Playwright (`npx playwright install chromium`)
- Working internet connection to reach production

## Key Files

| File | Purpose |
|------|---------|
| `scripts/seed-demo-data.ts` | API seed script |
| `tests/e2e/flows/*.spec.ts` | E2E test specs (10 flows) |
| `playwright.simulation.config.ts` | Playwright config |
| `tests/e2e/screenshots/` | Captured screenshots |
| `tests/e2e/reports/` | HTML + JSON reports |
| `.claude/agents/evofit-meals-simulator.md` | Zara agent definition |

## Integration

This skill is **Phase 5: Verify** in the FORGE deployment pipeline.  
Run after every production deploy: `full` mode.

For the unified cross-product skill, see:  
`~/.openclaw/workspace/skills/evofit-user-simulation/SKILL.md`
