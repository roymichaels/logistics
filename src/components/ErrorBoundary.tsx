/**
 * Error Boundary Components
 *
 * Provides error boundaries for catching and handling React component errors gracefully:
 * - GlobalErrorBoundary: Wraps the entire application
 * - PageErrorBoundary: Wraps individual pages
 * - AsyncErrorBoundary: Handles async operation errors
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';
import { errorCollector } from '../foundation/diagnostics';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Base Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    errorCollector.collectError(
      error,
      {
        componentStack: errorInfo.componentStack,
      },
      'high',
      ['react', 'boundary']
    );

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Send to error reporting service (if available)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error boundary when resetKeys change
    if (
      this.props.resetKeys &&
      prevProps.resetKeys &&
      this.props.resetKeys.some((key, index) => key !== prevProps.resetKeys![index])
    ) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.state.errorInfo!);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            backgroundColor: '#15202B',
            color: '#E7E9EA',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: '700',
                marginBottom: '16px',
                color: '#E7E9EA',
              }}
            >
              משהו השתבש
            </h1>
            <p
              style={{
                fontSize: '16px',
                marginBottom: '32px',
                opacity: 0.8,
                lineHeight: '1.6',
              }}
            >
              אירעה שגיאה בלתי צפויה. אנא נסה לרענן את הדף או לחזור למסך הקודם.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details
                style={{
                  marginBottom: '32px',
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}
              >
                <summary style={{ cursor: 'pointer', marginBottom: '12px', fontWeight: '600' }}>
                  Error Details (Development Only)
                </summary>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Stack:</strong>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '12px',
                      marginTop: '8px',
                    }}
                  >
                    {this.state.error.stack}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '12px',
                        marginTop: '8px',
                      }}
                    >
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '14px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: '#1D9BF0',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)',
                }}
              >
                רענן דף
              </button>
              <button
                onClick={this.reset}
                style={{
                  padding: '14px 32px',
                  fontSize: '16px',
                  fontWeight: '600',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#E7E9EA',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
              >
                נסה שוב
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Global Error Boundary - wraps the entire application
 */
export function GlobalErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    logger.error('🚨 Global Error:', error);
    logger.error('Component Stack:', errorInfo.componentStack);

    // Log to analytics or error tracking service
    if (typeof window !== 'undefined') {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      logger.info('Error Data:', errorData);
    }
  };

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={(error) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '40px',
            backgroundColor: '#15202B',
            color: '#E7E9EA',
          }}
        >
          <div style={{ maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '24px' }}>💥</div>
            <h1 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: '700' }}>
              שגיאה קריטית
            </h1>
            <p style={{ fontSize: '18px', marginBottom: '32px', opacity: 0.8, lineHeight: '1.6' }}>
              המערכת נתקלה בשגיאה קריטית. אנא רענן את הדף או פנה לתמיכה טכנית.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '16px 48px',
                fontSize: '18px',
                fontWeight: '600',
                backgroundColor: '#1D9BF0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(29, 155, 240, 0.4)',
              }}
            >
              רענן דף
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Page Error Boundary - wraps individual pages
 */
export function PageErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '40px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            margin: '20px',
          }}
        >
          <div style={{ maxWidth: '500px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
            <h2 style={{ fontSize: '24px', marginBottom: '12px', fontWeight: '600' }}>
              שגיאה בטעינת העמוד
            </h2>
            <p style={{ fontSize: '16px', marginBottom: '24px', opacity: 0.7 }}>
              {error.message || 'אירעה שגיאה בטעינת תוכן העמוד'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#1D9BF0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              נסה שוב
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Async Error Boundary - for handling async operation errors
 */
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AsyncErrorBoundary({ children, fallback }: AsyncErrorBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div style={{ padding: '20px', textAlign: 'center', color: '#E7E9EA' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <p>Failed to load data. Please try again.</p>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}
