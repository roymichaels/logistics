import React from 'react';
import { Button, Grid, Section, Text } from '../atoms';
import { Card, SearchBar } from '../molecules';
import type { Product } from '../../data/types';

export interface ProductsPageTemplateProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddProduct?: () => void;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function ProductsPageTemplate({
  products,
  onProductClick,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  searchQuery,
  onSearchChange,
  loading = false,
  error = null,
}: ProductsPageTemplateProps) {
  return (
    <div>
      <Section spacing="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text variant="h1" weight="bold">
              Products
            </Text>
            <Text variant="body" color="secondary">
              Manage your product catalog
            </Text>
          </div>
          {onAddProduct && (
            <Button variant="primary" onClick={onAddProduct}>
              + Add Product
            </Button>
          )}
        </div>
      </Section>

      <Section spacing="md">
        <SearchBar value={searchQuery} onChange={onSearchChange} placeholder="Search products..." />
      </Section>

      <Section spacing="md">
        {loading && <Text color="secondary">Loading products...</Text>}
        {error && <Text color="error">{error}</Text>}
        {!loading && !error && products.length === 0 && (
          <Card>
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Text variant="h3" color="secondary">
                No products found
              </Text>
              {onAddProduct && (
                <Button variant="primary" onClick={onAddProduct} style={{ marginTop: '16px' }}>
                  Add your first product
                </Button>
              )}
            </div>
          </Card>
        )}
        {!loading && !error && products.length > 0 && (
          <Grid columns={3} gap="md" autoFit minItemWidth="280px">
            {products.map((product) => (
              <Card key={product.id} hoverable>
                <div style={{ padding: '20px' }}>
                  <Text variant="h4" weight="semibold">
                    {product.name}
                  </Text>
                  <Text variant="body" color="secondary" style={{ marginTop: '8px' }}>
                    {product.description}
                  </Text>
                  <div style={{ marginTop: '16px' }}>
                    <Text variant="h3" weight="bold">
                      ${product.price?.toFixed(2) || '0.00'}
                    </Text>
                    <Text variant="small" color="secondary">
                      Stock: {product.stock || 0}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      onClick={() => onProductClick(product)}
                    >
                      View
                    </Button>
                    {onEditProduct && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditProduct(product)}
                      >
                        Edit
                      </Button>
                    )}
                    {onDeleteProduct && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onDeleteProduct(product)}
                      >
                        Delete
                      </Button>
                    )}
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
