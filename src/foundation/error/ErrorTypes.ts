export type ErrorSeverity = 'fatal' | 'recoverable' | 'domain' | 'ui';

export interface ClassifiedError {
  message: string;
  code?: string;
  severity: ErrorSeverity;
  data?: any;
  timestamp: number;
}
