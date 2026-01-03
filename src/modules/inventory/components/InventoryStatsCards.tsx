import React from 'react';
import { Card } from '../../../components/molecules/Card';
import { tokens } from '../../../styles/tokens';
import type { InventoryStats } from '../types';

interface InventoryStatsCardsProps {
  stats: InventoryStats;
}

export function InventoryStatsCards({ stats }: InventoryStatsCardsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      marginBottom: '20px',
    }}>
      <ContentCard>
        <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginBottom: '4px' }}>
          סה"כ פריטים
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.text }}>
          {stats.totalItems}
        </div>
      </ContentCard>

      <ContentCard>
        <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginBottom: '4px' }}>
          מלאי נמוך
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.status.warning }}>
          {stats.lowStockCount}
        </div>
      </ContentCard>

      <ContentCard>
        <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginBottom: '4px' }}>
          אזל מהמלאי
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.status.error }}>
          {stats.outOfStockCount}
        </div>
      </ContentCard>

      <ContentCard>
        <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginBottom: '4px' }}>
          זמין
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.status.success }}>
          {stats.inStockCount}
        </div>
      </ContentCard>
    </div>
  );
}
