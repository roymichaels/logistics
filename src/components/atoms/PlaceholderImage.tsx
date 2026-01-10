import React from 'react';

export interface PlaceholderImageProps {
  type?: 'product' | 'avatar' | 'business' | 'banner';
  size?: number | string;
  width?: number | string;
  height?: number | string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PlaceholderImage({
  type = 'product',
  size,
  width,
  height,
  alt = 'Placeholder',
  className,
  style,
}: PlaceholderImageProps) {
  const finalWidth = width || size || '100%';
  const finalHeight = height || size || '100%';

  const placeholderConfig = {
    product: {
      icon: '🛍️',
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
    },
    avatar: {
      icon: '👤',
      bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: '#ffffff',
    },
    business: {
      icon: '🏢',
      bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: '#ffffff',
    },
    banner: {
      icon: '🖼️',
      bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      color: '#ffffff',
    },
  };

  const config = placeholderConfig[type];

  return (
    <div
      className={className}
      style={{
        width: finalWidth,
        height: finalHeight,
        background: config.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: config.color,
        fontSize: typeof finalHeight === 'number' ? `${finalHeight / 3}px` : '48px',
        userSelect: 'none',
        ...style,
      }}
      role="img"
      aria-label={alt}
    >
      <span style={{ opacity: 0.9 }}>{config.icon}</span>
    </div>
  );
}

export default PlaceholderImage;
