import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { StatCard } from '../../components/molecules/StatCard';
import { tokens } from '../../styles/tokens';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'in_delivery' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
  delivery_address?: string;
  customer_name?: string;
  customer_phone?: string;
}

export function BusinessOrders() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  useEffect(() => {
    loadOrders();
  }, [currentBusinessId]);

  const loadOrders = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[BusinessOrders] No business context');
        return;
      }

      let query = supabase
        .from('orders')
        .select('id, order_number, customer_id, status, total, created_at, updated_at, delivery_address')
        .eq('business_id', currentBusinessId)
        .order('created_at', { ascending: false });

      if (dateFilter !== 'all') {
        const now = new Date();
        let dateThreshold = new Date();

        if (dateFilter === 'today') {
          dateThreshold.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'week') {
          dateThreshold.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
          dateThreshold.setDate(now.getDate() - 30);
        }

        query = query.gte('created_at', dateThreshold.toISOString());
      }

      const { data: ordersData, error } = await query;

      if (error) {
        logger.error('[BusinessOrders] Error loading orders:', error);
        return;
      }

      const customerIds = Array.from(new Set(ordersData?.map(o => o.customer_id).filter(Boolean)));

      let profilesMap = new Map<string, any>();

      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', customerIds);

        profiles?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const enrichedOrders = (ordersData || []).map(order => {
        const profile = order.customer_id ? profilesMap.get(order.customer_id) : null;
        return {
          ...order,
          customer_name: profile?.full_name || 'לקוח אנונימי',
          customer_phone: profile?.phone || ''
        };
      });

      setOrders(enrichedOrders);
      logger.info('[BusinessOrders] Orders loaded:', enrichedOrders.length);
    } catch (error) {
      logger.error('[BusinessOrders] Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    const labels: Record<OrderStatus, string> = {
      pending: 'ממתין',
      confirmed: 'אושר',
      preparing: 'בהכנה',
      ready_for_pickup: 'מוכן לאיסוף',
      in_delivery: 'במשלוח',
      delivered: 'נמסר',
      cancelled: 'בוטל'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: OrderStatus): string => {
    const colors: Record<OrderStatus, string> = {
      pending: tokens.colors.status.warning,
      confirmed: tokens.colors.status.info,
      preparing: tokens.colors.accent,
      ready_for_pickup: tokens.colors.status.success,
      in_delivery: tokens.colors.primary,
      delivered: tokens.colors.status.success,
      cancelled: tokens.colors.status.error
    };
    return colors[status] || tokens.colors.subtle;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  const exportOrders = () => {
    const csvData = [
      ['מספר הזמנה', 'לקוח', 'טלפון', 'סטטוס', 'סכום', 'תאריך'],
      ...filteredOrders.map(o => [
        o.order_number,
        o.customer_name || '',
        o.customer_phone || '',
        getStatusLabel(o.status),
        o.total,
        formatDate(o.created_at)
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    logger.info('[BusinessOrders] Orders exported');
  };

  const filteredOrders = orders
    .filter(o => {
      const matchesSearch = searchQuery === '' ||
        o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_phone?.includes(searchQuery) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    inProgress: orders.filter(o => ['confirmed', 'preparing', 'ready_for_pickup', 'in_delivery'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'delivered').length,
    revenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0)
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: tokens.colors.text }}>טוען הזמנות...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="📦"
        title="ניהול הזמנות"
        subtitle="נהל ועקוב אחר ההזמנות שלך"
        actionButton={
          <button
            onClick={exportOrders}
            style={{
              padding: '10px 20px',
              background: tokens.colors.accent,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ייצוא CSV
          </button>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          icon="📦"
          label="סה״כ הזמנות"
          value={stats.total}
          onClick={() => setStatusFilter('all')}
        />
        <StatCard
          icon="⏳"
          label="ממתינות"
          value={stats.pending}
          color={tokens.colors.status.warning}
          onClick={() => setStatusFilter('pending')}
        />
        <StatCard
          icon="🔄"
          label="בטיפול"
          value={stats.inProgress}
          color={tokens.colors.status.info}
        />
        <StatCard
          icon="✅"
          label="הושלמו"
          value={stats.completed}
          color={tokens.colors.status.success}
          onClick={() => setStatusFilter('delivered')}
        />
        <StatCard
          icon="💰"
          label="הכנסות"
          value={formatCurrency(stats.revenue)}
          color={tokens.colors.accent}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '12px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי מספר הזמנה, לקוח או טלפון..."
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="pending">ממתין</option>
            <option value="confirmed">אושר</option>
            <option value="preparing">בהכנה</option>
            <option value="ready_for_pickup">מוכן לאיסוף</option>
            <option value="in_delivery">במשלוח</option>
            <option value="delivered">נמסר</option>
            <option value="cancelled">בוטל</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as any);
              loadOrders();
            }}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          >
            <option value="all">כל התקופה</option>
            <option value="today">היום</option>
            <option value="week">שבוע אחרון</option>
            <option value="month">חודש אחרון</option>
          </select>

          <button
            onClick={loadOrders}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text,
              cursor: 'pointer'
            }}
          >
            🔄
          </button>
        </div>
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.colors.border}` }}>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>מספר הזמנה</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>לקוח</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>טלפון</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>סטטוס</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>סכום</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>תאריך</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.subtle }}>
                    לא נמצאו הזמנות
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: tokens.colors.text }}>
                        {order.order_number || `#${order.id.slice(0, 8)}`}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {order.customer_name}
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {order.customer_phone || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: getStatusColor(order.status) + '20',
                          color: getStatusColor(order.status)
                        }}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text, fontWeight: '600' }}>
                      {formatCurrency(order.total)}
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => navigate(`/business/orders/${order.id}`)}
                        style={{
                          padding: '6px 12px',
                          background: tokens.colors.accent,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        צפה
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: tokens.colors.surface,
          borderRadius: '8px',
          color: tokens.colors.subtle,
          fontSize: '14px'
        }}>
          <strong>סה״כ:</strong> {filteredOrders.length} הזמנות (מתוך {orders.length})
        </div>
      </Card>
    </PageContainer>
  );
}
