import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppServices } from '../../context/AppServicesContext';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Modal } from '../../components/molecules/Modal';
import { colors, spacing } from '../../styles/design-system';

interface BusinessProduct {
  id: string;
  business_id: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  catalog_type: 'business';
  created_at: string;
  updated_at: string;
}

interface BusinessCatalogManagementProps {
  businessId?: string;
}

export function BusinessCatalogManagement({ businessId: propBusinessId }: BusinessCatalogManagementProps) {
  const { user } = useAuth();
  const { dataStore, currentBusinessId } = useAppServices();
  const businessId = propBusinessId || currentBusinessId;

  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BusinessProduct | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    price: 0,
    stock_quantity: 0,
    image_url: '',
  });

  // Check permissions
  const canManageBusinessCatalog =
    ['business_owner', 'manager', 'infrastructure_owner'].includes(user?.role || '') && businessId;

  useEffect(() => {
    if (!businessId) {
      Toast.error('No business selected');
      return;
    }
    if (!canManageBusinessCatalog) {
      Toast.error('You do not have permission to manage this business catalog');
      return;
    }
    loadProducts();
  }, [businessId, canManageBusinessCatalog]);

  const loadProducts = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const allProducts = dataStore?.getTable?.('business_products') || [];
      const businessProducts = allProducts.filter((p: BusinessProduct) => p.business_id === businessId);
      setProducts(businessProducts);
      logger.info('[BusinessCatalogManagement] Loaded products', { businessId, count: businessProducts.length });
    } catch (error) {
      logger.error('[BusinessCatalogManagement] Failed to load products', error);
      Toast.error('Failed to load business catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!businessId) return;

    try {
      const newProduct: BusinessProduct = {
        id: `biz-prod-${Date.now()}`,
        business_id: businessId,
        ...formData,
        catalog_type: 'business',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await dataStore?.from('business_products').insert(newProduct);
      Toast.success('Product created successfully');
      setShowCreateModal(false);
      resetForm();
      loadProducts();
    } catch (error) {
      logger.error('[BusinessCatalogManagement] Failed to create product', error);
      Toast.error('Failed to create product');
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;

    try {
      await dataStore?.from('business_products').update(editingProduct.id, {
        ...formData,
        updated_at: new Date().toISOString(),
      });
      Toast.success('Product updated successfully');
      setShowEditModal(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
    } catch (error) {
      logger.error('[BusinessCatalogManagement] Failed to update product', error);
      Toast.error('Failed to update product');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await dataStore?.from('business_products').delete(productId);
      Toast.success('Product deleted successfully');
      loadProducts();
    } catch (error) {
      logger.error('[BusinessCatalogManagement] Failed to delete product', error);
      Toast.error('Failed to delete product');
    }
  };

  const openEditModal = (product: BusinessProduct) => {
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

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      category: '',
      price: 0,
      stock_quantity: 0,
      image_url: '',
    });
  };

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(products.map((p) => p.category))];

  if (!businessId) {
    return (
      <PageContainer>
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <h2>No Business Selected</h2>
          <p>Please select a business to manage its catalog.</p>
        </Card>
      </PageContainer>
    );
  }

  if (!canManageBusinessCatalog) {
    return (
      <PageContainer>
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to manage this business catalog.</p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Business Catalog"
        subtitle={`Manage products for this business`}
        actions={
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            Add Product
          </Button>
        }
      />

      {/* Filters */}
      <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: spacing.sm,
              borderRadius: '8px',
              border: `1px solid ${colors.gray[300]}`,
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <p>Loading products...</p>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <p>No products found</p>
          <Button onClick={() => setShowCreateModal(true)} style={{ marginTop: spacing.md }}>
            Add First Product
          </Button>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: spacing.lg,
          }}
        >
          {filteredProducts.map((product) => (
            <Card key={product.id} style={{ padding: spacing.lg }}>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginBottom: spacing.md,
                  }}
                />
              )}
              <h3 style={{ marginBottom: spacing.sm }}>{product.name}</h3>
              <p style={{ color: colors.gray[600], fontSize: '0.875rem', marginBottom: spacing.sm }}>
                SKU: {product.sku}
              </p>
              <p style={{ fontWeight: 'bold', fontSize: '1.25rem', marginBottom: spacing.md }}>
                ${product.price.toFixed(2)}
              </p>
              <p style={{ fontSize: '0.875rem', marginBottom: spacing.sm }}>
                Stock: {product.stock_quantity}
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  padding: `${spacing.xs} ${spacing.sm}`,
                  backgroundColor: colors.blue[100],
                  color: colors.blue[700],
                  borderRadius: '4px',
                  display: 'inline-block',
                  marginBottom: spacing.md,
                }}
              >
                {product.category}
              </p>
              <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
                <Button onClick={() => openEditModal(product)} style={{ flex: 1 }}>
                  Edit
                </Button>
                <Button onClick={() => handleDelete(product.id)} variant="danger" style={{ flex: 1 }}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modals (same as PlatformCatalog) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Product"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Input
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
          />
          <Input
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="Enter SKU"
          />
          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Enter category"
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter description"
            multiline
          />
          <Input
            label="Price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
          <Input
            label="Stock Quantity"
            type="number"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
          <Input
            label="Image URL"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />
          <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
            <Button onClick={handleCreate} variant="primary" style={{ flex: 1 }}>
              Create Product
            </Button>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
          resetForm();
        }}
        title="Edit Product"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Input
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
          />
          <Input
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="Enter SKU"
          />
          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Enter category"
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter description"
            multiline
          />
          <Input
            label="Price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
          <Input
            label="Stock Quantity"
            type="number"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
          <Input
            label="Image URL"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />
          <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
            <Button onClick={handleUpdate} variant="primary" style={{ flex: 1 }}>
              Update Product
            </Button>
            <Button
              onClick={() => {
                setShowEditModal(false);
                setEditingProduct(null);
                resetForm();
              }}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
