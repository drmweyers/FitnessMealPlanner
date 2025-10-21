# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: FitnessMealPlanner
Stack: React + TypeScript (Vite) frontend, Express + TypeScript backend, PostgreSQL (Drizzle ORM), Redis, Docker/Compose

1) Core commands (pwsh-compatible)

Setup
- Install deps: npm install
- Copy env: cp .env.example .env
- Verify setup: npm run setup:check

Develop (Docker, recommended)
- Start dev environment: npm run docker:dev
- Tail logs: npm run docker:dev:logs
- Restart: npm run docker:dev:restart
- Stop: npm run docker:dev:stop

Develop (local, optional)
- Backend only: npm run dev:server
- Frontend only: npm run dev:client
- Both (concurrent): npm run dev:concurrent

Build and run (local)
- Build (client + server): npm run build
- Start (after build): npm start

Build and run (Docker, production profile)
- Up: npm run docker:prod
- Down: npm run docker:prod:stop

Tests
- All tests (Vitest): npm test
- Unit tests: npm run test:unit
- Integration tests: npm run test:integration
- Playwright E2E: npm run test:playwright
- Coverage (full): npm run test:coverage:full
- Run a single test file: npm test -- test/unit/your.test.ts
- Run tests matching a name: npm test -- -t "Your test name"
- GUI tests (Linux CI): npm run test:gui
- GUI tests (no Xvfb): npm run test:gui:no-xvfb

Type checks
- TypeScript: npm run check

Database/migrations (Drizzle)
- Generate migration from schema: npm run db:generate
- Push schema to DB: npm run db:push
- Seed test accounts: npm run seed:test-accounts
- Create first admin: npm run create-admin

Useful Docker commands
- Compose dev (manual): docker-compose --profile dev up -d
- Compose prod (manual): docker-compose --profile prod up -d
- Check Postgres health: docker ps | Select-String postgres
- Container logs (dev app): docker logs fitnessmealplanner-dev -f

Service URLs
- Dev app: http://localhost:4000
- Dev API: http://localhost:4000/api
- Prod app (container): http://localhost:5001
- Health: /api/health

2) High-level architecture

Runtime topology
- Development: Express server (server/index.ts) integrates Vite via ViteExpress to serve the React app and API in one process. Static assets and client source are exposed for HMR.
- Production: Vite builds the client into dist/public; esbuild bundles the server to dist/index.js. Express serves API routes and static content from dist/public and public/landing. Docker start script runs Drizzle migrations before starting the server.

API surface (selected)
- server/index.ts wires feature routers under /api:
  - auth, invitations
  - recipes (public and personalized)
  - meal-plan (generation, optimization, sharing, assignments)
  - trainer, customer (role-guarded)
  - pdf (EJS template-based PDF generation)
  - progress, profile, favorites, grocery-lists
  - analytics (admin and public)
- Cross-cutting middleware: analyticsMiddleware (securityAnalysis, requestMonitoring, sanitizeAnalyticsData, privacyProtection, analyticsErrorHandler) applied to /api.
- AuthN/AuthZ: Passport session initialization + route-level guards (requireAuth, requireRole, requireTrainerOrAdmin, requireAdmin).

Frontend
- Vite root at client/ with React 18 + TypeScript + Tailwind and shadcn/ui.
- Aliases (vite.config.ts):
  - @ -> client/src
  - @shared -> shared (shared types/schema)
  - @assets -> attached_assets

Data model (Drizzle ORM)
- Shared schema in shared/schema.ts used server-side and for shared types. Key domains:
  - Users (roles: admin, trainer, customer) and tokens
  - Recipes with nutritional data and tagging; favorites, collections, interactions, recommendations
  - Meal plans: trainer library (templates), personalized plans, assignments
  - Progress tracking: measurements, photos
  - Grocery lists and items (linked to meal plans)
  - Email preferences and send logs

Documents and rendering
- Server-side PDF uses server/views/pdfTemplate.ejs; landing page content served from public/landing.

Containerization
- docker-compose.yml defines: postgres, redis, app-dev (dev), app (prod). Dev mounts source; prod uses multi-stage build and start.sh.

3) Repo-specific rules and workflows (from CLAUDE.md)

Branch policy
- main: production branch (current live)
- qa-ready: development/staging branch

Keep qa-ready synchronized from main
- git checkout main
- git pull origin main
- git checkout qa-ready
- git merge main --no-edit
- git push origin qa-ready

Development workflow
- Always start Docker dev first: docker-compose --profile dev up -d
- Access points: frontend http://localhost:4000, API http://localhost:4000/api, Postgres :5432
- For 404s in dev, restart dev containers then verify key routes (/login, /admin, /trainer, /customer, /api/health, /landing/index.html)

Process notes
- This repo uses PLANNING.md and TASKS.md to coordinate work; consult and update them at session start and completion.

4) Environment

.env (root)
- DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fitmeal
- REDIS_URL=redis://:redis_password@localhost:6379
- JWT_SECRET=<set a strong secret>
- Optional email settings: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS

Notes and gotchas
- drizzle.config.ts is required by the Docker build and production startup; do not remove or relocate it.
- Some QA scripts use grep and xvfb-run which require a Unix-like environment; on Windows, prefer test:gui:no-xvfb and avoid grep-based QA scripts.
- If module resolution errors occur for @ or @shared aliases in dev, restart the dev container to refresh Vite.
