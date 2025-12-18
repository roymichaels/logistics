import React, { useEffect, useState, useMemo } from 'react';

import { useInventory, useLowStockItems, useAdjustStock } from '../application/use-cases';
import { useCatalog } from '../application/use-cases';
import { useApp } from '../application/services/useApp';
import { useTheme } from '../foundation/theme';
import { logger } from '../lib/logger';
import { Toast } from '../components/Toast';
import { formatCurrency } from '../lib/i18n';
import { Spinner } from '../components/atoms/Spinner';
import { Button } from '../components/atoms/Button';
import type { Product } from '../application/queries/catalog.queries';
import type { InventoryItem } from '../application/queries/inventory.queries';

interface InventoryProps {
  onNavigate: (page: string) => void;
}

interface AggregatedInventory {
  product_id: string;
  product_name: string;
  totalOnHand: number;
  totalReserved: number;
  status: 'in_stock' | 'low' | 'out';
  items: InventoryItem[];
}

export function Inventory({ onNavigate }: InventoryProps) {

  const { theme: themeConfig } = useTheme();
  const app = useApp();

  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [selectedProduct, setSelectedProduct] = useState<AggregatedInventory | null>(null);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({ quantity: 0, reason: '' });

  const { products, loading: productsLoading } = useCatalog();
  const { inventory, loading: inventoryLoading, error, refetch } = useInventory({});
  const { items: lowStockItems } = useLowStockItems(app.auth.user?.active_business_id || '');
  const { adjustStock, loading: adjusting } = useAdjustStock();

  const loading = productsLoading || inventoryLoading;

  useEffect(() => {
    logger.info('[Inventory] Component mounted, subscribing to events');

    const unsubInventory = app.events?.on('StockLow', () => {
      logger.info('[Inventory] StockLow event received, refetching');
      refetch();
    });

    const unsubProductUpdated = app.events?.on('ProductUpdated', () => {
      logger.info('[Inventory] ProductUpdated event received, refetching');
      refetch();
    });

    return () => {
      unsubInventory?.();
      unsubProductUpdated?.();
    };
  }, [app.events, refetch]);

  const aggregatedInventory = useMemo(() => {
    if (!products || !inventory) return [];

    const productMap = new Map(products.map(p => [p.id, p]));
    const inventoryByProduct = new Map<string, InventoryItem[]>();

    inventory.forEach(item => {
      const existing = inventoryByProduct.get(item.product_id) || [];
      existing.push(item);
      inventoryByProduct.set(item.product_id, existing);
    });

    const aggregated: AggregatedInventory[] = [];

    inventoryByProduct.forEach((items, productId) => {
      const product = productMap.get(productId);
      if (!product) return;

      const totalOnHand = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalReserved = items.reduce((sum, item) => sum + (item.reserved_quantity || 0), 0);

      const hasLowStock = items.some(item =>
        item.quantity <= (item.reorder_level || 0)
      );

      const status = totalOnHand === 0 ? 'out' : hasLowStock ? 'low' : 'in_stock';

      aggregated.push({
        product_id: productId,
        product_name: product.name,
        totalOnHand,
        totalReserved,
        status,
        items,
      });
    });

    return aggregated.filter(item => {
      if (filter === 'all') return true;
      return item.status === filter;
    });
  }, [products, inventory, filter]);

  const handleAdjustInventory = async () => {
    if (!selectedProduct) return;

    logger.info('[Inventory] Adjusting inventory', {
      productId: selectedProduct.product_id,
      adjustment: adjustmentData,
    });

    const result = await adjustStock({
      inventory_id: selectedProduct.items[0]?.id || '',
      quantity_change: adjustmentData.quantity,
      reason: adjustmentData.reason,
    });

    if (result.success) {
      Toast.success('המלאי עודכן בהצלחה');
      logger.info('[Inventory] Inventory adjusted successfully');
      haptic();
      setShowAdjustForm(false);
      setSelectedProduct(null);
      setAdjustmentData({ quantity: 0, reason: '' });
      refetch();
    } else {
      Toast.error(result.error.message || 'שגיאה בעדכון מלאי');
      logger.error('[Inventory] Failed to adjust inventory', result.error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return '#10b981';
      case 'low': return '#f59e0b';
      case 'out': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return '✅';
      case 'low': return '⚠️';
      case 'out': return '❌';
      default: return '📦';
    }
  };

  if (loading && aggregatedInventory.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: theme.bg_color,
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spinner />
          <p style={{ marginTop: '16px', color: theme.text_color }}>טוען מלאי...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: theme.bg_color,
      }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <p style={{ color: theme.text_color, marginBottom: '20px' }}>
            {error.message || 'שגיאה בטעינת מלאי'}
          </p>
          <Button onClick={refetch}>נסה שוב</Button>
        </div>
      </div>
    );
  }

  if (showAdjustForm && selectedProduct) {
    return (
      <div style={{
        padding: '20px',
        background: theme.bg_color,
        minHeight: '100vh',
      }}>
        <h2 style={{
          color: theme.text_color,
          marginBottom: '20px',
          fontSize: '20px',
          fontWeight: '600',
        }}>
          עדכן מלאי - {selectedProduct.product_name}
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: theme.text_color,
            fontSize: '14px',
          }}>
            כמות (שינוי)
          </label>
          <input
            type="number"
            value={adjustmentData.quantity}
            onChange={(e) => setAdjustmentData(prev => ({
              ...prev,
              quantity: parseInt(e.target.value) || 0
            }))}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${theme.hint_color}`,
              background: theme.secondary_bg_color,
              color: theme.text_color,
              fontSize: '16px',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            color: theme.text_color,
            fontSize: '14px',
          }}>
            סיבה
          </label>
          <input
            type="text"
            value={adjustmentData.reason}
            onChange={(e) => setAdjustmentData(prev => ({
              ...prev,
              reason: e.target.value
            }))}
            placeholder="למה המלאי משתנה?"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${theme.hint_color}`,
              background: theme.secondary_bg_color,
              color: theme.text_color,
              fontSize: '16px',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            onClick={handleAdjustInventory}
            disabled={adjusting || !adjustmentData.reason}
            style={{ flex: 1 }}
          >
            {adjusting ? 'מעדכן...' : 'עדכן'}
          </Button>
          <Button
            onClick={() => {
              setShowAdjustForm(false);
              setAdjustmentData({ quantity: 0, reason: '' });
            }}
            style={{ flex: 1, background: theme.hint_color }}
          >
            ביטול
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: theme.bg_color,
      minHeight: '100vh',
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: theme.text_color,
          marginBottom: '8px',
        }}>
          📦 מלאי
        </h1>
        <p style={{
          color: theme.hint_color,
          fontSize: '14px',
        }}>
          ניהול מלאי מוצרים
        </p>
      </div>

      {lowStockItems && lowStockItems.length > 0 && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: '#78350f', fontWeight: '600' }}>
              {lowStockItems.length} פריטים במלאי נמוך
            </span>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
      }}>
        {['all', 'low', 'out'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: filter === f ? theme.button_color : theme.secondary_bg_color,
              color: filter === f ? theme.button_text_color : theme.text_color,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f === 'all' ? 'הכל' : f === 'low' ? 'מלאי נמוך' : 'אזל מהמלאי'}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gap: '12px',
      }}>
        {aggregatedInventory.map((item) => (
          <div
            key={item.product_id}
            onClick={() => {
              setSelectedProduct(item);
              setShowAdjustForm(true);
            }}
            style={{
              background: theme.secondary_bg_color,
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              border: `1px solid ${theme.hint_color}20`,
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: theme.text_color,
                  marginBottom: '4px',
                }}>
                  {item.product_name}
                </h3>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                background: `${getStatusColor(item.status)}20`,
              }}>
                <span>{getStatusIcon(item.status)}</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: getStatusColor(item.status),
                }}>
                  {item.status === 'in_stock' ? 'זמין' : item.status === 'low' ? 'נמוך' : 'אזל'}
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: theme.hint_color,
                  marginBottom: '4px',
                }}>
                  במלאי
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: theme.text_color,
                }}>
                  {item.totalOnHand}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: theme.hint_color,
                  marginBottom: '4px',
                }}>
                  שמור
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: theme.text_color,
                }}>
                  {item.totalReserved}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {aggregatedInventory.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <p style={{ color: theme.hint_color }}>
            {filter === 'all' ? 'אין פריטי מלאי' : `אין פריטים ב${filter === 'low' ? 'מלאי נמוך' : 'מלאי אזל'}`}
          </p>
        </div>
      )}
    </div>
  );
}
