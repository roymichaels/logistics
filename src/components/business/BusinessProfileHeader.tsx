import React, { useState } from 'react';
import { MessageCircle, Share2, MapPin, Globe, Phone, Mail, Clock, Edit } from 'lucide-react';
import type { BusinessProfile } from '../../types/businessSocial';
import { businessSocialService } from '../../services/businessSocial';
import { logger } from '../../lib/logger';

interface BusinessProfileHeaderProps {
  profile: BusinessProfile;
  isOwner?: boolean;
  onEdit?: () => void;
  onMessage?: () => void;
  onRefresh?: () => void;
}

export function BusinessProfileHeader({
  profile,
  isOwner,
  onEdit,
  onMessage,
  onRefresh
}: BusinessProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(profile.is_following || false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowToggle = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await businessSocialService.unfollowBusiness(profile.id);
        setIsFollowing(false);
      } else {
        await businessSocialService.followBusiness(profile.id);
        setIsFollowing(true);
      }
      onRefresh?.();
    } catch (error) {
      logger.error('Failed to toggle follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile.name,
          text: profile.tagline || profile.description,
          url: window.location.href
        });
      } catch (error) {
        logger.info('Share cancelled');
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const stats = profile.stats || {
    posts_count: 0,
    followers_count: 0,
    products_count: 0,
    reviews_count: 0,
    avg_rating: 0
  };

  return (
    <div style={{
      background: 'white',
      borderBottom: '1px solid #dbdbdb',
      padding: '24px 16px'
    }}>
      <div style={{
        maxWidth: '935px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                alt={profile.name}
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid #dbdbdb'
                }}
              />
            ) : (
              <div style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '48px',
                fontWeight: '700'
              }}>
                {profile.name[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '300',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {profile.name}
              </h1>

              <div style={{ display: 'flex', gap: '8px' }}>
                {isOwner ? (
                  <button
                    onClick={onEdit}
                    style={{
                      padding: '8px 16px',
                      background: 'white',
                      border: '1px solid #dbdbdb',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit size={16} />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      disabled={isLoading}
                      style={{
                        padding: '8px 24px',
                        background: isFollowing ? 'white' : '#0095f6',
                        color: isFollowing ? '#262626' : 'white',
                        border: isFollowing ? '1px solid #dbdbdb' : 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1
                      }}
                    >
                      {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button
                      onClick={onMessage}
                      style={{
                        padding: '8px 16px',
                        background: 'white',
                        border: '1px solid #dbdbdb',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <MessageCircle size={16} />
                      Message
                    </button>
                  </>
                )}
                <button
                  onClick={handleShare}
                  style={{
                    padding: '8px',
                    background: 'white',
                    border: '1px solid #dbdbdb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Share"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '40px',
              marginBottom: '20px',
              fontSize: '16px'
            }}>
              <div>
                <span style={{ fontWeight: '600' }}>{stats.posts_count}</span>
                <span style={{ color: '#8e8e8e', marginLeft: '4px' }}>posts</span>
              </div>
              <div style={{ cursor: 'pointer' }}>
                <span style={{ fontWeight: '600' }}>{stats.followers_count}</span>
                <span style={{ color: '#8e8e8e', marginLeft: '4px' }}>followers</span>
              </div>
              <div>
                <span style={{ fontWeight: '600' }}>{stats.products_count}</span>
                <span style={{ color: '#8e8e8e', marginLeft: '4px' }}>products</span>
              </div>
              {stats.reviews_count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontWeight: '600' }}>{stats.avg_rating.toFixed(1)}</span>
                  <span style={{ color: '#ffc107', fontSize: '18px' }}>★</span>
                  <span style={{ color: '#8e8e8e' }}>({stats.reviews_count})</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
              {profile.category && (
                <div style={{ color: '#8e8e8e', marginBottom: '4px' }}>
                  {profile.category}
                </div>
              )}
              {profile.tagline && (
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {profile.tagline}
                </div>
              )}
              {profile.description && (
                <div style={{ marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                  {profile.description}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#737373' }}>
                {profile.location?.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} />
                    <span>{profile.location.address}</span>
                  </div>
                )}
                {profile.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} />
                    <a href={`tel:${profile.phone}`} style={{ color: '#00376b', textDecoration: 'none' }}>
                      {profile.phone}
                    </a>
                  </div>
                )}
                {profile.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={14} />
                    <a href={`mailto:${profile.email}`} style={{ color: '#00376b', textDecoration: 'none' }}>
                      {profile.email}
                    </a>
                  </div>
                )}
                {profile.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={14} />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: '#00376b', textDecoration: 'none' }}>
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {profile.operating_hours && profile.operating_hours.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} />
                    <span>Open today</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
