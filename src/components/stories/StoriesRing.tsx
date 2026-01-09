import React from 'react';
import { Plus } from 'lucide-react';

interface StoriesRingProps {
  hasActiveStories: boolean;
  hasUnviewedStories?: boolean;
  imageUrl?: string;
  username?: string;
  size?: 'small' | 'medium' | 'large';
  isOwnProfile?: boolean;
  onClick?: () => void;
}

export function StoriesRing({
  hasActiveStories,
  hasUnviewedStories = false,
  imageUrl,
  username,
  size = 'medium',
  isOwnProfile = false,
  onClick,
}: StoriesRingProps) {
  const sizes = {
    small: { ring: 60, inner: 54, image: 50, text: '12px' },
    medium: { ring: 80, inner: 74, image: 70, text: '13px' },
    large: { ring: 100, inner: 94, image: 90, text: '14px' },
  };

  const { ring, inner, image, text } = sizes[size];

  const ringColor = hasUnviewedStories
    ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)'
    : hasActiveStories
    ? '#dbdbdb'
    : 'transparent';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        cursor: hasActiveStories ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: `${ring}px`,
          height: `${ring}px`,
          borderRadius: '50%',
          background: ringColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3px',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${inner}px`,
            height: `${inner}px`,
            borderRadius: '50%',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={username || 'User'}
              style={{
                width: `${image}px`,
                height: `${image}px`,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: `${image}px`,
                height: `${image}px`,
                borderRadius: '50%',
                backgroundColor: '#e1e1e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${parseInt(text) + 8}px`,
                fontWeight: 'bold',
                color: '#666',
              }}
            >
              {username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>

        {isOwnProfile && !hasActiveStories && (
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#0095f6',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus color="white" size={14} />
          </div>
        )}
      </div>

      {username && (
        <div
          style={{
            fontSize: text,
            color: '#262626',
            maxWidth: `${ring}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          {isOwnProfile && !hasActiveStories ? 'Your Story' : username}
        </div>
      )}
    </div>
  );
}
