import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { tokens } from '../../styles/tokens';

interface Customer {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  created_at: string;
  segment: 'high_value' | 'medium_value' | 'low_value' | 'new';
}

export function BusinessCustomers() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'orders' | 'spent' | 'recent'>('spent');

  useEffect(() => {
    loadCustomers();
  }, [currentBusinessId]);

  const loadCustomers = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[BusinessCustomers] No business context');
        return;
      }

      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_id, total, created_at, status')
        .eq('business_id', currentBusinessId);

      if (error) {
        logger.error('[BusinessCustomers] Error loading orders:', error);
        return;
      }

      const customerMap = new Map<string, { orders: number; spent: number; lastOrder?: string }>();

      orders?.forEach(order => {
        if (order.customer_id) {
          const existing = customerMap.get(order.customer_id) || { orders: 0, spent: 0 };
          customerMap.set(order.customer_id, {
            orders: existing.orders + 1,
            spent: existing.spent + (Number(order.total) || 0),
            lastOrder: !existing.lastOrder || order.created_at > existing.lastOrder
              ? order.created_at
              : existing.lastOrder
          });
        }
      });

      const customerIds = Array.from(customerMap.keys());

      if (customerIds.length === 0) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at')
        .in('id', customerIds);

      const enrichedCustomers: Customer[] = (profiles || []).map(profile => {
        const stats = customerMap.get(profile.id)!;
        const avgOrderValue = stats.spent / stats.orders;

        let segment: Customer['segment'] = 'new';
        if (stats.orders >= 5) {
          if (avgOrderValue > 200) segment = 'high_value';
          else if (avgOrderValue > 100) segment = 'medium_value';
          else segment = 'low_value';
        }

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          total_orders: stats.orders,
          total_spent: stats.spent,
          last_order_date: stats.lastOrder,
          created_at: profile.created_at,
          segment
        };
      });

      setCustomers(enrichedCustomers);
      logger.info('[BusinessCustomers] Customers loaded:', enrichedCustomers.length);
    } catch (error) {
      logger.error('[BusinessCustomers] Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSegmentLabel = (segment: string): string => {
    switch (segment) {
      case 'high_value': return 'ערך גבוה';
      case 'medium_value': return 'ערך בינוני';
      case 'low_value': return 'ערך נמוך';
      case 'new': return 'חדש';
      default: return segment;
    }
  };

  const getSegmentColor = (segment: string): string => {
    switch (segment) {
      case 'high_value': return tokens.colors.status.success;
      case 'medium_value': return tokens.colors.status.info;
      case 'low_value': return tokens.colors.status.warning;
      case 'new': return tokens.colors.accent;
      default: return tokens.colors.subtle;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'אף פעם';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short' }).format(date);
  };

  const exportCustomers = () => {
    const csvData = [
      ['שם', 'אימייל', 'טלפון', 'הזמנות', 'סה״כ הוצאה', 'הזמנה אחרונה', 'סגמנט'],
      ...filteredCustomers.map(c => [
        c.full_name || '',
        c.email,
        c.phone || '',
        c.total_orders,
        c.total_spent,
        formatDate(c.last_order_date),
        getSegmentLabel(c.segment)
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    logger.info('[BusinessCustomers] Customers exported');
  };

  const filteredCustomers = customers
    .filter(c => {
      const matchesSearch = searchQuery === '' ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery);

      const matchesSegment = segmentFilter === 'all' || c.segment === segmentFilter;

      return matchesSearch && matchesSegment;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.full_name || a.email).localeCompare(b.full_name || b.email);
        case 'orders':
          return b.total_orders - a.total_orders;
        case 'spent':
          return b.total_spent - a.total_spent;
        case 'recent':
          return (b.last_order_date || '').localeCompare(a.last_order_date || '');
        default:
          return 0;
      }
    });

  const stats = {
    total: customers.length,
    highValue: customers.filter(c => c.segment === 'high_value').length,
    totalRevenue: customers.reduce((sum, c) => sum + c.total_spent, 0)
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: tokens.colors.text }}>טוען לקוחות...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="👥"
        title="ניהול לקוחות"
        subtitle="נהל ועקוב אחר הלקוחות שלך"
        actionButton={
          <button
            onClick={exportCustomers}
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
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.text }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '14px', color: tokens.colors.subtle, marginTop: '4px' }}>
              סה״כ לקוחות
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.status.success }}>
              {stats.highValue}
            </div>
            <div style={{ fontSize: '14px', color: tokens.colors.subtle, marginTop: '4px' }}>
              לקוחות VIP
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: tokens.colors.accent }}>
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div style={{ fontSize: '14px', color: tokens.colors.subtle, marginTop: '4px' }}>
              סה״כ הכנסות
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', marginBottom: '16px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
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
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          >
            <option value="all">כל הסגמנטים</option>
            <option value="high_value">ערך גבוה</option>
            <option value="medium_value">ערך בינוני</option>
            <option value="low_value">ערך נמוך</option>
            <option value="new">חדשים</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          >
            <option value="spent">לפי הוצאה</option>
            <option value="orders">לפי הזמנות</option>
            <option value="recent">לפי תאריך אחרון</option>
            <option value="name">לפי שם</option>
          </select>
        </div>
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.colors.border}` }}>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>לקוח</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>טלפון</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>הזמנות</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>סה״כ הוצאה</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>הזמנה אחרונה</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>סגמנט</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.subtle }}>
                    לא נמצאו לקוחות
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: tokens.colors.text }}>
                        {customer.full_name || 'ללא שם'}
                      </div>
                      <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginTop: '2px' }}>
                        {customer.email}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {customer.phone || '-'}
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {customer.total_orders}
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text, fontWeight: '600' }}>
                      {formatCurrency(customer.total_spent)}
                    </td>
                    <td style={{ padding: '16px', color: tokens.colors.text }}>
                      {formatDate(customer.last_order_date)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: getSegmentColor(customer.segment) + '20',
                          color: getSegmentColor(customer.segment)
                        }}
                      >
                        {getSegmentLabel(customer.segment)}
                      </span>
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
          <strong>סה״כ:</strong> {filteredCustomers.length} לקוחות (מתוך {customers.length})
        </div>
      </Card>
    </PageContainer>
  );
}
