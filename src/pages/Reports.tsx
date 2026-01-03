import React, { useState, useEffect, useMemo } from 'react';

import { DataStore, User, Order } from '../data/types';
import { tokens, styles } from '../styles/tokens';
import { formatCurrency, useI18n } from '../lib/i18n';
import { Toast } from '../components/Toast';
import { logger } from '../lib/logger';
import { haptic } from '../utils/haptic';

interface ReportsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface ReportData {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  revenueByDay: { date: string; amount: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
}

export function Reports({ dataStore, onNavigate }: ReportsProps) {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [selectedReport, setSelectedReport] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedReport, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const profile = await dataStore.getProfile();
      setUser(profile);

      const data = await generateReportData(dateRange);
      setReportData(data);
    } catch (error) {
      logger.error('Failed to load reports:', error);
      Toast.error(t('reportsPage.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const generateReportData = async (range: string): Promise<ReportData> => {
    try {
      const orders = await dataStore.listOrders?.() || [];
      const now = new Date();
      let startDate = new Date();

      switch (range) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate && orderDate <= now;
      });

      const totalOrders = filteredOrders.length;
      const completedOrders = filteredOrders.filter(o => o.status === 'delivered').length;
      const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;
      const totalRevenue = filteredOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
      const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

      const revenueByDay: { [key: string]: number } = {};
      filteredOrders
        .filter(o => o.status === 'delivered')
        .forEach(order => {
          const date = new Date(order.created_at).toISOString().split('T')[0];
          revenueByDay[date] = (revenueByDay[date] || 0) + Number(order.total_amount);
        });

      const statusCounts: { [key: string]: number } = {};
      filteredOrders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });

      const productSales: { [key: string]: { sales: number; revenue: number } } = {};
      filteredOrders
        .filter(o => o.status === 'delivered')
        .forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const name = item.product?.name || item.name || 'Unknown';
              if (!productSales[name]) {
                productSales[name] = { sales: 0, revenue: 0 };
              }
              productSales[name].sales += item.quantity || 1;
              productSales[name].revenue += (item.price || 0) * (item.quantity || 1);
            });
          }
        });

      return {
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue,
        revenueByDay: Object.entries(revenueByDay).map(([date, amount]) => ({ date, amount })),
        ordersByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        topProducts: Object.entries(productSales)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      };
    } catch (error) {
      logger.error('Error generating report data:', error);
      return {
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        revenueByDay: [],
        ordersByStatus: [],
        topProducts: []
      };
    }
  };

  const reportTypes = [
    { id: 'overview', label: 'סקירה כללית', icon: '📊' },
    { id: 'sales', label: 'מכירות', icon: '💰' },
    { id: 'delivery', label: 'משלוחים', icon: '🚚' },
    { id: 'inventory', label: 'מלאי', icon: '📦' }
  ];

  const dateRanges = [
    { id: 'day', label: 'יום' },
    { id: 'week', label: 'שבוע' },
    { id: 'month', label: 'חודש' },
    { id: 'year', label: 'שנה' }
  ];

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      new: 'חדש',
      confirmed: 'אושר',
      preparing: 'בהכנה',
      ready: 'מוכן',
      out_for_delivery: 'במשלוח',
      delivered: 'נמסר',
      cancelled: 'בוטל'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      new: tokens.colors.brand.primary,
      confirmed: tokens.colors.brand.primary,
      preparing: tokens.colors.status.warning,
      ready: tokens.colors.status.success,
      out_for_delivery: tokens.colors.brand.primary,
      delivered: tokens.colors.status.success,
      cancelled: tokens.colors.status.error
    };
    return colors[status] || tokens.colors.subtle;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: tokens.colors.panel,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        direction: 'rtl'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ color: tokens.colors.text, fontSize: '18px' }}>טוען דוחות...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.panel,
      paddingTop: '16px',
      paddingBottom: '80px',
      direction: 'rtl'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '700',
            color: tokens.colors.text,
            textShadow: '0 0 20px rgba(29, 155, 240, 0.5)'
          }}>
            📊 דוחות
          </h1>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {reportTypes.map(type => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedReport(type.id);
                haptic();
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                background: selectedReport === type.id
                  ? 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)'
                  : tokens.colors.background.card,
                color: selectedReport === type.id ? '#fff' : tokens.colors.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selectedReport === type.id ? '0 4px 12px rgba(29, 155, 240, 0.3)' : 'none',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px'
        }}>
          {dateRanges.map(range => (
            <button
              key={range.id}
              onClick={() => {
                setDateRange(range.id as any);
                haptic();
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${dateRange === range.id ? tokens.colors.brand.primary : tokens.colors.background.cardBorder}`,
                background: dateRange === range.id ? `${tokens.colors.brand.primary}20` : tokens.colors.background.card,
                color: dateRange === range.id ? tokens.colors.brand.primary : tokens.colors.text,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {range.label}
            </button>
          ))}
        </div>

        {reportData && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ ...styles.card, padding: '16px' }}>
                <div style={{ color: tokens.colors.subtle, fontSize: '14px', marginBottom: '8px' }}>
                  סה"כ הזמנות
                </div>
                <div style={{ color: tokens.colors.text, fontSize: '28px', fontWeight: '700' }}>
                  {reportData.totalOrders}
                </div>
              </div>

              <div style={{ ...styles.card, padding: '16px' }}>
                <div style={{ color: tokens.colors.subtle, fontSize: '14px', marginBottom: '8px' }}>
                  הזמנות הושלמו
                </div>
                <div style={{ color: tokens.colors.status.success, fontSize: '28px', fontWeight: '700' }}>
                  {reportData.completedOrders}
                </div>
              </div>

              <div style={{ ...styles.card, padding: '16px' }}>
                <div style={{ color: tokens.colors.subtle, fontSize: '14px', marginBottom: '8px' }}>
                  הכנסות
                </div>
                <div style={{ color: tokens.colors.status.warning, fontSize: '24px', fontWeight: '700' }}>
                  {formatCurrency(reportData.totalRevenue)}
                </div>
              </div>

              <div style={{ ...styles.card, padding: '16px' }}>
                <div style={{ color: tokens.colors.subtle, fontSize: '14px', marginBottom: '8px' }}>
                  ממוצע הזמנה
                </div>
                <div style={{ color: tokens.colors.brand.primary, fontSize: '24px', fontWeight: '700' }}>
                  {formatCurrency(reportData.averageOrderValue)}
                </div>
              </div>
            </div>

            {reportData.ordersByStatus.length > 0 && (
              <div style={{ ...styles.card, marginBottom: '24px' }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  התפלגות לפי סטטוס
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reportData.ordersByStatus.map(item => (
                    <div key={item.status} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: '8px',
                      background: `${getStatusColor(item.status)}10`,
                      border: `1px solid ${getStatusColor(item.status)}30`
                    }}>
                      <span style={{ color: tokens.colors.text, fontWeight: '600' }}>
                        {getStatusLabel(item.status)}
                      </span>
                      <span style={{
                        color: getStatusColor(item.status),
                        fontSize: '20px',
                        fontWeight: '700'
                      }}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportData.topProducts.length > 0 && (
              <div style={{ ...styles.card, marginBottom: '24px' }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  מוצרים מובילים
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reportData.topProducts.map((product, index) => (
                    <div key={product.name} style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: index === 0 ? `${tokens.colors.status.warning}10` : tokens.colors.background.card,
                      border: `1px solid ${index === 0 ? tokens.colors.status.warning : tokens.colors.background.cardBorder}40`
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          color: tokens.colors.text,
                          fontWeight: '600',
                          fontSize: '15px'
                        }}>
                          {index === 0 && '👑 '}{product.name}
                        </span>
                        <span style={{
                          color: tokens.colors.status.warning,
                          fontWeight: '700',
                          fontSize: '16px'
                        }}>
                          {formatCurrency(product.revenue)}
                        </span>
                      </div>
                      <div style={{
                        color: tokens.colors.subtle,
                        fontSize: '13px'
                      }}>
                        {product.sales} מכירות
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportData.revenueByDay.length > 0 && (
              <div style={{ ...styles.card }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: tokens.colors.text
                }}>
                  מגמת הכנסות
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reportData.revenueByDay.slice(-7).map(item => (
                    <div key={item.date} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0'
                    }}>
                      <span style={{ color: tokens.colors.subtle, fontSize: '14px' }}>
                        {new Date(item.date).toLocaleDateString('he-IL', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span style={{
                        color: tokens.colors.status.success,
                        fontWeight: '600',
                        fontSize: '15px'
                      }}>
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
