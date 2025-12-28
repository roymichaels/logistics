import React from 'react';
import { ROYAL_COLORS } from '../../styles/royalTheme';

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
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        boxShadow: ROYAL_COLORS.shadow,
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
              background: `linear-gradient(135deg, ${ROYAL_COLORS.primary} 0%, ${ROYAL_COLORS.accentDark} 100%)`,
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
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.text }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ margin: '4px 0 0', color: ROYAL_COLORS.muted, fontSize: '14px' }}>
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
