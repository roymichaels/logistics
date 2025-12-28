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
        (p.category || '').trim() === category.trim()
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
    background: 'rgba(18, 18, 20, 0.95)',
    paddingBottom: '100px',
  };

  const heroStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.08) 100%)',
    padding: `${spacing.xl} ${spacing.lg}`,
    marginBottom: spacing.lg,
    borderRadius: `0 0 ${borderRadius.xl} ${borderRadius.xl}`,
    border: '1px solid rgba(59, 130, 246, 0.1)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <>
      <div style={containerStyle}>
        <div style={heroStyle}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Text
              variant="h1"
              style={{
                color: 'rgba(255, 255, 255, 0.95)',
                marginBottom: spacing.sm,
                fontSize: 'clamp(24px, 5vw, 32px)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              Security Store
            </Text>
            <Text
              variant="body"
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: spacing.lg,
                fontSize: typography.fontSize.md,
              }}
            >
              Enterprise-grade security hardware
            </Text>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: spacing.md,
              marginTop: spacing.lg
            }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', marginBottom: spacing.xs }}>📦</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: typography.fontSize.xs, marginBottom: spacing.xs }}>Products</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: typography.fontSize.xl, fontWeight: 700 }}>{products.length}</div>
              </div>
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', marginBottom: spacing.xs }}>🛒</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: typography.fontSize.xs, marginBottom: spacing.xs }}>Cart Items</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: typography.fontSize.xl, fontWeight: 700 }}>{totalCartItems}</div>
              </div>
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', marginBottom: spacing.xs }}>💰</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: typography.fontSize.xs, marginBottom: spacing.xs }}>Total Value</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: typography.fontSize.xl, fontWeight: 700 }}>₪{totalCartValue.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: `0 ${spacing.lg}` }}>
          <Card
            variant="elevated"
            style={{
              marginBottom: spacing.lg,
              padding: spacing.lg,
              background: 'rgba(30, 30, 35, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: borderRadius.xl,
              backdropFilter: 'blur(12px)',
            }}
          >
            <SearchBar
              placeholder="Search security products..."
              onSearch={setSearchQuery}
              onClear={() => setSearchQuery('')}
              style={{ marginBottom: spacing.md }}
            />

            <div
              style={{
                display: 'flex',
                gap: spacing.xs,
                overflowX: 'auto',
                padding: `${spacing.xs} 0`,
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: `${spacing.sm} ${spacing.md}`,
                    borderRadius: borderRadius.full,
                    border: cat === category
                      ? '1px solid rgba(59, 130, 246, 0.6)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    background: cat === category
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    color: cat === category
                      ? '#60a5fa'
                      : 'rgba(255, 255, 255, 0.7)',
                    fontSize: typography.fontSize.sm,
                    fontWeight: cat === category ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (cat !== category) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (cat !== category) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                >
                  {cat}
                </button>
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
                  marginBottom: spacing.md,
                  padding: `0 ${spacing.xs}`,
                }}
              >
                <Text
                  variant="body"
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontWeight: 600,
                    fontSize: typography.fontSize.md,
                  }}
                >
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
                </Text>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: spacing.lg,
                  marginBottom: spacing.xl,
                }}
              >
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
              </div>
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
