import React, { useMemo, useState } from 'react';
import { Product } from '../../data/types';
import { DraftOrderItem, ProductInventoryAvailability } from './orderTypes';

interface StorefrontOrderBuilderProps {
  products: Product[];
  value: DraftOrderItem[];
  theme: any;
  onChange: (items: DraftOrderItem[]) => void;
  inventoryAvailability: Record<string, ProductInventoryAvailability>;
}

function chooseDefaultLocation(
  productId: string,
  quantity: number,
  inventoryAvailability: Record<string, ProductInventoryAvailability>,
  currentLocation?: string | null
) {
  const availability = inventoryAvailability[productId];
  if (!availability) {
    return currentLocation ?? null;
  }

  if (currentLocation) {
    const current = availability.byLocation.find(
      location => location.locationId === currentLocation
    );
    if (current && current.available >= quantity) {
      return currentLocation;
    }
  }

  const matching = availability.byLocation.find(location => location.available >= quantity);
  if (matching) {
    return matching.locationId;
  }

  const fallback = availability.byLocation.find(location => location.available > 0);
  return fallback?.locationId ?? availability.byLocation[0]?.locationId ?? null;
}

export function StorefrontOrderBuilder({
  products,
  value,
  theme,
  onChange,
  inventoryAvailability
}: StorefrontOrderBuilderProps) {
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query)
    );
  }, [products, search]);

  const handleAddProduct = (product: Product) => {
    const availability = inventoryAvailability[product.id];
    const defaultLocation = chooseDefaultLocation(product.id, 1, inventoryAvailability);
    const existing = value.find(item => item.product.id === product.id);
    if (existing) {
      const nextQuantity = existing.quantity + 1;
      onChange(
        value.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: nextQuantity,
                source_location: chooseDefaultLocation(
                  product.id,
                  nextQuantity,
                  inventoryAvailability,
                  item.source_location
                )
              }
            : item
        )
      );
    } else {
      onChange([
        ...value,
        {
          draftId: product.id,
          product,
          quantity: 1,
          source_location: defaultLocation
        }
      ]);
    }

  };

  const handleQuantityChange = (draftId: string, quantity: number) => {
    const safeQuantity = Math.max(0, quantity);

    if (safeQuantity === 0) {
      onChange(value.filter(item => item.draftId !== draftId));
      return;
    }

    onChange(
      value.map(item =>
        item.draftId === draftId
          ? {
              ...item,
              quantity: safeQuantity,
              source_location: chooseDefaultLocation(
                item.product.id,
                safeQuantity,
                inventoryAvailability,
                item.source_location
              )
            }
          : item
      )
    );
  };

  const handleLocationChange = (draftId: string, locationId: string) => {
    onChange(
      value.map(item =>
        item.draftId === draftId
          ? {
              ...item,
              source_location: locationId || null
            }
          : item
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ fontWeight: 600, color: theme.text_color }}>חיפוש מוצר</label>
        <input
          type="text"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="חיפוש לפי שם או SKU"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: `1px solid ${theme.hint_color}40`,
            backgroundColor: theme.secondary_bg_color || '#f1f1f1',
            color: theme.text_color,
            fontSize: '15px'
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {filteredProducts.map(product => {
          const availability = inventoryAvailability[product.id];
          const totalAvailable = availability?.totalAvailable ?? 0;

          return (
            <button
              key={product.id}
              onClick={() => handleAddProduct(product)}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: `1px solid ${theme.hint_color}30`,
                backgroundColor: theme.secondary_bg_color || '#f8f8f8',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600, color: theme.text_color, marginBottom: '8px' }}>
                {product.name}
              </div>
              <div style={{ fontSize: '12px', color: theme.hint_color }}>SKU: {product.sku}</div>
              <div style={{ fontSize: '13px', color: theme.text_color, marginTop: '8px' }}>
                ₪{product.price.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: totalAvailable > 0 ? theme.hint_color : '#ff3b30', marginTop: '6px' }}>
                {totalAvailable > 0
                  ? `מלאי זמין: ${totalAvailable}`
                  : 'אין מלאי זמין'}
              </div>
            </button>
          );
        })}
      </div>

      {value.length > 0 && (
        <div
          style={{
            borderRadius: '10px',
            border: `1px solid ${theme.hint_color}30`,
            backgroundColor: theme.secondary_bg_color || '#f8f8f8'
          }}
        >
          <div
            style={{
              padding: '12px',
              borderBottom: `1px solid ${theme.hint_color}20`,
              fontWeight: 600,
              color: theme.text_color
            }}
          >
            סל הזמנה
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {value.map(item => {
              const availability = inventoryAvailability[item.product.id];
              const selectedLocation = availability?.byLocation.find(
                location => location.locationId === item.source_location
              );
              const insufficient =
                !!selectedLocation && selectedLocation.available < item.quantity;
              const noInventory = !availability || availability.totalAvailable <= 0;

              return (
                <div
                  key={item.draftId}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    borderBottom: `1px solid ${theme.hint_color}15`
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500, color: theme.text_color }}>
                        {item.product.name}
                      </span>
                      <span style={{ fontSize: '12px', color: theme.hint_color }}>
                        ₪{item.product.price.toLocaleString()}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={event =>
                        handleQuantityChange(item.draftId, Number(event.target.value) || 0)
                      }
                      style={{
                        width: '64px',
                        textAlign: 'center',
                        padding: '6px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.hint_color}40`,
                        backgroundColor: theme.bg_color,
                        color: theme.text_color
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: theme.hint_color }}>
                      מקור מלאי
                    </label>
                    <select
                      value={item.source_location || ''}
                      onChange={event => handleLocationChange(item.draftId, event.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.hint_color}40`,
                        backgroundColor: theme.bg_color,
                        color: theme.text_color
                      }}
                    >
                      <option value="">בחר מקור מלאי</option>
                      {availability?.byLocation.map(location => (
                        <option key={location.locationId} value={location.locationId}>
                          {location.locationName} · זמין {location.available}
                        </option>
                      ))}
                    </select>

                    <div style={{ fontSize: '12px', color: theme.hint_color }}>
                      {availability
                        ? `סה"כ זמין: ${availability.totalAvailable}`
                        : 'לא נמצא מלאי למוצר זה'}
                    </div>

                    {noInventory && (
                      <div
                        style={{
                          color: '#ff3b30',
                          backgroundColor: '#ff3b3020',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      >
                        אין מלאי זמין במערכת למוצר זה
                      </div>
                    )}

                    {selectedLocation && insufficient && (
                      <div
                        style={{
                          color: '#ff9500',
                          backgroundColor: '#ff950020',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      >
                        במיקום שנבחר נותרו {selectedLocation.available} יחידות בלבד
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
