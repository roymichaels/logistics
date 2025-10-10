import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { useSkeleton } from '../hooks/useSkeleton';
import { Toast } from '../components/Toast';
import { OwnerDashboard } from '../components/OwnerDashboard';
import { ManagerDashboard } from '../components/ManagerDashboard';
import type { FrontendDataStore } from '../lib/frontendDataStore';
import { registerDashboardSubscriptions } from './subscriptionHelpers';
import {
  User,
  RoyalDashboardSnapshot,
  RoyalDashboardMetrics,
  RoyalDashboardAgent,
  RoyalDashboardLowStockAlert,
  RoyalDashboardRestockRequest,
  RoyalDashboardZoneCoverage,
  RoyalDashboardChartPoint
} from '../data/types';
import { formatCurrency, hebrew } from '../lib/hebrew';

interface DashboardProps {
  dataStore: FrontendDataStore;
  onNavigate: (page: string) => void;
}

const numberFormatter = new Intl.NumberFormat('he-IL');

const ROYAL_COLORS = {
  background: 'radial-gradient(125% 125% at 50% 0%, rgba(95, 46, 170, 0.55) 0%, rgba(12, 2, 25, 0.95) 45%, #03000a 100%)',
  card: 'rgba(24, 10, 45, 0.75)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  muted: '#bfa9ff',
  text: '#f4f1ff',
  accent: '#9c6dff',
  gold: '#f6c945',
  crimson: '#ff6b8a',
  teal: '#4dd0e1',
  emerald: '#4ade80',
  shadow: '0 20px 40px rgba(20, 4, 54, 0.45)'
};

export function Dashboard({ dataStore, onNavigate }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [snapshot, setSnapshot] = useState<RoyalDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const { mainButton, backButton, haptic } = useTelegramUI();
  const showSkeleton = useSkeleton(220);
  const hasTelegramSend = typeof window !== 'undefined' && !!window.Telegram?.WebApp?.sendData;

  const loadDashboard = useCallback(async () => {
    if (!dataStore) {
      return;
    }

    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      // Owner and Manager get custom dashboards
      if (profile.role === 'owner' || profile.role === 'manager') {
        setLoading(false);
        return;
      }

      const royalData = dataStore.getRoyalDashboardSnapshot
        ? await dataStore.getRoyalDashboardSnapshot()
        : createRoyalFallback();
      setSnapshot(royalData);
    } catch (error) {
      console.error('Failed to load royal dashboard', error);
      Toast.error('שגיאה בטעינת לוח הבקרה המלכותי');
      setSnapshot(createRoyalFallback());
    } finally {
      setLoading(false);
    }
  }, [dataStore]);

  useEffect(() => {
    backButton.hide();
    void loadDashboard();
  }, [backButton, loadDashboard]);

  const summaryText = useMemo(() => {
    if (!snapshot) return '';
    return buildSummary(snapshot, user);
  }, [snapshot, user]);

  const handleSendSummary = useCallback(() => {
    if (!snapshot) return;

    try {
      haptic('medium');
      const payload = summaryText;
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(payload);
        Toast.success('הסיכום נשלח לטלגרם');
      } else if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(payload);
        Toast.success('הסיכום הועתק ללוח');
      } else {
        Toast.show('העתיקו את הסיכום ידנית:', 'info');
        console.info(payload);
      }
    } catch (error) {
      console.error('Failed to deliver summary', error);
      Toast.error('לא הצלחנו לשדר את הסיכום');
    }
  }, [snapshot, summaryText, haptic]);

  const handleInventoryAlert = useCallback(
    (payload: unknown) => {
      const event = (payload ?? {}) as InventoryAlertPayload;

      setSnapshot(prev => {
        if (!prev) {
          void loadDashboard();
          return prev;
        }

        if (isInventoryAlertRemoval(event)) {
          const oldAlert = normalizeInventoryAlert(event.old ?? event.record ?? null);
          if (!oldAlert) {
            return prev;
          }

          const updatedAlerts = prev.lowStockAlerts.filter(
            alert => alert.product_id !== oldAlert.product_id || alert.location_id !== oldAlert.location_id
          );

          if (updatedAlerts.length === prev.lowStockAlerts.length) {
            return prev;
          }

          return {
            ...prev,
            lowStockAlerts: updatedAlerts
          };
        }

        const nextAlert = normalizeInventoryAlert(event.new ?? event.record ?? event);
        if (!nextAlert) {
          return prev;
        }

        const remainingAlerts = prev.lowStockAlerts.filter(
          alert => alert.product_id !== nextAlert.product_id || alert.location_id !== nextAlert.location_id
        );

        return {
          ...prev,
          lowStockAlerts: [nextAlert, ...remainingAlerts]
        };
      });
    },
    [loadDashboard]
  );

  useEffect(() => {
    if (!dataStore) {
      return;
    }

    const cleanup = registerDashboardSubscriptions(dataStore, {
      onSnapshotRefresh: () => {
        void loadDashboard();
      },
      onInventoryAlert: handleInventoryAlert
    });

    return cleanup;
  }, [dataStore, loadDashboard, handleInventoryAlert]);

  // Main button disabled - removed per user request
  // useEffect(() => {
  //   if (!snapshot) return;
  //   mainButton.show('שלח סיכום לטלגרם', handleSendSummary);
  //   return () => {
  //     mainButton.hide();
  //   };
  // }, [snapshot, handleSendSummary, mainButton]);

  if (loading || showSkeleton) {
    return <RoyalSkeleton />;
  }

  // Owner gets comprehensive system-wide dashboard
  if (user?.role === 'owner') {
    return <OwnerDashboard dataStore={dataStore} user={user} onNavigate={onNavigate} />;
  }

  // Manager gets department-specific dashboard
  if (user?.role === 'manager') {
    return <ManagerDashboard dataStore={dataStore} user={user} onNavigate={onNavigate} />;
  }

  // Simple welcome screen for regular users
  if (user?.role === 'user') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--tg-theme-bg-color, #ffffff)',
          padding: '40px 20px',
          color: 'var(--tg-theme-text-color, #000)',
          direction: 'rtl',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>
            שלום, {user.name || 'משתמש'}! 👋
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'var(--tg-theme-hint-color, #999)',
            marginBottom: '40px',
            lineHeight: '1.6'
          }}>
            ברוכים הבאים למערכת ניהול הלוגיסטיקה
          </p>
          <div style={{
            padding: '24px',
            backgroundColor: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
            borderRadius: '12px',
            marginBottom: '24px',
            textAlign: 'right'
          }}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>פרטי המשתמש שלך:</h3>
            <p style={{ marginBottom: '8px' }}>שם: {user.name}</p>
            {user.username && <p style={{ marginBottom: '8px' }}>שם משתמש: @{user.username}</p>}
            <p style={{ marginBottom: '8px' }}>תפקיד: משתמש רגיל</p>
          </div>
          <div style={{
            padding: '24px',
            backgroundColor: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
            borderRadius: '12px',
            textAlign: 'right'
          }}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>מידע חשוב:</h3>
            <p style={{ lineHeight: '1.6', color: 'var(--tg-theme-hint-color, #666)' }}>
              חשבונך נוצר בהצלחה. כרגע אין לך הרשאות גישה למערכת הלוגיסטיקה.
              <br /><br />
              אם אתה צריך גישה למערכת, אנא פנה למנהל המערכת להעלאת הרשאות.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return <RoyalSkeleton />;
  }

  const { metrics, revenueTrend, ordersPerHour, agents, zones, lowStockAlerts, restockQueue } = snapshot;
  const topAgents = agents.slice(0, 6);
  const coverageLeaders = zones.slice().sort((a, b) => b.coveragePercent - a.coveragePercent).slice(0, 4);
  const lowStockTop = lowStockAlerts.slice(0, 5);
  const restockTop = restockQueue.slice(0, 5);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: ROYAL_COLORS.background,
        padding: '28px clamp(16px, 5vw, 40px)',
        color: ROYAL_COLORS.text,
        direction: 'rtl',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(80% 80% at 80% 10%, rgba(246, 201, 69, 0.08) 0%, rgba(20, 6, 58, 0) 60%), radial-gradient(65% 65% at 15% 20%, rgba(157, 78, 221, 0.18) 0%, rgba(38, 12, 85, 0) 70%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%' }}>
        <RoyalHeader user={user} metrics={metrics} onNavigate={onNavigate} />

        {/* Metric Cards - Full Width Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <RoyalMetricCard
            label="הכנסות היום"
            value={formatCurrency(metrics.revenueToday)}
            subtitle={`נסגרו ${numberFormatter.format(metrics.deliveredToday)} משלוחים`}
            tone="gold"
            icon="₪"
          />
          <RoyalMetricCard
            label="הזמנות פעילות"
            value={numberFormatter.format(metrics.pendingOrders)}
            subtitle={`${numberFormatter.format(metrics.outstandingDeliveries)} בדרך ליעד`}
            tone="crimson"
            icon="🚨"
          />
          <RoyalMetricCard
            label="נהגים מחוברים"
            value={numberFormatter.format(metrics.activeDrivers)}
            subtitle={`כיסוי ${numberFormatter.format(metrics.coveragePercent)}% מהאזורים`}
            tone="teal"
            icon="🛰️"
          />
          <RoyalMetricCard
            label="שווי משלוח ממוצע"
            value={formatCurrency(metrics.averageOrderValue || 0)}
            subtitle="עסקאות ברמת פרימיום"
            tone="purple"
            icon="💎"
          />
        </div>

        {/* Charts - Full Width Stack */}
        <RoyalSection title="עקומת הכנסות - 7 ימים" accent>
          <RoyalLineChart data={revenueTrend} color={ROYAL_COLORS.gold} />
        </RoyalSection>

        <RoyalSection title="קצב הזמנות / שעה" accent>
          <RoyalBarChart data={ordersPerHour} color={ROYAL_COLORS.accent} />
        </RoyalSection>

        {/* Agents Section - Full Width */}
        <RoyalSection title="שליטה בסוכנים" description="סטטוס נהגים בזמן אמת">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topAgents.length === 0 && (
              <RoyalEmptyState message="אין נהגים מחוברים כעת" />
            )}
            {topAgents.map(agent => (
              <RoyalAgentRow key={agent.id} agent={agent} />
            ))}
          </div>
        </RoyalSection>

        {/* Zone Coverage - Full Width */}
        <RoyalSection title="כיסוי אזורי" description="מי שומר על השליטה">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {coverageLeaders.map(zone => (
              <RoyalZoneCard key={zone.zoneId} zone={zone} />
            ))}
          </div>
        </RoyalSection>

        {/* Low Stock Alerts - Full Width */}
        <RoyalSection title="אזהרות מלאי נמוך" description="איפה יש פרצה בחומה?">
          <RoyalAlertList alerts={lowStockTop} />
        </RoyalSection>

        {/* Restock Requests - Full Width */}
        <RoyalSection title="בקשות חידוש" description="מה ממתין לאישור">
          <RoyalRestockList requests={restockTop} />
        </RoyalSection>

        {/* Actions - Full Width */}
        <RoyalSection title="פקודות Empire" description="כלים מידיים להורדת דוחות ופריסת מידע">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            <RoyalActionButton label="ייצוא CSV" icon="⬇️" onClick={() => handleExport(snapshot, 'csv', haptic)} />
            <RoyalActionButton label="ייצוא JSON" icon="🧾" onClick={() => handleExport(snapshot, 'json', haptic)} />
          </div>
        </RoyalSection>
      </div>
    </div>
  );
}

function RoyalHeader({ user, metrics, onNavigate }: { user: User | null; metrics: RoyalDashboardMetrics; onNavigate: (page: string) => void }) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return hebrew.good_morning;
    if (hour < 18) return hebrew.good_afternoon;
    return hebrew.good_evening;
  }, []);

  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: '24px',
        background: 'linear-gradient(120deg, rgba(82, 36, 142, 0.55), rgba(20, 9, 49, 0.8))',
        borderRadius: '22px',
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        boxShadow: ROYAL_COLORS.shadow,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(55% 55% at 85% 20%, rgba(246, 201, 69, 0.22) 0%, rgba(59, 20, 106, 0) 60%)',
          pointerEvents: 'none'
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{greeting}, {user?.name || 'מפקדת'}</div>
            <div style={{ color: ROYAL_COLORS.muted, fontSize: '15px', marginTop: '4px' }}>
              👑 מצב האימפריה מעודכן. הכנסות היום: <strong>{formatCurrency(metrics.revenueToday)}</strong>
            </div>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            style={{
              border: 'none',
              background: 'rgba(255, 255, 255, 0.08)',
              color: ROYAL_COLORS.text,
              padding: '10px 16px',
              borderRadius: '999px',
              fontSize: '14px',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)'
            }}
          >
            תצוגת הזמנות →
          </button>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <RoyalBadge text="מצב מלכותי פעיל" tone="gold" />
          <RoyalBadge text={`כיסוי ${numberFormatter.format(metrics.coveragePercent)}%`} tone="accent" />
          <RoyalBadge text={`${numberFormatter.format(metrics.activeDrivers)} נהגים בזירה`} tone="outline" />
        </div>
      </div>
    </header>
  );
}

function RoyalMetricCard({ label, value, subtitle, tone, icon }: { label: string; value: string; subtitle?: string; tone: 'gold' | 'crimson' | 'teal' | 'purple'; icon?: string }) {
  const toneColor = {
    gold: ROYAL_COLORS.gold,
    crimson: ROYAL_COLORS.crimson,
    teal: ROYAL_COLORS.teal,
    purple: ROYAL_COLORS.accent
  }[tone];

  return (
    <div
      style={{
        width: '100%',
        padding: '20px',
        borderRadius: '20px',
        background: ROYAL_COLORS.card,
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        boxShadow: ROYAL_COLORS.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <div style={{ fontSize: '15px', color: ROYAL_COLORS.muted }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon && (
          <span style={{ fontSize: '28px' }}>{icon}</span>
        )}
        <div style={{ fontSize: '28px', fontWeight: 700, color: toneColor }}>{value}</div>
      </div>
      {subtitle && <div style={{ color: ROYAL_COLORS.muted, fontSize: '13px' }}>{subtitle}</div>}
    </div>
  );
}

function RoyalGrid({ children, columns, gap }: { children: React.ReactNode; columns: string; gap?: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        gap: gap || '20px',
        alignItems: 'stretch'
      }}
    >
      {children}
    </div>
  );
}

function RoyalSection({
  children,
  title,
  description,
  accent
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  accent?: boolean;
}) {
  return (
    <section
      style={{
        width: '100%',
        padding: '24px',
        borderRadius: '22px',
        background: accent
          ? 'linear-gradient(140deg, rgba(63, 33, 109, 0.75), rgba(22, 10, 42, 0.85))'
          : ROYAL_COLORS.card,
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        boxShadow: ROYAL_COLORS.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        minHeight: '220px'
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{title}</h2>
        {description && <p style={{ margin: '6px 0 0', color: ROYAL_COLORS.muted, fontSize: '13px' }}>{description}</p>}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{children}</div>
    </section>
  );
}

function RoyalLineChart({ data, color }: { data: RoyalDashboardChartPoint[]; color: string }) {
  if (data.length === 0) {
    return <RoyalEmptyState message="אין נתונים להצגה" />;
  }

  const maxValue = Math.max(...data.map(point => point.value), 1);
  const points = data.map((point, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - (point.value / maxValue) * 100;
    return `${x},${y}`;
  });

  const gradientId = `royal-line-${Math.round(Math.random() * 10000)}`;

  return (
    <div style={{ width: '100%', height: '220px', position: 'relative' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points.join(' ')} 100,100`}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: ROYAL_COLORS.muted,
          paddingTop: '6px'
        }}
      >
        {data.map(point => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

function RoyalBarChart({ data, color }: { data: RoyalDashboardChartPoint[]; color: string }) {
  if (data.length === 0) {
    return <RoyalEmptyState message="אין נתונים להצגה" />;
  }
  const maxValue = Math.max(...data.map(point => point.value), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '220px' }}>
      {data.map(point => {
        const height = (point.value / maxValue) * 100;
        return (
          <div key={point.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '100%',
                height: `${Math.max(height, 6)}%`,
                borderRadius: '12px 12px 4px 4px',
                background: `linear-gradient(180deg, ${color}, rgba(156, 109, 255, 0.25))`,
                boxShadow: '0 8px 20px rgba(40, 12, 82, 0.45)'
              }}
            />
            <span style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function RoyalAgentRow({ agent }: { agent: RoyalDashboardAgent }) {
  const statusTone = agent.status === 'offline' ? 'rgba(255, 255, 255, 0.2)' : ROYAL_COLORS.accent;
  const statusLabel = agent.status === 'offline' ? 'מנותק' : agent.status === 'available' ? 'זמין' : 'במשימה';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: '16px',
        background: 'rgba(20, 8, 46, 0.6)',
        border: `1px solid rgba(156, 109, 255, 0.25)`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(130deg, rgba(80, 33, 140, 0.7), rgba(33, 12, 73, 0.7))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}
        >
          {agent.name?.[0] || '👤'}
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{agent.name}</div>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
            {agent.zone || 'ללא אזור'} · {numberFormatter.format(agent.ordersInProgress)} משלוחים פתוחים
          </div>
        </div>
      </div>
      <RoyalBadge text={statusLabel} tone="custom" color={statusTone} />
    </div>
  );
}

function RoyalZoneCard({ zone }: { zone: RoyalDashboardZoneCoverage }) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '18px',
        background: 'rgba(18, 6, 38, 0.75)',
        border: `1px solid rgba(156, 109, 255, 0.25)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{zone.zoneName}</strong>
        <span style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>{numberFormatter.format(zone.activeDrivers)} נהגים</span>
      </div>
      <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
        {zone.outstandingOrders > 0
          ? `${numberFormatter.format(zone.outstandingOrders)} משלוחים ממתינים`
          : 'אין משלוחים ממתינים'}
      </div>
      <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(zone.coveragePercent, 100)}%`,
            background: `linear-gradient(90deg, ${ROYAL_COLORS.accent}, ${ROYAL_COLORS.gold})`,
            height: '100%'
          }}
        />
      </div>
      <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
        כיסוי {numberFormatter.format(zone.coveragePercent)}%
      </div>
    </div>
  );
}

function RoyalAlertList({ alerts }: { alerts: RoyalDashboardLowStockAlert[] }) {
  if (alerts.length === 0) {
    return <RoyalEmptyState message="המלאי בשליטה" />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {alerts.map(alert => (
        <div
          key={`${alert.product_id}-${alert.location_id}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: 'rgba(65, 23, 66, 0.65)',
            padding: '14px',
            borderRadius: '16px',
            border: `1px solid rgba(255, 107, 138, 0.4)`
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{alert.product_name}</div>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>{alert.location_name}</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: ROYAL_COLORS.crimson, fontWeight: 600 }}>
              {numberFormatter.format(alert.on_hand_quantity)} יחידות
            </div>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
              סף {numberFormatter.format(alert.low_stock_threshold)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoyalRestockList({ requests }: { requests: RoyalDashboardRestockRequest[] }) {
  if (requests.length === 0) {
    return <RoyalEmptyState message="אין בקשות פתוחות" />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {requests.map(request => (
        <div
          key={request.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: 'rgba(18, 44, 63, 0.65)',
            padding: '14px',
            borderRadius: '16px',
            border: `1px solid rgba(77, 208, 225, 0.4)`
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{request.product_name || 'מוצר לא מזוהה'}</div>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>{request.to_location_name || 'מרכז ראשי'}</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: ROYAL_COLORS.teal, fontWeight: 600 }}>
              {numberFormatter.format(request.requested_quantity)} יחידות
            </div>
            <RoyalBadge text={translateStatus(request.status)} tone="outline" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RoyalEmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        borderRadius: '18px',
        border: `1px dashed rgba(255, 255, 255, 0.2)`,
        padding: '24px',
        textAlign: 'center',
        color: ROYAL_COLORS.muted,
        background: 'rgba(12, 3, 25, 0.4)'
      }}
    >
      {message}
    </div>
  );
}

function RoyalBadge({ text, tone, color }: { text: string; tone: 'gold' | 'accent' | 'outline' | 'custom'; color?: string }) {
  const palette = {
    gold: { background: 'rgba(246, 201, 69, 0.18)', border: 'rgba(246, 201, 69, 0.35)', color: ROYAL_COLORS.gold },
    accent: { background: 'rgba(156, 109, 255, 0.2)', border: 'rgba(156, 109, 255, 0.35)', color: ROYAL_COLORS.accent },
    outline: { background: 'transparent', border: 'rgba(255, 255, 255, 0.35)', color: ROYAL_COLORS.text },
    custom: { background: color || 'rgba(255,255,255,0.18)', border: color || 'rgba(255,255,255,0.35)', color: ROYAL_COLORS.text }
  }[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '999px',
        background: palette.background,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: '12px',
        fontWeight: 600
      }}
    >
      {text}
    </span>
  );
}

function RoyalActionButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        border: 'none',
        background: 'linear-gradient(120deg, rgba(156, 109, 255, 0.45), rgba(43, 16, 88, 0.85))',
        color: ROYAL_COLORS.text,
        padding: '14px 20px',
        borderRadius: '14px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: '0 12px 24px rgba(30, 10, 70, 0.45)'
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function translateStatus(status: string) {
  switch (status) {
    case 'approved':
      return 'מאושר';
    case 'in_transit':
      return 'בדרך';
    case 'fulfilled':
      return 'הושלם';
    default:
      return 'בהמתנה';
  }
}

function handleExport(snapshot: RoyalDashboardSnapshot, format: 'csv' | 'json', haptic: (type?: 'light' | 'medium' | 'heavy') => void) {
  try {
    haptic('light');
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8;' });
      triggerDownload(blob, `royal-dashboard-${Date.now()}.json`);
    } else {
      const rows = buildCsvRows(snapshot);
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, `royal-dashboard-${Date.now()}.csv`);
    }
    Toast.success('הדוח ירד בהצלחה');
  } catch (error) {
    console.error('Failed to export dashboard', error);
    Toast.error('לא הצלחנו להפיק את הדוח');
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildCsvRows(snapshot: RoyalDashboardSnapshot) {
  const rows: string[] = [];
  rows.push('קטגוריה,מדד,ערך');
  rows.push(`מדדים,הכנסות היום,${snapshot.metrics.revenueToday}`);
  rows.push(`מדדים,הזמנות היום,${snapshot.metrics.ordersToday}`);
  rows.push(`מדדים,הזמנות סגורות,${snapshot.metrics.deliveredToday}`);
  rows.push(`מדדים,שווי ממוצע,${snapshot.metrics.averageOrderValue}`);
  rows.push(`מדדים,הזמנות פעילות,${snapshot.metrics.pendingOrders}`);
  rows.push(`מדדים,נהגים פעילים,${snapshot.metrics.activeDrivers}`);
  rows.push(`מדדים,כיסוי אזורי (%),${snapshot.metrics.coveragePercent}`);
  rows.push(`מדדים,משלוחים פתוחים,${snapshot.metrics.outstandingDeliveries}`);

  snapshot.revenueTrend.forEach(point => {
    rows.push(`הכנסות לפי יום,${point.label},${point.value}`);
  });
  snapshot.ordersPerHour.forEach(point => {
    rows.push(`הזמנות לפי שעה,${point.label},${point.value}`);
  });
  snapshot.lowStockAlerts.forEach(alert => {
    rows.push(`מלאי נמוך,${alert.product_name} (${alert.location_name}),${alert.on_hand_quantity}`);
  });
  snapshot.restockQueue.forEach(request => {
    rows.push(`בקשות חידוש,${request.product_name || request.product_id},${request.status}`);
  });
  snapshot.agents.forEach(agent => {
    rows.push(`סוכנים,${agent.name},${agent.ordersInProgress}`);
  });

  return rows;
}

type InventoryAlertPayload = {
  new?: unknown;
  old?: unknown;
  record?: unknown;
  eventType?: string;
  type?: string;
  action?: string;
};

function isInventoryAlertRemoval(payload: InventoryAlertPayload): boolean {
  const action = (payload.eventType ?? payload.type ?? payload.action ?? '').toString().toUpperCase();
  return action === 'DELETE' || (payload.new == null && payload.old != null);
}

function normalizeInventoryAlert(record: unknown): RoyalDashboardLowStockAlert | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const source = record as Record<string, unknown>;
  const productId = source.product_id ?? source.productId ?? source.productID;
  const locationId = source.location_id ?? source.locationId ?? source.locationID;

  if (!productId || !locationId) {
    return null;
  }

  const toNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    product_id: String(productId),
    product_name: String(source.product_name ?? source.productName ?? 'מוצר ללא שם'),
    location_id: String(locationId),
    location_name: String(source.location_name ?? source.locationName ?? 'לא ידוע'),
    on_hand_quantity: toNumber(source.on_hand_quantity ?? source.onHandQuantity ?? source.quantity, 0),
    low_stock_threshold: toNumber(
      source.low_stock_threshold ?? source.lowStockThreshold ?? source.threshold,
      0
    ),
    triggered_at: String(source.triggered_at ?? source.triggeredAt ?? new Date().toISOString())
  };
}

function buildSummary(snapshot: RoyalDashboardSnapshot, user?: User | null) {
  const lines = [
    `👑 סיכום אימפריה – ${user?.name || 'מנהלת'}`,
    `הכנסות היום: ${formatCurrency(snapshot.metrics.revenueToday)} (${snapshot.metrics.deliveredToday} משלוחים)`,
    `הזמנות פעילות: ${numberFormatter.format(snapshot.metrics.pendingOrders)} | כיסוי: ${numberFormatter.format(snapshot.metrics.coveragePercent)}%`,
    `נהגים מחוברים: ${numberFormatter.format(snapshot.metrics.activeDrivers)} | משלוחים פתוחים: ${numberFormatter.format(snapshot.metrics.outstandingDeliveries)}`,
    `התרעות מלאי: ${snapshot.lowStockAlerts.slice(0, 3).map(alert => alert.product_name).join(' • ') || 'אין'}`
  ];
  return lines.join('\n');
}

function createRoyalFallback(): RoyalDashboardSnapshot {
  return {
    metrics: {
      revenueToday: 0,
      ordersToday: 0,
      deliveredToday: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      activeDrivers: 0,
      coveragePercent: 0,
      outstandingDeliveries: 0
    },
    revenueTrend: [],
    ordersPerHour: [],
    agents: [],
    zones: [],
    lowStockAlerts: [],
    restockQueue: [],
    generatedAt: new Date().toISOString()
  };
}

function RoyalSkeleton() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: ROYAL_COLORS.background,
        padding: '32px',
        direction: 'rtl',
        color: ROYAL_COLORS.text
      }}
    >
      <div style={{ display: 'grid', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
        {[1, 2, 3, 4, 5].map(index => (
          <div
            key={index}
            style={{
              height: index === 1 ? '140px' : '120px',
              borderRadius: '20px',
              background: 'rgba(30, 12, 66, 0.5)',
              border: `1px solid rgba(156, 109, 255, 0.25)`,
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        ))}
      </div>
    </div>
  );
}
