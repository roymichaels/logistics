import React, { useEffect, useState, useMemo } from 'react';
import { GridPageTemplate } from '@/app/templates';
import { ProductCard } from '@/components/molecules/ProductCard';
import { EmptyState } from '@/components/molecules/EmptyState';
import { Button } from '@/components/atoms/Button';
import { Box } from '@/components/atoms/Box';
import type { Product } from '@/data/types';

interface CatalogPageProps {
  dataStore: any;
  onNavigate?: (dest: string) => void;
  onProductClick?: (product: Product) => void;
  onCartOpen?: () => void;
}

const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'New Arrivals', value: 'new' },
  { label: 'Hot Deals', value: 'hot' },
  { label: 'Services', value: 'services' },
  { label: 'Digital', value: 'digital' },
  { label: 'Physical', value: 'physical' },
];

export function CatalogPage({
  dataStore,
  onNavigate,
  onProductClick,
  onCartOpen,
}: CatalogPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    let mounted = true;
    async function loadProducts() {
      try {
        setLoading(true);
        const list = (await dataStore?.listProducts?.()) ?? [];
        if (mounted) {
          setProducts(list);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadProducts();
    return () => {
      mounted = false;
    };
  }, [dataStore]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== 'all') {
      result = result.filter((p) =>
        (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase())
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
  }, [products, selectedCategory, searchQuery]);

  const filterChips = CATEGORIES.map((cat) => ({
    label: cat.label,
    active: selectedCategory === cat.value,
    onClick: () => setSelectedCategory(cat.value),
  }));

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleProductClick = (product: Product) => {
    onProductClick?.(product);
  };

  const handleAddToCart = (product: Product) => {
    console.log('Add to cart:', product);
    onCartOpen?.();
  };

  const renderProductCard = (product: Product) => (
    <ProductCard
      product={product}
      onClick={handleProductClick}
      onAddToCart={handleAddToCart}
    />
  );

  const emptyState = (
    <EmptyState
      variant="search"
      title="No products found"
      description="Try adjusting your search or filter criteria."
      action={
        searchQuery || selectedCategory !== 'all'
          ? {
              label: 'Clear Filters',
              onClick: () => {
                setSearchQuery('');
                setSelectedCategory('all');
              },
            }
          : undefined
      }
    />
  );

  const headerActions = (
    <Box style={{ display: 'flex', gap: '12px' }}>
      <Button variant="secondary" size="small" onClick={() => onNavigate?.('/sandbox')}>
        🔥 Sandbox
      </Button>
      <Button variant="primary" size="small" onClick={onCartOpen}>
        🛒 Cart
      </Button>
    </Box>
  );

  return (
    <GridPageTemplate
      title="Store Catalog"
      actions={headerActions}
      items={filteredProducts}
      renderCard={renderProductCard}
      emptyState={emptyState}
      searchable
      searchPlaceholder="Search products..."
      onSearch={handleSearch}
      filterChips={filterChips}
      defaultLayout="comfortable"
      allowLayoutChange
      allowViewModeChange
      columns={{ mobile: 1, tablet: 2, desktop: 3 }}
      loading={loading}
    />
  );
}
