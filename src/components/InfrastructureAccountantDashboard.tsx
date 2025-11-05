import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface BusinessRevenue {
  business_id: string;
  business_name: string;
  business_type: string;
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  average_order_value: number;
  revenue_share_percentage: number;
}

interface PeriodData {
  period_start: string;
  period_end: string;
  period_label: string;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  average_order_value: number;
  completion_rate: number;
}

interface ProfitabilityReport {
  business_id: string;
  business_name: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  highest_order_value: number;
  lowest_order_value: number;
  order_completion_rate: number;
  revenue_growth_rate: number;
  performance_rating: string;
}

interface CostCenter {
  cost_center: string;
  category: string;
  total_transactions: number;
  total_amount: number;
  average_transaction: number;
  percentage_of_total: number;
}

export function InfrastructureAccountantDashboard() {
  const [businessRevenue, setBusinessRevenue] = useState<BusinessRevenue[]>([]);
  const [periodData, setPeriodData] = useState<PeriodData[]>([]);
  const [profitabilityReport, setProfitabilityReport] = useState<ProfitabilityReport[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'profitability' | 'costs'>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '365d'>('30d');
  const [periodType, setPeriodType] = useState<'day' | 'week' | 'month'>('month');

  useEffect(() => {
    loadData();
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);

      const startDate = getStartDate(dateRange);
      const endDate = new Date().toISOString();

      await Promise.all([
        loadBusinessRevenue(startDate, endDate),
        loadPeriodData(),
        loadProfitabilityReport(startDate, endDate),
        loadCostCenters(startDate, endDate)
      ]);
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStartDate(range: string): string {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case '365d':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  async function loadBusinessRevenue(startDate: string, endDate: string) {
    const { data, error } = await supabase.rpc('get_cross_business_revenue', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Failed to load business revenue:', error);
      return;
    }
    setBusinessRevenue(data || []);
  }

  async function loadPeriodData() {
    const periodsBack = periodType === 'day' ? 30 : periodType === 'week' ? 12 : 12;

    const { data, error } = await supabase.rpc('get_financial_summary_by_period', {
      p_business_id: null,
      p_period: periodType,
      p_periods_back: periodsBack
    });

    if (error) {
      console.error('Failed to load period data:', error);
      return;
    }
    setPeriodData(data || []);
  }

  async function loadProfitabilityReport(startDate: string, endDate: string) {
    const { data, error } = await supabase.rpc('get_business_profitability_report', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Failed to load profitability report:', error);
      return;
    }
    setProfitabilityReport(data || []);
  }

  async function loadCostCenters(startDate: string, endDate: string) {
    const { data, error } = await supabase.rpc('get_cost_center_analysis', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Failed to load cost centers:', error);
      return;
    }
    setCostCenters(data || []);
  }

  async function handleExportData() {
    try {
      const startDate = getStartDate(dateRange);
      const endDate = new Date().toISOString();

      const { data, error } = await supabase.rpc('get_financial_export_data', {
        p_business_id: null,
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (error) throw error;

      const csv = convertToCSV(data || []);
      downloadCSV(csv, `financial_export_${dateRange}.csv`);
      alert('Financial data exported successfully');
    } catch (error: any) {
      console.error('Failed to export data:', error);
      alert(error.message || 'Failed to export financial data');
    }
  }

  function convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(val =>
        typeof val === 'string' ? `"${val}"` : val
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const totalRevenue = businessRevenue.reduce((sum, b) => sum + Number(b.total_revenue), 0);
  const totalOrders = businessRevenue.reduce((sum, b) => sum + Number(b.total_orders), 0);
  const completedOrders = businessRevenue.reduce((sum, b) => sum + Number(b.completed_orders), 0);
  const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading Financial Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="infrastructure-accountant-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Infrastructure Accountant - Financial Overview</h1>
          <p className="subtitle">Cross-business financial reporting and analysis</p>
        </div>
        <div className="header-controls">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="365d">Last Year</option>
          </select>
          <button className="btn-export" onClick={handleExportData}>
            Export Data
          </button>
        </div>
      </div>

      <div className="key-metrics">
        <div className="metric-card revenue">
          <div className="metric-icon">₪</div>
          <div className="metric-content">
            <div className="metric-value">₪{totalRevenue.toFixed(2)}</div>
            <div className="metric-label">Total Revenue</div>
          </div>
        </div>
        <div className="metric-card orders">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <div className="metric-value">{totalOrders}</div>
            <div className="metric-label">Total Orders</div>
          </div>
        </div>
        <div className="metric-card completed">
          <div className="metric-icon">✓</div>
          <div className="metric-content">
            <div className="metric-value">{completedOrders}</div>
            <div className="metric-label">Completed Orders</div>
          </div>
        </div>
        <div className="metric-card average">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-value">₪{avgOrderValue.toFixed(2)}</div>
            <div className="metric-label">Avg Order Value</div>
          </div>
        </div>
      </div>

      <div className="view-tabs">
        <button
          className={`view-tab ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          Business Overview
        </button>
        <button
          className={`view-tab ${activeView === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveView('trends')}
        >
          Revenue Trends
        </button>
        <button
          className={`view-tab ${activeView === 'profitability' ? 'active' : ''}`}
          onClick={() => setActiveView('profitability')}
        >
          Profitability Analysis
        </button>
        <button
          className={`view-tab ${activeView === 'costs' ? 'active' : ''}`}
          onClick={() => setActiveView('costs')}
        >
          Cost Centers
        </button>
      </div>

      {activeView === 'overview' && (
        <div className="overview-view">
          <h2>Business Revenue Breakdown</h2>
          <div className="business-revenue-grid">
            {businessRevenue.map((business) => (
              <div key={business.business_id} className="business-card">
                <div className="business-header">
                  <div>
                    <h3>{business.business_name}</h3>
                    <span className="business-type">{business.business_type}</span>
                  </div>
                  <div className="revenue-share">
                    {business.revenue_share_percentage.toFixed(1)}%
                  </div>
                </div>
                <div className="business-metrics">
                  <div className="metric-row">
                    <span className="label">Revenue:</span>
                    <span className="value revenue">₪{Number(business.total_revenue).toFixed(2)}</span>
                  </div>
                  <div className="metric-row">
                    <span className="label">Orders:</span>
                    <span className="value">{business.total_orders} ({business.completed_orders} completed)</span>
                  </div>
                  <div className="metric-row">
                    <span className="label">Avg Order:</span>
                    <span className="value">₪{Number(business.average_order_value).toFixed(2)}</span>
                  </div>
                  <div className="metric-row">
                    <span className="label">Completion:</span>
                    <span className="value">
                      {business.total_orders > 0
                        ? ((business.completed_orders / business.total_orders) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'trends' && (
        <div className="trends-view">
          <div className="trends-header">
            <h2>Revenue Trends Over Time</h2>
            <select value={periodType} onChange={(e) => {
              setPeriodType(e.target.value as any);
              loadPeriodData();
            }}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div className="chart-container">
            {periodData.slice().reverse().map((period, index) => {
              const maxRevenue = Math.max(...periodData.map(p => Number(p.total_revenue)));
              const heightPercentage = maxRevenue > 0 ? (Number(period.total_revenue) / maxRevenue) * 100 : 0;

              return (
                <div key={index} className="chart-bar-container">
                  <div
                    className="chart-bar"
                    style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                    title={`₪${Number(period.total_revenue).toFixed(2)}`}
                  >
                    <span className="bar-value">₪{(Number(period.total_revenue) / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="chart-label">{period.period_label}</div>
                </div>
              );
            })}
          </div>
          <div className="period-details">
            <h3>Period Details</h3>
            <table className="period-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Orders</th>
                  <th>Completed</th>
                  <th>Revenue</th>
                  <th>Avg Order</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {periodData.map((period, index) => (
                  <tr key={index}>
                    <td>{period.period_label}</td>
                    <td>{period.total_orders}</td>
                    <td>{period.completed_orders}</td>
                    <td>₪{Number(period.total_revenue).toFixed(2)}</td>
                    <td>₪{Number(period.average_order_value).toFixed(2)}</td>
                    <td>{Number(period.completion_rate).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'profitability' && (
        <div className="profitability-view">
          <h2>Business Profitability Analysis</h2>
          <div className="profitability-grid">
            {profitabilityReport.map((report) => (
              <div key={report.business_id} className={`profitability-card rating-${report.performance_rating.toLowerCase().replace(' ', '-')}`}>
                <div className="card-header">
                  <h3>{report.business_name}</h3>
                  <span className={`rating-badge ${report.performance_rating.toLowerCase().replace(' ', '-')}`}>
                    {report.performance_rating}
                  </span>
                </div>
                <div className="profitability-metrics">
                  <div className="metric-highlight">
                    <div className="highlight-value">₪{Number(report.total_revenue).toFixed(2)}</div>
                    <div className="highlight-label">Total Revenue</div>
                  </div>
                  <div className="metrics-grid">
                    <div className="mini-metric">
                      <div className="mini-label">Orders</div>
                      <div className="mini-value">{report.total_orders}</div>
                    </div>
                    <div className="mini-metric">
                      <div className="mini-label">Avg Order</div>
                      <div className="mini-value">₪{Number(report.average_order_value).toFixed(0)}</div>
                    </div>
                    <div className="mini-metric">
                      <div className="mini-label">Completion</div>
                      <div className="mini-value">{Number(report.order_completion_rate).toFixed(1)}%</div>
                    </div>
                    <div className="mini-metric">
                      <div className="mini-label">Growth</div>
                      <div className={`mini-value ${Number(report.revenue_growth_rate) >= 0 ? 'positive' : 'negative'}`}>
                        {Number(report.revenue_growth_rate) >= 0 ? '+' : ''}{Number(report.revenue_growth_rate).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="range-info">
                    <div className="range-item">
                      <span>Highest Order:</span>
                      <span className="range-value">₪{Number(report.highest_order_value).toFixed(2)}</span>
                    </div>
                    <div className="range-item">
                      <span>Lowest Order:</span>
                      <span className="range-value">₪{Number(report.lowest_order_value).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'costs' && (
        <div className="costs-view">
          <h2>Cost Center Analysis</h2>
          <div className="costs-grid">
            {costCenters.map((center, index) => (
              <div key={index} className="cost-card">
                <div className="cost-header">
                  <h3>{center.cost_center}</h3>
                  <span className="category-badge">{center.category}</span>
                </div>
                <div className="cost-metrics">
                  <div className="cost-amount">
                    <div className="amount-value">₪{Number(center.total_amount).toFixed(2)}</div>
                    <div className="amount-label">{Number(center.percentage_of_total).toFixed(1)}% of total</div>
                  </div>
                  <div className="cost-details">
                    <div className="detail-item">
                      <span className="detail-label">Transactions:</span>
                      <span className="detail-value">{center.total_transactions}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Average:</span>
                      <span className="detail-value">₪{Number(center.average_transaction).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="cost-bar">
                    <div
                      className="cost-bar-fill"
                      style={{ width: `${Number(center.percentage_of_total)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .infrastructure-accountant-dashboard {
          padding: 24px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding: 24px;
          background: linear-gradient(135deg, #8b5cf6 0%, #1A8CD8 100%);
          border-radius: 12px;
          color: white;
        }

        .dashboard-header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
        }

        .subtitle {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .header-controls {
          display: flex;
          gap: 12px;
        }

        .header-controls select {
          padding: 10px 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .header-controls select option {
          background: white;
          color: #111827;
        }

        .btn-export {
          padding: 10px 20px;
          background: white;
          color: #8b5cf6;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-export:hover {
          background: #f3f4f6;
        }

        .key-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .metric-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .metric-icon {
          font-size: 40px;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #f3f4f6;
        }

        .metric-card.revenue .metric-icon {
          background: #dcfce7;
        }

        .metric-card.orders .metric-icon {
          background: #dbeafe;
        }

        .metric-card.completed .metric-icon {
          background: #fef3c7;
        }

        .metric-card.average .metric-icon {
          background: #e0e7ff;
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
        }

        .view-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
        }

        .view-tab {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-tab:hover {
          color: #111827;
        }

        .view-tab.active {
          color: #8b5cf6;
          border-bottom-color: #8b5cf6;
        }

        .overview-view h2,
        .trends-view h2,
        .profitability-view h2,
        .costs-view h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          color: #111827;
        }

        .business-revenue-grid,
        .profitability-grid,
        .costs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .business-card,
        .profitability-card,
        .cost-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .business-header,
        .card-header,
        .cost-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .business-header h3,
        .card-header h3,
        .cost-header h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: #111827;
        }

        .business-type,
        .category-badge {
          font-size: 11px;
          padding: 3px 8px;
          background: #e0e7ff;
          color: #3730a3;
          border-radius: 4px;
          font-weight: 600;
        }

        .revenue-share {
          font-size: 24px;
          font-weight: 700;
          color: #8b5cf6;
        }

        .business-metrics,
        .profitability-metrics,
        .cost-metrics {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .metric-row .label {
          color: #6b7280;
          font-weight: 600;
        }

        .metric-row .value {
          color: #111827;
        }

        .metric-row .value.revenue {
          color: #10b981;
          font-weight: 700;
        }

        .rating-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .rating-badge.excellent {
          background: #d1fae5;
          color: #065f46;
        }

        .rating-badge.good {
          background: #dbeafe;
          color: #1e40af;
        }

        .rating-badge.fair {
          background: #fef3c7;
          color: #92400e;
        }

        .rating-badge.needs-attention {
          background: #fee2e2;
          color: #991b1b;
        }

        .metric-highlight {
          text-align: center;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .highlight-value {
          font-size: 28px;
          font-weight: 700;
          color: #8b5cf6;
          margin-bottom: 4px;
        }

        .highlight-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }

        .mini-metric {
          text-align: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .mini-label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .mini-value {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }

        .mini-value.positive {
          color: #10b981;
        }

        .mini-value.negative {
          color: #ef4444;
        }

        .range-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .range-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #6b7280;
        }

        .range-value {
          font-weight: 600;
          color: #111827;
        }

        .trends-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .trends-header select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .chart-container {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 300px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .chart-bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          justify-content: flex-end;
        }

        .chart-bar {
          width: 100%;
          background: linear-gradient(180deg, #8b5cf6 0%, #1A8CD8 100%);
          border-radius: 4px 4px 0 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 4px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .chart-bar:hover {
          opacity: 0.8;
        }

        .bar-value {
          font-size: 10px;
          color: white;
          font-weight: 600;
        }

        .chart-label {
          font-size: 10px;
          color: #6b7280;
          margin-top: 8px;
          text-align: center;
        }

        .period-details {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .period-details h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
        }

        .period-table {
          width: 100%;
          border-collapse: collapse;
        }

        .period-table th {
          text-align: left;
          padding: 12px;
          background: #f9fafb;
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          border-bottom: 2px solid #e5e7eb;
        }

        .period-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
          color: #111827;
        }

        .cost-amount {
          text-align: center;
          padding: 16px;
          background: #faf5ff;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .amount-value {
          font-size: 24px;
          font-weight: 700;
          color: #8b5cf6;
          margin-bottom: 4px;
        }

        .amount-label {
          font-size: 12px;
          color: #6b7280;
        }

        .cost-details {
          display: flex;
          justify-content: space-around;
          margin-bottom: 16px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .detail-item {
          text-align: center;
        }

        .detail-label {
          display: block;
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .detail-value {
          display: block;
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }

        .cost-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .cost-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6 0%, #1A8CD8 100%);
          transition: width 0.3s ease;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top-color: #8b5cf6;
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
