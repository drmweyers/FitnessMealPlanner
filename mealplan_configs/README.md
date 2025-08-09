# Fitness Meal Planner

A comprehensive meal planning application for fitness professionals and their clients, featuring recipe management, meal plan generation, and nutrition tracking.

## Features

- 🍽️ **Recipe Management** - Create, edit, and organize recipes with full nutritional data
- 📋 **Meal Plan Generation** - Build custom meal plans for clients
- 👥 **Multi-role Support** - Admin, Trainer, and Customer interfaces
- 📊 **Progress Tracking** - Monitor client goals and measurements
- 📄 **PDF Export** - Professional meal plan reports
- 🎯 **Goal Setting** - Set and track fitness and nutrition goals
- 🔐 **Secure Authentication** - JWT-based auth system
- 📱 **Responsive Design** - Works on desktop and mobile

## Quick Start

### Prerequisites

- Docker Desktop installed and running
- Node.js 18+ (for local development)
- Git

### Installation

1. **Navigate to the FitnessMealPlanner folder:**
   ```bash
   cd FitnessMealPlanner
   ```

2. **Run the setup script:**
   ```bash
   # Windows
   SETUP_MEALPLAN.bat
   
   # Or manually:
   docker-compose --profile dev up -d
   ```

3. **Access the application:**
   - URL: http://localhost:4000
   - Default credentials:
     - Email: `trainer.test@evofitmeals.com`
     - Password: `TestTrainer123!`

## Project Structure

```
FitnessMealPlanner/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── RecipeManager.tsx
│   │   │   ├── MealPlanGenerator.tsx
│   │   │   ├── CustomerMealPlans.tsx
│   │   │   └── MealPlanDashboard.tsx
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── data/              # Static data and types
│   │   └── utils/             # Utilities (including PDF export)
├── server/                    # Express backend
│   ├── routes/               # API routes
│   │   ├── authRoutes.ts
│   │   ├── recipeRoutes.ts
│   │   ├── mealPlanRoutes.ts
│   │   ├── customerRoutes.ts
│   │   └── pdfRoutes.ts
│   ├── db/                   # Database schema
│   └── index.ts              # Server entry point
├── docker-compose.yml        # Docker configuration
└── package.json              # Dependencies
```

## Development

### Commands

```bash
# Start development environment
docker-compose --profile dev up -d

# Stop development environment
docker-compose --profile dev down

# View logs
docker logs mealplanner-dev -f

# Database migrations
npm run db:push
npm run db:migrate

# Generate test data
npm run generate:test-data
npm run enhance:test-data

# Build for production
npm run build
```

### Environment Variables

Create `.env.development` for local development:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/fitnessmeal_db
PORT=4000
NODE_ENV=development
VITE_API_URL=http://localhost:4000/api
JWT_SECRET=your-secret-key
PDF_EXPORT_ENABLED=true
```

### Ports

- **Application**: 4000
- **PostgreSQL**: 5433
- **Vite HMR**: 24678

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify token

### Recipes
- `GET /api/recipes` - Get all recipes
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Meal Plans
- `GET /api/meal-plans` - Get all meal plans
- `POST /api/meal-plans` - Create new meal plan
- `PUT /api/meal-plans/:id` - Update meal plan
- `DELETE /api/meal-plans/:id` - Delete meal plan

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/:id/goals` - Get customer goals
- `POST /api/customers/:id/goals` - Create customer goal
- `GET /api/customers/:id/progress` - Get progress measurements
- `POST /api/customers/:id/progress` - Add progress measurement

### PDF Export
- `POST /api/pdf/export-meal-plan/:id` - Export meal plan as PDF
- `GET /api/pdf/download/:filename` - Download PDF file

## Database Schema

### Core Tables
- `users` - User accounts (admin, trainer, customer)
- `recipes` - Recipe library with nutritional data
- `ingredients` - Ingredient database
- `recipeIngredients` - Recipe-ingredient relationships
- `mealPlans` - Meal plan templates
- `mealPlanDays` - Daily meal plan structure
- `mealPlanMeals` - Individual meals in plans
- `customerMealPlans` - Assigned meal plans
- `customerGoals` - Client goals and targets
- `progressMeasurements` - Progress tracking data
- `sessions` - Active user sessions
- `activityLogs` - System activity tracking

## User Roles

### Admin
- Full system access
- User management
- System configuration
- Analytics and reporting

### Trainer
- Create and manage recipes
- Generate meal plans
- Assign plans to customers
- Track customer progress
- Export PDFs

### Customer
- View assigned meal plans
- Track progress
- Update measurements
- View recipes

## Docker Configuration

The app uses Docker Compose with two profiles:
- `dev` - Development environment with hot reload
- `prod` - Production build

### Container Names
- `mealplanner-dev` - Development app container
- `mealplanner-postgres` - PostgreSQL database
- `mealplanner-prod` - Production app container

## Features in Detail

### Recipe Management
- Full nutritional database
- Ingredient quantity tracking
- Cooking instructions
- Prep and cook times
- Difficulty ratings
- Category tagging
- Image support

### Meal Plan Generation
- Multi-day meal plans
- Macro target matching
- Custom serving sizes
- Meal timing optimization
- Shopping list generation
- PDF export capability

### Progress Tracking
- Weight measurements
- Body composition metrics
- Goal setting and tracking
- Progress photography
- Measurement history
- Achievement milestones

### PDF Export
- Professional meal plan layouts
- Shopping lists
- Nutritional summaries
- Custom branding
- Email delivery
- Multiple formats

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 4000 and 5433 are available
2. **Docker not running**: Start Docker Desktop first
3. **Database connection errors**: Check PostgreSQL container is healthy
4. **Build errors**: Clear node_modules and reinstall

### Reset Everything

```bash
# Stop containers
docker-compose down -v

# Remove volumes
docker volume rm mealplanner_postgres-data

# Rebuild
docker-compose --profile dev up -d --build
```

## Production Deployment

1. Update `.env.production` with real values
2. Build production image:
   ```bash
   docker build --target prod -t mealplanner:prod .
   ```
3. Deploy using your preferred platform

## Security Notes

- Change default JWT secret in production
- Use environment variables for sensitive data
- Enable HTTPS in production
- Implement rate limiting
- Regular security updates

## License

Private - EvoFit Meal Solutions

## Support

For issues or questions, contact the development team.