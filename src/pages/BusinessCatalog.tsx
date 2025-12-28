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
import { ROYAL_STYLES, ROYAL_COLORS } from '../styles/royalTheme';
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
      <div style={{ ...ROYAL_STYLES.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
        <div style={{ color: ROYAL_COLORS.muted }}>Loading catalog...</div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ ...ROYAL_STYLES.pageTitle, margin: 0 }}>
              {translations.catalog || 'Business Catalog'}
            </h1>
            <p style={{ ...ROYAL_STYLES.pageSubtitle, margin: '4px 0 0 0' }}>
              Manage product visibility in your storefront
            </p>
          </div>
          <button
            onClick={() => onNavigate('/products')}
            style={{
              padding: '12px 20px',
              background: ROYAL_COLORS.gradientPurple,
              border: 'none',
              borderRadius: '12px',
              color: ROYAL_COLORS.textBright,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: ROYAL_COLORS.glowPurple
            }}
          >
            + Add Products
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={ROYAL_STYLES.statBox}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div style={{ ...ROYAL_STYLES.statValue, fontSize: '28px' }}>{stats.total}</div>
            <div style={ROYAL_STYLES.statLabel}>Total Products</div>
          </div>
          <div style={ROYAL_STYLES.statBox}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.success, fontSize: '28px' }}>{stats.published}</div>
            <div style={ROYAL_STYLES.statLabel}>Published</div>
          </div>
          <div style={ROYAL_STYLES.statBox}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
            <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.warning, fontSize: '28px' }}>{stats.draft}</div>
            <div style={ROYAL_STYLES.statLabel}>Draft</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '12px',
              background: ROYAL_COLORS.secondary,
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              borderRadius: '12px',
              color: ROYAL_COLORS.text,
              fontSize: '15px'
            }}
          />

          {(['all', 'published', 'draft'] as const).map(filterOption => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              style={{
                padding: '12px 20px',
                background: filter === filterOption ? ROYAL_COLORS.gradientPurple : ROYAL_COLORS.secondary,
                border: 'none',
                borderRadius: '12px',
                color: filter === filterOption ? ROYAL_COLORS.textBright : ROYAL_COLORS.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {filterOption}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedProducts.size > 0 && (
          <div style={{
            padding: '16px',
            background: ROYAL_COLORS.gradientCard,
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div style={{ color: ROYAL_COLORS.text, fontWeight: '600' }}>
              {selectedProducts.size} products selected
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleBulkToggleVisibility(true)}
                style={{
                  padding: '10px 16px',
                  background: ROYAL_COLORS.success,
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Publish Selected
              </button>
              <button
                onClick={() => handleBulkToggleVisibility(false)}
                style={{
                  padding: '10px 16px',
                  background: ROYAL_COLORS.warning,
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Hide Selected
              </button>
              <button
                onClick={() => setSelectedProducts(new Set())}
                style={{
                  padding: '10px 16px',
                  background: ROYAL_COLORS.secondary,
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '10px',
                  color: ROYAL_COLORS.text,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Select All Row */}
        {filteredProducts.length > 0 && (
          <div style={{
            ...ROYAL_STYLES.card,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer'
          }}
          onClick={handleSelectAll}>
            <input
              type="checkbox"
              checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
              onChange={() => {}}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: ROYAL_COLORS.text, fontWeight: '600' }}>
              Select All ({filteredProducts.length})
            </span>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div style={{ ...ROYAL_STYLES.card, textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
            <div style={{ fontSize: '18px', color: ROYAL_COLORS.text, fontWeight: '600', marginBottom: '8px' }}>
              No products found
            </div>
            <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
              {filter !== 'all' ? 'Try changing your filter' : 'Add products to your inventory first'}
            </div>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div
              key={product.id}
              style={{
                ...ROYAL_STYLES.card,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.3s ease',
                border: selectedProducts.has(product.id)
                  ? `2px solid ${ROYAL_COLORS.accent}`
                  : `1px solid ${ROYAL_COLORS.cardBorder}`
              }}
            >
              <input
                type="checkbox"
                checked={selectedProducts.has(product.id)}
                onChange={() => handleSelectProduct(product.id)}
                style={{ cursor: 'pointer' }}
              />

              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    background: ROYAL_COLORS.secondary
                  }}
                />
              )}

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.text,
                  marginBottom: '4px'
                }}>
                  {product.name}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: ROYAL_COLORS.muted,
                  marginBottom: '8px'
                }}>
                  {product.description?.substring(0, 100)}{product.description && product.description.length > 100 ? '...' : ''}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '13px',
                  color: ROYAL_COLORS.muted
                }}>
                  {product.sku && <span>SKU: {product.sku}</span>}
                  <span>Price: {formatCurrency(product.price || 0)}</span>
                  <span>Stock: {product.stock || 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  padding: '6px 12px',
                  background: (product.is_visible !== false)
                    ? `${ROYAL_COLORS.success}20`
                    : `${ROYAL_COLORS.warning}20`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: (product.is_visible !== false) ? ROYAL_COLORS.success : ROYAL_COLORS.warning
                }}>
                  {(product.is_visible !== false) ? 'Published' : 'Draft'}
                </div>

                <button
                  onClick={() => handleToggleVisibility(product.id, product.is_visible !== false)}
                  disabled={updating}
                  style={{
                    padding: '10px 16px',
                    background: (product.is_visible !== false)
                      ? ROYAL_COLORS.secondary
                      : ROYAL_COLORS.gradientPurple,
                    border: (product.is_visible !== false)
                      ? `1px solid ${ROYAL_COLORS.cardBorder}`
                      : 'none',
                    borderRadius: '10px',
                    color: (product.is_visible !== false) ? ROYAL_COLORS.text : ROYAL_COLORS.textBright,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    opacity: updating ? 0.5 : 1
                  }}
                >
                  {(product.is_visible !== false) ? 'Hide' : 'Publish'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
