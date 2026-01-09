import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundStatCard,
  UndergroundButton,
  UndergroundLoadingSpinner,
  UndergroundSection,
} from '../../components/underground';
import { QuickActionGrid, QuickAction } from '../../components/organisms/QuickActionGrid';
import { ActivityFeed, Activity } from '../../components/organisms/ActivityFeed';

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
      <div style={undergroundTheme.components.page}>
        <UndergroundLoadingSpinner message="טוען נתוני פלטפורמה..." />
      </div>
    );
  }

  return (
    <div style={undergroundTheme.components.page}>
      <UndergroundHeader
        icon="🏛️"
        title="לוח בקרה ראשי"
        subtitle="ניהול ומעקב אחר הפלטפורמה כולה"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: undergroundTheme.spacing.lg,
          marginBottom: undergroundTheme.spacing['4xl'],
        }}
      >
        <UndergroundStatCard
          label="עסקים פעילים"
          value={formatNumber(stats.totalBusinesses)}
          icon="🏢"
          onClick={() => navigate('/admin/businesses')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          label="משתמשים פעילים"
          value={formatNumber(stats.activeUsers)}
          icon="👥"
          onClick={() => navigate('/admin/users')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          label="סה״כ הזמנות"
          value={formatNumber(stats.totalOrders)}
          icon="📦"
          onClick={() => navigate('/admin/orders')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          label="הכנסות כוללות"
          value={formatCurrency(stats.totalRevenue)}
          icon="💰"
          onClick={() => navigate('/admin/analytics')}
          style={{ cursor: 'pointer' }}
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

      <UndergroundSection>
        <h3 style={{
          fontSize: undergroundTheme.typography.fontSize.xl,
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          marginBottom: undergroundTheme.spacing.lg,
          color: undergroundTheme.colors.text.primary
        }}>
          קישורים מהירים
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.md
        }}>
          {[
            { label: 'סופר-אדמינים', path: '/admin/superadmins', icon: '👑' },
            { label: 'תשתיות', path: '/admin/infrastructures', icon: '🏭' },
            { label: 'קטלוג פלטפורמה', path: '/admin/platform-catalog', icon: '📦' },
            { label: 'בקשות נהגים', path: '/admin/driver-applications', icon: '🚗' },
            { label: 'דגלי תכונות', path: '/admin/feature-flags', icon: '🚩' },
            { label: 'הרשאות', path: '/admin/permissions', icon: '🔐' },
          ].map((link) => (
            <UndergroundCard
              key={link.path}
              onClick={() => navigate(link.path)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: undergroundTheme.spacing.md,
                transition: undergroundTheme.transitions.normal,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = undergroundTheme.effects.hover.lift;
                e.currentTarget.style.borderColor = undergroundTheme.colors.glassmorphism.borderHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = undergroundTheme.colors.glassmorphism.border;
              }}
            >
              <span style={{ fontSize: undergroundTheme.typography.fontSize['2xl'] }}>{link.icon}</span>
              <span style={{
                fontSize: undergroundTheme.typography.fontSize.base,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                color: undergroundTheme.colors.text.primary
              }}>
                {link.label}
              </span>
            </UndergroundCard>
          ))}
        </div>
      </UndergroundSection>
    </div>
  );
}
