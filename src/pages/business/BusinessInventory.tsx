import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
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
} from '../../components/underground';
import { Toast } from '../../components/Toast';

interface InventoryItem {
  id: string;
  product_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  low_stock_threshold: number;
  last_restocked?: string;
  product?: { name: string; sku: string };
}

export function BusinessInventory() {
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>('all');

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

      const { data: inventoryData, error } = await supabase
        .from('inventory')
        .select(`
          id,
          product_id,
          on_hand_quantity,
          reserved_quantity,
          damaged_quantity,
          low_stock_threshold,
          last_restocked,
          product:products(name, sku)
        `)
        .eq('business_id', currentBusinessId)
        .order('on_hand_quantity', { ascending: true });

      if (error) {
        logger.error('[BusinessInventory] Error loading inventory:', error);
        Toast.error('Failed to load inventory');
        return;
      }

      setInventory(inventoryData || []);
      logger.info('[BusinessInventory] Inventory loaded:', inventoryData?.length || 0);
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

  const handleUpdateQuantity = async (item: InventoryItem) => {
    const newQuantity = prompt('Enter new quantity:', item.on_hand_quantity.toString());
    if (newQuantity === null) return;

    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      Toast.error('Invalid quantity');
      return;
    }

    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          on_hand_quantity: quantity,
          last_restocked: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      Toast.success('Quantity updated successfully');
      loadInventory();
    } catch (error) {
      logger.error('[BusinessInventory] Failed to update quantity:', error);
      Toast.error('Failed to update quantity');
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
                        <UndergroundButton
                          onClick={() => handleUpdateQuantity(item)}
                          variant="secondary"
                          style={{ fontSize: undergroundTheme.typography.fontSize.sm }}
                        >
                          Update
                        </UndergroundButton>
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
    </div>
  );
}
