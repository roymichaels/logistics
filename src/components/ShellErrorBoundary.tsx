import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';
import { undergroundTheme } from '../styles/undergroundTheme';
import { UndergroundButton } from './underground/UndergroundButton';

interface Props {
  children: ReactNode;
  shellType: 'business' | 'driver' | 'store' | 'admin';
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Shell Error Boundary
 *
 * Catches errors within each shell and provides recovery options.
 * Per the launch plan:
 * - Shell-level boundaries
 * - Fallback UI
 * - Recovery flows
 * - Error logging
 */
export class ShellErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[ShellErrorBoundary] Caught error', {
      shellType: this.props.shellType,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Reload the page as a last resort
    window.location.reload();
  };

  handleResetSoft = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  getShellName(): string {
    switch (this.props.shellType) {
      case 'business':
        return 'Business Dashboard';
      case 'driver':
        return 'Driver Dashboard';
      case 'store':
        return 'Store';
      case 'admin':
        return 'Admin Panel';
      default:
        return 'Application';
    }
  }

  getRecoveryActions(): Array<{ label: string; action: () => void; variant?: 'primary' | 'secondary' }> {
    const actions: Array<{ label: string; action: () => void; variant?: 'primary' | 'secondary' }> = [];

    // Always offer a soft reset
    actions.push({
      label: 'Try Again',
      action: this.handleResetSoft,
      variant: 'primary',
    });

    // Offer navigation based on shell type
    switch (this.props.shellType) {
      case 'business':
        actions.push({
          label: 'Go to Dashboard',
          action: () => {
            window.location.href = '/business/dashboard';
          },
          variant: 'secondary',
        });
        break;

      case 'driver':
        actions.push({
          label: 'Go to Home',
          action: () => {
            window.location.href = '/driver/home';
          },
          variant: 'secondary',
        });
        break;

      case 'store':
        actions.push({
          label: 'Go to Catalog',
          action: () => {
            window.location.href = '/store/catalog';
          },
          variant: 'secondary',
        });
        break;

      case 'admin':
        actions.push({
          label: 'Go to Dashboard',
          action: () => {
            window.location.href = '/admin/platform-dashboard';
          },
          variant: 'secondary',
        });
        break;
    }

    // Last resort: full reload
    actions.push({
      label: 'Reload Page',
      action: this.handleReset,
      variant: 'secondary',
    });

    return actions;
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const shellName = this.getShellName();
      const actions = this.getRecoveryActions();

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: undergroundTheme.colors.gradient.primary,
            padding: undergroundTheme.spacing['2xl'],
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: undergroundTheme.spacing['3xl'],
              background: undergroundTheme.colors.glassmorphism.dark,
              border: `1px solid ${undergroundTheme.colors.status.error}`,
              borderRadius: undergroundTheme.borderRadius.xl,
              backdropFilter: 'blur(20px)',
              boxShadow: undergroundTheme.shadows.glow.red,
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: undergroundTheme.spacing['2xl'] }}>
              <div style={{ fontSize: '72px', marginBottom: undergroundTheme.spacing.lg }}>⚠️</div>
              <h1
                style={{
                  fontSize: undergroundTheme.typography.fontSize['3xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.status.error,
                  marginBottom: undergroundTheme.spacing.md,
                  textShadow: undergroundTheme.shadows.glow.red,
                }}
              >
                Something Went Wrong
              </h1>
              <p
                style={{
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  color: undergroundTheme.colors.text.secondary,
                  marginBottom: undergroundTheme.spacing.sm,
                }}
              >
                An error occurred in the {shellName}
              </p>
            </div>

            <div
              style={{
                padding: undergroundTheme.spacing.lg,
                background: undergroundTheme.colors.surface.primary,
                borderRadius: undergroundTheme.borderRadius.lg,
                marginBottom: undergroundTheme.spacing['2xl'],
                border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
              }}
            >
              <div
                style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.tertiary,
                  marginBottom: undergroundTheme.spacing.sm,
                }}
              >
                Error Details:
              </div>
              <div
                style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.status.error,
                  fontFamily: 'monospace',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error?.message || 'Unknown error'}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: undergroundTheme.spacing.md,
              }}
            >
              {actions.map((action, index) => (
                <UndergroundButton
                  key={index}
                  variant={action.variant || 'secondary'}
                  onClick={action.action}
                  style={{ width: '100%' }}
                >
                  {action.label}
                </UndergroundButton>
              ))}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details
                style={{
                  marginTop: undergroundTheme.spacing.xl,
                  padding: undergroundTheme.spacing.md,
                  background: undergroundTheme.colors.surface.primary,
                  borderRadius: undergroundTheme.borderRadius.md,
                  border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                  fontSize: undergroundTheme.typography.fontSize.xs,
                  color: undergroundTheme.colors.text.tertiary,
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                <summary style={{ cursor: 'pointer', marginBottom: undergroundTheme.spacing.sm }}>
                  Component Stack (Dev Only)
                </summary>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
