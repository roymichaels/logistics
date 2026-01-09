import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { StatCard } from '../../components/molecules/StatCard';
import { tokens } from '../../styles/tokens';

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

  const getStockStatusColor = (status: 'in_stock' | 'low' | 'out'): string => {
    const colors = {
      in_stock: tokens.colors.status.success,
      low: tokens.colors.status.warning,
      out: tokens.colors.status.error
    };
    return colors[status];
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
      <PageContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: tokens.colors.text }}>טוען מלאי...</div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="📦"
        title="ניהול מלאי"
        subtitle="נהל ועקוב אחר המלאי שלך"
        actionButton={
          <button
            onClick={exportInventory}
            style={{
              padding: '10px 20px',
              background: tokens.colors.accent,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ייצוא CSV
          </button>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          icon="📦"
          label="סה״כ פריטים"
          value={stats.total}
        />
        <StatCard
          icon="✅"
          label="במלאי"
          value={stats.inStock}
          color={tokens.colors.status.success}
          onClick={() => setStockFilter('in_stock')}
        />
        <StatCard
          icon="⚠️"
          label="מלאי נמוך"
          value={stats.lowStock}
          color={tokens.colors.status.warning}
          onClick={() => setStockFilter('low')}
        />
        <StatCard
          icon="❌"
          label="אזל מהמלאי"
          value={stats.outOfStock}
          color={tokens.colors.status.error}
          onClick={() => setStockFilter('out')}
        />
        <StatCard
          icon="📊"
          label="יחידות כוללות"
          value={stats.totalItems}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם מוצר או SKU..."
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          />

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text
            }}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="in_stock">במלאי</option>
            <option value="low">מלאי נמוך</option>
            <option value="out">אזל מהמלאי</option>
          </select>

          <button
            onClick={loadInventory}
            style={{
              padding: '10px 16px',
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: tokens.colors.surface,
              color: tokens.colors.text,
              cursor: 'pointer'
            }}
          >
            🔄
          </button>
        </div>
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${tokens.colors.border}` }}>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>מוצר</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>SKU</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>כמות</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>סף מלאי נמוך</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>סטטוס</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>עדכון אחרון</th>
                <th style={{ padding: '16px', textAlign: 'right', color: tokens.colors.subtle, fontWeight: '600' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.subtle }}>
                    לא נמצאו פריטים במלאי
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const status = getStockStatus(item.quantity, item.low_stock_threshold);
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${tokens.colors.border}` }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600', color: tokens.colors.text }}>
                          {item.product_name}
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: tokens.colors.text }}>
                        {item.product_sku || '-'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          fontWeight: '600',
                          color: status === 'out' ? tokens.colors.status.error :
                                 status === 'low' ? tokens.colors.status.warning :
                                 tokens.colors.text
                        }}>
                          {item.quantity}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: tokens.colors.text }}>
                        {item.low_stock_threshold}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: getStockStatusColor(status) + '20',
                            color: getStockStatusColor(status)
                          }}
                        >
                          {getStockStatusLabel(status)}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: tokens.colors.text }}>
                        {formatDate(item.last_restocked)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => {
                            const newQuantity = prompt('הכנס כמות חדשה:', item.quantity.toString());
                            if (newQuantity !== null) {
                              logger.info('[BusinessInventory] Update quantity:', { itemId: item.id, newQuantity });
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: tokens.colors.accent,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          עדכן
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: tokens.colors.surface,
          borderRadius: '8px',
          color: tokens.colors.subtle,
          fontSize: '14px'
        }}>
          <strong>סה״כ:</strong> {filteredInventory.length} פריטים (מתוך {inventory.length})
        </div>
      </Card>
    </PageContainer>
  );
}
