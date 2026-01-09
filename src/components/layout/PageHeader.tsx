import React from 'react';
import { modernTokens } from '../../styles/modernTokens';

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
        background: modernTokens.gradients.card,
        borderRadius: modernTokens.radius.xl,
        border: `1px solid ${modernTokens.colors.border.default}`,
        boxShadow: modernTokens.shadows.lg,
        marginBottom: '24px',
        backdropFilter: 'blur(20px)',
        ...style
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: modernTokens.radius.lg,
              background: modernTokens.gradients.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: modernTokens.glows.primary
            }}
          >
            {icon}
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: '700',
              color: modernTokens.colors.text.primary
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{
                margin: '4px 0 0',
                color: modernTokens.colors.text.secondary,
                fontSize: '14px'
              }}>
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
