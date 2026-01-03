import React from 'react';
import { MetricCard } from '@components/dashboard/MetricCard';
import { Button } from '@components/atoms/Button';
import { logger } from '@lib/logger';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
}

export interface DashboardAction {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface DashboardConfig {
  title: string;
  subtitle?: string;
  metrics?: DashboardMetric[];
  quickActions?: DashboardAction[];
  refreshInterval?: number;
  onRefresh?: () => void;
}

export interface DashboardLayoutProps {
  config: DashboardConfig;
  loading?: boolean;
  error?: Error | null;
  children: React.ReactNode;
}

export function DashboardLayout({
  config,
  loading = false,
  error = null,
  children
}: DashboardLayoutProps) {
  if (error) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#ef4444'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
          Error Loading Dashboard
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          {error.message}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: '#15202B',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
            marginBottom: config.subtitle ? '4px' : 0,
            color: '#E7E9EA'
          }}>
            {config.title}
          </h1>
          {config.subtitle && (
            <p style={{
              fontSize: '14px',
              color: '#8899A6',
              margin: 0
            }}>
              {config.subtitle}
            </p>
          )}
        </div>

        {config.quickActions && config.quickActions.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {config.quickActions.map(action => (
              <Button
                key={action.id}
                onClick={action.onClick}
                variant={action.variant || 'primary'}
              >
                {action.icon && <span style={{ marginRight: '6px' }}>{action.icon}</span>}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Metrics */}
      {config.metrics && config.metrics.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {config.metrics.map(metric => (
            <MetricCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              color={metric.color}
              trend={metric.trend}
            />
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: '#8899A6'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #536471',
            borderTopColor: '#1D9BF0',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
          <p>Loading...</p>
        </div>
      ) : (
        /* Content */
        <div>{children}</div>
      )}
    </div>
  );
}

export interface SectionConfig {
  id: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export interface SectionProps {
  section: SectionConfig;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function Section({
  section,
  collapsible = false,
  defaultExpanded = true
}: SectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <div style={{
      backgroundColor: '#192734',
      border: '1px solid #38444d',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px'
    }}>
      {(section.title || section.actions) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: section.children ? '16px' : 0
        }}>
          <div style={{ flex: 1 }}>
            {section.title && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#E7E9EA',
                  margin: 0
                }}>
                  {section.title}
                </h2>
                {collapsible && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8899A6',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '4px',
                      lineHeight: 1
                    }}
                  >
                    {expanded ? '▼' : '▶'}
                  </button>
                )}
              </div>
            )}
            {section.subtitle && (
              <p style={{
                fontSize: '13px',
                color: '#8899A6',
                margin: section.title ? '4px 0 0 0' : 0
              }}>
                {section.subtitle}
              </p>
            )}
          </div>
          {section.actions && (
            <div>{section.actions}</div>
          )}
        </div>
      )}
      {(!collapsible || expanded) && section.children}
    </div>
  );
}
