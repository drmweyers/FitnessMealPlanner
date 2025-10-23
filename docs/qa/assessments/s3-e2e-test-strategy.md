# S3 E2E Test Strategy - Iteration 2

**Date:** October 22, 2025
**Phase:** Phase A - S3 E2E Testing
**Risk Level:** HIGH (cost implications, production critical)
**Estimated Time:** 3-4 hours

---

## 🎯 Objectives

1. **Validate S3 Integration** across all image upload workflows
2. **Test Recipe Generation** with AI-generated images → S3 storage
3. **Verify Error Handling** for S3 failures and edge cases
4. **Validate Cost Optimization** through proper cleanup and compression
5. **Ensure Security** for authenticated uploads and access control

---

## 📊 Risk Assessment

### High-Priority Risks (P0)

1. **💰 Cost Risk: Orphaned S3 Objects**
   - **Risk**: Images uploaded but not deleted when records are removed
   - **Impact**: Ongoing storage costs, wasted resources
   - **Mitigation**: Test cleanup pathways (delete account, failed uploads)
   - **Test Coverage**: E2E tests for all deletion scenarios

2. **🔒 Security Risk: Unauthorized Access**
   - **Risk**: Users accessing/uploading images without proper authentication
   - **Impact**: Data breach, unauthorized file access
   - **Mitigation**: Test authentication/authorization for all upload endpoints
   - **Test Coverage**: E2E tests for auth boundaries

3. **🖼️ Data Integrity Risk: Image Upload Failures**
   - **Risk**: Recipe generation succeeds but image upload fails
   - **Impact**: Recipes without images, broken user experience
   - **Mitigation**: Test rollback on upload failure
   - **Test Coverage**: E2E tests for partial failure scenarios

### Medium-Priority Risks (P1)

4. **⚡ Performance Risk: Large Image Uploads**
   - **Risk**: Large images cause slow uploads, timeouts
   - **Impact**: Poor UX, potential upload failures
   - **Mitigation**: Test image size limits, compression
   - **Test Coverage**: E2E tests with various file sizes

5. **🔄 Integration Risk: S3 Service Unavailable**
   - **Risk**: S3 downtime or network issues
   - **Impact**: Complete upload failure, blocked workflows
   - **Mitigation**: Test fallback behavior, error messages
   - **Test Coverage**: E2E tests with S3 mocks/failures

---

## 🧪 Test Scenarios

### 1. Image Upload Workflows (8 tests)

#### 1.1 Profile Image Upload
- **Test**: Upload profile image as trainer
- **Verify**: Image stored in S3 with correct key (`profile-images/{userId}/...`)
- **Verify**: Database `users.profileImageUrl` updated
- **Verify**: Image accessible via signed URL

#### 1.2 Progress Photo Upload
- **Test**: Upload progress photo as customer
- **Verify**: Image stored in S3 with correct key (`progress-photos/{userId}/...`)
- **Verify**: Database `customerPhotos` record created
- **Verify**: Photo displayed in Progress tab

#### 1.3 Recipe Image Upload (Manual Admin)
- **Test**: Admin uploads custom recipe image
- **Verify**: Image stored in S3 with correct key (`recipe-images/...`)
- **Verify**: Database `recipes.imageUrl` updated
- **Verify**: Recipe card displays uploaded image

#### 1.4 Multiple Image Upload
- **Test**: Upload multiple progress photos in sequence
- **Verify**: All images stored in S3
- **Verify**: All database records created
- **Verify**: No race conditions or conflicts

#### 1.5 Image Replacement
- **Test**: Replace existing profile image
- **Verify**: Old image deleted from S3
- **Verify**: New image uploaded
- **Verify**: Database updated with new URL
- **Verify**: No orphaned objects

#### 1.6 Invalid File Upload
- **Test**: Attempt upload of non-image file (e.g., .txt)
- **Verify**: Upload rejected with error message
- **Verify**: No S3 upload attempted
- **Verify**: Database unchanged

#### 1.7 Large File Upload
- **Test**: Attempt upload of very large image (>10MB)
- **Verify**: File size validation triggers
- **Verify**: Error message displayed
- **Verify**: No S3 upload attempted

#### 1.8 Unauthenticated Upload Attempt
- **Test**: Attempt upload without authentication token
- **Verify**: 401 Unauthorized response
- **Verify**: No S3 upload attempted
- **Verify**: Database unchanged

---

### 2. Recipe Generation with S3 Images (6 tests)

#### 2.1 BMAD Recipe Generation (Happy Path)
- **Test**: Generate 5 recipes via BMAD system
- **Verify**: All 5 recipes created with AI-generated images
- **Verify**: All images uploaded to S3 (`recipe-images/...`)
- **Verify**: All `recipes.imageUrl` populated
- **Verify**: Real-time SSE progress updates show image upload status
- **Verify**: Recipe cards display images correctly

#### 2.2 Recipe Generation with S3 Failure
- **Test**: Generate recipe when S3 upload fails
- **Verify**: Recipe creation rolls back (not saved to database)
- **Verify**: Error message displayed to admin
- **Verify**: No orphaned S3 objects
- **Verify**: No incomplete recipe records

#### 2.3 Recipe Generation Image Uniqueness
- **Test**: Generate 10 recipes and verify image diversity
- **Verify**: All 10 images are unique (different URLs)
- **Verify**: No duplicate images in S3
- **Verify**: Images match recipe descriptions

#### 2.4 Recipe Image Deletion
- **Test**: Delete recipe via admin panel
- **Verify**: Recipe record deleted from database
- **Verify**: Recipe image deleted from S3
- **Verify**: No orphaned S3 objects

#### 2.5 Bulk Recipe Deletion
- **Test**: Delete multiple recipes at once
- **Verify**: All recipe records deleted
- **Verify**: All recipe images deleted from S3
- **Verify**: Proper cleanup confirmation

#### 2.6 Recipe Generation with Slow S3
- **Test**: Simulate slow S3 upload (network delay)
- **Verify**: SSE progress updates show "uploading image..."
- **Verify**: Recipe eventually completes
- **Verify**: No timeout errors (or proper timeout handling)

---

### 3. S3 Error Scenarios and Fallbacks (5 tests)

#### 3.1 S3 Service Unavailable
- **Test**: Mock S3 service unavailable (500 error)
- **Verify**: Upload fails gracefully with error message
- **Verify**: User notified of service issue
- **Verify**: Database rollback (no partial records)

#### 3.2 S3 Network Timeout
- **Test**: Mock network timeout during upload
- **Verify**: Timeout error handled
- **Verify**: Retry mechanism (if implemented)
- **Verify**: Clear error message to user

#### 3.3 S3 Permission Denied
- **Test**: Mock S3 permission error (403 Forbidden)
- **Verify**: Upload fails with permission error
- **Verify**: Admin notified (log message)
- **Verify**: User sees generic error (not internal details)

#### 3.4 Invalid S3 Credentials
- **Test**: Test with invalid AWS credentials
- **Verify**: Upload fails with authentication error
- **Verify**: Error logged for debugging
- **Verify**: System recovers (doesn't crash)

#### 3.5 S3 Rate Limiting
- **Test**: Upload many images rapidly (trigger rate limit)
- **Verify**: Rate limit handled gracefully
- **Verify**: Uploads queued or retried
- **Verify**: User feedback on upload progress

---

### 4. Cost Optimization and Cleanup (4 tests)

#### 4.1 Image Cleanup on Account Deletion
- **Test**: Delete customer account with progress photos
- **Verify**: All progress photos deleted from S3
- **Verify**: Profile image deleted from S3
- **Verify**: No orphaned objects (verify S3 bucket)
- **Cross-reference**: Tests from Phase B (delete account)

#### 4.2 Image Cleanup on Failed Upload
- **Test**: Upload fails mid-process (e.g., database save fails)
- **Verify**: Uploaded S3 image is cleaned up
- **Verify**: No orphaned S3 objects
- **Verify**: Transaction rollback complete

#### 4.3 Orphaned Image Detection
- **Test**: List all S3 objects and cross-reference with database
- **Verify**: No S3 objects without corresponding database records
- **Verify**: No database records with missing S3 objects
- **Script**: Create utility script for orphan detection

#### 4.4 Storage Metrics and Monitoring
- **Test**: Generate report of S3 storage usage
- **Verify**: Total object count
- **Verify**: Total storage size (MB/GB)
- **Verify**: Breakdown by category (profile, progress, recipe)
- **Recommendation**: Cost tracking dashboard

---

### 5. Security and Authorization (3 tests)

#### 5.1 Cross-User Access Prevention
- **Test**: Customer A attempts to upload to Customer B's profile
- **Verify**: Upload rejected with 403 Forbidden
- **Verify**: No S3 upload attempted
- **Verify**: Audit log entry (if implemented)

#### 5.2 Role-Based Upload Permissions
- **Test**: Customer attempts to upload recipe image (admin-only)
- **Verify**: Upload rejected with 403 Forbidden
- **Verify**: No S3 upload attempted

#### 5.3 Signed URL Expiration
- **Test**: Access image via expired signed URL
- **Verify**: Access denied (403 or 404)
- **Verify**: User notified to refresh

---

## 📋 Test Implementation Plan

### Phase 1: Setup and Utilities (30 min)

1. **Create S3 Test Utilities**
   - File: `test/utils/s3TestHelpers.ts`
   - Functions:
     - `listAllS3Objects()` - List all objects in test bucket
     - `countS3Objects(prefix)` - Count objects by prefix
     - `deleteTestS3Objects()` - Cleanup test objects
     - `mockS3Failure(errorType)` - Mock S3 errors
     - `uploadTestImage(key)` - Upload test image file

2. **Create Test Image Assets**
   - File: `test/fixtures/test-image-1.jpg` (small, valid)
   - File: `test/fixtures/test-image-large.jpg` (>10MB, invalid)
   - File: `test/fixtures/test-file.txt` (non-image, invalid)

3. **Setup Test Database State**
   - Use existing test accounts (admin, trainer, customer)
   - Create test recipes without images (for image upload tests)

---

### Phase 2: Image Upload E2E Tests (1 hour)

- **File**: `test/e2e/s3-image-uploads.spec.ts`
- **Tests**: 8 tests from Section 1 (Image Upload Workflows)
- **Technology**: Playwright with S3 SDK verification
- **Approach**:
  1. Perform UI action (upload image via form)
  2. Verify API response (200 OK, image URL returned)
  3. Verify S3 object exists (`listS3Objects`)
  4. Verify database record updated
  5. Verify image displays in UI

---

### Phase 3: Recipe Generation E2E Tests (1 hour)

- **File**: `test/e2e/s3-recipe-generation.spec.ts`
- **Tests**: 6 tests from Section 2 (Recipe Generation with S3 Images)
- **Technology**: Playwright + SSE monitoring
- **Approach**:
  1. Trigger BMAD recipe generation
  2. Monitor SSE progress for image upload events
  3. Verify all images uploaded to S3
  4. Verify all recipes in database with `imageUrl`
  5. Test deletion and verify S3 cleanup

---

### Phase 4: Error Scenarios E2E Tests (45 min)

- **File**: `test/e2e/s3-error-handling.spec.ts`
- **Tests**: 5 tests from Section 3 (S3 Error Scenarios)
- **Technology**: Playwright + S3 mocking (via MSW or similar)
- **Approach**:
  1. Mock S3 API responses (500, 403, timeout)
  2. Attempt upload
  3. Verify graceful failure
  4. Verify error messages
  5. Verify rollback/cleanup

---

### Phase 5: Cost Optimization Tests (30 min)

- **File**: `test/e2e/s3-cost-optimization.spec.ts`
- **Tests**: 4 tests from Section 4 (Cost Optimization)
- **Technology**: Playwright + S3 SDK + Orphan Detection Script
- **Approach**:
  1. Test delete account → verify S3 cleanup (cross-reference Phase B)
  2. Test failed upload → verify S3 cleanup
  3. Run orphan detection script
  4. Generate storage metrics report

---

### Phase 6: Security Tests (30 min)

- **File**: `test/e2e/s3-security.spec.ts`
- **Tests**: 3 tests from Section 5 (Security)
- **Technology**: Playwright with multi-user sessions
- **Approach**:
  1. Login as Customer A
  2. Attempt to upload to Customer B's profile (via API)
  3. Verify 403 Forbidden
  4. Test role-based restrictions

---

### Phase 7: QA Review and Documentation (30 min)

1. **Run All S3 E2E Tests**
   - `npx playwright test test/e2e/s3-*.spec.ts`
   - Target: 26 tests passing

2. **Generate Coverage Report**
   - Document test coverage by risk category
   - Identify any gaps

3. **Create QA Gate Document**
   - File: `docs/qa/gates/s3-e2e-test-qa-gate.md`
   - Quality score and PASS/FAIL decision

4. **Update Phase A Completion Document**
   - File: `PHASE_A_S3_E2E_COMPLETION.md`
   - Summary of deliverables

---

## ✅ Success Criteria

### Test Coverage Goals

- [ ] **26+ E2E tests** covering all 5 categories
- [ ] **100% P0 risk coverage** (cost, security, data integrity)
- [ ] **100% P1 risk coverage** (performance, integration)
- [ ] **Test/Code Ratio**: N/A (testing existing S3 integration)

### Quality Goals

- [ ] **All tests passing** (26/26)
- [ ] **No orphaned S3 objects** after test runs
- [ ] **Error handling verified** for all S3 failure modes
- [ ] **Security boundaries enforced** (auth, authorization)
- [ ] **Cost optimization validated** (cleanup working)

### Documentation Goals

- [ ] **Test strategy document** (this file)
- [ ] **QA gate review** with quality score
- [ ] **Phase A completion report** with metrics
- [ ] **Orphan detection script** for ongoing monitoring

---

## 📊 Expected Metrics

### Test Statistics (Estimated)

| Category | Tests | Lines of Code |
|----------|-------|---------------|
| Image Upload E2E | 8 | ~400 |
| Recipe Generation E2E | 6 | ~350 |
| Error Handling E2E | 5 | ~300 |
| Cost Optimization E2E | 4 | ~250 |
| Security E2E | 3 | ~200 |
| **Total E2E Tests** | **26** | **~1,500** |
| Test Utilities | N/A | ~200 |
| **Grand Total** | **26** | **~1,700** |

### Risk Coverage

| Risk Category | P0 Risks Covered | P1 Risks Covered | Total Coverage |
|---------------|------------------|------------------|----------------|
| Cost | 100% (4/4 tests) | 100% (2/2 tests) | 100% |
| Security | 100% (3/3 tests) | - | 100% |
| Data Integrity | 100% (6/6 tests) | - | 100% |
| Performance | - | 100% (2/2 tests) | 100% |
| Integration | - | 100% (5/5 tests) | 100% |
| **Total** | **100%** | **100%** | **100%** |

---

## 🔗 Integration with Phase B

Phase B (Delete Account Feature) created comprehensive tests for cascade deletes + S3 cleanup:
- `test/unit/accountDeletion.test.ts` (24 tests)
- `test/e2e/account-deletion.spec.ts` (10 tests)

**Cross-Reference Tests:**
- Phase B Test E2E-1: Complete deletion workflow → verifies S3 cleanup
- Phase B Test E2E-5: Deletion with cascade relationships → verifies S3 cleanup for photos
- Phase A Test 4.1: Image cleanup on account deletion → extends Phase B coverage

**Shared Utilities:**
- `server/services/s3Cleanup.ts` (created in Phase B, tested in Phase A)
- S3 test helpers (Phase A) can be reused for Phase B test enhancements

---

## 🚀 Next Steps After Phase A

1. **Run Full Test Suite**
   - All unit tests (existing + Phase A)
   - All E2E tests (existing + Phase A + Phase B)
   - Target: 95%+ pass rate

2. **Calculate Coverage Gains**
   - Before: Unit test coverage (baseline)
   - After: Unit + E2E coverage (with S3 + delete account)
   - Report improvement metrics

3. **Production Deployment Readiness**
   - Phase B: Delete account feature (after manual integration)
   - Phase A: S3 E2E tests validate production S3 integration
   - Both phases ready for deployment

---

**Prepared by:** BMAD QA Agent
**Date:** October 22, 2025
**Phase:** Phase A - S3 E2E Testing
**Estimated Time:** 3-4 hours
**Status:** Ready for Implementation
