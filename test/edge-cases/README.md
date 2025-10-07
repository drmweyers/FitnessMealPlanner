# Comprehensive Edge Case Test Suite

This directory contains a comprehensive test suite designed to validate the FitnessMealPlanner application's handling of edge cases across four critical areas:

## 📋 Test Categories (150 Tests Total)

### 1. Input Validation Edge Cases (40 tests)
- **Empty and Null Values**: Testing empty strings, null, undefined inputs
- **Maximum Length Inputs**: Testing fields that exceed maximum allowed length
- **Special Characters**: Unicode, emojis, special symbols, zero-width characters
- **SQL Injection Prevention**: Various SQL injection attack patterns
- **XSS Prevention**: Cross-site scripting attack vectors
- **Email Validation**: Invalid email format edge cases
- **Numeric Edge Cases**: Negative numbers, very large numbers, NaN, decimal precision
- **Date Boundary Conditions**: Invalid dates, boundary dates, null dates
- **File Upload Edge Cases**: Large files, corrupt files, unsupported formats

### 2. Authentication & Authorization Edge Cases (30 tests)
- **Token Edge Cases**: Expired, malformed, invalid signature tokens
- **Session Management**: Multiple logins, session hijacking, concurrent logouts
- **Role-Based Access Control**: Privilege escalation, cross-customer access
- **Password Security**: Brute force, hash failures, reset token tampering
- **CSRF Protection**: Cross-site request forgery prevention
- **Account Lockout**: Failed login attempts, lockout scenarios

### 3. Data Processing Edge Cases (40 tests)
- **Empty Data Sets**: Empty arrays, search results, ingredient lists
- **Large Data Sets**: Pagination, bulk operations, deep nesting
- **Duplicate Data**: Preventing duplicate recipes, invitations, assignments
- **Missing Required Fields**: Incomplete data validation
- **Data Type Mismatches**: Wrong data types in fields
- **Circular References**: Self-referencing objects
- **Race Conditions**: Concurrent updates, simultaneous operations
- **Database Transactions**: Rollback scenarios, connection failures
- **Cache Invalidation**: Cache corruption, update invalidation

### 4. API & Network Edge Cases (40 tests)
- **Network Timeouts**: Slow queries, external API timeouts, upload timeouts
- **Partial Responses**: Incomplete JSON, truncated uploads
- **Malformed Requests**: Invalid JSON, missing headers, oversized headers
- **Rate Limiting**: API rate limits, per-user limits, bypass attempts
- **Connection Drops**: Client disconnection, database connection drops
- **Retry Logic**: Transient failures, client error handling
- **Error Recovery**: Service unavailability, meaningful error messages
- **Webhook Failures**: External service failures, email service issues
- **CORS and Security**: Preflight requests, unauthorized origins
- **Resource Exhaustion**: Memory, CPU, disk space limits

## 🚀 Running the Tests

### Quick Start
```bash
# Run all edge case tests
npm run test:edge-cases

# Run with coverage report
npm run test:edge-cases:coverage

# Run specific category
npm run test:edge-cases -- --grep "Input Validation"

# Run with verbose output
npm run test:edge-cases -- --reporter=verbose
```

### Advanced Usage
```bash
# Run with custom test runner (detailed reporting)
tsx test/edge-cases/run-edge-case-tests.ts

# Run specific category only
tsx test/edge-cases/run-edge-case-tests.ts --category="Authentication"

# Quick run (faster execution)
tsx test/edge-cases/run-edge-case-tests.ts --quick

# Fail fast (stop on first failure)
tsx test/edge-cases/run-edge-case-tests.ts --fail-fast
```

### Using Vitest Directly
```bash
# Run with specific config
npx vitest run --config=test/edge-cases/vitest.edge-cases.config.ts

# Watch mode for development
npx vitest --config=test/edge-cases/vitest.edge-cases.config.ts

# UI mode for interactive testing
npx vitest --ui --config=test/edge-cases/vitest.edge-cases.config.ts
```

## 📊 Test Output and Reporting

### Console Output
The tests provide detailed console output including:
- Real-time test execution status
- Category-wise pass/fail statistics
- Detailed failure information
- Performance metrics
- Recommendations for improvements

### Generated Reports
- **JSON Report**: `test/edge-cases/results.json`
- **HTML Report**: `test/edge-cases/results.html`
- **Coverage Report**: `test/edge-cases/coverage/`
- **Execution Log**: `test/edge-cases/edge-case-results.log`
- **Detailed Report**: `test/edge-cases/edge-case-report.json`

### Report Structure
```json
{
  "overall": {
    "totalTests": 150,
    "passed": 142,
    "failed": 8,
    "skipped": 0,
    "passRate": 94.67,
    "totalDuration": 45000
  },
  "categories": [...],
  "criticalFailures": [...],
  "recommendations": [...]
}
```

## 🔧 Configuration

### Environment Setup
Ensure you have the required environment variables:
```bash
# Test database connection
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/test_db

# JWT secret for token testing
JWT_SECRET=your-test-jwt-secret

# AWS/S3 credentials for file upload tests
AWS_ACCESS_KEY_ID=test-key
AWS_SECRET_ACCESS_KEY=test-secret
AWS_BUCKET_NAME=test-bucket
```

### Docker Setup
For consistent testing environment:
```bash
# Start test database
docker-compose --profile test up -d

# Run tests in Docker
docker run --rm -v $(pwd):/app node:18 sh -c "cd /app && npm run test:edge-cases"
```

## 🎯 Test Strategy

### Coverage Goals
- **Input Validation**: 100% coverage of validation rules
- **Authentication**: All auth flows and edge cases
- **Data Processing**: Database operations and edge conditions
- **API Endpoints**: Network resilience and error handling

### Failure Handling
Tests are designed to:
- ✅ **Pass**: When the application correctly handles the edge case
- ❌ **Fail**: When the application doesn't handle the edge case properly
- ⏭️ **Skip**: When the test isn't applicable to current configuration

### Performance Benchmarks
- Individual tests should complete within 30 seconds
- Full suite should complete within 10 minutes
- Memory usage should remain under 512MB
- No memory leaks or resource exhaustion

## 🐛 Debugging Failed Tests

### Common Issues
1. **Database Connection**: Ensure test database is running
2. **JWT Secrets**: Verify JWT_SECRET environment variable
3. **File Permissions**: Check write permissions for uploads
4. **Port Conflicts**: Ensure test ports are available
5. **Memory Limits**: Increase Node.js memory if needed

### Debug Commands
```bash
# Run single test with debugging
npx vitest run -t "should handle empty string inputs" --reporter=verbose

# Debug specific category
npx vitest run --grep "Input Validation" --reporter=verbose

# Check test setup
node -e "console.log(process.env)" | grep -E "(JWT|DATABASE|AWS)"
```

### Logging
Enable detailed logging:
```bash
DEBUG=app:* npm run test:edge-cases
LOG_LEVEL=debug npm run test:edge-cases
```

## 📈 Continuous Integration

### CI/CD Integration
Add to your CI pipeline:
```yaml
name: Edge Case Tests
on: [push, pull_request]
jobs:
  edge-cases:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:edge-cases
      - uses: actions/upload-artifact@v3
        with:
          name: edge-case-reports
          path: test/edge-cases/
```

### Quality Gates
Recommended quality gates:
- Minimum 90% pass rate for production deployment
- Zero critical failures for security-related categories
- Maximum 5% regression in pass rate between releases
- Performance within acceptable thresholds

## 🔄 Maintenance

### Adding New Edge Cases
1. Identify the edge case category
2. Add test to appropriate describe block
3. Follow naming convention: `should handle [specific edge case]`
4. Include both positive and negative test cases
5. Update this README if new categories are added

### Regular Updates
- Review and update tests monthly
- Add new edge cases when bugs are discovered
- Update test data and mock configurations
- Review performance benchmarks quarterly

### Version Compatibility
- Tests are compatible with Node.js 18+
- Requires Vitest 1.0+
- Compatible with TypeScript 5.0+
- Works with latest dependencies

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest API Testing](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

## 🏆 Success Metrics

A successful edge case test suite should achieve:
- ✅ 95%+ overall pass rate
- ✅ Zero critical security failures
- ✅ All categories above 90% pass rate
- ✅ Complete execution within time limits
- ✅ Comprehensive coverage of edge conditions
- ✅ Clear actionable failure reports

---

**Last Updated**: January 2025
**Maintainer**: FitnessMealPlanner Development Team
**Version**: 1.0.0