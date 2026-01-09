import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { useSafeAppServices } from '../../context/AppServicesContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { NoActiveBusiness } from '../../components/NoActiveBusiness';
import { StatCard } from '../../components/molecules/StatCard';
import { Card } from '../../components/molecules/Card';
import { Button } from '../../components/atoms/Button';
import { tokens } from '../../styles/tokens';

type OperationsTab = 'orders' | 'inventory' | 'products' | 'dispatch';

interface TabConfig {
  id: OperationsTab;
  label: string;
  icon: string;
}

const tabs: TabConfig[] = [
  { id: 'orders', label: 'הזמנות', icon: '📦' },
  { id: 'inventory', label: 'מלאי', icon: '📊' },
  { id: 'products', label: 'מוצרים', icon: '🏷️' },
  { id: 'dispatch', label: 'שיבוץ', icon: '🚚' },
];

export function OperationsHub() {
  const navigate = useNavigate();
  const appServices = useSafeAppServices();
  const currentBusinessId = appServices?.currentBusinessId;

  const [activeTab, setActiveTab] = useState<OperationsTab>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    lowStock: 0,
    activeDrivers: 0
  });

  useEffect(() => {
    if (!currentBusinessId) return;
    loadData();
    loadStats();

    const subscription = supabase
      .channel(`operations-${currentBusinessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${currentBusinessId}` }, () => {
        logger.info('[OperationsHub] Order changed, reloading...');
        if (activeTab === 'orders') loadData();
        loadStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `business_id=eq.${currentBusinessId}` }, () => {
        logger.info('[OperationsHub] Inventory changed, reloading...');
        if (activeTab === 'inventory') loadData();
        loadStats();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentBusinessId, activeTab, filterStatus]);

  if (!currentBusinessId) {
    return (
      <PageContainer>
        <NoActiveBusiness
          onNavigateToBusinesses={() => navigate('/business/businesses')}
          message="מרכז הפעולות דורש עסק פעיל. אנא בחר עסק או צור עסק חדש."
        />
      </PageContainer>
    );
  }

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        await loadOrders();
      } else if (activeTab === 'inventory') {
        await loadInventory();
      } else if (activeTab === 'products') {
        await loadProducts();
      } else if (activeTab === 'dispatch') {
        await loadDrivers();
      }
    } catch (err) {
      logger.error('[OperationsHub] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('business_id', currentBusinessId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query;
    setOrders(data || []);
  };

  const loadInventory = async () => {
    let query = supabase
      .from('inventory')
      .select('*, products(name, sku)')
      .eq('business_id', currentBusinessId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (filterStatus === 'low') {
      query = query.lte('quantity', 10);
    } else if (filterStatus === 'out') {
      query = query.eq('quantity', 0);
    }

    const { data } = await query;
    setInventory(data || []);
  };

  const loadProducts = async () => {
    let query = supabase
      .from('products')
      .select('*')
      .eq('business_id', currentBusinessId)
      .order('name', { ascending: true })
      .limit(50);

    if (filterStatus === 'active') {
      query = query.eq('active', true);
    } else if (filterStatus === 'inactive') {
      query = query.eq('active', false);
    }

    const { data } = await query;
    setProducts(data || []);
  };

  const loadDrivers = async () => {
    const { data } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('business_id', currentBusinessId)
      .eq('active', true)
      .limit(50);

    setDrivers(data || []);
  };

  const loadStats = async () => {
    try {
      if (!currentBusinessId) return;

      const [ordersRes, inventoryRes, driversRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status', { count: 'exact' })
          .eq('business_id', currentBusinessId),
        supabase
          .from('inventory')
          .select('id, quantity', { count: 'exact' })
          .eq('business_id', currentBusinessId)
          .lte('quantity', 10),
        supabase
          .from('driver_profiles')
          .select('id', { count: 'exact' })
          .eq('business_id', currentBusinessId)
          .eq('active', true)
      ]);

      const totalOrders = ordersRes.count || 0;
      const pendingOrders = ordersRes.data?.filter(o => o.status === 'pending' || o.status === 'confirmed').length || 0;
      const lowStock = inventoryRes.count || 0;
      const activeDrivers = driversRes.count || 0;

      setStats({
        totalOrders,
        pendingOrders,
        lowStock,
        activeDrivers
      });
    } catch (error) {
      logger.error('[OperationsHub] Failed to load stats:', error);
    }
  };

  const filteredData = () => {
    if (!searchQuery) {
      if (activeTab === 'orders') return orders;
      if (activeTab === 'inventory') return inventory;
      if (activeTab === 'products') return products;
      if (activeTab === 'dispatch') return drivers;
      return [];
    }

    const query = searchQuery.toLowerCase();

    if (activeTab === 'orders') {
      return orders.filter(o =>
        o.id?.toLowerCase().includes(query) ||
        o.customer_name?.toLowerCase().includes(query)
      );
    } else if (activeTab === 'inventory') {
      return inventory.filter(i =>
        i.products?.name?.toLowerCase().includes(query) ||
        i.products?.sku?.toLowerCase().includes(query)
      );
    } else if (activeTab === 'products') {
      return products.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      );
    } else if (activeTab === 'dispatch') {
      return drivers.filter(d =>
        d.name?.toLowerCase().includes(query)
      );
    }

    return [];
  };

  const getStatusOptions = () => {
    if (activeTab === 'orders') {
      return [
        { value: 'all', label: 'הכל' },
        { value: 'pending', label: 'ממתין' },
        { value: 'confirmed', label: 'מאושר' },
        { value: 'in_progress', label: 'בתהליך' },
        { value: 'completed', label: 'הושלם' },
        { value: 'cancelled', label: 'בוטל' },
      ];
    } else if (activeTab === 'inventory') {
      return [
        { value: 'all', label: 'הכל' },
        { value: 'low', label: 'מלאי נמוך' },
        { value: 'out', label: 'אזל מהמלאי' },
      ];
    } else if (activeTab === 'products') {
      return [
        { value: 'all', label: 'הכל' },
        { value: 'active', label: 'פעיל' },
        { value: 'inactive', label: 'לא פעיל' },
      ];
    }
    return [{ value: 'all', label: 'הכל' }];
  };

  const exportData = () => {
    const data = filteredData();
    if (data.length === 0) {
      logger.warn('[OperationsHub] No data to export');
      return;
    }

    const csvContent = generateCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `operations-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logger.info('[OperationsHub] Data exported successfully');
  };

  const generateCSV = (data: any[]): string => {
    if (activeTab === 'orders') {
      const headers = ['ID', 'Customer', 'Status', 'Amount', 'Date'];
      const rows = data.map(o => [
        o.id?.substring(0, 8) || '',
        o.customer_name || 'Unknown',
        o.status || '',
        o.total_amount?.toFixed(2) || '0.00',
        new Date(o.created_at).toLocaleDateString('he-IL')
      ]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else if (activeTab === 'inventory') {
      const headers = ['Product', 'SKU', 'Quantity'];
      const rows = data.map(i => [
        i.products?.name || 'Unknown',
        i.products?.sku || 'N/A',
        i.quantity || 0
      ]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else if (activeTab === 'products') {
      const headers = ['Name', 'SKU', 'Price', 'Active'];
      const rows = data.map(p => [
        p.name || '',
        p.sku || 'N/A',
        p.price?.toFixed(2) || '0.00',
        p.active ? 'Yes' : 'No'
      ]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else if (activeTab === 'dispatch') {
      const headers = ['Name', 'Phone', 'Active'];
      const rows = data.map(d => [
        d.name || 'Driver',
        d.phone || 'N/A',
        d.active ? 'Yes' : 'No'
      ]);
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    return '';
  };

  const data = filteredData();

  return (
    <PageContainer>
      <PageHeader
        title="מרכז פעולות"
        subtitle="ניהול מאוחד של הזמנות, מלאי, מוצרים ושיבוץ"
        actions={
          <Button onClick={exportData} variant="secondary">
            ייצא נתונים
          </Button>
        }
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: tokens.spacing.md,
        marginBottom: tokens.spacing.lg
      }}>
        <StatCard
          icon="📦"
          label="סה״כ הזמנות"
          value={stats.totalOrders}
        />
        <StatCard
          icon="⏳"
          label="הזמנות ממתינות"
          value={stats.pendingOrders}
          color={stats.pendingOrders > 0 ? tokens.colors.warning : tokens.colors.text}
        />
        <StatCard
          icon="⚠️"
          label="מלאי נמוך"
          value={stats.lowStock}
          color={stats.lowStock > 0 ? tokens.colors.error : tokens.colors.text}
        />
        <StatCard
          icon="🚗"
          label="נהגים פעילים"
          value={stats.activeDrivers}
          color={tokens.colors.success}
        />
      </div>

      <div style={{
        backgroundColor: tokens.colors.surface,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          borderBottom: `2px solid ${tokens.colors.border}`,
          overflowX: 'auto'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
                setFilterStatus('all');
              }}
              style={{
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: activeTab === tab.id ? tokens.colors.background : 'transparent',
                color: activeTab === tab.id ? tokens.colors.primary : tokens.colors.text,
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${tokens.colors.primary}` : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div style={{
          padding: tokens.spacing.lg,
          backgroundColor: tokens.colors.background
        }}>
          <Card style={{ marginBottom: tokens.spacing.lg }}>
            <div style={{
              display: 'flex',
              gap: tokens.spacing.sm,
              flexWrap: 'wrap'
            }}>
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: `1px solid ${tokens.colors.border}`,
                  backgroundColor: tokens.colors.surface,
                  color: tokens.colors.text
                }}
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '8px',
                  border: `1px solid ${tokens.colors.border}`,
                  backgroundColor: tokens.colors.surface,
                  color: tokens.colors.text,
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
              >
                {getStatusOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <Button onClick={loadData} variant="secondary">
                <span>🔄</span> רענן
              </Button>
            </div>
          </Card>

          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: tokens.colors.textSecondary
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <div>טוען נתונים...</div>
            </div>
          ) : data.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: tokens.colors.textSecondary
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <div>לא נמצאו פריטים</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '12px'
            }}>
              {activeTab === 'orders' && data.map((order: any) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {activeTab === 'inventory' && data.map((item: any) => (
                <InventoryCard key={item.id} item={item} />
              ))}
              {activeTab === 'products' && data.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
              {activeTab === 'dispatch' && data.map((driver: any) => (
                <DriverCard key={driver.id} driver={driver} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function OrderCard({ order }: { order: any }) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      in_progress: '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || tokens.colors.textSecondary;
  };

  return (
    <div style={{
      backgroundColor: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: '8px',
      padding: '16px',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: '16px',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '32px'
      }}>
        📦
      </div>

      <div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: tokens.colors.text,
          marginBottom: '4px'
        }}>
          הזמנה #{order.id?.substring(0, 8)}
        </div>
        <div style={{
          fontSize: '14px',
          color: tokens.colors.textSecondary
        }}>
          {order.customer_name || 'לקוח לא ידוע'}
        </div>
        <div style={{
          fontSize: '12px',
          color: tokens.colors.textSecondary,
          marginTop: '4px'
        }}>
          {new Date(order.created_at).toLocaleDateString('he-IL')}
        </div>
      </div>

      <div style={{
        textAlign: 'left'
      }}>
        <div style={{
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: getStatusColor(order.status),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: '600',
          marginBottom: '8px',
          display: 'inline-block'
        }}>
          {order.status}
        </div>
        <div style={{
          fontSize: '18px',
          fontWeight: '700',
          color: tokens.colors.text
        }}>
          ₪{order.total_amount?.toFixed(2) || '0.00'}
        </div>
      </div>
    </div>
  );
}

function InventoryCard({ item }: { item: any }) {
  const isLow = item.quantity <= 10;
  const isOut = item.quantity === 0;

  return (
    <div style={{
      backgroundColor: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: '8px',
      padding: '16px',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: '16px',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '32px'
      }}>
        {isOut ? '❌' : isLow ? '⚠️' : '📊'}
      </div>

      <div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: tokens.colors.text,
          marginBottom: '4px'
        }}>
          {item.products?.name || 'מוצר לא ידוע'}
        </div>
        <div style={{
          fontSize: '14px',
          color: tokens.colors.textSecondary
        }}>
          SKU: {item.products?.sku || 'N/A'}
        </div>
      </div>

      <div style={{
        textAlign: 'left'
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: isOut ? '#ef4444' : isLow ? '#f59e0b' : tokens.colors.text
        }}>
          {item.quantity}
        </div>
        <div style={{
          fontSize: '12px',
          color: tokens.colors.textSecondary
        }}>
          יחידות
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  return (
    <div style={{
      backgroundColor: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: '8px',
      padding: '16px',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: '16px',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '32px'
      }}>
        🏷️
      </div>

      <div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: tokens.colors.text,
          marginBottom: '4px'
        }}>
          {product.name}
        </div>
        <div style={{
          fontSize: '14px',
          color: tokens.colors.textSecondary
        }}>
          SKU: {product.sku || 'N/A'}
        </div>
        <div style={{
          fontSize: '12px',
          color: product.active ? '#10b981' : '#ef4444',
          marginTop: '4px',
          fontWeight: '500'
        }}>
          {product.active ? 'פעיל' : 'לא פעיל'}
        </div>
      </div>

      <div style={{
        textAlign: 'left'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '700',
          color: tokens.colors.text
        }}>
          ₪{product.price?.toFixed(2) || '0.00'}
        </div>
      </div>
    </div>
  );
}

function DriverCard({ driver }: { driver: any }) {
  return (
    <div style={{
      backgroundColor: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: '8px',
      padding: '16px',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: '16px',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '32px'
      }}>
        🚗
      </div>

      <div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: tokens.colors.text,
          marginBottom: '4px'
        }}>
          {driver.name || 'נהג'}
        </div>
        <div style={{
          fontSize: '14px',
          color: tokens.colors.textSecondary
        }}>
          {driver.phone || 'אין מספר טלפון'}
        </div>
      </div>

      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: driver.active ? '#10b981' : '#ef4444'
      }} />
    </div>
  );
}
