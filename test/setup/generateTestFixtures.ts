/**
 * Generate test fixture files for S3 E2E testing
 *
 * Run this script before running S3 E2E tests:
 * npx tsx test/setup/generateTestFixtures.ts
 */

import { createTestImageFile, createTestTextFile, ensureFixtureDirectory } from '../utils/s3TestHelpers';

console.log('Generating test fixtures for S3 E2E tests...\n');

// Ensure fixture directory exists
ensureFixtureDirectory();

// Generate test images
console.log('Creating test-image-1.jpg (50 KB)...');
createTestImageFile('test-image-1.jpg', 50);

console.log('Creating test-image-2.jpg (100 KB)...');
createTestImageFile('test-image-2.jpg', 100);

console.log('Creating test-image-3.jpg (200 KB)...');
createTestImageFile('test-image-3.jpg', 200);

console.log('Creating test-image-large.jpg (15 MB - invalid)...');
createTestImageFile('test-image-large.jpg', 15 * 1024);

// Generate test non-image file
console.log('Creating test-file.txt (non-image)...');
createTestTextFile('test-file.txt');

console.log('\n✅ Test fixtures generated successfully!');
console.log('Location: test/fixtures/');
console.log('\nFiles created:');
console.log('  - test-image-1.jpg (50 KB)');
console.log('  - test-image-2.jpg (100 KB)');
console.log('  - test-image-3.jpg (200 KB)');
console.log('  - test-image-large.jpg (15 MB)');
console.log('  - test-file.txt (non-image)');
