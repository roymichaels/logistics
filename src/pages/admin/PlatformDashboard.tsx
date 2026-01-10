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
          message: `${recentBusinesses} new businesses registered`,
          time: 'Today'
        });
      }

      if (recentUsers > 0) {
        recentActivity.push({
          id: 'users',
          type: 'user',
          message: `${recentUsers} new users joined`,
          time: 'Today'
        });
      }

      if (recentOrders > 0) {
        recentActivity.push({
          id: 'orders',
          type: 'order',
          message: `${recentOrders} new orders placed`,
          time: 'Today'
        });
      }

      if (auditLogs && auditLogs.length > 0) {
        auditLogs.slice(0, 3).forEach((log, idx) => {
          const timeAgo = getTimeAgo(new Date(log.created_at));
          recentActivity.push({
            id: `log-${idx}`,
            type: 'alert',
            message: `${log.action} in ${log.table_name}`,
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

    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const quickActions: QuickAction[] = [
    { id: '1', label: 'Manage Businesses', icon: '🏢', onClick: () => navigate('/admin/businesses') },
    { id: '2', label: 'Manage Users', icon: '👥', onClick: () => navigate('/admin/users') },
    { id: '3', label: 'View Orders', icon: '📦', onClick: () => navigate('/admin/orders') },
    { id: '4', label: 'Manage Drivers', icon: '🚗', onClick: () => navigate('/admin/drivers') },
    { id: '5', label: 'Logs & Security', icon: '🔐', onClick: () => navigate('/admin/logs') },
    { id: '6', label: 'System Settings', icon: '⚙️', onClick: () => navigate('/admin/system-settings') },
  ];

  if (loading) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundLoadingSpinner message="Loading platform data..." />
      </div>
    );
  }

  return (
    <div style={undergroundTheme.components.page}>
      <UndergroundHeader
        icon="🏛️"
        title="Platform Dashboard"
        subtitle="Manage and monitor the entire platform"
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
          label="Active Businesses"
          value={formatNumber(stats.totalBusinesses)}
          icon="🏢"
          onClick={() => navigate('/admin/businesses')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          label="Active Users"
          value={formatNumber(stats.activeUsers)}
          icon="👥"
          onClick={() => navigate('/admin/users')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          label="Total Orders"
          value={formatNumber(stats.totalOrders)}
          icon="📦"
          onClick={() => navigate('/admin/orders')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon="💰"
          onClick={() => navigate('/admin/analytics')}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        <QuickActionGrid actions={quickActions} title="Quick Actions" />
        <ActivityFeed
          activities={stats.recentActivity.length > 0 ? stats.recentActivity : [
            { id: '1', type: 'info', message: 'No recent activity', time: 'Now' }
          ]}
          title="Recent Activity"
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
          Quick Links
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.md
        }}>
          {[
            { label: 'Super Admins', path: '/admin/superadmins', icon: '👑' },
            { label: 'Infrastructures', path: '/admin/infrastructures', icon: '��' },
            { label: 'Platform Catalog', path: '/admin/platform-catalog', icon: '📦' },
            { label: 'Driver Applications', path: '/admin/driver-applications', icon: '🚗' },
            { label: 'Feature Flags', path: '/admin/feature-flags', icon: '🚩' },
            { label: 'Permissions', path: '/admin/permissions', icon: '🔐' },
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
