import React, { useEffect, useMemo, useState } from 'react';
import { Product } from '../../data/types';

export interface DraftOrderItem {
  product: Product;
  quantity: number;
  source_location?: string | null;
}

interface DmOrderParserChangeContext {
  errors: string[];
  rawText: string;
}

interface DmOrderParserProps {
  products: Product[];
  theme: any;
  onChange: (items: DraftOrderItem[], context: DmOrderParserChangeContext) => void;
  initialValue?: string;
}

const quantityPattern = /(.*?)(?:\s*(?:x|×|כ|\*)\s*(\d+))?$/i;

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

export function DmOrderParser({ products, theme, onChange, initialValue = '' }: DmOrderParserProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [parsedItems, setParsedItems] = useState<DraftOrderItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const productIndex = useMemo(() => {
    return products.map(product => ({
      product,
      normalised: normalise(product.name)
    }));
  }, [products]);

  useEffect(() => {
    const lines = inputValue
      .split(/\n|,/)
      .map(line => line.trim())
      .filter(Boolean);

    const nextItems: DraftOrderItem[] = [];
    const nextErrors: string[] = [];

    lines.forEach(line => {
      const match = line.match(quantityPattern);
      if (!match) {
        nextErrors.push(`לא ניתן לפענח את השורה "${line}"`);
        return;
      }

      const namePart = normalise(match[1] || '');
      const quantity = match[2] ? parseInt(match[2], 10) : 1;

      if (!namePart) {
        nextErrors.push(`שורת ההזמנה חסרה שם מוצר: "${line}"`);
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
        nextErrors.push(`לא נמצא מוצר תואם עבור "${line}"`);
        return;
      }

      nextItems.push({ product: matchedProduct, quantity: Number.isFinite(quantity) ? Math.max(quantity, 1) : 1 });
    });

    setParsedItems(nextItems);
    setErrors(nextErrors);
  }, [inputValue, productIndex]);

  useEffect(() => {
    onChange(parsedItems, { errors, rawText: inputValue });
  }, [parsedItems, errors, inputValue, onChange]);

  const handleQuantityChange = (productId: string, quantity: number) => {
    setParsedItems(current =>
      current.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, quantity) }
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
            {parsedItems.map(item => (
              <div
                key={item.product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderBottom: `1px solid ${theme.hint_color}15`
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500, color: theme.text_color }}>{item.product.name}</span>
                  <span style={{ fontSize: '12px', color: theme.hint_color }}>₪{item.product.price.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={event => handleQuantityChange(item.product.id, Number(event.target.value) || 1)}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
