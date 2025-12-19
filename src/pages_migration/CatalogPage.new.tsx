import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '../data/types';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';
import { useAddToCart } from '../migration/AddToCartController.migration';
import CartDrawerNew from '../components/cart/CartDrawer.new';
import ProductDetailsSheetNew from '../components/catalog/ProductDetailsSheet.new';
import { PageHeader } from '../components/molecules/PageHeader';
import { PageContent } from '../components/molecules/PageContent';
import { SectionHeader } from '../components/molecules/SectionHeader';
import { SearchBar } from '../components/molecules/SearchBar';
import { ProductCard } from '../components/molecules/ProductCard';
import { EmptyState } from '../components/molecules/EmptyState';
import { LoadingState } from '../components/molecules/LoadingState';
import { Grid } from '../components/atoms/Grid';
import { Chip } from '../components/atoms/Chip';
import { Button } from '../components/atoms/Button';
import { Card } from '../components/molecules/Card';
import { colors, spacing } from '../styles/design-system';

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

const CATEGORIES = ['All', 'Electronics', 'Security', 'Privacy', 'Hardware', 'Software'];
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

  // Navigation is optional - only use if provider exists
  let nav: ReturnType<typeof useNavController> | null = null;
  try {
    nav = useNavController();
  } catch {
    // Provider not available, navigation disabled
  }

  useEffect(() => {
    setTitle('Store');
    setSubtitle('Browse our catalog');
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

  // Derive categories from products
  const derivedCategories = useMemo(() => {
    if (sandbox.active && sandbox.sandbox.categories) {
      return ['All', ...((sandbox.sandbox.categories as any[]) || []).map((c: any) => c.name || c.id)];
    }
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['All', ...uniqueCategories];
  }, [products, sandbox]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (activeCategory !== 'All') {
      result = result.filter(
        (p) => p.category === activeCategory || ((p as any).tags || []).includes(activeCategory)
      );
    }

    // Sort
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

  const cartItemCount = cart.cartItems.length;

  // Header actions
  const headerActions = (
    <Button
      variant="ghost"
      size="md"
      onClick={() => setCartOpen(true)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      <ShoppingCart size={20} />
      {cartItemCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: colors.status.error,
            color: colors.white,
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cartItemCount}
        </span>
      )}
    </Button>
  );

  return (
    <>
      <PageContent>
        {/* Cart Button - Floating */}
        <div
          style={{
            position: 'fixed',
            top: 64,
            right: spacing.md,
            zIndex: 100,
          }}
        >
          {headerActions}
        </div>
        {/* Featured Section */}
        <Card
          style={{
            background: `linear-gradient(135deg, ${colors.brand.primaryFaded}, ${colors.brand.primary})`,
            color: colors.white,
            padding: spacing.xl,
            marginBottom: spacing.xl,
          }}
        >
          <h3 style={{ margin: 0, marginBottom: spacing.sm, fontSize: '20px', fontWeight: 700 }}>
            Featured Products
          </h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            Check out our latest and most popular items
          </p>
        </Card>

        {/* Search Bar */}
        <div style={{ marginBottom: spacing.lg }}>
          <SearchBar
            onSearch={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search products..."
          />
        </div>

        {/* Sort Filters */}
        <SectionHeader title="Sort By" />
        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            overflowX: 'auto',
            paddingBottom: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              active={sortBy === option}
              onClick={() => setSortBy(option)}
            />
          ))}
        </div>

        {/* Category Filters */}
        <SectionHeader title="Categories" />
        <div
          style={{
            display: 'flex',
            gap: spacing.sm,
            overflowX: 'auto',
            paddingBottom: spacing.sm,
            marginBottom: spacing.xl,
          }}
        >
          {derivedCategories.map((category) => (
            <Chip
              key={category}
              label={category}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
            />
          ))}
        </div>

        {/* Products Grid */}
        <SectionHeader
          title="Products"
          subtitle={`${filteredProducts.length} ${filteredProducts.length === 1 ? 'item' : 'items'}`}
        />

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
          <Grid columns={{ mobile: 2, tablet: 3, desktop: 4 }} gap={spacing.md}>
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
      </PageContent>

      {/* Product Detail Sheet */}
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

      {/* Cart Drawer */}
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
