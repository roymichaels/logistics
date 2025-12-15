import React from 'react';
import { Card } from './Card';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Typography';
import { Badge } from '../atoms/Badge';
import { colors, spacing, borderRadius, typography } from '../../styles/design-system';
import type { Product } from '../../data/types';

export interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  variant?: 'default' | 'compact' | 'featured';
}

export function ProductCard({
  product,
  onClick,
  onAddToCart,
  variant = 'default',
}: ProductCardProps) {
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product);
  };

  const imageContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: isFeatured ? '200px' : isCompact ? '120px' : '160px',
    borderRadius: borderRadius.lg,
    background: `linear-gradient(135deg, ${colors.background.tertiary}, ${colors.brand.primaryFaded})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  };

  const priceTagStyle: React.CSSProperties = {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    background: colors.brand.primary,
    color: colors.white,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.xl,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  };

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
    flex: 1,
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  };

  return (
    <Card
      variant="default"
      hoverable
      interactive={!!onClick}
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={imageContainerStyle}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span style={{ fontSize: isFeatured ? '72px' : '48px', opacity: 0.4 }}>
            🛍️
          </span>
        )}
        <div style={priceTagStyle}>₪{product.price}</div>
      </div>

      <div style={contentStyle}>
        <Text
          variant={isFeatured ? 'h4' : 'body'}
          weight="bold"
          style={{
            color: colors.text.primary,
            fontSize: isFeatured ? typography.fontSize.xl : typography.fontSize.lg,
            lineHeight: typography.lineHeight.tight,
            marginBottom: 0,
          }}
        >
          {product.name}
        </Text>

        {!isCompact && product.description && (
          <Text
            variant="small"
            color="secondary"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minHeight: '36px',
              lineHeight: typography.lineHeight.normal,
              marginBottom: 0,
            }}
          >
            {product.description}
          </Text>
        )}

        <div style={footerStyle}>
          {product.category && (
            <Badge variant="info" size="sm">
              {product.category}
            </Badge>
          )}

          {product.stock_quantity !== undefined && product.stock_quantity < 10 && (
            <Badge variant={product.stock_quantity === 0 ? 'error' : 'warning'} size="sm">
              {product.stock_quantity === 0 ? 'Out of Stock' : `${product.stock_quantity} left`}
            </Badge>
          )}
        </div>
      </div>

      {onAddToCart && (
        <Button
          variant="primary"
          size={isCompact ? 'sm' : 'md'}
          fullWidth
          onClick={handleAddToCart}
          disabled={product.stock_quantity === 0}
          style={{ marginTop: spacing.md }}
        >
          {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
        </Button>
      )}
    </Card>
  );
}

export interface ProductCardSkeletonProps {
  count?: number;
}

export function ProductCardSkeleton({ count = 1 }: ProductCardSkeletonProps) {
  const { Skeleton } = require('../atoms/Skeleton');

  const skeletonCards = Array.from({ length: count }, (_, i) => (
    <Card key={i} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      <Skeleton height="160px" variant="rectangular" />
      <Skeleton height="24px" width="80%" />
      <Skeleton height="16px" width="100%" />
      <Skeleton height="16px" width="60%" />
      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
        <Skeleton height="24px" width="60px" variant="rectangular" />
        <Skeleton height="24px" width="60px" variant="rectangular" />
      </div>
      <Skeleton height="40px" width="100%" variant="rectangular" />
    </Card>
  ));

  return <>{skeletonCards}</>;
}
