import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCatalog,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct
} from '../application/use-cases';
import { useApp } from '../application/hooks/useApp';
import { useAuth } from '../context/AuthContext';
import { useAppServices } from '../context/AppServicesContext';
import { Diagnostics } from '../foundation/diagnostics/DiagnosticsStore';
import { Toast } from '../components/Toast';
import type { Product } from '../application/queries/catalog.queries';
import { formatCurrency } from '../lib/i18n';
import { logger } from '../lib/logger';
import { ImageUploadZone } from '../components/atoms/ImageUploadZone';
import { undergroundTheme } from '../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundHeader,
  UndergroundSection,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundModal,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
  UndergroundBadge,
} from '../components/underground';

export function Products() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const app = useApp();
  const { user } = useAuth();
  const { currentBusinessId } = useAppServices();

  const { products, loading, error, refetch } = useCatalog({
    business_id: currentBusinessId || undefined,
    category: filter === 'all' ? undefined : filter,
    search: searchQuery || undefined,
  });

  const { categories } = useCategories(currentBusinessId || undefined);
  const { createProduct, loading: creating } = useCreateProduct();
  const { updateProduct, loading: updating } = useUpdateProduct();
  const { deleteProduct, loading: deleting } = useDeleteProduct();

  useEffect(() => {
    const unsubscribe = app.events?.on('ProductCreated', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'ProductCreated received, refetching products' });
      refetch();
    });

    const unsubscribeUpdated = app.events?.on('ProductUpdated', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'ProductUpdated received, refetching products' });
      refetch();
    });

    const unsubscribeDeleted = app.events?.on('ProductDeleted', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'ProductDeleted received, refetching products' });
      refetch();
    });

    return () => {
      unsubscribe?.();
      unsubscribeUpdated?.();
      unsubscribeDeleted?.();
    };
  }, [app.events, refetch]);

  useEffect(() => {
    logger.info('[Products] Business context changed, refetching...', { currentBusinessId });
    refetch();
  }, [currentBusinessId, refetch]);

  const handleCreateProduct = async (productData: Partial<Product>) => {
    Diagnostics.logEvent({ type: 'log', message: 'Creating product', data: productData });

    const result = await createProduct(productData as any);

    if (result.success) {
      Toast.success('Product created successfully');
      Diagnostics.logEvent({ type: 'log', message: 'Product created successfully', data: result.data });
      setShowCreateModal(false);
      refetch();
    } else {
      Toast.error(result.error.message || 'Failed to create product');
      Diagnostics.logEvent({ type: 'error', message: 'Failed to create product', data: { error: result.error } });
    }
  };

  const handleUpdateProduct = async (productId: string, updates: Partial<Product>) => {
    Diagnostics.logEvent({ type: 'log', message: 'Updating product', data: { productId, updates } });

    const result = await updateProduct(productId, updates as any);

    if (result.success) {
      Toast.success('Product updated successfully');
      Diagnostics.logEvent({ type: 'log', message: 'Product updated successfully', data: { productId } });
      setShowEditModal(false);
      setSelectedProduct(null);
      refetch();
    } else {
      Toast.error(result.error.message || 'Failed to update product');
      Diagnostics.logEvent({ type: 'error', message: 'Failed to update product', data: { error: result.error } });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    Diagnostics.logEvent({ type: 'log', message: 'Deleting product', data: { productId } });

    const result = await deleteProduct(productId);

    if (result.success) {
      Toast.success('Product deleted');
      Diagnostics.logEvent({ type: 'log', message: 'Product deleted successfully', data: { productId } });
      refetch();
    } else {
      Toast.error(result.error.message || 'Failed to delete product');
      Diagnostics.logEvent({ type: 'error', message: 'Failed to delete product', data: { error: result.error } });
    }
  };

  const canManageProducts =
    user?.role === 'business_owner' ||
    user?.role === 'manager' ||
    user?.role === 'warehouse';

  const allCategories = ['all', ...categories];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [products, filter, searchQuery]);

  if (loading && products.length === 0) {
    return (
      <div
        style={{
          background: undergroundTheme.colors.gradient.primary,
          minHeight: '100vh',
          padding: undergroundTheme.spacing['2xl'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UndergroundLoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: undergroundTheme.colors.gradient.primary,
          minHeight: '100vh',
          padding: undergroundTheme.spacing['2xl'],
        }}
      >
        <UndergroundEmptyState
          title="Error Loading Products"
          message={error.message || 'Failed to load products'}
        />
        <div style={{ marginTop: undergroundTheme.spacing.lg, textAlign: 'center' }}>
          <UndergroundButton onClick={refetch}>Try Again</UndergroundButton>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: undergroundTheme.colors.gradient.primary,
        color: undergroundTheme.colors.text.primary,
        minHeight: '100vh',
        padding: undergroundTheme.spacing['2xl'],
        paddingBottom: undergroundTheme.spacing['8xl'],
      }}
    >
      <UndergroundHeader title="Products" subtitle="Manage your product catalog" />

      <div style={{ marginBottom: undergroundTheme.spacing.xl }}>
        <UndergroundInput
          type="text"
          placeholder="🔍 Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
        />
      </div>

      {allCategories.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: undergroundTheme.spacing.sm,
            overflowX: 'auto',
            marginBottom: undergroundTheme.spacing.xl,
            paddingBottom: undergroundTheme.spacing.sm,
          }}
        >
          {allCategories.map((cat) => (
            <UndergroundButton
              key={cat}
              variant={filter === cat ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setFilter(cat);
                Diagnostics.logEvent({ type: 'log', message: 'Category filter changed', data: { category: cat } });
              }}
              style={{ whiteSpace: 'nowrap' }}
            >
              {cat === 'all' ? 'All' : cat}
            </UndergroundButton>
          ))}
        </div>
      )}

      {canManageProducts && (
        <UndergroundButton
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          fullWidth
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          + Add New Product
        </UndergroundButton>
      )}

      {filteredProducts.length === 0 ? (
        <UndergroundEmptyState
          title={searchQuery ? 'No Products Found' : 'No Products'}
          message={searchQuery ? 'Try a different search term' : 'Add products to get started'}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: undergroundTheme.spacing.lg,
          }}
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              canManage={canManageProducts}
              onEdit={() => {
                setSelectedProduct(product);
                setShowEditModal(true);
              }}
              onDelete={() => handleDeleteProduct(product.id)}
              deleting={deleting}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <ProductModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreateProduct} loading={creating} />
      )}

      {showEditModal && selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          onSubmit={(updates) => handleUpdateProduct(selectedProduct.id, updates)}
          loading={updating}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  canManage,
  onEdit,
  onDelete,
  deleting,
}: {
  product: Product;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <UndergroundCard hover onClick={() => setExpanded(!expanded)}>
      {product.image_url && (
        <div
          style={{
            width: '100%',
            height: '180px',
            borderRadius: undergroundTheme.borderRadius.md,
            marginBottom: undergroundTheme.spacing.md,
            overflow: 'hidden',
            background: undergroundTheme.colors.glassmorphism.bg,
          }}
        >
          <img
            src={product.image_url}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      <div>
        <h3
          style={{
            margin: `0 0 ${undergroundTheme.spacing.sm} 0`,
            fontSize: undergroundTheme.typography.fontSize.lg,
            color: undergroundTheme.colors.text.primary,
            fontWeight: undergroundTheme.typography.fontWeight.bold,
          }}
        >
          {product.name}
        </h3>

        {product.description && (
          <p
            style={{
              margin: `0 0 ${undergroundTheme.spacing.md} 0`,
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.secondary,
              lineHeight: '1.4',
            }}
          >
            {product.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: undergroundTheme.spacing.sm,
          }}
        >
          <div
            style={{
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.accent.primary,
            }}
          >
            {formatCurrency(product.price)}
          </div>

          {product.category && <UndergroundBadge variant="primary">{product.category}</UndergroundBadge>}
        </div>

        {product.sku && (
          <div
            style={{
              fontSize: undergroundTheme.typography.fontSize.xs,
              color: undergroundTheme.colors.text.tertiary,
              marginTop: undergroundTheme.spacing.xs,
            }}
          >
            SKU: {product.sku}
          </div>
        )}
      </div>

      {expanded && (
        <div
          style={{
            marginTop: undergroundTheme.spacing.lg,
            paddingTop: undergroundTheme.spacing.lg,
            borderTop: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
          }}
        >
          {product.barcode && (
            <div style={{ marginBottom: undergroundTheme.spacing.sm }}>
              <span style={{ fontSize: undergroundTheme.typography.fontSize.xs, color: undergroundTheme.colors.text.tertiary }}>
                Barcode:{' '}
              </span>
              <span style={{ fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.primary }}>
                {product.barcode}
              </span>
            </div>
          )}

          {product.unit && (
            <div style={{ marginBottom: undergroundTheme.spacing.sm }}>
              <span style={{ fontSize: undergroundTheme.typography.fontSize.xs, color: undergroundTheme.colors.text.tertiary }}>
                Unit:{' '}
              </span>
              <span style={{ fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.primary }}>
                {product.unit}
              </span>
            </div>
          )}

          {canManage && (
            <div
              style={{
                display: 'flex',
                gap: undergroundTheme.spacing.sm,
                marginTop: undergroundTheme.spacing.lg,
              }}
            >
              <UndergroundButton
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onEdit();
                }}
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
              >
                Edit
              </UndergroundButton>
              <UndergroundButton
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete();
                }}
                variant="error"
                size="sm"
                disabled={deleting}
                style={{ flex: 0 }}
              >
                🗑️
              </UndergroundButton>
            </div>
          )}
        </div>
      )}
    </UndergroundCard>
  );
}

function ProductModal({
  product,
  onClose,
  onSubmit,
  loading,
}: {
  product?: Product;
  onClose: () => void;
  onSubmit: (data: Partial<Product>) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    category: product?.category || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    unit: product?.unit || 'unit',
    image_url: product?.image_url || '',
    active: product?.active !== undefined ? product.active : true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      Toast.error('Product name is required');
      return;
    }

    if (formData.price <= 0) {
      Toast.error('Price must be greater than 0');
      return;
    }

    onSubmit(formData);
  };

  return (
    <UndergroundModal
      isOpen
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} style={{ padding: undergroundTheme.spacing.xl }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: undergroundTheme.spacing.sm,
                fontSize: undergroundTheme.typography.fontSize.sm,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                color: undergroundTheme.colors.text.primary,
              }}
            >
              Product Name *
            </label>
            <UndergroundInput
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Product name"
              disabled={loading}
              fullWidth
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: undergroundTheme.spacing.sm,
                fontSize: undergroundTheme.typography.fontSize.sm,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                color: undergroundTheme.colors.text.primary,
              }}
            >
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: undergroundTheme.spacing.md,
                background: undergroundTheme.colors.glassmorphism.bg,
                border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                borderRadius: undergroundTheme.borderRadius.md,
                color: undergroundTheme.colors.text.primary,
                fontSize: undergroundTheme.typography.fontSize.sm,
                resize: 'vertical',
              }}
              placeholder="Product description"
              disabled={loading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: undergroundTheme.spacing.md }}>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.sm,
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary,
                }}
              >
                Price *
              </label>
              <UndergroundInput
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                disabled={loading}
                fullWidth
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.sm,
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary,
                }}
              >
                Category
              </label>
              <UndergroundInput
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Category"
                disabled={loading}
                fullWidth
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: undergroundTheme.spacing.md }}>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.sm,
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary,
                }}
              >
                SKU
              </label>
              <UndergroundInput
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU"
                disabled={loading}
                fullWidth
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.sm,
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary,
                }}
              >
                Barcode
              </label>
              <UndergroundInput
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Barcode"
                disabled={loading}
                fullWidth
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: undergroundTheme.spacing.sm,
                fontSize: undergroundTheme.typography.fontSize.sm,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                color: undergroundTheme.colors.text.primary,
              }}
            >
              Unit
            </label>
            <UndergroundSelect
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              disabled={loading}
              fullWidth
            >
              <option value="unit">Unit</option>
              <option value="kg">Kilogram</option>
              <option value="liter">Liter</option>
              <option value="pack">Pack</option>
              <option value="carton">Carton</option>
            </UndergroundSelect>
          </div>

          <div>
            <ImageUploadZone
              uploadType="product"
              currentImageUrl={formData.image_url}
              onImageSelect={(file) => {
                logger.info('Product image file selected', { fileName: file.name });
              }}
              label="Product Image"
              helperText="Square image recommended, up to 5MB"
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.md }}>
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer',
              }}
              disabled={loading}
            />
            <label
              htmlFor="active"
              style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.primary,
                cursor: 'pointer',
              }}
            >
              Active Product
            </label>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            marginTop: undergroundTheme.spacing.xl,
          }}
        >
          <UndergroundButton type="button" onClick={onClose} variant="secondary" disabled={loading} style={{ flex: 1 }}>
            Cancel
          </UndergroundButton>
          <UndergroundButton type="submit" variant="primary" disabled={loading} style={{ flex: 2 }}>
            {loading ? 'Saving...' : product ? 'Update' : 'Create Product'}
          </UndergroundButton>
        </div>
      </form>
    </UndergroundModal>
  );
}
