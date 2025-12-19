import React, { useState, useEffect } from 'react';

import { DataStore, Task, Order, User } from '../data/types';
import { logger } from '../lib/logger';
import { haptic } from '../utils/haptic';

interface WidgetProps {
  dataStore: DataStore;
  theme: any;
  userRole: string;
}

interface MetricData {
  label: string;
  value: number;
  change?: number;
  icon: string;
  color: string;
}

// Performance Metrics Widget
export function PerformanceWidget({ dataStore, theme, userRole }: WidgetProps) {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceMetrics();
    const interval = setInterval(loadPerformanceMetrics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [dataStore]);

  const loadPerformanceMetrics = async () => {
    try {
      const tasks = await dataStore.listTasks?.() || [];
      const orders = await dataStore.listOrders?.() || [];

      const completedTasks = tasks.filter(task => task.status === 'completed');
      const pendingTasks = tasks.filter(task => task.status === 'pending');
      const overdueTasks = tasks.filter(task =>
        task.status !== 'completed' && new Date(task.due_date) < new Date()
      );

      const completedOrders = orders.filter(order => order.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_amount, 0);

      const newMetrics: MetricData[] = [
        {
          label: 'משימות הושלמו',
          value: completedTasks.length,
          change: Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : -Math.floor(Math.random() * 3),
          icon: '✅',
          color: '#34c759'
        },
        {
          label: 'משימות ממתינות',
          value: pendingTasks.length,
          change: Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : -Math.floor(Math.random() * 2),
          icon: '⏳',
          color: '#ff9500'
        },
        {
          label: 'משימות בפיגור',
          value: overdueTasks.length,
          change: Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : -1,
          icon: '🔴',
          color: '#ff3b30'
        },
        {
          label: 'הכנסות (₪)',
          value: totalRevenue,
          change: Math.floor(Math.random() * 1000) + 500,
          icon: '💰',
          color: '#007aff'
        }
      ];

      setMetrics(newMetrics);
    } catch (error) {
      logger.error('Failed to load performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: theme.hint_color
      }}>
        טוען נתונים...
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: theme.text_color,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        📊 ביצועים
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
      }}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            style={{
              padding: '12px',
              backgroundColor: theme.bg_color,
              borderRadius: '8px',
              textAlign: 'center'
            }}
          >
            <div style={{
              fontSize: '24px',
              marginBottom: '4px'
            }}>
              {metric.icon}
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: metric.color,
              marginBottom: '2px'
            }}>
              {metric.value.toLocaleString('he-IL')}
            </div>
            <div style={{
              fontSize: '11px',
              color: theme.hint_color,
              marginBottom: '4px'
            }}>
              {metric.label}
            </div>
            {metric.change !== undefined && (
              <div style={{
                fontSize: '10px',
                color: metric.change >= 0 ? '#34c759' : '#ff3b30',
                fontWeight: '600'
              }}>
                {metric.change >= 0 ? '+' : ''}{metric.change}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick Actions Widget
export function QuickActionsWidget({ dataStore, theme, userRole }: WidgetProps) {

  const getActionsForRole = () => {
    switch (userRole) {
      case 'manager':
        return [
          { icon: '📋', label: 'הוסף משימה', action: 'add_task', color: '#007aff' },
          { icon: '👥', label: 'ניהול צוות', action: 'manage_users', color: '#34c759' },
          { icon: '📊', label: 'דוחות', action: 'reports', color: '#ff9500' },
          { icon: '🗺️', label: 'תכנון מסלול', action: 'route_planning', color: '#af52de' }
        ];

      case 'dispatcher':
        return [
          { icon: '🚚', label: 'הקצה נהג', action: 'assign_driver', color: '#007aff' },
          { icon: '📦', label: 'הזמנה חדשה', action: 'new_order', color: '#34c759' },
          { icon: '🗺️', label: 'מסלולים', action: 'routes', color: '#ff9500' },
          { icon: '📱', label: 'התראות', action: 'notifications', color: '#ff3b30' }
        ];

      case 'driver':
        return [
          { icon: '✅', label: 'הושלם', action: 'complete_task', color: '#34c759' },
          { icon: '📷', label: 'העלה תמונה', action: 'upload_proof', color: '#007aff' },
          { icon: '📍', label: 'מיקום נוכחי', action: 'current_location', color: '#ff9500' },
          { icon: '💬', label: 'צ\'אט', action: 'chat', color: '#af52de' }
        ];

      default:
        return [
          { icon: '📋', label: 'המשימות שלי', action: 'my_tasks', color: '#007aff' },
          { icon: '📊', label: 'סטטוס', action: 'status', color: '#34c759' },
          { icon: '📱', label: 'התראות', action: 'notifications', color: '#ff9500' },
          { icon: '⚙️', label: 'הגדרות', action: 'settings', color: '#8e8e93' }
        ];
    }
  };

  const handleAction = (action: string) => {
    haptic();
    // Handle action based on type
    logger.info('Quick action triggered:', action);
  };

  const actions = getActionsForRole();

  return (
    <div style={{
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: theme.text_color,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        ⚡ פעולות מהירות
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px'
      }}>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleAction(action.action)}
            style={{
              padding: '12px',
              backgroundColor: theme.bg_color,
              border: `2px solid ${action.color}20`,
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = action.color + '10';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = theme.bg_color;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              fontSize: '20px',
              marginBottom: '4px'
            }}>
              {action.icon}
            </div>
            <div style={{
              fontSize: '12px',
              color: theme.text_color,
              fontWeight: '500'
            }}>
              {action.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Weather Widget
export function WeatherWidget({ theme }: { theme: any }) {
  const [weather, setWeather] = useState({
    temp: 24,
    condition: 'sunny',
    humidity: 65,
    windSpeed: 12
  });

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return '☀️';
      case 'cloudy': return '☁️';
      case 'rainy': return '🌧️';
      case 'stormy': return '⛈️';
      default: return '🌤️';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'sunny': return 'שמשי';
      case 'cloudy': return 'מעונן';
      case 'rainy': return 'גשום';
      case 'stormy': return 'סוער';
      default: return 'מעונן חלקית';
    }
  };

  return (
    <div style={{
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: theme.text_color,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        🌤️ מזג האוויר - תל אביב
      </h3>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '32px' }}>
            {getWeatherIcon(weather.condition)}
          </div>
          <div>
            <div style={{
              fontSize: '24px',
              fontWeight: '600',
              color: theme.text_color
            }}>
              {weather.temp}°
            </div>
            <div style={{
              fontSize: '12px',
              color: theme.hint_color
            }}>
              {getConditionText(weather.condition)}
            </div>
          </div>
        </div>

        <div style={{
          textAlign: 'left',
          fontSize: '11px',
          color: theme.hint_color
        }}>
          <div>💧 לחות: {weather.humidity}%</div>
          <div>💨 רוח: {weather.windSpeed} קמ"ש</div>
        </div>
      </div>
    </div>
  );
}

// Recent Activity Widget
export function RecentActivityWidget({ dataStore, theme }: { dataStore: DataStore; theme: any }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentActivities();
  }, [dataStore]);

  const loadRecentActivities = async () => {
    try {
      // Simulate recent activities
      const mockActivities = [
        {
          id: '1',
          type: 'task_completed',
          title: 'משימה הושלמה',
          description: 'משלוח לרחוב הרצל 15 הושלם',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          icon: '✅',
          color: '#34c759'
        },
        {
          id: '2',
          type: 'order_received',
          title: 'הזמנה חדשה',
          description: 'הזמנה #12345 התקבלה',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          icon: '📦',
          color: '#007aff'
        },
        {
          id: '3',
          type: 'user_login',
          title: 'התחברות',
          description: 'דני כהן התחבר למערכת',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          icon: '👤',
          color: '#8e8e93'
        },
        {
          id: '4',
          type: 'route_optimized',
          title: 'מסלול אופטימיזציה',
          description: 'מסלול חדש נוצר עבור אזור מרכז',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          icon: '🗺️',
          color: '#af52de'
        }
      ];

      setActivities(mockActivities);
    } catch (error) {
      logger.error('Failed to load recent activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    const diffDays = Math.floor(diffHours / 24);
    return `לפני ${diffDays} ימים`;
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: theme.secondary_bg_color,
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center',
        color: theme.hint_color
      }}>
        טוען פעילות...
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: theme.text_color,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        🕒 פעילות אחרונה
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {activities.map((activity) => (
          <div
            key={activity.id}
            style={{
              padding: '8px',
              backgroundColor: theme.bg_color,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRight: `3px solid ${activity.color}`
            }}
          >
            <div style={{
              fontSize: '16px',
              minWidth: '20px'
            }}>
              {activity.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: theme.text_color,
                marginBottom: '2px'
              }}>
                {activity.title}
              </div>
              <div style={{
                fontSize: '11px',
                color: theme.hint_color,
                lineHeight: '1.3'
              }}>
                {activity.description}
              </div>
            </div>
            <div style={{
              fontSize: '10px',
              color: theme.hint_color,
              whiteSpace: 'nowrap'
            }}>
              {formatRelativeTime(activity.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}