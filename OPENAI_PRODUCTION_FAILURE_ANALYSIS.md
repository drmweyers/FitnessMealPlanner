# OpenAI Production Failure Analysis

## Executive Summary

OpenAI API calls are failing in production with a **0.0% success rate**, causing all recipe generation and AI features to be non-functional. The system shows high CPU usage (112-113%) and critical resource pressure alerts.

## Symptoms

1. **0.0% Success Rate** - All API calls are failing
2. **High CPU Usage** - 112-113% (indicating overload/retries)
3. **Low Memory Usage** - 5-6% (not a memory issue)
4. **System Performance Degraded** alerts every 5 minutes
5. **Critical Resource Pressure** alerts continuously

## Root Cause Analysis

### 1. Missing or Invalid API Key (MOST LIKELY)

**Evidence:**
- OpenAI client initialization uses `process.env.OPENAI_API_KEY` (line 8 in `server/services/openai.ts`)
- No validation that the API key exists before making calls
- Logging shows: `console.log(\`[generateRecipeBatchSingle] OPENAI_API_KEY exists: ${!!process.env.OPENAI_API_KEY}\`);` but this may not be visible in production logs

**Impact:**
- If `OPENAI_API_KEY` is not set in production environment, all calls will fail with authentication errors
- If the key is expired or invalid, OpenAI will return 401/403 errors

**How to Verify:**
```bash
# Check if API key is set in production
echo $OPENAI_API_KEY

# Check production logs for:
# "[generateRecipeBatchSingle] OPENAI_API_KEY exists: false"
```

### 2. Network Connectivity Issues

**Evidence:**
- Health monitor shows all routes failing
- High CPU suggests requests are timing out and retrying
- OpenAI client has 2-minute timeout (120000ms) with maxRetries: 2

**Possible Causes:**
- Production server cannot reach `api.openai.com` (firewall rules)
- DNS resolution issues
- Network latency causing timeouts
- Proxy/VPN blocking OpenAI API

**How to Verify:**
```bash
# Test connectivity from production server
curl -I https://api.openai.com/v1/models
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"test"}]}'
```

### 3. Rate Limiting / Quota Exceeded

**Evidence:**
- 0.0% success rate suggests consistent failures
- High CPU from retry attempts
- OpenAI may be rate limiting or quota exceeded

**Possible Causes:**
- API key has exceeded rate limits (requests per minute)
- Monthly quota/billing limit reached
- Account suspended or payment issue

**How to Verify:**
- Check OpenAI dashboard for usage/quota
- Review error responses for rate limit headers:
  - `x-ratelimit-limit-requests`
  - `x-ratelimit-remaining-requests`
  - `x-ratelimit-reset-requests`

### 4. Error Handling Issues

**Evidence:**
- Errors are caught but may not be properly logged in production
- Error messages are generic: `"Failed to generate recipe batch: ${errorMessage}"`
- Health monitor only checks HTTP status codes, not actual API functionality

**Code Location:**
```typescript:521:528:server/services/openai.ts
  } catch (error) {
    console.error("Full error in generateRecipeBatch:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    // Log the failing content for debugging
    if (error instanceof Error && error.message.includes("JSON")) {
      // The content is likely logged in parsePartialJson
    }
    throw new Error(`Failed to generate recipe batch: ${errorMessage}`);
  }
```

**Problem:**
- Errors are logged to console but may not be visible in production logs
- No structured error logging
- No alerting when OpenAI calls fail

### 5. Timeout Configuration

**Evidence:**
- OpenAI client timeout: 120000ms (2 minutes)
- Health monitor route timeout: 10000ms (10 seconds)
- High CPU suggests requests are hanging

**Problem:**
- 2-minute timeout may be too long, causing requests to hang
- Health monitor may timeout before OpenAI calls complete
- This creates a false "failure" in health checks

## Code Analysis

### OpenAI Client Configuration

```typescript:7:11:server/services/openai.ts
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 minutes timeout for all API calls
  maxRetries: 2, // Retry failed requests twice
});
```

**Issues:**
1. No validation that `OPENAI_API_KEY` exists
2. No error handling for missing key
3. Timeout may be too long for health checks

### Health Monitor Success Rate Calculation

```typescript:555:564:server/health-monitor.ts
  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.totalRequests++;

    if (!success) {
      this.metrics.routeFailures++;
      this.metrics.lastFailureTime = new Date();
    }

    // Update success rate
    this.metrics.successRate = ((this.metrics.totalRequests - this.metrics.routeFailures) / this.metrics.totalRequests) * 100;
```

**Problem:**
- Only counts HTTP 200 as success
- Any error (500, 503, timeout) counts as failure
- Doesn't distinguish between OpenAI API failures and other failures

## Recommended Fixes

### Priority 1: Verify API Key Configuration

1. **Check Environment Variables:**
   ```bash
   # In production environment
   env | grep OPENAI_API_KEY
   ```

2. **Add API Key Validation:**
   ```typescript
   // Add to server/services/openai.ts
   if (!process.env.OPENAI_API_KEY) {
     throw new Error('OPENAI_API_KEY environment variable is not set');
   }
   
   if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
     throw new Error('OPENAI_API_KEY format is invalid (should start with sk-)');
   }
   ```

3. **Add Startup Validation:**
   ```typescript
   // Add to server/index.ts startup
   if (!process.env.OPENAI_API_KEY) {
     console.error('❌ CRITICAL: OPENAI_API_KEY not set. OpenAI features will not work.');
   } else {
     console.log('✅ OPENAI_API_KEY configured (length: ' + process.env.OPENAI_API_KEY.length + ')');
   }
   ```

### Priority 2: Improve Error Logging

1. **Add Structured Error Logging:**
   ```typescript
   catch (error) {
     const errorDetails = {
       message: error instanceof Error ? error.message : 'Unknown error',
       type: error instanceof Error ? error.constructor.name : 'Unknown',
       stack: error instanceof Error ? error.stack : undefined,
       apiKeyExists: !!process.env.OPENAI_API_KEY,
       apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
       timestamp: new Date().toISOString()
     };
     
     console.error('[OpenAI Error]', JSON.stringify(errorDetails, null, 2));
     
     // Check for specific error types
     if (error instanceof OpenAI.APIError) {
       console.error('[OpenAI API Error]', {
         status: error.status,
         code: error.code,
         type: error.type,
         message: error.message
       });
     }
     
     throw error;
   }
   ```

2. **Add Error Alerting:**
   - Send alerts when OpenAI calls fail
   - Track failure rate separately from general health
   - Alert on consecutive failures

### Priority 3: Test Network Connectivity

1. **Add Connectivity Test:**
   ```typescript
   // Add to server startup
   async function testOpenAIConnectivity() {
     try {
       const response = await fetch('https://api.openai.com/v1/models', {
         headers: {
           'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
         }
       });
       
       if (response.status === 200) {
         console.log('✅ OpenAI API connectivity: OK');
       } else {
         console.error(`❌ OpenAI API connectivity: FAILED (HTTP ${response.status})`);
       }
     } catch (error) {
       console.error('❌ OpenAI API connectivity: FAILED', error);
     }
   }
   ```

### Priority 4: Reduce Timeout for Health Checks

1. **Separate Health Check Timeout:**
   - Use shorter timeout (30s) for health checks
   - Keep longer timeout (2min) for actual recipe generation
   - Don't fail health check if OpenAI is slow

### Priority 5: Add Retry Logic with Exponential Backoff

1. **Improve Retry Strategy:**
   ```typescript
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY,
     timeout: 120000,
     maxRetries: 3, // Increase retries
     // Add exponential backoff
   });
   ```

## Immediate Action Items

1. ✅ **Check Production Environment Variables**
   - Verify `OPENAI_API_KEY` is set
   - Verify it's not expired
   - Verify it has proper permissions

2. ✅ **Check Production Logs**
   - Look for OpenAI error messages
   - Check for authentication errors (401, 403)
   - Check for rate limit errors (429)

3. ✅ **Test API Key Manually**
   ```bash
   curl -X POST https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o","messages":[{"role":"user","content":"test"}]}'
   ```

4. ✅ **Check OpenAI Dashboard**
   - Verify account status
   - Check usage/quota limits
   - Verify billing status

5. ✅ **Add Monitoring**
   - Track OpenAI API call success rate separately
   - Alert on failures
   - Log detailed error information

## Expected Error Messages

If API key is missing/invalid:
- `401 Unauthorized`
- `Invalid API key`
- `Incorrect API key provided`

If rate limited:
- `429 Too Many Requests`
- `Rate limit exceeded`
- `You exceeded your current quota`

If network issue:
- `ECONNREFUSED`
- `ETIMEDOUT`
- `ENOTFOUND`

## Conclusion

The most likely cause is **missing or invalid OPENAI_API_KEY in production**. The 0.0% success rate, combined with high CPU usage from retries, strongly suggests authentication failures or network connectivity issues.

**Next Steps:**
1. Verify API key is set in production environment
2. Test API key manually from production server
3. Check production logs for specific error messages
4. Implement the recommended fixes above


