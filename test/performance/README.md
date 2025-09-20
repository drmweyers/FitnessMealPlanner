# FitnessMealPlanner Performance Test Suite

A comprehensive performance testing framework for the FitnessMealPlanner application with 200 specialized tests covering API performance, frontend optimization, database efficiency, and scalability metrics.

## 📊 Test Suite Overview

### Total Tests: 200
- **API Performance Tests**: 60 tests
- **Frontend Performance Tests**: 50 tests
- **Database Performance Tests**: 50 tests
- **Scalability Tests**: 40 tests

### Performance Targets
- **API GET requests**: < 200ms average response time
- **API POST requests**: < 500ms average response time
- **Page load times**: < 3 seconds
- **Database queries**: < 100ms average execution time
- **Concurrent users**: Support for 1000+ users
- **Memory usage**: < 50MB increase under load

## 🚀 Quick Start

### Prerequisites
1. **Docker running** - Required for development environment
2. **Development server running** - `npm run dev` on localhost:4000
3. **Database connection** - PostgreSQL configured
4. **Playwright browsers** - `npx playwright install`

### Running Tests

```bash
# Run all performance tests (25-40 minutes)
npm run test:performance

# Run specific test suites
npm run test:performance:api          # API tests only (~5-8 minutes)
npm run test:performance:frontend     # Frontend tests only (~8-12 minutes)
npm run test:performance:database     # Database tests only (~3-5 minutes)
npm run test:performance:scalability  # Scalability tests only (~10-15 minutes)

# Run baseline performance tests
npm run test:performance:baseline     # Quick baseline check (~2-3 minutes)

# Advanced usage with options
tsx test/performance/run-performance-tests.ts --verbose
tsx test/performance/run-performance-tests.ts --suite=api --no-report
```

### Quick Health Check
```bash
# Get fast performance overview
npm run test:performance:baseline
```

## 📋 Test Categories

### 1. API Performance Tests (60 tests)

**Authentication API** (5 tests)
- Login request performance
- JWT token validation speed
- Password reset efficiency
- Token refresh performance
- Logout request handling

**Recipe API** (10 tests)
- Recipe list fetching
- Single recipe retrieval
- Recipe creation/updates
- Recipe search performance
- Filtering and pagination
- Nutritional info queries

**Meal Plan API** (10 tests)
- Meal plan generation
- Meal plan CRUD operations
- PDF export performance
- Meal plan sharing
- Analytics queries

**User Management API** (5 tests)
- Profile operations
- Preferences management
- Avatar uploads
- User settings

**Analytics API** (5 tests)
- Dashboard metrics
- Usage statistics
- Performance reports
- Data exports

**Grocery List API** (5 tests)
- List generation
- Item management
- PDF exports
- Sharing functionality

**Search API** (5 tests)
- Global search
- Filtered search
- Autocomplete
- Advanced search
- Search suggestions

**File Upload API** (5 tests)
- Image uploads
- Bulk operations
- File validation
- Image processing

**Caching Performance** (5 tests)
- Cache hit rates
- Cache invalidation
- Cache warming
- Compression efficiency

**Rate Limiting** (5 tests)
- Rate limit handling
- Burst request management
- Recovery performance
- Tier-based limits

### 2. Frontend Performance Tests (50 tests)

**Page Load Performance** (10 tests)
- Home page loading
- Dashboard rendering
- Recipe pages
- Meal plan interface
- Profile pages
- Settings panels
- Analytics dashboards

**Component Rendering** (5 tests)
- Recipe cards
- Meal plan grids
- Navigation menus
- Forms
- Data tables

**Image Loading** (5 tests)
- Recipe images
- Lazy loading
- Responsive images
- Error handling
- Preloading

**Interactive Elements** (5 tests)
- Button responses
- Form submissions
- Dropdown interactions
- Modal dialogs
- Tooltips

**Scroll & Animation** (5 tests)
- Smooth scrolling
- Infinite scroll
- CSS animations
- Page transitions
- Parallax effects

**Memory & Resources** (5 tests)
- Memory leak detection
- CSS loading
- JavaScript bundles
- Font loading
- Service workers

**Network Performance** (5 tests)
- Slow network handling
- Offline scenarios
- Browser caching
- Response compression
- CDN performance

**Progressive Web App** (5 tests)
- PWA installation
- App shell loading
- App updates
- Background sync
- Push notifications

**Mobile Performance** (5 tests)
- Mobile optimization
- Touch interactions
- Viewport handling
- Battery efficiency
- Network adaptation

### 3. Database Performance Tests (50 tests)

**Query Execution** (10 tests)
- SELECT performance
- JOIN operations
- Aggregation queries
- INSERT/UPDATE/DELETE
- Complex queries
- Subqueries
- Window functions

**Index Performance** (10 tests)
- Primary key indexes
- Unique indexes
- Composite indexes
- Full-text search
- GIN indexes
- Expression indexes
- Covering indexes

**Transaction Performance** (10 tests)
- Simple transactions
- Complex transactions
- Rollbacks
- Savepoints
- Concurrent transactions
- Isolation levels
- Deadlock handling

**Connection Pool** (10 tests)
- Connection acquisition
- Pool exhaustion
- Connection recycling
- Timeout handling
- Health validation
- Authentication
- Scaling behavior

**Large Dataset Operations** (10 tests)
- Large result sets
- Pagination
- Bulk operations
- Data exports
- Analytical queries
- Cross-table statistics

### 4. Scalability Tests (40 tests)

**User Load Scaling** (10 tests)
- 10 concurrent users
- 50 concurrent users
- 100 concurrent users
- Authentication load
- Search under load
- File uploads at scale

**Data Volume Scaling** (10 tests)
- Large recipe datasets
- Large meal plan sets
- Large user bases
- Complex searches
- Bulk imports
- Data exports
- Pagination efficiency

**Real-time Updates** (10 tests)
- WebSocket connections
- Live notifications
- Data synchronization
- Collaborative editing
- Presence indicators
- Activity feeds

**Memory Usage Under Load** (10 tests)
- API load memory
- DOM manipulation
- Large forms
- Image processing
- Concurrent operations
- Garbage collection

## 📊 Performance Metrics

### Collected Metrics
- **Response Times**: min, max, average, p50, p95, p99
- **Throughput**: requests per second
- **Error Rates**: success/failure percentages
- **Resource Usage**: memory, CPU, network
- **User Experience**: page load times, interactivity

### Baseline Measurements
```typescript
{
  apiGet: { avg: "<200ms", p95: "<300ms" },
  apiPost: { avg: "<500ms", p95: "<750ms" },
  pageLoad: { avg: "<3000ms", p95: "<4500ms" },
  dbQuery: { avg: "<100ms", p95: "<200ms" }
}
```

## 📈 Reports and Analysis

### Generated Reports
- **JSON Report**: Detailed metrics and raw data
- **HTML Report**: Visual dashboard with charts
- **Performance Recommendations**: Automated optimization suggestions
- **Trend Analysis**: Performance over time

### Report Location
```
./test-results/performance/
├── performance-report.json      # Detailed metrics
├── performance-report.html      # Visual dashboard
├── api-results.json            # API test results
├── frontend-results.json       # Frontend test results
├── database-results.json       # Database test results
└── scalability-results.json    # Scalability test results
```

## 🔧 Configuration

### Environment Variables
```bash
# Test Configuration
TEST_API_URL=http://localhost:4000/api
TEST_FRONTEND_URL=http://localhost:4000
TEST_DATABASE_URL=postgresql://...

# Performance Thresholds
API_GET_MAX=200                  # ms
API_POST_MAX=500                # ms
PAGE_LOAD_MAX=3000              # ms
DB_QUERY_MAX=100                # ms
MEMORY_LEAK_MAX=50              # MB

# Load Test Configuration
USERS_LOW=10
USERS_MEDIUM=50
USERS_HIGH=100
USERS_STRESS=1000
```

### Test Configuration File
```typescript
// test/performance/config.ts
export const TEST_CONFIG = {
  API_BASE_URL: process.env.TEST_API_URL || 'http://localhost:4000/api',
  PERFORMANCE_THRESHOLDS: {
    API_GET_MAX: 200,
    API_POST_MAX: 500,
    PAGE_LOAD_MAX: 3000,
    DB_QUERY_MAX: 100
  }
};
```

## 🎯 Best Practices

### Running Performance Tests
1. **Consistent Environment**: Always run tests in the same environment
2. **Baseline First**: Establish baselines before making changes
3. **Isolated Testing**: Run performance tests separately from unit tests
4. **Multiple Runs**: Run tests multiple times for statistical significance
5. **Monitor Resources**: Watch system resources during tests

### Performance Optimization Workflow
1. **Measure**: Run baseline performance tests
2. **Optimize**: Make performance improvements
3. **Verify**: Re-run tests to verify improvements
4. **Monitor**: Set up continuous performance monitoring

### CI/CD Integration
```yaml
# .github/workflows/performance.yml
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Start services
        run: docker-compose up -d
      - name: Run performance tests
        run: npm run test:performance:baseline
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: test-results/performance/
```

## 🛠️ Troubleshooting

### Common Issues

#### Tests Failing with Timeout Errors
```bash
# Solution 1: Increase timeout
VITEST_TIMEOUT=60000 npm run test:performance

# Solution 2: Check if services are running
docker ps
curl http://localhost:4000/api/health
```

#### Database Connection Errors
```bash
# Check database connectivity
npm run test:performance:database
# Verify DATABASE_URL is set correctly
echo $DATABASE_URL
```

#### Browser/Playwright Issues
```bash
# Reinstall browsers
npx playwright install
# Run in headed mode for debugging
npx playwright test --headed
```

#### Memory Issues During Tests
```bash
# Run individual suites
npm run test:performance:api
npm run test:performance:frontend
# Monitor system resources
htop  # Linux/Mac
taskmgr  # Windows
```

### Performance Debugging
```bash
# Verbose output for debugging
tsx test/performance/run-performance-tests.ts --verbose

# Run specific test patterns
npm run test:performance -- --grep "API Performance"

# Generate detailed reports
npm run test:performance:baseline --verbose
```

## 📚 Advanced Usage

### Custom Performance Tests
```typescript
// test/performance/custom-performance.test.ts
import { describe, it, expect } from 'vitest';
import { PerformanceTester } from './comprehensive-performance.test';

const tester = new PerformanceTester();

describe('Custom Performance Tests', () => {
  it('should handle custom API endpoint', async () => {
    const metrics = await tester.measureApiEndpoint('/custom/endpoint');
    expect(metrics.avg).toBeLessThan(200);
  });
});
```

### Performance Monitoring Integration
```typescript
// monitoring/performance-monitor.ts
import { PerformanceTestRunner } from '../test/performance/run-performance-tests';

export class PerformanceMonitor {
  async runContinuousMonitoring() {
    const runner = new PerformanceTestRunner();

    setInterval(async () => {
      await runner.runBaselineTests();
    }, 60000); // Every minute
  }
}
```

### Custom Metrics Collection
```typescript
// utils/performance-metrics.ts
export class MetricsCollector {
  async collectCustomMetrics() {
    return {
      serverResponse: await this.measureServerResponse(),
      databaseHealth: await this.measureDatabaseHealth(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }
}
```

## 🤝 Contributing

When adding new performance tests:

1. **Follow the existing pattern**: Use the PerformanceTester class
2. **Add appropriate thresholds**: Define realistic performance expectations
3. **Document new tests**: Update this README with new test descriptions
4. **Test your tests**: Ensure tests pass in clean environment
5. **Consider CI impact**: Keep test execution time reasonable

### Test Structure
```typescript
describe('New Performance Category', () => {
  it('should meet performance threshold', async () => {
    const metrics = await tester.measureApiEndpoint('/new/endpoint');
    expect(metrics.avg).toBeLessThan(THRESHOLD);
    expect(metrics.p95).toBeLessThan(THRESHOLD * 1.5);
  });
});
```

## 📞 Support

For issues with performance tests:
1. Check this README for troubleshooting steps
2. Review test logs in `./test-results/performance/`
3. Ensure all prerequisites are met
4. Run baseline tests first to verify setup

---

**Last Updated**: September 2025
**Total Test Coverage**: 200 performance tests
**Estimated Full Suite Runtime**: 25-40 minutes