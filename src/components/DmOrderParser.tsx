import React, { useEffect, useMemo, useState } from 'react';
import { Product } from '../../data/types';
import { DraftOrderItem, ProductInventoryAvailability } from './orderTypes';

interface DmOrderParserChangeContext {
  errors: string[];
  rawText: string;
}

interface DmOrderParserProps {
  products: Product[];
  theme: any;
  onChange: (items: DraftOrderItem[], context: DmOrderParserChangeContext) => void;
  inventoryAvailability: Record<string, ProductInventoryAvailability>;
  initialValue?: string;
}

const quantityPattern = /(.*?)(?:\s*(?:x|×|כ|\*)\s*(\d+))?$/i;

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

function buildDraftId(index: number, productId: string) {
  return `${index}:${productId}`;
}

export function DmOrderParser({
  products,
  theme,
  onChange,
  inventoryAvailability,
  initialValue = ''
}: DmOrderParserProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [parsedItems, setParsedItems] = useState<DraftOrderItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const productIndex = useMemo(() => {
    return products.map(product => ({
      product,
      normalised: normalise(product.name)
    }));
  }, [products]);

  const chooseDefaultLocation = (
    productId: string,
    quantity: number,
    currentLocation?: string | null
  ) => {
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
  };

  useEffect(() => {
    const lines = inputValue
      .split(/\n|,/)
      .map(line => line.trim())
      .filter(Boolean);

    const computedErrors: string[] = [];

    setParsedItems(currentItems => {
      const currentById = new Map(currentItems.map(item => [item.draftId, item]));
      const nextItems: DraftOrderItem[] = [];

      lines.forEach((line, index) => {
        const match = line.match(quantityPattern);
        if (!match) {
          computedErrors.push(`לא ניתן לפענח את השורה "${line}"`);
          return;
        }

        const namePart = normalise(match[1] || '');
        const parsedQuantity = match[2] ? parseInt(match[2], 10) : 1;

        if (!namePart) {
          computedErrors.push(`שורת ההזמנה חסרה שם מוצר: "${line}"`);
          return;
        }

        let matchedProduct = productIndex.find(entry => entry.normalised === namePart)?.product;

        if (!matchedProduct) {
          matchedProduct = productIndex.find(entry => entry.normalised.includes(namePart))?.product;
        }

        if (!matchedProduct) {
          matchedProduct = productIndex.find(entry => namePart.includes(entry.normalised))?.product;
        }

        if (!matchedProduct) {
          computedErrors.push(`לא נמצא מוצר תואם עבור "${line}"`);
          return;
        }

        const draftId = buildDraftId(index, matchedProduct.id);
        const existing = currentById.get(draftId);
        const quantity = Number.isFinite(parsedQuantity) ? Math.max(parsedQuantity, 1) : 1;
        const appliedQuantity = existing ? existing.quantity : quantity;
        const sourceLocation = chooseDefaultLocation(
          matchedProduct.id,
          appliedQuantity,
          existing?.source_location
        );

        nextItems.push({
          draftId,
          product: matchedProduct,
          quantity: appliedQuantity,
          source_location: sourceLocation
        });
      });

      return nextItems;
    });

    setErrors(computedErrors);
  }, [inputValue, productIndex, inventoryAvailability]);

  useEffect(() => {
    onChange(parsedItems, { errors, rawText: inputValue });
  }, [parsedItems, errors, inputValue, onChange]);

  const handleQuantityChange = (draftId: string, quantity: number) => {
    const safeQuantity = Math.max(1, quantity);
    setParsedItems(current =>
      current.map(item =>
        item.draftId === draftId
          ? {
              ...item,
              quantity: safeQuantity,
              source_location: chooseDefaultLocation(
                item.product.id,
                safeQuantity,
                item.source_location
              )
            }
          : item
      )
    );
  };

  const handleLocationChange = (draftId: string, locationId: string) => {
    setParsedItems(current =>
      current.map(item =>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label style={{ fontWeight: 600, color: theme.text_color }}>הדבקת הודעת DM</label>
      <textarea
        value={inputValue}
        onChange={event => setInputValue(event.target.value)}
        rows={6}
        placeholder="לדוגמה: בלו קוש x2\nתפוח זהב x4"
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: `1px solid ${theme.hint_color}40`,
          backgroundColor: theme.secondary_bg_color || '#f1f1f1',
          color: theme.text_color,
          fontSize: '15px',
          lineHeight: 1.5,
          resize: 'vertical'
        }}
      />

      {errors.length > 0 && (
        <div
          style={{
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: '#ff3b3020',
            color: '#ff3b30',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {errors.map((error, index) => (
            <span key={index}>{error}</span>
          ))}
        </div>
      )}

      {parsedItems.length > 0 && (
        <div
          style={{
            borderRadius: '8px',
            border: `1px solid ${theme.hint_color}30`,
            background: theme.secondary_bg_color || '#f7f7f7'
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
            פריטים מפוענחים
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {parsedItems.map(item => {
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
                      min={1}
                      value={item.quantity}
                      onChange={event =>
                        handleQuantityChange(item.draftId, Number(event.target.value) || 1)
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
