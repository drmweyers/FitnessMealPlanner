# Admin Dashboard System

## Overview

A comprehensive admin dashboard system has been built to provide full control and visibility over the FitnessMealPlanner platform. This system includes user management, usage statistics, access logging, and system monitoring capabilities.

## Features

### 1. User Management
- **View All Users**: Get comprehensive list of all users with detailed information
- **User Details**: Get detailed information about any specific user
- **User Activity**: Track all activities and interactions for a specific user
- **Role Management**: Update user roles (admin, trainer, customer)
- **User Deletion**: Delete users (with safety checks)

### 2. Usage Statistics
- **System Overview**: Complete system statistics including users, content, engagement, and subscriptions
- **Usage Stats**: Detailed usage statistics with time-based filtering
- **Quick Stats**: Summary statistics for dashboard widgets
- **Feature Usage**: Track usage by feature (recipe views, meal plan generations, etc.)

### 3. Access Logging
- **Automatic Logging**: All API requests are automatically logged
- **Access Logs**: View access logs with filtering by user, endpoint, date range
- **Activity Tracking**: Track who accessed what and when

### 4. System Control
- **System Health**: Monitor system uptime, database size, response times
- **Subscription Management**: View subscription statistics and revenue
- **Content Statistics**: Track recipes, meal plans, and content approval status

## API Endpoints

### System Overview
```
GET /api/admin/dashboard/overview
```
Returns comprehensive system overview including:
- User statistics (total, new users, by role)
- Content statistics (recipes, meal plans)
- Engagement metrics
- Subscription statistics
- System health

### User Management

#### Get All Users
```
GET /api/admin/dashboard/users
```
Query Parameters:
- `role` (optional): Filter by role (admin, trainer, customer)
- `search` (optional): Search by email or name
- `limit` (optional, default: 100): Number of results per page
- `offset` (optional, default: 0): Pagination offset
- `sortBy` (optional, default: createdAt): Sort field (createdAt, email, role)
- `sortOrder` (optional, default: desc): Sort order (asc, desc)

Response includes:
- User list with extended information (subscription status, activity stats, account age)
- Pagination metadata

#### Get User Details
```
GET /api/admin/dashboard/users/:id
```
Returns detailed information about a specific user including:
- Basic user information
- Subscription details (for trainers)
- Activity statistics
- Account age

#### Get User Activity
```
GET /api/admin/dashboard/user-activity/:userId
```
Returns:
- User details
- Access logs for the user
- Interaction statistics (views, favorites, ratings)

#### Update User Role
```
PATCH /api/admin/dashboard/users/:id/role
```
Body:
```json
{
  "role": "admin" | "trainer" | "customer"
}
```
Note: Cannot change your own role

#### Delete User
```
DELETE /api/admin/dashboard/users/:id
```
Note: Cannot delete your own account

### Usage Statistics

#### Get Usage Stats
```
GET /api/admin/dashboard/usage-stats
```
Query Parameters:
- `startDate` (optional): Start date (ISO datetime)
- `endDate` (optional): End date (ISO datetime)

Returns:
- Total users and breakdown by role
- Active users (today, this week, this month)
- Recipe statistics
- Meal plan statistics
- Interaction statistics
- Subscription statistics
- Revenue information
- Usage by feature

#### Get Quick Stats Summary
```
GET /api/admin/dashboard/stats/summary
```
Returns quick statistics for dashboard widgets:
- Total users, new users today
- Recipe counts (total, approved, pending)
- Active subscriptions
- Monthly revenue
- User breakdown by role
- Engagement metrics

### Access Logs

#### Get Access Logs
```
GET /api/admin/dashboard/access-logs
```
Query Parameters:
- `userId` (optional): Filter by user ID
- `endpoint` (optional): Filter by endpoint
- `startDate` (optional): Start date (ISO datetime)
- `endDate` (optional): End date (ISO datetime)
- `limit` (optional, default: 100): Number of results

Returns access logs with:
- User information (ID, email, role)
- Endpoint and HTTP method
- IP address and user agent
- Response status code and time
- Timestamp

## Implementation Details

### Access Logging Middleware
- Automatically logs all API requests
- Captures: user ID, endpoint, method, IP address, user agent, response status, response time
- Batches logs for efficient storage
- Flushes logs periodically (every 30 seconds or when batch size reached)

### Admin Dashboard Service
- Centralized service for all admin dashboard operations
- Efficient database queries with proper indexing
- Comprehensive user information enrichment
- Real-time statistics calculation

### Security
- All endpoints require admin authentication
- Safety checks prevent self-modification/deletion
- Input validation using Zod schemas
- Error handling and logging

## Usage Examples

### Get System Overview
```bash
curl -X GET "http://localhost:4000/api/admin/dashboard/overview" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Get All Users
```bash
curl -X GET "http://localhost:4000/api/admin/dashboard/users?role=trainer&limit=50" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Get User Activity
```bash
curl -X GET "http://localhost:4000/api/admin/dashboard/user-activity/USER_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Get Usage Statistics
```bash
curl -X GET "http://localhost:4000/api/admin/dashboard/usage-stats?startDate=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Update User Role
```bash
curl -X PATCH "http://localhost:4000/api/admin/dashboard/users/USER_ID/role" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "trainer"}'
```

## Files Created/Modified

### New Files
1. `server/middleware/accessLogging.ts` - Access logging middleware
2. `server/services/adminDashboardService.ts` - Admin dashboard service
3. `server/routes/adminDashboard.ts` - Admin dashboard routes

### Modified Files
1. `server/index.ts` - Added admin dashboard routes and access logging middleware
2. `server/routes/adminRoutes.ts` - Enhanced with comprehensive statistics

## Future Enhancements

1. **Database Table for Access Logs**: Create a proper `access_logs` table for persistent storage
2. **Real-time Updates**: Add WebSocket support for real-time dashboard updates
3. **Export Functionality**: Add CSV/Excel export for user lists and statistics
4. **Advanced Filtering**: Add more filtering options for access logs
5. **User Activity Timeline**: Visual timeline of user activities
6. **Alert System**: Set up alerts for suspicious activities or system issues
7. **Audit Trail**: Comprehensive audit trail for all admin actions

## Notes

- Access logging is currently in-memory and logs to console. For production, implement proper database storage.
- Some statistics may need adjustment based on actual database schema relationships.
- All endpoints require admin authentication via the `requireAdmin` middleware.
- The system is designed to be scalable and can handle large datasets efficiently.

