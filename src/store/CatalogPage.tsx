import React, { useEffect, useMemo, useState } from 'react';
import type { Product } from '../data/types';
import { Section } from '../components/atoms/Section';
import { Grid } from '../components/atoms/Grid';
import { Chip } from '../components/atoms/Chip';
import { Text } from '../components/atoms/Typography';
import { SearchBar } from '../components/molecules/SearchBar';
import { ProductCard, ProductCardSkeleton } from '../components/molecules/ProductCard';
import { EmptyState } from '../components/molecules/EmptyState';
import { Card } from '../components/molecules/Card';
import { MetricCard, MetricGrid } from '../components/dashboard/MetricCard';
import { CartDrawer } from '../components/modern/CartDrawer';
import { useCart } from '../hooks/useCart';
import { colors, spacing, borderRadius, shadows, typography } from '../styles/design-system';

interface CatalogPageProps {
  dataStore: any;
  onNavigate?: (dest: string) => void;
}

const CATEGORIES = [
  'All',
  'Secured Smartphones',
  'Hardware Keys',
  'Privacy Devices',
  'Network Security',
  'Encryption Tools',
  'Security Software',
];

export function CatalogPage({ dataStore, onNavigate }: CatalogPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCartOpen, setCartOpen] = useState(false);
  const { addItem, cart } = useCart();
  const items = cart.items;

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
    return () => {
      mounted = false;
    };
  }, [dataStore]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (category !== 'All') {
      result = result.filter((p) =>
        (p.category || '').toLowerCase().includes(category.toLowerCase())
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query) ||
          (p.category || '').toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, category, searchQuery]);

  const totalCartItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartValue = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: colors.background.primary,
    paddingBottom: '100px',
  };

  const heroStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.primaryDark} 100%)`,
    padding: `${spacing['3xl']} ${spacing.xl}`,
    marginBottom: spacing.xl,
    borderRadius: `0 0 ${borderRadius['2xl']} ${borderRadius['2xl']}`,
    boxShadow: shadows.xl,
  };

  return (
    <>
      <div style={containerStyle}>
        <div style={heroStyle}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Text
              variant="h1"
              style={{
                color: colors.white,
                marginBottom: spacing.md,
                fontSize: 'clamp(28px, 5vw, 42px)',
                fontWeight: 800,
              }}
            >
              Store Catalog
            </Text>
            <Text
              variant="body"
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: spacing.xl,
                fontSize: typography.fontSize.lg,
              }}
            >
              Browse our premium collection of security products
            </Text>

            <MetricGrid columns={3}>
              <MetricCard
                label="Total Products"
                value={products.length}
                icon="📦"
                variant="default"
                size="small"
              />
              <MetricCard
                label="In Your Cart"
                value={totalCartItems}
                icon="🛒"
                variant="success"
                size="small"
              />
              <MetricCard
                label="Cart Value"
                value={`₪${totalCartValue.toFixed(2)}`}
                icon="💰"
                variant="warning"
                size="small"
              />
            </MetricGrid>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: `0 ${spacing.xl}` }}>
          <Card
            variant="elevated"
            style={{
              marginBottom: spacing.xl,
              padding: spacing.xl,
              background: colors.ui.card,
              border: `1px solid ${colors.border.primary}`,
              boxShadow: shadows.lg,
            }}
          >
            <SearchBar
              placeholder="Search products..."
              onSearch={setSearchQuery}
              onClear={() => setSearchQuery('')}
              style={{ marginBottom: spacing.lg }}
            />

            <Text
              variant="small"
              weight="semibold"
              style={{
                color: colors.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: spacing.md,
              }}
            >
              Categories
            </Text>

            <div
              style={{
                display: 'flex',
                gap: spacing.sm,
                overflowX: 'auto',
                padding: spacing.xs,
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  selected={cat === category}
                  clickable
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </Chip>
              ))}
            </div>
          </Card>

          {loading && (
            <Grid autoFit minItemWidth="280px" gap="lg">
              <ProductCardSkeleton count={8} />
            </Grid>
          )}

          {error && (
            <Card variant="outlined">
              <EmptyState
                variant="error"
                title="Failed to load products"
                description={error}
                action={{
                  label: 'Try Again',
                  onClick: () => window.location.reload(),
                }}
              />
            </Card>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <Card variant="outlined">
              <EmptyState
                variant="search"
                title="No products found"
                description="Try adjusting your search or filter criteria."
                action={
                  searchQuery || category !== 'All'
                    ? {
                        label: 'Clear Filters',
                        onClick: () => {
                          setSearchQuery('');
                          setCategory('All');
                        },
                      }
                    : undefined
                }
              />
            </Card>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.lg,
                }}
              >
                <Text
                  variant="h3"
                  style={{
                    color: colors.text.primary,
                    fontWeight: 700,
                  }}
                >
                  Products ({filteredProducts.length})
                </Text>
              </div>

              <Grid autoFit minItemWidth="280px" gap="lg">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(p) => {
                      addItem(p);
                      setCartOpen(true);
                    }}
                    onClick={(p) => {
                      console.log('Product clicked:', p.name);
                    }}
                  />
                ))}
              </Grid>
            </>
          )}
        </div>
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => onNavigate?.('/store/checkout')}
      />
    </>
  );
}
