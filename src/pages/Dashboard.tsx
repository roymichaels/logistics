import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { useSkeleton } from '../hooks/useSkeleton';
import { Toast } from '../components/Toast';
import { OwnerDashboard } from '../components/OwnerDashboard';
import { InfrastructureOwnerDashboard } from '../components/InfrastructureOwnerDashboard';
import { BusinessOwnerDashboard } from '../components/BusinessOwnerDashboard';
import { ManagerDashboard } from '../components/ManagerDashboard';
import { RoleDiagnostics } from '../lib/diagnostics';
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
import { formatCurrency, hebrew } from '../lib/i18n';

interface DashboardProps {
  dataStore: FrontendDataStore;
  onNavigate: (page: string) => void;
}

const numberFormatter = new Intl.NumberFormat('he-IL');

// Import Twitter dark theme
import { TWITTER_COLORS } from '../styles/twitterTheme';
import { logger } from '../lib/logger';

// Dashboard colors based on authentic Twitter/X dark theme
const DASHBOARD_COLORS = {
  background: TWITTER_COLORS.background, // #15202B - Twitter's dark blue-black
  card: TWITTER_COLORS.card, // #192734 - Secondary dark surface
  cardBorder: TWITTER_COLORS.cardBorder, // #38444D - Subtle blue-gray border
  muted: TWITTER_COLORS.textSecondary, // #8899A6 - Blue-gray muted text
  text: TWITTER_COLORS.text, // #E7E9EA - Off-white primary text
  accent: TWITTER_COLORS.primary, // #1D9BF0 - Twitter blue
  gold: TWITTER_COLORS.success, // Green for positive metrics
  crimson: TWITTER_COLORS.error,
  teal: TWITTER_COLORS.info,
  emerald: TWITTER_COLORS.success,
  shadow: TWITTER_COLORS.shadowLarge
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

      // Profile loaded

      setUser(profile);

      // Owner and Manager get custom dashboards
      if (profile.role === 'infrastructure_owner' || profile.role === 'business_owner' || profile.role === 'manager') {
        setLoading(false);
        return;
      }

      const royalData = dataStore.getRoyalDashboardSnapshot
        ? await dataStore.getRoyalDashboardSnapshot()
        : createRoyalFallback();
      setSnapshot(royalData);
    } catch (error) {
      logger.error('Failed to load royal dashboard', error);
      Toast.error('שגיאה בטעינת לוח הבקרה המלכותי');
      setSnapshot(createRoyalFallback());
    } finally {
      setLoading(false);
    }
  }, [dataStore]);

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
        logger.info(payload);
      }
    } catch (error) {
      logger.error('Failed to deliver summary', error);
      Toast.error('לא הצלחנו לשדר את הסיכום');
    }
  }, [snapshot, summaryText, haptic]);

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

  // Wait for both user profile and dataStore to be ready
  if (loading || !dataStore || !user) {
    return <RoyalSkeleton />;
  }

  // Main button disabled - removed per user request
  // useEffect(() => {
  //   if (!snapshot) return;
  //   mainButton.show('שלח סיכום לטלגרם', handleSendSummary);
  //   return () => {
  //     mainButton.hide();
  //   };
  // }, [snapshot, handleSendSummary, mainButton]);

  // Additional check for skeleton screen timing
  if (showSkeleton) {
    return <RoyalSkeleton />;
  }

  // Infrastructure Owner gets platform-wide system dashboard
  if (user?.role === 'infrastructure_owner') {
    // Routing to InfrastructureOwnerDashboard
    return <InfrastructureOwnerDashboard dataStore={dataStore} user={user} onNavigate={onNavigate} />;
  }

  // Business Owner gets business-specific financial dashboard
  // Check both role and global_role fields
  const isBusinessOwner = user?.role === 'business_owner' || (user as any)?.global_role === 'business_owner';

  if (isBusinessOwner) {
    // Business owners need a business context
    if (!user.business_id) {
      // Show a loading/retry state instead of error - business_id might still be syncing
      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--tg-theme-bg-color, #ffffff)',
          padding: '40px 20px',
          color: 'var(--tg-theme-text-color, #000)',
          direction: 'rtl',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid rgba(0,0,0,0.1)',
              borderTop: '4px solid var(--tg-theme-button-color, #007aff)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 24px'
            }} />
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
              טוען נתוני עסק...
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--tg-theme-hint-color, #999)', marginBottom: '32px' }}>
              מסנכרן את הפרופיל שלך עם העסק. אנא המתן...
            </p>
            <button
              onClick={async () => {
                // Manual refresh requested
                try {
                  setLoading(true);
                  const refreshedProfile = await dataStore?.refreshProfile?.();
                  if (refreshedProfile?.business_id) {
                    // Successfully got business_id, reload dashboard
                    await loadDashboard();
                  } else {
                    // No business found, navigate to create business
                    // No business found, navigating to businesses page
                    onNavigate('businesses');
                  }
                } catch (err) {
                  logger.error('Failed to refresh profile:', err);
                  Toast.error('שגיאה בטעינת נתונים. אנא נסה שנית.');
                } finally {
                  setLoading(false);
                }
              }}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: 'var(--tg-theme-button-color, #007aff)',
                color: 'var(--tg-theme-button-text-color, #ffffff)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              נסה שוב
            </button>
            <style>{
              `@keyframes spin {
                to { transform: rotate(360deg); }
              }`
            }</style>
          </div>
        </div>
      );
    }
    return <BusinessOwnerDashboard businessId={user.business_id} userId={user.id} />;
  }

  // Manager gets department-specific dashboard
  if (user?.role === 'manager') {
    return <ManagerDashboard dataStore={dataStore} user={user} onNavigate={onNavigate} />;
  }

  // Redirect users with 'user' role to UserHomepage
  if (user?.role === 'user') {
    // Redirecting to user homepage
    onNavigate('user-homepage');
    return null;
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
        background: DASHBOARD_COLORS.background,
        padding: '28px clamp(16px, 5vw, 40px)',
        color: DASHBOARD_COLORS.text,
        direction: 'rtl',
        position: 'relative',
        overflow: 'hidden'
      }}
    >

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
          <RoyalLineChart data={revenueTrend} color={DASHBOARD_COLORS.gold} />
        </RoyalSection>

        <RoyalSection title="קצב הזמנות / שעה" accent>
          <RoyalBarChart data={ordersPerHour} color={DASHBOARD_COLORS.accent} />
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
        background: DASHBOARD_COLORS.card,
        borderRadius: '16px',
        border: `1px solid ${DASHBOARD_COLORS.cardBorder}`,
        boxShadow: DASHBOARD_COLORS.shadow,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{greeting}, {user?.name || 'מפקדת'}</div>
            <div style={{ color: DASHBOARD_COLORS.muted, fontSize: '15px', marginTop: '4px' }}>
              מצב המערכת מעודכן. הכנסות היום: <strong>{formatCurrency(metrics.revenueToday)}</strong>
            </div>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            style={{
              border: `1px solid ${TWITTER_COLORS.buttonSecondaryBorder}`,
              background: TWITTER_COLORS.buttonSecondary,
              color: DASHBOARD_COLORS.text,
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '700'
            }}
          >
            תצוגת הזמנות →
          </button>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <RoyalBadge text="מצב פעיל" tone="gold" />
          <RoyalBadge text={`כיסוי ${numberFormatter.format(metrics.coveragePercent)}%`} tone="accent" />
          <RoyalBadge text={`${numberFormatter.format(metrics.activeDrivers)} נהגים בזירה`} tone="outline" />
        </div>
      </div>
    </header>
  );
}

function RoyalMetricCard({ label, value, subtitle, tone, icon }: { label: string; value: string; subtitle?: string; tone: 'gold' | 'crimson' | 'teal' | 'purple'; icon?: string }) {
  const toneColor = {
    gold: DASHBOARD_COLORS.gold,
    crimson: DASHBOARD_COLORS.crimson,
    teal: DASHBOARD_COLORS.teal,
    purple: DASHBOARD_COLORS.accent
  }[tone];

  return (
    <div
      style={{
        width: '100%',
        padding: '20px',
        borderRadius: '16px',
        background: DASHBOARD_COLORS.card,
        border: `1px solid ${DASHBOARD_COLORS.cardBorder}`,
        boxShadow: DASHBOARD_COLORS.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      <div style={{ fontSize: '15px', color: DASHBOARD_COLORS.muted }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon && (
          <span style={{ fontSize: '28px' }}>{icon}</span>
        )}
        <div style={{ fontSize: '28px', fontWeight: 700, color: toneColor }}>{value}</div>
      </div>
      {subtitle && <div style={{ color: DASHBOARD_COLORS.muted, fontSize: '13px' }}>{subtitle}</div>}
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
        borderRadius: '16px',
        background: accent ? TWITTER_COLORS.backgroundSecondary : DASHBOARD_COLORS.card,
        border: `1px solid ${DASHBOARD_COLORS.cardBorder}`,
        boxShadow: DASHBOARD_COLORS.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        minHeight: '220px'
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{title}</h2>
        {description && <p style={{ margin: '6px 0 0', color: DASHBOARD_COLORS.muted, fontSize: '13px' }}>{description}</p>}
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
          color: DASHBOARD_COLORS.muted,
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
                background: color,
                boxShadow: TWITTER_COLORS.shadow
              }}
            />
            <span style={{ fontSize: '11px', color: DASHBOARD_COLORS.muted }}>{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function RoyalAgentRow({ agent }: { agent: RoyalDashboardAgent }) {
  const statusTone = agent.status === 'offline' ? 'rgba(255, 255, 255, 0.2)' : DASHBOARD_COLORS.accent;
  const statusLabel = agent.status === 'offline' ? 'מנותק' : agent.status === 'available' ? 'זמין' : 'במשימה';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: '16px',
        background: TWITTER_COLORS.backgroundSecondary,
        border: `1px solid ${TWITTER_COLORS.border}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: TWITTER_COLORS.gradientPrimary,
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
          <div style={{ fontSize: '12px', color: DASHBOARD_COLORS.muted }}>
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
        borderRadius: '16px',
        background: TWITTER_COLORS.backgroundSecondary,
        border: `1px solid ${TWITTER_COLORS.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{zone.zoneName}</strong>
        <span style={{ fontSize: '12px', color: DASHBOARD_COLORS.muted }}>{numberFormatter.format(zone.activeDrivers)} נהגים</span>
      </div>
      <div style={{ fontSize: '12px', color: DASHBOARD_COLORS.muted }}>
        {zone.outstandingOrders > 0
          ? `${numberFormatter.format(zone.outstandingOrders)} משלוחים ממתינים`
          : 'אין משלוחים ממתינים'}
      </div>
      <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(zone.coveragePercent, 100)}%`,
            background: `linear-gradient(90deg, ${DASHBOARD_COLORS.accent}, ${DASHBOARD_COLORS.gold})`,
            height: '100%'
          }}
        />
      </div>
      <div style={{ fontSize: '12px', color: DASHBOARD_COLORS.muted }}>
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
            background: TWITTER_COLORS.backgroundSecondary,
            padding: '14px',
            borderRadius: '16px',
            border: `1px solid ${TWITTER_COLORS.border}`
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{alert.product_name}</div>
            <div style={{ fontSize: '12px', color: DASHBOARD_COLORS.muted }}>{alert.location_name}</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: DASHBOARD_COLORS.crimson, fontWeight: 600 }}>
              {numberFormatter.format(alert.on_hand_quantity)} יחידות
            </div>
            <div style={{ fontSize: '12px', color: DASHBOARD_COLORS.muted }}>
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
            background: TWITTER_COLORS.backgroundSecondary,
            padding: '14px',
            borderRadius: '16px',
            border: `1px solid ${TWITTER_COLORS.border}`
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{request.product_name || 'מוצר לא מזוהה'}</div>
            <div style={{ fontSize: '12px', color: DASHBOARD_COLORS.muted }}>{request.to_location_name || 'מרכז ראשי'}</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: DASHBOARD_COLORS.teal, fontWeight: 600 }}>
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
        borderRadius: '16px',
        border: `1px dashed ${TWITTER_COLORS.border}`,
        padding: '24px',
        textAlign: 'center',
        color: DASHBOARD_COLORS.muted,
        background: TWITTER_COLORS.backgroundSecondary
      }}
    >
      {message}
    </div>
  );
}

function RoyalBadge({ text, tone, color }: { text: string; tone: 'gold' | 'accent' | 'outline' | 'custom'; color?: string }) {
  const palette = {
    gold: { background: TWITTER_COLORS.accentFaded, border: TWITTER_COLORS.border, color: DASHBOARD_COLORS.gold },
    accent: { background: TWITTER_COLORS.accentFaded, border: TWITTER_COLORS.border, color: DASHBOARD_COLORS.accent },
    outline: { background: 'transparent', border: TWITTER_COLORS.buttonSecondaryBorder, color: DASHBOARD_COLORS.text },
    custom: { background: color || TWITTER_COLORS.backgroundHover, border: TWITTER_COLORS.border, color: DASHBOARD_COLORS.text }
  }[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '12px',
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
        background: TWITTER_COLORS.gradientPrimary,
        color: TWITTER_COLORS.white,
        padding: '14px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '15px',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: TWITTER_COLORS.shadow
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
    logger.error('Failed to export dashboard', error);
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
        background: DASHBOARD_COLORS.background,
        padding: '32px',
        direction: 'rtl',
        color: DASHBOARD_COLORS.text
      }}
    >
      <div style={{ display: 'grid', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
        {[1, 2, 3, 4, 5].map(index => (
          <div
            key={index}
            style={{
              height: index === 1 ? '140px' : '120px',
              borderRadius: '16px',
              background: TWITTER_COLORS.backgroundSecondary,
              border: `1px solid ${TWITTER_COLORS.border}`,
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          />
        ))}
      </div>
    </div>
  );
}
