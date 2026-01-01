import React from 'react';

export function OrdersEmptyState() {
  return (
    <div style={styles.emptyState.container}>
      <div style={styles.emptyState.containerIcon}>📦</div>
      <p style={styles.emptyState.containerText}>לא נמצאו הזמנות</p>
    </div>
  );
}
