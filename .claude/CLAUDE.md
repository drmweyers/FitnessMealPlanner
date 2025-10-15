# Claude Code Custom Commands

This file defines custom slash commands for FitnessMealPlanner.

---

## ✅ BMAD MULTI-AGENT RECIPE GENERATION SYSTEM - COMPLETE

**Status:** ✅ ALL 7 PHASES COMPLETE (October 10, 2025)
**System:** PRODUCTION READY with 99.5% test coverage

### Quick Overview
The BMAD Multi-Agent Recipe Generation System is **fully operational** with:
- ✅ 8 production agents (BaseAgent, RecipeConceptAgent, ProgressMonitorAgent, BMADCoordinator, NutritionalValidatorAgent, DatabaseOrchestratorAgent, ImageGenerationAgent, ImageStorageAgent)
- ✅ Real-time SSE progress tracking
- ✅ Admin Dashboard integration (4th tab)
- ✅ Comprehensive test suite: 4,312 lines (3,227 unit + 1,085 E2E)
- ✅ 210/211 tests passing (99.5% coverage)

### How to Use
1. Navigate to: http://localhost:5000/admin
2. Click "BMAD Generator" tab (4th tab with robot icon)
3. Configure settings and click "Start BMAD Generation"
4. Watch real-time progress with agent status updates

### Documentation
- `BMAD_PHASE_1_COMPLETION_REPORT.md` through `BMAD_PHASE_3_COMPLETION_REPORT.md`
- `BMAD_PHASE_7_FRONTEND_INTEGRATION_DOCUMENTATION.md`
- `TODO_URGENT.md` - System completion status (Oct 10, 2025)
- See `CLAUDE.md` Phase 8 for complete details

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
