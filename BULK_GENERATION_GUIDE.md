# Bulk Recipe Generation - User Guide

## Overview

A comprehensive bulk recipe generation system that allows admins to generate recipes in batches of 100-5,000+ without server timeout issues.

## Features

✅ **Large Batch Support**: Generate 100, 1,000, 2,000, 4,000, or 5,000+ recipes  
✅ **No Timeouts**: Async processing with chunking strategy  
✅ **Real-time Progress**: SSE (Server-Sent Events) for live updates  
✅ **Comprehensive Form**: All generation options available  
✅ **Progress Tracking**: Live progress bars, chunk tracking, time estimates  
✅ **Error Handling**: Detailed error messages and warnings  
✅ **Resume Capability**: Can close page and return later (progress saved)  

## Access

**URL**: `/admin/bulk-generation`

**Requirements**: Admin role required

## Usage

### Step 1: Configure Generation Settings

1. **Select Batch Size**:
   - Choose from preset sizes: 100, 500, 1,000, 2,000, 4,000, 5,000
   - Or enter custom size (max 10,000)

2. **Set Meal Types** (optional):
   - Click badges to select: Breakfast, Lunch, Dinner, Snack, Dessert

3. **Set Dietary Restrictions** (optional):
   - Click badges to select: Vegetarian, Vegan, Gluten-Free, etc.

4. **Configure Nutritional Constraints** (optional):
   - Target Calories
   - Max Calories
   - Protein Range (min/max)
   - Carbs Range (min/max)
   - Fat Range (min/max)

5. **Set Other Options** (optional):
   - Fitness Goal
   - Main Ingredient
   - Max Prep Time
   - Natural Language Prompt

6. **Generation Options**:
   - ✅ Generate Images (DALL-E 3)
   - ✅ Upload Images to S3
   - ✅ Enable Nutrition Validation

### Step 2: Start Generation

1. Click **"Start Generation"** button
2. Generation starts immediately (returns batch ID)
3. Switch to **"Progress & Results"** tab to see real-time updates

### Step 3: Monitor Progress

The progress tab shows:
- **Overall Progress**: Percentage complete
- **Recipes Completed**: X / Total
- **Chunks**: Current chunk / Total chunks
- **Estimated Time Remaining**: Based on current speed
- **Batch ID**: For tracking/reference

### Step 4: View Results

When complete, you'll see:
- Total recipes generated
- Successful vs Failed counts
- Images generated/uploaded
- Total time and average time per recipe
- Any errors or warnings

## API Endpoints

### POST `/api/admin/generate-bulk`

Start bulk generation.

**Request Body**:
```json
{
  "count": 1000,
  "mealTypes": ["Breakfast", "Lunch"],
  "dietaryRestrictions": ["Vegetarian"],
  "fitnessGoal": "weight_loss",
  "maxCalories": 500,
  "minProtein": 20,
  "maxProtein": 50,
  "enableImageGeneration": true,
  "enableS3Upload": true,
  "enableNutritionValidation": true
}
```

**Response** (202 Accepted):
```json
{
  "status": "accepted",
  "message": "Bulk generation started for 1000 recipes",
  "batchId": "bulk_abc123xyz",
  "estimatedTime": 120000
}
```

### GET `/api/admin/generate-bulk/progress/:batchId`

SSE endpoint for real-time progress updates.

**Event Types**:
- `connected`: Connection established
- `progress`: Progress update
- `complete`: Generation complete
- `error`: Generation failed

### POST `/api/admin/generate-bulk/stop/:batchId`

Stop an active generation batch.

### GET `/api/admin/generate-bulk/status/:batchId`

Get current status of a batch.

## Technical Details

### Architecture

1. **Frontend**: React component with form and SSE client
2. **Backend**: Express route with async processing
3. **BMAD Service**: Uses multi-agent system for generation
4. **SSE Manager**: Handles real-time progress updates
5. **Chunking**: Automatically chunks large batches (5 recipes per chunk)

### Time Estimates

- **100 recipes**: ~5-10 minutes
- **1,000 recipes**: ~50-100 minutes (1-2 hours)
- **5,000 recipes**: ~250-500 minutes (4-8 hours)

*Times vary based on image generation and validation options*

### Batch Size Recommendations

| Batch Size | Use Case | Time | Recommended |
|------------|----------|------|-------------|
| 100 | Testing | 5-10 min | ✅ Best for testing |
| 500 | Small batch | 25-50 min | ✅ Good for production |
| 1,000 | Medium batch | 50-100 min | ✅ Recommended |
| 2,000 | Large batch | 2-4 hours | ⚠️ Requires patience |
| 4,000+ | Very large | 4-8+ hours | ⚠️ Use with caution |

### Cost Estimates

Per recipe (estimated):
- Recipe generation: $0.01-0.02
- Image generation: $0.04
- **Total**: ~$0.05-0.06 per recipe

For 1,000 recipes: ~$50-60
For 5,000 recipes: ~$250-300

## Troubleshooting

### Generation Not Starting

- Check browser console for errors
- Verify admin role
- Check API endpoint is accessible
- Ensure all required fields are valid

### Progress Not Updating

- Check SSE connection in browser DevTools
- Verify batch ID is correct
- Check server logs for errors
- Try refreshing the page

### Generation Stopped

- Check server logs
- Verify API key is valid
- Check database connection
- Review error messages in progress tab

### Timeout Issues

- ✅ **This system prevents timeouts** with async processing
- Large batches are automatically chunked
- Progress is saved incrementally
- Can resume if connection drops

## Best Practices

1. **Start Small**: Test with 100 recipes first
2. **Monitor Progress**: Check progress tab periodically
3. **Use Constraints**: Set nutritional constraints for better results
4. **Enable Validation**: Use nutrition validation for quality control
5. **Batch Size**: Don't exceed 5,000 unless absolutely necessary
6. **Time Windows**: Start large batches during off-peak hours
7. **Backup**: Ensure database backups before large batches

## Files Created

### Frontend
- `client/src/pages/BulkRecipeGeneration.tsx` - Main bulk generation page

### Backend
- `server/routes/bulkGeneration.ts` - Bulk generation API routes

### Integration
- `server/index.ts` - Route registration
- `client/src/Router.tsx` - Page route registration

## Future Enhancements

- [ ] Queue system for multiple batches
- [ ] Batch scheduling (run at specific times)
- [ ] Resume failed batches
- [ ] Batch templates (save common configurations)
- [ ] Export batch results to CSV/JSON
- [ ] Email notifications on completion
- [ ] Batch cost estimation before starting

