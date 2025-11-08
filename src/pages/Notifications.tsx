import React, { useEffect, useState } from 'react';
import { telegram } from '../lib/telegram';
import { DataStore, Notification } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { Toast } from '../components/Toast';
import { logger } from '../lib/logger';

interface NotificationsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Notifications({ dataStore, onNavigate }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    telegram.setBackButton(() => onNavigate('chat'));
    return () => telegram.hideBackButton();
  }, [onNavigate]);

  useEffect(() => {
    loadNotifications();

    let unsubscribe: (() => void) | undefined;
    if (dataStore.subscribeToChanges) {
      unsubscribe = dataStore.subscribeToChanges('notifications', (payload) => {
        if (payload.new || payload.old) {
          loadNotifications();
        }
      });
    }

    const interval = setInterval(loadNotifications, 30000);
    return () => {
      clearInterval(interval);
      if (unsubscribe) unsubscribe();
    };
  }, [filter]);

  const loadNotifications = async () => {
    try {
      if (!dataStore.listNotifications) {
        setLoading(false);
        return;
      }

      const fetchFilters: any = { limit: 100 };
      if (filter === 'unread') {
        fetchFilters.unreadOnly = true;
      }

      const allNotifications = await dataStore.listNotifications(fetchFilters);

      const filteredNotifications = filter === 'all'
        ? allNotifications
        : filter === 'read'
        ? allNotifications.filter(n => n.read_at)
        : allNotifications;

      setNotifications(filteredNotifications);
    } catch (error) {
      logger.error('Failed to load notifications:', error);
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
      logger.error('Failed to mark notification as read:', error);
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
      logger.error('Failed to mark all as read:', error);
      Toast.error('שגיאה בסימון התראות');
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'order_assigned': return '📦';
      case 'order_completed': return '✅';
      case 'low_stock': return '⚠️';
      case 'restock_approved': return '🔄';
      case 'user_registered': return '👤';
      case 'system_alert': return '🔔';
      default: return '📬';
    }
  };

  const getNotificationColor = (type?: string, isRead?: boolean) => {
    if (isRead) return ROYAL_COLORS.muted;
    switch (type) {
      case 'order_assigned': return ROYAL_COLORS.teal;
      case 'order_completed': return ROYAL_COLORS.emerald;
      case 'low_stock': return ROYAL_COLORS.crimson;
      case 'restock_approved': return ROYAL_COLORS.accent;
      case 'user_registered': return ROYAL_COLORS.gold;
      default: return ROYAL_COLORS.text;
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0033 0%, #0a001a 100%)',
      paddingTop: '16px',
      paddingBottom: '80px',
      direction: 'rtl'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '0 16px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '700',
            color: ROYAL_COLORS.text,
            textShadow: '0 0 20px rgba(29, 155, 240, 0.5)'
          }}>
            התראות {unreadCount > 0 && <span style={{ color: ROYAL_COLORS.accent }}>({unreadCount})</span>}
          </h2>
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
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                background: filter === f.id
                  ? 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)'
                  : ROYAL_COLORS.card,
                color: ROYAL_COLORS.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: filter === f.id ? '0 4px 12px rgba(29, 155, 240, 0.3)' : 'none',
                transition: 'all 0.3s ease'
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
              padding: '14px',
              borderRadius: '12px',
              border: `1px solid ${ROYAL_COLORS.cardBorder}`,
              background: ROYAL_COLORS.card,
              color: ROYAL_COLORS.accent,
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            סמן הכל כנקרא
          </button>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔔</div>
            <p style={{ color: ROYAL_COLORS.muted, fontSize: '16px' }}>טוען התראות...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{
            ...ROYAL_STYLES.emptyState,
            padding: '60px 20px',
            borderRadius: '16px',
            background: ROYAL_COLORS.card
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔔</div>
            <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text, fontSize: '20px' }}>
              אין התראות
            </h3>
            <div style={{ ...ROYAL_STYLES.emptyStateText, fontSize: '15px' }}>
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
                  borderRadius: '16px',
                  background: notification.read_at
                    ? ROYAL_COLORS.card
                    : 'rgba(29, 155, 240, 0.1)',
                  border: `1px solid ${notification.read_at ? ROYAL_COLORS.cardBorder : ROYAL_COLORS.accent}40`,
                  cursor: notification.read_at ? 'default' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: notification.read_at ? 0.7 : 1,
                  boxShadow: notification.read_at ? 'none' : '0 4px 12px rgba(29, 155, 240, 0.2)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: `${getNotificationColor(notification.type, !!notification.read_at)}20`,
                    border: `2px solid ${getNotificationColor(notification.type, !!notification.read_at)}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    flexShrink: 0
                  }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: notification.read_at ? '500' : '700',
                      color: notification.read_at ? ROYAL_COLORS.muted : ROYAL_COLORS.text,
                      marginBottom: '6px'
                    }}>
                      {notification.title}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: ROYAL_COLORS.muted,
                      marginBottom: '8px',
                      lineHeight: '1.6'
                    }}>
                      {notification.message}
                    </div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
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
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: ROYAL_COLORS.accent,
                      flexShrink: 0,
                      marginTop: '8px',
                      boxShadow: '0 0 8px rgba(29, 155, 240, 0.6)'
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
