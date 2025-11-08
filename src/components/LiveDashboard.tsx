import React, { useState, useEffect } from 'react';
import { DataStore } from '../data/types';
import { logger } from '../lib/logger';

interface LiveDashboardProps {
  dataStore: DataStore & {
    subscribeToChanges?: (table: string, callback: (payload: any) => void) => () => void;
    getOrderStatsByDateRange?: (dateFrom: string, dateTo: string) => Promise<any>;
    getTopProducts?: (limit?: number) => Promise<any[]>;
  };
  theme: any;
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedToday: number;
  averageOrderValue: number;
  topProducts: any[];
  recentActivity: any[];
}

export function LiveDashboard({ dataStore, theme }: LiveDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedToday: 0,
    averageOrderValue: 0,
    topProducts: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();

    // Set up real-time subscriptions
    const unsubscribeOrders = dataStore.subscribeToChanges?.('orders', (payload) => {
      logger.info('Orders updated:', payload);
      loadDashboardData();
    });

    const unsubscribeProducts = dataStore.subscribeToChanges?.('products', (payload) => {
      logger.info('Products updated:', payload);
      loadDashboardData();
    });

    const unsubscribeTasks = dataStore.subscribeToChanges?.('tasks', (payload) => {
      logger.info('Tasks updated:', payload);
      loadDashboardData();
    });

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadDashboardData();
    }, 5 * 60 * 1000);

    return () => {
      unsubscribeOrders?.();
      unsubscribeProducts?.();
      unsubscribeTasks?.();
      clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const [orders, products, tasks] = await Promise.all([
        dataStore.listOrders?.() || [],
        dataStore.listProducts?.() || [],
        dataStore.listAllTasks?.() || []
      ]);

      // Calculate stats
      const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const completedToday = orders.filter(order =>
        order.status === 'delivered' &&
        new Date(order.updated_at).toDateString() === new Date().toDateString()
      ).length;

      // Get top products if method exists
      let topProducts: any[] = [];
      if (dataStore.getTopProducts) {
        topProducts = await dataStore.getTopProducts(5);
      }

      // Recent activity (last 10 updates)
      const recentActivity = [
        ...orders.slice(0, 5).map(order => ({
          id: order.id,
          type: 'order',
          description: `הזמנה חדשה: ${order.customer_name}`,
          timestamp: order.created_at,
          status: order.status
        })),
        ...tasks.slice(0, 5).map(task => ({
          id: task.id,
          type: 'task',
          description: `משימה: ${task.title}`,
          timestamp: task.created_at,
          status: task.status
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      setStats({
        totalOrders: orders.length,
        totalRevenue,
        pendingOrders: orders.filter(o => ['new', 'confirmed', 'preparing'].includes(o.status)).length,
        completedToday,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        topProducts,
        recentActivity
      });

      setLastUpdate(new Date());
    } catch (error) {
      logger.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: theme.text_color
      }}>
        טוען נתוני לוח בקרה...
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', direction: 'rtl' }}>
      {/* Header with live indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: theme.text_color }}>
          📊 לוח בקרה מתקדם
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#34c759',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: '12px', color: theme.hint_color }}>
            עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL')}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <MetricWidget
          title="סה״כ הזמנות"
          value={stats.totalOrders}
          change="+12%"
          changePositive={true}
          icon="📋"
          theme={theme}
        />
        <MetricWidget
          title="הכנסות"
          value={`₪${stats.totalRevenue.toLocaleString()}`}
          change="+8.5%"
          changePositive={true}
          icon="💰"
          theme={theme}
        />
        <MetricWidget
          title="ממתינות לטיפול"
          value={stats.pendingOrders}
          change="-3"
          changePositive={false}
          icon="⏳"
          theme={theme}
        />
        <MetricWidget
          title="הושלמו היום"
          value={stats.completedToday}
          change="+15%"
          changePositive={true}
          icon="✅"
          theme={theme}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Top Products */}
        <div style={{
          padding: '16px',
          backgroundColor: theme.secondary_bg_color,
          borderRadius: '12px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: theme.text_color }}>
            🏆 מוצרים מובילים
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.topProducts.slice(0, 5).map((product, index) => (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  backgroundColor: theme.bg_color + '80',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text_color }}>
                    {index + 1}. {product.name}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.hint_color }}>
                    {product.count} מכירות
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: theme.button_color }}>
                  ₪{product.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          padding: '16px',
          backgroundColor: theme.secondary_bg_color,
          borderRadius: '12px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: theme.text_color }}>
            🕐 פעילות אחרונה
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {stats.recentActivity.map((activity) => (
              <div
                key={`${activity.type}-${activity.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: theme.bg_color + '80',
                  borderRadius: '8px'
                }}
              >
                <div style={{ fontSize: '16px' }}>
                  {activity.type === 'order' ? '📋' : '✅'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: theme.text_color }}>
                    {activity.description}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.hint_color }}>
                    {new Date(activity.timestamp).toLocaleString('he-IL')}
                  </div>
                </div>
                <StatusBadge status={activity.status} theme={theme} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: theme.text_color }}>
          📈 ביצועים השבוע
        </h3>
        <SimpleChart theme={theme} />
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px'
      }}>
        <QuickAction
          title="יצירת הזמנה"
          icon="➕"
          color="#007aff"
          theme={theme}
          onClick={() => logger.info('Create order')}
        />
        <QuickAction
          title="הקצאת משימה"
          icon="👥"
          color="#34c759"
          theme={theme}
          onClick={() => logger.info('Assign task')}
        />
        <QuickAction
          title="דוח יומי"
          icon="📊"
          color="#ff9500"
          theme={theme}
          onClick={() => logger.info('Daily report')}
        />
        <QuickAction
          title="ניהול מלאי"
          icon="📦"
          color="#5856d6"
          theme={theme}
          onClick={() => logger.info('Manage inventory')}
        />
      </div>
    </div>
  );
}

function MetricWidget({ title, value, change, changePositive, icon, theme }: {
  title: string;
  value: number | string;
  change: string;
  changePositive: boolean;
  icon: string;
  theme: any;
}) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <span style={{
          fontSize: '12px',
          fontWeight: '600',
          color: changePositive ? '#34c759' : '#ff3b30'
        }}>
          {change}
        </span>
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: theme.text_color,
        marginBottom: '4px'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '12px',
        color: theme.hint_color,
        fontWeight: '500'
      }}>
        {title}
      </div>
    </div>
  );
}

function StatusBadge({ status, theme }: { status: string; theme: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered': return '#34c759';
      case 'in_progress':
      case 'confirmed': return '#ff9500';
      case 'pending':
      case 'new': return '#007aff';
      case 'cancelled': return '#ff3b30';
      default: return theme.hint_color;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'הושלם';
      case 'delivered': return 'נמסר';
      case 'in_progress': return 'בביצוע';
      case 'confirmed': return 'אושר';
      case 'pending': return 'ממתין';
      case 'new': return 'חדש';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };

  return (
    <div style={{
      padding: '2px 8px',
      borderRadius: '12px',
      backgroundColor: getStatusColor(status) + '20',
      color: getStatusColor(status),
      fontSize: '11px',
      fontWeight: '600'
    }}>
      {getStatusText(status)}
    </div>
  );
}

function SimpleChart({ theme }: { theme: any }) {
  // Simple bar chart representation
  const data = [65, 80, 45, 90, 75, 85, 70]; // Sample data for 7 days
  const maxValue = Math.max(...data);

  return (
    <div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '120px', padding: '20px 0' }}>
      {data.map((value, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            height: `${(value / maxValue) * 100}%`,
            backgroundColor: theme.button_color,
            borderRadius: '4px 4px 0 0',
            minHeight: '20px',
            position: 'relative'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            color: theme.text_color,
            fontWeight: '600'
          }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickAction({ title, icon, color, theme, onClick }: {
  title: string;
  icon: string;
  color: string;
  theme: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color,
        border: `2px solid ${color}20`,
        borderRadius: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '20px',
        backgroundColor: color + '20',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px'
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: theme.text_color
      }}>
        {title}
      </div>
    </button>
  );
}