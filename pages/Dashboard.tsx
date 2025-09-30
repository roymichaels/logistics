import React, { useState, useEffect } from 'react';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { useSkeleton, SkeletonCard } from '../src/hooks/useSkeleton';
import { Toast } from '../src/components/Toast';
import { DataStore, User } from '../data/types';
import { hebrew, roleNames, roleIcons, formatCurrency } from '../src/lib/hebrew';

interface DashboardProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Dashboard({ dataStore, onNavigate }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<string>('user');
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingTasks: 0,
    completedToday: 0,
    totalProducts: 0,
    lowStock: 0,
    revenue: 0
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useSkeleton(100);
  const { theme, mainButton, backButton, haptic } = useTelegramUI();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);
      
      const role = profile.role;
      setEffectiveRole(role);

      // Load notifications
      if (dataStore.getNotifications) {
        const userNotifications = await dataStore.getNotifications();
        setNotifications(userNotifications.slice(0, 3)); // Show only 3 recent
      }

      // Load stats based on role
      if (role === 'manager') {
        const [orders, products, tasks] = await Promise.all([
          dataStore.listOrders?.() || [],
          dataStore.listProducts?.() || [],
          dataStore.listAllTasks?.() || []
        ]);
        
        const revenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
        
        setStats({
          totalOrders: orders.length,
          pendingTasks: tasks.filter(t => t.status === 'pending').length,
          completedToday: tasks.filter(t => 
            t.status === 'completed' && 
            t.completed_at &&
            new Date(t.completed_at).toDateString() === new Date().toDateString()
          ).length,
          totalProducts: products.length,
          lowStock: products.filter(p => p.stock_quantity < 10).length,
          revenue
        });
      } else if (role === 'dispatcher') {
        const [orders, tasks] = await Promise.all([
          dataStore.listOrders?.() || [],
          dataStore.listAllTasks?.() || []
        ]);
        
        setStats({
          totalOrders: orders.length,
          pendingTasks: orders.filter(o => o.status === 'new' || o.status === 'confirmed').length,
          completedToday: orders.filter(o => 
            o.status === 'delivered' && 
            new Date(o.updated_at).toDateString() === new Date().toDateString()
          ).length,
          totalProducts: 0,
          lowStock: 0,
          revenue: 0
        });
      } else if (role !== 'user') {
        const tasks = await dataStore.listMyTasks?.() || [];
        setStats({
          totalOrders: 0,
          pendingTasks: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
          completedToday: tasks.filter(t => 
            t.status === 'completed' && 
            t.completed_at &&
            new Date(t.completed_at).toDateString() === new Date().toDateString()
          ).length,
          totalProducts: 0,
          lowStock: 0,
          revenue: 0
        });
      } else {
        // Regular user role - load actual data
        setStats({
          totalOrders: 0,
          pendingTasks: 0,
          completedToday: 0,
          totalProducts: 0,
          lowStock: 0,
          revenue: 0
        });
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Toast.error('שגיאה בטעינת נתוני לוח הבקרה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    mainButton.hide();
    backButton.hide();
  }, [user]);

  if (loading || showSkeleton) {
    return (
      <div style={{ 
        padding: '16px', 
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh',
        direction: 'rtl'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            height: '32px',
            backgroundColor: theme.hint_color + '40',
            borderRadius: '8px',
            marginBottom: '8px',
            width: '60%',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{
            height: '20px',
            backgroundColor: theme.hint_color + '30',
            borderRadius: '8px',
            width: '40%',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '12px',
          marginBottom: '24px'
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: '80px',
              backgroundColor: theme.hint_color + '20',
              borderRadius: '12px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
          ))}
        </div>
        
        <SkeletonCard theme={theme} />
        <SkeletonCard theme={theme} />
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return hebrew.good_morning;
    if (hour < 18) return hebrew.good_afternoon;
    return hebrew.good_evening;
  };

  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '24px', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          {getGreeting()}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>
            {roleIcons[effectiveRole as keyof typeof roleIcons] || '👤'}
          </span>
          <p style={{ 
            margin: 0, 
            color: theme.hint_color,
            fontSize: '16px'
          }}>
            {user?.name || 'משתמש'} • {roleNames[effectiveRole as keyof typeof roleNames] || 'משתמש'}
          </p>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '18px', 
            fontWeight: '600',
            color: theme.text_color
          }}>
            התראות אחרונות
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: '12px',
                  backgroundColor: notification.read ? theme.secondary_bg_color : theme.button_color + '20',
                  borderRadius: '8px',
                  borderRight: `4px solid ${getNotificationColor(notification.type)}`,
                  cursor: 'pointer'
                }}
                onClick={() => {
                  haptic();
                  if (notification.action_url) {
                    // Navigate to specific page
                  }
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: theme.text_color,
                  marginBottom: '4px'
                }}>
                  {notification.title}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: theme.hint_color
                }}>
                  {notification.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '12px',
        marginBottom: '24px'
      }}>
        {user?.role === 'manager' ? (
          <>
            <StatCard
              title={hebrew.total_orders}
              value={stats.totalOrders}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title={hebrew.pending_tasks}
              value={stats.pendingTasks}
              color="#ff9500"
              theme={theme}
            />
            <StatCard
              title="הכנסות"
              value={formatCurrency(stats.revenue)}
              color="#34c759"
              theme={theme}
              isText={true}
            />
            <StatCard
              title="מלאי נמוך"
              value={stats.lowStock}
              color="#ff3b30"
              theme={theme}
            />
          </>
        ) : user?.role === 'dispatcher' ? (
          <>
            <StatCard
              title={hebrew.total_orders}
              value={stats.totalOrders}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title="ממתינות"
              value={stats.pendingTasks}
              color="#ff9500"
              theme={theme}
            />
            <StatCard
              title="נמסרו היום"
              value={stats.completedToday}
              color="#34c759"
              theme={theme}
            />
          </>
        ) : user?.role === 'user' ? (
          <>
            <StatCard
              title="הזמנות כללי"
              value={stats.totalOrders}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title="משימות פתוחות"
              value={stats.pendingTasks}
              color="#ff9500"
              theme={theme}
            />
            <StatCard
              title="הושלמו היום"
              value={stats.completedToday}
              color="#34c759"
              theme={theme}
            />
            <StatCard
              title="מוצרים"
              value={stats.totalProducts}
              color="#007aff"
              theme={theme}
            />
          </>
        ) : (
          <>
            <StatCard
              title={hebrew.pending_tasks}
              value={stats.pendingTasks}
              color={theme.button_color}
              theme={theme}
            />
            <StatCard
              title={hebrew.completed_today}
              value={stats.completedToday}
              color="#34c759"
              theme={theme}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: theme.text_color
        }}>
          פעולות מהירות
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {getQuickActions(effectiveRole).map((action, index) => (
            <ActionButton
              key={index}
              title={action.title}
              subtitle={action.subtitle}
              icon={action.icon}
              onClick={() => onNavigate(action.page)}
              theme={theme}
              haptic={haptic}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function getNotificationColor(type: string): string {
  switch (type) {
    case 'error': return '#ff3b30';
    case 'warning': return '#ff9500';
    case 'success': return '#34c759';
    default: return '#007aff';
  }
}

function getQuickActions(role?: string) {
  switch (role) {
    case 'user':
      return [
        { title: 'צפה בהזמנות', subtitle: 'ההזמנות שלי', icon: '📋', page: 'orders' },
        { title: 'צ\'אטים', subtitle: 'תקשורת מאובטחת', icon: '💬', page: 'chat' },
        { title: 'הגדרות', subtitle: 'ניהול חשבון', icon: '⚙️', page: 'settings' }
      ];
    case 'manager':
      return [
        { title: 'לוח ביצועים', subtitle: 'מבט מהיר על העסק', icon: '📊', page: 'stats' },
        { title: 'שותפים עסקיים', subtitle: 'ניהול ספקים ושיתופי פעולה', icon: '🤝', page: 'partners' },
        { title: 'הזמנות פעילות', subtitle: 'צפייה ויצירת הזמנות', icon: '🧾', page: 'orders' }
      ];
    case 'dispatcher':
      return [
        { title: 'ניהול הזמנות', subtitle: 'תיאום משלוחים', icon: '📋', page: 'orders' },
        { title: 'משימות', subtitle: 'הקצאת משימות', icon: '✅', page: 'tasks' }
      ];
    case 'driver':
      return [
        { title: 'המשלוחים שלי', subtitle: 'משלוחים להיום', icon: '🚚', page: 'my-deliveries' },
        { title: 'סטטוס נהג', subtitle: 'עדכון מצב נוכחי', icon: '📍', page: 'driver-status' }
      ];
    case 'warehouse':
      return [
        { title: 'ניהול מלאי', subtitle: 'רמות מלאי ומיקומים', icon: '📦', page: 'inventory' },
        { title: 'בקשות חידוש', subtitle: 'טיפול בבקשות מלאי', icon: '🔄', page: 'restock-requests' }
      ];
    case 'sales':
      return [
        { title: 'הזמנות לקוחות', subtitle: 'ניהול הזמנות פתוחות', icon: '🧾', page: 'orders' },
        { title: 'הביצועים שלי', subtitle: 'יעדים ועמלות', icon: '📈', page: 'my-stats' }
      ];
    default:
      return [
        { title: 'הזמנות', subtitle: 'שירות לקוחות', icon: '📋', page: 'orders' },
        { title: 'לקוחות', subtitle: 'תמיכה ושירות', icon: '👥', page: 'customers' }
      ];
  }
}

function StatCard({ title, value, color, theme, isText = false }: { 
  title: string; 
  value: number | string; 
  color: string;
  theme: any;
  isText?: boolean;
}) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color || '#f1f1f1',
      borderRadius: '12px',
      textAlign: 'center'
    }}>
      <div style={{ 
        fontSize: isText ? '16px' : '24px', 
        fontWeight: '700', 
        color,
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

function ActionButton({ title, subtitle, icon, onClick, theme, haptic }: {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  theme: any;
  haptic: () => void;
}) {
  return (
    <button
      onClick={() => {
        haptic();
        onClick();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        backgroundColor: theme.secondary_bg_color || '#f1f1f1',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        textAlign: 'right',
        width: '100%'
      }}
    >
      <div style={{ fontSize: '24px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: theme.text_color,
          marginBottom: '4px'
        }}>
          {title}
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: theme.hint_color
        }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}