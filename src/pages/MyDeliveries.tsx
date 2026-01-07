import React, { useEffect, useState } from 'react';
import { tokens } from '../styles/tokens';
import { useI18n } from '../lib/i18n';
import { haptic } from '../utils/haptic';
import { assignmentService, AssignmentWithOrder } from '../services/assignments';
import { useAuth } from '../context/AuthContext';
import { logger } from '../lib/logger';
import { Toast } from '../components/Toast';

interface MyDeliveriesProps {
  dataStore?: any;
  onNavigate?: (page: string) => void;
}

export function MyDeliveries({}: MyDeliveriesProps) {
  const { user } = useAuth();
  const { translations, isRTL } = useI18n();
  const [deliveries, setDeliveries] = useState<AssignmentWithOrder[]>([]);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadDeliveries();

      // Subscribe to real-time updates
      const unsubscribe = assignmentService.subscribeToDriverAssignments(
        user.id,
        handleNewAssignment,
        handleAssignmentUpdate
      );

      return () => unsubscribe();
    }
  }, [user]);

  const loadDeliveries = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await assignmentService.getDriverActiveAssignments(user.id);

      if (error) {
        logger.error('[MyDeliveries] Failed to load deliveries', error);
        Toast.error('Failed to load deliveries');
        return;
      }

      setDeliveries(data);
    } catch (error) {
      logger.error('[MyDeliveries] Exception loading deliveries', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewAssignment = (assignment: any) => {
    logger.info('[MyDeliveries] New assignment received', assignment);
    Toast.success('משימה חדשה התקבלה!');
    haptic('success');
    loadDeliveries();
  };

  const handleAssignmentUpdate = (assignment: any) => {
    logger.info('[MyDeliveries] Assignment updated', assignment);
    loadDeliveries();
  };

  const handleAcceptDelivery = async (assignmentId: string) => {
    try {
      setActionLoading(assignmentId);
      haptic('medium');

      const { error } = await assignmentService.acceptAssignment(assignmentId);

      if (error) {
        logger.error('[MyDeliveries] Failed to accept assignment', error);
        Toast.error('Failed to accept delivery');
        return;
      }

      Toast.success('משימה התקבלה בהצלחה!');
      haptic('success');
      loadDeliveries();
    } catch (error) {
      logger.error('[MyDeliveries] Exception accepting assignment', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePickup = async (assignmentId: string) => {
    try {
      setActionLoading(assignmentId);
      haptic('medium');

      const { error } = await assignmentService.markOrderPickedUp(assignmentId);

      if (error) {
        logger.error('[MyDeliveries] Failed to mark as picked up', error);
        Toast.error('Failed to mark as picked up');
        return;
      }

      Toast.success('סומן כנאסף!');
      haptic('success');
      loadDeliveries();
    } catch (error) {
      logger.error('[MyDeliveries] Exception marking picked up', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (assignmentId: string) => {
    try {
      setActionLoading(assignmentId);
      haptic('medium');

      const { error } = await assignmentService.markOrderDelivered(assignmentId);

      if (error) {
        logger.error('[MyDeliveries] Failed to mark as delivered', error);
        Toast.error('Failed to complete delivery');
        return;
      }

      Toast.success('משלוח הושלם בהצלחה!');
      haptic('success');
      loadDeliveries();
    } catch (error) {
      logger.error('[MyDeliveries] Exception completing delivery', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return tokens.colors.brand.primary;
      case 'accepted':
        return tokens.colors.status.warning;
      case 'picked_up':
        return tokens.colors.status.info;
      case 'delivered':
        return tokens.colors.status.success;
      default:
        return tokens.colors.subtle;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'משימה חדשה';
      case 'accepted':
        return 'התקבל';
      case 'picked_up':
        return 'נאסף';
      case 'delivered':
        return 'הושלם';
      default:
        return status;
    }
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['accepted', 'picked_up'].includes(delivery.status);
    if (filter === 'upcoming') return delivery.status === 'assigned';
    if (filter === 'completed') return delivery.status === 'delivered';
    return true;
  });

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: tokens.colors.panel
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <div style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600' }}>
            טוען משלוחים...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.colors.panel,
        padding: '20px',
        paddingBottom: '100px',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          margin: '0 0 8px 0',
          color: tokens.colors.text
        }}>
          📦 המשלוחים שלי
        </h1>
        <p style={{ margin: '0', color: tokens.colors.subtle, fontSize: '16px' }}>
          {filteredDeliveries.length} משימות פעילות
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {[
          { value: 'all', label: 'הכל', count: deliveries.length },
          { value: 'upcoming', label: 'ממתין', count: deliveries.filter(d => d.status === 'assigned').length },
          { value: 'active', label: 'פעיל', count: deliveries.filter(d => ['accepted', 'picked_up'].includes(d.status)).length },
        ].map((filterOption) => {
          const isActive = filter === filterOption.value;
          return (
            <button
              key={filterOption.value}
              onClick={() => {
                setFilter(filterOption.value as any);
                haptic('light');
              }}
              style={{
                padding: '10px 20px',
                background: isActive
                  ? tokens.gradients.primary
                  : tokens.colors.bg,
                border: isActive
                  ? 'none'
                  : `1px solid ${tokens.colors.background.cardBorder}`,
                borderRadius: '12px',
                color: isActive ? '#ffffff' : tokens.colors.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? tokens.glows.primaryStrong : 'none'
              }}
            >
              {filterOption.label} ({filterOption.count})
            </button>
          );
        })}
      </div>

      {/* Deliveries List */}
      {filteredDeliveries.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: tokens.colors.background.card,
          borderRadius: '20px',
          border: `1px solid ${tokens.colors.background.cardBorder}`
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: tokens.colors.text,
            marginBottom: '8px'
          }}>
            אין משימות
          </h3>
          <p style={{ color: tokens.colors.subtle, fontSize: '14px' }}>
            כשיהיו משימות חדשות, הן יופיעו כאן
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredDeliveries.map((delivery) => {
            const isExpanded = expandedDelivery === delivery.id;
            const isLoading = actionLoading === delivery.id;

            return (
              <div
                key={delivery.id}
                style={{
                  background: tokens.colors.background.card,
                  borderRadius: '16px',
                  border: `1px solid ${tokens.colors.background.cardBorder}`,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: tokens.shadows.md
                }}
              >
                {/* Delivery Header */}
                <div
                  onClick={() => {
                    setExpandedDelivery(isExpanded ? null : delivery.id);
                    haptic('light');
                  }}
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    borderBottom: isExpanded ? `1px solid ${tokens.colors.background.cardBorder}` : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: tokens.colors.text,
                        marginBottom: '4px'
                      }}>
                        {delivery.order.order_number}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: tokens.colors.subtle
                      }}>
                        {delivery.order.customer_name || 'לקוח'}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div style={{
                      padding: '6px 14px',
                      background: `${getStatusColor(delivery.status)}20`,
                      border: `1px solid ${getStatusColor(delivery.status)}50`,
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: getStatusColor(delivery.status)
                    }}>
                      {getStatusText(delivery.status)}
                    </div>
                  </div>

                  {/* Address */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginTop: '12px'
                  }}>
                    <div style={{ fontSize: '18px' }}>📍</div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        color: tokens.colors.text,
                        fontWeight: '500',
                        marginBottom: '4px'
                      }}>
                        {delivery.order.delivery_address || 'כתובת לא צוינה'}
                      </div>
                      {delivery.order.delivery_instructions && (
                        <div style={{
                          fontSize: '13px',
                          color: tokens.colors.subtle
                        }}>
                          {delivery.order.delivery_instructions}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '20px', paddingTop: '16px' }}>
                    {/* Items */}
                    {delivery.order.items && delivery.order.items.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: tokens.colors.text,
                          marginBottom: '8px'
                        }}>
                          פריטים:
                        </div>
                        {delivery.order.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '8px',
                              background: tokens.colors.bg,
                              borderRadius: '8px',
                              marginBottom: '4px'
                            }}
                          >
                            <span style={{ fontSize: '14px', color: tokens.colors.text }}>
                              {item.quantity}x {item.product_name}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: tokens.colors.text }}>
                              ₪{item.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: 'linear-gradient(135deg, rgba(77, 208, 225, 0.15), rgba(77, 208, 225, 0.05))',
                      borderRadius: '12px',
                      marginBottom: '16px'
                    }}>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: tokens.colors.text }}>
                        סה"כ:
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: tokens.colors.brand.primary }}>
                        ₪{delivery.order.total_amount}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {delivery.status === 'assigned' && (
                        <button
                          onClick={() => handleAcceptDelivery(delivery.id)}
                          disabled={isLoading}
                          style={{
                            flex: 1,
                            padding: '14px',
                            background: tokens.gradients.primary,
                            border: 'none',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            boxShadow: tokens.glows.primaryStrong
                          }}
                        >
                          {isLoading ? 'מעבד...' : 'קבל משימה'}
                        </button>
                      )}

                      {delivery.status === 'accepted' && (
                        <button
                          onClick={() => handlePickup(delivery.id)}
                          disabled={isLoading}
                          style={{
                            flex: 1,
                            padding: '14px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
                          }}
                        >
                          {isLoading ? 'מעבד...' : 'סמן כנאסף'}
                        </button>
                      )}

                      {delivery.status === 'picked_up' && (
                        <button
                          onClick={() => handleComplete(delivery.id)}
                          disabled={isLoading}
                          style={{
                            flex: 1,
                            padding: '14px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                          }}
                        >
                          {isLoading ? 'מעבד...' : 'השלם משלוח'}
                        </button>
                      )}

                      {delivery.order.customer_phone && (
                        <button
                          onClick={() => {
                            window.location.href = `tel:${delivery.order.customer_phone}`;
                            haptic('light');
                          }}
                          style={{
                            padding: '14px 20px',
                            background: tokens.colors.bg,
                            border: `1px solid ${tokens.colors.background.cardBorder}`,
                            borderRadius: '12px',
                            fontSize: '20px',
                            cursor: 'pointer'
                          }}
                        >
                          📞
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
