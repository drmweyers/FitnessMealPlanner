# FitnessMealPlanner - ChatGPT Development Assistant Prompt

**Last Updated**: January 22, 2025
**Purpose**: Complete codebase understanding for ChatGPT to assist with FitnessMealPlanner development

---

## System Overview

You are assisting with **FitnessMealPlanner**, a production-ready fitness nutrition management platform that connects trainers with clients through AI-powered meal planning. The system is built with modern web technologies and follows enterprise-grade architecture patterns.

**Live Production URL**: https://evofitmeals.com

## Technology Stack & Architecture

### Frontend Stack
```typescript
// Core Technologies
React 18 + TypeScript (strict mode)
TanStack Query (React Query) for server state management
Wouter for client-side routing
shadcn/ui + Radix UI for component library
Tailwind CSS for styling
Vite for build tooling
Vitest for testing

// Key Libraries
@hookform/resolvers with Zod validation
jsPDF for client-side PDF generation
html2canvas for screenshot functionality
Framer Motion for animations
Lucide React for icons
```

### Backend Stack
```typescript
// Server Technologies
Node.js + Express.js
Drizzle ORM with PostgreSQL
JWT authentication with refresh tokens
Express sessions with connect-pg-simple
Multer for file uploads
Sharp for image processing

// External Integrations
OpenAI GPT-4 (recipe generation + DALL-E 3 images)
AWS S3 Compatible (DigitalOcean Spaces)
Resend.dev for email services
Puppeteer for server-side PDF generation
```

### Infrastructure
```bash
# Deployment & DevOps
Docker with multi-stage builds
DigitalOcean App Platform for hosting
PostgreSQL managed database
Redis for caching and sessions
GitHub Actions for CI/CD
```

## Database Schema Overview

### Core Tables Structure
```sql
-- User Management
users (id UUID, email VARCHAR UNIQUE, password TEXT, role ENUM, google_id VARCHAR, name VARCHAR, profile_picture TEXT)
email_preferences (user_id UUID FK, weekly_progress_summaries BOOLEAN, meal_plan_updates BOOLEAN, marketing_emails BOOLEAN)
customer_invitations (id UUID, trainer_id UUID FK, customer_email VARCHAR, token TEXT UNIQUE, expires_at TIMESTAMP)

-- Recipe System
recipes (id UUID, name VARCHAR(255), description TEXT, meal_types JSONB, dietary_tags JSONB, main_ingredient_tags JSONB,
         ingredients_json JSONB, instructions_text TEXT, prep_time_minutes INTEGER, cook_time_minutes INTEGER,
         servings INTEGER, calories_kcal INTEGER, protein_grams DECIMAL, carbs_grams DECIMAL, fat_grams DECIMAL,
         image_url VARCHAR, is_approved BOOLEAN DEFAULT false)

-- Meal Planning
trainer_meal_plans (id UUID, trainer_id UUID FK, meal_plan_data JSONB, is_template BOOLEAN, tags JSONB, notes TEXT)
personalized_meal_plans (id UUID, customer_id UUID FK, trainer_id UUID FK, meal_plan_data JSONB, assigned_at TIMESTAMP)
meal_plan_assignments (id UUID, meal_plan_id UUID FK, customer_id UUID FK, assigned_by UUID FK)

-- Progress Tracking
progress_measurements (id UUID, customer_id UUID FK, measurement_date TIMESTAMP, weight_kg DECIMAL, weight_lbs DECIMAL,
                      neck_cm DECIMAL, shoulders_cm DECIMAL, chest_cm DECIMAL, waist_cm DECIMAL, hips_cm DECIMAL,
                      bicep_left_cm DECIMAL, bicep_right_cm DECIMAL, thigh_left_cm DECIMAL, thigh_right_cm DECIMAL,
                      body_fat_percentage DECIMAL, muscle_mass_kg DECIMAL, notes TEXT)
progress_photos (id UUID, customer_id UUID FK, photo_date TIMESTAMP, photo_url TEXT, thumbnail_url TEXT,
                photo_type VARCHAR(50), caption TEXT, is_private BOOLEAN DEFAULT true)

-- Grocery & Shopping
grocery_lists (id UUID, customer_id UUID FK, meal_plan_id UUID FK, name VARCHAR(255), created_at TIMESTAMP)
grocery_list_items (id UUID, grocery_list_id UUID FK, name VARCHAR(255), category VARCHAR(50), quantity INTEGER,
                   unit VARCHAR(20), is_checked BOOLEAN DEFAULT false, priority VARCHAR(10), notes TEXT,
                   estimated_price DECIMAL, brand VARCHAR(100), recipe_id UUID FK, recipe_name VARCHAR(255))

-- Engagement Features
recipe_favorites (id UUID, user_id UUID FK, recipe_id UUID FK, favorite_date TIMESTAMP, notes TEXT)
recipe_collections (id UUID, user_id UUID FK, name VARCHAR(255), description TEXT, is_public BOOLEAN DEFAULT false)
recipe_ratings (id UUID, user_id UUID FK, recipe_id UUID FK, rating INTEGER, review_text TEXT, is_helpful BOOLEAN,
               cooking_difficulty INTEGER, would_cook_again BOOLEAN)
recipe_interactions (id UUID, user_id UUID FK, recipe_id UUID FK, interaction_type VARCHAR(50),
                    interaction_value INTEGER, session_id VARCHAR(255), metadata JSONB)
```

### Key Relationships
```typescript
// User Hierarchy
Admin (1) → manages → Users (many)
Trainer (1) → invites → Customers (many)
Customer (1) → belongs to → Trainer (1)

// Content Relationships
Trainer (1) → creates → MealPlans (many)
MealPlan (1) → assigned to → Customers (many)
Recipe (many) → used in → MealPlans (many)
Customer (1) → tracks → Measurements/Photos (many)
Customer (1) → has → GroceryLists (many)
```

## Project Structure & File Organization

### Frontend Architecture
```typescript
client/
├── src/
│   ├── components/           // Reusable UI components
│   │   ├── ui/              // shadcn/ui base components
│   │   ├── MealPlanGenerator.tsx      // Core meal plan creation
│   │   ├── RecipeCard.tsx             // Recipe display component
│   │   ├── ProgressTracking.tsx       // Customer progress interface
│   │   ├── CustomerManagement.tsx     // Trainer client management
│   │   ├── AdminTable.tsx             // Admin data management
│   │   └── PDFExportButton.tsx        // Export functionality
│   ├── contexts/
│   │   └── AuthContext.tsx            // Authentication state management
│   ├── hooks/
│   │   ├── useAuth.ts                 // Authentication hook
│   │   └── useSafeMealPlan.ts         // Safe meal plan data access
│   ├── lib/
│   │   ├── utils.ts                   // Utility functions
│   │   └── authUtils.ts               // Auth helper functions
│   ├── pages/                         // Page components
│   ├── types/
│   │   └── auth.ts                    // Authentication types
│   └── utils/
│       ├── pdfExport.ts               // Client-side PDF generation
│       └── mealPlanHelpers.ts         // Meal plan utilities

shared/
└── schema.ts                          // Shared TypeScript types and Zod schemas
```

### Backend Architecture
```typescript
server/
├── controllers/                       // Request handlers
│   ├── exportPdfController.ts         // PDF generation controller
│   └── groceryListController.ts       // Grocery list operations
├── db/                               // Database configuration
│   ├── seeds/                        // Test data seeding
│   └── migrations/                   // Database schema changes
├── middleware/
│   ├── auth.ts                       // Authentication middleware
│   ├── rateLimiter.ts                // Rate limiting
│   └── security.ts                   // Security headers
├── routes/
│   ├── adminRoutes.ts                // Admin-only endpoints
│   ├── trainerRoutes.ts              // Trainer functionality
│   ├── customerRoutes.ts             // Customer endpoints
│   ├── recipes.ts                    // Recipe CRUD operations
│   ├── mealPlan.ts                   // Meal plan operations
│   ├── groceryLists.ts               // Shopping functionality
│   ├── pdf.ts                        // Export endpoints
│   └── progressSummaries.ts          // Progress tracking
├── services/
│   ├── mealPlanGenerator.ts          // Core meal plan algorithm
│   ├── recipeGenerator.ts            // AI recipe creation
│   ├── openai.ts                     // OpenAI API integration
│   ├── s3Upload.ts                   // File upload service
│   ├── emailService.ts               // Email communications
│   └── progressTracker.ts            // Progress analytics
├── utils/
│   ├── logger.ts                     // Application logging
│   └── ingredientAggregator.ts       // Grocery list helpers
├── validation/
│   └── schemas.ts                    // Input validation schemas
├── db.ts                             // Database connection
├── storage.ts                        // Data access layer
└── index.ts                          // Application entry point
```

## Core Business Logic & Workflows

### 1. Authentication & User Management
```typescript
// Multi-role authentication system
interface User {
  id: string;
  email: string;
  role: 'admin' | 'trainer' | 'customer';
  name?: string;
  profilePicture?: string;
}

// Authentication flow
1. JWT-based auth with refresh tokens
2. Cross-tab session synchronization
3. Role-based access control (RBAC)
4. OAuth integration (Google)

// Customer invitation workflow
Trainer → creates invitation → sends email → Customer registers → auto-linked relationship
```

### 2. AI Recipe Generation System
```typescript
// Recipe generation pipeline
interface GenerationOptions {
  count: number;
  mealTypes?: string[];              // breakfast, lunch, dinner, snack
  dietaryRestrictions?: string[];    // vegan, keto, gluten-free, etc.
  targetCalories?: number;
  mainIngredient?: string;
  fitnessGoal?: string;             // weight_loss, muscle_gain, maintenance
  naturalLanguagePrompt?: string;    // Free-form user input
  nutritionalConstraints?: {         // Min/max ranges
    calories: { min?: number; max?: number };
    protein: { min?: number; max?: number };
    carbs: { min?: number; max?: number };
    fat: { min?: number; max?: number };
  };
}

// Generation process
1. Parameter validation and sanitization
2. OpenAI GPT-4 API call with structured prompts
3. JSON recipe parsing and validation
4. DALL-E 3 image generation for each recipe
5. S3 upload for permanent image storage
6. Database storage with approval workflow
7. Admin moderation queue for quality control
```

### 3. Intelligent Meal Plan Generation
```typescript
// Meal plan generation algorithm
class MealPlanGeneratorService {
  async generateMealPlan(params: MealPlanGeneration): Promise<MealPlan> {
    // Recipe selection strategy with fallback
    1. Filter by user preferences and dietary restrictions
    2. Apply calorie targets per meal (daily_target / meals_per_day ± 20%)
    3. Ensure meal type distribution (breakfast/lunch/dinner/snack)
    4. Avoid recipe repetition within 2-day windows
    5. Implement ingredient-aware selection for meal prep optimization

    // NEW FEATURES
    6. Limit total unique ingredients across entire plan
    7. Generate consolidated shopping lists with quantity aggregation
    8. Create meal prep instructions by ingredient category
    9. Provide storage guidelines for prepped components
  }
}

// Meal plan structure
interface MealPlan {
  id: string;
  planName: string;
  fitnessGoal: string;
  dailyCalorieTarget: number;
  days: number;
  mealsPerDay: number;
  generatedBy: string;
  meals: Array<{
    day: number;
    mealNumber: number;
    mealType: string;
    recipe: CompleteRecipe;
  }>;
  startOfWeekMealPrep?: MealPrepInstructions; // NEW FEATURE
}
```

### 4. Progress Tracking System
```typescript
// Comprehensive progress monitoring
interface ProgressMeasurement {
  measurementDate: Date;
  weight: { kg?: number; lbs?: number };
  bodyMeasurements: {
    neck: number; shoulders: number; chest: number;
    waist: number; hips: number;
    biceps: { left: number; right: number };
    thighs: { left: number; right: number };
    calves: { left: number; right: number };
  };
  bodyComposition: {
    bodyFatPercentage?: number;
    muscleMass?: number;
  };
  notes?: string;
}

// Photo progress tracking
interface ProgressPhoto {
  photoDate: Date;
  photoUrl: string;                    // S3 stored images
  thumbnailUrl?: string;
  photoType: 'front' | 'side' | 'back' | 'other';
  caption?: string;
  isPrivate: boolean;                  // Privacy controls
}

// Analytics and reporting
- Trend analysis over time periods
- Goal achievement tracking
- Progress summary generation
- Export capabilities for external analysis
```

### 5. Recipe Management & Discovery
```typescript
// Advanced recipe filtering and search
interface RecipeFilter {
  search?: string;                     // Text search (name/description)
  mealType?: string;                   // breakfast, lunch, dinner, snack
  dietaryTag?: string;                 // vegan, keto, gluten-free, etc.
  maxPrepTime?: number;                // Time constraints
  nutritionRanges?: {                  // Nutritional filtering
    calories: { min?: number; max?: number };
    protein: { min?: number; max?: number };
    carbs: { min?: number; max?: number };
    fat: { min?: number; max?: number };
  };
  ingredients: {
    include?: string[];                // Must contain ingredients
    exclude?: string[];                // Must not contain ingredients
  };
  approved?: boolean;                  // Admin approval filter
}

// Recipe engagement features
- Favorites: Personal recipe bookmarking
- Collections: Custom recipe organization (playlist-style)
- Ratings & Reviews: 5-star system with text reviews
- Interactions: View tracking, cooking attempts, sharing analytics
- Recommendations: AI-powered personalized suggestions
```

### 6. Grocery List & Shopping Features
```typescript
// Automatic grocery list generation from meal plans
interface GroceryListGeneration {
  1. Extract all ingredients from meal plan recipes
  2. Aggregate quantities by ingredient name (smart unit conversion)
  3. Categorize by grocery store sections (produce, meat, dairy, etc.)
  4. Apply rounding rules for practical shopping amounts
  5. Generate estimated pricing (optional feature)
  6. Create recipe-to-ingredient traceability
}

// Interactive shopping experience
interface GroceryListItem {
  name: string;
  category: 'produce' | 'meat' | 'dairy' | 'pantry' | 'beverages' | 'snacks' | 'other';
  quantity: number;
  unit: string;
  isChecked: boolean;                  // Real-time shopping progress
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  estimatedPrice?: number;
  brand?: string;
  recipeId?: string;                   // Link back to source recipe
  recipeName?: string;
}
```

### 7. PDF Export & Document Generation
```typescript
// Two-tier PDF generation system
1. Client-side (jsPDF): Quick exports for simple meal plan layouts
2. Server-side (Puppeteer): Professional branded PDFs with EvoFit styling

// Export capabilities
- Individual recipe cards with images and nutrition
- Complete meal plans with daily breakdowns
- Shopping lists organized by category
- Progress reports with charts and measurements
- Custom meal plan presentations for client delivery

// Professional branding features
- Company logo integration (EvoFit branded)
- Trainer contact information
- Custom color schemes and typography
- Mobile-responsive PDF layouts
- White-label template system
```

## API Endpoints & Routes

### Authentication & User Management
```typescript
// Authentication endpoints
POST /api/auth/login              // Email/password login
POST /api/auth/register           // New user registration
POST /api/auth/refresh_token      // JWT token refresh
POST /api/auth/logout             // Session termination
GET  /api/auth/me                 // Current user profile
GET  /api/auth/google             // OAuth login initiation
GET  /api/auth/google/callback    // OAuth callback handler

// Password management
POST /api/password/forgot         // Initiate password reset
POST /api/password/reset          // Complete password reset
```

### Recipe Management
```typescript
// Public recipe access
GET    /api/recipes                    // Search and filter recipes
GET    /api/recipes/:id                // Get specific recipe details

// Admin recipe operations
POST   /api/admin/recipes              // Create new recipe
PUT    /api/admin/recipes/:id          // Update existing recipe
DELETE /api/admin/recipes/:id          // Delete recipe
POST   /api/admin/recipes/generate     // AI batch recipe generation
POST   /api/admin/recipes/:id/approve  // Approve pending recipe
GET    /api/admin/recipes/pending      // Get approval queue
POST   /api/admin/recipes/bulk-approve // Bulk approval operations
```

### Meal Plan Operations
```typescript
// Meal plan generation and management
POST /api/meal-plans/generate          // Generate new meal plan
GET  /api/trainer/meal-plans           // Get trainer's saved plans
POST /api/trainer/meal-plans/save      // Save plan as template
POST /api/trainer/meal-plans/assign    // Assign plan to customer
GET  /api/customer/meal-plans          // Get customer's assigned plans
DELETE /api/meal-plans/:id             // Delete meal plan
POST /api/meal-plans/:id/duplicate     // Duplicate existing plan
```

### Progress Tracking
```typescript
// Customer progress endpoints
POST /api/progress/measurements        // Add new measurement entry
GET  /api/progress/measurements        // Get measurement history
PUT  /api/progress/measurements/:id    // Update measurement
DELETE /api/progress/measurements/:id  // Delete measurement

POST /api/progress/photos              // Upload progress photo
GET  /api/progress/photos              // Get photo timeline
PUT  /api/progress/photos/:id          // Update photo details
DELETE /api/progress/photos/:id        // Delete progress photo

GET  /api/progress/summary             // Analytics and trends
POST /api/progress/export              // Export progress data
```

### Grocery & Shopping
```typescript
// Grocery list management
GET    /api/grocery-lists              // Get customer's grocery lists
POST   /api/grocery-lists              // Create new grocery list
PUT    /api/grocery-lists/:id          // Update grocery list
DELETE /api/grocery-lists/:id          // Delete grocery list

POST   /api/grocery-lists/from-meal-plan // Generate from meal plan
GET    /api/grocery-lists/:id/items    // Get list items
POST   /api/grocery-lists/:id/items    // Add item to list
PUT    /api/grocery-lists/:id/items/:itemId // Update item
DELETE /api/grocery-lists/:id/items/:itemId // Delete item
PATCH  /api/grocery-lists/:id/items/:itemId/check // Toggle item checked
```

### Administrative Functions
```typescript
// User management
GET    /api/admin/users                // List all users
POST   /api/admin/users                // Create user account
PUT    /api/admin/users/:id            // Update user details
DELETE /api/admin/users/:id            // Delete user account
POST   /api/admin/users/:id/impersonate // Admin impersonation

// System analytics
GET    /api/admin/analytics            // System-wide metrics
GET    /api/admin/analytics/users      // User engagement data
GET    /api/admin/analytics/content    // Content performance metrics
GET    /api/admin/analytics/performance // System performance data

// Content moderation
GET    /api/admin/moderation/queue     // Content awaiting review
POST   /api/admin/moderation/approve   // Approve content
POST   /api/admin/moderation/reject    // Reject content
```

### Export & Integration
```typescript
// PDF generation endpoints
POST /api/pdf/export                   // Generate meal plan PDF
POST /api/pdf/recipe/:id               // Generate recipe card PDF
POST /api/pdf/progress/:customerId     // Generate progress report PDF
POST /api/pdf/grocery-list/:id         // Generate shopping list PDF

// Data export endpoints
GET  /api/export/meal-plans            // Export meal plan data
GET  /api/export/recipes               // Export recipe database
GET  /api/export/progress/:customerId  // Export customer progress
POST /api/export/custom                // Custom data export
```

## Key Business Rules & Validation

### Data Validation Rules
```typescript
// Recipe validation constraints
- Name: Required, 1-255 characters, unique per trainer
- Ingredients: Minimum 2 ingredients, valid amounts/units
- Instructions: Required, step-by-step format
- Nutrition: Positive values, realistic ranges (calories: 50-2000 per serving)
- Prep/Cook Time: 1-480 minutes (8 hours maximum)
- Servings: 1-20 servings

// Meal plan validation
- Daily Calories: 800-5000 kcal (realistic human range)
- Duration: 1-30 days
- Meals per day: 1-6 meals
- Plan name: Required, unique per trainer

// User account validation
- Email: Valid format, unique across entire system
- Password: 8+ characters, complexity requirements (uppercase, lowercase, number, special char)
- Role assignment: Proper authorization chains enforced
```

### Security & Access Control
```typescript
// Role-based permissions
- Customer: Access only their own data and assigned meal plans
- Trainer: Access their customers and self-created content
- Admin: Full system access with comprehensive audit logging

// Data privacy controls
- Customer measurements: Encrypted at rest, access-controlled
- Progress photos: Private by default, explicit sharing permissions
- Email preferences: Granular control, GDPR compliant
- Export limitations: Rate limiting, file size constraints

// API security measures
- JWT authentication with short-lived access tokens
- Rate limiting per endpoint and user role
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- XSS prevention with content security policies
```

### Business Logic Constraints
```typescript
// User relationship rules
- One trainer can have unlimited customers
- One customer can have exactly one active trainer at a time
- Meal plans can be assigned to multiple customers (templates)
- Recipes can be used in unlimited meal plans (many-to-many)

// Content moderation workflow
- All AI-generated recipes require admin approval before public access
- User-generated content (ratings/reviews) auto-published with post-moderation
- Admin can moderate all content types with bulk operations
- Content approval queue with priority sorting

// Usage and rate limits
- Recipe generation: Rate limited based on user role (admin: unlimited, trainer: 50/day, customer: 10/day)
- PDF exports: Size limitations (max 50MB) and frequency limits (20/hour)
- Image uploads: File size (max 10MB) and format restrictions (JPEG, PNG, WebP)
- API calls: Rate limiting per endpoint with sliding window algorithm
```

## Integration Points & External Dependencies

### OpenAI Integration
```typescript
// Recipe generation with GPT-4
- Model: gpt-4-turbo with structured JSON output mode
- Rate limiting: 60 requests per minute organizational limit
- Error handling: Exponential backoff with circuit breaker pattern
- Cost optimization: Batch processing and result caching

// Image generation with DALL-E 3
- Resolution: 1024x1024 for high-quality food photography
- Style prompts: Professional food photography with consistent styling
- Cost management: Image generation limits per user role
- Fallback strategy: Unsplash API integration for backup images
```

### AWS S3 Compatible Storage
```typescript
// DigitalOcean Spaces configuration
- Recipe images: Public read access, private write operations
- Progress photos: Private with signed URL access (24-hour expiration)
- PDF exports: Temporary storage with automatic cleanup (7-day TTL)
- Backup strategy: Cross-region replication for disaster recovery
```

### Email Service Integration
```typescript
// Resend.dev email delivery
- Transactional emails: Account verification, password resets, invitations
- Marketing emails: Weekly progress summaries, nutrition tips, feature announcements
- Template system: HTML templates with dynamic variable substitution
- Analytics tracking: Open rates, click-through rates, unsubscribe management
```

## Performance Optimization & Caching

### Database Optimization
```sql
-- Strategic indexing for performance
CREATE INDEX idx_recipes_search ON recipes USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_recipes_meal_types_approved ON recipes(meal_types, is_approved) WHERE is_approved = true;
CREATE INDEX idx_meal_plans_trainer_created ON trainer_meal_plans(trainer_id, created_at DESC);
CREATE INDEX idx_progress_customer_date ON progress_measurements(customer_id, measurement_date DESC);
CREATE INDEX idx_grocery_customer_updated ON grocery_lists(customer_id, updated_at DESC);

-- Query optimization strategies
- Recipe search: Full-text search with ranking and relevance scoring
- Meal plan generation: Batch recipe fetching with single query
- Progress tracking: Time-series data optimization with partitioning
- User relationships: Efficient JOIN strategies with proper foreign keys
```

### Caching Strategy
```typescript
// Redis caching implementation
- Recipe search results: 5-minute TTL with cache invalidation on updates
- User sessions: 24-hour TTL with sliding window renewal
- Meal plan templates: 1-hour TTL for frequently accessed templates
- AI generation results: Permanent cache with manual invalidation

// Client-side caching with React Query
- Stale-while-revalidate strategy for recipe data
- Background refetching for real-time data consistency
- Optimistic updates for user interactions
- Cache persistence across browser sessions
```

### Rate Limiting & Cost Management
```typescript
// API rate limiting configuration
- Authentication endpoints: 5 requests per minute per IP address
- Recipe generation: Role-based limits (admin: unlimited, trainer: 50/day, customer: 10/day)
- PDF export: 20 requests per hour per user
- General API access: 100 requests per minute per authenticated user

// Cost optimization strategies
- OpenAI API usage: Budget alerts and automatic throttling
- S3 storage costs: Lifecycle policies for automated cleanup
- Database costs: Connection pooling and query timeout limits
- Email delivery: Bounce handling and list hygiene maintenance
```

## Testing & Quality Assurance

### Testing Strategy
```typescript
// Unit testing with Vitest
- Component testing: React Testing Library for UI components
- Service testing: Business logic and API integration testing
- Utility testing: Helper functions and data transformation logic
- Mock testing: External API integrations with comprehensive mocking

// Integration testing
- API endpoint testing: Full request/response cycle validation
- Database testing: Data persistence and retrieval verification
- Authentication testing: Login flows and permission enforcement
- File upload testing: S3 integration and image processing workflows

// End-to-end testing with Playwright
- User journey testing: Complete workflow validation
- Cross-browser testing: Chrome, Firefox, Safari compatibility
- Mobile responsiveness: Touch interactions and viewport adaptation
- Performance testing: Page load times and API response benchmarks
```

### Quality Assurance Procedures
```typescript
// Code quality enforcement
- TypeScript strict mode: Comprehensive type checking
- ESLint configuration: Consistent code style and best practices
- Prettier formatting: Automated code formatting
- Husky pre-commit hooks: Quality gates before code commits

// Security scanning
- Dependency vulnerability scanning: npm audit and automated updates
- Secret detection: Git hooks for credential leak prevention
- OWASP compliance: Security best practices implementation
- Penetration testing: Regular security assessment procedures
```

## Deployment & DevOps

### Environment Configuration
```typescript
// Environment-specific settings
- Development: Local Docker with hot reload and debug logging
- Staging: Production-like environment for QA validation
- Production: DigitalOcean App Platform with auto-scaling
- Testing: Isolated environment for automated test execution

// Configuration management
- Environment variables: Secure secret management
- Feature flags: Gradual rollout capabilities
- Database migrations: Version-controlled schema changes
- Blue-green deployment: Zero-downtime deployment strategy
```

### Monitoring & Observability
```typescript
// Application monitoring
- Performance monitoring: API response times and error rates
- User analytics: Feature usage and engagement metrics
- System health: Database performance and resource utilization
- Error tracking: Comprehensive error logging and alerting

// Business intelligence
- User engagement metrics: Daily/monthly active users
- Content performance: Recipe popularity and meal plan success rates
- Revenue analytics: Subscription conversion and retention tracking
- Cost optimization: Infrastructure spending and ROI analysis
```

---

## Development Guidelines for AI Assistants

### When Working with This Codebase

1. **Always Follow TypeScript Strict Mode**
   - Use proper type definitions from `shared/schema.ts`
   - Validate inputs with Zod schemas
   - Implement comprehensive error handling

2. **Maintain Consistent Architecture Patterns**
   - Use React Query for server state management
   - Implement proper separation of concerns
   - Follow existing component composition patterns

3. **Security-First Development**
   - Validate all user inputs
   - Implement proper authentication checks
   - Use parameterized queries for database operations
   - Follow OWASP security guidelines

4. **Performance Considerations**
   - Implement proper caching strategies
   - Use database indexes effectively
   - Optimize API response times
   - Consider mobile performance implications

5. **Testing Requirements**
   - Write unit tests for new functionality
   - Include integration tests for API endpoints
   - Test error scenarios and edge cases
   - Validate user permission enforcement

### Common Development Patterns

```typescript
// API endpoint pattern
app.get('/api/resource', requireAuth, async (req, res) => {
  try {
    const filters = schemaValidation.parse(req.query);
    const result = await storage.getData(filters);
    res.json(result);
  } catch (error) {
    handleApiError(error, res);
  }
});

// React component pattern
export function ComponentName({ prop }: ComponentProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dataKey'],
    queryFn: () => apiRequest('/api/endpoint'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{/* Component content */}</div>;
}

// Service layer pattern
class ServiceName {
  async processData(input: ValidatedInput): Promise<ProcessedOutput> {
    // 1. Validate input
    // 2. Apply business logic
    // 3. Update database
    // 4. Return formatted result
  }
}
```

---

**This document provides comprehensive context for ChatGPT to understand and assist with FitnessMealPlanner development. The system is production-ready and follows enterprise-grade patterns throughout its architecture.**