# Redis Production Connection Fix

## Problem Summary

Your Redis connections were failing in production with `SocketClosedUnexpectedlyError: Socket closed unexpectedly`. The socket would connect briefly but then immediately close, creating a connection loop.

## Root Causes

### 1. **Missing TLS/SSL Configuration** ⚠️ MOST COMMON
Most production Redis services (Redis Cloud, Heroku Redis, AWS ElastiCache, DigitalOcean, etc.) **require TLS encryption**. Your client was connecting without TLS, so the server immediately closed the connection.

### 2. **Missing Socket Timeouts and Keepalive**
Production networks have different latency and timeout requirements. Without proper socket configuration:
- Connections timeout before establishing
- No keepalive packets to maintain connections
- No reconnection strategy for transient failures

### 3. **No Proper Reconnection Strategy**
The original code had no exponential backoff or retry limits, causing rapid reconnection attempts that could trigger rate limiting or ban from Redis service.

## What Was Fixed

### Updated `RedisService.ts` with:

1. **TLS Support**
   - Automatically detects when TLS is needed (`rediss://` URL or `REDIS_TLS=true`)
   - Sets `rejectUnauthorized: false` for services with self-signed certificates

2. **Socket Configuration**
   - `connectTimeout: 30000` - 30 seconds to establish connection
   - `keepAlive: 5000` - Sends keepalive packets every 5 seconds
   - `pingInterval: 5000` - Pings Redis every 5 seconds to maintain connection

3. **Intelligent Reconnection Strategy**
   - Exponential backoff (100ms, 200ms, 400ms, 800ms, ..., max 3s)
   - Maximum 10 reconnection attempts before giving up
   - Prevents overwhelming the Redis server

4. **Better Error Handling**
   - Graceful fallback to in-memory cache when Redis is unavailable
   - Detailed logging for debugging
   - Doesn't crash the app if Redis is temporarily down

## Production Configuration

### Option 1: Using Redis URL (Recommended)

Set this environment variable in your production environment:

```bash
# For TLS-enabled Redis (most production services)
REDIS_URL=rediss://username:password@your-redis-host:6379

# The 'rediss://' (with double 's') tells the client to use TLS
```

### Option 2: Using Individual Variables

```bash
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_TLS=true  # Set to 'true' to enable TLS
```

### Option 3: Redis URL Without TLS Prefix

If your Redis URL doesn't have `rediss://` prefix but still requires TLS:

```bash
REDIS_URL=redis://username:password@your-redis-host:6379
REDIS_TLS=true  # Force TLS even though URL says 'redis://'
```

## Common Production Redis Services

### DigitalOcean Managed Redis
```bash
# DigitalOcean provides URLs like:
REDIS_URL=rediss://default:password@your-redis-cluster.db.ondigitalocean.com:25061
# ✅ TLS is automatically enabled (rediss://)
```

### Redis Cloud
```bash
REDIS_URL=rediss://default:password@redis-xxxxx.c123.us-east-1-2.ec2.cloud.redislabs.com:12345
# ✅ TLS is automatically enabled
```

### Heroku Redis
```bash
# Heroku automatically sets REDIS_URL
REDIS_URL=rediss://:password@ec2-xx-xx-xx-xx.compute-1.amazonaws.com:12345
# ✅ TLS is automatically enabled
```

### AWS ElastiCache (with in-transit encryption)
```bash
REDIS_HOST=your-cluster.cache.amazonaws.com
REDIS_PORT=6379
REDIS_TLS=true
# ✅ TLS explicitly enabled
```

### Railway
```bash
REDIS_URL=redis://default:password@containers-us-west-xx.railway.app:6379
REDIS_TLS=true  # Railway requires TLS but URL doesn't indicate it
# ✅ TLS explicitly enabled
```

## Testing the Fix

### 1. Check Your Production Logs

After deploying, you should see:
```
[RedisService] Connecting to Redis...
[RedisService] Successfully connected to Redis
Redis client connected
Redis client ready
```

Instead of:
```
Redis client connected
Redis client error: SocketClosedUnexpectedlyError
```

### 2. Verify TLS is Being Used

Add temporary logging to check configuration:
```bash
# Check if TLS is detected in your logs
# You should see connection attempts without immediate errors
```

### 3. Test Redis Operations

```bash
# Use your health check endpoint
curl https://your-app.com/api/health

# Check Redis connection status
# Should show Redis as healthy/connected
```

## Rollback Plan

If issues persist after deploying, you can:

1. **Temporarily disable Redis** - The fallback cache will handle operations in-memory
2. **Check Redis service logs** - Your Redis provider should have connection logs
3. **Verify credentials** - Ensure REDIS_URL or credentials are correct
4. **Check firewall rules** - Ensure your production server IP is whitelisted

## Additional Recommendations

### 1. Set Connection Limits

Many Redis services have connection limits. Monitor your connection count:

```bash
# In Redis CLI
INFO clients
# Look for 'connected_clients'
```

### 2. Enable Redis Persistence (if needed)

For caching, you might want:
- **RDB**: Point-in-time snapshots (good for recovery)
- **AOF**: Append-only file (better durability)
- **None**: Fastest, data loss on restart

### 3. Monitor Redis Performance

Watch these metrics:
- Connection count
- Memory usage
- Eviction count (when memory is full)
- Hit/Miss ratio

### 4. Consider Redis Connection Pooling

If you have multiple server instances, ensure:
- Each instance maintains its own connection
- Total connections don't exceed Redis max_clients
- Use connection pooling for high-traffic scenarios

## Debugging Steps

If you still see connection issues:

### 1. Test Redis Connection Directly

```bash
# Install redis-cli locally
redis-cli -h your-redis-host -p 6379 -a your-password --tls

# Or test without TLS
redis-cli -h your-redis-host -p 6379 -a your-password
```

### 2. Check DNS Resolution

```bash
nslookup your-redis-host.com
# Ensure it resolves in production
```

### 3. Verify Port Access

```bash
telnet your-redis-host 6379
# Should connect (Ctrl+C to exit)
```

### 4. Review Redis Service Status

Check your Redis provider's dashboard for:
- Service outages
- Maintenance windows
- Connection rejections
- Authentication failures

## Environment-Specific Settings

### Development (Local)
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
# No TLS needed
```

### Staging
```bash
REDIS_URL=rediss://default:staging-password@staging-redis.example.com:6379
REDIS_TLS=true
```

### Production
```bash
REDIS_URL=rediss://default:production-password@production-redis.example.com:6379
REDIS_TLS=true
```

## Summary

✅ **What was wrong:** Missing TLS configuration and proper socket settings

✅ **What was fixed:** Added TLS support, socket timeouts, keepalive, and reconnection strategy

✅ **What you need to do:** 
1. Set `REDIS_TLS=true` in production environment variables (if not using `rediss://`)
2. Verify your `REDIS_URL` starts with `rediss://` (double 's') for TLS
3. Deploy the updated code
4. Monitor logs for successful connection

✅ **Fallback:** Even if Redis fails, your app will continue working with in-memory cache

---

**Need Help?**
- Check your Redis provider's documentation for connection strings
- Review production logs for detailed error messages
- Test connection using `redis-cli` before deploying

