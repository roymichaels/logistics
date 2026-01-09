import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, ExternalLink, Globe, Lock, Settings as SettingsIcon, Plus } from 'lucide-react';
import { useBusinessPreview } from '../../hooks/useBusinessPreview';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';
import { Grid } from '../../components/atoms/Grid';
import { ProductCard, ProductCardSkeleton } from '../../components/molecules/ProductCard';
import { EmptyState } from '../../components/molecules/EmptyState';
import { EditBusinessInfoModal } from '../../components/modals/business/EditBusinessInfoModal';
import { EditContactInfoModal } from '../../components/modals/business/EditContactInfoModal';
import { ImageUploadModal } from '../../components/modals/shared/ImageUploadModal';
import { BusinessHero } from '../../components/business/BusinessHero';
import { BusinessOwnerCard } from '../../components/business/BusinessOwnerCard';
import { BusinessStatsBar } from '../../components/business/BusinessStatsBar';
import { BusinessActionButtons } from '../../components/business/BusinessActionButtons';
import { BusinessAboutSection } from '../../components/business/BusinessAboutSection';
import { BusinessContactSection } from '../../components/business/BusinessContactSection';
import { ImageUploadButton } from '../../components/business/ImageUploadButton';
import { supabase } from '../../lib/supabase';

export default function EnhancedBusinessPreview() {
  const { currentBusinessId } = useSafeAppServices();
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data,
    loading,
    error,
    isFollowing,
    refetch,
    updateBusinessField,
    toggleFollow,
  } = useBusinessPreview({
    businessId: currentBusinessId || '',
    userId: user?.id,
    includeAnalytics: true,
  });

  const permissions = usePermissions({
    user,
    businessId: currentBusinessId || undefined,
  });

  const [showEditInfoModal, setShowEditInfoModal] = useState(false);
  const [showBannerUploadModal, setShowBannerUploadModal] = useState(false);
  const [showLogoUploadModal, setShowLogoUploadModal] = useState(false);
  const [showContactInfoModal, setShowContactInfoModal] = useState(false);

  const business = data?.business;
  const products = data?.products || [];
  const stats = data?.stats;
  const owner = data?.owner;

  const isOwner = user && business && business.owner_id === user.id;
  const canEdit = isOwner && permissions.hasPermission('business:update');

  const handleBannerUpload = async (publicUrl: string) => {
    if (!business) return;

    try {
      await updateBusinessField('banner_image_url', publicUrl);
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
      await updateBusinessField('logo_url', publicUrl);
      Toast.success('Logo updated successfully');
      logger.info('[BusinessPreview] Logo uploaded', { publicUrl });
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update logo', error);
      Toast.error('Failed to update logo');
      throw error;
    }
  };

  const handleUpdateName = async (name: string) => {
    try {
      await updateBusinessField('name', name);
      Toast.success('Business name updated');
      logger.info('[BusinessPreview] Name updated', { name });
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update name', error);
      Toast.error('Failed to update name');
      throw error;
    }
  };

  const handleUpdateTagline = async (tagline: string) => {
    try {
      await updateBusinessField('tagline', tagline);
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
      await updateBusinessField('is_public', newPublicStatus);
      Toast.success(newPublicStatus ? 'Business page is now public' : 'Business page is now private');
      logger.info('[BusinessPreview] Public status toggled', { is_public: newPublicStatus });
    } catch (error) {
      logger.error('[BusinessPreview] Failed to toggle public status', error);
      Toast.error('Failed to update public status');
      throw error;
    }
  };

  const handleUpdateBusinessInfo = async (updateData: {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
  }) => {
    if (!business) return;

    try {
      for (const [key, value] of Object.entries(updateData)) {
        await updateBusinessField(key, value);
      }
      Toast.success('Business information updated');
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update business info', error);
      throw error;
    }
  };

  const handleUpdateContactInfo = async (updateData: { public_email?: string; public_phone?: string }) => {
    if (!business) return;

    try {
      for (const [key, value] of Object.entries(updateData)) {
        await updateBusinessField(key, value);
      }
      Toast.success('Contact information updated');
      logger.info('[BusinessPreview] Contact info updated', updateData);
    } catch (error) {
      logger.error('[BusinessPreview] Failed to update contact info', error);
      Toast.error('Failed to update contact info');
      throw error;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 500 }}>
            Loading preview...
          </p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '48px 32px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>
            {error ? 'Error Loading Business' : 'No Business Selected'}
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            {error ? error.message : 'Please select a business to preview'}
          </p>
        </div>
      </div>
    );
  }

  const publicUrl = `/business/${business.slug}`;
  const isPublic = business.is_public === true;
  const primaryColor = business.primary_color || '#667eea';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        paddingBottom: '100px',
      }}
    >
      {/* Preview Mode Header */}
      <div
        style={{
          background: 'linear-gradient(to right, #fef3c7, #fde68a)',
          borderBottom: '2px solid #fbbf24',
          padding: '20px 24px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                background: '#fbbf24',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)',
                flexShrink: 0,
              }}
            >
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

      {/* Hero Section */}
      <BusinessHero
        business={business}
        isOwner={!!isOwner}
        onBannerUpload={() => setShowBannerUploadModal(true)}
        onLogoUpload={() => setShowLogoUploadModal(true)}
        onNameUpdate={handleUpdateName}
        onTaglineUpdate={handleUpdateTagline}
      />

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        {/* Stats Bar */}
        {stats && (
          <div style={{ marginBottom: '48px' }}>
            <BusinessStatsBar stats={stats} />
          </div>
        )}

        {/* Action Buttons */}
        {!isOwner && (
          <div style={{ marginBottom: '48px' }}>
            <BusinessActionButtons
              businessId={business.id}
              businessName={business.name}
              isFollowing={isFollowing}
              isAuthenticated={!!user}
              onFollowToggle={toggleFollow}
              onMessage={() => navigate(`/chat?business=${business.id}`)}
            />
          </div>
        )}

        {/* About Section */}
        <div style={{ marginBottom: '48px' }}>
          <BusinessAboutSection
            business={business}
            isOwner={!!isOwner}
            onEditInfo={() => setShowEditInfoModal(true)}
            onEditContact={() => setShowContactInfoModal(true)}
            onSettings={() => navigate('/settings')}
          />
          <BusinessContactSection
            business={business}
            isOwner={!!isOwner}
            onEdit={() => setShowContactInfoModal(true)}
          />
        </div>

        {/* Owner Card */}
        {owner && (
          <div style={{ marginBottom: '48px' }}>
            <BusinessOwnerCard
              owner={owner}
              onViewProfile={() => navigate(`/profile/${owner.user_id}`)}
            />
          </div>
        )}

        {/* Products Section */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${primaryColor}30`,
                }}
              >
                <svg width="24" height="24" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h2
                style={{
                  color: '#ffffff',
                  fontSize: '28px',
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Our Catalog
              </h2>
            </div>
            <div
              style={{
                padding: '10px 20px',
                background: 'rgba(59, 130, 246, 0.15)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <span
                style={{
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 700,
                }}
              >
                {products.length} {products.length === 1 ? 'Product' : 'Products'}
              </span>
            </div>
          </div>

          {products.length === 0 ? (
            <EmptyState
              icon="📦"
              title="No Products Yet"
              description={
                isOwner
                  ? 'Start building your catalog by adding products and marking them as published.'
                  : 'Check back soon for new products!'
              }
              actionLabel={isOwner ? 'Add Your First Product' : undefined}
              onAction={isOwner ? () => navigate('/products') : undefined}
            />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px',
              }}
            >
              {products.map((product) => (
                <div key={product.id} style={{ position: 'relative' }}>
                  <ProductCard product={product} onClick={(p) => logger.info('Product clicked:', p.name)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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

      {showBannerUploadModal && (
        <ImageUploadModal
          businessId={business.id}
          uploadType="banner"
          currentImageUrl={business.banner_image_url}
          onUploadComplete={(url) => {
            handleBannerUpload(url);
            setShowBannerUploadModal(false);
          }}
          onClose={() => setShowBannerUploadModal(false)}
        />
      )}

      {showLogoUploadModal && (
        <ImageUploadModal
          businessId={business.id}
          uploadType="logo"
          currentImageUrl={business.logo_url}
          onUploadComplete={(url) => {
            handleLogoUpload(url);
            setShowLogoUploadModal(false);
          }}
          onClose={() => setShowLogoUploadModal(false)}
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
