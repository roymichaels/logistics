import React from 'react';
import { tokens } from '../../styles/tokens';

interface PageHeaderProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
  style?: React.CSSProperties;
}

export function PageHeader({ icon, title, subtitle, actionButton, style }: PageHeaderProps) {
  return (
    <header
      style={{
        padding: '24px',
        background: 'linear-gradient(120deg, rgba(25, 39, 52, 0.95), rgba(21, 32, 43, 0.9))',
        borderRadius: '20px',
        border: `1px solid ${tokens.colors.background.cardBorder}`,
        boxShadow: tokens.shadows.md,
        marginBottom: '24px',
        ...style
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${tokens.colors.brand.primary} 0%, ${tokens.colors.brand.primaryDark} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)'
            }}
          >
            {icon}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: tokens.colors.text }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ margin: '4px 0 0', color: tokens.colors.subtle, fontSize: '14px' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actionButton && <div>{actionButton}</div>}
      </div>
    </header>
  );
}
