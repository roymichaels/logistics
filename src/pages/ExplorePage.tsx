import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { undergroundTheme } from '../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundInput,
  UndergroundHeader,
  UndergroundLoadingSpinner,
  UndergroundEmptyState,
  UndergroundBadge,
} from '../components/underground';
import { Toast } from '../components/Toast';

interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  logo_url?: string;
  banner_url?: string;
  rating: number;
  total_orders: number;
  is_verified: boolean;
  created_at: string;
}

type ExploreCategory = 'all' | 'food' | 'retail' | 'services' | 'groceries';

export function ExplorePage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>('all');

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    filterBusinesses();
  }, [businesses, searchQuery, activeCategory]);

  const loadBusinesses = async () => {
    try {
      logger.info('[ExplorePage] Loading businesses');

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedBusinesses: Business[] = (data || []).map((biz: any) => ({
        id: biz.id,
        name: biz.name || 'Unnamed Business',
        description: biz.description || '',
        category: biz.category || 'General',
        location: biz.address || 'Location not specified',
        logo_url: biz.logo_url,
        banner_url: biz.banner_url,
        rating: biz.average_rating || 0,
        total_orders: biz.total_orders || 0,
        is_verified: biz.is_verified || false,
        created_at: biz.created_at,
      }));

      logger.info('[ExplorePage] Businesses loaded', { count: formattedBusinesses.length });
      setBusinesses(formattedBusinesses);
    } catch (error: any) {
      logger.error('[ExplorePage] Failed to load businesses', { error });
      Toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const filterBusinesses = () => {
    let filtered = [...businesses];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (biz) =>
          biz.name.toLowerCase().includes(query) ||
          biz.description.toLowerCase().includes(query) ||
          biz.category.toLowerCase().includes(query) ||
          biz.location.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(
        (biz) => biz.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    setFilteredBusinesses(filtered);
  };

  const handleBusinessClick = (businessId: string) => {
    navigate(`/business/${businessId}/preview`);
  };

  const categories: { id: ExploreCategory; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: '🏪' },
    { id: 'food', label: 'Food & Dining', icon: '🍕' },
    { id: 'retail', label: 'Retail', icon: '🛍️' },
    { id: 'services', label: 'Services', icon: '⚙️' },
    { id: 'groceries', label: 'Groceries', icon: '🥬' },
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: undergroundTheme.spacing.lg,
        padding: undergroundTheme.spacing.xl
      }}>
        <UndergroundLoadingSpinner size="large" />
        <div style={{
          fontSize: undergroundTheme.typography.fontSize.lg,
          color: undergroundTheme.colors.text.secondary
        }}>
          Loading businesses...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <UndergroundHeader
          title="Explore Businesses"
          subtitle="Discover local businesses and shops"
          icon="🔍"
        />

        <div style={{
          marginTop: undergroundTheme.spacing['3xl'],
          marginBottom: undergroundTheme.spacing['2xl']
        }}>
          <UndergroundInput
            type="text"
            placeholder="Search businesses, categories, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: undergroundTheme.spacing.xl }}
          />

          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            flexWrap: 'wrap'
          }}>
            {categories.map((cat) => (
              <UndergroundButton
                key={cat.id}
                variant={activeCategory === cat.id ? 'primary' : 'secondary'}
                size="small"
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon} {cat.label}
              </UndergroundButton>
            ))}
          </div>
        </div>

        {filteredBusinesses.length === 0 ? (
          <UndergroundEmptyState
            title="No businesses found"
            description="Try adjusting your search or category filter"
            action={{
              label: 'Clear Filters',
              onClick: () => {
                setSearchQuery('');
                setActiveCategory('all');
              }
            }}
          />
        ) : (
          <>
            <div style={{
              marginBottom: undergroundTheme.spacing.xl,
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.secondary
            }}>
              Showing {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: undergroundTheme.spacing.xl
            }}>
              {filteredBusinesses.map((business) => (
                <UndergroundCard
                  key={business.id}
                  variant="light"
                  hover
                  onClick={() => handleBusinessClick(business.id)}
                  style={{
                    cursor: 'pointer',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Banner/Logo Area */}
                  <div style={{
                    width: '100%',
                    height: '180px',
                    background: business.banner_url
                      ? `url(${business.banner_url}) center/cover`
                      : undergroundTheme.colors.glassmorphism.dark,
                    borderRadius: undergroundTheme.borderRadius.lg,
                    marginBottom: undergroundTheme.spacing.lg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {!business.banner_url && (
                      <div style={{ fontSize: '64px', opacity: 0.3 }}>🏪</div>
                    )}
                    {business.is_verified && (
                      <div style={{
                        position: 'absolute',
                        top: undergroundTheme.spacing.md,
                        right: undergroundTheme.spacing.md
                      }}>
                        <UndergroundBadge variant="success">✓ Verified</UndergroundBadge>
                      </div>
                    )}
                  </div>

                  {/* Business Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{
                      margin: `0 0 ${undergroundTheme.spacing.sm} 0`,
                      fontSize: undergroundTheme.typography.fontSize.xl,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.text.primary
                    }}>
                      {business.name}
                    </h3>

                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.accent.primary,
                      marginBottom: undergroundTheme.spacing.md,
                      fontWeight: undergroundTheme.typography.fontWeight.semibold
                    }}>
                      {business.category}
                    </div>

                    <p style={{
                      margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary,
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {business.description || 'No description available'}
                    </p>

                    <div style={{
                      marginTop: 'auto',
                      paddingTop: undergroundTheme.spacing.md,
                      borderTop: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: undergroundTheme.spacing.sm,
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        <span>📍</span>
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {business.location}
                        </span>
                      </div>

                      {business.rating > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: undergroundTheme.spacing.xs,
                          fontSize: undergroundTheme.typography.fontSize.sm,
                          color: undergroundTheme.colors.status.warning
                        }}>
                          ⭐ {business.rating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {business.total_orders > 0 && (
                      <div style={{
                        marginTop: undergroundTheme.spacing.sm,
                        fontSize: undergroundTheme.typography.fontSize.xs,
                        color: undergroundTheme.colors.text.tertiary,
                        textAlign: 'center'
                      }}>
                        {business.total_orders} {business.total_orders === 1 ? 'order' : 'orders'} completed
                      </div>
                    )}
                  </div>
                </UndergroundCard>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
