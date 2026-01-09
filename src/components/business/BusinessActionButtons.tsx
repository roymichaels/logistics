import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bell, BellOff } from 'lucide-react';
import { logger } from '../../lib/logger';
import { Toast } from '../Toast';

interface BusinessActionButtonsProps {
  businessId: string;
  businessName: string;
  isFollowing: boolean;
  isAuthenticated: boolean;
  onFollowToggle: () => Promise<void>;
  onMessage?: () => void;
  onShare?: () => void;
}

export function BusinessActionButtons({
  businessId,
  businessName,
  isFollowing,
  isAuthenticated,
  onFollowToggle,
  onMessage,
  onShare,
}: BusinessActionButtonsProps) {
  const [loading, setLoading] = useState(false);

  const handleFollowClick = async () => {
    if (!isAuthenticated) {
      Toast.error('Please sign in to follow businesses');
      return;
    }

    setLoading(true);
    try {
      await onFollowToggle();
      Toast.success(isFollowing ? 'Unfollowed business' : 'Following business');
    } catch (error) {
      logger.error('[BusinessActionButtons] Failed to toggle follow', error);
      Toast.error('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: businessName,
          text: `Check out ${businessName}`,
          url: window.location.href,
        });
        Toast.success('Shared successfully');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          logger.error('[BusinessActionButtons] Share failed', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        Toast.success('Link copied to clipboard');
      } catch (error) {
        logger.error('[BusinessActionButtons] Failed to copy link', error);
        Toast.error('Failed to copy link');
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <button
        onClick={handleFollowClick}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          fontSize: '15px',
          fontWeight: 600,
          color: isFollowing ? '#6b7280' : '#ffffff',
          background: isFollowing ? '#ffffff' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: isFollowing ? '2px solid #e5e7eb' : 'none',
          borderRadius: '12px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: isFollowing
            ? '0 2px 8px rgba(0, 0, 0, 0.1)'
            : '0 4px 16px rgba(102, 126, 234, 0.4)',
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = isFollowing
              ? '0 4px 12px rgba(0, 0, 0, 0.15)'
              : '0 6px 20px rgba(102, 126, 234, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = isFollowing
            ? '0 2px 8px rgba(0, 0, 0, 0.1)'
            : '0 4px 16px rgba(102, 126, 234, 0.4)';
        }}
      >
        {isFollowing ? (
          <>
            <BellOff size={18} />
            <span>Following</span>
          </>
        ) : (
          <>
            <Heart size={18} />
            <span>Follow</span>
          </>
        )}
      </button>

      {onMessage && isAuthenticated && (
        <button
          onClick={onMessage}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#6b7280',
            background: '#ffffff',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <MessageCircle size={18} />
          <span>Message</span>
        </button>
      )}

      <button
        onClick={handleShare}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          fontSize: '15px',
          fontWeight: 600,
          color: '#6b7280',
          background: '#ffffff',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.borderColor = '#d1d5db';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.borderColor = '#e5e7eb';
        }}
      >
        <Share2 size={18} />
        <span>Share</span>
      </button>
    </div>
  );
}
