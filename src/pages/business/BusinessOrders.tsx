import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { getStatusBadgeStyle, getStatusColor } from '../../utils/undergroundStyles';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundSection,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundTable,
  UndergroundStatCard,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
} from '../../components/underground';

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

    if (!currentBusinessId) return;

    const subscription = supabase
      .channel(`business-orders-${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${currentBusinessId}`
        },
        () => {
          logger.info('[BusinessOrders] Real-time update received');
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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

  const tableColumns = [
    {
      key: 'order_number',
      label: 'מספר הזמנה',
      render: (value: string, row: Order) => (
        <div style={{ fontWeight: undergroundTheme.typography.fontWeight.semibold }}>
          {value || `#${row.id.slice(0, 8)}`}
        </div>
      ),
    },
    {
      key: 'customer_name',
      label: 'לקוח',
    },
    {
      key: 'customer_phone',
      label: 'טלפון',
      render: (value: string) => value || '-',
    },
    {
      key: 'status',
      label: 'סטטוס',
      render: (value: OrderStatus) => (
        <span style={{
          ...getStatusBadgeStyle(value),
          padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.md}`,
          borderRadius: undergroundTheme.borderRadius.full,
          fontSize: undergroundTheme.typography.fontSize.sm,
          fontWeight: undergroundTheme.typography.fontWeight.semibold,
        }}>
          {getStatusLabel(value)}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'סכום',
      render: (value: number) => (
        <span style={{ fontWeight: undergroundTheme.typography.fontWeight.semibold }}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'תאריך',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      label: 'פעולות',
      render: (_: any, row: Order) => (
        <UndergroundButton
          variant="primary"
          onClick={() => navigate(`/business/orders/${row.id}`)}
          style={{
            padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.lg}`,
            fontSize: undergroundTheme.typography.fontSize.sm,
          }}
        >
          צפה
        </UndergroundButton>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundLoadingSpinner message="טוען הזמנות..." />
      </div>
    );
  }

  return (
    <div style={undergroundTheme.components.page}>
      <UndergroundHeader
        title="ניהול הזמנות"
        subtitle="נהל ועקוב אחר ההזמנות שלך"
        icon="📦"
        action={
          <UndergroundButton
            variant="primary"
            onClick={exportOrders}
            icon={<span>📥</span>}
          >
            ייצוא CSV
          </UndergroundButton>
        }
      />

      <UndergroundSection>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.xl,
        }}>
          <UndergroundStatCard
            icon="📦"
            label="סה״כ הזמנות"
            value={stats.total}
            onClick={() => setStatusFilter('all')}
            glow
          />
          <UndergroundStatCard
            icon="⏳"
            label="ממתינות"
            value={stats.pending}
            color={undergroundTheme.colors.status.warning}
            onClick={() => setStatusFilter('pending')}
          />
          <UndergroundStatCard
            icon="🔄"
            label="בטיפול"
            value={stats.inProgress}
            color={undergroundTheme.colors.status.info}
          />
          <UndergroundStatCard
            icon="✅"
            label="הושלמו"
            value={stats.completed}
            color={undergroundTheme.colors.status.success}
            onClick={() => setStatusFilter('delivered')}
          />
          <UndergroundStatCard
            icon="💰"
            label="הכנסות"
            value={formatCurrency(stats.revenue)}
            color={undergroundTheme.colors.accent.primary}
          />
        </div>
      </UndergroundSection>

      <UndergroundSection>
        <UndergroundCard>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: undergroundTheme.spacing.md,
            marginBottom: undergroundTheme.spacing.xl,
          }}>
            <UndergroundInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי מספר הזמנה, לקוח או טלפון..."
              fullWidth
            />

            <UndergroundSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as any)}
              options={[
                { value: 'all', label: 'כל הסטטוסים' },
                { value: 'pending', label: 'ממתין' },
                { value: 'confirmed', label: 'אושר' },
                { value: 'preparing', label: 'בהכנה' },
                { value: 'ready_for_pickup', label: 'מוכן לאיסוף' },
                { value: 'in_delivery', label: 'במשלוח' },
                { value: 'delivered', label: 'נמסר' },
                { value: 'cancelled', label: 'בוטל' },
              ]}
            />

            <UndergroundSelect
              value={dateFilter}
              onChange={(value) => {
                setDateFilter(value as any);
                loadOrders();
              }}
              options={[
                { value: 'all', label: 'כל התקופה' },
                { value: 'today', label: 'היום' },
                { value: 'week', label: 'שבוע אחרון' },
                { value: 'month', label: 'חודש אחרון' },
              ]}
            />

            <UndergroundButton
              variant="ghost"
              onClick={loadOrders}
              icon={<span>🔄</span>}
            >
              רענן
            </UndergroundButton>
          </div>

          <UndergroundTable
            columns={tableColumns}
            data={filteredOrders}
            loading={false}
            emptyMessage="לא נמצאו הזמנות"
            hover
          />

          <div style={{
            marginTop: undergroundTheme.spacing.xl,
            padding: undergroundTheme.spacing.lg,
            background: undergroundTheme.colors.glassmorphism.light,
            borderRadius: undergroundTheme.borderRadius.lg,
            color: undergroundTheme.colors.text.secondary,
            fontSize: undergroundTheme.typography.fontSize.sm,
          }}>
            <strong>סה״כ:</strong> {filteredOrders.length} הזמנות (מתוך {orders.length})
          </div>
        </UndergroundCard>
      </UndergroundSection>
    </div>
  );
}
