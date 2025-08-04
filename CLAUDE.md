# FitnessMealPlanner Development Guidelines

## Project Overview
**Name:** FitnessMealPlanner  
**Description:** A comprehensive meal planning application for fitness professionals and their clients  
**Tech Stack:** React, TypeScript, Node.js, Express, PostgreSQL, Drizzle ORM, Vite, Docker

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
1. **ALWAYS** start Docker development environment first
2. Check git status: `git status`
3. Pull latest changes: `git pull origin main`
4. Create feature branch: `git checkout -b feature/<description>`

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

### Completed Features
- ✅ User authentication (Admin, Trainer, Customer roles)
- ✅ Recipe management system
- ✅ Meal plan generation
- ✅ Multiple meal plans per customer
- ✅ PDF export (both client-side and server-side)
- ✅ Responsive design for all pages
- ✅ Customer invitation system
- ✅ Profile image upload system for all roles
- ✅ Comprehensive unit test suite (48 passing tests)

### Profile Image Upload Implementation
- **Components**: `ProfileImageUpload.tsx` (upload) and `ProfileAvatar.tsx` (display-only)
- **Storage**: AWS S3 for production, local filesystem for development
- **Processing**: Sharp.js for image resize (200x200px) and JPEG conversion
- **API Endpoints**:
  - POST `/api/profile/upload-image` (upload new image)
  - DELETE `/api/profile/delete-image` (remove image)
  - GET `/api/profile` (get profile with image)
- **Features**: Drag-drop upload, validation (file type/size), optimistic updates
- **Integration**: Profile pages and header component

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

## Sub-Agent Configuration

### Core Project Guidelines for Sub-Agents
- **Always read planning.md at the start of every new conversation**
- **Check tasks.md before starting work and mark completed tasks immediately**  
- **Add any new discovered tasks to tasks.md**
- **Make every task and code change as simple as possible, impacting minimal code**
- **Provide high-level explanations of changes made at every step**
- **Add a review section to project_plan.md with summary of changes and relevant information**

### Recommended Sub-Agents for FitnessMealPlanner
Create these agents in `.claude/agents/` directory:

1. **Frontend UI Developer** (`frontend-ui-developer.md`)
   - **Description**: "Use this agent when implementing React components, TypeScript interfaces, or ShadCN UI integrations. Expert in responsive design and React Query state management."
   - **Tools**: Read, Write, Edit, MultiEdit, Bash (for npm commands)
   - **Specialization**: Client-side development, component architecture

2. **Backend API Developer** (`backend-api-developer.md`)
   - **Description**: "Use this agent when creating Express routes, database operations with Drizzle ORM, or authentication middleware. Expert in Node.js and PostgreSQL."
   - **Tools**: Read, Write, Edit, MultiEdit, Bash (for database operations)
   - **Specialization**: Server-side development, API design, database schema

3. **DevOps Docker Specialist** (`devops-docker-specialist.md`)
   - **Description**: "Use this agent for Docker configuration, environment setup, deployment issues, or container orchestration. MUST BE USED for Docker-related tasks."
   - **Tools**: Read, Edit, Bash (Docker commands)
   - **Specialization**: Development environment, containerization

4. **QA Testing Engineer** (`qa-testing-engineer.md`)
   - **Description**: "Use this agent for writing unit tests, integration tests, or debugging test failures. Expert in Vitest and React Testing Library."
   - **Tools**: Read, Write, Edit, Bash (test commands)
   - **Specialization**: Testing, quality assurance

5. **Code Quality Auditor** (`code-quality-auditor.md`)
   - **Description**: "Use PROACTIVELY after significant code changes for thorough code review focusing on security, performance, and maintainability."
   - **Tools**: Read, Grep, Glob
   - **Specialization**: Code review, security analysis, best practices

### Multi-Agent Workflow Patterns
- **Feature Development**: Frontend UI Developer + Backend API Developer working in parallel
- **Testing Cycle**: QA Testing Engineer after each feature completion
- **Deployment**: DevOps Docker Specialist for environment-related tasks
- **Quality Gates**: Code Quality Auditor reviews before major commits

### MCP Server Configuration (.mcp.json)
Recommended MCP servers for this project:
- **GitHub MCP**: For Git operations, PR management, and code reviews
- **Postgres MCP**: Direct database operations and schema management
- **Puppeteer MCP**: UI testing and screenshot comparisons for responsive design
- **Test Sprite MCP**: Automated testing and failure diagnosis

### Cost Optimization for FitnessMealPlanner
- Use `/clear` after completing major features (profile upload, PDF export, etc.)
- Prefer Sonnet for routine development tasks
- Use Opus for complex architecture decisions
- Leverage parallel sub-agent execution to reduce overall development time

## Session Progress Tracking
- **Last Major Update**: Profile image upload system implementation completed
- **Current Status**: All core features implemented and tested (48 passing tests)
- **Recent Achievements**: 
  - ✅ Profile image upload with AWS S3 integration
  - ✅ Comprehensive unit test suite
  - ✅ Business logic documentation updated to v1.2
  - ✅ All changes pushed to qa-ready branch
- **Next Priorities**: Performance optimization, additional features, production deployment preparation
