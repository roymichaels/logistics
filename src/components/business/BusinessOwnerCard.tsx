import React from 'react';
import { MapPin, Globe, Calendar, Briefcase, CheckCircle } from 'lucide-react';
import { OwnerProfile } from '../../services/businessPreview';
import { formatDistanceToNow } from '../../utils/format';

interface BusinessOwnerCardProps {
  owner: OwnerProfile;
  onViewProfile?: () => void;
}

export function BusinessOwnerCard({ owner, onViewProfile }: BusinessOwnerCardProps) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(99, 102, 241, 0.2)',
          }}
        >
          <Briefcase size={24} color="#6366f1" />
        </div>
        <h2
          style={{
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
          }}
        >
          Business Owner
        </h2>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {owner.avatar_url ? (
          <img
            src={owner.avatar_url}
            alt={owner.name || 'Owner'}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 700,
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            {(owner.name || owner.username || 'O').charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h3
              style={{
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 700,
                margin: 0,
              }}
            >
              {owner.name || owner.username}
            </h3>
            {owner.is_verified && (
              <CheckCircle
                size={20}
                color="#10b981"
                fill="#10b981"
                style={{ flexShrink: 0 }}
              />
            )}
          </div>

          {owner.username && (
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                margin: '0 0 12px 0',
              }}
            >
              @{owner.username}
            </p>
          )}

          {owner.bio && (
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '15px',
                lineHeight: 1.6,
                margin: '0 0 16px 0',
              }}
            >
              {owner.bio}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {owner.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="rgba(255, 255, 255, 0.6)" />
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                  {owner.location}
                </span>
              </div>
            )}

            {owner.website && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={16} color="rgba(255, 255, 255, 0.6)" />
                <a
                  href={owner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#60a5fa',
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  {owner.website}
                </a>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="rgba(255, 255, 255, 0.6)" />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                Member since{' '}
                {new Date(owner.member_since).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            {owner.businesses_count > 1 && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                <span style={{ color: '#a5b4fc', fontSize: '13px', fontWeight: 600 }}>
                  Owns {owner.businesses_count} businesses
                </span>
              </div>
            )}
          </div>

          {onViewProfile && (
            <button
              onClick={onViewProfile}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              View Full Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
