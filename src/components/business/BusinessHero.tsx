import React from 'react';
import { Upload } from 'lucide-react';
import { EditOverlay } from '../edit/EditOverlay';
import { InlineTextEdit } from '../edit/InlineTextEdit';
import { BusinessRecord } from '../../services/business';

interface BusinessHeroProps {
  business: BusinessRecord;
  isOwner: boolean;
  onBannerUpload: () => void;
  onLogoUpload: () => void;
  onNameUpdate: (name: string) => Promise<void>;
  onTaglineUpdate: (tagline: string) => Promise<void>;
}

export function BusinessHero({
  business,
  isOwner,
  onBannerUpload,
  onLogoUpload,
  onNameUpdate,
  onTaglineUpdate,
}: BusinessHeroProps) {
  const primaryColor = business.primary_color || '#667eea';
  const secondaryColor = business.secondary_color || '#764ba2';

  return (
    <EditOverlay
      entityType="business"
      entityOwnerId={business.owner_id}
      businessId={business.id}
      onEdit={onBannerUpload}
      position="center"
    >
      <div
        style={{
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
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.7) 100%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            height: '100%',
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'flex-end',
            paddingBottom: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '24px',
              width: '100%',
              flexWrap: 'wrap',
            }}
          >
            {business.logo_url ? (
              <EditOverlay
                entityType="business"
                entityOwnerId={business.owner_id}
                businessId={business.id}
                onEdit={onLogoUpload}
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
                  onClick={onLogoUpload}
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
                  onSave={onNameUpdate}
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
                  onSave={onTaglineUpdate}
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
  );
}
