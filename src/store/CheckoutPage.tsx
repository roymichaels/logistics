import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { Section } from '../components/atoms/Section';
import { Card } from '../components/molecules/Card';
import { Button } from '../components/atoms/Button';
import { Text } from '../components/atoms/Typography';
import { Input } from '../components/atoms/Input';
import { Badge } from '../components/atoms/Badge';
import { colors, spacing, borderRadius, shadows } from '../styles/design-system';

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

export function CheckoutPage({ dataStore, onNavigate }: CheckoutPageProps) {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const [formData, setFormData] = useState<OrderFormData>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    notes: '',
  });
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
      return;
    }

    if (cart.items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      const order = {
        id: `ORDER-${Date.now()}`,
        order_number: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        customer_name: formData.fullName,
        customer_phone: formData.phone,
        delivery_address: `${formData.address}, ${formData.city}`,
        notes: formData.notes,
        items: cart.items.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
        })),
        subtotal: cart.totalPrice,
        shipping_cost: shippingCost,
        total_amount: totalAmount,
        payment_method: 'cash_on_delivery',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      if (dataStore?.createOrder) {
        await dataStore.createOrder(order);
      } else {
        const orders = JSON.parse(localStorage.getItem('customer_orders') || '[]');
        orders.push(order);
        localStorage.setItem('customer_orders', JSON.stringify(orders));
      }

      clearCart();

      if (onNavigate) {
        onNavigate(`/store/orders/${order.id}`);
      } else {
        navigate(`/store/orders/${order.id}`);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to place order. Please try again.');
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
      <div style={{ padding: spacing['2xl'], textAlign: 'center' }}>
        <Text variant="h3" style={{ marginBottom: spacing.xl }}>
          Your cart is empty
        </Text>
        <Button variant="primary" onClick={handleBack}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: spacing.xl, maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      <Button
        variant="secondary"
        onClick={handleBack}
        style={{ marginBottom: spacing.xl }}
      >
        ← Back to Store
      </Button>

      <Section
        title="Checkout"
        style={{
          marginBottom: spacing.xl,
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          <Card variant="outlined">
            <Text variant="h4" style={{ marginBottom: spacing.lg }}>
              Order Summary
            </Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {cart.items.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: spacing.md,
                    background: colors.background.secondary,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Text weight="semibold">{item.product.name}</Text>
                    <Text variant="small" color="secondary">
                      Quantity: {item.quantity} × ₪{item.product.price}
                    </Text>
                  </div>
                  <Text weight="bold">₪{(item.product.price * item.quantity).toFixed(2)}</Text>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: spacing.lg,
                paddingTop: spacing.lg,
                borderTop: `1px solid ${colors.border.primary}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text color="secondary">Subtotal</Text>
                <Text weight="semibold">₪{cart.totalPrice.toFixed(2)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text color="secondary">Shipping</Text>
                <Text weight="semibold">
                  {shippingCost === 0 ? 'FREE' : `₪${shippingCost.toFixed(2)}`}
                </Text>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: spacing.md,
                  borderTop: `1px solid ${colors.border.primary}`,
                }}
              >
                <Text variant="h4">Total</Text>
                <Text variant="h4" style={{ color: colors.brand.primary }}>
                  ₪{totalAmount.toFixed(2)}
                </Text>
              </div>
            </div>
          </Card>

          <Card variant="outlined">
            <Text variant="h4" style={{ marginBottom: spacing.lg }}>
              Delivery Information
            </Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              <div>
                <label style={{ display: 'block', marginBottom: spacing.sm, fontWeight: 500 }}>
                  Full Name *
                </label>
                <Input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    borderColor: errors.fullName ? colors.status.error : undefined,
                  }}
                />
                {errors.fullName && (
                  <Text variant="small" style={{ color: colors.status.error, marginTop: spacing.xs }}>
                    {errors.fullName}
                  </Text>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: spacing.sm, fontWeight: 500 }}>
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+972 50 123 4567"
                  style={{
                    borderColor: errors.phone ? colors.status.error : undefined,
                  }}
                />
                {errors.phone && (
                  <Text variant="small" style={{ color: colors.status.error, marginTop: spacing.xs }}>
                    {errors.phone}
                  </Text>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: spacing.sm, fontWeight: 500 }}>
                  Street Address *
                </label>
                <Input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter your street address"
                  style={{
                    borderColor: errors.address ? colors.status.error : undefined,
                  }}
                />
                {errors.address && (
                  <Text variant="small" style={{ color: colors.status.error, marginTop: spacing.xs }}>
                    {errors.address}
                  </Text>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: spacing.sm, fontWeight: 500 }}>
                  City *
                </label>
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Enter your city"
                  style={{
                    borderColor: errors.city ? colors.status.error : undefined,
                  }}
                />
                {errors.city && (
                  <Text variant="small" style={{ color: colors.status.error, marginTop: spacing.xs }}>
                    {errors.city}
                  </Text>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: spacing.sm, fontWeight: 500 }}>
                  Delivery Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any special instructions for delivery?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border.primary}`,
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          </Card>

          <Card variant="outlined">
            <Text variant="h4" style={{ marginBottom: spacing.lg }}>
              Payment Method
            </Text>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: spacing.lg,
                background: colors.background.secondary,
                borderRadius: borderRadius.md,
                border: `2px solid ${colors.brand.primary}`,
              }}
            >
              <div style={{ fontSize: '32px' }}>💵</div>
              <div style={{ flex: 1 }}>
                <Text weight="bold">Cash on Delivery</Text>
                <Text variant="small" color="secondary">
                  Pay with cash when you receive your order
                </Text>
              </div>
              <Badge variant="success">Selected</Badge>
            </div>

            <div
              style={{
                marginTop: spacing.md,
                padding: spacing.md,
                background: colors.background.tertiary,
                borderRadius: borderRadius.sm,
              }}
            >
              <Text variant="small" color="secondary">
                Please have the exact amount ready (₪{totalAmount.toFixed(2)}) when the driver arrives
              </Text>
            </div>
          </Card>

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            disabled={loading}
            style={{
              boxShadow: shadows.lg,
            }}
          >
            {loading ? 'Placing Order...' : `Place Order - ₪${totalAmount.toFixed(2)}`}
          </Button>

          <Text variant="small" color="secondary" style={{ textAlign: 'center' }}>
            By placing this order, you agree to our terms of service and privacy policy
          </Text>
        </form>
      </Section>
    </div>
  );
}
