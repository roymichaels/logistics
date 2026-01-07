import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { tokens } from '../../styles/tokens';

interface Order {
  id: string;
  business_id: string;
  customer_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
  delivery_address: any;
  businesses?: { name: string };
  profiles?: { name: string; email: string };
}

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled',
  'failed'
];

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          businesses (name),
          profiles (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('[AdminOrders] Failed to load orders', error);
        Toast.error('Failed to load orders');
        return;
      }

      setOrders(data || []);
      logger.info('[AdminOrders] Loaded orders', { count: data?.length });
    } catch (error) {
      logger.error('[AdminOrders] Exception loading orders', error);
      Toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        logger.error('[AdminOrders] Failed to update status', error);
        Toast.error('Failed to update order status');
        return;
      }

      Toast.success('Order status updated');
      loadOrders();
    } catch (error) {
      logger.error('[AdminOrders] Exception updating status', error);
      Toast.error('An error occurred');
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.profiles?.name && order.profiles.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.profiles?.email && order.profiles.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.businesses?.name && order.businesses.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return tokens.colors.status.success;
      case 'cancelled':
      case 'failed':
        return tokens.colors.status.error;
      case 'in_transit':
      case 'picked_up':
        return tokens.colors.status.info;
      case 'pending':
      case 'confirmed':
        return tokens.colors.status.warning;
      default:
        return tokens.colors.subtle;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ILS'): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: tokens.colors.text
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>טוען הזמנות...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  const totalRevenue = orders.reduce((sum, order) => {
    if (order.status === 'delivered') {
      return sum + Number(order.total || 0);
    }
    return sum;
  }, 0);

  const ordersByStatus = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PageContainer>
      <PageHeader
        title="ניהול הזמנות"
        subtitle={`סה״כ ${orders.length} הזמנות במערכת`}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.text, marginBottom: '4px' }}>
            {orders.length}
          </div>
          <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>סה״כ הזמנות</div>
        </Card>
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.status.success, marginBottom: '4px' }}>
            {ordersByStatus.delivered || 0}
          </div>
          <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>הושלמו</div>
        </Card>
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.status.info, marginBottom: '4px' }}>
            {(ordersByStatus.in_transit || 0) + (ordersByStatus.picked_up || 0)}
          </div>
          <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>בדרך</div>
        </Card>
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.brand.primary, marginBottom: '4px' }}>
            {formatCurrency(totalRevenue)}
          </div>
          <div style={{ fontSize: '14px', color: tokens.colors.subtle }}>הכנסות</div>
        </Card>
      </div>

      <Card style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="חיפוש לפי מספר הזמנה, לקוח, עסק..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              background: tokens.colors.background.card,
              color: tokens.colors.text,
              minWidth: '150px',
              fontSize: '14px'
            }}
          >
            <option value="all">כל הסטטוסים</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <Button onClick={loadOrders}>רענן</Button>
        </div>
      </Card>

      {filteredOrders.length === 0 ? (
        <Card style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <p style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            לא נמצאו הזמנות
          </p>
          <p style={{ color: tokens.colors.subtle }}>
            {searchQuery || statusFilter !== 'all' ? 'נסה לשנות את המסננים' : 'אין הזמנות במערכת'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOrders.map((order) => (
            <Card key={order.id} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: tokens.gradients.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      color: 'white'
                    }}>
                      📦
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: tokens.colors.text }}>
                        הזמנה #{order.order_number}
                      </h3>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: getStatusColor(order.status),
                          background: `${getStatusColor(order.status)}20`,
                          marginTop: '4px'
                        }}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '8px',
                    color: tokens.colors.subtle,
                    fontSize: '14px'
                  }}>
                    {order.businesses?.name && (
                      <div>
                        <strong>עסק:</strong> {order.businesses.name}
                      </div>
                    )}
                    {order.profiles?.name && (
                      <div>
                        <strong>לקוח:</strong> {order.profiles.name}
                      </div>
                    )}
                    {order.profiles?.email && (
                      <div>
                        <strong>אימייל:</strong> {order.profiles.email}
                      </div>
                    )}
                    <div>
                      <strong>סכום:</strong> {formatCurrency(Number(order.total || 0), order.currency)}
                    </div>
                    <div>
                      <strong>סטטוס תשלום:</strong> {order.payment_status}
                    </div>
                    <div>
                      <strong>תאריך:</strong> {new Date(order.created_at).toLocaleString('he-IL')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
                  <select
                    value={order.status}
                    onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${tokens.colors.background.cardBorder}`,
                      background: tokens.colors.background.card,
                      color: tokens.colors.text,
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
