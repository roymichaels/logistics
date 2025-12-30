import React, { useEffect, useState } from 'react';
import { logger } from '../lib/logger';

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

const mockOrders: Order[] = [
  {
    id: 'order1',
    order_number: 'ORD-001',
    customer_name: 'Tech Corp',
    delivery_address: '123 Main St, Tel Aviv',
    status: 'pending',
    priority: 'high',
    business_id: 'biz1',
    business_name: 'Security Shop',
    assigned_driver: null,
    driver_name: null,
    zone_id: 'zone1',
    zone_name: 'Central Tel Aviv',
    created_at: new Date().toISOString(),
    total_amount: 5600
  },
  {
    id: 'order2',
    order_number: 'ORD-002',
    customer_name: 'Enterprise Solutions',
    delivery_address: '456 Rothschild Blvd, Tel Aviv',
    status: 'assigned',
    priority: 'normal',
    business_id: 'biz2',
    business_name: 'Privacy Vault',
    assigned_driver: 'driver1',
    driver_name: 'David Cohen',
    zone_id: 'zone1',
    zone_name: 'Central Tel Aviv',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    total_amount: 3400
  }
];

const mockDrivers: Driver[] = [
  {
    id: 'driver1',
    telegram_id: 'driver1',
    name: 'David Cohen',
    phone_number: '+972-50-1234567',
    current_zone_id: 'zone1',
    zone_name: 'Central Tel Aviv',
    active_orders_count: 2,
    status: 'active',
    business_id: 'biz1',
    business_name: 'Security Shop'
  },
  {
    id: 'driver2',
    telegram_id: 'driver2',
    name: 'Sarah Levi',
    phone_number: '+972-52-9876543',
    current_zone_id: 'zone2',
    zone_name: 'North Tel Aviv',
    active_orders_count: 0,
    status: 'active',
    business_id: 'biz2',
    business_name: 'Privacy Vault'
  }
];

const mockZones: ZoneCoverage[] = [
  {
    zone_id: 'zone1',
    zone_name: 'Central Tel Aviv',
    business_id: 'biz1',
    business_name: 'Security Shop',
    total_drivers: 5,
    active_drivers: 4,
    pending_orders: 8,
    coverage_percentage: 80
  },
  {
    zone_id: 'zone2',
    zone_name: 'North Tel Aviv',
    business_id: 'biz2',
    business_name: 'Privacy Vault',
    total_drivers: 3,
    active_drivers: 2,
    pending_orders: 3,
    coverage_percentage: 66.7
  }
];

const mockBusinesses = [
  { id: 'biz1', name: 'Security Shop', business_type: 'Retail', active: true },
  { id: 'biz2', name: 'Privacy Vault', business_type: 'Enterprise', active: true },
  { id: 'biz3', name: 'CryptoGuard', business_type: 'B2B', active: true }
];

export function InfrastructureDispatcherDashboard() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [drivers, setDrivers] = useState<Driver[]>(mockDrivers);
  const [zoneCoverage, setZoneCoverage] = useState<ZoneCoverage[]>(mockZones);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [businesses] = useState<any[]>(mockBusinesses);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'orders' | 'drivers' | 'zones'>('orders');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [selectedBusiness, filterStatus]);

  async function loadData() {
    setLoading(true);
    setTimeout(() => setLoading(false), 300);
  }

  async function handleAssignDriver(orderId: string) {
    const driverTelegramId = prompt('Enter driver Telegram ID:');
    if (!driverTelegramId) return;

    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, assigned_driver: driverTelegramId, status: 'assigned' as const }
        : order
    );
    setOrders(updatedOrders);
    alert('Driver assigned successfully');
  }

  async function handleUnassignDriver(orderId: string) {
    if (!confirm('Are you sure you want to unassign this driver?')) return;

    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, assigned_driver: null, driver_name: null, status: 'confirmed' as const }
        : order
    );
    setOrders(updatedOrders);
    alert('Driver unassigned successfully');
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
