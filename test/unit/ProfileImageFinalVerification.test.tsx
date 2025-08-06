import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * FINAL VERIFICATION: Ensure ProfileImageUpload is completely removed from TrainerProfile
 */

const TRAINER_PROFILE_PATH = path.resolve(__dirname, '../../client/src/pages/TrainerProfile.tsx');

describe('🔥 FINAL PROFILE IMAGE REMOVAL VERIFICATION', () => {
  let trainerProfileContent: string;

  beforeAll(() => {
    trainerProfileContent = fs.readFileSync(TRAINER_PROFILE_PATH, 'utf-8');
  });

  it('should NOT import ProfileImageUpload', () => {
    expect(trainerProfileContent).not.toContain('import ProfileImageUpload');
    expect(trainerProfileContent).not.toContain('from \'../components/ProfileImageUpload\'');
    expect(trainerProfileContent).not.toContain('from "../components/ProfileImageUpload"');
  });

  it('should NOT contain ProfileImageUpload JSX usage', () => {
    expect(trainerProfileContent).not.toContain('<ProfileImageUpload');
    expect(trainerProfileContent).not.toContain('ProfileImageUpload');
  });

  it('should NOT contain Profile Image card header', () => {
    expect(trainerProfileContent).not.toContain('Profile Image</span>');
    expect(trainerProfileContent).not.toContain('Profile Image');
  });

  it('should NOT contain profile image upload text', () => {
    const profileTexts = [
      'Upload a professional profile image',
      'Recommended: Square image',
      'at least 200x200px',
      'Max file size: 5MB',
      'Supported formats: JPEG, PNG, WebP'
    ];

    profileTexts.forEach(text => {
      expect(trainerProfileContent).not.toContain(text);
    });
  });

  it('should NOT contain the complete Profile Image Card section', () => {
    // Check that the profile image card structure is gone
    expect(trainerProfileContent).not.toMatch(/\{\/\* Profile Image Card \*\/\}/);
    expect(trainerProfileContent).not.toContain('Profile Image Card');
  });

  it('should still contain essential trainer profile sections', () => {
    // Verify we didn't break anything important
    expect(trainerProfileContent).toContain('Account Details');
    expect(trainerProfileContent).toContain('Performance Overview');
    expect(trainerProfileContent).toContain('Quick Actions');
  });

  it('should have clean file structure without ProfileImageUpload references', () => {
    // Count total lines to verify file was actually modified
    const lines = trainerProfileContent.split('\n');
    console.log(`📊 TrainerProfile.tsx total lines: ${lines.length}`);
    
    // Search for any remaining profile image references
    const profileImageReferences = lines.filter(line => 
      line.toLowerCase().includes('profile') && 
      line.toLowerCase().includes('image')
    );
    
    console.log(`🔍 Found ${profileImageReferences.length} profile+image references:`);
    profileImageReferences.forEach((line, index) => {
      console.log(`   ${index + 1}. ${line.trim()}`);
    });
    
    // Should have zero profile image references
    expect(profileImageReferences.length).toBe(0);
  });
});