import React, { useEffect, useMemo, useState } from 'react';
import type { Product } from '../data/types';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';
import { useAddToCart } from '../migration/AddToCartController.migration';
import CartDrawerNew from '../components/cart/CartDrawer.new';
import ProductDetailsSheetNew from '../components/catalog/ProductDetailsSheet.new';
import { SearchBar } from '../components/molecules/SearchBar';
import { ProductCard } from '../components/molecules/ProductCard';
import { EmptyState } from '../components/molecules/EmptyState';
import { LoadingState } from '../components/molecules/LoadingState';
import { Grid } from '../components/atoms/Grid';
import { Chip } from '../components/atoms/Chip';
import { colors, spacing, gradients, borderRadius, shadows, typography } from '../styles/design-system';

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

const SORT_OPTIONS = ['All', 'New', 'Popular', 'Price: Low to High', 'Price: High to Low'];

function CatalogPageNewContent({
  products: incomingProducts,
  onSelect,
  dataStore,
  cartOpen,
  setCartOpen,
  cart,
}: CatalogPageNewContentProps) {
  const [products, setProducts] = useState<Product[]>(incomingProducts || []);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { setTitle, setSubtitle } = usePageTitle();
  const sandbox = useDataSandbox();
  const { add: addToCart } = cart;

  let nav: ReturnType<typeof useNavController> | null = null;
  try {
    nav = useNavController();
  } catch {
    // Provider not available
  }

  useEffect(() => {
    setTitle('Store');
    setSubtitle('');
  }, [setTitle, setSubtitle]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (sandbox.active) {
      setProducts((sandbox.sandbox.products as unknown as Product[]) || []);
      setLoading(false);
      return;
    }

    if (incomingProducts && incomingProducts.length > 0) {
      setProducts(incomingProducts);
      setLoading(false);
      return;
    }

    if (dataStore?.listProducts) {
      dataStore
        .listProducts()
        .then((list: Product[]) => {
          if (!cancelled) {
            setProducts(list || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setProducts([]);
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [incomingProducts, dataStore, sandbox.active]);

  const derivedCategories = useMemo(() => {
    if (sandbox.active && sandbox.sandbox.categories) {
      return ['All', ...((sandbox.sandbox.categories as any[]) || []).map((c: any) => c.name || c.id)];
    }
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['All', ...uniqueCategories];
  }, [products, sandbox]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    if (activeCategory !== 'All') {
      result = result.filter(
        (p) => p.category === activeCategory || ((p as any).tags || []).includes(activeCategory)
      );
    }

    if (sortBy === 'New') {
      result.sort((a, b) => (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
    } else if (sortBy === 'Popular') {
      result.sort((a, b) => ((b as any).views || 0) - ((a as any).views || 0));
    } else if (sortBy === 'Price: Low to High') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'Price: High to Low') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return result;
  }, [products, searchQuery, activeCategory, sortBy]);

  const handleProductClick = (product: Product) => {
    setSelected(product);
    if (onSelect) onSelect(product);
    if (nav) {
      nav.push('product', { product });
    }
  };

  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addToCart(product);
    setCartOpen(true);
  };

  return (
    <>
      <style>
        {`
          .catalog-page {
            max-width: 1400px;
            margin: 0 auto;
            padding: ${spacing.lg};
            padding-bottom: 100px;
          }

          @media (min-width: 768px) {
            .catalog-page {
              padding: ${spacing.xl} ${spacing['2xl']};
            }
          }

          @media (min-width: 1024px) {
            .catalog-page {
              padding: ${spacing['2xl']} ${spacing['3xl']};
              padding-bottom: ${spacing['3xl']};
            }
          }

          .filters-chips-row {
            display: flex;
            gap: ${spacing.sm};
            overflow-x: auto;
            padding-bottom: ${spacing.xs};
            scrollbar-width: none;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
          }

          .filters-chips-row::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      <div className="catalog-page">
        {/* Featured Banner */}
        <div style={{
          background: gradients.primary,
          color: colors.white,
          padding: `${spacing['2xl']} ${spacing.xl}`,
          marginBottom: spacing['2xl'],
          borderRadius: borderRadius['2xl'],
          boxShadow: shadows.glowLarge,
          textAlign: 'center',
        }}>
          <h2 style={{
            margin: 0,
            marginBottom: spacing.sm,
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            lineHeight: typography.lineHeight.tight,
          }}>
            Featured Products
          </h2>
          <p style={{
            margin: 0,
            opacity: 0.95,
            fontSize: typography.fontSize.base,
            lineHeight: typography.lineHeight.normal,
          }}>
            Check out our latest and most popular items
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: spacing.xl }}>
          <SearchBar
            onSearch={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search products..."
          />
        </div>

        {/* Filters */}
        <div style={{
          background: colors.background.secondary,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          border: `1px solid ${colors.border.primary}`,
        }}>
          {/* Sort By */}
          <div style={{ marginBottom: spacing.lg }}>
            <h3 style={{
              margin: 0,
              marginBottom: spacing.md,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Sort By
            </h3>
            <div className="filters-chips-row">
              {SORT_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  active={sortBy === option}
                  onClick={() => setSortBy(option)}
                />
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 style={{
              margin: 0,
              marginBottom: spacing.md,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Categories
            </h3>
            <div className="filters-chips-row">
              {derivedCategories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  active={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Products Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.lg,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
          }}>
            Products
          </h3>
          <span style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            fontWeight: typography.fontWeight.medium,
          }}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Products Grid */}
        {loading ? (
          <LoadingState message="Loading products..." />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="No products found"
            description={
              searchQuery
                ? `No results for "${searchQuery}". Try adjusting your search.`
                : 'No products available in this category.'
            }
            action={
              searchQuery || activeCategory !== 'All'
                ? {
                    label: 'Clear filters',
                    onClick: () => {
                      setSearchQuery('');
                      setActiveCategory('All');
                      setSortBy('All');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <Grid
            columns={{ mobile: 2, tablet: 3, desktop: 4, wide: 6 }}
            gap={spacing.lg}
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={handleProductClick}
                onAddToCart={(p) => handleAddToCart(p)}
                variant="default"
              />
            ))}
          </Grid>
        )}
      </div>

      <ProductDetailsSheetNew
        open={!!selected}
        product={selected}
        onClose={() => setSelected(null)}
        onAddToCart={(p) => {
          addToCart(p);
          setSelected(null);
          setCartOpen(true);
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
    </>
  );
}

export function CatalogPageNew(props: CatalogPageNewProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useAddToCart();

  return (
    <CatalogPageNewContent
      {...props}
      cartOpen={cartOpen}
      setCartOpen={setCartOpen}
      cart={cart}
    />
  );
}

export default CatalogPageNew;
