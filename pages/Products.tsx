import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, Product, User } from '../data/types';
import { hebrew, formatCurrency } from '../src/lib/hebrew';

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { theme, haptic, backButton, mainButton } = useTelegramUI();

  useEffect(() => {
    loadData();
  }, [filter, searchQuery]);

  useEffect(() => {
    if (selectedProduct) {
      backButton.show(() => setSelectedProduct(null));
    } else if (showCreateForm) {
      backButton.show(() => setShowCreateForm(false));
    } else {
      backButton.hide();
    }
  }, [selectedProduct, showCreateForm]);

  const loadData = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      const productsList = await dataStore.listProducts?.({
        category: filter === 'all' ? undefined : filter,
        q: searchQuery || undefined
      }) || [];
      
      setProducts(productsList);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = () => {
    if (!user || !['manager', 'warehouse'].includes(user.role)) {
      telegram.showAlert('אין לך הרשאה ליצור מוצרים');
      return;
    }
    
    haptic();
    setShowCreateForm(true);
  };

  useEffect(() => {
    if (['manager', 'warehouse'].includes(user?.role || '') && !selectedProduct && !showCreateForm) {
      mainButton.show('הוסף מוצר', handleCreateProduct);
    } else {
      mainButton.hide();
    }
  }, [user, selectedProduct, showCreateForm]);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        טוען מוצרים...
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <CreateProductForm
        dataStore={dataStore}
        onCancel={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false);
          loadData();
        }}
        theme={theme}
      />
    );
  }

  if (selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}
        dataStore={dataStore}
        onBack={() => setSelectedProduct(null)}
        onUpdate={loadData}
        theme={theme}
      />
    );
  }

  const categories = ['all', 'מחשבים', 'אביזרים', 'ציוד משרדי', 'אלקטרוניקה'];

  return (
    <div style={{ 
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '24px', 
          fontWeight: '600'
        }}>
          📦 מוצרים
        </h1>

        {/* Search */}
        <input
          type="text"
          placeholder="חפש מוצרים..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: `1px solid ${theme.hint_color}40`,
            borderRadius: '8px',
            backgroundColor: theme.secondary_bg_color || '#f1f1f1',
            color: theme.text_color,
            fontSize: '16px',
            marginBottom: '16px'
          }}
        />

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                haptic();
                setFilter(category);
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: filter === category ? theme.button_color : theme.secondary_bg_color,
                color: filter === category ? theme.button_text_color : theme.text_color,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {category === 'all' ? 'הכל' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div style={{ padding: '16px' }}>
        {products.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: theme.hint_color
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <p>לא נמצאו מוצרים</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '16px' 
          }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => {
                  haptic();
                  setSelectedProduct(product);
                }}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onClick, theme }: { 
  product: Product; 
  onClick: () => void;
  theme: any;
}) {
  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { color: '#ff3b30', text: 'אזל מהמלאי', icon: '❌' };
    if (quantity < 10) return { color: '#ff9500', text: 'מלאי נמוך', icon: '⚠️' };
    return { color: '#34c759', text: 'במלאי', icon: '✅' };
  };

  const stockStatus = getStockStatus(product.stock_quantity);

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        borderRadius: '12px',
        cursor: 'pointer',
        border: `1px solid ${theme.hint_color}20`
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <h3 style={{ 
          margin: '0 0 4px 0', 
          fontSize: '16px', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          {product.name}
        </h3>
        <p style={{ 
          margin: '0 0 8px 0', 
          fontSize: '12px', 
          color: theme.hint_color,
          fontFamily: 'monospace'
        }}>
          SKU: {product.sku}
        </p>
        <p style={{ 
          margin: '0 0 8px 0', 
          fontSize: '14px', 
          color: theme.hint_color,
          lineHeight: '1.4'
        }}>
          {product.description}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '700',
          color: theme.button_color
        }}>
          {formatCurrency(product.price)}
        </div>
        <div style={{
          padding: '4px 8px',
          borderRadius: '12px',
          backgroundColor: stockStatus.color + '20',
          color: stockStatus.color,
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{stockStatus.icon}</span>
          <span>{stockStatus.text}</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', color: theme.hint_color }}>
          כמות: {product.stock_quantity}
        </div>
        <div style={{ fontSize: '12px', color: theme.hint_color }}>
          {product.warehouse_location}
        </div>
      </div>
    </div>
  );
}

function ProductDetail({ product, dataStore, onBack, onUpdate, theme }: {
  product: Product;
  dataStore: DataStore;
  onBack: () => void;
  onUpdate: () => void;
  theme: any;
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    stock_quantity: product.stock_quantity,
    price: product.price,
    warehouse_location: product.warehouse_location || ''
  });

  const handleUpdate = async () => {
    try {
      await dataStore.updateProduct?.(product.id, formData);
      telegram.hapticFeedback('notification', 'success');
      onUpdate();
      onBack();
    } catch (error) {
      console.error('Failed to update product:', error);
      telegram.showAlert('שגיאה בעדכון המוצר');
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { color: '#ff3b30', text: 'אזל מהמלאי', icon: '❌' };
    if (quantity < 10) return { color: '#ff9500', text: 'מלאי נמוך', icon: '⚠️' };
    return { color: '#34c759', text: 'במלאי', icon: '✅' };
  };

  const stockStatus = getStockStatus(product.stock_quantity);

  return (
    <div style={{ 
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      <h1 style={{ 
        margin: '0 0 24px 0', 
        fontSize: '24px', 
        fontWeight: '600'
      }}>
        פרטי מוצר
      </h1>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
          {product.name}
        </h2>
        <p style={{ margin: '0 0 16px 0', color: theme.hint_color, fontFamily: 'monospace' }}>
          SKU: {product.sku}
        </p>
        
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: stockStatus.color + '20',
          color: stockStatus.color,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <span>{stockStatus.icon}</span>
          <span style={{ fontWeight: '600' }}>{stockStatus.text}</span>
        </div>

        {product.description && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              תיאור
            </h3>
            <p style={{ margin: 0, color: theme.hint_color }}>
              {product.description}
            </p>
          </div>
        )}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '16px',
          marginBottom: '24px'
        }}>
          <InfoCard
            title="מחיר"
            value={formatCurrency(editing ? formData.price : product.price)}
            theme={theme}
            editable={editing}
            type="number"
            onChange={(value) => setFormData({...formData, price: Number(value)})}
          />
          <InfoCard
            title="כמות במלאי"
            value={editing ? formData.stock_quantity.toString() : product.stock_quantity.toString()}
            theme={theme}
            editable={editing}
            type="number"
            onChange={(value) => setFormData({...formData, stock_quantity: Number(value)})}
          />
          <InfoCard
            title="מיקום במחסן"
            value={editing ? formData.warehouse_location : (product.warehouse_location || 'לא צוין')}
            theme={theme}
            editable={editing}
            type="text"
            onChange={(value) => setFormData({...formData, warehouse_location: value})}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {editing ? (
          <>
            <button
              onClick={handleUpdate}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: theme.button_color,
                color: theme.button_text_color,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              שמור שינויים
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'transparent',
                color: theme.hint_color,
                border: `1px solid ${theme.hint_color}`,
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ביטול
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ערוך מוצר
          </button>
        )}
      </div>
    </div>
  );
}

function InfoCard({ title, value, theme, editable, type, onChange }: {
  title: string;
  value: string;
  theme: any;
  editable?: boolean;
  type?: 'text' | 'number';
  onChange?: (value: string) => void;
}) {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '8px'
    }}>
      <div style={{ 
        fontSize: '12px', 
        color: theme.hint_color,
        marginBottom: '4px',
        fontWeight: '600'
      }}>
        {title}
      </div>
      {editable && onChange ? (
        <input
          type={type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '4px',
            border: `1px solid ${theme.hint_color}40`,
            borderRadius: '4px',
            backgroundColor: theme.bg_color,
            color: theme.text_color,
            fontSize: '14px'
          }}
        />
      ) : (
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          {value}
        </div>
      )}
    </div>
  );
}

function CreateProductForm({ dataStore, onCancel, onSuccess, theme }: {
  dataStore: DataStore;
  onCancel: () => void;
  onSuccess: () => void;
  theme: any;
}) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: 0,
    stock_quantity: 0,
    category: 'מחשבים',
    description: '',
    warehouse_location: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.sku) {
      telegram.showAlert('אנא מלא את השדות החובה');
      return;
    }

    setLoading(true);
    try {
      await dataStore.createProduct?.(formData);
      telegram.hapticFeedback('notification', 'success');
      onSuccess();
    } catch (error) {
      console.error('Failed to create product:', error);
      telegram.showAlert('שגיאה ביצירת המוצר');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      <h1 style={{ 
        margin: '0 0 24px 0', 
        fontSize: '24px', 
        fontWeight: '600'
      }}>
        הוסף מוצר חדש
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormField
            label="שם המוצר *"
            type="text"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            theme={theme}
            disabled={loading}
          />

          <FormField
            label="SKU *"
            type="text"
            value={formData.sku}
            onChange={(value) => setFormData({ ...formData, sku: value })}
            theme={theme}
            disabled={loading}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormField
              label="מחיר"
              type="number"
              value={formData.price.toString()}
              onChange={(value) => setFormData({ ...formData, price: Number(value) })}
              theme={theme}
              disabled={loading}
            />

            <FormField
              label="כמות במלאי"
              type="number"
              value={formData.stock_quantity.toString()}
              onChange={(value) => setFormData({ ...formData, stock_quantity: Number(value) })}
              theme={theme}
              disabled={loading}
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '16px', 
              fontWeight: '600' 
            }}>
              קטגוריה
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '8px',
                backgroundColor: theme.secondary_bg_color || '#f1f1f1',
                color: theme.text_color,
                fontSize: '16px'
              }}
              disabled={loading}
            >
              <option value="מחשבים">מחשבים</option>
              <option value="אביזרים">אביזרים</option>
              <option value="ציוד משרדי">ציוד משרדי</option>
              <option value="אלקטרוניקה">אלקטרוניקה</option>
            </select>
          </div>

          <FormField
            label="תיאור"
            type="textarea"
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            theme={theme}
            disabled={loading}
          />

          <FormField
            label="מיקום במחסן"
            type="text"
            value={formData.warehouse_location}
            onChange={(value) => setFormData({ ...formData, warehouse_location: value })}
            theme={theme}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              backgroundColor: loading ? theme.hint_color : theme.button_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px'
            }}
          >
            {loading ? 'יוצר...' : 'צור מוצר'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, type, value, onChange, theme, disabled }: {
  label: string;
  type: 'text' | 'number' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  theme: any;
  disabled?: boolean;
}) {
  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: `1px solid ${theme.hint_color}40`,
    borderRadius: '8px',
    backgroundColor: theme.secondary_bg_color || '#f1f1f1',
    color: theme.text_color,
    fontSize: '16px'
  };

  return (
    <div>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontSize: '16px', 
        fontWeight: '600' 
      }}>
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{
            ...inputStyle,
            resize: 'vertical'
          }}
          disabled={disabled}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
          disabled={disabled}
        />
      )}
    </div>
  );
}