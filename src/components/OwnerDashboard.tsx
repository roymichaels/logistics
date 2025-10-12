import React, { useState, useEffect, useMemo } from 'react';
import { DataStore, User } from '../data/types';
import { useRoleTheme } from '../hooks/useRoleTheme';
import { formatCurrency, hebrew } from '../lib/hebrew';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { FinancialDashboard } from './FinancialDashboard';
import { AnalyticsDashboard } from './AnalyticsDashboard';

interface OwnerDashboardProps {
  dataStore: DataStore;
  user: User | null;
  onNavigate: (page: string) => void;
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockItems: number;
  pendingApprovals: number;
  onlineDrivers: number;
}

interface BusinessMetrics {
  businessId: string;
  businessName: string;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  activeOrders: number;
  completedOrders: number;
  activeUsers: number;
}

export function OwnerDashboard({ dataStore, user, onNavigate }: OwnerDashboardProps) {
  const { colors, styles, isLoading: themeLoading } = useRoleTheme();
  const [loading, setLoading] = useState(true);

  if (themeLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: ROYAL_COLORS.background,
        color: ROYAL_COLORS.text
      }}>
        {hebrew.loading}
      </div>
    );
  }
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockItems: 0,
    pendingApprovals: 0,
    onlineDrivers: 0
  });
  const [businesses, setBusinesses] = useState<BusinessMetrics[]>([]);
  const [selectedView, setSelectedView] = useState<'overview' | 'businesses' | 'users' | 'financial' | 'analytics' | 'config'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const supabase = (dataStore as any).supabase;

  useEffect(() => {
    loadSystemMetrics();

    // Set up Supabase Realtime for live system monitoring
    const ordersChannel = supabase
      .channel('owner-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadSystemMetrics()
      )
      .subscribe();

    const usersChannel = supabase
      .channel('owner-users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => loadSystemMetrics()
      )
      .subscribe();

    // Auto-refresh every 2 minutes for system-wide data
    const interval = setInterval(() => {
      loadSystemMetrics();
    }, 120000);

    return () => {
      ordersChannel.unsubscribe();
      usersChannel.unsubscribe();
      clearInterval(interval);
    };
  }, [timeRange, supabase]);

  const loadSystemMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      const startOfMonth = new Date(startOfToday);
      startOfMonth.setDate(startOfMonth.getDate() - 30);

      let orders: any[] = [];
      if (dataStore.listOrders) {
        orders = await dataStore.listOrders();
      }

      let products: any[] = [];
      if (dataStore.listProducts) {
        products = await dataStore.listProducts();
      }

      let users: any[] = [];
      if (dataStore.supabase) {
        const { data: usersData } = await dataStore.supabase
          .from('users')
          .select('*');
        users = usersData || [];
      }

      let driverStatus: any[] = [];
      if (dataStore.supabase) {
        const { data: statusData } = await dataStore.supabase
          .from('driver_status')
          .select('*')
          .eq('status', 'online');
        driverStatus = statusData || [];
      }

      let restockRequests: any[] = [];
      if (dataStore.supabase) {
        const { data: restockData } = await dataStore.supabase
          .from('restock_requests')
          .select('*')
          .eq('status', 'pending');
        restockRequests = restockData || [];
      }

      const lowStockProducts = products.filter(p =>
        (p.stock_quantity || 0) < (p.low_stock_threshold || 10)
      );

      const totalRevenue = orders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const activeUsersCount = users.filter(u => {
        if (!u.last_active) return false;
        const lastActive = new Date(u.last_active);
        const daysSinceActive = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActive <= 7;
      }).length;

      setSystemMetrics({
        totalUsers: users.length,
        activeUsers: activeUsersCount,
        totalOrders: orders.length,
        totalRevenue,
        totalProducts: products.length,
        lowStockItems: lowStockProducts.length,
        pendingApprovals: restockRequests.length,
        onlineDrivers: driverStatus.length
      });

      if (dataStore.supabase) {
        const { data: businessData } = await dataStore.supabase
          .from('businesses')
          .select('*');

        if (businessData) {
          const businessMetrics: BusinessMetrics[] = await Promise.all(
            businessData.map(async (biz: any) => {
              const bizOrders = orders.filter(o => o.business_id === biz.id);

              const todayOrders = bizOrders.filter(o =>
                new Date(o.created_at) >= startOfToday
              );
              const weekOrders = bizOrders.filter(o =>
                new Date(o.created_at) >= startOfWeek
              );
              const monthOrders = bizOrders.filter(o =>
                new Date(o.created_at) >= startOfMonth
              );

              const todayRevenue = todayOrders
                .filter(o => o.status === 'delivered')
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

              const weekRevenue = weekOrders
                .filter(o => o.status === 'delivered')
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

              const monthRevenue = monthOrders
                .filter(o => o.status === 'delivered')
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

              const activeOrders = bizOrders.filter(o =>
                ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
              ).length;

              const completedOrders = bizOrders.filter(o =>
                o.status === 'delivered'
              ).length;

              const bizUsers = users.filter(u => u.business_id === biz.id);

              return {
                businessId: biz.id,
                businessName: biz.name || 'Business',
                todayRevenue,
                weekRevenue,
                monthRevenue,
                activeOrders,
                completedOrders,
                activeUsers: bizUsers.length
              };
            })
          );

          setBusinesses(businessMetrics);
        }
      }
    } catch (error) {
      console.error('Failed to load system metrics:', error);
      Toast.error('שגיאה בטעינת מדדי המערכת');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (format: 'csv' | 'json') => {
    try {
      const exportData = {
        systemMetrics,
        businesses,
        timestamp: new Date().toISOString(),
        exportedBy: user?.name || user?.telegram_id
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `owner-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        let csvContent = 'System Metrics\n';
        csvContent += Object.entries(systemMetrics).map(([key, value]) => `${key},${value}`).join('\n');
        csvContent += '\n\nBusiness Metrics\n';
        csvContent += 'Business Name,Today Revenue,Week Revenue,Month Revenue,Active Orders,Completed Orders,Active Users\n';
        csvContent += businesses.map(b =>
          `${b.businessName},${b.todayRevenue},${b.weekRevenue},${b.monthRevenue},${b.activeOrders},${b.completedOrders},${b.activeUsers}`
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `owner-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      Toast.success('הדוח יוצא בהצלחה');
    } catch (error) {
      console.error('Export failed:', error);
      Toast.error('שגיאה בייצוא נתונים');
    }
  };

  if (loading) {
    return (
      <div style={{ ...styles.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
        <div style={{ color: colors.muted }}>{hebrew.loading}</div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Premium Gold Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: colors.gradientPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: colors.glowPrimaryStrong
            }}>
              💰
            </div>
            <div>
              <h1 style={{ ...styles.pageTitle, textAlign: 'right', marginBottom: '4px' }}>
                לוח בקרת הבעלים
              </h1>
              <p style={styles.pageSubtitle}>שליטה מלאה ותובנות עסקיות</p>
            </div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: `${colors.gold}20`,
            borderRadius: '20px',
            border: `1px solid ${colors.gold}50`
          }}>
            <span style={{ fontSize: '12px', color: colors.gold, fontWeight: '700' }}>👑 בעל עסק</span>
          </div>
        </div>
        <button
          onClick={() => {
            loadSystemMetrics();
            telegram.hapticFeedback('soft');
          }}
          style={{
            padding: '10px 16px',
            background: 'transparent',
            border: `2px solid ${colors.accent}`,
            borderRadius: '12px',
            color: colors.accent,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '18px' }}>🔄</span>
          רענן
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        padding: '4px'
      }}>
        {[
          { id: 'overview', label: 'סקירה כללית', icon: '📊' },
          { id: 'businesses', label: 'עסקים', icon: '🏢' },
          { id: 'users', label: 'משתמשים', icon: '👥' },
          { id: 'financial', label: 'כספים', icon: '💰' },
          { id: 'analytics', label: 'ניתוחים', icon: '📈' },
          { id: 'config', label: 'הגדרות', icon: '⚙️' }
        ].map(view => (
          <button
            key={view.id}
            onClick={() => {
              setSelectedView(view.id as any);
              telegram.hapticFeedback('selection');
            }}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: selectedView === view.id ? colors.gradientPrimary : colors.card,
              color: selectedView === view.id ? colors.textBright : colors.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: selectedView === view.id ? colors.glowPrimary : 'none'
            }}
          >
            <span>{view.icon}</span>
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {selectedView === 'overview' && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <MetricCard
              label="סך משתמשים"
              value={systemMetrics.totalUsers}
              subtitle={`${systemMetrics.activeUsers} פעילים`}
              color={colors.accent}
              icon="👥"
              colors={colors}
            />
            <MetricCard
              label="סך הזמנות"
              value={systemMetrics.totalOrders}
              subtitle="כל הזמן"
              color={colors.info}
              icon="📦"
              colors={colors}
            />
            <MetricCard
              label="הכנסות כוללות"
              value={formatCurrency(systemMetrics.totalRevenue)}
              subtitle="כל הזמן"
              color={colors.gold}
              icon="💰"
              colors={colors}
            />
            <MetricCard
              label="מוצרים"
              value={systemMetrics.totalProducts}
              subtitle={`${systemMetrics.lowStockItems} במלאי נמוך`}
              color={colors.warning}
              icon="📊"
              colors={colors}
            />
            <MetricCard
              label="נהגים מחוברים"
              value={systemMetrics.onlineDrivers}
              subtitle="כעת"
              color={colors.success}
              icon="🚚"
              colors={colors}
            />
            <MetricCard
              label="ממתינים לאישור"
              value={systemMetrics.pendingApprovals}
              subtitle="בקשות חידוש"
              color={colors.error}
              icon="⏳"
              colors={colors}
            />
          </div>

          <div style={styles.card}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', color: colors.text, fontWeight: '700' }}>
              💼 פעולות מהירות
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ActionButton
                label="ניהול משתמשים"
                icon="👥"
                onClick={() => onNavigate('users')}
                colors={colors}
              />
              <ActionButton
                label="ייצוא דוח JSON"
                icon="📄"
                onClick={() => handleExportData('json')}
                colors={colors}
              />
              <ActionButton
                label="ייצוא דוח CSV"
                icon="📊"
                onClick={() => handleExportData('csv')}
                colors={colors}
              />
              <ActionButton
                label="הגדרות מערכת"
                icon="⚙️"
                onClick={() => setSelectedView('config')}
                colors={colors}
              />
            </div>
          </div>
        </>
      )}

      {selectedView === 'businesses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {businesses.length === 0 ? (
            <div style={styles.card}>
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '72px', marginBottom: '16px', opacity: 0.5 }}>🏢</div>
                <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '18px', fontWeight: '600' }}>
                  אין עסקים רשומים
                </h3>
                <div style={{ fontSize: '14px', color: colors.muted }}>
                  העסק הראשון ייווצר אוטומטית עם המשתמש הראשון
                </div>
              </div>
            </div>
          ) : (
            businesses.map(biz => (
              <div key={biz.businessId} style={{ ...styles.card, background: colors.gradientCard }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: colors.text, fontWeight: '700' }}>
                      🏢 {biz.businessName}
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: colors.muted }}>
                      {biz.activeUsers} משתמשים • {biz.activeOrders} הזמנות פעילות
                    </p>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '10px',
                    background: `${colors.success}20`,
                    border: `1px solid ${colors.success}50`,
                    color: colors.success,
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    ✅ פעיל
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
                  <div style={{ padding: '16px', background: colors.secondary, borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '8px', fontWeight: '500' }}>
                      היום
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: colors.gold, textShadow: colors.glowGold }}>
                      {formatCurrency(biz.todayRevenue)}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: colors.secondary, borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '8px', fontWeight: '500' }}>
                      שבוע
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: colors.info }}>
                      {formatCurrency(biz.weekRevenue)}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: colors.secondary, borderRadius: '12px' }}>
                    <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '8px', fontWeight: '500' }}>
                      חודש
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: colors.accent }}>
                      {formatCurrency(biz.monthRevenue)}
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: `1px solid ${colors.cardBorder}`,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '4px', fontWeight: '500' }}>
                      הזמנות פעילות
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text }}>
                      {biz.activeOrders}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '4px', fontWeight: '500' }}>
                      הזמנות שהושלמו
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: colors.success }}>
                      {biz.completedOrders}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedView === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={ROYAL_STYLES.card}>
            <h3 style={ROYAL_STYLES.cardTitle}>ניהול משתמשים</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ ...ROYAL_STYLES.statBox, background: `${ROYAL_COLORS.accent}10`, border: `1px solid ${ROYAL_COLORS.accent}30` }}>
                <div style={{ fontSize: '36px', fontWeight: '700', color: ROYAL_COLORS.accent, marginBottom: '8px' }}>
                  {systemMetrics.totalUsers}
                </div>
                <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>סך משתמשים</div>
              </div>
              <div style={{ ...ROYAL_STYLES.statBox, background: `${ROYAL_COLORS.success}10`, border: `1px solid ${ROYAL_COLORS.success}30` }}>
                <div style={{ fontSize: '36px', fontWeight: '700', color: ROYAL_COLORS.success, marginBottom: '8px' }}>
                  {systemMetrics.activeUsers}
                </div>
                <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>פעילים (7 ימים)</div>
              </div>
            </div>
            <ActionButton
              label="עבור לניהול משתמשים המלא"
              icon="👥"
              onClick={() => onNavigate('users')}
              colors={colors}
            />
          </div>

          <div style={ROYAL_STYLES.card}>
            <h3 style={ROYAL_STYLES.cardTitle}>פעולות מהירות</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ActionButton
                label="הזמן משתמש חדש"
                icon="✉️"
                onClick={() => Toast.info('תכונת הזמנה תתווסף בקרוב')}
                colors={colors}
              />
              <ActionButton
                label="דוח משתמשים CSV"
                icon="📊"
                onClick={() => handleExportData('csv')}
                colors={colors}
              />
            </div>
          </div>
        </div>
      )}

      {selectedView === 'financial' && (
        <FinancialDashboard
          dataStore={dataStore}
          user={user}
          businessId={null}
          onNavigate={onNavigate}
        />
      )}

      {selectedView === 'analytics' && (
        <AnalyticsDashboard
          dataStore={dataStore}
          user={user}
          businessId={null}
        />
      )}

      {selectedView === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={ROYAL_STYLES.card}>
            <h3 style={ROYAL_STYLES.cardTitle}>⚙️ הגדרות מערכת</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '16px', background: ROYAL_COLORS.secondary, borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '4px' }}>🔐 אבטחה</div>
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>ניהול הרשאות ואימות</div>
                </div>
                <button
                  onClick={() => Toast.info('פאנל אבטחה יתווסף בקרוב')}
                  style={{ ...ROYAL_STYLES.buttonSecondary, padding: '8px 16px', fontSize: '14px' }}
                >
                  הגדר →
                </button>
              </div>

              <div style={{ padding: '16px', background: ROYAL_COLORS.secondary, borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '4px' }}>🔌 אינטגרציות</div>
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>חיבור למערכות חיצוניות</div>
                </div>
                <button
                  onClick={() => Toast.info('ניהול אינטגרציות יתווסף בקרוב')}
                  style={{ ...ROYAL_STYLES.buttonSecondary, padding: '8px 16px', fontSize: '14px' }}
                >
                  הגדר →
                </button>
              </div>

              <div style={{ padding: '16px', background: ROYAL_COLORS.secondary, borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '4px' }}>🔑 API Keys</div>
                  <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>ניהול גישה למערכת</div>
                </div>
                <button
                  onClick={() => Toast.info('ניהול API Keys יתווסף בקרוב')}
                  style={{ ...ROYAL_STYLES.buttonSecondary, padding: '8px 16px', fontSize: '14px' }}
                >
                  הגדר →
                </button>
              </div>
            </div>
          </div>

          <div style={ROYAL_STYLES.card}>
            <h3 style={ROYAL_STYLES.cardTitle}>🔔 התראות מערכת</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '16px', background: `${ROYAL_COLORS.success}10`, border: `1px solid ${ROYAL_COLORS.success}30`, borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.success }}>מערכת פעילה</span>
                </div>
                <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>כל המערכות פועלות כראוי</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtitle, color, icon, colors: themeColors }: {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
  icon: string;
  colors: any;
}) {
  return (
    <div style={{
      background: themeColors.secondary,
      border: `1px solid ${themeColors.cardBorder}`,
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '12px', color: themeColors.muted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: themeColors.muted }}>
        {subtitle}
      </div>
    </div>
  );
}

function ActionButton({ label, icon, onClick, colors }: {
  label: string;
  icon: string;
  onClick: () => void;
  colors?: any;
}) {
  const themeColors = colors || {
    cardBorder: ROYAL_COLORS.cardBorder,
    secondary: ROYAL_COLORS.secondary,
    text: ROYAL_COLORS.text,
    accent: ROYAL_COLORS.accent,
    muted: ROYAL_COLORS.muted
  };

  return (
    <button
      onClick={() => {
        onClick();
        telegram.hapticFeedback('selection');
      }}
      style={{
        padding: '18px 20px',
        borderRadius: '14px',
        border: `2px solid ${themeColors.cardBorder}`,
        background: themeColors.secondary,
        color: themeColors.text,
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        transition: 'all 0.3s ease',
        textAlign: 'right'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${themeColors.accent}15`;
        e.currentTarget.style.borderColor = themeColors.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = themeColors.secondary;
        e.currentTarget.style.borderColor = themeColors.cardBorder;
      }}
    >
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <span>{label}</span>
      <span style={{ marginRight: 'auto', color: themeColors.muted }}>→</span>
    </button>
  );
}
