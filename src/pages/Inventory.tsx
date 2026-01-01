import React, { useEffect, useState, useMemo } from 'react';

import { useInventory, useLowStockItems, useAdjustStock } from '../application/use-cases';
import { useCatalog } from '../application/use-cases';
import { useApp } from '../application/services/useApp';
import { useAppServices } from '../context/AppServicesContext';
import { logger } from '../lib/logger';
import { Toast } from '../components/Toast';
import { Spinner } from '../components/atoms/Spinner';
import { Button } from '../components/atoms/Button';
import { PageContainer } from '../components/layout/PageContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { ContentCard } from '../components/layout/ContentCard';
import { tokens, styles } from '../styles/tokens';
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
  const app = useApp();
  const { currentBusinessId } = useAppServices();

  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [selectedProduct, setSelectedProduct] = useState<AggregatedInventory | null>(null);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({ quantity: 0, reason: '' });

  const { products, loading: productsLoading, refetch: refetchProducts } = useCatalog({
    business_id: currentBusinessId || undefined
  });
  const { inventory, loading: inventoryLoading, error, refetch } = useInventory({
    business_id: currentBusinessId || undefined
  });
  const { items: lowStockItems } = useLowStockItems(currentBusinessId || '');
  const { adjustStock, loading: adjusting } = useAdjustStock();

  const loading = productsLoading || inventoryLoading;

  useEffect(() => {
    logger.debug('[Inventory] Component mounted, subscribing to events');

    const unsubInventory = app.events?.on('StockLow', () => {
      logger.debug('[Inventory] StockLow event received, refetching');
      refetch();
    });

    const unsubProductUpdated = app.events?.on('ProductUpdated', () => {
      logger.debug('[Inventory] ProductUpdated event received, refetching');
      refetch();
    });

    return () => {
      unsubInventory?.();
      unsubProductUpdated?.();
    };
  }, [app.events]);

  useEffect(() => {
    logger.info('🏢 Inventory: Business context changed, refetching...', { currentBusinessId });
    refetch();
    refetchProducts();
  }, [currentBusinessId, refetch, refetchProducts]);

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

    logger.debug('[Inventory] Adjusting inventory', {
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
      logger.debug('[Inventory] Inventory adjusted successfully');
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
      case 'in_stock': return tokens.colors.status.success;
      case 'low': return tokens.colors.status.warning;
      case 'out': return tokens.colors.status.error;
      default: return tokens.colors.text.secondary;
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
      <PageContainer>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Spinner />
            <p style={{ marginTop: '16px', color: tokens.colors.text.secondary }}>טוען מלאי...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh'
        }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <p style={{ color: tokens.colors.text.primary, marginBottom: '20px' }}>
              {error.message || 'שגיאה בטעינת מלאי'}
            </p>
            <Button onClick={refetch}>נסה שוב</Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (showAdjustForm && selectedProduct) {
    return (
      <PageContainer>
        <ContentCard>
          <h2 style={{
            color: tokens.colors.text.primary,
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
              color: tokens.colors.text.primary,
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
                ...styles.input,
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: tokens.colors.text.primary,
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
                ...styles.input,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleAdjustInventory}
              disabled={adjusting || !adjustmentData.reason}
              style={{
                ...styles.button.primary,
                flex: 1,
                opacity: (adjusting || !adjustmentData.reason) ? 0.5 : 1,
                cursor: (adjusting || !adjustmentData.reason) ? 'not-allowed' : 'pointer'
              }}
            >
              {adjusting ? 'מעדכן...' : 'עדכן'}
            </button>
            <button
              onClick={() => {
                setShowAdjustForm(false);
                setAdjustmentData({ quantity: 0, reason: '' });
              }}
              style={{
                ...styles.button.secondary,
                flex: 1
              }}
            >
              ביטול
            </button>
          </div>
        </ContentCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon="📦"
        title="מלאי"
        subtitle="ניהול מלאי מוצרים"
      />

      {lowStockItems && lowStockItems.length > 0 && (
        <ContentCard style={{
          background: 'rgba(255, 212, 0, 0.15)',
          border: `1px solid ${tokens.colors.status.warning}`,
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span style={{ color: tokens.colors.status.warning, fontWeight: '600' }}>
              {lowStockItems.length} פריטים במלאי נמוך
            </span>
          </div>
        </ContentCard>
      )}

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
      }}>
        {[
          { value: 'all', label: 'הכל' },
          { value: 'low', label: 'מלאי נמוך' },
          { value: 'out', label: 'אזל מהמלאי' }
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '12px',
              border: filter === f.value ? 'none' : `1px solid ${tokens.colors.background.cardBorder}`,
              background: filter === f.value ? tokens.gradients.primary : tokens.colors.background.secondary,
              color: tokens.colors.text.primary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gap: '12px',
      }}>
        {aggregatedInventory.map((item) => (
          <ContentCard
            key={item.product_id}
            hoverable
            onClick={() => {
              setSelectedProduct(item);
              setShowAdjustForm(true);
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
                  color: tokens.colors.text.primary,
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
                border: `1px solid ${getStatusColor(item.status)}`,
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
                  color: tokens.colors.text.secondary,
                  marginBottom: '4px',
                }}>
                  במלאי
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: tokens.colors.text.primary,
                }}>
                  {item.totalOnHand}
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: '12px',
                  color: tokens.colors.text.secondary,
                  marginBottom: '4px',
                }}>
                  שמור
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: tokens.colors.text.primary,
                }}>
                  {item.totalReserved}
                </div>
              </div>
            </div>
          </ContentCard>
        ))}
      </div>

      {aggregatedInventory.length === 0 && (
        <ContentCard>
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <p style={{ color: tokens.colors.text.secondary }}>
              {filter === 'all' ? 'אין פריטי מלאי' : `אין פריטים ב${filter === 'low' ? 'מלאי נמוך' : 'מלאי אזל'}`}
            </p>
          </div>
        </ContentCard>
      )}
    </PageContainer>
  );
}
