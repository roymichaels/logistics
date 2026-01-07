import React, { useState, useEffect } from 'react';
import { tokens } from '../../styles/tokens';
import { Button } from '../atoms/Button';
import { DeliveryMap, DeliveryLocation } from './DeliveryMap';
import { AssignmentWithOrder } from '../../services/assignments';

interface OrderPreviewModalProps {
  assignment: AssignmentWithOrder;
  onAccept: () => void;
  onDecline: (reason?: string) => void;
  isOpen: boolean;
  autoDeclineSeconds?: number;
}

export function OrderPreviewModal({
  assignment,
  onAccept,
  onDecline,
  isOpen,
  autoDeclineSeconds = 30,
}: OrderPreviewModalProps) {
  const [timeLeft, setTimeLeft] = useState(autoDeclineSeconds);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(autoDeclineSeconds);
      setDeclining(false);
      setDeclineReason('');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, autoDeclineSeconds]);

  if (!isOpen) return null;

  const order = assignment.order;
  const estimatedEarnings = calculateEstimatedEarnings(assignment);
  const estimatedDistance = calculateDistance(assignment);
  const estimatedTime = Math.ceil(estimatedDistance * 3);

  const deliveryLocations: DeliveryLocation[] = [];

  if (order.delivery_address) {
    const coords = parseAddressToCoords(order.delivery_address);
    deliveryLocations.push({
      id: `dropoff-${order.id}`,
      type: 'dropoff',
      lat: coords.lat,
      lng: coords.lng,
      address: order.delivery_address,
      name: order.customer_name || undefined,
      orderNumber: order.order_number,
      status: assignment.status,
    });
  }

  const declineReasons = [
    { value: 'too_far', label: 'Too far from my location' },
    { value: 'low_pay', label: 'Pay is too low' },
    { value: 'busy', label: 'Already have orders' },
    { value: 'wrong_direction', label: 'Wrong direction' },
    { value: 'other', label: 'Other reason' },
  ];

  const handleDecline = () => {
    if (declining && declineReason) {
      onDecline(declineReason);
    } else {
      setDeclining(true);
    }
  };

  const progressPercentage = (timeLeft / autoDeclineSeconds) * 100;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-in',
      }}
      onClick={(e) => e.target === e.currentTarget && handleDecline()}
    >
      <div
        style={{
          background: tokens.colors.background.card,
          borderRadius: '24px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: `1px solid ${tokens.colors.background.cardBorder}`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: tokens.colors.bg,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background:
                  progressPercentage > 50
                    ? 'linear-gradient(90deg, #10b981, #059669)'
                    : progressPercentage > 20
                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                width: `${progressPercentage}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700', color: tokens.colors.text }}>
                New Delivery
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: tokens.colors.subtle }}>
                Order #{order.order_number}
              </p>
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: timeLeft > 10 ? tokens.colors.status.success : tokens.colors.status.error,
              }}
            >
              {timeLeft}s
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.status.success }}>
                ₪{estimatedEarnings}
              </div>
              <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginTop: '4px' }}>Earnings</div>
            </div>

            <div
              style={{
                background: tokens.colors.bg,
                padding: '16px',
                borderRadius: '16px',
                border: `1px solid ${tokens.colors.background.cardBorder}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.text }}>
                {estimatedDistance} km
              </div>
              <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginTop: '4px' }}>Distance</div>
            </div>

            <div
              style={{
                background: tokens.colors.bg,
                padding: '16px',
                borderRadius: '16px',
                border: `1px solid ${tokens.colors.background.cardBorder}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.text }}>
                {estimatedTime} min
              </div>
              <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginTop: '4px' }}>Est. Time</div>
            </div>
          </div>

          {deliveryLocations.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <DeliveryMap deliveries={deliveryLocations} height="200px" showRoute={false} />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                📍
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: tokens.colors.subtle, marginBottom: '2px' }}>
                  Delivery Address
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text }}>
                  {order.delivery_address || 'No address provided'}
                </div>
              </div>
            </div>

            {order.customer_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: tokens.colors.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }}
                >
                  👤
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: tokens.colors.subtle, marginBottom: '2px' }}>Customer</div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text }}>
                    {order.customer_name}
                  </div>
                </div>
              </div>
            )}

            {order.delivery_instructions && (
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '12px',
                  marginTop: '12px',
                }}
              >
                <div style={{ fontSize: '12px', color: tokens.colors.subtle, marginBottom: '4px' }}>
                  Special Instructions
                </div>
                <div style={{ fontSize: '14px', color: tokens.colors.text, lineHeight: '1.5' }}>
                  {order.delivery_instructions}
                </div>
              </div>
            )}
          </div>

          {order.items && order.items.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text, marginBottom: '12px' }}>
                Order Items ({order.items.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      background: tokens.colors.bg,
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: tokens.colors.brand.primary,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: '700',
                        }}
                      >
                        {item.quantity}x
                      </div>
                      <div style={{ fontSize: '14px', color: tokens.colors.text }}>{item.product_name}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.text }}>
                      ₪{item.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {declining && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text, marginBottom: '12px' }}>
                Why are you declining?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {declineReasons.map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => setDeclineReason(reason.value)}
                    style={{
                      padding: '14px',
                      background:
                        declineReason === reason.value ? tokens.colors.brand.primary : tokens.colors.bg,
                      border: `1px solid ${
                        declineReason === reason.value
                          ? tokens.colors.brand.primary
                          : tokens.colors.background.cardBorder
                      }`,
                      borderRadius: '12px',
                      color: declineReason === reason.value ? '#fff' : tokens.colors.text,
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: '24px',
            borderTop: `1px solid ${tokens.colors.background.cardBorder}`,
            display: 'flex',
            gap: '12px',
          }}
        >
          {!declining ? (
            <>
              <Button
                onClick={onAccept}
                variant="primary"
                size="large"
                style={{
                  flex: 2,
                  height: '56px',
                  fontSize: '17px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                }}
              >
                ✅ Accept Order
              </Button>
              <button
                onClick={handleDecline}
                style={{
                  flex: 1,
                  height: '56px',
                  background: tokens.colors.bg,
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  borderRadius: '16px',
                  color: tokens.colors.text,
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Decline
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setDeclining(false)}
                style={{
                  flex: 1,
                  height: '56px',
                  background: tokens.colors.bg,
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  borderRadius: '16px',
                  color: tokens.colors.text,
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <Button
                onClick={handleDecline}
                disabled={!declineReason}
                variant="primary"
                size="large"
                style={{
                  flex: 2,
                  height: '56px',
                  fontSize: '17px',
                  fontWeight: '700',
                  background: declineReason
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'rgba(239, 68, 68, 0.3)',
                  border: 'none',
                  borderRadius: '16px',
                  opacity: declineReason ? 1 : 0.5,
                  cursor: declineReason ? 'pointer' : 'not-allowed',
                }}
              >
                ❌ Confirm Decline
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function calculateEstimatedEarnings(assignment: AssignmentWithOrder): number {
  const baseRate = 15;
  const distance = calculateDistance(assignment);
  const distanceRate = distance * 3;
  const total = baseRate + distanceRate;
  return Math.round(total);
}

function calculateDistance(assignment: AssignmentWithOrder): number {
  return Math.random() * 5 + 2;
}

function parseAddressToCoords(address: string): { lat: number; lng: number } {
  const baseCoords = { lat: 32.0853, lng: 34.7818 };
  const offset = (Math.random() - 0.5) * 0.1;
  return {
    lat: baseCoords.lat + offset,
    lng: baseCoords.lng + offset,
  };
}
