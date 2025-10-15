# 🔐 FitnessMealPlanner Test Accounts

## ⚠️ DEVELOPMENT PHASE LOCK
**These credentials are FINAL and MUST NOT be changed during the development phase.**  
All team members should use these exact credentials for consistency.

---

## 📋 Account Credentials

### 👨‍⚕️ **TRAINER ACCOUNT**
- **Email:** `trainer.test@evofitmeals.com`
- **Password:** `TestTrainer123!`
- **Role:** `trainer`
- **Name:** Michael Thompson
- **Business:** Thompson Elite Fitness & Nutrition
- **Status:** ✅ Fully Configured

### 👤 **CUSTOMER ACCOUNT**
- **Email:** `customer.test@evofitmeals.com`
- **Password:** `TestCustomer123!`
- **Role:** `customer`
- **Name:** Sarah Johnson
- **Linked Trainer:** Michael Thompson
- **Profile:** ✅ Complete with Demographics
- **Status:** ✅ Fully Configured

---

## 🚀 Application Access

- **Development Environment:** http://localhost:4000
- **Docker Command:** `docker-compose --profile dev up -d`
- **Database:** PostgreSQL on port 5433

---

## 📊 Available Demo Data

### 🎯 **Customer Goals (5 total)**
1. **Primary Weight Loss Target** - 75kg → 65kg (18% complete)
2. **Body Composition Improvement** - 28% → 22% body fat
3. **Energy & Vitality Enhancement** - 6/10 → 9/10 achieved
4. **Habit Formation & Lifestyle Integration** - Building sustainable habits
5. **Metabolic Health Optimization** - Improving biomarkers

### 📈 **Progress Tracking (8 weeks)**
- **Weight Loss:** 75.0kg → 73.2kg (-1.8kg)
- **Body Fat Reduction:** 28.0% → 26.4% (-1.6%)
- **Muscle Gain:** +0.8kg lean muscle mass
- **Waist Reduction:** 82.0cm → 80.0cm (-2.0cm)
- **Energy Improvement:** 5/10 → 9/10

### 💪 **Strength Progress**
- **Squat:** 60kg → 78kg (+30% increase)
- **Deadlift:** 70kg → 90kg (+28% increase)
- **Bench Press:** 35kg → 48kg (+37% increase)
- **Pull-ups:** 0 → 6 unassisted

### 🍽️ **Recipe & Meal Plan Data**
- **3 Professional Recipes** with complete macro breakdowns
- **2 Weekly Meal Plans** with shopping lists and prep instructions
- **Complete ingredient database** with nutritional information
- **PDF export functionality** for meal plans and reports
- **✅ Fixed "Invalid meal plan data" error** - customers can now view meal plans properly

### 📸 **Progress Documentation**
- **4 Progress Photos** (baseline, monthly, current)
- **Detailed measurement history** with comprehensive notes
- **Professional documentation** suitable for client presentations

---

## 🔗 Data Relationships

### ✅ **Trainer Visibility**
The trainer account can access all customer data including:
- Complete health history and medical conditions
- All 5 detailed customer goals with progress tracking
- 8 weeks of comprehensive progress measurements
- Strength training progression data
- Progress photo documentation
- Meal plans and nutritional preferences
- Complete transformation story

### ✅ **Customer Experience**
The customer account provides:
- Personal dashboard with goal tracking
- Progress visualization and trends
- Meal plan access and customization
- Recipe library with macro tracking
- Photo progress comparisons
- Trainer communication integration

---

## 🎯 Demo Scenarios

### 1. **Initial Consultation Demo**
- Login as trainer to review customer's comprehensive health assessment
- Show detailed medical history, goals, and baseline measurements
- Demonstrate meal plan creation based on preferences and restrictions

### 2. **2-Month Progress Review**
- Display dramatic improvements in strength, body composition, and energy
- Show photo comparisons and measurement trends
- Demonstrate goal adjustment and future planning

### 3. **Meal Planning Session**
- Create custom meal plans with shopping lists
- Show macro tracking and nutritional optimization
- Demonstrate PDF export for client takeaways

### 4. **Client Self-Service Demo**
- Login as customer to show self-tracking capabilities
- Display progress visualization and goal tracking
- Show meal plan access and recipe customization

---

## 🔧 Technical Details

### **Database Structure**
- **Users:** Trainer and customer profiles with full relationship
- **Customer Goals:** 5 detailed goals with progress tracking
- **Progress Measurements:** 8 weeks of comprehensive tracking data
- **Progress Photos:** 4 photo records with metadata
- **Recipes:** 3 professional recipes with complete nutritional data
- **Meal Plans:** 2 weekly plans with shopping lists and prep instructions

### **Authentication**
- **JWT-based authentication** with role-based access control
- **Password hashing** with bcrypt (10 salt rounds)
- **Session management** with refresh token support

### **API Integration**
- **RESTful API** with comprehensive endpoints
- **Role-based authorization** for trainer-customer data access
- **PDF generation** for meal plans and reports
- **Image upload** support for progress photos

---

## 🚨 Important Notes

### 🔒 **Security Considerations**
- These are **test accounts only** - not for production use
- Passwords are **strong but known** - change for production
- All data is **sample data** for demonstration purposes
- **No real personal information** is stored

### 👥 **Team Usage**
- **All developers** should use these exact credentials
- **No modifications** to these accounts during development
- **Consistent data** ensures reliable testing and demos
- **Full feature testing** available with these accounts

### 📝 **Maintenance**
- **Regenerate data** if needed using: `npm run generate:test-data`
- **Enhance data** using: `npm run enhance:test-data`
- **Update accounts** using: `npm run update:test-accounts`
- **Do not modify** account credentials without team coordination

---

## 🎉 Ready for Demonstrations

This comprehensive test data setup provides everything needed for:
- **Client demonstrations** with realistic transformation stories
- **Feature testing** across all application functionality  
- **Team development** with consistent, reliable test data
- **Quality assurance** with comprehensive data scenarios

**The accounts are now locked for the development phase and provide a complete, professional-grade demonstration environment.**