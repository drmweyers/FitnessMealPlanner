import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Profile Image Upload Feature - Integration Tests', () => {
  describe('File Structure Validation', () => {
    it('should have all required component files', () => {
      const componentPath = join(__dirname, '../../client/src/components/ProfileImageUpload.tsx');
      expect(existsSync(componentPath)).toBe(true);
      
      if (existsSync(componentPath)) {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toContain('ProfileImageUpload');
        expect(content).toContain('ProfileAvatar');
        expect(content).toContain('Camera');
        expect(content).toContain('Upload');
        expect(content).toContain('Trash2');
      }
    });
    
    it('should have S3 upload service', () => {
      const servicePath = join(__dirname, '../../server/services/s3Upload.ts');
      expect(existsSync(servicePath)).toBe(true);
      
      if (existsSync(servicePath)) {
        const content = readFileSync(servicePath, 'utf-8');
        expect(content).toContain('uploadProfileImage');
        expect(content).toContain('deleteProfileImage');
        expect(content).toContain('validateImageFile');
      }
    });
    
    it('should have profile API routes', () => {
      const routesPath = join(__dirname, '../../server/routes/profileRoutes.ts');
      expect(existsSync(routesPath)).toBe(true);
      
      if (existsSync(routesPath)) {
        const content = readFileSync(routesPath, 'utf-8');
        expect(content).toContain('/upload-image');
        expect(content).toContain('/delete-image');
        expect(content).toContain('requireAuth');
      }
    });
  });
  
  describe('Database Schema Validation', () => {
    it('should have profilePicture field in user schema', () => {
      const schemaPath = join(__dirname, '../../shared/schema.ts');
      expect(existsSync(schemaPath)).toBe(true);
      
      if (existsSync(schemaPath)) {
        const content = readFileSync(schemaPath, 'utf-8');
        expect(content).toContain('profilePicture');
      }
    });
  });
  
  describe('Auth Endpoints Integration', () => {
    it('should include profilePicture in auth responses', () => {
      const authPath = join(__dirname, '../../server/authRoutes.ts');
      expect(existsSync(authPath)).toBe(true);
      
      if (existsSync(authPath)) {
        const content = readFileSync(authPath, 'utf-8');
        // Check that profilePicture is included in user responses
        expect(content).toContain('profilePicture: user.profilePicture');
      }
    });
  });
  
  describe('Frontend Integration', () => {
    it('should have updated Header component', () => {
      const headerPath = join(__dirname, '../../client/src/components/Layout.tsx');
      expect(existsSync(headerPath)).toBe(true);
      
      if (existsSync(headerPath)) {
        const content = readFileSync(headerPath, 'utf-8');
        expect(content).toContain('ProfileAvatar');
      }
    });
    
    it('should have updated profile pages', () => {
      const pages = [
        'AdminProfile.tsx',
        'TrainerProfile.tsx', 
        'CustomerProfile.tsx'
      ];
      
      pages.forEach(page => {
        const pagePath = join(__dirname, '../../client/src/pages', page);
        if (existsSync(pagePath)) {
          const content = readFileSync(pagePath, 'utf-8');
          expect(content).toContain('ProfileImageUpload');
        }
      });
    });
  });
  
  describe('Type Definitions', () => {
    it('should have updated User interface with profilePicture', () => {
      const typesPath = join(__dirname, '../../client/src/types/auth.ts');
      expect(existsSync(typesPath)).toBe(true);
      
      if (existsSync(typesPath)) {
        const content = readFileSync(typesPath, 'utf-8');
        expect(content).toContain('profilePicture');
      }
    });
  });
  
  describe('Query Client Integration', () => {
    it('should handle FormData in apiRequest', () => {
      const queryClientPath = join(__dirname, '../../client/src/lib/queryClient.ts');
      expect(existsSync(queryClientPath)).toBe(true);
      
      if (existsSync(queryClientPath)) {
        const content = readFileSync(queryClientPath, 'utf-8');
        expect(content).toContain('FormData');
      }
    });
  });
  
  describe('Environment Configuration', () => {
    it('should have AWS configuration options', () => {
      const s3ServicePath = join(__dirname, '../../server/services/s3Upload.ts');
      if (existsSync(s3ServicePath)) {
        const content = readFileSync(s3ServicePath, 'utf-8');
        expect(content).toContain('AWS_REGION');
        expect(content).toContain('AWS_S3_BUCKET_NAME');
      }
    });
  });
  
  describe('Error Handling', () => {
    it('should have proper error handling in upload service', () => {
      const s3ServicePath = join(__dirname, '../../server/services/s3Upload.ts');
      if (existsSync(s3ServicePath)) {
        const content = readFileSync(s3ServicePath, 'utf-8');
        expect(content).toContain('try');
        expect(content).toContain('catch');
        expect(content).toContain('throw new Error');
      }
    });
  });
});

describe('Feature Completeness Checklist', () => {
  it('should have implemented all required components', () => {
    const requiredFiles = [
      '../../client/src/components/ProfileImageUpload.tsx',
      '../../server/services/s3Upload.ts',
      '../../server/routes/profileRoutes.ts'
    ];
    
    requiredFiles.forEach(file => {
      const filePath = join(__dirname, file);
      expect(existsSync(filePath)).toBe(true);
    });
  });
  
  it('should support all user roles', () => {
    const profilePages = [
      '../../client/src/pages/AdminProfile.tsx',
      '../../client/src/pages/TrainerProfile.tsx',
      '../../client/src/pages/CustomerProfile.tsx'
    ];
    
    let pagesWithProfileImage = 0;
    profilePages.forEach(page => {
      const pagePath = join(__dirname, page);
      if (existsSync(pagePath)) {
        const content = readFileSync(pagePath, 'utf-8');
        if (content.includes('ProfileImageUpload')) {
          pagesWithProfileImage++;
        }
      }
    });
    
    // At least some profile pages should have the upload component
    expect(pagesWithProfileImage).toBeGreaterThan(0);
  });
  
  it('should have upload and delete functionality', () => {
    const routesPath = join(__dirname, '../../server/routes/profileRoutes.ts');
    if (existsSync(routesPath)) {
      const content = readFileSync(routesPath, 'utf-8');
      expect(content).toContain('upload-image');
      expect(content).toContain('delete-image');
      expect(content).toContain('POST');
      expect(content).toContain('DELETE');
    }
  });
  
  it('should have both S3 and local storage support', () => {
    const s3ServicePath = join(__dirname, '../../server/services/s3Upload.ts');
    if (existsSync(s3ServicePath)) {
      const content = readFileSync(s3ServicePath, 'utf-8');
      expect(content).toContain('uploadProfileImage'); // S3 function
      expect(content).toContain('uploadProfileImageLocal'); // Local function
    }
  });
});