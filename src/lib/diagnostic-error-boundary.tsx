import { Component, ErrorInfo, ReactNode } from 'react';
import { runtimeRegistry } from './runtime-registry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  boundaryName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class DiagnosticErrorBoundary extends Component<Props, State> {
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const boundaryName = this.props.boundaryName || 'DiagnosticErrorBoundary';

    runtimeRegistry.registerComponentError(boundaryName, error, false, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error(`[${boundaryName}] Caught error:`, error);
    console.error('Component stack:', errorInfo.componentStack);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '20px',
            margin: '20px',
            border: '2px solid #ff4444',
            borderRadius: '8px',
            backgroundColor: '#fff5f5',
            fontFamily: 'monospace',
          }}
        >
          <h2 style={{ color: '#cc0000', marginTop: 0 }}>
            ⚠️ Component Error Detected
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <strong>Error:</strong>
            <pre
              style={{
                backgroundColor: '#ffeeee',
                padding: '8px',
                borderRadius: '4px',
                overflow: 'auto',
              }}
            >
              {this.state.error?.message}
            </pre>
          </div>

          {this.props.showDetails && this.state.error?.stack && (
            <details>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                <strong>Stack Trace</strong>
              </summary>
              <pre
                style={{
                  backgroundColor: '#ffeeee',
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                }}
              >
                {this.state.error.stack}
              </pre>
            </details>
          )}

          {this.props.showDetails && this.state.errorInfo?.componentStack && (
            <details>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                <strong>Component Stack</strong>
              </summary>
              <pre
                style={{
                  backgroundColor: '#ffeeee',
                  padding: '8px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                }}
              >
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>

          <button
            onClick={() => {
              runtimeRegistry.printStartupReport();
            }}
            style={{
              marginTop: '16px',
              marginLeft: '8px',
              padding: '8px 16px',
              backgroundColor: '#666666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Show Diagnostics
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showDetails?: boolean;
  }
): React.ComponentType<P> {
  const componentName = Component.displayName || Component.name || 'Component';

  const WrappedComponent = (props: P) => (
    <DiagnosticErrorBoundary
      boundaryName={`ErrorBoundary(${componentName})`}
      {...options}
    >
      <Component {...props} />
    </DiagnosticErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${componentName})`;

  return WrappedComponent;
}
