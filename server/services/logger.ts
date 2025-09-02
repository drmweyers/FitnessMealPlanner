/**
 * Structured Logging Service
 * 
 * Provides structured logging with different levels, context, and
 * proper error formatting to replace console.error usage throughout
 * the application.
 */

import fs from 'fs';
import path from 'path';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  userId?: string;
  requestId?: string;
  feature?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration?: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };
}

class Logger {
  private logToFile: boolean;
  private logDirectory: string;

  constructor() {
    this.logToFile = process.env.NODE_ENV === 'production';
    this.logDirectory = path.join(process.cwd(), 'logs');
    
    if (this.logToFile) {
      this.ensureLogDirectory();
    }
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry, null, 2);
  }

  private writeToFile(entry: LogEntry) {
    if (!this.logToFile) return;

    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}.log`;
    const filepath = path.join(this.logDirectory, filename);
    
    const logLine = this.formatLogEntry(entry) + '\n';
    
    fs.appendFile(filepath, logLine, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Add performance metrics for error logs
    if (level === 'error' || level === 'warn') {
      entry.performance = {
        memoryUsage: process.memoryUsage(),
      };
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const colorMap = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m',  // Yellow
        info: '\x1b[36m',  // Cyan
        debug: '\x1b[90m', // Gray
      };
      
      const reset = '\x1b[0m';
      const color = colorMap[level];
      
      console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`);
      
      if (context) {
        console.log(`${color}Context:${reset}`, JSON.stringify(context, null, 2));
      }
      
      if (error) {
        console.error(`${color}Error:${reset}`, error);
      }
    } else {
      // Production: structured JSON output
      console.log(JSON.stringify(entry));
    }

    this.writeToFile(entry);
  }

  /**
   * Log error messages with full context and stack traces
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  /**
   * Log warning messages for recoverable issues
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log informational messages for important events
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log debug messages for development and troubleshooting
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log performance metrics with timing information
   */
  performance(message: string, duration: number, context?: LogContext): void {
    const performanceContext: LogContext = {
      ...context,
      metadata: {
        ...context?.metadata,
        performance: { duration },
      },
    };
    this.log('info', `Performance: ${message}`, performanceContext);
  }

  /**
   * Create a logger instance with predefined context
   */
  withContext(context: LogContext): ContextLogger {
    return new ContextLogger(this, context);
  }
}

/**
 * Context-aware logger that includes predefined context in all log calls
 */
class ContextLogger {
  constructor(
    private logger: Logger,
    private baseContext: LogContext
  ) {}

  private mergeContext(additional?: LogContext): LogContext {
    return {
      ...this.baseContext,
      ...additional,
      metadata: {
        ...this.baseContext.metadata,
        ...additional?.metadata,
      },
    };
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, error, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.mergeContext(context));
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.mergeContext(context));
  }

  performance(message: string, duration: number, context?: LogContext): void {
    this.logger.performance(message, duration, this.mergeContext(context));
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Export types for other modules
export type { LogContext, LogEntry, ContextLogger };