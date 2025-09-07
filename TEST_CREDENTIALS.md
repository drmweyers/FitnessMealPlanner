# FitnessMealPlanner Test Credentials
**Last Updated:** December 7, 2024  
**Status:** ✅ ACTIVE - Use for all development and production testing

---

## 🔐 Official Test Accounts

### Admin Account
- **Email:** `admin@fitmeal.pro`
- **Password:** `AdminPass123`
- **Role:** Administrator
- **Permissions:** Full system access
- **Use Cases:** 
  - Recipe generation and management
  - User management
  - System configuration
  - Analytics dashboard
  - All admin-level features

### Trainer Account
- **Email:** `trainer.test@evofitmeals.com`
- **Password:** `TestTrainer123!`
- **Role:** Trainer
- **Permissions:** Trainer-level access
- **Use Cases:**
  - Customer management
  - Meal plan creation and assignment
  - Progress tracking
  - Customer invitations
  - Trainer dashboard features

### Customer Account
- **Email:** `customer.test@evofitmeals.com`
- **Password:** `TestCustomer123!`
- **Role:** Customer
- **Permissions:** Customer-level access
- **Use Cases:**
  - View assigned meal plans
  - Track progress
  - Set goals
  - Export PDFs
  - Customer dashboard features

---

## 📝 Usage Guidelines

### Development Environment
- **URL:** `http://localhost:4000`
- **Database:** Local PostgreSQL (port 5433)
- **Docker:** `fitnessmealplanner-dev` container
- Use these accounts for all local testing

### Production Environment
- **URL:** `https://evofitmeals.com`
- **Status:** Accounts verified and active
- Use these accounts for production validation only

### Automated Testing
```javascript
// Use in test files
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@fitmeal.pro',
    password: 'AdminPass123'
  },
  trainer: {
    email: 'trainer.test@evofitmeals.com',
    password: 'TestTrainer123!'
  },
  customer: {
    email: 'customer.test@evofitmeals.com',
    password: 'TestCustomer123!'
  }
};
```

### Playwright E2E Testing
```typescript
// Login helper function
async function loginAs(page: Page, role: 'admin' | 'trainer' | 'customer') {
  const credentials = TEST_ACCOUNTS[role];
  await page.goto('/login');
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
}
```

---

## ⚠️ Security Notes

1. **DO NOT CHANGE PASSWORDS** - These are shared test accounts
2. **DO NOT USE FOR REAL DATA** - Test accounts only
3. **DO NOT DELETE ACCOUNTS** - Required for automated testing
4. **DO NOT SHARE PUBLICLY** - Internal testing only
5. **ROTATE PERIODICALLY** - Update this file when credentials change

---

## 🔄 Account Maintenance

### Verification Status
- ✅ Admin account: Active and verified
- ✅ Trainer account: Active and verified  
- ✅ Customer account: Active and verified
- ✅ Database relationships: Properly configured
- ✅ Foreign key constraints: Valid

### Last Verification
- **Date:** December 7, 2024
- **Method:** Automated test suite
- **Result:** All accounts functional

### Reset Instructions
If accounts need to be reset:
```bash
# Run the test account seed script
npm run seed:test-accounts

# Or with direct database URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fitnessmealplanner" npm run seed:test-accounts
```

---

## 📊 Test Coverage

These accounts are used in:
- Unit tests: 200+ test cases
- Integration tests: 83+ test cases
- E2E tests: 50+ test scenarios
- Performance tests: Load testing
- Security tests: Authentication/authorization
- Production validation: Smoke tests

---

## 🚀 Quick Start

### Local Development
```bash
# Start Docker environment
docker-compose --profile dev up -d

# Verify accounts exist
npm run verify:test-accounts

# Run tests with these accounts
npm test
```

### Manual Testing
1. Navigate to login page
2. Use credentials above based on role to test
3. Verify role-specific features work correctly

---

**Note:** This document is the single source of truth for test credentials. Always refer to this file for the latest account information.