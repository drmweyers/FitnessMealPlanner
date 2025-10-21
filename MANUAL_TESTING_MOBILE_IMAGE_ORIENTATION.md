# Manual Testing Guide: Mobile Image Orientation

**Purpose:** Verify that mobile photos with EXIF orientation metadata display correctly after upload.

**Background:** Mobile cameras often embed EXIF orientation tags (values 1-8) instead of rotating the actual image pixels. Without proper handling, these images appear sideways or upside-down on web browsers.

---

## Quick Start

### Prerequisites

1. **Development server running:**
   ```bash
   npm run dev
   # Server should be at http://localhost:4000
   ```

2. **Test images generated:**
   ```bash
   npm run test -- test/integration/progressPhotoOrientation.test.ts
   # This creates test images in test/fixtures/images/
   ```

3. **Test account credentials:**
   - Email: `customer.test@evofitmeals.com`
   - Password: `TestCustomer123!`

---

## Test Procedure

### Test 1: Portrait Photo (Most Common Issue)

**What:** Mobile portrait photos (EXIF orientation 6 = rotated 90° CW)

**Steps:**

1. **Login:**
   - Go to http://localhost:4000
   - Login as customer (credentials above)

2. **Navigate to Progress Photos:**
   - Click "Progress" tab
   - Click "Photos" sub-tab

3. **Upload portrait test image:**
   - Click "Upload Photo" button
   - Select: `test/fixtures/images/orientation-6-original.jpg`
   - Photo type: Front
   - Date: Today's date
   - Click "Upload"

4. **Verify thumbnail:**
   - Thumbnail should display with **RED bar at TOP**
   - Blue bar at bottom
   - If RED bar is on left/right side, orientation fix failed

5. **Verify full-size:**
   - Click on thumbnail to open full-size view
   - Full-size image should also have **RED at TOP**
   - Should match thumbnail orientation

**Expected Result:** ✅ Both thumbnail and full-size display correctly oriented (RED bar at top)

**If Failed:** ❌ Image appears rotated 90° (RED bar on side) - EXIF rotation not working

---

### Test 2: Upside-Down Photo

**What:** Upside-down photos (EXIF orientation 3 = rotated 180°)

**Steps:**

1. Upload: `test/fixtures/images/orientation-3-original.jpg`
2. Photo type: Side
3. Verify: RED bar at TOP (not at bottom)

**Expected Result:** ✅ Image displays right-side-up

---

### Test 3: Normal Photo (Baseline)

**What:** Normal orientation (EXIF orientation 1 = no rotation needed)

**Steps:**

1. Upload: `test/fixtures/images/orientation-1-original.jpg`
2. Photo type: Back
3. Verify: RED bar at TOP (should be unchanged)

**Expected Result:** ✅ Image displays normally

---

### Test 4: CCW Rotation

**What:** Counter-clockwise rotated photo (EXIF orientation 8 = rotated 90° CCW)

**Steps:**

1. Upload: `test/fixtures/images/orientation-8-original.jpg`
2. Photo type: Front
3. Verify: RED bar at TOP (rotated from left side)

**Expected Result:** ✅ Image corrected to display RED at top

---

## Visual Verification

### What to Look For

**Test images have colored bars for easy orientation verification:**

```
Correct Orientation:
┌─────────────────────┐
│   RED (TOP)         │ ← Should be at top
├─────────────────────┤
│                     │
│ GREEN │     │ YELLOW│
│ (LEFT)│     │(RIGHT)│
│                     │
├─────────────────────┤
│  BLUE (BOTTOM)      │ ← Should be at bottom
└─────────────────────┘

Center has "EXIF N" text indicating original orientation
```

**If orientation fix is working:**
- All uploaded images should have RED at top
- All uploaded images should have BLUE at bottom
- Regardless of original EXIF orientation value

**If orientation fix is broken:**
- Images may have RED on left/right/bottom
- Images may appear rotated 90° or 180°
- User would need to rotate their head to view correctly

---

## Automated Verification

### Check Processed Images

After uploading, you can verify the processed images have correct orientation:

```bash
# Install Sharp CLI (if not installed)
npm install -g sharp-cli

# Check orientation of uploaded file
sharp test/fixtures/images/orientation-6-processed.webp --info

# Should show:
# orientation: undefined (or 1)
# This means orientation is normalized
```

### Download and Verify

1. **Right-click uploaded thumbnail**
2. **"Save image as..." to local file**
3. **Check with Sharp:**

```typescript
import sharp from 'sharp';

const metadata = await sharp('downloaded-image.webp').metadata();
console.log('Orientation:', metadata.orientation);
// Should output: undefined or 1
```

---

## Mobile Device Testing

### iOS Safari

1. **Take portrait photo with iPhone**
2. **Transfer photo to computer** (via AirDrop, email, or cloud)
3. **Upload photo to progress tracking**
4. **Verify displays correctly oriented**

**Common iOS orientations:**
- Portrait shot: EXIF 6 (90° CW)
- Landscape shot: EXIF 1 (normal)
- Upside-down: EXIF 3 (180°)

### Android Chrome

1. **Take portrait photo with Android device**
2. **Transfer photo to computer**
3. **Upload photo to progress tracking**
4. **Verify displays correctly oriented**

**Common Android orientations:**
- Portrait shot: EXIF 6 (90° CW)
- Some devices: EXIF 8 (90° CCW)

---

## Performance Testing

### Upload Speed

**Expected:**
- Small photos (< 1MB): 1-3 seconds
- Large photos (3-5MB): 3-7 seconds
- 4K photos (8-10MB): 5-10 seconds

**If slower:**
- Check S3 upload speed
- Check Sharp processing time
- May need to optimize image processing pipeline

### Batch Upload

**Test uploading 5 photos in rapid succession:**

1. Click "Upload Photo"
2. Select 5 test images at once
3. Upload all 5
4. Verify all display correctly oriented
5. Check upload time (should be < 30 seconds for all 5)

---

## Troubleshooting

### Image Still Rotated Incorrectly

**Possible causes:**

1. **Sharp not reading EXIF:**
   - Check Sharp version (should be ^0.34.3)
   - Update Sharp: `npm update sharp`

2. **Missing .rotate() call:**
   - Check `server/routes/progressRoutes.ts` lines 361-371
   - Ensure `.rotate()` is called before `.resize()`

3. **EXIF stripped before processing:**
   - Check Multer configuration
   - Ensure file buffer preserves EXIF metadata

### Thumbnail Correct, Full-Size Incorrect

**This should NOT happen** (both use same processing)

If it does:
- Check both processing pipelines in `progressRoutes.ts`
- Verify both have `.rotate()` call
- Check for race conditions in parallel processing

### Performance Issues

**If Sharp processing is slow:**

```bash
# Check Sharp build
npm rebuild sharp

# Verify Sharp is using native binaries
node -e "console.require('sharp').versions)"
```

---

## Test Results Template

**Date:** _____________
**Tester:** _____________
**Environment:** Dev / Staging / Production

| Test | Image | Expected | Actual | Pass/Fail |
|------|-------|----------|--------|-----------|
| Portrait (EXIF 6) | orientation-6-original.jpg | RED at top | _______ | ☐ Pass ☐ Fail |
| Upside-down (EXIF 3) | orientation-3-original.jpg | RED at top | _______ | ☐ Pass ☐ Fail |
| Normal (EXIF 1) | orientation-1-original.jpg | RED at top | _______ | ☐ Pass ☐ Fail |
| CCW (EXIF 8) | orientation-8-original.jpg | RED at top | _______ | ☐ Pass ☐ Fail |
| Real iPhone Photo | _______________ | Correct orientation | _______ | ☐ Pass ☐ Fail |
| Real Android Photo | _______________ | Correct orientation | _______ | ☐ Pass ☐ Fail |

**Notes:**
_____________________________________________________________________________
_____________________________________________________________________________

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All 4 test orientations verified working
- [ ] Tested with real iPhone photo
- [ ] Tested with real Android photo
- [ ] Performance acceptable (< 10 seconds for large photos)
- [ ] Unit tests passing (imageOrientation.test.ts)
- [ ] Integration tests passing (progressPhotoOrientation.test.ts)
- [ ] Sharp version verified (^0.34.3)
- [ ] S3 upload working
- [ ] No console errors during upload
- [ ] Both thumbnail and full-size display correctly

---

## References

- **Implementation:** `server/routes/progressRoutes.ts` lines 361-371
- **Unit Tests:** `test/unit/services/imageOrientation.test.ts`
- **Integration Tests:** `test/integration/progressPhotoOrientation.test.ts`
- **Technical Analysis:** `MOBILE_IMAGE_ORIENTATION_ANALYSIS.md`
- **Sharp Documentation:** https://sharp.pixelplumbing.com/api-operation#rotate

---

**Last Updated:** January 21, 2025
**Document Owner:** Engineering Team
**Next Review:** Before each production deployment
