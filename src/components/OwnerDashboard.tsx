import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { formatCurrency, hebrew } from '../lib/hebrew';
import { Toast } from './Toast';

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
  const [loading, setLoading] = useState(true);
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
  const [selectedView, setSelectedView] = useState<'overview' | 'businesses' | 'users' | 'financial' | 'config'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('today');

  useEffect(() => {
    loadSystemMetrics();
  }, [timeRange]);

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
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👑</div>
          <p style={{ color: ROYAL_COLORS.muted }}>{hebrew.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>👑</div>
        <h1 style={ROYAL_STYLES.pageTitle}>לוח בקרת הבעלים</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          שליטה מלאה על כל המערכת
        </p>
      </div>

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
          { id: 'config', label: 'הגדרות', icon: '⚙️' }
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setSelectedView(view.id as any)}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: selectedView === view.id
                ? 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)'
                : ROYAL_COLORS.card,
              color: ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
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
              color={ROYAL_COLORS.accent}
              icon="👥"
            />
            <MetricCard
              label="סך הזמנות"
              value={systemMetrics.totalOrders}
              subtitle="כל הזמן"
              color={ROYAL_COLORS.teal}
              icon="📦"
            />
            <MetricCard
              label="הכנסות כוללות"
              value={formatCurrency(systemMetrics.totalRevenue)}
              subtitle="כל הזמן"
              color={ROYAL_COLORS.gold}
              icon="💰"
            />
            <MetricCard
              label="מוצרים"
              value={systemMetrics.totalProducts}
              subtitle={`${systemMetrics.lowStockItems} במלאי נמוך`}
              color={ROYAL_COLORS.crimson}
              icon="📊"
            />
            <MetricCard
              label="נהגים מחוברים"
              value={systemMetrics.onlineDrivers}
              subtitle="כעת"
              color={ROYAL_COLORS.emerald}
              icon="🚚"
            />
            <MetricCard
              label="ממתינים לאישור"
              value={systemMetrics.pendingApprovals}
              subtitle="בקשות חידוש"
              color={ROYAL_COLORS.accent}
              icon="⏳"
            />
          </div>

          <div style={ROYAL_STYLES.card}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
              פעולות מהירות
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ActionButton
                label="ניהול משתמשים"
                icon="👥"
                onClick={() => onNavigate('users')}
              />
              <ActionButton
                label="ייצוא דוח JSON"
                icon="📄"
                onClick={() => handleExportData('json')}
              />
              <ActionButton
                label="ייצוא דוח CSV"
                icon="📊"
                onClick={() => handleExportData('csv')}
              />
              <ActionButton
                label="הגדרות מערכת"
                icon="⚙️"
                onClick={() => setSelectedView('config')}
              />
            </div>
          </div>
        </>
      )}

      {selectedView === 'businesses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {businesses.length === 0 ? (
            <div style={ROYAL_STYLES.card}>
              <div style={ROYAL_STYLES.emptyState}>
                <div style={ROYAL_STYLES.emptyStateIcon}>🏢</div>
                <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text }}>
                  אין עסקים רשומים
                </h3>
                <div style={ROYAL_STYLES.emptyStateText}>
                  העסק הראשון ייווצר אוטומטית עם המשתמש הראשון
                </div>
              </div>
            </div>
          ) : (
            businesses.map(biz => (
              <div key={biz.businessId} style={ROYAL_STYLES.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
                      {biz.businessName}
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: ROYAL_COLORS.muted }}>
                      {biz.activeUsers} משתמשים • {biz.activeOrders} הזמנות פעילות
                    </p>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    background: 'rgba(74, 222, 128, 0.2)',
                    color: ROYAL_COLORS.emerald,
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    פעיל
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                      היום
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.gold }}>
                      {formatCurrency(biz.todayRevenue)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                      שבוע
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.teal }}>
                      {formatCurrency(biz.weekRevenue)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                      חודש
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.accent }}>
                      {formatCurrency(biz.monthRevenue)}
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      הזמנות פעילות
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                      {biz.activeOrders}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      הזמנות שהושלמו
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: ROYAL_COLORS.emerald }}>
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
        <div style={ROYAL_STYLES.card}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
            ניהול משתמשים
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: ROYAL_COLORS.muted }}>
            לניהול מלא של משתמשים, לחץ על הכפתור למעבר לעמוד ניהול משתמשים
          </p>
          <button
            onClick={() => onNavigate('users')}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <span>👥</span>
            <span>עבור לניהול משתמשים</span>
          </button>
        </div>
      )}

      {selectedView === 'financial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={ROYAL_STYLES.card}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
              סקירה כספית
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(246, 201, 69, 0.1)',
                border: `1px solid rgba(246, 201, 69, 0.3)`
              }}>
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>
                  סך כל ההכנסות
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: ROYAL_COLORS.gold }}>
                  {formatCurrency(systemMetrics.totalRevenue)}
                </div>
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(77, 208, 225, 0.1)',
                border: `1px solid rgba(77, 208, 225, 0.3)`
              }}>
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>
                  ממוצע הזמנה
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.teal }}>
                  {formatCurrency(systemMetrics.totalOrders > 0 ? systemMetrics.totalRevenue / systemMetrics.totalOrders : 0)}
                </div>
              </div>
            </div>
          </div>

          <div style={ROYAL_STYLES.card}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
              ייצוא דוחות כספיים
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ActionButton
                label="דוח הכנסות - JSON"
                icon="💰"
                onClick={() => handleExportData('json')}
              />
              <ActionButton
                label="דוח הכנסות - CSV"
                icon="📊"
                onClick={() => handleExportData('csv')}
              />
            </div>
          </div>
        </div>
      )}

      {selectedView === 'config' && (
        <div style={ROYAL_STYLES.card}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
            הגדרות מערכת
          </h3>
          <div style={ROYAL_STYLES.emptyState}>
            <div style={ROYAL_STYLES.emptyStateIcon}>⚙️</div>
            <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text }}>
              הגדרות מערכת מתקדמות
            </h3>
            <div style={ROYAL_STYLES.emptyStateText}>
              תכונות הגדרות מערכת יתווספו בגרסאות הבאות:
              <br /><br />
              • ניהול הרשאות<br />
              • הגדרות אבטחה<br />
              • אינטגרציות חיצוניות<br />
              • הגדרות תשלום<br />
              • ניהול API Keys
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtitle, color, icon }: {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
  icon: string;
}) {
  return (
    <div style={{
      ...ROYAL_STYLES.card,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ fontSize: '24px' }}>{icon}</div>
      <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '700', color }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>
        {subtitle}
      </div>
    </div>
  );
}

function ActionButton({ label, icon, onClick }: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '12px',
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        background: ROYAL_COLORS.card,
        color: ROYAL_COLORS.text,
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(156, 109, 255, 0.1)';
        e.currentTarget.style.borderColor = ROYAL_COLORS.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = ROYAL_COLORS.card;
        e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
