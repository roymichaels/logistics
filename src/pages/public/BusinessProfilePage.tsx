import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { Card } from '../../components/molecules/Card';
import { Text } from '../../components/atoms/Typography';
import { Button } from '../../components/atoms/Button';
import { SearchBar } from '../../components/molecules/SearchBar';
import { ProductCard, ProductCardSkeleton } from '../../components/molecules/ProductCard';
import { EmptyState } from '../../components/molecules/EmptyState';
import { CartDrawer } from '../../components/modern/CartDrawer';
import { useCart } from '../../hooks/useCart';
import { colors, spacing, borderRadius, typography } from '../../styles/design-system';
import type { Product } from '../../data/types';

interface BusinessInfo {
  id: string;
  name: string;
  name_hebrew?: string;
  description?: string;
  tagline?: string;
  logo_url?: string;
  banner_image_url?: string;
  primary_color: string;
  secondary_color: string;
  public_email?: string;
  public_phone?: string;
}

interface BusinessProduct extends Product {
  category_name?: string;
  category_name_hebrew?: string;
}

export function BusinessProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadBusinessProfile();
  }, [slug]);

  const loadBusinessProfile = async () => {
    try {
      setLoading(true);
      logger.info('[BusinessProfilePage] Loading business profile:', slug);

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .eq('status', 'active')
        .maybeSingle();

      if (businessError) throw businessError;
      if (!businessData) {
        setError('Business not found or is not public');
        return;
      }

      setBusiness(businessData as BusinessInfo);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name, name_hebrew)
        `)
        .eq('business_id', businessData.id)
        .eq('is_published', true)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      const transformedProducts = (productsData || []).map((p: any) => ({
        ...p,
        category_name: p.category?.name,
        category_name_hebrew: p.category?.name_hebrew,
      }));

      setProducts(transformedProducts);
      logger.info('[BusinessProfilePage] Loaded business profile:', {
        business: businessData.name,
        productsCount: transformedProducts.length
      });
    } catch (err: any) {
      logger.error('[BusinessProfilePage] Error loading business profile:', err);
      setError(err?.message || 'Failed to load business profile');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const catSet = new Set<string>();
    products.forEach(p => {
      if (p.category_name_hebrew) catSet.add(p.category_name_hebrew);
    });
    return Array.from(catSet);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory) {
      result = result.filter(p => p.category_name_hebrew === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.name_hebrew || '').toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'rgba(18, 18, 20, 0.95)', padding: spacing.xl }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Card style={{ padding: spacing.xl, marginBottom: spacing.lg }}>
            <div style={{ height: '200px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: borderRadius.lg, marginBottom: spacing.lg }} />
            <div style={{ height: '40px', width: '60%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: borderRadius.md, marginBottom: spacing.md }} />
            <div style={{ height: '20px', width: '40%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: borderRadius.md }} />
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing.lg }}>
            <ProductCardSkeleton count={6} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div style={{ minHeight: '100vh', background: 'rgba(18, 18, 20, 0.95)', padding: spacing.xl }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Card>
            <EmptyState
              variant="error"
              title="עסק לא נמצא"
              description={error || 'העסק המבוקש לא קיים או אינו זמין לצפייה ציבורית'}
              action={{
                label: 'חזור לקטלוג הכללי',
                onClick: () => navigate('/store/catalog')
              }}
            />
          </Card>
        </div>
      </div>
    );
  }

  const bannerStyle: React.CSSProperties = {
    background: business.banner_image_url
      ? `url(${business.banner_image_url}) center/cover`
      : `linear-gradient(135deg, ${business.primary_color} 0%, ${business.secondary_color} 100%)`,
    minHeight: '240px',
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    padding: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <>
      <div style={{ minHeight: '100vh', background: 'rgba(18, 18, 20, 0.95)', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: spacing.lg }}>
          <div style={bannerStyle}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
              padding: spacing.lg,
              borderRadius: borderRadius.lg,
            }}>
              {business.logo_url && (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: borderRadius.lg,
                    marginBottom: spacing.md,
                    objectFit: 'cover',
                    border: '2px solid rgba(255, 255, 255, 0.2)'
                  }}
                />
              )}
              <Text variant="h1" style={{ color: 'white', marginBottom: spacing.xs }}>
                {business.name_hebrew || business.name}
              </Text>
              {business.tagline && (
                <Text variant="body" style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: spacing.md }}>
                  {business.tagline}
                </Text>
              )}
              {business.description && (
                <Text variant="caption" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {business.description}
                </Text>
              )}
              {(business.public_email || business.public_phone) && (
                <div style={{ marginTop: spacing.md, display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
                  {business.public_email && (
                    <Text variant="caption" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      📧 {business.public_email}
                    </Text>
                  )}
                  {business.public_phone && (
                    <Text variant="caption" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                      📞 {business.public_phone}
                    </Text>
                  )}
                </div>
              )}
            </div>
          </div>

          <Card style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
            <SearchBar
              placeholder="חיפוש מוצרים..."
              onSearch={setSearchQuery}
              onClear={() => setSearchQuery('')}
              style={{ marginBottom: spacing.md }}
            />

            {categories.length > 0 && (
              <div style={{ display: 'flex', gap: spacing.xs, overflowX: 'auto', paddingTop: spacing.xs }}>
                <button
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: borderRadius.full,
                    border: !selectedCategory ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: !selectedCategory ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: !selectedCategory ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: typography.fontSize.sm,
                    fontWeight: !selectedCategory ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  הכל
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: borderRadius.full,
                      border: selectedCategory === cat ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedCategory === cat ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedCategory === cat ? '#60a5fa' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: typography.fontSize.sm,
                      fontWeight: selectedCategory === cat ? 600 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {filteredProducts.length === 0 ? (
            <Card>
              <EmptyState
                variant="search"
                title="לא נמצאו מוצרים"
                description={searchQuery || selectedCategory ? 'נסה לשנות את קריטריוני החיפוש' : 'העסק עדיין לא הוסיף מוצרים'}
                action={searchQuery || selectedCategory ? {
                  label: 'נקה מסננים',
                  onClick: () => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }
                } : undefined}
              />
            </Card>
          ) : (
            <>
              <div style={{ marginBottom: spacing.md, padding: `0 ${spacing.xs}` }}>
                <Text variant="body" style={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'מוצר' : 'מוצרים'}
                </Text>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: spacing.lg,
              }}>
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(p) => {
                      addItem(p);
                      setCartOpen(true);
                    }}
                    onClick={(p) => logger.info('Product clicked:', p.name)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => navigate('/store/checkout')}
      />
    </>
  );
}
