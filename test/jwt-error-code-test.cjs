// Quick test to check JWT error codes
const jwt = require('jsonwebtoken');

// Set a test secret
const secret = 'test-secret';

// Create an expired token
const expiredToken = jwt.sign(
  { userId: 'test-user', role: 'customer' },
  secret,
  { expiresIn: '-1h' } // Already expired
);

// Try to verify it
try {
  jwt.verify(expiredToken, secret);
  console.log('Token is valid');
} catch (error) {
  console.log('Error Name:', error.name);
  console.log('Error Message:', error.message);
  console.log('Expected error name should be: TokenExpiredError');

  // This is what the middleware should check
  if (error.name === 'TokenExpiredError') {
    console.log('Should return: SESSION_EXPIRED');
  } else if (error.name === 'JsonWebTokenError') {
    console.log('Should return: INVALID_TOKEN');
  } else {
    console.log('Should return: TOKEN_ERROR');
  }
}