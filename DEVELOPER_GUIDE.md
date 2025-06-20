# FitMeal Pro Developer Guide

## Overview

FitMeal Pro is a cutting-edge AI-powered fitness meal planning platform that transforms nutrition management through intelligent, personalized solutions. This guide provides comprehensive information for developers working on the project.

## Architecture Overview

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Wouter for client-side routing
- TanStack Query v5 for server state management
- shadcn/ui components with Tailwind CSS
- Vite for development and building

**Backend:**
- Express.js with TypeScript
- Drizzle ORM with PostgreSQL
- OpenAI GPT-4o integration
- Replit Authentication (OIDC)
- Session management with express-session

**Database:**
- PostgreSQL with comprehensive schema
- 223+ approved fitness recipes
- User authentication and session storage
- Advanced filtering and search capabilities

### Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main application pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and configurations
│   │   └── App.tsx         # Main application component
├── server/                 # Express.js backend
│   ├── services/           # Business logic services
│   ├── routes.ts           # API endpoint definitions
│   ├── storage.ts          # Database abstraction layer
│   ├── index.ts            # Server entry point
│   └── db.ts               # Database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema and validation
└── test/                   # Test suites
```

## Key Features

### 1. AI-Powered Recipe Generation
- OpenAI GPT-4o integration for intelligent recipe creation
- Natural language meal plan parsing
- Batch recipe generation for database seeding
- AI-generated recipe images using DALL-E

### 2. Meal Plan Generator
- Natural language input processing
- Advanced form-based meal plan creation
- Comprehensive nutritional analysis
- PDF export functionality
- Interactive recipe modals

### 3. Recipe Management
- Browse and search 223+ approved recipes
- Advanced filtering (dietary restrictions, nutrition, prep time)
- Admin recipe approval workflow
- Recipe analytics and statistics

### 4. User Authentication
- Replit OIDC integration
- Session-based authentication
- User profile management
- Role-based access control

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database
- OpenAI API key
- Replit environment (for authentication)

### Installation
```bash
npm install
npm run db:push  # Initialize database schema
npm run dev      # Start development server
```

### Environment Variables
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
REPLIT_DB_URL=...
NODE_ENV=development
```

## Database Schema

### Users Table
Stores user profile information from Replit authentication:
- `id`: Unique user identifier
- `email`: User's email address
- `firstName/lastName`: Display name components
- `profileImageUrl`: Avatar URL
- Automatic timestamps

### Recipes Table
Core recipe storage with comprehensive data:
- `id`: UUID primary key
- `name`, `description`: Basic recipe info
- `mealTypes`: JSONB array (breakfast, lunch, dinner, snack)
- `dietaryTags`: JSONB array (vegan, keto, gluten-free, etc.)
- `ingredientsJson`: Structured ingredient data
- `instructionsText`: Step-by-step cooking instructions
- Nutritional data: calories, protein, carbs, fat
- `isApproved`: Content moderation flag

## API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user profile

### Public Recipe Access
- `GET /api/recipes` - Search and filter recipes
- `GET /api/recipes/:id` - Get specific recipe

### Authenticated Features
- `POST /api/meal-plans/generate` - Generate meal plan
- `POST /api/meal-plans/parse-natural-language` - Parse natural language input

### Admin Operations
- `POST /api/admin/generate-recipes` - Batch generate recipes
- `GET /api/admin/stats` - Recipe statistics
- `PATCH /api/recipes/:id/approve` - Approve recipe

## Key Components

### MealPlanGenerator
The core component for creating personalized meal plans:
- Natural language processing with OpenAI
- Advanced form with nutritional constraints
- Real-time nutrition analysis
- PDF export functionality
- Interactive recipe viewing

### RecipeModal
Comprehensive recipe display component:
- Detailed nutritional information
- Step-by-step cooking instructions
- Ingredient lists with measurements
- Responsive design for all devices

### AdminRecipeGenerator
Admin interface for recipe management:
- Batch recipe generation
- Progress tracking and monitoring
- Error handling and retry logic

## Services

### MealPlanGeneratorService
Handles intelligent meal plan generation:
- Smart recipe selection with fallback strategies
- Nutritional balancing and optimization
- Meal type distribution across days
- Calorie target achievement

### OpenAI Service
Manages all AI-powered functionality:
- Recipe generation with constraints
- Natural language parsing
- Image generation for recipes
- Comprehensive error handling

### Storage Layer
Database abstraction using Repository pattern:
- Type-safe database operations
- Comprehensive filtering and search
- Analytics and reporting functions
- User management integration

## Testing

### Test Structure
- Unit tests for individual components
- Integration tests for API endpoints
- Service tests for business logic
- Database tests for storage operations

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

## Performance Considerations

### Database Optimization
- Indexed columns for fast searching
- JSONB arrays for flexible categorization
- Efficient pagination for large datasets
- Connection pooling for scalability

### Frontend Performance
- React Query for intelligent caching
- Lazy loading for recipe images
- Optimized bundle splitting
- Progressive enhancement

### API Response Times
- Sub-100ms average response times
- Efficient database queries
- Proper error handling and fallbacks
- Request/response logging for monitoring

## Security

### Authentication
- Replit OIDC integration
- Session-based authentication
- Secure session storage
- CSRF protection

### Data Validation
- Zod schemas for runtime validation
- Type safety throughout the stack
- SQL injection prevention
- Input sanitization

### Content Moderation
- Recipe approval workflow
- Admin-only sensitive operations
- Public/private content separation

## Deployment

### Production Setup
- Replit Deployments integration
- Environment variable management
- Database migration handling
- Static asset optimization

### Monitoring
- Request logging and analytics
- Error tracking and alerting
- Performance monitoring
- User activity tracking

## Contributing

### Code Style
- TypeScript for type safety
- ESLint and Prettier for consistency
- Comprehensive JSDoc comments
- Meaningful variable and function names

### Best Practices
- Repository pattern for data access
- Service layer for business logic
- Component composition over inheritance
- Comprehensive error handling

### Documentation
- Inline code comments
- API documentation
- Component prop documentation
- Architecture decision records

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Verify DATABASE_URL environment variable
- Check PostgreSQL service status
- Ensure proper network connectivity

**OpenAI API Errors:**
- Verify OPENAI_API_KEY is set correctly
- Check API quota and billing
- Handle rate limiting gracefully

**Authentication Issues:**
- Verify Replit authentication setup
- Check session configuration
- Ensure proper redirect URIs

**Build Errors:**
- Clear node_modules and reinstall
- Check TypeScript configuration
- Verify import paths and aliases

### Performance Issues
- Monitor database query performance
- Check React component re-renders
- Optimize bundle size and loading
- Review API response times

### Debugging Tips
- Use browser developer tools
- Check network requests and responses
- Review server logs for errors
- Test API endpoints directly

## Future Enhancements

### Planned Features
- Mobile app development
- Advanced nutrition tracking
- Social features and sharing
- Integration with fitness trackers
- Multi-language support

### Technical Improvements
- GraphQL API implementation
- Real-time updates with WebSockets
- Advanced caching strategies
- Microservices architecture
- Enhanced AI capabilities

This developer guide provides a comprehensive overview of the FitMeal Pro codebase. For specific implementation details, refer to the inline code comments and individual component documentation.