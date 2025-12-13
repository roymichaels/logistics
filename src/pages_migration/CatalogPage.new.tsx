import React, { useEffect, useMemo, useState } from 'react';
import { Section } from '../components/primitives/Section';
import { Surface } from '../components/layout/Surface';
import CatalogGridNew from '../components/catalog/CatalogGrid.new';
import { mapProductsToCatalogVM } from '../adapters/ui/CatalogAdapter';
import type { Product } from '../data/types';
import { usePageTitle } from '../hooks/usePageTitle';
import { useShell } from '../context/ShellContext';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';
import CatalogChipsNew from '../components/catalog/CatalogChips.new';
import ProductDetailsSheetNew from '../components/catalog/ProductDetailsSheet.new';
import { useAddToCart } from '../migration/AddToCartController.migration';
import { Card } from '../components/primitives/Card';
import { migrationFlags } from '../migration/flags';
import SearchBarNew from '../components/search/SearchBar.new';
import FilterChipsNew from '../components/search/FilterChips.new';
import useSearchAndFilter from '../controllers/useSearchAndFilter';
import ReactionBarNew from '../components/reactions/ReactionBar.new';
import useReactionStore from '../state/useReactionStore';
import CartDrawerNew from '../components/cart/CartDrawer.new';

type CatalogPageNewProps = {
  products?: Product[];
  onSelect?: (p: Product) => void;
  dataStore?: any;
};

type CatalogPageNewContentProps = CatalogPageNewProps & {
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  cart: ReturnType<typeof useAddToCart>;
};

function CatalogPageNewContent({ products: incomingProducts, onSelect, dataStore, cartOpen, setCartOpen, cart }: CatalogPageNewContentProps) {
  const [products, setProducts] = useState<Product[]>(incomingProducts || []);
  const [selected, setSelected] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const { setTitle, setSubtitle } = usePageTitle();
  const shell = useShell();
  const nav = useNavController();
  const sandbox = useDataSandbox();
  const { add: addToCart } = cart;
  const reactions = useReactionStore();

  useEffect(() => {
    setTitle('Catalog');
    setSubtitle('All Products');
  }, [setTitle, setSubtitle]);

  useEffect(() => {
    let cancelled = false;
    if (sandbox.active) {
      setProducts((sandbox.sandbox.products as unknown as Product[]) || []);
      return;
    }
    if (incomingProducts && incomingProducts.length > 0) {
      setProducts(incomingProducts);
      return;
    }
    if (dataStore?.listProducts) {
      dataStore
        .listProducts()
        .then((list: Product[]) => {
          if (!cancelled) setProducts(list || []);
        })
        .catch(() => {
          if (!cancelled) setProducts([]);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [incomingProducts, dataStore, sandbox.active]);

  const viewProducts = useMemo(() => mapProductsToCatalogVM(products), [products]);
  const derivedCategories = useMemo(() => {
    if (sandbox.active && (sandbox.sandbox.categories as any[])) {
      return ['All', ...((sandbox.sandbox.categories as any[]) || []).map((c: any) => c.name || c.id)];
    }
    return ['All', 'New', 'Hot'];
  }, [sandbox]);

  const { filteredResults, query, setQuery, activeFilter, setActiveFilter } = useSearchAndFilter(viewProducts as Product[]);

  const categoryFiltered = useMemo(() => {
    const base = filteredResults as Product[];
    if (activeCategory === 'All') return base;
    return base.filter((p: any) => p.category === activeCategory || ((p.tags as string[]) || []).includes(activeCategory));
  }, [filteredResults, activeCategory]);

  return (
    <Surface>
      {migrationFlags.catalog && migrationFlags.unifiedShell && (
        <Section title="Featured">
          <Card>
            <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>מבצעים חמים</div>
            <div style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>גשו לפריטים החדשים והמבוקשים</div>
          </Card>
        </Section>
      )}

      {migrationFlags.catalog && migrationFlags.search && (
        <Section title="חיפוש">
          <div style={{ display: 'grid', gap: 8 }}>
            <SearchBarNew query={query} onQueryChange={setQuery} autoFocus={migrationFlags.searchHeader} />
            <FilterChipsNew filters={['All', 'New', 'Popular', 'Price ↑', 'Price ↓']} active={activeFilter} onChange={setActiveFilter} />
          </div>
        </Section>
      )}

      <Section title="קטגוריות">
        <CatalogChipsNew categories={derivedCategories} active={activeCategory} onChange={setActiveCategory} />
      </Section>

      <Section title="מוצרים">
          <CatalogGridNew
          products={categoryFiltered as Product[]}
          onSelect={(p: Product) => {
            if (onSelect) onSelect(p);
            nav.push('product', { product: p });
            setSelected(p);
          }}
          onAddToCart={(p: Product) => {
            addToCart(p);
            setSelected(p);
            setCartOpen(true);
          }}
          reactionStore={migrationFlags.reactions ? reactions : undefined}
        />
      </Section>
      <ProductDetailsSheetNew
        open={!!selected}
        product={selected}
        onClose={() => setSelected(null)}
        onAddToCart={(p) => {
          addToCart(p);
          setSelected(null);
          if (migrationFlags.drawerAutoOpen) setCartOpen(true);
        }}
        onOpenCart={() => setCartOpen(true)}
      />
      <CartDrawerNew
        open={cartOpen}
        items={cart.cartItems as any}
        onClose={() => setCartOpen(false)}
        onIncrement={(p: Product) => cart.increment(p)}
        onDecrement={(p: Product) => cart.decrement(p)}
        onRemove={(p: Product) => cart.remove(p)}
        subtotal={cart.subtotal}
        total={cart.total}
      />
      {migrationFlags.reactions && <ReactionBarNew reactionStore={reactions} />}
    </Surface>
  );
}

export function CatalogPageNew(props: CatalogPageNewProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useAddToCart();
  const shellActions =
    migrationFlags.catalog && migrationFlags.unifiedShell ? (
      <button
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--color-border)',
          background: 'transparent',
          color: 'var(--color-text)',
          cursor: 'pointer'
        }}
        onClick={() => setCartOpen(true)}
      >
        🛒
      </button>
    ) : null;
  // Render content directly; UnifiedShellRouter wraps this page at the routing level.
  return <CatalogPageNewContent {...props} cartOpen={cartOpen} setCartOpen={setCartOpen} cart={cart} />;
}

export default CatalogPageNew;
