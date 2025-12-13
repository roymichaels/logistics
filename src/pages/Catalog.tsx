import React, { useEffect, useMemo, useState } from 'react';
import type { Product } from '../data/types';
import { CatalogGrid } from '../components/catalog/CatalogGrid';

interface CatalogProps {
  dataStore: any;
  onNavigate: (page: string) => void;
}

const CATEGORIES = ['הכול', 'פופולרי', 'חדש', 'חם 🔥', 'מבצעים', 'שירותים', 'דיגיטל', 'פיזי'];

export function Catalog({ dataStore, onNavigate }: CatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('הכול');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const items = (await dataStore?.listProducts?.()) ?? [];
        if (mounted) setProducts(items);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load products');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [dataStore]);

  const filtered = useMemo(() => {
    if (category === 'הכול') return products;
    return products.filter(p => (p.category || '').toLowerCase().includes(category.replace('🔥', '').trim().toLowerCase()));
  }, [products, category]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 30% 10%, rgba(29,155,240,0.18), transparent 30%), radial-gradient(circle at 70% 0%, rgba(0,183,255,0.16), transparent 28%), #0f141a',
        color: '#e7e9ea',
        direction: 'rtl',
        position: 'relative',
      }}
    >
      {/* unified header handles title and hero section */}

      <div style={{ padding: '0 12px 16px' }}>
        <div className="sf-category-scroll">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '8px 12px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.12)',
                background:
                  cat === category
                    ? 'linear-gradient(135deg, rgba(29,155,240,0.95), rgba(0,183,255,0.9))'
                    : 'rgba(255,255,255,0.06)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 12px 24px' }}>
        {loading && <p style={{ color: '#9ba7b6' }}>טוען מוצרים...</p>}
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        {!loading && !error && <CatalogGrid products={filtered} />}
      </div>
    </div>
  );
}
