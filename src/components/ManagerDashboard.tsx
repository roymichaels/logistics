import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { useRoleTheme } from '../hooks/useRoleTheme';
import { formatCurrency, hebrew } from '../lib/i18n';
import { Toast } from './Toast';
import { telegram } from '../lib/telegram';

interface ManagerDashboardProps {
  dataStore: DataStore;
  user: User | null;
  onNavigate: (page: string) => void;
}

interface TeamMember {
  telegram_id: string;
  name: string;
  username?: string;
  role: string;
  lastActive?: string;
  ordersToday: number;
  revenueToday: number;
  status: 'online' | 'offline' | 'busy';
}

interface DepartmentMetrics {
  totalMembers: number;
  activeMembers: number;
  todayOrders: number;
  todayRevenue: number;
  weekRevenue: number;
  pendingTasks: number;
  completedToday: number;
  averageOrderValue: number;
}

interface PendingApproval {
  id: string;
  type: 'restock' | 'user' | 'order';
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  priority: 'high' | 'medium' | 'low';
}

export function ManagerDashboard({ dataStore, user, onNavigate }: ManagerDashboardProps) {
  const { colors, styles } = useRoleTheme();
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'team' | 'approvals' | 'resources' | 'reports'>('overview');

  const supabase = (dataStore as any)?.supabase;
  const isSupabaseReady = !!supabase && typeof supabase.channel === 'function';
  const [metrics, setMetrics] = useState<DepartmentMetrics>({
    totalMembers: 0,
    activeMembers: 0,
    todayOrders: 0,
    todayRevenue: 0,
    weekRevenue: 0,
    pendingTasks: 0,
    completedToday: 0,
    averageOrderValue: 0
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);

  useEffect(() => {
    if (!isSupabaseReady) {
      return;
    }

    loadDepartmentData();

    let ordersChannel: any = null;
    let restockChannel: any = null;

    try {
      ordersChannel = supabase
        .channel('manager-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          () => {
            logger.info('Order update detected');
            loadDepartmentData();
          }
        )
        .subscribe();

      restockChannel = supabase
        .channel('manager-restock')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'restock_requests'
          },
          () => {
            logger.info('Restock request update detected');
            loadDepartmentData();
          }
        )
        .subscribe();
    } catch (error) {
      logger.error('Failed to set up realtime subscriptions:', error);
    }

    const interval = setInterval(() => {
      loadDepartmentData();
    }, 60000);

    return () => {
      try {
        if (ordersChannel) {
          ordersChannel.unsubscribe();
        }
        if (restockChannel) {
          restockChannel.unsubscribe();
        }
      } catch (error) {
        logger.error('Failed to unsubscribe channels:', error);
      }
      clearInterval(interval);
    };
  }, [isSupabaseReady]);

  const loadDepartmentData = async () => {
    if (!isSupabaseReady || !dataStore) {
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      let orders: any[] = [];
      if (dataStore.listOrders) {
        orders = await dataStore.listOrders();
      }

      let teamUsers: any[] = [];
      if (supabase && user?.business_id) {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .eq('business_id', user.business_id)
          .neq('role', 'infrastructure_owner')
          .neq('role', 'business_owner');
        teamUsers = usersData || [];
      }

      let driverStatus: any[] = [];
      if (supabase) {
        const { data: statusData } = await supabase
          .from('driver_status')
          .select('*');
        driverStatus = statusData || [];
      }

      let salesLogs: any[] = [];
      if (supabase) {
        const { data: salesData } = await supabase
          .from('sales_logs')
          .select('*')
          .gte('sold_at', startOfToday.toISOString());
        salesLogs = salesData || [];
      }

      let restockRequests: any[] = [];
      if (supabase) {
        const { data: restockData } = await supabase
          .from('restock_requests')
          .select('*')
          .eq('status', 'pending');
        restockRequests = restockData || [];
      }

      const todayOrders = orders.filter(o =>
        new Date(o.created_at) >= startOfToday
      );

      const weekOrders = orders.filter(o =>
        new Date(o.created_at) >= startOfWeek
      );

      const todayRevenue = todayOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const weekRevenue = weekOrders
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      const completedToday = todayOrders.filter(o => o.status === 'delivered').length;

      const activeMembers = teamUsers.filter(u => {
        const driverStat = driverStatus.find(ds => ds.driver_telegram_id === u.telegram_id);
        return driverStat?.status === 'online';
      }).length;

      const averageOrderValue = completedToday > 0 ? todayRevenue / completedToday : 0;

      setMetrics({
        totalMembers: teamUsers.length,
        activeMembers,
        todayOrders: todayOrders.length,
        todayRevenue,
        weekRevenue,
        pendingTasks: restockRequests.length,
        completedToday,
        averageOrderValue
      });

      const members: TeamMember[] = teamUsers.map(u => {
        const userOrders = todayOrders.filter(o => o.created_by === u.telegram_id);
        const userSales = salesLogs.filter(s => s.salesperson_telegram_id === u.telegram_id);
        const userRevenue = userSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const driverStat = driverStatus.find(ds => ds.driver_telegram_id === u.telegram_id);

        let status: 'online' | 'offline' | 'busy' = 'offline';
        if (driverStat) {
          if (driverStat.status === 'online') status = 'online';
          else if (driverStat.status === 'busy') status = 'busy';
        }

        return {
          telegram_id: u.telegram_id,
          name: u.name || u.username || u.telegram_id,
          username: u.username,
          role: u.role,
          lastActive: u.last_active,
          ordersToday: userOrders.length,
          revenueToday: userRevenue,
          status
        };
      });

      setTeamMembers(members);

      const approvals: PendingApproval[] = restockRequests.map(req => ({
        id: req.id,
        type: 'restock' as const,
        title: `בקשת חידוש - ${req.product?.name || 'מוצר'}`,
        description: `${req.quantity} יחידות`,
        requestedBy: req.requested_by || 'לא ידוע',
        requestedAt: req.requested_at,
        priority: req.quantity > 50 ? 'high' : req.quantity > 20 ? 'medium' : 'low'
      }));

      setPendingApprovals(approvals);
    } catch (error) {
      logger.error('Failed to load department data:', error);
      Toast.error('שגיאה בטעינת נתוני המחלקה');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (approvalId: string, type: string) => {
    if (!supabase) {
      Toast.error('מערכת אינה זמינה');
      return;
    }

    try {
      if (type === 'restock') {
        const { error } = await supabase
          .from('restock_requests')
          .update({
            status: 'approved',
            approved_by: user?.telegram_id,
            approved_at: new Date().toISOString()
          })
          .eq('id', approvalId);

        if (error) throw error;

        telegram.hapticFeedback('notification', 'success');
        Toast.success('הבקשה אושרה בהצלחה');
        loadDepartmentData();
      }
    } catch (error) {
      logger.error('Failed to approve request:', error);
      Toast.error('שגיאה באישור הבקשה');
    }
  };

  const handleRejectRequest = async (approvalId: string, type: string) => {
    if (!supabase) {
      Toast.error('מערכת אינה זמינה');
      return;
    }

    try {
      if (type === 'restock') {
        const { error } = await supabase
          .from('restock_requests')
          .update({
            status: 'rejected',
            approved_by: user?.telegram_id,
            approved_at: new Date().toISOString(),
            notes: 'נדחה על ידי המנהל'
          })
          .eq('id', approvalId);

        if (error) throw error;

        Toast.success('הבקשה נדחתה');
        loadDepartmentData();
      }
    } catch (error) {
      logger.error('Failed to reject request:', error);
      Toast.error('שגיאה בדחיית הבקשה');
    }
  };

  if (loading || !isSupabaseReady) {
    return (
      <div style={{ ...styles.pageContainer, textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌱</div>
        <div style={{ color: colors.muted }}>{hebrew.loading}</div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      {/* Header with Growth Theme */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: colors.gradientPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: colors.glowPrimaryStrong
            }}>
              🌱
            </div>
            <div>
              <h1 style={{ ...styles.pageTitle, textAlign: 'right', marginBottom: '4px' }}>
                לוח בקרת מנהל
              </h1>
              <p style={styles.pageSubtitle}>ניהול צוות ואישורים</p>
            </div>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: `${colors.success}20`,
            borderRadius: '20px',
            border: `1px solid ${colors.success}50`
          }}>
            <span style={{ fontSize: '12px', color: colors.success, fontWeight: '600' }}>👑 מנהל</span>
          </div>
        </div>
        <button
          onClick={() => {
            loadDepartmentData();
            telegram.hapticFeedback('soft');
          }}
          style={{
            padding: '10px 16px',
            background: 'transparent',
            border: `2px solid ${colors.accent}`,
            borderRadius: '12px',
            color: colors.accent,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '18px' }}>🔄</span>
          רענן
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        padding: '4px'
      }}>
        {[
          { id: 'overview', label: 'סקירה', icon: '📊' },
          { id: 'team', label: 'צוות', icon: '👥' },
          { id: 'approvals', label: 'אישורים', icon: '✅' },
          { id: 'resources', label: 'משאבים', icon: '📦' },
          { id: 'reports', label: 'דוחות', icon: '📈' }
        ].map(view => (
          <button
            key={view.id}
            onClick={() => {
              setSelectedView(view.id as any);
              telegram.hapticFeedback('selection');
            }}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: selectedView === view.id
                ? colors.gradientPrimary
                : colors.card,
              color: selectedView === view.id ? colors.textBright : colors.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: selectedView === view.id ? colors.glowPrimary : 'none'
            }}
          >
            <span>{view.icon}</span>
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {selectedView === 'overview' && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <MetricCard
              label="חברי צוות"
              value={metrics.totalMembers}
              subtitle={`${metrics.activeMembers} מחוברים`}
              color={colors.accent}
              icon="👥"
              colors={colors}
            />
            <MetricCard
              label="הזמנות היום"
              value={metrics.todayOrders}
              subtitle={`${metrics.completedToday} הושלמו`}
              color={colors.info}
              icon="📦"
              colors={colors}
            />
            <MetricCard
              label="הכנסות היום"
              value={formatCurrency(metrics.todayRevenue)}
              subtitle="רווח נקי"
              color={colors.gold}
              icon="💰"
              colors={colors}
            />
            <MetricCard
              label="ממתין לאישור"
              value={metrics.pendingTasks}
              subtitle="פעולות דרושות"
              color={colors.warning}
              icon="⏳"
              colors={colors}
            />
          </div>

          <div style={styles.card}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: colors.text, fontWeight: '700' }}>
              📈 ביצועי השבוע
            </h3>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${colors.accent}15, ${colors.secondary})`,
              border: `1px solid ${colors.cardBorder}`
            }}>
              <div>
                <div style={{ fontSize: '14px', color: colors.muted, marginBottom: '8px' }}>
                  הכנסות שבועיות
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: colors.gold, textShadow: colors.glowGold }}>
                  {formatCurrency(metrics.weekRevenue)}
                </div>
                <div style={{ fontSize: '12px', color: colors.success, marginTop: '4px' }}>
                  ▲ גידול משבוע שעבר
                </div>
              </div>
              <div style={{ fontSize: '56px' }}>📈</div>
            </div>
          </div>

          {pendingApprovals.length > 0 && (
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: colors.text, fontWeight: '700' }}>
                  ⏳ ממתינים לאישור
                </h3>
                <div style={{
                  padding: '6px 12px',
                  background: colors.gradientPrimary,
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: colors.textBright,
                  boxShadow: colors.glowPrimary
                }}>
                  {pendingApprovals.length}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingApprovals.slice(0, 3).map(approval => (
                  <div
                    key={approval.id}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: colors.secondary,
                      border: `1px solid ${colors.cardBorder}`,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ fontSize: '14px', color: colors.text, marginBottom: '4px', fontWeight: '600' }}>
                      {approval.title}
                    </div>
                    <div style={{ fontSize: '13px', color: colors.muted }}>
                      {approval.description}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setSelectedView('approvals');
                  telegram.hapticFeedback('selection');
                }}
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  width: '100%',
                  borderRadius: '12px',
                  border: `2px solid ${colors.accent}`,
                  background: 'transparent',
                  color: colors.accent,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                הצג כל האישורים →
              </button>
            </div>
          )}
        </>
      )}

      {selectedView === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {teamMembers.length === 0 ? (
            <div style={styles.card}>
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '72px', marginBottom: '16px', opacity: 0.5 }}>👥</div>
                <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '18px', fontWeight: '600' }}>
                  אין חברי צוות
                </h3>
                <div style={{ fontSize: '14px', color: colors.muted }}>
                  חברי הצוות יופיעו כאן לאחר שיוזמנו למערכת
                </div>
              </div>
            </div>
          ) : (
            teamMembers.map(member => (
              <div key={member.telegram_id} style={{ ...styles.card, background: colors.gradientCard }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '32px' }}>
                        {member.role === 'driver' ? '🚚' :
                         member.role === 'sales' ? '🛒' :
                         member.role === 'warehouse' ? '📦' : '👤'}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', color: colors.text, fontWeight: '700' }}>
                          {member.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '13px', color: colors.muted }}>
                          {member.username ? `@${member.username}` : member.telegram_id}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 14px',
                      borderRadius: '10px',
                      background: member.status === 'online'
                        ? `${colors.success}20`
                        : member.status === 'busy'
                        ? `${colors.warning}20`
                        : `${colors.muted}20`,
                      border: member.status === 'online'
                        ? `1px solid ${colors.success}50`
                        : member.status === 'busy'
                        ? `1px solid ${colors.warning}50`
                        : `1px solid ${colors.muted}50`,
                      color: member.status === 'online'
                        ? colors.success
                        : member.status === 'busy'
                        ? colors.warning
                        : colors.muted,
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '16px'
                    }}>
                      {member.status === 'online' ? '✅ מחובר' :
                       member.status === 'busy' ? '🟡 עסוק' : '⚫ לא מחובר'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ padding: '12px', background: colors.secondary, borderRadius: '12px' }}>
                        <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '4px', fontWeight: '500' }}>
                          הזמנות היום
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: colors.text }}>
                          {member.ordersToday}
                        </div>
                      </div>
                      <div style={{ padding: '12px', background: colors.secondary, borderRadius: '12px' }}>
                        <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '4px', fontWeight: '500' }}>
                          הכנסות היום
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: colors.gold }}>
                          {formatCurrency(member.revenueToday)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedView === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pendingApprovals.length === 0 ? (
            <div style={styles.card}>
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '72px', marginBottom: '16px', opacity: 0.5 }}>✅</div>
                <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '18px', fontWeight: '600' }}>
                  אין בקשות ממתינות
                </h3>
                <div style={{ fontSize: '14px', color: colors.muted }}>
                  כל הבקשות אושרו או נדחו
                </div>
              </div>
            </div>
          ) : (
            pendingApprovals.map(approval => (
              <div key={approval.id} style={{ ...styles.card, background: colors.gradientCard }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: approval.priority === 'high'
                      ? `${colors.error}20`
                      : approval.priority === 'medium'
                      ? `${colors.warning}20`
                      : `${colors.accent}20`,
                    border: `2px solid ${
                      approval.priority === 'high'
                        ? colors.error
                        : approval.priority === 'medium'
                        ? colors.warning
                        : colors.accent
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px'
                  }}>
                    {approval.type === 'restock' ? '📦' : '👤'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '17px', color: colors.text, fontWeight: '700' }}>
                        {approval.title}
                      </h4>
                      {approval.priority === 'high' && (
                        <span style={{
                          padding: '3px 8px',
                          background: `${colors.error}20`,
                          border: `1px solid ${colors.error}50`,
                          borderRadius: '6px',
                          fontSize: '10px',
                          color: colors.error,
                          fontWeight: '700'
                        }}>
                          ⚠️ דחוף
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: colors.muted }}>
                      {approval.description}
                    </p>
                    <div style={{ fontSize: '12px', color: colors.muted }}>
                      👤 מבקש: {approval.requestedBy} • {new Date(approval.requestedAt).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleApproveRequest(approval.id, approval.type)}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: colors.gradientSuccess,
                      color: colors.textBright,
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    ✅ אשר
                  </button>
                  <button
                    onClick={() => handleRejectRequest(approval.id, approval.type)}
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '12px',
                      border: `2px solid ${colors.cardBorder}`,
                      background: 'transparent',
                      color: colors.text,
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    ❌ דחה
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedView === 'resources' && (
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', color: colors.text, fontWeight: '700' }}>
            📦 ניהול משאבים
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ActionButton
              label="ניהול מלאי"
              icon="📦"
              onClick={() => onNavigate('inventory')}
              colors={colors}
            />
            <ActionButton
              label="הקצאת אזורים"
              icon="🗺️"
              onClick={() => onNavigate('zone-management')}
              colors={colors}
            />
            <ActionButton
              label="בקשות חידוש"
              icon="🔄"
              onClick={() => onNavigate('restock-requests')}
              colors={colors}
            />
          </div>
        </div>
      )}

      {selectedView === 'reports' && (
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', color: colors.text, fontWeight: '700' }}>
            📈 דוחות וניתוחים
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ActionButton
              label="דוח ביצועים שבועי"
              icon="📊"
              onClick={() => onNavigate('reports')}
              colors={colors}
            />
            <ActionButton
              label="ניתוח צוות"
              icon="👥"
              onClick={() => onNavigate('stats')}
              colors={colors}
            />
            <ActionButton
              label="דוח הכנסות"
              icon="💰"
              onClick={() => onNavigate('stats')}
              colors={colors}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtitle, color, icon, colors }: {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
  icon: string;
  colors: any;
}) {
  return (
    <div style={{
      background: colors.secondary,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '12px', color: colors.muted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: colors.muted }}>
        {subtitle}
      </div>
    </div>
  );
}

function ActionButton({ label, icon, onClick, colors }: {
  label: string;
  icon: string;
  onClick: () => void;
  colors: any;
}) {
  return (
    <button
      onClick={() => {
        onClick();
        telegram.hapticFeedback('selection');
      }}
      style={{
        padding: '18px 20px',
        borderRadius: '14px',
        border: `2px solid ${colors.cardBorder}`,
        background: colors.secondary,
        color: colors.text,
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        transition: 'all 0.3s ease',
        textAlign: 'right'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${colors.accent}15`;
        e.currentTarget.style.borderColor = colors.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.secondary;
        e.currentTarget.style.borderColor = colors.cardBorder;
      }}
    >
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <span>{label}</span>
      <span style={{ marginRight: 'auto', color: colors.muted }}>→</span>
    </button>
  );
}
