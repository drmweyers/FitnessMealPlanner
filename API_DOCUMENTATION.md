# FitnessMealPlanner API Documentation

## Base URL
All API endpoints are relative to: `http://localhost:4000/api/v1` (development) or `https://your-domain.com/api/v1` (production)

## Authentication

FitnessMealPlanner uses JWT-based authentication with Google OAuth support. Users must authenticate before accessing protected endpoints.

### Authentication Flow
1. User registers/logs in with email/password or Google OAuth
2. Server validates credentials and generates JWT token
3. Client stores JWT token in localStorage
4. Client includes token in Authorization header for protected requests
5. Server validates token on each request

**Authorization Header Format:**
```
Authorization: Bearer <jwt-token>
```

### User Roles
- **Admin**: Full system access, user management
- **Trainer**: Recipe management, meal plan creation, customer management
- **Customer**: View assigned meal plans, track progress

### Subscriptions and Tiers (Canonical Alignment)
- API versioning: All endpoints are under /api/v1
- Trainer tiers (one-time purchases): Tier 1 (Basic), Tier 2 (Analytics), Tier 3 (Advanced)
- Analytics export capabilities by tier:
  - Tier 2: CSV-only exports
  - Tier 3: CSV, Excel, and PDF exports + programmatic Analytics API access
- Trial policy: 14-day, tier-limited trial (no full platform trial). All gating and limits apply during trial
- AI subscriptions (monthly add-on): Starter (100 generations/month), Professional (500/month), Enterprise (unlimited; fair use)
- AI cancellation policy: Cancelling the AI subscription disables only AI features; purchased trainer tiers remain unchanged

### Protected Endpoints
Endpoints marked with 🔒 require authentication. Unauthenticated requests will receive:
```json
{
  "status": "error",
  "message": "Unauthorized"
}
```

### Response Format
All API responses follow this consistent format:

**Success Response:**
```json
{
  "status": "success",
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Human-readable error message",
  "errors": [] // Optional validation errors
}
```

## Endpoints

### Authentication

#### Get Current User
🔒 `GET /api/v1/auth/user`

Returns the authenticated user's profile information.

**Response:**
```json
{
  "id": "43965828",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": "https://...",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Recipes

#### Search Recipes
`GET /api/v1/recipes`

Search and filter recipes with comprehensive query parameters.

**Query Parameters:**
- `search` (string): Text search in name and description
- `mealType` (string): Filter by meal type (breakfast, lunch, dinner, snack)
- `dietaryTag` (string): Filter by dietary restriction (vegan, keto, gluten-free, etc.)
- `maxPrepTime` (number): Maximum preparation time in minutes
- `maxCalories` (number): Maximum calories per serving
- `minCalories` (number): Minimum calories per serving
- `minProtein` (number): Minimum protein in grams
- `maxProtein` (number): Maximum protein in grams
- `minCarbs` (number): Minimum carbs in grams
- `maxCarbs` (number): Maximum carbs in grams
- `minFat` (number): Minimum fat in grams
- `maxFat` (number): Maximum fat in grams
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Items per page (default: 12, max: 100)

**Example Request:**
```
GET /api/v1/recipes?mealType=breakfast&dietaryTag=vegan&maxPrepTime=30&page=1&limit=12
```

**Response:**
```json
{
  "recipes": [
    {
      "id": "06440028-6b42-4199-b8e6-16f...",
      "name": "Quinoa Power Bowl",
      "description": "A nutritious breakfast bowl packed with protein and fiber",
      "mealTypes": ["breakfast"],
      "dietaryTags": ["vegan", "gluten-free"],
      "mainIngredientTags": ["quinoa"],
      "ingredientsJson": [
        {
          "name": "quinoa",
          "amount": "1",
          "unit": "cup"
        }
      ],
      "instructionsText": "1. Rinse quinoa thoroughly...",
      "prepTimeMinutes": 15,
      "cookTimeMinutes": 20,
      "servings": 2,
      "caloriesKcal": 350,
      "proteinGrams": "12.50",
      "carbsGrams": "45.00",
      "fatGrams": "8.00",
      "imageUrl": "https://...",
      "isApproved": true,
      "creationTimestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 45
}
```

#### Get Single Recipe
`GET /api/v1/recipes/:id`

Retrieve detailed information for a specific recipe.

**Parameters:**
- `id` (string): Recipe UUID

**Response:**
```json
{
  "id": "06440028-6b42-4199-b8e6-16f...",
  "name": "Quinoa Power Bowl",
  "description": "A nutritious breakfast bowl packed with protein and fiber",
  "mealTypes": ["breakfast"],
  "dietaryTags": ["vegan", "gluten-free"],
  "mainIngredientTags": ["quinoa"],
  "ingredientsJson": [
    {
      "name": "quinoa",
      "amount": "1",
      "unit": "cup"
    }
  ],
  "instructionsText": "1. Rinse quinoa thoroughly...",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 20,
  "servings": 2,
  "caloriesKcal": 350,
  "proteinGrams": "12.50",
  "carbsGrams": "45.00",
  "fatGrams": "8.00",
  "imageUrl": "https://...",
  "isApproved": true,
  "creationTimestamp": "2024-01-01T00:00:00.000Z"
}
```

### Meal Plans

#### Generate Meal Plan
🔒 `POST /api/v1/meal-plans/generate`

Generate a personalized meal plan based on user requirements.

**Request Body:**
```json
{
  "planName": "Weight Loss Plan",
  "fitnessGoal": "weight_loss",
  "description": "High protein, low carb meal plan",
  "dailyCalorieTarget": 1800,
  "days": 7,
  "mealsPerDay": 3,
  "clientName": "John Doe",
  "dietaryTag": "keto",
  "maxPrepTime": 45
}
```

**Response:**
```json
{
  "mealPlan": {
    "id": "temp-123456",
    "planName": "Weight Loss Plan",
    "fitnessGoal": "weight_loss",
    "description": "High protein, low carb meal plan",
    "dailyCalorieTarget": 1800,
    "days": 7,
    "mealsPerDay": 3,
    "clientName": "John Doe",
    "generatedBy": "43965828",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "meals": [
      {
        "day": 1,
        "mealNumber": 1,
        "mealType": "breakfast",
        "recipe": {
          "id": "06440028-6b42-4199-b8e6-16f...",
          "name": "Keto Scrambled Eggs",
          "description": "Fluffy eggs with cheese and herbs",
          "caloriesKcal": 400,
          "proteinGrams": "25.00",
          "carbsGrams": "3.00",
          "fatGrams": "32.00",
          "prepTimeMinutes": 10,
          "servings": 1,
          "mealTypes": ["breakfast"],
          "imageUrl": "https://..."
        }
      }
    ]
  },
  "nutrition": {
    "total": {
      "calories": 12600,
      "protein": 945,
      "carbs": 315,
      "fat": 630
    },
    "averageDaily": {
      "calories": 1800,
      "protein": 135,
      "carbs": 45,
      "fat": 90
    },
    "daily": [
      {
        "day": 1,
        "calories": 1800,
        "protein": 135,
        "carbs": 45,
        "fat": 90
      }
    ]
  },
  "message": "Meal plan generated successfully"
}
```

#### Parse Natural Language
🔒 `POST /api/v1/meal-plans/parse-natural-language`

Parse natural language input into structured meal plan parameters.

**Request Body:**
```json
{
  "input": "Create a 7 day meal plan for weight loss with 1800 calories per day, 3 meals daily, focusing on high protein and low carb foods"
}
```

**Response:**
```json
{
  "planName": "Weight Loss Plan",
  "fitnessGoal": "weight_loss",
  "description": "High protein, low carb meal plan for weight loss",
  "dailyCalorieTarget": 1800,
  "days": 7,
  "mealsPerDay": 3,
  "dietaryTag": "low_carb"
}
```

### Admin Operations

#### Generate Recipes (Admin)
🔒 `POST /api/v1/admin/generate-recipes`

Batch generate recipes using AI for database seeding.

**Request Body:**
```json
{
  "count": 50,
  "mealTypes": ["breakfast", "lunch", "dinner"],
  "dietaryTags": ["vegan", "keto"]
}
```

**Response:**
```json
{
  "message": "Recipe generation started",
  "count": 50,
  "started": true
}
```

#### Get Recipe Statistics
🔒 `GET /api/v1/admin/stats`

Get comprehensive statistics about the recipe database.

**Response:**
```json
{
  "total": "223",
  "approved": "223",
  "pending": "0",
  "avgRating": "0.00"
}
```

#### Approve Recipe
🔒 `PATCH /api/v1/recipes/:id/approve`

Approve a pending recipe for public visibility.

**Parameters:**
- `id` (string): Recipe UUID

**Response:**
```json
{
  "id": "06440028-6b42-4199-b8e6-16f...",
  "name": "Quinoa Power Bowl",
  "isApproved": true,
  "lastUpdatedTimestamp": "2024-01-01T00:00:00.000Z"
}
```

### Utilities

#### Placeholder Image
`GET /api/v1/placeholder/:width/:height`

Generate placeholder images for recipes without photos.

**Parameters:**
- `width` (number): Image width in pixels
- `height` (number): Image height in pixels

**Response:**
Returns an SVG image with the specified dimensions.

## Error Responses

### Validation Errors (400)
```json
{
  "message": "Validation failed: planName is required"
}
```

### Authentication Errors (401)
```json
{
  "message": "Unauthorized"
}
```

### Not Found Errors (404)
```json
{
  "message": "Recipe not found"
}
```

### Server Errors (500)
```json
{
  "message": "Internal server error"
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Public endpoints: 100 requests per minute per IP
- Authenticated endpoints: 200 requests per minute per user
- Admin endpoints: 50 requests per minute per user

## Data Types

### Recipe Object
```typescript
interface Recipe {
  id: string;
  name: string;
  description: string;
  mealTypes: string[];
  dietaryTags: string[];
  mainIngredientTags: string[];
  ingredientsJson: Array<{
    name: string;
    amount: string;
    unit?: string;
  }>;
  instructionsText: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  caloriesKcal: number;
  proteinGrams: string;
  carbsGrams: string;
  fatGrams: string;
  imageUrl?: string;
  isApproved: boolean;
  creationTimestamp: string;
  lastUpdatedTimestamp: string;
}
```

### Meal Plan Object
```typescript
interface MealPlan {
  id: string;
  planName: string;
  fitnessGoal: string;
  description?: string;
  dailyCalorieTarget: number;
  days: number;
  mealsPerDay: number;
  clientName?: string;
  generatedBy: string;
  createdAt: Date;
  meals: Array<{
    day: number;
    mealNumber: number;
    mealType: string;
    recipe: {
      id: string;
      name: string;
      description: string;
      caloriesKcal: number;
      proteinGrams: string;
      carbsGrams: string;
      fatGrams: string;
      prepTimeMinutes: number;
      servings: number;
      mealTypes: string[];
      imageUrl?: string;
    };
  }>;
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
// Search recipes
const recipes = await fetch('/api/recipes?mealType=breakfast&limit=10')
  .then(res => res.json());

// Generate meal plan
const mealPlan = await fetch('/api/meal-plans/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    planName: 'My Plan',
    fitnessGoal: 'weight_loss',
    dailyCalorieTarget: 1800,
    days: 7,
    mealsPerDay: 3
  })
}).then(res => res.json());
```

### cURL Examples
```bash
# Search recipes
curl "https://your-domain.replit.app/api/recipes?mealType=breakfast&limit=10"

# Generate meal plan (requires authentication)
curl -X POST "https://your-domain.replit.app/api/meal-plans/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "planName": "My Plan",
    "fitnessGoal": "weight_loss",
    "dailyCalorieTarget": 1800,
    "days": 7,
    "mealsPerDay": 3
  }'
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Progress Tracking API

The Progress Tracking API allows customers to monitor their fitness journey through body measurements, goal setting, and progress photos.

### Body Measurements

#### Get Customer Measurements
🔒 `GET /progress/measurements` (Customer role required)

Retrieves all body measurements for the authenticated customer with optional date filtering.

**Query Parameters:**
- `startDate` (optional): ISO date string to filter from (inclusive)
- `endDate` (optional): ISO date string to filter to (inclusive)

**Example Request:**
```
GET /progress/measurements?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "customerId": "123e4567-e89b-12d3-a456-426614174000",
      "measurementDate": "2024-01-15T00:00:00.000Z",
      "weightLbs": "175.5",
      "bodyFatPercentage": "18.2",
      "waistCm": "85.0",
      "chestCm": "100.0",
      "notes": "Feeling strong today!",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Create New Measurement
🔒 `POST /progress/measurements` (Customer role required)

Creates a new body measurement record for the authenticated customer.

**Request Body:**
```json
{
  "measurementDate": "2024-01-15T00:00:00.000Z",
  "weightLbs": 175.5,
  "bodyFatPercentage": 18.2,
  "waistCm": 85.0,
  "chestCm": 100.0,
  "notes": "Monthly measurement"
}
```

#### Update Goal Progress
🔒 `PATCH /progress/goals/:id/progress` (Customer role required)

Updates the current progress value for a goal. Automatically calculates progress percentage.

**Request Body:**
```json
{
  "currentValue": 170
}
```

### Progress Photos

#### Upload Progress Photo
🔒 `POST /progress/photos` (Customer role required)

Uploads a new progress photo with automatic S3 storage and image processing.

**Request:** Multipart form data with photo file and metadata.

## Support

For API support and questions:
- Check the [BEGINNER_DEVELOPER_GUIDE.md](./BEGINNER_DEVELOPER_GUIDE.md) for implementation details
- Review [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for data structure
- Test endpoints using the provided examples
- Monitor response times and error rates in production