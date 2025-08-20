# FitnessMealPlanner Business Logic Documentation

## 1. SYSTEM OVERVIEW

### Platform Purpose
FitnessMealPlanner is a comprehensive nutrition and meal planning platform designed to connect fitness professionals with their clients through personalized meal planning and progress tracking. The platform leverages AI-powered recipe generation to create customized nutrition solutions that align with individual fitness goals.

### Target Users
1. **Fitness Trainers**: Create and manage meal plans for multiple clients
2. **Administrators**: Oversee the platform, manage recipes, and maintain system quality
3. **Customers/Clients**: Receive personalized meal plans and track their fitness progress

### Core Value Propositions

#### For Trainers
- **Efficiency**: Streamline client nutrition management with reusable meal plan templates
- **Personalization**: Create customized meal plans based on specific fitness goals and dietary restrictions
- **Progress Monitoring**: Track client measurements, photos, and goal achievements
- **Professional Tools**: Access to approved recipe database and PDF export capabilities

#### For Customers
- **Personalized Nutrition**: Receive meal plans tailored to fitness goals and dietary preferences
- **Progress Tracking**: Monitor measurements, upload progress photos, and track goal achievements
- **Convenience**: Access meal plans with detailed recipes, shopping lists, and meal prep instructions
- **Professional Guidance**: Benefit from trainer expertise through structured meal planning

#### For Administrators
- **Quality Control**: Review and approve AI-generated recipes before public release
- **System Oversight**: Monitor platform usage and user statistics
- **Content Management**: Maintain recipe database quality and platform integrity

### High-Level System Capabilities
- AI-powered recipe generation with nutritional analysis
- Intelligent meal plan creation with calorie targeting
- Multi-user role management with appropriate permissions
- Comprehensive progress tracking with measurements and photos
- PDF export functionality for meal plans and recipes
- Customer invitation and onboarding system
- Meal prep planning with shopping lists and preparation instructions

## 2. USER ROLES & PERMISSIONS

### Role Hierarchy
```
Admin (Highest Authority)
├── System-wide oversight
├── Recipe approval workflows
└── User management capabilities

Trainer (Professional Users)
├── Client management
├── Meal plan creation and assignment
└── Progress monitoring access

Customer (End Users)
├── Personal meal plan access
├── Progress tracking
└── Limited system interaction
```

### Permission Matrix

| Feature | Admin | Trainer | Customer |
|---------|-------|---------|-----------|
| **Recipe Management** |
| View all recipes | ✅ | ✅ (approved only) | ✅ (approved only) |
| Generate new recipes | ✅ | ❌ | ❌ |
| Approve/reject recipes | ✅ | ❌ | ❌ |
| View pending recipes | ✅ | ❌ | ❌ |
| **Meal Plan Management** |
| Create meal plans | ✅ | ✅ | ❌ |
| Assign meal plans | ✅ | ✅ (to own clients) | ❌ |
| Save meal plan templates | ✅ | ✅ | ❌ |
| View assigned meal plans | ✅ | ✅ (own assignments) | ✅ (own plans) |
| **User Management** |
| Create user accounts | ✅ | ❌ | ❌ |
| Send customer invitations | ✅ | ✅ | ❌ |
| View customer list | ✅ | ✅ (own clients) | ❌ |
| View customer progress | ✅ | ✅ (own clients) | ❌ |
| **Progress Tracking** |
| Record measurements | ❌ | ❌ | ✅ |
| Upload progress photos | ❌ | ❌ | ✅ |
| Set personal goals | ❌ | ❌ | ✅ |
| View progress data | ✅ | ✅ (clients only) | ✅ (own data) |
| **System Features** |
| View system statistics | ✅ | ✅ (limited) | ❌ |
| Export PDF reports | ✅ | ✅ | ✅ |
| Access admin dashboard | ✅ | ❌ | ❌ |

### Role Transition Scenarios
- **Customer to Trainer**: Requires administrator approval and manual role update
- **Trainer to Admin**: Requires existing administrator to grant elevated permissions
- **Account Deactivation**: All roles can be deactivated by administrators, maintaining data integrity

## 3. CORE BUSINESS PROCESSES

### User Management & Authentication

#### Account Creation Process
1. **Self-Registration**: Users create accounts with email and secure password
2. **Invitation-Based Registration**: Trainers invite customers via email with secure tokens
3. **OAuth Integration**: Users can authenticate using Google OAuth for convenience
4. **Role Assignment**: Default role is 'customer'; trainers and admins are manually assigned

#### Password Security Requirements
- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number
- Must contain special character

#### Session Management
- JWT-based authentication with refresh tokens
- Secure session persistence across browser sessions
- Automatic token refresh for continued access
- Secure logout with token invalidation

### Recipe Management System

#### AI-Powered Recipe Generation
1. **Generation Parameters**: Administrators specify dietary preferences, meal types, and nutritional targets
2. **OpenAI Integration**: System uses GPT models to generate creative, nutritionally balanced recipes
3. **Structured Output**: Recipes include ingredients, instructions, nutritional data, and preparation times
4. **Batch Processing**: Multiple recipes generated simultaneously for efficiency

#### Recipe Approval Workflow
1. **Pending Status**: Newly generated recipes start in pending approval state
2. **Admin Review**: Administrators review recipes for quality, safety, and nutritional accuracy
3. **Approval/Rejection**: Admins can approve recipes for public use or reject with feedback
4. **Public Access**: Only approved recipes are visible to trainers and customers

#### Recipe Categorization
- **Meal Types**: Breakfast, lunch, dinner, snack classifications
- **Dietary Tags**: Vegan, keto, gluten-free, paleo, vegetarian, etc.
- **Main Ingredients**: Chicken, rice, vegetables, etc. for easy filtering
- **Nutritional Filters**: Calorie ranges, protein content, preparation time

### Meal Plan Generation & Management

#### Intelligent Meal Plan Creation
1. **Parameter Input**: Users specify calorie targets, duration, meals per day, and dietary preferences
2. **Recipe Selection Algorithm**: System intelligently selects recipes based on:
   - Nutritional requirements and calorie distribution
   - Meal type appropriateness (breakfast recipes for breakfast meals)
   - Dietary restriction compliance
   - Ingredient variety optimization
   - Recent recipe avoidance for variety

3. **Nutritional Balancing**: Automatic calculation ensures daily calorie targets are met
4. **Meal Distribution**: Smart distribution of meal types across days and meal slots

#### Advanced Meal Planning Features
- **Ingredient Limiting**: Option to limit total unique ingredients across entire plan
- **Meal Prep Integration**: Automatic generation of shopping lists and prep instructions
- **Template Creation**: Trainers can save successful meal plans as reusable templates
- **Calorie Variance**: Flexible calorie targeting with acceptable variance ranges

#### Meal Plan Assignment Workflow
1. **Plan Creation**: Trainer generates or selects existing meal plan template
2. **Customer Selection**: Choose specific customers from trainer's client list
3. **Assignment**: Meal plan is assigned to customer(s) with optional notes
4. **Notification**: Customer receives access to new meal plan
5. **Tracking**: Assignment history maintained for progress monitoring

### Customer Progress Tracking

#### Measurement System
- **Body Measurements**: Weight, neck, shoulders, chest, waist, hips, biceps, thighs, calves
- **Body Composition**: Body fat percentage, muscle mass tracking
- **Flexible Units**: Support for both metric (kg, cm) and imperial (lbs, inches) measurements
- **Historical Tracking**: Complete measurement history with date tracking
- **Progress Visualization**: Charts and graphs showing measurement trends over time

#### Photo Progress Tracking
- **Photo Types**: Front, side, back, and custom views
- **Privacy Controls**: Customers control photo visibility (private by default)
- **Secure Storage**: Photos stored in cloud storage with secure access controls
- **Thumbnail Generation**: Automatic creation of thumbnails for efficient viewing
- **Date Organization**: Photos organized chronologically for progress comparison

#### Goal Setting and Achievement
- **Goal Types**: Weight loss, muscle gain, body fat reduction, performance improvement
- **SMART Goals**: Specific targets with measurable values and target dates
- **Milestone Tracking**: Breaking large goals into smaller, achievable milestones
- **Progress Calculation**: Automatic progress percentage calculation
- **Achievement Recognition**: System tracks and celebrates goal completions

### Trainer-Customer Relationship Management

#### Customer Invitation Process
1. **Invitation Creation**: Trainer enters customer email address
2. **Secure Token Generation**: System creates unique, time-limited invitation token
3. **Email Delivery**: Invitation sent via email with registration link
4. **Customer Registration**: Customer clicks link to create account and automatically link to trainer
5. **Relationship Establishment**: Trainer gains access to customer's progress and meal plan assignment capabilities

#### Assignment and Communication Workflows
- **Meal Plan Assignment**: Trainers assign meal plans to specific customers
- **Progress Monitoring**: Trainers can view customer measurements, photos, and goals
- **Historical Tracking**: Complete history of assignments and customer interactions
- **Multi-Customer Management**: Trainers can manage multiple customers simultaneously

## 4. BUSINESS RULES & CONSTRAINTS

### Data Validation Rules

#### Recipe Constraints
- Recipe names must be 1-255 characters
- Preparation time must be between 1-300 minutes
- Serving size must be 1-12 portions
- Calorie content must be 1-5000 kcal per serving
- Nutritional values must be non-negative decimal numbers
- Ingredients list cannot be empty
- Instructions must be provided

#### Meal Plan Constraints
- Plan duration: 1-30 days maximum
- Meals per day: 1-6 meals
- Daily calorie target: 800-5000 kcal
- Plan name must be provided and unique per trainer
- At least one approved recipe must exist in database

#### User Account Constraints
- Email addresses must be unique across the system
- Passwords must meet security requirements
- User roles cannot be self-modified
- Customer invitations expire after 7 days
- Profile pictures limited to 5MB file size

### Nutritional Business Rules
- **Calorie Distribution**: Daily calories distributed evenly across meals with 20% variance allowed
- **Macro Balance**: System suggests balanced macronutrient distribution based on fitness goals
- **Dietary Compliance**: Meal plans respect all specified dietary restrictions
- **Nutritional Accuracy**: All nutritional data validated for reasonableness

### System-Wide Policies
- **Data Privacy**: Customer progress data only accessible to assigned trainers
- **Content Moderation**: All recipes require administrator approval before public availability
- **Session Security**: Automatic logout after 24 hours of inactivity
- **Image Permissions**: Only customers can upload their own progress photos

## 5. INTEGRATION POINTS & EXTERNAL SERVICES

### AI Recipe Generation (OpenAI Integration)
- **Purpose**: Generate creative, nutritionally balanced recipes
- **Integration Type**: REST API calls to OpenAI GPT models
- **Data Flow**: Recipe parameters → AI processing → Structured recipe output
- **Quality Control**: Generated recipes require human approval before use
- **Rate Limiting**: Controlled generation to manage API costs and quality

### PDF Export Functionality
- **Client-Side Export**: Browser-based PDF generation using jsPDF library
- **Server-Side Export**: Puppeteer-based PDF generation with custom branding
- **Export Types**: Individual recipes, complete meal plans, shopping lists
- **Branding**: EvoFit branded templates with professional formatting
- **Security**: Authenticated access required for PDF generation

### File Upload and Storage System
- **Profile Images**: Secure upload for user profile pictures
- **Progress Photos**: Encrypted storage for customer progress tracking
- **Storage Backend**: Cloud-based storage with CDN integration
- **File Validation**: Size limits, format restrictions, and content scanning
- **Access Control**: URL-based secure access with permission validation

### Email Notification System
- **Customer Invitations**: Automated email delivery for trainer invitations
- **Password Reset**: Secure token-based password recovery emails
- **Notification Types**: Welcome emails, assignment notifications, goal achievements
- **Template System**: Branded email templates for consistent communication
- **Delivery Tracking**: Email delivery status monitoring and retry logic

## 6. DATA MODELS & RELATIONSHIPS

### Core Entity Relationships
```
Users (Admin/Trainer/Customer)
├── Recipes (Created by Admin, viewed by all)
├── PersonalizedMealPlans (Trainer → Customer assignments)
├── TrainerMealPlans (Saved templates by Trainers)
├── CustomerInvitations (Trainer → Prospective Customer)
├── ProgressMeasurements (Customer self-recorded)
├── ProgressPhotos (Customer uploaded)
└── CustomerGoals (Customer defined objectives)
```

### Key Data Relationships
- **One-to-Many**: Trainer → Multiple Customers
- **Many-to-Many**: Recipes ↔ Meal Plans (recipes can appear in multiple plans)
- **One-to-One**: Customer ↔ Progress Data (each customer has their own progress)
- **Hierarchical**: Goals → Milestones → Achievement tracking

### Data Flow Patterns
1. **Recipe to Meal Plan**: Approved recipes flow into meal plan generation
2. **Meal Plan to Assignment**: Generated plans assigned to specific customers
3. **Progress to Monitoring**: Customer data flows to trainer dashboards
4. **Invitation to Relationship**: Invitations create trainer-customer relationships

### Important Data Constraints
- **Cascade Deletion**: Deleting users removes all associated data
- **Referential Integrity**: All foreign key relationships enforced
- **Data Isolation**: Customers can only access their own data
- **Audit Trail**: Assignment and creation timestamps maintained

## 7. FEATURE SPECIFICATIONS

### Recipe Discovery and Management

#### Purpose and User Value
Provides a comprehensive database of nutritionally analyzed recipes that serve as building blocks for personalized meal plans.

#### Detailed Functionality
- **Advanced Search**: Text search across recipe names and descriptions
- **Multi-Filter System**: Combine dietary tags, meal types, preparation time, and nutritional ranges
- **Grid/List Views**: Flexible display options for different user preferences
- **Detailed Recipe View**: Complete ingredient lists, step-by-step instructions, nutritional breakdown
- **Assignment Capabilities**: Trainers can assign individual recipes to customers

#### User Interaction Flows
1. User accesses recipe browser
2. Applies search filters based on preferences
3. Views recipe cards with key information
4. Clicks recipe for detailed view
5. Optional: Assigns recipe to customer (trainer only)

#### Business Logic and Rules
- Only approved recipes visible to non-admin users
- Search results paginated for performance
- Recipe popularity tracked for recommendation improvements
- Nutritional data validated for accuracy

### AI-Powered Meal Plan Generation

#### Purpose and User Value
Automates the complex process of creating nutritionally balanced, goal-specific meal plans using artificial intelligence.

#### Detailed Functionality
- **Natural Language Input**: Users describe requirements in plain language
- **Structured Parameters**: Detailed controls for calories, duration, dietary preferences
- **Intelligent Recipe Selection**: Algorithm considers nutrition, variety, and preferences
- **Meal Prep Integration**: Automatic shopping lists and preparation instructions
- **Template Saving**: Successful plans can be saved for future use

#### User Interaction Flows
1. User initiates meal plan generation
2. Specifies parameters (calories, days, dietary requirements)
3. System processes requirements and selects appropriate recipes
4. Generated plan presented with nutritional summary
5. User can modify, save, or assign plan to customers

#### Business Logic and Rules
- Daily calorie targets met with 20% variance allowance
- Meal type distribution follows logical patterns (breakfast recipes for breakfast)
- Recent recipe avoidance ensures variety
- Dietary restrictions strictly enforced
- Minimum viable recipe pool required for generation

### Customer Progress Tracking Suite

#### Purpose and User Value
Comprehensive progress monitoring system enabling customers to track their fitness journey and trainers to monitor client success.

#### Detailed Functionality

##### Measurement Tracking
- **Body Metrics**: Weight, circumference measurements, body composition
- **Flexible Units**: Metric and imperial system support
- **Historical Charts**: Visual progress representation over time
- **Goal Integration**: Measurements linked to specific fitness goals
- **Trend Analysis**: Automatic identification of progress patterns

##### Photo Progress
- **Multiple Angles**: Front, side, back, and custom photo types
- **Privacy Controls**: Customer-controlled visibility settings
- **Secure Storage**: Encrypted cloud storage with access controls
- **Comparison Tools**: Side-by-side progress comparisons
- **Timeline Organization**: Chronological photo organization

##### Goal Management
- **SMART Goal Framework**: Specific, measurable, achievable, relevant, time-bound goals
- **Milestone Breakdown**: Large goals divided into smaller achievements
- **Progress Calculation**: Automatic percentage completion tracking
- **Achievement Recognition**: Celebration of completed goals and milestones
- **Trainer Visibility**: Trainers can monitor client goal progress

#### Success/Error Scenarios
- **Success**: Complete progress timeline with measurements, photos, and achieved goals
- **Partial Data**: System handles incomplete data gracefully with interpolation
- **Error Recovery**: Data validation prevents invalid entries, user guidance for corrections
- **Privacy Protection**: Secure data handling with customer control over visibility

### Customer Invitation and Onboarding

#### Purpose and User Value
Streamlined system for trainers to invite and onboard new customers, establishing professional relationships within the platform.

#### Detailed Functionality
- **Secure Invitation Generation**: Time-limited, unique tokens for each invitation
- **Email Integration**: Automated delivery of invitation emails with registration links
- **Streamlined Registration**: Simplified signup process for invited customers
- **Automatic Relationship**: Trainer-customer relationship established upon registration
- **Invitation Management**: Trainers can track sent invitations and their status

#### User Interaction Flows
1. Trainer accesses customer management section
2. Enters prospective customer's email address
3. System generates secure invitation and sends email
4. Customer receives invitation email with registration link
5. Customer completes registration process
6. Trainer-customer relationship automatically established
7. Trainer gains access to customer progress and assignment capabilities

#### Business Logic and Rules
- Invitations expire after 7 days for security
- One invitation per email address at a time
- Email uniqueness enforced across the system
- Invitation tokens are cryptographically secure
- Automatic cleanup of expired invitations

### PDF Export and Reporting

#### Purpose and User Value
Professional-quality document generation for meal plans, recipes, and progress reports, enabling offline access and client communication.

#### Detailed Functionality
- **Meal Plan Exports**: Complete plans with recipes, shopping lists, and nutrition summaries
- **Individual Recipe Cards**: Detailed recipe information in printable format
- **Progress Reports**: Customer progress summaries with charts and measurements
- **Shopping Lists**: Consolidated ingredient lists with quantities
- **Custom Branding**: EvoFit branded templates with professional appearance

#### Export Options
- **Client-Side Generation**: Fast, browser-based PDF creation
- **Server-Side Processing**: High-quality rendering with custom layouts
- **Multiple Formats**: Various template options for different use cases
- **Batch Processing**: Multiple documents generated simultaneously

#### Business Logic and Rules
- Authenticated users only can generate PDFs
- Customer data only accessible to assigned trainers
- Generated PDFs include creation timestamps
- File size optimization for email sharing
- Consistent branding across all exported documents

## 8. OPERATIONAL WORKFLOWS

### Daily Operations
- **Recipe Review**: Administrators review and approve newly generated recipes
- **Customer Support**: Monitor system usage and respond to user inquiries
- **Progress Monitoring**: Trainers check client progress and adjust meal plans as needed
- **Data Backup**: Automated daily backups of all user data and system configurations

### Weekly Operations
- **Performance Analysis**: Review system performance metrics and usage statistics
- **Content Quality**: Assess recipe quality and user feedback for continuous improvement
- **User Engagement**: Monitor user activity levels and identify retention opportunities
- **Security Audit**: Review access logs and security measures

### Monthly Operations
- **Feature Usage Analysis**: Analyze which features are most/least used
- **User Feedback Integration**: Incorporate user suggestions into product roadmap
- **Database Optimization**: Performance tuning and query optimization
- **Compliance Review**: Ensure data handling practices meet privacy regulations

### Emergency Procedures
- **Data Recovery**: Comprehensive backup restoration procedures
- **Security Incident Response**: Immediate response protocols for security breaches
- **Service Outage Management**: Communication and resolution procedures for system downtime
- **User Support Escalation**: Process for handling complex user issues and complaints

This business logic documentation serves as the comprehensive foundation for understanding how FitnessMealPlanner operates from a user and business perspective. It provides the necessary detail for creating user manuals, training materials, help documentation, and ensuring consistent user experiences across all platform interactions.