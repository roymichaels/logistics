import React from 'react';
import { Card } from './Card';
import { useTheme } from '../../theme/tokens';

type SettingsCardProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export const SettingsCard: React.FC<SettingsCardProps> = ({ title, description, children }) => {
  const t = useTheme();

  return (
    <Card
      style={{
        background: t.colors.panel,
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radius.lg,
        padding: 16,
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontWeight: t.typography.weight.bold, fontSize: t.typography.size.lg }}>
          {title}
        </div>
        {description && (
          <div style={{ color: t.colors.muted, fontSize: t.typography.size.sm }}>{description}</div>
        )}
      </div>
      <div>{children}</div>
    </Card>
  );
};
