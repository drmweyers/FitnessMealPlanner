# Demo Data Documentation

**Purpose:** Comprehensive, realistic demo data for client presentations
**Created:** October 21, 2025
**Status:** ✅ Ready for Use

---

## 📋 Overview

The demo data seeding script creates a complete, realistic fitness meal planning ecosystem showcasing:

- **3 Admin Accounts** - System administrators with different responsibilities
- **5 Trainer Accounts** - Specialized trainers with unique expertise
- **10 Customer Accounts** - Diverse fitness journeys and transformations
- **50+ Recipes** - Realistic meals across all categories
- **20+ Meal Plans** - Complete nutrition plans assigned to customers
- **Progress Tracking** - Weekly measurements showing transformations

---

## 🚀 How to Run

### Prerequisites
1. Docker development environment running
2. PostgreSQL database accessible on port 5433
3. All database tables created (progress_measurements, progress_photos, customer_goals)

### Execution
```bash
node scripts/seed-demo-data.js
```

**Expected Output:**
```
🔗 Connected to database
🌱 Starting demo data seed...

📝 Creating demo users...
  ✓ Created admin: Sarah Chen
  ✓ Created admin: Dr. Marcus Johnson
  ✓ Created admin: Alex Rivera
  ✓ Created trainer: Jake "The Tank" Morrison
  ...
✅ Created 18 demo users

📝 Creating demo recipes...
  ✓ Created approved recipe: Anabolic French Toast
  ...
✅ Created 55 recipes (50 approved, 5 pending)

📝 Creating trainer-customer relationships...
✅ Created 10 trainer-customer relationships

📝 Creating progress tracking data...
✅ Created 90 measurements and 10 goals

📝 Creating demo meal plans...
✅ Created 6 demo meal plans

✅ DEMO DATA SEED COMPLETE!
```

---

## 👥 Demo Accounts

### 🔑 Admin Accounts

#### 1. Chief Admin - Sarah Chen
- **Email:** `demo.admin.chief@evofitmeals.com`
- **Password:** `DemoAdmin123!`
- **Role:** System oversight, user management
- **Use Case:** Show admin dashboard, user creation, system settings

#### 2. Nutrition Admin - Dr. Marcus Johnson
- **Email:** `demo.admin.nutrition@evofitmeals.com`
- **Password:** `DemoAdmin123!`
- **Role:** Recipe approval, nutrition validation
- **Use Case:** Show recipe review queue, approval workflow

#### 3. Tech Admin - Alex Rivera
- **Email:** `demo.admin.tech@evofitmeals.com`
- **Password:** `DemoAdmin123!`
- **Role:** Technical operations, system maintenance
- **Use Case:** Show system metrics, technical features

---

### 💪 Trainer Accounts

#### 1. Bodybuilding Specialist - Jake "The Tank" Morrison
- **Email:** `demo.trainer.bodybuilding@evofitmeals.com`
- **Password:** `DemoTrainer123!`
- **Specialty:** Bodybuilding & Muscle Gain
- **Bio:** IFBB Pro with 15+ years experience
- **Certifications:** IFBB Pro Card, NASM-CPT, Precision Nutrition L2
- **Assigned Customers:**
  - Marcus Williams (Bulking transformation)
  - Ashley Kim (Bikini competitor prep)
  - Michael Brown (Newbie gaining muscle)

**Demo Use Cases:**
- Show high-protein meal plans (3000+ calories)
- Demonstrate muscle-building progress tracking
- Show trainer-customer communication for bulking phase

---

#### 2. Weight Loss Expert - Dr. Emily Watson
- **Email:** `demo.trainer.weightloss@evofitmeals.com`
- **Password:** `DemoTrainer123!`
- **Specialty:** Weight Loss & Metabolic Health
- **Bio:** PhD in Exercise Physiology, 500+ clients, 10,000 lbs lost
- **Certifications:** PhD Exercise Physiology, RD, CSCS
- **Assigned Customers:**
  - Jennifer Thompson (24.3kg transformation!)
  - Amanda Martinez (Postpartum weight loss)
  - Lisa Anderson (Maintenance phase)

**Demo Use Cases:**
- Show dramatic transformation stories (92.5kg → 68.2kg)
- Demonstrate fat loss meal plans (1800 calorie deficit)
- Show weekly progress tracking with measurements

---

#### 3. Sports Performance - Coach Tony Martinez
- **Email:** `demo.trainer.sports@evofitmeals.com`
- **Password:** `DemoTrainer123!`
- **Specialty:** Sports Performance & Athletic Nutrition
- **Bio:** Former NFL strength coach
- **Certifications:** CSCS, SCCC, CISSN
- **Assigned Customers:**
  - Tyler Jackson (College football linebacker)
  - Robert Davis (Senior athlete, 62 years old)

**Demo Use Cases:**
- Show sport-specific nutrition plans (2800 calories)
- Demonstrate performance-based meal timing
- Show athlete progress metrics

---

#### 4. Plant-Based Nutrition - Maya Green
- **Email:** `demo.trainer.vegan@evofitmeals.com`
- **Password:** `DemoTrainer123!`
- **Specialty:** Plant-Based Nutrition & Wellness
- **Bio:** 10 years plant-based, elite athlete
- **Certifications:** Plant-Based Nutrition Cert, ACE-CPT, Yoga RYT-500
- **Assigned Customers:**
  - Sophia Rodriguez (Vegan body recomp)

**Demo Use Cases:**
- Show plant-based meal plans
- Demonstrate complete protein sources
- Show vegan athlete progress

---

#### 5. Keto Specialist - Dr. Robert Ketosis
- **Email:** `demo.trainer.keto@evofitmeals.com`
- **Password:** `DemoTrainer123!`
- **Specialty:** Ketogenic Diet & Metabolic Therapy
- **Bio:** MD specializing in therapeutic ketosis
- **Certifications:** MD, Board Certified Obesity Medicine
- **Assigned Customers:**
  - David Chen (Reversed pre-diabetes, 23kg lost)

**Demo Use Cases:**
- Show low-carb, high-fat meal plans
- Demonstrate metabolic health improvements
- Show dramatic weight loss success story

---

### 🎯 Customer Accounts

#### 1. Transformation Success - Jennifer Thompson
- **Email:** `demo.customer.transformation@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Dr. Emily Watson
- **Journey:** 92.5kg → 68.2kg (Target: 65.0kg)
- **Progress:** 24.3kg lost in 8 months!
- **Goal:** Weight Loss

**Demo Highlights:**
- **Best transformation story** - dramatic before/after
- Weekly progress measurements showing consistent fat loss
- Multiple meal plans assigned over 8 months
- Progress notes documenting journey

**Use Cases:**
- Show customer dashboard with progress graphs
- Demonstrate meal plan history
- Show measurement tracking over time
- Display progress photos (if feature added)

---

#### 2. Muscle Builder - Marcus Williams
- **Email:** `demo.customer.bulking@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Jake "The Tank" Morrison
- **Journey:** 72.0kg → 84.5kg (Target: 90.0kg)
- **Progress:** 12.5kg lean muscle gained in 6 months
- **Goal:** Muscle Gain

**Demo Highlights:**
- Clean bulk success story
- High-calorie meal plans (3000+ calories)
- Strength PRs documented
- Progressive measurements

---

#### 3. College Athlete - Tyler Jackson
- **Email:** `demo.customer.athlete@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Coach Tony Martinez
- **Journey:** 88.0kg → 86.5kg (Target: 85.0kg)
- **Progress:** Improved 40-yard dash by 0.3s
- **Goal:** Performance

**Demo Highlights:**
- Sport-specific nutrition
- Performance-based goals
- Athletic meal timing

---

#### 4. Plant-Based Athlete - Sophia Rodriguez
- **Email:** `demo.customer.vegan@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Maya Green
- **Journey:** 65.0kg → 62.0kg (Target: 60.0kg)
- **Progress:** Body fat loss, muscle definition increase
- **Goal:** Body Fat Reduction

---

#### 5. Metabolic Success - David Chen
- **Email:** `demo.customer.keto@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Dr. Robert Ketosis
- **Journey:** 105.0kg → 82.0kg (Target: 75.0kg)
- **Progress:** Reversed pre-diabetes! 23kg lost
- **Goal:** Weight Loss + Health

**Demo Highlights:**
- **Health transformation** - reversed metabolic syndrome
- Keto meal plans
- A1C normalized (medical success)
- Energy improvements documented

---

#### 6. Maintenance Mode - Lisa Anderson
- **Email:** `demo.customer.maintenance@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Dr. Emily Watson
- **Journey:** 70.0kg → 68.0kg (Target: 68.0kg - ACHIEVED!)
- **Progress:** Staying lean year-round
- **Goal:** Maintenance

**Demo Highlights:**
- Show successful maintenance after fat loss
- Balanced meal plans
- Long-term sustainability

---

#### 7. Fitness Newbie - Michael Brown
- **Email:** `demo.customer.newbie@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Jake "The Tank" Morrison
- **Journey:** 78.0kg → 77.5kg (Target: 75.0kg)
- **Progress:** Just started 2 weeks ago
- **Goal:** Weight Loss

**Demo Highlights:**
- Show onboarding process
- Early-stage customer journey
- Learning phase

---

#### 8. Busy Mom - Amanda Martinez
- **Email:** `demo.customer.mom@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Dr. Emily Watson
- **Journey:** 82.0kg → 71.0kg (Target: 65.0kg)
- **Progress:** 11kg postpartum weight loss
- **Goal:** Weight Loss

**Demo Highlights:**
- Show meal prep strategies
- Time-saving meal plans
- Postpartum success story

---

#### 9. Senior Athlete - Robert Davis
- **Email:** `demo.customer.senior@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Coach Tony Martinez
- **Journey:** 90.0kg → 85.0kg (Target: 80.0kg)
- **Progress:** 62 years young! 5kg lost
- **Goal:** Weight Loss + Health

**Demo Highlights:**
- Show senior fitness success
- Age is just a number narrative
- Feeling 20 years younger

---

#### 10. Competitor - Ashley Kim
- **Email:** `demo.customer.competitor@evofitmeals.com`
- **Password:** `DemoCustomer123!`
- **Assigned Trainer:** Jake "The Tank" Morrison
- **Journey:** 58.0kg → 56.5kg (Target: 55.0kg)
- **Progress:** Bikini competitor prep - 4 weeks out
- **Goal:** Body Fat Reduction

**Demo Highlights:**
- Show competition prep
- Precise meal timing
- Peak conditioning

---

## 🍽️ Recipe Showcase

### Approved Recipes (50)

**Breakfast (10 recipes):**
- Anabolic French Toast (420 cal, 35g protein)
- Protein Pancake Stack (380 cal, 40g protein)
- Egg White Veggie Scramble (280 cal, 32g protein)
- Overnight Protein Oats (350 cal, 30g protein)
- Keto Breakfast Bowl (520 cal, 28g protein)
- And 5 more...

**Lunch (10 recipes):**
- Grilled Chicken Power Bowl (520 cal, 55g protein)
- Tuna Poke Bowl (480 cal, 45g protein)
- Turkey Avocado Wrap (420 cal, 38g protein)
- Beef Burrito Bowl (580 cal, 50g protein)
- Vegan Buddha Bowl (450 cal, 22g protein)
- And 5 more...

**Dinner (10 recipes):**
- Baked Salmon with Asparagus (480 cal, 52g protein)
- Lean Beef Stir-Fry (510 cal, 48g protein)
- Chicken Fajita Skillet (440 cal, 52g protein)
- Shrimp Cauliflower Rice (320 cal, 40g protein)
- Turkey Meatballs with Zoodles (380 cal, 45g protein)
- And 5 more...

**Snacks (20 recipes):**
- Protein Energy Balls (180 cal, 12g protein)
- Greek Yogurt Parfait (250 cal, 25g protein)
- Almond Butter Apple Slices (220 cal, 8g protein)
- And 17 more...

### Pending Approval Recipes (5)

**For Admin Demo:**
- Experimental Protein Ice Cream
- Keto Fat Bomb
- Vegan Protein Bowl
- Post-Workout Recovery Shake
- Athlete Fuel Bowl

**Use Case:** Show recipe review queue and approval workflow

---

## 📊 Meal Plan Examples

### 1. High Protein Muscle Builder
- **Target:** 3000 calories, 200g protein
- **Assigned To:** Marcus Williams, Ashley Kim
- **Use Case:** Show bulking/muscle-building plans

### 2. Fat Loss Accelerator
- **Target:** 1800 calories, 150g protein
- **Assigned To:** Jennifer Thompson, Amanda Martinez
- **Use Case:** Show deficit meal plans with transformations

### 3. Keto Fat Adaptation
- **Target:** 2000 calories, 120g protein (low-carb)
- **Assigned To:** David Chen
- **Use Case:** Show ketogenic meal plans

### 4. Plant-Based Power
- **Target:** 2200 calories, 140g protein (vegan)
- **Assigned To:** Sophia Rodriguez
- **Use Case:** Show vegan meal plans

### 5. Athlete Performance Plan
- **Target:** 2800 calories, 180g protein
- **Assigned To:** Tyler Jackson
- **Use Case:** Show sport-specific nutrition

### 6. Maintenance & Lifestyle
- **Target:** 2400 calories, 160g protein
- **Assigned To:** Lisa Anderson
- **Use Case:** Show maintenance meal plans

---

## 📈 Progress Tracking Data

**Each customer has:**
- **9 weekly measurements** (baseline → current)
- **Weight progression** showing realistic weekly changes
- **Body measurements** (chest, waist, hips, thigh, bicep)
- **Body fat percentage** tracking
- **Progress notes** documenting journey
- **Active goals** with progress percentage

**Example - Jennifer Thompson Progress:**
```
Week 0:  92.5kg (22% BF) - Baseline measurement
Week 1:  91.2kg (21.5% BF)
Week 2:  89.8kg (21.0% BF)
Week 3:  88.5kg (20.5% BF)
Week 4:  87.1kg (20.0% BF)
Week 5:  85.8kg (19.5% BF)
Week 6:  84.4kg (19.0% BF)
Week 7:  82.1kg (18.5% BF)
Week 8:  68.2kg (17.0% BF) - Current (Target: 65.0kg)
```

---

## 🎬 Client Presentation Flow

### Recommended Demo Sequence

#### 1. Admin Dashboard (5 minutes)
- Login as **Sarah Chen** (Chief Admin)
- Show recipe review queue (5 pending recipes)
- Approve a recipe to demonstrate workflow
- Show user management dashboard
- Display system overview

#### 2. Trainer Dashboard - Weight Loss (10 minutes)
- Login as **Dr. Emily Watson**
- Show customer list (3 customers assigned)
- Click on **Jennifer Thompson** (best transformation)
  - Show progress graph: 92.5kg → 68.2kg
  - Show weekly measurements
  - Show assigned meal plans
  - Show meal plan details with nutrition breakdown
  - Demonstrate meal plan assignment workflow

#### 3. Customer View - Transformation Success (10 minutes)
- Login as **Jennifer Thompson**
- Show customer dashboard with progress overview
- Click "Progress" tab
  - Display weight loss graph
  - Show body measurements table
  - Display active goal (51% progress)
- Click "Meal Plans" tab
  - Show assigned meal plans
  - Click on "Fat Loss Accelerator" plan
  - Show daily meal breakdown with nutrition
  - Show grocery list feature
- Click "Recipes" tab
  - Show recipe library
  - Demonstrate recipe favoriting

#### 4. Trainer Dashboard - Muscle Building (5 minutes)
- Login as **Jake "The Tank" Morrison**
- Show **Marcus Williams** (muscle gain story)
  - Display 72kg → 84.5kg progression
  - Show "High Protein Muscle Builder" meal plan (3000 cal)
  - Highlight strength PRs in progress notes

#### 5. Customer View - Keto Success (5 minutes)
- Login as **David Chen**
- Show dramatic transformation: 105kg → 82kg
- Highlight health improvements (reversed pre-diabetes)
- Show "Keto Fat Adaptation" meal plan
- Display energy improvements in notes

#### 6. Multi-Role Workflow (10 minutes)
- **Admin** creates new recipe → approves it
- **Trainer** creates custom meal plan using new recipe
- **Trainer** assigns meal plan to **Customer**
- **Customer** views meal plan and saves to favorites
- **Customer** updates progress measurement
- **Trainer** reviews customer progress

---

## 🎯 Key Selling Points to Highlight

### 1. Comprehensive Role System
- ✅ **3-tier role system** (Admin, Trainer, Customer)
- ✅ **Complete RBAC** (role-based access control)
- ✅ **Secure authentication** with JWT tokens

### 2. Real Transformation Stories
- ✅ **24.3kg weight loss** (Jennifer Thompson)
- ✅ **12.5kg muscle gain** (Marcus Williams)
- ✅ **Reversed pre-diabetes** (David Chen)
- ✅ **62-year-old athlete** (Robert Davis)

### 3. Specialized Trainers
- ✅ **Bodybuilding expert** (IFBB Pro)
- ✅ **Weight loss PhD** (500+ clients)
- ✅ **Sports performance** (NFL coach)
- ✅ **Plant-based specialist** (10 years vegan)
- ✅ **Keto physician** (MD)

### 4. Comprehensive Progress Tracking
- ✅ **Weekly measurements** (weight, body fat, measurements)
- ✅ **Goal tracking** with progress percentage
- ✅ **Visual progress graphs** (if feature exists)
- ✅ **Progress notes** documenting journey

### 5. Intelligent Meal Planning
- ✅ **50+ approved recipes** across all meal types
- ✅ **Complete nutrition data** (calories, protein, macros)
- ✅ **Multiple meal plans per customer**
- ✅ **Flexible plan assignment** (trainer → customer)

### 6. Complete Workflow
- ✅ **Trainer invites customer** → Customer accepts → Relationship established
- ✅ **Admin creates recipes** → Approves for library
- ✅ **Trainer creates meal plans** → Assigns to customers
- ✅ **Customer views plans** → Tracks progress → Updates measurements
- ✅ **Trainer reviews progress** → Adjusts plans

---

## 🔧 Maintenance & Updates

### Adding New Demo Users
Edit `scripts/seed-demo-data.js` and add to:
- `DEMO_ADMINS` array
- `DEMO_TRAINERS` array
- `DEMO_CUSTOMERS` array

### Adding New Demo Recipes
Edit `scripts/seed-demo-data.js` and add to:
- `DEMO_RECIPES` array
- `ADDITIONAL_RECIPES` array

### Re-running Seed Script
```bash
# Safe to run multiple times (uses ON CONFLICT DO UPDATE)
node scripts/seed-demo-data.js
```

**Note:** Script uses `ON CONFLICT` clauses to avoid duplicates.

---

## 📞 Support

**If demo data issues occur:**

1. **Check database connection:**
   ```bash
   docker ps | grep postgres
   ```

2. **Verify tables exist:**
   ```bash
   docker exec fitnessmealplanner-postgres psql -U postgres -d fitnessmealplanner -c "\dt"
   ```

3. **Re-run seed script:**
   ```bash
   node scripts/seed-demo-data.js
   ```

4. **Check for errors in console output**

---

## ✅ Success Metrics

**After running seed script, you should have:**

| Metric | Expected | How to Verify |
|--------|----------|---------------|
| Admin Accounts | 3 | Login to admin dashboard |
| Trainer Accounts | 5 | Check trainer list |
| Customer Accounts | 10 | Check customer list |
| Approved Recipes | 50 | Check recipe library |
| Pending Recipes | 5 | Check admin review queue |
| Meal Plans | 6+ | Check saved meal plans |
| Trainer-Customer Relationships | 10 | Check customer assignments |
| Progress Measurements | 90+ | Check customer progress tabs |
| Customer Goals | 10 | Check customer goals section |

---

**Documentation Complete:** October 21, 2025
**Version:** 1.0.0
**Status:** ✅ Ready for Client Presentations
