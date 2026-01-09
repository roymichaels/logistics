import React from 'react';
import { Edit2, Info } from 'lucide-react';
import { BusinessRecord } from '../../services/business';
import { QuickActionMenu, QuickAction } from '../edit/QuickActionMenu';

interface BusinessAboutSectionProps {
  business: BusinessRecord;
  isOwner: boolean;
  onEditInfo: () => void;
  onEditContact: () => void;
  onSettings?: () => void;
}

export function BusinessAboutSection({
  business,
  isOwner,
  onEditInfo,
  onEditContact,
  onSettings,
}: BusinessAboutSectionProps) {
  const primaryColor = business.primary_color || '#667eea';

  const aboutActions: QuickAction[] = [
    {
      label: 'Edit description',
      icon: <Edit2 size={16} />,
      onClick: onEditInfo,
      requirePermission: 'edit',
    },
    {
      label: 'Edit contact info',
      icon: <Edit2 size={16} />,
      onClick: onEditContact,
      requirePermission: 'edit',
    },
  ];

  if (onSettings) {
    aboutActions.push({
      label: 'Business settings',
      icon: <Edit2 size={16} />,
      onClick: onSettings,
      variant: 'primary',
      requirePermission: 'settings',
    });
  }

  return (
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
          marginBottom: '24px',
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
            <Info size={24} color={primaryColor} />
          </div>
          <h2
            style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
            }}
          >
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
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '18px',
            lineHeight: 1.7,
            marginBottom: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {business.description}
        </p>
      ) : (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '2px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📄</div>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '8px',
            }}
          >
            No description yet
          </p>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
              marginBottom: isOwner ? '20px' : 0,
            }}
          >
            {isOwner
              ? 'Add a business description to help customers learn about you'
              : 'Check back soon for more information'}
          </p>
          {isOwner && (
            <button
              onClick={onEditInfo}
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

      {business.category && (
        <div style={{ marginTop: '24px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: `${primaryColor}20`,
              border: `1px solid ${primaryColor}40`,
              borderRadius: '8px',
              color: primaryColor,
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {business.category}
          </div>
        </div>
      )}

      {business.tags && business.tags.length > 0 && (
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {business.tags.map((tag: string, index: number) => (
            <div
              key={index}
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              #{tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
