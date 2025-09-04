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

### Current BMAD Status (August 29, 2025)
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
- Next: Story 2.0 - BMAD Core Integration (Optional enhancement)

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

## Session Progress Tracking
- **Last Major Update:** Admin Test Account Implementation & Comprehensive Testing (September 3, 2025)
- **Previous Update:** Test Account Integration & QA Infrastructure Complete (September 3, 2025)
- **Mission Status:** ✅ BMAD SOFTWARE DEVELOPMENT PROCESS - COMPLETE + Admin Test Account Fully Operational
- **Achievement:** Successfully implemented and validated admin test account with comprehensive Playwright testing
- **Implementation Results:** 
  - **Story 1.1-1.9:** ✅ ALL STORIES COMPLETE (100% PRD implementation)
  - **Admin Test Account:** ✅ `admin@fitmeal.pro` fully operational with AdminPass123
  - **Admin Dashboard:** ✅ Recipe management interface validated (144 recipes, 12 per page)
  - **Playwright Test Suite:** ✅ 6 comprehensive test files created for admin testing
  - **Authentication Flow:** ✅ Admin login and navigation working perfectly
  - **Recipe Display:** ✅ 12 recipe cards rendering correctly with full data
  - **Admin Actions:** ✅ Generate, Review, Export functions accessible
  - **Mobile Responsive:** ✅ Touch targets and viewport handling optimized
  - **Rate Limiting:** ✅ Issues identified and resolved through Docker restart
  - **API Performance:** ✅ ~200ms response times with proper data structure
  - **Error Handling:** ✅ 0 critical errors in production
  - **Test Coverage:** ✅ Edge cases, error scenarios, and UX flows validated
  - **BMAD Files:** ✅ Updated with current session achievements
- **System Status:** 🟢 PRODUCTION STABLE - All critical issues resolved
- **Key Deliverables:** Test account integration, database relationship architecture, comprehensive E2E testing
- **QA Infrastructure:** ✅ Test accounts with proper FK relationships, multi-environment validation
- **Testing Coverage:** ✅ Playwright E2E tests, API validation, production verification
- **Production Verification:** ✅ Live at https://evofitmeals.com with all test accounts operational
- **Technical Achievement:** 100% feature complete platform with comprehensive test environment
- **Current Status:** Production stable with admin test account fully validated and operational
- **Next Session:** Ready for BMAD Core integration with production database and admin analytics dashboard

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
