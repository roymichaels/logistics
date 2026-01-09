import React from 'react';
import { Card } from './Card';
import { tokens } from '../../styles/tokens';

interface StatCardProps {
  icon?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  onClick?: () => void;
}

export function StatCard({ icon, label, value, subtitle, color, onClick }: StatCardProps) {
  return (
    <Card onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ textAlign: 'center' }}>
        {icon && (
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>
            {icon}
          </div>
        )}
        <div style={{
          fontSize: '32px',
          fontWeight: '700',
          color: color || tokens.colors.text,
          marginBottom: '4px'
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '14px',
          color: tokens.colors.subtle,
          marginTop: '4px'
        }}>
          {label}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '12px',
            color: tokens.colors.subtle,
            marginTop: '4px',
            opacity: 0.8
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </Card>
  );
}
