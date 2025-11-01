/**
 * Global Error Handler
 *
 * Handles application errors gracefully and provides recovery mechanisms
 */

export interface ErrorHandlerOptions {
  logToConsole?: boolean;
  showUserMessage?: boolean;
  reportToService?: boolean;
  retryable?: boolean;
}

class ErrorHandlerService {
  private errorLog: Array<{ timestamp: Date; error: Error; context?: string }> = [];
  private maxLogSize = 100;

  /**
   * Handle an error with appropriate actions
   */
  handle(error: Error | unknown, context?: string, options: ErrorHandlerOptions = {}): void {
    const {
      logToConsole = true,
      showUserMessage = false,
      reportToService = false,
      retryable = false
    } = options;

    const err = error instanceof Error ? error : new Error(String(error));

    // Add to error log
    this.errorLog.push({
      timestamp: new Date(),
      error: err,
      context
    });

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console if enabled
    if (logToConsole) {
      console.error(`[ErrorHandler] ${context || 'Error'}:`, err);
    }

    // Show user message if enabled
    if (showUserMessage) {
      this.showUserError(err, context);
    }

    // Don't report to external services (Sentry is blocked by ad blockers)
    // We'll keep errors in memory for debugging
  }

  /**
   * Show user-friendly error message
   */
  private showUserError(error: Error, context?: string): void {
    const message = this.getUserFriendlyMessage(error, context);

    // Use native alert as fallback (can be replaced with toast/notification system)
    if (typeof window !== 'undefined') {
      console.warn(`[User Error] ${message}`);
      // Don't show alert for every error, just log it
      // alert(message);
    }
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: Error, context?: string): string {
    const errorMessages: Record<string, string> = {
      'Network Error': 'בעיית רשת. אנא בדוק את החיבור לאינטרנט.',
      'Failed to fetch': 'לא ניתן להתחבר לשרת. אנא נסה שוב.',
      'timeout': 'הבקשה לקחה יותר מדי זמן. אנא נסה שוב.',
      'CORS': 'שגיאת אבטחה. אנא פנה לתמיכה.',
      '401': 'אינך מורשה. אנא התחבר מחדש.',
      '403': 'אין לך הרשאה לפעולה זו.',
      '404': 'המשאב המבוקש לא נמצא.',
      '500': 'שגיאת שרת. אנא נסה שוב מאוחר יותר.'
    };

    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.message.includes(key)) {
        return message;
      }
    }

    return context
      ? `שגיאה ב${context}. אנא נסה שוב.`
      : 'שגיאה לא צפויה. אנא נסה שוב.';
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error: Error | unknown): boolean {
    const err = error instanceof Error ? error : new Error(String(error));
    const networkKeywords = ['network', 'fetch', 'timeout', 'ECONNREFUSED', 'ERR_BLOCKED_BY_CLIENT'];

    return networkKeywords.some(keyword =>
      err.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if error is authentication-related
   */
  isAuthError(error: Error | unknown): boolean {
    const err = error instanceof Error ? error : new Error(String(error));
    return err.message.includes('401') || err.message.includes('Unauthorized');
  }

  /**
   * Get error log
   */
  getErrorLog(): Array<{ timestamp: Date; error: Error; context?: string }> {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Handle API endpoint not found gracefully
   */
  handleMissingEndpoint(endpoint: string): void {
    console.warn(`[ErrorHandler] API endpoint not found: ${endpoint}`);
    console.warn(`This is expected in development environments without backend services`);
  }

  /**
   * Handle blocked resources (like Sentry, ad blockers, etc)
   */
  handleBlockedResource(resourceUrl: string): void {
    if (resourceUrl.includes('sentry.io')) {
      console.info('[ErrorHandler] Sentry blocked by ad blocker - using local error tracking');
      return;
    }

    console.warn(`[ErrorHandler] Resource blocked: ${resourceUrl}`);
  }

  /**
   * Wrap async function with error handling
   */
  async wrapAsync<T>(
    fn: () => Promise<T>,
    context?: string,
    options?: ErrorHandlerOptions
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context, options);
      return null;
    }
  }

  /**
   * Create a safe fetch wrapper
   */
  async safeFetch(
    url: string,
    options?: RequestInit,
    context?: string
  ): Promise<Response | null> {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      // Check if it's a known missing endpoint
      if (url.includes('/api/chat/v2') ||
          url.includes('/api/deploy') ||
          url.includes('/api/dns-records') ||
          url.includes('/api/bolt-subdomain')) {
        this.handleMissingEndpoint(url);
        return null;
      }

      this.handle(error, context || `Fetch ${url}`, {
        logToConsole: true,
        showUserMessage: false
      });

      return null;
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlerService();

// Set up global error handlers
if (typeof window !== 'undefined') {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(
      event.reason,
      'Unhandled Promise Rejection',
      { logToConsole: true, showUserMessage: false }
    );
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    // Ignore errors from blocked resources (Sentry, etc)
    if (event.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
      errorHandler.handleBlockedResource(event.filename || 'unknown');
      event.preventDefault();
      return;
    }

    if (event.filename?.includes('sentry.io')) {
      errorHandler.handleBlockedResource(event.filename);
      event.preventDefault();
      return;
    }

    errorHandler.handle(
      event.error || new Error(event.message),
      'Global Error',
      { logToConsole: true, showUserMessage: false }
    );
  });

  // Expose error handler for debugging
  (window as any).errorHandler = errorHandler;
  (window as any).getErrorLog = () => errorHandler.getErrorLog();
  (window as any).clearErrors = () => errorHandler.clearErrorLog();
}

export default errorHandler;
