import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, DataStore, User, Zone } from '../data/types';
import { OrderFilters, OrderMetrics, OrderViewMode } from '../types/orderManagement';
import { ORDER_STATUS_COLORS, PRIORITY_COLORS, ORDER_CARD_STYLES } from '../styles/orderTheme';
import { Toast } from './Toast';

import { logger } from '../lib/logger';

interface ManagerOrderDashboardProps {
  dataStore: DataStore;
  currentUser: User;
  onNavigate: (page: string) => void;
  onViewOrder?: (order: Order) => void;
}

export function ManagerOrderDashboard({
  dataStore,
  currentUser,
  onNavigate,
  onViewOrder
}: ManagerOrderDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<OrderViewMode>('list');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<OrderFilters>({
    status: 'all',
    dateRange: 'today',
    priority: 'all',
    searchQuery: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersList, zonesList] = await Promise.all([
        dataStore.listOrders?.() || [],
        dataStore.listZones?.() || []
      ]);

      setOrders(ordersList);
      setZones(zonesList);
    } catch (error) {
      logger.error('Failed to load orders:', error);
      Toast.error('שגיאה בטעינת ההזמנות');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(o => o.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      result = result.filter(o => o.priority === filters.priority);
    }

    // Date range filter
    const now = new Date();
    if (filters.dateRange !== 'all') {
      const startDate = new Date();
      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate.setDate(now.getDate() - 1);
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

    // Search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(o =>
        o.customer_name.toLowerCase().includes(query) ||
        o.customer_phone.includes(query) ||
        o.customer_address.toLowerCase().includes(query) ||
        o.id.toLowerCase().includes(query)
      );
    }

    // Sort by created date (newest first)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return result;
  }, [orders, filters]);

  const metrics = useMemo((): OrderMetrics => {
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
      completionRate
    };
  }, [filteredOrders]);

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

  const handleExportCSV = () => {
    const csvData = filteredOrders.map(order => ({
      'Order ID': order.id,
      'Customer': order.customer_name,
      'Phone': order.customer_phone,
      'Address': order.customer_address,
      'Status': order.status,
      'Priority': order.priority || 'medium',
      'Total': order.total_amount,
      'Driver': order.assigned_driver || 'Unassigned',
      'Created': new Date(order.created_at).toLocaleString('he-IL')
    }));

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    Toast.success('קובץ יוצא בהצלחה');
  };

  const handleBulkCancel = async () => {
    if (selectedOrders.size === 0) {
      Toast.error('בחר הזמנות לביטול');
      return;
    }

    const confirmed = confirm(`לבטל ${selectedOrders.size} הזמנות?`);
    if (!confirmed) return;

    try {
      for (const orderId of Array.from(selectedOrders)) {
        await dataStore.updateOrder?.(orderId, { status: 'cancelled' });
      }

      Toast.success(`${selectedOrders.size} הזמנות בוטלו`);
      setSelectedOrders(new Set());
      await loadData();
    } catch (error) {
      logger.error('Failed to cancel orders:', error);
      Toast.error('שגיאה בביטול הזמנות');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '16px', color: '#666' }}>טוען דשבורד...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f5f7fa 0%, #ffffff 100%)',
      paddingBottom: '40px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
        padding: '24px 20px',
        color: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700' }}>
                📊 ניהול הזמנות
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
                מעקב, ניתוח והקצאת הזמנות בזמן אמת
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowFilters(!showFilters);

                }}
                style={{
                  padding: '10px 16px',
                  background: showFilters ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  fontSize: '14px'
                }}
              >
                🔍 סינון
              </button>

              <button
                onClick={() => {
                  loadData();

                }}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  fontSize: '14px'
                }}
              >
                🔄 רענן
              </button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px'
          }}>
            <MetricCard
              icon="📦"
              label="סה״כ הזמנות"
              value={metrics.totalOrders.toString()}
              color="#FFFFFF"
            />
            <MetricCard
              icon="🆕"
              label="חדשות"
              value={metrics.newOrders.toString()}
              color="#FFB74D"
            />
            <MetricCard
              icon="⚡"
              label="בתהליך"
              value={metrics.inProgress.toString()}
              color="#42A5F5"
            />
            <MetricCard
              icon="✅"
              label="הושלמו"
              value={metrics.completed.toString()}
              color="#66BB6A"
            />
            <MetricCard
              icon="💰"
              label="הכנסות"
              value={`₪${Math.round(metrics.totalRevenue).toLocaleString()}`}
              color="#FFD700"
            />
            <MetricCard
              icon="📈"
              label="ממוצע"
              value={`₪${Math.round(metrics.avgOrderValue).toLocaleString()}`}
              color="#FFFFFF"
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
        {/* Filters Panel */}
        {showFilters && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>
              🔍 סינון מתקדם
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {/* Search */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  חיפוש
                </label>
                <input
                  type="search"
                  placeholder="לקוח, טלפון, כתובת..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '2px solid #E0E0E0',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  סטטוס
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '2px solid #E0E0E0',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">הכל</option>
                  <option value="new">חדש</option>
                  <option value="confirmed">אושר</option>
                  <option value="preparing">בהכנה</option>
                  <option value="ready">מוכן</option>
                  <option value="out_for_delivery">במשלוח</option>
                  <option value="delivered">נמסר</option>
                  <option value="cancelled">בוטל</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  טווח תאריכים
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '2px solid #E0E0E0',
                    fontSize: '14px'
                  }}
                >
                  <option value="today">היום</option>
                  <option value="yesterday">אתמול</option>
                  <option value="week">שבוע אחרון</option>
                  <option value="month">חודש אחרון</option>
                  <option value="all">הכל</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  עדיפות
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '2px solid #E0E0E0',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">הכל</option>
                  <option value="urgent">דחוף</option>
                  <option value="high">גבוה</option>
                  <option value="medium">בינוני</option>
                  <option value="low">נמוך</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setFilters({
                  status: 'all',
                  dateRange: 'today',
                  priority: 'all',
                  searchQuery: ''
                })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '2px solid #E0E0E0',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                נקה סינון
              </button>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedOrders.size > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '700' }}>
              {selectedOrders.size} הזמנות נבחרו
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleBulkCancel}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(244, 67, 54, 0.9)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ביטול המוני
              </button>

              <button
                onClick={() => setSelectedOrders(new Set())}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                בטל בחירה
              </button>
            </div>
          </div>
        )}

        {/* Orders List Header */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
              📋 הזמנות ({filteredOrders.length})
            </h2>

            <button
              onClick={selectAllFiltered}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '2px solid #E0E0E0',
                background: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              {selectedOrders.size === filteredOrders.length ? 'בטל הכל' : 'בחר הכל'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '2px solid #1D9BF0',
                background: '#FFFFFF',
                color: '#1D9BF0',
                fontWeight: '600',
                cursor: filteredOrders.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: filteredOrders.length === 0 ? 0.5 : 1
              }}
            >
              📥 ייצוא CSV
            </button>

            <button
              onClick={() => {
                setViewMode(viewMode === 'list' ? 'grid' : 'list');

              }}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '2px solid #E0E0E0',
                background: '#FFFFFF',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {viewMode === 'list' ? '⊞ רשת' : '☰ רשימה'}
            </button>
          </div>
        </div>

        {/* Orders List/Grid */}
        {filteredOrders.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
            <div style={{ fontSize: '18px', color: '#666', marginBottom: '8px' }}>
              לא נמצאו הזמנות
            </div>
            <div style={{ fontSize: '14px', color: '#999' }}>
              נסה לשנות את הסינון או להוסיף הזמנה חדשה
            </div>
          </div>
        ) : (
          <div style={viewMode === 'grid' ? {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '16px'
          } : {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {filteredOrders.map((order) => (
              <EnhancedOrderCard
                key={order.id}
                order={order}
                selected={selectedOrders.has(order.id)}
                onSelect={() => toggleOrderSelection(order.id)}
                onClick={() => onViewOrder?.(order)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.15)',
      borderRadius: '16px',
      padding: '16px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', opacity: 0.9, color: '#FFFFFF' }}>
        {label}
      </div>
    </div>
  );
}

function EnhancedOrderCard({ order, selected, onSelect, onClick }: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}) {
  const statusConfig = ORDER_STATUS_COLORS[order.status];
  const priorityConfig = order.priority ? PRIORITY_COLORS[order.priority] : null;

  return (
    <div
      style={{
        ...ORDER_CARD_STYLES.base,
        ...(selected ? ORDER_CARD_STYLES.selected : {}),
        ...(order.priority === 'urgent' ? ORDER_CARD_STYLES.urgent : {}),
        background: '#FFFFFF',
        display: 'flex',
        gap: '12px'
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          onClick();
        }
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '20px',
          height: '20px',
          cursor: 'pointer',
          flexShrink: 0,
          marginTop: '4px'
        }}
      />

      {/* Order Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#212121' }}>
                {order.customer_name}
              </h3>

              {priorityConfig && (
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '8px',
                  background: priorityConfig.bg,
                  color: priorityConfig.text,
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {priorityConfig.icon} {order.priority}
                </div>
              )}
            </div>

            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
              📞 {order.customer_phone}
            </div>

            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
              📍 {order.customer_address}
            </div>

            <div style={{ fontSize: '13px', color: '#999' }}>
              🕒 {new Date(order.created_at).toLocaleString('he-IL')}
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{
              padding: '6px 12px',
              borderRadius: '10px',
              background: statusConfig.bg,
              border: `2px solid ${statusConfig.border}`,
              color: statusConfig.text,
              fontSize: '12px',
              fontWeight: '700',
              marginBottom: '8px',
              whiteSpace: 'nowrap'
            }}>
              {statusConfig.icon} {order.status}
            </div>

            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1D9BF0'
            }}>
              ₪{order.total_amount.toLocaleString()}
            </div>
          </div>
        </div>

        {order.assigned_driver && (
          <div style={{
            padding: '8px 12px',
            background: '#E3F2FD',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#1565C0',
            fontWeight: '600'
          }}>
            🚗 נהג: {order.assigned_driver}
          </div>
        )}
      </div>
    </div>
  );
}
