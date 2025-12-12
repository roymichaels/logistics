import React from 'react';
import { Card } from '../primitives/Card';
import type { Product } from '../../data/types';
import type { useReactionStore } from '../../state/useReactionStore';

type ProductCardNewProps = {
  product: Product;
  onSelect?: () => void;
  onAddToCart?: () => void;
  onSelectProduct?: (p: Product) => void;
  reactionStore?: ReturnType<typeof useReactionStore>;
};

export default function ProductCardNew({ product, onSelect, onAddToCart, onSelectProduct, reactionStore }: ProductCardNewProps) {
  React.useEffect(() => {
    if (reactionStore && product?.id) {
      reactionStore.markSeen(product.id as any);
    }
  }, [reactionStore, product?.id]);

  const isWishlisted = reactionStore?.wishlist?.has(product?.id as any);
  const isLiked = reactionStore?.likes?.has(product?.id as any);

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          cursor: onSelect || onSelectProduct ? 'pointer' : 'default',
          transition: 'transform 120ms ease, box-shadow 120ms ease'
        }}
        onClick={() => {
          if (onSelectProduct) onSelectProduct(product);
          else onSelect?.();
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: 'var(--color-border)',
            transition: 'transform 120ms ease'
          }}
        >
          {product?.image_url || product?.image ? (
            <img
              src={(product as any).image_url || (product as any).image}
              alt={product.name || 'Product'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--color-text-muted)'
              }}
            >
              🛍️
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
          {reactionStore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                reactionStore.toggleWishlist(product?.id as any);
              }}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-panel)',
                color: isWishlisted ? 'var(--color-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer'
              }}
              aria-label="wishlist"
            >
              {isWishlisted ? '❤️' : '🤍'}
            </button>
          )}
          <div
            style={{
              fontSize: 14,
              color: 'var(--color-text)',
              fontWeight: 500,
              lineHeight: 1.3
            }}
          >
            {product.name || 'שם מוצר'}
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-text-muted)'
            }}
          >
            {product.price != null ? `₪${product.price}` : '₪—'}
          </div>
        </div>

        {(onSelect || onAddToCart || onSelectProduct) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAddToCart) onAddToCart();
              else if (onSelectProduct) onSelectProduct(product);
              else onSelect?.();
            }}
            style={{
              marginTop: '4px',
              alignSelf: 'flex-start',
              padding: '6px 10px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {reactionStore ? (isLiked ? '❤️ לייק' : '♡ לייק') : 'הוסף לעגלה'}
          </button>
        )}
      </div>
    </Card>
  );
}
