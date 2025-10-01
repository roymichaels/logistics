import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { useSkeleton, SkeletonCard } from '../src/hooks/useSkeleton';
import { Toast } from '../src/components/Toast';
import { DataStore, User, ManagerDashboardSnapshot, Notification } from '../data/types';
import { hebrew, roleNames, roleIcons, formatCurrency } from '../src/lib/hebrew';

interface DashboardProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Dashboard({ dataStore, onNavigate }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<string>('user');
  const [managerSnapshot, setManagerSnapshot] = useState<ManagerDashboardSnapshot | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingTasks: 0,
    completedToday: 0,
    totalProducts: 0,
    lowStock: 0,
    revenue: 0
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useSkeleton(100);
  const { theme, mainButton, backButton, haptic, alert } = useTelegramUI();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setManagerSnapshot(null);
      const profile = await dataStore.getProfile();
      setUser(profile);

      const role = profile.role;
      setEffectiveRole(role);

      // Load notifications
      if (dataStore.getNotifications) {
        const userNotifications = await dataStore.getNotifications();
        setNotifications(userNotifications.slice(0, 3));
      }

      // Load stats based on role
      if (role === 'manager') {
        if (dataStore.getManagerDashboardSnapshot) {
          try {
            const snapshot = await dataStore.getManagerDashboardSnapshot();
            setManagerSnapshot(snapshot);
            setStats({
              totalOrders: snapshot.metrics.orders_today,
              pendingTasks: snapshot.metrics.restock_pending,
              completedToday: snapshot.hourly.reduce((sum, point) => sum + point.orders, 0),
              totalProducts: snapshot.low_stock_alerts.length,
              lowStock: snapshot.metrics.low_stock_count,
              revenue: snapshot.metrics.revenue_today
            });
          } catch (error) {
            console.error('Failed to load manager snapshot', error);
            Toast.error('שגיאה בטעינת נתוני ההנהלה');
          }
        }
      } else if (role === 'dispatcher') {
        const [orders, tasks] = await Promise.all([
          dataStore.listOrders?.() || [],
          dataStore.listAllTasks?.() || []
        ]);
        
        setStats({
          totalOrders: orders.length,
          pendingTasks: orders.filter(o => o.status === 'new' || o.status === 'confirmed').length,
          completedToday: orders.filter(o => 
            o.status === 'delivered' && 
            new Date(o.updated_at).toDateString() === new Date().toDateString()
          ).length,
          totalProducts: 0,
          lowStock: 0,
          revenue: 0
        });
      } else if (role !== 'user') {
        const tasks = await dataStore.listMyTasks?.() || [];
        setStats({
          totalOrders: 0,
          pendingTasks: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
          completedToday: tasks.filter(t => 
            t.status === 'completed' && 
            t.completed_at &&
            new Date(t.completed_at).toDateString() === new Date().toDateString()
          ).length,
          totalProducts: 0,
          lowStock: 0,
          revenue: 0
        });
      } else {
        // Regular user role - load actual data
        setStats({
          totalOrders: 0,
          pendingTasks: 0,
          completedToday: 0,
          totalProducts: 0,
          lowStock: 0,
          revenue: 0
        });
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Toast.error('שגיאה בטעינת נתוני לוח הבקרה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    mainButton.hide();
    backButton.hide();
  }, [user]);

  if (loading || showSkeleton) {
    return (
      <div style={{ 
        padding: '16px', 
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh',
        direction: 'rtl'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            height: '32px',
            backgroundColor: theme.hint_color + '40',
            borderRadius: '8px',
            marginBottom: '8px',
            width: '60%',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{
            height: '20px',
            backgroundColor: theme.hint_color + '30',
            borderRadius: '8px',
            width: '40%',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '12px',
          marginBottom: '24px'
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: '80px',
              backgroundColor: theme.hint_color + '20',
              borderRadius: '12px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          ))}
        </div>
        
        <SkeletonCard theme={theme} />
        <SkeletonCard theme={theme} />
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return hebrew.good_morning;
    if (hour < 18) return hebrew.good_afternoon;
    return hebrew.good_evening;
  };

  if (user?.role === 'manager' && managerSnapshot) {
    return (
      <ManagerDashboardView
        snapshot={managerSnapshot}
        user={user}
        notifications={notifications}
        onNavigate={onNavigate}
        dataStore={dataStore}
        haptic={haptic}
        alert={alert}
      />
    );
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '24px', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          {getGreeting()}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>
            {roleIcons[effectiveRole as keyof typeof roleIcons] || '👤'}
          </span>
          <p style={{ 
            margin: 0, 
            color: theme.hint_color,
            fontSize: '16px'
          }}>
            {user?.name || 'משתמש'} • {roleNames[effectiveRole as keyof typeof roleNames] || 'משתמש'}
          </p>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '18px', 
            fontWeight: '600',
            color: theme.text_color
          }}>
            התראות אחרונות
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: '12px',
                  backgroundColor: notification.read ? theme.secondary_bg_color : theme.button_color + '20',
                  borderRadius: '8px',
                  borderRight: `4px solid ${getNotificationColor(notification.type)}`,
                  cursor: 'pointer'
                }}
                onClick={() => {
                  haptic();
                  if (notification.action_url) {
                    // Navigate to specific page
                  }
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme.text_color,
                  marginBottom: '4px'
                }}>
                  {notification.title}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: theme.hint_color
                }}>
                  {notification.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '12px',
        marginBottom: '24px'
      }}>
        {user?.role === 'manager' ? (
          <>
            <StatCard
              title={hebrew.total_orders}
              value={stats.totalOrders}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title={hebrew.pending_tasks}
              value={stats.pendingTasks}
              color="#ff9500"
              theme={theme}
            />
            <StatCard
              title="הכנסות"
              value={formatCurrency(stats.revenue)}
              color="#34c759"
              theme={theme}
              isText={true}
            />
            <StatCard
              title="מלאי נמוך"
              value={stats.lowStock}
              color="#ff3b30"
              theme={theme}
            />
          </>
        ) : user?.role === 'dispatcher' ? (
          <>
            <StatCard
              title={hebrew.total_orders}
              value={stats.totalOrders}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title="ממתינות"
              value={stats.pendingTasks}
              color="#ff9500"
              theme={theme}
            />
            <StatCard
              title="נמסרו היום"
              value={stats.completedToday}
              color="#34c759"
              theme={theme}
            />
          </>
        ) : user?.role === 'user' ? (
          <>
            <StatCard
              title="הזמנות כללי"
              value={stats.totalOrders}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title="משימות פתוחות"
              value={stats.pendingTasks}
              color="#ff9500"
              theme={theme}
            />
            <StatCard
              title="הושלמו היום"
              value={stats.completedToday}
              color="#34c759"
              theme={theme}
            />
            <StatCard
              title="מוצרים"
              value={stats.totalProducts}
              color="#007aff"
              theme={theme}
            />
          </>
        ) : (
          <>
            <StatCard
              title={hebrew.pending_tasks}
              value={stats.pendingTasks}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title={hebrew.completed_today}
              value={stats.completedToday}
              color="#34c759"
              theme={theme}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          פעולות מהירות
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {getQuickActions(effectiveRole).map((action, index) => (
            <ActionButton
              key={index}
              title={action.title}
              subtitle={action.subtitle}
              icon={action.icon}
              onClick={() => onNavigate(action.page)}
              theme={theme}
              haptic={haptic}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type ManagerPalette = {
  background: string;
  card: string;
  border: string;
  accent: string;
  accentSoft: string;
  text: string;
  subtle: string;
  critical: string;
  glow: string;
};

function ManagerDashboardView({
  snapshot,
  user,
  notifications,
  onNavigate,
  dataStore,
  haptic,
  alert
}: {
  snapshot: ManagerDashboardSnapshot;
  user: User | null;
  notifications: Notification[];
  onNavigate: (page: string) => void;
  dataStore: DataStore;
  haptic: (type?: 'light' | 'medium' | 'heavy') => void;
  alert: (message: string) => void;
}) {
  const palette: ManagerPalette = {
    background: 'radial-gradient(circle at 20% -10%, #4f2a8e 0%, #1a0a36 38%, #05000f 100%)',
    card: 'rgba(22, 10, 40, 0.88)',
    border: 'rgba(227, 179, 65, 0.22)',
    accent: '#e3b341',
    accentSoft: 'rgba(227, 179, 65, 0.12)',
    text: '#f7f3ff',
    subtle: 'rgba(247, 243, 255, 0.64)',
    critical: '#ff6b6b',
    glow: 'rgba(227, 179, 65, 0.55)'
  };

  const generatedAt = new Date(snapshot.generated_at);
  const generatedLabel = generatedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const peakRevenue = snapshot.hourly.reduce(
    (best, point) => (point.revenue > best.revenue ? point : best),
    snapshot.hourly[0] || { hour: '00:00', revenue: 0, orders: 0, volume: 0 }
  );
  const peakOrders = snapshot.hourly.reduce(
    (best, point) => (point.orders > best.orders ? point : best),
    snapshot.hourly[0] || { hour: '00:00', revenue: 0, orders: 0, volume: 0 }
  );

  const metricCards = [
    {
      title: 'הכנסות היום',
      value: formatCurrency(snapshot.metrics.revenue_today),
      icon: '₪',
      accent: palette.accent,
      change: snapshot.metrics.revenue_change,
      changeMode: 'percent' as const,
      caption: 'לעומת אתמול'
    },
    {
      title: 'הזמנות היום',
      value: snapshot.metrics.orders_today.toLocaleString('he-IL'),
      icon: '🧾',
      accent: '#a48bff',
      change: snapshot.metrics.orders_change,
      changeMode: 'percent' as const,
      caption: `שיא שעה: ${peakOrders.hour} • ${peakOrders.orders.toLocaleString('he-IL')}`
    },
    {
      title: 'היקף פריטים',
      value: snapshot.metrics.volume_today.toLocaleString('he-IL'),
      icon: '📦',
      accent: '#70d8ff',
      changeMode: 'absolute' as const,
      caption: 'סה״כ יחידות שסופקו'
    },
    {
      title: 'נהגים פעילים',
      value: `${snapshot.metrics.active_drivers}/${snapshot.metrics.total_drivers}`,
      icon: '🚚',
      accent: '#59f2a5',
      change: snapshot.metrics.online_ratio * 100,
      changeMode: 'percent' as const,
      caption: 'אונליין עכשיו'
    },
    {
      title: 'כיסוי אזורי',
      value: `${snapshot.metrics.zone_coverage}%`,
      icon: '🛰️',
      accent: '#f7c948',
      changeMode: 'absolute' as const,
      caption: `${snapshot.zone_coverage.filter(zone => zone.zone_id !== 'unassigned').length} אזורים במעקב`
    },
    {
      title: 'מלאי בסיכון',
      value: snapshot.metrics.low_stock_count.toString(),
      icon: '⚠️',
      accent: palette.critical,
      changeMode: 'absolute' as const,
      caption: `בקשות חידוש: ${snapshot.metrics.restock_pending}`
    }
  ];

  const sortedZones = snapshot.zone_coverage.filter(zone => zone.zone_id !== 'unassigned')
    .sort((a, b) => b.coverage_percent - a.coverage_percent);
  const unassigned = snapshot.zone_coverage.find(zone => zone.zone_id === 'unassigned');
  const lowStock = snapshot.low_stock_alerts.slice(0, 6);
  const restockQueue = snapshot.restock_requests.slice(0, 6);
  const recentNotifications = notifications.slice(0, 3);

  const handleExport = async (type: 'orders' | 'products') => {
    try {
      haptic('medium');
      let csv = '';
      let filename = '';
      if (type === 'orders' && dataStore.exportOrdersToCSV) {
        csv = await dataStore.exportOrdersToCSV();
        filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (type === 'products' && dataStore.exportProductsToCSV) {
        csv = await dataStore.exportProductsToCSV();
        filename = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      }

      if (!csv) {
        Toast.error('לא נמצאו נתונים לייצוא');
        return;
      }

      if (typeof document !== 'undefined') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      Toast.success('קובץ CSV מוכן למשלוח');
    } catch (error) {
      console.error('Export failed', error);
      Toast.error('נכשל ביצוא הקובץ');
    }
  };

  const handleSummary = async () => {
    haptic('medium');
    const summaryLines = [
      `📡 עדכון הנהלה ${generatedLabel}`,
      `₪ הכנסות: ${formatCurrency(snapshot.metrics.revenue_today)} (${formatChangeBadge(snapshot.metrics.revenue_change, 'percent')})`,
      `🧾 הזמנות: ${snapshot.metrics.orders_today.toLocaleString('he-IL')} (${formatChangeBadge(snapshot.metrics.orders_change, 'percent')})`,
      `🚚 נהגים פעילים: ${snapshot.metrics.active_drivers}/${snapshot.metrics.total_drivers}`,
      `🛰️ כיסוי אזורי: ${snapshot.metrics.zone_coverage}%`,
      `⚠️ מלאי בסיכון: ${snapshot.metrics.low_stock_count} • חידושים פתוחים: ${snapshot.metrics.restock_pending}`
    ];
    const summary = summaryLines.join('\n');

    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(summary);
        Toast.success('הסיכום הועתק. הדביקו בטלגרם לשליחה מיידית.');
        return;
      } catch (error) {
        console.warn('Clipboard write failed', error);
      }
    }

    alert(`העתיקו ושלחו בטלגרם:\n\n${summary}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: palette.background,
        color: palette.text,
        direction: 'rtl',
        padding: '24px 12px 80px'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px 20px',
            borderRadius: '20px',
            border: `1px solid ${palette.border}`,
            boxShadow: `0 18px 60px ${palette.accentSoft}`,
            background: 'rgba(12, 4, 26, 0.8)',
            backdropFilter: 'blur(18px)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '28px', fontWeight: 700 }}>
                <span role="img" aria-label="eye">👁️</span>
                <span>עין האל • Cockpit</span>
              </div>
              <div style={{ color: palette.subtle, fontSize: '14px' }}>
                {user?.name || 'מנהל'} • {roleNames.manager}
              </div>
            </div>
            <div
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                background: palette.accentSoft,
                color: palette.accent,
                fontSize: '13px'
              }}
            >
              עודכן {generatedLabel}
            </div>
          </div>
          <div style={{ color: palette.subtle, fontSize: '13px', lineHeight: 1.5 }}>
            שליטה מלאה בכל ערוצי העסק – הכנסות, תנועה בשטח, מלאי קריטי וטריגרים להפעלה מהירה בטלגרם.
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {metricCards.map(card => (
            <ManagerMetricCard key={card.title} palette={palette} {...card} />
          ))}
        </div>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <ManagerChartCard
            title="קצב הכנסות"
            primary={formatCurrency(snapshot.metrics.revenue_today)}
            secondary={'סה"כ היום'}
            data={snapshot.hourly}
            valueKey="revenue"
            palette={palette}
            gradientId="revenueGradient"
            footer={`שיא שעה: ${peakRevenue.hour} • ${formatCurrency(peakRevenue.revenue)}`}
            labelKey="hour"
          />
          <ManagerChartCard
            title="הזמנות לשעה"
            primary={snapshot.metrics.orders_today.toLocaleString('he-IL')}
            secondary="הזמנות היום"
            data={snapshot.hourly}
            valueKey="orders"
            palette={{ ...palette, accent: '#9c6aff' }}
            gradientId="ordersGradient"
            footer={`קצב נוכחי: ${(snapshot.hourly[snapshot.hourly.length - 1]?.orders || 0).toLocaleString('he-IL')} לשעה`}
            labelKey="hour"
          />
        </div>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <ZoneCoverageList zones={sortedZones} unassigned={unassigned} palette={palette} onNavigate={onNavigate} />
          <div style={{ display: 'grid', gap: '16px' }}>
            <LowStockPanel alerts={lowStock} palette={palette} />
            <RestockPanel requests={restockQueue} palette={palette} />
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <QuickActionButton
            icon="📤"
            title="ייצוא הזמנות"
            description="CSV מוכן לשיתוף בטלגרם"
            onClick={() => handleExport('orders')}
            palette={palette}
          />
          <QuickActionButton
            icon="📦"
            title="ייצוא מלאי"
            description="צילום מצב מלאי להנהלה"
            onClick={() => handleExport('products')}
            palette={palette}
          />
          <QuickActionButton
            icon="🚀"
            title="סיכום 60 שניות"
            description="העתק ושלח בערוץ ההנהלה"
            onClick={handleSummary}
            palette={palette}
          />
          <QuickActionButton
            icon="🗂️"
            title="מעבר להזמנות"
            description="פתיחת לוח הזמנות בזמן אמת"
            onClick={() => {
              haptic('light');
              onNavigate('orders');
            }}
            palette={palette}
          />
        </div>

        <ManagerNotificationPanel notifications={recentNotifications} palette={palette} />
      </div>
    </div>
  );
}

function formatChangeBadge(value: number, mode: 'percent' | 'absolute') {
  if (!Number.isFinite(value)) return '—';
  if (mode === 'percent') {
    if (value === 0) return '0%';
    const arrow = value > 0 ? '▲' : '▼';
    return `${arrow} ${Math.abs(value).toFixed(1)}%`;
  }
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(Math.round(value))}`;
}

function ManagerMetricCard({
  title,
  value,
  icon,
  accent,
  change,
  changeMode,
  caption,
  palette
}: {
  title: string;
  value: string;
  icon: string;
  accent: string;
  change?: number;
  changeMode: 'percent' | 'absolute';
  caption?: string;
  palette: ManagerPalette;
}) {
  const changeLabel = typeof change === 'number' ? formatChangeBadge(change, changeMode) : null;
  const changeColor = changeLabel && changeMode === 'percent'
    ? (change && change >= 0 ? accent : palette.critical)
    : accent;

  return (
    <div
      style={{
        background: palette.card,
        borderRadius: '18px',
        border: `1px solid ${palette.border}`,
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: `0 12px 32px rgba(0,0,0,0.22)`
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: palette.subtle, fontSize: '13px', fontWeight: 600 }}>{title}</div>
        <span style={{ fontSize: '24px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '30px', fontWeight: 700, color: palette.text }}>{value}</div>
      {changeLabel && (
        <div style={{ color: changeColor, fontSize: '12px', fontWeight: 600 }}>{changeLabel}</div>
      )}
      {caption && (
        <div style={{ color: palette.subtle, fontSize: '12px' }}>{caption}</div>
      )}
    </div>
  );
}

function ManagerChartCard({
  title,
  primary,
  secondary,
  data,
  valueKey,
  palette,
  gradientId,
  footer,
  labelKey
}: {
  title: string;
  primary: string;
  secondary: string;
  data: any[];
  valueKey: 'revenue' | 'orders' | 'volume';
  palette: ManagerPalette;
  gradientId: string;
  footer?: string;
  labelKey: 'hour' | 'date';
}) {
  const startLabel = data[0]?.[labelKey] || (labelKey === 'hour' ? '00:00' : 'יום 1');
  const endLabel = data[data.length - 1]?.[labelKey] || (labelKey === 'hour' ? '24:00' : 'יום אחרון');

  return (
    <div
      style={{
        background: palette.card,
        border: `1px solid ${palette.border}`,
        borderRadius: '18px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 14px 40px rgba(0,0,0,0.18)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ color: palette.subtle, fontSize: '14px', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: palette.text }}>{primary}</div>
      </div>
      <div style={{ color: palette.subtle, fontSize: '12px' }}>{secondary}</div>
      <Sparkline data={data} valueKey={valueKey} color={palette.accent} gradientId={gradientId} />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: palette.subtle, fontSize: '12px' }}>
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
      {footer && (
        <div style={{ fontSize: '12px', color: palette.accent }}>{footer}</div>
      )}
    </div>
  );
}

function Sparkline({ data, valueKey, color, gradientId }: { data: any[]; valueKey: 'revenue' | 'orders' | 'volume'; color: string; gradientId: string; }) {
  const valuesRaw = data.map(point => Number(point?.[valueKey] ?? 0));
  const safeValues = valuesRaw.length >= 2 ? valuesRaw : valuesRaw.length === 1 ? [valuesRaw[0], valuesRaw[0]] : [0, 0];
  const max = Math.max(...safeValues);
  const min = Math.min(...safeValues);
  const range = max - min || 1;
  const points = safeValues.map((value, index) => {
    const ratio = safeValues.length === 1 ? 0 : index / (safeValues.length - 1);
    const x = ratio * 100;
    const y = 35 - ((value - min) / range) * 25;
    const boundedY = Math.max(5, Math.min(35, y));
    return `${x.toFixed(2)},${boundedY.toFixed(2)}`;
  });
  const areaPoints = ['0,35', ...points, '100,35'].join(' ');

  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: '80px' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points="0,35 100,35" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />
      <polygon points={areaPoints} fill={`url(#${gradientId})`} opacity={0.7} />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

function ZoneCoverageList({
  zones,
  unassigned,
  palette,
  onNavigate
}: {
  zones: ManagerDashboardSnapshot['zone_coverage'];
  unassigned?: ManagerDashboardSnapshot['zone_coverage'][number];
  palette: ManagerPalette;
  onNavigate: (page: string) => void;
}) {
  return (
    <div
      style={{
        background: palette.card,
        border: `1px solid ${palette.border}`,
        borderRadius: '18px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: palette.subtle, fontSize: '14px', fontWeight: 600 }}>פריסת אזורים</div>
        <button
          onClick={() => onNavigate('dispatch-board')}
          style={{
            background: 'transparent',
            border: `1px solid ${palette.border}`,
            borderRadius: '999px',
            color: palette.accent,
            padding: '4px 12px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          פתיחת מפה
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {zones.map(zone => (
          <div key={zone.zone_id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: palette.text, fontWeight: 600 }}>
              <span>{zone.zone_name}</span>
              <span>{zone.coverage_percent}%</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(zone.coverage_percent, 100)}%`,
                  background: palette.accent,
                  height: '100%',
                  boxShadow: `0 0 12px ${palette.glow}`
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: palette.subtle, fontSize: '12px' }}>
              <span>נהגים: {zone.active_drivers}/{Math.max(zone.assigned_drivers, 1)}</span>
              <span>משימות פתוחות: {zone.open_orders}</span>
            </div>
          </div>
        ))}
      </div>
      {unassigned && unassigned.open_orders > 0 && (
        <div
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            borderRadius: '12px',
            background: 'rgba(255, 107, 107, 0.12)',
            color: palette.critical,
            fontSize: '12px'
          }}
        >
          {unassigned.open_orders} הזמנות ממתינות לשיוך לאזור פעיל
        </div>
      )}
    </div>
  );
}

function LowStockPanel({ alerts, palette }: { alerts: ManagerDashboardSnapshot['low_stock_alerts']; palette: ManagerPalette; }) {
  return (
    <div
      style={{
        background: palette.card,
        border: `1px solid ${palette.border}`,
        borderRadius: '18px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, color: palette.subtle }}>⚠️ מלאי נמוך</div>
        <div style={{ color: palette.subtle, fontSize: '12px' }}>{alerts.length} פריטים</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {alerts.length === 0 && (
          <div style={{ color: palette.subtle, fontSize: '13px' }}>אין התרעות כרגע – המלאי מאוזן.</div>
        )}
        {alerts.map(alert => (
          <div
            key={`${alert.product_id}-${alert.location_id}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              padding: '10px 12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>{alert.product_name}</span>
              <span style={{ color: palette.critical }}>{alert.on_hand_quantity} יח׳</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: palette.subtle, fontSize: '12px' }}>
              <span>{alert.location_name}</span>
              <span>סף: {alert.low_stock_threshold}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RestockPanel({ requests, palette }: { requests: ManagerDashboardSnapshot['restock_requests']; palette: ManagerPalette; }) {
  return (
    <div
      style={{
        background: palette.card,
        border: `1px solid ${palette.border}`,
        borderRadius: '18px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, color: palette.subtle }}>🔄 בקשות חידוש</div>
        <div style={{ color: palette.subtle, fontSize: '12px' }}>{requests.length} פתוחות</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {requests.length === 0 && (
          <div style={{ color: palette.subtle, fontSize: '13px' }}>אין בקשות חידוש פעילות.</div>
        )}
        {requests.map(request => (
          <div
            key={request.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              padding: '10px 12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>{request.product?.name || request.product_id}</span>
              <span>{request.requested_quantity.toLocaleString('he-IL')} יח׳</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: palette.subtle, fontSize: '12px' }}>
              <span>{request.to_location?.name || 'מרכזי'}</span>
              <span>{request.status === 'pending' ? 'ממתין לאישור' : request.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManagerNotificationPanel({ notifications, palette }: { notifications: Notification[]; palette: ManagerPalette; }) {
  return (
    <div
      style={{
        background: palette.card,
        border: `1px solid ${palette.border}`,
        borderRadius: '18px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600, color: palette.subtle }}>התראות אחרונות</div>
        <div style={{ color: palette.subtle, fontSize: '12px' }}>{notifications.length > 0 ? `${notifications.length} חדשות` : 'שקט מבורך'}</div>
      </div>
      {notifications.length === 0 && (
        <div style={{ color: palette.subtle, fontSize: '13px' }}>אין התראות חדשות. המשך עבודה נהדרת.</div>
      )}
      {notifications.map(notification => (
        <div
          key={notification.id}
          style={{
            padding: '12px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ fontWeight: 600, color: palette.text }}>{notification.title}</div>
          <div style={{ color: palette.subtle, fontSize: '12px' }}>{notification.message}</div>
        </div>
      ))}
    </div>
  );
}

function QuickActionButton({ icon, title, description, onClick, palette }: { icon: string; title: string; description: string; onClick: () => void | Promise<void>; palette: ManagerPalette; }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${palette.border}`,
        borderRadius: '16px',
        padding: '16px',
        textAlign: 'right',
        color: palette.text,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
    >
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <div style={{ fontWeight: 600, fontSize: '16px' }}>{title}</div>
      <div style={{ color: palette.subtle, fontSize: '13px', lineHeight: 1.4 }}>{description}</div>
    </button>
  );
}

function getNotificationColor(type: string): string {
  switch (type) {
    case 'error': return '#ff3b30';
    case 'warning': return '#ff9500';
    case 'success': return '#34c759';
    default: return '#007aff';
  }
}

function getQuickActions(role?: string) {
  switch (role) {
    case 'user':
      return [
        { title: 'צפה בהזמנות', subtitle: 'ההזמנות שלי', icon: '📋', page: 'orders' },
        { title: 'צ\'אטים', subtitle: 'תקשורת מאובטחת', icon: '💬', page: 'chat' },
        { title: 'הגדרות', subtitle: 'ניהול חשבון', icon: '⚙️', page: 'settings' }
      ];
    case 'manager':
      return [
        { title: 'לוח ביצועים', subtitle: 'מבט מהיר על העסק', icon: '📊', page: 'stats' },
        { title: 'שותפים עסקיים', subtitle: 'ניהול ספקים ושיתופי פעולה', icon: '🤝', page: 'partners' },
        { title: 'הזמנות פעילות', subtitle: 'צפייה ויצירת הזמנות', icon: '🧾', page: 'orders' }
      ];
    case 'dispatcher':
      return [
        { title: 'ניהול הזמנות', subtitle: 'תיאום משלוחים', icon: '📋', page: 'orders' },
        { title: 'משימות', subtitle: 'הקצאת משימות', icon: '✅', page: 'tasks' }
      ];
    case 'driver':
      return [
        { title: 'המשלוחים שלי', subtitle: 'משלוחים להיום', icon: '🚚', page: 'my-deliveries' },
        { title: 'סטטוס נהג', subtitle: 'עדכון מצב נוכחי', icon: '📍', page: 'driver-status' }
      ];
    case 'warehouse':
      return [
        { title: 'ניהול מלאי', subtitle: 'רמות מלאי ומיקומים', icon: '📦', page: 'inventory' },
        { title: 'בקשות חידוש', subtitle: 'טיפול בבקשות מלאי', icon: '🔄', page: 'restock-requests' }
      ];
    case 'sales':
      return [
        { title: 'הזמנות לקוחות', subtitle: 'ניהול הזמנות פתוחות', icon: '🧾', page: 'orders' },
        { title: 'הביצועים שלי', subtitle: 'יעדים ועמלות', icon: '📈', page: 'my-stats' }
      ];
    default:
      return [
        { title: 'הזמנות', subtitle: 'שירות לקוחות', icon: '📋', page: 'orders' },
        { title: 'לקוחות', subtitle: 'תמיכה ושירות', icon: '👥', page: 'customers' }
      ];
  }
}

function StatCard({ title, value, color, theme, isText = false }: { 
  title: string; 
  value: number | string; 
  color: string;
  theme: any;
  isText?: boolean;
}) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color || '#f1f1f1',
      borderRadius: '12px',
      textAlign: 'center'
    }}>
      <div style={{ 
        fontSize: isText ? '16px' : '24px', 
        fontWeight: '700', 
        color,
        marginBottom: '4px'
      }}>
        {value}
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: theme.hint_color,
        fontWeight: '500'
      }}>
        {title}
      </div>
    </div>
  );
}

function ActionButton({ title, subtitle, icon, onClick, theme, haptic }: {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  theme: any;
  haptic: () => void;
}) {
  return (
    <button
      onClick={() => {
        haptic();
        onClick();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        textAlign: 'right',
        width: '100%'
      }}
    >
      <div style={{ fontSize: '24px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: theme.text_color,
          marginBottom: '4px'
        }}>
          {title}
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: theme.hint_color
        }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}