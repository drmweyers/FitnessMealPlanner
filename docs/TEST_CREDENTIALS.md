# FitnessMealPlanner Test Credentials

## 🔐 Official Test Account Credentials

These are the official test credentials for the FitnessMealPlanner application. Always use these credentials when testing functionality.

**IMPORTANT:** These credentials are active on both DEVELOPMENT and PRODUCTION environments.

### Admin Account
- **Email:** `admin@fitmeal.pro`
- **Password:** `AdminPass123`
- **Role:** Admin
- **Access:** Full system access, analytics dashboard, user management

### Trainer Account  
- **Email:** `trainer.test@evofitmeals.com`
- **Password:** `TestTrainer123!`
- **Role:** Trainer
- **Access:** Customer management, meal plan creation, recipe management

### Customer Account
- **Email:** `customer.test@evofitmeals.com`
- **Password:** `TestCustomer123!`
- **Role:** Customer
- **Access:** View meal plans, track progress, view recipes

## Usage Notes
- These accounts are pre-configured in the development database
- Use these credentials for all E2E tests, Playwright tests, and manual testing
- Never change these passwords in the development environment
- These accounts have sufficient data for testing all features

## Test Environments

### Development
- **URL:** http://localhost:4000
- **API Endpoint:** http://localhost:4000/api
- **Health Check:** http://localhost:4000/api/health

### Production
- **URL:** https://evofitmeals.com
- **API Endpoint:** https://evofitmeals.com/api
- **Health Check:** https://evofitmeals.com/api/health

## Important Notes
- ✅ These credentials are **ACTIVE** on both DEV and PROD
- ✅ Verified and tested on September 1, 2025
- ✅ All three accounts authenticate successfully
- ✅ Customer accounts redirect to `/my-meal-plans`

Last Updated: September 1, 2025