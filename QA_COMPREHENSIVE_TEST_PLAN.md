# 🧪 Comprehensive QA Test Plan - FitnessMealPlanner

## 📋 Overview
**Objective:** Comprehensive testing of qa-ready branch before merge to main branch for production deployment  
**Target Branch:** `qa-ready` (primary development branch with latest features)  
**Production Branch:** `main` (significantly behind, pending merge)  
**Environment:** Docker development setup (http://localhost:4000)  

## 🎯 Critical Success Criteria
- ✅ Zero functional regressions
- ✅ All user journeys working end-to-end
- ✅ Authentication & authorization secure
- ✅ Database integrity maintained
- ✅ Performance benchmarks met
- ✅ Mobile responsiveness verified
- ✅ Security vulnerabilities addressed

## 🔧 Tech Stack Under Test
- **Frontend:** React, TypeScript, Vite, TailwindCSS, ShadCN UI
- **Backend:** Node.js, Express, PostgreSQL, Drizzle ORM
- **Infrastructure:** Docker, Docker Compose
- **Testing:** Vitest, Playwright, Jest, Puppeteer

## 📊 Test Priority Matrix

### 🔴 P0 - Critical (Must Pass)
1. **User Authentication & Authorization**
2. **Core Meal Plan Generation**
3. **Recipe Management System**
4. **Database Operations**
5. **PDF Export Functionality**

### 🟡 P1 - High (Should Pass)
6. **Customer Invitation System**
7. **Progress Tracking Features**
8. **Profile Image Upload**
9. **Mobile Responsiveness**
10. **Health Protocol Removal Verification**

### 🟢 P2 - Medium (Nice to Pass)
11. **Performance Benchmarks**
12. **Advanced UI Interactions**
13. **Error Handling Edge Cases**

---

## 🧪 Test Categories

### 1. 🔐 Authentication & Authorization Tests

#### Test Cases:
**AC-001: Admin Login Flow**
- **Objective:** Verify admin can login and access admin dashboard
- **Steps:**
  1. Navigate to login page
  2. Enter admin credentials (admin@evofitmeals.com / Admin123!)
  3. Submit login form
  4. Verify redirect to admin dashboard
  5. Verify admin-only features visible
- **Expected:** Successfully login with admin access to all features
- **Priority:** P0

**AC-002: Trainer Login Flow**
- **Objective:** Verify trainer authentication and dashboard access
- **Steps:**
  1. Login with trainer credentials
  2. Verify trainer dashboard loads
  3. Check customer management access
  4. Verify meal plan creation available
- **Expected:** Trainer has access to customer and meal plan features
- **Priority:** P0

**AC-003: Customer Login Flow**
- **Objective:** Verify customer authentication and limited access
- **Steps:**
  1. Login with customer credentials
  2. Verify customer dashboard loads
  3. Check assigned meal plans visible
  4. Verify no admin/trainer features accessible
- **Expected:** Customer has view-only access to assigned content
- **Priority:** P0

**AC-004: Role-Based Access Control**
- **Objective:** Verify users cannot access unauthorized features
- **Steps:**
  1. Test customer accessing admin routes
  2. Test trainer accessing admin-only features
  3. Verify API endpoints reject unauthorized requests
- **Expected:** Proper 401/403 responses for unauthorized access
- **Priority:** P0

**AC-005: Session Management**
- **Objective:** Verify JWT tokens and refresh functionality
- **Steps:**
  1. Login and verify JWT token creation
  2. Wait for token expiration
  3. Verify automatic refresh
  4. Test logout clears session
- **Expected:** Proper session management without data loss
- **Priority:** P0

### 2. 🍽️ Recipe Management Tests

#### Test Cases:
**RM-001: Recipe CRUD Operations**
- **Objective:** Verify complete recipe management lifecycle
- **Steps:**
  1. Create new recipe with all required fields
  2. Edit existing recipe
  3. View recipe details
  4. Delete recipe
  5. Verify database consistency
- **Expected:** All CRUD operations work without data corruption
- **Priority:** P0

**RM-002: Recipe Approval Workflow**
- **Objective:** Verify admin approval process for recipes
- **Steps:**
  1. Create recipe (starts as unapproved)
  2. Admin views pending recipes
  3. Admin approves recipe
  4. Verify recipe appears in approved list
- **Expected:** Proper approval workflow with state transitions
- **Priority:** P0

**RM-003: Recipe Search & Filtering**
- **Objective:** Verify recipe discovery functionality
- **Steps:**
  1. Search by recipe name
  2. Filter by meal type
  3. Filter by dietary restrictions
  4. Filter by main ingredients
  5. Clear filters
- **Expected:** Accurate search results matching filter criteria
- **Priority:** P1

**RM-004: Recipe Nutritional Data**
- **Objective:** Verify nutritional calculations are accurate
- **Steps:**
  1. Create recipe with specific ingredients
  2. Verify calorie calculations
  3. Check macro breakdown (protein, carbs, fat)
  4. Test serving size adjustments
- **Expected:** Accurate nutritional information displayed
- **Priority:** P0

### 3. 📋 Meal Plan Generation Tests

#### Test Cases:
**MP-001: Basic Meal Plan Generation**
- **Objective:** Verify core meal plan creation functionality
- **Steps:**
  1. Access meal plan generator
  2. Set dietary preferences
  3. Generate meal plan
  4. Verify plan contains proper meals
  5. Check nutritional balance
- **Expected:** Complete meal plan generated with balanced nutrition
- **Priority:** P0

**MP-002: Meal Plan Assignment**
- **Objective:** Verify trainer can assign meal plans to customers
- **Steps:**
  1. Login as trainer
  2. Generate meal plan
  3. Assign to specific customer
  4. Verify customer can view assigned plan
- **Expected:** Customer receives and can access assigned meal plan
- **Priority:** P0

**MP-003: Multiple Meal Plans Per Customer**
- **Objective:** Verify customers can have multiple active meal plans
- **Steps:**
  1. Assign multiple meal plans to same customer
  2. Verify both plans visible in customer dashboard
  3. Test switching between plans
- **Expected:** Multiple meal plans properly managed and accessible
- **Priority:** P1

**MP-004: Meal Plan Templates**
- **Objective:** Verify trainers can save and reuse meal plan templates
- **Steps:**
  1. Create meal plan
  2. Save as template
  3. Reuse template for different customer
  4. Verify template modifications don't affect original
- **Expected:** Template system works without data interference
- **Priority:** P1

### 4. 📄 PDF Export Tests

#### Test Cases:
**PDF-001: Client-Side PDF Export**
- **Objective:** Verify browser-based PDF generation
- **Steps:**
  1. Open meal plan
  2. Click PDF export button
  3. Verify PDF downloads
  4. Check PDF content accuracy
  5. Verify EvoFit branding present
- **Expected:** PDF generates with correct content and branding
- **Priority:** P0

**PDF-002: Server-Side PDF Export**
- **Objective:** Verify backend PDF generation with Puppeteer
- **Steps:**
  1. Trigger server-side PDF generation
  2. Verify PDF quality and formatting
  3. Check for complete meal plan data
  4. Test different meal plan types
- **Expected:** High-quality PDF with complete meal plan information
- **Priority:** P0

**PDF-003: PDF Content Verification**
- **Objective:** Verify PDF contains all required information
- **Steps:**
  1. Generate PDF for complex meal plan
  2. Verify all meals included
  3. Check nutritional summaries
  4. Verify recipe instructions present
  5. Check ingredient lists
- **Expected:** PDF contains complete and accurate meal plan data
- **Priority:** P0

### 5. 👥 Customer Management Tests

#### Test Cases:
**CM-001: Customer Invitation System**
- **Objective:** Verify trainer can invite customers
- **Steps:**
  1. Login as trainer
  2. Send customer invitation
  3. Verify invitation email sent
  4. Use invitation link to register
  5. Verify automatic trainer-customer link
- **Expected:** Complete invitation workflow functions properly
- **Priority:** P1

**CM-002: Customer Profile Management**
- **Objective:** Verify customer profile features
- **Steps:**
  1. Login as customer
  2. Update profile information
  3. Upload profile image
  4. Verify changes persist
- **Expected:** Profile updates save correctly with image upload
- **Priority:** P1

**CM-003: Trainer-Customer Relationship**
- **Objective:** Verify trainer can manage their customers
- **Steps:**
  1. Login as trainer
  2. View customer list
  3. Access customer details
  4. Assign meal plans to customers
- **Expected:** Trainer has full management access to their customers
- **Priority:** P0

### 6. 📈 Progress Tracking Tests

#### Test Cases:
**PT-001: Measurement Tracking**
- **Objective:** Verify customers can track body measurements
- **Steps:**
  1. Login as customer
  2. Add new measurements
  3. View measurement history
  4. Update existing measurements
- **Expected:** Measurement data saves and displays correctly
- **Priority:** P1

**PT-002: Photo Progress Tracking**
- **Objective:** Verify customers can upload progress photos
- **Steps:**
  1. Access progress photos section
  2. Upload new progress photo
  3. View photo gallery
  4. Compare photos over time
- **Expected:** Photo upload and gallery function properly
- **Priority:** P1

**PT-003: Goal Setting and Tracking**
- **Objective:** Verify customers can set and track fitness goals
- **Steps:**
  1. Set fitness goals
  2. Update goal progress
  3. View goal achievement charts
- **Expected:** Goal tracking system functions correctly
- **Priority:** P1

### 7. 📱 Mobile Responsiveness Tests

#### Test Cases:
**MR-001: Mobile Navigation**
- **Objective:** Verify app works on mobile devices
- **Viewports:** 375x667 (iPhone), 414x896 (iPhone XR), 360x640 (Android)
- **Steps:**
  1. Test navigation menu on mobile
  2. Verify touch interactions work
  3. Check text readability
  4. Test form inputs on mobile
- **Expected:** Full functionality on mobile devices
- **Priority:** P1

**MR-002: Tablet Responsiveness**
- **Objective:** Verify app adapts to tablet screen sizes
- **Viewports:** 768x1024 (iPad), 1024x768 (iPad landscape)
- **Steps:**
  1. Test layout adaptation
  2. Verify meal plan display
  3. Check recipe grid layout
- **Expected:** Optimal display on tablet devices
- **Priority:** P1

### 8. 🔍 Health Protocol Removal Verification

#### Test Cases:
**HP-001: GUI Health Protocol Removal**
- **Objective:** Verify Health Protocol tabs completely removed
- **Steps:**
  1. Login as admin - verify no Health Protocol tab
  2. Login as trainer - verify no Health Protocol tab
  3. Check all navigation menus
  4. Verify no remaining Health Protocol text
- **Expected:** No Health Protocol references in GUI
- **Priority:** P1

**HP-002: Backend Health Protocol Cleanup**
- **Objective:** Verify backend API endpoints removed
- **Steps:**
  1. Attempt to access Health Protocol API endpoints
  2. Verify 404 responses
  3. Check database for Health Protocol tables
- **Expected:** All Health Protocol functionality completely removed
- **Priority:** P1

---

## 🚀 Performance Benchmarks

### Load Time Requirements:
- **Page Load:** < 3 seconds
- **API Response:** < 500ms
- **PDF Generation:** < 10 seconds
- **Image Upload:** < 5 seconds

### Database Performance:
- **Recipe Search:** < 200ms
- **Meal Plan Generation:** < 5 seconds
- **User Authentication:** < 100ms

---

## 🛡️ Security Test Cases

### Security Verification:
**SEC-001: Input Validation**
- Test SQL injection attempts
- Verify XSS protection
- Check file upload validation

**SEC-002: Authentication Security**
- Test password requirements
- Verify JWT token security
- Check session timeout handling

**SEC-003: Authorization Boundaries**
- Test role escalation attempts
- Verify API endpoint protection
- Check data isolation between users

---

## 📋 Test Execution Framework

### Pre-Test Setup:
```bash
# Ensure Docker environment is running
docker ps
docker-compose --profile dev up -d

# Verify application accessibility
curl http://localhost:4000

# Run database setup if needed
npm run db:migrate
```

### Test Execution Order:
1. **Database & Infrastructure Tests**
2. **Authentication & Authorization Tests**
3. **Core Feature Tests (Recipes, Meal Plans)**
4. **User Journey Tests**
5. **Performance & Security Tests**
6. **Mobile Responsiveness Tests**

### Test Data Requirements:
- Admin user: admin@evofitmeals.com
- Trainer user: trainer@evofitmeals.com  
- Customer user: customer@evofitmeals.com
- Sample recipes in database
- Test meal plans for verification

---

## 📊 Pass/Fail Criteria

### Must Pass (P0):
- All authentication flows work
- Core CRUD operations function
- User role permissions enforced
- PDF export generates correctly
- Database operations maintain integrity

### Should Pass (P1):
- Mobile responsiveness functions
- All user workflows complete successfully
- Performance benchmarks met
- No console errors in browser

### Nice to Pass (P2):
- Advanced UI interactions
- Edge case handling
- Performance optimizations

---

## 📈 Test Reporting

### Test Results Structure:
```json
{
  "testSuite": "FitnessMealPlanner QA",
  "branch": "qa-ready",
  "timestamp": "2025-01-20T12:00:00Z",
  "summary": {
    "totalTests": 45,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "passRate": "0%"
  },
  "categories": {
    "authentication": {"passed": 0, "failed": 0, "total": 5},
    "recipeManagement": {"passed": 0, "failed": 0, "total": 8},
    "mealPlanGeneration": {"passed": 0, "failed": 0, "total": 6},
    "pdfExport": {"passed": 0, "failed": 0, "total": 4},
    "customerManagement": {"passed": 0, "failed": 0, "total": 5},
    "progressTracking": {"passed": 0, "failed": 0, "total": 4},
    "mobileResponsiveness": {"passed": 0, "failed": 0, "total": 3},
    "healthProtocolRemoval": {"passed": 0, "failed": 0, "total": 2},
    "performance": {"passed": 0, "failed": 0, "total": 4},
    "security": {"passed": 0, "failed": 0, "total": 4}
  }
}
```

---

## 🔧 Test Environment

### Docker Environment:
- **Frontend:** http://localhost:4000
- **Backend API:** http://localhost:4000/api
- **Database:** PostgreSQL on localhost:5433
- **Environment:** Development with Docker Compose

### Required Tools:
- Docker & Docker Compose
- Node.js 18+
- Playwright for E2E tests
- Vitest for unit tests
- Modern browser (Chrome/Firefox)

---

## ✅ Ready for Execution
This test plan covers all critical functionality in the qa-ready branch and ensures production readiness before merge to main branch.