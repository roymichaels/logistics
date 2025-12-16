import React, { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingCart, Heart, Share2, Package, Truck, Shield } from 'lucide-react';
import type { Product } from '../data/types';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAddToCart } from '../migration/AddToCartController.migration';
import { PageContent } from '../components/molecules/PageContent';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Text } from '../components/atoms/Typography';
import { Badge } from '../components/atoms/Badge';
import { Divider } from '../components/atoms/Divider';
import { LoadingState } from '../components/molecules/LoadingState';
import { EmptyState } from '../components/molecules/EmptyState';
import { colors, spacing, borderRadius } from '../styles/design-system';

type ProductDetailPageNewProps = {
  productId?: string;
  dataStore?: any;
  onNavigate?: (path: string) => void;
};

function ProductDetailPageNewContent({ productId, dataStore, onNavigate }: ProductDetailPageNewProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [wishlist, setWishlist] = useState(false);

  const { setTitle } = usePageTitle();
  const { add: addToCart } = useAddToCart();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      if (dataStore?.getProduct && productId) {
        try {
          const prod = await dataStore.getProduct(productId);
          if (!cancelled) {
            setProduct(prod);
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setProduct(null);
            setLoading(false);
          }
        }
      } else {
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productId, dataStore]);

  useEffect(() => {
    if (product?.name) {
      setTitle(product.name);
    }
  }, [product, setTitle]);

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('/store/catalog');
    } else {
      window.history.back();
    }
  };

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product);
      }
    }
  };

  const handleToggleWishlist = () => {
    setWishlist(!wishlist);
  };

  if (loading) {
    return <LoadingState message="Loading product details..." />;
  }

  if (!product) {
    return (
      <EmptyState
        title="Product not found"
        description="The product you're looking for doesn't exist or has been removed."
        action={{
          label: 'Back to Catalog',
          onClick: handleBack,
        }}
      />
    );
  }

  const images = product.image_url ? [product.image_url] : [];
  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity === 0;
  const isLowStock = product.stock_quantity !== undefined && product.stock_quantity < 10 && product.stock_quantity > 0;

  return (
    <>
      {/* Header with back button */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: colors.background.primary,
          borderBottom: `1px solid ${colors.border.primary}`,
          padding: spacing.lg,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft size={20} />
        </Button>
        <Text variant="h3" weight="semibold" style={{ flex: 1, margin: 0 }}>
          Product Details
        </Text>
        <Button variant="ghost" size="sm" onClick={handleToggleWishlist}>
          <Heart size={20} fill={wishlist ? colors.status.error : 'none'} color={wishlist ? colors.status.error : colors.text.secondary} />
        </Button>
        <Button variant="ghost" size="sm">
          <Share2 size={20} />
        </Button>
      </div>

      <PageContent>
        {/* Product Image Gallery */}
        <Card style={{ padding: 0, marginBottom: spacing.lg }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1',
              background: `linear-gradient(135deg, ${colors.background.tertiary}, ${colors.brand.primaryFaded})`,
              borderRadius: borderRadius.lg,
              overflow: 'hidden',
            }}
          >
            {images.length > 0 ? (
              <img
                src={images[selectedImage]}
                alt={product.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '72px',
                  opacity: 0.4,
                }}
              >
                🛍️
              </div>
            )}

            {/* Stock Badge */}
            {(isOutOfStock || isLowStock) && (
              <div
                style={{
                  position: 'absolute',
                  top: spacing.md,
                  right: spacing.md,
                }}
              >
                <Badge variant={isOutOfStock ? 'error' : 'warning'} size="md">
                  {isOutOfStock ? 'Out of Stock' : `Only ${product.stock_quantity} left`}
                </Badge>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: spacing.sm,
                padding: spacing.md,
                overflowX: 'auto',
              }}
            >
              {images.map((img, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: borderRadius.md,
                    overflow: 'hidden',
                    border: `2px solid ${selectedImage === index ? colors.brand.primary : colors.border.primary}`,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={img}
                    alt={`${product.name} ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Product Info */}
        <Card style={{ marginBottom: spacing.lg }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <div style={{ flex: 1 }}>
              <Text variant="h2" weight="bold" style={{ margin: 0, marginBottom: spacing.xs }}>
                {product.name}
              </Text>
              {product.category && (
                <Badge variant="info" size="sm" style={{ marginBottom: spacing.sm }}>
                  {product.category}
                </Badge>
              )}
            </div>
          </div>

          <Text variant="h1" weight="bold" style={{ color: colors.brand.primary, margin: 0, marginBottom: spacing.lg }}>
            ₪{product.price}
          </Text>

          {product.description && (
            <>
              <Divider />
              <div style={{ marginTop: spacing.lg }}>
                <Text variant="small" weight="semibold" style={{ marginBottom: spacing.sm, display: 'block' }}>
                  Description
                </Text>
                <Text variant="body" color="secondary">
                  {product.description}
                </Text>
              </div>
            </>
          )}
        </Card>

        {/* Features */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Text variant="h4" weight="semibold" style={{ marginBottom: spacing.md }}>
            Features
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: colors.brand.primaryFaded,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Truck size={20} color={colors.brand.primary} />
              </div>
              <div>
                <Text variant="body" weight="semibold" style={{ marginBottom: spacing.xs }}>
                  Free Shipping
                </Text>
                <Text variant="small" color="secondary">
                  On orders over ₪100
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: colors.brand.primaryFaded,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={20} color={colors.brand.primary} />
              </div>
              <div>
                <Text variant="body" weight="semibold" style={{ marginBottom: spacing.xs }}>
                  Easy Returns
                </Text>
                <Text variant="small" color="secondary">
                  30-day return policy
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: colors.brand.primaryFaded,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield size={20} color={colors.brand.primary} />
              </div>
              <div>
                <Text variant="body" weight="semibold" style={{ marginBottom: spacing.xs }}>
                  Secure Payment
                </Text>
                <Text variant="small" color="secondary">
                  Your payment is safe with us
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* Add to Cart Section */}
        <Card
          style={{
            position: 'sticky',
            bottom: spacing.lg,
            background: colors.background.primary,
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
            <Text variant="body" weight="semibold">
              Quantity:
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <Text variant="body" weight="bold" style={{ minWidth: '30px', textAlign: 'center' }}>
                {quantity}
              </Text>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
                disabled={isOutOfStock || (product.stock_quantity !== undefined && quantity >= product.stock_quantity)}
              >
                +
              </Button>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}
          >
            <ShoppingCart size={20} />
            {isOutOfStock ? 'Out of Stock' : `Add to Cart • ₪${(product.price || 0) * quantity}`}
          </Button>
        </Card>
      </PageContent>
    </>
  );
}

export function ProductDetailPageNew(props: ProductDetailPageNewProps) {
  return <ProductDetailPageNewContent {...props} />;
}

export default ProductDetailPageNew;
