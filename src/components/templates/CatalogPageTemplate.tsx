import React from 'react';
import { Button, Grid, Section, Text, Chip } from '../atoms';
import { Card } from '../molecules';
import type { Product } from '../../data/types';

export interface CatalogPageTemplateProps {
  products: Product[];
  categories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onNavigateToSandbox?: () => void;
  loading?: boolean;
  error?: string | null;
}

export function CatalogPageTemplate({
  products,
  categories,
  selectedCategory,
  onCategorySelect,
  onProductClick,
  onAddToCart,
  onNavigateToSandbox,
  loading = false,
  error = null,
}: CatalogPageTemplateProps) {
  return (
    <div>
      <Section spacing="lg" background="transparent">
        <div style={{ textAlign: 'center' }}>
          <Text variant="h1" weight="bold">
            Welcome to the Store
          </Text>
          <Text variant="body" color="secondary" style={{ marginBottom: '24px' }}>
            Smart catalog — personalized for every Sandbox
          </Text>
          {onNavigateToSandbox && (
            <Button variant="primary" onClick={onNavigateToSandbox}>
              🔥 Join Customer Sandbox
            </Button>
          )}
        </div>
      </Section>

      <Section spacing="md">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              selected={selectedCategory === cat}
              clickable
              onClick={() => onCategorySelect(cat)}
            >
              {cat}
            </Chip>
          ))}
        </div>
      </Section>

      <Section spacing="md">
        {loading && <Text color="secondary">Loading products...</Text>}
        {error && <Text color="error">{error}</Text>}
        {!loading && !error && (
          <Grid columns={3} gap="md" autoFit minItemWidth="240px">
            {products.map((product) => (
              <Card
                key={product.id}
                hoverable
                style={{ cursor: 'pointer' }}
                onClick={() => onProductClick(product)}
              >
                <div style={{ padding: '16px' }}>
                  <Text variant="h4" weight="semibold">
                    {product.name}
                  </Text>
                  <Text variant="body" color="secondary" style={{ marginTop: '8px' }}>
                    {product.description}
                  </Text>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '16px',
                    }}
                  >
                    <Text variant="h4" weight="bold">
                      ${product.price?.toFixed(2) || '0.00'}
                    </Text>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product);
                      }}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </Section>
    </div>
  );
}
