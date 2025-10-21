# JWT Token Lifecycle and Refresh Behavior

## Overview

FitnessMealPlanner uses a dual-token JWT authentication system with automatic token refresh, grace periods, and race condition prevention. This document describes the complete token lifecycle and refresh behavior.

## Token Types

### Access Token
- **Purpose**: Authorizes API requests
- **Expiry**: 15 minutes
- **Storage**:
  - HTTP-only cookie (`token`)
  - localStorage (`token`) for client-side access
- **Refresh Strategy**: Automatic refresh 5 minutes before expiry

### Refresh Token
- **Purpose**: Obtains new access tokens
- **Expiry**: 30 days
- **Storage**: HTTP-only cookie (`refreshToken`)
- **Rotation**: New refresh token issued on each refresh operation
- **Grace Period**: Old refresh token valid for 60 seconds after rotation

## Token Lifecycle

### 1. Initial Login

```
User Login
    ↓
Credentials Validated
    ↓
Generate Access Token (15min) + Refresh Token (30d)
    ↓
Store Refresh Token in Database
    ↓
Set HTTP-only Cookies (token, refreshToken)
    ↓
Return Access Token to Client
    ↓
Client Stores Access Token in localStorage
```

**Code Location**: `server/authRoutes.ts` (lines 143-248)

### 2. Authenticated Request

```
Client Makes API Request
    ↓
Include Access Token in Authorization Header
    ↓
Server Validates Token (middleware/auth.ts)
    ↓
[If Valid] → Process Request → Return Response
    ↓
[If Expired] → Token Refresh Flow (see below)
    ↓
[If Invalid] → Return 401 Unauthorized
```

**Code Location**: `server/middleware/auth.ts` (lines 89-229)

### 3. Token Refresh Flow

#### Server-Side (Automatic)

```
Access Token Expired (TokenExpiredError)
    ↓
Extract Refresh Token from Cookie
    ↓
Verify Refresh Token Signature
    ↓
Check Refresh Token in Database OR Grace Period
    ↓
[If Valid in DB or Grace Period]
    ↓
Deduplicate: Check if refresh already in progress for user
    ↓
[If Already Refreshing] → Return existing refresh promise
    ↓
[If Not Refreshing] → Execute refresh:
        ↓
    Generate New Access Token (15min)
    Generate New Refresh Token (30d)
        ↓
    Store New Refresh Token in Database
        ↓
    Add Old Refresh Token to Grace Period (60s)
        ↓
    Delete Old Refresh Token from Database
        ↓
    Set New HTTP-only Cookies
        ↓
    Set Response Headers (X-Access-Token, X-Refresh-Token)
        ↓
    Attach User to Request
        ↓
    Continue to Next Middleware
    ↓
[If Invalid or Expired] → Clear Cookies → Return 401
```

**Code Location**:
- `server/middleware/auth.ts` (lines 128-213)
- `server/middleware/tokenRefreshManager.ts` (lines 80-142)

#### Client-Side (Retry on 401)

```
API Request Returns 401
    ↓
Check if pendingRefresh exists
    ↓
[If Refresh in Progress] → Wait for existing refresh
    ↓
[If No Refresh in Progress] → Start new refresh:
        ↓
    POST /api/auth/refresh_token (with credentials)
        ↓
    [If Success] → Store New Access Token in localStorage
                → Retry Original Request with New Token
        ↓
    [If 401] → Clear Auth State → Redirect to /login
    ↓
[Retry Fails with 401] → Redirect to /login
```

**Code Location**:
- `client/src/lib/apiClient.ts` (lines 20-72)
- `client/src/contexts/AuthContext.tsx` (lines 49-77)

## Race Condition Prevention

### Problem
Multiple simultaneous API requests near token expiry could trigger multiple refresh requests, causing:
- Database race conditions
- Token rotation conflicts
- Premature token invalidation
- User being logged out unexpectedly

### Solution: Request Deduplication

#### Server-Side
```typescript
// Map of userId → pending refresh promise
const pendingRefreshes = new Map<string, Promise<Tokens>>();

async function refreshTokensWithDeduplication(userId, oldRefreshToken) {
  // Check if refresh already in progress
  if (pendingRefreshes.has(userId)) {
    return pendingRefreshes.get(userId); // Return existing promise
  }

  // Create new refresh promise
  const promise = executeRefresh(userId, oldRefreshToken);
  pendingRefreshes.set(userId, promise);

  // Clean up after completion
  promise.finally(() => pendingRefreshes.delete(userId));

  return promise;
}
```

**Code Location**: `server/middleware/tokenRefreshManager.ts` (lines 80-142)

#### Client-Side
```typescript
let pendingRefresh: Promise<string | null> | null = null;

async function refreshAccessToken() {
  // If refresh already in progress, return existing promise
  if (pendingRefresh) {
    return pendingRefresh;
  }

  pendingRefresh = (async () => {
    // ... refresh logic ...
  })();

  return pendingRefresh;
}
```

**Code Location**: `client/src/lib/apiClient.ts` (lines 20-63)

## Grace Period System

### Purpose
Allows old refresh tokens to remain valid for 60 seconds after a new token is issued. This prevents race conditions where:
1. Request A triggers refresh, gets new token
2. Request B (in-flight) tries to use old token
3. Without grace period: Request B fails with 401
4. With grace period: Request B succeeds

### Implementation

```typescript
// Grace period tokens map: token → expiry timestamp
const gracePeriodTokens = new Map<string, number>();

function addTokenToGracePeriod(token: string) {
  const expiry = Date.now() + 60000; // 60 seconds
  gracePeriodTokens.set(token, expiry);

  // Auto-cleanup after grace period
  setTimeout(() => {
    gracePeriodTokens.delete(token);
  }, 61000);
}

function isTokenInGracePeriod(token: string): boolean {
  const expiry = gracePeriodTokens.get(token);
  if (!expiry) return false;
  return Date.now() < expiry;
}
```

**Code Location**: `server/middleware/tokenRefreshManager.ts` (lines 57-78)

### Token Validation with Grace Period

```typescript
// Validate refresh token in storage OR grace period
const storedToken = await storage.getRefreshToken(refreshToken);
const inGracePeriod = isTokenInGracePeriod(refreshToken);

// Token must be in storage OR in grace period
if (!storedToken && !inGracePeriod) {
  return 401; // Unauthorized
}
```

**Code Location**: `server/middleware/auth.ts` (lines 144-158)

## Retry Logic with Exponential Backoff

### Purpose
Handle transient failures (network issues, server errors) without immediately failing.

### Strategy
- **Max Retries**: 3 attempts
- **Backoff Formula**: `delay = baseDelay * 2^retryCount + jitter`
- **Base Delay**: 1000ms (1 second)
- **Jitter**: ±30% randomization to prevent thundering herd

### Example Retry Schedule
- Attempt 1: Immediate
- Attempt 2: ~1000ms delay (1s ± 300ms)
- Attempt 3: ~2000ms delay (2s ± 600ms)
- Attempt 4: ~4000ms delay (4s ± 1200ms)

### Implementation

```typescript
async function apiFetch(endpoint, options) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(endpoint, options);

      // Handle 401 - trigger refresh
      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        // Retry with new token
      }

      if (response.ok) return response;

      // Check if retryable
      if (!isRetryableError(response.status)) {
        throw error; // Don't retry client errors
      }

      // Wait before retry
      await exponentialBackoff(attempt);
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await exponentialBackoff(attempt);
    }
  }
}
```

**Code Location**: `client/src/lib/apiClient.ts` (lines 75-152)

## Token Expiry Buffer

### Purpose
Refresh tokens proactively before they actually expire to prevent race conditions.

### Strategy
- **Access Token Expiry**: 15 minutes
- **Refresh Buffer**: 5 minutes
- **Effective Lifetime**: 10 minutes (refresh at 10min mark)

### Benefits
- Reduces 401 errors from expired tokens
- Smoother user experience
- Fewer refresh operations during active use

**Code Location**: `server/middleware/tokenRefreshManager.ts` (line 9)

## Cleanup and Maintenance

### Stale Request Cleanup
Old pending refresh requests are cleaned up every 30 seconds to prevent memory leaks.

```typescript
function cleanupStalePendingRefreshes() {
  const now = Date.now();
  const staleThreshold = 30000; // 30 seconds

  for (const [userId, entry] of pendingRefreshes) {
    if (now - entry.timestamp > staleThreshold) {
      pendingRefreshes.delete(userId);
    }
  }
}
```

**Code Location**: `server/middleware/tokenRefreshManager.ts` (lines 38-49)

### Grace Period Token Cleanup
Expired grace period tokens are automatically removed.

**Code Location**: `server/middleware/tokenRefreshManager.ts` (lines 54-65)

## Monitoring and Debugging

### Refresh Statistics
```typescript
getRefreshStats() // Returns:
// {
//   pendingRefreshes: 0,
//   gracePeriodTokens: 2,
//   gracePeriodList: [
//     { token: "eyJhbGciOiJIUzI1Ni...", expiresIn: 45000 },
//     { token: "eyJhbGciOiJIUzI1Ni...", expiresIn: 12000 }
//   ]
// }
```

**Code Location**: `server/middleware/tokenRefreshManager.ts` (lines 186-197)

### Logging
- **Client-Side**: `[ApiClient]` prefix in console logs
- **Server-Side**: `[TokenRefresh]` prefix in server logs

## Common Scenarios

### Scenario 1: User Actively Using App
```
t=0:   Login (access: 15min, refresh: 30d)
t=10m: First refresh triggered (5min buffer)
t=20m: Second refresh triggered
t=30m: Third refresh triggered
...
User stays logged in continuously
```

### Scenario 2: User Inactive for Hours
```
t=0:    Login (access: 15min, refresh: 30d)
t=15m:  Access token expires
t=2h:   User returns, makes request
        → Access token expired
        → Refresh token still valid (< 30d)
        → Automatic refresh
        → New access token issued
        → Request succeeds
User stays logged in
```

### Scenario 3: Multiple Tabs Open
```
Tab 1: Makes request → triggers refresh
Tab 2: Makes request 100ms later
       → Sees refresh in progress
       → Waits for Tab 1's refresh
       → Uses same new token
Both tabs stay logged in, single refresh operation
```

### Scenario 4: Refresh Token Expired
```
t=0:     Login (refresh: 30d)
t=30d+1: User returns, makes request
         → Refresh token expired
         → Refresh attempt fails with 401
         → Clear auth state
         → Redirect to /login
User must log in again
```

## Security Considerations

### Token Storage
- **Access Token**: localStorage (readable by JS) + HTTP-only cookie
- **Refresh Token**: HTTP-only cookie only (not accessible by JS)

### Why Both Storage Methods?
- **Cookies**: Automatically sent with requests, XSS protection
- **localStorage**: Allows client-side token checks, state management

### Token Rotation
Every refresh operation generates a NEW refresh token and invalidates the old one (after grace period). This limits the window of exposure if a token is compromised.

### Grace Period Security
- Grace period is short (60 seconds)
- Old tokens are deleted from database (only kept in memory)
- Automatic cleanup prevents accumulation

## Testing

Comprehensive E2E tests cover:
1. Multiple simultaneous requests near expiry
2. Token expiry during long API calls
3. Token rotation without breaking sessions
4. User stays logged in across refreshes
5. Graceful handling of expired refresh tokens
6. Request deduplication
7. Refresh failure handling
8. Rapid token cycles
9. Grace period validation
10. Client-side retry logic

**Test File**: `test/e2e/jwt-refresh-reliability.spec.ts`

## Troubleshooting

### User Logged Out Unexpectedly

**Possible Causes**:
1. Refresh token expired (> 30 days)
2. Server restarted (in-memory grace period lost)
3. Manual cookie deletion
4. Browser privacy mode

**Solutions**:
- Check refresh token expiry in database
- Verify cookie settings (httpOnly, secure, sameSite)
- Check server logs for refresh errors

### 401 Errors Despite Valid Token

**Possible Causes**:
1. Clock skew between client/server
2. Token issued in future (bad server time)
3. Database query failing silently

**Solutions**:
- Verify server time is correct (NTP sync)
- Check database connectivity
- Review server logs for errors

### Multiple Refresh Calls

**Expected Behavior**: Should be deduplicated to 1 call per user

**If Seeing Multiple**:
- Check `pendingRefreshes` map is working
- Verify Promise is being returned correctly
- Check cleanup is happening (finally block)

## Future Enhancements

1. **Token Revocation**: Add ability to invalidate all tokens for a user
2. **Device Management**: Track refresh tokens per device
3. **Refresh Token Rotation History**: Audit trail of token rotations
4. **Adaptive Expiry**: Adjust token lifetime based on user activity
5. **Sliding Session**: Extend refresh token expiry on active use

## References

- JWT Specification: [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- OAuth 2.0 Token Usage: [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750)
- Token Refresh Best Practices: [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
