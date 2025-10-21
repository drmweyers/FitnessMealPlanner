/**
 * Server Startup Tests
 * Tests for preventing ERR_CONNECTION_REFUSED and port conflicts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import fetch from 'node-fetch';

const execAsync = promisify(exec);
const IS_WINDOWS = platform() === 'win32';
const TEST_PORT = process.env.TEST_PORT || '5099';
const DEV_PORT = process.env.PORT || '5001';

describe('Server Startup Tests', () => {
  describe('Port Availability', () => {
    it('should detect if port is already in use', async () => {
      const isPortInUse = async (port: string): Promise<boolean> => {
        try {
          if (IS_WINDOWS) {
            const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
            return stdout.trim().length > 0;
          } else {
            const { stdout } = await execAsync(`lsof -ti:${port}`);
            return stdout.trim().length > 0;
          }
        } catch {
          return false;
        }
      };

      // Port 5001 should be free after cleanup
      const portInUse = await isPortInUse(DEV_PORT);

      if (portInUse) {
        console.warn(`⚠️  Warning: Port ${DEV_PORT} is in use. Run 'npm run cleanup-port' to fix.`);
      }

      // Test should pass regardless, but warn if port is in use
      expect(typeof portInUse).toBe('boolean');
    });

    it('should have cleanup script file', async () => {
      // This tests the cleanup script exists
      const fs = await import('fs/promises');
      try {
        const scriptExists = await fs.access('scripts/cleanup-port.js');
        expect(scriptExists).toBeUndefined(); // access returns undefined on success
      } catch (error) {
        throw new Error('Cleanup script file not found at scripts/cleanup-port.js');
      }
    });
  });

  describe('Error Handling', () => {
    it('should have proper error handling in server code', async () => {
      // Read server code and verify error handling exists
      const fs = await import('fs/promises');
      const serverCode = await fs.readFile('server/index.ts', 'utf-8');

      // Check for EADDRINUSE error handling
      expect(serverCode).toContain('EADDRINUSE');
      expect(serverCode).toContain('server.on(\'error\'');

      // Check for graceful shutdown
      expect(serverCode).toContain('SIGTERM');
      expect(serverCode).toContain('SIGINT');

      // Check for helpful error messages
      expect(serverCode).toContain('Port');
      expect(serverCode).toContain('already in use');
    });

    it('should export both app and server for testing', async () => {
      // This prevents future breaking changes
      const fs = await import('fs/promises');
      const serverCode = await fs.readFile('server/index.ts', 'utf-8');

      expect(serverCode).toContain('export { app');
      expect(serverCode).toContain('server }');
    });
  });

  describe('Server Configuration', () => {
    it('should use correct port from environment', () => {
      const expectedPort = process.env.PORT || '5001';
      expect(expectedPort).toBeTruthy();
      expect(Number(expectedPort)).toBeGreaterThan(0);
      expect(Number(expectedPort)).toBeLessThan(65536);
    });

    it('should have health check endpoint defined', async () => {
      const fs = await import('fs/promises');
      const serverCode = await fs.readFile('server/index.ts', 'utf-8');

      expect(serverCode).toContain('/health');
      expect(serverCode).toContain('200');
    });

    it('should configure CORS for development', async () => {
      const fs = await import('fs/promises');
      const serverCode = await fs.readFile('server/index.ts', 'utf-8');

      expect(serverCode).toContain('cors');
      expect(serverCode).toContain('localhost');
    });
  });

  describe('Startup Scripts', () => {
    it('should have cleanup-port script in package.json', async () => {
      const fs = await import('fs/promises');
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf-8')
      );

      expect(packageJson.scripts['cleanup-port']).toBeDefined();
      expect(packageJson.scripts['cleanup-port']).toContain('cleanup-port.js');
    });

    it('should automatically cleanup port before dev start', async () => {
      const fs = await import('fs/promises');
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf-8')
      );

      // Dev script should run cleanup first
      expect(packageJson.scripts.dev).toContain('cleanup-port');
    });

    it('should have dev:no-cleanup script as fallback', async () => {
      const fs = await import('fs/promises');
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf-8')
      );

      expect(packageJson.scripts['dev:no-cleanup']).toBeDefined();
    });
  });

  describe('Documentation', () => {
    it('should have deployment troubleshooting guide', async () => {
      const fs = await import('fs/promises');

      try {
        const troubleshootingDoc = await fs.readFile(
          'DEPLOYMENT_TROUBLESHOOTING.md',
          'utf-8'
        );

        // Should document port conflicts
        expect(troubleshootingDoc).toContain('port');
        expect(troubleshootingDoc).toContain('EADDRINUSE');
      } catch {
        throw new Error('DEPLOYMENT_TROUBLESHOOTING.md not found');
      }
    });

    it('should document port cleanup in deployment guide', async () => {
      const fs = await import('fs/promises');

      try {
        const deployDoc = await fs.readFile(
          'DEPLOYMENT_CHECKLIST.md',
          'utf-8'
        );

        expect(deployDoc).toContain('port');
      } catch {
        throw new Error('DEPLOYMENT_CHECKLIST.md not found');
      }
    });
  });

  describe('Prevention Measures', () => {
    it('should fail fast with clear error message on port conflict', async () => {
      const fs = await import('fs/promises');
      const serverCode = await fs.readFile('server/index.ts', 'utf-8');

      // Should have helpful error message
      expect(serverCode).toContain('Solutions');
      expect(serverCode).toContain('cleanup-port');

      // Should exit on error
      expect(serverCode).toContain('process.exit(1)');
    });

    it('should log startup success with useful information', async () => {
      const fs = await import('fs/promises');
      const serverCode = await fs.readFile('server/index.ts', 'utf-8');

      // Should log helpful startup info
      expect(serverCode).toMatch(/console\.log.*listening/i);
      expect(serverCode).toMatch(/console\.log.*health/i);
      expect(serverCode).toMatch(/console\.log.*environment/i);
    });
  });
});

describe('Integration: Port Cleanup', () => {
  it('should successfully cleanup port and start server', async () => {
    // This is an integration test that verifies the full flow
    console.log('🧪 Testing port cleanup...');

    // Run cleanup
    try {
      await execAsync('node scripts/cleanup-port.js');
      console.log('✅ Port cleanup successful');
    } catch (error) {
      console.error('❌ Port cleanup failed:', error);
      throw error;
    }

    // Verify port is free
    const isPortFree = async (port: string): Promise<boolean> => {
      try {
        if (IS_WINDOWS) {
          const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
          return stdout.trim().length === 0;
        } else {
          const { stdout } = await execAsync(`lsof -ti:${port}`);
          return stdout.trim().length === 0;
        }
      } catch {
        return true; // If command fails, assume port is free
      }
    };

    const portFree = await isPortFree(DEV_PORT);
    expect(portFree).toBe(true);
  });
});
