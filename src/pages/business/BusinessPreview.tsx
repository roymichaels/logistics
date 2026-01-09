import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBusiness, getPublicBusinessCatalog, BusinessRecord } from '../../services/business';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { logger } from '../../lib/logger';
import { Card } from '../../components/molecules/Card';
import { ProductCard, ProductCardSkeleton } from '../../components/molecules/ProductCard';
import { EmptyState } from '../../components/molecules/EmptyState';
import { Text } from '../../components/atoms/Typography';
import { Grid } from '../../components/atoms/Grid';
import { colors, spacing, borderRadius, shadows, typography, transitions } from '../../styles/design-system';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  is_published: boolean;
  stock_quantity?: number;
}

export default function BusinessPreview() {
  const { currentBusinessId } = useSafeAppServices();
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBusinessData = async () => {
      if (!currentBusinessId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const businessData = await getBusiness(currentBusinessId);
        setBusiness(businessData);

        if (businessData) {
          const catalogData = await getPublicBusinessCatalog(businessData.id);
          setProducts(catalogData);
        }
      } catch (err) {
        logger.error('[BusinessPreview] Failed to load business data', err);
      } finally {
        setLoading(false);
      }
    };

    loadBusinessData();
  }, [currentBusinessId]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'rgba(18, 18, 20, 0.95)',
    paddingBottom: '100px',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: `3px solid ${colors.brand.primary}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }} />
            <Text
              variant="body"
              style={{
                marginTop: spacing.lg,
                color: colors.text.secondary,
              }}
            >
              Loading preview...
            </Text>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div style={containerStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}>
          <Card style={{
            maxWidth: '400px',
            margin: spacing.lg,
            textAlign: 'center',
          }}>
            <EmptyState
              icon="🏢"
              title="No Business Selected"
              description="Please select a business to preview"
            />
          </Card>
        </div>
      </div>
    );
  }

  const publicUrl = `/business/${business.slug}`;
  const isPublic = business.is_public === true;
  const primaryColor = business.primary_color || colors.brand.primary;
  const secondaryColor = business.secondary_color || colors.brand.primaryHover;

  return (
    <div style={containerStyle}>
      <div style={{
        background: 'linear-gradient(to right, #fef3c7, #fef08a)',
        borderBottom: '2px solid #fcd34d',
        padding: spacing.lg,
        boxShadow: shadows.sm,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#fbbf24',
                borderRadius: borderRadius.full,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: shadows.md,
                flexShrink: 0,
              }}>
                <svg width="20" height="20" fill="none" stroke="#78350f" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <Text variant="body" weight="semibold" style={{ color: '#111827', fontSize: typography.fontSize.sm, marginBottom: '2px' }}>
                  {isPublic ? 'Public Preview' : 'Preview Mode'}
                </Text>
                <Text variant="small" style={{ color: '#374151', fontSize: typography.fontSize.xs }}>
                  {isPublic ? 'This is how customers see your page' : 'Page is not public yet'}
                </Text>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
              {isPublic && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: `${spacing.sm} ${spacing.lg}`,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: '#1d4ed8',
                    background: '#ffffff',
                    border: '1px solid #93c5fd',
                    borderRadius: borderRadius.lg,
                    textDecoration: 'none',
                    transition: transitions.normal,
                    boxShadow: shadows.sm,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eff6ff';
                    e.currentTarget.style.borderColor = '#60a5fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#93c5fd';
                  }}
                >
                  <span>Open Public Link</span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              <Link
                to="/settings"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm} ${spacing.lg}`,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: '#ffffff',
                  background: '#2563eb',
                  borderRadius: borderRadius.lg,
                  textDecoration: 'none',
                  transition: transitions.normal,
                  boxShadow: shadows.md,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1d4ed8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        height: '320px',
        minHeight: '320px',
        ...(business.banner_image_url
          ? {
              backgroundImage: `url(${business.banner_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : {
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            }),
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.6) 100%)',
        }} />
        <div style={{
          position: 'relative',
          height: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: `0 ${spacing.lg}`,
          display: 'flex',
          alignItems: 'flex-end',
          paddingBottom: spacing['3xl'],
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: spacing.xl,
            width: '100%',
            flexWrap: 'wrap',
          }}>
            {business.logo_url && (
              <div style={{ flexShrink: 0 }}>
                <img
                  src={business.logo_url}
                  alt={business.name}
                  style={{
                    width: '112px',
                    height: '112px',
                    borderRadius: borderRadius.xl,
                    border: '4px solid #ffffff',
                    boxShadow: shadows['2xl'],
                    background: '#ffffff',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}
            <div style={{ flex: 1, minWidth: '280px' }}>
              <Text
                variant="h1"
                style={{
                  color: '#ffffff',
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: typography.fontWeight.bold,
                  marginBottom: spacing.sm,
                  textShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                  lineHeight: typography.lineHeight.tight,
                }}
              >
                {business.name}
              </Text>
              {business.tagline && (
                <Text
                  variant="body"
                  style={{
                    color: 'rgba(255, 255, 255, 0.95)',
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    fontWeight: typography.fontWeight.medium,
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                    maxWidth: '600px',
                  }}
                >
                  {business.tagline}
                </Text>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: `${spacing['3xl']} ${spacing.lg}`,
      }}>
        <Card
          variant="glass"
          style={{
            marginBottom: spacing['3xl'],
            padding: spacing['2xl'],
            background: 'rgba(30, 30, 35, 0.6)',
            border: `1px solid ${colors.border.primary}`,
            borderRadius: borderRadius.xl,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.xl,
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: borderRadius.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${primaryColor}20`,
            }}>
              <svg width="24" height="24" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <Text
              variant="h2"
              style={{
                color: colors.text.primary,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                margin: 0,
              }}
            >
              About Us
            </Text>
          </div>

          {business.description ? (
            <Text
              variant="body"
              style={{
                color: colors.text.secondary,
                fontSize: typography.fontSize.lg,
                lineHeight: typography.lineHeight.relaxed,
                marginBottom: spacing.xl,
              }}
            >
              {business.description}
            </Text>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '2px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: borderRadius.xl,
              padding: spacing['2xl'],
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: spacing.md, opacity: 0.4 }}>📄</div>
              <Text
                variant="body"
                weight="medium"
                style={{
                  color: colors.text.secondary,
                  marginBottom: spacing.sm,
                }}
              >
                No description yet
              </Text>
              <Text
                variant="small"
                style={{
                  color: colors.text.tertiary,
                  fontSize: typography.fontSize.sm,
                }}
              >
                Add a business description in settings to help customers learn about you
              </Text>
            </div>
          )}

          {(business.public_email || business.public_phone) && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: spacing.lg,
              paddingTop: spacing.xl,
              borderTop: `1px solid ${colors.border.primary}`,
            }}>
              {business.public_email && (
                <a
                  href={`mailto:${business.public_email}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                    background: 'rgba(59, 130, 246, 0.08)',
                    borderRadius: borderRadius.lg,
                    transition: transitions.normal,
                    textDecoration: 'none',
                    border: `1px solid ${colors.border.primary}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: borderRadius.lg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" fill="none" stroke={colors.brand.primary} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <Text
                      variant="small"
                      weight="medium"
                      style={{
                        color: colors.text.tertiary,
                        fontSize: typography.fontSize.xs,
                        marginBottom: '2px',
                      }}
                    >
                      Email
                    </Text>
                    <Text
                      variant="body"
                      weight="semibold"
                      style={{
                        color: colors.text.primary,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      {business.public_email}
                    </Text>
                  </div>
                </a>
              )}
              {business.public_phone && (
                <a
                  href={`tel:${business.public_phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                    background: 'rgba(34, 197, 94, 0.08)',
                    borderRadius: borderRadius.lg,
                    transition: transitions.normal,
                    textDecoration: 'none',
                    border: `1px solid ${colors.border.primary}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    borderRadius: borderRadius.lg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" fill="none" stroke={colors.security.high} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <Text
                      variant="small"
                      weight="medium"
                      style={{
                        color: colors.text.tertiary,
                        fontSize: typography.fontSize.xs,
                        marginBottom: '2px',
                      }}
                    >
                      Phone
                    </Text>
                    <Text
                      variant="body"
                      weight="semibold"
                      style={{
                        color: colors.text.primary,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      {business.public_phone}
                    </Text>
                  </div>
                </a>
              )}
            </div>
          )}
        </Card>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing['2xl'],
            flexWrap: 'wrap',
            gap: spacing.lg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: borderRadius.lg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${primaryColor}20`,
              }}>
                <svg width="24" height="24" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <Text
                variant="h2"
                style={{
                  color: colors.text.primary,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  margin: 0,
                }}
              >
                Our Catalog
              </Text>
            </div>
            <div style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: borderRadius.lg,
              border: `1px solid rgba(59, 130, 246, 0.2)`,
            }}>
              <Text
                variant="body"
                weight="semibold"
                style={{
                  color: colors.text.primary,
                  fontSize: typography.fontSize.sm,
                }}
              >
                {products.length} {products.length === 1 ? 'Product' : 'Products'}
              </Text>
            </div>
          </div>

          {loading ? (
            <Grid autoFit minItemWidth="280px" gap="lg">
              <ProductCardSkeleton count={8} />
            </Grid>
          ) : products.length === 0 ? (
            <Card
              variant="glass"
              style={{
                padding: spacing['4xl'],
                textAlign: 'center',
                background: 'rgba(30, 30, 35, 0.6)',
                border: `1px solid ${colors.border.primary}`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <EmptyState
                icon={
                  <div style={{
                    width: '96px',
                    height: '96px',
                    margin: '0 auto',
                    marginBottom: spacing.xl,
                    borderRadius: borderRadius.full,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${primaryColor}10`,
                  }}>
                    <svg width="48" height="48" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                }
                title="No Products Yet"
                description="Start building your catalog by adding products and marking them as published to showcase them here."
                action={{
                  label: 'Add Your First Product',
                  onClick: () => window.location.href = '/products',
                }}
              />
            </Card>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: spacing.lg,
            }}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={(p) => console.log('Product clicked:', p.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}
