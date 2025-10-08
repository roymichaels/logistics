import React, { useState, useEffect } from 'react';
import { DataStore, Notification } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { Toast } from './Toast';

interface NotificationCenterProps {
  dataStore: DataStore;
  onClose?: () => void;
}

export function NotificationCenter({ dataStore, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadNotifications = async () => {
    try {
      if (!dataStore.listNotifications) {
        setLoading(false);
        return;
      }

      const allNotifications = await dataStore.listNotifications({ limit: 100 });

      const filteredNotifications = filter === 'all'
        ? allNotifications
        : filter === 'unread'
        ? allNotifications.filter(n => !n.read_at)
        : allNotifications.filter(n => n.read_at);

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      if (!dataStore.markNotificationAsRead) return;

      await dataStore.markNotificationAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      Toast.error('שגיאה בסימון התראה');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);

      if (unreadIds.length === 0) {
        Toast.show('אין התראות לא נקראות', 'info');
        return;
      }

      if (!dataStore.markNotificationAsRead) return;

      await Promise.all(unreadIds.map(id => dataStore.markNotificationAsRead!(id)));
      await loadNotifications();
      Toast.success('כל ההתראות סומנו כנקראו');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      Toast.error('שגיאה בסימון התראות');
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'order_assigned':
        return '📦';
      case 'order_completed':
        return '✅';
      case 'low_stock':
        return '⚠️';
      case 'restock_approved':
        return '🔄';
      case 'user_registered':
        return '👤';
      case 'system_alert':
        return '🔔';
      default:
        return '📬';
    }
  };

  const getNotificationColor = (type?: string, isRead?: boolean) => {
    if (isRead) return ROYAL_COLORS.muted;

    switch (type) {
      case 'order_assigned':
        return ROYAL_COLORS.teal;
      case 'order_completed':
        return ROYAL_COLORS.emerald;
      case 'low_stock':
        return ROYAL_COLORS.crimson;
      case 'restock_approved':
        return ROYAL_COLORS.accent;
      case 'user_registered':
        return ROYAL_COLORS.gold;
      default:
        return ROYAL_COLORS.text;
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      direction: 'rtl'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        background: ROYAL_COLORS.background,
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        padding: '24px',
        overflowY: 'auto',
        boxShadow: ROYAL_COLORS.shadow
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: ROYAL_COLORS.text }}>
            התראות {unreadCount > 0 && `(${unreadCount})`}
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              color: ROYAL_COLORS.text,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'all', label: 'הכל' },
            { id: 'unread', label: `לא נקראו (${unreadCount})` },
            { id: 'read', label: 'נקראו' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: filter === f.id
                  ? 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)'
                  : ROYAL_COLORS.card,
                color: ROYAL_COLORS.text,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              background: ROYAL_COLORS.card,
              color: ROYAL_COLORS.accent,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px'
            }}
          >
            סמן הכל כנקרא
          </button>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <p style={{ color: ROYAL_COLORS.muted }}>טוען התראות...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={ROYAL_STYLES.emptyState}>
            <div style={ROYAL_STYLES.emptyStateIcon}>🔔</div>
            <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text }}>
              אין התראות
            </h3>
            <div style={ROYAL_STYLES.emptyStateText}>
              {filter === 'unread' ? 'כל ההתראות נקראו' : 'אין התראות להצגה'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => !notification.read_at && handleMarkAsRead(notification.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: notification.read_at
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'rgba(156, 109, 255, 0.1)',
                  border: `1px solid ${notification.read_at ? ROYAL_COLORS.cardBorder : ROYAL_COLORS.accent}40`,
                  cursor: notification.read_at ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: notification.read_at ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `${getNotificationColor(notification.type, !!notification.read_at)}20`,
                    border: `1px solid ${getNotificationColor(notification.type, !!notification.read_at)}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: notification.read_at ? '500' : '600',
                      color: notification.read_at ? ROYAL_COLORS.muted : ROYAL_COLORS.text,
                      marginBottom: '4px'
                    }}>
                      {notification.title}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: ROYAL_COLORS.muted,
                      marginBottom: '8px',
                      lineHeight: '1.5'
                    }}>
                      {notification.message}
                    </div>
                    <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>
                      {new Date(notification.created_at).toLocaleString('he-IL', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  {!notification.read_at && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: ROYAL_COLORS.accent,
                      flexShrink: 0,
                      marginTop: '6px'
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
