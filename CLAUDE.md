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

## Session Progress Tracking
- Last update: PDF export system implementation completed
- Current focus: Testing and bug fixes
- Next priorities: Performance optimization, additional features