import React, { useState, useEffect, useMemo } from 'react';
import { useCatalog, useUpdateProduct } from '../application/use-cases';
import { useApp } from '../application/services/useApp';
import { useAuth } from '../context/AuthContext';
import { useAppServices } from '../context/AppServicesContext';
import { useLanguage } from '../context/LanguageContext';
import { Diagnostics } from '../foundation/diagnostics/DiagnosticsStore';
import { Toast } from '../components/Toast';
import { logger } from '../lib/logger';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, typography, borderRadius, shadows, transitions } from '../styles/design-system';
import { MetricCard, MetricGrid } from '../components/dashboard/MetricCard';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Badge } from '../components/atoms/Badge';
import type { Product } from '../application/queries/catalog.queries';

interface BusinessCatalogProps {
  dataStore?: any;
  onNavigate?: (page: string) => void;
}

export function BusinessCatalog({ onNavigate: propOnNavigate }: BusinessCatalogProps = {}) {
  const navigate = useNavigate();
  const onNavigate = propOnNavigate || ((path: string) => navigate(path));
  const { t: translations, isRTL, formatCurrency } = useLanguage();

  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const app = useApp();
  const { user } = useAuth();
  const { currentBusinessId } = useAppServices();

  const { products, loading, error, refetch } = useCatalog({
    business_id: currentBusinessId || undefined,
    search: searchQuery || undefined,
  });

  const { updateProduct, loading: updating } = useUpdateProduct();

  useEffect(() => {
    const unsubscribe = app.events?.on('ProductUpdated', () => {
      Diagnostics.logEvent({ type: 'domain_event', message: 'ProductUpdated received, refetching products' });
      refetch();
    });

    return () => {
      unsubscribe?.();
    };
  }, [app.events, refetch]);

  useEffect(() => {
    logger.info('🏢 Catalog: Business context changed, refetching...', { currentBusinessId });
    refetch();
  }, [currentBusinessId, refetch]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (filter === 'published') {
      filtered = filtered.filter(p => p.is_visible !== false);
    } else if (filter === 'draft') {
      filtered = filtered.filter(p => p.is_visible === false);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, filter, searchQuery]);

  const handleToggleVisibility = async (productId: string, currentVisibility: boolean) => {
    const newVisibility = !currentVisibility;

    const result = await updateProduct(productId, { is_visible: newVisibility });

    if (result.success) {
      Toast.success(newVisibility ? 'Product published to catalog' : 'Product hidden from catalog');
      refetch();
    } else {
      Toast.error('Failed to update product visibility');
    }
  };

  const handleBulkToggleVisibility = async (visibility: boolean) => {
    const productIds = Array.from(selectedProducts);

    for (const productId of productIds) {
      await updateProduct(productId, { is_visible: visibility });
    }

    Toast.success(`${productIds.length} products updated`);
    setSelectedProducts(new Set());
    refetch();
  };

  const handleSelectProduct = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const stats = useMemo(() => ({
    total: products.length,
    published: products.filter(p => p.is_visible !== false).length,
    draft: products.filter(p => p.is_visible === false).length,
  }), [products]);

  if (loading && products.length === 0) {
    return (
      <div style={{
        padding: spacing['3xl'],
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: spacing.lg }}>📦</div>
        <div style={{ color: colors.text.secondary, fontSize: typography.fontSize.lg }}>Loading catalog...</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: spacing['3xl'],
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing['2xl'],
          flexWrap: 'wrap',
          gap: spacing.lg
        }}>
          <div>
            <h1 style={{
              fontSize: typography.fontSize['3xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              margin: 0,
              marginBottom: spacing.sm
            }}>
              {translations.catalog || 'Business Catalog'}
            </h1>
            <p style={{
              fontSize: typography.fontSize.base,
              color: colors.text.secondary,
              margin: 0
            }}>
              Manage product visibility in your storefront
            </p>
          </div>
          <Button
            onClick={() => onNavigate('/products')}
            variant="primary"
            size="md"
            leftIcon={<span>+</span>}
          >
            Add Products
          </Button>
        </div>

        {/* Stats */}
        <MetricGrid columns={3}>
          <MetricCard
            icon="📦"
            label="Total Products"
            value={stats.total}
            variant="default"
          />
          <MetricCard
            icon="✅"
            label="Published"
            value={stats.published}
            variant="success"
          />
          <MetricCard
            icon="📝"
            label="Draft"
            value={stats.draft}
            variant="warning"
          />
        </MetricGrid>

        {/* Filters and Search */}
        <div style={{
          display: 'flex',
          gap: spacing.md,
          marginBottom: spacing.xl,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ flex: '1 1 300px', minWidth: '200px' }}>
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
            />
          </div>

          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
            {(['all', 'published', 'draft'] as const).map(filterOption => (
              <Button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                variant={filter === filterOption ? 'primary' : 'secondary'}
                size="md"
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.size > 0 && (
          <Card
            variant="elevated"
            style={{
              marginBottom: spacing.xl,
              padding: spacing.xl,
              background: colors.ui.highlight
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: spacing.md
            }}>
              <div style={{
                color: colors.text.primary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base
              }}>
                {selectedProducts.size} products selected
              </div>
              <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Button
                  onClick={() => handleBulkToggleVisibility(true)}
                  variant="primary"
                  size="sm"
                >
                  Publish Selected
                </Button>
                <Button
                  onClick={() => handleBulkToggleVisibility(false)}
                  variant="secondary"
                  size="sm"
                >
                  Hide Selected
                </Button>
                <Button
                  onClick={() => setSelectedProducts(new Set())}
                  variant="secondary"
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Product List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {/* Select All Row */}
        {filteredProducts.length > 0 && (
          <Card
            variant="outlined"
            hoverable
            interactive
            onClick={handleSelectAll}
            style={{
              padding: spacing.lg,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <input
                type="checkbox"
                checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                onChange={() => {}}
                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
              />
              <span style={{
                color: colors.text.primary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base
              }}>
                Select All ({filteredProducts.length})
              </span>
            </div>
          </Card>
        )}

        {filteredProducts.length === 0 ? (
          <Card variant="outlined" style={{ textAlign: 'center', padding: spacing['3xl'] }}>
            <div style={{ fontSize: '64px', marginBottom: spacing.lg, opacity: 0.5 }}>📦</div>
            <div style={{
              fontSize: typography.fontSize.xl,
              color: colors.text.primary,
              fontWeight: typography.fontWeight.semibold,
              marginBottom: spacing.sm
            }}>
              No products found
            </div>
            <div style={{ fontSize: typography.fontSize.base, color: colors.text.secondary }}>
              {filter !== 'all' ? 'Try changing your filter' : 'Add products to your inventory first'}
            </div>
          </Card>
        ) : (
          filteredProducts.map(product => (
            <Card
              key={product.id}
              variant={selectedProducts.has(product.id) ? 'elevated' : 'outlined'}
              hoverable
              style={{
                padding: spacing.lg,
                borderColor: selectedProducts.has(product.id) ? colors.brand.primary : undefined,
                borderWidth: selectedProducts.has(product.id) ? '2px' : undefined,
                transition: transitions.normal
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.lg,
                flexWrap: 'wrap'
              }}>
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product.id)}
                  onChange={() => handleSelectProduct(product.id)}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />

                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      objectFit: 'cover',
                      borderRadius: borderRadius.md,
                      background: colors.background.secondary,
                      border: `1px solid ${colors.border.primary}`
                    }}
                  />
                ) : (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: borderRadius.md,
                    background: colors.background.secondary,
                    border: `1px solid ${colors.border.primary}`,
                    fontSize: '32px'
                  }}>
                    📦
                  </div>
                )}

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text.primary,
                    marginBottom: spacing.xs
                  }}>
                    {product.name}
                  </div>
                  {product.description && (
                    <div style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      marginBottom: spacing.sm,
                      lineHeight: typography.lineHeight.normal
                    }}>
                      {product.description.substring(0, 100)}{product.description.length > 100 ? '...' : ''}
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    gap: spacing.lg,
                    fontSize: typography.fontSize.sm,
                    color: colors.text.tertiary,
                    flexWrap: 'wrap'
                  }}>
                    {product.sku && <span>SKU: {product.sku}</span>}
                    <span>Price: {formatCurrency(product.price || 0)}</span>
                    <span>Stock: {product.stock || 0}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: spacing.sm,
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <Badge
                    variant={(product.is_visible !== false) ? 'success' : 'warning'}
                    size="md"
                  >
                    {(product.is_visible !== false) ? 'Published' : 'Draft'}
                  </Badge>

                  <Button
                    onClick={() => handleToggleVisibility(product.id, product.is_visible !== false)}
                    disabled={updating}
                    variant={(product.is_visible !== false) ? 'secondary' : 'primary'}
                    size="sm"
                  >
                    {(product.is_visible !== false) ? 'Hide' : 'Publish'}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
