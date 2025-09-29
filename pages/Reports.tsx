import React, { useState, useEffect } from 'react';
import { telegram } from '../lib/telegram';
import { useTelegramUI } from '../src/hooks/useTelegramUI';
import { DataStore, User } from '../data/types';
import { hebrew, formatCurrency } from '../src/lib/hebrew';

interface ReportsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function Reports({ dataStore, onNavigate }: ReportsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [selectedReport, setSelectedReport] = useState<string>('overview');
  const [dateRange, setDateRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>({});
  const { theme, haptic, backButton } = useTelegramUI();

  useEffect(() => {
    loadData();
  }, [selectedReport, dateRange]);

  useEffect(() => {
    backButton.hide();
  }, []);

  const loadData = async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      // Generate demo report data
      const data = generateReportData(selectedReport, dateRange);
      setReportData(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReportData = (reportType: string, range: string) => {
    const multiplier = range === 'day' ? 1 : range === 'week' ? 7 : range === 'month' ? 30 : 365;
    
    switch (reportType) {
      case 'overview':
        return {
          totalOrders: 45 * multiplier,
          completedOrders: 38 * multiplier,
          revenue: 125000 * multiplier,
          averageDeliveryTime: 2.5,
          customerSatisfaction: 4.7,
          topProducts: [
            { name: 'מחשב נייד Dell', sales: 12 * multiplier, revenue: 42000 * multiplier },
            { name: 'עכבר אלחוטי', sales: 25 * multiplier, revenue: 3000 * multiplier },
            { name: 'מקלדת מכנית', sales: 8 * multiplier, revenue: 4800 * multiplier }
          ]
        };
      case 'sales':
        return {
          totalSales: 125000 * multiplier,
          ordersCount: 45 * multiplier,
          averageOrderValue: 2778,
          topSalesperson: 'שרה כהן',
          salesByCategory: [
            { category: 'מחשבים', amount: 65000 * multiplier, percentage: 52 },
            { category: 'אביזרים', amount: 35000 * multiplier, percentage: 28 },
            { category: 'ציוד משרדי', amount: 25000 * multiplier, percentage: 20 }
          ]
        };
      case 'delivery':
        return {
          totalDeliveries: 38 * multiplier,
          onTimeDeliveries: 35 * multiplier,
          averageDeliveryTime: 2.5,
          failedDeliveries: 3 * multiplier,
          topDrivers: [
            { name: 'דני מור', deliveries: 15 * multiplier, rating: 4.9 },
            { name: 'יוסי לוי', deliveries: 12 * multiplier, rating: 4.7 },
            { name: 'רחל גולן', deliveries: 11 * multiplier, rating: 4.8 }
          ]
        };
      case 'inventory':
        return {
          totalProducts: 156,
          lowStockItems: 12,
          outOfStockItems: 3,
          totalValue: 450000,
          topMovingProducts: [
            { name: 'עכבר אלחוטי', moved: 25 * multiplier, remaining: 125 },
            { name: 'מחשב נייד Dell', moved: 12 * multiplier, remaining: 13 },
            { name: 'מקלדת מכנית', moved: 8 * multiplier, remaining: 42 }
          ]
        };
      default:
        return {};
    }
  };

  const reportTypes = [
    { id: 'overview', name: 'סקירה כללית', icon: '📊' },
    { id: 'sales', name: 'מכירות', icon: '💰' },
    { id: 'delivery', name: 'משלוחים', icon: '🚚' },
    { id: 'inventory', name: 'מלאי', icon: '📦' }
  ];

  const dateRanges = [
    { id: 'day', name: 'היום' },
    { id: 'week', name: 'השבוע' },
    { id: 'month', name: 'החודש' },
    { id: 'year', name: 'השנה' }
  ];

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: theme.text_color,
        backgroundColor: theme.bg_color,
        minHeight: '100vh'
      }}>
        טוען דוחות...
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
          📈 דוחות ואנליטיקה
        </h1>

        {/* Report Type Selector */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px' }}>
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                haptic();
                setSelectedReport(type.id);
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: selectedReport === type.id ? theme.button_color : theme.secondary_bg_color,
                color: selectedReport === type.id ? theme.button_text_color : theme.text_color,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{type.icon}</span>
              <span>{type.name}</span>
            </button>
          ))}
        </div>

        {/* Date Range Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {dateRanges.map((range) => (
            <button
              key={range.id}
              onClick={() => {
                haptic();
                setDateRange(range.id);
              }}
              style={{
                padding: '6px 12px',
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '16px',
                backgroundColor: dateRange === range.id ? theme.button_color + '20' : 'transparent',
                color: dateRange === range.id ? theme.button_color : theme.text_color,
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {range.name}
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      <div style={{ padding: '16px' }}>
        {selectedReport === 'overview' && (
          <OverviewReport data={reportData} theme={theme} />
        )}
        {selectedReport === 'sales' && (
          <SalesReport data={reportData} theme={theme} />
        )}
        {selectedReport === 'delivery' && (
          <DeliveryReport data={reportData} theme={theme} />
        )}
        {selectedReport === 'inventory' && (
          <InventoryReport data={reportData} theme={theme} />
        )}
      </div>
    </div>
  );
}

function OverviewReport({ data, theme }: { data: any; theme: any }) {
  return (
    <div>
      {/* Key Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '12px',
        marginBottom: '24px'
      }}>
        <MetricCard
          title="סה״כ הזמנות"
          value={data.totalOrders?.toString() || '0'}
          icon="📋"
          color="#007aff"
          theme={theme}
        />
        <MetricCard
          title="הזמנות שהושלמו"
          value={data.completedOrders?.toString() || '0'}
          icon="✅"
          color="#34c759"
          theme={theme}
        />
        <MetricCard
          title="הכנסות"
          value={formatCurrency(data.revenue || 0)}
          icon="💰"
          color="#ff9500"
          theme={theme}
          isText={true}
        />
        <MetricCard
          title="זמן משלוח ממוצע"
          value={`${data.averageDeliveryTime || 0} שעות`}
          icon="⏱️"
          color="#5856d6"
          theme={theme}
          isText={true}
        />
      </div>

      {/* Top Products */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '600'
        }}>
          מוצרים מובילים
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.topProducts?.map((product: any, index: number) => (
            <div
              key={index}
              style={{
                padding: '12px',
                backgroundColor: theme.secondary_bg_color,
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                  {product.name}
                </div>
                <div style={{ fontSize: '12px', color: theme.hint_color }}>
                  {product.sales} מכירות
                </div>
              </div>
              <div style={{ fontWeight: '600', color: theme.button_color }}>
                {formatCurrency(product.revenue)}
              </div>
            </div>
          )) || []}
        </div>
      </div>
    </div>
  );
}

function SalesReport({ data, theme }: { data: any; theme: any }) {
  return (
    <div>
      {/* Sales Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '12px',
        marginBottom: '24px'
      }}>
        <MetricCard
          title="סה״כ מכירות"
          value={formatCurrency(data.totalSales || 0)}
          icon="💰"
          color="#34c759"
          theme={theme}
          isText={true}
        />
        <MetricCard
          title="מספר הזמנות"
          value={data.ordersCount?.toString() || '0'}
          icon="📋"
          color="#007aff"
          theme={theme}
        />
        <MetricCard
          title="ממוצע להזמנה"
          value={formatCurrency(data.averageOrderValue || 0)}
          icon="📊"
          color="#ff9500"
          theme={theme}
          isText={true}
        />
      </div>

      {/* Sales by Category */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '600'
        }}>
          מכירות לפי קטגוריה
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.salesByCategory?.map((category: any, index: number) => (
            <div
              key={index}
              style={{
                padding: '12px',
                backgroundColor: theme.secondary_bg_color,
                borderRadius: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600' }}>{category.category}</span>
                <span style={{ fontWeight: '600', color: theme.button_color }}>
                  {formatCurrency(category.amount)}
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: theme.hint_color + '30',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${category.percentage}%`,
                  height: '100%',
                  backgroundColor: theme.button_color,
                  borderRadius: '3px'
                }} />
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: theme.hint_color,
                marginTop: '4px'
              }}>
                {category.percentage}% מסך המכירות
              </div>
            </div>
          )) || []}
        </div>
      </div>
    </div>
  );
}

function DeliveryReport({ data, theme }: { data: any; theme: any }) {
  const onTimePercentage = data.totalDeliveries ? 
    Math.round((data.onTimeDeliveries / data.totalDeliveries) * 100) : 0;

  return (
    <div>
      {/* Delivery Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '12px',
        marginBottom: '24px'
      }}>
        <MetricCard
          title="סה״כ משלוחים"
          value={data.totalDeliveries?.toString() || '0'}
          icon="🚚"
          color="#007aff"
          theme={theme}
        />
        <MetricCard
          title="משלוחים בזמן"
          value={`${onTimePercentage}%`}
          icon="✅"
          color="#34c759"
          theme={theme}
          isText={true}
        />
        <MetricCard
          title="זמן ממוצע"
          value={`${data.averageDeliveryTime || 0} שעות`}
          icon="⏱️"
          color="#ff9500"
          theme={theme}
          isText={true}
        />
        <MetricCard
          title="משלוחים כושלים"
          value={data.failedDeliveries?.toString() || '0'}
          icon="❌"
          color="#ff3b30"
          theme={theme}
        />
      </div>

      {/* Top Drivers */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '600'
        }}>
          נהגים מובילים
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.topDrivers?.map((driver: any, index: number) => (
            <div
              key={index}
              style={{
                padding: '12px',
                backgroundColor: theme.secondary_bg_color,
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                  🚚 {driver.name}
                </div>
                <div style={{ fontSize: '12px', color: theme.hint_color }}>
                  {driver.deliveries} משלוחים
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>⭐</span>
                <span style={{ fontWeight: '600' }}>{driver.rating}</span>
              </div>
            </div>
          )) || []}
        </div>
      </div>
    </div>
  );
}

function InventoryReport({ data, theme }: { data: any; theme: any }) {
  return (
    <div>
      {/* Inventory Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '12px',
        marginBottom: '24px'
      }}>
        <MetricCard
          title="סה״כ מוצרים"
          value={data.totalProducts?.toString() || '0'}
          icon="📦"
          color="#007aff"
          theme={theme}
        />
        <MetricCard
          title="מלאי נמוך"
          value={data.lowStockItems?.toString() || '0'}
          icon="⚠️"
          color="#ff9500"
          theme={theme}
        />
        <MetricCard
          title="אזל מהמלאי"
          value={data.outOfStockItems?.toString() || '0'}
          icon="❌"
          color="#ff3b30"
          theme={theme}
        />
        <MetricCard
          title="ערך כולל"
          value={formatCurrency(data.totalValue || 0)}
          icon="💰"
          color="#34c759"
          theme={theme}
          isText={true}
        />
      </div>

      {/* Top Moving Products */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '18px', 
          fontWeight: '600'
        }}>
          מוצרים נמכרים
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.topMovingProducts?.map((product: any, index: number) => (
            <div
              key={index}
              style={{
                padding: '12px',
                backgroundColor: theme.secondary_bg_color,
                borderRadius: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600' }}>{product.name}</span>
                <span style={{ fontSize: '12px', color: theme.hint_color }}>
                  נותרו: {product.remaining}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: theme.hint_color }}>
                נמכרו: {product.moved} יחידות
              </div>
            </div>
          )) || []}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, theme, isText = false }: { 
  title: string; 
  value: string; 
  icon: string;
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
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ 
        fontSize: isText ? '14px' : '20px', 
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