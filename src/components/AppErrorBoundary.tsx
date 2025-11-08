import React from 'react';
import { telegram } from '../lib/telegram';
import { logger } from '../lib/logger';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[AppErrorBoundary] Component error caught:', error, errorInfo);

    if (typeof window !== 'undefined' && (window as any).errorHandler) {
      (window as any).errorHandler.handle(error, 'AppErrorBoundary', {
        logToConsole: true,
        showUserMessage: false
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const theme = telegram.themeParams;

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: '20px',
          textAlign: 'center',
          direction: 'rtl',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: theme.bg_color || '#f5f5f5',
          color: theme.text_color || '#333'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: '600' }}>
            שגיאה בטעינת רכיב
          </h2>
          <p style={{
            fontSize: '14px',
            color: theme.hint_color || '#666',
            marginBottom: '20px',
            maxWidth: '300px',
            lineHeight: '1.4'
          }}>
            {this.state.error?.message || 'אירעה שגיאה בלתי צפויה'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: theme.button_color || '#007aff',
              color: theme.button_text_color || '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: '500'
            }}
          >
            נסה שוב
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
