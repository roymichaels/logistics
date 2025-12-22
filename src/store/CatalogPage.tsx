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
import { CartDrawer } from '../components/modern/CartDrawer';
import { useCart } from '../hooks/useCart';
import { colors, spacing } from '../styles/design-system';

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
  const { addItem } = useCart();

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

  const contentStyle: React.CSSProperties = {
    paddingBottom: '80px',
  };

  return (
    <>
      <div style={contentStyle}>
        <Section
          title="Search & Filter"
          style={{
            padding: `${spacing.lg} ${spacing.lg}`,
          }}
        >
          <SearchBar
            placeholder="Search products..."
            onSearch={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </Section>

        <Section
          title="Categories"
          style={{
            padding: `0 ${spacing.lg} ${spacing.lg}`,
          }}
        >
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
        </Section>

        {loading && (
          <Section
            title="Products"
            style={{
              padding: `0 ${spacing.lg} ${spacing.lg}`,
            }}
          >
            <Grid autoFit minItemWidth="240px" gap="lg">
              <ProductCardSkeleton count={8} />
            </Grid>
          </Section>
        )}

        {error && (
          <Section
            style={{
              padding: `0 ${spacing.lg} ${spacing.lg}`,
            }}
          >
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
          </Section>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <Section
            style={{
              padding: `0 ${spacing.lg} ${spacing.lg}`,
            }}
          >
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
          </Section>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <Section
            title={`Products (${filteredProducts.length})`}
            style={{
              padding: `0 ${spacing.lg} ${spacing.lg}`,
            }}
          >
            <Grid autoFit minItemWidth="240px" gap="lg">
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
          </Section>
        )}
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => onNavigate?.('/store/checkout')}
      />
    </>
  );
}
