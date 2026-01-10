import React, { useEffect, useMemo, useState } from 'react';
import type { Product } from '../data/types';
import { undergroundTheme } from '../styles/undergroundTheme';
import { UndergroundCard } from '../components/underground/UndergroundCard';
import { UndergroundButton } from '../components/underground/UndergroundButton';
import { UndergroundInput } from '../components/underground/UndergroundInput';
import { UndergroundStatCard } from '../components/underground/UndergroundStatCard';
import { ProductCard } from '../components/molecules/ProductCard';
import { useCart } from '../hooks/useCart';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

interface CatalogPageProps {
  dataStore: any;
  onNavigate?: (dest: string) => void;
}

interface PlatformProduct extends Product {
  business_name?: string;
  business_name_hebrew?: string;
}

export function CatalogPage({ dataStore, onNavigate }: CatalogPageProps) {
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const { addItem, cart } = useCart();
  const items = cart.items;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        logger.info('[CatalogPage] Loading platform catalog from all public businesses');

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            business:businesses!inner(
              id,
              name,
              name_hebrew,
              is_active
            )
          `)
          .eq('is_active', true)
          .eq('business.is_active', true)
          .order('created_at', { ascending: false });

        if (productsError) {
          logger.error('[CatalogPage] Error loading products:', productsError);
          throw productsError;
        }

        if (mounted && productsData) {
          const formattedProducts: PlatformProduct[] = productsData.map((p: any) => ({
            id: p.id,
            name: p.name,
            name_hebrew: p.name_hebrew,
            description: p.description,
            price: p.price,
            category: p.category || 'General',
            image_url: p.image_url,
            stock_quantity: p.stock_quantity,
            business_id: p.business_id,
            business_name: p.business?.name,
            business_name_hebrew: p.business?.name_hebrew,
            is_active: p.is_active,
            created_at: p.created_at
          }));

          logger.info('[CatalogPage] Loaded platform catalog:', { count: formattedProducts.length });
          setProducts(formattedProducts);
        }
      } catch (err: any) {
        logger.error('[CatalogPage] Exception loading catalog:', err);
        if (mounted) setError(err?.message || 'Failed to load catalog');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    categorySet.add('All');
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        categorySet.add(p.category.trim());
      }
    });
    return Array.from(categorySet);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedBusiness) {
      result = result.filter((p) => p.business_name === selectedBusiness);
    }

    if (category !== 'All') {
      result = result.filter((p) =>
        (p.category || '').trim() === category.trim()
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.name_hebrew || '').toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query) ||
          (p.business_name || '').toLowerCase().includes(query) ||
          (p.business_name_hebrew || '').toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, category, searchQuery, selectedBusiness]);

  const uniqueBusinesses = useMemo(() => {
    const businessMap = new Map<string, { name: string; name_hebrew: string }>();
    products.forEach((p) => {
      if (p.business_name && !businessMap.has(p.business_name)) {
        businessMap.set(p.business_name, {
          name: p.business_name,
          name_hebrew: p.business_name_hebrew || p.business_name
        });
      }
    });
    return Array.from(businessMap.values());
  }, [products]);

  const totalCartItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartValue = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ marginBottom: undergroundTheme.spacing['4xl'] }}>
        <h1 style={{
          fontSize: undergroundTheme.typography.fontSize['4xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          margin: '0 0 8px 0',
          color: undergroundTheme.colors.text.primary,
          textShadow: undergroundTheme.shadows.glow.cyan
        }}>
          🛒 Platform Catalog
        </h1>
        <p style={{
          margin: 0,
          color: undergroundTheme.colors.text.secondary,
          fontSize: undergroundTheme.typography.fontSize.lg
        }}>
          Browse products from all businesses
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: undergroundTheme.spacing.lg,
        marginBottom: undergroundTheme.spacing['4xl']
      }}>
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>📦</span>}
          label="Products"
          value={products.length.toString()}
          accentColor={undergroundTheme.colors.accent.primary}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>🛒</span>}
          label="Cart Items"
          value={totalCartItems.toString()}
          accentColor={undergroundTheme.colors.status.success}
          onClick={() => onNavigate?.('/store/cart')}
          style={{ cursor: 'pointer' }}
        />
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>💰</span>}
          label="Total Value"
          value={`₪${totalCartValue.toFixed(2)}`}
          accentColor={undergroundTheme.colors.status.warning}
          onClick={() => onNavigate?.('/store/cart')}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <UndergroundCard style={{ marginBottom: undergroundTheme.spacing['3xl'] }}>
        <div style={{ marginBottom: undergroundTheme.spacing.lg }}>
          <UndergroundInput
            placeholder="Search products, businesses, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon="🔍"
          />
        </div>

        <div style={{
          display: 'flex',
          gap: undergroundTheme.spacing.xs,
          overflowX: 'auto',
          padding: `${undergroundTheme.spacing.xs} 0`,
          marginBottom: undergroundTheme.spacing.lg,
          WebkitOverflowScrolling: 'touch'
        }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.md}`,
                borderRadius: undergroundTheme.borderRadius.full,
                border: cat === category
                  ? `1px solid ${undergroundTheme.colors.accent.primary}`
                  : `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                background: cat === category
                  ? `${undergroundTheme.colors.accent.primary}20`
                  : undergroundTheme.colors.glassmorphism.light,
                color: cat === category
                  ? undergroundTheme.colors.accent.primary
                  : undergroundTheme.colors.text.secondary,
                fontSize: undergroundTheme.typography.fontSize.sm,
                fontWeight: cat === category ? undergroundTheme.typography.fontWeight.bold : undergroundTheme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: undergroundTheme.transitions.fast,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (cat !== category) {
                  e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.medium;
                  e.currentTarget.style.color = undergroundTheme.colors.text.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (cat !== category) {
                  e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
                  e.currentTarget.style.color = undergroundTheme.colors.text.secondary;
                }
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {uniqueBusinesses.length > 1 && (
          <>
            <div style={{
              paddingTop: undergroundTheme.spacing.md,
              borderTop: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
              marginTop: undergroundTheme.spacing.md
            }}>
              <div style={{
                color: undergroundTheme.colors.text.tertiary,
                marginBottom: undergroundTheme.spacing.sm,
                fontSize: undergroundTheme.typography.fontSize.sm
              }}>
                Filter by Business:
              </div>
              <div style={{
                display: 'flex',
                gap: undergroundTheme.spacing.xs,
                overflowX: 'auto',
                padding: `${undergroundTheme.spacing.xs} 0`,
                WebkitOverflowScrolling: 'touch'
              }}>
                <button
                  onClick={() => setSelectedBusiness(null)}
                  style={{
                    padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.sm}`,
                    borderRadius: undergroundTheme.borderRadius.full,
                    border: !selectedBusiness
                      ? `1px solid ${undergroundTheme.colors.status.success}`
                      : `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                    background: !selectedBusiness
                      ? `${undergroundTheme.colors.status.success}20`
                      : undergroundTheme.colors.glassmorphism.light,
                    color: !selectedBusiness
                      ? undergroundTheme.colors.status.success
                      : undergroundTheme.colors.text.secondary,
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    fontWeight: !selectedBusiness ? undergroundTheme.typography.fontWeight.bold : undergroundTheme.typography.fontWeight.medium,
                    cursor: 'pointer',
                    transition: undergroundTheme.transitions.fast,
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  All Businesses
                </button>
                {uniqueBusinesses.map((business) => (
                  <button
                    key={business.name}
                    onClick={() => setSelectedBusiness(business.name)}
                    style={{
                      padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.sm}`,
                      borderRadius: undergroundTheme.borderRadius.full,
                      border: selectedBusiness === business.name
                        ? `1px solid ${undergroundTheme.colors.status.success}`
                        : `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                      background: selectedBusiness === business.name
                        ? `${undergroundTheme.colors.status.success}20`
                        : undergroundTheme.colors.glassmorphism.light,
                      color: selectedBusiness === business.name
                        ? undergroundTheme.colors.status.success
                        : undergroundTheme.colors.text.secondary,
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      fontWeight: selectedBusiness === business.name ? undergroundTheme.typography.fontWeight.bold : undergroundTheme.typography.fontWeight.medium,
                      cursor: 'pointer',
                      transition: undergroundTheme.transitions.fast,
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {business.name_hebrew || business.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </UndergroundCard>

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: undergroundTheme.spacing['4xl'],
          color: undergroundTheme.colors.text.secondary
        }}>
          <div style={{ fontSize: '48px', marginBottom: undergroundTheme.spacing.md }}>⏳</div>
          <div style={{ fontSize: undergroundTheme.typography.fontSize.lg }}>Loading products...</div>
        </div>
      )}

      {error && (
        <UndergroundCard variant="error">
          <div style={{ textAlign: 'center', padding: undergroundTheme.spacing.xl }}>
            <div style={{ fontSize: '48px', marginBottom: undergroundTheme.spacing.md }}>❌</div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.lg,
              color: undergroundTheme.colors.status.error,
              marginBottom: undergroundTheme.spacing.md
            }}>
              Failed to Load Products
            </div>
            <div style={{
              color: undergroundTheme.colors.text.secondary,
              marginBottom: undergroundTheme.spacing.lg
            }}>
              {error}
            </div>
            <UndergroundButton onClick={() => window.location.reload()}>
              Try Again
            </UndergroundButton>
          </div>
        </UndergroundCard>
      )}

      {!loading && !error && filteredProducts.length === 0 && (
        <UndergroundCard>
          <div style={{ textAlign: 'center', padding: undergroundTheme.spacing['4xl'] }}>
            <div style={{ fontSize: '64px', marginBottom: undergroundTheme.spacing.lg }}>🔍</div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.sm
            }}>
              No Products Found
            </div>
            <div style={{
              color: undergroundTheme.colors.text.secondary,
              marginBottom: undergroundTheme.spacing.lg
            }}>
              Try adjusting your search or filter criteria
            </div>
            {(searchQuery || category !== 'All') && (
              <UndergroundButton
                onClick={() => {
                  setSearchQuery('');
                  setCategory('All');
                }}
              >
                Clear Filters
              </UndergroundButton>
            )}
          </div>
        </UndergroundCard>
      )}

      {!loading && !error && filteredProducts.length > 0 && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: undergroundTheme.spacing.lg,
            padding: `0 ${undergroundTheme.spacing.xs}`
          }}>
            <div style={{
              color: undergroundTheme.colors.text.primary,
              fontWeight: undergroundTheme.typography.fontWeight.semibold,
              fontSize: undergroundTheme.typography.fontSize.lg
            }}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: undergroundTheme.spacing.lg
          }}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(p) => {
                  addItem(p);
                  onNavigate?.('/store/cart');
                }}
                onClick={(p) => {
                  console.log('Product clicked:', p.name);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
