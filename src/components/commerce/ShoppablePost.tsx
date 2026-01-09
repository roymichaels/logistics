import React, { useState, useEffect } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { ProductTag, shoppableContentService } from '../../services/shoppableContent';

interface ShoppablePostProps {
  postId: string;
  imageUrl: string;
  onProductClick?: (productId: string) => void;
}

export function ShoppablePost({ postId, imageUrl, onProductClick }: ShoppablePostProps) {
  const [productTags, setProductTags] = useState<ProductTag[]>([]);
  const [showTags, setShowTags] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductTag | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    loadProductTags();
  }, [postId]);

  const loadProductTags = async () => {
    const tags = await shoppableContentService.getProductTags(postId);
    setProductTags(tags);
  };

  const handleProductTagClick = (tag: ProductTag) => {
    setSelectedProduct(tag);
    if (onProductClick) {
      onProductClick(tag.product_id);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#000',
      }}
      onMouseEnter={() => setShowTags(true)}
      onMouseLeave={() => setShowTags(false)}
    >
      <img
        src={imageUrl}
        alt="Post"
        style={{
          width: '100%',
          display: 'block',
        }}
        onLoad={() => setImageLoaded(true)}
      />

      {productTags.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '20px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
          }}
          onClick={() => setShowTags(!showTags)}
        >
          <ShoppingBag size={16} />
          <span>View Products</span>
        </div>
      )}

      {imageLoaded && showTags && productTags.map((tag) => (
        <div
          key={tag.id}
          style={{
            position: 'absolute',
            left: tag.position_x ? `${tag.position_x}%` : '50%',
            top: tag.position_y ? `${tag.position_y}%` : '50%',
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
            zIndex: 10,
          }}
          onClick={() => handleProductTagClick(tag)}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              animation: 'pulse 2s infinite',
            }}
          >
            <ShoppingBag size={16} color="#262626" />
          </div>
        </div>
      ))}

      {selectedProduct && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '12px',
            right: '12px',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setSelectedProduct(null)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} color="#262626" />
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            {selectedProduct.product?.images?.[0] && (
              <img
                src={selectedProduct.product.images[0]}
                alt={selectedProduct.product.name}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid #dbdbdb',
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#262626',
                  marginBottom: '4px',
                }}
              >
                {selectedProduct.product?.name}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#8e8e8e',
                  marginBottom: '8px',
                }}
              >
                {selectedProduct.product?.business_id}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#262626',
                }}
              >
                ${selectedProduct.product?.price?.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
              backgroundColor: '#0095f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (onProductClick) {
                onProductClick(selectedProduct.product_id);
              }
            }}
          >
            View Product
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
