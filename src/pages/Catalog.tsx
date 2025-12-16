import React, { useEffect, useMemo, useState } from 'react';
import { Grid } from '../components/atoms/Grid';
import { Section } from '../components/atoms/Section';
import { Chip } from '../components/atoms/Chip';
import { ProductCard } from '../components/molecules/ProductCard';
import { PageContent } from '../components/molecules/PageContent';
import { PageHeader } from '../components/molecules/PageHeader';
import { LoadingState } from '../components/molecules/LoadingState';
import { EmptyState } from '../components/molecules/EmptyState';
import { colors, spacing } from '../design-system';
import type { Product } from '../data/types';

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

  const containerStyles: React.CSSProperties = {
    minHeight: '100vh',
    background: colors.background.primary,
    color: colors.text.primary,
    direction: 'rtl',
  };

  const chipContainerStyles: React.CSSProperties = {
    display: 'flex',
    gap: spacing[2],
    overflowX: 'auto',
    padding: `${spacing[2]} 0`,
    marginBottom: spacing[4],
  };

  return (
    <div style={containerStyles}>
      <PageContent>
        <PageHeader
          title="קטלוג מוצרים"
          subtitle="כל המוצרים והשירותים שלנו"
        />

        <Section spacing="md">
          <div style={chipContainerStyles}>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                selected={cat === category}
                onClick={() => setCategory(cat)}
              />
            ))}
          </div>

          {loading && <LoadingState message="טוען מוצרים..." />}

          {error && (
            <EmptyState
              variant="error"
              title="שגיאה בטעינת מוצרים"
              description={error}
            />
          )}

          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              variant="search"
              title="לא נמצאו מוצרים"
              description="נסה לשנות את הקטגוריה או לחפש משהו אחר"
            />
          )}

          {!loading && !error && filtered.length > 0 && (
            <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap="lg" autoFit minItemWidth="280px">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => onNavigate(`/product/${product.id}`)}
                />
              ))}
            </Grid>
          )}
        </Section>
      </PageContent>
    </div>
  );
}
