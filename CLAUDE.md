# FitnessMealPlanner Development Guidelines

## Project Overview
**Name:** FitnessMealPlanner  
**Description:** A comprehensive meal planning application for fitness professionals and their clients  
**Tech Stack:** React, TypeScript, Node.js, Express, PostgreSQL, Drizzle ORM, Vite, Docker

## 🌟 CRITICAL: PRIMARY DEVELOPMENT BRANCH
**Always work from the `qa-ready` branch - it is the most up-to-date branch with all features.**

### Branch Hierarchy:
1. **qa-ready** - 🥇 PRIMARY DEVELOPMENT/TESTING BRANCH (use this!)
   - Contains: Health Protocol feature (fully working)
   - Contains: All latest QA updates and bug fixes
   - Status: Most current and complete codebase

2. **qa-ready-clean** - 🥈 Secondary (behind qa-ready)
3. **main** - 🥉 Production (significantly behind, merge qa-ready when ready for prod)

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

### Before Starting Any Development Task
1. **ALWAYS** ensure you're on qa-ready branch: `git checkout qa-ready`
2. **ALWAYS** start Docker development environment first
3. Check git status: `git status`
4. Pull latest changes: `git pull origin qa-ready`
5. Create feature branch: `git checkout -b feature/<description>` (from qa-ready)

### Branch Management Commands
```bash
# Always start from qa-ready
git checkout qa-ready
git pull origin qa-ready

# For feature work
git checkout -b feature/your-feature-name
# ... do work ...
git add .
git commit -m "your changes"
git push origin feature/your-feature-name

# Merge back to qa-ready when ready
git checkout qa-ready
git merge feature/your-feature-name
git push origin qa-ready
```

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

### Completed Features (qa-ready branch)
- ✅ User authentication (Admin, Trainer, Customer roles)
- ✅ Recipe management system
- ✅ Meal plan generation
- ✅ Multiple meal plans per customer
- ✅ PDF export (both client-side and server-side)
- ✅ Responsive design for all pages
- ✅ Customer invitation system
- ✅ **Health Protocol feature** (Longevity & Parasite Cleanse protocols for trainers)
- ✅ Profile image upload system for all user roles
- ✅ Customer progress tracking (measurements, photos, goals)
- ✅ Trainer-customer meal plan assignment workflow

### Health Protocol Feature (New!)
- **Access**: Available at `/trainer/health-protocols` for trainers
- **Features**: Create longevity and parasite cleanse protocols
- **Components**: `TrainerHealthProtocols.tsx`, `SpecializedProtocolsPanel.tsx`
- **Database**: `trainerHealthProtocols` and `protocolAssignments` tables
- **Status**: ✅ Fully functional in qa-ready branch

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

### MCP Integration
- **GitHub MCP**: Code repository management
- **Context7 MCP**: Technical documentation access
- **DigitalOcean MCP**: Production infrastructure monitoring

## Session Progress Tracking
- Last update: Manual deployment process documented and tested
- Current focus: Streamlined deployment workflow for proxy-restricted environments
- Next priorities: Performance optimization, additional features

## Best Practices & Advanced Strategies
- **Medina Strategy Reference**: See `Claude_Strategy.md` for comprehensive Claude Code best practices
- **Key Techniques for This Project**:
  - Use Serena MCP for semantic code search in this large codebase
  - Implement PRP framework for new feature development
  - Leverage sub-agents for specialized tasks (UI, backend, testing)
  - Use parallel development with git worktrees for A/B testing features
  - Apply token optimization strategies to reduce costs