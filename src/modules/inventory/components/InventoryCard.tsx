import React from 'react';
import { Card } from '../../../components/molecules/Card';
import { tokens } from '../../../styles/tokens';
import type { AggregatedInventory } from '../types';

interface InventoryCardProps {
  item: AggregatedInventory;
  onClick: () => void;
}

export function InventoryCard({ item, onClick }: InventoryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return tokens.colors.status.success;
      case 'low': return tokens.colors.status.warning;
      case 'out': return tokens.colors.status.error;
      default: return tokens.colors.subtle;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return '✅';
      case 'low': return '⚠️';
      case 'out': return '❌';
      default: return '📦';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_stock': return 'זמין';
      case 'low': return 'נמוך';
      case 'out': return 'אזל';
      default: return 'לא ידוע';
    }
  };

  return (
    <ContentCard hoverable onClick={onClick}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
      }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: tokens.colors.text,
            marginBottom: '4px',
          }}>
            {item.product_name}
          </h3>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '16px',
          background: `${getStatusColor(item.status)}20`,
          border: `1px solid ${getStatusColor(item.status)}`,
        }}>
          <span>{getStatusIcon(item.status)}</span>
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: getStatusColor(item.status),
          }}>
            {getStatusLabel(item.status)}
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
      }}>
        <div>
          <div style={{
            fontSize: '12px',
            color: tokens.colors.subtle,
            marginBottom: '4px',
          }}>
            במלאי
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: tokens.colors.text,
          }}>
            {item.totalOnHand}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: '12px',
            color: tokens.colors.subtle,
            marginBottom: '4px',
          }}>
            שמור
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: tokens.colors.text,
          }}>
            {item.totalReserved}
          </div>
        </div>
      </div>
    </ContentCard>
  );
}
