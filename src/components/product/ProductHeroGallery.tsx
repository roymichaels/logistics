import React from 'react';

type Props = {
  images: string[];
};

export function ProductHeroGallery({ images }: Props) {
  if (!images || images.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-border)'
        }}
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {images.map((src, idx) => (
        <div
          key={`${src}-${idx}`}
          style={{
            width: '100%',
            aspectRatio: '1',
            overflow: 'hidden',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-border)'
          }}
        >
          <img
            src={src}
            alt="product"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ))}
    </div>
  );
}

export default ProductHeroGallery;
