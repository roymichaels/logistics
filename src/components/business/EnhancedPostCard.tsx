import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ShoppingBag } from 'lucide-react';
import type { EnhancedBusinessPost } from '../../types/businessSocial';
import { businessSocialService } from '../../services/businessSocial';
import { logger } from '../../lib/logger';

interface EnhancedPostCardProps {
  post: EnhancedBusinessPost;
  onLike: () => void;
  onComment: () => void;
  onProductClick?: (productId: string) => void;
}

export function EnhancedPostCard({ post, onLike, onComment, onProductClick }: EnhancedPostCardProps) {
  const [isSaved, setIsSaved] = useState(post.is_saved || false);
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullCaption, setShowFullCaption] = useState(false);

  const handleSaveToggle = async () => {
    try {
      if (isSaved) {
        await businessSocialService.unsavePost(post.id);
        setIsSaved(false);
      } else {
        await businessSocialService.savePost(post.id);
        setIsSaved(true);
      }
    } catch (error) {
      logger.error('Failed to toggle save:', error);
    }
  };

  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    onLike();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const caption = post.content || '';
  const shouldTruncateCaption = caption.length > 150;
  const displayCaption = showFullCaption || !shouldTruncateCaption
    ? caption
    : caption.substring(0, 150) + '...';

  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const hasMultipleMedia = post.media_urls && post.media_urls.length > 1;

  return (
    <article style={{
      background: 'white',
      border: '1px solid #dbdbdb',
      borderRadius: '8px',
      marginBottom: '24px',
      maxWidth: '614px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {post.author?.photo_url ? (
            <img
              src={post.author.photo_url}
              alt={post.author.name || post.author.username || 'User'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid #dbdbdb'
              }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {post.author?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>
              {post.author?.name || post.author?.username || 'Unknown'}
            </div>
            {post.post_type !== 'standard' && (
              <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                {post.post_type === 'product_showcase' && 'Product Showcase'}
                {post.post_type === 'promotion' && 'Promotion'}
                {post.post_type === 'announcement' && 'Announcement'}
              </div>
            )}
          </div>
        </div>
        <button style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px'
        }}>
          <MoreHorizontal size={20} />
        </button>
      </div>

      {hasMedia && (
        <div style={{ position: 'relative', background: '#000' }}>
          <img
            src={post.media_urls[currentImageIndex]}
            alt={`Post image ${currentImageIndex + 1}`}
            style={{
              width: '100%',
              maxHeight: '614px',
              objectFit: 'contain',
              display: 'block'
            }}
          />

          {hasMultipleMedia && (
            <>
              <button
                onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                disabled={currentImageIndex === 0}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  cursor: currentImageIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: currentImageIndex === 0 ? 0.5 : 1
                }}
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentImageIndex(prev => Math.min(post.media_urls.length - 1, prev + 1))}
                disabled={currentImageIndex === post.media_urls.length - 1}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  cursor: currentImageIndex === post.media_urls.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: currentImageIndex === post.media_urls.length - 1 ? 0.5 : 1
                }}
              >
                ›
              </button>
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '4px'
              }}>
                {post.media_urls.map((_, index) => (
                  <div
                    key={index}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: index === currentImageIndex ? '#0095f6' : 'rgba(255, 255, 255, 0.6)',
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ padding: '4px 16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0'
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={handleLikeToggle}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <Heart
                size={24}
                fill={isLiked ? '#ed4956' : 'none'}
                stroke={isLiked ? '#ed4956' : '#262626'}
                style={{ transition: 'all 0.2s' }}
              />
            </button>
            <button
              onClick={onComment}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <MessageCircle size={24} stroke="#262626" />
            </button>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <Share2 size={24} stroke="#262626" />
            </button>
          </div>
          <button
            onClick={handleSaveToggle}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <Bookmark
              size={24}
              fill={isSaved ? '#262626' : 'none'}
              stroke="#262626"
              style={{ transition: 'all 0.2s' }}
            />
          </button>
        </div>

        {likesCount > 0 && (
          <div style={{
            fontWeight: '600',
            fontSize: '14px',
            marginBottom: '8px'
          }}>
            {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
          </div>
        )}

        {post.featured_products && post.featured_products.length > 0 && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #dbdbdb'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              <ShoppingBag size={14} />
              <span>Featured Products</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {post.featured_products.map(product => (
                <button
                  key={product.product_id}
                  onClick={() => onProductClick?.(product.product_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'white',
                    border: '1px solid #dbdbdb',
                    borderRadius: '6px',
                    padding: '8px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{
                        width: '40px',
                        height: '40px',
                        objectFit: 'cover',
                        borderRadius: '4px'
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{product.name}</div>
                    <div style={{ fontSize: '13px', color: '#8e8e8e' }}>${product.price.toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {caption && (
          <div style={{ fontSize: '14px', lineHeight: '18px', marginBottom: '4px' }}>
            <span style={{ fontWeight: '600', marginRight: '6px' }}>
              {post.author?.name || post.author?.username}
            </span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{displayCaption}</span>
            {shouldTruncateCaption && (
              <button
                onClick={() => setShowFullCaption(!showFullCaption)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8e8e8e',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '4px',
                  fontSize: '14px'
                }}
              >
                {showFullCaption ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <div style={{
            fontSize: '14px',
            color: '#00376b',
            marginBottom: '4px'
          }}>
            {post.hashtags.map(tag => (
              <span key={tag} style={{ marginRight: '6px' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.comments_count > 0 && (
          <button
            onClick={onComment}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8e8e8e',
              cursor: 'pointer',
              padding: 0,
              fontSize: '14px',
              marginBottom: '4px'
            }}
          >
            View all {post.comments_count} comments
          </button>
        )}

        <div style={{
          fontSize: '10px',
          color: '#8e8e8e',
          textTransform: 'uppercase',
          letterSpacing: '0.2px',
          marginTop: '8px'
        }}>
          {formatDate(post.created_at)}
        </div>
      </div>
    </article>
  );
}
