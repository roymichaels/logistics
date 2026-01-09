import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Eye, ExternalLink, Upload, Plus, Settings as SettingsIcon, Globe, Lock } from 'lucide-react';
import { getBusiness, getPublicBusinessCatalog, BusinessRecord, updateBusiness } from '../../services/business';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../lib/logger';
import { EditOverlay } from '../../components/edit/EditOverlay';
import { EditButton } from '../../components/edit/EditButton';
import { QuickActionMenu, QuickAction } from '../../components/edit/QuickActionMenu';
import { EditBusinessInfoModal } from '../../components/modals/business/EditBusinessInfoModal';
import { EditContactInfoModal } from '../../components/modals/business/EditContactInfoModal';
import { ImageUploadModal } from '../../components/modals/shared/ImageUploadModal';
import { InlineTextEdit } from '../../components/edit/InlineTextEdit';
import { ImageUploadButton } from '../../components/business/ImageUploadButton';
import { ProductCard, ProductCardSkeleton } from '../../components/molecules/ProductCard';
import { EmptyState } from '../../components/molecules/EmptyState';
import { Text } from '../../components/atoms/Typography';
import { Grid } from '../../components/atoms/Grid';
import { Toast } from '../../components/Toast';

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
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEditInfoModal, setShowEditInfoModal] = useState(false);
  const [showBannerUploadModal, setShowBannerUploadModal] = useState(false);
  const [showLogoUploadModal, setShowLogoUploadModal] = useState(false);
  const [showContactInfoModal, setShowContactInfoModal] = useState(false);

  const isOwner = user && business && business.owner_id === user.id;

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

  const handleUpdateBusinessInfo = async (data: {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
  }) => {
    if (!business) return;

    try {
      const updated = await updateBusiness(business.id, data);
      setBusiness(updated);
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update business info', error);
      throw error;
    }
  };

  const handleBannerUpload = async (publicUrl: string) => {
    if (!business) return;

    try {
      const updated = await updateBusiness(business.id, {
        banner_image_url: publicUrl,
      });
      setBusiness(updated);
      Toast.success('Banner updated successfully');
      logger.info('[BusinessPreview] Banner uploaded', { publicUrl });
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update banner', error);
      Toast.error('Failed to update banner');
      throw error;
    }
  };

  const handleLogoUpload = async (publicUrl: string) => {
    if (!business) return;

    try {
      const updated = await updateBusiness(business.id, {
        logo_url: publicUrl,
      });
      setBusiness(updated);
      Toast.success('Logo updated successfully');
      logger.info('[BusinessPreview] Logo uploaded', { publicUrl });
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update logo', error);
      Toast.error('Failed to update logo');
      throw error;
    }
  };

  const handleUpdateName = async (name: string) => {
    if (!business) return;

    try {
      const updated = await updateBusiness(business.id, { name });
      setBusiness(updated);
      Toast.success('Business name updated');
      logger.info('[BusinessPreview] Name updated', { name });
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update name', error);
      Toast.error('Failed to update name');
      throw error;
    }
  };

  const handleUpdateTagline = async (tagline: string) => {
    if (!business) return;

    try {
      const updated = await updateBusiness(business.id, { tagline });
      setBusiness(updated);
      Toast.success('Tagline updated');
      logger.info('[BusinessPreview] Tagline updated', { tagline });
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update tagline', error);
      Toast.error('Failed to update tagline');
      throw error;
    }
  };

  const handleTogglePublic = async () => {
    if (!business) return;

    const newPublicStatus = !business.is_public;

    try {
      const updated = await updateBusiness(business.id, {
        is_public: newPublicStatus,
      });
      setBusiness(updated);
      Toast.success(newPublicStatus ? 'Business page is now public' : 'Business page is now private');
      logger.info('[BusinessPreview] Public status toggled', { is_public: newPublicStatus });
    } catch (error) {
      logger.error('[BusinessPreview] Failed to toggle public status', error);
      Toast.error('Failed to update public status');
      throw error;
    }
  };

  const handleUpdateContactInfo = async (data: { public_email?: string; public_phone?: string }) => {
    if (!business) return;

    try {
      const updated = await updateBusiness(business.id, data);
      setBusiness(updated);
      Toast.success('Contact information updated');
      logger.info('[BusinessPreview] Contact info updated', data);
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update contact info', error);
      Toast.error('Failed to update contact info');
      throw error;
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 500 }}>
            Loading preview...
          </p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '48px 32px',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>
            No Business Selected
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Please select a business to preview
          </p>
        </div>
      </div>
    );
  }

  const publicUrl = `/business/${business.slug}`;
  const isPublic = business.is_public === true;
  const primaryColor = business.primary_color || '#667eea';
  const secondaryColor = business.secondary_color || '#764ba2';

  const aboutActions: QuickAction[] = [
    {
      label: 'Edit description',
      icon: <Edit2 size={16} />,
      onClick: () => setShowEditInfoModal(true),
      requirePermission: 'edit',
    },
    {
      label: 'Edit contact info',
      icon: <Edit2 size={16} />,
      onClick: () => setShowContactInfoModal(true),
      requirePermission: 'edit',
    },
    {
      label: 'Business settings',
      icon: <SettingsIcon size={16} />,
      onClick: () => window.location.href = '/settings',
      variant: 'primary',
      requirePermission: 'settings',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      paddingBottom: '100px',
    }}>
      <div style={{
        background: 'linear-gradient(to right, #fef3c7, #fde68a)',
        borderBottom: '2px solid #fbbf24',
        padding: '20px 24px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: '#fbbf24',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)',
              flexShrink: 0,
            }}>
              <Eye size={24} color="#78350f" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                {isPublic ? 'Public Preview' : 'Preview Mode'}
              </div>
              <div style={{ fontSize: '13px', color: '#374151' }}>
                {isPublic ? 'This is how customers see your page' : 'Page is not public yet'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {isOwner && (
              <button
                onClick={handleTogglePublic}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: isPublic ? '#10b981' : '#6b7280',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                {isPublic ? <Globe size={16} /> : <Lock size={16} />}
                <span>{isPublic ? 'Public' : 'Private'}</span>
              </button>
            )}
            {isPublic && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1d4ed8',
                  background: '#ffffff',
                  border: '2px solid #93c5fd',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff';
                  e.currentTarget.style.borderColor = '#60a5fa';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#93c5fd';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>Open Public Link</span>
                <ExternalLink size={16} />
              </a>
            )}
            <Link
              to="/settings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                background: '#2563eb',
                borderRadius: '10px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1d4ed8';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2563eb';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
              }}
            >
              <SettingsIcon size={16} />
              <span>Edit Settings</span>
            </Link>
          </div>
        </div>
      </div>

      <EditOverlay
        entityType="business"
        entityOwnerId={business.owner_id}
        businessId={business.id}
        onEdit={() => setShowBannerUploadModal(true)}
        position="center"
      >
        <div style={{
          position: 'relative',
          width: '100%',
          height: '360px',
          minHeight: '360px',
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
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.7) 100%)',
          }} />
          <div style={{
            position: 'relative',
            height: '100%',
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'flex-end',
            paddingBottom: '40px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '24px',
              width: '100%',
              flexWrap: 'wrap',
            }}>
              {business.logo_url ? (
                <EditOverlay
                  entityType="business"
                  entityOwnerId={business.owner_id}
                  businessId={business.id}
                  onEdit={() => setShowLogoUploadModal(true)}
                  position="center"
                >
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    style={{
                      width: '128px',
                      height: '128px',
                      borderRadius: '20px',
                      border: '4px solid #ffffff',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
                      background: '#ffffff',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                </EditOverlay>
              ) : (
                isOwner && (
                  <button
                    onClick={() => setShowLogoUploadModal(true)}
                    style={{
                      width: '128px',
                      height: '128px',
                      borderRadius: '20px',
                      border: '4px dashed rgba(255, 255, 255, 0.5)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      color: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                    }}
                  >
                    <Upload size={32} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Add Logo</span>
                  </button>
                )
              )}
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <InlineTextEdit
                    value={business.name}
                    onSave={handleUpdateName}
                    maxLength={100}
                    fontSize="clamp(32px, 5vw, 56px)"
                    fontWeight="800"
                    canEdit={isOwner}
                    placeholder="Business name"
                  />
                </div>
                <div>
                  <InlineTextEdit
                    value={business.tagline || ''}
                    onSave={handleUpdateTagline}
                    maxLength={150}
                    fontSize="clamp(18px, 3vw, 26px)"
                    fontWeight="500"
                    canEdit={isOwner}
                    emptyText="Add a tagline"
                    placeholder="Enter your business tagline"
                    multiline
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </EditOverlay>

      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '48px 24px',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '32px',
          marginBottom: '48px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${primaryColor}30`,
              }}>
                <svg width="24" height="24" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 style={{
                color: '#ffffff',
                fontSize: '28px',
                fontWeight: 700,
                margin: 0,
              }}>
                About Us
              </h2>
            </div>
            {isOwner && (
              <QuickActionMenu
                entityType="business"
                entityOwnerId={business.owner_id}
                businessId={business.id}
                actions={aboutActions}
                position="left"
              />
            )}
          </div>

          {business.description ? (
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '18px',
              lineHeight: 1.7,
              marginBottom: 0,
            }}>
              {business.description}
            </p>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '2px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '48px 32px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📄</div>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '8px',
              }}>
                No description yet
              </p>
              <p style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '14px',
                marginBottom: isOwner ? '20px' : 0,
              }}>
                {isOwner
                  ? 'Add a business description to help customers learn about you'
                  : 'Check back soon for more information'}
              </p>
              {isOwner && (
                <button
                  onClick={() => setShowEditInfoModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: primaryColor,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                  }}
                >
                  <Edit2 size={16} />
                  Add Description
                </button>
              )}
            </div>
          )}

          {isOwner && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              paddingTop: '32px',
              marginTop: '32px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <div style={{ flex: '1', minWidth: '250px' }}>
                <h3 style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Business Images
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <ImageUploadButton
                    businessId={business.id}
                    currentImageUrl={business.banner_image_url}
                    uploadType="banner"
                    onUploadComplete={handleBannerUpload}
                  />
                  <ImageUploadButton
                    businessId={business.id}
                    currentImageUrl={business.logo_url}
                    uploadType="logo"
                    onUploadComplete={handleLogoUpload}
                  />
                </div>
              </div>
            </div>
          )}

          {(business.public_email || business.public_phone || isOwner) && (
            <div style={{
              paddingTop: '32px',
              marginTop: '32px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <h3 style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Contact Information
                </h3>
                {isOwner && (
                  <button
                    onClick={() => setShowContactInfoModal(true)}
                    style={{
                      padding: '6px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: tokens.colors.primary,
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      border: `1px solid ${tokens.colors.primary}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
              }}>
              {business.public_email && (
                <a
                  href={`mailto:${business.public_email}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Email
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>
                      {business.public_email}
                    </div>
                  </div>
                </a>
              )}
              {business.public_phone && (
                <a
                  href={`tel:${business.public_phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Phone
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>
                      {business.public_phone}
                    </div>
                  </div>
                </a>
              )}
              {!business.public_email && !business.public_phone && isOwner && (
                <div style={{
                  padding: '24px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📞</div>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: '0 0 8px 0',
                  }}>
                    No contact information yet
                  </p>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '12px',
                    margin: 0,
                  }}>
                    Add your email and phone so customers can reach you
                  </p>
                </div>
              )}
            </div>
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${primaryColor}30`,
              }}>
                <svg width="24" height="24" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 style={{
                color: '#ffffff',
                fontSize: '28px',
                fontWeight: 700,
                margin: 0,
              }}>
                Our Catalog
              </h2>
            </div>
            <div style={{
              padding: '10px 20px',
              background: 'rgba(59, 130, 246, 0.15)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}>
              <span style={{
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 700,
              }}>
                {products.length} {products.length === 1 ? 'Product' : 'Products'}
              </span>
            </div>
          </div>

          {loading ? (
            <Grid autoFit minItemWidth="280px" gap="lg">
              <ProductCardSkeleton count={8} />
            </Grid>
          ) : products.length === 0 ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '80px 32px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 24px',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${primaryColor}20`,
              }}>
                <svg width="64" height="64" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 700,
                marginBottom: '12px',
              }}>
                No Products Yet
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '16px',
                marginBottom: isOwner ? '24px' : 0,
                maxWidth: '500px',
                margin: '0 auto',
              }}>
                {isOwner
                  ? 'Start building your catalog by adding products and marking them as published.'
                  : 'Check back soon for new products!'}
              </p>
              {isOwner && (
                <Link
                  to="/products"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 28px',
                    background: primaryColor,
                    color: '#ffffff',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    marginTop: '24px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                  }}
                >
                  <Plus size={20} />
                  Add Your First Product
                </Link>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}>
              {products.map((product) => (
                <div key={product.id} style={{ position: 'relative' }}>
                  <ProductCard
                    product={product}
                    onClick={(p) => logger.info('Product clicked:', p.name)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEditInfoModal && business && (
        <EditBusinessInfoModal
          currentData={{
            name: business.name,
            description: business.description,
            category: business.category,
            tags: business.tags,
          }}
          onSave={handleUpdateBusinessInfo}
          onClose={() => setShowEditInfoModal(false)}
        />
      )}

      {showContactInfoModal && (
        <EditContactInfoModal
          currentEmail={business.public_email}
          currentPhone={business.public_phone}
          onSave={handleUpdateContactInfo}
          onClose={() => setShowContactInfoModal(false)}
        />
      )}

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
