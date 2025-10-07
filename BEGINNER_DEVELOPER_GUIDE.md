# Beginner Developer Guide - FitnessMealPlanner

Welcome to the FitnessMealPlanner codebase! This guide is specifically designed to help junior developers understand the project structure, technologies, and development workflow. Don't worry if you're new to some of these technologies - we'll explain everything step by step.

## 🎯 What You'll Learn

By the end of this guide, you'll understand:
- How the application is structured
- What each technology does and why we use it
- How to read and understand the code
- How to make your first contribution
- Common patterns used throughout the codebase

## 🏗️ Application Overview

### What Does This App Do?

FitnessMealPlanner is a web application that helps fitness professionals (trainers) create meal plans for their customers. Think of it like a digital nutritionist assistant.

**Key Users:**
1. **Trainers** - Create recipes, generate meal plans, assign them to customers
2. **Customers** - View their meal plans, track progress, log measurements
3. **Admins** - Manage users and oversee the system

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (React)       │◄──►│   (Express)     │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
│ - User Interface│    │ - API Endpoints │    │ - Data Storage  │
│ - State Mgmt    │    │ - Business Logic│    │ - Relationships │
│ - Routing       │    │ - Authentication│    │ - Indexing      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack Explained

### Frontend Technologies

#### React 18 + TypeScript
**What it is:** React is a JavaScript library for building user interfaces. TypeScript adds type safety.

**Why we use it:**
- Component-based architecture makes code reusable
- TypeScript catches errors before they reach users
- Large ecosystem and community support

**Key Concepts for Beginners:**
```typescript
// A simple React component with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean; // Optional prop
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};
```

#### TanStack Query (React Query)
**What it is:** A library for managing server state (data from APIs).

**Why we use it:**
- Automatic caching of API responses
- Background refetching
- Loading and error states handled automatically

**Example:**
```typescript
// Fetching meal plans with automatic caching and error handling
const { data: mealPlans, isLoading, error } = useQuery({
  queryKey: ['mealPlans', customerId],
  queryFn: () => fetchMealPlans(customerId),
  staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
});

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
return <MealPlansList plans={mealPlans} />;
```

#### Tailwind CSS + shadcn/ui
**What it is:** Tailwind is a utility-first CSS framework. shadcn/ui provides pre-built components.

**Why we use it:**
- Consistent design system
- No need to write custom CSS
- Responsive design made easy

**Example:**
```typescript
// Tailwind classes create styling without custom CSS
<div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
  <h2 className="text-2xl font-bold text-gray-900 mb-4">
    Progress Tracking
  </h2>
  <p className="text-gray-600">Track your fitness journey</p>
</div>
```

### Backend Technologies

#### Express.js + TypeScript
**What it is:** Express is a web framework for Node.js that handles HTTP requests.

**Why we use it:**
- Simple and flexible
- Large ecosystem of middleware
- TypeScript adds type safety to our API

**Example API Route:**
```typescript
// Route to get a customer's meal plans
router.get('/meal-plans', requireAuth, async (req, res) => {
  try {
    const customerId = req.user.id;
    
    // Query database for meal plans
    const mealPlans = await db
      .select()
      .from(customerMealPlans)
      .where(eq(customerMealPlans.customerId, customerId));
    
    res.json({
      status: 'success',
      data: mealPlans
    });
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch meal plans'
    });
  }
});
```

#### Drizzle ORM + PostgreSQL
**What it is:** Drizzle is a type-safe ORM (Object-Relational Mapping) tool. PostgreSQL is our database.

**Why we use it:**
- Type-safe database queries
- Automatic TypeScript types from database schema
- Migration system for database changes

**Example:**
```typescript
// Define a table schema
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 20 }).default('customer'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Type-safe query
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, 'user@example.com'))
  .limit(1);
```

## 📁 Project Structure Deep Dive

```
FitnessMealPlanner/
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # Basic UI components (buttons, cards)
│   │   │   ├── progress/      # Progress tracking specific components
│   │   │   ├── MealPlanCard.tsx
│   │   │   └── ...
│   │   ├── pages/             # Full page components
│   │   │   ├── Customer.tsx   # Customer dashboard
│   │   │   ├── Admin.tsx      # Admin panel
│   │   │   └── ...
│   │   ├── contexts/          # React context for global state
│   │   │   └── AuthContext.tsx # User authentication state
│   │   ├── hooks/             # Custom React hooks
│   │   │   └── use-toast.ts   # Toast notification hook
│   │   ├── lib/               # Utility functions
│   │   │   ├── utils.ts       # General utilities
│   │   │   └── queryClient.ts # API request functions
│   │   └── types/             # TypeScript type definitions
├── server/                     # Backend Express application
│   ├── routes/                # API route handlers
│   │   ├── authRoutes.ts      # User authentication endpoints
│   │   ├── progressRoutes.ts  # Progress tracking endpoints
│   │   └── ...
│   ├── middleware/            # Express middleware functions
│   │   └── auth.ts            # Authentication middleware
│   ├── services/              # Business logic services
│   │   ├── openai.ts          # AI integration
│   │   └── emailService.ts    # Email functionality
│   └── utils/                 # Backend utility functions
├── shared/                     # Code shared between client and server
│   └── schema.ts              # Database schema and validation
├── migrations/                 # Database migration files
└── test/                      # Test files
    ├── unit/                  # Unit tests
    ├── integration/           # Integration tests
    └── gui/                   # End-to-end GUI tests
```

### Understanding the File Organization

#### Components (`client/src/components/`)
Components are like LEGO blocks - small, reusable pieces that build up the user interface.

**Naming Convention:**
- `PascalCase` for component files (e.g., `MealPlanCard.tsx`)
- Descriptive names that explain what the component does

**Example Component Structure:**
```typescript
// MealPlanCard.tsx - A card displaying meal plan information
interface MealPlanCardProps {
  mealPlan: MealPlan;
  onView: (id: string) => void;
}

const MealPlanCard: React.FC<MealPlanCardProps> = ({ mealPlan, onView }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mealPlan.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{mealPlan.description}</p>
        <Button onClick={() => onView(mealPlan.id)}>
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default MealPlanCard;
```

#### Pages (`client/src/pages/`)
Pages are full-screen components that represent different views in the application.

**Examples:**
- `Customer.tsx` - Customer dashboard with meal plans and progress
- `Admin.tsx` - Admin panel for managing users and content
- `Login.tsx` - User authentication page

#### API Routes (`server/routes/`)
Routes handle HTTP requests and return responses. Each file groups related endpoints.

**File Organization:**
- `authRoutes.ts` - Login, register, logout endpoints
- `progressRoutes.ts` - Progress tracking CRUD operations
- `mealPlan.ts` - Meal plan generation and management

## 🔐 Authentication Flow

Understanding how users log in and access protected content:

```
1. User submits login form
2. Backend validates credentials
3. Backend generates JWT token
4. Frontend stores token in localStorage
5. Frontend includes token in API requests
6. Backend validates token on each request
7. If valid, proceed; if not, return 401 Unauthorized
```

**Code Example:**
```typescript
// Frontend: Login function
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (response.ok) {
    const { token, user } = await response.json();
    localStorage.setItem('token', token);
    setUser(user); // Update React state
  }
};

// Backend: Protected route middleware
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next(); // Continue to the actual route handler
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
```

## 🗄️ Database Concepts for Beginners

### Tables and Relationships

Think of database tables like Excel spreadsheets with relationships between them:

```
Users Table (Customers, Trainers, Admins)
┌─────────────┬──────────────┬───────┬───────────────┐
│ id          │ email        │ role  │ name          │
├─────────────┼──────────────┼───────┼───────────────┤
│ uuid-1      │ john@ex.com  │ cust  │ John Doe      │
│ uuid-2      │ jane@ex.com  │ train │ Jane Smith    │
└─────────────┴──────────────┴───────┴───────────────┘

Progress Measurements Table
┌─────────────┬─────────────┬───────────────┬───────────┐
│ id          │ customerId  │ measureDate   │ weightLbs │
├─────────────┼─────────────┼───────────────┼───────────┤
│ uuid-3      │ uuid-1      │ 2024-01-15    │ 175.5     │
│ uuid-4      │ uuid-1      │ 2024-01-01    │ 180.0     │
└─────────────┴─────────────┴───────────────┴───────────┘
```

**Key Relationships:**
- One customer can have many measurements (One-to-Many)
- One meal plan can be assigned to many customers (Many-to-Many)
- Each measurement belongs to exactly one customer (Foreign Key)

### Common Query Patterns

```typescript
// Get all measurements for a customer (ordered by date)
const measurements = await db
  .select()
  .from(progressMeasurements)
  .where(eq(progressMeasurements.customerId, userId))
  .orderBy(desc(progressMeasurements.measurementDate));

// Get customer with their active goals
const customerWithGoals = await db
  .select()
  .from(users)
  .leftJoin(customerGoals, eq(users.id, customerGoals.customerId))
  .where(and(
    eq(users.id, userId),
    eq(customerGoals.status, 'active')
  ));
```

## 🧪 Testing Philosophy

We use multiple types of tests to ensure code quality:

### Unit Tests
Test individual functions in isolation.

```typescript
// Example: Testing progress calculation function
describe('calculateProgress', () => {
  test('should calculate weight loss progress correctly', () => {
    const starting = 200;
    const current = 180;
    const target = 160;
    
    const progress = calculateProgress(starting, current, target, 'weight_loss');
    
    expect(progress).toBe(50); // (200-180)/(200-160) = 50%
  });
});
```

### Integration Tests
Test how different parts work together.

```typescript
// Example: Testing API endpoint
describe('POST /api/progress/measurements', () => {
  test('should create a new measurement for authenticated customer', async () => {
    const measurementData = {
      measurementDate: '2024-01-15',
      weightLbs: 175.5,
      bodyFatPercentage: 18.2
    };

    const response = await request(app)
      .post('/api/progress/measurements')
      .set('Authorization', `Bearer ${validToken}`)
      .send(measurementData)
      .expect(201);

    expect(response.body.status).toBe('success');
    expect(response.body.data.weightLbs).toBe('175.5');
  });
});
```

### GUI Tests (End-to-End)
Test the entire user workflow using a real browser.

```typescript
// Example: Testing user login flow
test('should allow customer to log in and view progress', async () => {
  await page.goto('http://localhost:4000/login');
  
  // Fill login form
  await page.fill('input[type="email"]', 'customer@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Should navigate to dashboard
  await expect(page).toHaveURL('/customer');
  
  // Click progress tab
  await page.click('[role="tab"]:has-text("Progress")');
  
  // Should show progress tracking interface
  await expect(page.locator('text=Progress Tracking')).toBeVisible();
});
```

## 🚀 Development Workflow

### Getting Started Checklist

1. **Environment Setup**
   ```bash
   # Clone the repository
   git clone <repo-url>
   cd FitnessMealPlanner
   
   # Copy environment variables
   cp .env.example .env
   # Edit .env file with your configuration
   
   # Start Docker development environment
   docker-compose --profile dev up -d
   
   # Verify everything is running
   docker ps
   ```

2. **Making Your First Change**
   ```bash
   # Create a feature branch
   git checkout -b feature/my-first-feature
   
   # Make your changes
   # ... edit files ...
   
   # Test your changes
   npm test
   
   # Commit with descriptive message
   git add .
   git commit -m "feat: add helpful feature for users"
   
   # Push and create pull request
   git push origin feature/my-first-feature
   ```

### Code Review Process

When submitting a pull request, reviewers look for:

1. **Code Quality**
   - Clear, descriptive variable names
   - Functions do one thing well
   - Proper error handling
   - TypeScript types are correct

2. **Testing**
   - New features have unit tests
   - Edge cases are covered
   - Tests pass consistently

3. **Documentation**
   - JSDoc comments for complex functions
   - README updates if needed
   - Code is self-documenting

### Common Patterns in the Codebase

#### API Response Format
All API responses follow this pattern:
```typescript
// Success response
{
  status: 'success',
  data: { /* actual data */ }
}

// Error response
{
  status: 'error',
  message: 'Human-readable error message'
}
```

#### React Component Pattern
```typescript
// 1. Imports
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. TypeScript interfaces
interface ComponentProps {
  userId: string;
  onUpdate?: () => void;
}

// 3. Component definition
const MyComponent: React.FC<ComponentProps> = ({ userId, onUpdate }) => {
  // 4. Hooks at the top
  const { data, isLoading, error } = useQuery({
    queryKey: ['data', userId],
    queryFn: () => fetchData(userId),
  });

  // 5. Early returns for loading/error states
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // 6. Event handlers
  const handleSubmit = () => {
    // Handle form submission
    onUpdate?.(); // Call optional callback
  };

  // 7. Render JSX
  return (
    <div>
      {/* Component content */}
    </div>
  );
};

// 8. Export
export default MyComponent;
```

#### Database Query Pattern
```typescript
// 1. Try-catch for error handling
try {
  // 2. Extract user ID from authenticated request
  const userId = req.user!.id;
  
  // 3. Validate input data
  const validatedData = schema.parse(req.body);
  
  // 4. Build database query
  const result = await db
    .select()
    .from(table)
    .where(eq(table.userId, userId));
  
  // 5. Return success response
  res.json({
    status: 'success',
    data: result
  });
} catch (error) {
  // 6. Log error and return generic message
  console.error('Error details:', error);
  res.status(500).json({
    status: 'error',
    message: 'Operation failed'
  });
}
```

## 🐛 Common Issues and Solutions

### Frontend Issues

#### "Module not found" errors
**Problem:** Import paths are incorrect
**Solution:** Check the import path and ensure the file exists
```typescript
// ❌ Wrong
import { Button } from './Button';

// ✅ Correct (if using alias)
import { Button } from '@/components/ui/button';
```

#### React hooks rules violations
**Problem:** Using hooks inside conditions or loops
**Solution:** Always use hooks at the top level of components
```typescript
// ❌ Wrong
if (condition) {
  const [state, setState] = useState(false);
}

// ✅ Correct
const [state, setState] = useState(false);
if (condition) {
  // Use state here
}
```

### Backend Issues

#### Database connection errors
**Problem:** Environment variables not set correctly
**Solution:** Check your `.env` file has correct DATABASE_URL

#### TypeScript errors with req.user
**Problem:** TypeScript doesn't know about custom properties
**Solution:** Use type assertion after auth middleware
```typescript
// After requireAuth middleware, req.user is guaranteed to exist
const userId = req.user!.id;
```

### Docker Issues

#### Port already in use
**Problem:** Another service is using port 4000
**Solution:** Stop other services or change port in docker-compose.yml

#### Changes not reflecting
**Problem:** Docker isn't picking up file changes
**Solution:** Restart the development containers
```bash
docker-compose --profile dev restart
```

## 📚 Learning Resources

### Technologies to Learn More About

1. **React + TypeScript**
   - [React Documentation](https://react.dev/)
   - [TypeScript Handbook](https://www.typescriptlang.org/docs/)

2. **Node.js + Express**
   - [Express.js Guide](https://expressjs.com/en/guide/routing.html)
   - [Node.js Documentation](https://nodejs.org/en/docs/)

3. **PostgreSQL + Drizzle ORM**
   - [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)
   - [Drizzle ORM Documentation](https://orm.drizzle.team/)

4. **Testing**
   - [Vitest Documentation](https://vitest.dev/)
   - [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Recommended Learning Path

1. **Week 1-2:** Understand React components and TypeScript basics
2. **Week 3-4:** Learn Express.js and API development
3. **Week 5-6:** Database concepts and Drizzle ORM
4. **Week 7-8:** Testing patterns and Docker fundamentals

## 🤝 Getting Help

### When You're Stuck

1. **Read the Error Message:** Most error messages contain helpful information
2. **Check the Documentation:** Each technology has excellent documentation
3. **Look at Similar Code:** Find similar patterns in the codebase
4. **Ask Questions:** Don't hesitate to ask senior developers

### Good Questions to Ask

- "I'm getting this error [paste error]. I tried X and Y. What should I try next?"
- "Can you explain why we use pattern X instead of pattern Y in this codebase?"
- "What's the best way to test this component that has external dependencies?"

### Code Review Feedback

When you receive feedback, remember:
- It's about the code, not about you personally
- Every developer, no matter how senior, gets feedback
- Each piece of feedback is a learning opportunity
- Ask follow-up questions if you don't understand

## 🎯 Your First Contribution Ideas

Start with these beginner-friendly tasks:

1. **Fix a typo** in documentation or comments
2. **Add validation** to an existing form
3. **Write unit tests** for an untested function
4. **Improve error messages** to be more user-friendly
5. **Add loading states** to components that fetch data

Remember: Every expert was once a beginner. Take your time, ask questions, and enjoy the learning process!

---

**Next Steps:**
1. Set up your development environment
2. Read through the main codebase files
3. Run the tests to see how they work
4. Pick a small task and make your first contribution

Welcome to the team! 🚀