import React, { useEffect, useState } from 'react';
import { DataStore, Notification } from '../data/types';
import { undergroundTheme } from '../styles/undergroundTheme';
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
        background: undergroundTheme.colors.gradient.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: undergroundTheme.spacing.xl
      }}>
        <div style={{
          textAlign: 'center',
          color: undergroundTheme.colors.text.primary
        }}>
          <div style={{ fontSize: '64px', marginBottom: undergroundTheme.spacing.lg }}>🔔</div>
          <p style={{
            fontSize: undergroundTheme.typography.fontSize.lg,
            color: undergroundTheme.colors.text.secondary
          }}>
            טוען התראות...
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
        Toast.show('אין התראות שלא נקראו', 'info');
        return;
      }

      if (!dataStore.markNotificationAsRead) return;

      await Promise.all(unreadIds.map(id => dataStore.markNotificationAsRead!(id)));
      await loadNotifications();
      Toast.success('כל ההתראות סומנו כנקראו');
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
    if (isRead) return undergroundTheme.colors.text.tertiary;
    switch (type) {
      case 'order_assigned': return undergroundTheme.colors.accent.primary;
      case 'order_completed': return undergroundTheme.colors.status.success;
      case 'low_stock': return undergroundTheme.colors.status.error;
      case 'restock_approved': return undergroundTheme.colors.accent.primary;
      case 'user_registered': return undergroundTheme.colors.status.warning;
      default: return undergroundTheme.colors.text.primary;
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      paddingTop: undergroundTheme.spacing['2xl'],
      paddingBottom: '100px',
      direction: 'rtl'
    }}>
      <div style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: `0 ${undergroundTheme.spacing['2xl']}`
      }}>
        {/* Header */}
        <div style={{
          marginBottom: undergroundTheme.spacing['3xl'],
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔔</div>
          <h1 style={{
            margin: 0,
            fontSize: undergroundTheme.typography.fontSize['4xl'],
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            color: undergroundTheme.colors.text.primary,
            marginBottom: undergroundTheme.spacing.sm,
          }}>
            התראות {unreadCount > 0 && (
              <span style={{ color: undergroundTheme.colors.accent.primary }}>
                ({unreadCount})
              </span>
            )}
          </h1>
          <p style={{
            margin: 0,
            fontSize: undergroundTheme.typography.fontSize.base,
            color: undergroundTheme.colors.text.tertiary,
            fontWeight: undergroundTheme.typography.fontWeight.medium,
          }}>
            עדכונים והתראות מערכת
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            style={{
              width: '100%',
              marginBottom: undergroundTheme.spacing.xl,
              padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
              background: undergroundTheme.colors.glassmorphism.light,
              border: `2px solid ${undergroundTheme.colors.accent.primary}`,
              borderRadius: undergroundTheme.borderRadius.lg,
              color: undergroundTheme.colors.accent.primary,
              fontSize: undergroundTheme.typography.fontSize.base,
              fontWeight: undergroundTheme.typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: undergroundTheme.transitions.normal,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.medium;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.light;
            }}
          >
            סמן הכל כנקרא
          </button>
        )}

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: undergroundTheme.spacing.sm,
          marginBottom: undergroundTheme.spacing.xl,
          borderBottom: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
        }}>
          {[
            { id: 'all', label: 'הכל' },
            { id: 'unread', label: `לא נקרא (${unreadCount})` },
            { id: 'read', label: 'נקרא' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{
                padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
                border: 'none',
                background: 'transparent',
                color: filter === f.id
                  ? undergroundTheme.colors.accent.primary
                  : undergroundTheme.colors.text.tertiary,
                fontSize: undergroundTheme.typography.fontSize.base,
                fontWeight: undergroundTheme.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: undergroundTheme.transitions.normal,
                borderBottom: filter === f.id
                  ? `2px solid ${undergroundTheme.colors.accent.primary}`
                  : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (filter !== f.id) {
                  e.currentTarget.style.color = undergroundTheme.colors.text.secondary;
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== f.id) {
                  e.currentTarget.style.color = undergroundTheme.colors.text.tertiary;
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
            padding: undergroundTheme.spacing['5xl'],
            color: undergroundTheme.colors.text.secondary
          }}>
            <div style={{ fontSize: '48px', marginBottom: undergroundTheme.spacing.lg }}>⏳</div>
            <p>טוען התראות...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: undergroundTheme.spacing['5xl'],
            color: undergroundTheme.colors.text.secondary
          }}>
            <div style={{ fontSize: '64px', marginBottom: undergroundTheme.spacing.lg, opacity: 0.5 }}>📭</div>
            <p style={{ fontSize: undergroundTheme.typography.fontSize.lg }}>
              אין התראות
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: undergroundTheme.spacing.md,
          }}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => !notification.read_at && handleMarkAsRead(notification.id)}
                style={{
                  background: notification.read_at
                    ? undergroundTheme.colors.glassmorphism.light
                    : undergroundTheme.colors.glassmorphism.medium,
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${notification.read_at ? undergroundTheme.colors.glassmorphism.border : undergroundTheme.colors.accent.primary}`,
                  borderRadius: undergroundTheme.borderRadius.xl,
                  padding: undergroundTheme.spacing['2xl'],
                  cursor: notification.read_at ? 'default' : 'pointer',
                  transition: undergroundTheme.transitions.normal,
                  opacity: notification.read_at ? 0.6 : 1,
                  boxShadow: notification.read_at ? undergroundTheme.shadows.md : undergroundTheme.shadows.glow.cyan,
                }}
                onMouseEnter={(e) => {
                  if (!notification.read_at) {
                    e.currentTarget.style.transform = 'translateX(-4px)';
                    e.currentTarget.style.borderColor = undergroundTheme.colors.accent.secondary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!notification.read_at) {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.borderColor = undergroundTheme.colors.accent.primary;
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  gap: undergroundTheme.spacing.lg,
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
                      marginBottom: undergroundTheme.spacing.sm
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: undergroundTheme.typography.fontSize.lg,
                        fontWeight: undergroundTheme.typography.fontWeight.semibold,
                        color: getNotificationColor(notification.type, !!notification.read_at),
                      }}>
                        {notification.title}
                      </h3>
                      {!notification.read_at && (
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: undergroundTheme.colors.accent.primary,
                          flexShrink: 0,
                          marginLeft: undergroundTheme.spacing.md,
                          boxShadow: undergroundTheme.shadows.glow.cyan
                        }} />
                      )}
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: undergroundTheme.typography.fontSize.base,
                      color: undergroundTheme.colors.text.secondary,
                      lineHeight: undergroundTheme.typography.lineHeight.normal,
                      marginBottom: undergroundTheme.spacing.sm
                    }}>
                      {notification.message}
                    </p>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.tertiary
                    }}>
                      {new Date(notification.created_at).toLocaleString('he-IL')}
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
