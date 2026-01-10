import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getBusinessBySlug, getPublicBusinessCatalog, BusinessRecord } from '../../services/business';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { useBusinessContext } from '../../hooks/useBusinessContext';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { UndergroundCard } from '../../components/underground/UndergroundCard';
import { UndergroundButton } from '../../components/underground/UndergroundButton';
import { UndergroundSection } from '../../components/underground/UndergroundSection';
import { UndergroundBadge } from '../../components/underground/UndergroundBadge';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
}

export default function PublicBusinessPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeBusiness } = useBusinessContext();
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user && business && business.owner_id === user.id;

  useEffect(() => {
    const loadBusinessData = async () => {
      if (!slug) {
        setError('Business not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const businessData = await getBusinessBySlug(slug);

        if (!businessData) {
          setError('Business not found or not public');
          setLoading(false);
          return;
        }

        setBusiness(businessData);

        const catalogData = await getPublicBusinessCatalog(businessData.id);
        setProducts(catalogData);
      } catch (err) {
        logger.error('[PublicBusinessPage] Failed to load business data', err);
        setError('Failed to load business information');
      } finally {
        setLoading(false);
      }
    };

    loadBusinessData();
  }, [slug]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: undergroundTheme.spacing.md,
            animation: 'spin 1s linear infinite'
          }}>⏳</div>
          <div style={{
            color: undergroundTheme.colors.text.secondary,
            fontSize: undergroundTheme.typography.fontSize.lg
          }}>
            Loading business...
          </div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: undergroundTheme.colors.gradient.primary,
        padding: undergroundTheme.spacing.xl
      }}>
        <UndergroundCard style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: undergroundTheme.spacing.lg }}>🏪</div>
          <h1 style={{
            margin: `0 0 ${undergroundTheme.spacing.md} 0`,
            fontSize: undergroundTheme.typography.fontSize['3xl'],
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            color: undergroundTheme.colors.text.primary
          }}>
            Business Not Found
          </h1>
          <p style={{
            margin: `0 0 ${undergroundTheme.spacing.xl} 0`,
            color: undergroundTheme.colors.text.secondary,
            fontSize: undergroundTheme.typography.fontSize.md,
            lineHeight: 1.6
          }}>
            {error || 'This business page does not exist or is not public.'}
          </p>
          <UndergroundButton
            onClick={() => navigate('/directory')}
            size="large"
          >
            Browse All Businesses
          </UndergroundButton>
        </UndergroundCard>
      </div>
    );
  }

  const bannerStyle = business.banner_image_url
    ? {
        backgroundImage: `url(${business.banner_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {
        background: `linear-gradient(135deg, ${business.primary_color || undergroundTheme.colors.accent.primary}, ${business.secondary_color || undergroundTheme.colors.accent.secondary})`
      };

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{
        width: '100%',
        height: '280px',
        position: 'relative',
        ...bannerStyle
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.7) 100%)'
        }} />

        {isOwner && (
          <div style={{
            position: 'absolute',
            top: undergroundTheme.spacing.lg,
            right: undergroundTheme.spacing.lg
          }}>
            <UndergroundBadge variant="primary">
              Owner View
            </UndergroundBadge>
          </div>
        )}

        <div style={{
          position: 'absolute',
          bottom: undergroundTheme.spacing.xl,
          left: undergroundTheme.spacing.xl,
          right: undergroundTheme.spacing.xl,
          zIndex: 1
        }}>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(32px, 6vw, 48px)',
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            color: 'white',
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)',
            marginBottom: undergroundTheme.spacing.sm
          }}>
            {business.name}
          </h1>
          {business.description && (
            <p style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize.lg,
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '0 1px 10px rgba(0, 0, 0, 0.6)',
              maxWidth: '600px'
            }}>
              {business.description}
            </p>
          )}
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: undergroundTheme.spacing.xl
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: undergroundTheme.spacing.lg,
          marginBottom: undergroundTheme.spacing['3xl']
        }}>
          {business.address && (
            <UndergroundCard>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: undergroundTheme.spacing.md
              }}>
                <div style={{ fontSize: '28px' }}>📍</div>
                <div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Address
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.md,
                    color: undergroundTheme.colors.text.primary,
                    fontWeight: undergroundTheme.typography.fontWeight.medium
                  }}>
                    {business.address}
                  </div>
                </div>
              </div>
            </UndergroundCard>
          )}

          {business.phone && (
            <UndergroundCard>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: undergroundTheme.spacing.md
              }}>
                <div style={{ fontSize: '28px' }}>📞</div>
                <div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Phone
                  </div>
                  <a
                    href={`tel:${business.phone}`}
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.md,
                      color: undergroundTheme.colors.accent.primary,
                      fontWeight: undergroundTheme.typography.fontWeight.medium,
                      textDecoration: 'none'
                    }}
                  >
                    {business.phone}
                  </a>
                </div>
              </div>
            </UndergroundCard>
          )}

          {business.email && (
            <UndergroundCard>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: undergroundTheme.spacing.md
              }}>
                <div style={{ fontSize: '28px' }}>✉️</div>
                <div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xs,
                    color: undergroundTheme.colors.text.tertiary,
                    marginBottom: undergroundTheme.spacing.xs,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Email
                  </div>
                  <a
                    href={`mailto:${business.email}`}
                    style={{
                      fontSize: undergroundTheme.typography.fontSize.md,
                      color: undergroundTheme.colors.accent.primary,
                      fontWeight: undergroundTheme.typography.fontWeight.medium,
                      textDecoration: 'none'
                    }}
                  >
                    {business.email}
                  </a>
                </div>
              </div>
            </UndergroundCard>
          )}
        </div>

        <UndergroundSection
          title="Our Products"
          icon="🛍️"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          {products.length === 0 ? (
            <UndergroundCard>
              <div style={{
                textAlign: 'center',
                padding: undergroundTheme.spacing['4xl']
              }}>
                <div style={{ fontSize: '64px', marginBottom: undergroundTheme.spacing.lg }}>📦</div>
                <h3 style={{
                  margin: 0,
                  fontSize: undergroundTheme.typography.fontSize.xl,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary,
                  marginBottom: undergroundTheme.spacing.sm
                }}>
                  No products available
                </h3>
                <p style={{
                  margin: 0,
                  color: undergroundTheme.colors.text.secondary
                }}>
                  This business hasn't added any products yet.
                </p>
              </div>
            </UndergroundCard>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: undergroundTheme.spacing.lg
            }}>
              {products.map((product) => (
                <UndergroundCard
                  key={product.id}
                  style={{
                    cursor: 'pointer',
                    transition: undergroundTheme.transitions.standard
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = undergroundTheme.shadows.glow.cyan;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <div style={{
                    width: '100%',
                    height: '200px',
                    borderRadius: undergroundTheme.borderRadius.lg,
                    background: undergroundTheme.colors.glassmorphism.medium,
                    marginBottom: undergroundTheme.spacing.md,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '48px' }}>📦</span>
                    )}
                  </div>

                  <h3 style={{
                    margin: `0 0 ${undergroundTheme.spacing.xs} 0`,
                    fontSize: undergroundTheme.typography.fontSize.lg,
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.text.primary
                  }}>
                    {product.name}
                  </h3>

                  {product.description && (
                    <p style={{
                      margin: `0 0 ${undergroundTheme.spacing.md} 0`,
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary,
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {product.description}
                    </p>
                  )}

                  {product.category && (
                    <div style={{ marginBottom: undergroundTheme.spacing.md }}>
                      <UndergroundBadge variant="secondary" size="small">
                        {product.category}
                      </UndergroundBadge>
                    </div>
                  )}

                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.xl,
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.accent.primary,
                    textShadow: undergroundTheme.shadows.glow.cyan
                  }}>
                    ₪{product.price.toFixed(2)}
                  </div>
                </UndergroundCard>
              ))}
            </div>
          )}
        </UndergroundSection>

        {isOwner && (
          <div style={{
            marginTop: undergroundTheme.spacing['3xl'],
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            justifyContent: 'center'
          }}>
            <UndergroundButton
              variant="primary"
              onClick={() => navigate(`/business/${business.id}/edit`)}
            >
              Edit Business
            </UndergroundButton>
            <UndergroundButton
              variant="secondary"
              onClick={() => navigate(`/business/${business.id}/products`)}
            >
              Manage Products
            </UndergroundButton>
          </div>
        )}
      </div>
    </div>
  );
}
