/**
 * Infrastructure Owner Dashboard
 *
 * Global control panel with cross-business analytics, system health, and administrative tools.
 */

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { CreateBusinessModal } from './CreateBusinessModal';
import { DataStore, User } from '../data/types';

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

  useEffect(() => {
    loadDashboardData();

    // Subscribe to real-time updates
    const supabase = getSupabase();
    const subscription = supabase
      .channel('infra-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const supabase = getSupabase();

      // Load metrics with error handling for each query
      const [businessesData, ordersData, driversData, allocationsData] = await Promise.all([
        supabase.from('businesses').select('id, active').then(res => {
          if (res.error) console.warn('Failed to load businesses:', res.error);
          return res;
        }),
        supabase.from('orders').select('id, total_amount, status, created_at').then(res => {
          if (res.error) console.warn('Failed to load orders:', res.error);
          return res;
        }),
        supabase.from('users').select('id, role').in('role', ['driver', 'infrastructure_driver']).then(res => {
          if (res.error) console.warn('Failed to load drivers:', res.error);
          return res;
        }),
        supabase.from('stock_allocations').select('id, allocation_status').eq('allocation_status', 'pending').then(res => {
          if (res.error) console.warn('Failed to load allocations:', res.error);
          return res;
        }),
      ]);

      const totalBusinesses = businessesData.data?.length || 0;
      const activeBusinesses = businessesData.data?.filter(b => b.active).length || 0;

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = ordersData.data?.filter(o => o.created_at.startsWith(today)) || [];
      const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      setMetrics({
        totalBusinesses,
        activeBusinesses,
        totalRevenue,
        totalOrders: ordersData.data?.length || 0,
        activeDrivers: driversData.data?.length || 0,
        pendingAllocations: allocationsData.data?.length || 0,
        systemHealth: allocationsData.data && allocationsData.data.length > 10 ? 'warning' : 'healthy',
      });

      // Load business summaries
      const { data: businessSummaries, error: summariesError } = await supabase.rpc('get_business_summaries');
      if (summariesError) {
        console.warn('Failed to load business summaries:', summariesError);
        setBusinesses([]);
      } else {
        setBusinesses(businessSummaries || []);
      }

      // Load recent activity - fetch audit logs without join first, then fetch related data
      const { data: activityData, error: auditError } = await supabase
        .from('system_audit_log')
        .select('id, event_type, action, business_id, created_at, severity, actor_id')
        .order('created_at', { ascending: false })
        .limit(20);

      if (auditError) {
        console.warn('Failed to load audit log:', auditError);
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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>טוען לוח בקרת תשתית...</p>
      </div>
    );
  }

  return (
    <div className="infra-owner-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>מרכז בקרת תשתית</h1>
          <p className="subtitle">פיקוח וניהול פלטפורמה גלובלית</p>
        </div>
        <div className="system-health">
          <div className={`health-indicator ${metrics?.systemHealth}`}>
            <span className="health-dot"></span>
            <span className="health-label">{metrics?.systemHealth === 'healthy' ? 'תקין' : metrics?.systemHealth === 'warning' ? 'אזהרה' : 'קריטי'}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">🏢</div>
          <div className="metric-content">
            <div className="metric-value">{metrics?.totalBusinesses}</div>
            <div className="metric-label">סך עסקים</div>
            <div className="metric-meta">{metrics?.activeBusinesses} פעילים</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <div className="metric-value">₪{metrics?.totalRevenue.toLocaleString()}</div>
            <div className="metric-label">הכנסות היום</div>
            <div className="metric-meta">בכל העסקים</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <div className="metric-value">{metrics?.totalOrders}</div>
            <div className="metric-label">סך הזמנות</div>
            <div className="metric-meta">בכל הפלטפורמה</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🚗</div>
          <div className="metric-content">
            <div className="metric-value">{metrics?.activeDrivers}</div>
            <div className="metric-label">נהגים פעילים</div>
            <div className="metric-meta">תשתית + עסקים</div>
          </div>
        </div>

        <div className="metric-card alert">
          <div className="metric-icon">⚠️</div>
          <div className="metric-content">
            <div className="metric-value">{metrics?.pendingAllocations}</div>
            <div className="metric-label">הקצאות ממתינות</div>
            <div className="metric-meta">דורש אישור</div>
          </div>
        </div>
      </div>

      {/* Business Overview */}
      <div className="section">
        <div className="section-header">
          <h2>סקירת עסקים</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
              }}
            >
              + צור עסק חדש
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('businesses')}>ראה הכל</button>
          </div>
        </div>
        <div className="business-grid">
          {businesses.slice(0, 6).map(business => (
            <div key={business.id} className={`business-card ${!business.active ? 'inactive' : ''}`}>
              <div className="business-header">
                <h3>{business.name}</h3>
                <span className={`status-badge ${business.active ? 'active' : 'inactive'}`}>
                  {business.active ? 'פעיל' : 'לא פעיל'}
                </span>
              </div>
              <div className="business-stats">
                <div className="stat">
                  <span className="stat-value">{business.total_orders}</span>
                  <span className="stat-label">הזמנות</span>
                </div>
                <div className="stat">
                  <span className="stat-value">₪{business.revenue_today.toLocaleString()}</span>
                  <span className="stat-label">היום</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{business.active_drivers}</span>
                  <span className="stat-label">נהגים</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{business.pending_orders}</span>
                  <span className="stat-label">ממתינים</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="section">
        <div className="section-header">
          <h2>פעילות מערכת אחרונה</h2>
          <button className="btn-secondary">ראה יומן ביקורת</button>
        </div>
        <div className="activity-list">
          {recentActivity.map(activity => (
            <div key={activity.id} className={`activity-item severity-${activity.severity}`}>
              <div className="activity-icon">
                {activity.severity === 'critical' && '🔴'}
                {activity.severity === 'warning' && '⚠️'}
                {activity.severity === 'info' && 'ℹ️'}
              </div>
              <div className="activity-content">
                <div className="activity-main">
                  <strong>{activity.actor_name}</strong> {activity.description}
                </div>
                <div className="activity-meta">
                  {activity.business_name} • {new Date(activity.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
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

      <style jsx>{`
        .infra-owner-dashboard {
          padding: 24px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
        }

        .dashboard-header h1 {
          margin: 0 0 8px 0;
          font-size: 32px;
        }

        .subtitle {
          margin: 0;
          opacity: 0.9;
          font-size: 16px;
        }

        .system-health {
          display: flex;
          align-items: center;
        }

        .health-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .health-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .health-indicator.healthy .health-dot {
          background: #10b981;
        }

        .health-indicator.warning .health-dot {
          background: #f59e0b;
        }

        .health-indicator.critical .health-dot {
          background: #ef4444;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .metric-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .metric-card.alert {
          background: #fef3c7;
          border: 2px solid #f59e0b;
        }

        .metric-icon {
          font-size: 36px;
        }

        .metric-content {
          flex: 1;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 2px;
        }

        .metric-meta {
          font-size: 12px;
          color: #9ca3af;
        }

        .section {
          margin-bottom: 32px;
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h2 {
          margin: 0;
          font-size: 20px;
          color: #111827;
        }

        .btn-secondary {
          padding: 8px 16px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #f9fafb;
          border-color: #667eea;
          color: #667eea;
        }

        .business-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .business-card {
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .business-card:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }

        .business-card.inactive {
          opacity: 0.6;
        }

        .business-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .business-header h3 {
          margin: 0;
          font-size: 16px;
          color: #111827;
        }

        .status-badge {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .status-badge.active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .business-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }

        .stat-label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .activity-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-left: 3px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 6px;
        }

        .activity-item.severity-critical {
          border-left-color: #ef4444;
          background: #fef2f2;
        }

        .activity-item.severity-warning {
          border-left-color: #f59e0b;
          background: #fefce8;
        }

        .activity-item.severity-info {
          border-left-color: #3b82f6;
          background: #eff6ff;
        }

        .activity-icon {
          font-size: 20px;
        }

        .activity-content {
          flex: 1;
        }

        .activity-main {
          font-size: 14px;
          color: #111827;
          margin-bottom: 4px;
        }

        .activity-meta {
          font-size: 12px;
          color: #6b7280;
        }

        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: 48px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #f3f4f6;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
