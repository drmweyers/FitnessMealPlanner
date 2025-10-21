# FitnessMealPlanner - Comprehensive Business Logic Documentation

**Version**: 2.1
**Last Updated**: January 22, 2025
**Status**: Production-Ready System

---

## Executive Summary

FitnessMealPlanner is a comprehensive fitness nutrition management platform that connects fitness trainers with their clients through AI-powered meal planning, recipe management, and progress tracking. The system operates on a multi-role architecture (Admin/Trainer/Customer) and provides end-to-end meal planning solutions from AI recipe generation to PDF export.

## Core Business Model

### Value Proposition
- **For Trainers**: Streamlined client meal plan creation, automated nutrition calculations, professional PDF exports, and client progress tracking
- **For Customers**: Personalized meal plans, recipe collection, shopping lists, and progress monitoring tools
- **For Administrators**: Content moderation, user management, system analytics, and recipe database management

### Revenue Streams
1. **SaaS Subscriptions**: Multi-tier subscription model for trainers
2. **Enterprise Licenses**: White-label solutions for fitness businesses
3. **API Access**: Third-party integrations and data export services

---

## System Architecture & Technology Stack

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query (React Query) for server state, React Context for authentication
- **Routing**: Wouter for client-side navigation
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with refresh tokens, session management
- **File Storage**: AWS S3 compatible (DigitalOcean Spaces)
- **AI Integration**: OpenAI GPT-4 for recipe generation and image creation
- **Containerization**: Docker with multi-stage builds

### Database Schema
```sql
-- Core Tables
users (id, email, password, role, google_id, name, profile_picture)
recipes (id, name, description, meal_types, dietary_tags, ingredients_json, instructions_text, nutrition_data)
personalized_meal_plans (id, customer_id, trainer_id, meal_plan_data)
trainer_meal_plans (id, trainer_id, meal_plan_data, is_template, tags)
customer_invitations (id, trainer_id, customer_email, token, expires_at)

-- Progress Tracking
progress_measurements (id, customer_id, measurement_date, weight, body_measurements)
progress_photos (id, customer_id, photo_date, photo_url, photo_type)

-- Engagement Features
recipe_favorites (id, user_id, recipe_id)
recipe_collections (id, user_id, name, description, is_public)
recipe_ratings (id, user_id, recipe_id, rating, review_text)
grocery_lists (id, customer_id, meal_plan_id, name)
grocery_list_items (id, grocery_list_id, name, category, quantity, is_checked)
```

---

## Core Business Logic Components

### 1. User Management & Authentication

#### Multi-Role Authentication System
```typescript
// User Roles
type UserRole = 'admin' | 'trainer' | 'customer'

// Authentication Flow
- JWT-based authentication with refresh tokens
- Cross-tab session synchronization
- OAuth integration (Google)
- Role-based access control (RBAC)
```

#### Business Rules
- **Admin**: Full system access, content moderation, user management
- **Trainer**: Client management, meal plan creation, progress monitoring
- **Customer**: Personal meal plans, progress tracking, recipe favorites

#### Customer Invitation System
```typescript
// Trainer → Customer Invitation Flow
1. Trainer creates invitation with customer email
2. System generates unique token with expiration
3. Email sent to customer with registration link
4. Customer registers using invitation token
5. Automatic trainer-customer relationship established
```

### 2. AI-Powered Recipe Generation

#### Recipe Generation Engine
```typescript
interface GenerationOptions {
  count: number;
  mealTypes?: string[];
  dietaryRestrictions?: string[];
  targetCalories?: number;
  mainIngredient?: string;
  fitnessGoal?: string;
  naturalLanguagePrompt?: string;
  nutritionalConstraints?: NutritionRanges;
}

// AI Generation Process
1. Parameter validation and constraint checking
2. OpenAI GPT-4 API call with structured prompts
3. Recipe validation (nutrition, ingredients, instructions)
4. AI image generation for each recipe
5. S3 upload for permanent image storage
6. Database storage with approval workflow
```

#### Nutrition Calculation
```typescript
interface NutritionData {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
}

// Automatic calculation from ingredients
// Validation against target ranges
// Macro distribution analysis
```

#### Content Approval Workflow
- All AI-generated recipes require approval
- Admin review queue with bulk operations
- Quality scoring system
- Automated content validation

### 3. Intelligent Meal Plan Generation

#### Meal Plan Generator Algorithm
```typescript
class MealPlanGeneratorService {
  async generateMealPlan(params: MealPlanGeneration): Promise<MealPlan> {
    // 1. Recipe Selection Strategy
    - Filter by dietary preferences and restrictions
    - Apply calorie targets and nutritional constraints
    - Implement fallback strategies for insufficient matches

    // 2. Meal Distribution Logic
    - Calculate calorie distribution across meals
    - Map meal types to time slots (breakfast, lunch, dinner, snacks)
    - Avoid recipe repetition within 2-day windows

    // 3. Ingredient-Aware Selection (NEW FEATURE)
    - Limit total unique ingredients across plan
    - Prioritize ingredient reuse for meal prep efficiency
    - Score recipes by ingredient optimization

    // 4. Meal Prep Instructions Generation (NEW FEATURE)
    - Consolidate shopping lists with quantity aggregation
    - Generate prep instructions by ingredient category
    - Provide storage guidelines for prepped components
  }
}
```

#### Nutritional Optimization
- Daily calorie target distribution
- Macro balance maintenance (protein/carbs/fat ratios)
- Meal timing considerations
- Portion size adjustments

#### Meal Prep Intelligence
```typescript
interface MealPrepInstructions {
  totalPrepTime: number;
  shoppingList: ShoppingItem[];
  prepInstructions: PrepStep[];
  storageInstructions: StorageGuideline[];
}

// Automatic generation of:
// - Consolidated shopping lists
// - Prep step optimization
// - Storage duration guidelines
// - Batch cooking recommendations
```

### 4. Progress Tracking System

#### Measurement Tracking
```typescript
interface ProgressMeasurement {
  measurementDate: Date;
  weight: { kg?: number; lbs?: number };
  bodyMeasurements: {
    neck: number;
    shoulders: number;
    chest: number;
    waist: number;
    hips: number;
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
```

#### Photo Progress Tracking
- Secure S3 image storage
- Photo type categorization (front, side, back, other)
- Privacy controls (private/shared with trainer)
- Timeline visualization
- Before/after comparisons

#### Analytics & Reporting
- Trend analysis over time
- Goal achievement tracking
- Progress summary generation
- Export capabilities for external analysis

### 5. Grocery List Management

#### Automatic List Generation
```typescript
// From Meal Plan → Grocery List
1. Extract all ingredients from meal plan recipes
2. Aggregate quantities by ingredient name
3. Categorize by grocery store sections
4. Apply rounding rules for practical shopping
5. Generate estimated pricing (optional)
```

#### Interactive Shopping Experience
- Real-time checkbox interactions
- Item addition/editing capabilities
- Priority flagging (low/medium/high)
- Store-specific organization
- Shopping progress tracking

#### Advanced Features
- Recipe-to-ingredient traceability
- Brand preferences and substitutions
- Price estimation and budget tracking
- Shopping history analysis

### 6. Recipe Management & Discovery

#### Recipe Database
```typescript
interface Recipe {
  id: string;
  name: string;
  description: string;
  mealTypes: string[];        // breakfast, lunch, dinner, snack
  dietaryTags: string[];      // vegan, keto, gluten-free, etc.
  mainIngredientTags: string[]; // chicken, rice, etc.
  ingredientsJson: Ingredient[];
  instructionsText: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  nutrition: NutritionData;
  imageUrl?: string;
  isApproved: boolean;
}
```

#### Advanced Search & Filtering
```typescript
interface RecipeFilter {
  search?: string;           // Name/description text search
  mealType?: string;         // Single meal type filter
  dietaryTag?: string;       // Dietary restriction filter
  maxPrepTime?: number;      // Time constraint
  nutritionRanges?: {        // Nutritional filtering
    calories: { min?: number; max?: number };
    protein: { min?: number; max?: number };
    carbs: { min?: number; max?: number };
    fat: { min?: number; max?: number };
  };
  ingredients: {
    include?: string[];      // Must contain ingredients
    exclude?: string[];      // Must not contain ingredients
  };
  approved?: boolean;        // Admin filter
}
```

#### Recipe Engagement System
- **Favorites**: Personal recipe bookmarking
- **Collections**: Custom recipe organization (like playlists)
- **Ratings & Reviews**: 5-star rating system with text reviews
- **Interactions**: View tracking, cooking attempts, sharing
- **Recommendations**: AI-powered personalized suggestions

### 7. PDF Export & Document Generation

#### Professional PDF Generation
```typescript
// Two-tier PDF generation system
1. Client-side (jsPDF): Quick exports for simple layouts
2. Server-side (Puppeteer): Professional branded PDFs

// EvoFit Branded Templates
- Company logo and branding
- Professional layout with nutritional breakdowns
- Recipe cards with images and instructions
- Shopping lists and meal prep guides
- Trainer contact information and customization
```

#### Export Capabilities
- Individual recipe cards
- Complete meal plans with nutrition
- Shopping lists
- Progress reports
- Custom meal plan presentations

#### Branding & Customization
- White-label template system
- Trainer logo integration
- Custom color schemes
- Professional typography
- Mobile-responsive layouts

---

## Business Rules & Constraints

### Data Validation Rules
```typescript
// Recipe Validation
- Name: Required, 1-255 characters
- Ingredients: Minimum 2 ingredients, valid amounts/units
- Instructions: Required, step-by-step format
- Nutrition: Positive values, realistic ranges
- Prep/Cook Time: 1-480 minutes (8 hours max)
- Servings: 1-20 servings

// Meal Plan Validation
- Daily Calories: 800-5000 kcal (realistic range)
- Duration: 1-30 days
- Meals per day: 1-6 meals
- Plan name: Required, unique per trainer

// User Validation
- Email: Valid format, unique across system
- Password: 8+ characters, complexity requirements
- Role assignment: Proper authorization chains
```

### Security Rules
```typescript
// Access Control
- Customers: Only access their own data and assigned meal plans
- Trainers: Access their customers and created content
- Admins: Full system access with audit logging

// Data Privacy
- Customer measurements: Encrypted at rest
- Progress photos: Private by default, explicit sharing
- Email preferences: Granular control, GDPR compliant
- Export limitations: Rate limiting, size constraints
```

### Business Logic Constraints
```typescript
// Relationship Rules
- One trainer can have unlimited customers
- One customer can have one active trainer
- Meal plans can be assigned to multiple customers
- Recipes can be used in unlimited meal plans

// Content Moderation
- All AI-generated content requires approval
- User-generated content (ratings/reviews) auto-published
- Admin can moderate all content types
- Bulk operations for efficiency

// Usage Limits
- Recipe generation: Rate limited by user role
- PDF exports: Size and frequency limits
- Image uploads: File size and format restrictions
- API calls: Rate limiting per endpoint
```

---

## API Architecture & Endpoints

### Authentication Endpoints
```typescript
POST /api/auth/login           // Email/password authentication
POST /api/auth/register        // New user registration
POST /api/auth/refresh_token   // Token refresh
POST /api/auth/logout          // Session termination
GET  /api/auth/me             // Current user info

// OAuth Integration
GET  /api/auth/google          // Google OAuth initiation
GET  /api/auth/google/callback // OAuth callback handler
```

### Recipe Management
```typescript
GET    /api/recipes                 // Search/filter recipes
GET    /api/recipes/:id            // Get specific recipe
POST   /api/recipes                // Create new recipe (admin)
PUT    /api/recipes/:id            // Update recipe (admin)
DELETE /api/recipes/:id            // Delete recipe (admin)
POST   /api/recipes/generate       // AI recipe generation
POST   /api/recipes/:id/approve    // Approve generated recipe
```

### Meal Plan Operations
```typescript
POST /api/meal-plans/generate      // Generate new meal plan
GET  /api/meal-plans/trainer       // Get trainer's meal plans
POST /api/meal-plans/save          // Save meal plan as template
POST /api/meal-plans/assign        // Assign plan to customer
GET  /api/meal-plans/customer      // Get customer's meal plans
DELETE /api/meal-plans/:id         // Delete meal plan
```

### Progress Tracking
```typescript
POST /api/progress/measurements    // Add measurement entry
GET  /api/progress/measurements    // Get measurement history
POST /api/progress/photos          // Upload progress photo
GET  /api/progress/photos          // Get photo timeline
POST /api/progress/goals           // Set fitness goals
GET  /api/progress/summary         // Progress analytics
```

### Administrative Functions
```typescript
GET  /api/admin/users              // User management
GET  /api/admin/recipes/pending    // Recipe approval queue
POST /api/admin/recipes/bulk-approve // Bulk content approval
GET  /api/admin/analytics          // System analytics
POST /api/admin/notifications      // System announcements
```

---

## Integration Points

### External API Integrations

#### OpenAI GPT-4 Integration
```typescript
// Recipe Generation
- Model: GPT-4 with structured JSON output
- Rate limiting: 60 requests per minute
- Error handling: Fallback to cached recipes
- Cost optimization: Batch processing

// Image Generation
- DALL-E 3 for recipe photography
- Style prompts for food photography
- Resolution: 1024x1024 for quality
- S3 upload for permanent storage
```

#### AWS S3 Compatible Storage
```typescript
// DigitalOcean Spaces Configuration
- Recipe images: Public read, private write
- Progress photos: Private with signed URLs
- PDF exports: Temporary storage with expiration
- Backup strategy: Cross-region replication
```

#### Email Services
```typescript
// Resend.dev Integration
- Transactional emails: Invitations, password resets
- Marketing emails: Progress summaries, tips
- Template system: HTML templates with variables
- Analytics: Open rates, click tracking
```

### Internal Service Communication
```typescript
// Microservice Architecture
- Authentication Service: JWT validation, user sessions
- Recipe Service: Generation, storage, search
- Meal Plan Service: Creation, assignment, nutrition
- Progress Service: Tracking, analytics, reporting
- Notification Service: Email, in-app notifications
```

---

## Performance & Scalability

### Database Optimization
```sql
-- Strategic Indexing
CREATE INDEX idx_recipes_meal_types_approved ON recipes(meal_types, is_approved);
CREATE INDEX idx_meal_plans_trainer_created ON trainer_meal_plans(trainer_id, created_at);
CREATE INDEX idx_progress_customer_date ON progress_measurements(customer_id, measurement_date);
CREATE INDEX idx_grocery_lists_customer_updated ON grocery_lists(customer_id, updated_at);

-- Query Optimization
- Recipe search: Full-text search with ranking
- Meal plan generation: Batch recipe fetching
- Progress tracking: Time-series optimization
- User relationships: Proper JOIN strategies
```

### Caching Strategy
```typescript
// Redis Caching
- Recipe search results: 5-minute TTL
- User sessions: 24-hour TTL
- Meal plan templates: 1-hour TTL
- AI generation results: Permanent cache

// Client-side Caching
- React Query: Stale-while-revalidate
- Recipe images: Browser cache headers
- Static assets: CDN with long TTL
```

### Rate Limiting
```typescript
// API Rate Limits
- Authentication: 5 requests per minute per IP
- Recipe generation: 10 per hour per user
- PDF export: 20 per hour per user
- General API: 100 requests per minute per user

// Cost Management
- OpenAI API: Budget alerts and throttling
- S3 storage: Lifecycle policies for cleanup
- Database: Connection pooling and timeouts
```

---

## Business Intelligence & Analytics

### Key Performance Indicators (KPIs)
```typescript
interface BusinessMetrics {
  userEngagement: {
    dailyActiveUsers: number;
    mealPlansGenerated: number;
    recipesCreated: number;
    progressEntriesLogged: number;
  };
  systemPerformance: {
    apiResponseTimes: number[];
    errorRates: number;
    uptime: number;
    cacheHitRatio: number;
  };
  contentMetrics: {
    recipeApprovalRate: number;
    averageRating: number;
    contentEngagement: number;
  };
  businessMetrics: {
    trainerRetention: number;
    customerAcquisition: number;
    revenuePerUser: number;
  };
}
```

### Data Analytics Pipeline
```typescript
// Real-time Analytics
- User behavior tracking with session management
- Recipe interaction logging (views, favorites, ratings)
- Meal plan generation success rates
- System performance monitoring

// Batch Analytics
- Weekly progress summaries for customers
- Monthly business reports for stakeholders
- Quarterly system health assessments
- Annual trend analysis and forecasting
```

### Reporting Capabilities
- **User Dashboards**: Personal progress, goal tracking, achievement metrics
- **Trainer Dashboards**: Client overview, engagement metrics, success rates
- **Admin Dashboards**: System health, user analytics, content moderation queues
- **Business Intelligence**: Revenue tracking, user acquisition, retention analysis

---

## Compliance & Security

### Data Protection
```typescript
// GDPR Compliance
- Data minimization: Only collect necessary information
- Right to access: User data export capabilities
- Right to erasure: Complete data deletion workflows
- Consent management: Granular email preferences
- Data portability: Standard export formats

// Security Measures
- Password hashing: bcrypt with salt rounds
- JWT tokens: Short-lived access, long-lived refresh
- API security: Rate limiting, input validation
- Data encryption: At rest and in transit
- Audit logging: All administrative actions
```

### Privacy Controls
```typescript
// User Privacy Settings
- Progress photo visibility: Private/trainer-only/public
- Measurement data sharing: Granular permissions
- Email communications: Opt-in/opt-out preferences
- Data retention: Configurable deletion timelines
- Export controls: Personal data download
```

---

## Error Handling & Monitoring

### Error Management Strategy
```typescript
// Client-side Error Handling
- Network failures: Graceful degradation with cached data
- Validation errors: Real-time feedback with form validation
- Authentication errors: Automatic token refresh attempts
- UI errors: Error boundaries with user-friendly messages

// Server-side Error Handling
- Database errors: Connection pooling with retries
- External API failures: Circuit breaker patterns
- Validation errors: Structured error responses
- Rate limiting: Queue management with backoff

// Monitoring & Alerting
- Application Performance Monitoring (APM)
- Database query performance tracking
- External API response time monitoring
- Error rate alerting with escalation procedures
```

### Disaster Recovery
```typescript
// Backup Strategy
- Database: Daily automated backups with point-in-time recovery
- File storage: Cross-region replication
- Configuration: Infrastructure as Code (IaC)
- Secrets management: Encrypted environment variables

// Business Continuity
- Multi-region deployment capabilities
- Database failover procedures
- CDN redundancy for static assets
- External service fallback strategies
```

---

## Future Roadmap & Technical Debt

### Planned Enhancements
1. **Mobile Application**: React Native cross-platform app
2. **Advanced Analytics**: Machine learning for meal recommendations
3. **Marketplace Integration**: Third-party recipe import/export
4. **IoT Integration**: Smart scale and fitness tracker connectivity
5. **Multi-language Support**: Internationalization framework

### Technical Debt Areas
1. **Legacy Components**: Migration to modern React patterns
2. **Database Optimization**: Query performance improvements
3. **API Versioning**: Backward compatibility management
4. **Testing Coverage**: Comprehensive end-to-end test suite
5. **Documentation**: API documentation automation

### Scalability Considerations
```typescript
// Horizontal Scaling Preparation
- Stateless service design
- Database sharding strategies
- Microservice decomposition
- Container orchestration (Kubernetes)
- Event-driven architecture implementation
```

---

## Development & Deployment

### Development Workflow
```bash
# Local Development
docker-compose --profile dev up -d    # Start development environment
npm run dev                           # Start development server
npm run test                          # Run test suite
npm run typecheck                     # TypeScript validation

# Production Build
npm run build                         # Build optimized bundle
docker build --target prod           # Create production image
docker push registry.example.com     # Deploy to registry
```

### CI/CD Pipeline
```yaml
# Deployment Stages
1. Code Quality: Linting, type checking, security scanning
2. Testing: Unit tests, integration tests, E2E tests
3. Build: Optimized production builds
4. Staging: Automated deployment to staging environment
5. Production: Manual approval with automated deployment
6. Monitoring: Health checks and performance validation
```

### Environment Management
```typescript
// Environment Configuration
- Development: Local Docker with hot reload
- Staging: Production-like environment for QA
- Production: DigitalOcean App Platform with auto-scaling
- Testing: Isolated environment for automated tests

// Configuration Management
- Environment variables for secrets
- Feature flags for gradual rollouts
- Database migrations with rollback capability
- Blue-green deployment strategy
```

---

This comprehensive business logic documentation provides a complete understanding of the FitnessMealPlanner system architecture, business rules, and operational procedures. It serves as both technical reference and business specification for development teams, stakeholders, and AI systems working with the codebase.