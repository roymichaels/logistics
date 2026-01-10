import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppServices } from '../../context/AppServicesContext';
import { logger } from '../../lib/logger';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundSelect,
  UndergroundTable,
  UndergroundSection,
  UndergroundBadge,
  UndergroundLoadingSpinner,
  UndergroundModal,
  UndergroundEmptyState
} from '../../components/underground';

interface PlatformProduct {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  catalog_type: 'platform';
  created_at: string;
  updated_at: string;
}

export function PlatformCatalog() {
  const { user } = useAuth();
  const { dataStore } = useAppServices();
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PlatformProduct | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    price: 0,
    stock_quantity: 0,
    image_url: '',
  });

  const canManagePlatformCatalog = ['admin', 'superadmin'].includes(user?.role || '');

  useEffect(() => {
    if (!canManagePlatformCatalog) {
      return;
    }
    loadProducts();
  }, [canManagePlatformCatalog]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const table = dataStore?.getTable?.('platform_products') || [];
      setProducts(table);
      logger.info('[PlatformCatalog] Loaded products', { count: table.length });
    } catch (error) {
      logger.error('[PlatformCatalog] Failed to load products', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      category: '',
      price: 0,
      stock_quantity: 0,
      image_url: '',
    });
    setShowCreateModal(true);
  };

  const openEditModal = (product: PlatformProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      category: product.category,
      price: product.price,
      stock_quantity: product.stock_quantity,
      image_url: product.image_url || '',
    });
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    try {
      const newProduct: PlatformProduct = {
        id: `platform-prod-${Date.now()}`,
        ...formData,
        catalog_type: 'platform',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await dataStore?.upsert?.('platform_products', [newProduct]);
      setShowCreateModal(false);
      loadProducts();
      logger.info('[PlatformCatalog] Product created');
    } catch (error) {
      logger.error('[PlatformCatalog] Failed to create product', error);
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;

    try {
      const updatedProduct: PlatformProduct = {
        ...editingProduct,
        ...formData,
        updated_at: new Date().toISOString(),
      };

      await dataStore?.upsert?.('platform_products', [updatedProduct]);
      setShowEditModal(false);
      setEditingProduct(null);
      loadProducts();
      logger.info('[PlatformCatalog] Product updated');
    } catch (error) {
      logger.error('[PlatformCatalog] Failed to update product', error);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await dataStore?.delete?.('platform_products', productId);
      loadProducts();
      logger.info('[PlatformCatalog] Product deleted');
    } catch (error) {
      logger.error('[PlatformCatalog] Failed to delete product', error);
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (!canManagePlatformCatalog) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundCard>
          <UndergroundEmptyState
            icon="🔒"
            title="Access Denied"
            description="You don't have permission to manage the platform catalog"
          />
        </UndergroundCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <UndergroundSection
          title="Platform Catalog"
          icon="📦"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard style={{ marginBottom: undergroundTheme.spacing.lg }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: undergroundTheme.spacing.md,
              marginBottom: undergroundTheme.spacing.lg
            }}>
              <UndergroundInput
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon="🔍"
              />

              <UndergroundSelect
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </UndergroundSelect>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                Showing {filteredProducts.length} of {products.length} products
              </div>

              <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                <UndergroundButton
                  variant="secondary"
                  size="small"
                  onClick={loadProducts}
                >
                  Refresh
                </UndergroundButton>
                <UndergroundButton
                  variant="primary"
                  size="small"
                  onClick={openCreateModal}
                >
                  Add Product
                </UndergroundButton>
              </div>
            </div>
          </UndergroundCard>

          {filteredProducts.length === 0 ? (
            <UndergroundCard>
              <UndergroundEmptyState
                icon="📦"
                title="No Products Found"
                description="Add your first platform product to get started"
                action={
                  <UndergroundButton variant="primary" onClick={openCreateModal}>
                    Add Product
                  </UndergroundButton>
                }
              />
            </UndergroundCard>
          ) : (
            <UndergroundCard>
              <UndergroundTable
                headers={['Product', 'SKU', 'Category', 'Price', 'Stock', 'Actions']}
                rows={filteredProducts.map((product) => [
                  <div key="product">
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {product.name}
                    </div>
                    {product.description && (
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        {product.description.slice(0, 60)}...
                      </div>
                    )}
                  </div>,

                  <div key="sku" style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    fontFamily: 'monospace',
                    color: undergroundTheme.colors.text.secondary
                  }}>
                    {product.sku}
                  </div>,

                  <UndergroundBadge key="category" variant="secondary">
                    {product.category}
                  </UndergroundBadge>,

                  <div key="price" style={{
                    fontSize: undergroundTheme.typography.fontSize.md,
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    color: undergroundTheme.colors.accent.primary
                  }}>
                    ₪{product.price.toFixed(2)}
                  </div>,

                  <div key="stock" style={{
                    fontSize: undergroundTheme.typography.fontSize.md,
                    color: product.stock_quantity > 10 ? undergroundTheme.colors.status.success :
                           product.stock_quantity > 0 ? undergroundTheme.colors.status.warning :
                           undergroundTheme.colors.status.error
                  }}>
                    {product.stock_quantity}
                  </div>,

                  <div key="actions" style={{ display: 'flex', gap: undergroundTheme.spacing.sm }}>
                    <UndergroundButton
                      variant="ghost"
                      size="small"
                      onClick={() => openEditModal(product)}
                    >
                      Edit
                    </UndergroundButton>
                    <UndergroundButton
                      variant="ghost"
                      size="small"
                      onClick={() => handleDelete(product.id)}
                    >
                      Delete
                    </UndergroundButton>
                  </div>
                ])}
              />
            </UndergroundCard>
          )}
        </UndergroundSection>
      </div>

      <UndergroundModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Platform Product"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundInput
            type="text"
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <UndergroundInput
            type="text"
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          />

          <UndergroundInput
            type="text"
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
          />

          <UndergroundInput
            type="text"
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />

          <UndergroundInput
            type="number"
            label="Price (₪)"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
          />

          <UndergroundInput
            type="number"
            label="Stock Quantity"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
          />

          <UndergroundInput
            type="text"
            label="Image URL"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          />

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            marginTop: undergroundTheme.spacing.lg
          }}>
            <UndergroundButton
              variant="primary"
              onClick={handleCreate}
              style={{ flex: 1 }}
            >
              Create Product
            </UndergroundButton>
            <UndergroundButton
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </UndergroundButton>
          </div>
        </div>
      </UndergroundModal>

      <UndergroundModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Product"
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: undergroundTheme.spacing.lg
        }}>
          <UndergroundInput
            type="text"
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <UndergroundInput
            type="text"
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          />

          <UndergroundInput
            type="text"
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
          />

          <UndergroundInput
            type="text"
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />

          <UndergroundInput
            type="number"
            label="Price (₪)"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
          />

          <UndergroundInput
            type="number"
            label="Stock Quantity"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
          />

          <UndergroundInput
            type="text"
            label="Image URL"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          />

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            marginTop: undergroundTheme.spacing.lg
          }}>
            <UndergroundButton
              variant="primary"
              onClick={handleUpdate}
              style={{ flex: 1 }}
            >
              Save Changes
            </UndergroundButton>
            <UndergroundButton
              variant="ghost"
              onClick={() => setShowEditModal(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </UndergroundButton>
          </div>
        </div>
      </UndergroundModal>
    </div>
  );
}
