import React from 'react';
import { Order, OrderStatus } from '../types';
import { orderWorkflowService } from '../services';

interface OrderCardProps {
  order: Order;
  onView?: (order: Order) => void;
  onStatusChange?: (order: Order, newStatus: OrderStatus) => void;
  onAssignDriver?: (order: Order) => void;
  onCancel?: (order: Order) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function OrderCard({
  order,
  onView,
  onStatusChange,
  onAssignDriver,
  onCancel,
  showActions = true,
  compact = false
}: OrderCardProps) {
  const statusColor = orderWorkflowService.getStatusColor(order.status);
  const statusLabel = orderWorkflowService.getStatusLabel(order.status);
  const nextStatuses = orderWorkflowService.getNextStatuses(order);

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    padding: compact ? '12px 16px' : '16px 20px',
    marginBottom: '12px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
    cursor: onView ? 'pointer' : 'default'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: compact ? '8px' : '12px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: compact ? '16px' : '18px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '4px'
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    background: statusColor
  };

  const infoStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: compact ? '4px' : '12px',
    marginBottom: showActions && nextStatuses.length > 0 ? '12px' : '0'
  };

  const infoItemStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280'
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: '#3b82f6',
    color: '#fff'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #e5e7eb'
  };

  return (
    <div
      style={cardStyle}
      onClick={onView ? () => onView(order) : undefined}
      onMouseEnter={(e) => {
        if (onView) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onView) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        }
      }}
    >
      <div style={headerStyle}>
        <div>
          <div style={titleStyle}>
            Order #{order.orderNumber || order.id.slice(0, 8)}
          </div>
          <span style={badgeStyle}>{statusLabel}</span>
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
          ${(order.total || 0).toFixed(2)}
        </div>
      </div>

      <div style={infoStyle}>
        <div style={infoItemStyle}>
          <strong>Customer:</strong> {order.customer?.name || 'N/A'}
        </div>
        <div style={infoItemStyle}>
          <strong>Items:</strong> {order.items?.length || 0}
        </div>
        {order.delivery?.driverName && (
          <div style={infoItemStyle}>
            <strong>Driver:</strong> {order.delivery.driverName}
          </div>
        )}
        <div style={infoItemStyle}>
          <strong>Created:</strong> {new Date(order.createdAt).toLocaleString()}
        </div>
      </div>

      {showActions && (
        <div style={actionsStyle}>
          {nextStatuses.slice(0, 2).map((status) => (
            <button
              key={status}
              style={primaryButtonStyle}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange?.(order, status);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
              }}
            >
              {orderWorkflowService.getStatusLabel(status)}
            </button>
          ))}

          {!order.delivery?.driverId && order.status === 'ready_for_pickup' && onAssignDriver && (
            <button
              style={secondaryButtonStyle}
              onClick={(e) => {
                e.stopPropagation();
                onAssignDriver(order);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
              }}
            >
              Assign Driver
            </button>
          )}

          {order.status !== 'cancelled' && order.status !== 'delivered' && onCancel && (
            <button
              style={{ ...secondaryButtonStyle, color: '#ef4444' }}
              onClick={(e) => {
                e.stopPropagation();
                onCancel(order);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6';
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
