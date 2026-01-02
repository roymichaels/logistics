import React, { useState, useMemo } from 'react';
import { MetricCard } from '@components/dashboard/MetricCard';
import { useInventory } from '@application/hooks/useInventory';
import { useInventoryStats, useInventoryFilters, useInventoryMutations } from '../hooks';
import { InventoryFilters } from '../types';
import { logger } from '@lib/logger';

interface UnifiedInventoryPageProps {
  businessId?: string;
  role?: string;
  userId?: string;
  onNavigate?: (route: string) => void;
}

export function UnifiedInventoryPage({
  businessId,
  role,
  userId,
  onNavigate
}: UnifiedInventoryPageProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out' | 'in_stock'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { inventory, loading, error, refresh } = useInventory({
    businessId,
    autoLoad: true
  });

  const { filters, setFilters, filteredInventory } = useInventoryFilters(inventory);
  const stats = useInventoryStats(filteredInventory);
  const { adjustStock, createRestockRequest, adjusting, requesting } = useInventoryMutations();

  const displayedInventory = useMemo(() => {
    let result = filteredInventory;

    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(item => {
        const entity = item as any;
        if (statusFilter === 'out') return entity.quantity === 0;
        if (statusFilter === 'low') return entity.isLowStock && entity.quantity > 0;
        if (statusFilter === 'in_stock') return entity.quantity > 0 && !entity.isLowStock;
        return true;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.product_id?.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term)
      );
    }

    return result;
  }, [filteredInventory, statusFilter, searchTerm]);

  const metrics = useMemo(() => {
    return [
      {
        id: 'total',
        label: 'Total Items',
        value: stats.totalItems,
        icon: '📦',
        color: '#3b82f6'
      },
      {
        id: 'in-stock',
        label: 'In Stock',
        value: stats.inStockCount,
        icon: '✅',
        color: '#10b981'
      },
      {
        id: 'low-stock',
        label: 'Low Stock',
        value: stats.lowStockCount,
        icon: '⚠️',
        color: '#f59e0b'
      },
      {
        id: 'out-of-stock',
        label: 'Out of Stock',
        value: stats.outOfStockCount,
        icon: '❌',
        color: '#ef4444'
      },
      {
        id: 'reserved',
        label: 'Reserved',
        value: stats.reservedQuantity,
        icon: '🔒',
        color: '#8b5cf6'
      },
      {
        id: 'available',
        label: 'Available',
        value: stats.availableQuantity,
        icon: '📊',
        color: '#06b6d4'
      }
    ];
  }, [stats]);

  const quickActions = useMemo(() => {
    const actions = [
      {
        id: 'refresh',
        label: 'Refresh',
        icon: '🔄',
        onClick: refresh,
        variant: 'secondary' as const
      }
    ];

    if (role === 'warehouse' || role === 'manager' || role === 'business_owner') {
      actions.unshift({
        id: 'restock',
        label: 'Request Restock',
        icon: '📥',
        onClick: () => onNavigate?.('/inventory/restock'),
        variant: 'primary' as const
      });
    }

    return actions;
  }, [role, refresh, onNavigate]);

  const handleStockAdjustment = async (itemId: string, delta: number, reason: string) => {
    if (!userId) {
      logger.error('User ID required for stock adjustment');
      return;
    }

    const success = await adjustStock({
      inventoryId: itemId,
      quantityDelta: delta,
      reason,
      adjustedBy: userId
    });

    if (success) {
      await refresh();
    }
  };

  const handleRestockRequest = async (itemId: string, quantity: number) => {
    if (!userId || !businessId) {
      logger.error('User ID and Business ID required for restock request');
      return;
    }

    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const success = await createRestockRequest({
      productId: item.product_id,
      businessId,
      requestedQuantity: quantity,
      requestedBy: userId,
      notes: `Low stock alert - requesting restock`
    });

    if (success) {
      await refresh();
    }
  };

  const dashboardConfig = {
    title: 'Inventory',
    subtitle: businessId ? `Business Inventory` : 'All Inventory',
    metrics,
    quickActions,
    refreshInterval: 60000,
    onRefresh: refresh
  };

  return (
    <DashboardLayout config={dashboardConfig} loading={loading} error={error ? new Error(error) : null}>
      <Section
        section={{
          id: 'filters',
          title: 'Filters',
          children: (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px'
                }}
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
          )
        }}
        collapsible={true}
      />

      <Section
        section={{
          id: 'inventory-list',
          title: `Inventory Items (${displayedInventory.length})`,
          subtitle: statusFilter !== 'all' ? `Filtered by: ${statusFilter}` : undefined,
          children: (
            <div>
              {displayedInventory.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    No inventory items found
                  </h3>
                  <p style={{ fontSize: '14px' }}>
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Add your first inventory item to get started'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {displayedInventory.map((item) => {
                    const isLowStock = item.reorder_level && item.quantity <= item.reorder_level;
                    const isOutOfStock = item.quantity === 0;
                    const statusColor = isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981';
                    const statusLabel = isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock';

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: '#fff',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          border: '1px solid #e5e7eb',
                          display: 'grid',
                          gridTemplateColumns: '1fr auto auto',
                          gap: '16px',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                            Product ID: {item.product_id}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            Location: {item.warehouse_location || 'Not specified'}
                          </div>
                          {item.reorder_level && (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                              Reorder Level: {item.reorder_level}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
                            {item.quantity}
                          </div>
                          <div
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#fff',
                              background: statusColor,
                              marginTop: '4px'
                            }}
                          >
                            {statusLabel}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isLowStock && !isOutOfStock && (
                            <button
                              onClick={() => {
                                const qty = prompt('Enter restock quantity:');
                                if (qty) handleRestockRequest(item.id, parseInt(qty));
                              }}
                              disabled={requesting}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: 'none',
                                background: '#f59e0b',
                                color: '#fff'
                              }}
                            >
                              Request Restock
                            </button>
                          )}

                          {role === 'warehouse' && (
                            <button
                              onClick={() => {
                                const delta = prompt('Enter adjustment (+/-):');
                                const reason = prompt('Reason for adjustment:');
                                if (delta && reason) {
                                  handleStockAdjustment(item.id, parseInt(delta), reason);
                                }
                              }}
                              disabled={adjusting}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: '1px solid #e5e7eb',
                                background: '#f3f4f6',
                                color: '#374151'
                              }}
                            >
                              Adjust
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
        }}
      />
    </DashboardLayout>
  );
}
