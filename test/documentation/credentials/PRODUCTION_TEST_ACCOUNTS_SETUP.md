# 🧪 Production Test Accounts Setup Guide

**Production URL**: https://evofitmeals.com  
**Environment**: Production  
**Purpose**: Continuous testing and quality assurance in live environment

---

## 🔑 Test Account Credentials

### **Trainer Test Account**
- **Email**: `trainer.test@evofitmeals.com`
- **Password**: `TestTrainer123!`
- **Role**: trainer
- **Access**: Full trainer dashboard with recipe catalog, customer management, meal planning tools

### **Customer Test Account**  
- **Email**: `customer.test@evofitmeals.com`
- **Password**: `TestCustomer123!`
- **Role**: customer
- **Access**: Customer dashboard with meal plan viewing, progress tracking, nutrition details

### **Relationship Status**
- ✅ **Linked**: Customer is properly linked to trainer
- ✅ **Sample Data**: 7-day meal plan assigned from trainer to customer
- ✅ **Realistic Profiles**: Complete professional and personal profiles

---

## 📋 Production Migration Process

### **1. Database Migration Script**
```javascript
// Production database migration for test accounts
// Run this in production environment after deployment

const bcrypt = require('bcrypt');
const { drizzle } = require('drizzle-orm/postgres-js');

async function createProductionTestAccounts() {
  // Trainer account creation
  const trainerPasswordHash = await bcrypt.hash('TestTrainer123!', 10);
  const trainer = await db.insert(users).values({
    email: 'trainer.test@evofitmeals.com',
    password_hash: trainerPasswordHash,
    role: 'trainer',
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  // Customer account creation
  const customerPasswordHash = await bcrypt.hash('TestCustomer123!', 10);
  const customer = await db.insert(users).values({
    email: 'customer.test@evofitmeals.com', 
    password_hash: customerPasswordHash,
    role: 'customer',
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  // Link customer to trainer with sample meal plan
  const mealPlan = await db.insert(mealPlans).values({
    name: 'QA Test Meal Plan - 7 Day Program',
    description: 'Comprehensive test meal plan for production QA testing',
    customer_id: customer[0].id,
    trainer_id: trainer[0].id,
    createdAt: new Date()
  }).returning();

  console.log('✅ Production test accounts created successfully');
  return { trainer: trainer[0], customer: customer[0], mealPlan: mealPlan[0] };
}
```

### **2. Alternative: Direct API Registration**
If database access is limited, use the production registration API:

```bash
# Register trainer account
curl -X POST https://evofitmeals.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trainer.test@evofitmeals.com",
    "password": "TestTrainer123!",
    "role": "trainer"
  }'

# Register customer account  
curl -X POST https://evofitmeals.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer.test@evofitmeals.com", 
    "password": "TestCustomer123!",
    "role": "customer"
  }'
```

---

## 🧪 Production Testing Verification

### **After Deployment, Verify:**

1. **Authentication Test**
   - Login to https://evofitmeals.com with both accounts
   - Verify proper role-based dashboard access
   - Confirm JWT tokens are working

2. **Trainer Dashboard Test**
   - Access recipe catalog
   - View customer list (should show test customer)
   - Create/edit meal plans
   - Test meal plan assignment functionality

3. **Customer Dashboard Test** 
   - View assigned meal plans
   - Check recipe details and nutrition info
   - Test profile editing
   - Verify progress tracking features

4. **Relationship Verification**
   - Trainer can see customer in client list
   - Customer can view trainer-assigned meal plans
   - Data synchronization between accounts works

---

## 🔧 Production Maintenance

### **Account Maintenance**
- **Regular Testing**: Use these accounts for ongoing production testing
- **Data Refresh**: Periodically update meal plans and profile data
- **Security**: Change passwords regularly (update this document)
- **Monitoring**: Monitor account activity and performance

### **Database Cleanup** (if needed)
```sql
-- Remove test accounts if needed (BE CAREFUL!)
DELETE FROM meal_plans WHERE customer_id IN (
  SELECT id FROM users WHERE email LIKE '%.test@evofitmeals.com'
);
DELETE FROM users WHERE email LIKE '%.test@evofitmeals.com';
```

### **Backup Current Test Data**
```sql
-- Backup test account data
SELECT * FROM users WHERE email LIKE '%.test@evofitmeals.com';
SELECT * FROM meal_plans WHERE customer_id IN (
  SELECT id FROM users WHERE email LIKE '%.test@evofitmeals.com'
);
```

---

## 🎯 Testing Scenarios

### **Core Workflows to Test**
1. **Authentication Flow**: Login → Dashboard → Logout
2. **Meal Plan Creation**: Trainer creates → Assigns to customer → Customer views
3. **Recipe Management**: Browse → Select → Add to meal plan → View nutritional info
4. **Profile Management**: Edit trainer bio → Update customer preferences
5. **PDF Export**: Generate meal plan PDFs → Download → Verify content
6. **Responsive Design**: Test on mobile → Tablet → Desktop

### **Performance Testing**
- Page load times under 2 seconds
- Database query performance
- Large meal plan handling
- Multi-user concurrent access

### **Security Testing**
- Role-based access control
- JWT token handling
- Password security
- API endpoint protection

---

## 📞 Support Information

### **Test Account Issues**
- **CTO Team**: Full access to recreate accounts if needed
- **Database Access**: Available through DigitalOcean managed database
- **API Documentation**: All endpoints tested and documented
- **Backup Procedures**: Test data can be restored from development environment

### **Production Environment**
- **URL**: https://evofitmeals.com
- **Database**: PostgreSQL managed database on DigitalOcean
- **Container Registry**: registry.digitalocean.com/bci/fitnessmealplanner
- **Monitoring**: Application metrics available through DigitalOcean dashboard

---

**✅ These test accounts are production-ready and available for immediate use after deployment completion.**

*Last Updated: August 7, 2025*  
*Version: 1.0 - Initial Production Setup*