/**
 * Production-safe logging utility
 *
 * Usage:
 *   import { logger } from './lib/logger';
 *   logger.debug('Debug message', { data });
 *   logger.info('Info message');
 *   logger.warn('Warning message', error);
 *   logger.error('Error message', error);
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

class Logger {
  private level: LogLevel;
  private enableConsole: boolean;
  private externalLogger?: (entry: LogEntry) => void;

  constructor() {
    // In production, set to WARN or higher
    // In development, allow INFO
    this.level = this.getLogLevelFromEnv();
    this.enableConsole = import.meta.env.DEV;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = import.meta.env.VITE_LOG_LEVEL ||
                     (import.meta.env.PROD ? 'WARN' : 'INFO');

    switch (envLevel.toUpperCase()) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      case 'NONE':
        return LogLevel.NONE;
      default:
        return LogLevel.INFO;
    }
  }

  setLogLevel(level: LogLevel) {
    this.level = level;
  }

  /**
   * Register external logging service (Sentry, LogRocket, etc.)
   */
  setExternalLogger(fn: (entry: LogEntry) => void) {
    this.externalLogger = fn;
  }

  private createEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (level < this.level) {
      return; // Skip logging if below threshold
    }

    const entry = this.createEntry(level, message, context);

    // Send to external logger if configured
    if (this.externalLogger) {
      try {
        this.externalLogger(entry);
      } catch (error) {
        // Fail silently to prevent logging errors from breaking the app
        if (import.meta.env.DEV) {
          console.error('External logger error:', error);
        }
      }
    }

    // Console logging (only in dev or when explicitly enabled)
    if (this.enableConsole) {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = `[${timestamp}]`;

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(prefix, message, context || '');
          break;
        case LogLevel.INFO:
          console.info(prefix, message, context || '');
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, context || '');
          break;
        case LogLevel.ERROR:
          console.error(prefix, message, context || '');
          break;
      }
    }
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = {
      ...context,
    };

    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorContext.error = error;
    }

    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Performance timing utility
   */
  time(label: string) {
    if (this.level <= LogLevel.DEBUG) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.level <= LogLevel.DEBUG) {
      console.timeEnd(label);
    }
  }

  /**
   * Group related logs (development only)
   */
  group(label: string) {
    if (this.enableConsole) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.enableConsole) {
      console.groupEnd();
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const { debug, info, warn, error, time, timeEnd, group, groupEnd } = logger;

// Diagnostic logging utilities
import { Diagnostics } from "../foundation/diagnostics/DiagnosticsStore";

export const diag = {
  log: (msg: string, payload?: any) =>
    Diagnostics.log({ type: 'log', message: msg, payload, timestamp: Date.now() }),

  warn: (msg: string, payload?: any) =>
    Diagnostics.log({ type: 'warn', message: msg, payload, timestamp: Date.now() }),

  error: (msg: string, payload?: any) =>
    Diagnostics.log({ type: 'error', message: msg, payload, timestamp: Date.now() }),
};
