import React, { useEffect, useMemo, useState } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import {
  DataStore,
  Product,
  InventoryRecord,
  DriverInventoryRecord,
  RestockRequest,
  InventoryAlert
} from '../data/types';

interface InventoryProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  central: number;
  reserved: number;
  driver: number;
  total: number;
  threshold: number;
  location: string;
  status: 'in_stock' | 'low' | 'out';
  pendingRequests: number;
}

export function Inventory({ dataStore }: InventoryProps) {
  const { theme, backButton } = useTelegramUI();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const accentColor = theme.button_color || '#007aff';
  const hintColor = theme.hint_color || '#999999';
  const subtleBackground = theme.secondary_bg_color || '#f5f5f5';

  useEffect(() => {
    backButton.hide();
  }, [backButton]);

  useEffect(() => {
    let cancelled = false;

    const loadInventory = async () => {
      setLoading(true);

      const fallback: InventoryItem[] = [
        { id: 'fallback-1', name: 'ארגז ירקות עונתי', sku: 'BX-VEG-001', central: 86, reserved: 0, driver: 0, total: 86, threshold: 10, location: 'מדף A3', status: 'in_stock', pendingRequests: 0 },
        { id: 'fallback-2', name: 'גבינת עזים', sku: 'CH-GL-204', central: 18, reserved: 0, driver: 0, total: 18, threshold: 10, location: 'קירור B1', status: 'low', pendingRequests: 0 },
        { id: 'fallback-3', name: 'קפה אורגני 1ק"ג', sku: 'CF-OR-552', central: 0, reserved: 0, driver: 0, total: 0, threshold: 10, location: 'מדף D4', status: 'out', pendingRequests: 0 }
      ];

      try {
        if (!dataStore.listInventory || !dataStore.listDriverInventory) {
          if (!cancelled) {
            if (dataStore.listProducts) {
              const products = await dataStore.listProducts({});
              if (cancelled) return;
              if (products && products.length) {
                const mapped = products.slice(0, 10).map<InventoryItem>((product: Product) => ({
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                  central: product.stock_quantity,
                  reserved: 0,
                  driver: 0,
                  total: product.stock_quantity,
                  threshold: 10,
                  location: product.warehouse_location || 'לא הוגדר',
                  status: product.stock_quantity === 0 ? 'out' : product.stock_quantity < 25 ? 'low' : 'in_stock',
                  pendingRequests: 0
                }));
                setItems(mapped);
              } else {
                setItems(fallback);
              }
            } else {
              setItems(fallback);
            }
            setAlerts([]);
          }
          return;
        }

        const [inventoryList, driverInventoryList, restockRequests, alertList] = await Promise.all([
          dataStore.listInventory(),
          dataStore.listDriverInventory(),
          dataStore.listRestockRequests ? dataStore.listRestockRequests({ status: 'pending' }) : Promise.resolve([] as RestockRequest[]),
          dataStore.getLowStockAlerts ? dataStore.getLowStockAlerts() : Promise.resolve([] as InventoryAlert[])
        ]);

        if (cancelled) return;

        const driverTotals: Record<string, number> = {};
        driverInventoryList.forEach((row: DriverInventoryRecord) => {
          driverTotals[row.product_id] = (driverTotals[row.product_id] || 0) + row.quantity;
        });

        const restockLookup: Record<string, number> = {};
        restockRequests.forEach((request) => {
          restockLookup[request.product_id] = (restockLookup[request.product_id] || 0) + 1;
        });

        const computed = inventoryList.map<InventoryItem>((record: InventoryRecord) => {
          const central = record.central_quantity;
          const reserved = record.reserved_quantity;
          const driver = driverTotals[record.product_id] || 0;
          const total = central + reserved + driver;
          const status: InventoryItem['status'] = total === 0 ? 'out' : central <= Math.max(1, record.low_stock_threshold) ? 'low' : 'in_stock';

          return {
            id: record.product_id,
            name: record.product?.name || record.product_id,
            sku: record.product?.sku || record.product_id,
            central,
            reserved,
            driver,
            total,
            threshold: record.low_stock_threshold,
            location: record.product?.warehouse_location || 'לא הוגדר',
            status,
            pendingRequests: restockLookup[record.product_id] || 0
          };
        });

        setItems(computed);
        setAlerts(alertList);
      } catch (error) {
        console.warn('Failed to load inventory data:', error);
        if (!cancelled) {
          setItems(fallback);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInventory();

    return () => {
      cancelled = true;
    };
  }, [dataStore]);

  const summary = useMemo(
    () => ({
      totalSku: items.length,
      lowStock: items.filter((item) => item.status === 'low').length,
      outOfStock: items.filter((item) => item.status === 'out').length
    }),
    [items]
  );

  const alertSet = useMemo(() => new Set(alerts.map((alert) => alert.product_id)), [alerts]);

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
      <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>ניהול מלאי</h1>
      <p style={{ margin: '0 0 24px', color: hintColor }}>
        בקרה חכמה על רמות מלאי, התראות על חוסרים ופעולות חידוש מהירות.
      </p>

      <section style={{ display: 'grid', gap: '12px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: subtleBackground, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: hintColor }}>סה"כ מק"טים במעקב</div>
          <div style={{ fontSize: '22px', fontWeight: 600 }}>{summary.totalSku}</div>
        </div>
        <div style={{ backgroundColor: subtleBackground, borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: hintColor }}>חוסרים מתקרבים</div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: summary.lowStock ? '#ff9500' : theme.text_color }}>
            {summary.lowStock}
          </div>
        </div>
      <div style={{ backgroundColor: subtleBackground, borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '14px', color: hintColor }}>חוסר מלאי</div>
        <div style={{ fontSize: '22px', fontWeight: 600, color: summary.outOfStock ? '#ff3b30' : theme.text_color }}>
          {summary.outOfStock}
        </div>
      </div>
    </section>

    {loading && (
      <div style={{ marginBottom: '12px', color: hintColor }}>טוען נתוני מלאי...</div>
    )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.length === 0 && !loading ? (
          <div style={{
            textAlign: 'center',
            padding: '24px',
            borderRadius: '12px',
            backgroundColor: theme.secondary_bg_color || '#ffffff',
            color: hintColor
          }}>
            אין נתוני מלאי זמינים.
          </div>
        ) : (
          items.map((item) => {
            const statusColor =
              item.status === 'out' ? '#ff3b30' : item.status === 'low' ? '#ff9500' : accentColor;
            const statusLabel =
              item.status === 'out' ? 'חסר במלאי' : item.status === 'low' ? 'מלאי נמוך' : 'במלאי';
            const isAlert = alertSet.has(item.id);

            return (
              <div
                key={item.id}
              style={{
                backgroundColor: theme.secondary_bg_color || '#ffffff',
                borderRadius: '14px',
                padding: '16px',
                border: `1px solid ${hintColor}30`,
                boxShadow: isAlert ? `0 0 0 2px ${statusColor}40` : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ fontSize: '12px', color: hintColor }}>SKU: {item.sku}</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '8px',
                fontSize: '12px',
                marginBottom: '8px'
              }}>
                <div>מחסן מרכזי: <strong style={{ color: theme.text_color }}>{item.central}</strong></div>
                <div>לנהגים: <strong style={{ color: theme.text_color }}>{item.driver}</strong></div>
                <div>בהקצאה: <strong style={{ color: theme.text_color }}>{item.reserved}</strong></div>
                <div>סה"כ: <strong style={{ color: theme.text_color }}>{item.total}</strong></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: hintColor }}>מיקום: {item.location}</span>
                {item.pendingRequests > 0 && (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#ff950020',
                      color: '#ff9500',
                      fontSize: '11px',
                      fontWeight: 600
                    }}
                  >
                    {item.pendingRequests} בקשות חידוש
                  </span>
                )}
              </div>

              <div style={{ marginTop: '12px' }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    backgroundColor: `${statusColor}20`,
                    color: statusColor,
                    fontSize: '12px'
                  }}
                >
                  {statusLabel}
                </span>
              </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
