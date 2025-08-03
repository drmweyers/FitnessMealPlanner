# 📋 **FitnessMealPlanner: Complete Role-Based Business Logic Specification**

**Version:** 1.2  
**Last Updated:** August 3, 2025  
**Document Purpose:** Comprehensive specification of all business logic and role interactions

### **Version 1.2 Changes:**
- ✅ Added comprehensive Profile Image Upload Feature documentation
- ✅ Added profile image management capabilities for all user roles
- ✅ Added AWS S3 and local storage integration specifications
- ✅ Added profile image validation rules and security requirements
- ✅ Added profile avatar display system across all interfaces
- ✅ Updated authentication endpoints to include profile image data

### **Version 1.1 Changes:**
- ✅ Added detailed Meal Plan Assignment Feature documentation
- ✅ Added API endpoints for trainer meal plan assignment
- ✅ Added detailed assignment workflow process
- ✅ Added assignment validation rules and security requirements
- ✅ Updated testing requirements to include assignment modal testing

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
- ✅ **Profile Image Management**: Upload, update, and delete profile picture
  - Supports JPEG, PNG, and WebP formats (up to 5MB)
  - Automatic image processing (resize to 200x200px, optimize quality)
  - AWS S3 storage in production, local storage in development
  - Displays in header navigation and profile pages

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
- ✅ **Profile Image Management**: Upload, update, and delete professional profile picture
  - Professional headshot display in client-facing interfaces
  - Same technical specifications as admin (JPEG/PNG/WebP, 5MB limit)
  - Enhanced professional presentation in trainer directory
  - Avatar displays with user initials fallback

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
- ✅ **Meal Plan Assignment**: Assign meal plans to customers via modal interface
- ✅ **Personalized Recommendations**: Tailor content to customer needs
- ✅ **Assignment Tracking**: Monitor what content is assigned to whom

#### **Meal Plan Assignment Feature (Detailed)**
- ✅ **Modal-Based Assignment**: Click "Assign to Customer" opens assignment modal
- ✅ **Customer Selection Interface**: Checkbox-based customer selection
- ✅ **Real-Time Customer List**: Fetches trainer's customers via `/api/trainer/customers`
- ✅ **Assignment API Integration**: Uses `POST /api/trainer/meal-plans/:planId/assign`
- ✅ **Success/Error Feedback**: Toast notifications for assignment status
- ✅ **Assignment Validation**: Prevents assignment without customer selection
- ✅ **Assignment Tracking**: Updates meal plan assignment counts
- ✅ **Multiple Assignment Support**: Can assign same plan to multiple customers
- ✅ **Assignment History**: Tracks which customers have which plans assigned

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
- ✅ **Profile Image Management**: Upload, update, and delete personal profile picture
  - Personal avatar display in customer interfaces
  - Same technical specifications as other roles (JPEG/PNG/WebP, 5MB limit)
  - Enhanced personalization of fitness journey
  - Integrates with progress tracking and trainer interactions

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

## 🖼️ **Profile Image Upload System - Universal Feature**

### **📁 Technical Architecture**

#### **Storage Systems**
- ✅ **AWS S3 Integration**: Production environment with secure cloud storage
  - Bucket: `fitnessmealplanner-uploads` (configurable via environment)
  - Region: `us-east-1` (configurable via AWS_REGION)
  - Access Control: Public-read for profile images
  - Cache Control: 1-year cache for optimized performance
- ✅ **Local Storage Fallback**: Development environment support
  - Path: `/uploads/profile-images/`
  - Automatic directory creation and management
  - File naming: `userId-uniqueId.jpg` format

#### **Image Processing Pipeline**
- ✅ **Sharp.js Integration**: High-performance image processing
  - Automatic resize to 200x200 pixels (square format)
  - Crop mode: Cover with center positioning
  - Format standardization: All images converted to JPEG
  - Quality optimization: 85% JPEG quality for size/quality balance
- ✅ **File Validation System**:
  - Supported formats: JPEG, PNG, WebP
  - Maximum file size: 5MB
  - MIME type validation with case-insensitive support
  - Comprehensive error handling and user feedback

#### **Security & Validation**
- ✅ **Authentication Required**: All profile image operations require valid JWT
- ✅ **File Type Validation**: Strict MIME type checking prevents malicious uploads
- ✅ **Size Limitations**: 5MB limit prevents system abuse and storage bloat
- ✅ **Unique File Naming**: Prevents conflicts and ensures data integrity
- ✅ **Automatic Cleanup**: Old profile images deleted when new ones uploaded

### **🎨 User Interface Components**

#### **ProfileImageUpload Component**
- ✅ **Interactive Upload Interface**:
  - Drag-and-drop file selection
  - Click-to-upload functionality
  - Real-time preview of selected images
  - Loading states with progress indicators
- ✅ **Avatar Display System**:
  - Multiple size variants: sm (48px), md (64px), lg (96px), xl (128px)
  - Automatic user initials generation from email addresses
  - Graceful fallback when no image is available
  - Consistent styling across all application interfaces
- ✅ **User Experience Features**:
  - Hover effects and visual feedback
  - Toast notifications for success/error states
  - Optimistic UI updates for immediate feedback
  - Accessible design with proper ARIA labels

#### **ProfileAvatar Component**
- ✅ **Display-Only Avatar**: Lightweight component for header and listing views
- ✅ **Responsive Design**: Adapts to different screen sizes and contexts
- ✅ **Integration Points**: Used in header navigation, profile pages, user listings

### **🔗 System Integration**

#### **Authentication Integration**
- ✅ **JWT Token Updates**: Profile image URLs included in authentication responses
- ✅ **Session Persistence**: Profile images persist across user sessions
- ✅ **Auto-Refresh**: Authentication context automatically updates with new images

#### **Database Integration**
- ✅ **User Schema Extension**: `profilePicture` field added to users table
- ✅ **Nullable Design**: Profile images are optional, not required
- ✅ **Migration Support**: Backward-compatible database schema updates

#### **API Integration**
- ✅ **React Query Integration**: Optimistic updates and cache invalidation
- ✅ **FormData Support**: Proper multipart/form-data handling in API client
- ✅ **Error Handling**: Comprehensive error responses and user feedback

### **📱 Cross-Platform Display**

#### **Header Navigation**
- ✅ **Universal Display**: Profile images appear in header across all roles
- ✅ **Consistent Sizing**: Small avatar format (sm) for header integration
- ✅ **Fallback Handling**: User initials display when no image available

#### **Profile Pages**
- ✅ **Large Format Display**: Extra-large avatars (xl) for profile pages
- ✅ **Upload Interface**: Full upload/delete functionality on profile pages
- ✅ **Role-Specific Styling**: Appropriate presentation for each user role

#### **User Listings & Cards**
- ✅ **Medium Format**: Balanced size for user directory and listing views
- ✅ **Performance Optimized**: Efficient loading and caching strategies

---

## 🔄 **Inter-Role Workflow Processes**

### **1. Customer Onboarding Flow**
```
Trainer → Send Invitation → Customer Email → Registration → Auto-Link → Access Granted
```

### **2. Meal Plan Assignment Flow**
```
Trainer → Generate/Save Plan → Saved Plans Tab → Click "Assign to Customer" → 
Assignment Modal Opens → Select Customer(s) → Click "Assign" → 
API Call (/api/trainer/meal-plans/:planId/assign) → Success Notification → 
Customer Access Granted
```

#### **Detailed Assignment Process:**
1. **Plan Selection**: Trainer navigates to Saved Plans in meal plan library
2. **Assignment Trigger**: Click three-dot menu → "Assign to Customer"
3. **Modal Interface**: Assignment modal displays with customer list
4. **Customer Selection**: Checkbox interface for selecting customers
5. **Validation**: System prevents assignment without customer selection
6. **API Processing**: Assignment data sent to backend for processing
7. **Confirmation**: Success/error feedback via toast notifications
8. **State Update**: UI refreshes to show updated assignment counts

### **3. Recipe Approval Flow**
```
Admin → Generate/Import Recipe → Review → Approve → Trainer Access → Customer Assignment
```

### **4. Progress Tracking Flow**
```
Customer → Record Progress → Data Storage → Trainer Dashboard → Progress Analysis
```

### **5. Profile Image Upload Flow**
```
User → Select Image → Client Validation → Upload API → Image Processing → 
S3/Local Storage → Database Update → UI Refresh → Header Avatar Update
```

#### **Detailed Profile Image Process:**
1. **Image Selection**: User clicks upload button or drags file to upload area
2. **Client Validation**: JavaScript validates file type (JPEG/PNG/WebP) and size (≤5MB)
3. **Upload Initiation**: FormData sent to `/api/profile/upload-image` endpoint
4. **Server Processing**: Multer receives file, Sharp processes and resizes
5. **Storage Decision**: Production uses S3, development uses local storage
6. **Database Update**: User's profilePicture field updated with new URL
7. **Response Handling**: Success response triggers UI updates
8. **Cache Invalidation**: React Query invalidates user and profile caches
9. **UI Refresh**: Avatar updates in header, profile page, and all user displays

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

## 🔌 **API Endpoints**

### **Profile Image Management Endpoints**
```
POST /api/profile/upload-image
- Purpose: Upload and process a new profile image for authenticated user
- Content-Type: multipart/form-data
- Body: FormData with 'profileImage' file field
- Response: { status: 'success', data: { profileImageUrl: string, user: User } }
- Processing: Validates file type/size, resizes to 200x200px, stores in S3/local
- Security: Requires authentication (any role)
- Validation: JPEG/PNG/WebP, max 5MB, automatic format conversion to JPEG

DELETE /api/profile/delete-image
- Purpose: Remove current profile image for authenticated user
- Response: { status: 'success', data: { user: User } }
- Processing: Deletes file from S3/local storage, sets profilePicture to null
- Security: Requires authentication (any role)
- Cleanup: Automatically removes old image files

GET /api/profile
- Purpose: Fetch complete profile data including profile image URL
- Response: { status: 'success', data: User }
- Includes: profilePicture field with full image URL or null
- Security: Requires authentication (any role)
```

### **Updated Authentication Endpoints**
```
POST /api/auth/login
POST /api/auth/register
GET /api/auth/me
- Enhanced Response: All authentication endpoints now include profilePicture field
- Format: { user: { id, email, role, profilePicture: string | null } }
- Integration: Profile images automatically available in auth context
```

### **Trainer Assignment Endpoints**
```
GET /api/trainer/customers
- Purpose: Fetch all customers assigned to the authenticated trainer
- Response: { customers: Customer[], total: number }
- Security: Requires trainer authentication

POST /api/trainer/meal-plans/:planId/assign
- Purpose: Assign a saved meal plan to a specific customer
- Body: { customerId: string, notes?: string }
- Response: { assignment: Assignment, message: string }
- Security: Requires trainer authentication and plan ownership

DELETE /api/trainer/meal-plans/:planId/assign/:customerId
- Purpose: Remove meal plan assignment from customer
- Response: { message: string }
- Security: Requires trainer authentication and plan ownership

GET /api/trainer/meal-plans
- Purpose: Fetch all saved meal plans for the trainer
- Response: { mealPlans: TrainerMealPlan[], total: number }
- Security: Requires trainer authentication
```

### **Assignment Validation Rules**
- ✅ **Plan Ownership**: Trainer must own the meal plan being assigned
- ✅ **Customer Validation**: Customer must exist and be accessible to trainer
- ✅ **Duplicate Prevention**: System allows multiple assignments of same plan
- ✅ **Assignment Tracking**: Each assignment creates audit trail
- ✅ **Cascade Operations**: Plan deletion removes all assignments

---

## 📊 **Business Rules Summary**

1. **Content Approval Gate**: Only approved recipes visible to trainers/customers
2. **Invitation-Based Relationships**: Customers must be invited by trainers
3. **Data Ownership**: Customers own their progress data exclusively
4. **Recipe Assignment**: Only trainers can assign specific content to customers
5. **Library System**: Trainers can save and reuse meal plan templates
6. **Progress Privacy**: Customer progress data is private by default
7. **Role Hierarchy**: Admin > Trainer > Customer in system permissions
8. **Profile Image Security**: All image uploads require authentication and validation
9. **Universal Avatar System**: All user roles have access to profile image functionality
10. **Image Processing Standard**: All uploaded images standardized to 200x200 JPEG format
11. **Storage Environment Logic**: S3 for production, local storage for development
12. **File Cleanup Protocol**: Old profile images automatically deleted when new ones uploaded

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
9. **Meal Plan Assignment Modal**: Assignment interface and customer selection
10. **Assignment API Integration**: Backend assignment processing and validation
11. **Profile Image Upload System**: Complete image upload and management workflow
12. **Image Validation**: File type, size, and security validation testing
13. **Image Processing**: Sharp.js resize and format conversion functionality
14. **Storage Integration**: Both S3 and local storage systems
15. **Avatar Display**: Profile images display correctly across all interfaces
16. **Authentication Integration**: Profile images included in auth responses

### **Test Data Requirements**
- One admin account with full permissions and profile image
- One trainer account with assigned customers and professional headshot
- One customer account with assigned content and personal avatar
- Approved and unapproved recipes for testing content gates
- Progress tracking data for privacy testing
- Test image files (JPEG, PNG, WebP) for upload testing
- Invalid file types (PDF, TXT) for validation testing
- Large files (>5MB) for size limit testing
- Profile image test scenarios for all user roles

---

**Document Control:**
- **Owner**: Development Team
- **Review Schedule**: Monthly or on major feature changes
- **Version Control**: Update version number on any changes
- **Related Documents**: API_DOCUMENTATION.md, DATABASE_SCHEMA.md