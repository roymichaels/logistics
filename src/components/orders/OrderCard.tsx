import React from 'react';
import { Order } from '../../data/types';
import { tokens } from '../../styles/tokens';

interface OrderCardProps {
  order: Order;
  onClick: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return tokens.colors.status.warning;
      case 'assigned': return tokens.colors.status.info;
      case 'enroute': return tokens.colors.brand.primary;
      case 'delivered': return tokens.colors.status.success;
      case 'failed': return tokens.colors.status.error;
      default: return tokens.colors.subtle;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'חדש',
      assigned: 'הוקצה',
      enroute: 'בדרך',
      delivered: 'נמסר',
      failed: 'נכשל'
    };
    return labels[status] || status;
  };

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.card,
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = tokens.shadows.mdStrong;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = tokens.shadows.md;
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '18px',
            fontWeight: '700',
            color: tokens.colors.text
          }}>
            {order.customer_name}
          </h3>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            color: tokens.colors.subtle,
            lineHeight: '1.5'
          }}>
            📞 {order.customer_phone}
          </p>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: tokens.colors.subtle,
            lineHeight: '1.5'
          }}>
            📍 {order.customer_address}
          </p>
        </div>

        <div style={{
          padding: '6px 12px',
          borderRadius: '12px',
          background: getStatusColor(order.status) + '20',
          border: `1px solid ${getStatusColor(order.status)}`,
          color: getStatusColor(order.status),
          fontSize: '12px',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          marginRight: '12px'
        }}>
          {getStatusLabel(order.status)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${tokens.colors.background.cardBorder}` }}>
        <div style={{ fontSize: '13px', color: tokens.colors.subtle }}>
          🕒 {new Date(order.created_at).toLocaleString('he-IL')}
        </div>
        {order.total_amount && (
          <div style={{ fontSize: '18px', fontWeight: '700', color: tokens.colors.status.warning }}>
            ₪{order.total_amount.toLocaleString()}
          </div>
        )}
      </div>

      {order.assigned_driver && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: tokens.colors.status.info + '10',
          border: `1px solid ${tokens.colors.status.info}30`,
          borderRadius: '8px',
          fontSize: '13px',
          color: tokens.colors.status.info
        }}>
          🚗 נהג: {order.assigned_driver}
        </div>
      )}
    </div>
  );
}
