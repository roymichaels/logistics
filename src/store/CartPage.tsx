import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { undergroundTheme } from '../styles/undergroundTheme';
import { UndergroundCard } from '../components/underground/UndergroundCard';
import { UndergroundButton } from '../components/underground/UndergroundButton';
import { UndergroundSection } from '../components/underground/UndergroundSection';

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
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        padding: undergroundTheme.spacing.xl,
        paddingBottom: undergroundTheme.spacing['8xl']
      }}>
        <UndergroundButton
          variant="ghost"
          onClick={handleContinueShopping}
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          ← Back to Catalog
        </UndergroundButton>

        <UndergroundCard>
          <div style={{
            textAlign: 'center',
            padding: undergroundTheme.spacing['4xl']
          }}>
            <div style={{ fontSize: '80px', marginBottom: undergroundTheme.spacing.lg }}>🛒</div>
            <h2 style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.md
            }}>
              Your cart is empty
            </h2>
            <p style={{
              margin: `0 0 ${undergroundTheme.spacing.xl} 0`,
              color: undergroundTheme.colors.text.secondary,
              fontSize: undergroundTheme.typography.fontSize.md,
              lineHeight: 1.6
            }}>
              Browse our catalog and add items to your cart to get started!
            </p>
            <UndergroundButton onClick={handleContinueShopping}>
              Browse Catalog
            </UndergroundButton>
          </div>
        </UndergroundCard>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing.xl,
      paddingBottom: undergroundTheme.spacing['8xl']
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <UndergroundButton
          variant="ghost"
          onClick={handleContinueShopping}
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          ← Continue Shopping
        </UndergroundButton>

        <UndergroundSection
          title="Shopping Cart"
          icon="🛒"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
            <UndergroundCard>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: undergroundTheme.spacing.lg
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: undergroundTheme.typography.fontSize.xl,
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Cart Items ({cart.totalItems})
                </h3>
                <UndergroundButton
                  variant="ghost"
                  size="small"
                  onClick={clearCart}
                  style={{ color: undergroundTheme.colors.status.error }}
                >
                  Clear Cart
                </UndergroundButton>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
                {cart.items.map((item) => (
                  <div
                    key={item.product.id}
                    style={{
                      display: 'flex',
                      gap: undergroundTheme.spacing.md,
                      padding: undergroundTheme.spacing.md,
                      background: undergroundTheme.colors.glassmorphism.light,
                      borderRadius: undergroundTheme.borderRadius.lg,
                      border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                      transition: undergroundTheme.transitions.standard
                    }}
                  >
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: undergroundTheme.borderRadius.md,
                      background: undergroundTheme.colors.glassmorphism.medium,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '32px' }}>📦</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        margin: `0 0 ${undergroundTheme.spacing.xs} 0`,
                        fontSize: undergroundTheme.typography.fontSize.lg,
                        fontWeight: undergroundTheme.typography.fontWeight.semibold,
                        color: undergroundTheme.colors.text.primary
                      }}>
                        {item.product.name}
                      </h4>
                      <p style={{
                        margin: `0 0 ${undergroundTheme.spacing.sm} 0`,
                        fontSize: undergroundTheme.typography.fontSize.sm,
                        color: undergroundTheme.colors.text.tertiary
                      }}>
                        {item.product.category || 'Security Product'}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: undergroundTheme.typography.fontSize.md,
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.accent.primary
                      }}>
                        ₪{item.product.price.toFixed(2)} each
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: undergroundTheme.spacing.md,
                      minWidth: '120px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: undergroundTheme.spacing.xs,
                        background: undergroundTheme.colors.glassmorphism.medium,
                        borderRadius: undergroundTheme.borderRadius.full,
                        padding: undergroundTheme.spacing.xs
                      }}>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                            background: undergroundTheme.colors.glassmorphism.dark,
                            color: undergroundTheme.colors.text.primary,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            transition: undergroundTheme.transitions.fast
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.medium;
                            e.currentTarget.style.borderColor = undergroundTheme.colors.accent.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.dark;
                            e.currentTarget.style.borderColor = undergroundTheme.colors.glassmorphism.border;
                          }}
                        >
                          -
                        </button>
                        <span style={{
                          minWidth: '30px',
                          textAlign: 'center',
                          fontSize: undergroundTheme.typography.fontSize.md,
                          fontWeight: undergroundTheme.typography.fontWeight.bold,
                          color: undergroundTheme.colors.text.primary
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: `1px solid ${undergroundTheme.colors.accent.primary}`,
                            background: `${undergroundTheme.colors.accent.primary}20`,
                            color: undergroundTheme.colors.accent.primary,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            transition: undergroundTheme.transitions.fast
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `${undergroundTheme.colors.accent.primary}40`;
                            e.currentTarget.style.boxShadow = undergroundTheme.shadows.glow.cyan;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = `${undergroundTheme.colors.accent.primary}20`;
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          +
                        </button>
                      </div>

                      <p style={{
                        margin: 0,
                        fontSize: undergroundTheme.typography.fontSize.lg,
                        fontWeight: undergroundTheme.typography.fontWeight.bold,
                        color: undergroundTheme.colors.accent.primary
                      }}>
                        ₪{(item.product.price * item.quantity).toFixed(2)}
                      </p>

                      <UndergroundButton
                        variant="ghost"
                        size="small"
                        onClick={() => removeItem(item.product.id)}
                        style={{
                          color: undergroundTheme.colors.status.error,
                          fontSize: undergroundTheme.typography.fontSize.xs
                        }}
                      >
                        Remove
                      </UndergroundButton>
                    </div>
                  </div>
                ))}
              </div>
            </UndergroundCard>

            <UndergroundCard>
              <h3 style={{
                margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                fontSize: undergroundTheme.typography.fontSize.xl,
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary
              }}>
                Order Summary
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: undergroundTheme.colors.text.secondary }}>
                    Subtotal ({cart.totalItems} items)
                  </span>
                  <span style={{
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    color: undergroundTheme.colors.text.primary
                  }}>
                    ₪{cart.totalPrice.toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: undergroundTheme.colors.text.secondary }}>Shipping</span>
                  <span style={{
                    fontWeight: undergroundTheme.typography.fontWeight.semibold,
                    color: shippingCost === 0 ? undergroundTheme.colors.status.success : undergroundTheme.colors.text.primary
                  }}>
                    {shippingCost === 0 ? 'FREE' : `₪${shippingCost.toFixed(2)}`}
                  </span>
                </div>

                {cart.totalPrice < 100 && cart.totalPrice > 0 && (
                  <div style={{
                    padding: undergroundTheme.spacing.sm,
                    background: `${undergroundTheme.colors.status.info}20`,
                    borderRadius: undergroundTheme.borderRadius.md,
                    border: `1px solid ${undergroundTheme.colors.status.info}`
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.status.info
                    }}>
                      Add ₪{(100 - cart.totalPrice).toFixed(2)} more for free shipping!
                    </p>
                  </div>
                )}

                <div style={{
                  borderTop: `2px solid ${undergroundTheme.colors.glassmorphism.border}`,
                  paddingTop: undergroundTheme.spacing.md,
                  marginTop: undergroundTheme.spacing.sm
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: undergroundTheme.typography.fontSize.xl,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.text.primary
                    }}>
                      Total
                    </span>
                    <span style={{
                      fontSize: undergroundTheme.typography.fontSize['2xl'],
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.accent.primary,
                      textShadow: undergroundTheme.shadows.glow.cyan
                    }}>
                      ₪{totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <UndergroundButton
                size="large"
                fullWidth
                onClick={handleCheckout}
                style={{ marginTop: undergroundTheme.spacing.lg }}
              >
                Proceed to Checkout →
              </UndergroundButton>

              <UndergroundButton
                variant="secondary"
                size="medium"
                fullWidth
                onClick={handleContinueShopping}
                style={{ marginTop: undergroundTheme.spacing.md }}
              >
                Continue Shopping
              </UndergroundButton>
            </UndergroundCard>
          </div>
        </UndergroundSection>
      </div>
    </div>
  );
}
