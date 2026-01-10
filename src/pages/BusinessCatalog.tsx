import React, { useState, useEffect, useMemo } from 'react';
import { useCatalog, useUpdateProduct } from '../application/use-cases';
import { useApp } from '../application/hooks/useApp';
import { useAuth } from '../context/AuthContext';
import { useAppServices } from '../context/AppServicesContext';
import { useLanguage } from '../context/LanguageContext';
import { Diagnostics } from '../foundation/diagnostics/DiagnosticsStore';
import { Toast } from '../components/Toast';
import { logger } from '../lib/logger';
import { useNavigate } from 'react-router-dom';
import { undergroundTheme } from '../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundHeader,
  UndergroundSection,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
  UndergroundStatCard,
  UndergroundInput,
  UndergroundBadge
} from '../components/underground';
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        padding: undergroundTheme.spacing.xl
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <UndergroundHeader
        title={translations.catalog || '🏪 Business Catalog'}
        subtitle="Manage product visibility in your storefront"
        action={
          <UndergroundButton
            variant="primary"
            onClick={() => onNavigate('/products')}
          >
            <span style={{ marginRight: undergroundTheme.spacing.sm }}>+</span>
            Add Products
          </UndergroundButton>
        }
      />

      <UndergroundSection style={{ marginTop: undergroundTheme.spacing['3xl'] }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: undergroundTheme.spacing.lg,
          marginBottom: undergroundTheme.spacing['3xl']
        }}>
          <UndergroundStatCard
            icon="📦"
            label="Total Products"
            value={stats.total.toString()}
          />
          <UndergroundStatCard
            icon="✅"
            label="Published"
            value={stats.published.toString()}
            accentColor={undergroundTheme.colors.status.success}
          />
          <UndergroundStatCard
            icon="📝"
            label="Draft"
            value={stats.draft.toString()}
            accentColor={undergroundTheme.colors.status.warning}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: undergroundTheme.spacing.md,
          marginBottom: undergroundTheme.spacing.xl,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <UndergroundInput
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: '1 1 300px', minWidth: '200px' }}
          />

          <div style={{ display: 'flex', gap: undergroundTheme.spacing.sm, flexWrap: 'wrap' }}>
            {(['all', 'published', 'draft'] as const).map(filterOption => (
              <UndergroundButton
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                variant={filter === filterOption ? 'primary' : 'secondary'}
                size="small"
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </UndergroundButton>
            ))}
          </div>
        </div>

        {selectedProducts.size > 0 && (
          <UndergroundCard
            variant="darker"
            style={{
              marginBottom: undergroundTheme.spacing.xl,
              border: `1px solid ${undergroundTheme.colors.primary.cyan}`,
              boxShadow: undergroundTheme.shadows.glow.cyan
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: undergroundTheme.spacing.md
            }}>
              <div style={{
                color: undergroundTheme.colors.text.primary,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                fontSize: undergroundTheme.typography.fontSize.lg,
                textShadow: undergroundTheme.shadows.glow.text
              }}>
                ✓ {selectedProducts.size} products selected
              </div>
              <div style={{ display: 'flex', gap: undergroundTheme.spacing.sm, flexWrap: 'wrap' }}>
                <UndergroundButton
                  onClick={() => handleBulkToggleVisibility(true)}
                  variant="primary"
                  size="small"
                >
                  Publish Selected
                </UndergroundButton>
                <UndergroundButton
                  onClick={() => handleBulkToggleVisibility(false)}
                  variant="secondary"
                  size="small"
                >
                  Hide Selected
                </UndergroundButton>
                <UndergroundButton
                  onClick={() => setSelectedProducts(new Set())}
                  variant="danger"
                  size="small"
                >
                  Clear
                </UndergroundButton>
              </div>
            </div>
          </UndergroundCard>
        )}
      </UndergroundSection>

      <UndergroundSection>
        {filteredProducts.length > 0 && (
          <UndergroundCard
            variant="light"
            hover
            onClick={handleSelectAll}
            style={{
              marginBottom: undergroundTheme.spacing.md,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: undergroundTheme.spacing.md }}>
              <input
                type="checkbox"
                checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                onChange={() => {}}
                style={{
                  cursor: 'pointer',
                  width: '18px',
                  height: '18px',
                  accentColor: undergroundTheme.colors.primary.cyan
                }}
              />
              <span style={{
                color: undergroundTheme.colors.text.primary,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                fontSize: undergroundTheme.typography.fontSize.md
              }}>
                Select All ({filteredProducts.length})
              </span>
            </div>
          </UndergroundCard>
        )}

        {filteredProducts.length === 0 ? (
          <UndergroundEmptyState
            icon="📦"
            title="No products found"
            description={filter !== 'all' ? 'Try changing your filter' : 'Add products to your inventory first'}
            action={
              filter === 'all' ? (
                <UndergroundButton
                  variant="primary"
                  onClick={() => onNavigate('/products')}
                >
                  Add Your First Product
                </UndergroundButton>
              ) : undefined
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            {filteredProducts.map(product => (
              <UndergroundCard
                key={product.id}
                variant={selectedProducts.has(product.id) ? 'darker' : 'light'}
                hover
                style={{
                  borderColor: selectedProducts.has(product.id) ? undergroundTheme.colors.primary.cyan : undefined,
                  borderWidth: selectedProducts.has(product.id) ? '2px' : undefined,
                  boxShadow: selectedProducts.has(product.id) ? undergroundTheme.shadows.glow.cyan : undefined
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: undergroundTheme.spacing.lg,
                  flexWrap: 'wrap'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => handleSelectProduct(product.id)}
                    style={{
                      cursor: 'pointer',
                      width: '18px',
                      height: '18px',
                      accentColor: undergroundTheme.colors.primary.cyan
                    }}
                  />

                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{
                        width: '64px',
                        height: '64px',
                        objectFit: 'cover',
                        borderRadius: undergroundTheme.borderRadius.lg,
                        background: undergroundTheme.colors.surface.darker,
                        border: `1px solid ${undergroundTheme.colors.border.subtle}`,
                        boxShadow: undergroundTheme.shadows.sm
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '64px',
                      height: '64px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: undergroundTheme.borderRadius.lg,
                      background: undergroundTheme.colors.surface.darker,
                      border: `1px solid ${undergroundTheme.colors.border.subtle}`,
                      fontSize: '32px'
                    }}>
                      📦
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.lg,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs,
                      textShadow: undergroundTheme.shadows.glow.text
                    }}>
                      {product.name}
                    </div>
                    {product.description && (
                      <div style={{
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.secondary,
                        marginBottom: undergroundTheme.spacing.sm,
                        lineHeight: undergroundTheme.typography.lineHeight.normal
                      }}>
                        {product.description.substring(0, 100)}{product.description.length > 100 ? '...' : ''}
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      gap: undergroundTheme.spacing.lg,
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary,
                      flexWrap: 'wrap',
                      fontFamily: 'monospace'
                    }}>
                      {product.sku && <span>SKU: {product.sku}</span>}
                      <span style={{
                        color: undergroundTheme.colors.primary.cyan,
                        fontWeight: undergroundTheme.typography.fontWeight.semibold
                      }}>
                        Price: {formatCurrency(product.price || 0)}
                      </span>
                      <span>Stock: {product.stock || 0}</span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: undergroundTheme.spacing.sm,
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <UndergroundBadge
                      variant={(product.is_visible !== false) ? 'success' : 'warning'}
                    >
                      {(product.is_visible !== false) ? '✅ Published' : '📝 Draft'}
                    </UndergroundBadge>

                    <UndergroundButton
                      onClick={() => handleToggleVisibility(product.id, product.is_visible !== false)}
                      disabled={updating}
                      variant={(product.is_visible !== false) ? 'secondary' : 'primary'}
                      size="small"
                    >
                      {(product.is_visible !== false) ? 'Hide' : 'Publish'}
                    </UndergroundButton>
                  </div>
                </div>
              </UndergroundCard>
            ))}
          </div>
        )}
      </UndergroundSection>
    </div>
  );
}
