import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UndergroundSection } from '../components/underground/UndergroundSection';
import { UndergroundCard } from '../components/underground/UndergroundCard';
import { UndergroundButton } from '../components/underground/UndergroundButton';
import { UndergroundBadge } from '../components/underground/UndergroundBadge';
import { UndergroundEmptyState } from '../components/underground/UndergroundEmptyState';
import { undergroundTheme } from '../styles/undergroundTheme';
import { getStatusBadgeStyle, createPageContainerStyle } from '../utils/undergroundStyles';

interface MyOrdersPageProps {
  dataStore?: any;
  onNavigate?: (dest: string) => void;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  notes?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping_cost: number;
  total_amount: number;
  payment_method: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  created_at: string;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'warning' as const, color: undergroundTheme.colors.status.warning },
  confirmed: { label: 'Confirmed', variant: 'info' as const, color: undergroundTheme.colors.status.info },
  preparing: { label: 'Preparing', variant: 'info' as const, color: undergroundTheme.colors.accent.tertiary },
  out_for_delivery: { label: 'Out for Delivery', variant: 'info' as const, color: undergroundTheme.colors.accent.secondary },
  delivered: { label: 'Delivered', variant: 'success' as const, color: undergroundTheme.colors.status.success },
  cancelled: { label: 'Cancelled', variant: 'error' as const, color: undergroundTheme.colors.status.error },
};

export function MyOrdersPage({ dataStore, onNavigate }: MyOrdersPageProps) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      if (dataStore?.listOrders) {
        const ordersList = await dataStore.listOrders();
        setOrders(ordersList);
      } else {
        const storedOrders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        setOrders(storedOrders.reverse());
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (orderId: string) => {
    if (onNavigate) {
      onNavigate(`/store/orders/${orderId}`);
    } else {
      navigate(`/store/orders/${orderId}`);
    }
  };

  const handleBackToStore = () => {
    if (onNavigate) {
      onNavigate('/store/catalog');
    } else {
      navigate('/store/catalog');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{
        ...createPageContainerStyle(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{
          color: undergroundTheme.colors.text.primary,
          fontSize: undergroundTheme.typography.fontSize['2xl'],
          fontWeight: undergroundTheme.typography.fontWeight.semibold
        }}>
          Loading orders...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...createPageContainerStyle(),
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      <UndergroundButton
        variant="secondary"
        onClick={handleBackToStore}
        style={{ marginBottom: undergroundTheme.spacing['2xl'] }}
      >
        ← Back to Store
      </UndergroundButton>

      <UndergroundSection
        title="My Orders"
        style={{
          marginBottom: undergroundTheme.spacing['4xl'],
        }}
      >
        {orders.length === 0 ? (
          <UndergroundEmptyState
            title="No orders yet"
            description="You haven't placed any orders. Start shopping to see your orders here!"
            action={{
              label: 'Start Shopping',
              onClick: handleBackToStore,
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.xl }}>
            {orders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const items = order.items || [];
              const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <UndergroundCard
                  key={order.id}
                  hover
                  onClick={() => handleOrderClick(order.id)}
                  style={{
                    cursor: 'pointer',
                    transition: undergroundTheme.transitions.normal,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{
                          color: undergroundTheme.colors.text.primary,
                          fontSize: undergroundTheme.typography.fontSize.xl,
                          fontWeight: undergroundTheme.typography.fontWeight.bold,
                          marginBottom: undergroundTheme.spacing.sm
                        }}>
                          Order #{order.order_number}
                        </div>
                        <div style={{
                          color: undergroundTheme.colors.text.tertiary,
                          fontSize: undergroundTheme.typography.fontSize.sm
                        }}>
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                      <UndergroundBadge status={order.status}>
                        {statusConfig.label}
                      </UndergroundBadge>
                    </div>

                    <div
                      style={{
                        padding: undergroundTheme.spacing.lg,
                        background: undergroundTheme.colors.glassmorphism.light,
                        borderRadius: undergroundTheme.borderRadius.lg,
                        border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.md }}>
                        <div style={{
                          color: undergroundTheme.colors.text.tertiary,
                          fontSize: undergroundTheme.typography.fontSize.sm
                        }}>
                          Items
                        </div>
                        <div style={{
                          color: undergroundTheme.colors.text.primary,
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          fontWeight: undergroundTheme.typography.fontWeight.semibold
                        }}>
                          {totalItems} {totalItems === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.md }}>
                        <div style={{
                          color: undergroundTheme.colors.text.tertiary,
                          fontSize: undergroundTheme.typography.fontSize.sm
                        }}>
                          Total Amount
                        </div>
                        <div style={{
                          color: undergroundTheme.colors.accent.primary,
                          fontSize: undergroundTheme.typography.fontSize.lg,
                          fontWeight: undergroundTheme.typography.fontWeight.bold,
                          textShadow: undergroundTheme.shadows.glow.cyan
                        }}>
                          ₪{order.total_amount.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{
                          color: undergroundTheme.colors.text.tertiary,
                          fontSize: undergroundTheme.typography.fontSize.sm
                        }}>
                          Payment Method
                        </div>
                        <div style={{
                          color: undergroundTheme.colors.text.secondary,
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          fontWeight: undergroundTheme.typography.fontWeight.semibold
                        }}>
                          Cash on Delivery
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: undergroundTheme.spacing.sm,
                        flexWrap: 'wrap',
                        borderTop: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                        paddingTop: undergroundTheme.spacing.lg,
                      }}
                    >
                      {items.slice(0, 3).map((item, idx) => (
                        <div key={idx} style={{
                          color: undergroundTheme.colors.text.tertiary,
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
                          background: undergroundTheme.colors.glassmorphism.light,
                          borderRadius: undergroundTheme.borderRadius.md,
                          border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
                        }}>
                          {item.product_name} ({item.quantity}x)
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div style={{
                          color: undergroundTheme.colors.accent.secondary,
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          fontWeight: undergroundTheme.typography.fontWeight.semibold,
                          padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
                          background: undergroundTheme.colors.accent.subtle,
                          borderRadius: undergroundTheme.borderRadius.md,
                          border: `1px solid ${undergroundTheme.colors.accent.primary}40`
                        }}>
                          +{items.length - 3} more
                        </div>
                      )}
                    </div>

                    <UndergroundButton
                      variant="secondary"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderClick(order.id);
                      }}
                    >
                      View Details →
                    </UndergroundButton>
                  </div>
                </UndergroundCard>
              );
            })}
          </div>
        )}
      </UndergroundSection>
    </div>
  );
}
