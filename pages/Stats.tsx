import React, { useState, useEffect } from 'react';
import { DataStore, Order, SalesLog } from '../data/types';
import { hebrew, formatCurrency } from '../src/lib/hebrew';
import { ROYAL_COLORS, ROYAL_STYLES } from '../src/styles/royalTheme';
import { Toast } from '../src/components/Toast';

interface StatsProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

interface StatsData {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  completedToday: number;
  completedWeek: number;
  pendingOrders: number;
  averageOrderValue: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  dailyRevenue: Array<{ day: string; revenue: number }>;
}

export function Stats({ dataStore, onNavigate }: StatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    todayOrders: 0,
    weekOrders: 0,
    monthOrders: 0,
    completedToday: 0,
    completedWeek: 0,
    pendingOrders: 0,
    averageOrderValue: 0,
    topProducts: [],
    dailyRevenue: []
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      const startOfMonth = new Date(startOfToday);
      startOfMonth.setDate(startOfMonth.getDate() - 30);

      // Load orders
      let orders: Order[] = [];
      if (dataStore.listOrders) {
        orders = await dataStore.listOrders();
      }

      // Load sales logs
      let salesLogs: SalesLog[] = [];
      if (dataStore.listSalesLogs) {
        salesLogs = await dataStore.listSalesLogs({ limit: 1000 });
      }

      // Calculate today stats
      const todayOrders = orders.filter(o =>
        new Date(o.created_at) >= startOfToday && o.status !== 'cancelled'
      );
      const weekOrders = orders.filter(o =>
        new Date(o.created_at) >= startOfWeek && o.status !== 'cancelled'
      );
      const monthOrders = orders.filter(o =>
        new Date(o.created_at) >= startOfMonth && o.status !== 'cancelled'
      );

      const completedToday = todayOrders.filter(o => o.status === 'delivered').length;
      const completedWeek = weekOrders.filter(o => o.status === 'delivered').length;
      const pendingOrders = orders.filter(o =>
        ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)
      ).length;

      // Calculate revenue from delivered orders
      const todayRevenue = todayOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const weekRevenue = weekOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const monthRevenue = monthOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const deliveredOrders = orders.filter(o => o.status === 'delivered');
      const averageOrderValue = deliveredOrders.length > 0
        ? deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) / deliveredOrders.length
        : 0;

      // Calculate daily revenue for chart (last 7 days)
      const dailyRevenue: Array<{ day: string; revenue: number }> = [];
      const daysOfWeek = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayRevenue = orders
          .filter(o => {
            const orderDate = new Date(o.created_at);
            return orderDate >= date && orderDate < nextDate && o.status === 'delivered';
          })
          .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        dailyRevenue.push({
          day: daysOfWeek[date.getDay()],
          revenue: dayRevenue
        });
      }

      // Calculate top products from sales logs
      const productStats = new Map<string, { name: string; quantity: number; revenue: number }>();

      salesLogs.forEach(log => {
        const productId = log.product_id;
        const productName = log.product?.name || 'מוצר לא ידוע';

        if (productStats.has(productId)) {
          const existing = productStats.get(productId)!;
          existing.quantity += log.quantity;
          existing.revenue += log.total_amount;
        } else {
          productStats.set(productId, {
            name: productName,
            quantity: log.quantity,
            revenue: log.total_amount
          });
        }
      });

      const topProducts = Array.from(productStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        todayRevenue,
        weekRevenue,
        monthRevenue,
        todayOrders: todayOrders.length,
        weekOrders: weekOrders.length,
        monthOrders: monthOrders.length,
        completedToday,
        completedWeek,
        pendingOrders,
        averageOrderValue,
        topProducts,
        dailyRevenue
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      Toast.error('שגיאה בטעינת סטטיסטיקות');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
          <p style={{ color: ROYAL_COLORS.muted }}>{hebrew.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      {/* Header */}
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📈</div>
        <h1 style={ROYAL_STYLES.pageTitle}>{hebrew.stats}</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          סטטיסטיקות וביצועים בזמן אמת
        </p>
      </div>

      {/* Revenue Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={ROYAL_STYLES.card}>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>
            הכנסות היום
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: ROYAL_COLORS.gold }}>
            {formatCurrency(stats.todayRevenue)}
          </div>
        </div>
        <div style={ROYAL_STYLES.card}>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>
            הכנסות שבועיות
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: ROYAL_COLORS.teal }}>
            {formatCurrency(stats.weekRevenue)}
          </div>
        </div>
        <div style={ROYAL_STYLES.card}>
          <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted, marginBottom: '8px' }}>
            הכנסות חודשיות
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: ROYAL_COLORS.accent }}>
            {formatCurrency(stats.monthRevenue)}
          </div>
        </div>
      </div>

      {/* Orders Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div style={ROYAL_STYLES.statBox}>
          <div style={ROYAL_STYLES.statValue}>{stats.todayOrders}</div>
          <div style={ROYAL_STYLES.statLabel}>הזמנות היום</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.emerald }}>
            {stats.completedToday}
          </div>
          <div style={ROYAL_STYLES.statLabel}>הושלמו היום</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.crimson }}>
            {stats.pendingOrders}
          </div>
          <div style={ROYAL_STYLES.statLabel}>ממתינות</div>
        </div>
        <div style={ROYAL_STYLES.statBox}>
          <div style={{ ...ROYAL_STYLES.statValue, color: ROYAL_COLORS.gold, fontSize: '20px' }}>
            {formatCurrency(stats.averageOrderValue)}
          </div>
          <div style={ROYAL_STYLES.statLabel}>ממוצע הזמנה</div>
        </div>
      </div>

      {/* Weekly Revenue Chart */}
      {stats.dailyRevenue.length > 0 && (
        <div style={ROYAL_STYLES.card}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: ROYAL_COLORS.text
          }}>
            הכנסות שבועיות
          </h3>
          <SimpleBarChart data={stats.dailyRevenue} />
        </div>
      )}

      {/* Top Products */}
      {stats.topProducts.length > 0 && (
        <div style={ROYAL_STYLES.card}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: ROYAL_COLORS.text
          }}>
            מוצרים מובילים
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.topProducts.map((product, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(24, 10, 45, 0.5)',
                  border: `1px solid ${ROYAL_COLORS.cardBorder}`
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `${[ROYAL_COLORS.gold, ROYAL_COLORS.teal, ROYAL_COLORS.accent, ROYAL_COLORS.emerald, ROYAL_COLORS.crimson][index]}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: [ROYAL_COLORS.gold, ROYAL_COLORS.teal, ROYAL_COLORS.accent, ROYAL_COLORS.emerald, ROYAL_COLORS.crimson][index]
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: ROYAL_COLORS.text,
                    marginBottom: '2px'
                  }}>
                    {product.name}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: ROYAL_COLORS.muted
                  }}>
                    {product.quantity} יח' • {formatCurrency(product.revenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Period Comparison */}
      <div style={ROYAL_STYLES.card}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: ROYAL_COLORS.text
        }}>
          השוואת תקופות
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>היום</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                {stats.todayOrders} הזמנות
              </span>
            </div>
            <div style={{
              height: '8px',
              borderRadius: '4px',
              background: 'rgba(24, 10, 45, 0.5)',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min((stats.todayOrders / Math.max(stats.monthOrders, 1)) * 100, 100)}%`,
                background: ROYAL_COLORS.gold,
                borderRadius: '4px'
              }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>שבוע</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                {stats.weekOrders} הזמנות
              </span>
            </div>
            <div style={{
              height: '8px',
              borderRadius: '4px',
              background: 'rgba(24, 10, 45, 0.5)',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min((stats.weekOrders / Math.max(stats.monthOrders, 1)) * 100, 100)}%`,
                background: ROYAL_COLORS.teal,
                borderRadius: '4px'
              }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: ROYAL_COLORS.muted }}>חודש</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                {stats.monthOrders} הזמנות
              </span>
            </div>
            <div style={{
              height: '8px',
              borderRadius: '4px',
              background: 'rgba(24, 10, 45, 0.5)',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: '100%',
                background: ROYAL_COLORS.accent,
                borderRadius: '4px'
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart({ data }: { data: Array<{ day: string; revenue: number }> }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: '8px',
      height: '180px',
      padding: '12px 0'
    }}>
      {data.map((item, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: ROYAL_COLORS.gold,
            minHeight: '16px'
          }}>
            {item.revenue > 0 ? formatCurrency(item.revenue) : ''}
          </div>
          <div
            style={{
              width: '100%',
              height: `${(item.revenue / maxRevenue) * 120}px`,
              minHeight: item.revenue > 0 ? '8px' : '2px',
              borderRadius: '6px 6px 0 0',
              background: item.revenue > 0
                ? `linear-gradient(to top, ${ROYAL_COLORS.gold}, ${ROYAL_COLORS.gold}aa)`
                : 'rgba(24, 10, 45, 0.5)',
              transition: 'all 0.3s ease'
            }}
          />
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: ROYAL_COLORS.muted
          }}>
            {item.day}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Stats;
