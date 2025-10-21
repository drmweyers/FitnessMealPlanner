const jwt = require('jsonwebtoken');

// This simulates what happens in the auth middleware
const secret = 'test-jwt-secret-for-integration-tests';

// Create an expired token
const expiredToken = jwt.sign(
  { id: 'test-user', role: 'customer' },
  secret,
  { expiresIn: '-1h' }
);

console.log('Testing expired token verification...');

try {
  const decoded = jwt.verify(expiredToken, secret);
  console.log('Token is valid:', decoded);
} catch (e) {
  console.log('Error caught!');
  console.log('Error name:', e.name);
  console.log('Is TokenExpiredError?', e.name === 'TokenExpiredError');
  console.log('e instanceof jwt.TokenExpiredError:', e instanceof jwt.TokenExpiredError);

  // Check what the actual error type is
  const jwtErrors = jwt;
  console.log('jwt.TokenExpiredError exists?', typeof jwtErrors.TokenExpiredError);
}