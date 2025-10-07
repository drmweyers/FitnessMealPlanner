# Claude Code Custom Commands

This file defines custom slash commands for FitnessMealPlanner.

---

## 🔴 CURRENT TOP PRIORITY

### BMAD Multi-Agent Recipe Generation System - Phase 1

**Status:** 🟡 Ready to Implement (October 7, 2025)
**Urgency:** CRITICAL - Top development priority
**Estimated Time:** 2-3 hours for Phase 1

**What:** Implement sophisticated 5-agent system for bulk recipe generation (10-30+ recipes)
**Why:** Enable efficient bulk recipe generation with real-time progress tracking
**Scope:** Phase 1 of 6-phase implementation

**Phase 1 Files to Create:**
1. `server/services/agents/BaseAgent.ts` - Abstract base class
2. `server/services/agents/RecipeConceptAgent.ts` - Planning agent
3. `server/services/agents/ProgressMonitorAgent.ts` - Monitoring agent
4. `server/services/agents/BMADCoordinator.ts` - Orchestration agent
5. Unit tests for all agents

**Foundation Complete:**
- ✅ `server/services/agents/types.ts` (Core type system)
- ✅ `BMAD_RECIPE_GENERATION_IMPLEMENTATION_ROADMAP.md` (6-phase plan)
- ✅ `BMAD_RECIPE_GENERATION_SESSION_SUMMARY.md` (Session documentation)

**References:**
- See `TODO_URGENT.md` for detailed Phase 1 tasks
- See `BMAD_RECIPE_GENERATION_SESSION_SUMMARY.md` for complete context
- See `BMAD_RECIPE_GENERATION_IMPLEMENTATION_ROADMAP.md` for full roadmap

**Start Here:** Create `BaseAgent.ts` first (all other agents inherit from it)

---

## Development Server Commands

### /start-dev

Start the development server with automatic port cleanup.

When the user says "start dev server" or similar phrases like:
- "start the dev server"
- "run dev server"
- "launch development server"
- "npm run dev"
- "start server"

Execute the following command:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && npm run dev
```

This will:
1. Automatically clean up port 5001 if in use
2. Start the development server with hot reload
3. Display the server URL and health check endpoint

The server will be available at: http://localhost:5001
Health check: http://localhost:5001/health

### /stop-dev

Stop the development server.

When the user says "stop dev server" or similar:
- "stop the server"
- "kill dev server"
- "shutdown server"

Execute:
```bash
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue"
```

### /cleanup-port

Clean up port 5001 if it's stuck.

When the user says "clean up port" or "fix port conflict":

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && npm run cleanup-port
```

## Testing Commands

### /run-tests

Run all unit tests.

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && npm test
```

### /run-server-tests

Run server startup tests specifically.

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && npm run test:server
```

## Build Commands

### /build

Build the application for production.

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && npm run build
```

### /check

Run TypeScript type checking.

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && npm run check
```

## Deployment Commands

### /verify-deployment

Run deployment verification checks.

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && powershell -ExecutionPolicy Bypass -File scripts/verify-deployment.ps1
```

### /test-deployment

Run full deployment simulation test.

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && bash scripts/test-deployment.sh
```

## Database Commands

### /db-push

Push database schema changes.

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && npm run db:push
```

### /db-generate

Generate database migrations.

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && npm run db:generate
```

### /reset-test-accounts

Reset test account credentials (use when login fails).

Execute:
```bash
cd C:/Users/drmwe/Claude/FitnessMealPlanner && npm run reset:test-accounts
```

## 🔐 Official Test Credentials

**⚠️ THESE CREDENTIALS NEVER CHANGE**

### Admin Account
- **Email:** `admin@fitmeal.pro`
- **Password:** `AdminPass123`

### Trainer Account
- **Email:** `trainer.test@evofitmeals.com`
- **Password:** `TestTrainer123!`

### Customer Account
- **Email:** `customer.test@evofitmeals.com`
- **Password:** `TestCustomer123!`

**Development URL:** http://localhost:4000

**If credentials don't work, run:** `npm run reset:test-accounts`

See OFFICIAL_TEST_CREDENTIALS.md for full details.

## Quick Status Check

### /health-check

Check if the server is running and healthy.

Execute:
```bash
curl -s http://localhost:5001/health || echo "Server not running"
```

### /port-status

Check what's using port 5001.

Execute:
```bash
netstat -ano | findstr :5001 || echo "Port 5001 is free"
```

---

## Usage Notes

All commands can be invoked naturally. Just tell Claude what you want:
- "start dev server" → runs npm run dev with cleanup
- "run tests" → runs npm test
- "check deployment" → runs verification script
- "what's on port 5001" → shows port status

The commands are context-aware and will execute in the project directory automatically.
