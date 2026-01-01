import React, { useEffect, useState } from 'react';
import { ROYAL_COLORS } from '../../styles/royalTheme';
import { DataStore, User } from '../../data/types';
import { logger } from '../../lib/logger';
import { getUserDisplayName } from '../../utils/userIdentifier';

interface AdminAnalyticsProps {
  dataStore: DataStore;
}

interface PlatformMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalOrders: number;
  totalRevenue: number;
  totalDrivers: number;
  activeDrivers: number;
  totalUsers: number;
  ordersToday: number;
}

export function AdminAnalytics({ dataStore }: AdminAnalyticsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [profile, businesses, orders, drivers, users] = await Promise.all([
          dataStore.getProfile(),
          dataStore.listBusinesses(),
          dataStore.listOrders(),
          dataStore.listDrivers?.() ?? Promise.resolve([]),
          dataStore.listUsers?.() ?? Promise.resolve([])
        ]);

        if (!mounted) return;

        setUser(profile);

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const ordersToday = orders.filter(o => new Date(o.created_at) >= todayStart).length;

        const activeBusinesses = businesses.filter(b => b.status === 'active').length;
        const activeDrivers = drivers.filter(d => d.status === 'active').length;

        const totalRevenue = orders.reduce((sum, order) => {
          return sum + (order.total_price || 0);
        }, 0);

        setMetrics({
          totalBusinesses: businesses.length,
          activeBusinesses,
          totalOrders: orders.length,
          totalRevenue,
          totalDrivers: drivers.length,
          activeDrivers,
          totalUsers: users.length,
          ordersToday
        });
      } catch (error) {
        logger.error('Failed to load admin analytics', error as Error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [dataStore]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: ROYAL_COLORS.background,
          color: ROYAL_COLORS.text,
          padding: '20px',
          direction: 'rtl'
        }}
      >
        <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>
          ניתוח פלטפורמה
        </h1>
        <p style={{ margin: '0 0 24px', color: ROYAL_COLORS.muted }}>
          טוען נתונים...
        </p>
        <div style={{ display: 'grid', gap: '16px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '20px',
                height: '100px'
              }}
            >
              <div
                style={{
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(29, 155, 240, 0.3)',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: ROYAL_COLORS.background,
          color: ROYAL_COLORS.text,
          padding: '20px',
          direction: 'rtl',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <p style={{ color: ROYAL_COLORS.muted }}>לא ניתן לטעון נתונים</p>
      </div>
    );
  }

  const metricCards = [
    {
      label: 'עסקים פעילים',
      value: metrics.activeBusinesses,
      total: metrics.totalBusinesses,
      icon: '🏢',
      color: '#1D9BF0'
    },
    {
      label: 'הזמנות סה"כ',
      value: metrics.totalOrders,
      subValue: `${metrics.ordersToday} היום`,
      icon: '📦',
      color: '#10B981'
    },
    {
      label: 'הכנסות כוללות',
      value: `₪${metrics.totalRevenue.toLocaleString()}`,
      icon: '💰',
      color: '#F59E0B'
    },
    {
      label: 'נהגים פעילים',
      value: metrics.activeDrivers,
      total: metrics.totalDrivers,
      icon: '🚗',
      color: '#8B5CF6'
    },
    {
      label: 'משתמשים רשומים',
      value: metrics.totalUsers,
      icon: '👥',
      color: '#EC4899'
    },
    {
      label: 'ממוצע הזמנה',
      value: metrics.totalOrders > 0
        ? `₪${Math.round(metrics.totalRevenue / metrics.totalOrders).toLocaleString()}`
        : '₪0',
      icon: '📊',
      color: '#06B6D4'
    }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: ROYAL_COLORS.background,
        color: ROYAL_COLORS.text,
        padding: '20px',
        direction: 'rtl'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 8px', fontWeight: '700' }}>
        ניתוח פלטפורמה {user ? `• ${getUserDisplayName(user)}` : ''}
      </h1>
      <p style={{ margin: '0 0 24px', color: ROYAL_COLORS.muted, fontSize: '14px' }}>
        סקירה כללית של הפעילות והביצועים במערכת
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {metricCards.map((card) => (
          <div
            key={card.label}
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(29, 155, 240, 0.1) 0%, rgba(29, 155, 240, 0.05) 100%)',
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              padding: '20px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 8px 24px ${card.color}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, fontWeight: '500' }}>
                {card.label}
              </div>
              <div
                style={{
                  fontSize: '24px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: `${card.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {card.icon}
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: card.color }}>
              {card.value}
            </div>
            {card.total !== undefined && (
              <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
                מתוך {card.total} סה"כ
              </div>
            )}
            {card.subValue && (
              <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
                {card.subValue}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: '32px',
          padding: '24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(29, 155, 240, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: `1px solid ${ROYAL_COLORS.cardBorder}`
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
          סטטוס מערכת
        </h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: ROYAL_COLORS.muted }}>תפעול:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontWeight: '600' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
              פעיל
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: ROYAL_COLORS.muted }}>זמן פעילות:</span>
            <span style={{ fontWeight: '600' }}>99.9%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: ROYAL_COLORS.muted }}>גרסה:</span>
            <span style={{ fontWeight: '600' }}>v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
