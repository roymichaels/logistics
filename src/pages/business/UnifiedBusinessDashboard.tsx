import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, DollarSign, Package, TrendingUp, Users, Truck, AlertTriangle, CheckCircle, BarChart3, Globe, Settings, FileText, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { useBusinessStats } from '../../hooks/useBusinessStats';
import { formatCurrency, formatNumber, formatTimeAgo } from '../../utils/businessFormatters';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundStatCard,
  UndergroundBadge,
  UndergroundHeader,
  UndergroundSection,
  UndergroundLoadingSpinner,
} from '../../components/underground';

type DateRange = '1d' | '7d' | '30d' | '90d' | 'all';

interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'activity' | 'quickAction';
  title: string;
  visible: boolean;
  order: number;
}

const defaultWidgets: Widget[] = [
  { id: 'orders', type: 'metric', title: 'Orders', visible: true, order: 1 },
  { id: 'revenue', type: 'metric', title: 'Revenue', visible: true, order: 2 },
  { id: 'team', type: 'metric', title: 'Team', visible: true, order: 3 },
  { id: 'drivers', type: 'metric', title: 'Drivers', visible: true, order: 4 },
  { id: 'inventory', type: 'metric', title: 'Inventory', visible: true, order: 5 },
  { id: 'completion', type: 'metric', title: 'Completion Rate', visible: true, order: 6 },
  { id: 'quickActions', type: 'quickAction', title: 'Quick Actions', visible: true, order: 7 },
  { id: 'activity', type: 'activity', title: 'Recent Activity', visible: true, order: 8 },
];

export function UnifiedBusinessDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [businessName, setBusinessName] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [showCustomize, setShowCustomize] = useState(false);

  const { stats, loading, error, refresh } = useBusinessStats({
    businessId: currentBusinessId,
    autoRefresh: true,
    refreshInterval: 60000
  });

  useEffect(() => {
    if (!currentBusinessId) {
      logger.warn('[UnifiedBusinessDashboard] No business context');
      return;
    }

    loadBusinessName();
    loadAuditLogs();
  }, [currentBusinessId]);

  useEffect(() => {
    const saved = localStorage.getItem(`dashboard-widgets-${currentBusinessId}`);
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {
        logger.error('[UnifiedBusinessDashboard] Failed to parse saved widgets', e);
      }
    }
  }, [currentBusinessId]);

  const activities = useMemo(() => {
    if (!stats) return [];

    const acts: Array<{id: string; type: string; message: string; time: string}> = [];

    if (stats.recentOrders > 0) {
      acts.push({
        id: 'orders',
        type: 'order',
        message: `${stats.recentOrders} new orders placed`,
        time: 'Today'
      });
    }

    if (stats.lowStockItems > 0) {
      acts.push({
        id: 'stock-low',
        type: 'alert',
        message: `${stats.lowStockItems} items low in stock`,
        time: 'Now'
      });
    }

    if (stats.outOfStockItems > 0) {
      acts.push({
        id: 'stock-out',
        type: 'alert',
        message: `${stats.outOfStockItems} items out of stock`,
        time: 'Now'
      });
    }

    if (stats.pendingOrders > 5) {
      acts.push({
        id: 'pending',
        type: 'alert',
        message: `${stats.pendingOrders} orders awaiting processing`,
        time: 'Now'
      });
    }

    if (auditLogs && auditLogs.length > 0) {
      auditLogs.slice(0, 5).forEach((log, idx) => {
        const timeAgo = formatTimeAgo(new Date(log.created_at));
        acts.push({
          id: `log-${idx}`,
          type: log.action === 'DELETE' ? 'alert' : 'info',
          message: `${log.action} on ${log.table_name}`,
          time: timeAgo
        });
      });
    }

    if (acts.length === 0) {
      acts.push({
        id: 'no-activity',
        type: 'info',
        message: 'No recent activity',
        time: ''
      });
    }

    return acts;
  }, [stats, auditLogs]);

  const saveWidgets = (newWidgets: Widget[]) => {
    setWidgets(newWidgets);
    if (currentBusinessId) {
      localStorage.setItem(`dashboard-widgets-${currentBusinessId}`, JSON.stringify(newWidgets));
    }
  };

  const toggleWidget = (widgetId: string) => {
    const newWidgets = widgets.map(w =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    saveWidgets(newWidgets);
  };

  const loadBusinessName = async () => {
    if (!currentBusinessId) return;

    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', currentBusinessId)
        .single();

      if (business) {
        setBusinessName(business.name);
      }
    } catch (err) {
      logger.error('[UnifiedBusinessDashboard] Failed to load business name:', err);
    }
  };

  const loadAuditLogs = async () => {
    if (!currentBusinessId) return;

    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, table_name, created_at')
        .eq('business_id', currentBusinessId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setAuditLogs(data);
      }
    } catch (err) {
      logger.error('[UnifiedBusinessDashboard] Failed to load audit logs:', err);
    }
  };

  if (!currentBusinessId) {
    return (
      <div style={undergroundTheme.components.page}>
        <NoActiveBusiness
          onNavigateToBusinesses={() => navigate('/business/businesses')}
          message="The unified dashboard requires an active business. Please select a business or create a new one."
        />
      </div>
    );
  }

  const quickActions = [
    { id: '1', label: 'New Order', icon: <Package size={24} />, color: '#00d9ff', onClick: () => navigate('/business/orders') },
    { id: '2', label: 'Public Page', icon: <Globe size={24} />, color: '#10b981', onClick: () => navigate('/business/preview') },
    { id: '3', label: 'Team Management', icon: <Users size={24} />, color: '#8b5cf6', onClick: () => navigate('/business/team') },
    { id: '4', label: 'Check Inventory', icon: <BarChart3 size={24} />, color: '#f59e0b', onClick: () => navigate('/business/inventory') },
    { id: '5', label: 'Manage Drivers', icon: <Truck size={24} />, color: '#ec4899', onClick: () => navigate('/business/drivers') },
    { id: '6', label: 'Analytics', icon: <TrendingUp size={24} />, color: '#3b82f6', onClick: () => navigate('/business/analytics') },
    { id: '7', label: 'Settings', icon: <Settings size={24} />, color: '#6b7280', onClick: () => navigate('/business/settings') },
    { id: '8', label: 'Audit Logs', icon: <FileText size={24} />, color: '#06b6d4', onClick: () => navigate('/business/audit-logs') },
    { id: '9', label: 'Customers', icon: <User size={24} />, color: '#f97316', onClick: () => navigate('/business/customers') },
  ];

  if (loading) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundCard>
          <UndergroundLoadingSpinner centered size="lg" />
          <div style={{ textAlign: 'center', marginTop: undergroundTheme.spacing.xl }}>
            <div style={{ fontSize: undergroundTheme.typography.fontSize.lg, fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary }}>
              Loading business data...
            </div>
          </div>
        </UndergroundCard>
      </div>
    );
  }

  if (error) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundCard>
          <div style={{ textAlign: 'center', padding: undergroundTheme.spacing['5xl'] }}>
            <AlertTriangle size={64} color={undergroundTheme.colors.status.error} style={{ marginBottom: undergroundTheme.spacing.xl }} />
            <div style={{ fontSize: undergroundTheme.typography.fontSize.xl, fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary, marginBottom: undergroundTheme.spacing.lg }}>
              Error Loading Business Data
            </div>
            <UndergroundButton onClick={refresh}>
              Try Again
            </UndergroundButton>
          </div>
        </UndergroundCard>
      </div>
    );
  }

  if (!stats || !currentBusinessId) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundCard>
          <div style={{ textAlign: 'center', padding: undergroundTheme.spacing['5xl'] }}>
            <Package size={64} color={undergroundTheme.colors.text.tertiary} style={{ marginBottom: undergroundTheme.spacing.xl }} />
            <div style={{ fontSize: undergroundTheme.typography.fontSize.xl, fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary }}>
              No Business Context Found
            </div>
          </div>
        </UndergroundCard>
      </div>
    );
  }

  const orderCompletionRate = stats.totalOrders > 0
    ? (stats.completedOrders / stats.totalOrders) * 100
    : 0;

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);

  return (
    <div style={undergroundTheme.components.page}>
      <UndergroundHeader
        title={businessName || 'Unified Dashboard'}
        subtitle="Comprehensive overview of your business activity"
        icon={<Activity size={32} />}
        gradient
        actions={
          <div style={{ display: 'flex', gap: undergroundTheme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              style={{
                ...undergroundTheme.components.input,
                width: 'auto',
                padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.lg}`,
                cursor: 'pointer',
              }}
            >
              <option value="1d">Today</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
              <option value="all">All Time</option>
            </select>

            <UndergroundButton
              variant={showCustomize ? 'primary' : 'secondary'}
              onClick={() => setShowCustomize(!showCustomize)}
              icon={<Settings size={18} />}
            >
              Customize
            </UndergroundButton>

            <UndergroundButton
              variant="ghost"
              onClick={refresh}
              icon={<Activity size={18} />}
            >
              Refresh
            </UndergroundButton>
          </div>
        }
      />

      {showCustomize && (
        <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['4xl'] }}>
          <h3 style={{
            fontSize: undergroundTheme.typography.fontSize.lg,
            fontWeight: undergroundTheme.typography.fontWeight.semibold,
            color: undergroundTheme.colors.text.primary,
            marginBottom: undergroundTheme.spacing.xl
          }}>
            Select Widgets to Display
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: undergroundTheme.spacing.md
          }}>
            {widgets.map(widget => (
              <label
                key={widget.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: undergroundTheme.spacing.sm,
                  padding: undergroundTheme.spacing.md,
                  ...undergroundTheme.effects.glassmorphism.light,
                  borderRadius: undergroundTheme.borderRadius.md,
                  cursor: 'pointer',
                  transition: undergroundTheme.transitions.normal,
                }}
              >
                <input
                  type="checkbox"
                  checked={widget.visible}
                  onChange={() => toggleWidget(widget.id)}
                  style={{ cursor: 'pointer', accentColor: undergroundTheme.colors.accent.primary }}
                />
                <span style={{ color: undergroundTheme.colors.text.primary, fontSize: undergroundTheme.typography.fontSize.sm }}>
                  {widget.title}
                </span>
              </label>
            ))}
          </div>
        </UndergroundCard>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: undergroundTheme.spacing.xl,
        marginBottom: undergroundTheme.spacing['4xl']
      }}>
        {visibleWidgets.map(widget => {
          if (widget.id === 'orders' && widget.visible) {
            return (
              <UndergroundStatCard
                key={widget.id}
                icon={<Package size={28} />}
                label="Total Orders"
                value={formatNumber(stats.totalOrders)}
                subtext={stats.recentOrders > 0 ? `+${stats.recentOrders} today` : undefined}
                accentColor={undergroundTheme.colors.accent.primary}
                onClick={() => navigate('/business/orders')}
                trend={stats.recentOrders > 0 ? { value: `+${stats.recentOrders}`, direction: 'up' } : undefined}
              />
            );
          }

          if (widget.id === 'revenue' && widget.visible) {
            return (
              <React.Fragment key={widget.id}>
                <UndergroundStatCard
                  icon={<DollarSign size={28} />}
                  label="Total Revenue"
                  value={formatCurrency(stats.totalRevenue, 'USD')}
                  accentColor={undergroundTheme.colors.status.success}
                  onClick={() => navigate('/business/analytics')}
                />
                <UndergroundStatCard
                  icon={<BarChart3 size={28} />}
                  label="Average Order"
                  value={formatCurrency(stats.averageOrderValue, 'USD')}
                  accentColor="#8b5cf6"
                  onClick={() => navigate('/business/analytics')}
                />
                <UndergroundStatCard
                  icon={<Activity size={28} />}
                  label="Pending Orders"
                  value={formatNumber(stats.pendingOrders)}
                  accentColor={undergroundTheme.colors.status.warning}
                  onClick={() => navigate('/business/orders')}
                />
              </React.Fragment>
            );
          }

          if (widget.id === 'team' && widget.visible) {
            return (
              <UndergroundStatCard
                key={widget.id}
                icon={<Users size={28} />}
                label="Active Team Members"
                value={formatNumber(stats.activeTeamMembers)}
                accentColor="#8b5cf6"
                onClick={() => navigate('/business/team')}
              />
            );
          }

          if (widget.id === 'drivers' && widget.visible) {
            return (
              <UndergroundStatCard
                key={widget.id}
                icon={<Truck size={28} />}
                label="Available Drivers"
                value={`${formatNumber(stats.availableDrivers)}/${formatNumber(stats.totalDrivers)}`}
                accentColor="#ec4899"
                onClick={() => navigate('/business/drivers')}
              />
            );
          }

          if (widget.id === 'inventory' && widget.visible) {
            return (
              <UndergroundStatCard
                key={widget.id}
                icon={<AlertTriangle size={28} />}
                label="Low Stock Items"
                value={formatNumber(stats.lowStockItems)}
                accentColor={stats.lowStockItems > 0 ? undergroundTheme.colors.status.warning : undergroundTheme.colors.status.success}
                onClick={() => navigate('/business/inventory')}
              />
            );
          }

          if (widget.id === 'completion' && widget.visible) {
            const completionColor = orderCompletionRate > 80
              ? undergroundTheme.colors.status.success
              : orderCompletionRate < 50
              ? undergroundTheme.colors.status.error
              : undergroundTheme.colors.status.warning;

            return (
              <UndergroundStatCard
                key={widget.id}
                icon={<CheckCircle size={28} />}
                label="Completion Rate"
                value={`${orderCompletionRate.toFixed(1)}%`}
                accentColor={completionColor}
                onClick={() => navigate('/business/analytics')}
              />
            );
          }

          return null;
        })}
      </div>

      {visibleWidgets.some(w => w.id === 'quickActions' || w.id === 'activity') && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: visibleWidgets.find(w => w.id === 'quickActions') && visibleWidgets.find(w => w.id === 'activity')
            ? 'repeat(auto-fit, minmax(400px, 1fr))'
            : '1fr',
          gap: undergroundTheme.spacing['3xl'],
        }}>
          {visibleWidgets.find(w => w.id === 'quickActions') && (
            <UndergroundSection title="Quick Actions">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: undergroundTheme.spacing.md
              }}>
                {quickActions.map(action => (
                  <UndergroundCard
                    key={action.id}
                    variant="light"
                    hover
                    onClick={action.onClick}
                    style={{
                      padding: undergroundTheme.spacing.lg,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: undergroundTheme.spacing.sm,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      color: action.color,
                      padding: undergroundTheme.spacing.sm,
                      borderRadius: undergroundTheme.borderRadius.md,
                      background: `${action.color}15`,
                      boxShadow: `0 0 20px ${action.color}30`,
                    }}>
                      {action.icon}
                    </div>
                    <span style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      fontWeight: undergroundTheme.typography.fontWeight.medium,
                      color: undergroundTheme.colors.text.primary,
                    }}>
                      {action.label}
                    </span>
                  </UndergroundCard>
                ))}
              </div>
            </UndergroundSection>
          )}

          {visibleWidgets.find(w => w.id === 'activity') && (
            <UndergroundSection title="Recent Activity">
              <UndergroundCard variant="medium">
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: undergroundTheme.spacing.md,
                      borderBottom: index < activities.length - 1
                        ? `1px solid ${undergroundTheme.colors.glassmorphism.border}`
                        : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: undergroundTheme.transitions.fast,
                      borderRadius: undergroundTheme.borderRadius.sm,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.md }}>
                      {activity.type === 'alert' ? (
                        <AlertTriangle size={20} color={undergroundTheme.colors.status.warning} />
                      ) : activity.type === 'order' ? (
                        <Package size={20} color={undergroundTheme.colors.accent.primary} />
                      ) : (
                        <Activity size={20} color={undergroundTheme.colors.text.tertiary} />
                      )}
                      <span style={{
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.primary
                      }}>
                        {activity.message}
                      </span>
                    </div>
                    <UndergroundBadge variant="metric">
                      {activity.time}
                    </UndergroundBadge>
                  </div>
                ))}
              </UndergroundCard>
            </UndergroundSection>
          )}
        </div>
      )}

      <UndergroundCard style={{ marginTop: undergroundTheme.spacing['4xl'], textAlign: 'center', padding: undergroundTheme.spacing.lg }}>
        <div style={{
          color: undergroundTheme.colors.text.tertiary,
          fontSize: undergroundTheme.typography.fontSize.xs
        }}>
          Last updated: {stats.lastUpdated.toLocaleTimeString('en-US')}
        </div>
      </UndergroundCard>
    </div>
  );
}
