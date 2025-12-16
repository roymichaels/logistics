import React, { useState, useEffect } from 'react';

import { NotificationPreferences, NotificationService, NotificationType } from '../lib/notificationService';
import { logger } from '../lib/logger';

interface NotificationPreferencesProps {
  notificationService: NotificationService;
  onSave: (preferences: NotificationPreferences) => void;
  onClose: () => void;
}

export function NotificationPreferencesComponent({
  notificationService,
  onSave,
  onClose
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
    checkPermission();
  }, []);

  const loadPreferences = async () => {
    try {
      // Get current preferences from the service
      const storedPrefs = localStorage.getItem('notification_prefs_default');
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs));
      } else {
        // Set default preferences
        const defaultPrefs: NotificationPreferences = {
          userId: 'default',
          enabled: true,
          types: {
            task_assigned: true,
            task_completed: true,
            task_overdue: true,
            route_optimized: true,
            order_received: true,
            order_cancelled: true,
            system_alert: true,
            chat_message: false,
            delivery_update: true
          },
          quietHours: {
            start: '22:00',
            end: '07:00'
          },
          sound: true,
          vibration: true
        };
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      logger.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  };

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setHasPermission(permission === 'granted');
      haptic();
    }
  };

  const handleToggleEnabled = async () => {
    if (!preferences) return;

    if (!preferences.enabled && !hasPermission) {
      await requestPermission();
    }

    setPreferences(prev => prev ? { ...prev, enabled: !prev.enabled } : null);
    haptic();
  };

  const handleToggleType = (type: NotificationType) => {
    if (!preferences) return;

    setPreferences(prev => prev ? {
      ...prev,
      types: { ...prev.types, [type]: !prev.types[type] }
    } : null);
    haptic();
  };

  const handleQuietHoursChange = (field: 'start' | 'end', value: string) => {
    if (!preferences) return;

    setPreferences(prev => prev ? {
      ...prev,
      quietHours: prev.quietHours ? {
        ...prev.quietHours,
        [field]: value
      } : { start: '22:00', end: '07:00' }
    } : null);
  };

  const handleToggleQuietHours = () => {
    if (!preferences) return;

    setPreferences(prev => prev ? {
      ...prev,
      quietHours: prev.quietHours ? null : { start: '22:00', end: '07:00' }
    } : null);
    haptic();
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      await notificationService.updatePreferences(preferences);
      onSave(preferences);
      haptic();
      onClose();
    } catch (error) {
      logger.error('Failed to save preferences:', error);
      haptic();
    }
  };

  const getTypeDisplayName = (type: NotificationType): string => {
    const names = {
      task_assigned: 'הקצאת משימות',
      task_completed: 'השלמת משימות',
      task_overdue: 'משימות בפיגור',
      route_optimized: 'אופטימיזציית מסלולים',
      order_received: 'הזמנות חדשות',
      order_cancelled: 'ביטול הזמנות',
      system_alert: 'התראות מערכת',
      chat_message: 'הודעות צ\'אט',
      delivery_update: 'עדכוני משלוחים'
    };
    return names[type] || type;
  };

  const getTypeIcon = (type: NotificationType): string => {
    const icons = {
      task_assigned: '📋',
      task_completed: '✅',
      task_overdue: '⏰',
      route_optimized: '🗺️',
      order_received: '📦',
      order_cancelled: '❌',
      system_alert: '🚨',
      chat_message: '💬',
      delivery_update: '🚚'
    };
    return icons[type] || '📄';
  };

  if (isLoading || !preferences) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: theme.bg_color,
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          color: theme.text_color
        }}>
          טוען הגדרות...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: theme.bg_color,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        direction: 'rtl'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${theme.hint_color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: theme.text_color
          }}>
            🔔 הגדרות התראות
          </h3>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              color: theme.hint_color,
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Global Enable/Disable */}
          <div style={{
            padding: '16px',
            backgroundColor: theme.secondary_bg_color,
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>🔔</span>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: theme.text_color
                }}>
                  התראות פעילות
                </span>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '50px',
                height: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={preferences.enabled}
                  onChange={handleToggleEnabled}
                  style={{
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: preferences.enabled ? theme.button_color : theme.hint_color,
                  transition: '0.4s',
                  borderRadius: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: preferences.enabled ? 'flex-end' : 'flex-start',
                  padding: '2px'
                }}>
                  <span style={{
                    height: '20px',
                    width: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.4s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>

            {!hasPermission && (
              <div style={{
                padding: '12px',
                backgroundColor: '#ff3b3020',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: theme.text_color,
                    fontWeight: '600'
                  }}>
                    נדרש אישור התראות
                  </div>
                  <button
                    onClick={requestPermission}
                    style={{
                      fontSize: '11px',
                      color: '#ff3b30',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    לחץ לאישור
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notification Types */}
          <div style={{
            marginBottom: '16px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              color: theme.text_color
            }}>
              סוגי התראות
            </h4>

            <div style={{
              backgroundColor: theme.secondary_bg_color,
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              {Object.entries(preferences.types).map(([type, enabled], index) => (
                <div
                  key={type}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < Object.entries(preferences.types).length - 1
                      ? `1px solid ${theme.hint_color}20`
                      : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: preferences.enabled ? 1 : 0.5
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>
                      {getTypeIcon(type as NotificationType)}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: theme.text_color
                    }}>
                      {getTypeDisplayName(type as NotificationType)}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={!preferences.enabled}
                    onChange={() => handleToggleType(type as NotificationType)}
                    style={{
                      transform: 'scale(1.2)',
                      cursor: preferences.enabled ? 'pointer' : 'not-allowed'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div style={{
            marginBottom: '16px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              color: theme.text_color
            }}>
              שעות שקט
            </h4>

            <div style={{
              backgroundColor: theme.secondary_bg_color,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: preferences.quietHours ? '12px' : '0'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: theme.text_color
                }}>
                  הפעל שעות שקט
                </span>
                <input
                  type="checkbox"
                  checked={!!preferences.quietHours}
                  disabled={!preferences.enabled}
                  onChange={handleToggleQuietHours}
                  style={{
                    transform: 'scale(1.2)',
                    cursor: preferences.enabled ? 'pointer' : 'not-allowed'
                  }}
                />
              </div>

              {preferences.quietHours && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  opacity: preferences.enabled ? 1 : 0.5
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: theme.hint_color,
                      marginBottom: '4px'
                    }}>
                      התחלה
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHours.start}
                      disabled={!preferences.enabled}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '8px',
                        border: `1px solid ${theme.hint_color}40`,
                        backgroundColor: theme.bg_color,
                        color: theme.text_color
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      color: theme.hint_color,
                      marginBottom: '4px'
                    }}>
                      סיום
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHours.end}
                      disabled={!preferences.enabled}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '8px',
                        border: `1px solid ${theme.hint_color}40`,
                        backgroundColor: theme.bg_color,
                        color: theme.text_color
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sound and Vibration */}
          <div style={{
            backgroundColor: theme.secondary_bg_color,
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${theme.hint_color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🔊</span>
                <span style={{
                  fontSize: '14px',
                  color: theme.text_color
                }}>
                  צליל
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.sound}
                disabled={!preferences.enabled}
                onChange={(e) => setPreferences(prev => prev ? { ...prev, sound: e.target.checked } : null)}
                style={{
                  transform: 'scale(1.2)',
                  cursor: preferences.enabled ? 'pointer' : 'not-allowed'
                }}
              />
            </div>

            <div style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📳</span>
                <span style={{
                  fontSize: '14px',
                  color: theme.text_color
                }}>
                  רטט
                </span>
              </div>
              <input
                type="checkbox"
                checked={preferences.vibration}
                disabled={!preferences.enabled}
                onChange={(e) => setPreferences(prev => prev ? { ...prev, vibration: e.target.checked } : null)}
                style={{
                  transform: 'scale(1.2)',
                  cursor: preferences.enabled ? 'pointer' : 'not-allowed'
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: theme.secondary_bg_color,
                color: theme.text_color,
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 2,
                padding: '12px',
                backgroundColor: theme.button_color,
                color: theme.button_text_color,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              שמור הגדרות
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}