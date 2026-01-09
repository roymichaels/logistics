import React, { useState } from 'react';
import { ThumbsUp, BadgeCheck, MoreHorizontal } from 'lucide-react';
import type { BusinessReview } from '../../types/businessSocial';
import { businessSocialService } from '../../services/businessSocial';
import { logger } from '../../lib/logger';

interface ReviewCardProps {
  review: BusinessReview;
  isOwner?: boolean;
  onResponse?: (reviewId: string) => void;
  onRefresh?: () => void;
}

export function ReviewCard({ review, isOwner, onResponse, onRefresh }: ReviewCardProps) {
  const [isHelpful, setIsHelpful] = useState(review.is_helpful || false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [showFullText, setShowFullText] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleHelpfulToggle = async () => {
    setIsLoading(true);
    try {
      if (isHelpful) {
        await businessSocialService.unmarkReviewHelpful(review.id);
        setIsHelpful(false);
        setHelpfulCount(prev => prev - 1);
      } else {
        await businessSocialService.markReviewHelpful(review.id);
        setIsHelpful(true);
        setHelpfulCount(prev => prev + 1);
      }
    } catch (error) {
      logger.error('Failed to toggle helpful:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        style={{
          color: i < rating ? '#ffc107' : '#dbdbdb',
          fontSize: '16px'
        }}
      >
        ★
      </span>
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const reviewText = review.review_text || '';
  const shouldTruncate = reviewText.length > 200;
  const displayText = showFullText || !shouldTruncate
    ? reviewText
    : reviewText.substring(0, 200) + '...';

  return (
    <div style={{
      borderBottom: '1px solid #efefef',
      padding: '20px 0'
    }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flexShrink: 0 }}>
          {review.customer?.photo_url ? (
            <img
              src={review.customer.photo_url}
              alt={review.customer.name || 'Customer'}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '16px'
            }}>
              {review.customer?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '8px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>
                  {review.customer?.name || 'Anonymous'}
                </span>
                {review.verified_purchase && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#0095f6',
                      fontSize: '12px'
                    }}
                    title="Verified Purchase"
                  >
                    <BadgeCheck size={14} />
                    <span>Verified</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex' }}>{renderStars(review.rating)}</div>
                <span style={{ color: '#8e8e8e', fontSize: '12px' }}>
                  {formatDate(review.created_at)}
                </span>
              </div>
            </div>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#8e8e8e',
                padding: '4px'
              }}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>

          {review.product && (
            <div style={{
              fontSize: '13px',
              color: '#8e8e8e',
              marginBottom: '8px'
            }}>
              Product: {review.product.name}
            </div>
          )}

          {reviewText && (
            <div style={{
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: '12px',
              whiteSpace: 'pre-wrap'
            }}>
              {displayText}
              {shouldTruncate && (
                <button
                  onClick={() => setShowFullText(!showFullText)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8e8e8e',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: '4px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {showFullText ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {review.images && review.images.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {review.images.map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`Review ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              onClick={handleHelpfulToggle}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                color: isHelpful ? '#0095f6' : '#8e8e8e',
                fontSize: '13px',
                fontWeight: '600',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
            >
              <ThumbsUp size={14} fill={isHelpful ? 'currentColor' : 'none'} />
              <span>Helpful {helpfulCount > 0 && `(${helpfulCount})`}</span>
            </button>

            {isOwner && !review.response && (
              <button
                onClick={() => onResponse?.(review.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#0095f6',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '4px 8px'
                }}
              >
                Respond
              </button>
            )}
          </div>

          {review.response && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#fafafa',
              borderRadius: '8px',
              borderLeft: '3px solid #0095f6'
            }}>
              <div style={{
                fontWeight: '600',
                fontSize: '13px',
                marginBottom: '6px',
                color: '#262626'
              }}>
                Response from {isOwner ? 'You' : 'Business'}
              </div>
              <div style={{
                fontSize: '13px',
                lineHeight: '1.5',
                color: '#262626',
                whiteSpace: 'pre-wrap'
              }}>
                {review.response.response_text}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#8e8e8e',
                marginTop: '6px'
              }}>
                {formatDate(review.response.created_at)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
