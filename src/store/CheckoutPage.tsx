import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../context/AuthContext';
import { useAppServices } from '../context/AppServicesContext';
import { undergroundTheme } from '../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundButton,
  UndergroundSection,
  UndergroundHeader,
  UndergroundInput,
  UndergroundBadge,
  UndergroundLoadingSpinner,
} from '../components/underground';
import { Toast } from '../components/Toast';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

interface CheckoutPageProps {
  dataStore?: any;
  onNavigate?: (dest: string) => void;
}

interface OrderFormData {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
}

type PaymentMethod = 'cash_on_delivery' | 'crypto';

export function CheckoutPage({ dataStore, onNavigate }: CheckoutPageProps) {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { currentBusinessId } = useAppServices();
  const [formData, setFormData] = useState<OrderFormData>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<OrderFormData>>({});

  const shippingCost = cart.totalPrice > 100 ? 0 : 15;
  const totalAmount = cart.totalPrice + shippingCost;

  const validateForm = (): boolean => {
    const newErrors: Partial<OrderFormData> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      Toast.error('Please fill in all required fields');
      return;
    }

    if (cart.items.length === 0) {
      Toast.error('Your cart is empty');
      return;
    }

    if (!user) {
      Toast.error('You must be logged in to place an order');
      return;
    }

    if (!currentBusinessId) {
      Toast.error('No business selected');
      return;
    }

    setLoading(true);

    try {
      logger.info('[CheckoutPage] Creating order', {
        userId: user.id,
        businessId: currentBusinessId,
        itemCount: cart.items.length,
        totalAmount
      });

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          business_id: currentBusinessId,
          customer_id: user.id,
          customer_name: formData.fullName,
          customer_phone: formData.phone,
          delivery_address: `${formData.address}, ${formData.city}`,
          notes: formData.notes || null,
          subtotal: cart.totalPrice,
          shipping_cost: shippingCost,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          status: paymentMethod === 'crypto' ? 'pending_payment' : 'pending',
          order_number: orderNumber,
        })
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      logger.info('[CheckoutPage] Order created successfully', { orderId: order.id });

      for (const item of cart.items) {
        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
            subtotal: item.product.price * item.quantity,
          });

        if (itemError) {
          logger.error('[CheckoutPage] Failed to create order item', { error: itemError, productId: item.product.id });
        }
      }

      const { error: eventError } = await supabase
        .from('order_events')
        .insert({
          order_id: order.id,
          event_type: 'order_placed',
          description: `Order placed by ${formData.fullName}`,
          metadata: { payment_method: paymentMethod },
        });

      if (eventError) {
        logger.error('[CheckoutPage] Failed to create order event', { error: eventError });
      }

      clearCart();

      Toast.success('Order placed successfully!');

      if (onNavigate) {
        onNavigate(`/store/orders/${order.id}`);
      } else {
        navigate(`/store/orders/${order.id}`);
      }
    } catch (error: any) {
      logger.error('[CheckoutPage] Failed to create order', { error });
      Toast.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof OrderFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('/store/catalog');
    } else {
      navigate('/store/catalog');
    }
  };

  if (cart.items.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        padding: undergroundTheme.spacing.xl,
        paddingBottom: undergroundTheme.spacing['8xl']
      }}>
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
              Add items to your cart before checking out
            </p>
            <UndergroundButton onClick={handleBack}>
              Continue Shopping
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
          onClick={handleBack}
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          ← Back to Store
        </UndergroundButton>

        <UndergroundHeader
          title="Checkout"
          subtitle="Complete your order and choose payment method"
          icon="💳"
        />

        <UndergroundSection style={{ marginTop: undergroundTheme.spacing['3xl'] }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.xl }}>
          <UndergroundCard variant="light">
            <h3 style={{
              margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              📦 Order Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              {cart.items.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: undergroundTheme.spacing.md,
                    background: undergroundTheme.colors.glassmorphism.light,
                    borderRadius: undergroundTheme.borderRadius.lg,
                    border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: undergroundTheme.typography.fontWeight.semibold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      {item.product.name}
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      Quantity: {item.quantity} × ₪{item.product.price}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.accent.primary,
                    fontSize: undergroundTheme.typography.fontSize.lg
                  }}>
                    ₪{(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: undergroundTheme.spacing.lg,
                paddingTop: undergroundTheme.spacing.lg,
                borderTop: `2px solid ${undergroundTheme.colors.glassmorphism.border}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.sm }}>
                <span style={{ color: undergroundTheme.colors.text.secondary }}>Subtotal</span>
                <span style={{
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  ₪{cart.totalPrice.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: undergroundTheme.spacing.sm }}>
                <span style={{ color: undergroundTheme.colors.text.secondary }}>Shipping</span>
                <span style={{
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: shippingCost === 0 ? undergroundTheme.colors.status.success : undergroundTheme.colors.text.primary
                }}>
                  {shippingCost === 0 ? 'FREE' : `₪${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: undergroundTheme.spacing.md,
                  marginTop: undergroundTheme.spacing.sm,
                  borderTop: `2px solid ${undergroundTheme.colors.glassmorphism.border}`,
                }}
              >
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
          </UndergroundCard>

          <UndergroundCard variant="light">
            <h3 style={{
              margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              📍 Delivery Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.lg }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Full Name *
                </label>
                <UndergroundInput
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    borderColor: errors.fullName ? undergroundTheme.colors.status.error : undefined,
                  }}
                />
                {errors.fullName && (
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.status.error,
                    marginTop: undergroundTheme.spacing.xs
                  }}>
                    {errors.fullName}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Phone Number *
                </label>
                <UndergroundInput
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+972 50 123 4567"
                  style={{
                    borderColor: errors.phone ? undergroundTheme.colors.status.error : undefined,
                  }}
                />
                {errors.phone && (
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.status.error,
                    marginTop: undergroundTheme.spacing.xs
                  }}>
                    {errors.phone}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Street Address *
                </label>
                <UndergroundInput
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter your street address"
                  style={{
                    borderColor: errors.address ? undergroundTheme.colors.status.error : undefined,
                  }}
                />
                {errors.address && (
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.status.error,
                    marginTop: undergroundTheme.spacing.xs
                  }}>
                    {errors.address}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  City *
                </label>
                <UndergroundInput
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Enter your city"
                  style={{
                    borderColor: errors.city ? undergroundTheme.colors.status.error : undefined,
                  }}
                />
                {errors.city && (
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.status.error,
                    marginTop: undergroundTheme.spacing.xs
                  }}>
                    {errors.city}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: undergroundTheme.spacing.sm,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Delivery Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any special instructions for delivery?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: undergroundTheme.spacing.md,
                    borderRadius: undergroundTheme.borderRadius.md,
                    border: `1px solid ${undergroundTheme.colors.border.subtle}`,
                    background: undergroundTheme.colors.surface.darker,
                    color: undergroundTheme.colors.text.primary,
                    fontSize: undergroundTheme.typography.fontSize.md,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    transition: undergroundTheme.transitions.standard,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = undergroundTheme.colors.primary.cyan;
                    e.currentTarget.style.boxShadow = undergroundTheme.shadows.glow.cyan;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = undergroundTheme.colors.border.subtle;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </UndergroundCard>

          <UndergroundCard variant="light">
            <h3 style={{
              margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary
            }}>
              💳 Payment Method
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
              <div
                onClick={() => setPaymentMethod('cash_on_delivery')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: undergroundTheme.spacing.md,
                  padding: undergroundTheme.spacing.lg,
                  background: undergroundTheme.colors.glassmorphism.light,
                  borderRadius: undergroundTheme.borderRadius.lg,
                  border: `2px solid ${paymentMethod === 'cash_on_delivery' ? undergroundTheme.colors.primary.cyan : undergroundTheme.colors.glassmorphism.border}`,
                  cursor: 'pointer',
                  transition: undergroundTheme.transitions.standard,
                  boxShadow: paymentMethod === 'cash_on_delivery' ? undergroundTheme.shadows.glow.cyan : 'none',
                }}
                onMouseEnter={(e) => {
                  if (paymentMethod !== 'cash_on_delivery') {
                    e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.medium;
                  }
                }}
                onMouseLeave={(e) => {
                  if (paymentMethod !== 'cash_on_delivery') {
                    e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
                  }
                }}
              >
                <div style={{ fontSize: '32px' }}>💵</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.text.primary,
                    marginBottom: undergroundTheme.spacing.xs
                  }}>
                    Cash on Delivery
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.secondary
                  }}>
                    Pay with cash when you receive your order
                  </div>
                </div>
                {paymentMethod === 'cash_on_delivery' && (
                  <UndergroundBadge variant="success">✓ Selected</UndergroundBadge>
                )}
              </div>

              <div
                onClick={() => setPaymentMethod('crypto')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: undergroundTheme.spacing.md,
                  padding: undergroundTheme.spacing.lg,
                  background: undergroundTheme.colors.glassmorphism.light,
                  borderRadius: undergroundTheme.borderRadius.lg,
                  border: `2px solid ${paymentMethod === 'crypto' ? undergroundTheme.colors.primary.cyan : undergroundTheme.colors.glassmorphism.border}`,
                  cursor: 'pointer',
                  transition: undergroundTheme.transitions.standard,
                  boxShadow: paymentMethod === 'crypto' ? undergroundTheme.shadows.glow.cyan : 'none',
                }}
                onMouseEnter={(e) => {
                  if (paymentMethod !== 'crypto') {
                    e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.medium;
                  }
                }}
                onMouseLeave={(e) => {
                  if (paymentMethod !== 'crypto') {
                    e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
                  }
                }}
              >
                <div style={{ fontSize: '32px' }}>💰</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: undergroundTheme.typography.fontWeight.bold,
                    color: undergroundTheme.colors.text.primary,
                    marginBottom: undergroundTheme.spacing.xs
                  }}>
                    Cryptocurrency
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.secondary
                  }}>
                    Pay with ETH, SOL, or TON
                  </div>
                </div>
                {paymentMethod === 'crypto' && (
                  <UndergroundBadge variant="success">✓ Selected</UndergroundBadge>
                )}
              </div>
            </div>

            {paymentMethod === 'cash_on_delivery' && (
              <div
                style={{
                  marginTop: undergroundTheme.spacing.lg,
                  padding: undergroundTheme.spacing.md,
                  background: `${undergroundTheme.colors.status.info}15`,
                  borderRadius: undergroundTheme.borderRadius.md,
                  border: `1px solid ${undergroundTheme.colors.status.info}40`,
                }}
              >
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.status.info,
                  lineHeight: 1.5
                }}>
                  💡 Please have the exact amount ready (₪{totalAmount.toFixed(2)}) when the driver arrives
                </div>
              </div>
            )}

            {paymentMethod === 'crypto' && (
              <div
                style={{
                  marginTop: undergroundTheme.spacing.lg,
                  padding: undergroundTheme.spacing.md,
                  background: `${undergroundTheme.colors.primary.cyan}15`,
                  borderRadius: undergroundTheme.borderRadius.md,
                  border: `1px solid ${undergroundTheme.colors.primary.cyan}40`,
                }}
              >
                <div style={{
                  fontSize: undergroundTheme.typography.fontSize.sm,
                  color: undergroundTheme.colors.primary.cyan,
                  lineHeight: 1.5
                }}>
                  🔒 Secure blockchain payment - Order will be created after completing payment
                </div>
              </div>
            )}
          </UndergroundCard>

          <UndergroundButton
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            disabled={loading}
            style={{
              marginTop: undergroundTheme.spacing.md,
            }}
          >
            {loading
              ? '⏳ Processing...'
              : paymentMethod === 'crypto'
                ? `Continue to Payment → ₪${totalAmount.toFixed(2)}`
                : `Place Order → ₪${totalAmount.toFixed(2)}`
            }
          </UndergroundButton>

          <div style={{
            textAlign: 'center',
            fontSize: undergroundTheme.typography.fontSize.sm,
            color: undergroundTheme.colors.text.tertiary,
            marginTop: undergroundTheme.spacing.md,
            lineHeight: 1.5
          }}>
            By placing this order, you agree to our terms of service and privacy policy
          </div>
        </form>
        </UndergroundSection>
      </div>
    </div>
  );
}
