// Reset Rate Limits for Testing
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

async function resetRateLimits() {
  try {
    console.log('🧹 Resetting rate limits for testing...');

    // Clear all rate limit related keys
    const patterns = [
      'rate-limit:*',
      'cache:rate-limit:*',
      'fixed:*',
      'sliding:*',
      'bucket:*',
      'auth:*',
      'global:*',
    ];

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        console.log(`Deleting ${keys.length} keys matching pattern: ${pattern}`);
        await redis.del(...keys);
      }
    }

    // Specifically clear auth-related rate limits for test accounts
    const testAccounts = [
      'admin@fitmeal.pro',
      'testtrainer@example.com',
      'testcustomer@example.com'
    ];

    for (const email of testAccounts) {
      const authKeys = await redis.keys(`*auth*${email}*`);
      const ipKeys = await redis.keys(`*ip:*`);
      
      if (authKeys.length > 0) {
        console.log(`Clearing auth limits for ${email}: ${authKeys.length} keys`);
        await redis.del(...authKeys);
      }
    }

    // Clear IP-based rate limits (since tests come from localhost)
    const ipKeys = await redis.keys('*127.0.0.1*');
    if (ipKeys.length > 0) {
      console.log(`Clearing IP-based limits: ${ipKeys.length} keys`);
      await redis.del(...ipKeys);
    }

    // Clear localhost/::1 IPv6 limits
    const ipv6Keys = await redis.keys('*::1*');
    if (ipv6Keys.length > 0) {
      console.log(`Clearing IPv6-based limits: ${ipv6Keys.length} keys`);
      await redis.del(...ipv6Keys);
    }

    console.log('✅ Rate limits reset successfully!');

    // Show remaining cache info
    const totalKeys = await redis.dbsize();
    console.log(`📊 Total Redis keys remaining: ${totalKeys}`);

  } catch (error) {
    console.error('❌ Error resetting rate limits:', error);
  } finally {
    await redis.quit();
  }
}

resetRateLimits();