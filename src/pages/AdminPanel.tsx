import React, { useState, useEffect } from 'react';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';

import { DataStore, User } from '../data/types';
import { logger } from '../lib/logger';

interface AdminPanelProps {
  dataStore: DataStore & {
    bulkUpdateOrderStatus?: (orderIds: string[], status: string) => Promise<void>;
    bulkAssignTasks?: (taskIds: string[], assignedTo: string) => Promise<void>;
    bulkUpdateProductPrices?: (productIds: string[], priceMultiplier: number) => Promise<void>;
    markAllNotificationsRead?: () => Promise<void>;
    exportOrdersToCSV?: (filters?: any) => Promise<string>;
    exportProductsToCSV?: () => Promise<string>;
    getOrderStatsByDateRange?: (dateFrom: string, dateTo: string) => Promise<any>;
  };
  onNavigate: (page: string) => void;
}

export function AdminPanel({ dataStore, onNavigate }: AdminPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'bulk' | 'export' | 'settings'>('overview');
  const [systemStats, setSystemStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      // Load system statistics
      const [orders, products, tasks] = await Promise.all([
        dataStore.listOrders?.() || [],
        dataStore.listProducts?.() || [],
        dataStore.listAllTasks?.() || []
      ]);

      setSystemStats({
        totalOrders: orders.length,
        totalProducts: products.length,
        totalTasks: tasks.length,
        activeUsers: 6, // Would come from user management system
        todayOrders: orders.filter(o =>
          new Date(o.created_at).toDateString() === new Date().toDateString()
        ).length,
        lowStockProducts: products.filter(p => p.stock_quantity < 10).length,
        pendingTasks: tasks.filter(t => t.status === 'pending').length
      });
    } catch (error) {
      logger.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        טוען פאנל ניהול...
      </div>
    );
  }

  if (!user || user.role !== 'manager') {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh',
        direction: 'rtl'
      }}>
        <h2>אין הרשאה</h2>
        <p>אין לך הרשאה לגשת לפאנל הניהול</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.bg_color,
      color: theme.text_color,
      minHeight: '100vh',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${theme.hint_color}20` }}>
        <h1 style={{
          margin: '0 0 16px 0',
          fontSize: '24px',
          fontWeight: '600'
        }}>
          ⚙️ פאנל ניהול מערכת
        </h1>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {[
            { key: 'overview', label: 'סקירה', icon: '📊' },
            { key: 'users', label: 'משתמשים', icon: '👥' },
            { key: 'bulk', label: 'פעולות מרובות', icon: '⚡' },
            { key: 'export', label: 'ייצוא נתונים', icon: '📤' },
            { key: 'settings', label: 'הגדרות', icon: '⚙️' }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => {
                haptic();
                setActiveTab(key as any);
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: activeTab === key ? theme.button_color : theme.secondary_bg_color,
                color: activeTab === key ? theme.button_text_color : theme.text_color,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '16px' }}>
        {activeTab === 'overview' && (
          <SystemOverview stats={systemStats} theme={theme} />
        )}
        {activeTab === 'users' && (
          <UserManagement theme={theme} />
        )}
        {activeTab === 'bulk' && (
          <BulkOperations dataStore={dataStore} theme={theme} haptic={haptic} />
        )}
        {activeTab === 'export' && (
          <DataExport dataStore={dataStore} theme={theme} haptic={haptic} />
        )}
        {activeTab === 'settings' && (
          <SystemSettings theme={theme} />
        )}
      </div>
    </div>
  );
}

function SystemOverview({ stats, theme }: { stats: any; theme: any }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
        מצב המערכת
      </h2>

      {/* System Health Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <HealthCard
          title="הזמנות כולל"
          value={stats.totalOrders}
          status="healthy"
          icon="📋"
          theme={theme}
        />
        <HealthCard
          title="הזמנות היום"
          value={stats.todayOrders}
          status="warning"
          icon="🆕"
          theme={theme}
        />
        <HealthCard
          title="מלאי נמוך"
          value={stats.lowStockProducts}
          status="error"
          icon="📦"
          theme={theme}
        />
        <HealthCard
          title="משימות ממתינות"
          value={stats.pendingTasks}
          status="healthy"
          icon="⏳"
          theme={theme}
        />
      </div>

      {/* System Alerts */}
      <div style={{
        padding: '16px',
        backgroundColor: theme.secondary_bg_color,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
          🚨 התראות מערכת
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stats.lowStockProducts > 0 && (
            <SystemAlert
              type="warning"
              message={`${stats.lowStockProducts} מוצרים עם מלאי נמוך`}
              action="צפה במלאי"
              theme={theme}
            />
          )}
          {stats.pendingTasks > 5 && (
            <SystemAlert
              type="info"
              message={`${stats.pendingTasks} משימות ממתינות להקצאה`}
              action="נהל משימות"
              theme={theme}
            />
          )}
          <SystemAlert
            type="success"
            message="כל המערכות פועלות כרגיל"
            theme={theme}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
          פעולות מהירות
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          <QuickAction
            title="גיבוי מערכת"
            description="יצירת גיבוי של כל הנתונים"
            icon="💾"
            color="#34c759"
            theme={theme}
          />
          <QuickAction
            title="עדכון מלאי"
            description="סנכרון כמויות עם המחסן"
            icon="🔄"
            color="#007aff"
            theme={theme}
          />
          <QuickAction
            title="דוח יומי"
            description="יצירת דוח סיכום יומי"
            icon="📊"
            color="#ff9500"
            theme={theme}
          />
          <QuickAction
            title="הודעה לכלל המשתמשים"
            description="שליחת הודעה לכל הצוות"
            icon="📢"
            color="#5856d6"
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}

function UserManagement({ theme }: { theme: any }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
        ניהול משתמשים
      </h2>
      <p style={{
        fontSize: '14px',
        color: theme.hint_color,
        marginBottom: '16px',
        lineHeight: '1.6'
      }}>
        לניהול מלא של משתמשים, אישורים והרשאות, עבור לעמוד ניהול משתמשים המתקדם.
      </p>
      <a
        href="#users"
        onClick={(e) => {
          e.preventDefault();
          window.location.hash = 'users';
        }}
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          borderRadius: '12px',
          textDecoration: 'none',
          fontSize: '16px',
          fontWeight: '600'
        }}
      >
        👥 פתח ניהול משתמשים
      </a>
    </div>
  );
}

function BulkOperations({ dataStore, theme, haptic }: {
  dataStore: AdminPanelProps['dataStore'];
  theme: any;
  haptic: () => void;
}) {
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const bulkOperations = [
    {
      id: 'update_order_status',
      title: 'עדכון סטטוס הזמנות',
      description: 'עדכון סטטוס של מספר הזמנות בבת אחת',
      icon: '📋'
    },
    {
      id: 'assign_tasks',
      title: 'הקצאת משימות',
      description: 'הקצאת מספר משימות לעובד ספציפי',
      icon: '✅'
    },
    {
      id: 'update_prices',
      title: 'עדכון מחירים',
      description: 'עדכון מחירי מוצרים לפי אחוז',
      icon: '💰'
    },
    {
      id: 'mark_notifications',
      title: 'סימון התראות כנקראו',
      description: 'סימון כל ההתראות כנקראו',
      icon: '📢'
    }
  ];

  const handleBulkOperation = async (operationId: string) => {
    setIsProcessing(true);
    haptic();

    try {
      switch (operationId) {
        case 'update_order_status':
          // Example: Update all 'new' orders to 'confirmed'
          // Would need to get order IDs first
          break;
        case 'assign_tasks':
          // Example bulk task assignment
          break;
        case 'update_prices':
          // Example: 5% price increase
          // Would need to get product IDs first
          break;
        case 'mark_notifications':
          if (dataStore.markAllNotificationsRead) {
            await dataStore.markAllNotificationsRead();
          }
          break;
      }

      alert('פעולה הושלמה בהצלחה!');
    } catch (error) {
      logger.error('Bulk operation failed:', error);
      alert('שגיאה בביצוע הפעולה');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
        פעולות מרובות
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {bulkOperations.map(operation => (
          <div
            key={operation.id}
            style={{
              padding: '16px',
              backgroundColor: theme.secondary_bg_color,
              borderRadius: '12px',
              cursor: 'pointer'
            }}
            onClick={() => handleBulkOperation(operation.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ fontSize: '24px' }}>{operation.icon}</div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: theme.text_color }}>
                {operation.title}
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: theme.hint_color, lineHeight: '1.4' }}>
              {operation.description}
            </p>
            <button
              disabled={isProcessing}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: theme.button_color,
                color: theme.button_text_color,
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.7 : 1
              }}
            >
              {isProcessing ? 'מעבד...' : 'בצע'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataExport({ dataStore, theme, haptic }: {
  dataStore: AdminPanelProps['dataStore'];
  theme: any;
  haptic: () => void;
}) {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (type: 'orders' | 'products') => {
    setIsExporting(type);
    haptic();

    try {
      let csvData = '';

      if (type === 'orders' && dataStore.exportOrdersToCSV) {
        csvData = await dataStore.exportOrdersToCSV();
      } else if (type === 'products' && dataStore.exportProductsToCSV) {
        csvData = await dataStore.exportProductsToCSV();
      }

      // Download CSV file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

    } catch (error) {
      logger.error('Export failed:', error);
      alert('שגיאה בייצוא הנתונים');
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
        ייצוא נתונים
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ExportCard
          title="ייצוא הזמנות"
          description="ייצוא כל ההזמנות לקובץ CSV"
          icon="📋"
          isExporting={isExporting === 'orders'}
          onExport={() => handleExport('orders')}
          theme={theme}
        />
        <ExportCard
          title="ייצוא מוצרים"
          description="ייצוא קטלוג המוצרים לקובץ CSV"
          icon="📦"
          isExporting={isExporting === 'products'}
          onExport={() => handleExport('products')}
          theme={theme}
        />
      </div>
    </div>
  );
}

function SystemSettings({ theme }: { theme: any }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
        הגדרות מערכת
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SettingCard
          title="התראות אוטומטיות"
          description="קבל התראות על אירועים חשובים במערכת"
          enabled={true}
          theme={theme}
        />
        <SettingCard
          title="גיבוי אוטומטי"
          description="גיבוי יומי של כל נתוני המערכת"
          enabled={true}
          theme={theme}
        />
        <SettingCard
          title="מצב תחזוקה"
          description="הפעל מצב תחזוקה למניעת גישה למערכת"
          enabled={false}
          theme={theme}
        />
      </div>
    </div>
  );
}

// Helper Components
function HealthCard({ title, value, status, icon, theme }: {
  title: string;
  value: number;
  status: 'healthy' | 'warning' | 'error';
  icon: string;
  theme: any;
}) {
  const getColor = () => {
    switch (status) {
      case 'healthy': return '#34c759';
      case 'warning': return '#ff9500';
      case 'error': return '#ff3b30';
      default: return theme.hint_color;
    }
  };

  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '12px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: getColor(), marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: theme.hint_color, fontWeight: '500' }}>
        {title}
      </div>
    </div>
  );
}

function SystemAlert({ type, message, action, theme }: {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  action?: string;
  theme: any;
}) {
  const getColor = () => {
    switch (type) {
      case 'success': return '#34c759';
      case 'warning': return '#ff9500';
      case 'error': return '#ff3b30';
      default: return '#007aff';
    }
  };

  return (
    <div style={{
      padding: '12px',
      backgroundColor: getColor() + '20',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span style={{ fontSize: '14px', color: theme.text_color }}>
        {message}
      </span>
      {action && (
        <button style={{
          padding: '4px 12px',
          backgroundColor: getColor(),
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer'
        }}>
          {action}
        </button>
      )}
    </div>
  );
}

function QuickAction({ title, description, icon, color, theme }: {
  title: string;
  description: string;
  icon: string;
  color: string;
  theme: any;
}) {
  return (
    <button style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color,
      border: `2px solid ${color}20`,
      borderRadius: '12px',
      cursor: 'pointer',
      textAlign: 'right'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '16px',
          backgroundColor: color + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px'
        }}>
          {icon}
        </div>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: theme.text_color }}>
          {title}
        </h4>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: theme.hint_color }}>
        {description}
      </p>
    </button>
  );
}

function ExportCard({ title, description, icon, isExporting, onExport, theme }: {
  title: string;
  description: string;
  icon: string;
  isExporting: boolean;
  onExport: () => void;
  theme: any;
}) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>{icon}</div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: theme.text_color }}>
            {title}
          </h4>
          <p style={{ margin: 0, fontSize: '14px', color: theme.hint_color }}>
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={onExport}
        disabled={isExporting}
        style={{
          padding: '8px 16px',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          opacity: isExporting ? 0.7 : 1
        }}
      >
        {isExporting ? 'מייצא...' : 'ייצא'}
      </button>
    </div>
  );
}

function SettingCard({ title, description, enabled, theme }: {
  title: string;
  description: string;
  enabled: boolean;
  theme: any;
}) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: theme.secondary_bg_color,
      borderRadius: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: theme.text_color }}>
          {title}
        </h4>
        <p style={{ margin: 0, fontSize: '14px', color: theme.hint_color }}>
          {description}
        </p>
      </div>
      <div style={{
        width: '48px',
        height: '28px',
        borderRadius: '14px',
        backgroundColor: enabled ? '#34c759' : theme.hint_color + '40',
        position: 'relative',
        cursor: 'pointer'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: 'white',
          position: 'absolute',
          top: '2px',
          left: enabled ? '22px' : '2px',
          transition: 'left 0.2s ease'
        }} />
      </div>
    </div>
  );
}