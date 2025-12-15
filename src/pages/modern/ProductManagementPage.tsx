import React, { useEffect, useState, useMemo } from 'react';
import { ListPageTemplate } from '@/app/templates';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Modal } from '@/components/primitives/Modal';
import { ModalHeader } from '@/components/primitives/modal-parts/ModalHeader';
import { ModalBody } from '@/components/primitives/modal-parts/ModalBody';
import { ModalFooter } from '@/components/primitives/modal-parts/ModalFooter';
import { EmptyState } from '@/components/molecules/EmptyState';
import type { Product } from '@/data/types';

interface ProductManagementPageProps {
  dataStore: any;
  onNavigate?: (path: string) => void;
}

const CATEGORY_FILTERS = [
  { label: 'All Products', value: 'all' },
  { label: 'Physical', value: 'physical' },
  { label: 'Digital', value: 'digital' },
  { label: 'Services', value: 'services' },
  { label: 'Low Stock', value: 'low_stock' },
];

const SORT_OPTIONS = [
  { label: 'Name (A-Z)', value: 'name_asc' },
  { label: 'Name (Z-A)', value: 'name_desc' },
  { label: 'Price (Low to High)', value: 'price_asc' },
  { label: 'Price (High to Low)', value: 'price_desc' },
  { label: 'Stock (Low to High)', value: 'stock_asc' },
  { label: 'Stock (High to Low)', value: 'stock_desc' },
];

export function ProductManagementPage({ dataStore, onNavigate }: ProductManagementPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const itemsPerPage = 12;

  useEffect(() => {
    loadProducts();
  }, [dataStore]);

  const loadProducts = async () => {
    let mounted = true;
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
  };

  const filteredAndSortedProducts = useMemo(() => {
    let result = products;

    if (categoryFilter !== 'all') {
      if (categoryFilter === 'low_stock') {
        result = result.filter((p) => p.stock_quantity !== undefined && p.stock_quantity < 10);
      } else {
        result = result.filter((p) =>
          (p.category || '').toLowerCase().includes(categoryFilter.toLowerCase())
        );
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query) ||
          (p.sku || '').toLowerCase().includes(query)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'stock_asc':
          return (a.stock_quantity || 0) - (b.stock_quantity || 0);
        case 'stock_desc':
          return (b.stock_quantity || 0) - (a.stock_quantity || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [products, categoryFilter, searchQuery, sortBy]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedProducts, currentPage]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsAddModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsAddModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await dataStore?.deleteProduct?.(productId);
        await loadProducts();
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  const renderProductItem = (product: Product) => {
    const isLowStock = product.stock_quantity !== undefined && product.stock_quantity < 10;
    const isOutOfStock = product.stock_quantity === 0;

    return (
      <Box
        style={{
          padding: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        <Box
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <span style={{ fontSize: '32px', opacity: 0.4 }}>🏷️</span>
          )}
        </Box>

        <Box style={{ flex: 1 }}>
          <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Box>
              <Typography variant="body" weight="bold">
                {product.name}
              </Typography>
              <Typography variant="caption" color="secondary">
                SKU: {product.sku || 'N/A'}
              </Typography>
            </Box>
            <Typography variant="body" weight="bold" style={{ color: '#3b82f6' }}>
              ₪{product.price}
            </Typography>
          </Box>

          {product.description && (
            <Typography
              variant="small"
              color="secondary"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: '8px',
              }}
            >
              {product.description}
            </Typography>
          )}

          <Box style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {product.category && <Badge variant="info">{product.category}</Badge>}
            {isOutOfStock ? (
              <Badge variant="error">Out of Stock</Badge>
            ) : isLowStock ? (
              <Badge variant="warning">Low Stock: {product.stock_quantity}</Badge>
            ) : (
              <Badge variant="success">In Stock: {product.stock_quantity}</Badge>
            )}

            <Box style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => handleEditProduct(product)}
              >
                Edit
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => handleDeleteProduct(product.id)}
                style={{ color: '#ef4444' }}
              >
                Delete
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  const emptyState = (
    <EmptyState
      variant="search"
      title="No products found"
      description={
        searchQuery || categoryFilter !== 'all'
          ? 'Try adjusting your filters'
          : 'Add your first product to get started'
      }
      action={{
        label: searchQuery || categoryFilter !== 'all' ? 'Clear Filters' : 'Add Product',
        onClick: () => {
          if (searchQuery || categoryFilter !== 'all') {
            setSearchQuery('');
            setCategoryFilter('all');
          } else {
            handleAddProduct();
          }
        },
      }}
    />
  );

  const filters = CATEGORY_FILTERS.map((filter) => ({
    label: filter.label,
    value: filter.value,
    active: categoryFilter === filter.value,
  }));

  const activeFiltersCount =
    (categoryFilter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0);

  const bulkActions = [
    { label: 'Export CSV', onClick: () => console.log('Export CSV') },
    { label: 'Import CSV', onClick: () => console.log('Import CSV') },
    { label: 'Bulk Update', onClick: () => console.log('Bulk Update') },
  ];

  return (
    <>
      <ListPageTemplate
        title="Product Management"
        items={paginatedProducts}
        renderItem={renderProductItem}
        emptyState={emptyState}
        searchable
        searchPlaceholder="Search by name, SKU, or description..."
        onSearch={setSearchQuery}
        filters={filters}
        onFilterChange={setCategoryFilter}
        activeFilters={filters.filter((f) => f.active && f.value !== 'all')}
        sortOptions={SORT_OPTIONS}
        selectedSort={sortBy}
        onSortChange={setSortBy}
        pagination={{
          currentPage,
          totalPages: Math.ceil(filteredAndSortedProducts.length / itemsPerPage),
          onPageChange: setCurrentPage,
        }}
        stats={{
          totalItems: filteredAndSortedProducts.length,
          label: 'products',
          activeFiltersCount,
        }}
        loading={loading}
        actions={
          <Button variant="primary" size="small" onClick={handleAddProduct}>
            + Add Product
          </Button>
        }
        bulkActions={bulkActions}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <ModalHeader
          title={selectedProduct ? 'Edit Product' : 'Add New Product'}
          onClose={() => setIsAddModalOpen(false)}
        />
        <ModalBody>
          <Box style={{ padding: '20px', textAlign: 'center' }}>
            <Typography>Product form will be implemented with FormPageTemplate</Typography>
            <Typography variant="caption" color="secondary" style={{ marginTop: '8px' }}>
              This will include fields for name, SKU, description, price, category, stock, and
              images
            </Typography>
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary">Save Product</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
