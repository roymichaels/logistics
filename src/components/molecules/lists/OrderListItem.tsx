import React from 'react';
import { Card } from '../Card';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { StatusBadge } from '../../atoms/StatusBadge';
import { TELEGRAM_THEME } from '../../../styles/telegramTheme';
import { Order } from '../../../domain/orders/entities';

export interface OrderListItemProps {
  order: Order;
  onClick?: (order: Order) => void;
  onAction?: (orderId: string, action: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function OrderListItem({
  order,
  onClick,
  onAction,
  showActions = false,
  compact = false,
}: OrderListItemProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(order);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: TELEGRAM_THEME.colors.status.warning,
      confirmed: TELEGRAM_THEME.colors.status.info,
      preparing: TELEGRAM_THEME.colors.accent.primary,
      ready_for_pickup: TELEGRAM_THEME.colors.status.success,
      assigned: TELEGRAM_THEME.colors.accent.primary,
      picked_up: TELEGRAM_THEME.colors.status.info,
      in_transit: TELEGRAM_THEME.colors.status.info,
      delivered: TELEGRAM_THEME.colors.status.success,
      cancelled: TELEGRAM_THEME.colors.status.error,
      failed: TELEGRAM_THEME.colors.status.error,
    };
    return colors[status] || TELEGRAM_THEME.colors.text.secondary;
  };

  return (
    <Card
      onClick={handleClick}
      hoverable={!!onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        padding: compact ? TELEGRAM_THEME.spacing.sm : TELEGRAM_THEME.spacing.md,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? TELEGRAM_THEME.spacing.xs : TELEGRAM_THEME.spacing.sm,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: TELEGRAM_THEME.spacing.sm,
                marginBottom: TELEGRAM_THEME.spacing.xs,
              }}
            >
              <Typography variant={compact ? 'body2' : 'body1'} weight="bold">
                #{order.orderNumber}
              </Typography>

              <StatusBadge status={order.status} size={compact ? 'sm' : 'md'} />

              {order.priority && order.priority !== 'normal' && (
                <Badge
                  text={order.priority.toUpperCase()}
                  variant={order.priority === 'urgent' ? 'danger' : 'warning'}
                  size={compact ? 'sm' : 'md'}
                />
              )}
            </div>

            <Typography variant="body2" color="secondary">
              {order.customer.name}
            </Typography>

            {!compact && (
              <Typography
                variant="caption"
                color="secondary"
                style={{ marginTop: TELEGRAM_THEME.spacing.xs }}
              >
                {order.customer.phone} • {order.customer.address.city}
              </Typography>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: TELEGRAM_THEME.spacing.xs,
            }}
          >
            <Typography variant={compact ? 'body2' : 'body1'} weight="bold">
              ${order.total.toFixed(2)}
            </Typography>

            <Typography variant="caption" color="secondary">
              {new Date(order.createdAt).toLocaleDateString()}
            </Typography>
          </div>
        </div>

        {!compact && order.delivery.driverName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: TELEGRAM_THEME.spacing.xs,
              paddingTop: TELEGRAM_THEME.spacing.xs,
              borderTop: `1px solid ${TELEGRAM_THEME.colors.background.hover}`,
            }}
          >
            <Icon name="truck" size={16} color={TELEGRAM_THEME.colors.text.secondary} />
            <Typography variant="caption" color="secondary">
              Driver: {order.delivery.driverName}
            </Typography>
          </div>
        )}

        {showActions && (
          <div
            style={{
              display: 'flex',
              gap: TELEGRAM_THEME.spacing.sm,
              paddingTop: TELEGRAM_THEME.spacing.sm,
              borderTop: `1px solid ${TELEGRAM_THEME.colors.background.hover}`,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction?.(order.id, 'view');
              }}
              style={{
                padding: `${TELEGRAM_THEME.spacing.xs} ${TELEGRAM_THEME.spacing.sm}`,
                background: TELEGRAM_THEME.colors.background.hover,
                border: 'none',
                borderRadius: TELEGRAM_THEME.radius.md,
                cursor: 'pointer',
                fontSize: TELEGRAM_THEME.typography.fontSize.sm,
                color: TELEGRAM_THEME.colors.text.primary,
              }}
            >
              View Details
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
