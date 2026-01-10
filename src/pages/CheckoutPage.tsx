import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { undergroundTheme } from '../styles/undergroundTheme';
import { UndergroundCard } from '../components/underground/UndergroundCard';
import { UndergroundButton } from '../components/underground/UndergroundButton';
import { UndergroundSection } from '../components/underground/UndergroundSection';
import { PaymentMethodSelector, OrderPaymentStatus } from '../components/payments';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  delivery_address: string;
  status: string;
  business_id: string;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    console.warn('Payment processing not available in frontend-only mode');
    setLoading(false);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentComplete(true);
    setTimeout(() => {
      navigate(`/orders/${orderId}`);
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    alert(`Payment failed: ${error}`);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        padding: undergroundTheme.spacing.xl
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: undergroundTheme.spacing.md,
            animation: 'spin 1s linear infinite'
          }}>⏳</div>
          <div style={{
            fontSize: undergroundTheme.typography.fontSize.lg,
            color: undergroundTheme.colors.text.secondary
          }}>
            Loading order...
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
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
            <div style={{ fontSize: '64px', marginBottom: undergroundTheme.spacing.lg }}>❌</div>
            <h2 style={{
              margin: 0,
              fontSize: undergroundTheme.typography.fontSize['2xl'],
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: undergroundTheme.spacing.md
            }}>
              Order Not Found
            </h2>
            <p style={{
              margin: `0 0 ${undergroundTheme.spacing.xl} 0`,
              color: undergroundTheme.colors.text.secondary
            }}>
              The requested order could not be found
            </p>
            <UndergroundButton onClick={() => navigate('/orders')}>
              Back to Orders
            </UndergroundButton>
          </div>
        </UndergroundCard>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div style={{
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary,
        padding: undergroundTheme.spacing.xl,
        paddingBottom: undergroundTheme.spacing['8xl']
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <UndergroundCard variant="success">
            <div style={{
              textAlign: 'center',
              padding: undergroundTheme.spacing['3xl']
            }}>
              <div style={{ fontSize: '80px', marginBottom: undergroundTheme.spacing.lg }}>✅</div>
              <h2 style={{
                margin: 0,
                fontSize: undergroundTheme.typography.fontSize['2xl'],
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.status.success,
                marginBottom: undergroundTheme.spacing.md
              }}>
                Payment Successful!
              </h2>
              <p style={{
                margin: `0 0 ${undergroundTheme.spacing.lg} 0`,
                fontSize: undergroundTheme.typography.fontSize.md,
                color: undergroundTheme.colors.text.secondary
              }}>
                Your order #{order.order_number} has been paid.
              </p>

              {orderId && (
                <div style={{ marginBottom: undergroundTheme.spacing.xl }}>
                  <OrderPaymentStatus orderId={orderId} />
                </div>
              )}

              <UndergroundButton
                size="large"
                onClick={() => navigate(`/orders/${orderId}`)}
              >
                View Order Details →
              </UndergroundButton>
            </div>
          </UndergroundCard>
        </div>
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
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <UndergroundButton
          variant="ghost"
          onClick={() => navigate(-1)}
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          ← Back
        </UndergroundButton>

        <UndergroundSection
          title="Checkout"
          icon="💳"
          style={{ marginBottom: undergroundTheme.spacing.xl }}
        >
          <UndergroundCard>
            <div style={{ marginBottom: undergroundTheme.spacing.xl }}>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.tertiary,
                marginBottom: undergroundTheme.spacing.xs
              }}>
                Order Number
              </div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.lg,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                color: undergroundTheme.colors.accent.primary,
                fontFamily: 'monospace'
              }}>
                #{order.order_number}
              </div>
            </div>

            <div style={{
              padding: undergroundTheme.spacing.lg,
              background: undergroundTheme.colors.glassmorphism.light,
              borderRadius: undergroundTheme.borderRadius.lg,
              border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
              marginBottom: undergroundTheme.spacing.xl
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: undergroundTheme.spacing.md
              }}>
                <span style={{
                  color: undergroundTheme.colors.text.secondary,
                  fontSize: undergroundTheme.typography.fontSize.sm
                }}>
                  Delivery Address:
                </span>
                <span style={{
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary,
                  textAlign: 'right',
                  maxWidth: '200px',
                  fontSize: undergroundTheme.typography.fontSize.sm
                }}>
                  {order.delivery_address}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: undergroundTheme.spacing.md,
                borderTop: `2px solid ${undergroundTheme.colors.glassmorphism.border}`
              }}>
                <span style={{
                  fontSize: undergroundTheme.typography.fontSize.lg,
                  fontWeight: undergroundTheme.typography.fontWeight.semibold,
                  color: undergroundTheme.colors.text.primary
                }}>
                  Total:
                </span>
                <span style={{
                  fontSize: undergroundTheme.typography.fontSize['2xl'],
                  fontWeight: undergroundTheme.typography.fontWeight.bold,
                  color: undergroundTheme.colors.accent.primary,
                  textShadow: undergroundTheme.shadows.glow.cyan
                }}>
                  {order.total_amount} ILS
                </span>
              </div>
            </div>

            <PaymentMethodSelector
              orderId={order.id}
              businessId={order.business_id}
              amount={order.total_amount}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </UndergroundCard>
        </UndergroundSection>

        <UndergroundCard style={{
          background: `${undergroundTheme.colors.status.info}15`,
          border: `1px solid ${undergroundTheme.colors.status.info}40`
        }}>
          <div style={{
            display: 'flex',
            gap: undergroundTheme.spacing.md,
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: '24px' }}>🔒</div>
            <div>
              <div style={{
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                color: undergroundTheme.colors.status.info,
                marginBottom: undergroundTheme.spacing.xs,
                fontSize: undergroundTheme.typography.fontSize.md
              }}>
                Secure Payment
              </div>
              <div style={{
                color: undergroundTheme.colors.text.secondary,
                fontSize: undergroundTheme.typography.fontSize.sm,
                lineHeight: 1.5
              }}>
                Your payment is secured by blockchain technology. Funds are held in escrow until delivery is complete.
              </div>
            </div>
          </div>
        </UndergroundCard>
      </div>
    </div>
  );
}
