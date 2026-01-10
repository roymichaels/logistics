import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error caught by boundary', {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.resetOnPropsChange && this.state.hasError) {
      const resetKeysChanged =
        this.props.resetKeys &&
        prevProps.resetKeys &&
        this.props.resetKeys.some((key, index) => key !== prevProps.resetKeys?.[index]);

      if (resetKeysChanged) {
        this.resetError();
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              backgroundColor: '#fef2f2',
              border: '2px solid #fecaca',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 24px',
                backgroundColor: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
              }}
            >
              ⚠️
            </div>

            <h2
              style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#dc2626',
                marginBottom: '12px',
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                fontSize: '16px',
                color: '#991b1b',
                marginBottom: '24px',
                lineHeight: '1.6',
              }}
            >
              We encountered an unexpected error. Please try refreshing the page or contact support if
              the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  textAlign: 'left',
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: '#991b1b',
                    marginBottom: '8px',
                  }}
                >
                  Error Details
                </summary>
                <pre
                  style={{
                    margin: '8px 0 0 0',
                    color: '#7f1d1d',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.resetError}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#ffffff',
                  backgroundColor: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#dc2626',
                  backgroundColor: '#ffffff',
                  border: '2px solid #dc2626',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
