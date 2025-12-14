import { logger } from '../../lib/logger';
import { eventBus } from '../events/EventBus';
import { SystemEvent } from '../types/Events';

export interface ErrorReport {
  id: string;
  timestamp: number;
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  context: {
    url: string;
    userAgent: string;
    componentStack?: string;
    userId?: string;
    sessionId?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
}

class ErrorCollector {
  private errors: ErrorReport[] = [];
  private maxErrors = 50;

  collectError(
    error: Error,
    context: Partial<ErrorReport['context']>,
    severity: ErrorReport['severity'] = 'medium',
    tags?: string[]
  ): void {
    const report: ErrorReport = {
      id: this.generateId(),
      timestamp: Date.now(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context: {
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ...context,
      },
      severity,
      tags,
    };

    this.errors.push(report);

    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    logger.error(`[ErrorCollector] ${severity.toUpperCase()} error collected`, {
      id: report.id,
      message: error.message,
      tags,
    });

    const event: SystemEvent = {
      type: 'error.collected',
      eventType: 'system',
      level: severity === 'critical' ? 'error' : 'warning',
      message: `Error: ${error.message}`,
      timestamp: Date.now(),
      source: 'ErrorCollector',
      metadata: report,
    };

    eventBus.emit(event);
  }

  getErrors(filter?: {
    severity?: ErrorReport['severity'];
    tag?: string;
    limit?: number;
  }): ErrorReport[] {
    let filtered = [...this.errors];

    if (filter?.severity) {
      filtered = filtered.filter((e) => e.severity === filter.severity);
    }

    if (filter?.tag) {
      filtered = filtered.filter((e) => e.tags?.includes(filter.tag));
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered.reverse();
  }

  getErrorById(id: string): ErrorReport | undefined {
    return this.errors.find((e) => e.id === id);
  }

  clearErrors(): void {
    this.errors = [];
    logger.info('[ErrorCollector] Cleared all errors');
  }

  exportDiagnostics(): string {
    const diagnostics = {
      errors: this.errors,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    return JSON.stringify(diagnostics, null, 2);
  }

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const errorCollector = new ErrorCollector();
