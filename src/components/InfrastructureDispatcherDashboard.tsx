import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_address: string;
  status: string;
  priority: string;
  business_id: string;
  business_name: string;
  assigned_driver: string | null;
  driver_name: string | null;
  zone_id: string | null;
  zone_name: string | null;
  created_at: string;
  total_amount: number;
}

interface Driver {
  id: string;
  telegram_id: string;
  name: string;
  phone_number: string | null;
  current_zone_id: string | null;
  zone_name: string | null;
  active_orders_count: number;
  status: string;
  business_id: string;
  business_name: string;
}

interface ZoneCoverage {
  zone_id: string;
  zone_name: string;
  business_id: string;
  business_name: string;
  total_drivers: number;
  active_drivers: number;
  pending_orders: number;
  coverage_percentage: number;
}

export function InfrastructureDispatcherDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [zoneCoverage, setZoneCoverage] = useState<ZoneCoverage[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'orders' | 'drivers' | 'zones'>('orders');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [selectedBusiness, filterStatus]);

  async function loadData() {
    try {
      setLoading(true);
      await Promise.all([
        loadBusinesses(),
        loadOrders(),
        loadDrivers(),
        loadZoneCoverage()
      ]);
    } catch (error) {
      logger.error('Failed to load dispatcher data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBusinesses() {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, business_type, active')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    setBusinesses(data || []);
  }

  async function loadOrders() {
    let query = supabase
      .from('orders')
      .select(`
        *,
        business:businesses(name),
        zone:zones(name)
      `)
      .in('status', ['pending', 'confirmed', 'assigned', 'in_transit'])
      .order('created_at', { ascending: false });

    if (selectedBusiness !== 'all') {
      query = query.eq('business_id', selectedBusiness);
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) throw error;

    const ordersData: Order[] = (data || []).map((order: any) => ({
      id: order.id,
      order_number: order.order_number || 'N/A',
      customer_name: order.customer_name || 'Unknown',
      delivery_address: order.delivery_address || 'N/A',
      status: order.status,
      priority: order.priority || 'normal',
      business_id: order.business_id,
      business_name: order.business?.name || 'N/A',
      assigned_driver: order.assigned_driver,
      driver_name: order.driver_name || null,
      zone_id: order.zone_id,
      zone_name: order.zone?.name || null,
      created_at: order.created_at,
      total_amount: order.total_amount || 0
    }));

    setOrders(ordersData);
  }

  async function loadDrivers() {
    let query = supabase
      .from('users')
      .select(`
        *,
        business:businesses(name),
        zone:current_zone_id(name)
      `)
      .eq('role', 'driver')
      .order('name');

    if (selectedBusiness !== 'all') {
      query = query.eq('business_id', selectedBusiness);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to load drivers:', error);
      return;
    }

    const driversData: Driver[] = await Promise.all(
      (data || []).map(async (driver: any) => {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_driver', driver.telegram_id)
          .in('status', ['assigned', 'in_transit']);

        return {
          id: driver.id,
          telegram_id: driver.telegram_id,
          name: driver.name || 'Unknown',
          phone_number: driver.phone_number,
          current_zone_id: driver.current_zone_id,
          zone_name: driver.zone?.name || null,
          active_orders_count: count || 0,
          status: driver.is_active ? 'active' : 'inactive',
          business_id: driver.business_id,
          business_name: driver.business?.name || 'N/A'
        };
      })
    );

    setDrivers(driversData);
  }

  async function loadZoneCoverage() {
    let query = supabase
      .from('zones')
      .select(`
        *,
        business:businesses(name)
      `)
      .order('name');

    if (selectedBusiness !== 'all') {
      query = query.eq('business_id', selectedBusiness);
    }

    const { data: zonesData, error } = await query;

    if (error) {
      logger.error('Failed to load zones:', error);
      return;
    }

    const coverage: ZoneCoverage[] = await Promise.all(
      (zonesData || []).map(async (zone: any) => {
        const { count: driverCount } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'driver')
          .eq('current_zone_id', zone.id);

        const { count: activeDriverCount } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'driver')
          .eq('current_zone_id', zone.id)
          .eq('is_active', true);

        const { count: pendingOrders } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('zone_id', zone.id)
          .eq('status', 'pending');

        return {
          zone_id: zone.id,
          zone_name: zone.name,
          business_id: zone.business_id,
          business_name: zone.business?.name || 'N/A',
          total_drivers: driverCount || 0,
          active_drivers: activeDriverCount || 0,
          pending_orders: pendingOrders || 0,
          coverage_percentage: driverCount > 0 ? ((activeDriverCount || 0) / driverCount) * 100 : 0
        };
      })
    );

    setZoneCoverage(coverage);
  }

  async function handleAssignDriver(orderId: string) {
    const driverTelegramId = prompt('Enter driver Telegram ID:');
    if (!driverTelegramId) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          assigned_driver: driverTelegramId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      alert('Driver assigned successfully');
      await loadOrders();
    } catch (error: any) {
      logger.error('Failed to assign driver:', error);
      alert(error.message || 'Failed to assign driver');
    }
  }

  async function handleUnassignDriver(orderId: string) {
    if (!confirm('Are you sure you want to unassign this driver?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          assigned_driver: null,
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      alert('Driver unassigned successfully');
      await loadOrders();
    } catch (error: any) {
      logger.error('Failed to unassign driver:', error);
      alert(error.message || 'Failed to unassign driver');
    }
  }

  const stats = {
    totalOrders: orders.length,
    unassignedOrders: orders.filter(o => !o.assigned_driver).length,
    assignedOrders: orders.filter(o => o.assigned_driver).length,
    activeDrivers: drivers.filter(d => d.status === 'active').length,
    totalDrivers: drivers.length
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading Infrastructure Dispatcher Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="infrastructure-dispatcher-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Infrastructure Dispatcher - Global Routing</h1>
          <p className="subtitle">Cross-business order management and driver coordination</p>
        </div>
        <div className="header-filters">
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
          >
            <option value="all">All Businesses</option>
            {businesses.map((biz) => (
              <option key={biz.id} value={biz.id}>
                {biz.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-label">Total Active Orders</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{stats.unassignedOrders}</div>
          <div className="stat-label">Unassigned Orders</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{stats.assignedOrders}</div>
          <div className="stat-label">Assigned Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeDrivers}/{stats.totalDrivers}</div>
          <div className="stat-label">Active Drivers</div>
        </div>
      </div>

      <div className="view-tabs">
        <button
          className={`view-tab ${activeView === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveView('orders')}
        >
          Orders ({orders.length})
        </button>
        <button
          className={`view-tab ${activeView === 'drivers' ? 'active' : ''}`}
          onClick={() => setActiveView('drivers')}
        >
          Drivers ({drivers.length})
        </button>
        <button
          className={`view-tab ${activeView === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveView('zones')}
        >
          Zone Coverage ({zoneCoverage.length})
        </button>
      </div>

      {activeView === 'orders' && (
        <div className="orders-view">
          <div className="view-header">
            <h2>Order Queue</h2>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="assigned">Assigned</option>
              <option value="in_transit">In Transit</option>
            </select>
          </div>
          <div className="orders-grid">
            {orders.map((order) => (
              <div key={order.id} className={`order-card priority-${order.priority}`}>
                <div className="order-header">
                  <div>
                    <h3>{order.order_number}</h3>
                    <span className="business-badge">{order.business_name}</span>
                  </div>
                  <span className={`status-badge ${order.status}`}>
                    {order.status}
                  </span>
                </div>
                <div className="order-details">
                  <div className="detail-row">
                    <span className="label">Customer:</span>
                    <span className="value">{order.customer_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Address:</span>
                    <span className="value">{order.delivery_address}</span>
                  </div>
                  {order.zone_name && (
                    <div className="detail-row">
                      <span className="label">Zone:</span>
                      <span className="value">{order.zone_name}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Amount:</span>
                    <span className="value">₪{order.total_amount.toFixed(2)}</span>
                  </div>
                  {order.assigned_driver && (
                    <div className="detail-row">
                      <span className="label">Driver:</span>
                      <span className="value driver-assigned">
                        {order.driver_name || order.assigned_driver}
                      </span>
                    </div>
                  )}
                </div>
                <div className="order-actions">
                  {order.assigned_driver ? (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => handleUnassignDriver(order.id)}
                    >
                      Unassign Driver
                    </button>
                  ) : (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleAssignDriver(order.id)}
                    >
                      Assign Driver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'drivers' && (
        <div className="drivers-view">
          <h2>Driver Availability Matrix</h2>
          <div className="drivers-grid">
            {drivers.map((driver) => (
              <div key={driver.id} className={`driver-card ${driver.status}`}>
                <div className="driver-header">
                  <h3>{driver.name}</h3>
                  <span className={`status-indicator ${driver.status}`}>
                    {driver.status}
                  </span>
                </div>
                <div className="driver-info">
                  <div className="info-row">
                    <span className="label">Business:</span>
                    <span className="value">{driver.business_name}</span>
                  </div>
                  {driver.phone_number && (
                    <div className="info-row">
                      <span className="label">Phone:</span>
                      <span className="value">{driver.phone_number}</span>
                    </div>
                  )}
                  {driver.zone_name && (
                    <div className="info-row">
                      <span className="label">Current Zone:</span>
                      <span className="value">{driver.zone_name}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">Active Orders:</span>
                    <span className={`value ${driver.active_orders_count > 0 ? 'highlight' : ''}`}>
                      {driver.active_orders_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'zones' && (
        <div className="zones-view">
          <h2>Zone Coverage Overview</h2>
          <div className="zones-grid">
            {zoneCoverage.map((zone) => (
              <div key={zone.zone_id} className="zone-card">
                <div className="zone-header">
                  <h3>{zone.zone_name}</h3>
                  <span className="business-badge">{zone.business_name}</span>
                </div>
                <div className="zone-stats">
                  <div className="stat-item">
                    <div className="stat-number">{zone.active_drivers}/{zone.total_drivers}</div>
                    <div className="stat-text">Active / Total Drivers</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{zone.pending_orders}</div>
                    <div className="stat-text">Pending Orders</div>
                  </div>
                </div>
                <div className="coverage-bar">
                  <div className="coverage-label">Coverage</div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${zone.coverage_percentage}%` }}
                    ></div>
                  </div>
                  <div className="coverage-percent">{zone.coverage_percentage.toFixed(0)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .infrastructure-dispatcher-dashboard {
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
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
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

        .header-filters select {
          padding: 10px 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .header-filters select option {
          background: white;
          color: #111827;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #3b82f6;
        }

        .stat-card.warning {
          border-left-color: #f59e0b;
        }

        .stat-card.success {
          border-left-color: #10b981;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
        }

        .stat-label {
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
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .view-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .view-header h2 {
          margin: 0;
          font-size: 20px;
          color: #111827;
        }

        .view-header select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .orders-grid,
        .drivers-grid,
        .zones-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        .order-card,
        .driver-card,
        .zone-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #e5e7eb;
        }

        .order-card.priority-urgent {
          border-left-color: #ef4444;
          background: #fef2f2;
        }

        .order-card.priority-high {
          border-left-color: #f59e0b;
        }

        .order-header,
        .driver-header,
        .zone-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .order-header h3,
        .driver-header h3,
        .zone-header h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: #111827;
        }

        .business-badge {
          display: inline-block;
          font-size: 11px;
          padding: 3px 8px;
          background: #e0e7ff;
          color: #3730a3;
          border-radius: 4px;
          font-weight: 600;
          margin-top: 4px;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.confirmed {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-badge.assigned {
          background: #e0e7ff;
          color: #3730a3;
        }

        .status-badge.in_transit {
          background: #dcfce7;
          color: #166534;
        }

        .order-details,
        .driver-info,
        .zone-stats {
          margin-bottom: 16px;
        }

        .detail-row,
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .detail-row .label,
        .info-row .label {
          color: #6b7280;
          font-weight: 600;
        }

        .detail-row .value,
        .info-row .value {
          color: #111827;
        }

        .driver-assigned {
          color: #10b981 !important;
          font-weight: 600;
        }

        .order-actions {
          display: flex;
          gap: 8px;
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 8px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: white;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #f9fafb;
        }

        .btn-sm {
          padding: 6px 12px;
        }

        .status-indicator {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-indicator.active {
          background: #d1fae5;
          color: #065f46;
        }

        .status-indicator.inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .info-row .value.highlight {
          color: #3b82f6;
          font-weight: 700;
        }

        .zone-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 24px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 4px;
        }

        .stat-text {
          font-size: 12px;
          color: #6b7280;
        }

        .coverage-bar {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .coverage-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          min-width: 70px;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
          transition: width 0.3s ease;
        }

        .coverage-percent {
          font-size: 12px;
          font-weight: 700;
          color: #3b82f6;
          min-width: 40px;
          text-align: right;
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
          border-top-color: #3b82f6;
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
