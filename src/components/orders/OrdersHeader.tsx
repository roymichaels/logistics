import React from 'react';
import { ROYAL_STYLES } from '../../styles/royalTheme';

interface OrdersHeaderProps {
  title: string;
  subtitle: string;
}

export function OrdersHeader({ title, subtitle }: OrdersHeaderProps) {
  return (
    <div style={ROYAL_STYLES.pageHeader}>
      <h1 style={ROYAL_STYLES.pageTitle}>{title}</h1>
      <p style={ROYAL_STYLES.pageSubtitle}>{subtitle}</p>
    </div>
  );
}
