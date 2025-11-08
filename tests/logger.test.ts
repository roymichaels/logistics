import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, LogLevel } from '../src/lib/logger';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    // Reset logger to default state
    logger.setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Log Levels', () => {
    it('should log debug messages when level is DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('Debug message');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should not log debug messages when level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.debug('Debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Info message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should not log info messages when level is WARN', () => {
      logger.setLogLevel(LogLevel.WARN);
      logger.info('Info message');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log warn messages when level is WARN', () => {
      logger.setLogLevel(LogLevel.WARN);
      logger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should not log warn messages when level is ERROR', () => {
      logger.setLogLevel(LogLevel.ERROR);
      logger.warn('Warning message');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log error messages when level is ERROR', () => {
      logger.setLogLevel(LogLevel.ERROR);
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should not log any messages when level is NONE', () => {
      logger.setLogLevel(LogLevel.NONE);
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Context Logging', () => {
    it('should log messages with context', () => {
      logger.setLogLevel(LogLevel.INFO);
      const context = { userId: '123', action: 'login' };
      logger.info('User action', context);

      expect(consoleInfoSpy).toHaveBeenCalled();
      const callArgs = consoleInfoSpy.mock.calls[0];
      expect(callArgs[2]).toContain('userId');
    });

    it('should handle undefined context gracefully', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Message without context');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should handle complex context objects', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      const context = {
        user: { id: '123', name: 'Test' },
        metadata: { timestamp: Date.now() },
        nested: { deeply: { value: true } }
      };

      logger.debug('Complex context', context);
      expect(consoleDebugSpy).toHaveBeenCalled();
    });
  });

  describe('Error Logging', () => {
    it('should log error with Error object', () => {
      logger.setLogLevel(LogLevel.ERROR);
      const error = new Error('Test error');
      logger.error('Operation failed', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should extract error properties', () => {
      logger.setLogLevel(LogLevel.ERROR);
      const error = new Error('Test error');
      error.stack = 'stack trace';

      logger.error('Operation failed', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0];
      const contextStr = callArgs[2];
      expect(contextStr).toContain('Test error');
    });

    it('should handle non-Error objects', () => {
      logger.setLogLevel(LogLevel.ERROR);
      const errorObj = { code: 500, message: 'Server error' };

      logger.error('API call failed', errorObj);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should combine error and context', () => {
      logger.setLogLevel(LogLevel.ERROR);
      const error = new Error('Database error');
      const context = { query: 'SELECT * FROM users', duration: 1500 };

      logger.error('Query failed', error, context);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('External Logger Integration', () => {
    it('should call external logger when configured', () => {
      const externalLogger = vi.fn();
      logger.setExternalLogger(externalLogger);

      logger.info('Test message', { data: 'test' });

      expect(externalLogger).toHaveBeenCalled();
      const logEntry = externalLogger.mock.calls[0][0];
      expect(logEntry).toHaveProperty('level');
      expect(logEntry).toHaveProperty('message');
      expect(logEntry).toHaveProperty('timestamp');
    });

    it('should continue logging even if external logger fails', () => {
      const failingLogger = vi.fn().mockImplementation(() => {
        throw new Error('External logger error');
      });

      logger.setExternalLogger(failingLogger);
      logger.info('Test message');

      // Should not throw and console should still be called
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should include context in external logger', () => {
      const externalLogger = vi.fn();
      logger.setExternalLogger(externalLogger);

      const context = { userId: '123' };
      logger.info('User event', context);

      const logEntry = externalLogger.mock.calls[0][0];
      expect(logEntry.context).toEqual(context);
    });
  });

  describe('Performance Timing', () => {
    it('should call console.time when timing starts', () => {
      const consoleTimeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
      logger.time('operation');
      expect(consoleTimeSpy).toHaveBeenCalledWith('operation');
      consoleTimeSpy.mockRestore();
    });

    it('should call console.timeEnd when timing ends', () => {
      const consoleTimeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
      logger.timeEnd('operation');
      expect(consoleTimeEndSpy).toHaveBeenCalledWith('operation');
      consoleTimeEndSpy.mockRestore();
    });

    it('should not time when log level is above DEBUG', () => {
      const consoleTimeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
      logger.setLogLevel(LogLevel.INFO);
      logger.time('operation');
      expect(consoleTimeSpy).not.toHaveBeenCalled();
      consoleTimeSpy.mockRestore();
    });
  });

  describe('Grouped Logging', () => {
    it('should call console.group', () => {
      const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      logger.group('Test Group');
      expect(consoleGroupSpy).toHaveBeenCalledWith('Test Group');
      consoleGroupSpy.mockRestore();
    });

    it('should call console.groupEnd', () => {
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      logger.groupEnd();
      expect(consoleGroupEndSpy).toHaveBeenCalled();
      consoleGroupEndSpy.mockRestore();
    });
  });

  describe('Production Safety', () => {
    it('should respect log level in production-like settings', () => {
      logger.setLogLevel(LogLevel.INFO);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle rapid logging without performance issues', () => {
      logger.setLogLevel(LogLevel.INFO);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`, { index: i });
      }
      const duration = performance.now() - start;

      // Should complete in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1000);
    });
  });

  describe('Message Formatting', () => {
    it('should include timestamps in log entries', () => {
      const externalLogger = vi.fn();
      logger.setExternalLogger(externalLogger);

      logger.info('Test message');

      const logEntry = externalLogger.mock.calls[0][0];
      expect(logEntry.timestamp).toBeDefined();
      expect(new Date(logEntry.timestamp)).toBeInstanceOf(Date);
    });

    it('should include user agent when available', () => {
      const externalLogger = vi.fn();
      logger.setExternalLogger(externalLogger);

      logger.info('Test message');

      const logEntry = externalLogger.mock.calls[0][0];
      // userAgent may be undefined in test environment
      expect(logEntry).toHaveProperty('userAgent');
    });

    it('should include URL when available', () => {
      const externalLogger = vi.fn();
      logger.setExternalLogger(externalLogger);

      logger.info('Test message');

      const logEntry = externalLogger.mock.calls[0][0];
      // url may be undefined in test environment
      expect(logEntry).toHaveProperty('url');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null context', () => {
      expect(() => {
        logger.info('Message', null as any);
      }).not.toThrow();
    });

    it('should handle circular references in context', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      expect(() => {
        logger.info('Circular context', circular);
      }).not.toThrow();
    });

    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);

      expect(() => {
        logger.info(longMessage);
      }).not.toThrow();
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Test \n\r\t\0 special chars 🎉';

      expect(() => {
        logger.info(specialMessage);
      }).not.toThrow();
    });
  });
});
