import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { Section } from '../components/atoms/Section';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Text } from '../components/atoms/Typography';
import { EmptyState } from '../components/molecules/EmptyState';
import { colors, spacing, borderRadius, shadows } from '../styles/design-system';

interface CartPageProps {
  onNavigate?: (dest: string) => void;
}

export function CartPage({ onNavigate }: CartPageProps) {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();

  const handleCheckout = () => {
    if (onNavigate) {
      onNavigate('/store/checkout');
    } else {
      navigate('/store/checkout');
    }
  };

  const handleContinueShopping = () => {
    if (onNavigate) {
      onNavigate('/store/catalog');
    } else {
      navigate('/store/catalog');
    }
  };

  const shippingCost = cart.totalPrice > 100 ? 0 : 15;
  const totalAmount = cart.totalPrice + shippingCost;

  if (cart.items.length === 0) {
    return (
      <div style={{ padding: spacing.xl, maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
        <Button
          variant="ghost"
          onClick={handleContinueShopping}
          style={{ marginBottom: spacing.xl }}
        >
          ← Back to Catalog
        </Button>

        <Card variant="outlined">
          <EmptyState
            variant="default"
            title="Your cart is empty"
            description="Browse our catalog and add items to your cart to get started!"
            action={{
              label: 'Browse Catalog',
              onClick: handleContinueShopping,
            }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: spacing.xl, maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
      <Button
        variant="ghost"
        onClick={handleContinueShopping}
        style={{ marginBottom: spacing.xl }}
      >
        ← Continue Shopping
      </Button>

      <Section
        title="Shopping Cart"
        style={{ marginBottom: spacing.xl }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          <Card variant="outlined">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text variant="h4">Cart Items ({cart.totalItems})</Text>
              <Button
                variant="ghost"
                size="small"
                onClick={clearCart}
                style={{ color: colors.status.error }}
              >
                Clear Cart
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {cart.items.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.border.primary}`,
                  }}
                >
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: borderRadius.md,
                      background: colors.background.tertiary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '32px' }}>📦</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="h5" style={{ marginBottom: spacing.xs }}>
                      {item.product.name}
                    </Text>
                    <Text variant="small" color="secondary" style={{ marginBottom: spacing.sm }}>
                      {item.product.category || 'Security Product'}
                    </Text>
                    <Text variant="body" weight="bold" style={{ color: colors.brand.primary }}>
                      ₪{item.product.price.toFixed(2)} each
                    </Text>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: spacing.md,
                      minWidth: '120px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.xs,
                        background: colors.background.tertiary,
                        borderRadius: borderRadius.full,
                        padding: spacing.xs,
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          background: colors.background.elevated,
                          color: colors.text.primary,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 'bold',
                        }}
                      >
                        -
                      </button>
                      <Text
                        variant="body"
                        weight="bold"
                        style={{ minWidth: '30px', textAlign: 'center' }}
                      >
                        {item.quantity}
                      </Text>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          background: colors.brand.primary,
                          color: colors.white,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 'bold',
                        }}
                      >
                        +
                      </button>
                    </div>

                    <Text variant="h5" weight="bold">
                      ₪{(item.product.price * item.quantity).toFixed(2)}
                    </Text>

                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => removeItem(item.product.id)}
                      style={{ color: colors.status.error, fontSize: '12px' }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="outlined">
            <Text variant="h4" style={{ marginBottom: spacing.lg }}>
              Order Summary
            </Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text color="secondary">Subtotal ({cart.totalItems} items)</Text>
                <Text weight="semibold">₪{cart.totalPrice.toFixed(2)}</Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text color="secondary">Shipping</Text>
                <Text weight="semibold">
                  {shippingCost === 0 ? (
                    <span style={{ color: colors.status.success }}>FREE</span>
                  ) : (
                    `₪${shippingCost.toFixed(2)}`
                  )}
                </Text>
              </div>

              {cart.totalPrice < 100 && cart.totalPrice > 0 && (
                <div
                  style={{
                    padding: spacing.sm,
                    background: colors.status.infoFaded,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.status.info}`,
                  }}
                >
                  <Text variant="small" style={{ color: colors.status.info }}>
                    Add ₪{(100 - cart.totalPrice).toFixed(2)} more for free shipping!
                  </Text>
                </div>
              )}

              <div
                style={{
                  borderTop: `2px solid ${colors.border.primary}`,
                  paddingTop: spacing.md,
                  marginTop: spacing.sm,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="h4">Total</Text>
                  <Text variant="h3" style={{ color: colors.brand.primary }}>
                    ₪{totalAmount.toFixed(2)}
                  </Text>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="large"
              fullWidth
              onClick={handleCheckout}
              style={{
                marginTop: spacing.lg,
                boxShadow: shadows.md,
              }}
            >
              Proceed to Checkout
            </Button>

            <Button
              variant="secondary"
              size="medium"
              fullWidth
              onClick={handleContinueShopping}
              style={{ marginTop: spacing.md }}
            >
              Continue Shopping
            </Button>
          </Card>
        </div>
      </Section>
    </div>
  );
}
