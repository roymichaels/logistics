import React from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import type { EnhancedBusinessPost } from '../../types/businessSocial';

interface BusinessPostGridProps {
  posts: EnhancedBusinessPost[];
  onPostClick: (post: EnhancedBusinessPost) => void;
}

export function BusinessPostGrid({ posts, onPostClick }: BusinessPostGridProps) {
  if (posts.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#8e8e8e'
      }}>
        <div style={{
          width: '62px',
          height: '62px',
          borderRadius: '50%',
          border: '2px solid #262626',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path d="M21 15l-5-5L5 21" strokeWidth="2" />
          </svg>
        </div>
        <h3 style={{ fontSize: '22px', fontWeight: '300', marginBottom: '8px' }}>
          No Posts Yet
        </h3>
        <p style={{ fontSize: '14px' }}>
          When this business shares photos, you'll see them here.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '4px',
      marginTop: '4px'
    }}>
      {posts.map(post => {
        const firstImage = post.media_urls?.[0];
        const hasMultipleImages = post.media_urls?.length > 1;

        return (
          <div
            key={post.id}
            onClick={() => onPostClick(post)}
            style={{
              position: 'relative',
              paddingBottom: '100%',
              background: '#fafafa',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            {firstImage ? (
              <img
                src={firstImage}
                alt={post.content}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              />
            ) : (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <p style={{
                  fontSize: '14px',
                  lineHeight: '1.4',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  textAlign: 'center'
                }}>
                  {post.content}
                </p>
              </div>
            )}

            {hasMultipleImages && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '20px',
                height: '20px',
                background: 'rgba(0, 0, 0, 0.6)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                  <rect x="10" y="10" width="12" height="12" rx="1" />
                </svg>
              </div>
            )}

            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                opacity: 0,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0)';
                e.currentTarget.style.opacity = '0';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px'
              }}>
                <Heart size={20} fill="white" />
                <span>{post.likes_count || 0}</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px'
              }}>
                <MessageCircle size={20} fill="white" />
                <span>{post.comments_count || 0}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
