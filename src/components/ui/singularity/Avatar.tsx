import React from 'react';

type Props = {
  src?: string;
  name?: string;
  size?: number;
  badge?: React.ReactNode;
};

export const SGAvatar: React.FC<Props> = ({ src, name, size = 40, badge }) => {
  const initials = name?.[0]?.toUpperCase?.() || 'U';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: src ? `url(${src}) center/cover` : 'linear-gradient(135deg,#1d9bf0,#00b7ff)',
          display: 'grid',
          placeItems: 'center',
          color: '#0b1020',
          fontWeight: 800,
          border: '2px solid rgba(255,255,255,0.25)',
        }}
      >
        {!src && initials}
      </div>
      {badge && (
        <div style={{ position: 'absolute', bottom: -2, right: -2, transform: 'scale(0.9)' }}>
          {badge}
        </div>
      )}
    </div>
  );
};

export default SGAvatar;
