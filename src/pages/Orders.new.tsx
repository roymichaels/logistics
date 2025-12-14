import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { telegram } from '../lib/telegram';
import { useOrders, useOrder, useCreateOrder, useAssignOrder, useUpdateOrderStatus } from '../application/use-cases';
import { useApp } from '../application/services/useApp';
import { Diagnostics } from '../foundation/diagnostics/DiagnosticsStore';
import { Toast } from '../components/Toast';
import { colors, commonStyles } from '../styles/design-system';
import { ROYAL_STYLES, ROYAL_COLORS } from '../styles/royalTheme';
import { logger } from '../lib/logger';
import { useI18n } from '../lib/i18n';
import type { FrontendDataStore } from '../lib/frontendDataStore';

interface OrdersProps {
  dataStore: FrontendDataStore;
  onNavigate: (page: string) => void;
}

export function Orders({ dataStore, onNavigate }: OrdersProps) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const { t, translations } = useI18n();
  const app = useApp();

  const { orders, loading, error, refetch } = useOrders({
    status: filter === 'all' ? undefined : filter,
  });

  const theme = telegram.themeParams;

  useEffect(() => {
    telegram.setBackButton(() => {
      if (selectedOrderId) {
        setSelectedOrderId(null);
      } else if (showCreateForm) {
        setShowCreateForm(false);
      }
    });

    if (!selectedOrderId && !showCreateForm) {
      telegram.hideBackButton();
    }
  }, [selectedOrderId, showCreateForm]);

  useEffect(() => {
    const unsubscribe = app.events?.on('OrderCreated', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'OrderCreated received, refetching orders' });
      refetch();
    });

    const unsubscribeUpdated = app.events?.on('OrderUpdated', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'OrderUpdated received, refetching orders' });
      refetch();
    });

    const unsubscribeAssigned = app.events?.on('OrderAssigned', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'OrderAssigned received, refetching orders' });
      refetch();
    });

    return () => {
      unsubscribe?.();
      unsubscribeUpdated?.();
      unsubscribeAssigned?.();
    };
  }, [app.events, refetch]);

  const handleCreateOrder = () => {
    telegram.hapticFeedback('selection');
    setShowModeSelector(true);
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;

    const query = searchQuery.toLowerCase();
    return orders.filter(order =>
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_phone?.toLowerCase().includes(query) ||
      order.customer_address?.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  if (loading && orders.length === 0) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={commonStyles.emptyState}>
          <div style={commonStyles.emptyStateIcon}>⏳</div>
          <p style={commonStyles.emptyStateText}>{translations.phrases.loadingOrders}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={commonStyles.emptyState}>
          <div style={commonStyles.emptyStateIcon}>❌</div>
          <p style={commonStyles.emptyStateText}>{error.message || 'Failed to load orders'}</p>
          <button
            onClick={refetch}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: ROYAL_COLORS.gradientPurple,
              border: 'none',
              borderRadius: '12px',
              color: ROYAL_COLORS.textBright,
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <CreateOrderForm
        dataStore={dataStore}
        onCancel={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false);
          refetch();
        }}
        theme={theme}
      />
    );
  }

  if (selectedOrderId) {
    return (
      <OrderDetail
        orderId={selectedOrderId}
        dataStore={dataStore}
        onBack={() => setSelectedOrderId(null)}
        onUpdate={refetch}
        theme={theme}
      />
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {showModeSelector && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowModeSelector(false)}
        >
          <div
            style={{
              ...ROYAL_STYLES.card,
              maxWidth: '400px',
              width: '100%',
              padding: '32px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: ROYAL_COLORS.text,
              textAlign: 'center'
            }}>
              Create Order
            </h2>

            <button
              onClick={() => {
                telegram.hapticFeedback('impact', 'medium');
                setShowModeSelector(false);
                setShowCreateForm(true);
              }}
              style={{
                width: '100%',
                padding: '20px',
                background: ROYAL_COLORS.gradientPurple,
                border: 'none',
                borderRadius: '16px',
                color: ROYAL_COLORS.textBright,
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '700',
                marginBottom: '12px'
              }}
            >
              📋 Create New Order
            </button>

            <button
              onClick={() => {
                telegram.hapticFeedback('selection');
                setShowModeSelector(false);
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: 'none',
                color: ROYAL_COLORS.muted,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={ROYAL_STYLES.pageHeader}>
        <h1 style={ROYAL_STYLES.pageTitle}>📦 Orders</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>Manage orders in real-time</p>
      </div>

      <input
        type="text"
        placeholder="Search by customer, phone or address..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          ...ROYAL_STYLES.input,
          marginBottom: '20px',
          fontSize: '15px'
        }}
      />

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
        {['all', 'new', 'assigned', 'enroute', 'delivered'].map((status) => (
          <button
            key={status}
            onClick={() => {
              telegram.hapticFeedback('selection');
              setFilter(status);
              Diagnostics.logEvent({ type: 'log', message: 'Filter changed', data: { status } });
            }}
            style={{
              padding: '10px 20px',
              border: `2px solid ${filter === status ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
              borderRadius: '20px',
              background: filter === status ? ROYAL_COLORS.accent + '20' : 'transparent',
              color: filter === status ? ROYAL_COLORS.accent : ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease'
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>📦</div>
          <p style={ROYAL_STYLES.emptyStateText}>No orders found</p>
          <button
            onClick={handleCreateOrder}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: ROYAL_COLORS.gradientPurple,
              border: 'none',
              borderRadius: '12px',
              color: ROYAL_COLORS.textBright,
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Create First Order
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => {
                telegram.hapticFeedback('selection');
                setSelectedOrderId(order.id);
                Diagnostics.logEvent({ type: 'nav', message: 'Navigate to order detail', data: { orderId: order.id } });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onClick }: {
  order: any;
  onClick: () => void;
}) {
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

  return (
    <div
      onClick={onClick}
      style={{
        ...ROYAL_STYLES.card,
        cursor: 'pointer',
        transition: 'all 0.3s ease'
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
            color: ROYAL_COLORS.muted
          }}>
            📞 {order.customer_phone}
          </p>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: ROYAL_COLORS.muted
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
          whiteSpace: 'nowrap'
        }}>
          {order.status}
        </div>
      </div>

      {order.total_amount && (
        <div style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.gold, marginTop: '12px' }}>
          ${order.total_amount.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function OrderDetail({ orderId, dataStore, onBack, onUpdate, theme }: {
  orderId: string;
  dataStore: FrontendDataStore;
  onBack: () => void;
  onUpdate: () => void;
  theme: any;
}) {
  const { order, loading, error, refetch } = useOrder(orderId);
  const { updateStatus, loading: updating } = useUpdateOrderStatus();
  const { assignOrder, loading: assigning } = useAssignOrder();

  useEffect(() => {
    const unsubscribe = app.events?.on('OrderUpdated', (payload: any) => {
      if (payload.orderId === orderId) {
        Diagnostics.logEvent({ type: 'domain_event', message: 'Order updated, refetching', data: payload });
        refetch();
      }
    });

    return () => unsubscribe?.();
  }, [orderId, refetch]);

  const handleStatusUpdate = async (newStatus: any) => {
    Diagnostics.logEvent({ type: 'log', message: 'Updating order status', data: { orderId, newStatus } });

    const result = await updateStatus(orderId, newStatus);

    if (result.success) {
      telegram.hapticFeedback('notification', 'success');
      Toast.success('Order status updated');
      Diagnostics.logEvent({ type: 'log', message: 'Order status updated successfully', data: { orderId, newStatus } });
      onUpdate();
      refetch();
    } else {
      Toast.error(result.error.message || 'Failed to update order');
      Diagnostics.logEvent({ type: 'error', message: 'Failed to update order status', data: { orderId, error: result.error } });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div style={{ color: ROYAL_COLORS.muted }}>Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <div style={{ color: ROYAL_COLORS.text, marginBottom: '16px' }}>
          {error?.message || 'Order not found'}
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '12px 24px',
            background: ROYAL_COLORS.gradientPurple,
            border: 'none',
            borderRadius: '12px',
            color: ROYAL_COLORS.textBright,
            cursor: 'pointer'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', minHeight: '100vh', backgroundColor: ROYAL_COLORS.background }}>
      <button
        onClick={onBack}
        style={{
          background: 'transparent',
          border: 'none',
          color: ROYAL_COLORS.accent,
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ← Back
      </button>

      <div style={{ ...ROYAL_STYLES.card, marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '700', color: ROYAL_COLORS.text }}>
          {order.customer_name}
        </h2>
        <p style={{ margin: '0 0 8px 0', color: ROYAL_COLORS.muted }}>
          📞 {order.customer_phone}
        </p>
        <p style={{ margin: '0', color: ROYAL_COLORS.muted }}>
          📍 {order.customer_address}
        </p>
      </div>

      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div style={{ ...ROYAL_STYLES.card }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>
            Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {order.status === 'new' && (
              <button
                onClick={() => handleStatusUpdate('assigned')}
                disabled={updating}
                style={{
                  padding: '12px',
                  background: ROYAL_COLORS.gradientPurple,
                  border: 'none',
                  borderRadius: '12px',
                  color: ROYAL_COLORS.textBright,
                  cursor: updating ? 'not-allowed' : 'pointer',
                  opacity: updating ? 0.5 : 1
                }}
              >
                {updating ? '⏳ Assigning...' : '🚚 Assign to Driver'}
              </button>
            )}
            {order.status === 'assigned' && (
              <button
                onClick={() => handleStatusUpdate('in_transit')}
                disabled={updating}
                style={{
                  padding: '12px',
                  background: ROYAL_COLORS.gradientInfo,
                  border: 'none',
                  borderRadius: '12px',
                  color: ROYAL_COLORS.textBright,
                  cursor: updating ? 'not-allowed' : 'pointer',
                  opacity: updating ? 0.5 : 1
                }}
              >
                {updating ? '⏳ Updating...' : '🚚 Mark as In Transit'}
              </button>
            )}
            {order.status === 'in_transit' && (
              <button
                onClick={() => handleStatusUpdate('delivered')}
                disabled={updating}
                style={{
                  padding: '12px',
                  background: ROYAL_COLORS.gradientSuccess,
                  border: 'none',
                  borderRadius: '12px',
                  color: ROYAL_COLORS.textBright,
                  cursor: updating ? 'not-allowed' : 'pointer',
                  opacity: updating ? 0.5 : 1
                }}
              >
                {updating ? '⏳ Updating...' : '✅ Mark as Delivered'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateOrderForm({ dataStore, onCancel, onSuccess, theme }: {
  dataStore: FrontendDataStore;
  onCancel: () => void;
  onSuccess: () => void;
  theme: any;
}) {
  const { createOrder, loading, error } = useCreateOrder();
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerPhone || !formData.customerAddress) {
      Toast.error('Please fill all required fields');
      return;
    }

    Diagnostics.logEvent({ type: 'log', message: 'Creating order', data: formData });

    const result = await createOrder({
      customer_name: formData.customerName,
      customer_phone: formData.customerPhone,
      customer_address: formData.customerAddress,
      notes: formData.notes || undefined,
      status: 'pending'
    });

    if (result.success) {
      telegram.hapticFeedback('notification', 'success');
      Toast.success('Order created successfully');
      Diagnostics.logEvent({ type: 'log', message: 'Order created successfully', data: result.data });
      onSuccess();
    } else {
      Toast.error(result.error.message || 'Failed to create order');
      Diagnostics.logEvent({ type: 'error', message: 'Failed to create order', data: { error: result.error } });
    }
  };

  return (
    <div style={{ padding: '16px', minHeight: '100vh', backgroundColor: theme.bg_color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: theme.text_color }}>
          Create New Order
        </h1>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.link_color,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: theme.text_color }}>
            Customer Name *
          </label>
          <input
            type="text"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${theme.hint_color}40`,
              backgroundColor: theme.bg_color,
              color: theme.text_color,
              fontSize: '15px'
            }}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: theme.text_color }}>
            Phone *
          </label>
          <input
            type="tel"
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${theme.hint_color}40`,
              backgroundColor: theme.bg_color,
              color: theme.text_color,
              fontSize: '15px'
            }}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: theme.text_color }}>
            Address *
          </label>
          <textarea
            value={formData.customerAddress}
            onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${theme.hint_color}40`,
              backgroundColor: theme.bg_color,
              color: theme.text_color,
              fontSize: '15px',
              resize: 'vertical'
            }}
            disabled={loading}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: theme.text_color }}>
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${theme.hint_color}40`,
              backgroundColor: theme.bg_color,
              color: theme.text_color,
              fontSize: '15px',
              resize: 'vertical'
            }}
            disabled={loading}
          />
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#ff3b3020',
            border: '1px solid #ff3b30',
            borderRadius: '8px',
            color: '#ff3b30',
            fontSize: '14px'
          }}>
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '16px',
            background: loading ? theme.hint_color : ROYAL_COLORS.gradientPurple,
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? '⏳ Creating...' : '✅ Create Order'}
        </button>
      </form>
    </div>
  );
}
