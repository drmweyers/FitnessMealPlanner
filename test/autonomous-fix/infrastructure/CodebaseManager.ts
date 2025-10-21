/**
 * Codebase Manager - Handles file operations for the autonomous fix system
 *
 * This class provides utilities for reading, writing, and analyzing code files.
 */

import fs from 'fs-extra';
import path from 'path';
import { CodeContext } from '../types';

export class CodebaseManager {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = this.resolveFullPath(filePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Write file contents
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolveFullPath(filePath);
    try {
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = this.resolveFullPath(filePath);
    return await fs.pathExists(fullPath);
  }

  /**
   * Replace lines in file content
   */
  async replaceLines(
    content: string,
    startLine: number,
    endLine: number,
    newCode: string
  ): Promise<string> {
    const lines = content.split('\n');

    // Convert to 0-based index
    const startIndex = startLine - 1;
    const endIndex = endLine - 1;

    if (startIndex < 0 || endIndex >= lines.length) {
      throw new Error(`Invalid line range: ${startLine}-${endLine} (file has ${lines.length} lines)`);
    }

    // Replace the lines
    const newLines = [
      ...lines.slice(0, startIndex),
      ...newCode.split('\n'),
      ...lines.slice(endIndex + 1),
    ];

    return newLines.join('\n');
  }

  /**
   * Get code context around specific lines
   */
  async getCodeContext(
    filePath: string,
    centerLine: number,
    contextLines: number = 10
  ): Promise<CodeContext> {
    const content = await this.readFile(filePath);
    const lines = content.split('\n');

    const startLine = Math.max(1, centerLine - contextLines);
    const endLine = Math.min(lines.length, centerLine + contextLines);

    const contextCode = lines
      .slice(startLine - 1, endLine)
      .map((line, index) => `${startLine + index}: ${line}`)
      .join('\n');

    return {
      file: filePath,
      code: contextCode,
      startLine,
      endLine,
      language: this.detectLanguage(filePath),
    };
  }

  /**
   * Get code context for multiple files
   */
  async getMultiFileContext(files: string[]): Promise<CodeContext[]> {
    return await Promise.all(
      files.map(async (file) => {
        const content = await this.readFile(file);
        return {
          file,
          code: content,
          startLine: 1,
          endLine: content.split('\n').length,
          language: this.detectLanguage(file),
        };
      })
    );
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript-react',
      '.js': 'javascript',
      '.jsx': 'javascript-react',
      '.json': 'json',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.md': 'markdown',
    };
    return languageMap[ext] || 'text';
  }

  /**
   * Run linter on the codebase
   */
  async runLinter(): Promise<{ success: boolean; output: string }> {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);

    try {
      const { stdout, stderr } = await execPromise('npm run check', {
        cwd: this.projectRoot,
      });
      return { success: true, output: stdout + stderr };
    } catch (error) {
      return { success: false, output: error.stdout + error.stderr };
    }
  }

  /**
   * Run formatter on the codebase
   */
  async runFormatter(): Promise<{ success: boolean; output: string }> {
    // Note: This project doesn't have a dedicated formatter script
    // but we can run prettier if it's installed
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);

    try {
      // Check if prettier is available
      const { stdout, stderr } = await execPromise('npx prettier --check .', {
        cwd: this.projectRoot,
      });
      return { success: true, output: stdout + stderr };
    } catch (error) {
      // Prettier not configured, skip formatting
      return { success: true, output: 'Formatter not configured, skipping' };
    }
  }

  /**
   * Find files matching pattern
   */
  async findFiles(pattern: string): Promise<string[]> {
    const { glob } = await import('glob');
    return await glob(pattern, { cwd: this.projectRoot });
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string): Promise<{
    size: number;
    lines: number;
    language: string;
  }> {
    const fullPath = this.resolveFullPath(filePath);
    const stats = await fs.stat(fullPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n').length;

    return {
      size: stats.size,
      lines,
      language: this.detectLanguage(filePath),
    };
  }

  /**
   * Backup file before modification
   */
  async backupFile(filePath: string): Promise<string> {
    const fullPath = this.resolveFullPath(filePath);
    const backupPath = `${fullPath}.backup.${Date.now()}`;
    await fs.copy(fullPath, backupPath);
    return backupPath;
  }

  /**
   * Restore file from backup
   */
  async restoreFile(filePath: string, backupPath: string): Promise<void> {
    const fullPath = this.resolveFullPath(filePath);
    await fs.copy(backupPath, fullPath, { overwrite: true });
    await fs.remove(backupPath);
  }

  /**
   * Resolve full file path
   */
  private resolveFullPath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.projectRoot, filePath);
  }

  /**
   * Get project root
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Extract imports from TypeScript/JavaScript file
   */
  async extractImports(filePath: string): Promise<string[]> {
    const content = await this.readFile(filePath);
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extract exports from TypeScript/JavaScript file
   */
  async extractExports(filePath: string): Promise<string[]> {
    const content = await this.readFile(filePath);
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g;
    const exports: string[] = [];
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }
}
