import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useService } from '../../hooks/useService';
import { InventoryService } from '../../services/modules/InventoryService';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundButton,
  UndergroundStatCard,
  UndergroundBadge,
  UndergroundInput,
  UndergroundLoadingSpinner,
  UndergroundSection,
  UndergroundEmptyState,
  UndergroundModal,
  UndergroundTextarea,
  UndergroundSelect,
} from '../../components/underground';
import { Toast } from '../../components/Toast';

interface InventoryItem {
  id: string;
  product_id: string;
  location_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  low_stock_threshold: number;
  last_restocked?: string;
  product?: { name: string; sku: string };
  location?: { name: string };
}

interface AdjustmentModal {
  show: boolean;
  item: InventoryItem | null;
  type: 'receive' | 'adjust' | 'damage' | null;
}

interface LowStockAlert {
  product_id: string;
  product_name: string;
  location_id: string;
  location_name: string;
  on_hand_quantity: number;
  low_stock_threshold: number;
}

export function BusinessInventory() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;
  const inventoryService = useService(InventoryService);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>('all');
  const [adjustmentModal, setAdjustmentModal] = useState<AdjustmentModal>({
    show: false,
    item: null,
    type: null
  });
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadInventory();

    if (!currentBusinessId) return;

    const subscription = supabase
      .channel(`business-inventory-${currentBusinessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `business_id=eq.${currentBusinessId}`
        },
        () => {
          logger.info('[BusinessInventory] Real-time update received');
          loadInventory();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentBusinessId]);

  const loadInventory = async () => {
    try {
      setLoading(true);

      if (!currentBusinessId) {
        logger.warn('[BusinessInventory] No business context');
        return;
      }

      // Load inventory using InventoryService
      const inventoryData = await inventoryService.listInventory();

      // Load low stock alerts
      const alerts = await inventoryService.getLowStockAlerts();

      setInventory(inventoryData as any);
      setLowStockAlerts(alerts);
      logger.info('[BusinessInventory] Inventory loaded:', inventoryData?.length || 0, 'Alerts:', alerts.length);
    } catch (error) {
      logger.error('[BusinessInventory] Failed to load inventory:', error);
      Toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (quantity: number, threshold: number): 'in_stock' | 'low' | 'out' => {
    if (quantity === 0) return 'out';
    if (quantity <= threshold) return 'low';
    return 'in_stock';
  };

  const getStockStatusLabel = (status: 'in_stock' | 'low' | 'out'): string => {
    const labels = {
      in_stock: 'In Stock',
      low: 'Low Stock',
      out: 'Out of Stock'
    };
    return labels[status];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(date);
  };

  const exportInventory = () => {
    const csvData = [
      ['Product', 'SKU', 'On Hand', 'Reserved', 'Damaged', 'Available', 'Low Stock Threshold', 'Status', 'Last Restocked'],
      ...filteredInventory.map(i => [
        i.product?.name || 'Unknown Product',
        i.product?.sku || '',
        i.on_hand_quantity,
        i.reserved_quantity,
        i.damaged_quantity,
        i.on_hand_quantity - i.reserved_quantity - i.damaged_quantity,
        i.low_stock_threshold,
        getStockStatusLabel(getStockStatus(i.on_hand_quantity, i.low_stock_threshold)),
        formatDate(i.last_restocked)
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    logger.info('[BusinessInventory] Inventory exported');
    Toast.success('Inventory exported successfully');
  };

  const openAdjustmentModal = (item: InventoryItem, type: 'receive' | 'adjust' | 'damage') => {
    setAdjustmentModal({ show: true, item, type });
    setAdjustmentQuantity('');
    setAdjustmentReason('');
  };

  const closeAdjustmentModal = () => {
    setAdjustmentModal({ show: false, item: null, type: null });
    setAdjustmentQuantity('');
    setAdjustmentReason('');
  };

  const handleAdjustmentSubmit = async () => {
    if (!adjustmentModal.item || !adjustmentModal.type) return;

    const quantity = parseInt(adjustmentQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      Toast.error('Invalid quantity');
      return;
    }

    try {
      setIsSubmitting(true);

      const item = adjustmentModal.item;
      let newQuantity = item.on_hand_quantity;
      let newDamaged = item.damaged_quantity;

      switch (adjustmentModal.type) {
        case 'receive':
          newQuantity += quantity;
          break;
        case 'adjust':
          newQuantity = quantity;
          break;
        case 'damage':
          newDamaged += quantity;
          if (newDamaged > item.on_hand_quantity) {
            Toast.error('Damaged quantity cannot exceed on-hand quantity');
            return;
          }
          break;
      }

      // Update inventory using direct Supabase (InventoryService doesn't have this specific method)
      const { error } = await supabase
        .from('inventory')
        .update({
          on_hand_quantity: newQuantity,
          damaged_quantity: newDamaged,
          last_restocked: adjustmentModal.type === 'receive' ? new Date().toISOString() : item.last_restocked
        })
        .eq('id', item.id);

      if (error) throw error;

      Toast.success(`Stock ${adjustmentModal.type === 'receive' ? 'received' : adjustmentModal.type === 'damage' ? 'marked as damaged' : 'adjusted'} successfully`);
      closeAdjustmentModal();
      loadInventory();
    } catch (error) {
      logger.error('[BusinessInventory] Failed to adjust stock:', error);
      Toast.error('Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventory
    .filter(i => {
      const matchesSearch = searchQuery === '' ||
        i.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.id.toLowerCase().includes(searchQuery.toLowerCase());

      const status = getStockStatus(i.on_hand_quantity, i.low_stock_threshold);
      const matchesStock = stockFilter === 'all' || status === stockFilter;

      return matchesSearch && matchesStock;
    });

  const stats = {
    total: inventory.length,
    inStock: inventory.filter(i => getStockStatus(i.on_hand_quantity, i.low_stock_threshold) === 'in_stock').length,
    lowStock: inventory.filter(i => getStockStatus(i.on_hand_quantity, i.low_stock_threshold) === 'low').length,
    outOfStock: inventory.filter(i => getStockStatus(i.on_hand_quantity, i.low_stock_threshold) === 'out').length,
    totalOnHand: inventory.reduce((sum, i) => sum + i.on_hand_quantity, 0),
    totalReserved: inventory.reduce((sum, i) => sum + i.reserved_quantity, 0),
    totalDamaged: inventory.reduce((sum, i) => sum + i.damaged_quantity, 0)
  };

  const availableTotal = stats.totalOnHand - stats.totalReserved - stats.totalDamaged;

  if (!currentBusinessId) {
    return (
      <div style={{
        background: undergroundTheme.colors.gradient.primary,
        minHeight: '100vh',
        padding: undergroundTheme.spacing['2xl'],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <UndergroundEmptyState
          title="No Business Context"
          message="Please select a business to view inventory"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        background: undergroundTheme.colors.gradient.primary,
        minHeight: '100vh',
        padding: undergroundTheme.spacing['2xl'],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <UndergroundLoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div style={{
      background: undergroundTheme.colors.gradient.primary,
      color: undergroundTheme.colors.text.primary,
      minHeight: '100vh',
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl'],
    }}>
      <UndergroundHeader
        title="Inventory Management"
        subtitle="Track and manage your inventory levels"
      />

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: undergroundTheme.spacing['2xl']
      }}>
        <UndergroundButton onClick={exportInventory} variant="primary">
          Export CSV
        </UndergroundButton>
      </div>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: undergroundTheme.spacing.lg,
        marginBottom: undergroundTheme.spacing['2xl']
      }}>
        <UndergroundStatCard
          icon={<span style={{ fontSize: '28px' }}>📦</span>}
          label="Total Products"
          value={stats.total}
          accentColor={undergroundTheme.colors.accent.primary}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '28px' }}>✅</span>}
          label="In Stock"
          value={stats.inStock}
          accentColor={undergroundTheme.colors.status.success}
          onClick={() => setStockFilter('in_stock')}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '28px' }}>⚠️</span>}
          label="Low Stock"
          value={stats.lowStock}
          accentColor={undergroundTheme.colors.status.warning}
          onClick={() => setStockFilter('low')}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '28px' }}>❌</span>}
          label="Out of Stock"
          value={stats.outOfStock}
          accentColor={undergroundTheme.colors.status.error}
          onClick={() => setStockFilter('out')}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '28px' }}>📊</span>}
          label="On Hand"
          value={stats.totalOnHand}
          accentColor={undergroundTheme.colors.accent.primary}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '28px' }}>🔒</span>}
          label="Reserved"
          value={stats.totalReserved}
          accentColor={undergroundTheme.colors.status.info}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '28px' }}>⚡</span>}
          label="Available"
          value={availableTotal}
          accentColor={undergroundTheme.colors.status.success}
        />
      </section>

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: undergroundTheme.spacing.md
        }}>
          <UndergroundInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name or SKU..."
            fullWidth
          />

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            style={{
              padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
              ...undergroundTheme.effects.glassmorphism.light,
              borderRadius: undergroundTheme.borderRadius.lg,
              border: 'none',
              color: undergroundTheme.colors.text.primary,
              fontSize: undergroundTheme.typography.fontSize.base,
              fontFamily: undergroundTheme.typography.fontFamily.sans,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          <UndergroundButton onClick={loadInventory} variant="ghost">
            🔄
          </UndergroundButton>
        </div>
      </UndergroundCard>

      {filteredInventory.length === 0 ? (
        <UndergroundEmptyState
          title="No Inventory Items"
          message={searchQuery || stockFilter !== 'all' ? 'No items match your filters' : 'No inventory records found'}
        />
      ) : (
        <UndergroundCard>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
                  <th style={{
                    padding: undergroundTheme.spacing.lg,
                    textAlign: 'left',
                    color: undergroundTheme.colors.text.secondary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Product
                  </th>
                  <th style={{
                    padding: undergroundTheme.spacing.lg,
                    textAlign: 'left',
                    color: undergroundTheme.colors.text.secondary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    SKU
                  </th>
                  <th style={{
                    padding: undergroundTheme.spacing.lg,
                    textAlign: 'left',
                    color: undergroundTheme.colors.text.secondary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    On Hand
                  </th>
                  <th style={{
                    padding: undergroundTheme.spacing.lg,
                    textAlign: 'left',
                    color: undergroundTheme.colors.text.secondary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Reserved
                  </th>
                  <th style={{
                    padding: undergroundTheme.spacing.lg,
                    textAlign: 'left',
                    color: undergroundTheme.colors.text.secondary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Available
                  </th>
                  <th style={{
                    padding: undergroundTheme.spacing.lg,
                    textAlign: 'left',
                    color: undergroundTheme.colors.text.secondary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Threshold
                  </th>
                  <th style={{
                    padding: undergroundTheme.spacing.lg,
                    textAlign: 'left',
                    color: undergroundTheme.colors.text.secondary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: undergroundTheme.spacing.lg,
                    textAlign: 'left',
                    color: undergroundTheme.colors.text.secondary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Last Restocked
                  </th>
                  <th style={{
                    padding: undergroundTheme.spacing.lg,
                    textAlign: 'left',
                    color: undergroundTheme.colors.text.secondary,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const status = getStockStatus(item.on_hand_quantity, item.low_stock_threshold);
                  const available = item.on_hand_quantity - item.reserved_quantity - item.damaged_quantity;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                        transition: undergroundTheme.transitions.fast
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{
                        padding: undergroundTheme.spacing.lg,
                        fontWeight: undergroundTheme.typography.fontWeight.semibold,
                        color: undergroundTheme.colors.text.primary
                      }}>
                        {item.product?.name || 'Unknown Product'}
                      </td>
                      <td style={{
                        padding: undergroundTheme.spacing.lg,
                        color: undergroundTheme.colors.text.secondary,
                        fontFamily: undergroundTheme.typography.fontFamily.mono,
                        fontSize: undergroundTheme.typography.fontSize.sm
                      }}>
                        {item.product?.sku || '-'}
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg }}>
                        <span style={{
                          fontWeight: undergroundTheme.typography.fontWeight.semibold,
                          color: item.on_hand_quantity === 0 ? undergroundTheme.colors.status.error :
                                 item.on_hand_quantity <= item.low_stock_threshold ? undergroundTheme.colors.status.warning :
                                 undergroundTheme.colors.text.primary
                        }}>
                          {item.on_hand_quantity}
                        </span>
                      </td>
                      <td style={{
                        padding: undergroundTheme.spacing.lg,
                        color: undergroundTheme.colors.text.secondary
                      }}>
                        {item.reserved_quantity}
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg }}>
                        <span style={{
                          fontWeight: undergroundTheme.typography.fontWeight.semibold,
                          color: available <= 0 ? undergroundTheme.colors.status.error :
                                 undergroundTheme.colors.status.success
                        }}>
                          {available}
                        </span>
                      </td>
                      <td style={{
                        padding: undergroundTheme.spacing.lg,
                        color: undergroundTheme.colors.text.secondary
                      }}>
                        {item.low_stock_threshold}
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg }}>
                        <UndergroundBadge
                          variant={status === 'in_stock' ? 'success' : status === 'low' ? 'warning' : 'error'}
                        >
                          {getStockStatusLabel(status)}
                        </UndergroundBadge>
                      </td>
                      <td style={{
                        padding: undergroundTheme.spacing.lg,
                        color: undergroundTheme.colors.text.secondary,
                        fontSize: undergroundTheme.typography.fontSize.sm
                      }}>
                        {formatDate(item.last_restocked)}
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg }}>
                        <div style={{ display: 'flex', gap: undergroundTheme.spacing.sm }}>
                          <UndergroundButton
                            onClick={() => openAdjustmentModal(item, 'receive')}
                            variant="success"
                            style={{ fontSize: undergroundTheme.typography.fontSize.xs, padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.md}` }}
                          >
                            Receive
                          </UndergroundButton>
                          <UndergroundButton
                            onClick={() => openAdjustmentModal(item, 'adjust')}
                            variant="secondary"
                            style={{ fontSize: undergroundTheme.typography.fontSize.xs, padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.md}` }}
                          >
                            Adjust
                          </UndergroundButton>
                          <UndergroundButton
                            onClick={() => openAdjustmentModal(item, 'damage')}
                            variant="warning"
                            style={{ fontSize: undergroundTheme.typography.fontSize.xs, padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.md}` }}
                          >
                            Damage
                          </UndergroundButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: undergroundTheme.spacing['2xl'],
            padding: undergroundTheme.spacing.lg,
            ...undergroundTheme.effects.glassmorphism.light,
            borderRadius: undergroundTheme.borderRadius.md,
            color: undergroundTheme.colors.text.secondary,
            fontSize: undergroundTheme.typography.fontSize.sm
          }}>
            <strong style={{ color: undergroundTheme.colors.text.primary }}>Total:</strong> {filteredInventory.length} items
            {(searchQuery || stockFilter !== 'all') && ` (filtered from ${inventory.length})`}
          </div>
        </UndergroundCard>
      )}

      {/* Low Stock Alerts Section */}
      {lowStockAlerts.length > 0 && (
        <UndergroundCard style={{ marginTop: undergroundTheme.spacing['2xl'] }}>
          <div style={{
            padding: undergroundTheme.spacing.lg,
            borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
            marginBottom: undergroundTheme.spacing.lg
          }}>
            <h3 style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize.lg,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.status.warning
            }}>
              ⚠️ Low Stock Alerts ({lowStockAlerts.length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            {lowStockAlerts.map((alert, index) => (
              <div
                key={index}
                style={{
                  padding: undergroundTheme.spacing.md,
                  ...undergroundTheme.effects.glassmorphism.light,
                  borderRadius: undergroundTheme.borderRadius.md,
                  borderLeft: `4px solid ${undergroundTheme.colors.status.warning}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {alert.product_name}
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary
                    }}>
                      {alert.location_name} • On Hand: {alert.on_hand_quantity} • Threshold: {alert.low_stock_threshold}
                    </div>
                  </div>
                  <UndergroundBadge variant="warning">
                    Low Stock
                  </UndergroundBadge>
                </div>
              </div>
            ))}
          </div>
        </UndergroundCard>
      )}

      {/* Stock Adjustment Modal */}
      {adjustmentModal.show && adjustmentModal.item && (
        <UndergroundModal
          isOpen={adjustmentModal.show}
          onClose={closeAdjustmentModal}
          title={
            adjustmentModal.type === 'receive' ? 'Receive Stock' :
            adjustmentModal.type === 'damage' ? 'Report Damage' :
            'Adjust Stock'
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
            <div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary,
                marginBottom: undergroundTheme.spacing.sm
              }}>
                Product
              </div>
              <div style={{
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                color: undergroundTheme.colors.text.primary
              }}>
                {adjustmentModal.item.product?.name || 'Unknown Product'}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary,
                marginBottom: undergroundTheme.spacing.sm
              }}>
                Current Stock
              </div>
              <div style={{
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                color: undergroundTheme.colors.text.primary
              }}>
                On Hand: {adjustmentModal.item.on_hand_quantity} • Reserved: {adjustmentModal.item.reserved_quantity} • Damaged: {adjustmentModal.item.damaged_quantity}
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary,
                marginBottom: undergroundTheme.spacing.sm
              }}>
                {adjustmentModal.type === 'receive' ? 'Quantity to Receive' :
                 adjustmentModal.type === 'damage' ? 'Damaged Quantity' :
                 'New Total Quantity'}
              </label>
              <UndergroundInput
                type="number"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                placeholder="Enter quantity"
                min="1"
                fullWidth
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary,
                marginBottom: undergroundTheme.spacing.sm
              }}>
                Reason (optional)
              </label>
              <UndergroundTextarea
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Enter reason for adjustment..."
                rows={3}
                fullWidth
              />
            </div>

            <div style={{
              display: 'flex',
              gap: undergroundTheme.spacing.md,
              marginTop: undergroundTheme.spacing.lg
            }}>
              <UndergroundButton
                onClick={handleAdjustmentSubmit}
                variant="primary"
                disabled={isSubmitting || !adjustmentQuantity}
                style={{ flex: 1 }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </UndergroundButton>
              <UndergroundButton
                onClick={closeAdjustmentModal}
                variant="ghost"
                disabled={isSubmitting}
                style={{ flex: 1 }}
              >
                Cancel
              </UndergroundButton>
            </div>
          </div>
        </UndergroundModal>
      )}
    </div>
  );
}
