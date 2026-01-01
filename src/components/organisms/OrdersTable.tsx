import React from 'react';
import { Order } from '../../domain/orders/entities';
import { OrderListItem } from '../molecules/lists/OrderListItem';
import { EmptyState } from '../molecules/EmptyState';
import { LoadingState } from '../molecules/LoadingState';
import { Typography } from '../atoms/Typography';
import { TELEGRAM_THEME } from '../../styles/telegramTheme';

export interface OrdersTableProps {
  orders: Order[];
  loading?: boolean;
  error?: string | null;
  onOrderClick?: (order: Order) => void;
  onOrderAction?: (orderId: string, action: string) => void;
  emptyMessage?: string;
  showActions?: boolean;
  compact?: boolean;
}

export function OrdersTable({
  orders,
  loading = false,
  error = null,
  onOrderClick,
  onOrderAction,
  emptyMessage = 'No orders found',
  showActions = false,
  compact = false,
}: OrdersTableProps) {
  if (loading) {
    return <LoadingState message="Loading orders..." />;
  }

  if (error) {
    return (
      <div
        style={{
          padding: TELEGRAM_THEME.spacing.lg,
          textAlign: 'center',
          color: TELEGRAM_THEME.colors.status.error,
        }}
      >
        <Typography variant="body1" color="error">
          {error}
        </Typography>
      </div>
    );
  }

  if (orders.length === 0) {
    return <EmptyState message={emptyMessage} icon="package" />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: TELEGRAM_THEME.spacing.sm,
      }}
    >
      {orders.map((order) => (
        <OrderListItem
          key={order.id}
          order={order}
          onClick={onOrderClick}
          onAction={onOrderAction}
          showActions={showActions}
          compact={compact}
        />
      ))}
    </div>
  );
}
