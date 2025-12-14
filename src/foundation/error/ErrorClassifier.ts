import { ClassifiedError, ErrorSeverity } from "./ErrorTypes";

export class ErrorClassifier {
  static classify(e: any): ClassifiedError {
    if (e instanceof Error) {
      return {
        message: e.message,
        severity: this.detectSeverity(e),
        code: (e as any).code,
        data: (e as any).data,
        timestamp: Date.now()
      };
    }

    return {
      message: String(e),
      severity: 'ui',
      timestamp: Date.now()
    };
  }

  private static detectSeverity(e: Error): ErrorSeverity {
    if ((e as any).code?.startsWith?.("FATAL_")) return 'fatal';
    if ((e as any).code?.startsWith?.("DOMAIN_")) return 'domain';
    return 'recoverable';
  }
}
