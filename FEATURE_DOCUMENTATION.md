# FitnessMealPlanner Feature Documentation

This document provides comprehensive guides for all new features and enhancements introduced in version 1.1.0 (qa-ready branch).

## Table of Contents
- [Real-Time Recipe Generation Progress](#real-time-recipe-generation-progress)
- [Enhanced Admin Interface](#enhanced-admin-interface)
- [Bulk Recipe Operations](#bulk-recipe-operations)
- [Recipe View Management](#recipe-view-management)
- [Progress Tracking System](#progress-tracking-system)
- [PDF Export Features](#pdf-export-features)
- [Profile Image Upload System](#profile-image-upload-system)
- [Customer Progress Tracking](#customer-progress-tracking)

## Real-Time Recipe Generation Progress

### Overview
The Recipe Generation Progress system provides real-time feedback during bulk recipe generation, allowing administrators to monitor the process without manual refreshes.

### Key Features
- **Live Progress Tracking**: Real-time updates on recipe generation status
- **Step-by-step Monitoring**: Visual feedback for each generation phase
- **Error Reporting**: Immediate notification of any generation failures
- **Completion Metrics**: Detailed statistics upon completion

### How to Use

#### Starting Recipe Generation with Progress Tracking
1. **Navigate** to Admin Panel → Recipes tab
2. **Click** "Generate Recipes" button
3. **Configure** generation parameters:
   - Number of recipes (1-500)
   - Meal types (breakfast, lunch, dinner, snack)
   - Dietary restrictions
   - Nutritional parameters
   - Natural language prompts
4. **Click** "Start Generation"
5. **Monitor** progress in real-time

#### Progress Display Components
```typescript
// Progress phases shown to users
const phases = {
  starting: 'Initializing generation process...',
  generating: 'Creating recipes with AI...',
  validating: 'Validating recipe data...',
  images: 'Generating recipe images...',
  storing: 'Saving recipes to database...',
  complete: 'Generation completed successfully!',
  failed: 'Generation failed - check error details'
};
```

#### Monitoring Progress
- **Progress Bar**: Visual indicator showing percentage completion
- **Current Step**: Displays which phase is currently executing
- **Recipe Count**: Shows completed vs. total recipes
- **Time Estimates**: Provides estimated completion time
- **Error Logs**: Real-time error reporting if issues occur

### Technical Implementation
The progress system uses:
- **WebSocket-like Polling**: Regular API calls for status updates
- **Job Management**: Background job tracking with unique job IDs
- **Progress Tracker Service**: Server-side service managing generation state
- **React Query**: Optimized data fetching with automatic retries

### API Endpoints
```bash
# Start tracked generation
POST /api/admin/generate
{
  "count": 50,
  "mealTypes": ["breakfast", "lunch"],
  "jobId": "generated-job-id"
}

# Check progress
GET /api/admin/progress/{jobId}
Response: {
  "jobId": "job-123",
  "totalRecipes": 50,
  "completed": 25,
  "failed": 2,
  "currentStep": "generating",
  "percentage": 50,
  "errors": ["Error details..."]
}
```

## Enhanced Admin Interface

### Overview
The admin interface has been completely redesigned with modern UI components, improved workflows, and enhanced data management capabilities.

### New Features

#### 1. Recipe Table View
- **Toggle Views**: Switch between card and table layouts
- **Advanced Sorting**: Sort by calories, protein, prep time, approval status
- **Bulk Selection**: Select multiple recipes for batch operations
- **Pagination**: Handle large recipe datasets efficiently
- **Quick Actions**: Approve, reject, edit, or delete recipes directly

#### 2. Recipe Generation Modal
- **Enhanced Parameters**: More granular control over generation
- **Context-Aware Generation**: Natural language prompts for targeted recipes
- **Nutritional Constraints**: Min/max values for macronutrients
- **Meal Type Targeting**: Specific meal type generation
- **Progress Integration**: Real-time generation monitoring

#### 3. Bulk Operations Toolbar
- **Select All**: Quickly select all visible recipes
- **Bulk Approve**: Approve multiple pending recipes at once
- **Bulk Delete**: Remove multiple recipes with confirmation
- **Selection Count**: Display number of selected items
- **Clear Selection**: Reset all selections

### Usage Guide

#### Switching Between Views
1. **Locate** the View Toggle in the top-right of the recipes section
2. **Click** the card icon for card view or table icon for table view
3. **Preferences** are automatically saved for future sessions

#### Using Bulk Operations
1. **Select** recipes by clicking checkboxes in table view
2. **Use** "Select All" to choose all visible recipes
3. **Choose** action from the Bulk Operations toolbar:
   - **Approve Selected**: Approve all selected pending recipes
   - **Delete Selected**: Remove selected recipes (with confirmation)
4. **Confirm** actions when prompted

#### Managing Large Recipe Lists
1. **Use Pagination**: Navigate through recipe pages at bottom
2. **Adjust Page Size**: Choose 10, 25, 50, or 100 recipes per page
3. **Filter and Sort**: Use column headers to sort data
4. **Search**: Use search functionality to find specific recipes

### Component Architecture
```typescript
// Key components in the enhanced admin interface
interface AdminComponents {
  RecipeTable: 'Tabular view with sorting and pagination';
  BulkDeleteToolbar: 'Bulk operations management';
  ViewToggle: 'Switch between card and table views';
  RecipeGenerationModal: 'Enhanced recipe generation interface';
  RecipeGenerationProgress: 'Real-time progress monitoring';
}
```

## Bulk Recipe Operations

### Overview
Bulk operations allow administrators to efficiently manage large numbers of recipes through batch actions.

### Available Operations

#### Bulk Approval
- **Purpose**: Approve multiple pending recipes simultaneously
- **Access**: Available in table view with selected recipes
- **Confirmation**: Requires admin confirmation before execution
- **Feedback**: Real-time status updates during processing

#### Bulk Deletion
- **Purpose**: Remove multiple recipes at once
- **Safety**: Multiple confirmation dialogs prevent accidental deletion
- **Scope**: Can delete across multiple pages of results
- **Audit**: Logs all deletion activities for review

### Safety Features
- **Confirmation Dialogs**: Multiple confirmation steps prevent accidental actions
- **Action Logging**: All bulk operations are logged with timestamps
- **Rollback Capability**: Database transactions allow rollback if needed
- **Permission Checks**: Verify admin privileges before executing operations

### Usage Examples

#### Approving New Generated Recipes
```typescript
// Typical workflow for bulk approval
1. Generate 100 new recipes using the generation tool
2. Switch to table view to review generated recipes
3. Filter to show only "pending" status recipes
4. Select all or specific recipes for approval
5. Click "Approve Selected" in bulk toolbar
6. Confirm action in dialog
7. Monitor progress as recipes are approved
```

#### Cleaning Up Unwanted Recipes
```typescript
// Workflow for bulk deletion
1. Use filters to identify unwanted recipes
   - Low-rated recipes
   - Recipes with nutritional issues
   - Duplicate or test recipes
2. Select targeted recipes using checkboxes
3. Click "Delete Selected" in bulk toolbar
4. Review deletion summary in confirmation dialog
5. Type "DELETE" to confirm action
6. Monitor deletion progress
```

## Recipe View Management

### Overview
The Recipe View Management system provides flexible ways to view and interact with recipe data through multiple display modes.

### View Types

#### Card View
- **Visual Focus**: Large recipe images and key information
- **Quick Actions**: Approve, reject, edit buttons on each card
- **Responsive Design**: Adapts to different screen sizes
- **Easy Browsing**: Ideal for visual recipe review

#### Table View
- **Data Dense**: Shows more recipes per screen
- **Sortable Columns**: Click headers to sort by any field
- **Bulk Operations**: Select multiple recipes for batch actions
- **Advanced Filtering**: Filter by multiple criteria simultaneously

### View Toggle Component
```typescript
interface ViewToggleProps {
  currentView: 'card' | 'table';
  onViewChange: (view: 'card' | 'table') => void;
  className?: string;
}

// Usage
<ViewToggle 
  currentView={view}
  onViewChange={setView}
  className="recipe-view-toggle"
/>
```

### Responsive Behavior
- **Desktop**: Full functionality available in both views
- **Tablet**: Optimized layouts for medium screens
- **Mobile**: Automatically defaults to card view for better usability

## Progress Tracking System

### Overview
The Progress Tracking System monitors and reports on long-running operations like recipe generation, providing real-time feedback to users.

### Architecture

#### Progress Tracker Service
```typescript
interface GenerationProgress {
  jobId: string;
  totalRecipes: number;
  completed: number;
  failed: number;
  currentStep: 'starting' | 'generating' | 'validating' | 'images' | 'storing' | 'complete' | 'failed';
  percentage: number;
  startTime: number;
  estimatedCompletion?: number;
  errors: string[];
  currentRecipeName?: string;
  stepProgress?: {
    stepIndex: number;
    stepName: string;
    itemsProcessed: number;
    totalItems: number;
  };
}
```

#### Job Management
- **Unique Job IDs**: Each operation gets a unique identifier
- **Progress Persistence**: Progress is stored and retrievable
- **Automatic Cleanup**: Completed jobs are cleaned up after 30 minutes
- **Error Tracking**: Comprehensive error logging and reporting

### Integration Points

#### Frontend Components
- **Progress Bars**: Visual progress indicators
- **Status Messages**: Human-readable status updates
- **Error Displays**: User-friendly error reporting
- **Completion Notifications**: Success/failure notifications

#### Backend Services
- **Recipe Generator**: Integrates with progress tracking
- **Progress API**: Endpoints for progress retrieval
- **Event System**: Real-time progress updates

### Monitoring Capabilities
- **Real-time Updates**: Progress updates every few seconds
- **Detailed Logging**: Comprehensive operation logs
- **Performance Metrics**: Track generation speed and success rates
- **Error Analysis**: Detailed error reporting for troubleshooting

## PDF Export Features

### Overview
The PDF export system allows users to generate professional PDF documents of meal plans and recipes with EvoFit branding.

### Export Types

#### Client-Side PDF Export
- **Technology**: jsPDF library
- **Speed**: Fast generation for simple layouts
- **Customization**: Full control over layout and styling
- **Use Case**: Quick recipe exports and simple meal plans

#### Server-Side PDF Export
- **Technology**: Puppeteer with EJS templates
- **Quality**: High-quality, professional layouts
- **Branding**: EvoFit branded templates
- **Use Case**: Official meal plan documents and reports

### Export Options

#### Recipe PDF Export
```typescript
// Export single recipe to PDF
const exportRecipe = async (recipe: Recipe) => {
  const pdf = await generateRecipePDF({
    recipe,
    includeNutrition: true,
    includeInstructions: true,
    includeImages: true,
    branding: 'evofit'
  });
  downloadPDF(pdf, `${recipe.name}.pdf`);
};
```

#### Meal Plan PDF Export
```typescript
// Export complete meal plan
const exportMealPlan = async (mealPlan: MealPlan) => {
  const pdf = await generateMealPlanPDF({
    mealPlan,
    includeShopping: true,
    includeNutrition: true,
    includeRecipeDetails: true,
    format: 'professional'
  });
  downloadPDF(pdf, `meal-plan-${mealPlan.id}.pdf`);
};
```

### Template System
- **EvoFit Branding**: Professional branded templates
- **Customizable Layouts**: Multiple layout options
- **Responsive Design**: Adapts to different content sizes
- **Print Optimization**: Optimized for printing

### API Endpoints
```bash
# Export meal plan to PDF
POST /api/pdf/export/meal-plan/:planId
Authorization: Bearer <token>
Response: PDF file download

# Test PDF export (development)
POST /api/pdf/test-export
Body: { "content": "test data" }
Response: PDF file download
```

## Profile Image Upload System

### Overview
The Profile Image Upload System allows users of all roles (Admin, Trainer, Customer) to upload and manage profile pictures with automatic resizing and storage.

### Features

#### Image Upload
- **File Types**: JPEG, PNG, WebP supported
- **Size Limits**: Maximum 5MB per image
- **Automatic Resizing**: Images resized to optimal dimensions
- **Storage**: AWS S3 integration for scalable storage

#### Image Management
- **Preview**: Real-time preview before upload
- **Replacement**: Easy profile picture updates
- **Fallback**: Default avatars for users without images
- **Responsive**: Images adapt to different display sizes

### Usage Guide

#### Uploading Profile Image
1. **Navigate** to Profile page
2. **Click** on current profile image or "Upload Image" button
3. **Select** image file from device (JPEG, PNG, WebP)
4. **Preview** image before upload
5. **Click** "Upload" to save
6. **Verify** image appears in profile

#### Managing Existing Images
1. **View** current profile image on profile page
2. **Click** image to open upload dialog
3. **Choose** new image to replace existing one
4. **Confirm** replacement when prompted

### Technical Implementation

#### Frontend Components
```typescript
interface ProfileImageUploadProps {
  currentImageUrl?: string;
  onImageUpdate: (newImageUrl: string) => void;
  userRole: 'admin' | 'trainer' | 'customer';
  className?: string;
}

// Usage
<ProfileImageUpload
  currentImageUrl={user.profileImageUrl}
  onImageUpdate={handleImageUpdate}
  userRole={user.role}
/>
```

#### Upload Process
1. **File Selection**: User selects image file
2. **Client Validation**: Check file size and type
3. **Image Processing**: Resize if necessary
4. **S3 Upload**: Upload to AWS S3 bucket
5. **Database Update**: Update user profile with new image URL
6. **UI Update**: Refresh profile display

### S3 Integration
- **Bucket Configuration**: Dedicated bucket for profile images
- **Access Control**: Secure upload with signed URLs
- **CDN Integration**: CloudFront for fast image delivery
- **Backup**: Automatic backup of uploaded images

## Customer Progress Tracking

### Overview
The Customer Progress Tracking system allows trainers and customers to monitor fitness progress through measurements, photos, and goal tracking.

### Features

#### Measurement Tracking
- **Body Measurements**: Weight, body fat percentage, muscle mass
- **Custom Metrics**: Trainers can define custom measurement types
- **Progress Charts**: Visual progress over time
- **Goal Setting**: Set and track progress toward specific targets

#### Photo Progress
- **Before/After Photos**: Upload and manage progress photos
- **Date Stamping**: Automatic date tracking for photos
- **Privacy Controls**: Secure photo storage and access
- **Comparison Views**: Side-by-side photo comparisons

#### Goal Management
- **SMART Goals**: Specific, measurable, achievable, relevant, time-bound goals
- **Progress Tracking**: Monitor progress toward goal completion
- **Milestone Celebration**: Recognition of achieved milestones
- **Goal Adjustment**: Modify goals based on progress

### Usage Guide

#### Setting Up Progress Tracking
1. **Trainer Setup**:
   - Define measurement types for customer
   - Set initial goals and targets
   - Configure progress tracking frequency
   
2. **Customer Usage**:
   - Record measurements regularly
   - Upload progress photos
   - Review progress charts
   - Update goals as needed

#### Recording Measurements
1. **Navigate** to Progress tab in customer dashboard
2. **Click** "Add Measurement"
3. **Enter** current measurements
4. **Save** entry with current date
5. **View** updated progress charts

#### Managing Progress Photos
1. **Go** to Photos tab in progress section
2. **Click** "Upload Photo"
3. **Select** progress photo from device
4. **Add** notes or descriptions
5. **Save** photo with date stamp

### Data Visualization
- **Progress Charts**: Line charts showing measurement trends
- **Goal Progress**: Visual indicators of goal completion
- **Photo Timeline**: Chronological display of progress photos
- **Summary Reports**: Periodic progress summaries

### Privacy and Security
- **Data Encryption**: All progress data encrypted at rest
- **Access Controls**: Role-based access to progress data
- **Data Retention**: Configurable data retention policies
- **Export Options**: Users can export their progress data

---

## Feature Integration

### Multi-Feature Workflows

#### Complete Recipe Management Workflow
1. **Generate** recipes using AI with progress tracking
2. **Review** recipes in enhanced admin interface
3. **Bulk approve** suitable recipes
4. **Export** approved recipes to PDF
5. **Assign** recipes to customer meal plans

#### Customer Onboarding Workflow
1. **Create** customer account with profile image
2. **Set up** progress tracking measurements
3. **Generate** initial meal plan based on goals
4. **Export** meal plan PDF for customer
5. **Schedule** regular progress check-ins

### Feature Compatibility
- All new features are backwards compatible
- Existing data is preserved during upgrades
- New features enhance existing workflows
- No breaking changes to existing functionality

### Performance Considerations
- Real-time features use efficient polling mechanisms
- Image uploads are optimized for performance
- Progress tracking uses minimal database overhead
- PDF generation is cached when possible

---

This feature documentation provides comprehensive guides for all new functionality in version 1.1.0. For technical implementation details, refer to the API documentation and component source code.