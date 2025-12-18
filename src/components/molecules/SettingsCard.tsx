import React from 'react';
import { Card } from './Card';
import { Typography } from '../atoms/Typography';

interface SettingsCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <Card>
      <div style={{ marginBottom: '12px' }}>
        <Typography variant="h4" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body" style={{ fontSize: '14px', opacity: 0.7 }}>
            {description}
          </Typography>
        )}
      </div>
      {children}
    </Card>
  );
}
