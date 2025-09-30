import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import {
  DataStore,
  Product,
  User,
  InventoryRecord,
  DriverInventoryRecord,
  RestockRequest,
  InventoryLog,
  InventoryAlert,
  RolePermissions
} from '../data/types';
import { hebrew, formatCurrency } from '../src/lib/hebrew';

interface ProductsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Products({ dataStore, onNavigate }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [inventoryMap, setInventoryMap] = useState<Record<string, InventoryRecord>>({});
  const [driverInventoryMap, setDriverInventoryMap] = useState<Record<string, DriverInventoryRecord[]>>({});
  const [restockRequestMap, setRestockRequestMap] = useState<Record<string, RestockRequest[]>>({});
  const [lowStockAlerts, setLowStockAlerts] = useState<InventoryAlert[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const { theme, haptic, backButton, mainButton } = useTelegramUI();

  useEffect(() => {
    loadData();
  }, [filter, searchQuery]);

  useEffect(() => {
    if (selectedProduct) {
      backButton.show(() => setSelectedProduct(null));
    } else if (showCreateForm) {
      backButton.show(() => setShowCreateForm(false));
    } else {
      backButton.hide();
    }
  }, [selectedProduct, showCreateForm]);

  const loadData = async () => {
    try {
      const [profile, perms] = await Promise.all([
        dataStore.getProfile(),
        dataStore.getRolePermissions ? dataStore.getRolePermissions() : Promise.resolve(null)
      ]);

      setUser(profile);
      if (perms) {
        setPermissions(perms);
      }

      const productsList = await (dataStore.listProducts
        ? dataStore.listProducts({
            category: filter === 'all' ? undefined : filter,
            q: searchQuery || undefined
          })
        : Promise.resolve([]));

      const [inventoryList, driverInventoryList, restockList, alerts] = await Promise.all([
        dataStore.listInventory ? dataStore.listInventory() : Promise.resolve([]),
        dataStore.listDriverInventory ? dataStore.listDriverInventory() : Promise.resolve([]),
        dataStore.listRestockRequests ? dataStore.listRestockRequests({ status: 'pending' }) : Promise.resolve([]),
        dataStore.getLowStockAlerts ? dataStore.getLowStockAlerts() : Promise.resolve([])
      ]);

      const inventoryLookup: Record<string, InventoryRecord> = {};
      inventoryList.forEach(record => {
        inventoryLookup[record.product_id] = record;
      });

      const driverLookup: Record<string, DriverInventoryRecord[]> = {};
      driverInventoryList.forEach(record => {
        if (!driverLookup[record.product_id]) {
          driverLookup[record.product_id] = [];
        }
        driverLookup[record.product_id].push(record);
      });

      const restockLookup: Record<string, RestockRequest[]> = {};
      restockList.forEach(request => {
        if (!restockLookup[request.product_id]) {
          restockLookup[request.product_id] = [];
        }
        restockLookup[request.product_id].push(request);
      });

      setInventoryMap(inventoryLookup);
      setDriverInventoryMap(driverLookup);
      setRestockRequestMap(restockLookup);
      setLowStockAlerts(alerts);

      const enrichedProducts = productsList.map(product => ({
        ...product,
        inventory_snapshot: inventoryLookup[product.id],
        driver_balances: driverLookup[product.id] || []
      }));

      setProducts(enrichedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = () => {
    if (!user || !['manager', 'warehouse'].includes(user.role)) {
      telegram.showAlert('אין לך הרשאה ליצור מוצרים');
      return;
    }
    
    haptic();
    setShowCreateForm(true);
  };

  useEffect(() => {
    if (['manager', 'warehouse'].includes(user?.role || '') && !selectedProduct && !showCreateForm) {
      mainButton.show('הוסף מוצר', handleCreateProduct);
    } else {
      mainButton.hide();
    }
  }, [user, selectedProduct, showCreateForm]);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        טוען מוצרים...
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <CreateProductForm
        dataStore={dataStore}
        onCancel={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false);
          loadData();
        }}
        theme={theme}
      />
    );
  }

  if (selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}
        dataStore={dataStore}
        onBack={() => setSelectedProduct(null)}
        onUpdate={loadData}
        theme={theme}
        inventory={inventoryMap[selectedProduct.id]}
        driverBalances={driverInventoryMap[selectedProduct.id] || []}
        restockRequests={restockRequestMap[selectedProduct.id] || []}
        permissions={permissions}
      />
    );
  }

  const categories = ['all', 'מחשבים', 'אביזרים', 'ציוד משרדי', 'אלקטרוניקה'];

  return (
    <div style={{ 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '24px', 
          fontWeight: '600'
        }}>
          📦 מוצרים
        </h1>

        {/* Search */}
        <input
          type="text"
          placeholder="חפש מוצרים..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: `1px solid ${theme.hint_color}40`,
            borderRadius: '8px',
            backgroundColor: theme.secondary_bg_color || '#f1f1f1',
            color: theme.text_color,
            fontSize: '16px',
            marginBottom: '16px'
          }}
        />

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                haptic();
                setFilter(category);
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: filter === category ? theme.button_color : theme.secondary_bg_color,
                color: filter === category ? theme.button_text_color : theme.text_color,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {category === 'all' ? 'הכל' : category}
            </button>
          ))}
        </div>

        {lowStockAlerts.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: '#ff3b3010',
              color: theme.text_color
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span role="img" aria-label="alert">⚠️</span>
              <span>התראות מלאי נמוך ({lowStockAlerts.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
              {lowStockAlerts.slice(0, 3).map((alert) => (
                <div key={alert.product_id}>
                  {alert.product_name}: מחסן {alert.central_quantity} • בהקצאה {alert.reserved_quantity}
                </div>
              ))}
              {lowStockAlerts.length > 3 && (
                <div style={{ color: theme.hint_color }}>ועוד {lowStockAlerts.length - 3} פריטים...</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div style={{ padding: '16px' }}>
        {products.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: theme.hint_color
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <p>לא נמצאו מוצרים</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '16px' 
          }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => {
                  haptic();
                  setSelectedProduct(product);
                }}
                theme={theme}
                inventory={inventoryMap[product.id]}
                driverBalances={driverInventoryMap[product.id] || []}
                pendingRequests={restockRequestMap[product.id]?.length || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onClick,
  theme,
  inventory,
  driverBalances,
  pendingRequests
}: {
  product: Product;
  onClick: () => void;
  theme: any;
  inventory?: InventoryRecord;
  driverBalances: DriverInventoryRecord[];
  pendingRequests: number;
}) {
  const centralQuantity = inventory?.central_quantity ?? product.stock_quantity;
  const reservedQuantity = inventory?.reserved_quantity ?? 0;
  const driverQuantity = driverBalances.reduce((sum, record) => sum + record.quantity, 0);
  const totalQuantity = centralQuantity + reservedQuantity + driverQuantity;
  const threshold = inventory?.low_stock_threshold ?? 10;

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) return { color: '#ff3b30', text: 'אזל מהמלאי', icon: '❌' };
    if (quantity <= Math.max(1, threshold)) return { color: '#ff9500', text: 'מלאי נמוך', icon: '⚠️' };
    return { color: '#34c759', text: 'במלאי', icon: '✅' };
  };

  const stockStatus = getStockStatus(centralQuantity);

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        borderRadius: '12px',
        cursor: 'pointer',
        border: `1px solid ${theme.hint_color}20`
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ 
          margin: '0 0 4px 0', 
          fontSize: '16px', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          {product.name}
        </h3>
        <p style={{ 
          margin: '0 0 8px 0', 
          fontSize: '12px', 
          color: theme.hint_color,
          fontFamily: 'monospace'
        }}>
          SKU: {product.sku}
        </p>
        <p style={{ 
          margin: '0 0 8px 0', 
          fontSize: '14px', 
          color: theme.hint_color,
          lineHeight: '1.4'
        }}>
          {product.description}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '700',
          color: theme.button_color
        }}>
          {formatCurrency(product.price)}
        </div>
        <div style={{
          padding: '4px 8px',
          borderRadius: '12px',
          backgroundColor: stockStatus.color + '20',
          color: stockStatus.color,
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{stockStatus.icon}</span>
          <span>{stockStatus.text}</span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '8px',
        fontSize: '12px',
        color: theme.hint_color,
        marginBottom: '8px'
      }}>
        <div>מחסן מרכזי: <strong style={{ color: theme.text_color }}>{centralQuantity}</strong></div>
        <div>לנהגים: <strong style={{ color: theme.text_color }}>{driverQuantity}</strong></div>
        <div>בהקצאה: <strong style={{ color: theme.text_color }}>{reservedQuantity}</strong></div>
        <div>סה"כ: <strong style={{ color: theme.text_color }}>{totalQuantity}</strong></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: theme.hint_color }}>
          {product.warehouse_location || 'ללא מיקום' }
        </div>
        {pendingRequests > 0 && (
          <div style={{
            padding: '4px 8px',
            borderRadius: '12px',
            backgroundColor: '#ff950020',
            color: '#ff9500',
            fontSize: '11px',
            fontWeight: 600
          }}>
            {pendingRequests} בקשות חידוש
          </div>
        )}
      </div>
    </div>
  );
}

function ProductDetail({
  product,
  dataStore,
  onBack,
  onUpdate,
  theme,
  inventory,
  driverBalances,
  restockRequests,
  permissions
}: {
  product: Product;
  dataStore: DataStore;
  onBack: () => void;
  onUpdate: () => void;
  theme: any;
  inventory?: InventoryRecord;
  driverBalances: DriverInventoryRecord[];
  restockRequests: RestockRequest[];
  permissions: RolePermissions | null;
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    central_quantity: inventory?.central_quantity ?? product.stock_quantity,
    price: product.price,
    warehouse_location: product.warehouse_location || ''
  });
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    setFormData({
      central_quantity: inventory?.central_quantity ?? product.stock_quantity,
      price: product.price,
      warehouse_location: product.warehouse_location || ''
    });
  }, [inventory?.central_quantity, product.price, product.warehouse_location, product.stock_quantity]);

  useEffect(() => {
    if (!dataStore.listInventoryLogs) {
      setLogs([]);
      return;
    }

    let cancelled = false;
    setLogsLoading(true);
    dataStore
      .listInventoryLogs({ product_id: product.id, limit: 20 })
      .then((entries) => {
        if (!cancelled) {
          setLogs(entries);
        }
      })
      .catch((error) => console.error('Failed to load inventory logs:', error))
      .finally(() => {
        if (!cancelled) {
          setLogsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dataStore, product.id]);

  const handleUpdate = async () => {
    try {
      await dataStore.updateProduct?.(product.id, {
        price: formData.price,
        warehouse_location: formData.warehouse_location,
        stock_quantity: formData.central_quantity
      });
      telegram.hapticFeedback('notification', 'success');
      setEditing(false);
      onUpdate();
      onBack();
    } catch (error) {
      console.error('Failed to update product:', error);
      telegram.showAlert('שגיאה בעדכון המוצר');
    }
  };

  const centralQuantity = inventory?.central_quantity ?? formData.central_quantity;
  const reservedQuantity = inventory?.reserved_quantity ?? 0;
  const driverQuantity = driverBalances.reduce((sum, record) => sum + record.quantity, 0);
  const totalQuantity = centralQuantity + reservedQuantity + driverQuantity;
  const threshold = inventory?.low_stock_threshold ?? 10;

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) return { color: '#ff3b30', text: 'אזל מהמלאי', icon: '❌' };
    if (quantity <= Math.max(1, threshold)) return { color: '#ff9500', text: 'מלאי נמוך', icon: '⚠️' };
    return { color: '#34c759', text: 'במלאי', icon: '✅' };
  };

  const stockStatus = getStockStatus(centralQuantity);

  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      <h1 style={{
        margin: '0 0 24px 0',
        fontSize: '24px',
        fontWeight: '600'
      }}>
        פרטי מוצר
      </h1>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
          {product.name}
        </h2>
        <p style={{ margin: '0 0 16px 0', color: theme.hint_color, fontFamily: 'monospace' }}>
          SKU: {product.sku}
        </p>

        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: stockStatus.color + '20',
          color: stockStatus.color,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <span>{stockStatus.icon}</span>
          <span style={{ fontWeight: '600' }}>{stockStatus.text}</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <InfoCard
            title="מחיר"
            value={formatCurrency(editing ? formData.price : product.price)}
            theme={theme}
            editable={editing}
            type="number"
            onChange={(value) => setFormData({ ...formData, price: Number(value) })}
          />
          <InfoCard
            title="כמות במחסן"
            value={(editing ? formData.central_quantity : centralQuantity).toString()}
            theme={theme}
            editable={editing}
            type="number"
            onChange={(value) => setFormData({ ...formData, central_quantity: Number(value) })}
          />
          <InfoCard
            title="מיקום במחסן"
            value={editing ? formData.warehouse_location : product.warehouse_location || 'לא צוין'}
            theme={theme}
            editable={editing}
            type="text"
            onChange={(value) => setFormData({ ...formData, warehouse_location: value })}
          />
          <InfoCard
            title="סף התראה"
            value={threshold.toString()}
            theme={theme}
          />
        </div>

        {product.description && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              תיאור
            </h3>
            <p style={{ margin: 0, color: theme.hint_color }}>
              {product.description}
            </p>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          backgroundColor: theme.secondary_bg_color,
          padding: '16px',
          borderRadius: '12px'
        }}>
          {[{
            label: 'מחסן מרכזי',
            value: centralQuantity
          }, {
            label: 'נהגים',
            value: driverQuantity
          }, {
            label: 'בהקצאה',
            value: reservedQuantity
          }, {
            label: 'סה"כ זמין',
            value: totalQuantity
          }].map((item) => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: theme.hint_color }}>{item.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {permissions?.can_request_restock && (
        <div style={{
          marginBottom: '24px',
          padding: '12px',
          borderRadius: '12px',
          backgroundColor: theme.secondary_bg_color
        }}>
          יש לך הרשאה להגיש בקשת חידוש עבור מוצר זה דרך מסך הבקשות.
        </div>
      )}

      <section style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600 }}>בקשות חידוש פעילות</h3>
        {restockRequests.length === 0 ? (
          <div style={{ color: theme.hint_color }}>אין בקשות ממתינות למוצר זה.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {restockRequests.map((request) => (
              <div
                key={request.id}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: theme.secondary_bg_color,
                  border: `1px solid ${theme.hint_color}30`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong>בקשה #{request.id.slice(0, 8)}</strong>
                  <span style={{ fontSize: '12px', color: theme.hint_color }}>
                    {new Date(request.created_at).toLocaleString('he-IL')}
                  </span>
                </div>
                <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                  כמות מבוקשת: <strong>{request.requested_quantity}</strong>
                </div>
                <div style={{ fontSize: '12px', color: theme.hint_color }}>
                  סטטוס: {
                    request.status === 'pending'
                      ? 'ממתינה'
                      : request.status === 'approved'
                      ? 'אושרה'
                      : request.status === 'fulfilled'
                      ? 'סופקה'
                      : 'נדחתה'
                  }
                </div>
                {request.notes && (
                  <div style={{ fontSize: '12px', color: theme.hint_color, marginTop: '4px' }}>
                    הערות: {request.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600 }}>תנועות מלאי אחרונות</h3>
        {logsLoading ? (
          <div style={{ color: theme.hint_color }}>טוען היסטוריית תנועות...</div>
        ) : logs.length === 0 ? (
          <div style={{ color: theme.hint_color }}>אין תנועות מתועדות עבור מוצר זה.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: theme.secondary_bg_color,
                  border: `1px solid ${theme.hint_color}30`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{log.change_type}</span>
                  <span style={{ fontSize: '12px', color: theme.hint_color }}>
                    {new Date(log.created_at).toLocaleString('he-IL')}
                  </span>
                </div>
                <div style={{ fontSize: '13px' }}>
                  שינוי כמות: <strong>{log.quantity_change}</strong>
                </div>
                {(log.from_location || log.to_location) && (
                  <div style={{ fontSize: '12px', color: theme.hint_color }}>
                    {log.from_location ? `מ: ${log.from_location}` : ''}
                    {log.from_location && log.to_location ? ' → ' : ''}
                    {log.to_location ? `אל: ${log.to_location}` : ''}
                  </div>
                )}
                {log.metadata?.note && (
                  <div style={{ fontSize: '12px', color: theme.hint_color, marginTop: '4px' }}>
                    {log.metadata.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        {editing ? (
          <>
            <button
              onClick={handleUpdate}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: theme.button_color,
                color: theme.button_text_color,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              שמור שינויים
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'transparent',
                color: theme.hint_color,
                border: `1px solid ${theme.hint_color}`,
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ביטול
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ערוך מוצר
          </button>
        )}
      </div>
    </div>
  );
}

function InfoCard({ title, value, theme, editable, type, onChange }: {
  title: string;
  value: string;
  theme: any;
  editable?: boolean;
  type?: 'text' | 'number';
  onChange?: (value: string) => void;
}) {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '8px'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: theme.hint_color,
        marginBottom: '4px',
        fontWeight: '600'
      }}>
        {title}
      </div>
      {editable && onChange ? (
        <input
          type={type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            border: `1px solid ${theme.hint_color}40`,
            borderRadius: '4px',
            backgroundColor: theme.bg_color,
            color: theme.text_color,
            fontSize: '14px'
          }}
        />
      ) : (
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          {value}
        </div>
      )}
    </div>
  );
}

function CreateProductForm({ dataStore, onCancel, onSuccess, theme }: {
  dataStore: DataStore;
  onCancel: () => void;
  onSuccess: () => void;
  theme: any;
}) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: 0,
    stock_quantity: 0,
    category: 'מחשבים',
    description: '',
    warehouse_location: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.sku) {
      telegram.showAlert('אנא מלא את השדות החובה');
      return;
    }

    setLoading(true);
    try {
      await dataStore.createProduct?.(formData);
      telegram.hapticFeedback('notification', 'success');
      onSuccess();
    } catch (error) {
      console.error('Failed to create product:', error);
      telegram.showAlert('שגיאה ביצירת המוצר');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      <h1 style={{ 
        margin: '0 0 24px 0', 
        fontSize: '24px', 
        fontWeight: '600'
      }}>
        הוסף מוצר חדש
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField
            label="שם המוצר *"
            type="text"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            theme={theme}
            disabled={loading}
          />

          <FormField
            label="SKU *"
            type="text"
            value={formData.sku}
            onChange={(value) => setFormData({ ...formData, sku: value })}
            theme={theme}
            disabled={loading}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField
              label="מחיר"
              type="number"
              value={formData.price.toString()}
              onChange={(value) => setFormData({ ...formData, price: Number(value) })}
              theme={theme}
              disabled={loading}
            />

            <FormField
              label="כמות במלאי"
              type="number"
              value={formData.stock_quantity.toString()}
              onChange={(value) => setFormData({ ...formData, stock_quantity: Number(value) })}
              theme={theme}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '16px', 
              fontWeight: '600' 
            }}>
              קטגוריה
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '8px',
                backgroundColor: theme.secondary_bg_color || '#f1f1f1',
                color: theme.text_color,
                fontSize: '16px'
              }}
              disabled={loading}
            >
              <option value="מחשבים">מחשבים</option>
              <option value="אביזרים">אביזרים</option>
              <option value="ציוד משרדי">ציוד משרדי</option>
              <option value="אלקטרוניקה">אלקטרוניקה</option>
            </select>
          </div>

          <FormField
            label="תיאור"
            type="textarea"
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            theme={theme}
            disabled={loading}
          />

          <FormField
            label="מיקום במחסן"
            type="text"
            value={formData.warehouse_location}
            onChange={(value) => setFormData({ ...formData, warehouse_location: value })}
            theme={theme}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              backgroundColor: loading ? theme.hint_color : theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px'
            }}
          >
            {loading ? 'יוצר...' : 'צור מוצר'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, type, value, onChange, theme, disabled }: {
  label: string;
  type: 'text' | 'number' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  theme: any;
  disabled?: boolean;
}) {
  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: `1px solid ${theme.hint_color}40`,
    borderRadius: '8px',
    backgroundColor: theme.secondary_bg_color || '#f1f1f1',
    color: theme.text_color,
    fontSize: '16px'
  };

  return (
    <div>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '16px', 
        fontWeight: '600' 
      }}>
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical'
          }}
          disabled={disabled}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          disabled={disabled}
        />
      )}
    </div>
  );
}