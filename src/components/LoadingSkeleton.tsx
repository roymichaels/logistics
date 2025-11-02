import React from 'react';
import '../styles/transitions.css';

interface LoadingSkeletonProps {
  type?: 'text' | 'title' | 'card' | 'list';
  count?: number;
  height?: string;
  width?: string;
  style?: React.CSSProperties;
}

export function LoadingSkeleton({
  type = 'text',
  count = 1,
  height,
  width,
  style = {}
}: LoadingSkeletonProps) {
  const baseStyle: React.CSSProperties = {
    ...style,
    backgroundColor: '#f0f0f0',
    backgroundImage: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '4px',
  };

  if (type === 'text') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="skeleton skeleton-text"
            style={{
              ...baseStyle,
              height: height || '16px',
              width: width || '100%',
              marginBottom: i < count - 1 ? '8px' : 0,
            }}
          />
        ))}
      </>
    );
  }

  if (type === 'title') {
    return (
      <div
        className="skeleton skeleton-title"
        style={{
          ...baseStyle,
          height: height || '24px',
          width: width || '60%',
          marginBottom: '12px',
        }}
      />
    );
  }

  if (type === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="skeleton skeleton-card"
            style={{
              ...baseStyle,
              padding: '16px',
              marginBottom: i < count - 1 ? '16px' : 0,
              height: height || '120px',
            }}
          >
            <div style={{ ...baseStyle, height: '20px', width: '60%', marginBottom: '12px' }} />
            <div style={{ ...baseStyle, height: '14px', width: '80%', marginBottom: '8px' }} />
            <div style={{ ...baseStyle, height: '14px', width: '90%' }} />
          </div>
        ))}
      </>
    );
  }

  if (type === 'list') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: i < count - 1 ? '12px' : 0,
            }}
          >
            <div
              style={{
                ...baseStyle,
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ ...baseStyle, height: '16px', width: '70%', marginBottom: '8px' }} />
              <div style={{ ...baseStyle, height: '12px', width: '50%' }} />
            </div>
          </div>
        ))}
      </>
    );
  }

  return null;
}

export function PageLoadingSkeleton() {
  return (
    <div style={{ padding: '20px' }} className="page-enter">
      <LoadingSkeleton type="title" />
      <LoadingSkeleton type="text" count={2} />
      <div style={{ marginTop: '24px' }}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    </div>
  );
}

export function ListLoadingSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ padding: '20px' }} className="page-enter">
      <LoadingSkeleton type="list" count={count} />
    </div>
  );
}
