import React from 'react';
import { Drawer } from '@/components/primitives/Drawer';
import { DrawerHeader } from '@/components/primitives/drawer-parts/DrawerHeader';
import { DrawerBody } from '@/components/primitives/drawer-parts/DrawerBody';
import { DrawerFooter } from '@/components/primitives/drawer-parts/DrawerFooter';
import { Button } from '@/components/atoms/Button';
import { Typography } from '@/components/atoms/Typography';
import { Box } from '@/components/atoms/Box';
import { EmptyState } from '@/components/molecules/EmptyState';
import { useCart } from '@/hooks/useCart';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout?: () => void;
}

export function CartDrawer({ isOpen, onClose, onCheckout }: CartDrawerProps) {
  const { cart, updateQuantity, removeItem, clearCart } = useCart();

  const handleCheckout = () => {
    if (cart.totalItems === 0) return;
    onCheckout?.();
    onClose();
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} position="right" width="400px">
      <DrawerHeader
        title={`Cart (${cart.totalItems})`}
        onClose={onClose}
        actions={
          cart.items.length > 0 && (
            <Button variant="text" size="small" onClick={clearCart}>
              Clear All
            </Button>
          )
        }
      />

      <DrawerBody>
        {cart.items.length === 0 ? (
          <Box style={{ padding: '40px 20px' }}>
            <EmptyState
              variant="default"
              title="Your cart is empty"
              description="Add some products to get started!"
            />
          </Box>
        ) : (
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cart.items.map((item) => (
              <Box
                key={item.product.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                {/* Product Image */}
                <Box
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {item.product.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '32px', opacity: 0.4 }}>🛍️</span>
                  )}
                </Box>

                {/* Product Details */}
                <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Typography variant="body" weight="semibold">
                    {item.product.name}
                  </Typography>

                  <Typography variant="body" weight="bold" style={{ color: '#3b82f6' }}>
                    ₪{item.product.price}
                  </Typography>

                  {/* Quantity Controls */}
                  <Box style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                    >
                      -
                    </Button>
                    <Typography
                      weight="semibold"
                      style={{ minWidth: '30px', textAlign: 'center' }}
                    >
                      {item.quantity}
                    </Typography>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                      disabled={
                        item.product.stock_quantity !== undefined &&
                        item.quantity >= item.product.stock_quantity
                      }
                    >
                      +
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => removeItem(item.product.id)}
                      style={{ marginLeft: 'auto', color: '#ef4444' }}
                    >
                      Remove
                    </Button>
                  </Box>

                  {/* Subtotal */}
                  <Typography variant="caption" color="secondary">
                    Subtotal: ₪{(item.product.price * item.quantity).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DrawerBody>

      {cart.items.length > 0 && (
        <DrawerFooter>
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {/* Total Summary */}
            <Box
              style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body" color="secondary">
                  Subtotal
                </Typography>
                <Typography variant="body" weight="semibold">
                  ₪{cart.totalPrice.toFixed(2)}
                </Typography>
              </Box>
              <Box style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body" color="secondary">
                  Shipping
                </Typography>
                <Typography variant="body" weight="semibold">
                  {cart.totalPrice > 100 ? 'FREE' : '₪15.00'}
                </Typography>
              </Box>
              <Box
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <Typography variant="h4">Total</Typography>
                <Typography variant="h4" style={{ color: '#3b82f6' }}>
                  ₪
                  {(cart.totalPrice + (cart.totalPrice > 100 ? 0 : 15)).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            {/* Checkout Button */}
            <Button
              variant="primary"
              size="large"
              fullWidth
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </Button>

            <Typography
              variant="caption"
              color="secondary"
              style={{ textAlign: 'center' }}
            >
              Free shipping on orders over ₪100
            </Typography>
          </Box>
        </DrawerFooter>
      )}
    </Drawer>
  );
}
