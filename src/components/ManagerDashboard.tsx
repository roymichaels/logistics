import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { ROYAL_COLORS, ROYAL_STYLES } from '../styles/royalTheme';
import { formatCurrency, hebrew } from '../lib/hebrew';
import { Toast } from './Toast';

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
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'team' | 'approvals' | 'resources' | 'reports'>('overview');
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
    loadDepartmentData();
  }, []);

  const loadDepartmentData = async () => {
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
      if (dataStore.supabase && user?.business_id) {
        const { data: usersData } = await dataStore.supabase
          .from('users')
          .select('*')
          .eq('business_id', user.business_id)
          .neq('role', 'infrastructure_owner')
          .neq('role', 'business_owner');
        teamUsers = usersData || [];
      }

      let driverStatus: any[] = [];
      if (dataStore.supabase) {
        const { data: statusData } = await dataStore.supabase
          .from('driver_status')
          .select('*');
        driverStatus = statusData || [];
      }

      let salesLogs: any[] = [];
      if (dataStore.supabase) {
        const { data: salesData } = await dataStore.supabase
          .from('sales_logs')
          .select('*')
          .gte('sold_at', startOfToday.toISOString());
        salesLogs = salesData || [];
      }

      let restockRequests: any[] = [];
      if (dataStore.supabase) {
        const { data: restockData } = await dataStore.supabase
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
      console.error('Failed to load department data:', error);
      Toast.error('שגיאה בטעינת נתוני המחלקה');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (approvalId: string, type: string) => {
    try {
      if (type === 'restock' && dataStore.supabase) {
        const { error } = await dataStore.supabase
          .from('restock_requests')
          .update({
            status: 'approved',
            approved_by: user?.telegram_id,
            approved_at: new Date().toISOString()
          })
          .eq('id', approvalId);

        if (error) throw error;

        Toast.success('הבקשה אושרה בהצלחה');
        loadDepartmentData();
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      Toast.error('שגיאה באישור הבקשה');
    }
  };

  const handleRejectRequest = async (approvalId: string, type: string) => {
    try {
      if (type === 'restock' && dataStore.supabase) {
        const { error } = await dataStore.supabase
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
      console.error('Failed to reject request:', error);
      Toast.error('שגיאה בדחיית הבקשה');
    }
  };

  if (loading) {
    return (
      <div style={ROYAL_STYLES.pageContainer}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <p style={{ color: ROYAL_COLORS.muted }}>{hebrew.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ROYAL_STYLES.pageContainer}>
      <div style={ROYAL_STYLES.pageHeader}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
        <h1 style={ROYAL_STYLES.pageTitle}>לוח בקרת מנהל</h1>
        <p style={ROYAL_STYLES.pageSubtitle}>
          ניהול הצוות והמחלקה שלך
        </p>
      </div>

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
            onClick={() => setSelectedView(view.id as any)}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: 'none',
              background: selectedView === view.id
                ? 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)'
                : ROYAL_COLORS.card,
              color: ROYAL_COLORS.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
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
              color={ROYAL_COLORS.accent}
              icon="👥"
            />
            <MetricCard
              label="הזמנות היום"
              value={metrics.todayOrders}
              subtitle={`${metrics.completedToday} הושלמו`}
              color={ROYAL_COLORS.teal}
              icon="📦"
            />
            <MetricCard
              label="הכנסות היום"
              value={formatCurrency(metrics.todayRevenue)}
              subtitle="רווח נקי"
              color={ROYAL_COLORS.gold}
              icon="💰"
            />
            <MetricCard
              label="ממתין לאישור"
              value={metrics.pendingTasks}
              subtitle="פעולות דרושות"
              color={ROYAL_COLORS.crimson}
              icon="⏳"
            />
          </div>

          <div style={ROYAL_STYLES.card}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
              ביצועי השבוע
            </h3>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(77, 208, 225, 0.1)',
              border: `1px solid rgba(77, 208, 225, 0.3)`
            }}>
              <div>
                <div style={{ fontSize: '14px', color: ROYAL_COLORS.muted, marginBottom: '4px' }}>
                  הכנסות שבועיות
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: ROYAL_COLORS.teal }}>
                  {formatCurrency(metrics.weekRevenue)}
                </div>
              </div>
              <div style={{ fontSize: '48px' }}>📈</div>
            </div>
          </div>

          {pendingApprovals.length > 0 && (
            <div style={ROYAL_STYLES.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: ROYAL_COLORS.text }}>
                  ממתינים לאישור ({pendingApprovals.length})
                </h3>
                <button
                  onClick={() => setSelectedView('approvals')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(156, 109, 255, 0.2)',
                    color: ROYAL_COLORS.accent,
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  הצג הכל
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingApprovals.slice(0, 3).map(approval => (
                  <div
                    key={approval.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${ROYAL_COLORS.cardBorder}`
                    }}
                  >
                    <div style={{ fontSize: '14px', color: ROYAL_COLORS.text, marginBottom: '4px' }}>
                      {approval.title}
                    </div>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      {approval.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedView === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {teamMembers.length === 0 ? (
            <div style={ROYAL_STYLES.card}>
              <div style={ROYAL_STYLES.emptyState}>
                <div style={ROYAL_STYLES.emptyStateIcon}>👥</div>
                <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text }}>
                  אין חברי צוות
                </h3>
                <div style={ROYAL_STYLES.emptyStateText}>
                  חברי הצוות יופיעו כאן לאחר שיוזמנו למערכת
                </div>
              </div>
            </div>
          ) : (
            teamMembers.map(member => (
              <div key={member.telegram_id} style={ROYAL_STYLES.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '32px' }}>
                        {member.role === 'driver' ? '🚚' :
                         member.role === 'sales' ? '🛒' :
                         member.role === 'warehouse' ? '📦' : '👤'}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: ROYAL_COLORS.text }}>
                          {member.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: ROYAL_COLORS.muted }}>
                          {member.username ? `@${member.username}` : member.telegram_id}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      background: member.status === 'online'
                        ? 'rgba(74, 222, 128, 0.2)'
                        : member.status === 'busy'
                        ? 'rgba(251, 191, 36, 0.2)'
                        : 'rgba(156, 163, 175, 0.2)',
                      color: member.status === 'online'
                        ? ROYAL_COLORS.emerald
                        : member.status === 'busy'
                        ? '#fbbf24'
                        : ROYAL_COLORS.muted,
                      fontSize: '11px',
                      fontWeight: '600',
                      marginBottom: '12px'
                    }}>
                      {member.status === 'online' ? 'מחובר' :
                       member.status === 'busy' ? 'עסוק' : 'לא מחובר'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>
                          הזמנות היום
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: ROYAL_COLORS.text }}>
                          {member.ordersToday}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>
                          הכנסות היום
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '600', color: ROYAL_COLORS.gold }}>
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
            <div style={ROYAL_STYLES.card}>
              <div style={ROYAL_STYLES.emptyState}>
                <div style={ROYAL_STYLES.emptyStateIcon}>✅</div>
                <h3 style={{ margin: '0 0 12px 0', color: ROYAL_COLORS.text }}>
                  אין בקשות ממתינות
                </h3>
                <div style={ROYAL_STYLES.emptyStateText}>
                  כל הבקשות אושרו או נדחו
                </div>
              </div>
            </div>
          ) : (
            pendingApprovals.map(approval => (
              <div key={approval.id} style={ROYAL_STYLES.card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: approval.priority === 'high'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : approval.priority === 'medium'
                      ? 'rgba(251, 191, 36, 0.2)'
                      : 'rgba(156, 109, 255, 0.2)',
                    border: `1px solid ${
                      approval.priority === 'high'
                        ? 'rgba(239, 68, 68, 0.4)'
                        : approval.priority === 'medium'
                        ? 'rgba(251, 191, 36, 0.4)'
                        : 'rgba(156, 109, 255, 0.4)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {approval.type === 'restock' ? '📦' : '👤'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: ROYAL_COLORS.text }}>
                      {approval.title}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: ROYAL_COLORS.muted }}>
                      {approval.description}
                    </p>
                    <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
                      מבקש: {approval.requestedBy} • {new Date(approval.requestedAt).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleApproveRequest(approval.id, approval.type)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ אשר
                  </button>
                  <button
                    onClick={() => handleRejectRequest(approval.id, approval.type)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${ROYAL_COLORS.cardBorder}`,
                      background: ROYAL_COLORS.card,
                      color: ROYAL_COLORS.text,
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
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
        <div style={ROYAL_STYLES.card}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
            ניהול משאבים
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ActionButton
              label="ניהול מלאי"
              icon="📦"
              onClick={() => onNavigate('inventory')}
            />
            <ActionButton
              label="הקצאת אזורים"
              icon="🗺️"
              onClick={() => onNavigate('zone-management')}
            />
            <ActionButton
              label="בקשות חידוש"
              icon="🔄"
              onClick={() => onNavigate('restock-requests')}
            />
          </div>
        </div>
      )}

      {selectedView === 'reports' && (
        <div style={ROYAL_STYLES.card}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: ROYAL_COLORS.text }}>
            דוחות וניתוחים
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ActionButton
              label="דוח ביצועים שבועי"
              icon="📊"
              onClick={() => onNavigate('reports')}
            />
            <ActionButton
              label="ניתוח צוות"
              icon="👥"
              onClick={() => onNavigate('stats')}
            />
            <ActionButton
              label="דוח הכנסות"
              icon="💰"
              onClick={() => onNavigate('stats')}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtitle, color, icon }: {
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
  icon: string;
}) {
  return (
    <div style={{
      ...ROYAL_STYLES.card,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ fontSize: '24px' }}>{icon}</div>
      <div style={{ fontSize: '12px', color: ROYAL_COLORS.muted }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '700', color }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: ROYAL_COLORS.muted }}>
        {subtitle}
      </div>
    </div>
  );
}

function ActionButton({ label, icon, onClick }: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '12px',
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        background: ROYAL_COLORS.card,
        color: ROYAL_COLORS.text,
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.2s ease',
        textAlign: 'right'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(156, 109, 255, 0.1)';
        e.currentTarget.style.borderColor = ROYAL_COLORS.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = ROYAL_COLORS.card;
        e.currentTarget.style.borderColor = ROYAL_COLORS.cardBorder;
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
