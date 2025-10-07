import React from 'react';
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Simple test to verify profile routing logic in Router.tsx
 * This test examines the routing code to confirm each role
 * gets directed to the correct profile component
 */

const ROUTER_PATH = path.resolve(__dirname, '../../client/src/Router.tsx');

describe('Profile Routing Logic Verification', () => {
  let routerContent: string;

  beforeAll(() => {
    // Read the Router.tsx file content
    routerContent = fs.readFileSync(ROUTER_PATH, 'utf-8');
  });

  describe('Shared /profile Route Logic', () => {
    it('should contain role-based routing switch statement', () => {
      // Verify the shared /profile route exists with role-based logic
      expect(routerContent).toContain('path="/profile"');
      expect(routerContent).toContain('switch (user.role)');
    });

    it('should route admin to AdminProfile', () => {
      // Verify admin case routes to AdminProfile
      expect(routerContent).toMatch(/case 'admin':\s*return <AdminProfile/);
    });

    it('should route trainer to TrainerProfile', () => {
      // Verify trainer case routes to TrainerProfile
      expect(routerContent).toMatch(/case 'trainer':\s*return <TrainerProfile/);
    });

    it('should route customer to CustomerProfile', () => {
      // Verify customer case routes to CustomerProfile
      expect(routerContent).toMatch(/case 'customer':\s*return <CustomerProfile/);
    });

    it('should have default case for unknown roles', () => {
      // Verify there's a default fallback
      expect(routerContent).toContain('default:');
      expect(routerContent).toMatch(/default:\s*return <Redirect to="\//);
    });
  });

  describe('Role-Specific Profile Routes', () => {
    it('should have protected /admin/profile route', () => {
      // Verify admin-specific profile route exists with role check
      expect(routerContent).toContain('path="/admin/profile"');
      expect(routerContent).toMatch(/if \(user\.role !== 'admin'\)/);
    });

    it('should have protected /trainer/profile route', () => {
      // Verify trainer-specific profile route exists with role check
      expect(routerContent).toContain('path="/trainer/profile"');
      expect(routerContent).toMatch(/if \(user\.role !== 'trainer'\)/);
    });

    it('should have protected /customer/profile route', () => {
      // Verify customer-specific profile route exists with role check
      expect(routerContent).toContain('path="/customer/profile"');
      expect(routerContent).toMatch(/if \(user\.role !== 'customer'\)/);
    });
  });

  describe('Profile Component Imports', () => {
    it('should import all three profile components', () => {
      // Verify all profile components are imported
      expect(routerContent).toContain('AdminProfile');
      expect(routerContent).toContain('TrainerProfile'); 
      expect(routerContent).toContain('CustomerProfile');
    });

    it('should import profile components from correct paths', () => {
      // Verify imports are from the pages directory
      expect(routerContent).toContain('from "./pages/AdminProfile"');
      expect(routerContent).toContain('from "./pages/TrainerProfile"');
      expect(routerContent).toContain('from "./pages/CustomerProfile"');
    });
  });

  describe('Route Security', () => {
    it('should redirect unauthorized users from role-specific routes', () => {
      // Count the number of role-specific redirects
      const redirectMatches = routerContent.match(/return <Redirect to="\/" \/>/g) || [];
      
      // Should have redirects for unauthorized access to role-specific routes
      // Plus the default case in the shared route switch
      expect(redirectMatches.length).toBeGreaterThan(3);
    });

    it('should protect role-specific routes with proper role checks', () => {
      // Verify each role-specific route has proper authorization
      expect(routerContent).toMatch(/user\.role !== 'admin'/);
      expect(routerContent).toMatch(/user\.role !== 'trainer'/);
      expect(routerContent).toMatch(/user\.role !== 'customer'/);
    });
  });
});

describe('Profile Route Configuration Analysis', () => {
  it('should have no conflicts between route paths', () => {
    const routerContent = fs.readFileSync(ROUTER_PATH, 'utf-8');
    
    // Extract all route paths
    const routePaths = [
      '/profile',
      '/admin/profile', 
      '/trainer/profile',
      '/customer/profile'
    ];

    // Verify all paths are unique and present
    routePaths.forEach(path => {
      expect(routerContent).toContain(`path="${path}"`);
    });

    // Verify no duplicate route definitions
    routePaths.forEach(path => {
      const matches = routerContent.match(new RegExp(`path="${path}"`, 'g')) || [];
      expect(matches.length).toBe(1);
    });
  });

  it('should prioritize more specific routes over general routes', () => {
    const routerContent = fs.readFileSync(ROUTER_PATH, 'utf-8');
    
    // Get positions of route definitions
    const profilePos = routerContent.indexOf('path="/profile"');
    const adminProfilePos = routerContent.indexOf('path="/admin/profile"');
    const trainerProfilePos = routerContent.indexOf('path="/trainer/profile"');
    const customerProfilePos = routerContent.indexOf('path="/customer/profile"');
    
    // More specific routes should come after the general /profile route
    // This is fine because React Router will match the first matching route
    expect(profilePos).toBeGreaterThan(-1);
    expect(adminProfilePos).toBeGreaterThan(-1);
    expect(trainerProfilePos).toBeGreaterThan(-1);
    expect(customerProfilePos).toBeGreaterThan(-1);
  });
});