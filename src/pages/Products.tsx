import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { DataStore, Product, User } from '../data/types';
import { hebrew, formatCurrency } from '../lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';

interface ProductsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Products({ dataStore, onNavigate }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, [filter, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      const productsList = await (dataStore.listProducts
        ? dataStore.listProducts({
            category: filter === 'all' ? undefined : filter,
            q: searchQuery || undefined
          })
        : Promise.resolve([]));

      setProducts(productsList);
    } catch (error) {
      console.error('Failed to load products:', error);
      telegram.showAlert('שגיאה בטעינת מוצרים');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (productData: Partial<Product>) => {
    try {
      if (!dataStore.createProduct) {
        telegram.showAlert('פעולה זו אינה נתמכת');
        return;
      }

      await dataStore.createProduct(productData as any);
      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('המוצר נוצר בהצלחה');
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to create product:', error);
      telegram.showAlert('שגיאה ביצירת המוצר');
    }
  };

  const handleUpdateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      if (!dataStore.updateProduct) {
        telegram.showAlert('פעולה זו אינה נתמכת');
        return;
      }

      await dataStore.updateProduct(productId, updates);
      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('המוצר עודכן בהצלחה');
      setShowEditModal(false);
      setSelectedProduct(null);
      loadData();
    } catch (error) {
      console.error('Failed to update product:', error);
      telegram.showAlert('שגיאה בעדכון המוצר');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק מוצר זה?');
    if (!confirmed) return;

    try {
      if (!dataStore.supabase) return;

      await dataStore.supabase
        .from('products')
        .delete()
        .eq('id', productId);

      telegram.hapticFeedback('notification', 'success');
      telegram.showAlert('המוצר נמחק');
      loadData();
    } catch (error) {
      console.error('Failed to delete product:', error);
      telegram.showAlert('שגיאה במחיקת המוצר');
    }
  };

  const canManageProducts = user?.role === 'infrastructure_owner' ||
                           user?.role === 'business_owner' ||
                           user?.role === 'manager';

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    if (filter !== 'all' && p.category !== filter) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <p style={{ color: ROYAL_COLORS.muted }}>טוען מוצרים...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
        <h1 style={ROYAL_STYLES.pageTitle}>מוצרים</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          ניהול קטלוג המוצרים
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 חפש מוצר..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={ROYAL_STYLES.input}
        />
      </div>

      {/* Category Filter */}
      {categories.length > 1 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          marginBottom: '20px',
          paddingBottom: '8px'
        }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                padding: '8px 16px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                background: filter === cat ? ROYAL_COLORS.gradientCard : ROYAL_COLORS.cardBg,
                border: `1px solid ${filter === cat ? ROYAL_COLORS.primary : ROYAL_COLORS.cardBorder}`
              }}
            >
              {cat === 'all' ? 'הכל' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Create Button */}
      {canManageProducts && (
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            ...ROYAL_STYLES.buttonPrimary,
            width: '100%',
            marginBottom: '24px'
          }}
        >
          + הוסף מוצר חדש
        </button>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div style={ROYAL_STYLES.emptyState}>
          <div style={ROYAL_STYLES.emptyStateIcon}>📦</div>
          <div style={ROYAL_STYLES.emptyStateText}>
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
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ProductModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProduct}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          onSubmit={(updates) => handleUpdateProduct(selectedProduct.id, updates)}
        />
      )}
    </div>
  );
}

function ProductCard({ product, canManage, onEdit, onDelete }: {
  product: Product;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      ...ROYAL_STYLES.card,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div onClick={() => setExpanded(!expanded)}>
        {/* Product Image */}
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

        {/* Product Info */}
        <div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            color: ROYAL_COLORS.text,
            fontWeight: '600'
          }}>
            {product.name}
          </h3>

          {product.description && (
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              color: ROYAL_COLORS.muted,
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
              color: ROYAL_COLORS.primary
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
                color: ROYAL_COLORS.primary
              }}>
                {product.category}
              </div>
            )}
          </div>

          {product.sku && (
            <div style={{
              fontSize: '12px',
              color: ROYAL_COLORS.muted,
              marginTop: '4px'
            }}>
              SKU: {product.sku}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${ROYAL_COLORS.border}`
        }}>
          {product.barcode && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>ברקוד: </span>
              <span style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>{product.barcode}</span>
            </div>
          )}

          {product.unit && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>יחידת מידה: </span>
              <span style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>{product.unit}</span>
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
                  ...ROYAL_STYLES.buttonSecondary,
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
                style={{
                  ...ROYAL_STYLES.buttonDanger,
                  flex: 0.5
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

function ProductModal({ product, onClose, onSubmit }: {
  product?: Product;
  onClose: () => void;
  onSubmit: (data: Partial<Product>) => void;
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
      telegram.showAlert('אנא הזן שם למוצר');
      return;
    }

    if (formData.price <= 0) {
      telegram.showAlert('אנא הזן מחיר תקין');
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
          backgroundColor: ROYAL_COLORS.cardBg,
          borderRadius: '20px',
          border: `1px solid ${ROYAL_COLORS.cardBorder}`,
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: ROYAL_COLORS.shadowStrong
        }}
      >
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${ROYAL_COLORS.border}`
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: ROYAL_COLORS.text
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
                color: ROYAL_COLORS.text
              }}>
                שם המוצר *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={ROYAL_STYLES.input}
                placeholder="שם המוצר"
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                תיאור
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                style={{
                  ...ROYAL_STYLES.input,
                  resize: 'vertical'
                }}
                placeholder="תיאור המוצר"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}>
                  מחיר *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  style={ROYAL_STYLES.input}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}>
                  קטגוריה
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={ROYAL_STYLES.input}
                  placeholder="קטגוריה"
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
                  color: ROYAL_COLORS.text
                }}>
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  style={ROYAL_STYLES.input}
                  placeholder="SKU"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}>
                  ברקוד
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  style={ROYAL_STYLES.input}
                  placeholder="ברקוד"
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                יחידת מידה
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                style={ROYAL_STYLES.input}
              >
                <option value="יחידה">יחידה</option>
                <option value="ק״ג">ק״ג</option>
                <option value="ליטר">ליטר</option>
                <option value="מארז">מארז</option>
                <option value="קרטון">קרטון</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: ROYAL_COLORS.text
              }}>
                כתובת תמונה (URL)
              </label>
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                style={ROYAL_STYLES.input}
                placeholder="https://..."
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
              />
              <label
                htmlFor="active"
                style={{
                  fontSize: '14px',
                  color: ROYAL_COLORS.text,
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
                ...ROYAL_STYLES.buttonSecondary,
                flex: 1
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              style={{
                ...ROYAL_STYLES.buttonPrimary,
                flex: 2
              }}
            >
              {product ? 'עדכן' : 'צור מוצר'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
