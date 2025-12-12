import React, { useEffect, useMemo, useState } from 'react';
import type { Product } from '../data/types';
import { CategoryTabs } from './CategoryTabs';
import { ProductCard } from './ProductCard';
import { CartDrawer } from './CartDrawer';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';

interface CatalogPageProps {
  dataStore: any;
  onNavigate?: (dest: string) => void;
}

const CATEGORIES = ['הכל', 'חדש', 'חם', 'מבצעים', 'שירותים', 'דיגיטל', 'פיזי'];

export function CatalogPage({ dataStore, onNavigate }: CatalogPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('הכל');
  const [isCartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = (await dataStore?.listProducts?.()) ?? [];
        if (mounted) setProducts(list);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load catalog');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [dataStore]);

  const filtered = useMemo(() => {
    if (category === 'הכל') return products;
    return products.filter(p => (p.category || '').toLowerCase().includes(category.toLowerCase().replace('חם', '').trim()));
  }, [products, category]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#13002b 0%,#000 60%)', color: '#e7e9ea', direction: 'rtl' }}>
      <StoreHeader onCart={() => setCartOpen(true)} />

      <section style={{ padding: '48px 16px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '8px' }}>ברוכים הבאים לחנות</div>
        <div style={{ color: '#b8c2d8', fontSize: '16px', marginBottom: '18px' }}>קטלוג חכם — מותאם אישית לכל SandBox</div>
        <button
          onClick={() => onNavigate?.('sandbox')}
          style={{
            padding: '12px 20px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'linear-gradient(135deg,#6c5ce7,#00d4ff)',
            color: '#0b1020',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 12px 38px rgba(0,0,0,0.25)'
          }}
        >
          🔥 הצטרפות ל-Sandbox הלקוח
        </button>
      </section>

      <div style={{ padding: '0 16px 20px' }}>
        <CategoryTabs categories={CATEGORIES} active={category} onSelect={setCategory} />
      </div>

      <div style={{ padding: '0 16px 40px' }}>
        {loading && <p style={{ color: '#9ba7b6' }}>טוען מוצרים...</p>}
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        {!loading && !error && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
            gap: '16px'
          }}>
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={() => setCartOpen(true)} />
            ))}
          </div>
        )}
      </div>

      <StoreFooter onNavigate={onNavigate} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
