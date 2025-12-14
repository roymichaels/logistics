import React from 'react';
import { Order } from '../../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../../styles/royalTheme';

interface OrderCardProps {
  order: Order;
  onClick: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return ROYAL_COLORS.warning;
      case 'assigned': return ROYAL_COLORS.info;
      case 'enroute': return ROYAL_COLORS.accent;
      case 'delivered': return ROYAL_COLORS.success;
      case 'failed': return ROYAL_COLORS.crimson;
      default: return ROYAL_COLORS.muted;
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
        ...ROYAL_STYLES.card,
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = ROYAL_COLORS.shadowStrong;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = ROYAL_COLORS.shadow;
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '18px',
            fontWeight: '700',
            color: ROYAL_COLORS.text
          }}>
            {order.customer_name}
          </h3>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            color: ROYAL_COLORS.muted,
            lineHeight: '1.5'
          }}>
            📞 {order.customer_phone}
          </p>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: ROYAL_COLORS.muted,
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${ROYAL_COLORS.cardBorder}` }}>
        <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
          🕒 {new Date(order.created_at).toLocaleString('he-IL')}
        </div>
        {order.total_amount && (
          <div style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.gold }}>
            ₪{order.total_amount.toLocaleString()}
          </div>
        )}
      </div>

      {order.assigned_driver && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: ROYAL_COLORS.info + '10',
          border: `1px solid ${ROYAL_COLORS.info}30`,
          borderRadius: '8px',
          fontSize: '13px',
          color: ROYAL_COLORS.info
        }}>
          🚗 נהג: {order.assigned_driver}
        </div>
      )}
    </div>
  );
}
