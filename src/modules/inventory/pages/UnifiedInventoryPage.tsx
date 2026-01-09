import React, { useState, useMemo, Component, ErrorInfo } from 'react';
import { DashboardLayout, Section } from '@/components/templates/DashboardLayout';
import { MetricCard } from '@components/dashboard/MetricCard';
import { useInventory } from '@application/hooks/useInventory';
import { useInventoryStats, useInventoryFilters, useInventoryMutations } from '../hooks';
import { InventoryFilters } from '../types';
import { logger } from '@lib/logger';

class InventoryPageErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[InventoryPage] Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'red', marginBottom: '1rem' }}>
            Failed to load inventory: {this.state.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007aff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface UnifiedInventoryPageProps {
  businessId?: string;
  role?: string;
  userId?: string;
  onNavigate?: (route: string) => void;
}

function UnifiedInventoryPageInner({
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
        label: 'סה״כ פריטים',
        value: stats.totalItems,
        icon: '📦',
        color: '#3b82f6'
      },
      {
        id: 'in-stock',
        label: 'במלאי',
        value: stats.inStockCount,
        icon: '✅',
        color: '#10b981'
      },
      {
        id: 'low-stock',
        label: 'מלאי נמוך',
        value: stats.lowStockCount,
        icon: '⚠️',
        color: '#f59e0b'
      },
      {
        id: 'out-of-stock',
        label: 'אזל מהמלאי',
        value: stats.outOfStockCount,
        icon: '❌',
        color: '#ef4444'
      },
      {
        id: 'reserved',
        label: 'שמורים',
        value: stats.reservedQuantity,
        icon: '🔒',
        color: '#8b5cf6'
      },
      {
        id: 'available',
        label: 'זמינים',
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
        label: 'רענן',
        icon: '🔄',
        onClick: refresh,
        variant: 'secondary' as const
      }
    ];

    if (role === 'warehouse' || role === 'manager' || role === 'business_owner') {
      actions.unshift({
        id: 'restock',
        label: 'בקשת אספקה',
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
    title: 'מלאי',
    subtitle: businessId ? `מלאי העסק` : 'כל המלאי',
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
          title: 'מסננים',
          children: (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="חיפוש במלאי..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  direction: 'rtl'
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
                  cursor: 'pointer',
                  direction: 'rtl'
                }}
              >
                <option value="all">כל הסטטוסים</option>
                <option value="in_stock">במלאי</option>
                <option value="low">מלאי נמוך</option>
                <option value="out">אזל מהמלאי</option>
              </select>
            </div>
          )
        }}
        collapsible={true}
      />

      <Section
        section={{
          id: 'inventory-list',
          title: `פריטי מלאי (${displayedInventory.length})`,
          subtitle: statusFilter !== 'all' ? `סינון לפי: ${statusFilter}` : undefined,
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
                    לא נמצאו פריטי מלאי
                  </h3>
                  <p style={{ fontSize: '14px' }}>
                    {searchTerm || statusFilter !== 'all'
                      ? 'נסה לשנות את המסננים'
                      : 'הוסף את פריט המלאי הראשון שלך כדי להתחיל'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {displayedInventory.map((item) => {
                    const isLowStock = item.reorder_level && item.quantity <= item.reorder_level;
                    const isOutOfStock = item.quantity === 0;
                    const statusColor = isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981';
                    const statusLabel = isOutOfStock ? 'אזל מהמלאי' : isLowStock ? 'מלאי נמוך' : 'במלאי';

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
                            קוד מוצר: {item.product_id}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            מיקום: {item.warehouse_location || 'לא צוין'}
                          </div>
                          {item.reorder_level && (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                              רמת הזמנה מחדש: {item.reorder_level}
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
                                const qty = prompt('הכנס כמות לאספקה:');
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
                              בקש אספקה
                            </button>
                          )}

                          {role === 'warehouse' && (
                            <button
                              onClick={() => {
                                const delta = prompt('הכנס תיקון (+/-):');
                                const reason = prompt('סיבה לתיקון:');
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
                              תקן
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

export function UnifiedInventoryPage(props: UnifiedInventoryPageProps) {
  return (
    <InventoryPageErrorBoundary>
      <UnifiedInventoryPageInner {...props} />
    </InventoryPageErrorBoundary>
  );
}
