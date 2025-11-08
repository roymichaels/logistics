import React, { useState, useEffect } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { Toast } from './Toast';

export interface OrderForAssignment {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: any[];
  total_amount: number;
  notes?: string;
  pickup_location?: string;
  estimated_distance?: number;
  estimated_time?: number;
}

export interface AssignmentDetails {
  assignment_id: string;
  order: OrderForAssignment;
  timeout_at: string;
  assigned_by: string;
}

interface DriverAssignmentModalProps {
  assignment: AssignmentDetails;
  onAccept: (assignmentId: string) => Promise<void>;
  onDecline: (assignmentId: string, reason?: string) => Promise<void>;
  onClose: () => void;
  theme?: any;
}

export function DriverAssignmentModal({
  assignment,
  onAccept,
  onDecline,
  onClose,
  theme
}: DriverAssignmentModalProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const timeout = new Date(assignment.timeout_at).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.floor((timeout - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        Toast.error('זמן התגובה פג');
        setTimeout(onClose, 2000);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [assignment.timeout_at, onClose]);

  const handleAccept = async () => {
    if (isAccepting) return;

    setIsAccepting(true);
    try {
      await onAccept(assignment.assignment_id);
      Toast.success('הזמנה התקבלה בהצלחה!');
      onClose();
    } catch (error) {
      logger.error('Failed to accept assignment:', error);
      Toast.error('שגיאה בקבלת ההזמנה');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (isDeclining) return;

    setIsDeclining(true);
    try {
      await onDecline(assignment.assignment_id, declineReason || undefined);
      Toast.info('הזמנה נדחתה');
      onClose();
    } catch (error) {
      logger.error('Failed to decline assignment:', error);
      Toast.error('שגיאה בדחיית ההזמנה');
    } finally {
      setIsDeclining(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalItems = assignment.order.items.reduce((sum, item) => sum + item.quantity, 0);
  const isUrgent = timeRemaining < 60;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        direction: 'rtl'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: ROYAL_COLORS.card,
          border: `2px solid ${isUrgent ? ROYAL_COLORS.crimson : ROYAL_COLORS.cardBorder}`,
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: isUrgent ? ROYAL_COLORS.glowCrimson : ROYAL_COLORS.glowPurpleStrong,
          animation: isUrgent ? 'pulse 2s infinite' : 'none'
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: '24px',
            padding: '16px',
            background: isUrgent
              ? `linear-gradient(135deg, ${ROYAL_COLORS.crimson}20, ${ROYAL_COLORS.warning}20)`
              : `linear-gradient(135deg, ${ROYAL_COLORS.accent}20, ${ROYAL_COLORS.accentBright}20)`,
            borderRadius: '16px',
            border: `1px solid ${isUrgent ? ROYAL_COLORS.crimson : ROYAL_COLORS.accent}50`
          }}
        >
          <div
            style={{
              fontSize: '48px',
              fontWeight: '700',
              color: isUrgent ? ROYAL_COLORS.crimson : ROYAL_COLORS.accent,
              marginBottom: '8px',
              textShadow: isUrgent ? ROYAL_COLORS.glowCrimson : ROYAL_COLORS.glowPurple
            }}
          >
            {formatTime(timeRemaining)}
          </div>
          <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, fontWeight: '600' }}>
            {isUrgent ? 'זמן אוזל!' : 'זמן להגיב'}
          </div>
        </div>

        <h2
          style={{
            margin: '0 0 24px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: ROYAL_COLORS.text,
            textAlign: 'center',
            textShadow: ROYAL_COLORS.glowPurple
          }}
        >
          הזמנה חדשה מחכה לך
        </h2>

        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              ...ROYAL_STYLES.card,
              marginBottom: '16px',
              background: ROYAL_COLORS.secondary
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '32px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: ROYAL_COLORS.gradientPurple,
                  borderRadius: '12px'
                }}
              >
                👤
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.text }}>
                  {assignment.order.customer_name}
                </div>
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
                  {assignment.order.customer_phone}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>📍</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                  כתובת מסירה
                </div>
                <div style={{ fontSize: '16px', color: ROYAL_COLORS.text, lineHeight: '1.5' }}>
                  {assignment.order.customer_address}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px'
            }}
          >
            <div
              style={{
                ...ROYAL_STYLES.statBox,
                background: ROYAL_COLORS.secondary
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.gold,
                  marginBottom: '4px'
                }}
              >
                ₪{assignment.order.total_amount.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>סכום הזמנה</div>
            </div>

            <div
              style={{
                ...ROYAL_STYLES.statBox,
                background: ROYAL_COLORS.secondary
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.accentBright,
                  marginBottom: '4px'
                }}
              >
                {totalItems}
              </div>
              <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>פריטים</div>
            </div>
          </div>

          {(assignment.order.estimated_distance || assignment.order.estimated_time) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
              }}
            >
              {assignment.order.estimated_distance && (
                <div
                  style={{
                    padding: '12px',
                    background: ROYAL_COLORS.secondary,
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: `1px solid ${ROYAL_COLORS.cardBorder}`
                  }}
                >
                  <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                    מרחק משוער
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.info }}>
                    {assignment.order.estimated_distance.toFixed(1)} ק"מ
                  </div>
                </div>
              )}

              {assignment.order.estimated_time && (
                <div
                  style={{
                    padding: '12px',
                    background: ROYAL_COLORS.secondary,
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: `1px solid ${ROYAL_COLORS.cardBorder}`
                  }}
                >
                  <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                    זמן משוער
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: ROYAL_COLORS.success }}>
                    {assignment.order.estimated_time} דקות
                  </div>
                </div>
              )}
            </div>
          )}

          {assignment.order.items && assignment.order.items.length > 0 && (
            <div
              style={{
                ...ROYAL_STYLES.card,
                background: ROYAL_COLORS.secondary,
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.text,
                  marginBottom: '12px'
                }}
              >
                פריטי ההזמנה
              </div>
              {assignment.order.items.map((item: any, index: number) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom:
                      index < assignment.order.items.length - 1
                        ? `1px solid ${ROYAL_COLORS.cardBorder}50`
                        : 'none'
                  }}
                >
                  <span style={{ color: ROYAL_COLORS.text }}>{item.product_name || item.name}</span>
                  <span style={{ color: ROYAL_COLORS.muted }}>×{item.quantity}</span>
                </div>
              ))}
            </div>
          )}

          {assignment.order.notes && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: `${ROYAL_COLORS.warning}20`,
                border: `1px solid ${ROYAL_COLORS.warning}50`,
                borderRadius: '12px'
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: ROYAL_COLORS.warning,
                  marginBottom: '4px'
                }}
              >
                הערות
              </div>
              <div style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>
                {assignment.order.notes}
              </div>
            </div>
          )}
        </div>

        {!showDeclineForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleAccept}
              disabled={isAccepting || timeRemaining === 0}
              style={{
                ...ROYAL_STYLES.buttonPrimary,
                width: '100%',
                fontSize: '18px',
                padding: '16px',
                opacity: isAccepting || timeRemaining === 0 ? 0.5 : 1,
                cursor: isAccepting || timeRemaining === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {isAccepting ? 'מאשר...' : '✅ אני לוקח את ההזמנה'}
            </button>

            <button
              onClick={() => setShowDeclineForm(true)}
              disabled={isDeclining || timeRemaining === 0}
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                width: '100%',
                fontSize: '16px',
                padding: '14px'
              }}
            >
              ❌ לא יכול לקחת
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: ROYAL_COLORS.text
                }}
              >
                סיבת הדחייה (אופציונלי)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="למה אתה לא יכול לקחת את ההזמנה?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: ROYAL_COLORS.secondary,
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                  borderRadius: '12px',
                  color: ROYAL_COLORS.text,
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleDecline}
                disabled={isDeclining}
                style={{
                  ...ROYAL_STYLES.buttonDanger,
                  width: '100%',
                  opacity: isDeclining ? 0.5 : 1,
                  cursor: isDeclining ? 'not-allowed' : 'pointer'
                }}
              >
                {isDeclining ? 'שולח...' : 'אשר דחייה'}
              </button>

              <button
                onClick={() => {
                  setShowDeclineForm(false);
                  setDeclineReason('');
                }}
                disabled={isDeclining}
                style={{
                  ...ROYAL_STYLES.buttonSecondary,
                  width: '100%'
                }}
              >
                חזור
              </button>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              box-shadow: ${ROYAL_COLORS.glowCrimson};
            }
            50% {
              box-shadow: 0 0 40px rgba(255, 107, 138, 0.6);
            }
          }
        `}
      </style>
    </div>
  );
}
