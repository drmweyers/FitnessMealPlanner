# FitMeal Pro - Fitness Meal Plan Generator

A comprehensive fitness meal planning application that uses OpenAI to generate healthy, nutritious recipes with detailed macro information. Built with Express.js backend and React frontend, featuring admin authentication and recipe management.

## 🚀 Quick Start

1. **Clone and Setup**: This project is pre-configured for Replit deployment
2. **Add API Key**: Add your `OPENAI_API_KEY` in Replit Secrets
3. **Run**: Click the "Run" button - the app will start on port 5000
4. **Access**: Visit your Replit URL to see the landing page
5. **Login**: Click "Get Started" to authenticate with Replit Auth
6. **Generate**: Use the Admin tab to generate your first batch of recipes

## 📱 Features

### Recipe Management
- **AI-Generated Recipes**: Uses OpenAI GPT-4o to create unique, healthy recipes
- **Detailed Nutrition**: Complete macro information (calories, protein, carbs, fat)
- **Smart Filtering**: Filter by meal type, dietary restrictions, prep time, and nutrition
- **Recipe Search**: Full-text search across recipe names, descriptions, and ingredients

### Admin Dashboard
- **Replit Authentication**: Secure admin access using Replit Auth
- **Recipe Approval**: Review and approve AI-generated recipes before publishing
- **Bulk Generation**: Create batches of recipes with customizable parameters
- **Recipe Management**: Edit, approve, or delete recipes through the admin interface

### Modern UI
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Beautiful Recipe Cards**: Visual recipe browsing with nutrition highlights
- **Advanced Filters**: Comprehensive filtering and search capabilities
- **Recipe Modals**: Detailed recipe view with ingredients and instructions

## 🛠 Tech Stack

### Backend
- **Express.js**: Web framework for Node.js
- **TypeScript**: Type-safe JavaScript development
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Persistent data storage
- **OpenAI API**: AI-powered recipe generation
- **Replit Auth**: Secure authentication system

### Frontend
- **React**: Modern UI library
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/UI**: High-quality UI components
- **TanStack Query**: Data fetching and caching
- **Wouter**: Lightweight routing

## ⚙️ Environment Setup

### Required Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Database Configuration (auto-provided by Replit)
DATABASE_URL=your-postgresql-connection-string

# Replit Auth (automatically provided by Replit)
REPL_ID=your-repl-id
SESSION_SECRET=your-session-secret
REPLIT_DOMAINS=your-replit-domains
ISSUER_URL=https://replit.com/oidc
```

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and API client
│   │   └── pages/          # Application pages
├── server/                 # Express.js backend
│   ├── services/           # Business logic services
│   │   ├── openai.ts       # OpenAI integration
│   │   └── recipeGenerator.ts # Recipe generation service
│   ├── db.ts               # Database connection
│   ├── storage.ts          # Data access layer
│   ├── routes.ts           # API routes
│   └── replitAuth.ts       # Authentication middleware
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema and types
├── scripts/                # Utility scripts
│   └── generateRecipes.js  # Recipe generation script
└── migrations/             # Database migrations
    └── 0001_create_sessions.sql
```

## 🏗 Architecture

### Clean Code Architecture
The application follows clean architecture principles with clear separation of concerns:

- **Domain**: Business entities and rules (`shared/schema.ts`)
- **Repository**: Data access layer (`server/storage.ts`)
- **UseCase**: Business logic (`server/services/`)
- **Service**: External integrations (`server/services/openai.ts`)
- **HTTP**: API layer (`server/routes.ts`)

### Database Design
PostgreSQL database with optimized schema:

- **sessions**: Session storage for Replit Auth
- **users**: User profiles and authentication data
- **recipes**: Complete recipe data with JSON fields for flexible arrays

Indexes are created for optimal query performance on meal types, dietary tags, calories, and prep time.

## 🔌 API Endpoints

### Public Endpoints
```http
GET /api/recipes                    # List approved recipes with filtering
GET /api/recipes/:id                # Get specific recipe details
```

### Admin Endpoints (Authentication Required)
```http
GET /api/auth/user                  # Get current user info
GET /api/admin/recipes              # List all recipes (approved/pending)
GET /api/admin/recipes/:id          # Get any recipe by ID
POST /api/admin/recipes             # Create new recipe
PATCH /api/admin/recipes/:id        # Update recipe
PATCH /api/admin/recipes/:id/approve # Approve recipe
DELETE /api/admin/recipes/:id       # Delete recipe
GET /api/admin/stats                # Get recipe statistics
POST /api/admin/generate            # Generate new recipes with AI
```

### Recipe Filtering Parameters
```
?search=term                        # Search in name, description, ingredients
?mealType=breakfast|lunch|dinner|snack
?dietaryTag=vegetarian|vegan|keto|paleo|gluten-free
?maxPrepTime=30                     # Maximum prep time in minutes
?maxCalories=500                    # Maximum calories per serving
?minCalories=200                    # Minimum calories per serving
?minProtein=20                      # Minimum protein in grams
?maxProtein=50                      # Maximum protein in grams
?minCarbs=10                        # Minimum carbohydrates in grams
?maxCarbs=30                        # Maximum carbohydrates in grams
?minFat=5                           # Minimum fat in grams
?maxFat=25                          # Maximum fat in grams
?page=1&limit=12                    # Pagination
?approved=true|false                # Filter by approval status (admin only)
```

## 🤖 AI Recipe Generation

### OpenAI Integration
- Uses GPT-4o model for high-quality recipe generation
- Structured JSON output with detailed nutritional information
- Configurable parameters for meal type, dietary restrictions, and calorie targets
- Rate limiting and error handling for API stability

### Generation Process
1. AI creates recipe with ingredients, instructions, and estimated nutrition
2. Recipe stored in database with `is_approved: false`
3. Admin reviews and approves recipes before public visibility
4. Approved recipes appear in public recipe listings

### Batch Generation
```bash
# Generate 20 recipes (default)
POST /api/admin/generate

# Generate custom amount
POST /api/admin/generate
Content-Type: application/json
{ "count": 50 }
```

## 🔐 Authentication & Security

### Replit Auth Integration
- OpenID Connect authentication with Replit
- Automatic user creation and session management
- Secure session storage in PostgreSQL
- Admin routes protected with middleware

### Security Features
- Input validation with Zod schemas
- SQL injection protection with parameterized queries
- CSRF protection through secure sessions
- Rate limiting on API endpoints

## 🎨 Frontend Features

### Modern React Architecture
- TypeScript for type safety
- TanStack Query for server state management
- Wouter for lightweight routing
- Form handling with React Hook Form and Zod validation

### UI Components
- Shadcn/UI component library
- Tailwind CSS for styling
- Responsive design for all screen sizes
- Accessible components with keyboard navigation

### Recipe Management
- Interactive recipe cards with nutrition highlights
- Advanced filtering and search capabilities
- Modal views for detailed recipe information
- Admin dashboard for recipe approval workflow

## 📊 Database Schema

### Recipes Table
```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  meal_types JSONB DEFAULT '[]',
  dietary_tags JSONB DEFAULT '[]',
  main_ingredient_tags JSONB DEFAULT '[]',
  ingredients_json JSONB NOT NULL,
  instructions_text TEXT NOT NULL,
  prep_time_minutes INTEGER NOT NULL,
  cook_time_minutes INTEGER NOT NULL,
  servings INTEGER NOT NULL,
  calories_kcal INTEGER NOT NULL,
  protein_grams DECIMAL(5,2) NOT NULL,
  carbs_grams DECIMAL(5,2) NOT NULL,
  fat_grams DECIMAL(5,2) NOT NULL,
  image_url VARCHAR(500),
  source_reference VARCHAR(255),
  creation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_approved BOOLEAN DEFAULT FALSE
);
```

## 🚀 Deployment

### Replit Deployment
1. Environment variables are automatically configured
2. PostgreSQL database is provisioned and connected
3. Application runs on port 5000 with automatic SSL
4. Continuous deployment from code changes

### Production Considerations
- Database connection pooling for scalability
- Error logging and monitoring
- API rate limiting and caching
- Image optimization for recipe photos

## 📝 Development

### Running Locally
```bash
npm install
npm run dev
```

### Database Migrations
```bash
# Apply migrations
psql $DATABASE_URL -f migrations/0001_create_sessions.sql
```

### Recipe Generation Script
```bash
# Generate 50 recipes
node scripts/generateRecipes.js 50
```

## 🔧 Troubleshooting

### Common Issues
1. **OpenAI API Errors**: Verify OPENAI_API_KEY is set correctly
2. **Database Connection**: Check DATABASE_URL environment variable
3. **Authentication Issues**: Ensure Replit Auth environment variables are configured
4. **Recipe Generation Slow**: Normal due to API rate limits, be patient

### Error Codes
- `401 Unauthorized`: Authentication required for admin endpoints
- `400 Bad Request`: Invalid request parameters or body
- `404 Not Found`: Recipe or resource not found
- `500 Internal Server Error`: Server-side error, check logs

## 📚 Usage Examples

### Filter High-Protein Low-Carb Recipes
```http
GET /api/recipes?minProtein=30&maxCarbs=20&mealType=lunch
```

### Find Keto-Friendly Meals
```http
GET /api/recipes?dietaryTag=keto&maxCarbs=10&minFat=15
```

### Search for Quick Breakfast Options
```http
GET /api/recipes?mealType=breakfast&maxPrepTime=15&minProtein=20
```

### Filter by Complete Macro Profile
```http
GET /api/recipes?minProtein=25&maxProtein=45&minCarbs=15&maxCarbs=35&minFat=10&maxFat=20&maxCalories=500
```

### Vegetarian High-Protein Recipes
```http
GET /api/recipes?dietaryTag=vegetarian&minProtein=25&maxCalories=600
```

### Admin: Generate 25 Recipes
```http
POST /api/admin/generate
Content-Type: application/json
{ "count": 25 }
```

This comprehensive backend service provides everything needed for a professional fitness meal planning application with AI-powered recipe generation, admin management, and a beautiful user interface.
