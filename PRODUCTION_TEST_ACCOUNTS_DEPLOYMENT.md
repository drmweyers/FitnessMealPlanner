# Production Test Accounts Deployment Guide

## ✅ Test Accounts Ready for Production

All test accounts have been configured and verified locally. They are ready to be deployed to production.

### 📋 Verified Test Credentials

```
ADMIN ACCOUNT:
  Email:    admin@fitmeal.pro
  Password: AdminPass123
  Role:     admin

TRAINER ACCOUNT:
  Email:    trainer.test@evofitmeals.com
  Password: TestTrainer123!
  Role:     trainer

CUSTOMER ACCOUNT:
  Email:    customer.test@evofitmeals.com
  Password: TestCustomer123!
  Role:     customer
  Status:   ✅ LINKED TO TRAINER
```

## 🚀 Production Deployment Options

### Option 1: Automated Script (Recommended)

Use the provided deployment script:

```bash
# Set your production database URL
export DATABASE_URL="your_production_database_url_here"

# Run the deployment script
npx tsx scripts/setup-test-accounts.ts
```

### Option 2: Manual Database Connection

If you have direct database access:

```bash
# Connect to production database and run script
DATABASE_URL="postgresql://user:pass@host:port/database" npx tsx scripts/setup-test-accounts.ts
```

### Option 3: DigitalOcean App Platform

If using DigitalOcean App Platform:

1. **Access your app console**:
   - Go to: https://cloud.digitalocean.com/apps
   - Open: `fitnessmealplanner-prod`

2. **Run migration**:
   - Use the console or trusted sources to execute the account setup script
   - Alternatively, add the script to your deployment pipeline

## 🔧 What the Script Does

1. **Creates/Updates Admin Account**
   - Email: admin@fitmeal.pro
   - Secure password hash
   - Admin role privileges

2. **Creates/Updates Trainer Account**
   - Email: trainer.test@evofitmeals.com
   - Secure password hash
   - Trainer role privileges

3. **Creates/Updates Customer Account**
   - Email: customer.test@evofitmeals.com
   - Secure password hash
   - Customer role privileges

4. **Establishes Customer-Trainer Relationship**
   - Creates invitation record linking customer to trainer
   - Marks invitation as "used" to establish permanent relationship
   - Ensures customer appears in trainer's customer list

## ✅ Verification Steps

After deployment, verify the accounts work by:

### 1. Test Admin Login
```bash
curl -X POST https://evofitmeals.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fitmeal.pro","password":"AdminPass123"}'
```

### 2. Test Trainer Login
```bash
curl -X POST https://evofitmeals.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trainer.test@evofitmeals.com","password":"TestTrainer123!"}'
```

### 3. Test Customer Login
```bash
curl -X POST https://evofitmeals.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer.test@evofitmeals.com","password":"TestCustomer123!"}'
```

### 4. Verify Customer-Trainer Relationship
Login as trainer and check customer list:
```bash
# Get trainer token first, then:
curl -X GET https://evofitmeals.com/api/trainer/customers \
  -H "Authorization: Bearer YOUR_TRAINER_TOKEN"
```

## 🔒 Security Notes

- All passwords are securely hashed using bcrypt
- Test accounts follow the same security standards as production accounts
- Customer-trainer relationship is established through the proper invitation system
- All accounts have appropriate role-based access controls

## 📝 Database Changes

The script will:
- Insert/update records in the `users` table
- Create invitation records in `customer_invitations` table
- Establish proper foreign key relationships
- Set appropriate timestamps and status flags

## 🎯 Ready for Production

✅ **Status: READY TO DEPLOY**

All test accounts have been:
- ✅ Created with correct credentials
- ✅ Assigned proper roles
- ✅ Linked with customer-trainer relationship
- ✅ Tested and verified locally
- ✅ Security validated

**Next Step**: Execute the deployment script against your production database.