# SSE Connection Loss Fixes

## Problem
During long-running bulk recipe generation (10, 20, 30, 50 recipes), the SSE (Server-Sent Events) connection would timeout and display "SSE connection lost" error, causing the user to lose progress visibility even though generation was still running.

## Root Causes

1. **No Keepalive Mechanism**: SSE connections can timeout after periods of inactivity. During long recipe generation, there might be gaps between progress updates, causing the connection to be closed by proxies, load balancers, or browsers.

2. **No Automatic Reconnection**: When the connection was lost, the frontend would immediately show an error and stop trying to reconnect, even though the server-side generation was still running.

3. **Stale Connection Cleanup Too Aggressive**: The server was cleaning up connections after 5 minutes, which might be too short for large batch generations.

4. **No Progress Sync on Reconnection**: When reconnecting, the frontend didn't fetch the current progress state, so users would see outdated information.

## Fixes Applied

### Server-Side (SSEManager.ts)

1. **Added Keepalive Mechanism**
   - Sends keepalive messages every 30 seconds to all active connections
   - Uses SSE comment format (`: keepalive timestamp\n\n`) which is part of the SSE spec
   - Prevents connection timeouts during periods of inactivity

2. **Increased Stale Connection Threshold**
   - Changed from 5 minutes to 10 minutes
   - Allows longer-running generations without premature cleanup

3. **Improved Error Handling**
   - Checks if response is writable before sending events
   - Automatically removes dead connections from client list
   - Better error logging for debugging

4. **Connection Health Checks**
   - Validates connection state before sending events
   - Removes invalid clients automatically during broadcasts

### Client-Side (BMADRecipeGenerator.tsx)

1. **Automatic Reconnection Logic**
   - Detects when connection is closed (readyState === CLOSED)
   - Automatically attempts to reconnect up to 5 times
   - Shows reconnection status to user: "Reconnecting... (1/5)"
   - 3-second delay between reconnection attempts

2. **Progress State Sync**
   - Fetches current progress from API when reconnecting
   - Syncs UI state with server state on successful reconnection
   - Handles completed/error states properly

3. **Smart Error Handling**
   - Distinguishes between recoverable (connection lost) and non-recoverable errors
   - Only shows fatal error after max reconnection attempts
   - Preserves generation state in localStorage for page refresh recovery

4. **Reconnection Attempt Tracking**
   - Resets attempt counter on successful connection
   - Resets on successful progress updates
   - Prevents infinite reconnection loops

## Technical Details

### Keepalive Format
```javascript
// Server sends every 30 seconds:
: keepalive 1234567890\n\n
```

### Reconnection Flow
1. Connection error detected (readyState === CLOSED)
2. Check if max attempts exceeded
3. If not, wait 3 seconds
4. Attempt reconnection
5. On success: fetch current progress, sync state
6. On failure: increment attempt counter, retry

### Progress Sync
When reconnecting, the frontend:
1. Fetches current progress from `/api/admin/bmad-progress/:batchId`
2. Updates UI state with fetched progress
3. Determines if generation is still active or completed
4. Updates `isGenerating` state accordingly

## Benefits

1. **No More Lost Connections**: Keepalive prevents timeout during long generations
2. **Automatic Recovery**: Connection losses are automatically recovered
3. **Better UX**: Users see reconnection status instead of immediate error
4. **State Preservation**: Progress is preserved even if connection is lost
5. **Resilient**: Handles network issues, proxy timeouts, and browser limitations

## Testing Recommendations

1. **Test Long Generations**: Generate 50 recipes and verify connection stays alive
2. **Test Network Interruption**: Disconnect network briefly, verify reconnection
3. **Test Browser Refresh**: Refresh page during generation, verify reconnection
4. **Test Multiple Clients**: Open multiple tabs, verify all stay connected
5. **Test Proxy/Load Balancer**: Verify keepalive works through proxies

## Monitoring

Watch for these log messages:
- `[SSE] Broadcasting progress to X clients` - Normal operation
- `[SSE] Attempting to reconnect (attempt X/5)` - Reconnection in progress
- `[SSE] Failed to send keepalive` - Connection issue detected
- `[BMAD] Fetched current progress` - Progress sync on reconnection

## Files Modified

1. `server/services/utils/SSEManager.ts` - Added keepalive, improved error handling
2. `client/src/components/BMADRecipeGenerator.tsx` - Added reconnection logic, progress sync

## Configuration

### Adjustable Parameters

**Server (SSEManager.ts)**:
- `KEEPALIVE_INTERVAL_MS`: 30000 (30 seconds) - How often to send keepalive
- `STALE_CONNECTION_THRESHOLD_MS`: 600000 (10 minutes) - When to cleanup stale connections

**Client (BMADRecipeGenerator.tsx)**:
- `maxReconnectAttempts`: 5 - Maximum reconnection attempts
- `reconnectDelayMs`: 3000 (3 seconds) - Delay between reconnection attempts

These can be adjusted based on your infrastructure and requirements.




