import React from 'react';
import { MetricCardProps, MetricVariant } from './types';

const variantStyles: Record<MetricVariant, React.CSSProperties> = {
  default: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff'
  },
  success: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff'
  },
  warning: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#fff'
  },
  danger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: '#fff'
  },
  info: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#fff'
  }
};

const sizeStyles = {
  sm: {
    padding: '12px 16px',
    minHeight: '80px'
  },
  md: {
    padding: '16px 20px',
    minHeight: '120px'
  },
  lg: {
    padding: '24px 28px',
    minHeight: '140px'
  }
};

export function MetricCard({
  metric,
  variant = 'default',
  size = 'md',
  loading = false
}: MetricCardProps) {
  const cardStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: metric.onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
    opacity: 0.9,
    fontWeight: 500,
    marginBottom: size === 'sm' ? '4px' : '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const valueStyle: React.CSSProperties = {
    fontSize: size === 'sm' ? '20px' : size === 'lg' ? '32px' : '24px',
    fontWeight: 700,
    marginBottom: size === 'sm' ? '2px' : '4px'
  };

  const subValueStyle: React.CSSProperties = {
    fontSize: size === 'sm' ? '11px' : '13px',
    opacity: 0.85,
    fontWeight: 400
  };

  const trendStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.2)',
    marginTop: '8px'
  };

  if (loading) {
    return (
      <div style={{ ...cardStyle, animation: 'pulse 1.5s infinite' }}>
        <div style={{ ...labelStyle, background: 'rgba(255, 255, 255, 0.3)', width: '60%', height: '14px', borderRadius: '4px' }} />
        <div style={{ ...valueStyle, background: 'rgba(255, 255, 255, 0.3)', width: '40%', height: '24px', borderRadius: '4px', marginTop: '8px' }} />
      </div>
    );
  }

  return (
    <div
      style={cardStyle}
      onClick={metric.onClick}
      onMouseEnter={(e) => {
        if (metric.onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (metric.onClick) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      <div>
        <div style={labelStyle}>
          {metric.icon && <span>{metric.icon}</span>}
          {metric.label}
        </div>
        <div style={valueStyle}>{metric.value}</div>
        {metric.subValue && (
          <div style={subValueStyle}>{metric.subValue}</div>
        )}
      </div>

      {metric.trend && (
        <div style={trendStyle}>
          <span>{metric.trend.direction === 'up' ? '↑' : metric.trend.direction === 'down' ? '↓' : '→'}</span>
          <span>{metric.trend.value}</span>
        </div>
      )}
    </div>
  );
}
