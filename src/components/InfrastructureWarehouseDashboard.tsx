/**
 * Infrastructure Warehouse Dashboard
 *
 * Central stock management and allocation control for infrastructure warehouse workers.
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  approveAllocation as approveAllocationService,
  rejectAllocation as rejectAllocationService,
  fulfillAllocation as fulfillAllocationService,
} from '../services/inventory';
import { Toast } from './Toast';

interface WarehouseStock {
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  product_name: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
}

interface PendingAllocation {
  id: string;
  allocation_number: string;
  product_name: string;
  requested_quantity: number;
  business_name: string;
  requested_by_name: string;
  requested_at: string;
  priority: string;
  from_warehouse_name: string;
  to_warehouse_name: string;
}

export function InfrastructureWarehouseDashboard() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [stock, setStock] = useState<WarehouseStock[]>([]);
  const [pendingAllocations, setPendingAllocations] = useState<PendingAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'allocations' | 'movements'>('stock');

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      loadWarehouseData();
    }
  }, [selectedWarehouse]);

  async function loadWarehouses() {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('scope_level', 'infrastructure')
        .eq('is_active', true)
        .order('warehouse_name');

      if (error) throw error;
      setWarehouses(data || []);

      if (data && data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error) {
      logger.error('Failed to load warehouses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWarehouseData() {
    try {
      // Load stock levels
      const { data: stockData } = await supabase
        .from('inventory_locations')
        .select(`
          *,
          warehouses (warehouse_name),
          products (name)
        `)
        .eq('location_id', selectedWarehouse);

      const stockItems: WarehouseStock[] = (stockData || []).map((item: any) => ({
        warehouse_id: item.location_id,
        warehouse_name: item.warehouses.warehouse_name,
        product_id: item.product_id,
        product_name: item.products.name,
        on_hand_quantity: item.on_hand_quantity,
        reserved_quantity: item.reserved_quantity,
        available_quantity: item.on_hand_quantity - item.reserved_quantity,
        low_stock_threshold: item.low_stock_threshold,
        is_low_stock: (item.on_hand_quantity - item.reserved_quantity) < item.low_stock_threshold,
      }));

      setStock(stockItems);

      // Load pending allocations
      const { data: allocData } = await supabase
        .from('stock_allocations')
        .select(`
          *,
          from_warehouse:from_warehouse_id (warehouse_name),
          to_warehouse:to_warehouse_id (warehouse_name),
          products (name),
          businesses (name),
          requested_by_user:requested_by (name)
        `)
        .eq('allocation_status', 'pending')
        .order('priority', { ascending: false })
        .order('requested_at', { ascending: true });

      const allocations: PendingAllocation[] = (allocData || []).map((alloc: any) => ({
        id: alloc.id,
        allocation_number: alloc.allocation_number,
        product_name: alloc.products.name,
        requested_quantity: alloc.requested_quantity,
        business_name: alloc.businesses.name,
        requested_by_name: alloc.requested_by_user.name,
        requested_at: alloc.requested_at,
        priority: alloc.priority,
        from_warehouse_name: alloc.from_warehouse.warehouse_name,
        to_warehouse_name: alloc.to_warehouse.warehouse_name,
      }));

      setPendingAllocations(allocations);
    } catch (error) {
      logger.error('Failed to load warehouse data:', error);
    }
  }

  async function handleApproveAllocation(allocationId: string, approvedQty: number) {
    try {
      const response = await approveAllocationService({
        allocationId,
        action: 'approve',
        approvedQuantity: approvedQty,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to approve allocation');
      }

      Toast.success(response.message || 'ההקצאה אושרה בהצלחה');
      await loadWarehouseData();
    } catch (error: any) {
      logger.error('Failed to approve allocation:', error);
      Toast.error(error.message || 'שגיאה באישור ההקצאה');
    }
  }

  async function handleRejectAllocation(allocationId: string, reason: string) {
    try {
      const response = await rejectAllocationService(allocationId, { reason });

      if (!response.success) {
        throw new Error(response.message || 'Failed to reject allocation');
      }

      Toast.success(response.message || 'ההקצאה נדחתה');
      await loadWarehouseData();
    } catch (error: any) {
      logger.error('Failed to reject allocation:', error);
      Toast.error(error.message || 'שגיאה בדחיית ההקצאה');
    }
  }

  async function handleFulfillAllocation(allocationId: string, deliveredQty: number) {
    try {
      const response = await fulfillAllocationService({
        allocationId,
        approvedQuantity: deliveredQty,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to fulfill allocation');
      }

      Toast.success(response.message || 'המלאי הועבר בהצלחה');
      await loadWarehouseData();
    } catch (error: any) {
      logger.error('Failed to fulfill allocation:', error);
      Toast.error(error.message || 'שגיאה בביצוע ההעברה');
    }
  }

  if (loading) {
    return <div className="loading">Loading warehouse data...</div>;
  }

  return (
    <div className="warehouse-dashboard">
      <div className="dashboard-header">
        <h1>Infrastructure Warehouse Control</h1>
        <div className="warehouse-selector">
          <label>Warehouse:</label>
          <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)}>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>
                {wh.warehouse_name} ({wh.warehouse_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          Stock Levels ({stock.length})
        </button>
        <button
          className={`tab ${activeTab === 'allocations' ? 'active' : ''}`}
          onClick={() => setActiveTab('allocations')}
        >
          Pending Allocations ({pendingAllocations.length})
        </button>
        <button
          className={`tab ${activeTab === 'movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          Recent Movements
        </button>
      </div>

      {activeTab === 'stock' && (
        <div className="stock-list">
          <div className="list-header">
            <h2>Current Stock Levels</h2>
            <button className="btn-primary">Add Stock</button>
          </div>
          <table className="stock-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>On Hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stock.map(item => (
                <tr key={item.product_id} className={item.is_low_stock ? 'low-stock' : ''}>
                  <td className="product-name">{item.product_name}</td>
                  <td>{item.on_hand_quantity}</td>
                  <td>{item.reserved_quantity}</td>
                  <td className="available">{item.available_quantity}</td>
                  <td>{item.low_stock_threshold}</td>
                  <td>
                    {item.is_low_stock ? (
                      <span className="status-badge warning">Low Stock</span>
                    ) : (
                      <span className="status-badge success">Adequate</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'allocations' && (
        <div className="allocations-list">
          <div className="list-header">
            <h2>Pending Allocation Requests</h2>
          </div>
          {pendingAllocations.length === 0 ? (
            <div className="empty-state">
              <p>No pending allocations</p>
            </div>
          ) : (
            <div className="allocation-cards">
              {pendingAllocations.map(alloc => (
                <div key={alloc.id} className={`allocation-card priority-${alloc.priority}`}>
                  <div className="card-header">
                    <div>
                      <h3>{alloc.product_name}</h3>
                      <div className="allocation-number">{alloc.allocation_number}</div>
                    </div>
                    <span className={`priority-badge ${alloc.priority}`}>
                      {alloc.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="allocation-detail">
                      <label>Business:</label>
                      <span>{alloc.business_name}</span>
                    </div>
                    <div className="allocation-detail">
                      <label>Requested Quantity:</label>
                      <span className="quantity">{alloc.requested_quantity}</span>
                    </div>
                    <div className="allocation-detail">
                      <label>From:</label>
                      <span>{alloc.from_warehouse_name}</span>
                    </div>
                    <div className="allocation-detail">
                      <label>To:</label>
                      <span>{alloc.to_warehouse_name}</span>
                    </div>
                    <div className="allocation-detail">
                      <label>Requested by:</label>
                      <span>{alloc.requested_by_name}</span>
                    </div>
                    <div className="allocation-detail">
                      <label>Requested at:</label>
                      <span>{new Date(alloc.requested_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn-success"
                      onClick={() => handleApproveAllocation(alloc.id, alloc.requested_quantity)}
                    >
                      Approve & Fulfill
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => {
                        const reason = prompt('Rejection reason:');
                        if (reason) handleRejectAllocation(alloc.id, reason);
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .warehouse-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding: 20px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 12px;
          color: white;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 28px;
        }

        .warehouse-selector {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .warehouse-selector label {
          font-size: 14px;
          font-weight: 600;
        }

        .warehouse-selector select {
          padding: 8px 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .warehouse-selector select option {
          background: white;
          color: #111827;
        }

        .tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
        }

        .tab {
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

        .tab:hover {
          color: #111827;
        }

        .tab.active {
          color: #10b981;
          border-bottom-color: #10b981;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .list-header h2 {
          margin: 0;
          font-size: 20px;
          color: #111827;
        }

        .btn-primary {
          padding: 10px 20px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #059669;
        }

        .stock-table {
          width: 100%;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .stock-table thead {
          background: #f9fafb;
        }

        .stock-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stock-table td {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #111827;
        }

        .stock-table tr.low-stock {
          background: #fef3c7;
        }

        .product-name {
          font-weight: 600;
        }

        .available {
          font-weight: 700;
          color: #10b981;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.success {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.warning {
          background: #fef3c7;
          color: #92400e;
        }

        .allocation-cards {
          display: grid;
          gap: 16px;
        }

        .allocation-card {
          padding: 20px;
          background: white;
          border-radius: 12px;
          border-left: 4px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .allocation-card.priority-urgent {
          border-left-color: #ef4444;
          background: #fef2f2;
        }

        .allocation-card.priority-high {
          border-left-color: #f59e0b;
          background: #fefce8;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .card-header h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: #111827;
        }

        .allocation-number {
          font-size: 12px;
          color: #6b7280;
          font-family: monospace;
        }

        .priority-badge {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
        }

        .priority-badge.urgent {
          background: #dc2626;
          color: white;
        }

        .priority-badge.high {
          background: #f59e0b;
          color: white;
        }

        .priority-badge.normal {
          background: #3b82f6;
          color: white;
        }

        .card-body {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .allocation-detail {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .allocation-detail label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
        }

        .allocation-detail span {
          font-size: 14px;
          color: #111827;
        }

        .allocation-detail .quantity {
          font-size: 18px;
          font-weight: 700;
          color: #10b981;
        }

        .card-actions {
          display: flex;
          gap: 12px;
        }

        .btn-success {
          flex: 1;
          padding: 10px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-success:hover {
          background: #059669;
        }

        .btn-danger {
          flex: 1;
          padding: 10px;
          background: white;
          color: #ef4444;
          border: 2px solid #ef4444;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          background: #ef4444;
          color: white;
        }

        .empty-state {
          padding: 48px;
          text-align: center;
          color: #6b7280;
          background: white;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
