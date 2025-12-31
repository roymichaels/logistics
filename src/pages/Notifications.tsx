import React, { useEffect, useState } from 'react';
import { DataStore, Notification } from '../data/types';
import { TELEGRAM_THEME } from '../styles/telegramTheme';
import { Toast } from '../components/Toast';
import { logger } from '../lib/logger';
import { hideBackButton } from '../utils/telegram';

interface NotificationsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Notifications({ dataStore, onNavigate }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  if (!dataStore) {
    return (
      <div style={{
        minHeight: '100vh',
        background: TELEGRAM_THEME.colors.background.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: TELEGRAM_THEME.spacing.xl
      }}>
        <div style={{
          textAlign: 'center',
          color: TELEGRAM_THEME.colors.text.primary
        }}>
          <div style={{ fontSize: '64px', marginBottom: TELEGRAM_THEME.spacing.lg }}>🔔</div>
          <p style={{
            fontSize: TELEGRAM_THEME.typography.fontSize.lg,
            color: TELEGRAM_THEME.colors.text.secondary
          }}>
            Loading notifications...
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    return () => hideBackButton();
  }, [onNavigate]);

  useEffect(() => {
    loadNotifications();

    let unsubscribe: (() => void) | undefined;
    if (dataStore && dataStore.subscribeToChanges) {
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
      if (!dataStore || !dataStore.listNotifications) {
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
      Toast.error('Failed to mark notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);

      if (unreadIds.length === 0) {
        Toast.show('No unread notifications', 'info');
        return;
      }

      if (!dataStore.markNotificationAsRead) return;

      await Promise.all(unreadIds.map(id => dataStore.markNotificationAsRead!(id)));
      await loadNotifications();
      Toast.success('All notifications marked as read');
    } catch (error) {
      logger.error('Failed to mark all as read:', error);
      Toast.error('Failed to mark notifications');
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
    if (isRead) return TELEGRAM_THEME.colors.text.tertiary;
    switch (type) {
      case 'order_assigned': return TELEGRAM_THEME.colors.accent.primary;
      case 'order_completed': return TELEGRAM_THEME.colors.status.success;
      case 'low_stock': return TELEGRAM_THEME.colors.status.error;
      case 'restock_approved': return TELEGRAM_THEME.colors.accent.primary;
      case 'user_registered': return TELEGRAM_THEME.colors.status.warning;
      default: return TELEGRAM_THEME.colors.text.primary;
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: TELEGRAM_THEME.colors.background.primary,
      paddingTop: TELEGRAM_THEME.spacing.lg,
      paddingBottom: '80px',
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: `0 ${TELEGRAM_THEME.spacing.lg}`
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: TELEGRAM_THEME.spacing.xl
        }}>
          <h2 style={{
            margin: 0,
            fontSize: TELEGRAM_THEME.typography.fontSize['3xl'],
            fontWeight: TELEGRAM_THEME.typography.fontWeight.bold,
            color: TELEGRAM_THEME.colors.text.primary,
          }}>
            Notifications {unreadCount > 0 && (
              <span style={{ color: TELEGRAM_THEME.colors.accent.primary }}>
                ({unreadCount})
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              style={{
                background: TELEGRAM_THEME.colors.accent.faded,
                color: TELEGRAM_THEME.colors.accent.primary,
                border: `1px solid ${TELEGRAM_THEME.colors.accent.border}`,
                borderRadius: TELEGRAM_THEME.radius.xl,
                padding: `${TELEGRAM_THEME.spacing.sm} ${TELEGRAM_THEME.spacing.lg}`,
                fontSize: TELEGRAM_THEME.typography.fontSize.sm,
                fontWeight: TELEGRAM_THEME.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: TELEGRAM_THEME.transitions.normal,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = TELEGRAM_THEME.colors.accent.light;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = TELEGRAM_THEME.colors.accent.faded;
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: TELEGRAM_THEME.spacing.sm,
          marginBottom: TELEGRAM_THEME.spacing.xl,
          borderBottom: `1px solid ${TELEGRAM_THEME.colors.border.primary}`,
        }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'read', label: 'Read' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{
                padding: `${TELEGRAM_THEME.spacing.md} ${TELEGRAM_THEME.spacing.lg}`,
                border: 'none',
                background: 'transparent',
                color: filter === f.id
                  ? TELEGRAM_THEME.colors.accent.primary
                  : TELEGRAM_THEME.colors.text.secondary,
                fontSize: TELEGRAM_THEME.typography.fontSize.base,
                fontWeight: TELEGRAM_THEME.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: TELEGRAM_THEME.transitions.normal,
                borderBottom: filter === f.id
                  ? `2px solid ${TELEGRAM_THEME.colors.accent.primary}`
                  : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (filter !== f.id) {
                  e.currentTarget.style.color = TELEGRAM_THEME.colors.text.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== f.id) {
                  e.currentTarget.style.color = TELEGRAM_THEME.colors.text.secondary;
                }
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: TELEGRAM_THEME.spacing['5xl'],
            color: TELEGRAM_THEME.colors.text.secondary
          }}>
            <div style={{ fontSize: '48px', marginBottom: TELEGRAM_THEME.spacing.lg }}>⏳</div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: TELEGRAM_THEME.spacing['5xl'],
            color: TELEGRAM_THEME.colors.text.secondary
          }}>
            <div style={{ fontSize: '64px', marginBottom: TELEGRAM_THEME.spacing.lg }}>📭</div>
            <p style={{ fontSize: TELEGRAM_THEME.typography.fontSize.lg }}>
              No notifications
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: TELEGRAM_THEME.spacing.md,
          }}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => !notification.read_at && handleMarkAsRead(notification.id)}
                style={{
                  background: notification.read_at
                    ? 'transparent'
                    : TELEGRAM_THEME.glass.background,
                  backdropFilter: notification.read_at ? 'none' : TELEGRAM_THEME.glass.backdropFilter,
                  border: `1px solid ${TELEGRAM_THEME.colors.border.primary}`,
                  borderRadius: TELEGRAM_THEME.radius.lg,
                  padding: TELEGRAM_THEME.spacing.lg,
                  cursor: notification.read_at ? 'default' : 'pointer',
                  transition: TELEGRAM_THEME.transitions.normal,
                  opacity: notification.read_at ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!notification.read_at) {
                    e.currentTarget.style.background = TELEGRAM_THEME.colors.card.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!notification.read_at) {
                    e.currentTarget.style.background = TELEGRAM_THEME.glass.background;
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: TELEGRAM_THEME.spacing.md,
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    fontSize: '32px',
                    flexShrink: 0
                  }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: TELEGRAM_THEME.spacing.xs
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: TELEGRAM_THEME.typography.fontSize.base,
                        fontWeight: TELEGRAM_THEME.typography.fontWeight.semibold,
                        color: getNotificationColor(notification.type, !!notification.read_at),
                      }}>
                        {notification.title}
                      </h3>
                      {!notification.read_at && (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: TELEGRAM_THEME.colors.accent.primary,
                          flexShrink: 0,
                          marginLeft: TELEGRAM_THEME.spacing.sm
                        }} />
                      )}
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: TELEGRAM_THEME.typography.fontSize.base,
                      color: TELEGRAM_THEME.colors.text.secondary,
                      lineHeight: TELEGRAM_THEME.typography.lineHeight.relaxed,
                    }}>
                      {notification.message}
                    </p>
                    <div style={{
                      marginTop: TELEGRAM_THEME.spacing.sm,
                      fontSize: TELEGRAM_THEME.typography.fontSize.sm,
                      color: TELEGRAM_THEME.colors.text.tertiary
                    }}>
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
