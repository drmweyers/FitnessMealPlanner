# Admin Dashboard Data Fixes

## Problem Identified

The admin dashboard was showing **static/mock data** instead of real database values because:

1. **Mock Data in Analytics Service**: The `analyticsService.ts` had hardcoded mock values like:
   - `activeToday: Math.floor(totalUsers * 0.3)` - 30% calculation
   - `growthRate: 8.5` - Fixed percentage
   - `avgResponseTime: 145` - Hardcoded milliseconds
   - `uptime: 99.95` - Fixed percentage
   - `revenue: (byRole['customer'] || 0) * 29.99` - Simple multiplication

2. **Mock Time Series Data**: The frontend was generating random data for charts instead of fetching from the database

3. **Missing Real Queries**: Some metrics like `averageSessionDuration` and `averageResponseTime` were set to 0 or hardcoded

## Fixes Applied

### 1. Real Database Queries

All data now comes from **actual database queries**:

- **User Statistics**: Real counts from `users` table
- **Active Users**: Based on `updatedAt` timestamps and actual interactions
- **Interactions**: Real counts from `recipeInteractions` table
- **Revenue**: Real sums from `paymentLogs` table
- **Subscriptions**: Real counts from `trainerSubscriptions` table
- **Session Duration**: Calculated from `userActivitySessions` table

### 2. Time Series Data Endpoint

**New Endpoint**: `GET /api/admin/dashboard/time-series?days=30`

This endpoint:
- Queries the database for each day in the range
- Gets REAL new users per day
- Gets REAL interactions per day
- Gets REAL revenue per day
- Returns actual historical data for charts

### 3. Real Growth Calculations

- **User Growth**: Compares today vs yesterday from actual time series data
- **Percentage Changes**: Calculated from real previous period data
- **Trend Analysis**: Based on actual database values

### 4. Database Size Query

Added real PostgreSQL query to get actual database size:
```sql
SELECT pg_size_pretty(pg_database_size(current_database())) as size
```

### 5. Session Duration Calculation

Now calculates from `userActivitySessions` table:
```sql
SELECT avg(extract(epoch from (end_time - start_time))) 
FROM user_activity_sessions
WHERE start_time >= today AND end_time IS NOT NULL
```

## What Changed

### Backend Changes

1. **adminDashboardService.ts**:
   - Added `getTimeSeriesData()` method with real database queries
   - Fixed `getSystemOverview()` to use real session duration
   - Added `getDatabaseSize()` method
   - All queries now use actual database tables

2. **adminDashboard.ts (routes)**:
   - Added `/time-series` endpoint for chart data
   - All endpoints now return real data

### Frontend Changes

1. **AdminDashboard.tsx**:
   - Removed `generateTimeSeriesData()` mock function
   - Added React Query to fetch real time series data from API
   - Growth calculations now use real time series data
   - All charts display actual database values

## Data Flow Now

1. **User Opens Dashboard** → Frontend requests `/api/admin/dashboard/overview`
2. **Backend Queries Database** → Real SQL queries to get actual counts
3. **Data Returned** → Real numbers from database
4. **Charts Update** → Frontend fetches `/api/admin/dashboard/time-series` for historical data
5. **Auto-refresh** → Every 30 seconds, new queries fetch latest data

## Verification

To verify data is real:

1. **Create a new user** → Total users count should increase
2. **Generate a recipe** → Recipe count should increase
3. **Make an interaction** → Interaction count should increase
4. **Change date range** → Charts should show different historical data
5. **Wait 30 seconds** → Auto-refresh should show updated numbers

## Remaining Mock Data

Some data is still calculated/estimated (not truly "mock" but derived):

- **Active Users**: Based on `updatedAt` timestamp (user was active if they updated their profile)
- **Average Response Time**: Still needs `access_logs` table implementation
- **Database Size**: Now real, but may need adjustment for production

## Next Steps

1. **Implement Access Logs Table**: Create proper `access_logs` table for response time tracking
2. **Track User Sessions**: Better tracking of actual user sessions (not just profile updates)
3. **Real-time Updates**: Consider WebSocket for instant updates instead of polling
4. **Caching Strategy**: Add Redis caching for frequently accessed metrics

## Testing

To test that data is now dynamic:

1. Register a new user → Check if total users increases
2. Create a recipe → Check if recipe count increases
3. View a recipe → Check if interactions increase
4. Change user role → Check if role distribution changes
5. Wait and refresh → All numbers should reflect current database state

