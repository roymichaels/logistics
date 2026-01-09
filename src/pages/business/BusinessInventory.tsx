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
} from '../../components/underground';

interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  low_stock_threshold: number;
  last_restocked?: string;
  product_name?: string;
  product_sku?: string;
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
        .select('id, product_id, quantity, low_stock_threshold, last_restocked')
        .eq('business_id', currentBusinessId)
        .order('quantity', { ascending: true });

      if (error) {
        logger.error('[BusinessInventory] Error loading inventory:', error);
        return;
      }

      const productIds = Array.from(new Set(inventoryData?.map(i => i.product_id).filter(Boolean)));

      let productsMap = new Map<string, any>();

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, sku')
          .in('id', productIds);

        products?.forEach(product => {
          productsMap.set(product.id, product);
        });
      }

      const enrichedInventory = (inventoryData || []).map(item => {
        const product = item.product_id ? productsMap.get(item.product_id) : null;
        return {
          ...item,
          product_name: product?.name || 'מוצר לא ידוע',
          product_sku: product?.sku || ''
        };
      });

      setInventory(enrichedInventory);
      logger.info('[BusinessInventory] Inventory loaded:', enrichedInventory.length);
    } catch (error) {
      logger.error('[BusinessInventory] Failed to load inventory:', error);
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
      in_stock: 'במלאי',
      low: 'מלאי נמוך',
      out: 'אזל מהמלאי'
    };
    return labels[status];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'אף פעם';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short' }).format(date);
  };

  const exportInventory = () => {
    const csvData = [
      ['מוצר', 'SKU', 'כמות', 'סף מלאי נמוך', 'סטטוס', 'עדכון אחרון'],
      ...filteredInventory.map(i => [
        i.product_name || '',
        i.product_sku || '',
        i.quantity,
        i.low_stock_threshold,
        getStockStatusLabel(getStockStatus(i.quantity, i.low_stock_threshold)),
        formatDate(i.last_restocked)
      ])
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
    logger.info('[BusinessInventory] Inventory exported');
  };

  const filteredInventory = inventory
    .filter(i => {
      const matchesSearch = searchQuery === '' ||
        i.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.product_sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.id.toLowerCase().includes(searchQuery.toLowerCase());

      const status = getStockStatus(i.quantity, i.low_stock_threshold);
      const matchesStock = stockFilter === 'all' || status === stockFilter;

      return matchesSearch && matchesStock;
    });

  const stats = {
    total: inventory.length,
    inStock: inventory.filter(i => getStockStatus(i.quantity, i.low_stock_threshold) === 'in_stock').length,
    lowStock: inventory.filter(i => getStockStatus(i.quantity, i.low_stock_threshold) === 'low').length,
    outOfStock: inventory.filter(i => getStockStatus(i.quantity, i.low_stock_threshold) === 'out').length,
    totalItems: inventory.reduce((sum, i) => sum + i.quantity, 0)
  };

  if (loading) {
    return (
      <div style={undergroundTheme.components.page}>
        <UndergroundLoadingSpinner message="טוען מלאי..." />
      </div>
    );
  }

  return (
    <div style={undergroundTheme.components.page}>
      <UndergroundHeader
        icon="📦"
        title="ניהול מלאי"
        subtitle="נהל ועקוב אחר המלאי שלך"
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: undergroundTheme.spacing['2xl'] }}>
        <UndergroundButton onClick={exportInventory} variant="primary">
          ייצוא CSV
        </UndergroundButton>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: undergroundTheme.spacing.lg,
        marginBottom: undergroundTheme.spacing['2xl']
      }}>
        <UndergroundStatCard
          icon="📦"
          label="סה״כ פריטים"
          value={stats.total.toString()}
        />
        <UndergroundStatCard
          icon="✅"
          label="במלאי"
          value={stats.inStock.toString()}
          onClick={() => setStockFilter('in_stock')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          icon="⚠️"
          label="מלאי נמוך"
          value={stats.lowStock.toString()}
          onClick={() => setStockFilter('low')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          icon="❌"
          label="אזל מהמלאי"
          value={stats.outOfStock.toString()}
          onClick={() => setStockFilter('out')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          icon="📊"
          label="יחידות כוללות"
          value={stats.totalItems.toString()}
        />
      </div>

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['2xl'] }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: undergroundTheme.spacing.md }}>
          <UndergroundInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם מוצר או SKU..."
          />

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            style={{
              padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
              ...undergroundTheme.effects.glassmorphism.light,
              borderRadius: undergroundTheme.borderRadius.lg,
              color: undergroundTheme.colors.text.primary,
              fontSize: undergroundTheme.typography.fontSize.base,
            }}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="in_stock">במלאי</option>
            <option value="low">מלאי נמוך</option>
            <option value="out">אזל מהמלאי</option>
          </select>

          <UndergroundButton onClick={loadInventory} variant="ghost">
            🔄
          </UndergroundButton>
        </div>
      </UndergroundCard>

      <UndergroundCard>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${undergroundTheme.colors.glassmorphism.border}` }}>
                <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold }}>מוצר</th>
                <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold }}>SKU</th>
                <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold }}>כמות</th>
                <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold }}>סף מלאי נמוך</th>
                <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold }}>סטטוס</th>
                <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold }}>עדכון אחרון</th>
                <th style={{ padding: undergroundTheme.spacing.lg, textAlign: 'right', color: undergroundTheme.colors.text.secondary, fontWeight: undergroundTheme.typography.fontWeight.semibold }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: undergroundTheme.spacing['4xl'], textAlign: 'center', color: undergroundTheme.colors.text.tertiary }}>
                    לא נמצאו פריטים במלאי
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const status = getStockStatus(item.quantity, item.low_stock_threshold);
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
                      <td style={{ padding: undergroundTheme.spacing.lg }}>
                        <div style={{ fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary }}>
                          {item.product_name}
                        </div>
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg, color: undergroundTheme.colors.text.secondary }}>
                        {item.product_sku || '-'}
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg }}>
                        <span style={{
                          fontWeight: undergroundTheme.typography.fontWeight.semibold,
                          color: status === 'out' ? undergroundTheme.colors.status.error :
                                 status === 'low' ? undergroundTheme.colors.status.warning :
                                 undergroundTheme.colors.text.primary
                        }}>
                          {item.quantity}
                        </span>
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg, color: undergroundTheme.colors.text.secondary }}>
                        {item.low_stock_threshold}
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg }}>
                        <UndergroundBadge
                          variant={status === 'in_stock' ? 'success' : status === 'low' ? 'warning' : 'error'}
                        >
                          {getStockStatusLabel(status)}
                        </UndergroundBadge>
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg, color: undergroundTheme.colors.text.secondary }}>
                        {formatDate(item.last_restocked)}
                      </td>
                      <td style={{ padding: undergroundTheme.spacing.lg }}>
                        <UndergroundButton
                          onClick={() => {
                            const newQuantity = prompt('הכנס כמות חדשה:', item.quantity.toString());
                            if (newQuantity !== null) {
                              logger.info('[BusinessInventory] Update quantity:', { itemId: item.id, newQuantity });
                            }
                          }}
                          variant="secondary"
                          style={{ fontSize: undergroundTheme.typography.fontSize.sm }}
                        >
                          עדכן
                        </UndergroundButton>
                      </td>
                    </tr>
                  );
                })
              )}
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
          <strong>סה״כ:</strong> {filteredInventory.length} פריטים (מתוך {inventory.length})
        </div>
      </UndergroundCard>
    </div>
  );
}
