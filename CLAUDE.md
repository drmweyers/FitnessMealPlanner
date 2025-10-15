# FitnessMealPlanner Development Guidelines

## Project Overview
**Name:** FitnessMealPlanner  
**Description:** A comprehensive meal planning application for fitness professionals and their clients  
**Tech Stack:** React, TypeScript, Node.js, Express, PostgreSQL, Drizzle ORM, Vite, Docker

## 🌟 CRITICAL: BRANCH STRUCTURE UPDATE
**Current branch status after Health Protocol removal (August 2025):**

### Branch Hierarchy:
1. **main** - 🥇 PRODUCTION BRANCH (current active branch)
   - Status: Health Protocol successfully removed from production
   - Contains: All core features except Health Protocol
   - Production URL: https://evofitmeals.com
   - Last deployment: August 20, 2025

2. **qa-ready** - 🥈 Development branch (previously primary)
   - Status: Contains removed Health Protocol feature
   - Use case: Development and testing of new features
   - Branch from main for new feature development

3. **qa-ready-clean** - 🥉 Legacy branch (archived)

## CRITICAL: Development Environment Setup

### ALWAYS Start Development with Docker
1. **Check Docker is running first**: `docker ps`
2. **Start development server**: `docker-compose --profile dev up -d`
3. **Verify startup**: `docker logs fitnessmealplanner-dev --tail 20`
4. **Access points**:
   - Frontend: http://localhost:4000
   - Backend API: http://localhost:4000/api
   - PostgreSQL: localhost:5432

### Docker Commands Reference
- **Start dev environment**: `docker-compose --profile dev up -d`
- **Stop dev environment**: `docker-compose --profile dev down`
- **View logs**: `docker logs fitnessmealplanner-dev -f`
- **Restart containers**: `docker-compose --profile dev restart`
- **Rebuild after dependencies change**: `docker-compose --profile dev up -d --build`

## Repository Layout
```
/
├── client/              # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom React hooks
│   │   ├── types/       # TypeScript type definitions
│   │   └── utils/       # Utility functions
├── server/              # Express backend application
│   ├── controllers/     # Route controllers
│   ├── routes/          # API routes
│   ├── db/             # Database schema and migrations
│   ├── middleware/     # Express middleware
│   ├── utils/          # Backend utilities
│   └── views/          # EJS templates (for PDFs)
├── test/               # Test suites
├── docker-compose.yml  # Docker configuration
├── package.json        # Root package configuration
└── CLAUDE.md          # This file
```

## Development Workflow

### MANDATORY SESSION INSTRUCTIONS
**Always read PLANNING.md at the start of every new conversation, check TASKS.md before starting your work, mark completed tasks to TASKS.md immediately, and add newly discovered tasks to TASKS.md when found.**

### Before Starting Any Development Task
1. **ALWAYS** ensure you're on main branch: `git checkout main`
2. **ALWAYS** start Docker development environment first
3. Check git status: `git status`
4. Pull latest changes: `git pull origin main`
5. Create feature branch: `git checkout -b feature/<description>` (from main)

### Branch Management Commands
```bash
# Always start from main (current production branch)
git checkout main
git pull origin main

# For feature work
git checkout -b feature/your-feature-name
# ... do work ...
git add .
git commit -m "your changes"
git push origin feature/your-feature-name

# Merge back to main when ready (for production deployment)
git checkout main
git merge feature/your-feature-name
git push origin main
```

### Branch Synchronization Process (CTO Guidance)
**CRITICAL: After adding features to main, synchronize with qa-ready**

```bash
# Step 1: Ensure you're on main with latest changes
git checkout main
git pull origin main

# Step 2: Switch to qa-ready branch  
git checkout qa-ready
git status  # Must be clean

# Step 3: Merge main into qa-ready to sync branches
git merge main --no-edit
# This brings latest production code to qa-ready (like Export JSON feature)

# Step 4: Push synchronized qa-ready branch
git push origin qa-ready

# Step 5: Return to main branch
git checkout main
```

**CTO Instructions - When to guide User through this process:**
- ✅ After new features are committed to main
- ✅ Before starting development on qa-ready  
- ✅ After production hotfixes
- ✅ When user asks "is qa-ready merged with main?"
- ✅ Weekly as part of regular maintenance

**Why branch sync is important:**
- qa-ready serves as staging/development branch
- main remains production-ready branch  
- Both branches need latest features for consistent development
- Prevents conflicts when deploying from qa-ready

### During Development
1. Use TodoWrite tool to track all tasks
2. Test changes in the Docker environment
3. Run linting before commits: `npm run lint`
4. Ensure TypeScript checks pass: `npm run typecheck`

### After Task Completion
1. Test all changes thoroughly
2. Commit with descriptive messages
3. Update documentation if needed
4. Mark todos as completed

## Current Features Status

### Completed Features (main branch - Production)
- ✅ User authentication (Admin, Trainer, Customer roles)
- ✅ Recipe management system
- ✅ Meal plan generation
- ✅ Multiple meal plans per customer
- ✅ PDF export (both client-side and server-side)
- ✅ Responsive design for all pages
- ✅ Customer invitation system
- ✅ Profile image upload system for all user roles
- ✅ Customer progress tracking (measurements, photos, goals)
- ✅ Trainer-customer meal plan assignment workflow

### Health Protocol Feature Status
- **Status**: ❌ **REMOVED FROM PRODUCTION** (August 20, 2025)
- **Reason**: Feature removed per business requirements
- **Production Impact**: Successfully eliminated from https://evofitmeals.com
- **Deployment Verification**: Confirmed via comprehensive multi-agent QA review
- **Components Removed**: `TrainerHealthProtocols.tsx`, `SpecializedProtocolsPanel.tsx`
- **Database**: `trainerHealthProtocols` and `protocolAssignments` tables removed

### PDF Export Implementation
- **Client-side**: Using jsPDF in `client/src/utils/pdfExport.ts`
- **Server-side**: Using Puppeteer with EvoFit branding
- **API Endpoints**: 
  - POST `/api/pdf/export` (authenticated)
  - POST `/api/pdf/test-export` (dev only)
  - POST `/api/pdf/export/meal-plan/:planId`

## Testing Guidelines
1. **Always test in Docker environment first**
2. Use the provided test scripts for specific features
3. Check browser console for errors
4. Test all user roles (Admin, Trainer, Customer)
5. Verify responsive design on different screen sizes

## 🚀 Awesome Testing Protocol (Production Validation)

**Purpose:** Final validation before every production deployment
**Trigger Phrase:** "run Awesome Testing Protocol" or "run awesome testing"
**Status:** ✅ Production-Ready | 100% Pass Rate Required

### What It Does

The Awesome Testing Protocol is a comprehensive test suite that validates **100% of critical user flows** before deployment:

- ✅ **Authentication** (6 tests) - All roles login/logout
- ✅ **RBAC** (9 tests) - Permission boundaries enforced
- ✅ **Admin Features** (5 tests) - Recipe management, User management
- ✅ **Trainer Features** (5 tests) - Customer management, Meal plans
- ✅ **Customer Features** (5 tests) - Meal plans, Grocery lists, Progress
- ✅ **Cross-Browser** (3 browsers) - Chromium, Firefox, WebKit

**Total:** 30 tests × 3 browsers = 90 test executions in ~5 minutes

### Quick Commands

```bash
# Run the full protocol (recommended before deployment)
npm run test:awesome

# View comprehensive documentation
cat test/AWESOME_TESTING_PROTOCOL.md

# Run with UI mode
npx playwright test test/e2e/awesome-testing-protocol.spec.ts --ui
```

### When To Run

**ALWAYS run before:**
- Production deployments
- Merging to main branch
- Creating releases
- Major feature additions

**Expected Output:**
```
✅ 30 passed across all browsers
✅ 100% SUCCESS - READY FOR PRODUCTION! 🚀
```

**If any test fails:** ❌ **DO NOT DEPLOY** - Fix issues first

### Documentation

- **Full Guide:** `test/AWESOME_TESTING_PROTOCOL.md`
- **Test File:** `test/e2e/awesome-testing-protocol.spec.ts`
- **100% Success Report:** `test/100_PERCENT_SUCCESS.md`

---

## 🔄 Role Interaction Testing Protocol (NEW - January 2025)

**Purpose:** Comprehensive testing of interactions between Admin, Trainer, and Customer roles
**Trigger Phrase:** "run interaction testing protocol" or "run role interaction tests"
**Status:** ✅ Ready for Execution | 139 Total Tests

### What It Does

The Role Interaction Testing Protocol validates **ALL collaborations between the three user roles** - the core business value of the application:

- ✅ **Admin ↔ Trainer** (38 tests) - Recipe approval, trainer management, system oversight
- ✅ **Trainer ↔ Customer** (52 tests) - Invitations, meal plans, progress tracking
- ✅ **Admin ↔ Customer** (23 tests) - Customer support, data access
- ✅ **Multi-Role Workflows** (26 tests) - Complete system lifecycle validation

**Total:** 139 tests (30 unit + 100 integration + 9 E2E)

### Quick Commands

```bash
# Run all role interaction tests
npm run test -- test/unit/services/roleInteractions.test.ts
npx playwright test test/e2e/role-collaboration-workflows.spec.ts

# Run with Playwright UI (recommended)
npx playwright test test/e2e/role-collaboration-workflows.spec.ts --ui

# Run across all browsers
npx playwright test test/e2e/role-collaboration-workflows.spec.ts --project=chromium --project=firefox --project=webkit

# Run specific workflow
npx playwright test test/e2e/role-collaboration-workflows.spec.ts -g "Complete Recipe Workflow"
```

### What This Validates

**Critical Role Interactions:**
- ✅ Admin creates recipes → Trainers use them → Customers see them
- ✅ Trainers invite customers → Customers accept → Relationship established
- ✅ Trainers create meal plans → Assign to customers → Customers view
- ✅ Customers update progress → Trainers review → Trainers adjust plans
- ✅ Multiple meal plans per customer
- ✅ Data isolation between roles
- ✅ Permission boundaries enforced
- ✅ Complete system workflows validated

### When To Run

**Run before:**
- Production deployments (alongside Awesome Testing Protocol)
- Major feature additions affecting multiple roles
- Permission/security changes
- Database schema changes affecting role relationships

**Run after:**
- Changes to user management
- Changes to meal plan assignment logic
- Changes to invitation system
- Changes to progress tracking

### Expected Output

```
✅ 30 unit tests passed
✅ 8 E2E workflows passed across all browsers
✅ 100% role collaboration coverage
✅ READY FOR PRODUCTION! 🚀
```

**If any test fails:** ❌ **DO NOT DEPLOY** - Fix role interaction issues first

### Documentation

- **Protocol**: `docs/qa/role-interaction-testing-protocol.md`
- **Execution Guide**: `test/ROLE_INTERACTION_TESTING_EXECUTION_GUIDE.md`
- **QA Gate**: `docs/qa/gates/role-interaction-testing-protocol-qa-gate.yml`
- **Unit Tests**: `test/unit/services/roleInteractions.test.ts`
- **E2E Tests**: `test/e2e/role-collaboration-workflows.spec.ts`

### BMAD Integration

This protocol was created using **BMAD multi-agent workflow methodology**:
- QA Agent (Quinn) for test strategy and risk assessment
- Test architecture following BMAD principles
- Comprehensive documentation and quality gates
- **QA Gate Decision**: PASS (9.6/10 quality score)

---

## 🤖 Continuous Testing Framework (NEW - January 2025)

### Overview
FitnessMealPlanner now includes a **Claude-powered autonomous testing agent** that continuously monitors and tests the Meal Plan Generator system without requiring external API calls.

### Quick Start

```bash
# Verify setup
npm run test:continuous:verify

# Start continuous testing (5-minute intervals)
npm run test:continuous

# Start with auto-fix enabled
npm run test:continuous:auto-fix
```

### Features
- ✅ **Continuous Monitoring**: Runs tests at regular intervals (default: 5 minutes)
- ✅ **Autonomous Bug Detection**: Automatically identifies failing tests
- ✅ **Auto-Fix Integration**: Integrates with Autonomous Bug Fixer to fix issues automatically
- ✅ **Comprehensive Reports**: Generates JSON reports saved to `test-results/continuous-testing/`
- ✅ **No External APIs**: Runs entirely within Claude Code

### Available Commands

```bash
# Basic continuous testing
npm run test:continuous              # Default 5-minute interval
npm run test:continuous 10           # Custom 10-minute interval

# With auto-fix
npm run test:continuous:auto-fix     # Enable autonomous bug fixing

# Test specific categories
npm run test:continuous:unit         # Unit tests only
npm run test:continuous:integration  # Integration tests only
npm run test:continuous:e2e          # E2E tests only
npm run test:continuous:all          # All tests (not just meal plan)

# Verify setup
npm run test:continuous:verify       # Check prerequisites
```

### Test Coverage

**Meal Plan Generator Tests:**
- **Unit Tests** (55 planned): Service logic, AI parsing, nutrition optimization
- **Integration Tests** (38 planned): API endpoints, workflows, assignments
- **E2E Tests** (44 planned): Complete user flows, visual regression

### Documentation

- **Quick Start**: `test/continuous-testing/QUICK_START.md`
- **Full Guide**: `test/continuous-testing/README.md`
- **Technical Spec**: `test/continuous-testing/CLAUDE_SUBAGENT_SPEC.md`

### Success Metrics

**Target Metrics:**
- ✅ Test Coverage: 95%+ for meal plan services
- ✅ Success Rate: 98%+ tests passing
- ✅ Auto-Fix Rate: 70%+ of failures fixed automatically
- ✅ Detection Time: <5 minutes to detect new failures
- ✅ Fix Time: <10 minutes from detection to verified fix

### Integration with Autonomous Bug Fixer

The continuous testing agent seamlessly integrates with the existing Autonomous Bug Fixer (`test/autonomous-fix/`):

```bash
# Auto-fix enabled: Tests → Detect → Fix → Verify → Repeat
npm run test:continuous:auto-fix
```

**Fix Levels:**
- **Level 1** (Auto-fix, no approval): Selector updates, import fixes, type errors
- **Level 2** (Auto-fix after verification): UI bugs, API fixes, performance
- **Level 3** (Requires approval): Auth logic, business logic, schema changes

### Viewing Reports

```bash
# View latest report
cat test-results/continuous-testing/latest.json | jq .

# View summary only
cat test-results/continuous-testing/latest.json | jq '.summary'

# View recent failures
cat test-results/continuous-testing/latest.json | jq '.testRuns[].failures[]'
```

## Common Issues & Solutions
- **Import errors**: Check Vite alias configuration is working
- **Database connection**: Ensure PostgreSQL container is running
- **PDF export fails**: Check Puppeteer dependencies in Docker
- **Port conflicts**: Default ports are 4000 (dev) and 5001 (prod)

## Security Considerations
- Never commit `.env` files
- Use environment variables for sensitive data
- Validate all user inputs
- Implement proper authentication checks
- Sanitize data before PDF generation

## Production Deployment (Manual Process)

### CRITICAL: Manual Deployment Instructions for Local Repo → Production

**When Docker push fails due to proxy/network issues, use this manual deployment process:**

#### 1. Build and Tag Image Locally
```bash
# Build production image
docker build --target prod -t fitnessmealplanner:prod .

# Tag for DigitalOcean registry
docker tag fitnessmealplanner:prod registry.digitalocean.com/bci/fitnessmealplanner:prod
```

#### 2. Manual Deployment via DigitalOcean Dashboard
Since Docker push may fail due to proxy issues, use manual deployment:

**Step-by-Step Process:**
1. **Navigate to**: https://cloud.digitalocean.com/apps
2. **Find App**: `fitnessmealplanner-prod` (App ID: `600abc04-b784-426c-8799-0c09f8b9a958`)
3. **Click**: on the app name to open management page
4. **Locate Deploy Button**: Look for "Deploy" (blue button, top-right) or "Actions" → "Force Rebuild and Deploy"
5. **Trigger Deployment**: Click "Deploy" or "Force Rebuild and Deploy"
6. **Confirm**: When prompted, confirm the deployment
7. **Monitor**: Watch deployment progress (3-5 minutes typical)
8. **Verify**: Check https://evofitmeals.com for successful deployment

#### 3. Deployment Configuration Details
- **App Name**: `fitnessmealplanner-prod`
- **Production URL**: https://evofitmeals.com
- **Registry**: `registry.digitalocean.com/bci/fitnessmealplanner:prod`
- **Auto-deploy**: Enabled (triggers on registry push)
- **Deployment Method**: Container Registry (not Git-based)

#### 4. Why Manual Deployment is Used
- **Proxy Issues**: Docker push fails due to corporate proxy blocking registry uploads
- **Preserves Team Workflow**: Other developers can continue using Docker push normally
- **No Configuration Changes**: Maintains existing deployment setup
- **Reliable Alternative**: Bypasses network connectivity issues

#### 5. For CCA-CTO: Always Guide Through This Process
When user requests deployment to production:
1. **First attempt**: Try Docker push (`docker push registry.digitalocean.com/bci/fitnessmealplanner:prod`)
2. **If push fails**: Guide user through manual deployment process above
3. **Reference**: Full deployment details in `DO_DEPLOYMENT_GUIDE.md`

### Comprehensive Deployment Documentation
**New Documentation Suite (August 2025):**
- **[DEPLOYMENT_PROCESS_DOCUMENTATION.md](./DEPLOYMENT_PROCESS_DOCUMENTATION.md)**: Complete deployment pipeline analysis
- **[DEPLOYMENT_BEST_PRACTICES.md](./DEPLOYMENT_BEST_PRACTICES.md)**: Optimized deployment procedures  
- **[DEPLOYMENT_TROUBLESHOOTING_GUIDE.md](./DEPLOYMENT_TROUBLESHOOTING_GUIDE.md)**: Problem resolution procedures
- **[PRODUCTION_DIAGNOSTIC_REPORT.md](./PRODUCTION_DIAGNOSTIC_REPORT.md)**: Health Protocol removal investigation
- **[QA_PRODUCTION_TEST_REPORT.md](./QA_PRODUCTION_TEST_REPORT.md)**: Production verification results
- **[HEALTH_PROTOCOL_REMOVAL_VERIFICATION.md](./HEALTH_PROTOCOL_REMOVAL_VERIFICATION.md)**: Feature removal confirmation

**Key Insights from Health Protocol Removal Deployment:**
- Registry push may appear to timeout but actually succeed
- Full deployment window is 7-10 minutes from registry push to production
- Auto-deployment triggers within 4 seconds of registry update
- Production verification should wait until deployment is complete
- DigitalOcean Container Registry auto-deployment is highly reliable
- Multi-agent diagnostic approach provides comprehensive production analysis

**Multi-Agent QA Investigation Results:**
- **Production Diagnostic Agent**: Identified deployment timing issue, confirmed successful Health Protocol removal
- **QA Verification Agent**: Verified 100% Health Protocol elimination with 39ms response times
- **DevOps Documentation Agent**: Created 50+ page deployment documentation suite

### MCP Integration
- **GitHub MCP**: Code repository management
- **Context7 MCP**: Technical documentation access
- **DigitalOcean MCP**: Production infrastructure monitoring

## BMAD Core Integration Status (August 28, 2025)

### 🚀 New Strategic Business Intelligence Layer
**Status:** Core system created, integration pending

The BMAD (Business Model Architecture Design) Core has been implemented as a strategic layer above the application's technical architecture. This system provides:

- **Business Strategy Engine**: Dynamic pricing, revenue optimization, market analysis
- **Customer Intelligence**: Segmentation, churn prediction, journey tracking
- **Workflow Automation**: Event-driven business process automation
- **Orchestration Layer**: Cross-component coordination and monitoring

**Integration Path:**
```bash
# To start BMAD Core in next session:
cd .bmad-core
npm install
npm run build
npm run bmad:start
```

**Next Steps:**
1. Connect BMAD to real database metrics
2. Create admin dashboard for BMAD insights
3. Configure production environment
4. Test automated workflows

See `BMAD_IMPLEMENTATION_STATUS.md` for full details.

## BMAD Software Development Process

### Current BMAD Status (January 12, 2025)
**IMPORTANT**: When asked "where are we with the BMAD process", refer to this section.

The project is using the **BMAD Method** (Agile AI-Driven Development) for systematic feature development:

#### Phase 1: Documentation ✅ COMPLETE
- Created comprehensive PRD (`/docs/prd.md`) with 9 user stories
- Documented technical architecture (`/docs/architecture.md`)
- Installed BMAD framework in `/.bmad-core/`

#### Phase 2: Story Creation ✅ COMPLETE
- PRD sharded into individual story files in `/docs/prd/`
- Story implementation files created in `/docs/stories/`
- Stories reviewed and validated for implementation

#### Phase 3: Development ✅ COMPLETE (ALL STORIES 1.1-1.9)
**ALL 9 STORIES SUCCESSFULLY IMPLEMENTED:**
- ✅ Story 1.1: Multi-Role Authentication System (Deployed)
- ✅ Story 1.2: AI-Powered Recipe Generation (Deployed)
- ✅ Story 1.3: Advanced Recipe Search (Deployed)
- ✅ Story 1.4: Intelligent Meal Plan Generation (Deployed)
- ✅ Story 1.5: Trainer-Customer Management (Deployed)
- ✅ Story 1.6: Progress Tracking System (Deployed)
- ✅ Story 1.7: PDF Generation and Export (Deployed)
- ✅ Story 1.8: Responsive UI/UX Enhancement (Complete - Sep 1)
- ✅ Story 1.9: Advanced Analytics Dashboard (Complete - Sep 1)

#### Phase 4: 100% PRD Complete! 🎉
**All initial PRD stories have been successfully implemented and tested.**

#### Phase 5: Recipe Generation System Excellence ✅ COMPLETE (December 5, 2024)
**100% SYSTEM HEALTH ACHIEVEMENT:**
- ✅ **Recipe Image Coverage**: 100% (20/20 recipes with images)
- ✅ **UI Navigation**: All conflicts resolved, seamless experience
- ✅ **Test Infrastructure**: Rate limit bypass configured for testing
- ✅ **Quality Assurance**: All Playwright tests passing (3/3 suites)
- ✅ **Admin Interface**: Recipe management fully functional
- ✅ **Production Validation**: All test accounts verified operational
- ✅ **Performance**: Zero critical errors, optimal response times
- ✅ **Documentation**: Comprehensive test documentation created

#### Phase 6: Development Server & S3 Integration ✅ COMPLETE (January 6, 2025)
**RESOLVED ISSUES - SYSTEM FULLY OPERATIONAL:**
- ✅ **Development Server**: Fixed Vite hanging issue through Docker rebuild
- ✅ **S3 Credentials**: Updated DigitalOcean Spaces keys and verified
- ✅ **Recipe Generation**: AI-powered image generation working perfectly
- ✅ **Image Uploads**: S3/DigitalOcean Spaces integration functional
- ✅ **API Performance**: All endpoints responding with optimal times
- ✅ **Docker Environment**: Rebuilt with proper environment variable loading
- ✅ **System Health**: 100% operational status maintained

#### Phase 7: Production Infrastructure Updates ✅ COMPLETE (January 12, 2025)
**PRODUCTION S3 CONFIGURATION FIXED:**
- ✅ **Issue Diagnosed**: Recipe generation failing due to old S3 credentials
- ✅ **Root Cause**: Production using healthtech bucket, dev using pti bucket
- ✅ **Solution Applied**: Updated production environment variables via DigitalOcean CLI
- ✅ **Deployment**: Successfully deployed with 7/7 phases ACTIVE
- ✅ **Test Coverage**: Created 13 S3 unit tests + E2E production validation
- ✅ **Documentation**: All BMAD files updated with current status

#### Phase 8: BMAD Multi-Agent Recipe Generation System ✅ COMPLETE (October 10, 2025)
**ALL 7 PHASES COMPLETE - PRODUCTION READY:**
- ✅ **8 Production Agents Implemented** (2,003 lines of code):
  - BaseAgent - Abstract base with lifecycle management (192 lines)
  - RecipeConceptAgent - Planning & chunking strategy (295 lines)
  - ProgressMonitorAgent - Real-time state tracking (360 lines)
  - BMADCoordinator - Workflow orchestration (168 lines)
  - NutritionalValidatorAgent - Auto-fix nutrition data (425 lines)
  - DatabaseOrchestratorAgent - Transactional saves (461 lines)
  - ImageGenerationAgent - DALL-E 3 integration (458 lines)
  - ImageStorageAgent - S3 upload handling (430 lines)

- ✅ **Frontend Integration** (Phase 7):
  - BMADRecipeGenerator component (560+ lines)
  - Real-time Server-Sent Events (SSE) progress tracking
  - Admin Dashboard 4th tab integration
  - Generate 1-100 recipes with live progress updates

- ✅ **API Endpoints**:
  - `POST /api/admin/generate-bmad` - Start bulk generation
  - `GET /api/admin/bmad-progress-stream/:batchId` - SSE stream
  - `GET /api/admin/bmad-metrics` - Agent performance metrics
  - `GET /api/admin/bmad-sse-stats` - Connection statistics

- ✅ **Comprehensive Test Suite** (4,312 total lines):
  - Unit Tests: 3,227 lines across 8 agent test files
  - BMAD E2E Tests: 327 lines (16 test cases)
  - Admin Tab Tests: 758 lines (33 test cases)
  - Test Coverage: 99.5% (210/211 tests passing)
  - Test/Code Ratio: 2.15:1 (excellent)

**How to Use:**
1. Navigate to: http://localhost:5000/admin
2. Click "BMAD Generator" tab (4th tab with robot icon)
3. Configure: Recipe count (1-100), meal types, fitness goals, features
4. Click "Start BMAD Generation"
5. Watch real-time SSE progress with agent status updates

**Performance Achieved:**
- ✅ 30 recipes generated in < 3 minutes
- ✅ < 5 seconds per recipe (non-blocking)
- ✅ Real-time SSE progress updates
- ✅ 95%+ image uniqueness validation
- ✅ Optimal chunking strategy (5 recipes/chunk)

**Documentation:**
- `BMAD_PHASE_1_COMPLETION_REPORT.md` - Foundation agents
- `BMAD_PHASE_2_COMPLETION_REPORT.md` - Validator & database
- `BMAD_PHASE_3_COMPLETION_REPORT.md` - Image generation
- `BMAD_PHASE_7_FRONTEND_INTEGRATION_DOCUMENTATION.md` - SSE integration
- `BMAD_RECIPE_GENERATION_IMPLEMENTATION_ROADMAP.md` - Complete 6-phase plan
- `TODO_URGENT.md` - Updated with completion status (Oct 10, 2025)

#### Phase 9: Admin Dashboard Tab Consolidation ✅ COMPLETE (October 11, 2025)
**3-TAB STRUCTURE IMPLEMENTATION:**
- ✅ **Tab Consolidation**: Reduced from 4 tabs to 3 tabs
  - Removed redundant "Admin" tab (73 lines deleted)
  - Renamed "Recipes" → "Recipe Library"
  - Renamed "Meal Plans" → "Meal Plan Builder"
  - Kept "BMAD Generator" tab unchanged

- ✅ **Action Toolbar**: Added to Recipe Library tab
  - Generate Recipes button
  - Review Queue button with count
  - Export Data button

- ✅ **E2E Test Suite**: Comprehensive Playwright tests
  - 758 lines of test code
  - 33 test cases covering all tab functionality
  - Mobile responsiveness tests
  - Keyboard navigation tests
  - Backward compatibility verification

**Files Modified:**
- `client/src/pages/Admin.tsx` - Reduced from 671 to 625 lines
- `test/e2e/admin-tab-consolidation.spec.ts` - 758-line test suite

**Documentation:**
- `TAB_CONSOLIDATION_IMPLEMENTATION_SUMMARY.md` - Complete implementation report

#### Current Phase: System Ready for Next Development Cycle
**PRODUCTION FULLY OPERATIONAL:**
- All core features (Stories 1.1-1.9) fully implemented and tested
- BMAD Multi-Agent Recipe Generation System fully operational with SSE
- Admin Dashboard streamlined to 3-tab structure
- Production recipe generation with correct S3 configuration
- Customer meal plan delete feature added and tested
- Comprehensive test suite (4,312+ lines of test code)
- Ready for: New feature development, performance optimization, or production scaling

### BMAD Workflow
- **Type**: Brownfield (existing project)
- **Workflow File**: `/.bmad-core/workflows/brownfield-fullstack.yaml`
- **Current Epic**: FitnessMealPlanner Complete System Documentation
- **Stories Ready**: 9 stories defined in PRD, awaiting sharding

### Key BMAD Agents
- **PM (John)**: Product Manager - PRDs and stories
- **PO**: Product Owner - Document validation and sharding
- **SM**: Scrum Master - Story creation
- **Dev**: Developer - Implementation
- **QA**: Quality Assurance - Code review
- **Architect**: Technical documentation
- **Analyst**: Requirements analysis

## 🎯 LANDING PAGE CONTENT MANAGEMENT

### QUICK REFERENCE: "I want to work on my landing page"

**WHERE TO EDIT:** `public/landing/content/`

**HOW TO EDIT:**
1. Open any `.md` file in `public/landing/content/`
2. Edit the text (keep the #, ##, ### structure)
3. Save the file
4. Refresh browser to see changes

**WHAT YOU CAN EDIT:**
- `hero.md` - Main headline and CTAs
- `pricing.md` - All pricing tiers
- `testimonials.md` - Customer quotes
- `features.md` - Feature descriptions
- `faq.md` - Questions and answers
- `stats.md` - Numbers and metrics

**VIEW LANDING PAGE:** http://localhost:4000/landing/index.html

**COMPLETE GUIDE:** See `public/landing/content/README.md`

## Session Progress Tracking
- **Last Major Update:** Landing Page with Markdown CMS (September 17, 2025)
- **Previous Update:** Test Credentials Standardization (September 15, 2025)
- **Mission Status:** ✅ PRODUCTION FULLY OPERATIONAL - Landing Page Ready
- **Current Focus:** Landing page content management via markdown files
  - **Test Accounts Fixed:** All three accounts (admin, trainer, customer) verified working
  - **Seed Scripts Updated:** Both JS and TypeScript seed scripts use correct passwords
  - **SQL Scripts Fixed:** Updated bcrypt hashes for direct SQL insertion
  - **Automated Testing:** Created test-credentials.js for verification
  - **BMAD Documentation:** Updated PLANNING.md and tasks.md with fix details
- **September 15, 2025 Session Complete:**
  - **Test Credentials:** Standardized across all environments ✅
  - **Admin Account:** admin@fitmeal.pro / AdminPass123 ✅
  - **Trainer Account:** trainer.test@evofitmeals.com / TestTrainer123! ✅
  - **Customer Account:** customer.test@evofitmeals.com / TestCustomer123! ✅
  - **Documentation:** BMAD process files updated ✅
- **January 6, 2025 Session Complete:**
  - **Development Server:** Fixed Vite hanging issue through Docker rebuild ✅
  - **S3 Credentials:** Updated with new DigitalOcean Spaces keys ✅
  - **Recipe Generation:** Fully functional with AI image creation ✅
  - **Image Uploads:** Working perfectly to S3/DigitalOcean Spaces ✅
  - **API Endpoints:** All responding with optimal performance ✅
- **Implementation Results:** 
  - **Recipe System Health:** ✅ FULLY OPERATIONAL
    - Recipe Generation: Working perfectly ✅
    - Recipe Approval: Auto-approving ✅
    - Recipe Count Updates: Fixed ✅
    - Image Generation: S3 uploads working ✅
    - Test Framework: Rate limit bypass active ✅
    - Playwright Tests: 3/3 passing ✅
  - **Test Accounts:** ✅ All three test accounts verified and production-ready
    - Admin: `admin@fitmeal.pro` / `AdminPass123` ✅ VERIFIED
    - Trainer: `trainer.test@evofitmeals.com` / `TestTrainer123!` ✅ VERIFIED
    - Customer: `customer.test@evofitmeals.com` / `TestCustomer123!` ✅ VERIFIED
  - **Quality Assurance:** ✅ Comprehensive test suite created
    - Unit Tests: 2,175+ lines of test coverage ✅
    - E2E Tests: 3 comprehensive Playwright suites ✅
    - Production Tests: Live environment validation ✅
  - **Documentation:** ✅ Complete documentation suite updated
    - planning.md: Phase 5 achievements documented ✅
    - tasks.md: Milestone 22 completed ✅
    - prd.md: Quality thresholds achieved ✅
    - test-documentation.md: Comprehensive test report created ✅
    - CLAUDE.md: Session progress updated ✅
- **System Status:** 🟢 SYSTEM EXCELLENCE - All Components 100% Operational with S3 Integration
- **January 12, 2025 Session Complete:**
  - **Production Diagnosis:** Identified S3 credential mismatch ✅
  - **Environment Update:** Updated production to use pti bucket ✅
  - **Deployment:** Successfully deployed via DigitalOcean CLI ✅
  - **Test Coverage:** Added 13 S3 unit tests + E2E validation ✅
  - **Documentation:** Updated all BMAD files with latest status ✅
- **September 15, 2025 Session Complete:**
  - **Test Credentials:** Standardized all accounts with correct passwords ✅
  - **Bcrypt Hashes:** Generated new hashes for SQL scripts ✅
  - **Branch Synchronization:** Updated 5 of 6 branches to match main ✅
  - **GitHub Push:** All synchronized branches pushed to remote ✅
  - **BMAD Documentation:** Updated PLANNING.md, tasks.md, BMAD_WORKFLOW_STATUS.md, SESSION_STATUS.md ✅

### December 5, 2024 Session - Progress TAB Enhancement
- **Key Fixes Applied:**
  - Fixed MeasurementsTab.tsx date formatting crash with isValid() checks
  - Standardized import paths to use @ aliases throughout ProgressTracking.tsx
  - Enhanced mobile table responsiveness with overflow-x-auto classes
  - Added safe fallbacks for null/invalid dates in all date displays
  - Restarted Docker container to ensure changes took effect
- **Testing Coverage:**
  - Created unit tests: CustomerProfile.test.tsx, ProgressTracking.test.tsx, MeasurementsTab.test.tsx (2,175+ lines)
  - Created E2E tests: debug-progress-tab.test.ts, final-progress-tab-test.ts
  - Verified all Progress sub-tabs (Measurements, Photos, Goals) functioning
  - Tested mobile viewports: 375px, 768px, desktop
- **Files Modified:**
  - client/src/components/progress/MeasurementsTab.tsx (date validation fix)
  - client/src/components/ProgressTracking.tsx (import path fixes)
  - Multiple test files created in test/e2e/ directory
  - BMAD documentation files updated (tasks.md, planning.md, prd.md, CLAUDE.md)
- **Verification:** Progress TAB confirmed working with "Progress Tracking header visible: true"

- **Key Deliverables:** Test account integration, database relationship architecture, comprehensive E2E testing
- **QA Infrastructure:** ✅ Test accounts with proper FK relationships, multi-environment validation
- **Testing Coverage:** ✅ Playwright E2E tests, API validation, production verification
- **Production Verification:** ✅ Live at https://evofitmeals.com with all test accounts operational
- **Technical Achievement:** 100% feature complete platform with comprehensive test environment
- **Current Status:** BMAD Testing Campaign complete - Recipe generation system 100% validated and operational
- **Next Session:** Ready for new feature development, performance optimization, or BMAD Core integration

### Previous Achievement Archive
- **August 20, 2025:** Multi-Agent Production Diagnostic Investigation - Health Protocol removal confirmed
- **Admin Testing:** Admin component tests improved from 35% to 78% pass rate (123% improvement)
- **Deployment Pipeline:** 7-10 minute deployment windows established with comprehensive documentation

### Multi-Agent Investigation Summary
- **Production Environment:** ✅ Confirmed healthy (Health Protocol successfully removed)
- **Deployment Pipeline:** ✅ Documented and optimized (7-10 minute deployment windows established)
- **QA Verification:** ✅ Comprehensive production testing completed (100% Health Protocol elimination)
- **Performance Metrics:** ✅ Exceptional (39ms response times, optimal loading speeds)
- **Documentation Suite:** ✅ 7 comprehensive reports created for future reference
- **Process Optimization:** ✅ Deployment best practices and troubleshooting procedures established

## Comprehensive Documentation Reference

### Production & Deployment Documentation Suite
**Created from August 2025 Multi-Agent Investigation:**

#### Core Deployment Documents
- **`DO_DEPLOYMENT_GUIDE.md`**: Original DigitalOcean deployment procedures
- **`DEPLOYMENT_PROCESS_DOCUMENTATION.md`**: Complete deployment pipeline analysis (50+ pages)
- **`DEPLOYMENT_BEST_PRACTICES.md`**: Optimized deployment procedures and safety protocols  
- **`DEPLOYMENT_TROUBLESHOOTING_GUIDE.md`**: Comprehensive problem resolution guide (20+ scenarios)

#### Production Investigation Reports
- **`PRODUCTION_DIAGNOSTIC_REPORT.md`**: Health Protocol removal investigation results
- **`QA_PRODUCTION_TEST_REPORT.md`**: Comprehensive production verification testing
- **`HEALTH_PROTOCOL_REMOVAL_VERIFICATION.md`**: Specific feature removal confirmation
- **`DEPLOYMENT_DOCUMENTATION_SUMMARY.md`**: Executive overview of documentation suite

#### When to Reference These Documents
- **New team member onboarding**: Start with `DEPLOYMENT_DOCUMENTATION_SUMMARY.md`
- **Production deployments**: Follow `DEPLOYMENT_BEST_PRACTICES.md`
- **Deployment issues**: Use `DEPLOYMENT_TROUBLESHOOTING_GUIDE.md`
- **Performance concerns**: Reference `QA_PRODUCTION_TEST_REPORT.md`
- **Process optimization**: Review `DEPLOYMENT_PROCESS_DOCUMENTATION.md`

### Quick Reference Commands
```bash
# Verify deployment completion
doctl apps get 600abc04-b784-426c-8799-0c09f8b9a958

# Check specific deployment status  
doctl apps get-deployment 600abc04-b784-426c-8799-0c09f8b9a958 <deployment-id>

# Trigger manual deployment
doctl create-deployment 600abc04-b784-426c-8799-0c09f8b9a958

# Production health check
curl -I https://evofitmeals.com
```

## Best Practices & Advanced Strategies
- **Medina Strategy Reference**: See `Claude_Strategy.md` for comprehensive Claude Code best practices
- **Key Techniques for This Project**:
  - Use Serena MCP for semantic code search in this large codebase
  - Implement PRP framework for new feature development
  - Leverage sub-agents for specialized tasks (UI, backend, testing)
  - Use parallel development with git worktrees for A/B testing features
  - Apply token optimization strategies to reduce costs
  - **Multi-agent investigation approach**: Deploy specialized agents for complex production issues

## Claude Code Router Configuration

### Overview
Claude Code Router is configured to use native Claude models by default. Alternative models (like Qwen) can be used when needed.

### Running Claude Code

#### Default: Use Native Claude Models (RECOMMENDED)
```powershell
cd C:\Users\drmwe\claude-workspace\FitnessMealPlanner
claude code
```
This uses Claude models directly through your Anthropic account.

**Quick Launch Script:**
```powershell
./use-claude-default.ps1
```

#### Alternative: Use with Router Proxy (ONLY when Claude credits exhausted)
```powershell
cd C:\Users\drmwe\claude-workspace\FitnessMealPlanner
claude code --api-proxy http://127.0.0.1:8080
```
This routes through the proxy but still uses native Claude by default.

**IMPORTANT:** If you get OpenRouter errors, ensure you're NOT using the proxy. Run `claude code` directly without any proxy arguments.

### Switching to Alternative Models

#### When Claude Credits Run Out
Switch to Qwen models using the `/model` command within Claude Code:

**Available Qwen Models:**
- `/model openrouter-qwen,qwen/qwen-2.5-72b-instruct` - General purpose (recommended)
- `/model openrouter-qwen,qwen/qwen-2.5-coder-32b-instruct` - Optimized for coding
- `/model openrouter-qwen,qwen/qwq-32b-preview` - Best for reasoning tasks
- `/model openrouter-qwen,qwen/qwen-2-vl-72b-instruct` - Vision-language model

**Other Available Models via OpenRouter:**
- `/model openrouter,google/gemini-2.5-pro-preview` - Gemini Pro
- `/model openrouter,anthropic/claude-3.5-sonnet` - Claude via OpenRouter
- `/model openrouter,deepseek/deepseek-chat` - DeepSeek

### Quick Alias for PowerShell
Add to your PowerShell profile for quick access:
```powershell
function claude-qwen {
    claude code --api-proxy http://127.0.0.1:8080 --model openrouter-qwen,qwen/qwen-2.5-72b-instruct
}
```

### Router Service Management

#### Check Router Status
```powershell
Get-Process | Where-Object {$_.CommandLine -like "*claude-code-router*"}
```

#### Restart Router Service
```powershell
# Stop existing service
Get-Process | Where-Object {$_.CommandLine -like "*claude-code-router*"} | Stop-Process -Force

# Start service
Start-Process node -ArgumentList "C:\Users\drmwe\AppData\Roaming\npm\node_modules\@musistudio\claude-code-router\dist\cli.js", "start" -NoNewWindow
```

### Configuration Location
- Router config: `~/.claude-code-router/config.json`
- Logs: `~/.claude-code-router/claude-code-router.log`

### Best Practices
1. Use native Claude models by default for all tasks
2. Only switch to alternative models (like Qwen) when absolutely necessary
3. Monitor usage to maintain optimal performance
4. Prioritize Claude models for their superior capabilities and consistency

### Model Switching (Only When Necessary)

**NOTE**: Model switching should only be used when Claude credits are exhausted or for specific testing purposes.

If you need to switch models, first ensure Claude Code is running with the router:
```powershell
cd C:\Users\drmwe\claude-workspace\FitnessMealPlanner
claude code --api-proxy http://127.0.0.1:8080
```

Then use these commands within Claude Code:

#### When you say "change to qwen3":
```
/model openrouter,qwen/qwen3-coder:free
```

#### Other Quick Commands:
- **"change to qwen coder"**: `/model openrouter-qwen,qwen/qwen-2.5-coder-32b-instruct`
- **"change to qwen general"**: `/model openrouter-qwen,qwen/qwen-2.5-72b-instruct`
- **"change to qwen reasoning"**: `/model openrouter-qwen,qwen/qwq-32b-preview`
- **"change to local qwen"**: `/model ollama,qwen2.5-coder:latest`
- **"change to gemini"**: `/model openrouter,google/gemini-2.5-pro-preview`
- **"change to deepseek"**: `/model openrouter,deepseek/deepseek-chat`


---

## 🤖 BMAD-METHOD INTEGRATION

**Status:** ✅ BMAD v4.44.0 Installed
**Last Updated:** October 13, 2025
**Global CTO Guidance:** C:\Users\drmwe\Claude\CLAUDE.md

### Quick Reference

**For comprehensive BMAD protocol and strategic guidance, refer to:**
```
C:\Users\drmwe\Claude\CLAUDE.md
```

This section provides **FitnessMealPlanner-specific** BMAD guidance.

---

### 🏗️ BMAD Installation (This Project)

**Installed Instances:** 3

1. **`.bmad-core`** - Core framework with 10 agents
2. **`.bmad-creative-writing`** - Creative writing & documentation agents
3. **`.bmad-infrastructure-devops`** - DevOps & infrastructure agents

**Version:** 4.44.0
**Master Source:** C:\Users\drmwe\Claude\BMAD-METHOD-MASTER

---

### 👥 Available Agents

#### Core Agents (10) - `.bmad-core/`
- `@analyst` - Business and market analysis
- `@pm` - Product requirements and PRDs
- `@architect` - System architecture design
- `@ux-expert` - UI/UX specifications
- `@po` - Document validation and sharding
- `@sm` - Story creation from epics
- `@dev` - Implementation and coding
- `@qa` - Test architect (risk, design, review, nfr, trace, gate)
- `@bmad-master` - Multi-purpose agent
- `@bmad-orchestrator` - Web UI orchestration (not for IDE)

#### Creative Writing Pack - `.bmad-creative-writing/`
**Agents:** Character Psychologist, Plot Architect, World Builder, Dialog Specialist, Editor, Narrative Designer, Genre Specialist, Beta Reader, Book Critic, Cover Designer

**Use Cases for FitnessMealPlanner:**
- User-facing documentation (help guides, tooltips)
- Marketing copy for landing pages
- Recipe descriptions and meal plan narratives
- Email templates and notifications
- Blog content about nutrition and fitness

#### Infrastructure DevOps Pack - `.bmad-infrastructure-devops/`
**Agent:** Infrastructure/DevOps Platform Specialist

**Use Cases for FitnessMealPlanner:**
- Docker compose configuration
- DigitalOcean deployment automation
- CI/CD pipeline design
- Database migration strategies
- Production monitoring setup

---

### 🎯 When to Use BMAD (FitnessMealPlanner Context)

#### ✅ USE BMAD For:

**Recipe System Features:**
- New recipe generation improvements
- Recipe search/filter enhancements
- Recipe categorization features
- Nutrition calculation changes

**Meal Planning Features:**
- Meal plan generation algorithm updates
- Multi-plan management features
- Meal plan assignment workflows
- PDF export enhancements

**User Management:**
- Authentication improvements
- Role-based access control changes
- Customer invitation system updates
- Trainer-customer relationship features

**Progress Tracking:**
- Measurements tracking enhancements
- Photo progress features
- Goals and milestones system
- Analytics dashboard additions

**Infrastructure:**
- Database schema changes
- API architecture updates
- Deployment automation
- Performance optimization projects

#### ❌ Use Traditional Development For:

- Bug fixes (typos, broken links, style issues)
- One-line code changes
- Urgent production hotfixes
- Simple UI text updates
- Minor styling adjustments

---

### 🔄 Recommended BMAD Workflows

#### Workflow 1: New Feature (Medium-High Complexity)

**Example:** Add meal plan sharing feature

```bash
# Planning Phase
@pm Create PRD for meal plan sharing feature
@architect Design architecture (reference: docs/architecture.md + PRD)
@po Validate alignment and shard into stories

# Development Phase (for each story)
@qa *risk docs/stories/[story].md          # Assess risks
@qa *design docs/stories/[story].md        # Create test strategy
@dev Implement docs/stories/[story].md     # Code + tests
@qa *review docs/stories/[story].md        # Final review + gate
```

**Time Investment:** 2-4 hours planning, saves 10-20 hours in rework

#### Workflow 2: Recipe System Enhancement

**Example:** Improve recipe image generation

```bash
# Quick Architecture Review
@architect Review current recipe image architecture

# Create Story
@sm Create story for recipe image enhancement (reference: architecture)

# Implement with QA
@qa *risk docs/stories/[story].md
@dev Implement with comprehensive tests
@qa *nfr docs/stories/[story].md           # Check performance
@qa *review docs/stories/[story].md
```

#### Workflow 3: Infrastructure/DevOps Task

**Example:** Optimize Docker startup

```bash
# Use Infrastructure DevOps agent
@infra-devops-platform Analyze Docker startup performance
@infra-devops-platform Design optimization strategy
@dev Implement Docker compose improvements
@infra-devops-platform Validate infrastructure changes
```

---

### 💡 Project-Specific BMAD Best Practices

#### 1. Recipe Generation (AI-Powered)

**Current System:** BMAD Multi-Agent Recipe Generation
- Uses 8 specialized agents
- Server-Sent Events (SSE) for real-time progress
- Generates 1-100 recipes with AI images

**When Modifying:**
```bash
# Always assess risk first (complex AI system)
@qa *risk docs/stories/recipe-generation-[feature].md

# Architect should review AI integration points
@architect Review recipe generation architecture for [change]

# Dev with extensive testing
@dev Implement [change] (reference: server/services/recipeGenerator.ts)

# NFR assessment critical (performance + cost)
@qa *nfr docs/stories/recipe-generation-[feature].md
```

#### 2. Database Schema Changes

**Drizzle ORM + PostgreSQL**

```bash
# Always create PRD + Architecture for schema changes
@pm Document database schema change for [feature]
@architect Design database migration strategy

# SM creates detailed story with rollback plan
@sm Create story for database migration (include rollback)

# Dev implements with thorough testing
@dev Implement migration + comprehensive tests
@qa *review (focus on data integrity and rollback)
```

#### 3. PDF Export Features

**Puppeteer + EJS Templates**

```bash
# Use Creative Writing agents for content
@narrative-designer Improve meal plan PDF narrative
@editor Polish PDF text for clarity

# Architect for template structure
@architect Design PDF template architecture for [feature]

# Dev for implementation
@dev Implement PDF template changes
@qa *review (test across different meal plan types)
```

#### 4. Deployment Automation

```bash
# Use Infrastructure DevOps agent
@infra-devops-platform Review current deployment process
@infra-devops-platform Design automated deployment pipeline

# Document as infrastructure story
@sm Create infrastructure story for deployment automation

# Implement with validation
@dev Implement deployment automation
@infra-devops-platform Validate deployment process
```

---

### 🚀 Quick BMAD Commands (FitnessMealPlanner)

#### Analyze Recipe Feature Request
```bash
@pm Create PRD for [recipe feature]
@architect Design architecture (reference: server/services/recipeGenerator.ts)
@po Shard into implementable stories
```

#### Add New Meal Planning Feature
```bash
@pm Create PRD for [meal plan feature]
@architect Design architecture (reference: docs/architecture.md)
@ux-expert Create UI specifications for [feature]
@po Validate and shard
```

#### Improve Documentation
```bash
@narrative-designer Create user guide for [feature]
@editor Polish documentation for clarity
@dev Integrate documentation into app
```

#### Optimize Production Deployment
```bash
@infra-devops-platform Analyze current deployment
@infra-devops-platform Design optimization strategy
@dev Implement deployment improvements
```

#### Emergency Production Fix (Skip BMAD)
```bash
# For urgent issues only
@dev Fix [production issue] in [file]
# Document after the fact
@pm Add [issue] to PRD backlog for proper resolution
```

---

### 🎯 Agent Selection Guide (FitnessMealPlanner)

| Task Type | Primary Agent | Secondary Agents | Notes |
|-----------|--------------|------------------|-------|
| **Recipe Features** | @architect | @dev, @qa | Review recipeGenerator.ts architecture |
| **Meal Planning** | @pm → @architect | @dev, @qa | Start with requirements |
| **UI/UX Changes** | @ux-expert | @dev, @qa | Get design specs first |
| **Database Changes** | @architect | @pm, @dev | Always document migrations |
| **PDF Export** | @narrative-designer | @architect, @dev | Polish content first |
| **Deployment** | @infra-devops-platform | @dev | Use DevOps pack |
| **User Guides** | @narrative-designer → @editor | - | Creative Writing pack |
| **Testing Strategy** | @qa | @dev | Use *risk, *design, *review |
| **Bug Fixes** | @dev | - | Skip BMAD for simple fixes |

---

### 📁 BMAD Document Structure (FitnessMealPlanner)

```
FitnessMealPlanner/
├── docs/
│   ├── prd.md                  # Product requirements (if using BMAD planning)
│   ├── architecture.md         # System architecture (if using BMAD planning)
│   ├── epics/                 # Sharded epic files
│   │   └── [epic-number]-[name].md
│   ├── stories/               # Sharded story files
│   │   └── [epic].[story]-[name].md
│   └── qa/
│       ├── assessments/       # Risk profiles, test designs, traces, nfr
│       └── gates/            # Quality gate decisions
├── .bmad-core/               # Core BMAD framework
├── .bmad-creative-writing/   # Creative writing agents
└── .bmad-infrastructure-devops/ # DevOps agents
```

---

### 🔧 Maintenance & Updates

#### Update BMAD Installation

**From Master:**
```bash
cd /c/Users/drmwe/Claude
cp -r BMAD-METHOD-MASTER/bmad-core FitnessMealPlanner/.bmad-core
cp -r BMAD-METHOD-MASTER/expansion-packs/bmad-creative-writing FitnessMealPlanner/.bmad-creative-writing
cp -r BMAD-METHOD-MASTER/expansion-packs/bmad-infrastructure-devops FitnessMealPlanner/.bmad-infrastructure-devops
```

**Verify Installation:**
```bash
ls -la .bmad-core/agents/     # Should show 10 agents
ls -la .bmad-creative-writing/agents/  # Should show 10 writing agents
ls -la .bmad-infrastructure-devops/agents/  # Should show infrastructure agent
```

---

### 🐛 Troubleshooting

#### Issue: Agent Not Found
**Symptom:** `@agent` command doesn't work

**Solution:**
```bash
# Verify BMAD installation
ls .bmad-core/agents/

# Check agent name (case-sensitive)
# Claude Code: Use @agent or /agent
# Cursor/Windsurf: Use @agent
```

#### Issue: Story Too Complex
**Symptom:** Story is > 500 lines, Dev agent overwhelmed

**Solution:**
```bash
# Ask PO to split story
@po Split story [name] into smaller stories

# Or ask SM to refine
@sm Refine story [name] into smaller tasks
```

#### Issue: Quality Gate FAIL
**Symptom:** @qa *review returns FAIL

**Solution:**
```bash
# Review QA assessment details
@qa *review docs/stories/[story].md

# Fix P0 issues first
@dev Fix [critical issue] in [story]

# Re-run gate
@qa *gate docs/stories/[story].md
```

---

### 📚 Resources

**Global CTO Guidance:**
- C:\Users\drmwe\Claude\CLAUDE.md (comprehensive BMAD protocol)

**Project Documentation:**
- PLANNING.md (session progress tracking)
- docs/architecture.md (system architecture)
- docs/prd.md (product requirements - if using BMAD)

**BMAD Documentation:**
- C:\Users\drmwe\Claude\BMAD-METHOD-MASTER\docs\user-guide.md
- C:\Users\drmwe\Claude\BMAD-METHOD-MASTER\docs\core-architecture.md

**Support:**
- Discord: https://discord.gg/gk8jAdXWmj
- GitHub: https://github.com/bmad-code-org/BMAD-METHOD

---

### ✅ Success Metrics (FitnessMealPlanner + BMAD)

**Track:**
- Stories using BMAD workflow (target: medium-high complexity features)
- QA gate pass rate (target: >85%)
- Story rework rate (target: <15%)
- Test coverage on BMAD stories (target: >80%)

**Quality Indicators:**
- Recipe generation features: Always use BMAD (complex AI system)
- Database migrations: Always use BMAD (data integrity critical)
- UI enhancements: Use BMAD for multi-component changes
- Bug fixes: Skip BMAD (unless complex root cause)

---

### 🏗️ BMAD Brownfield Development Strategy

**Critical Context:** FitnessMealPlanner is a **brownfield project** (existing codebase with 100+ files, production deployment, active users).

#### What is Brownfield?

**Brownfield** = Working with existing code (adding features, fixing bugs, refactoring)
**Greenfield** = Starting from scratch

FitnessMealPlanner Status:
- ✅ Mature production codebase
- ✅ Active users at https://evofitmeals.com
- ✅ Complex multi-component architecture
- ✅ Database with existing data

#### 📋 Two Brownfield Approaches

##### **Approach A: PRD-First ⭐ RECOMMENDED FOR FITNESSMEALPLANNER**

**Best for:**
- Large codebases (like FitnessMealPlanner with 100+ files)
- When you know exactly what feature you want to build
- Complex features spanning multiple areas
- Time-sensitive development

**Workflow:**
```bash
# Step 1: Create PRD with brownfield context
@pm *create-brownfield-prd for [feature name]
# PM analyzes codebase and identifies affected areas

# Step 2: Document only relevant areas (guided by PRD)
@architect *document-project (reference PRD to focus on specific areas)
# Architect focuses ONLY on areas mentioned in PRD

# Step 3: Validate and shard
@po Validate PRD and architecture alignment
@po Shard PRD into epics and stories

# Step 4: Begin development cycle
@sm Create first story from sharded epic
@qa *risk docs/stories/[story].md
@dev Implement docs/stories/[story].md
@qa *review docs/stories/[story].md
```

**Advantages:**
- ✅ **Efficient** - Only documents what you need
- ✅ **Focused** - Clear scope from the start
- ✅ **Scalable** - Works with massive codebases
- ✅ **Fast** - Skips irrelevant code documentation

**Example for FitnessMealPlanner:**
```bash
# Adding meal plan sharing feature
@pm *create-brownfield-prd for meal plan sharing
# PM identifies: meal_plans table, sharing logic, API endpoints, UI components

@architect *document-project (focus: meal plans module, sharing APIs, auth system)
# Architect documents only meal plan-related areas

@po Shard PRD into implementable stories
@sm Create story for sharing API endpoint
@dev Implement with tests
@qa *review story
```

##### **Approach B: Document-First**

**Best for:**
- Smaller codebases (< 50 files)
- Unknown systems needing exploration
- When you're not sure what needs changing
- Comprehensive system understanding needed

**Workflow:**
```bash
# Step 1: Document everything first
@architect *document-project (comprehensive mode)
# Architect documents entire system

# Step 2: Create PRD with full context
@pm Create PRD for [feature] (reference: complete architecture)

# Step 3: Validate and shard
@po Validate PRD and architecture alignment
@po Shard PRD into epics and stories

# Step 4: Begin development
@sm Create first story from sharded epic
```

**Advantages:**
- ✅ **Thorough** - Complete system understanding
- ✅ **Discovery** - Uncovers hidden dependencies
- ✅ **Educational** - Great for new team members
- ✅ **Safety** - Less chance of missing critical areas

**When to Use Document-First:**
- First time working on FitnessMealPlanner
- Major refactoring affecting entire codebase
- Need to understand system architecture comprehensively

#### 🎯 FitnessMealPlanner Recommended Approach

**Use Approach A (PRD-First) for:**
- ✅ All new feature development
- ✅ Recipe system enhancements
- ✅ Meal planning improvements
- ✅ UI/UX updates
- ✅ Integration additions
- ✅ Database schema changes

**Reasoning:**
- FitnessMealPlanner is a large, mature codebase
- Most features only affect specific modules
- Can't afford time to document entire system for each feature
- Need focused, efficient development approach
- Production system requires minimal disruption

#### 🚀 Quick Start Command

**When you're ready to add a new feature:**

```bash
# Start with this command
@pm *create-brownfield-prd for [your feature name]

# Then follow the PRD-First workflow above
```

#### 💡 Brownfield Best Practices

**DO:**
- ✅ Always start with `@pm *create-brownfield-prd`
- ✅ Let PM identify affected areas before documenting
- ✅ Use `@architect *document-project` with specific focus
- ✅ Reference existing architecture docs when available
- ✅ Use `@qa *risk` for regression assessment
- ✅ Test backward compatibility thoroughly

**DON'T:**
- ❌ Document entire codebase for small features
- ❌ Skip PRD creation for "quick" features
- ❌ Ignore existing patterns and conventions
- ❌ Forget to assess regression risks
- ❌ Deploy without comprehensive testing

#### 📊 Complexity Assessment

Use this to decide if BMAD brownfield process is needed:

| Complexity | Files Affected | BMAD Brownfield? | Approach |
|------------|---------------|------------------|----------|
| **Low** | 1 file, <50 lines | Optional | Quick fix, skip BMAD |
| **Medium** | 2-3 files, 50-200 lines | Recommended | PRD-First (focused) |
| **High** | 4+ files, 200+ lines | Strongly Recommended | PRD-First (comprehensive) |
| **Critical** | Database schema, auth, core features | Mandatory | PRD-First + extensive QA |

#### 🔄 Integration with Existing Workflows

**Combine with Recipe Generation:**
```bash
# Enhancing BMAD recipe generation system
@pm *create-brownfield-prd for recipe image quality improvement
@architect *document-project (focus: recipeGenerator.ts, image generation agents)
@qa *risk (critical: AI system changes)
@dev Implement with extensive testing
@qa *nfr (performance validation critical)
```

**Combine with Deployment:**
```bash
# Adding deployment automation
@pm *create-brownfield-prd for automated deployment pipeline
@architect *document-project (focus: Docker, DigitalOcean, CI/CD)
@infra-devops-platform Design deployment strategy
@dev Implement automation scripts
@qa *review deployment process
```

#### 📚 Additional Resources

**Comprehensive Brownfield Guide:**
- C:\Users\drmwe\Claude\BMAD_BROWNFIELD_GUIDE.md (portfolio-wide guide)

**BMAD Official Docs:**
- C:\Users\drmwe\Claude\BMAD-METHOD-MASTER\docs\working-in-the-brownfield.md

**CTO Strategic Guidance:**
- C:\Users\drmwe\Claude\CLAUDE.md (Section: BROWNFIELD DEVELOPMENT)

---

**BMAD Integration Complete for FitnessMealPlanner**
**Version:** 1.1.0 | **Updated:** October 13, 2025 | **Brownfield Strategy Added**
