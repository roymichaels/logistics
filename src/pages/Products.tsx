import React, { useState, useEffect, useMemo } from 'react';

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
import { hebrew, formatCurrency } from '../lib/i18n';
import { colors, spacing, commonStyles } from '../styles/design-system';
import { tokens, styles } from '../styles/tokens';
import { Input } from '../components/atoms/Input';
import { logger } from '../lib/logger';
import { useNavigate } from 'react-router-dom';
import { ImageUploadZone } from '../components/atoms/ImageUploadZone';

interface ProductsProps {
  dataStore?: any;
  onNavigate?: (page: string) => void;
}

export function Products({ onNavigate: propOnNavigate }: ProductsProps = {}) {
  const navigate = useNavigate();
  const onNavigate = propOnNavigate || ((path: string) => navigate(path));
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

  // Refetch products when business context changes
  useEffect(() => {
    logger.info('🏢 Products: Business context changed, refetching...', { currentBusinessId });
    refetch();
  }, [currentBusinessId, refetch]);

  const handleCreateProduct = async (productData: Partial<Product>) => {
    Diagnostics.logEvent({ type: 'log', message: 'Creating product', data: productData });

    const result = await createProduct(productData as any);

    if (result.success) {

      Toast.success('המוצר נוצר בהצלחה');
      Diagnostics.logEvent({ type: 'log', message: 'Product created successfully', data: result.data });
      setShowCreateModal(false);
      refetch();
    } else {
      Toast.error(result.error.message || 'שגיאה ביצירת המוצר');
      Diagnostics.logEvent({ type: 'error', message: 'Failed to create product', data: { error: result.error } });
    }
  };

  const handleUpdateProduct = async (productId: string, updates: Partial<Product>) => {
    Diagnostics.logEvent({ type: 'log', message: 'Updating product', data: { productId, updates } });

    const result = await updateProduct(productId, updates as any);

    if (result.success) {

      Toast.success('המוצר עודכן בהצלחה');
      Diagnostics.logEvent({ type: 'log', message: 'Product updated successfully', data: { productId } });
      setShowEditModal(false);
      setSelectedProduct(null);
      refetch();
    } else {
      Toast.error(result.error.message || 'שגיאה בעדכון המוצר');
      Diagnostics.logEvent({ type: 'error', message: 'Failed to update product', data: { error: result.error } });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק מוצר זה?');
    if (!confirmed) return;

    Diagnostics.logEvent({ type: 'log', message: 'Deleting product', data: { productId } });

    const result = await deleteProduct(productId);

    if (result.success) {

      Toast.success('המוצר נמחק');
      Diagnostics.logEvent({ type: 'log', message: 'Product deleted successfully', data: { productId } });
      refetch();
    } else {
      Toast.error(result.error.message || 'שגיאה במחיקת המוצר');
      Diagnostics.logEvent({ type: 'error', message: 'Failed to delete product', data: { error: result.error } });
    }
  };

  const canManageProducts = user?.role === 'infrastructure_owner' ||
                           user?.role === 'business_owner' ||
                           user?.role === 'manager';

  const allCategories = ['all', ...categories];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [products, filter, searchQuery]);

  if (loading && products.length === 0) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={commonStyles.emptyState}>
          <div style={commonStyles.emptyStateIcon}>📦</div>
          <p style={commonStyles.emptyStateText}>טוען מוצרים...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={commonStyles.pageContainer}>
        <div style={commonStyles.emptyState}>
          <div style={commonStyles.emptyStateIcon}>❌</div>
          <p style={commonStyles.emptyStateText}>{error.message || 'שגיאה בטעינת מוצרים'}</p>
          <button
            onClick={refetch}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: tokens.gradients.primary,
              border: 'none',
              borderRadius: '12px',
              color: tokens.colors.textBright,
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={commonStyles.pageContainer}>
      <div style={commonStyles.pageHeader}>
        <div style={commonStyles.emptyStateIcon}>📦</div>
        <h1 style={commonStyles.pageTitle}>מוצרים</h1>
        <p style={commonStyles.pageSubtitle}>
          ניהול קטלוג המוצרים
        </p>
      </div>

      <div style={{ marginBottom: spacing['2xl'] }}>
        <Input
          type="text"
          placeholder="🔍 חפש מוצר..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
        />
      </div>

      {allCategories.length > 1 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          marginBottom: '20px',
          paddingBottom: '8px'
        }}>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => {

                setFilter(cat);
                Diagnostics.logEvent({ type: 'log', message: 'Category filter changed', data: { category: cat } });
              }}
              style={{
                ...styles.button.secondary,
                padding: '8px 16px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                background: filter === cat ? tokens.gradients.card : tokens.colors.background.cardBg,
                border: `1px solid ${filter === cat ? tokens.colors.brand.primary : tokens.colors.background.cardBorder}`
              }}
            >
              {cat === 'all' ? 'הכל' : cat}
            </button>
          ))}
        </div>
      )}

      {canManageProducts && (
        <button
          onClick={() => {

            setShowCreateModal(true);
          }}
          style={{
            ...styles.button.primary,
            width: '100%',
            marginBottom: '24px'
          }}
        >
          + הוסף מוצר חדש
        </button>
      )}

      {filteredProducts.length === 0 ? (
        <div style={styles.emptyState.container}>
          <div style={styles.emptyState.containerIcon}>📦</div>
          <div style={styles.emptyState.containerText}>
            {searchQuery ? 'לא נמצאו מוצרים' : 'אין מוצרים להצגה'}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
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
        <ProductModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProduct}
          loading={creating}
        />
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

function ProductCard({ product, canManage, onEdit, onDelete, deleting }: {
  product: Product;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      ...styles.card,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div onClick={() => setExpanded(!expanded)}>
        {product.image_url && (
          <div style={{
            width: '100%',
            height: '180px',
            borderRadius: '12px',
            marginBottom: '12px',
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.05)'
          }}>
            <img
              src={product.image_url}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        )}

        <div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            color: tokens.colors.text,
            fontWeight: '600'
          }}>
            {product.name}
          </h3>

          {product.description && (
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              color: tokens.colors.subtle,
              lineHeight: '1.4'
            }}>
              {product.description}
            </p>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: tokens.colors.brand.primary
            }}>
              {formatCurrency(product.price)}
            </div>

            {product.category && (
              <div style={{
                padding: '4px 12px',
                borderRadius: '12px',
                background: 'rgba(138, 43, 226, 0.2)',
                border: '1px solid rgba(138, 43, 226, 0.4)',
                fontSize: '12px',
                fontWeight: '600',
                color: tokens.colors.brand.primary
              }}>
                {product.category}
              </div>
            )}
          </div>

          {product.sku && (
            <div style={{
              fontSize: '12px',
              color: tokens.colors.subtle,
              marginTop: '4px'
            }}>
              SKU: {product.sku}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${tokens.colors.border.default}`
        }}>
          {product.barcode && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: tokens.colors.subtle }}>ברקוד: </span>
              <span style={{ fontSize: '14px', color: tokens.colors.text }}>{product.barcode}</span>
            </div>
          )}

          {product.unit && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: tokens.colors.subtle }}>יחידת מידה: </span>
              <span style={{ fontSize: '14px', color: tokens.colors.text }}>{product.unit}</span>
            </div>
          )}

          {canManage && (
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={{
                  ...styles.button.secondary,
                  flex: 1
                }}
              >
                ערוך
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={deleting}
                style={{
                  ...styles.button.danger,
                  flex: 0.5,
                  opacity: deleting ? 0.5 : 1,
                  cursor: deleting ? 'not-allowed' : 'pointer'
                }}
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onSubmit, loading }: {
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
    unit: product?.unit || 'יחידה',
    image_url: product?.image_url || '',
    active: product?.active !== undefined ? product.active : true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {

      return;
    }

    if (formData.price <= 0) {

      return;
    }

    onSubmit(formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        direction: 'rtl',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: tokens.colors.background.cardBg,
          borderRadius: '20px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: tokens.shadows.mdStrong
        }}
      >
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${tokens.colors.border.default}`
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: tokens.colors.text
          }}>
            {product ? 'ערוך מוצר' : 'הוסף מוצר חדש'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text
              }}>
                שם המוצר *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
                placeholder="שם המוצר"
                disabled={loading}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text
              }}>
                תיאור
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  ...styles.input,
                  resize: 'vertical'
                }}
                placeholder="תיאור המוצר"
                disabled={loading}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  מחיר *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  style={styles.input}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  קטגוריה
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={styles.input}
                  placeholder="קטגוריה"
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  style={styles.input}
                  placeholder="SKU"
                  disabled={loading}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  ברקוד
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  style={styles.input}
                  placeholder="ברקוד"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: tokens.colors.text
              }}>
                יחידת מידה
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                style={styles.input}
                disabled={loading}
              >
                <option value="יחידה">יחידה</option>
                <option value="ק״ג">ק״ג</option>
                <option value="ליטר">ליטר</option>
                <option value="מארז">מארז</option>
                <option value="קרטון">קרטון</option>
              </select>
            </div>

            <div>
              <ImageUploadZone
                uploadType="product"
                currentImageUrl={formData.image_url}
                onImageSelect={(file) => {
                  logger.info('Product image file selected', { fileName: file.name });
                }}
                label="תמונת מוצר"
                helperText="תמונה מרובעת מומלצת, עד 5MB"
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer'
                }}
                disabled={loading}
              />
              <label
                htmlFor="active"
                style={{
                  fontSize: '14px',
                  color: tokens.colors.text,
                  cursor: 'pointer'
                }}
              >
                מוצר פעיל
              </label>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '24px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...styles.button.secondary,
                flex: 1
              }}
              disabled={loading}
            >
              ביטול
            </button>
            <button
              type="submit"
              style={{
                ...styles.button.primary,
                flex: 2,
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              disabled={loading}
            >
              {loading ? 'שומר...' : (product ? 'עדכן' : 'צור מוצר')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
