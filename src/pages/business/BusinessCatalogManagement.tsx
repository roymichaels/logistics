import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppServices } from '../../context/AppServicesContext';
import { hasPermission } from '../../lib/permissionEnforcement';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Badge } from '../../components/atoms/Badge';
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
  readOnly?: boolean;
  onNavigate?: (path: string) => void;
}

export function BusinessCatalogManagement({
  businessId: propBusinessId,
  readOnly: propReadOnly = false,
  onNavigate
}: BusinessCatalogManagementProps) {
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

  // Check view permissions - can user see this catalog?
  const canView = useMemo(() => {
    if (!user || !businessId) return false;

    // Infrastructure owner can view any business catalog
    if (user.role === 'infrastructure_owner') {
      return hasPermission(user.role, 'catalog:view_business');
    }

    // Business-level roles can only view their assigned business
    const businessLevelRoles = [
      'business_owner',
      'manager',
      'warehouse',
      'sales',
      'dispatcher',
      'customer_service',
      'accountant'
    ];

    if (businessLevelRoles.includes(user.role)) {
      // Must be assigned to this specific business
      const isAssignedToBusiness = user.business_id === businessId;
      const hasViewPermission = hasPermission(user.role, 'catalog:view_business');

      return isAssignedToBusiness && hasViewPermission;
    }

    return false;
  }, [user, businessId]);

  // Check edit permissions - can user edit this catalog?
  const canEdit = useMemo(() => {
    if (!user || !businessId) return false;

    // Infrastructure owner can edit any business catalog
    if (user.role === 'infrastructure_owner') {
      return hasPermission(user.role, 'catalog:edit_business');
    }

    // Business owner can only edit THEIR OWN business
    if (user.role === 'business_owner') {
      const ownsThisBusiness = user.business_id === businessId;
      const hasEditPermission = hasPermission(user.role, 'catalog:edit_business');

      return ownsThisBusiness && hasEditPermission;
    }

    // Manager can edit assigned business
    if (user.role === 'manager') {
      const isAssignedToBusiness = user.business_id === businessId;
      const hasEditPermission = hasPermission(user.role, 'catalog:edit_business');

      return isAssignedToBusiness && hasEditPermission;
    }

    // All other roles cannot edit
    return false;
  }, [user, businessId]);

  // Determine if this is read-only mode
  const isReadOnly = propReadOnly || !canEdit;

  // Log access attempt for audit trail
  useEffect(() => {
    if (user && businessId) {
      logger.info('[BusinessCatalog] Access attempt', {
        userId: user.id,
        userRole: user.role,
        userBusinessId: user.business_id,
        requestedBusinessId: businessId,
        canView,
        canEdit,
        isReadOnly,
      });

      if (!canView) {
        logger.warn('[BusinessCatalog] Access denied', {
          userId: user.id,
          userRole: user.role,
          userBusinessId: user.business_id,
          requestedBusinessId: businessId,
          reason: 'Insufficient permissions or not assigned to business',
        });
      }
    }
  }, [user, businessId, canView, canEdit, isReadOnly]);

  useEffect(() => {
    if (!businessId) {
      return;
    }
    if (canView) {
      loadProducts();
    }
  }, [businessId, canView]);

  const loadProducts = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const allProducts = dataStore?.getTable?.('business_products') || [];
      const businessProducts = allProducts.filter((p: BusinessProduct) => p.business_id === businessId);
      setProducts(businessProducts);
      logger.info('[BusinessCatalogManagement] Loaded products', {
        businessId,
        count: businessProducts.length,
        readOnly: isReadOnly
      });
    } catch (error) {
      logger.error('[BusinessCatalogManagement] Failed to load products', error);
      Toast.error('Failed to load business catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!businessId || isReadOnly) return;

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

      logger.info('[BusinessCatalog] Product created', {
        productId: newProduct.id,
        businessId,
        userId: user?.id
      });
    } catch (error) {
      logger.error('[BusinessCatalogManagement] Failed to create product', error);
      Toast.error('Failed to create product');
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct || isReadOnly) return;

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

      logger.info('[BusinessCatalog] Product updated', {
        productId: editingProduct.id,
        businessId,
        userId: user?.id
      });
    } catch (error) {
      logger.error('[BusinessCatalogManagement] Failed to update product', error);
      Toast.error('Failed to update product');
    }
  };

  const handleDelete = async (productId: string) => {
    if (isReadOnly) return;
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await dataStore?.from('business_products').delete(productId);
      Toast.success('Product deleted successfully');
      loadProducts();

      logger.info('[BusinessCatalog] Product deleted', {
        productId,
        businessId,
        userId: user?.id
      });
    } catch (error) {
      logger.error('[BusinessCatalogManagement] Failed to delete product', error);
      Toast.error('Failed to delete product');
    }
  };

  const openEditModal = (product: BusinessProduct) => {
    if (isReadOnly) return;

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

  const handlePreview = () => {
    if (onNavigate) {
      onNavigate(`/business/catalog/preview?businessId=${businessId}`);
    } else {
      Toast.info('Preview functionality coming soon');
    }
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

  // No business selected
  if (!businessId) {
    return (
      <PageContainer>
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <h2 style={{ marginBottom: spacing.md }}>No Business Selected</h2>
          <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
            Please select a business to view its catalog.
          </p>
        </Card>
      </PageContainer>
    );
  }

  // Access denied - cannot view at all
  if (!canView) {
    return (
      <PageContainer>
        <Card style={{ padding: spacing.xl, textAlign: 'center' }}>
          <h2 style={{ marginBottom: spacing.md, color: colors.status.error }}>Access Denied</h2>
          <p style={{ marginBottom: spacing.md }}>
            You do not have permission to view this business catalog.
          </p>

          {user?.role === 'business_owner' && user.business_id !== businessId && (
            <p style={{
              color: colors.text.secondary,
              marginTop: spacing.md,
              padding: spacing.md,
              background: colors.status.warningFaded,
              borderRadius: '8px'
            }}>
              As a business owner, you can only manage the catalog for your own business.
              <br />
              Your business ID: {user.business_id}
              <br />
              Requested business ID: {businessId}
            </p>
          )}

          {user?.role === 'manager' && user.business_id !== businessId && (
            <p style={{
              color: colors.text.secondary,
              marginTop: spacing.md,
              padding: spacing.md,
              background: colors.status.warningFaded,
              borderRadius: '8px'
            }}>
              As a manager, you can only manage the catalog for your assigned business.
            </p>
          )}

          {['driver', 'customer', 'user'].includes(user?.role || '') && (
            <p style={{
              color: colors.text.secondary,
              marginTop: spacing.md
            }}>
              Your role does not have access to business catalog management.
            </p>
          )}
        </Card>
      </PageContainer>
    );
  }

  // Render catalog (with or without edit controls based on permissions)
  return (
    <PageContainer>
      {isReadOnly && (
        <Badge
          variant="info"
          style={{
            marginBottom: spacing.md,
            display: 'inline-block',
            padding: `${spacing.sm} ${spacing.md}`,
            fontSize: '0.875rem'
          }}
        >
          Read-Only Access
        </Badge>
      )}

      <PageHeader
        title="Business Catalog"
        subtitle={isReadOnly ? "View products" : "Manage products for this business"}
        actions={
          <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
            <Button
              onClick={handlePreview}
              variant="secondary"
              size="md"
            >
              Preview Catalog
            </Button>
            {!isReadOnly && (
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="primary"
                size="md"
              >
                Add Product
              </Button>
            )}
          </div>
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
            fullWidth={false}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: spacing.sm,
              borderRadius: '8px',
              border: `1px solid ${colors.border.secondary}`,
              background: colors.background.secondary,
              color: colors.text.primary,
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
          <p style={{ marginBottom: spacing.md }}>No products found</p>
          {!isReadOnly && (
            <Button onClick={() => setShowCreateModal(true)} style={{ marginTop: spacing.md }}>
              Add First Product
            </Button>
          )}
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
              <h3 style={{ marginBottom: spacing.sm, fontSize: '1.125rem' }}>{product.name}</h3>
              <p style={{ color: colors.text.tertiary, fontSize: '0.875rem', marginBottom: spacing.sm }}>
                SKU: {product.sku}
              </p>
              <p style={{ fontWeight: 'bold', fontSize: '1.25rem', marginBottom: spacing.md }}>
                ${product.price.toFixed(2)}
              </p>
              <p style={{ fontSize: '0.875rem', marginBottom: spacing.sm }}>
                Stock: {product.stock_quantity}
              </p>
              <Badge
                variant="default"
                style={{
                  fontSize: '0.875rem',
                  marginBottom: spacing.md,
                  display: 'inline-block',
                }}
              >
                {product.category}
              </Badge>

              {!isReadOnly && (
                <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
                  <Button
                    onClick={() => openEditModal(product)}
                    style={{ flex: 1 }}
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(product.id)}
                    variant="danger"
                    style={{ flex: 1 }}
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {!isReadOnly && (
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
              placeholder="Enter product name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <Input
              placeholder="Enter SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              fullWidth
            />
            <Input
              placeholder="Enter category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            />
            <Input
              placeholder="Enter description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
            />
            <Input
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <Input
              type="number"
              placeholder="0"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
              fullWidth
            />
            <Input
              placeholder="https://example.com/image.jpg"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              fullWidth
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
                variant="secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {!isReadOnly && (
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
              placeholder="Enter product name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <Input
              placeholder="Enter SKU"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              fullWidth
            />
            <Input
              placeholder="Enter category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            />
            <Input
              placeholder="Enter description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
            />
            <Input
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              fullWidth
            />
            <Input
              type="number"
              placeholder="0"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
              fullWidth
            />
            <Input
              placeholder="https://example.com/image.jpg"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              fullWidth
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
                variant="secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
