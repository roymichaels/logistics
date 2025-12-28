import React from 'react';
import { Card } from './Card';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Typography';
import { Badge } from '../atoms/Badge';
import { Skeleton } from '../atoms/Skeleton';
import { colors, spacing, borderRadius, typography, shadows, transitions } from '../../styles/design-system';
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
  const [isHovered, setIsHovered] = React.useState(false);
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
    height: isFeatured ? '240px' : isCompact ? '140px' : '200px',
    borderRadius: borderRadius.lg,
    background: `linear-gradient(135deg, ${colors.brand.primaryFaded} 0%, ${colors.brand.primary} 100%)`,
    border: `1px solid ${colors.border.primary}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
    transition: `all ${transitions.normal}`,
    boxShadow: isHovered ? shadows.lg : shadows.md,
  };

  const priceTagStyle: React.CSSProperties = {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.primaryDark} 100%)`,
    color: colors.white,
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    boxShadow: shadows.glow,
    backdropFilter: 'blur(8px)',
    border: `1px solid rgba(255, 255, 255, 0.2)`,
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
    flexWrap: 'wrap',
  };

  return (
    <Card
      variant="elevated"
      hoverable
      interactive={!!onClick}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: `all ${transitions.normal}`,
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered ? shadows.xl : shadows.md,
        background: colors.ui.card,
        border: `1px solid ${isHovered ? colors.brand.primary : colors.border.primary}`,
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
              transition: `all ${transitions.normal}`,
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            }}
          />
        ) : (
          <span style={{ fontSize: isFeatured ? '80px' : '56px', opacity: 0.6 }}>
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
            <Badge
              variant="primary"
              size="sm"
              style={{
                background: `${colors.brand.primaryFaded}`,
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}`,
              }}
            >
              {product.category}
            </Badge>
          )}

          {product.stock_quantity !== undefined && product.stock_quantity < 10 && (
            <Badge
              variant={product.stock_quantity === 0 ? 'error' : 'warning'}
              size="sm"
            >
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
          style={{
            marginTop: spacing.md,
            transition: `all ${transitions.fast}`,
            transform: isHovered && product.stock_quantity !== 0 ? 'scale(1.05)' : 'scale(1)',
            boxShadow: isHovered && product.stock_quantity !== 0 ? shadows.lg : shadows.sm,
          }}
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
  const skeletonCards = Array.from({ length: count }, (_, i) => (
    <Card key={i} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      <Skeleton height="200px" variant="rectangular" />
      <Skeleton height="24px" width="80%" />
      <Skeleton height="16px" width="100%" />
      <Skeleton height="16px" width="60%" />
      <div style={{ display: 'flex', gap: spacing.md, marginTop: spacing.md }}>
        <Skeleton height="24px" width="60px" variant="rectangular" />
        <Skeleton height="24px" width="60px" variant="rectangular" />
      </div>
      <Skeleton height="42px" width="100%" variant="rectangular" style={{ marginTop: spacing.lg }} />
    </Card>
  ));

  return <>{skeletonCards}</>;
}
