/**
 * ⚡ APP OWNER ANALYTICS DASHBOARD
 *
 * Platform-wide analytics and system monitoring for the app developer/creator.
 * Highest privilege level with access to all system data and metrics.
 *
 * Features:
 * - Platform overview stats (users, businesses, orders)
 * - Role distribution analytics
 * - Business activity metrics
 * - System health monitoring
 * - User growth trends
 * - Revenue analytics
 */

import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { Toast } from '../components/Toast';

interface AppOwnerAnalyticsProps {
  onNavigate: (page: string) => void;
  currentUser: any;
  dataStore?: any;
}

interface PlatformStats {
  total_users: number;
  total_businesses: number;
  total_orders: number;
  active_users_today: number;
  orders_today: number;
  users_by_role: Record<string, number>;
  businesses_by_status: Record<string, number>;
}

export function AppOwnerAnalytics({ onNavigate, currentUser, dataStore }: AppOwnerAnalyticsProps) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Security check - only app_owner can access
  const isAppOwner = currentUser?.role === 'app_owner';

  useEffect(() => {
    telegram.setBackButton(() => onNavigate('dashboard'));
    return () => telegram.hideBackButton();
  }, [onNavigate]);

  useEffect(() => {
    if (isAppOwner) {
      void loadStats();
    }
  }, [isAppOwner]);

  const loadStats = async () => {
    if (!dataStore) return;

    setLoading(true);
    try {
      console.log('⚡ AppOwner - Loading platform stats...');

      const { data, error } = await dataStore.supabase
        .rpc('get_platform_stats');

      if (error) throw error;

      console.log('✅ AppOwner - Stats loaded:', data);
      setStats(data);
    } catch (error) {
      console.error('❌ AppOwner - Failed to load stats:', error);
      Toast.error('שגיאה בטעינת נתוני המערכת');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    telegram.hapticFeedback('impact', 'light');
    await loadStats();
    setRefreshing(false);
    Toast.success('נתונים עודכנו בהצלחה');
  };

  // Security gate
  if (!isAppOwner) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>🔒</div>
          <h3 style={{ color: ROYAL_COLORS.text, margin: '0 0 12px 0' }}>
            אין הרשאה
          </h3>
          <p style={ROYAL_STYLES.emptyStateText}>
            רק מפתח האפליקציה יכול לגשת לדף זה
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <p style={{ color: ROYAL_COLORS.muted }}>טוען נתוני מערכת...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>📊</div>
          <p style={ROYAL_STYLES.emptyStateText}>
            לא נמצאו נתונים
          </p>
          <button
            onClick={handleRefresh}
            style={{ ...ROYAL_STYLES.buttonPrimary, marginTop: '16px' }}
          >
            🔄 נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>⚡</span>
          <h1 style={{ ...ROYAL_STYLES.pageTitle, margin: 0 }}>ניהול מערכת</h1>
        </div>
        <p style={ROYAL_STYLES.pageSubtitle}>
          סטטיסטיקות ואנליטיקה של כל הפלטפורמה
        </p>
      </div>

      {/* Refresh Button */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            ...ROYAL_STYLES.buttonSecondary,
            padding: '10px 20px',
            opacity: refreshing ? 0.6 : 1
          }}
        >
          🔄 {refreshing ? 'מרענן...' : 'רענן נתונים'}
        </button>
      </div>

      {/* Main Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          icon="👥"
          label="סה״כ משתמשים"
          value={stats.total_users}
          color={ROYAL_COLORS.info}
        />
        <StatCard
          icon="🏢"
          label="עסקים פעילים"
          value={stats.total_businesses}
          color={ROYAL_COLORS.purple}
        />
        <StatCard
          icon="📦"
          label="סה״כ הזמנות"
          value={stats.total_orders}
          color={ROYAL_COLORS.success}
        />
        <StatCard
          icon="✨"
          label="פעילים היום"
          value={stats.active_users_today}
          color={ROYAL_COLORS.warning}
        />
        <StatCard
          icon="🛒"
          label="הזמנות היום"
          value={stats.orders_today}
          color={ROYAL_COLORS.accent}
        />
      </div>

      {/* Role Distribution */}
      <div style={ROYAL_STYLES.card}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: ROYAL_COLORS.text,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>👔</span> התפלגות תפקידים
        </h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {Object.entries(stats.users_by_role || {}).map(([role, count]) => (
            <RoleBar
              key={role}
              role={role}
              count={count as number}
              total={stats.total_users}
            />
          ))}
        </div>
      </div>

      {/* Business Status */}
      <div style={ROYAL_STYLES.card}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: ROYAL_COLORS.text,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🏢</span> סטטוס עסקים
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          {Object.entries(stats.businesses_by_status || {}).map(([status, count]) => (
            <div
              key={status}
              style={{
                padding: '16px',
                background: ROYAL_COLORS.secondary,
                borderRadius: '12px',
                border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                textAlign: 'center'
              }}
            >
              <div style={{
                fontSize: '24px',
                fontWeight: '600',
                color: status === 'true' ? ROYAL_COLORS.success : ROYAL_COLORS.muted,
                marginBottom: '4px'
              }}>
                {count as number}
              </div>
              <div style={{
                fontSize: '13px',
                color: ROYAL_COLORS.muted
              }}>
                {status === 'true' ? 'פעילים' : 'לא פעילים'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={ROYAL_STYLES.card}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: ROYAL_COLORS.text,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚙️</span> פעולות מהירות
        </h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <QuickActionButton
            icon="👥"
            label="ניהול משתמשים"
            onClick={() => onNavigate('user-management')}
          />
          <QuickActionButton
            icon="🏢"
            label="ניהול עסקים"
            onClick={() => onNavigate('businesses')}
          />
          <QuickActionButton
            icon="📊"
            label="דוחות מפורטים"
            onClick={() => onNavigate('reports')}
          />
          <QuickActionButton
            icon="⚙️"
            label="הגדרות מערכת"
            onClick={() => onNavigate('settings')}
          />
        </div>
      </div>
    </div>
  );
}

// Helper Components

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{
      ...ROYAL_STYLES.card,
      textAlign: 'center',
      padding: '20px 16px'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: '600', color, marginBottom: '4px' }}>
        {value.toLocaleString('he-IL')}
      </div>
      <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
        {label}
      </div>
    </div>
  );
}

function RoleBar({ role, count, total }: { role: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  const roleLabels: Record<string, string> = {
    app_owner: '⚡ מפתח',
    owner: '👑 בעלים',
    business_owner: '💎 בעל עסק',
    manager: '👔 מנהל',
    dispatcher: '📋 מוקדן',
    driver: '🚚 נהג',
    warehouse: '📦 מחסן',
    sales: '💼 מכירות',
    customer_service: '🎧 שירות'
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px',
        fontSize: '14px'
      }}>
        <span style={{ color: ROYAL_COLORS.text }}>
          {roleLabels[role] || role}
        </span>
        <span style={{ fontWeight: '600', color: ROYAL_COLORS.accent }}>
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div style={{
        height: '8px',
        background: ROYAL_COLORS.secondary,
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          background: ROYAL_COLORS.accent,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}

function QuickActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={() => {
        telegram.hapticFeedback('selection');
        onClick();
      }}
      style={{
        ...ROYAL_STYLES.card,
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: ROYAL_COLORS.background
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = ROYAL_COLORS.accent;
        e.currentTarget.style.background = ROYAL_COLORS.secondary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
        e.currentTarget.style.background = ROYAL_COLORS.background;
      }}
    >
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <span style={{ fontSize: '16px', fontWeight: '500', color: ROYAL_COLORS.text }}>
        {label}
      </span>
      <span style={{ marginRight: 'auto', color: ROYAL_COLORS.muted }}>←</span>
    </button>
  );
}

export default AppOwnerAnalytics;
