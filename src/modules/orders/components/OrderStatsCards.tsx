import React from 'react';
import { OrderStats } from '../types';
import { Card } from '@ui/molecules';

interface OrderStatsCardsProps {
  stats: OrderStats;
}

export function OrderStatsCards({ stats }: OrderStatsCardsProps) {
  const statCards = [
    { label: 'Total Orders', value: stats.total, color: '#2196F3' },
    { label: 'Pending', value: stats.pending, color: '#FFA500' },
    { label: 'In Progress', value: stats.inProgress, color: '#2196F3' },
    { label: 'Completed', value: stats.completed, color: '#4CAF50' },
    { label: 'Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, color: '#4CAF50' },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem',
    }}>
      {statCards.map(stat => (
        <Card key={stat.label} style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
            {stat.label}
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: stat.color }}>
            {stat.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
