import React, { useEffect, useState } from 'react';
import { DetailPageTemplate } from '@/app/templates';
import { Button } from '@/components/atoms/Button';
import { Box } from '@/components/atoms/Box';
import { Typography } from '@/components/atoms/Typography';
import { Badge } from '@/components/atoms/Badge';
import type { Product } from '@/data/types';

interface ProductDetailPageProps {
  productId: string;
  dataStore: any;
  onBack?: () => void;
  onAddToCart?: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
}

export function ProductDetailPage({
  productId,
  dataStore,
  onBack,
  onAddToCart,
  onBuyNow,
}: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let mounted = true;
    async function loadProduct() {
      try {
        setLoading(true);
        const data = await dataStore?.getProduct?.(productId);
        if (mounted && data) {
          setProduct(data);
        }
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadProduct();
    return () => {
      mounted = false;
    };
  }, [productId, dataStore]);

  if (loading) {
    return (
      <Box style={{ padding: '40px', textAlign: 'center' }}>
        <Typography>Loading product...</Typography>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box style={{ padding: '40px', textAlign: 'center' }}>
        <Typography>Product not found</Typography>
        <Button onClick={onBack} style={{ marginTop: '16px' }}>
          Back to Catalog
        </Button>
      </Box>
    );
  }

  const isOutOfStock = product.stock_quantity === 0;
  const isLowStock = product.stock_quantity && product.stock_quantity < 10;

  const heroContent = (
    <Box style={{ textAlign: 'center' }}>
      <Box
        style={{
          width: '100%',
          maxWidth: '500px',
          height: '400px',
          margin: '0 auto',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          marginBottom: '24px',
        }}
      >
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
          <span style={{ fontSize: '120px', opacity: 0.3 }}>🛍️</span>
        )}
      </Box>

      <Box style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {product.category && <Badge variant="info">{product.category}</Badge>}
        {isOutOfStock && <Badge variant="error">Out of Stock</Badge>}
        {isLowStock && !isOutOfStock && (
          <Badge variant="warning">Only {product.stock_quantity} left</Badge>
        )}
      </Box>
    </Box>
  );

  const sections = [
    {
      title: 'Description',
      content: (
        <Typography variant="body">{product.description || 'No description available.'}</Typography>
      ),
    },
    {
      title: 'Details',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="secondary">SKU</Typography>
            <Typography weight="semibold">{product.sku || 'N/A'}</Typography>
          </Box>
          <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="secondary">Category</Typography>
            <Typography weight="semibold">{product.category || 'N/A'}</Typography>
          </Box>
          <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="secondary">Stock</Typography>
            <Typography weight="semibold">
              {product.stock_quantity !== undefined ? product.stock_quantity : 'N/A'}
            </Typography>
          </Box>
          <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="secondary">Business</Typography>
            <Typography weight="semibold">{product.business_id || 'N/A'}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      title: 'Shipping & Returns',
      content: (
        <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Typography variant="body">
            Free shipping on orders over ₪100
          </Typography>
          <Typography variant="body">
            30-day return policy
          </Typography>
          <Typography variant="body">
            Ships within 2-3 business days
          </Typography>
        </Box>
      ),
      defaultCollapsed: true,
    },
  ];

  const sidebarContent = (
    <Box
      style={{
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <Typography variant="h2" style={{ marginBottom: '16px' }}>
        ₪{product.price}
      </Typography>

      <Box style={{ marginBottom: '24px' }}>
        <Typography variant="caption" color="secondary" style={{ marginBottom: '8px' }}>
          Quantity
        </Typography>
        <Box style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            -
          </Button>
          <Typography weight="semibold" style={{ minWidth: '40px', textAlign: 'center' }}>
            {quantity}
          </Typography>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setQuantity(quantity + 1)}
            disabled={isOutOfStock || (product.stock_quantity && quantity >= product.stock_quantity)}
          >
            +
          </Button>
        </Box>
      </Box>

      <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Button
          variant="primary"
          fullWidth
          disabled={isOutOfStock}
          onClick={() => onAddToCart?.(product)}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </Button>
        <Button
          variant="secondary"
          fullWidth
          disabled={isOutOfStock}
          onClick={() => onBuyNow?.(product)}
        >
          Buy Now
        </Button>
      </Box>

      <Box
        style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="caption" color="secondary">
          Secure checkout powered by Stripe
        </Typography>
      </Box>
    </Box>
  );

  return (
    <DetailPageTemplate
      title={product.name}
      subtitle={`SKU: ${product.sku || 'N/A'}`}
      hero={heroContent}
      sections={sections}
      sidebar={sidebarContent}
      onBack={onBack}
      actions={
        <Button variant="text" size="small">
          Share
        </Button>
      }
    />
  );
}
