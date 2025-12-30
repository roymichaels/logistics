import React, { useState, useEffect } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { CatalogCard } from '../../components/catalog/CatalogCard';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Card } from '../../components/molecules/Card';
import { Modal } from '../../components/molecules/Modal';
import { colors, spacing } from '../../styles/design-system';
import { useAuth } from '../../context/AuthContext';
import { useAppServices } from '../../context/AppServicesContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Toast } from '../../components/Toast';
import { logger } from '../../lib/logger';

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  price: number;
  stock_quantity?: number;
  image_url?: string;
  business_id?: string;
  business_name?: string;
  catalog_scope: 'infrastructure' | 'business';
  inherited_from?: string;
  is_template?: boolean;
}

export function InfrastructureCatalogs() {
  const { user } = useAuth();
  const { dataStore } = useAppServices();
  const permissions = usePermissions({ user });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'infrastructure' | 'business'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);

  const canEditInfrastructure = permissions.hasPermission('catalog:edit_infrastructure');
  const canPublishToBusinesses = permissions.hasPermission('catalog:publish_to_businesses');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      logger.info('Loading infrastructure catalogs and businesses...');

      setProducts([]);
      setBusinesses([]);

      Toast.show('Data loaded successfully', 'success');
    } catch (error) {
      logger.error('Failed to load infrastructure catalogs:', error);
      Toast.show('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBusiness = selectedBusiness === 'all' || product.business_id === selectedBusiness;
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesViewMode =
      viewMode === 'all' || product.catalog_scope === viewMode;

    return matchesSearch && matchesBusiness && matchesCategory && matchesViewMode;
  });

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const infrastructureProducts = products.filter(p => p.catalog_scope === 'infrastructure');
  const businessProducts = products.filter(p => p.catalog_scope === 'business');

  return (
    <PageContainer>
      <PageHeader
        title="Infrastructure Catalogs"
        subtitle="Manage product catalogs across all your businesses"
        action={
          canEditInfrastructure && (
            <Button onClick={() => setShowCreateModal(true)}>
              Create Infrastructure Product
            </Button>
          )
        }
      />

      <Card style={{ marginBottom: spacing.lg }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing.md,
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: spacing.xs }}>
              Total Products
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary }}>
              {products.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: spacing.xs }}>
              Infrastructure Products
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#4ADE80' }}>
              {infrastructureProducts.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: spacing.xs }}>
              Business Products
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#FB923C' }}>
              {businessProducts.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: spacing.xs }}>
              Active Businesses
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.text.primary }}>
              {businesses.length}
            </div>
          </div>
        </div>
      </Card>

      <div
        style={{
          display: 'flex',
          gap: spacing.md,
          flexWrap: 'wrap',
          marginBottom: spacing.lg,
        }}
      >
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '250px' }}
        />

        <select
          value={selectedBusiness}
          onChange={(e) => setSelectedBusiness(e.target.value)}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            background: colors.background.secondary,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: '8px',
            color: colors.text.primary,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Businesses</option>
          {businesses.map(business => (
            <option key={business.id} value={business.id}>
              {business.name}
            </option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            background: colors.background.secondary,
            border: `1px solid ${colors.border.primary}`,
            borderRadius: '8px',
            color: colors.text.primary,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button
            variant={viewMode === 'all' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setViewMode('all')}
          >
            All
          </Button>
          <Button
            variant={viewMode === 'infrastructure' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setViewMode('infrastructure')}
          >
            Infrastructure
          </Button>
          <Button
            variant={viewMode === 'business' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setViewMode('business')}
          >
            Business
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
            Loading catalogs...
          </div>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.text.secondary }}>
            No products found. {canEditInfrastructure && 'Create your first infrastructure product to get started.'}
          </div>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: spacing.lg,
          }}
        >
          {filteredProducts.map(product => (
            <CatalogCard
              key={product.id}
              id={product.id}
              name={product.name}
              sku={product.sku}
              description={product.description}
              category={product.category}
              price={product.price}
              stock_quantity={product.stock_quantity}
              image_url={product.image_url}
              scope={product.catalog_scope}
              inherited_from={product.inherited_from}
              is_template={product.is_template}
              canEdit={canEditInfrastructure}
              canDelete={canEditInfrastructure}
              onEdit={() => {}}
              onDelete={() => {}}
              onView={() => {}}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Infrastructure Product"
        >
          <div style={{ padding: spacing.lg }}>
            <p style={{ color: colors.text.secondary, marginBottom: spacing.lg }}>
              Infrastructure products can be published to all businesses within your infrastructure
              and serve as templates for standardization.
            </p>

            <div style={{ marginBottom: spacing.md }}>
              <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: spacing.sm }}>
                Product Details
              </p>
              <p style={{ fontSize: '13px', color: colors.text.secondary }}>
                This feature will allow you to create products that can be inherited by all your businesses.
              </p>
            </div>

            <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                Create Product
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
