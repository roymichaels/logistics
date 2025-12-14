import React from 'react';
import { ROYAL_STYLES } from '../../styles/royalTheme';

export function OrdersEmptyState() {
  return (
    <div style={ROYAL_STYLES.emptyState}>
      <div style={ROYAL_STYLES.emptyStateIcon}>📦</div>
      <p style={ROYAL_STYLES.emptyStateText}>לא נמצאו הזמנות</p>
    </div>
  );
}
