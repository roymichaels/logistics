/**
 * Business Owner Dashboard
 *
 * Financial-focused dashboard for business owners showing revenue, costs, profit,
 * ownership distribution, team performance, and operational metrics.
 */

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { fetchBusinessMetrics } from '../services/metrics';

interface FinancialMetrics {
  revenue_today: number;
  revenue_month: number;
  costs_month: number;
  profit_month: number;
  profit_margin: number;
  orders_today: number;
  orders_month: number;
  average_order_value: number;
}

interface OwnershipInfo {
  owner_name: string;
  ownership_percentage: number;
  profit_share_percentage: number;
  estimated_monthly_share: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  orders_completed: number;
  revenue_generated: number;
  active_status: string;
}

interface RecentOrder {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  assigned_driver_name?: string;
}

interface BusinessOwnerDashboardProps {
  businessId: string;
  userId: string;
}

export function BusinessOwnerDashboard({ businessId, userId }: BusinessOwnerDashboardProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [ownership, setOwnership] = useState<OwnershipInfo[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Handle case where businessId is missing
  if (!businessId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏢</div>
        <h2 style={{ color: ROYAL_COLORS.text, marginBottom: '16px' }}>
          ברוכים הבאים!
        </h2>
        <p style={{ color: ROYAL_COLORS.muted, marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
          נראה שאתה עדיין לא יצרת עסק. בוא ניצור את העסק הראשון שלך!
        </p>
        <button
          onClick={() => {
            window.location.hash = '#businesses';
          }}
          style={{
            padding: '12px 32px',
            backgroundColor: ROYAL_COLORS.gold,
            color: ROYAL_COLORS.backgroundSolid,
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          צור עסק חדש
        </button>
      </div>
    );
  }

  useEffect(() => {
    loadDashboardData();

    // Real-time updates
    const supabase = getSupabase();
    const subscription = supabase
      .channel(`business-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [businessId]);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const supabase = getSupabase();
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const kpi = await fetchBusinessMetrics(businessId);

      const revenueMonth = kpi.revenue_month;
      const costsMonth = revenueMonth * 0.6;
      const profitMonth = revenueMonth - costsMonth;
      const profitMargin = revenueMonth > 0 ? (profitMonth / revenueMonth) * 100 : 0;

      setMetrics({
        revenue_today: kpi.revenue_today,
        revenue_month: revenueMonth,
        costs_month: costsMonth,
        profit_month: profitMonth,
        profit_margin: profitMargin,
        orders_today: kpi.orders_today,
        orders_month: kpi.orders_month,
        average_order_value: kpi.average_order_value,
      });

      // Load ownership information
      const { data: ownershipData } = await supabase
        .from('user_business_roles')
        .select(`
          ownership_percentage,
          commission_percentage,
          users (name)
        `)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .gt('ownership_percentage', 0);

      const owners: OwnershipInfo[] = (ownershipData || []).map((item: any) => ({
        owner_name: item.users.name || 'Unknown',
        ownership_percentage: item.ownership_percentage,
        profit_share_percentage: item.commission_percentage || item.ownership_percentage,
        estimated_monthly_share: (profitMonth * (item.ownership_percentage / 100)),
      }));

      setOwnership(owners);

      // Load team members
      const { data: teamData } = await supabase
        .from('user_business_roles')
        .select(`
          user_id,
          users (id, name),
          roles (label)
        `)
        .eq('business_id', businessId)
        .eq('is_active', true);

      const teamMembers: TeamMember[] = await Promise.all(
        (teamData || []).map(async (member: any) => {
          // Get orders completed by this user
          const { data: orderStats } = await supabase
            .from('orders')
            .select('id, total_amount')
            .eq('business_id', businessId)
            .eq('created_by', member.user_id)
            .gte('created_at', firstDayOfMonth);

          return {
            id: member.user_id,
            name: member.users.name || 'Unknown',
            role: member.roles?.label || 'Unknown',
            orders_completed: orderStats?.length || 0,
            revenue_generated: orderStats?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
            active_status: 'active', // Would come from driver_status table in real implementation
          };
        })
      );

      setTeam(teamMembers);

      // Load recent orders
      const { data: ordersRecent } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          total_amount,
          status,
          created_at,
          assigned_driver_user:assigned_driver (name)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);

      const recent: RecentOrder[] = (ordersRecent || []).map((order: any) => ({
        id: order.id,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,
        assigned_driver_name: order.assigned_driver_user?.name,
      }));

      setRecentOrders(recent);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ ...ROYAL_STYLES.pageContainer, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: `4px solid ${ROYAL_COLORS.cardBorder}`, borderTop: `4px solid ${ROYAL_COLORS.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: ROYAL_COLORS.muted }}>Loading business dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={{ ...ROYAL_STYLES.card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', background: ROYAL_COLORS.gradientPurple, color: ROYAL_COLORS.textBright, boxShadow: ROYAL_COLORS.glowPurpleStrong }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '32px' }}>Business Dashboard</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>Financial overview and operational metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ ...ROYAL_STYLES.buttonSecondary, background: 'rgba(255, 255, 255, 0.2)', color: ROYAL_COLORS.textBright, border: '2px solid rgba(255, 255, 255, 0.4)' }}>Export Report</button>
          <button style={{ ...ROYAL_STYLES.buttonPrimary, background: ROYAL_COLORS.textBright, color: ROYAL_COLORS.accent }}>Manage Team</button>
        </div>
      </div>

      <div style={ROYAL_STYLES.card}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: ROYAL_COLORS.text }}>Financial Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div style={{ ...ROYAL_STYLES.card, display: 'flex', alignItems: 'center', gap: '16px', background: ROYAL_COLORS.gradientPurple, color: ROYAL_COLORS.textBright, border: 'none' }}>
            <div style={{ fontSize: '32px' }}>💰</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', marginBottom: '6px', opacity: 0.8 }}>Revenue (Month)</div>
              <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>₪{metrics?.revenue_month.toLocaleString()}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>₪{metrics?.revenue_today.toLocaleString()} today</div>
            </div>
          </div>

          <div style={{ ...ROYAL_STYLES.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>📊</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', marginBottom: '6px', color: ROYAL_COLORS.muted }}>Costs (Month)</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.warning, marginBottom: '4px' }}>₪{metrics?.costs_month.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: ROYAL_COLORS.mutedDark }}>Operating expenses</div>
            </div>
          </div>

          <div style={{ ...ROYAL_STYLES.card, display: 'flex', alignItems: 'center', gap: '16px', background: ROYAL_COLORS.gradientSuccess, color: ROYAL_COLORS.textBright, border: 'none' }}>
            <div style={{ fontSize: '32px' }}>💎</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', marginBottom: '6px', opacity: 0.8 }}>Profit (Month)</div>
              <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>₪{metrics?.profit_month.toLocaleString()}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>{metrics?.profit_margin.toFixed(1)}% margin</div>
            </div>
          </div>

          <div style={{ ...ROYAL_STYLES.card, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>📦</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', marginBottom: '6px', color: ROYAL_COLORS.muted }}>Orders (Month)</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.info, marginBottom: '4px' }}>{metrics?.orders_month}</div>
              <div style={{ fontSize: '12px', color: ROYAL_COLORS.mutedDark }}>₪{metrics?.average_order_value.toFixed(0)} avg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ownership Distribution */}
      <div className="section ownership-section">
        <h2>Ownership Distribution</h2>
        <div className="ownership-grid">
          {ownership.map((owner, index) => (
            <div key={index} className="ownership-card">
              <div className="owner-header">
                <div className="owner-icon">👤</div>
                <div className="owner-info">
                  <div className="owner-name">{owner.owner_name}</div>
                  <div className="ownership-pct">{owner.ownership_percentage}% ownership</div>
                </div>
              </div>
              <div className="owner-financials">
                <div className="financial-item">
                  <span className="label">Profit Share:</span>
                  <span className="value">{owner.profit_share_percentage}%</span>
                </div>
                <div className="financial-item highlighted">
                  <span className="label">Est. Monthly Share:</span>
                  <span className="value">₪{owner.estimated_monthly_share.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Performance */}
      <div className="section team-section">
        <h2>Team Performance</h2>
        <div className="team-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Orders</th>
                <th>Revenue Generated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map(member => (
                <tr key={member.id}>
                  <td className="team-name">{member.name}</td>
                  <td>
                    <span className="role-badge">{member.role}</span>
                  </td>
                  <td>{member.orders_completed}</td>
                  <td className="revenue">₪{member.revenue_generated.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${member.active_status}`}>
                      {member.active_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="section orders-section">
        <h2>Recent Orders</h2>
        <div className="orders-list">
          {recentOrders.map(order => (
            <div key={order.id} className="order-item">
              <div className="order-main">
                <div className="order-customer">{order.customer_name}</div>
                <div className="order-amount">₪{order.total_amount.toLocaleString()}</div>
              </div>
              <div className="order-meta">
                <span className={`status-badge ${order.status}`}>{order.status}</span>
                {order.assigned_driver_name && (
                  <span className="driver-name">🚗 {order.assigned_driver_name}</span>
                )}
                <span className="order-time">{new Date(order.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <style jsx>{`
        .business-owner-dashboard {
          padding: 24px;
          max-width: 1400px;
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

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: white;
          color: #667eea;
        }

        .btn-primary:hover {
          background: #f9fafb;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.4);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .section {
          margin-bottom: 32px;
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .section h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          color: #111827;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .metric-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #f9fafb;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
        }

        .metric-card.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
        }

        .metric-card.success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
        }

        .metric-icon {
          font-size: 32px;
        }

        .metric-content {
          flex: 1;
        }

        .metric-label {
          font-size: 13px;
          margin-bottom: 6px;
          opacity: 0.8;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .metric-meta {
          font-size: 12px;
          opacity: 0.7;
        }

        .ownership-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .ownership-card {
          padding: 20px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
        }

        .owner-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .owner-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          font-size: 24px;
        }

        .owner-info {
          flex: 1;
        }

        .owner-name {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .ownership-pct {
          font-size: 13px;
          color: #6b7280;
        }

        .owner-financials {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .financial-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .financial-item.highlighted {
          background: #ecfdf5;
          border: 1px solid #10b981;
        }

        .financial-item .label {
          font-size: 13px;
          color: #6b7280;
        }

        .financial-item .value {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
        }

        .financial-item.highlighted .value {
          color: #059669;
        }

        .team-table {
          overflow-x: auto;
        }

        .team-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .team-table th {
          text-align: left;
          padding: 12px;
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .team-table td {
          padding: 16px 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
          color: #111827;
        }

        .team-name {
          font-weight: 600;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #eff6ff;
          color: #1e40af;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .revenue {
          font-weight: 700;
          color: #059669;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.new,
        .status-badge.confirmed {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-badge.preparing {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.out_for_delivery {
          background: #e0e7ff;
          color: #3730a3;
        }

        .status-badge.delivered {
          background: #d1fae5;
          color: #065f46;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .order-item {
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .order-item:hover {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
        }

        .order-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .order-customer {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
        }

        .order-amount {
          font-size: 16px;
          font-weight: 700;
          color: #059669;
        }

        .order-meta {
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 12px;
          color: #6b7280;
        }

        .driver-name {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .loading-state {
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
