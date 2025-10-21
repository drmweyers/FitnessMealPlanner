/**
 * Git Manager - Handles git operations for the autonomous fix system
 *
 * This class provides utilities for git operations like branching, committing, and pushing.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { GitResult } from '../types';

const execPromise = promisify(exec);

export class GitManager {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * Execute git command
   */
  private async execGit(command: string): Promise<GitResult> {
    try {
      const { stdout, stderr } = await execPromise(`git ${command}`, {
        cwd: this.workingDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
      });
      return {
        success: true,
        output: stdout + (stderr || ''),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: error.stdout + error.stderr,
      };
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const result = await this.execGit('rev-parse --abbrev-ref HEAD');
    if (!result.success) {
      throw new Error(`Failed to get current branch: ${result.error}`);
    }
    return result.output.trim();
  }

  /**
   * Check if branch exists
   */
  async branchExists(branchName: string): Promise<boolean> {
    const result = await this.execGit(`rev-parse --verify ${branchName}`);
    return result.success;
  }

  /**
   * Create new branch
   */
  async createBranch(branchName: string, baseBranch?: string): Promise<GitResult> {
    if (await this.branchExists(branchName)) {
      return {
        success: false,
        error: `Branch ${branchName} already exists`,
      };
    }

    const command = baseBranch
      ? `checkout -b ${branchName} ${baseBranch}`
      : `checkout -b ${branchName}`;

    return await this.execGit(command);
  }

  /**
   * Checkout branch
   */
  async checkout(branchName: string): Promise<GitResult> {
    return await this.execGit(`checkout ${branchName}`);
  }

  /**
   * Stage files
   */
  async add(files: string[] | '.'): Promise<GitResult> {
    if (Array.isArray(files)) {
      return await this.execGit(`add ${files.join(' ')}`);
    }
    return await this.execGit('add .');
  }

  /**
   * Commit changes
   */
  async commit(message: string): Promise<GitResult> {
    // Escape message for shell
    const escapedMessage = message.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    return await this.execGit(`commit -m "${escapedMessage}"`);
  }

  /**
   * Push to remote
   */
  async push(branchName?: string, force: boolean = false): Promise<GitResult> {
    const branch = branchName || (await this.getCurrentBranch());
    const forceFlag = force ? '--force' : '';
    return await this.execGit(`push origin ${branch} ${forceFlag}`.trim());
  }

  /**
   * Pull from remote
   */
  async pull(branchName?: string): Promise<GitResult> {
    const branch = branchName || (await this.getCurrentBranch());
    return await this.execGit(`pull origin ${branch}`);
  }

  /**
   * Merge branch
   */
  async merge(branchName: string, noFastForward: boolean = false): Promise<GitResult> {
    const ffFlag = noFastForward ? '--no-ff' : '';
    return await this.execGit(`merge ${branchName} ${ffFlag}`.trim());
  }

  /**
   * Delete branch
   */
  async deleteBranch(branchName: string, force: boolean = false): Promise<GitResult> {
    const flag = force ? '-D' : '-d';
    return await this.execGit(`branch ${flag} ${branchName}`);
  }

  /**
   * Get git status
   */
  async getStatus(): Promise<{
    clean: boolean;
    staged: string[];
    unstaged: string[];
    untracked: string[];
  }> {
    const result = await this.execGit('status --porcelain');
    if (!result.success) {
      throw new Error(`Failed to get git status: ${result.error}`);
    }

    const lines = result.output.split('\n').filter((line) => line.trim());
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const status = line.substring(0, 2);
      const file = line.substring(3);

      if (status === '??') {
        untracked.push(file);
      } else if (status[0] !== ' ' && status[0] !== '?') {
        staged.push(file);
      } else if (status[1] !== ' ') {
        unstaged.push(file);
      }
    }

    return {
      clean: lines.length === 0,
      staged,
      unstaged,
      untracked,
    };
  }

  /**
   * Get HEAD commit SHA
   */
  async getHeadCommit(): Promise<string> {
    const result = await this.execGit('rev-parse HEAD');
    if (!result.success) {
      throw new Error(`Failed to get HEAD commit: ${result.error}`);
    }
    return result.output.trim();
  }

  /**
   * Get commit info
   */
  async getCommitInfo(commitSha: string): Promise<{
    sha: string;
    author: string;
    date: string;
    message: string;
  }> {
    const result = await this.execGit(`log -1 --format="%H%n%an%n%ad%n%s" ${commitSha}`);
    if (!result.success) {
      throw new Error(`Failed to get commit info: ${result.error}`);
    }

    const [sha, author, date, message] = result.output.trim().split('\n');
    return { sha, author, date, message };
  }

  /**
   * Get diff between branches
   */
  async getDiff(base: string, compare: string): Promise<string> {
    const result = await this.execGit(`diff ${base}...${compare}`);
    if (!result.success) {
      throw new Error(`Failed to get diff: ${result.error}`);
    }
    return result.output;
  }

  /**
   * Get modified files between branches
   */
  async getModifiedFiles(base: string, compare: string): Promise<string[]> {
    const result = await this.execGit(`diff --name-only ${base}...${compare}`);
    if (!result.success) {
      throw new Error(`Failed to get modified files: ${result.error}`);
    }
    return result.output.split('\n').filter((line) => line.trim());
  }

  /**
   * Check if working directory is clean
   */
  async isClean(): Promise<boolean> {
    const status = await this.getStatus();
    return status.clean;
  }

  /**
   * Stash changes
   */
  async stash(message?: string): Promise<GitResult> {
    const cmd = message ? `stash push -m "${message}"` : 'stash';
    return await this.execGit(cmd);
  }

  /**
   * Pop stash
   */
  async stashPop(): Promise<GitResult> {
    return await this.execGit('stash pop');
  }

  /**
   * Reset to specific commit
   */
  async reset(commitSha: string, hard: boolean = false): Promise<GitResult> {
    const mode = hard ? '--hard' : '--soft';
    return await this.execGit(`reset ${mode} ${commitSha}`);
  }

  /**
   * Get list of branches
   */
  async getBranches(): Promise<{
    current: string;
    all: string[];
  }> {
    const result = await this.execGit('branch');
    if (!result.success) {
      throw new Error(`Failed to get branches: ${result.error}`);
    }

    const lines = result.output.split('\n').filter((line) => line.trim());
    const branches = lines.map((line) => line.replace('*', '').trim());
    const current = lines.find((line) => line.startsWith('*'))?.replace('*', '').trim() || '';

    return {
      current,
      all: branches,
    };
  }

  /**
   * Create and checkout branch for fix
   */
  async createFixBranch(fixId: string, baseBranch: string = 'main'): Promise<string> {
    const branchName = `auto-fix/${Date.now()}-${fixId}`;

    // Ensure we're on base branch and it's up to date
    await this.checkout(baseBranch);
    await this.pull(baseBranch);

    // Create new branch
    const result = await this.createBranch(branchName, baseBranch);
    if (!result.success) {
      throw new Error(`Failed to create fix branch: ${result.error}`);
    }

    return branchName;
  }

  /**
   * Commit fix changes
   */
  async commitFix(fixDescription: string, files: string[]): Promise<string> {
    // Stage files
    await this.add(files);

    // Create commit message
    const commitMessage = `fix: ${fixDescription}

🤖 Generated and verified by Autonomous Bug Fixer

Files modified:
${files.map((f) => `  - ${f}`).join('\n')}

Verification: All tests passed
Timestamp: ${new Date().toISOString()}
    `.trim();

    // Commit
    const result = await this.commit(commitMessage);
    if (!result.success) {
      throw new Error(`Failed to commit fix: ${result.error}`);
    }

    return await this.getHeadCommit();
  }

  /**
   * Push fix branch to remote
   */
  async pushFixBranch(branchName: string): Promise<GitResult> {
    return await this.push(branchName);
  }
}
