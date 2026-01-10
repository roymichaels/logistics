import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UndergroundSection } from '../components/underground/UndergroundSection';
import { UndergroundCard } from '../components/underground/UndergroundCard';
import { UndergroundButton } from '../components/underground/UndergroundButton';
import { UndergroundBadge } from '../components/underground/UndergroundBadge';
import { UndergroundEmptyState } from '../components/underground/UndergroundEmptyState';
import { UndergroundLoadingSpinner } from '../components/underground/UndergroundLoadingSpinner';
import { UndergroundHeader } from '../components/underground/UndergroundHeader';
import { undergroundTheme } from '../styles/undergroundTheme';
import { getStatusBadgeStyle, createPageContainerStyle } from '../utils/undergroundStyles';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { Toast } from '../components/Toast';

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
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();

      const channel = supabase
        .channel('my-orders')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`
        }, () => {
          logger.info('[MyOrdersPage] Order updated, refetching...');
          loadOrders();
        })
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) {
      logger.warn('[MyOrdersPage] No user logged in');
      setLoading(false);
      return;
    }

    try {
      logger.info('[MyOrdersPage] Loading orders for user', { userId: user.id });

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            product_id,
            product_name,
            quantity,
            price
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      const formattedOrders: Order[] = (ordersData || []).map(order => ({
        id: order.id,
        order_number: order.order_number || `ORD-${order.id.slice(0, 8)}`,
        customer_name: order.customer_name || '',
        customer_phone: order.customer_phone || '',
        delivery_address: order.delivery_address || '',
        notes: order.notes,
        items: (order.order_items || []).map((item: any) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: order.subtotal || 0,
        shipping_cost: order.shipping_cost || 0,
        total_amount: order.total_amount || 0,
        payment_method: order.payment_method || 'cash_on_delivery',
        status: order.status || 'pending',
        created_at: order.created_at,
      }));

      logger.info('[MyOrdersPage] Orders loaded successfully', { count: formattedOrders.length });
      setOrders(formattedOrders);
    } catch (error: any) {
      logger.error('[MyOrdersPage] Failed to load orders', { error });
      Toast.error('Failed to load orders. Please try again.');
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: undergroundTheme.spacing.lg
      }}>
        <UndergroundLoadingSpinner size="large" />
        <div style={{
          color: undergroundTheme.colors.text.primary,
          fontSize: undergroundTheme.typography.fontSize.lg,
          fontWeight: undergroundTheme.typography.fontWeight.semibold
        }}>
          Loading your orders...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={createPageContainerStyle()}>
        <UndergroundCard>
          <div style={{
            textAlign: 'center',
            padding: undergroundTheme.spacing['4xl']
          }}>
            <div style={{ fontSize: '64px', marginBottom: undergroundTheme.spacing.lg }}>🔒</div>
            <h2 style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.md
            }}>
              Please Log In
            </h2>
            <p style={{
              margin: `0 0 ${undergroundTheme.spacing.xl} 0`,
              color: undergroundTheme.colors.text.secondary,
              fontSize: undergroundTheme.typography.fontSize.md,
              lineHeight: 1.6
            }}>
              You need to be logged in to view your orders
            </p>
            <UndergroundButton onClick={() => navigate('/login')}>
              Go to Login
            </UndergroundButton>
          </div>
        </UndergroundCard>
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
