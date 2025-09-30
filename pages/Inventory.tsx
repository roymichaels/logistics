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
  onHand: number;
  reserved: number;
  damaged: number;
  driver: number;
  total: number;
  threshold: number;
  locations: {
    id: string;
    name: string;
    onHand: number;
    reserved: number;
    damaged: number;
    threshold: number;
  }[];
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
        {
          id: 'fallback-1',
          name: 'ארגז ירקות עונתי',
          sku: 'BX-VEG-001',
          onHand: 86,
          reserved: 0,
          damaged: 0,
          driver: 0,
          total: 86,
          threshold: 10,
          locations: [
            { id: 'fallback-1-main', name: 'מדף A3', onHand: 86, reserved: 0, damaged: 0, threshold: 10 }
          ],
          status: 'in_stock',
          pendingRequests: 0
        },
        {
          id: 'fallback-2',
          name: 'גבינת עזים',
          sku: 'CH-GL-204',
          onHand: 18,
          reserved: 0,
          damaged: 0,
          driver: 0,
          total: 18,
          threshold: 10,
          locations: [
            { id: 'fallback-2-main', name: 'קירור B1', onHand: 18, reserved: 0, damaged: 0, threshold: 10 }
          ],
          status: 'low',
          pendingRequests: 0
        },
        {
          id: 'fallback-3',
          name: 'קפה אורגני 1ק"ג',
          sku: 'CF-OR-552',
          onHand: 0,
          reserved: 0,
          damaged: 0,
          driver: 0,
          total: 0,
          threshold: 10,
          locations: [
            { id: 'fallback-3-main', name: 'מדף D4', onHand: 0, reserved: 0, damaged: 0, threshold: 10 }
          ],
          status: 'out',
          pendingRequests: 0
        }
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
                  onHand: product.stock_quantity,
                  reserved: 0,
                  damaged: 0,
                  driver: 0,
                  total: product.stock_quantity,
                  threshold: 10,
                  locations: [
                    {
                      id: `${product.id}-primary`,
                      name: product.warehouse_location || 'לא הוגדר',
                      onHand: product.stock_quantity,
                      reserved: 0,
                      damaged: 0,
                      threshold: 10
                    }
                  ],
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

        const groupedRecords = inventoryList.reduce<Record<string, InventoryRecord[]>>((acc, record) => {
          if (!acc[record.product_id]) {
            acc[record.product_id] = [];
          }
          acc[record.product_id].push(record);
          return acc;
        }, {});

        const computed = Object.entries(groupedRecords).map<InventoryItem>(([productId, records]) => {
          const onHand = records.reduce((sum, r) => sum + r.on_hand_quantity, 0);
          const reserved = records.reduce((sum, r) => sum + r.reserved_quantity, 0);
          const damaged = records.reduce((sum, r) => sum + r.damaged_quantity, 0);
          const driver = driverTotals[productId] || 0;
          const total = onHand + reserved + driver;
          const thresholds = records.map((r) => r.low_stock_threshold);
          const threshold = thresholds.length > 0 ? Math.min(...thresholds) : 0;
          const status: InventoryItem['status'] =
            total === 0 ? 'out' : onHand <= Math.max(1, threshold) ? 'low' : 'in_stock';
          const product = records[0]?.product;

          const locations = records
            .map((record) => ({
              id: record.location_id,
              name: record.location?.name || 'ללא מיקום',
              onHand: record.on_hand_quantity,
              reserved: record.reserved_quantity,
              damaged: record.damaged_quantity,
              threshold: record.low_stock_threshold
            }))
            .sort((a, b) => b.onHand - a.onHand || a.name.localeCompare(b.name));

          return {
            id: productId,
            name: product?.name || productId,
            sku: product?.sku || productId,
            onHand,
            reserved,
            damaged,
            driver,
            total,
            threshold,
            locations,
            status,
            pendingRequests: restockLookup[productId] || 0
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
                <div>זמין במחסנים: <strong style={{ color: theme.text_color }}>{item.onHand}</strong></div>
                <div>בהקצאה: <strong style={{ color: theme.text_color }}>{item.reserved}</strong></div>
                <div>לנהגים: <strong style={{ color: theme.text_color }}>{item.driver}</strong></div>
                <div>סה"כ: <strong style={{ color: theme.text_color }}>{item.total}</strong></div>
              </div>

              {item.damaged > 0 && (
                <div style={{ fontSize: '12px', color: hintColor, marginBottom: '8px' }}>
                  פגומים: <strong style={{ color: theme.text_color }}>{item.damaged}</strong>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '12px', color: hintColor }}>
                  {item.locations.length} מיקומים פעילים
                </span>
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

              {item.locations.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '12px',
                  backgroundColor: theme.bg_color,
                  borderRadius: '10px',
                  padding: '10px',
                  marginBottom: '8px'
                }}>
                  {item.locations.map((location) => (
                    <div key={`${item.id}-${location.id}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.text_color }}>{location.name}</span>
                      <span>
                        זמין {location.onHand} • בהקצאה {location.reserved}
                        {location.damaged > 0 ? ` • פגומים ${location.damaged}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

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
