import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, DriverInventoryRecord, Product } from '../data/types';
import { Toast } from '../src/components/Toast';

interface MyInventoryProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface EditableInventoryItem {
  product_id: string;
  quantity: number;
  draftQuantity: number;
  record?: DriverInventoryRecord;
  product?: Product;
  location_id?: string | null;
  isNew?: boolean;
}

export function MyInventory({ dataStore }: MyInventoryProps) {
  const { theme, backButton, haptic } = useTelegramUI();
  const [items, setItems] = useState<EditableInventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const hintColor = theme.hint_color || '#999999';

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await dataStore.getProfile();
      const [inventoryRecords, productList] = await Promise.all([
        dataStore.listDriverInventory ? dataStore.listDriverInventory({ driver_id: profile.telegram_id }) : Promise.resolve([]),
        dataStore.listProducts ? dataStore.listProducts() : Promise.resolve([])
      ]);

      const mappedItems: EditableInventoryItem[] = (inventoryRecords || []).map((record) => ({
        product_id: record.product_id,
        quantity: record.quantity,
        draftQuantity: record.quantity,
        record,
        product: record.product,
        location_id: record.location_id || undefined
      }));

      setItems(mappedItems);
      setProducts(productList || []);
    } catch (err) {
      console.error('Failed to load driver inventory', err);
      Toast.error('שגיאה בטעינת המלאי האישי');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [dataStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableProducts = useMemo(() => {
    const currentIds = new Set(items.map((item) => item.product_id));
    return products.filter((product) => !currentIds.has(product.id));
  }, [products, items]);

  const totalUnits = items.reduce((sum, item) => sum + (item.draftQuantity || 0), 0);

  const handleQuantityChange = (productId: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, draftQuantity: Math.max(0, Math.round(value)) }
          : item
      )
    );
  };

  const handleRemove = (productId: string) => {
    setItems((prev) => prev.map((item) => (item.product_id === productId ? { ...item, draftQuantity: 0 } : item)));
  };

  const handleAdd = () => {
    if (!selectedProductId) {
      Toast.error('בחר מוצר להוספה');
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) {
      Toast.error('המוצר לא נמצא');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        quantity: 0,
        draftQuantity: 1,
        product,
        isNew: true
      }
    ]);
    setSelectedProductId('');
  };

  const handleSync = async () => {
    if (!dataStore.syncDriverInventory) {
      Toast.error('לא ניתן לסנכרן מלאי במערכת הנוכחית');
      return;
    }

    setSyncing(true);
    try {
      const result = await dataStore.syncDriverInventory({
        entries: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.draftQuantity,
          location_id: item.location_id
        })),
        note: 'עדכון מלאי נהג באפליקציה'
      });
      Toast.success(`המלאי עודכן (${result.updated} עודכנו, ${result.removed} הוסרו)`);
      haptic('soft');
      await loadData();
    } catch (err) {
      console.error('Failed to sync driver inventory', err);
      Toast.error('שגיאה בעדכון המלאי');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.bg_color,
        color: theme.text_color,
        padding: '20px',
        direction: 'rtl'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>המלאי שלי</h1>
      <p style={{ margin: '0 0 16px', color: hintColor }}>
        סקירה ועריכה של המוצרים שברשותך. עדכן כמויות וסנכרן את השינויים למוקד.
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}
      >
        <div style={{ color: hintColor }}>סה"כ יחידות בטיוטה: {totalUnits}</div>
        <button
          onClick={handleSync}
          disabled={syncing || !dataStore.syncDriverInventory}
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: theme.button_color,
            color: theme.button_text_color || '#ffffff',
            fontWeight: 600,
            cursor: syncing ? 'wait' : 'pointer',
            opacity: syncing ? 0.7 : 1
          }}
        >
          {syncing ? 'מסנכרן…' : 'שמור שינויים'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: hintColor }}>טוען מלאי אישי…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item) => (
            <div
              key={item.product_id}
              style={{
                backgroundColor: theme.secondary_bg_color || '#ffffff',
                borderRadius: '14px',
                padding: '16px',
                border: `1px solid ${hintColor}30`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.product?.name || `מוצר ${item.product_id}`}</div>
                  <div style={{ fontSize: '12px', color: hintColor }}>SKU: {item.product?.sku || item.product_id}</div>
                  {item.location_id && (
                    <div style={{ fontSize: '12px', color: hintColor, marginTop: '4px' }}>
                      מיקום: {item.location_id}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(item.product_id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#ff3b30',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  הסר
                </button>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: hintColor, marginBottom: '6px' }}>
                  כמות ברכב
                </label>
                <input
                  type="number"
                  min={0}
                  value={item.draftQuantity}
                  onChange={(event) => handleQuantityChange(item.product_id, Number(event.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: `1px solid ${theme.hint_color}40`,
                    backgroundColor: theme.bg_color,
                    color: theme.text_color
                  }}
                />
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div
              style={{
                backgroundColor: theme.secondary_bg_color || '#ffffff',
                borderRadius: '14px',
                padding: '16px',
                border: `1px solid ${hintColor}30`,
                color: hintColor,
                textAlign: 'center'
              }}
            >
              אין פריטים שהוקצו לך כרגע.
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>הוסף מוצר חדש</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: `1px solid ${theme.hint_color}40`,
              backgroundColor: theme.bg_color,
              color: theme.text_color
            }}
          >
            <option value="">בחר מוצר מהרשימה</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedProductId}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: theme.button_color,
              color: theme.button_text_color || '#ffffff',
              fontWeight: 600,
              cursor: selectedProductId ? 'pointer' : 'not-allowed',
              opacity: selectedProductId ? 1 : 0.6
            }}
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}

export default MyInventory;
