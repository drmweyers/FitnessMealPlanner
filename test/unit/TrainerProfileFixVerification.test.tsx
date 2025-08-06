import React from 'react';
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Static analysis tests to verify the TrainerProfile fix
 * These tests examine the source code directly to confirm:
 * 1. Removed text is not present in the file
 * 2. ProfileImageUpload is not imported
 * 3. Profile image related content is not present
 */

const TRAINER_PROFILE_PATH = path.resolve(__dirname, '../../client/src/pages/TrainerProfile.tsx');

describe('TrainerProfile Fix - Static Code Analysis', () => {
  let trainerProfileContent: string;

  beforeAll(() => {
    // Read the TrainerProfile.tsx file content
    trainerProfileContent = fs.readFileSync(TRAINER_PROFILE_PATH, 'utf-8');
  });

  describe('Text Removal Verification', () => {
    it('should NOT contain the removed subtitle text', () => {
      // Verify the specific text that was requested to be removed is gone
      expect(trainerProfileContent).not.toContain('Professional fitness trainer dashboard and settings');
    });

    it('should NOT contain the "Personal Trainer" badge text', () => {
      // Verify the Personal Trainer badge text is removed
      expect(trainerProfileContent).not.toContain('Personal Trainer');
    });

    it('should still contain the main "Trainer Profile" heading', () => {
      // Verify the main heading remains
      expect(trainerProfileContent).toContain('Trainer Profile');
    });
  });

  describe('ProfileImageUpload Import Verification', () => {
    it('should NOT import ProfileImageUpload component', () => {
      // Check for any import of ProfileImageUpload
      expect(trainerProfileContent).not.toMatch(/import.*ProfileImageUpload/);
      expect(trainerProfileContent).not.toContain('from ../components/ProfileImageUpload');
      expect(trainerProfileContent).not.toContain("from '../components/ProfileImageUpload'");
    });

    it('should NOT import ProfileAvatar component', () => {
      // Check for any import of ProfileAvatar (part of ProfileImageUpload)
      expect(trainerProfileContent).not.toMatch(/import.*ProfileAvatar/);
    });
  });

  describe('Profile Image Content Removal Verification', () => {
    it('should NOT contain profile image upload text', () => {
      // Verify all profile image related text is gone
      const profileImageTexts = [
        'Upload a professional profile image',
        'profile image',
        'Profile Image',
        'Recommended: Square image',
        'at least 200x200px',
        'Max file size: 5MB',
        'Supported formats: JPEG, PNG, WebP',
      ];

      profileImageTexts.forEach(text => {
        expect(trainerProfileContent).not.toContain(text);
      });
    });

    it('should NOT contain ProfileImageUpload JSX usage', () => {
      // Check for any JSX usage of the component
      expect(trainerProfileContent).not.toContain('<ProfileImageUpload');
      expect(trainerProfileContent).not.toContain('<ProfileAvatar');
    });
  });

  describe('Code Structure Verification', () => {
    it('should maintain clean header structure', () => {
      // Verify that the header section doesn't contain removed elements
      const headerRegex = /<div[^>]*class[^>]*>\s*<h1[^>]*>Trainer Profile<\/h1>/;
      expect(trainerProfileContent).toMatch(headerRegex);
      
      // Verify no dangling paragraph with removed subtitle
      expect(trainerProfileContent).not.toMatch(
        /<h1[^>]*>Trainer Profile<\/h1>\s*<p[^>]*>Professional fitness trainer dashboard and settings<\/p>/
      );
    });

    it('should NOT contain Personal Trainer badge JSX', () => {
      // Verify the badge component is removed
      expect(trainerProfileContent).not.toMatch(
        /<Badge[^>]*>\s*<Dumbbell[^>]*\/>\s*Personal Trainer\s*<\/Badge>/
      );
    });

    it('should still contain essential TrainerProfile sections', () => {
      // Verify important sections remain
      expect(trainerProfileContent).toContain('Account Details');
      expect(trainerProfileContent).toContain('Performance Overview');
      expect(trainerProfileContent).toContain('Quick Actions');
    });
  });

  describe('Import Analysis', () => {
    it('should have correct imports without ProfileImageUpload', () => {
      // Get all import lines
      const importLines = trainerProfileContent
        .split('\n')
        .filter(line => line.trim().startsWith('import'));
      
      // Verify ProfileImageUpload is not imported
      const hasProfileImageImport = importLines.some(line => 
        line.includes('ProfileImageUpload') || line.includes('ProfileAvatar')
      );
      
      expect(hasProfileImageImport).toBe(false);
    });

    it('should still have necessary imports for trainer functionality', () => {
      // Verify essential imports are still present
      expect(trainerProfileContent).toContain("from '../components/ui/card'");
      expect(trainerProfileContent).toContain("from '../components/ui/button'");
      expect(trainerProfileContent).toContain("from '../contexts/AuthContext'");
    });
  });
});

describe('TrainerProfile vs Other Profiles Comparison', () => {
  const ADMIN_PROFILE_PATH = path.resolve(__dirname, '../../client/src/pages/AdminProfile.tsx');
  const CUSTOMER_PROFILE_PATH = path.resolve(__dirname, '../../client/src/pages/CustomerProfile.tsx');
  
  it('should differ from AdminProfile which DOES have ProfileImageUpload', () => {
    const adminContent = fs.readFileSync(ADMIN_PROFILE_PATH, 'utf-8');
    const trainerContent = fs.readFileSync(TRAINER_PROFILE_PATH, 'utf-8');
    
    // Admin should have ProfileImageUpload
    expect(adminContent).toContain('ProfileImageUpload');
    
    // Trainer should NOT have ProfileImageUpload
    expect(trainerContent).not.toContain('ProfileImageUpload');
  });

  it('should differ from CustomerProfile which DOES have ProfileImageUpload', () => {
    const customerContent = fs.readFileSync(CUSTOMER_PROFILE_PATH, 'utf-8');
    const trainerContent = fs.readFileSync(TRAINER_PROFILE_PATH, 'utf-8');
    
    // Customer should have ProfileImageUpload
    expect(customerContent).toContain('ProfileImageUpload');
    
    // Trainer should NOT have ProfileImageUpload
    expect(trainerContent).not.toContain('ProfileImageUpload');
  });

  it('should be the only profile page WITHOUT ProfileImageUpload', () => {
    const adminContent = fs.readFileSync(ADMIN_PROFILE_PATH, 'utf-8');
    const customerContent = fs.readFileSync(CUSTOMER_PROFILE_PATH, 'utf-8');
    const trainerContent = fs.readFileSync(TRAINER_PROFILE_PATH, 'utf-8');
    
    // Only TrainerProfile should lack ProfileImageUpload
    expect(adminContent).toContain('ProfileImageUpload');      // Admin has it
    expect(customerContent).toContain('ProfileImageUpload');   // Customer has it  
    expect(trainerContent).not.toContain('ProfileImageUpload'); // Trainer does NOT have it
  });
});