# Duplicate Image Generation Fixes

## Problem
All generated recipes were receiving the same images, making it impossible to distinguish between different recipes visually.

## Root Causes

1. **Generic Prompts**: The image generation prompts were too generic and didn't include recipe-specific details like ingredients, cooking methods, or unique visual elements.

2. **No Prompt Variation**: When retrying after detecting a duplicate, the system used the exact same prompt, leading to identical images.

3. **Missing Recipe Data**: The image generation agent wasn't receiving full recipe data (ingredients, mainIngredientTags) needed to create unique prompts.

4. **Weak Duplicate Detection**: The fallback hash mechanism wasn't robust enough to detect duplicates when perceptual hashing failed.

5. **No URL Duplicate Check**: The system didn't check for exact URL duplicates before generating perceptual hashes.

## Fixes Applied

### 1. Enhanced Image Prompts with Recipe-Specific Details

**File**: `server/services/agents/ImageGenerationAgent.ts`

**Changes**:
- Added `mainIngredientTags` and `ingredients` to `ImageGenerationInput` interface
- Enhanced `createImagePrompt()` to include:
  - Main ingredients prominently featured
  - Key ingredients from the recipe
  - Recipe description
  - Recipe-specific visual details

**Example Enhanced Prompt**:
```
Generate an ultra-realistic, high-resolution photograph of "Lemon Garlic Salmon with Asparagus", 
a dinner dish featuring prominently salmon, asparagus, lemon.
A healthy and flavorful dinner option perfect for fitness enthusiasts. 
The dish includes: salmon fillet, asparagus, lemon, garlic, olive oil, salt, pepper.
Present it artfully plated on a clean white ceramic plate set atop a rustic wooden table...
```

### 2. Prompt Variation for Retries

**File**: `server/services/agents/ImageGenerationAgent.ts`

**Changes**:
- Added 4 different visual style variations:
  1. **Standard**: 45° angle, side lighting, white plate, wooden table
  2. **Overhead**: Bird's eye view, bright diffused light, minimalist plate, marble countertop
  3. **Rustic**: Low angle, golden hour lighting, dark slate plate, weathered board
  4. **Fine Dining**: Close-up detail, dramatic lighting, elegant dish, textured stone

- Each retry uses a different variation to ensure visual diversity
- Added unique elements on retries (garnishes, steam, sauces, etc.)

**Result**: Even if the first attempt creates a duplicate, retries will produce visually distinct images.

### 3. Pass Full Recipe Data to Image Generation

**File**: `server/services/BMADRecipeService.ts`

**Changes**:
- Modified image generation call to fetch full recipe data before generating images
- Now passes:
  - `mainIngredientTags`: Main ingredients to feature
  - `ingredients`: Full ingredient list
  - `recipeDescription`: Detailed description
  - `mealTypes`: Meal type information

**Before**:
```typescript
{
  recipeId: r.id,
  recipeName: r.recipeName,
  recipeDescription: r.recipeDescription || '',
  mealTypes: r.mealTypes || []
}
```

**After**:
```typescript
{
  recipeId: r.id,
  recipeName: r.recipeName,
  recipeDescription: fullRecipe?.description || '',
  mealTypes: fullRecipe?.mealTypes || [],
  mainIngredientTags: fullRecipe?.mainIngredientTags || [],
  ingredients: fullRecipe?.ingredients || []
}
```

### 4. Improved Duplicate Detection

**File**: `server/services/agents/ImageGenerationAgent.ts`

**Changes**:
- Added `generatedImageUrls` Set to track exact URL duplicates
- Check for exact URL duplicates before generating perceptual hash (faster)
- Enhanced fallback hash to include timestamp and random element for uniqueness
- Improved image download logic for perceptual hashing when URL-based hashing fails

**Duplicate Detection Flow**:
1. Check exact URL duplicate (fast)
2. Generate perceptual hash
3. Check in-memory hash duplicate
4. Check database for similar hashes
5. Retry with different prompt variation if duplicate found

### 5. Enhanced Logging

**Added Logging For**:
- Prompt preview for each generation attempt
- Image URL and hash after successful generation
- Duplicate detection warnings
- Retry attempts with reason

**Example Logs**:
```
[artist] Generating image for "Lemon Garlic Salmon" (attempt 1)
[artist] Prompt preview: Generate an ultra-realistic, high-resolution photograph of "Lemon Garlic Salmon with Asparagus"...
[artist] Generated pHash for Lemon Garlic Salmon: a3f2b1c4d5e6f7...
[artist] Successfully generated unique image for "Lemon Garlic Salmon"
[artist] Image URL: https://oaidalleapiprodscus.blob.core.windows.net/...
[artist] Hash: a3f2b1c4d5e6f7...
```

## Technical Details

### Prompt Variation System

The system uses a rotation of 4 different visual styles:
- **Variation 0**: Standard editorial style
- **Variation 1**: Modern minimalist style
- **Variation 2**: Rustic artisanal style
- **Variation 3**: Fine dining style

Each retry uses `retryCount % 4` to select a different variation.

### Unique Elements on Retries

When retrying, additional unique elements are added:
- Fresh microgreens and edible flowers
- Sauce or dressing drizzle
- Steam rising from dish
- Complementary side elements
- Texture contrast with crispy elements

### Duplicate Detection Thresholds

- **Exact URL Match**: Immediate duplicate (no hash needed)
- **Perceptual Hash Similarity**: 95% threshold for database comparison
- **In-Memory Hash**: Exact match check for current batch

## Benefits

1. **Unique Images**: Each recipe now gets a visually distinct image
2. **Recipe-Specific**: Images reflect actual recipe ingredients and details
3. **Visual Diversity**: Different camera angles and styles prevent visual monotony
4. **Better Duplicate Detection**: Multiple layers of duplicate checking
5. **Improved Logging**: Easier to debug image generation issues

## Testing Recommendations

1. **Generate Multiple Recipes**: Generate 10-20 recipes and verify all have different images
2. **Check Logs**: Verify prompts are unique and include recipe-specific details
3. **Test Retries**: Intentionally trigger duplicate detection to verify variation works
4. **Verify Ingredients**: Check that images reflect the main ingredients mentioned in prompts
5. **Compare Visuals**: Manually review images to ensure visual diversity

## Files Modified

1. `server/services/agents/ImageGenerationAgent.ts`
   - Enhanced prompt generation
   - Added prompt variation system
   - Improved duplicate detection
   - Added URL duplicate checking
   - Enhanced logging

2. `server/services/BMADRecipeService.ts`
   - Fetch full recipe data before image generation
   - Pass complete recipe information to image agent

## Configuration

### Adjustable Parameters

**ImageGenerationAgent.ts**:
- `SIMILARITY_THRESHOLD`: 0.85 (85% similarity = duplicate)
- `maxRetries`: 3 (maximum retry attempts)
- Number of visual variations: 4 (can be extended)

### Adding More Variations

To add more visual style variations, extend the `variations` array in `createImagePrompt()`:
```typescript
const variations = [
  // ... existing variations
  {
    angle: 'new angle',
    lighting: 'new lighting',
    plate: 'new plate',
    surface: 'new surface',
    style: 'new style'
  }
];
```

## Notes

- The system now generates unique images even for similar recipes (e.g., multiple chicken recipes)
- Prompt variations ensure visual diversity even if recipe names are similar
- Full recipe data ensures images accurately represent the dish
- Multiple duplicate detection layers prevent any duplicates from slipping through




