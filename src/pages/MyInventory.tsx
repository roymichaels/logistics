import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { tokens, styles } from '../styles/tokens';

import { DataStore, DriverInventoryRecord, Product } from '../data/types';
import { Toast } from '../components/Toast';
import { logger } from '../lib/logger';
import { useI18n } from '../lib/i18n';
import { haptic } from '../utils/haptic';

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

  const { translations, isRTL } = useI18n();
  const [items, setItems] = useState<EditableInventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const hintColor = '#999999';

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
      logger.error('Failed to load driver inventory', err);
      Toast.error(translations.myInventoryPage.errorLoadingInventory);
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
      Toast.error(translations.myInventoryPage.selectProductToAdd);
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) {
      Toast.error(translations.myInventoryPage.productNotFound);
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
      Toast.error(translations.myInventoryPage.cannotSyncInventory);
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
        note: translations.myInventoryPage.driverInventoryUpdate
      });
      Toast.success(`${translations.myInventoryPage.inventoryUpdated} (${result.updated} ${translations.myInventoryPage.updated}, ${result.removed} ${translations.myInventoryPage.removed})`);
      haptic('soft');
      await loadData();
    } catch (err) {
      logger.error('Failed to sync driver inventory', err);
      Toast.error(translations.myInventoryPage.errorUpdatingInventory);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: tokens.colors.background.primary,
        color: tokens.colors.text.primary,
        padding: '20px',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <h1 style={{ fontSize: '24px', margin: '0 0 8px' }}>{translations.myInventoryPage.title}</h1>
      <p style={{ margin: '0 0 16px', color: hintColor }}>
        {translations.myInventoryPage.subtitle}
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}
      >
        <div style={{ color: hintColor }}>{translations.myInventoryPage.totalDraftUnits}: {totalUnits}</div>
        <button
          onClick={handleSync}
          disabled={syncing || !dataStore.syncDriverInventory}
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: tokens.colors.brand.primary,
            color: tokens.colors.text.primaryBright,
            fontWeight: 600,
            cursor: syncing ? 'wait' : 'pointer',
            opacity: syncing ? 0.7 : 1
          }}
        >
          {syncing ? translations.myInventoryPage.syncing : translations.myInventoryPage.saveChanges}
        </button>
      </div>

      {loading ? (
        <div style={{ color: hintColor }}>{translations.myInventoryPage.loadingPersonalInventory}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item) => (
            <div
              key={item.product_id}
              style={{
                backgroundColor: tokens.colors.background.cardBg,
                borderRadius: '14px',
                padding: '16px',
                border: `1px solid ${hintColor}30`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.product?.name || `${translations.myInventoryPage.product} ${item.product_id}`}</div>
                  <div style={{ fontSize: '12px', color: hintColor }}>SKU: {item.product?.sku || item.product_id}</div>
                  {item.location_id && (
                    <div style={{ fontSize: '12px', color: hintColor, marginTop: '4px' }}>
                      {translations.myInventoryPage.location}: {item.location_id}
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
                  {translations.myInventoryPage.remove}
                </button>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: hintColor, marginBottom: '6px' }}>
                  {translations.myInventoryPage.quantityInVehicle}
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
                    border: `1px solid ${tokens.colors.text.secondary}40`,
                    backgroundColor: tokens.colors.background.primary,
                    color: tokens.colors.text.primary
                  }}
                />
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div
              style={{
                backgroundColor: tokens.colors.background.cardBg,
                borderRadius: '14px',
                padding: '16px',
                border: `1px solid ${hintColor}30`,
                color: hintColor,
                textAlign: 'center'
              }}
            >
              {translations.myInventoryPage.noAssignedItems}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>{translations.myInventoryPage.addNewProduct}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: `1px solid ${tokens.colors.text.secondary}40`,
              backgroundColor: tokens.colors.background.primary,
              color: tokens.colors.text.primary
            }}
          >
            <option value="">{translations.myInventoryPage.selectProductFromList}</option>
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
              backgroundColor: tokens.colors.brand.primary,
              color: tokens.colors.text.primaryBright,
              fontWeight: 600,
              cursor: selectedProductId ? 'pointer' : 'not-allowed',
              opacity: selectedProductId ? 1 : 0.6
            }}
          >
            {translations.myInventoryPage.add}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MyInventory;
