import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { DataStore, Order, User } from '../data/types';

interface OrdersProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Orders({ dataStore, onNavigate }: OrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const theme = telegram.themeParams;

  useEffect(() => {
    loadData();
  }, [filter, searchQuery]);

  useEffect(() => {
    telegram.setBackButton(() => {
      if (selectedOrder) {
        setSelectedOrder(null);
      } else if (showCreateForm) {
        setShowCreateForm(false);
      } else {
        onNavigate('dashboard');
      }
    });

    return () => telegram.hideBackButton();
  }, [selectedOrder, showCreateForm, onNavigate]);

  const loadData = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      const ordersList = await dataStore.listOrders?.({
        status: filter === 'all' ? undefined : filter,
        q: searchQuery || undefined
      }) || [];
      
      setOrders(ordersList);
    } catch (error) {
      console.error('Failed to load orders:', error);
      telegram.showAlert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    telegram.hapticFeedback('selection');
    setShowCreateForm(true);
  };

  useEffect(() => {
    if (user?.role === 'dispatcher' && !selectedOrder && !showCreateForm) {
      telegram.setMainButton('Create Order', handleCreateOrder);
    } else {
      telegram.hideMainButton();
    }
  }, [user, selectedOrder, showCreateForm]);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        Loading orders...
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
          loadData();
        }}
        theme={theme}
      />
    );
  }

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        dataStore={dataStore}
        onBack={() => setSelectedOrder(null)}
        onUpdate={loadData}
        theme={theme}
      />
    );
  }

  return (
    <div style={{ 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '24px', 
          fontWeight: '600'
        }}>
          Orders
        </h1>

        {/* Search */}
        <input
          type="text"
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: `1px solid ${theme.hint_color}40`,
            borderRadius: '8px',
            backgroundColor: theme.secondary_bg_color || '#f1f1f1',
            color: theme.text_color,
            fontSize: '16px',
            marginBottom: '16px'
          }}
        />

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {['all', 'new', 'assigned', 'enroute', 'delivered'].map((status) => (
            <button
              key={status}
              onClick={() => {
                telegram.hapticFeedback('selection');
                setFilter(status);
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: filter === status ? theme.button_color : theme.secondary_bg_color,
                color: filter === status ? theme.button_text_color : theme.text_color,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div style={{ padding: '16px' }}>
        {orders.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: theme.hint_color
          }}>
            No orders found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => {
                  telegram.hapticFeedback('selection');
                  setSelectedOrder(order);
                }}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick, theme }: { 
  order: Order; 
  onClick: () => void;
  theme: any;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#ff3b30';
      case 'assigned': return '#ff9500';
      case 'enroute': return '#007aff';
      case 'delivered': return '#34c759';
      case 'failed': return '#ff3b30';
      default: return theme.hint_color;
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        borderRadius: '12px',
        cursor: 'pointer',
        border: `1px solid ${theme.hint_color}20`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h3 style={{ 
            margin: '0 0 4px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: theme.text_color
          }}>
            {order.customer}
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            color: theme.hint_color,
            lineHeight: '1.4'
          }}>
            {order.address}
          </p>
        </div>
        
        <div style={{
          padding: '4px 8px',
          borderRadius: '12px',
          backgroundColor: getStatusColor(order.status) + '20',
          color: getStatusColor(order.status),
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {order.status.toUpperCase()}
        </div>
      </div>

      {order.eta && (
        <p style={{ 
          margin: '8px 0 0 0', 
          fontSize: '12px', 
          color: theme.hint_color
        }}>
          ETA: {new Date(order.eta).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function OrderDetail({ order, dataStore, onBack, onUpdate, theme }: {
  order: Order;
  dataStore: DataStore;
  onBack: () => void;
  onUpdate: () => void;
  theme: any;
}) {
  const handleStatusUpdate = async (newStatus: Order['status']) => {
    try {
      await dataStore.updateOrder?.(order.id, { status: newStatus });
      telegram.hapticFeedback('notification', 'success');
      onUpdate();
      onBack();
    } catch (error) {
      console.error('Failed to update order:', error);
      telegram.showAlert('Failed to update order status');
    }
  };

  return (
    <div style={{ 
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        margin: '0 0 24px 0', 
        fontSize: '24px', 
        fontWeight: '600'
      }}>
        Order Details
      </h1>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
          {order.customer}
        </h2>
        <p style={{ margin: '0 0 16px 0', color: theme.hint_color }}>
          {order.address}
        </p>
        
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: theme.secondary_bg_color,
          display: 'inline-block',
          marginBottom: '16px'
        }}>
          Status: <strong>{order.status.toUpperCase()}</strong>
        </div>

        {order.eta && (
          <p style={{ margin: '0 0 16px 0', color: theme.hint_color }}>
            ETA: {new Date(order.eta).toLocaleString()}
          </p>
        )}

        {order.notes && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Notes
            </h3>
            <p style={{ margin: 0, color: theme.hint_color }}>
              {order.notes}
            </p>
          </div>
        )}

        {order.items && order.items.length > 0 && (
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Items
            </h3>
            {order.items.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: index < order.items!.length - 1 ? `1px solid ${theme.hint_color}20` : 'none'
              }}>
                <span>{item.name}</span>
                <span>×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Update Buttons */}
      {order.status !== 'delivered' && order.status !== 'failed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {order.status === 'new' && (
            <button
              onClick={() => handleStatusUpdate('assigned')}
              style={{
                padding: '12px',
                backgroundColor: theme.button_color,
                color: theme.button_text_color,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Assign Order
            </button>
          )}
          
          {order.status === 'assigned' && (
            <button
              onClick={() => handleStatusUpdate('enroute')}
              style={{
                padding: '12px',
                backgroundColor: '#007aff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Mark En Route
            </button>
          )}
          
          {order.status === 'enroute' && (
            <button
              onClick={() => handleStatusUpdate('delivered')}
              style={{
                padding: '12px',
                backgroundColor: '#34c759',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Mark Delivered
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CreateOrderForm({ dataStore, onCancel, onSuccess, theme }: {
  dataStore: DataStore;
  onCancel: () => void;
  onSuccess: () => void;
  theme: any;
}) {
  const [formData, setFormData] = useState({
    customer: '',
    address: '',
    notes: '',
    eta: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer || !formData.address) {
      telegram.showAlert('Please fill in customer and address fields');
      return;
    }

    setLoading(true);
    try {
      await dataStore.createOrder?.({
        customer: formData.customer,
        address: formData.address,
        notes: formData.notes || undefined,
        eta: formData.eta || undefined,
        status: 'new',
        created_by: 'current_user' // This would come from auth context
      });
      
      telegram.hapticFeedback('notification', 'success');
      onSuccess();
    } catch (error) {
      console.error('Failed to create order:', error);
      telegram.showAlert('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    telegram.setMainButton('Create Order', () => {
      const form = document.getElementById('create-order-form') as HTMLFormElement;
      form?.requestSubmit();
    });

    return () => telegram.hideMainButton();
  }, []);

  return (
    <div style={{ 
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        margin: '0 0 24px 0', 
        fontSize: '24px', 
        fontWeight: '600'
      }}>
        Create Order
      </h1>

      <form id="create-order-form" onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '16px', 
            fontWeight: '600' 
          }}>
            Customer *
          </label>
          <input
            type="text"
            value={formData.customer}
            onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '8px',
              backgroundColor: theme.secondary_bg_color || '#f1f1f1',
              color: theme.text_color,
              fontSize: '16px'
            }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '16px', 
            fontWeight: '600' 
          }}>
            Address *
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '8px',
              backgroundColor: theme.secondary_bg_color || '#f1f1f1',
              color: theme.text_color,
              fontSize: '16px',
              resize: 'vertical'
            }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '16px', 
            fontWeight: '600' 
          }}>
            ETA
          </label>
          <input
            type="datetime-local"
            value={formData.eta}
            onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '8px',
              backgroundColor: theme.secondary_bg_color || '#f1f1f1',
              color: theme.text_color,
              fontSize: '16px'
            }}
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '16px', 
            fontWeight: '600' 
          }}>
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '8px',
              backgroundColor: theme.secondary_bg_color || '#f1f1f1',
              color: theme.text_color,
              fontSize: '16px',
              resize: 'vertical'
            }}
            disabled={loading}
          />
        </div>
      </form>
    </div>
  );
}