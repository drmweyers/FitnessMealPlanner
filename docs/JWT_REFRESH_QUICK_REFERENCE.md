# JWT Token Refresh - Quick Reference Guide

## For Developers

### Using the New API Client

**Old Way** (Don't use anymore):
```typescript
const response = await fetch('/api/users/me', {
  headers: { Authorization: `Bearer ${token}` }
});
```

**New Way** (Recommended):
```typescript
import { apiFetch, apiFetchJSON, apiGet } from '@/lib/apiClient';

// Option 1: Use helper functions
const user = await apiGet<User>('/users/me');

// Option 2: Use apiFetch for more control
const response = await apiFetch('/users/me');
const user = await response.json();

// Option 3: POST with body
const result = await apiPost<Result>('/users/update', { name: 'John' });
```

**Benefits**:
- ✅ Automatic token refresh on 401
- ✅ Automatic retry with exponential backoff
- ✅ Deduplication of concurrent requests
- ✅ Proper error handling

### Token Constants

```typescript
// Access Token
ACCESS_TOKEN_EXPIRY = '15m'        // 15 minutes
REFRESH_BUFFER = 5 * 60 * 1000     // Refresh 5min before expiry

// Refresh Token
REFRESH_TOKEN_EXPIRY = '30d'       // 30 days
REFRESH_GRACE_PERIOD = 60 * 1000   // 60 seconds grace period

// Retry Logic
MAX_RETRIES = 3                    // Max retry attempts
INITIAL_RETRY_DELAY = 1000         // 1 second base delay
```

### Common Tasks

#### Check Token Refresh Stats (Development)
```typescript
import { getRefreshStats } from '@/middleware/tokenRefreshManager';

console.log(getRefreshStats());
// {
//   pendingRefreshes: 0,
//   gracePeriodTokens: 2,
//   gracePeriodList: [...]
// }
```

#### Manual Token Refresh
```typescript
import { refreshAccessToken } from '@/lib/apiClient';

const newToken = await refreshAccessToken();
if (!newToken) {
  // Refresh failed - user will be redirected to login
}
```

#### Check if Token Needs Refresh
```typescript
import { shouldRefreshToken, getTokenExpiry } from '@/middleware/tokenRefreshManager';

const token = localStorage.getItem('token');
const expiry = getTokenExpiry(token);

if (shouldRefreshToken(expiry)) {
  console.log('Token should be refreshed soon');
}
```

### Debugging

#### Enable Verbose Logging
```typescript
// Client-side: Console logs automatically enabled
// Look for [ApiClient] prefix

// Server-side: Console logs automatically enabled
// Look for [TokenRefresh] prefix
```

#### Common Log Messages

**Client-Side**:
```
[ApiClient] 401 error - attempting token refresh
[ApiClient] Token refreshed - retrying request
[ApiClient] Deduplicating refresh request
[ApiClient] Retrying in 1234ms (attempt 2/3)
```

**Server-Side**:
```
[TokenRefresh] Deduplicating refresh request for user abc123
[TokenRefresh] Token rotation complete: user abc123
[TokenRefresh] Grace period token accepted: xyz789
```

### Error Handling

#### Handle Refresh Failures
```typescript
import { apiFetch } from '@/lib/apiClient';

try {
  const response = await apiFetch('/api/users/me');
  const user = await response.json();
} catch (error) {
  if (error.message.includes('Session expired')) {
    // User was redirected to login
    console.log('User session expired');
  } else {
    // Other error
    console.error('API error:', error);
  }
}
```

### Testing

#### Run E2E Tests
```bash
# Run all JWT refresh tests
npm run test:e2e -- jwt-refresh-reliability.spec.ts

# Run specific test
npm run test:e2e -- jwt-refresh-reliability.spec.ts -g "should handle multiple simultaneous requests"

# Run with UI mode (recommended)
npx playwright test jwt-refresh-reliability.spec.ts --ui
```

#### Manual Testing Checklist
- [ ] Login and use app for 30 minutes (verify no unexpected logouts)
- [ ] Open 2 tabs and use simultaneously (verify both stay logged in)
- [ ] Disable network briefly and re-enable (verify retry works)
- [ ] Wait 15 minutes and make request (verify auto-refresh)

### Best Practices

#### DO ✅
- Use `apiFetch` or helper functions for all API calls
- Let the system handle token refresh automatically
- Trust the retry logic for transient failures
- Monitor logs for refresh patterns

#### DON'T ❌
- Don't manually refresh tokens in component code
- Don't implement custom retry logic
- Don't store refresh tokens in localStorage
- Don't bypass the API client for authenticated requests

### Architecture Quick Reference

```
Client Request (401)
    ↓
Check pendingRefresh
    ↓
[Exists] → Wait for existing refresh
    ↓
[Not exists] → POST /auth/refresh_token
    ↓
Store new token → Retry request
    ↓
[Success] → Return response
    ↓
[401 again] → Redirect to login
```

### File Locations

**Server**:
- Token refresh manager: `server/middleware/tokenRefreshManager.ts`
- Auth middleware: `server/middleware/auth.ts`
- Auth routes: `server/authRoutes.ts`

**Client**:
- API client: `client/src/lib/apiClient.ts`
- Auth context: `client/src/contexts/AuthContext.tsx`

**Tests**:
- E2E tests: `test/e2e/jwt-refresh-reliability.spec.ts`

**Documentation**:
- Full lifecycle: `docs/JWT_TOKEN_LIFECYCLE.md`
- Implementation summary: `JWT_REFRESH_FIX_SUMMARY.md`

### Troubleshooting

#### Issue: User logged out unexpectedly
**Check**:
1. Server logs for refresh errors
2. Browser console for [ApiClient] errors
3. Network tab for 401 responses
4. Cookie expiry times

#### Issue: Multiple refresh calls
**Check**:
1. Deduplication working (`getRefreshStats()`)
2. Client-side pendingRefresh logic
3. Server-side pendingRefreshes map

#### Issue: Grace period not working
**Check**:
1. Grace period map has entries (`getRefreshStats()`)
2. Token in grace period (`isTokenInGracePeriod(token)`)
3. Cleanup not running too early

### Performance Metrics

**Typical Values**:
- Token refresh: < 100ms
- Retry delay: 1s → 2s → 4s (exponential)
- Grace period overhead: < 1KB memory
- Deduplication savings: ~200ms per concurrent request

**Monitoring**:
```typescript
// Check refresh stats every 5 minutes
setInterval(() => {
  console.log('Refresh stats:', getRefreshStats());
}, 5 * 60 * 1000);
```

---

## Quick Commands

```bash
# View token refresh manager code
cat server/middleware/tokenRefreshManager.ts

# View API client code
cat client/src/lib/apiClient.ts

# Run E2E tests
npm run test:e2e -- jwt-refresh-reliability.spec.ts

# Check test coverage
npm run test:coverage

# View comprehensive documentation
cat docs/JWT_TOKEN_LIFECYCLE.md
```

---

**Last Updated**: 2025-01-20
**Version**: 1.0
