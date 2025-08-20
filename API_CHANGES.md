# API Changes Documentation

This document outlines all API changes, new endpoints, and modifications introduced in version 1.1.0 (qa-ready branch).

## Table of Contents
- [New Endpoints](#new-endpoints)
- [Modified Endpoints](#modified-endpoints)
- [Deprecated Endpoints](#deprecated-endpoints)
- [Breaking Changes](#breaking-changes)
- [Authentication Requirements](#authentication-requirements)
- [Request/Response Examples](#requestresponse-examples)
- [Error Handling](#error-handling)

## New Endpoints

### Progress Tracking API

#### GET /api/admin/progress/:jobId
**Purpose**: Retrieve real-time progress information for recipe generation jobs

**Authentication**: Admin required

**Parameters**:
- `jobId` (path): Unique identifier for the generation job

**Response**:
```json
{
  "jobId": "job-abc123",
  "totalRecipes": 50,
  "completed": 25,
  "failed": 2,
  "currentStep": "generating",
  "percentage": 50,
  "startTime": 1642680000000,
  "estimatedCompletion": 1642680300000,
  "errors": [
    "Failed to generate image for recipe: Spicy Chicken Tacos"
  ],
  "currentRecipeName": "Mediterranean Quinoa Salad",
  "stepProgress": {
    "stepIndex": 2,
    "stepName": "Generating recipe content",
    "itemsProcessed": 25,
    "totalItems": 50
  }
}
```

**Error Responses**:
- `404`: Job not found
- `401`: Unauthorized access
- `500`: Server error

#### POST /api/admin/generate
**Purpose**: Start tracked recipe generation with progress monitoring

**Authentication**: Admin required

**Request Body**:
```json
{
  "count": 50,
  "mealTypes": ["breakfast", "lunch"],
  "dietaryRestrictions": ["vegetarian", "gluten-free"],
  "targetCalories": 400,
  "mainIngredient": "chicken",
  "fitnessGoal": "weight-loss",
  "naturalLanguagePrompt": "High protein breakfast recipes for muscle building",
  "maxPrepTime": 30,
  "maxCalories": 500,
  "minProtein": 20,
  "maxProtein": 40,
  "minCarbs": 10,
  "maxCarbs": 50,
  "minFat": 5,
  "maxFat": 20
}
```

**Response**:
```json
{
  "message": "Recipe generation started for 50 recipes with context-based targeting.",
  "jobId": "job-abc123"
}
```

### Enhanced Recipe Management

#### POST /api/admin/generate-recipes
**Purpose**: Generate recipes with custom parameters (enhanced version)

**Authentication**: Admin required

**Request Body**:
```json
{
  "count": 25,
  "mealType": "breakfast",
  "dietaryTag": "keto",
  "maxPrepTime": 20,
  "maxCalories": 400,
  "minCalories": 200,
  "targetProtein": 30,
  "customPrompt": "Quick keto breakfast recipes for busy mornings"
}
```

**Response**:
```json
{
  "message": "Recipe generation started for 25 breakfast recipes.",
  "jobId": "job-def456",
  "estimatedDuration": "5-10 minutes"
}
```

#### PATCH /api/admin/recipes/bulk-approve
**Purpose**: Approve multiple recipes in a single operation

**Authentication**: Admin required

**Request Body**:
```json
{
  "recipeIds": ["recipe-1", "recipe-2", "recipe-3"],
  "approvalNote": "Bulk approval after review"
}
```

**Response**:
```json
{
  "message": "Successfully approved 3 recipes",
  "approved": [
    {
      "id": "recipe-1",
      "name": "Grilled Chicken Salad",
      "status": "approved"
    }
  ],
  "failed": [],
  "total": 3
}
```

#### DELETE /api/admin/recipes/bulk-delete
**Purpose**: Delete multiple recipes in a single operation

**Authentication**: Admin required

**Request Body**:
```json
{
  "recipeIds": ["recipe-4", "recipe-5"],
  "confirmationText": "DELETE",
  "reason": "Duplicate recipes removed"
}
```

**Response**:
```json
{
  "message": "Successfully deleted 2 recipes",
  "deleted": ["recipe-4", "recipe-5"],
  "total": 2
}
```

### Recipe Pagination API

#### GET /api/admin/recipes/paginated
**Purpose**: Retrieve recipes with advanced pagination and filtering

**Authentication**: Admin required

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 25, max: 100)
- `status` (string): Filter by approval status ('pending', 'approved', 'rejected')
- `mealType` (string): Filter by meal type
- `sortBy` (string): Sort field ('name', 'calories', 'protein', 'createdAt')
- `sortOrder` (string): Sort direction ('asc', 'desc')
- `search` (string): Search term for recipe names

**Response**:
```json
{
  "recipes": [
    {
      "id": "recipe-1",
      "name": "Grilled Chicken Salad",
      "calories": 350,
      "protein": 25,
      "status": "approved",
      "mealTypes": ["lunch", "dinner"],
      "createdAt": "2025-01-20T10:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 250,
    "itemsPerPage": 25,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "filters": {
    "appliedFilters": {
      "status": "approved",
      "mealType": "lunch"
    },
    "availableFilters": {
      "statuses": ["pending", "approved", "rejected"],
      "mealTypes": ["breakfast", "lunch", "dinner", "snack"]
    }
  }
}
```

## Modified Endpoints

### Enhanced Recipe Creation

#### POST /api/recipes (Enhanced)
**Changes**: Added support for bulk operations and enhanced validation

**New Fields**:
```json
{
  "batchId": "batch-123",
  "generationMetadata": {
    "aiModel": "gpt-4",
    "prompt": "High protein breakfast",
    "parameters": {
      "targetCalories": 400,
      "maxPrepTime": 30
    }
  },
  "nutritionValidated": true,
  "imageGenerated": false
}
```

### Recipe Retrieval Enhancements

#### GET /api/recipes (Enhanced)
**Changes**: Added new query parameters and response fields

**New Query Parameters**:
- `includeMetadata` (boolean): Include generation metadata
- `includeNutrition` (boolean): Include detailed nutrition information
- `batchId` (string): Filter by generation batch

**Enhanced Response**:
```json
{
  "recipes": [...],
  "metadata": {
    "totalCount": 150,
    "pendingApproval": 25,
    "averageCalories": 425,
    "lastGenerated": "2025-01-20T15:30:00Z"
  }
}
```

### User Profile Updates

#### PATCH /api/users/profile (Enhanced)
**Changes**: Added profile image upload support

**New Fields**:
```json
{
  "profileImageUrl": "https://s3.amazonaws.com/bucket/images/user-123.jpg",
  "profileImageMetadata": {
    "originalName": "profile.jpg",
    "size": 102400,
    "uploadedAt": "2025-01-20T10:00:00Z"
  }
}
```

## Deprecated Endpoints

### Legacy Recipe Generation
The following endpoints are deprecated and will be removed in v2.0.0:

#### POST /api/admin/old-generate (Deprecated)
**Status**: Deprecated in v1.1.0, use `/api/admin/generate` instead
**Removal**: Planned for v2.0.0
**Migration**: Use new progress-tracked generation endpoint

## Breaking Changes

### None in v1.1.0
This release maintains full backwards compatibility. All existing endpoints continue to work as expected.

### Future Breaking Changes (v2.0.0)
The following changes are planned for the next major version:
- Removal of deprecated generation endpoints
- Mandatory authentication for all recipe endpoints
- Changes to error response format for consistency

## Authentication Requirements

### New Authentication Rules
- All progress tracking endpoints require admin authentication
- Bulk operations require admin privileges
- Recipe generation now logs user information for audit purposes

### Token Requirements
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### Role-Based Access
- **Admin**: Full access to all endpoints
- **Trainer**: Access to customer management and meal plan generation
- **Customer**: Access to personal data and assigned meal plans

## Request/Response Examples

### Starting Recipe Generation with Progress
```bash
curl -X POST https://api.evofitmeals.com/api/admin/generate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "mealTypes": ["breakfast"],
    "dietaryRestrictions": ["vegetarian"],
    "naturalLanguagePrompt": "Quick vegetarian breakfast recipes under 300 calories"
  }'
```

### Checking Generation Progress
```bash
curl -X GET https://api.evofitmeals.com/api/admin/progress/job-abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Bulk Recipe Approval
```bash
curl -X PATCH https://api.evofitmeals.com/api/admin/recipes/bulk-approve \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "recipeIds": ["recipe-1", "recipe-2", "recipe-3"],
    "approvalNote": "Reviewed and approved for publication"
  }'
```

### Paginated Recipe Retrieval
```bash
curl -X GET "https://api.evofitmeals.com/api/admin/recipes/paginated?page=1&limit=25&status=pending&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Error Handling

### Enhanced Error Responses
All new endpoints return standardized error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid recipe generation parameters",
    "details": {
      "field": "count",
      "reason": "Count must be between 1 and 500"
    },
    "timestamp": "2025-01-20T10:00:00Z",
    "requestId": "req-abc123"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required or failed
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Requested resource not found
- `RATE_LIMITED`: Too many requests
- `GENERATION_ERROR`: Recipe generation failed
- `BULK_OPERATION_ERROR`: Bulk operation partially failed

### Progress Tracking Errors
```json
{
  "error": {
    "code": "GENERATION_FAILED",
    "message": "Recipe generation failed",
    "details": {
      "jobId": "job-abc123",
      "failedCount": 5,
      "errors": [
        "OpenAI API rate limit exceeded",
        "Invalid ingredient combination detected"
      ]
    }
  }
}
```

### Bulk Operation Errors
```json
{
  "error": {
    "code": "BULK_OPERATION_PARTIAL_FAILURE",
    "message": "Some operations failed",
    "details": {
      "successful": ["recipe-1", "recipe-2"],
      "failed": [
        {
          "id": "recipe-3",
          "error": "Recipe not found"
        }
      ]
    }
  }
}
```

## Rate Limiting

### New Rate Limits
- Recipe generation: 5 requests per minute per admin
- Progress checking: 60 requests per minute per user
- Bulk operations: 10 requests per minute per admin

### Rate Limit Headers
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642680300
```

## Versioning

### API Version Header
All requests should include the API version header:
```http
Accept: application/vnd.api+json;version=1.1
```

### Backwards Compatibility
- v1.0 endpoints remain fully functional
- New features are additive, not breaking
- Deprecation notices provided 6 months before removal

## WebSocket Events (Future)

### Planned WebSocket Support
Future versions will include WebSocket support for real-time updates:

```javascript
// Planned WebSocket events for real-time progress
ws.on('progress-update', (data) => {
  console.log('Generation progress:', data.percentage);
});

ws.on('generation-complete', (data) => {
  console.log('Generation finished:', data.results);
});
```

---

## Migration Guide

### From v1.0 to v1.1

#### No Breaking Changes
All existing integrations will continue to work without modification.

#### Recommended Updates
1. **Use new progress tracking**: Update recipe generation to use the new progress-tracked endpoint
2. **Implement pagination**: Use the new paginated endpoints for better performance
3. **Add bulk operations**: Integrate bulk approval/deletion for better admin experience

#### Example Migration
```javascript
// Old way (still works)
const generateRecipes = async (count) => {
  return await api.post('/api/admin/old-generate', { count });
};

// New way (recommended)
const generateRecipesWithProgress = async (params) => {
  const response = await api.post('/api/admin/generate', params);
  const jobId = response.data.jobId;
  
  // Poll for progress
  const checkProgress = setInterval(async () => {
    const progress = await api.get(`/api/admin/progress/${jobId}`);
    updateProgressUI(progress.data);
    
    if (progress.data.currentStep === 'complete') {
      clearInterval(checkProgress);
      handleCompletion(progress.data);
    }
  }, 2000);
};
```

---

This API documentation covers all changes introduced in version 1.1.0. For implementation details and code examples, refer to the source code and feature documentation.