import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentMethodSelector, OrderPaymentStatus } from '../components/payments';
import { supabaseClient } from '../lib/supabaseClient';

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
    try {
      const { data, error } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);

      const { data: payment } = await supabaseClient
        .from('payment_transactions')
        .select('status')
        .eq('order_id', orderId)
        .maybeSingle();

      if (payment?.status === 'confirmed' || payment?.status === 'released') {
        setPaymentComplete(true);
      }
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
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
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            animation: 'spin 1s linear infinite'
          }}>⏳</div>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading order...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Order Not Found</h2>
        <button
          onClick={() => navigate('/orders')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0088cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Back to Orders
        </button>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div style={{
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', fontWeight: '700' }}>
          Payment Successful!
        </h2>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
          Your order #{order.order_number} has been paid.
        </p>

        {orderId && (
          <div style={{ marginBottom: '24px' }}>
            <OrderPaymentStatus orderId={orderId} />
          </div>
        )}

        <button
          onClick={() => navigate(`/orders/${orderId}`)}
          style={{
            padding: '14px 28px',
            backgroundColor: '#0088cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          View Order Details
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: '20px',
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: '1px solid #ddd',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        ← Back
      </button>

      <div style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          Checkout
        </h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          Order #{order.order_number}
        </p>

        <div style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: '#6b7280' }}>Delivery Address:</span>
            <span style={{ fontWeight: '600', textAlign: 'right', maxWidth: '200px' }}>
              {order.delivery_address}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '2px solid #e5e7eb'
          }}>
            <span style={{ fontSize: '18px', fontWeight: '600' }}>Total:</span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#0088cc' }}>
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
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: '#f0f9ff',
        borderRadius: '12px',
        fontSize: '14px'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>🔒 Secure Payment</div>
        <div style={{ color: '#374151' }}>
          Your payment is secured by blockchain technology. Funds are held in escrow until delivery is complete.
        </div>
      </div>
    </div>
  );
}
