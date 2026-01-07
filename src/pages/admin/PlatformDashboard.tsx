import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { QuickActionGrid, QuickAction } from '../../components/organisms/QuickActionGrid';
import { ActivityFeed, Activity } from '../../components/organisms/ActivityFeed';
import { tokens } from '../../styles/tokens';

interface PlatformStats {
  totalBusinesses: number;
  activeUsers: number;
  totalOrders: number;
  totalRevenue: number;
  recentActivity: Activity[];
}

export function PlatformDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats>({
    totalBusinesses: 0,
    activeUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatformStats();
  }, []);

  const loadPlatformStats = async () => {
    try {
      setLoading(true);

      const [
        { data: businesses, error: bizError },
        { data: profiles, error: profError },
        { data: orders, error: ordersError },
        { data: auditLogs, error: logsError }
      ] = await Promise.all([
        supabase.from('businesses').select('id, status, created_at'),
        supabase.from('profiles').select('id, role, created_at'),
        supabase.from('orders').select('id, total, status, created_at'),
        supabase.from('audit_logs').select('id, action, table_name, created_at').order('created_at', { ascending: false }).limit(10)
      ]);

      if (bizError) logger.error('Error loading businesses:', bizError);
      if (profError) logger.error('Error loading profiles:', profError);
      if (ordersError) logger.error('Error loading orders:', ordersError);
      if (logsError) logger.error('Error loading audit logs:', logsError);

      const totalBusinesses = businesses?.length || 0;
      const activeBusinesses = businesses?.filter(b => b.status === 'active').length || 0;
      const activeUsers = profiles?.filter(p => p.role !== 'guest').length || 0;
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentBusinesses = businesses?.filter(b => new Date(b.created_at) > oneDayAgo).length || 0;
      const recentUsers = profiles?.filter(p => new Date(p.created_at) > oneDayAgo).length || 0;
      const recentOrders = orders?.filter(o => new Date(o.created_at) > oneDayAgo).length || 0;

      const recentActivity: Activity[] = [];

      if (recentBusinesses > 0) {
        recentActivity.push({
          id: 'biz',
          type: 'business',
          message: `${recentBusinesses} עסקים חדשים נרשמו`,
          time: 'היום'
        });
      }

      if (recentUsers > 0) {
        recentActivity.push({
          id: 'users',
          type: 'user',
          message: `${recentUsers} משתמשים חדשים הצטרפו`,
          time: 'היום'
        });
      }

      if (recentOrders > 0) {
        recentActivity.push({
          id: 'orders',
          type: 'order',
          message: `${recentOrders} הזמנות חדשות בוצעו`,
          time: 'היום'
        });
      }

      if (auditLogs && auditLogs.length > 0) {
        auditLogs.slice(0, 3).forEach((log, idx) => {
          const timeAgo = getTimeAgo(new Date(log.created_at));
          recentActivity.push({
            id: `log-${idx}`,
            type: 'alert',
            message: `${log.action} ב-${log.table_name}`,
            time: timeAgo
          });
        });
      }

      const newStats: PlatformStats = {
        totalBusinesses: activeBusinesses,
        activeUsers,
        totalOrders,
        totalRevenue,
        recentActivity
      };

      setStats(newStats);
      logger.info('[PlatformDashboard] Stats loaded', newStats);
    } catch (error) {
      logger.error('[PlatformDashboard] Failed to load stats:', error);
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
    { id: '1', label: 'ניהול עסקים', icon: '🏢', onClick: () => navigate('/admin/businesses') },
    { id: '2', label: 'ניהול משתמשים', icon: '👥', onClick: () => navigate('/admin/users') },
    { id: '3', label: 'צפייה בהזמנות', icon: '📦', onClick: () => navigate('/admin/orders') },
    { id: '4', label: 'ניהול נהגים', icon: '🚗', onClick: () => navigate('/admin/drivers') },
    { id: '5', label: 'לוגים ואבטחה', icon: '🔐', onClick: () => navigate('/admin/logs') },
    { id: '6', label: 'הגדרות מערכת', icon: '⚙️', onClick: () => navigate('/admin/system-settings') },
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
            <div style={{ fontSize: '18px', fontWeight: '600' }}>טוען נתוני פלטפורמה...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="🏛️"
        title="לוח בקרה ראשי"
        subtitle="ניהול ומעקב אחר הפלטפורמה כולה"
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
          label="עסקים פעילים"
          value={formatNumber(stats.totalBusinesses)}
          change="+12%"
          trend="up"
          icon="🏢"
          onClick={() => navigate('/admin/businesses')}
        />
        <MetricCard
          label="משתמשים פעילים"
          value={formatNumber(stats.activeUsers)}
          change="+8%"
          trend="up"
          icon="👥"
          onClick={() => navigate('/admin/users')}
        />
        <MetricCard
          label="סה״כ הזמנות"
          value={formatNumber(stats.totalOrders)}
          change="+15%"
          trend="up"
          icon="📦"
          onClick={() => navigate('/admin/orders')}
        />
        <MetricCard
          label="הכנסות כוללות"
          value={formatCurrency(stats.totalRevenue)}
          change="+22%"
          trend="up"
          icon="💰"
          onClick={() => navigate('/admin/analytics')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        <QuickActionGrid actions={quickActions} title="פעולות מהירות" />
        <ActivityFeed
          activities={stats.recentActivity.length > 0 ? stats.recentActivity : [
            { id: '1', type: 'info', message: 'אין פעילות אחרונה', time: 'כעת' }
          ]}
          title="פעילות אחרונה"
          maxHeight="400px"
        />
      </div>

      <div style={{
        marginTop: '32px',
        padding: '24px',
        background: tokens.colors.background.card,
        borderRadius: '16px',
        border: `1px solid ${tokens.colors.background.cardBorder}`
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          marginBottom: '16px',
          color: tokens.colors.text
        }}>
          קישורים מהירים
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {[
            { label: 'סופר-אדמינים', path: '/admin/superadmins', icon: '👑' },
            { label: 'תשתיות', path: '/admin/infrastructures', icon: '🏭' },
            { label: 'קטלוג פלטפורמה', path: '/admin/platform-catalog', icon: '📦' },
            { label: 'בקשות נהגים', path: '/admin/driver-applications', icon: '🚗' },
            { label: 'Feature Flags', path: '/admin/feature-flags', icon: '🚩' },
            { label: 'הרשאות', path: '/admin/permissions', icon: '🔐' },
          ].map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                padding: '16px',
                background: tokens.colors.bg,
                border: `1px solid ${tokens.colors.background.cardBorder}`,
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '24px' }}>{link.icon}</span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text
              }}>
                {link.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
