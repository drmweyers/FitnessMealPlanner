// Load test environment variables before any other imports
process.env.NODE_ENV = 'development';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/fitmeal';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DB_SSL_MODE = 'disable';
process.env.PORT = '4001';

console.log('Test environment configured:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'), // Hide password
  JWT_SECRET: '****',
  DB_SSL_MODE: process.env.DB_SSL_MODE
});