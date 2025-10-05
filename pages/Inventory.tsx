import React, { useEffect, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, Product, InventoryRecord, InventoryAlert, InventoryLocation } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';
import { Toast } from '../src/components/Toast';
import { formatCurrency } from '../src/lib/hebrew';

interface InventoryProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface AggregatedInventory {
  product: Product;
  totalOnHand: number;
  totalReserved: number;
  totalDamaged: number;
  locations: {
    location: InventoryLocation;
    record: InventoryRecord;
  }[];
  status: 'in_stock' | 'low' | 'out';
}

export function Inventory({ dataStore, onNavigate }: InventoryProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const [inventory, setInventory] = useState<AggregatedInventory[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<AggregatedInventory | null>(null);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  useEffect(() => {
    loadInventory();

    let unsubscribe: (() => void) | undefined;
    if (dataStore.subscribeToChanges) {
      unsubscribe = dataStore.subscribeToChanges('inventory', () => {
        loadInventory();
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [filter]);

  const loadInventory = async () => {
    try {
      setLoading(true);

      const [products, inventoryRecords, locations, lowStockAlerts] = await Promise.all([
        dataStore.listProducts?.() || [],
        dataStore.listInventory?.() || [],
        dataStore.listInventoryLocations?.() || [],
        dataStore.getLowStockAlerts?.() || []
      ]);

      const locationsMap = new Map(locations.map(loc => [loc.id, loc]));
      const inventoryMap = new Map<string, InventoryRecord[]>();

      inventoryRecords.forEach(record => {
        const existing = inventoryMap.get(record.product_id) || [];
        existing.push(record);
        inventoryMap.set(record.product_id, existing);
      });

      const aggregated: AggregatedInventory[] = products.map(product => {
        const productInventory = inventoryMap.get(product.id) || [];
        const totalOnHand = productInventory.reduce((sum, r) => sum + (r.on_hand_quantity || 0), 0);
        const totalReserved = productInventory.reduce((sum, r) => sum + (r.reserved_quantity || 0), 0);
        const totalDamaged = productInventory.reduce((sum, r) => sum + (r.damaged_quantity || 0), 0);

        const hasLowStock = productInventory.some(r =>
          r.on_hand_quantity <= (r.low_stock_threshold || 0)
        );

        const status = totalOnHand === 0 ? 'out' : hasLowStock ? 'low' : 'in_stock';

        return {
          product,
          totalOnHand,
          totalReserved,
          totalDamaged,
          locations: productInventory.map(record => ({
            location: locationsMap.get(record.location_id)!,
            record
          })).filter(l => l.location),
          status
        };
      });

      const filtered = aggregated.filter(item => {
        if (filter === 'all') return true;
        return item.status === filter;
      });

      setInventory(filtered);
      setAlerts(lowStockAlerts);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      Toast.error('שגיאה בטעינת מלאי');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustInventory = async (productId: string, locationId: string, quantity: number, type: 'add' | 'remove' | 'damaged') => {
    try {
      if (!dataStore.adjustDriverInventory) {
        Toast.error('פעולה זו אינה נתמכת');
        return;
      }

      await dataStore.adjustDriverInventory({
        product_id: productId,
        quantity: type === 'add' ? quantity : type === 'remove' ? -quantity : 0,
        reason: type === 'damaged' ? 'Damaged goods' : type === 'add' ? 'Stock added' : 'Stock removed'
      });

      Toast.success('המלאי עודכן בהצלחה');
      haptic();
      loadInventory();
      setShowAdjustForm(false);
    } catch (error) {
      console.error('Failed to adjust inventory:', error);
      Toast.error('שגיאה בעדכון מלאי');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return ROYAL_COLORS.emerald;
      case 'low': return ROYAL_COLORS.gold;
      case 'out': return ROYAL_COLORS.crimson;
      default: return ROYAL_COLORS.muted;
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_stock': return 'במלאי';
      case 'low': return 'מלאי נמוך';
      case 'out': return 'אזל מהמלאי';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: ROYAL_COLORS.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <div style={{ color: ROYAL_COLORS.text, fontSize: '18px' }}>טוען מלאי...</div>
        </div>
      </div>
    );
  }

  if (selectedProduct) {
    return (
      <div style={{
        minHeight: '100vh',
        background: ROYAL_COLORS.background,
        paddingTop: '16px',
        paddingBottom: '80px',
        direction: 'rtl'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
          <button
            onClick={() => {
              setSelectedProduct(null);
              backButton.hide();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: ROYAL_COLORS.accent,
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← חזרה
          </button>

          <h1 style={{
            margin: '0 0 20px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: ROYAL_COLORS.text,
            textShadow: '0 0 20px rgba(156, 109, 255, 0.5)'
          }}>
            {selectedProduct.product.name}
          </h1>

          <div style={{
            ...ROYAL_STYLES.card,
            marginBottom: '20px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ color: ROYAL_COLORS.muted, fontSize: '14px', marginBottom: '4px' }}>מק"ט</div>
                <div style={{ color: ROYAL_COLORS.text, fontSize: '18px', fontWeight: '600' }}>
                  {selectedProduct.product.sku}
                </div>
              </div>
              <div>
                <div style={{ color: ROYAL_COLORS.muted, fontSize: '14px', marginBottom: '4px' }}>מחיר</div>
                <div style={{ color: ROYAL_COLORS.gold, fontSize: '18px', fontWeight: '600' }}>
                  {formatCurrency(selectedProduct.product.price)}
                </div>
              </div>
              <div>
                <div style={{ color: ROYAL_COLORS.muted, fontSize: '14px', marginBottom: '4px' }}>במלאי</div>
                <div style={{ color: ROYAL_COLORS.emerald, fontSize: '18px', fontWeight: '600' }}>
                  {selectedProduct.totalOnHand}
                </div>
              </div>
              <div>
                <div style={{ color: ROYAL_COLORS.muted, fontSize: '14px', marginBottom: '4px' }}>שמור</div>
                <div style={{ color: ROYAL_COLORS.gold, fontSize: '18px', fontWeight: '600' }}>
                  {selectedProduct.totalReserved}
                </div>
              </div>
            </div>
          </div>

          <h2 style={{
            margin: '24px 0 16px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: ROYAL_COLORS.text
          }}>
            מיקומים
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedProduct.locations.map(({ location, record }) => (
              <div key={location.id} style={{
                ...ROYAL_STYLES.card,
                padding: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{ color: ROYAL_COLORS.text, fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {location.name}
                    </div>
                    <div style={{ color: ROYAL_COLORS.muted, fontSize: '14px' }}>
                      {location.type}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ color: ROYAL_COLORS.muted, fontSize: '12px' }}>זמין</div>
                    <div style={{ color: ROYAL_COLORS.emerald, fontSize: '20px', fontWeight: '600' }}>
                      {record.on_hand_quantity}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: ROYAL_COLORS.muted, fontSize: '12px' }}>שמור</div>
                    <div style={{ color: ROYAL_COLORS.gold, fontSize: '20px', fontWeight: '600' }}>
                      {record.reserved_quantity || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: ROYAL_COLORS.muted, fontSize: '12px' }}>פגום</div>
                    <div style={{ color: ROYAL_COLORS.crimson, fontSize: '20px', fontWeight: '600' }}>
                      {record.damaged_quantity || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: ROYAL_COLORS.background,
      paddingTop: '16px',
      paddingBottom: '80px',
      direction: 'rtl'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        <h1 style={{
          margin: '0 0 20px 0',
          fontSize: '28px',
          fontWeight: '700',
          color: ROYAL_COLORS.text,
          textShadow: '0 0 20px rgba(156, 109, 255, 0.5)'
        }}>
          📦 מלאי
        </h1>

        {alerts.length > 0 && (
          <div style={{
            ...ROYAL_STYLES.card,
            marginBottom: '20px',
            background: `${ROYAL_COLORS.crimson}15`,
            borderColor: `${ROYAL_COLORS.crimson}40`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '24px' }}>⚠️</div>
              <div>
                <div style={{ color: ROYAL_COLORS.text, fontWeight: '600', fontSize: '16px' }}>
                  התראות מלאי נמוך
                </div>
                <div style={{ color: ROYAL_COLORS.muted, fontSize: '14px' }}>
                  {alerts.length} מוצרים דורשים תשומת לב
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'all', label: 'הכל' },
            { id: 'low', label: 'מלאי נמוך' },
            { id: 'out', label: 'אזל' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id as any);
                haptic();
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                background: filter === f.id
                  ? 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)'
                  : ROYAL_COLORS.card,
                color: filter === f.id ? '#fff' : ROYAL_COLORS.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: filter === f.id ? '0 4px 12px rgba(156, 109, 255, 0.3)' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {inventory.length === 0 ? (
          <div style={{
            ...ROYAL_STYLES.emptyState,
            padding: '60px 20px',
            borderRadius: '16px',
            background: ROYAL_COLORS.card
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text, fontSize: '20px' }}>
              אין פריטים להצגה
            </h3>
            <div style={{ ...ROYAL_STYLES.emptyStateText, fontSize: '15px' }}>
              {filter !== 'all' ? 'נסה לשנות את הסינון' : 'לא נמצאו פריטי מלאי'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {inventory.map(item => (
              <div
                key={item.product.id}
                onClick={() => {
                  setSelectedProduct(item);
                  haptic();
                  backButton.show(() => {
                    setSelectedProduct(null);
                    backButton.hide();
                  });
                }}
                style={{
                  ...ROYAL_STYLES.card,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(156, 109, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = ROYAL_COLORS.shadow;
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: ROYAL_COLORS.text,
                      marginBottom: '4px'
                    }}>
                      {item.product.name}
                    </div>
                    <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
                      {item.product.sku} • {item.locations.length} מיקומים
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: `${getStatusColor(item.status)}20`,
                    color: getStatusColor(item.status),
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>{getStatusIcon(item.status)}</span>
                    <span>{getStatusLabel(item.status)}</span>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                      זמין
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: ROYAL_COLORS.emerald }}>
                      {item.totalOnHand}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                      שמור
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: ROYAL_COLORS.gold }}>
                      {item.totalReserved}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                      פגום
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: ROYAL_COLORS.crimson }}>
                      {item.totalDamaged}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
