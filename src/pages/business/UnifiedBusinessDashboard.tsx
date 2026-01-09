import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';
import { tokens } from '../../styles/tokens';
import { useBusinessStats } from '../../hooks/useBusinessStats';
import { formatCurrency, formatNumber, formatTimeAgo } from '../../utils/businessFormatters';

type DateRange = '1d' | '7d' | '30d' | '90d' | 'all';

interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'activity' | 'quickAction';
  title: string;
  visible: boolean;
  order: number;
}

const defaultWidgets: Widget[] = [
  { id: 'orders', type: 'metric', title: 'הזמנות', visible: true, order: 1 },
  { id: 'revenue', type: 'metric', title: 'הכנסות', visible: true, order: 2 },
  { id: 'team', type: 'metric', title: 'צוות', visible: true, order: 3 },
  { id: 'drivers', type: 'metric', title: 'נהגים', visible: true, order: 4 },
  { id: 'inventory', type: 'metric', title: 'מלאי', visible: true, order: 5 },
  { id: 'completion', type: 'metric', title: 'שיעור השלמה', visible: true, order: 6 },
  { id: 'quickActions', type: 'quickAction', title: 'פעולות מהירות', visible: true, order: 7 },
  { id: 'activity', type: 'activity', title: 'פעילות אחרונה', visible: true, order: 8 },
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
        message: `${stats.recentOrders} הזמנות חדשות בוצעו`,
        time: 'היום'
      });
    }

    if (stats.lowStockItems > 0) {
      acts.push({
        id: 'stock-low',
        type: 'alert',
        message: `${stats.lowStockItems} מוצרים במלאי נמוך`,
        time: 'עכשיו'
      });
    }

    if (stats.outOfStockItems > 0) {
      acts.push({
        id: 'stock-out',
        type: 'alert',
        message: `${stats.outOfStockItems} מוצרים אזלו מהמלאי`,
        time: 'עכשיו'
      });
    }

    if (stats.pendingOrders > 5) {
      acts.push({
        id: 'pending',
        type: 'alert',
        message: `${stats.pendingOrders} הזמנות ממתינות לטיפול`,
        time: 'עכשיו'
      });
    }

    if (auditLogs && auditLogs.length > 0) {
      auditLogs.slice(0, 5).forEach((log, idx) => {
        const timeAgo = formatTimeAgo(new Date(log.created_at));
        acts.push({
          id: `log-${idx}`,
          type: log.action === 'DELETE' ? 'alert' : 'info',
          message: `${log.action} ב-${log.table_name}`,
          time: timeAgo
        });
      });
    }

    if (acts.length === 0) {
      acts.push({
        id: 'no-activity',
        type: 'info',
        message: 'אין פעילות אחרונה',
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
      <PageContainer>
        <NoActiveBusiness
          onNavigateToBusinesses={() => navigate('/business/businesses')}
          message="לוח הבקרה המאוחד דורש עסק פעיל. אנא בחר עסק או צור עסק חדש."
        />
      </PageContainer>
    );
  }

  const quickActions = [
    { id: '1', label: 'הזמנה חדשה', icon: '📦', onClick: () => navigate('/business/orders') },
    { id: '2', label: 'ניהול צוות', icon: '👥', onClick: () => navigate('/business/team') },
    { id: '3', label: 'בדיקת מלאי', icon: '📊', onClick: () => navigate('/business/inventory') },
    { id: '4', label: 'ניהול נהגים', icon: '🚗', onClick: () => navigate('/business/drivers') },
    { id: '5', label: 'אנליטיקה', icon: '📈', onClick: () => navigate('/business/analytics') },
    { id: '6', label: 'הגדרות', icon: '⚙️', onClick: () => navigate('/business/settings') },
    { id: '7', label: 'יומני ביקורת', icon: '📋', onClick: () => navigate('/business/audit-logs') },
    { id: '8', label: 'לקוחות', icon: '👤', onClick: () => navigate('/business/customers') },
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

  if (error) {
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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              שגיאה בטעינת נתוני העסק
            </div>
            <button
              onClick={refresh}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: tokens.colors.primary,
                color: '#ffffff',
                cursor: 'pointer',
                marginTop: '16px'
              }}
            >
              נסה שנית
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!stats || !currentBusinessId) {
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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>
              לא נמצא הקשר עסקי
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  const orderCompletionRate = stats.totalOrders > 0
    ? (stats.completedOrders / stats.totalOrders) * 100
    : 0;

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);

  return (
    <PageContainer>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: tokens.colors.text,
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span>🏢</span>
            <span>{businessName || 'לוח בקרה מאוחד'}</span>
          </h1>
          <p style={{
            fontSize: '16px',
            color: tokens.colors.textSecondary,
            margin: 0
          }}>
            סקירה מקיפה של הפעילות העסקית שלך
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '8px',
              border: `1px solid ${tokens.colors.border}`,
              backgroundColor: tokens.colors.background,
              color: tokens.colors.text,
              cursor: 'pointer'
            }}
          >
            <option value="1d">היום</option>
            <option value="7d">7 ימים</option>
            <option value="30d">30 ימים</option>
            <option value="90d">90 ימים</option>
            <option value="all">הכל</option>
          </select>

          <button
            onClick={() => setShowCustomize(!showCustomize)}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '8px',
              border: `1px solid ${tokens.colors.border}`,
              backgroundColor: showCustomize ? tokens.colors.primary : tokens.colors.background,
              color: showCustomize ? '#ffffff' : tokens.colors.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>⚙️</span>
            <span>התאמה אישית</span>
          </button>

          <button
            onClick={refresh}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '8px',
              border: `1px solid ${tokens.colors.border}`,
              backgroundColor: tokens.colors.background,
              color: tokens.colors.text,
              cursor: 'pointer'
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {showCustomize && (
        <div style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: tokens.colors.text,
            marginBottom: '16px'
          }}>
            בחר ווידג'טים להצגה
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {widgets.map(widget => (
              <label
                key={widget.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: tokens.colors.background,
                  border: `1px solid ${tokens.colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={widget.visible}
                  onChange={() => toggleWidget(widget.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: tokens.colors.text, fontSize: '14px' }}>
                  {widget.title}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {visibleWidgets.map(widget => {
          if (widget.id === 'orders' && widget.visible) {
            return (
              <MetricCard
                key={widget.id}
                label="סה״כ הזמנות"
                value={formatNumber(stats.totalOrders)}
                change={stats.recentOrders > 0 ? `+${stats.recentOrders} היום` : undefined}
                trend={stats.recentOrders > 0 ? 'up' : undefined}
                icon="📦"
                onClick={() => navigate('/business/orders')}
              />
            );
          }

          if (widget.id === 'revenue' && widget.visible) {
            return (
              <div key={widget.id} style={{ display: 'contents' }}>
                <MetricCard
                  label="הכנסות כוללות"
                  value={formatCurrency(stats.totalRevenue, 'ILS')}
                  icon="💰"
                  onClick={() => navigate('/business/analytics')}
                />
                <MetricCard
                  label="ממוצע הזמנה"
                  value={formatCurrency(stats.averageOrderValue, 'ILS')}
                  icon="📊"
                  onClick={() => navigate('/business/analytics')}
                />
                <MetricCard
                  label="הזמנות ממתינות"
                  value={formatNumber(stats.pendingOrders)}
                  icon="⏳"
                  onClick={() => navigate('/business/orders')}
                />
              </div>
            );
          }

          if (widget.id === 'team' && widget.visible) {
            return (
              <MetricCard
                key={widget.id}
                label="חברי צוות פעילים"
                value={formatNumber(stats.activeTeamMembers)}
                icon="👥"
                onClick={() => navigate('/business/team')}
              />
            );
          }

          if (widget.id === 'drivers' && widget.visible) {
            return (
              <MetricCard
                key={widget.id}
                label="נהגים זמינים"
                value={`${formatNumber(stats.availableDrivers)}/${formatNumber(stats.totalDrivers)}`}
                icon="🚗"
                onClick={() => navigate('/business/drivers')}
              />
            );
          }

          if (widget.id === 'inventory' && widget.visible) {
            return (
              <MetricCard
                key={widget.id}
                label="פריטים במלאי נמוך"
                value={formatNumber(stats.lowStockItems)}
                icon="⚠️"
                trend={stats.lowStockItems > 0 ? 'down' : undefined}
                onClick={() => navigate('/business/inventory')}
              />
            );
          }

          if (widget.id === 'completion' && widget.visible) {
            return (
              <MetricCard
                key={widget.id}
                label="שיעור השלמה"
                value={`${orderCompletionRate.toFixed(1)}%`}
                icon="✅"
                trend={orderCompletionRate > 80 ? 'up' : orderCompletionRate < 50 ? 'down' : undefined}
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
            ? '1fr 1fr'
            : '1fr',
          gap: '24px',
          marginTop: '32px'
        }}>
          {visibleWidgets.find(w => w.id === 'quickActions') && (
            <div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '16px',
                color: tokens.colors.text
              }}>
                פעולות מהירות
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px'
              }}>
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    style={{
                      padding: '16px',
                      backgroundColor: tokens.colors.surface,
                      border: `1px solid ${tokens.colors.border}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ fontSize: '32px' }}>{action.icon}</span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: tokens.colors.text,
                      textAlign: 'center'
                    }}>
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {visibleWidgets.find(w => w.id === 'activity') && (
            <div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                marginBottom: '16px',
                color: tokens.colors.text
              }}>
                פעילות אחרונה
              </h3>
              <div style={{
                backgroundColor: tokens.colors.surface,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: '12px',
                padding: '16px'
              }}>
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: '12px',
                      borderBottom: `1px solid ${tokens.colors.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>
                        {activity.type === 'alert' ? '⚠️' : activity.type === 'order' ? '📦' : 'ℹ️'}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: tokens.colors.text
                      }}>
                        {activity.message}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: tokens.colors.textSecondary
                    }}>
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{
        marginTop: '24px',
        padding: '12px',
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '8px',
        textAlign: 'center',
        color: tokens.colors.textSecondary,
        fontSize: '12px'
      }}>
        עדכון אחרון: {stats.lastUpdated.toLocaleTimeString('he-IL')}
      </div>
    </PageContainer>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  change?: string;
  trend?: 'up' | 'down';
  onClick?: () => void;
}

function MetricCard({ label, value, icon, change, trend, onClick }: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: '500',
          color: tokens.colors.textSecondary
        }}>
          {label}
        </span>
        <span style={{ fontSize: '24px' }}>{icon}</span>
      </div>

      <div style={{
        fontSize: '28px',
        fontWeight: '700',
        color: tokens.colors.text,
        marginBottom: '8px'
      }}>
        {value}
      </div>

      {change && (
        <div style={{
          fontSize: '12px',
          fontWeight: '500',
          color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : tokens.colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {trend === 'up' && '↗'}
          {trend === 'down' && '↘'}
          {change}
        </div>
      )}
    </div>
  );
}
