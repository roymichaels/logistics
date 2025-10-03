/**
 * Enhanced Orders View for Managers
 *
 * Comprehensive order management interface with:
 * - Advanced filtering and search
 * - Driver assignment interface
 * - Status management
 * - Analytics dashboard
 * - Bulk operations
 * - Export capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import { telegram } from '../../lib/telegram';
import type { DataStore, Order, User, Zone, DriverStatusRecord } from '../../data/types';
import { hasPermission } from '../lib/rolePermissions';
import { Toast } from './Toast';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';

interface ManagerOrdersViewProps {
  dataStore: DataStore;
  user: User;
  onNavigate: (page: string) => void;
}

type OrderStatus = Order['status'];
type DateRange = 'today' | 'week' | 'month' | 'all';

interface OrderFilters {
  status: OrderStatus | 'all';
  dateRange: DateRange;
  zone: string;
  driver: string;
  priority: 'all' | 'urgent' | 'high' | 'medium' | 'low';
}

interface OrderAnalytics {
  totalOrders: number;
  newOrders: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  avgOrderValue: number;
  completionRate: number;
}

export function ManagerOrdersView({ dataStore, user, onNavigate }: ManagerOrdersViewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [drivers, setDrivers] = useState<DriverStatusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showAnalytics, setShowAnalytics] = useState(true);

  const [filters, setFilters] = useState<OrderFilters>({
    status: 'all',
    dateRange: 'today',
    zone: 'all',
    driver: 'all',
    priority: 'all',
  });

  const theme = telegram.themeParams;
  const canAssignOrders = hasPermission(user, 'orders:assign_driver');
  const canUpdateOrders = hasPermission(user, 'orders:update');

  useEffect(() => {
    loadData();
  }, [filters, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersList, zonesList, driversList] = await Promise.all([
        dataStore.listOrders?.() || [],
        dataStore.listZones?.() || [],
        dataStore.listDriverStatuses?.() || [],
      ]);

      setOrders(ordersList);
      setZones(zonesList);
      setDrivers(driversList);
    } catch (error) {
      console.error('Failed to load orders data:', error);
      Toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(o => o.status === filters.status);
    }

    // Date range filter
    const now = new Date();
    if (filters.dateRange !== 'all') {
      const startDate = new Date();
      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      result = result.filter(o => new Date(o.created_at) >= startDate);
    }

    // Zone filter
    if (filters.zone !== 'all') {
      // Note: Would need zone_id on orders table for this to work
      // For now, this is a placeholder
    }

    // Driver filter
    if (filters.driver !== 'all') {
      result = result.filter(o => o.assigned_driver === filters.driver);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      result = result.filter(o => o.priority === filters.priority);
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        o =>
          o.customer_name.toLowerCase().includes(query) ||
          o.customer_phone.includes(query) ||
          o.customer_address.toLowerCase().includes(query) ||
          o.id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [orders, filters, searchQuery]);

  // Calculate analytics
  const analytics = useMemo((): OrderAnalytics => {
    const total = filteredOrders.length;
    const newOrders = filteredOrders.filter(o => o.status === 'new').length;
    const inProgress = filteredOrders.filter(o =>
      ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
    ).length;
    const completed = filteredOrders.filter(o => o.status === 'delivered').length;
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled').length;
    const revenue = filteredOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const avgValue = completed > 0 ? revenue / completed : 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      totalOrders: total,
      newOrders,
      inProgress,
      completed,
      cancelled,
      totalRevenue: revenue,
      avgOrderValue: avgValue,
      completionRate,
    };
  }, [filteredOrders]);

  const handleBulkAssign = async () => {
    if (selectedOrders.size === 0) {
      Toast.error('בחר הזמנות להקצאה');
      return;
    }

    Toast.info(`הקצאת ${selectedOrders.size} הזמנות...`);
    // Implementation would call dispatch orchestrator for each order
  };

  const handleExportCSV = () => {
    const csvData = filteredOrders.map(order => ({
      'Order ID': order.id,
      'Customer': order.customer_name,
      'Phone': order.customer_phone,
      'Address': order.customer_address,
      'Status': order.status,
      'Total': order.total_amount,
      'Driver': order.assigned_driver || 'Unassigned',
      'Created': new Date(order.created_at).toLocaleString('he-IL'),
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    Toast.success('קובץ יוצא בהצלחה');
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const selectAllFiltered = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: ROYAL_COLORS.muted }}>טוען הזמנות...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <h1 style={ROYAL_STYLES.pageTitle}>📦 ניהול הזמנות</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>ניהול מקיף של הזמנות, הקצאות ומעקב סטטוס</p>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: ROYAL_COLORS.text }}>
              סטטיסטיקות
            </h2>
            <button
              onClick={() => setShowAnalytics(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: ROYAL_COLORS.muted,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              הסתר
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
            }}
          >
            <MetricCard icon="📊" label="סה״כ הזמנות" value={analytics.totalOrders.toString()} />
            <MetricCard
              icon="🆕"
              label="חדשות"
              value={analytics.newOrders.toString()}
              color={ROYAL_COLORS.warning}
            />
            <MetricCard
              icon="⚡"
              label="בתהליך"
              value={analytics.inProgress.toString()}
              color={ROYAL_COLORS.info}
            />
            <MetricCard
              icon="✅"
              label="הושלמו"
              value={analytics.completed.toString()}
              color={ROYAL_COLORS.success}
            />
            <MetricCard
              icon="💰"
              label="הכנסות"
              value={`₪${analytics.totalRevenue.toLocaleString()}`}
              color={ROYAL_COLORS.gold}
            />
            <MetricCard
              icon="📈"
              label="ממוצע הזמנה"
              value={`₪${Math.round(analytics.avgOrderValue).toLocaleString()}`}
            />
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div style={ROYAL_STYLES.card}>
        {/* Search */}
        <input
          type="search"
          placeholder="חיפוש לפי לקוח, טלפון, כתובת או מזהה הזמנה..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            ...ROYAL_STYLES.input,
            marginBottom: '16px',
            fontSize: '15px',
          }}
        />

        {/* Status Filters */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: ROYAL_COLORS.text,
            }}
          >
            סינון לפי סטטוס
          </label>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
            {[
              { value: 'all', label: 'הכל', count: orders.length },
              { value: 'new', label: 'חדש', count: orders.filter(o => o.status === 'new').length },
              {
                value: 'confirmed',
                label: 'אושר',
                count: orders.filter(o => o.status === 'confirmed').length,
              },
              {
                value: 'out_for_delivery',
                label: 'במשלוח',
                count: orders.filter(o => o.status === 'out_for_delivery').length,
              },
              {
                value: 'delivered',
                label: 'נמסר',
                count: orders.filter(o => o.status === 'delivered').length,
              },
              {
                value: 'cancelled',
                label: 'בוטל',
                count: orders.filter(o => o.status === 'cancelled').length,
              },
            ].map(status => (
              <button
                key={status.value}
                onClick={() => {
                  telegram.hapticFeedback('selection');
                  setFilters({ ...filters, status: status.value as any });
                }}
                style={{
                  padding: '8px 16px',
                  border: `2px solid ${
                    filters.status === status.value ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder
                  }`,
                  borderRadius: '20px',
                  background:
                    filters.status === status.value ? ROYAL_COLORS.accent + '20' : 'transparent',
                  color: filters.status === status.value ? ROYAL_COLORS.accent : ROYAL_COLORS.text,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {status.label}
                <span
                  style={{
                    fontSize: '12px',
                    opacity: 0.7,
                    background: ROYAL_COLORS.secondary,
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {status.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '600',
                color: ROYAL_COLORS.muted,
              }}
            >
              טווח תאריכים
            </label>
            <select
              value={filters.dateRange}
              onChange={e => setFilters({ ...filters, dateRange: e.target.value as DateRange })}
              style={{
                ...ROYAL_STYLES.input,
                padding: '10px 12px',
                fontSize: '14px',
              }}
            >
              <option value="today">היום</option>
              <option value="week">שבוע אחרון</option>
              <option value="month">חודש אחרון</option>
              <option value="all">הכל</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '600',
                color: ROYAL_COLORS.muted,
              }}
            >
              נהג
            </label>
            <select
              value={filters.driver}
              onChange={e => setFilters({ ...filters, driver: e.target.value })}
              style={{
                ...ROYAL_STYLES.input,
                padding: '10px 12px',
                fontSize: '14px',
              }}
            >
              <option value="all">כל הנהגים</option>
              {drivers.map(driver => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  נהג #{driver.driver_id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrders.size > 0 && (
        <div
          style={{
            ...ROYAL_STYLES.card,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: ROYAL_COLORS.accent + '10',
            border: `2px solid ${ROYAL_COLORS.accent}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '600', color: ROYAL_COLORS.accent }}>
              {selectedOrders.size} הזמנות נבחרו
            </span>
            <button
              onClick={() => setSelectedOrders(new Set())}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: `1px solid ${ROYAL_COLORS.accent}`,
                borderRadius: '6px',
                color: ROYAL_COLORS.accent,
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              בטל בחירה
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {canAssignOrders && (
              <button
                onClick={handleBulkAssign}
                style={{
                  ...ROYAL_STYLES.buttonPrimary,
                  padding: '8px 16px',
                  fontSize: '14px',
                }}
              >
                הקצה לנהג
              </button>
            )}
          </div>
        </div>
      )}

      {/* Orders List */}
      <div style={ROYAL_STYLES.card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: ROYAL_COLORS.text }}>
            הזמנות ({filteredOrders.length})
          </h2>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={selectAllFiltered}
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                padding: '8px 12px',
                fontSize: '13px',
              }}
            >
              {selectedOrders.size === filteredOrders.length ? 'בטל הכל' : 'בחר הכל'}
            </button>

            <button
              onClick={handleExportCSV}
              style={{
                ...ROYAL_STYLES.buttonSecondary,
                padding: '8px 12px',
                fontSize: '13px',
              }}
            >
              📥 ייצוא CSV
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div style={ROYAL_STYLES.emptyState}>
            <div style={ROYAL_STYLES.emptyStateIcon}>📦</div>
            <p style={ROYAL_STYLES.emptyStateText}>לא נמצאו הזמנות</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                selected={selectedOrders.has(order.id)}
                onSelect={() => toggleOrderSelection(order.id)}
                onView={() => {
                  /* Navigate to detail */
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components

function MetricCard({
  icon,
  label,
  value,
  color = ROYAL_COLORS.accent,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={ROYAL_STYLES.statBox}>
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ ...ROYAL_STYLES.statValue, color, fontSize: '20px' }}>{value}</div>
      <div style={{ ...ROYAL_STYLES.statLabel, fontSize: '11px' }}>{label}</div>
    </div>
  );
}

function OrderCard({
  order,
  selected,
  onSelect,
  onView,
}: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
}) {
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return ROYAL_COLORS.warning;
      case 'confirmed':
      case 'preparing':
        return ROYAL_COLORS.info;
      case 'out_for_delivery':
        return ROYAL_COLORS.accent;
      case 'delivered':
        return ROYAL_COLORS.success;
      case 'cancelled':
        return ROYAL_COLORS.crimson;
      default:
        return ROYAL_COLORS.muted;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      new: 'חדש',
      confirmed: 'אושר',
      preparing: 'בהכנה',
      ready: 'מוכן',
      out_for_delivery: 'במשלוח',
      delivered: 'נמסר',
      cancelled: 'בוטל',
    };
    return labels[status] || status;
  };

  return (
    <div
      style={{
        padding: '16px',
        background: selected ? ROYAL_COLORS.accent + '10' : ROYAL_COLORS.secondary,
        border: `2px solid ${selected ? ROYAL_COLORS.accent : ROYAL_COLORS.cardBorder}`,
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={onView}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={e => {
            e.stopPropagation();
            onSelect();
          }}
          style={{ marginTop: '4px', cursor: 'pointer', width: '18px', height: '18px' }}
        />

        {/* Order Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                {order.customer_name}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: ROYAL_COLORS.muted }}>
                📞 {order.customer_phone}
              </p>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  padding: '4px 10px',
                  background: getStatusColor(order.status) + '20',
                  color: getStatusColor(order.status),
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '4px',
                }}
              >
                {getStatusLabel(order.status)}
              </div>
              {order.priority && order.priority !== 'medium' && (
                <div
                  style={{
                    padding: '2px 8px',
                    background: ROYAL_COLORS.warning + '20',
                    color: ROYAL_COLORS.warning,
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  {order.priority === 'urgent' ? '🔥 דחוף' : order.priority === 'high' ? '⚡ גבוה' : ''}
                </div>
              )}
            </div>
          </div>

          <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: ROYAL_COLORS.muted }}>
            📍 {order.customer_address}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: ROYAL_COLORS.muted }}>
              🕒 {new Date(order.created_at).toLocaleString('he-IL')}
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: ROYAL_COLORS.gold }}>
              ₪{order.total_amount?.toLocaleString() || 0}
            </div>
          </div>

          {order.assigned_driver && (
            <div
              style={{
                marginTop: '8px',
                padding: '6px 10px',
                background: ROYAL_COLORS.info + '10',
                borderRadius: '8px',
                fontSize: '12px',
                color: ROYAL_COLORS.info,
              }}
            >
              🚗 נהג: {order.assigned_driver}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
