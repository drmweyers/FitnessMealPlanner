const jwt = require('jsonwebtoken');

const secret = 'test-jwt-secret-for-integration-tests';

// Create expired token
const expiredToken = jwt.sign(
  { id: 'test-user', role: 'customer' },
  secret,
  { expiresIn: '-1h' }
);

console.log('Testing expired token...');

try {
  jwt.verify(expiredToken, secret);
} catch (e) {
  console.log('Error caught in verify:');
  console.log('  e.name:', e.name);
  console.log('  e.message:', e.message);
  console.log('  e.name === "TokenExpiredError":', e.name === 'TokenExpiredError');

  // This is what the middleware checks
  if (e.name === 'TokenExpiredError') {
    console.log('\nMiddleware should enter TokenExpiredError block');
    console.log('Since no refreshToken in cookies, should return SESSION_EXPIRED');
  } else {
    console.log('\nMiddleware will fall to else block and return INVALID_TOKEN');
  }
}