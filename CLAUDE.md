# FitnessMealPlanner - Quick Reference
**Version:** 2.0.0 (Optimized - Jan 2026)
**Production:** https://evofitmeals.com

## 🧪 PHASE 5: VERIFY — POST-DEPLOY SIMULATION (MANDATORY)
After every production deploy, run the FORGE User Simulation via **Zara** (QA agent):
```bash
cd ~/.openclaw/workspace/FitnessMealPlanner
npx tsx scripts/seed-demo-data.ts && npx playwright test --config=playwright.simulation.config.ts --reporter=list
```
Skill: `~/.openclaw/workspace/skills/evofit-user-simulation/SKILL.md`
Agent: `.claude/agents/evofit-meals-simulator.md`
Training: `~/.openclaw/workspace/skills/evofit-user-simulation/docs/agent-training.md`

---

## Project Overview

| Item | Value |
|------|-------|
| Stack | React, TypeScript, Node.js, Express, PostgreSQL, Drizzle ORM |
| Branch | main (production) |
| Port | 4000 (frontend + API) |

---

## Quick Start

```bash
# Start development
docker-compose --profile dev up -d

# View logs
docker logs fitnessmealplanner-dev -f

# Stop
docker-compose --profile dev down
```

**Access:**
- Frontend: http://localhost:4000
- API: http://localhost:4000/api
- PostgreSQL: localhost:5432

---

## Key Commands

```bash
# Docker
docker-compose --profile dev up -d      # Start
docker-compose --profile dev down       # Stop
docker-compose --profile dev restart    # Restart
docker-compose --profile dev up -d --build  # Rebuild

# Git (always from main)
git checkout main
git pull origin main
git checkout -b feature/<name>

# Testing
npm test                    # Run tests
npm run test:coverage       # With coverage
```

---

## Project Structure

```
/
├── client/          # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── contexts/
│       └── hooks/
├── server/          # Express backend
│   ├── controllers/
│   ├── routes/
│   ├── db/
│   └── middleware/
├── docs/            # Documentation
└── test/            # Test suites
```

---

## CTO Triggers

| Say | Action |
|-----|--------|
| "start dev" | Launch Docker containers |
| "run tests" | Execute test suite |
| "marketing strategy" | Load Hormozi constraint analysis |
| "what's next" | Show current priorities |
| "create task for [feature]" | Generate Auto-Claude task |
| "bmad to auto-claude" | Convert story to spec |

---

## Auto-Claude Task Templates (FitnessMealPlanner)

### Meal Planning Feature Task
```markdown
## Task
Add [Feature] to meal planning system

## Requirements
- [Feature description]
- Integrate with existing meal/recipe data
- Update UI to display new functionality
- Add appropriate validation

## Acceptance Criteria
- [ ] Feature works as expected
- [ ] Integrates with existing meal data
- [ ] UI updates correctly
- [ ] Input validation prevents errors

## Technical Context
- Stack: React, TypeScript, Express, PostgreSQL, Drizzle ORM
- Patterns: Follow `server/controllers/` structure
- Frontend: Use existing components in `client/src/components/`

## Files to Reference
- server/controllers/meals.controller.ts
- server/db/schema.ts
- client/src/pages/MealPlan.tsx

## Complexity
Standard
```

### API Endpoint Task
```markdown
## Task
Create [Resource] API endpoints

## Requirements
- RESTful CRUD operations
- Input validation
- Error handling with proper status codes
- Database integration with Drizzle

## Acceptance Criteria
- [ ] All endpoints return correct data
- [ ] Validation rejects invalid input
- [ ] Errors return appropriate status codes
- [ ] Tests cover happy path and edge cases

## Technical Context
- Stack: Express, Drizzle ORM, PostgreSQL
- Patterns: Follow `server/routes/` and `server/controllers/`
- Validation: Use existing patterns

## Files to Reference
- server/routes/index.ts
- server/controllers/meals.controller.ts
- server/db/schema.ts

## Complexity
Standard
```

### React Component Task
```markdown
## Task
Build [Component] component

## Requirements
- React functional component with TypeScript
- Responsive design
- Loading and error states
- Proper prop types

## Acceptance Criteria
- [ ] Component renders correctly
- [ ] Responsive across screen sizes
- [ ] Handles loading/error states
- [ ] Props are properly typed

## Technical Context
- Stack: React, TypeScript, TailwindCSS
- Patterns: Follow `client/src/components/`
- State: Use React hooks and context

## Files to Reference
- client/src/components/
- client/src/contexts/
- client/src/hooks/

## Complexity
Simple
```

### Database Migration Task
```markdown
## Task
Add [Table/Column] to database schema

## Requirements
- Update Drizzle schema
- Create migration
- Update related models/types
- Seed data if needed

## Acceptance Criteria
- [ ] Schema updated correctly
- [ ] Migration runs without errors
- [ ] Related code updated
- [ ] Existing data preserved

## Technical Context
- ORM: Drizzle
- Database: PostgreSQL
- Patterns: Follow existing schema structure

## Files to Reference
- server/db/schema.ts
- server/db/migrations/
- server/db/seed.ts

## Complexity
Simple
```

### Common FitnessMealPlanner Patterns
| Task Type | Complexity | Key Files |
|-----------|------------|-----------|
| Meal feature | Standard | `controllers/meals`, `pages/MealPlan` |
| Recipe feature | Standard | `controllers/recipes`, `pages/Recipes` |
| API endpoint | Standard | `routes/`, `controllers/` |
| UI component | Simple | `client/src/components/` |
| Database change | Simple | `server/db/schema.ts` |
| Test suite | Simple | `test/`, existing tests |

---

## Marketing Skills

| Skill | Purpose |
|-------|---------|
| `hormozi-constraint-analysis` | Identify growth constraint (USE FIRST) |
| `paid-media-creative-testing` | Ad campaigns |
| `seo-answer-engine-optimization` | Organic traffic |
| `content-repurposing-flywheel` | 70+ posts/week |
| `outreach-automation` | Lead generation |

**Reference:** `docs/marketing/MARKETING_STRATEGY_REFERENCE.md`

---

## Branch Structure

| Branch | Purpose |
|--------|---------|
| **main** | Production (deploy target) |
| qa-ready | Development/testing |
| qa-ready-clean | Legacy (archived) |

---

## Key Files

| Purpose | Location |
|---------|----------|
| Tasks | TASKS.md |
| Planning | PLANNING.md |
| Marketing | docs/marketing/ |
| Full docs | CLAUDE.md.backup-20260121 |

---

## Detailed Documentation

| Topic | Location |
|-------|----------|
| Development workflow | .claude/rules/development-workflow.md |
| Testing protocols | .claude/rules/testing-protocols.md |
| Marketing system | .claude/rules/marketing-system.md |
| Features status | .claude/rules/features-status.md |
| **Agent Teams Reference** | **docs/AGENT-TEAMS-REFERENCE.md** |

---

## Troubleshooting

**Docker won't start?** `docker-compose --profile dev down && docker-compose --profile dev up -d --build`
**Database issues?** Check PostgreSQL container: `docker logs fitnessmealplanner-db`
**Tests failing?** Run `npm test -- --verbose` for details

---

*Backup: CLAUDE.md.backup-20260121 | Rules: .claude/rules/*
