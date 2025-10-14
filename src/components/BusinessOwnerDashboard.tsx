/**
 * Business Owner Dashboard
 *
 * Financial-focused dashboard for business owners showing revenue, costs, profit,
 * ownership distribution, team performance, and operational metrics.
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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

  useEffect(() => {
    loadDashboardData();

    // Real-time updates
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

      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Load financial metrics
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .eq('business_id', businessId);

      const todayOrders = ordersData?.filter(o => o.created_at.startsWith(today)) || [];
      const monthOrders = ordersData?.filter(o => o.created_at >= firstDayOfMonth) || [];

      const revenueToday = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const revenueMonth = monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      // For demo purposes, costs are 60% of revenue
      const costsMonth = revenueMonth * 0.6;
      const profitMonth = revenueMonth - costsMonth;
      const profitMargin = revenueMonth > 0 ? (profitMonth / revenueMonth) * 100 : 0;

      setMetrics({
        revenue_today: revenueToday,
        revenue_month: revenueMonth,
        costs_month: costsMonth,
        profit_month: profitMonth,
        profit_margin: profitMargin,
        orders_today: todayOrders.length,
        orders_month: monthOrders.length,
        average_order_value: monthOrders.length > 0 ? revenueMonth / monthOrders.length : 0,
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
    } catch (error) {
      console.error('Failed to load business dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading business dashboard...</p>
      </div>
    );
  }

  return (
    <div className="business-owner-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Business Dashboard</h1>
          <p className="subtitle">Financial overview and operational metrics</p>
        </div>
        <div className="action-buttons">
          <button className="btn-secondary">Export Report</button>
          <button className="btn-primary">Manage Team</button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="section financial-overview">
        <h2>Financial Overview</h2>
        <div className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <div className="metric-label">Revenue (Month)</div>
              <div className="metric-value">₪{metrics?.revenue_month.toLocaleString()}</div>
              <div className="metric-meta">₪{metrics?.revenue_today.toLocaleString()} today</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-content">
              <div className="metric-label">Costs (Month)</div>
              <div className="metric-value">₪{metrics?.costs_month.toLocaleString()}</div>
              <div className="metric-meta">Operating expenses</div>
            </div>
          </div>

          <div className="metric-card success">
            <div className="metric-icon">💎</div>
            <div className="metric-content">
              <div className="metric-label">Profit (Month)</div>
              <div className="metric-value">₪{metrics?.profit_month.toLocaleString()}</div>
              <div className="metric-meta">{metrics?.profit_margin.toFixed(1)}% margin</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📦</div>
            <div className="metric-content">
              <div className="metric-label">Orders (Month)</div>
              <div className="metric-value">{metrics?.orders_month}</div>
              <div className="metric-meta">₪{metrics?.average_order_value.toFixed(0)} avg</div>
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
