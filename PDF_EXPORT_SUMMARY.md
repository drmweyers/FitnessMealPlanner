# PDF Export Feature Implementation Summary

## Overview
The FitnessMealPlanner application now has two PDF export implementations:

### 1. Client-Side PDF Export (Using jsPDF)
- **Location**: `client/src/utils/pdfExport.ts` and `client/src/components/PDFExportButton.tsx`
- **Technology**: jsPDF library
- **Features**: 
  - Direct browser-based PDF generation
  - Recipe card layouts (small, medium, large)
  - Multiple meal plan export support
  - No server dependency

### 2. Server-Side PDF Export (Using Puppeteer) - EvoFit Branded
- **Location**: 
  - Frontend: `client/src/components/EvoFitPDFExport.tsx`
  - Backend: `server/controllers/exportPdfController.ts`, `server/routes/pdf.ts`
  - Templates: `server/views/pdfTemplate.ejs`
- **Technology**: Puppeteer (headless Chrome)
- **Features**:
  - Professional EvoFit branded PDFs
  - EJS template-based layouts
  - Shopping list generation
  - Nutrition summary with charts
  - Server-side rendering for consistency

## API Endpoints

### 1. `/api/pdf/export` (POST)
- **Auth Required**: Yes (trainer or admin role)
- **Body**:
  ```json
  {
    "mealPlanData": { /* meal plan object */ },
    "customerName": "string",
    "options": {
      "includeShoppingList": true,
      "includeMacroSummary": true,
      "includeRecipePhotos": false,
      "orientation": "portrait",
      "pageSize": "A4"
    }
  }
  ```
- **Response**: PDF file stream

### 2. `/api/pdf/test-export` (POST)
- **Auth Required**: No (development only)
- **Body**: Same as above
- **Response**: PDF file stream

### 3. `/api/pdf/export/meal-plan/:planId` (POST)
- **Auth Required**: Yes (trainer or admin role)
- **URL Params**: `planId` - ID of the meal plan to export
- **Body**: 
  ```json
  {
    "options": { /* export options */ }
  }
  ```
- **Response**: PDF file stream

## Component Usage

### EvoFitPDFExport Component
```tsx
import EvoFitPDFExport from '@/components/EvoFitPDFExport';

// For single meal plan
<EvoFitPDFExport 
  mealPlan={mealPlanData}
  customerName="John Doe"
/>

// For multiple meal plans
<EvoFitPDFExport 
  mealPlans={arrayOfMealPlans}
  customerName="John Doe"
/>

// For server-side retrieval by ID
<EvoFitPDFExport 
  planId="meal-plan-id-123"
/>
```

### PDFExportButton Component (Client-side)
```tsx
import PDFExportButton from '@/components/PDFExportButton';

<PDFExportButton 
  mealPlan={mealPlanData}
  customerName="John Doe"
/>
```

## Testing

### Manual Testing
1. Start the development server: `npm run dev`
2. Create or load a meal plan
3. Click the "Export PDF" button
4. Verify PDF downloads and opens correctly

### API Testing
Use the provided test script:
```bash
node test-pdf-export-api.js
```

## Dependencies
- **Client**: jsPDF, file-saver
- **Server**: puppeteer, ejs, dayjs
- **Types**: @types/ejs, @types/puppeteer

## Known Issues & Limitations
1. Recipe photos are disabled for performance (can be enabled in options)
2. Large meal plans may take longer to generate
3. Puppeteer requires additional system dependencies on some platforms

## Security Considerations
- PDF export endpoints require authentication (except test endpoint)
- Role-based access control (trainer and admin only)
- Input validation for meal plan data
- Sanitization of user-provided content

## Future Enhancements
1. Add recipe photo support
2. Custom branding options
3. Multi-language support
4. Email delivery of PDFs
5. PDF templates customization