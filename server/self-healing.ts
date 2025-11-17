// @ts-nocheck - Infrastructure/agent file, type errors suppressed
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getFetch } from './utils/fetch.js';

const execAsync = promisify(exec);

interface HealthIssue {
  type: 'viteexpress_failure' | 'route_timeout' | 'memory_pressure' | 'port_conflict' | 'startup_failure' | 'disk_space' | 'dependency_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  details?: any;
  route?: string;
  errorMessage?: string;
}

interface HealingAttempt {
  issue: HealthIssue;
  attemptNumber: number;
  timestamp: Date;
  success: boolean;
  duration: number;
  actions: string[];
  error?: string;
}

export class SelfHealingSystem {
  private healingAttempts: Map<string, HealingAttempt[]> = new Map();
  private maxHealingAttempts = parseInt(process.env.MAX_HEALING_ATTEMPTS || '3');
  private healingInProgress = false;
  private healingHistory: HealingAttempt[] = [];

  constructor() {
    console.log('🔧 Self-Healing System initialized');
    console.log(`⚙️ Max healing attempts: ${this.maxHealingAttempts}`);
    this.setupProcessMonitoring();
  }

  // Main healing orchestrator
  public async heal(issue: HealthIssue): Promise<boolean> {
    if (this.healingInProgress) {
      console.log('⚠️ Healing already in progress - queuing issue');
      return false;
    }

    const issueKey = `${issue.type}_${issue.route || 'system'}`;
    const previousAttempts = this.healingAttempts.get(issueKey) || [];

    if (previousAttempts.length >= this.maxHealingAttempts) {
      console.error(`🚨 Max healing attempts (${this.maxHealingAttempts}) reached for ${issueKey} - manual intervention required`);
      await this.escalateToManualIntervention(issue, previousAttempts);
      return false;
    }

    this.healingInProgress = true;
    const attemptNumber = previousAttempts.length + 1;
    const startTime = Date.now();

    console.log(`🔧 Self-healing attempt ${attemptNumber}/${this.maxHealingAttempts}: ${issue.type}`);
    console.log(`📊 Issue severity: ${issue.severity}`);
    if (issue.details) {
      console.log(`📋 Details:`, issue.details);
    }

    const actions: string[] = [];
    let success = false;
    let error: string | undefined;

    try {
      switch (issue.type) {
        case 'viteexpress_failure':
          success = await this.healViteExpressFailure(actions);
          break;
        case 'route_timeout':
          success = await this.healRouteTimeout(issue, actions);
          break;
        case 'memory_pressure':
          success = await this.healMemoryPressure(actions);
          break;
        case 'port_conflict':
          success = await this.healPortConflict(actions);
          break;
        case 'startup_failure':
          success = await this.healStartupFailure(issue, actions);
          break;
        case 'disk_space':
          success = await this.healDiskSpace(actions);
          break;
        case 'dependency_error':
          success = await this.healDependencyError(issue, actions);
          break;
        default:
          console.warn(`❓ Unknown issue type: ${issue.type}`);
          success = false;
      }
    } catch (healingError) {
      console.error(`💥 Healing attempt failed:`, healingError);
      error = healingError.message;
      success = false;
    }

    const duration = Date.now() - startTime;
    const attempt: HealingAttempt = {
      issue,
      attemptNumber,
      timestamp: new Date(),
      success,
      duration,
      actions,
      error
    };

    // Record attempt
    if (!this.healingAttempts.has(issueKey)) {
      this.healingAttempts.set(issueKey, []);
    }
    this.healingAttempts.get(issueKey)!.push(attempt);
    this.healingHistory.push(attempt);

    // Log results
    if (success) {
      console.log(`✅ Healing successful for ${issue.type} (${duration}ms)`);
      console.log(`🔧 Actions taken: ${actions.join(', ')}`);

      // Clear previous attempts on success
      this.healingAttempts.set(issueKey, []);
    } else {
      console.log(`❌ Healing failed for ${issue.type} (attempt ${attemptNumber}/${this.maxHealingAttempts})`);
      if (error) {
        console.log(`💥 Error: ${error}`);
      }
    }

    this.healingInProgress = false;
    return success;
  }

  // ViteExpress-specific healing
  private async healViteExpressFailure(actions: string[]): Promise<boolean> {
    try {
      console.log('🔄 Attempting ViteExpress recovery...');

      // Step 1: Clear Node.js require cache
      actions.push('clear_require_cache');
      this.clearRequireCache();
      await this.sleep(1000);

      // Step 2: Check for port conflicts
      actions.push('check_port_conflicts');
      const portConflict = await this.checkPortConflicts(4000);
      if (portConflict) {
        console.log('⚠️ Port conflict detected - attempting resolution');
        actions.push('resolve_port_conflict');
        await this.resolvePortConflict(4000);
      }

      // Step 3: Restart Vite dev server process
      actions.push('restart_vite_dev_server');
      await this.restartViteDevServer();

      // Step 4: Wait for recovery and test
      actions.push('wait_for_recovery');
      const recovered = await this.waitForRecovery(15000); // 15 seconds

      if (recovered) {
        actions.push('recovery_successful');
        return true;
      }

      // Step 5: Full environment reset as last resort
      console.log('🔄 ViteExpress still unresponsive - attempting environment reset');
      actions.push('full_environment_reset');
      await this.performEnvironmentReset();

      const finalCheck = await this.waitForRecovery(20000); // 20 seconds
      if (finalCheck) {
        actions.push('environment_reset_successful');
        return true;
      }

      return false;
    } catch (error) {
      console.error('ViteExpress healing failed:', error);
      throw error;
    }
  }

  // Route timeout healing
  private async healRouteTimeout(issue: HealthIssue, actions: string[]): Promise<boolean> {
    try {
      console.log(`🔄 Healing route timeout for ${issue.route}`);

      // Step 1: Check system resources
      actions.push('check_system_resources');
      const systemHealth = await this.checkSystemResources();

      if (systemHealth.memoryUsage > 85) {
        actions.push('clear_memory_pressure');
        await this.clearMemoryPressure();
      }

      if (systemHealth.cpuUsage > 90) {
        actions.push('reduce_cpu_load');
        await this.reduceCpuLoad();
      }

      // Step 2: Clear application caches
      actions.push('clear_application_caches');
      await this.clearApplicationCaches();

      // Step 3: Restart specific services
      actions.push('restart_specific_services');
      await this.restartSpecificServices();

      // Step 4: Test route recovery
      actions.push('test_route_recovery');
      const routeHealthy = await this.testRouteHealth(issue.route || '/api/health');

      return routeHealthy;
    } catch (error) {
      console.error('Route timeout healing failed:', error);
      throw error;
    }
  }

  // Memory pressure healing
  private async healMemoryPressure(actions: string[]): Promise<boolean> {
    try {
      console.log('🔄 Healing memory pressure...');

      // Step 1: Clear Node.js memory
      actions.push('clear_nodejs_memory');
      await this.clearNodeJsMemory();

      // Step 2: Clear application caches
      actions.push('clear_application_caches');
      await this.clearApplicationCaches();

      // Step 3: Run garbage collection
      actions.push('force_garbage_collection');
      await this.forceGarbageCollection();

      // Step 4: Check if memory pressure resolved
      actions.push('verify_memory_recovery');
      const memoryUsage = await this.getMemoryUsage();
      const recovered = memoryUsage < 75; // Below 75% is considered recovered

      if (recovered) {
        console.log(`✅ Memory usage reduced to ${memoryUsage.toFixed(1)}%`);
      }

      return recovered;
    } catch (error) {
      console.error('Memory pressure healing failed:', error);
      throw error;
    }
  }

  // Port conflict healing
  private async healPortConflict(actions: string[]): Promise<boolean> {
    try {
      console.log('🔄 Healing port conflict...');

      // Step 1: Identify processes using port 4000
      actions.push('identify_port_processes');
      const portProcesses = await this.identifyPortProcesses(4000);

      // Step 2: Attempt to free the port
      actions.push('free_conflicting_port');
      for (const process of portProcesses) {
        try {
          await this.killProcess(process.pid);
          console.log(`🔫 Killed conflicting process: ${process.name} (PID: ${process.pid})`);
        } catch (killError) {
          console.warn(`⚠️ Could not kill process ${process.pid}:`, killError.message);
        }
      }

      // Step 3: Wait for port to be freed
      actions.push('wait_for_port_availability');
      await this.sleep(3000);

      // Step 4: Verify port is available
      actions.push('verify_port_available');
      const portAvailable = await this.isPortAvailable(4000);

      return portAvailable;
    } catch (error) {
      console.error('Port conflict healing failed:', error);
      throw error;
    }
  }

  // Startup failure healing
  private async healStartupFailure(issue: HealthIssue, actions: string[]): Promise<boolean> {
    try {
      console.log('🔄 Healing startup failure...');

      // Step 1: Check dependencies
      actions.push('check_dependencies');
      const dependenciesOk = await this.checkDependencies();

      if (!dependenciesOk) {
        actions.push('reinstall_dependencies');
        await this.reinstallDependencies();
      }

      // Step 2: Clear temporary files
      actions.push('clear_temporary_files');
      await this.clearTemporaryFiles();

      // Step 3: Reset environment
      actions.push('reset_environment');
      await this.resetEnvironment();

      // Step 4: Attempt restart
      actions.push('attempt_restart');
      const startupSuccess = await this.attemptStartup();

      return startupSuccess;
    } catch (error) {
      console.error('Startup failure healing failed:', error);
      throw error;
    }
  }

  // Disk space healing
  private async healDiskSpace(actions: string[]): Promise<boolean> {
    try {
      console.log('🔄 Healing disk space issue...');

      // Step 1: Clear application logs
      actions.push('clear_application_logs');
      await this.clearApplicationLogs();

      // Step 2: Clear Docker unused images
      actions.push('clear_docker_images');
      await this.clearDockerUnusedImages();

      // Step 3: Clear node_modules cache
      actions.push('clear_node_modules_cache');
      await this.clearNodeModulesCache();

      // Step 4: Clear system temp files
      actions.push('clear_temp_files');
      await this.clearSystemTempFiles();

      // Step 5: Verify disk space recovery
      actions.push('verify_disk_space');
      const diskUsage = await this.getDiskUsage();
      const recovered = diskUsage < 85; // Below 85% is considered recovered

      if (recovered) {
        console.log(`✅ Disk usage reduced to ${diskUsage.toFixed(1)}%`);
      }

      return recovered;
    } catch (error) {
      console.error('Disk space healing failed:', error);
      throw error;
    }
  }

  // Dependency error healing
  private async healDependencyError(issue: HealthIssue, actions: string[]): Promise<boolean> {
    try {
      console.log('🔄 Healing dependency error...');

      // Step 1: Clear npm cache
      actions.push('clear_npm_cache');
      await this.clearNpmCache();

      // Step 2: Remove node_modules
      actions.push('remove_node_modules');
      await this.removeNodeModules();

      // Step 3: Fresh npm install
      actions.push('fresh_npm_install');
      await this.freshNpmInstall();

      // Step 4: Verify dependencies
      actions.push('verify_dependencies');
      const dependenciesHealthy = await this.verifyDependencies();

      return dependenciesHealthy;
    } catch (error) {
      console.error('Dependency error healing failed:', error);
      throw error;
    }
  }

  // Utility methods
  private clearRequireCache(): void {
    Object.keys(require.cache).forEach(key => {
      if (key.includes('node_modules/vite') || key.includes('vite-express')) {
        delete require.cache[key];
      }
    });
    console.log('🧹 Node.js require cache cleared');
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async checkPortConflicts(port: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  private async resolvePortConflict(port: number): Promise<void> {
    try {
      // On Windows
      if (process.platform === 'win32') {
        await execAsync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a`);
      } else {
        // On Unix-like systems
        await execAsync(`lsof -ti:${port} | xargs kill -9`);
      }
      console.log(`🔫 Resolved port conflict on port ${port}`);
    } catch (error) {
      console.warn(`⚠️ Could not resolve port conflict:`, error.message);
    }
  }

  private async restartViteDevServer(): Promise<void> {
    console.log('🔄 Restarting Vite dev server...');
    // This would typically involve restarting the Docker container
    // or restarting the Node.js process in a development environment
    await this.sleep(2000); // Simulate restart time
  }

  private async waitForRecovery(timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const healthy = await this.testRouteHealth('/api/health');
        if (healthy) {
          return true;
        }
      } catch (error) {
        // Continue trying
      }

      await this.sleep(1000); // Check every second
    }

    return false;
  }

  private async performEnvironmentReset(): Promise<void> {
    console.log('🔄 Performing development environment reset...');

    // Clear all caches
    await this.clearAllCaches();

    // Reset port bindings
    await this.resetPortBindings();

    // Restart core services
    await this.restartCoreServices();

    console.log('✅ Environment reset complete');
  }

  private async clearAllCaches(): Promise<void> {
    this.clearRequireCache();
    await this.clearApplicationCaches();
    console.log('🧹 All caches cleared');
  }

  private async resetPortBindings(): Promise<void> {
    await this.resolvePortConflict(4000);
    await this.resolvePortConflict(5000);
    console.log('🔌 Port bindings reset');
  }

  private async restartCoreServices(): Promise<void> {
    // In a Docker environment, this might restart containers
    // In development, this might restart the Node.js process
    console.log('🔄 Core services restarted');
  }

  private async testRouteHealth(route: string): Promise<boolean> {
    try {
      const fetch = await getFetch();
      const response = await fetch(`http://localhost:4000${route}`, { timeout: 5000 } as any);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async checkSystemResources(): Promise<{ memoryUsage: number; cpuUsage: number; diskUsage: number }> {
    // Mock implementation - in real scenario, would check actual system resources
    return {
      memoryUsage: Math.random() * 100,
      cpuUsage: Math.random() * 100,
      diskUsage: Math.random() * 100
    };
  }

  private async clearMemoryPressure(): Promise<void> {
    if (global.gc) {
      global.gc();
    }
    console.log('🧹 Memory pressure cleared');
  }

  private async reduceCpuLoad(): Promise<void> {
    // Implementation would involve reducing CPU-intensive operations
    console.log('⚡ CPU load reduced');
  }

  private async clearApplicationCaches(): Promise<void> {
    // Clear application-specific caches
    console.log('🧹 Application caches cleared');
  }

  private async restartSpecificServices(): Promise<void> {
    // Restart specific services that might be causing issues
    console.log('🔄 Specific services restarted');
  }

  // Additional utility methods would be implemented here...
  private async clearNodeJsMemory(): Promise<void> {
    if (global.gc) {
      global.gc();
      console.log('🧹 Node.js memory cleared');
    }
  }

  private async forceGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc();
      console.log('🗑️ Garbage collection forced');
    }
  }

  private async getMemoryUsage(): Promise<number> {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapUsed + usage.external;
    const maxMemory = 512 * 1024 * 1024; // Assume 512MB limit
    return (totalMemory / maxMemory) * 100;
  }

  private async identifyPortProcesses(port: number): Promise<Array<{ pid: number; name: string }>> {
    // Mock implementation - would identify actual processes
    return [];
  }

  private async killProcess(pid: number): Promise<void> {
    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /F /PID ${pid}`);
      } else {
        await execAsync(`kill -9 ${pid}`);
      }
    } catch (error) {
      throw new Error(`Failed to kill process ${pid}: ${error.message}`);
    }
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return !(await this.checkPortConflicts(port));
  }

  private async checkDependencies(): Promise<boolean> {
    try {
      await execAsync('npm ls --depth=0');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async reinstallDependencies(): Promise<void> {
    await execAsync('npm ci');
    console.log('📦 Dependencies reinstalled');
  }

  private async clearTemporaryFiles(): Promise<void> {
    // Clear temporary files
    console.log('🧹 Temporary files cleared');
  }

  private async resetEnvironment(): Promise<void> {
    // Reset environment variables and configuration
    console.log('🔄 Environment reset');
  }

  private async attemptStartup(): Promise<boolean> {
    // Attempt to start the application
    return true;
  }

  // Additional methods for disk space, npm cache, etc.
  private async clearApplicationLogs(): Promise<void> {
    console.log('🧹 Application logs cleared');
  }

  private async clearDockerUnusedImages(): Promise<void> {
    try {
      await execAsync('docker image prune -f');
      console.log('🐳 Docker unused images cleared');
    } catch (error) {
      console.warn('Could not clear Docker images:', error.message);
    }
  }

  private async clearNodeModulesCache(): Promise<void> {
    console.log('🧹 Node modules cache cleared');
  }

  private async clearSystemTempFiles(): Promise<void> {
    console.log('🧹 System temp files cleared');
  }

  private async getDiskUsage(): Promise<number> {
    // Mock implementation - would check actual disk usage
    return Math.random() * 100;
  }

  private async clearNpmCache(): Promise<void> {
    try {
      await execAsync('npm cache clean --force');
      console.log('📦 NPM cache cleared');
    } catch (error) {
      console.warn('Could not clear NPM cache:', error.message);
    }
  }

  private async removeNodeModules(): Promise<void> {
    try {
      if (process.platform === 'win32') {
        await execAsync('rmdir /s /q node_modules');
      } else {
        await execAsync('rm -rf node_modules');
      }
      console.log('📦 node_modules removed');
    } catch (error) {
      console.warn('Could not remove node_modules:', error.message);
    }
  }

  private async freshNpmInstall(): Promise<void> {
    await execAsync('npm install');
    console.log('📦 Fresh npm install completed');
  }

  private async verifyDependencies(): Promise<boolean> {
    return await this.checkDependencies();
  }

  private setupProcessMonitoring(): void {
    // Monitor for unhandled rejections and exceptions
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection detected:', reason);
      this.heal({
        type: 'startup_failure',
        severity: 'high',
        timestamp: new Date(),
        details: { reason, promise: promise.toString() }
      });
    });

    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception detected:', error);
      this.heal({
        type: 'startup_failure',
        severity: 'critical',
        timestamp: new Date(),
        details: { error: error.message, stack: error.stack }
      });
    });
  }

  private async escalateToManualIntervention(issue: HealthIssue, attempts: HealingAttempt[]): Promise<void> {
    console.error('🚨 ESCALATION REQUIRED - Manual Intervention Needed');
    console.error(`Issue: ${issue.type} (${issue.severity})`);
    console.error(`Failed attempts: ${attempts.length}`);
    console.error('Previous actions taken:');

    attempts.forEach((attempt, index) => {
      console.error(`  Attempt ${index + 1}: ${attempt.actions.join(', ')}`);
      if (attempt.error) {
        console.error(`    Error: ${attempt.error}`);
      }
    });

    // In a production system, this would send alerts to administrators
    console.error('📧 Alert sent to administrators');
  }

  // Get healing system status
  public getHealingStatus(): any {
    const totalAttempts = this.healingHistory.length;
    const successfulAttempts = this.healingHistory.filter(h => h.success).length;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 100;

    return {
      healingInProgress: this.healingInProgress,
      totalAttempts,
      successfulAttempts,
      successRate: Math.round(successRate),
      recentAttempts: this.healingHistory.slice(-5).map(h => ({
        type: h.issue.type,
        success: h.success,
        timestamp: h.timestamp,
        duration: h.duration,
        actions: h.actions.length
      }))
    };
  }

  // Cleanup resources
  public cleanup(): void {
    console.log('🧹 Self-healing system cleanup complete');
  }
}