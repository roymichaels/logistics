import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { QuickActionGrid, QuickAction } from '../../components/organisms/QuickActionGrid';
import { ActivityFeed, Activity } from '../../components/organisms/ActivityFeed';
import { tokens } from '../../styles/tokens';

interface BusinessStats {
  totalOrders: number;
  activeTeamMembers: number;
  totalRevenue: number;
  totalDrivers: number;
  lowStockItems: number;
  pendingOrders: number;
  recentActivity: Activity[];
}

export function BusinessOwnerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [stats, setStats] = useState<BusinessStats>({
    totalOrders: 0,
    activeTeamMembers: 0,
    totalRevenue: 0,
    totalDrivers: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState<string>('');

  useEffect(() => {
    loadBusinessStats();
  }, [currentBusinessId]);

  const loadBusinessStats = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[BusinessOwnerDashboard] No business context');
        return;
      }

      const [
        { data: business },
        { data: orders },
        { data: teamMembers },
        { data: drivers },
        { data: inventory },
        { data: auditLogs }
      ] = await Promise.all([
        supabase.from('businesses').select('name').eq('id', currentBusinessId).single(),
        supabase.from('orders').select('id, total, status, created_at').eq('business_id', currentBusinessId),
        supabase.from('profiles').select('id, role').eq('business_id', currentBusinessId),
        supabase.from('drivers').select('id, status').eq('business_id', currentBusinessId),
        supabase.from('inventory').select('id, quantity, reorder_point').eq('business_id', currentBusinessId),
        supabase.from('audit_logs').select('id, action, table_name, created_at').eq('business_id', currentBusinessId).order('created_at', { ascending: false }).limit(10)
      ]);

      if (business) {
        setBusinessName(business.name);
      }

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'confirmed').length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;
      const activeTeamMembers = teamMembers?.filter(m => m.role !== 'customer' && m.role !== 'guest').length || 0;
      const totalDrivers = drivers?.filter(d => d.status === 'active' || d.status === 'available').length || 0;
      const lowStockItems = inventory?.filter(i => i.quantity <= i.reorder_point).length || 0;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentOrders = orders?.filter(o => new Date(o.created_at) > oneDayAgo).length || 0;
      const recentActivity: Activity[] = [];

      if (recentOrders > 0) {
        recentActivity.push({
          id: 'orders',
          type: 'order',
          message: `${recentOrders} הזמנות חדשות בוצעו`,
          time: 'היום'
        });
      }

      if (lowStockItems > 0) {
        recentActivity.push({
          id: 'stock',
          type: 'alert',
          message: `${lowStockItems} מוצרים במלאי נמוך`,
          time: 'עכשיו'
        });
      }

      if (auditLogs && auditLogs.length > 0) {
        auditLogs.slice(0, 5).forEach((log, idx) => {
          const timeAgo = getTimeAgo(new Date(log.created_at));
          recentActivity.push({
            id: `log-${idx}`,
            type: log.action === 'DELETE' ? 'alert' : 'info',
            message: `${log.action} ב-${log.table_name}`,
            time: timeAgo
          });
        });
      }

      const newStats: BusinessStats = {
        totalOrders,
        activeTeamMembers,
        totalRevenue,
        totalDrivers,
        lowStockItems,
        pendingOrders,
        recentActivity
      };

      setStats(newStats);
      logger.info('[BusinessOwnerDashboard] Stats loaded', newStats);
    } catch (error) {
      logger.error('[BusinessOwnerDashboard] Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} שניות`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} דקות`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} שעות`;
    const days = Math.floor(hours / 24);
    return `${days} ימים`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('he-IL').format(num);
  };

  const quickActions: QuickAction[] = [
    { id: '1', label: 'הזמנה חדשה', icon: '📦', onClick: () => navigate('/business/orders') },
    { id: '2', label: 'ניהול צוות', icon: '👥', onClick: () => navigate('/business/team') },
    { id: '3', label: 'בדיקת מלאי', icon: '📊', onClick: () => navigate('/business/inventory') },
    { id: '4', label: 'ניהול נהגים', icon: '🚗', onClick: () => navigate('/business/drivers') },
    { id: '5', label: 'דוחות ואנליטיקה', icon: '📈', onClick: () => navigate('/business/analytics') },
    { id: '6', label: 'הגדרות עסק', icon: '⚙️', onClick: () => navigate('/business/settings') },
    { id: '7', label: 'יומני ביקורת', icon: '📋', onClick: () => navigate('/business/audit-logs') },
    { id: '8', label: 'ניהול לקוחות', icon: '👤', onClick: () => navigate('/business/customers') },
  ];

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
            <div style={{ fontSize: '18px', fontWeight: '600' }}>טוען נתוני עסק...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="🏢"
        title={businessName || 'לוח בקרה עסקי'}
        subtitle="סקירה מקיפה של הפעילות העסקית שלך"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <MetricCard
          label="סה״כ הזמנות"
          value={formatNumber(stats.totalOrders)}
          change={stats.totalOrders > 0 ? '+' + Math.round((stats.pendingOrders / stats.totalOrders) * 100) + '%' : '0%'}
          trend="up"
          icon="📦"
        />
        <MetricCard
          label="הזמנות ממתינות"
          value={formatNumber(stats.pendingOrders)}
          icon="⏳"
        />
        <MetricCard
          label="הכנסות כוללות"
          value={formatCurrency(stats.totalRevenue)}
          change="+8%"
          trend="up"
          icon="💰"
        />
        <MetricCard
          label="חברי צוות פעילים"
          value={formatNumber(stats.activeTeamMembers)}
          icon="👥"
        />
        <MetricCard
          label="נהגים זמינים"
          value={formatNumber(stats.totalDrivers)}
          icon="🚗"
        />
        <MetricCard
          label="פריטים במלאי נמוך"
          value={formatNumber(stats.lowStockItems)}
          icon="⚠️"
          trend={stats.lowStockItems > 0 ? 'down' : undefined}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '16px',
            color: tokens.colors.text
          }}>
            פעולות מהירות
          </h3>
          <QuickActionGrid actions={quickActions} />
        </div>

        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '16px',
            color: tokens.colors.text
          }}>
            פעילות אחרונה
          </h3>
          <ActivityFeed activities={stats.recentActivity} />
        </div>
      </div>
    </PageContainer>
  );
}
