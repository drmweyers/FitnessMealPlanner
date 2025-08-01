# 📋 **FitnessMealPlanner: Complete Role-Based Business Logic Specification**

**Version:** 1.0  
**Last Updated:** August 1, 2025  
**Document Purpose:** Comprehensive specification of all business logic and role interactions

## 🏗️ **System Architecture Overview**

The system operates on a **three-tier role hierarchy** with strict data isolation and permission boundaries:
- **Admin** → System-wide control and content moderation
- **Trainer** → Client management and meal planning professional
- **Customer** → End-user consuming fitness content and tracking progress

---

## 👨‍💼 **ADMIN ROLE - System Administrator**

### **🎯 Profile Management (Self)**
- ✅ **Profile Updates**: Modify own profile information
- ✅ **Account Settings**: Change password, email preferences
- ✅ **Dashboard Access**: System-wide analytics and statistics

### **📊 System Administration Capabilities**

#### **Recipe Management & Content Control**
- ✅ **View All Recipes**: See both approved and unapproved content
- ✅ **Approve/Unapprove Recipes**: Control content visibility system-wide
- ✅ **Bulk Recipe Operations**: 
  - Approve multiple recipes simultaneously
  - Delete multiple recipes at once
  - Import/export recipe collections
- ✅ **AI Recipe Generation**: Generate 1-500 recipes per batch using AI
- ✅ **Recipe Quality Control**: Edit, modify, or delete any recipe

#### **User Management**
- ✅ **View All Users**: Access complete user directory (admins, trainers, customers)
- ✅ **User Analytics**: See user registration trends, activity levels
- ✅ **System Statistics**: 
  - Total users by role
  - Recipe approval rates
  - Meal plan generation statistics
  - System usage metrics

#### **Content Moderation**
- ✅ **Approval Workflow**: Manage recipe approval queue
- ✅ **Content Guidelines**: Enforce recipe quality standards
- ✅ **Bulk Moderation**: Process multiple content items efficiently

### **🔗 Admin Interactions with Other Roles**

#### **With Trainers:**
- 👁️ **View Only**: Can see all trainer profiles and statistics
- 📊 **Analytics**: Monitor trainer activity and customer management
- 🚫 **No Direct Management**: Cannot modify trainer accounts or assignments

#### **With Customers:**
- 👁️ **View Only**: Can see all customer profiles and progress data
- 📊 **Analytics**: Monitor customer engagement and progress trends
- 🚫 **No Direct Management**: Cannot modify customer data or assignments

---

## 🏋️‍♂️ **TRAINER ROLE - Fitness Professional**

### **🎯 Profile Management (Self)**
- ✅ **Professional Profile**: Name, certifications, specializations
- ✅ **Contact Information**: Phone, email, business details
- ✅ **Statistics Dashboard**: Personal metrics and client overview
- ✅ **Meal Plan Library**: Save and organize custom meal plans

### **👥 Customer Management Capabilities**

#### **Customer Invitation System**
- ✅ **Send Invitations**: Email-based secure invitation system
  - Generate 32-byte secure tokens
  - 7-day expiration for security
  - Custom invitation messages
- ✅ **Track Invitations**: View sent/pending/accepted invitations
- ✅ **Invitation Analytics**: See acceptance rates and timing

#### **Customer Relationship Management**
- ✅ **View Assigned Customers**: See all customers who accepted invitations
- ✅ **Customer Progress Overview**: Monitor client fitness progress
- ✅ **Communication History**: Track interactions and assignments

### **🍽️ Meal Planning & Assignment Capabilities**

#### **Meal Plan Creation**
- ✅ **AI-Powered Generation**: Create meal plans with dietary preferences
- ✅ **Custom Meal Plans**: Manual meal plan creation
- ✅ **Meal Plan Library**: Save frequently used meal plans for reuse
- ✅ **Template Management**: Create and manage meal plan templates

#### **Content Assignment System**
- ✅ **Recipe Assignment**: Assign approved recipes to specific customers
- ✅ **Meal Plan Assignment**: Assign meal plans to customers
- ✅ **Personalized Recommendations**: Tailor content to customer needs
- ✅ **Assignment Tracking**: Monitor what content is assigned to whom

#### **Recipe Access & Management**
- ✅ **Approved Recipe Library**: Access all admin-approved recipes
- ✅ **Recipe Search & Filter**: Find recipes by dietary requirements
- ✅ **Recipe Reviews**: Evaluate recipe quality and suitability
- 🚫 **Cannot Create/Approve**: Must use admin-approved content only

### **🔗 Trainer Interactions with Customers**

#### **Direct Customer Management:**
- ✅ **Invite New Customers**: Send secure email invitations
- ✅ **Assign Meal Plans**: Provide personalized nutrition guidance
- ✅ **Assign Recipes**: Share specific recipes with customers
- ✅ **Monitor Progress**: View customer fitness tracking data
- ✅ **Customer Communication**: Send messages and updates

#### **Content Delivery:**
- ✅ **Personalized Meal Plans**: Create custom plans for each client
- ✅ **Recipe Recommendations**: Suggest recipes based on goals
- ✅ **PDF Generation**: Create printable meal plans for customers
- ✅ **Progress Tracking**: Help customers track fitness goals

### **🚫 Trainer Limitations**
- ❌ **Cannot see other trainers' customers** (complete data isolation)
- ❌ **Cannot approve/create recipes** (admin-only capability)
- ❌ **Cannot modify customer progress data** (customer-only)
- ❌ **Cannot access unapproved recipes** (quality control)

---

## 🧑‍🤝‍🧑 **CUSTOMER ROLE - End User**

### **🎯 Profile Management (Self)**
- ✅ **Personal Profile**: Name, contact information, preferences
- ✅ **Dietary Preferences**: Allergies, dietary restrictions, goals
- ✅ **Account Settings**: Password, notification preferences
- ✅ **Privacy Controls**: Manage data sharing preferences

### **📈 Progress Tracking Capabilities**

#### **Body Measurements & Metrics**
- ✅ **Weight Tracking**: Record weight changes over time
- ✅ **Body Composition**: Track body fat, muscle mass, etc.
- ✅ **Body Measurements**: Record measurements (waist, chest, arms, etc.)
- ✅ **Progress Analytics**: View trends and progress charts

#### **Progress Photo Management**
- ✅ **Photo Upload**: Take and store progress photos
- ✅ **Photo Timeline**: View progress photos chronologically
- ✅ **Privacy Controls**: Manage photo visibility settings
- ✅ **S3 Storage**: Secure cloud storage for all images

#### **Goal Setting & Tracking**
- ✅ **Fitness Goals**: Set weight loss, muscle gain, performance goals
- ✅ **Milestone Tracking**: Track progress toward specific targets
- ✅ **Goal Analytics**: View achievement rates and timelines
- ✅ **Custom Goals**: Create personalized fitness objectives

### **🍽️ Meal Plan & Recipe Access**

#### **Assigned Content Viewing**
- ✅ **Personal Meal Plans**: View all trainer-assigned meal plans
- ✅ **Assigned Recipes**: Access trainer-recommended recipes
- ✅ **Meal Plan History**: See all previously assigned meal plans
- ✅ **Recipe Collections**: Organize favorite assigned recipes

#### **Public Content Access**
- ✅ **Approved Recipe Library**: Browse all admin-approved recipes
- ✅ **Recipe Search**: Find recipes by dietary needs, ingredients
- ✅ **Recipe Details**: View full nutritional information and instructions
- ✅ **Recipe Favoriting**: Save favorite recipes for easy access

#### **PDF Export & Offline Access**
- ✅ **Meal Plan PDFs**: Generate printable meal plans
- ✅ **Recipe PDFs**: Create printable recipe collections
- ✅ **Shopping Lists**: Generate grocery lists from meal plans
- ✅ **Offline Access**: Download content for offline viewing

### **🔗 Customer Interactions (Limited)**

#### **With Trainers:**
- 🔄 **Receive Invitations**: Accept trainer invitations via email
- 📥 **Receive Assignments**: Get meal plans and recipes from trainers
- 👁️ **View Trainer Info**: See basic trainer profile information
- 🚫 **Cannot contact trainers directly** (system boundary)

#### **With System:**
- 📊 **Progress Reporting**: Share progress data with assigned trainers
- 💬 **System Feedback**: Provide feedback on recipes and meal plans
- 🔔 **Notifications**: Receive updates about new assignments

### **🚫 Customer Limitations**
- ❌ **Cannot see other customers' data** (complete privacy isolation)
- ❌ **Cannot create or approve recipes** (content control)
- ❌ **Cannot invite others** (trainer-only capability)
- ❌ **Cannot access unapproved recipes** (quality control)

---

## 🔄 **Inter-Role Workflow Processes**

### **1. Customer Onboarding Flow**
```
Trainer → Send Invitation → Customer Email → Registration → Auto-Link → Access Granted
```

### **2. Meal Plan Assignment Flow**
```
Trainer → Generate/Select Plan → Assign to Customer → Customer Notification → Customer Access
```

### **3. Recipe Approval Flow**
```
Admin → Generate/Import Recipe → Review → Approve → Trainer Access → Customer Assignment
```

### **4. Progress Tracking Flow**
```
Customer → Record Progress → Data Storage → Trainer Dashboard → Progress Analysis
```

---

## 🔒 **Security & Permission Boundaries**

### **Authentication System**
- 🔐 **JWT Tokens**: 15-minute access, 30-day refresh
- 🔄 **Automatic Refresh**: Seamless token renewal
- 🛡️ **Rate Limiting**: 5 failed attempts = 15-minute lockout
- 💪 **Strong Passwords**: 8+ chars, mixed case, numbers, symbols

### **Data Isolation Rules**
- **Admin**: See everything, control everything
- **Trainer**: Own customers only, approved recipes only
- **Customer**: Own data only, assigned content only

### **Privacy Controls**
- 📸 **Progress Photos**: Private by default, customer-controlled
- 📊 **Progress Data**: Isolated per customer, trainer visibility optional
- 💌 **Communications**: Secure invitation system only

---

## 📊 **Business Rules Summary**

1. **Content Approval Gate**: Only approved recipes visible to trainers/customers
2. **Invitation-Based Relationships**: Customers must be invited by trainers
3. **Data Ownership**: Customers own their progress data exclusively
4. **Recipe Assignment**: Only trainers can assign specific content to customers
5. **Library System**: Trainers can save and reuse meal plan templates
6. **Progress Privacy**: Customer progress data is private by default
7. **Role Hierarchy**: Admin > Trainer > Customer in system permissions

---

## 🧪 **Testing Requirements**

### **Critical Test Scenarios**
1. **Role Authentication**: Each role can only access their permitted areas
2. **Data Isolation**: Users cannot access data outside their permission scope
3. **Workflow Processes**: All inter-role workflows function correctly
4. **Security Boundaries**: Permission violations are properly blocked
5. **Content Approval**: Recipe approval workflow functions correctly
6. **Invitation System**: Customer invitation and registration process
7. **Assignment System**: Meal plan and recipe assignment workflows
8. **Progress Tracking**: Customer progress data privacy and functionality

### **Test Data Requirements**
- One admin account with full permissions
- One trainer account with assigned customers
- One customer account with assigned content
- Approved and unapproved recipes for testing content gates
- Progress tracking data for privacy testing

---

**Document Control:**
- **Owner**: Development Team
- **Review Schedule**: Monthly or on major feature changes
- **Version Control**: Update version number on any changes
- **Related Documents**: API_DOCUMENTATION.md, DATABASE_SCHEMA.md