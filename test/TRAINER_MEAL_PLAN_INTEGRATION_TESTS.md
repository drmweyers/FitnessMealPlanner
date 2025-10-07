# Trainer Meal Plan Management Integration Tests

## Overview
This document describes the comprehensive integration test suite for the trainer meal plan management feature in FitnessMealPlanner.

## Test Coverage

### 1. Complete Meal Plan Management Workflow
- ✅ Trainer saves a meal plan to their library
- ✅ Trainer retrieves their saved meal plans
- ✅ Trainer retrieves a specific meal plan with details
- ✅ Trainer updates a saved meal plan
- ✅ Trainer assigns meal plan to a customer
- ✅ Trainer assigns same meal plan to multiple customers
- ✅ Trainer unassigns meal plan from a customer
- ✅ Trainer deletes a saved meal plan

### 2. Error Handling and Edge Cases
- ✅ Cannot access another trainer's meal plans
- ✅ Customer cannot access trainer meal plan endpoints
- ✅ Invalid meal plan data returns validation error
- ✅ Cannot assign meal plan to non-existent customer
- ✅ Handles deletion of plans with active assignments

### 3. Performance and Data Integrity
- ✅ Can handle large meal plans (30 days, 150 meals)
- ✅ Concurrent assignments don't create conflicts
- ✅ Data consistency across multiple operations

### 4. Search and Filter Functionality
- ✅ Retrieves all meal plans without filter
- ✅ Can filter meal plans by template status (if implemented)
- ✅ Can search meal plans by tags (if implemented)

## Running the Tests

### Prerequisites
1. Docker must be installed and running
2. Development environment must be set up

### Quick Start
```bash
# Start Docker if not running
docker-compose --profile dev up -d

# Run the integration tests
npm run test:trainer-meal-plans

# Or run all integration tests
npm run test:integration
```

### Manual Test Execution
```bash
# Run specific test file
npm test -- test/integration/trainerMealPlanManagement.test.ts

# Run with coverage
npm test -- --coverage test/integration/trainerMealPlanManagement.test.ts

# Run in watch mode for development
npm test -- --watch test/integration/trainerMealPlanManagement.test.ts
```

## Test Data Setup

The tests automatically:
1. Create test trainer and customer accounts
2. Authenticate users and obtain tokens
3. Clean up test data after completion

### Sample Test Data
- **Trainer Email**: `trainer-{timestamp}@test.com`
- **Customer Emails**: `customer1-{timestamp}@test.com`, `customer2-{timestamp}@test.com`
- **Password**: `Password123!`

## Key Test Scenarios

### Scenario 1: Basic CRUD Operations
Tests the fundamental Create, Read, Update, Delete operations for meal plans in the trainer's library.

### Scenario 2: Assignment Management
Tests assigning meal plans to customers, managing multiple assignments, and unassigning plans.

### Scenario 3: Security & Authorization
Ensures trainers can only access their own meal plans and customers cannot access trainer endpoints.

### Scenario 4: Large Data Handling
Tests the system's ability to handle meal plans with 30 days and 150 meals.

### Scenario 5: Concurrent Operations
Verifies that multiple simultaneous operations don't cause conflicts or data corruption.

## Expected API Responses

### Successful Operations
- **201 Created**: New meal plan saved or assigned
- **200 OK**: Successful retrieval, update, or deletion
- **JSON Response**: Contains meal plan data, assignments, and metadata

### Error Responses
- **400 Bad Request**: Invalid data or missing required fields
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions (e.g., customer accessing trainer endpoints)
- **404 Not Found**: Meal plan or customer not found
- **500 Server Error**: Database or server issues

## Troubleshooting

### Common Issues

1. **Docker not running**
   ```bash
   docker-compose --profile dev up -d
   ```

2. **Database connection errors**
   - Check PostgreSQL container: `docker ps`
   - View logs: `docker logs fitnessmealplanner-dev`

3. **Test failures due to existing data**
   - Tests include cleanup, but you can manually reset:
   ```bash
   docker-compose --profile dev down
   docker-compose --profile dev up -d
   ```

## Future Enhancements

1. **Additional Filter Tests**
   - Filter by fitness goal
   - Filter by date range
   - Search by plan name

2. **Performance Benchmarks**
   - Response time thresholds
   - Database query optimization tests

3. **Stress Testing**
   - Handling 1000+ meal plans
   - Concurrent user simulations

4. **Integration with Other Features**
   - PDF export of assigned meal plans
   - Customer notification on assignment
   - Analytics and reporting

## Contributing

When adding new features to trainer meal plan management:
1. Add corresponding integration tests
2. Update this documentation
3. Ensure all tests pass before merging
4. Consider edge cases and error scenarios