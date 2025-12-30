import React, { useEffect, useState } from 'react';
import { ROYAL_COLORS } from '../styles/royalTheme';
import { DataStore } from '../data/types';
import { useI18n } from '../lib/i18n';
import { haptic } from '../utils/haptic';

interface MyDeliveriesProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface DeliveryItem {
  name: string;
  quantity: number;
  notes?: string;
}

interface Delivery {
  id: string;
  customer: string;
  customerPhone: string;
  address: string;
  addressDetails: string;
  window: string;
  status: 'assigned' | 'in_progress' | 'delivered' | 'ready';
  items: DeliveryItem[];
  totalAmount: number;
  distance: string;
  estimatedTime: string;
  instructions?: string;
  priority: 'normal' | 'urgent';
}

export function MyDeliveries({ dataStore }: MyDeliveriesProps) {
  const { translations, isRTL } = useI18n();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dataStore.getProfile().catch(() => undefined);
  }, [dataStore]);

  useEffect(() => {
    setDeliveries([
      {
        id: 'DL-78201',
        customer: 'מאפיית השדרה',
        customerPhone: '052-1234567',
        address: 'בן יהודה 128, תל אביב',
        addressDetails: 'קומה 2, דלת שמאל',
        window: '10:00 - 12:00',
        status: 'assigned',
        items: [
          { name: 'לחם מחמצת', quantity: 5 },
          { name: 'חלות שבת', quantity: 3, notes: 'קלועות' }
        ],
        totalAmount: 245,
        distance: '2.5 ק"מ',
        estimatedTime: '15 דקות',
        instructions: 'להתקשר כשמגיעים למטה',
        priority: 'normal'
      },
      {
        id: 'DL-78195',
        customer: 'מרכז טבעי',
        customerPhone: '054-9876543',
        address: 'שדרות ההסתדרות 45, חיפה',
        addressDetails: 'מתחם עסקים, בניין B',
        window: '12:00 - 14:00',
        status: 'in_progress',
        items: [
          { name: 'ירקות אורגניים', quantity: 2 },
          { name: 'פירות יבשים', quantity: 4 }
        ],
        totalAmount: 380,
        distance: '5.8 ק"מ',
        estimatedTime: '25 דקות',
        priority: 'urgent'
      },
      {
        id: 'DL-78188',
        customer: 'קפה הצפון',
        customerPhone: '053-5551234',
        address: 'אלנבי 45, תל אביב',
        addressDetails: 'קפה בקומת הקרקע',
        window: '14:00 - 16:00',
        status: 'ready',
        items: [
          { name: 'פולי קפה', quantity: 10 },
          { name: 'חלב שקדים', quantity: 6 }
        ],
        totalAmount: 520,
        distance: '3.2 ק"מ',
        estimatedTime: '18 דקות',
        instructions: 'כניסה מהצד',
        priority: 'normal'
      },
      {
        id: 'DL-78177',
        customer: 'סופרמרקט עדן',
        customerPhone: '050-7778899',
        address: 'דרך מנחם בגין 52, תל אביב',
        addressDetails: 'קומת מרתף, מחסן',
        window: '08:00 - 10:00',
        status: 'delivered',
        items: [
          { name: 'תבלינים', quantity: 15 },
          { name: 'שמנים', quantity: 8 }
        ],
        totalAmount: 680,
        distance: '4.1 ק"מ',
        estimatedTime: '20 דקות',
        priority: 'normal'
      }
    ]);
  }, []);

  const handleStatusChange = (id: string, status: Delivery['status']) => {
    setDeliveries((prev) =>
      prev.map((delivery) => (delivery.id === id ? { ...delivery, status } : delivery))
    );
    haptic('light');
  };

  const toggleExpand = (id: string) => {
    setExpandedDelivery(expandedDelivery === id ? null : id);
    haptic('light');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone.replace(/[^0-9]/g, '')}`, '_self');
    haptic('medium');
  };

  const handleNavigate = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    haptic('medium');
  };

  const statusConfig = {
    assigned: {
      label: translations.myDeliveriesPage?.readyToGo || 'Ready to Go',
      color: ROYAL_COLORS.info,
      icon: '📋',
      nextStatus: 'in_progress' as const
    },
    ready: {
      label: 'מוכן לאיסוף',
      color: ROYAL_COLORS.warning,
      icon: '📦',
      nextStatus: 'in_progress' as const
    },
    in_progress: {
      label: translations.myDeliveriesPage?.onTheWay || 'On the Way',
      color: ROYAL_COLORS.gold,
      icon: '🚗',
      nextStatus: 'delivered' as const
    },
    delivered: {
      label: translations.myDeliveriesPage?.delivered || 'Delivered',
      color: ROYAL_COLORS.success,
      icon: '✅',
      nextStatus: null
    }
  };

  const getFilteredDeliveries = () => {
    let filtered = deliveries;

    if (filter === 'active') {
      filtered = filtered.filter(d => d.status === 'in_progress' || d.status === 'ready');
    } else if (filter === 'upcoming') {
      filtered = filtered.filter(d => d.status === 'assigned');
    } else if (filter === 'completed') {
      filtered = filtered.filter(d => d.status === 'delivered');
    }

    if (searchQuery) {
      filtered = filtered.filter(d =>
        d.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return 0;
    });
  };

  const filteredDeliveries = getFilteredDeliveries();

  const countByStatus = {
    active: deliveries.filter(d => d.status === 'in_progress' || d.status === 'ready').length,
    upcoming: deliveries.filter(d => d.status === 'assigned').length,
    completed: deliveries.filter(d => d.status === 'delivered').length
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: ROYAL_COLORS.background,
        color: ROYAL_COLORS.text,
        padding: '20px',
        paddingBottom: '100px',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', color: ROYAL_COLORS.text }}>
          🚚 {translations.myDeliveriesPage?.title || 'My Deliveries'}
        </h1>
        <p style={{ margin: '0', color: ROYAL_COLORS.muted, fontSize: '14px' }}>
          {translations.myDeliveriesPage?.subtitle || 'Manage your delivery tasks'}
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 חיפוש לפי לקוח, כתובת או מספר הזמנה..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: ROYAL_COLORS.card,
            border: `1px solid ${ROYAL_COLORS.cardBorder}`,
            borderRadius: '14px',
            color: ROYAL_COLORS.text,
            fontSize: '15px',
            outline: 'none',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = ROYAL_COLORS.accent;
            e.target.style.boxShadow = `0 0 0 3px ${ROYAL_COLORS.accent}20`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = ROYAL_COLORS.cardBorder;
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { key: 'all', label: 'הכל', count: deliveries.length },
          { key: 'active', label: 'פעילות', count: countByStatus.active },
          { key: 'upcoming', label: 'ממתינות', count: countByStatus.upcoming },
          { key: 'completed', label: 'הושלמו', count: countByStatus.completed }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => {
              setFilter(key as typeof filter);
              haptic('light');
            }}
            style={{
              padding: '10px 18px',
              background: filter === key ? ROYAL_COLORS.gradientPurple : ROYAL_COLORS.card,
              border: `1px solid ${filter === key ? 'transparent' : ROYAL_COLORS.cardBorder}`,
              borderRadius: '12px',
              color: filter === key ? ROYAL_COLORS.textBright : ROYAL_COLORS.muted,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: filter === key ? ROYAL_COLORS.glowPurpleStrong : 'none'
            }}
          >
            {label}
            <span style={{
              background: filter === key ? 'rgba(255,255,255,0.2)' : ROYAL_COLORS.secondary,
              padding: '2px 8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700'
            }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Deliveries List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredDeliveries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: ROYAL_COLORS.card,
            borderRadius: '20px',
            border: `1px solid ${ROYAL_COLORS.cardBorder}`
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '8px' }}>
              לא נמצאו משלוחים
            </div>
            <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>
              נסה לשנות את הסינון או החיפוש
            </div>
          </div>
        ) : (
          filteredDeliveries.map((delivery) => {
            const isExpanded = expandedDelivery === delivery.id;
            const config = statusConfig[delivery.status];

            return (
              <div
                key={delivery.id}
                style={{
                  backgroundColor: ROYAL_COLORS.card,
                  borderRadius: '20px',
                  border: `2px solid ${isExpanded ? config.color : ROYAL_COLORS.cardBorder}`,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: isExpanded ? `0 8px 24px ${config.color}30` : ROYAL_COLORS.shadow,
                  position: 'relative'
                }}
              >
                {/* Priority Badge */}
                {delivery.priority === 'urgent' && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: isRTL ? 'auto' : '12px',
                    right: isRTL ? '12px' : 'auto',
                    background: ROYAL_COLORS.gradientCrimson,
                    color: ROYAL_COLORS.textBright,
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    zIndex: 1,
                    boxShadow: ROYAL_COLORS.glowCrimson
                  }}>
                    ⚡ דחוף
                  </div>
                )}

                {/* Status Border Indicator */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: isRTL ? 'auto' : 0,
                  right: isRTL ? 0 : 'auto',
                  width: '6px',
                  height: '100%',
                  background: `linear-gradient(180deg, ${config.color}, ${config.color}80)`,
                  boxShadow: `0 0 12px ${config.color}60`
                }} />

                {/* Card Header - Clickable */}
                <div
                  onClick={() => toggleExpand(delivery.id)}
                  style={{
                    padding: '20px',
                    paddingLeft: '26px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = ROYAL_COLORS.cardHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.text, marginBottom: '6px' }}>
                        {delivery.customer}
                      </div>
                      <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{delivery.id}</span>
                        <span>•</span>
                        <span>{delivery.distance}</span>
                        <span>•</span>
                        <span>{delivery.estimatedTime}</span>
                      </div>
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      background: `${config.color}20`,
                      border: `1px solid ${config.color}50`,
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: config.color
                    }}>
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: `${ROYAL_COLORS.accent}10`,
                    borderRadius: '12px',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '16px' }}>📍</span>
                    <span style={{ fontSize: '15px', color: ROYAL_COLORS.text }}>{delivery.address}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                      fontSize: '13px',
                      color: ROYAL_COLORS.muted,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>🕐</span>
                      <span>{translations.myDeliveriesPage?.deliveryWindow || 'Delivery Window'}: {delivery.window}</span>
                    </div>
                    <div style={{
                      fontSize: '18px',
                      color: ROYAL_COLORS.text,
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}>
                      ▼
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{
                    padding: '0 20px 20px 20px',
                    borderTop: `1px solid ${ROYAL_COLORS.cardBorder}`,
                    paddingTop: '20px',
                    animation: 'fadeIn 0.3s ease'
                  }}>
                    {/* Customer Contact */}
                    <div style={{
                      background: ROYAL_COLORS.secondary,
                      padding: '16px',
                      borderRadius: '14px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '10px' }}>
                        📞 פרטי התקשרות
                      </div>
                      <div style={{ fontSize: '16px', color: ROYAL_COLORS.text, marginBottom: '8px' }}>
                        {delivery.customerPhone}
                      </div>
                      <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
                        {delivery.addressDetails}
                      </div>
                    </div>

                    {/* Items List */}
                    <div style={{
                      background: ROYAL_COLORS.secondary,
                      padding: '16px',
                      borderRadius: '14px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '12px' }}>
                        📦 פריטים במשלוח ({delivery.items.length})
                      </div>
                      {delivery.items.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 0',
                          borderBottom: idx < delivery.items.length - 1 ? `1px solid ${ROYAL_COLORS.cardBorder}` : 'none'
                        }}>
                          <div>
                            <div style={{ fontSize: '15px', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                              {item.name}
                            </div>
                            {item.notes && (
                              <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, fontStyle: 'italic' }}>
                                💡 {item.notes}
                              </div>
                            )}
                          </div>
                          <div style={{
                            background: `${ROYAL_COLORS.info}20`,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: ROYAL_COLORS.info
                          }}>
                            ×{item.quantity}
                          </div>
                        </div>
                      ))}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '12px',
                        padding: '12px',
                        background: `${ROYAL_COLORS.gold}15`,
                        borderRadius: '10px'
                      }}>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: ROYAL_COLORS.text }}>סה"כ</span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: ROYAL_COLORS.gold }}>₪{delivery.totalAmount}</span>
                      </div>
                    </div>

                    {/* Special Instructions */}
                    {delivery.instructions && (
                      <div style={{
                        background: `${ROYAL_COLORS.warning}15`,
                        border: `1px solid ${ROYAL_COLORS.warning}30`,
                        padding: '14px',
                        borderRadius: '14px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: ROYAL_COLORS.text, marginBottom: '6px' }}>
                          ⚠️ הוראות מיוחדות
                        </div>
                        <div style={{ fontSize: '14px', color: ROYAL_COLORS.text }}>
                          {delivery.instructions}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCall(delivery.customerPhone);
                        }}
                        style={{
                          padding: '16px',
                          background: ROYAL_COLORS.gradientSuccess,
                          border: 'none',
                          borderRadius: '14px',
                          color: ROYAL_COLORS.textBright,
                          fontSize: '16px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>📞</span>
                        התקשר
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(delivery.address);
                        }}
                        style={{
                          padding: '16px',
                          background: ROYAL_COLORS.gradientPurple,
                          border: 'none',
                          borderRadius: '14px',
                          color: ROYAL_COLORS.textBright,
                          fontSize: '16px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: ROYAL_COLORS.glowPurpleStrong,
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(29, 155, 240, 0.6)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = ROYAL_COLORS.glowPurpleStrong;
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>🗺️</span>
                        ניווט
                      </button>
                    </div>

                    {/* Status Change Button */}
                    {config.nextStatus && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(delivery.id, config.nextStatus!);
                        }}
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          padding: '18px',
                          background: `linear-gradient(135deg, ${config.color}, ${statusConfig[config.nextStatus].color})`,
                          border: 'none',
                          borderRadius: '14px',
                          color: ROYAL_COLORS.textBright,
                          fontSize: '18px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: `0 4px 16px ${config.color}40`,
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = `0 6px 20px ${config.color}50`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = `0 4px 16px ${config.color}40`;
                        }}
                      >
                        {statusConfig[config.nextStatus].icon} {statusConfig[config.nextStatus].label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
