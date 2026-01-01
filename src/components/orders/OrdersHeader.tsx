import React from 'react';

interface OrdersHeaderProps {
  title: string;
  subtitle: string;
}

export function OrdersHeader({ title, subtitle }: OrdersHeaderProps) {
  return (
    <div style={styles.pageHeader}>
      <h1 style={styles.pageTitle}>{title}</h1>
      <p style={styles.pageSubtitle}>{subtitle}</p>
    </div>
  );
}
