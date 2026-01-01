import React, { useEffect, useState } from 'react';
import { DashboardLayoutProps } from './types';
import { MetricsGrid } from './MetricsGrid';
import { QuickActions } from './QuickActions';
import { Section } from './Section';

export function DashboardLayout({
  config,
  loading = false,
  error = null,
  children
}: DashboardLayoutProps) {
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (config.refreshInterval && config.onRefresh) {
      const interval = setInterval(async () => {
        setRefreshing(true);
        await config.onRefresh?.();
        setRefreshing(false);
      }, config.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [config.refreshInterval, config.onRefresh]);

  const containerStyle: React.CSSProperties = {
    padding: '20px',
    background: '#f9fafb',
    minHeight: '100vh'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '24px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
    marginBottom: config.subtitle ? '8px' : '0'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0
  };

  const loadingOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  };

  const loadingSpinnerStyle: React.CSSProperties = {
    width: '50px',
    height: '50px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const errorStyle: React.CSSProperties = {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    color: '#991b1b'
  };

  const refreshIndicatorStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: '#667eea',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    display: refreshing ? 'flex' : 'none',
    alignItems: 'center',
    gap: '8px'
  };

  if (loading) {
    return (
      <div style={loadingOverlayStyle}>
        <div style={loadingSpinnerStyle} />
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={refreshIndicatorStyle}>
        <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        Refreshing...
      </div>

      <div style={headerStyle}>
        <h1 style={titleStyle}>{config.title}</h1>
        {config.subtitle && <p style={subtitleStyle}>{config.subtitle}</p>}
      </div>

      {error && (
        <div style={errorStyle}>
          <strong>Error:</strong> {error.message}
        </div>
      )}

      {config.metrics && config.metrics.length > 0 && (
        <MetricsGrid metrics={config.metrics} loading={loading} />
      )}

      {config.quickActions && config.quickActions.length > 0 && (
        <QuickActions actions={config.quickActions} />
      )}

      {config.sections && config.sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}

      {children}
    </div>
  );
}
