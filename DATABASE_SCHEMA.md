# Database Schema Documentation

This document provides comprehensive documentation of the FitnessMealPlanner database schema, designed to help junior developers understand the data structure and relationships.

## Overview

The database is built using PostgreSQL with Drizzle ORM for type-safe database operations. The schema supports a multi-role fitness application with recipe management, meal planning, and progress tracking capabilities.

## Database Tables

### 1. Users Table (`users`)

**Purpose**: Stores user account information with role-based access control.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('admin', 'trainer', 'customer')),
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  
  -- Profile fields
  fitness_goals JSONB,              -- Array of fitness goals
  dietary_restrictions JSONB,       -- Array of dietary restrictions
  preferred_cuisines JSONB,         -- Array of preferred cuisines
  activity_level VARCHAR(50),       -- sedentary, lightly_active, etc.
  weight DECIMAL(5,2),              -- Weight in kg
  height DECIMAL(5,2),              -- Height in cm
  age INTEGER,
  bio TEXT,
  
  -- OAuth fields
  google_id VARCHAR(255) UNIQUE,
  provider VARCHAR(50),
  avatar_url TEXT
);
```

**Key Fields Explained**:
- `id`: Unique identifier for each user (UUID format)
- `role`: Determines user permissions (`admin`, `trainer`, `customer`)
- `fitness_goals`: JSON array storing user's fitness objectives
- `dietary_restrictions`: JSON array for allergies, diet preferences
- `google_id`: For Google OAuth authentication
- `activity_level`: Used for calorie calculations

**Relationships**:
- One user can have many meal plans (as customer)
- One trainer can manage many customers
- One user can have many progress measurements/goals/photos

### 2. Recipes Table (`recipes`)

**Purpose**: Stores recipe information with nutritional data and categorization.

```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Categorization
  meal_types JSONB NOT NULL,        -- ["breakfast", "lunch", "dinner", "snack"]
  dietary_tags JSONB,               -- ["vegan", "keto", "gluten-free"]
  
  -- Recipe content
  ingredients_json JSONB NOT NULL,   -- Structured ingredient data
  instructions_text TEXT NOT NULL,   -- Step-by-step instructions
  
  -- Nutritional information (per serving)
  calories INTEGER,
  protein_g DECIMAL(5,2),
  carbs_g DECIMAL(5,2),
  fat_g DECIMAL(5,2),
  fiber_g DECIMAL(5,2),
  sugar_g DECIMAL(5,2),
  sodium_mg DECIMAL(7,2),
  
  -- Metadata
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  difficulty_level VARCHAR(20),     -- easy, medium, hard
  
  -- Content management
  is_approved BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- AI generation tracking
  ai_generated BOOLEAN DEFAULT false,
  generation_prompt TEXT,
  
  -- Media
  image_url TEXT,
  video_url TEXT
);
```

**Key Fields Explained**:
- `meal_types`: JSON array indicating when recipe can be served
- `ingredients_json`: Structured data with quantities and measurements
- `is_approved`: Content moderation flag (only approved recipes shown to customers)
- `ai_generated`: Tracks if recipe was created by AI
- Nutritional fields: All per serving for accurate meal planning

**Example ingredients_json structure**:
```json
[
  {
    "name": "chicken breast",
    "amount": 200,
    "unit": "g",
    "category": "protein"
  },
  {
    "name": "brown rice",
    "amount": 1,
    "unit": "cup",
    "category": "carbs"
  }
]
```

### 3. Meal Plans Table (`meal_plans`)

**Purpose**: Stores generated meal plans with nutritional targets and metadata.

```sql
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Nutritional targets
  daily_calorie_target INTEGER,
  protein_target_g DECIMAL(5,2),
  carbs_target_g DECIMAL(5,2),
  fat_target_g DECIMAL(5,2),
  
  -- Plan structure
  total_days INTEGER NOT NULL,
  meals_per_day INTEGER DEFAULT 3,
  
  -- Meal plan data (JSON structure)
  meals_json JSONB NOT NULL,        -- Complete meal plan structure
  
  -- Metadata
  fitness_goal VARCHAR(100),        -- weight_loss, muscle_gain, etc.
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- AI generation tracking
  ai_generated BOOLEAN DEFAULT false,
  generation_prompt TEXT
);
```

**meals_json Structure**:
```json
{
  "day_1": {
    "breakfast": {
      "recipe_id": "uuid",
      "recipe_name": "Protein Pancakes",
      "calories": 350,
      "protein_g": 25,
      "servings": 1
    },
    "lunch": { ... },
    "dinner": { ... }
  },
  "day_2": { ... }
}
```

### 4. Customer Meal Plans Table (`customer_meal_plans`)

**Purpose**: Associates meal plans with customers and tracks assignment metadata.

```sql
CREATE TABLE customer_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES users(id),
  
  -- Assignment metadata
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Progress tracking
  notes TEXT,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  
  UNIQUE(customer_id, meal_plan_id)
);
```

**Key Relationships**:
- Links customers to their assigned meal plans
- Tracks which trainer made the assignment
- Supports meal plan scheduling with start/end dates

## Progress Tracking Tables

### 5. Progress Measurements Table (`progress_measurements`)

**Purpose**: Stores customer body measurements for progress tracking.

```sql
CREATE TABLE progress_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measurement_date TIMESTAMP NOT NULL,
  
  -- Weight measurements
  weight_kg DECIMAL(5,2),
  weight_lbs DECIMAL(6,2),
  
  -- Body measurements (in cm)
  neck_cm DECIMAL(5,2),
  shoulders_cm DECIMAL(5,2),
  chest_cm DECIMAL(5,2),
  waist_cm DECIMAL(5,2),
  hips_cm DECIMAL(5,2),
  bicep_left_cm DECIMAL(5,2),
  bicep_right_cm DECIMAL(5,2),
  thigh_left_cm DECIMAL(5,2),
  thigh_right_cm DECIMAL(5,2),
  calf_left_cm DECIMAL(5,2),
  calf_right_cm DECIMAL(5,2),
  
  -- Body composition
  body_fat_percentage DECIMAL(5,2),
  muscle_mass_kg DECIMAL(5,2),
  
  -- Notes and metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure chronological ordering
  INDEX idx_customer_date (customer_id, measurement_date DESC)
);
```

**Usage Notes**:
- Supports both metric (kg/cm) and imperial (lbs) measurements
- Detailed body measurements for comprehensive tracking
- Indexed for efficient querying by customer and date

### 6. Customer Goals Table (`customer_goals`)

**Purpose**: Stores customer fitness goals with progress tracking.

```sql
CREATE TABLE customer_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Goal definition
  goal_type VARCHAR(50) NOT NULL,    -- weight_loss, muscle_gain, etc.
  goal_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Target values
  target_value DECIMAL(10,2) NOT NULL,
  target_unit VARCHAR(20) NOT NULL,  -- lbs, kg, inches, cm, %
  current_value DECIMAL(10,2),
  starting_value DECIMAL(10,2),
  
  -- Timeline
  start_date DATE NOT NULL,
  target_date DATE,
  achieved_date DATE,
  
  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused', 'cancelled')),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Goal Types Supported**:
- `weight_loss`: Lose X pounds/kg
- `weight_gain`: Gain X pounds/kg  
- `muscle_gain`: Increase muscle mass
- `body_fat_reduction`: Reduce body fat percentage
- `strength_gain`: Increase lifting capacity
- `endurance`: Improve cardiovascular fitness
- `custom`: User-defined goals

**Progress Calculation**:
The `progress_percentage` is automatically calculated based on:
```
For weight loss: (starting_value - current_value) / (starting_value - target_value) * 100
For weight gain: (current_value - starting_value) / (target_value - starting_value) * 100
```

### 7. Goal Milestones Table (`goal_milestones`)

**Purpose**: Tracks intermediate milestones for customer goals.

```sql
CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES customer_goals(id) ON DELETE CASCADE,
  
  -- Milestone definition
  milestone_name VARCHAR(255) NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  target_date DATE,
  
  -- Achievement tracking
  achieved_value DECIMAL(10,2),
  achieved_date DATE,
  is_achieved BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 8. Progress Photos Table (`progress_photos`)

**Purpose**: Stores customer progress photos with metadata.

```sql
CREATE TABLE progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Photo metadata
  photo_date TIMESTAMP NOT NULL,
  photo_url TEXT NOT NULL,           -- S3 URL for full image
  thumbnail_url TEXT,                -- S3 URL for thumbnail
  
  -- Categorization
  photo_type VARCHAR(20) NOT NULL CHECK (photo_type IN ('front', 'side', 'back', 'other')),
  caption TEXT,
  
  -- Privacy and organization
  is_private BOOLEAN DEFAULT true,   -- Private to customer by default
  
  -- File metadata
  file_size_bytes INTEGER,
  original_filename VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing for efficient queries
  INDEX idx_customer_photo_date (customer_id, photo_date DESC)
);
```

**S3 Storage Strategy**:
- Original photos stored at full resolution
- Thumbnails automatically generated (300x400px)
- WebP format for optimal compression
- Organized by customer ID in S3 buckets

## Indexing Strategy

### Performance Indexes

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_role ON users(role);

-- Recipe searches
CREATE INDEX idx_recipes_meal_types ON recipes USING GIN(meal_types);
CREATE INDEX idx_recipes_dietary_tags ON recipes USING GIN(dietary_tags);
CREATE INDEX idx_recipes_approved ON recipes(is_approved) WHERE is_approved = true;
CREATE INDEX idx_recipes_calories ON recipes(calories);

-- Meal plan assignments
CREATE INDEX idx_customer_meal_plans_customer ON customer_meal_plans(customer_id);
CREATE INDEX idx_customer_meal_plans_active ON customer_meal_plans(customer_id, is_active);

-- Progress tracking
CREATE INDEX idx_progress_measurements_customer_date ON progress_measurements(customer_id, measurement_date DESC);
CREATE INDEX idx_customer_goals_customer_status ON customer_goals(customer_id, status);
CREATE INDEX idx_progress_photos_customer_date ON progress_photos(customer_id, photo_date DESC);
```

## Data Relationships Diagram

```
users (1) -----> (many) customer_meal_plans -----> (1) meal_plans
  |                                                      |
  | (1)                                                  | (1)
  |                                                      |
  v (many)                                               v (many) 
progress_measurements                                  recipes
progress_photos                                          |
customer_goals                                           | (many)
  |                                                      |
  | (1)                                                  v (1)
  |                                                 meal_plans
  v (many)
goal_milestones
```

## Common Query Patterns

### 1. Get Customer's Active Meal Plans
```sql
SELECT mp.*, cmp.assigned_at, cmp.start_date, cmp.end_date
FROM meal_plans mp
JOIN customer_meal_plans cmp ON mp.id = cmp.meal_plan_id
WHERE cmp.customer_id = $1 AND cmp.is_active = true
ORDER BY cmp.assigned_at DESC;
```

### 2. Get Customer's Progress Over Time
```sql
SELECT measurement_date, weight_lbs, body_fat_percentage
FROM progress_measurements
WHERE customer_id = $1
ORDER BY measurement_date DESC
LIMIT 12; -- Last 12 measurements
```

### 3. Search Recipes by Criteria
```sql
SELECT *
FROM recipes
WHERE is_approved = true
  AND meal_types ? $1        -- Contains meal type
  AND dietary_tags ?| $2     -- Contains any dietary tag
  AND calories BETWEEN $3 AND $4
ORDER BY created_at DESC;
```

### 4. Calculate Goal Progress
```sql
SELECT 
  goal_name,
  target_value,
  current_value,
  starting_value,
  CASE 
    WHEN goal_type = 'weight_loss' THEN
      ROUND(((starting_value - current_value) / (starting_value - target_value)) * 100)
    WHEN goal_type = 'weight_gain' THEN
      ROUND(((current_value - starting_value) / (target_value - starting_value)) * 100)
    ELSE progress_percentage
  END as calculated_progress
FROM customer_goals
WHERE customer_id = $1 AND status = 'active';
```

## Migration Strategy

The database uses Drizzle ORM's migration system:

1. **Schema Changes**: Defined in `shared/schema.ts`
2. **Migration Files**: Generated in `migrations/` directory
3. **Version Control**: Each migration has metadata in `migrations/meta/`
4. **Rollback Support**: Migrations can be rolled back if needed

### Running Migrations

```bash
# Generate new migration
npm run db:generate

# Apply migrations
npm run db:migrate

# View migration status
npm run db:studio
```

## Data Validation

### Zod Schemas

All data validation uses Zod schemas defined in `shared/schema.ts`:

```typescript
// Example: Measurement validation
export const createMeasurementSchema = z.object({
  measurementDate: z.string(),
  weightLbs: z.number().min(50).max(1000).optional(),
  weightKg: z.number().min(20).max(500).optional(),
  bodyFatPercentage: z.number().min(1).max(50).optional(),
  // ... other fields
});
```

### Database Constraints

- Foreign key constraints ensure referential integrity
- Check constraints validate enum values and ranges
- Unique constraints prevent duplicate data
- NOT NULL constraints ensure required fields

## Security Considerations

### Data Protection
- User passwords are hashed using bcrypt
- Sensitive data is encrypted at rest
- Progress photos are stored in private S3 buckets
- Database connections use SSL/TLS

### Access Control
- Row-level security ensures users only see their data
- API endpoints validate user permissions
- JWT tokens expire and must be refreshed
- Database credentials are environment-specific

### Audit Trail
- All tables include `created_at` and `updated_at` timestamps
- User actions are logged for compliance
- Data deletion is soft-delete where possible
- Backup and recovery procedures are in place

This schema documentation provides a foundation for understanding the FitnessMealPlanner database structure. For implementation details, refer to the code in `shared/schema.ts` and the migration files.