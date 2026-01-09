import React from 'react';

interface UndergroundAvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  fallback?: string;
  onClick?: () => void;
}

export function UndergroundAvatar({
  src,
  alt,
  size = 'md',
  isOnline = false,
  fallback,
  onClick,
}: UndergroundAvatarProps) {
  const sizeMap = {
    sm: '32px',
    md: '48px',
    lg: '64px',
    xl: '96px',
  };

  const fontSize = {
    sm: '14px',
    md: '20px',
    lg: '28px',
    xl: '40px',
  };

  const indicatorSize = {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  };

  const avatarSize = sizeMap[size];

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: avatarSize,
        height: avatarSize,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.3s ease',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: src
            ? `url(${src}) center/cover`
            : 'linear-gradient(135deg, rgba(0, 212, 255, 0.3) 0%, rgba(123, 63, 242, 0.3) 100%)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(0, 212, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: fontSize[size],
          fontWeight: '600',
          color: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {!src && (fallback || '?')}
      </div>
      {isOnline && (
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: indicatorSize[size],
            height: indicatorSize[size],
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
            border: '2px solid rgba(13, 13, 13, 0.9)',
            boxShadow: '0 0 12px rgba(0, 255, 136, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
