import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { StatCard } from '../../components/molecules/StatCard';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';
import { modernTokens } from '../../styles/modernTokens';
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
    { id: '2', label: 'דף ציבורי', icon: '🌐', onClick: () => navigate('/business/preview') },
    { id: '3', label: 'ניהול צוות', icon: '👥', onClick: () => navigate('/business/team') },
    { id: '4', label: 'בדיקת מלאי', icon: '📊', onClick: () => navigate('/business/inventory') },
    { id: '5', label: 'ניהול נהגים', icon: '🚗', onClick: () => navigate('/business/drivers') },
    { id: '6', label: 'אנליטיקה', icon: '📈', onClick: () => navigate('/business/analytics') },
    { id: '7', label: 'הגדרות', icon: '⚙️', onClick: () => navigate('/business/settings') },
    { id: '8', label: 'יומני ביקורת', icon: '📋', onClick: () => navigate('/business/audit-logs') },
    { id: '9', label: 'לקוחות', icon: '👤', onClick: () => navigate('/business/customers') },
  ];

  if (loading) {
    return (
      <PageContainer>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: modernTokens.colors.text.primary
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
          color: modernTokens.colors.text.primary
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
                borderRadius: modernTokens.radius.md,
                border: 'none',
                background: modernTokens.gradients.primary,
                color: '#ffffff',
                cursor: 'pointer',
                marginTop: '16px',
                boxShadow: modernTokens.glows.primary,
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
          color: modernTokens.colors.text.primary
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
      <PageHeader
        icon="🏢"
        title={businessName || 'לוח בקרה מאוחד'}
        subtitle="סקירה מקיפה של הפעילות העסקית שלך"
        actionButton={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: modernTokens.radius.md,
                border: `1px solid ${modernTokens.colors.border.default}`,
                backgroundColor: modernTokens.colors.background.surface,
                color: modernTokens.colors.text.primary,
                cursor: 'pointer',
                transition: modernTokens.transitions.fast,
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
                borderRadius: modernTokens.radius.md,
                border: showCustomize ? 'none' : `1px solid ${modernTokens.colors.border.default}`,
                background: showCustomize ? modernTokens.gradients.primary : modernTokens.colors.background.surface,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: showCustomize ? modernTokens.glows.primary : 'none',
                transition: modernTokens.transitions.normal,
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
                borderRadius: modernTokens.radius.md,
                border: `1px solid ${modernTokens.colors.border.default}`,
                backgroundColor: modernTokens.colors.background.surface,
                color: modernTokens.colors.text.primary,
                cursor: 'pointer',
                transition: modernTokens.transitions.fast,
              }}
            >
              🔄
            </button>
          </div>
        }
      />

      {showCustomize && (
        <Card style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: modernTokens.colors.text.primary,
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
                  backgroundColor: modernTokens.colors.background.surface,
                  border: `1px solid ${modernTokens.colors.border.default}`,
                  borderRadius: modernTokens.radius.md,
                  cursor: 'pointer',
                  transition: modernTokens.transitions.fast,
                }}
              >
                <input
                  type="checkbox"
                  checked={widget.visible}
                  onChange={() => toggleWidget(widget.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ color: modernTokens.colors.text.primary, fontSize: '14px' }}>
                  {widget.title}
                </span>
              </label>
            ))}
          </div>
        </Card>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {visibleWidgets.map(widget => {
          if (widget.id === 'orders' && widget.visible) {
            return (
              <StatCard
                key={widget.id}
                icon="📦"
                label="סה״כ הזמנות"
                value={formatNumber(stats.totalOrders)}
                subtitle={stats.recentOrders > 0 ? `+${stats.recentOrders} היום` : undefined}
                onClick={() => navigate('/business/orders')}
              />
            );
          }

          if (widget.id === 'revenue' && widget.visible) {
            return (
              <React.Fragment key={widget.id}>
                <StatCard
                  icon="💰"
                  label="הכנסות כוללות"
                  value={formatCurrency(stats.totalRevenue, 'ILS')}
                  variant="revenue"
                  onClick={() => navigate('/business/analytics')}
                />
                <StatCard
                  icon="📊"
                  label="ממוצע הזמנה"
                  value={formatCurrency(stats.averageOrderValue, 'ILS')}
                  variant="revenue"
                  onClick={() => navigate('/business/analytics')}
                />
                <StatCard
                  icon="⏳"
                  label="הזמנות ממתינות"
                  value={formatNumber(stats.pendingOrders)}
                  variant="warning"
                  onClick={() => navigate('/business/orders')}
                />
              </React.Fragment>
            );
          }

          if (widget.id === 'team' && widget.visible) {
            return (
              <StatCard
                key={widget.id}
                icon="👥"
                label="חברי צוות פעילים"
                value={formatNumber(stats.activeTeamMembers)}
                onClick={() => navigate('/business/team')}
              />
            );
          }

          if (widget.id === 'drivers' && widget.visible) {
            return (
              <StatCard
                key={widget.id}
                icon="🚗"
                label="נהגים זמינים"
                value={`${formatNumber(stats.availableDrivers)}/${formatNumber(stats.totalDrivers)}`}
                onClick={() => navigate('/business/drivers')}
              />
            );
          }

          if (widget.id === 'inventory' && widget.visible) {
            return (
              <StatCard
                key={widget.id}
                icon="⚠️"
                label="פריטים במלאי נמוך"
                value={formatNumber(stats.lowStockItems)}
                variant={stats.lowStockItems > 0 ? "warning" : "default"}
                onClick={() => navigate('/business/inventory')}
              />
            );
          }

          if (widget.id === 'completion' && widget.visible) {
            return (
              <StatCard
                key={widget.id}
                icon="✅"
                label="שיעור השלמה"
                value={`${orderCompletionRate.toFixed(1)}%`}
                variant={orderCompletionRate > 80 ? "success" : orderCompletionRate < 50 ? "error" : "warning"}
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
                color: modernTokens.colors.text.primary
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
                      background: modernTokens.gradients.card,
                      border: `1px solid ${modernTokens.colors.border.default}`,
                      borderRadius: modernTokens.radius.lg,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: modernTokens.transitions.normal,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = modernTokens.shadows.lg;
                      e.currentTarget.style.background = modernTokens.gradients.cardHover;
                      e.currentTarget.style.border = `1px solid ${modernTokens.colors.border.hover}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.background = modernTokens.gradients.card;
                      e.currentTarget.style.border = `1px solid ${modernTokens.colors.border.default}`;
                    }}
                  >
                    <span style={{ fontSize: '32px' }}>{action.icon}</span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: modernTokens.colors.text.primary,
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
                color: modernTokens.colors.text.primary
              }}>
                פעילות אחרונה
              </h3>
              <Card>
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: '12px',
                      borderBottom: index < activities.length - 1 ? `1px solid ${modernTokens.colors.border.default}` : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: modernTokens.transitions.fast,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = modernTokens.colors.interactive.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>
                        {activity.type === 'alert' ? '⚠️' : activity.type === 'order' ? '📦' : 'ℹ️'}
                      </span>
                      <span style={{
                        fontSize: '14px',
                        color: modernTokens.colors.text.primary
                      }}>
                        {activity.message}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: modernTokens.colors.text.secondary
                    }}>
                      {activity.time}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>
      )}

      <Card style={{ marginTop: '24px', textAlign: 'center' }}>
        <div style={{
          color: modernTokens.colors.text.tertiary,
          fontSize: '12px'
        }}>
          עדכון אחרון: {stats.lastUpdated.toLocaleTimeString('he-IL')}
        </div>
      </Card>
    </PageContainer>
  );
}
