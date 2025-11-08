/**
 * Infrastructure Owner Dashboard
 *
 * Global control panel with cross-business analytics, system health, and administrative tools.
 */

import React, { useEffect, useState, useRef } from 'react';
import { getSupabase, isSupabaseInitialized } from '../lib/supabaseClient';
import { CreateBusinessModal } from './CreateBusinessModal';
import { DataStore, User } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { fetchInfrastructureOverview, fetchBusinessMetrics } from '../services/metrics';
import { logger } from '../lib/logger';

interface InfrastructureOwnerDashboardProps {
  dataStore: DataStore;
  user: User | null;
  onNavigate: (page: string) => void;
}

interface DashboardMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalRevenue: number;
  totalOrders: number;
  activeDrivers: number;
  pendingAllocations: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface BusinessSummary {
  id: string;
  name: string;
  active: boolean;
  total_orders: number;
  revenue_today: number;
  active_drivers: number;
  pending_orders: number;
}

interface RecentActivity {
  id: string;
  event_type: string;
  actor_name: string;
  business_name: string;
  description: string;
  created_at: string;
  severity: string;
}

export function InfrastructureOwnerDashboard({ dataStore, user, onNavigate }: InfrastructureOwnerDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const loadingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!isSupabaseInitialized()) {
      const checkInterval = setInterval(() => {
        if (isSupabaseInitialized()) {
          clearInterval(checkInterval);
          setIsSystemReady(true);
          loadDashboardData();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        setLoading(false);
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }

    setIsSystemReady(true);
    loadDashboardData();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  async function loadDashboardData() {
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);

      if (!isSupabaseInitialized()) {
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const supabase = getSupabase();

      const overview = await fetchInfrastructureOverview();

      setMetrics({
        totalBusinesses: overview.total_businesses,
        activeBusinesses: overview.active_businesses,
        totalRevenue: overview.revenue_today,
        totalOrders: overview.total_orders_30_days,
        activeDrivers: overview.active_drivers,
        pendingAllocations: overview.pending_allocations,
        systemHealth: overview.system_health,
      });

      const { data: businessRows, error: businessRowsError } = await supabase
        .from('businesses')
        .select('id, name, active')
        .order('name', { ascending: true });

      if (businessRowsError || !businessRows) {
        setBusinesses([]);
      } else {
        const businessMetrics = await Promise.all(
          businessRows.map(async (biz: any) => {
            try {
              const metrics = await fetchBusinessMetrics(biz.id);
              return {
                id: biz.id,
                name: biz.name,
                active: biz.active,
                total_orders: metrics.orders_month,
                revenue_today: metrics.revenue_today,
                active_drivers: metrics.active_drivers,
                pending_orders: metrics.orders_in_progress,
              } as BusinessSummary;
            } catch (err) {
              logger.warn('⚠️ Failed to load metrics for business', biz.id, err);
              return {
                id: biz.id,
                name: biz.name,
                active: biz.active,
                total_orders: 0,
                revenue_today: 0,
                active_drivers: 0,
                pending_orders: 0,
              } as BusinessSummary;
            }
          })
        );

        setBusinesses(businessMetrics);
      }

      const { data: activityData, error: auditError } = await supabase
        .from('system_audit_log')
        .select('id, event_type, action, business_id, created_at, severity, actor_id')
        .order('created_at', { ascending: false })
        .limit(20);

      if (auditError) {
        setRecentActivity([]);
      } else {
        const activities: RecentActivity[] = await Promise.all(
          (activityData || []).map(async (activity: any) => {
            // Fetch actor name
            const { data: actor } = await supabase
              .from('users')
              .select('name')
              .eq('id', activity.actor_id)
              .maybeSingle();

            // Fetch business name if business_id exists
            let businessName = 'מערכת';
            if (activity.business_id) {
              const { data: business } = await supabase
                .from('businesses')
                .select('name')
                .eq('id', activity.business_id)
                .maybeSingle();
              businessName = business?.name || 'לא ידוע';
            }

            return {
              id: activity.id,
              event_type: activity.event_type,
              actor_name: actor?.name || 'לא ידוע',
              business_name: businessName,
              description: activity.action || activity.event_type,
              created_at: activity.created_at,
              severity: activity.severity || 'info',
            };
          })
        );

        setRecentActivity(activities);
      }

      if (!subscriptionRef.current && isSupabaseInitialized()) {
        try {
          const subscription = supabase
            .channel('infra-dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => loadDashboardData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadDashboardData())
            .subscribe();
          subscriptionRef.current = subscription;
        } catch {}
      }
    } catch {
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  if (loading) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: `4px solid ${ROYAL_COLORS.cardBorder}`, borderTop: `4px solid ${ROYAL_COLORS.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: ROYAL_COLORS.muted }}>טוען לוח בקרת תשתית...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={{ ...ROYAL_STYLES.card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', background: ROYAL_COLORS.gradientPurple, color: ROYAL_COLORS.textBright, boxShadow: ROYAL_COLORS.glowPurpleStrong }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px' }}>מרכז בקרת תשתית</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>פיקוח וניהול פלטפורמה גלובלית</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: metrics?.systemHealth === 'healthy' ? ROYAL_COLORS.success : metrics?.systemHealth === 'warning' ? ROYAL_COLORS.warning : ROYAL_COLORS.error, animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '14px', fontWeight: '600' }}>{metrics?.systemHealth === 'healthy' ? 'תקין' : metrics?.systemHealth === 'warning' ? 'אזהרה' : 'קריטי'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ ...ROYAL_STYLES.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '36px' }}>🏢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.accent, marginBottom: '4px', textShadow: ROYAL_COLORS.glowPurple }}>{metrics?.totalBusinesses}</div>
            <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '2px' }}>סך עסקים</div>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.mutedDark }}>{metrics?.activeBusinesses} פעילים</div>
          </div>
        </div>

        <div style={{ ...ROYAL_STYLES.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '36px' }}>💰</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.gold, marginBottom: '4px', textShadow: ROYAL_COLORS.glowGold }}>₪{metrics?.totalRevenue.toLocaleString()}</div>
            <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '2px' }}>הכנסות היום</div>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.mutedDark }}>בכל העסקים</div>
          </div>
        </div>

        <div style={{ ...ROYAL_STYLES.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '36px' }}>📦</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.accent, marginBottom: '4px', textShadow: ROYAL_COLORS.glowPurple }}>{metrics?.totalOrders}</div>
            <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '2px' }}>סך הזמנות</div>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.mutedDark }}>בכל הפלטפורמה</div>
          </div>
        </div>

        <div style={{ ...ROYAL_STYLES.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '36px' }}>🚗</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.info, marginBottom: '4px' }}>{metrics?.activeDrivers}</div>
            <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '2px' }}>נהגים פעילים</div>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.mutedDark }}>תשתית + עסקים</div>
          </div>
        </div>

        <div style={{ ...ROYAL_STYLES.card, display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(245, 158, 11, 0.1)', border: `2px solid ${ROYAL_COLORS.warning}` }}>
          <div style={{ fontSize: '36px' }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.warning, marginBottom: '4px' }}>{metrics?.pendingAllocations}</div>
            <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '2px' }}>הקצאות ממתינות</div>
            <div style={{ fontSize: '12px', color: ROYAL_COLORS.mutedDark }}>דורש אישור</div>
          </div>
        </div>
      </div>

      <div style={ROYAL_STYLES.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: ROYAL_COLORS.text }}>סקירת עסקים</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                if (!isSystemReady) {
                  return;
                }
                setShowCreateModal(true);
              }}
              disabled={!isSystemReady}
              style={{
                ...ROYAL_STYLES.buttonPrimary,
                opacity: isSystemReady ? 1 : 0.6,
                cursor: isSystemReady ? 'pointer' : 'not-allowed'
              }}
              title={isSystemReady ? undefined : 'המערכת בתהליך אתחול...'}
            >
              + צור עסק חדש
            </button>
            <button
              onClick={() => onNavigate('businesses')}
              style={ROYAL_STYLES.buttonSecondary}
            >ראה הכל</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {businesses.slice(0, 6).map(business => (
            <div key={business.id} style={{ padding: '16px', border: `2px solid ${ROYAL_COLORS.cardBorder}`, borderRadius: '12px', background: ROYAL_COLORS.secondary, opacity: business.active ? 1 : 0.6, transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: ROYAL_COLORS.text }}>{business.name}</h3>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: '600', background: business.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: business.active ? ROYAL_COLORS.success : ROYAL_COLORS.error }}>
                  {business.active ? 'פעיל' : 'לא פעיל'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.text }}>{business.total_orders}</span>
                  <span style={{ fontSize: '11px', color: ROYAL_COLORS.muted, marginTop: '2px' }}>הזמנות</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.gold }}>₪{business.revenue_today.toLocaleString()}</span>
                  <span style={{ fontSize: '11px', color: ROYAL_COLORS.muted, marginTop: '2px' }}>היום</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.info }}>{business.active_drivers}</span>
                  <span style={{ fontSize: '11px', color: ROYAL_COLORS.muted, marginTop: '2px' }}>נהגים</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.warning }}>{business.pending_orders}</span>
                  <span style={{ fontSize: '11px', color: ROYAL_COLORS.muted, marginTop: '2px' }}>ממתינים</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={ROYAL_STYLES.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: ROYAL_COLORS.text }}>פעילות מערכת אחרונה</h2>
          <button style={ROYAL_STYLES.buttonSecondary}>ראה יומן ביקורת</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recentActivity.map(activity => {
            const severityColors = { critical: ROYAL_COLORS.error, warning: ROYAL_COLORS.warning, info: ROYAL_COLORS.info };
            const borderColor = severityColors[activity.severity as keyof typeof severityColors] || ROYAL_COLORS.cardBorder;
            return (
              <div key={activity.id} style={{ display: 'flex', gap: '12px', padding: '12px', borderLeft: `3px solid ${borderColor}`, background: ROYAL_COLORS.secondary, borderRadius: '8px' }}>
                <div style={{ fontSize: '20px' }}>
                  {activity.severity === 'critical' && '🔴'}
                  {activity.severity === 'warning' && '⚠️'}
                  {activity.severity === 'info' && 'ℹ️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                    <strong>{activity.actor_name}</strong> {activity.description}
                  </div>
                  <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                    {activity.business_name} • {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Business Modal */}
      {showCreateModal && (
        <CreateBusinessModal
          dataStore={dataStore}
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadDashboardData();
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
