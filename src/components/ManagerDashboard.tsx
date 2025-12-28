/**
 * Manager Dashboard - Frontend-Only
 * Team management dashboard using unified design system
 * NO BACKEND - Uses LocalDataStore only
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DataStore, User } from '../data/types';
import { formatCurrency, hebrew } from '../lib/i18n';
import { Toast } from './Toast';

import { logger } from '../lib/logger';
import { DashboardHeader, MetricCard, MetricGrid, Section, LoadingState, EmptyState } from './dashboard';
import { theme, colors, spacing, typography, borderRadius, components, getStatusBadgeStyle } from '../styles/theme';

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
  const loadingRef = useRef(false);

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

  const loadDepartmentData = useCallback(async () => {
    if (loadingRef.current || !dataStore) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);

      logger.debug('[ManagerDashboard] Loading department data');

      // Load orders from LocalDataStore
      const orders = await (dataStore.listOrders?.({}) || Promise.resolve([]));
      const drivers = await (dataStore.listDrivers?.() || Promise.resolve([]));

      // Calculate date ranges
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      // Filter orders
      const todayOrders = orders.filter((o: any) => new Date(o.created_at) >= startOfToday);
      const weekOrders = orders.filter((o: any) => new Date(o.created_at) >= startOfWeek);
      const completedTodayOrders = todayOrders.filter((o: any) => o.status === 'delivered');

      // Calculate metrics
      const todayRevenue = completedTodayOrders.reduce((sum: number, o: any) =>
        sum + Number(o.total_amount || 0), 0);
      const weekRevenue = weekOrders
        .filter((o: any) => o.status === 'delivered')
        .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
      const completedToday = completedTodayOrders.length;
      const averageOrderValue = completedToday > 0 ? todayRevenue / completedToday : 0;
      const activeDrivers = drivers.filter((d: any) => d.is_available || d.status === 'online');

      // Generate mock team members (in real app, would come from dataStore)
      const mockTeamMembers: TeamMember[] = drivers.slice(0, 5).map((d: any, index: number) => ({
        telegram_id: d.id || `driver-${index}`,
        name: d.name || `Driver ${index + 1}`,
        username: d.username,
        role: 'driver',
        lastActive: new Date().toISOString(),
        ordersToday: Math.floor(Math.random() * 10),
        revenueToday: Math.random() * 1000,
        status: d.is_available ? 'online' : 'offline'
      }));

      // Generate mock pending approvals (would come from dataStore in real app)
      const mockApprovals: PendingApproval[] = [];
      if (Math.random() > 0.7) {
        mockApprovals.push({
          id: '1',
          type: 'restock',
          title: 'בקשת חידוש מלאי',
          description: '50 יחידות נדרשות',
          requestedBy: 'מחסנאי',
          requestedAt: new Date().toISOString(),
          priority: 'high'
        });
      }

      setMetrics({
        totalMembers: mockTeamMembers.length,
        activeMembers: activeDrivers.length,
        todayOrders: todayOrders.length,
        todayRevenue,
        weekRevenue,
        pendingTasks: mockApprovals.length,
        completedToday,
        averageOrderValue
      });

      setTeamMembers(mockTeamMembers);
      setPendingApprovals(mockApprovals);

      logger.debug('[ManagerDashboard] Data loaded successfully');
    } catch (error) {
      logger.error('[ManagerDashboard] Failed to load department data:', error);
      Toast.error('שגיאה בטעינת נתוני המחלקה');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [dataStore]);

  useEffect(() => {
    loadDepartmentData();

    // Refresh data every minute
    const interval = setInterval(loadDepartmentData, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [loadDepartmentData]);

  const handleApproveRequest = async (approvalId: string, type: string) => {
    try {
      if (type === 'restock') {
        // In a real implementation, would update via dataStore
        // For now, just remove from pending approvals
        setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
        setMetrics(prev => ({ ...prev, pendingTasks: prev.pendingTasks - 1 }));

        Toast.success('הבקשה אושרה בהצלחה');
        logger.info(`[ManagerDashboard] Approved request: ${approvalId}`);
      }
    } catch (error) {
      logger.error('[ManagerDashboard] Failed to approve request:', error);
      Toast.error('שגיאה באישור הבקשה');
    }
  };

  const handleRejectRequest = async (approvalId: string, type: string) => {
    try {
      if (type === 'restock') {
        // In a real implementation, would update via dataStore
        // For now, just remove from pending approvals
        setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
        setMetrics(prev => ({ ...prev, pendingTasks: prev.pendingTasks - 1 }));

        Toast.success('הבקשה נדחתה');
        logger.info(`[ManagerDashboard] Rejected request: ${approvalId}`);
      }
    } catch (error) {
      logger.error('[ManagerDashboard] Failed to reject request:', error);
      Toast.error('שגיאה בדחיית הבקשה');
    }
  };

  if (loading) {
    return <LoadingState variant="page" />;
  }

  return (
    <div style={theme.components.pageContainer}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Dashboard Header */}
        <DashboardHeader
          title="לוח בקרת מנהל"
          subtitle="ניהול צוות ואישורים"
          role="manager"
          roleLabel="Manager"
          icon="🌱"
          actions={
            <button
              onClick={() => {
                loadDepartmentData();

              }}
              style={{
                ...components.button.secondary,
                fontSize: typography.fontSize.sm,
              }}
            >
              🔄 רענן
            </button>
          }
        />

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: spacing.sm,
          marginBottom: spacing['2xl'],
          overflowX: 'auto',
          padding: spacing.xs,
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

              }}
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                borderRadius: borderRadius.lg,
                border: 'none',
                background: selectedView === view.id ? theme.gradients.primary : colors.ui.card,
                color: selectedView === view.id ? colors.white : colors.text.primary,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.semibold,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                transition: 'all 200ms ease',
                boxShadow: selectedView === view.id ? theme.shadows.glow : 'none',
              }}
            >
              <span>{view.icon}</span>
              <span>{view.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {selectedView === 'overview' && (
          <>
            <MetricGrid columns={4}>
              <MetricCard
                label="חברי צוות"
                value={metrics.totalMembers}
                subtitle={`${metrics.activeMembers} מחוברים`}
                icon="👥"
                variant="primary"
                onClick={() => setSelectedView('team')}
              />
              <MetricCard
                label="הזמנות היום"
                value={metrics.todayOrders}
                subtitle={`${metrics.completedToday} הושלמו`}
                icon="📦"
                variant="default"
                onClick={() => onNavigate('orders')}
              />
              <MetricCard
                label="הכנסות היום"
                value={formatCurrency(metrics.todayRevenue)}
                subtitle="רווח נקי"
                icon="💰"
                variant="success"
                onClick={() => setSelectedView('reports')}
              />
              <MetricCard
                label="ממתין לאישור"
                value={metrics.pendingTasks}
                subtitle="פעולות דרושות"
                icon="⏳"
                variant="warning"
                onClick={() => setSelectedView('approvals')}
              />
            </MetricGrid>

            <Section title="ביצועי השבוע" subtitle="Weekly performance overview">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing.xl,
                borderRadius: borderRadius.lg,
                background: `linear-gradient(135deg, ${colors.brand.primary}15, ${colors.background.secondary})`,
                border: `1px solid ${colors.border.primary}`,
              }}>
                <div>
                  <div style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    marginBottom: spacing.sm,
                  }}>
                    הכנסות שבועיות
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: typography.fontWeight.bold,
                    color: colors.status.success,
                    textShadow: theme.shadows.glow,
                  }}>
                    {formatCurrency(metrics.weekRevenue)}
                  </div>
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.status.success,
                    marginTop: spacing.xs,
                  }}>
                    ▲ גידול משבוע שעבר
                  </div>
                </div>
                <div style={{ fontSize: '56px' }}>📈</div>
              </div>
            </Section>

            {pendingApprovals.length > 0 && (
              <Section title="ממתינים לאישור">
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  {pendingApprovals.slice(0, 3).map(approval => (
                    <div
                      key={approval.id}
                      style={{
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        background: colors.background.tertiary,
                        border: `1px solid ${colors.border.primary}`,
                      }}
                    >
                      <div style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.primary,
                        marginBottom: spacing.xs,
                        fontWeight: typography.fontWeight.semibold,
                      }}>
                        {approval.title}
                      </div>
                      <div style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                      }}>
                        {approval.description}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSelectedView('approvals');

                  }}
                  style={{
                    marginTop: spacing.md,
                    ...components.button.secondary,
                    width: '100%',
                  }}
                >
                  הצג כל האישורים →
                </button>
              </Section>
            )}
          </>
        )}

        {/* Team Tab */}
        {selectedView === 'team' && (
          <Section title="Team Members" subtitle="Member contributions and activity">
            {teamMembers.length === 0 ? (
              <EmptyState
                icon="👥"
                title="אין חברי צוות"
                description="חברי הצוות יופיעו כאן לאחר שיוזמנו למערכת"
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: spacing.lg }}>
                {teamMembers.map(member => (
                  <div
                    key={member.telegram_id}
                    style={{
                      padding: spacing.xl,
                      background: theme.gradients.card,
                      border: `1px solid ${colors.border.primary}`,
                      borderRadius: borderRadius.lg,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                      <div style={{ fontSize: '32px' }}>
                        {member.role === 'driver' ? '🚚' : member.role === 'sales' ? '🛒' : member.role === 'warehouse' ? '📦' : '👤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: `0 0 ${spacing.xs} 0`,
                          fontSize: typography.fontSize.lg,
                          color: colors.text.primary,
                          fontWeight: typography.fontWeight.bold,
                        }}>
                          {member.name}
                        </h4>
                        <p style={{
                          margin: 0,
                          fontSize: typography.fontSize.sm,
                          color: colors.text.secondary,
                        }}>
                          {member.username ? `@${member.username}` : member.telegram_id}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      ...components.badge.base,
                      ...(member.status === 'online' ? components.badge.success : member.status === 'busy' ? components.badge.warning : components.badge.error),
                      marginBottom: spacing.lg,
                    }}>
                      {member.status === 'online' ? '✅ מחובר' : member.status === 'busy' ? '🟡 עסוק' : '⚫ לא מחובר'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                      <div style={{
                        padding: spacing.md,
                        background: colors.background.tertiary,
                        borderRadius: borderRadius.md,
                      }}>
                        <div style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.secondary,
                          marginBottom: spacing.xs,
                        }}>
                          הזמנות היום
                        </div>
                        <div style={{
                          fontSize: typography.fontSize['2xl'],
                          fontWeight: typography.fontWeight.bold,
                          color: colors.text.primary,
                        }}>
                          {member.ordersToday}
                        </div>
                      </div>
                      <div style={{
                        padding: spacing.md,
                        background: colors.background.tertiary,
                        borderRadius: borderRadius.md,
                      }}>
                        <div style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.secondary,
                          marginBottom: spacing.xs,
                        }}>
                          הכנסות היום
                        </div>
                        <div style={{
                          fontSize: typography.fontSize['2xl'],
                          fontWeight: typography.fontWeight.bold,
                          color: colors.status.success,
                        }}>
                          {formatCurrency(member.revenueToday)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Approvals Tab */}
        {selectedView === 'approvals' && (
          <Section title="Pending Approvals" subtitle="Requests awaiting your review">
            {pendingApprovals.length === 0 ? (
              <EmptyState
                icon="✅"
                title="אין בקשות ממתינות"
                description="כל הבקשות אושרו או נדחו"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                {pendingApprovals.map(approval => (
                  <div
                    key={approval.id}
                    style={{
                      padding: spacing.xl,
                      background: theme.gradients.card,
                      border: `1px solid ${colors.border.primary}`,
                      borderRadius: borderRadius.lg,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: borderRadius.lg,
                        background: approval.priority === 'high' ? colors.status.errorFaded : approval.priority === 'medium' ? colors.status.warningFaded : colors.status.infoFaded,
                        border: `2px solid ${approval.priority === 'high' ? colors.status.error : approval.priority === 'medium' ? colors.status.warning : colors.brand.primary}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                      }}>
                        {approval.type === 'restock' ? '📦' : '👤'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: typography.fontSize.lg,
                            color: colors.text.primary,
                            fontWeight: typography.fontWeight.bold,
                          }}>
                            {approval.title}
                          </h4>
                          {approval.priority === 'high' && (
                            <span style={{
                              ...components.badge.base,
                              ...components.badge.error,
                            }}>
                              ⚠️ דחוף
                            </span>
                          )}
                        </div>
                        <p style={{
                          margin: `0 0 ${spacing.sm} 0`,
                          fontSize: typography.fontSize.sm,
                          color: colors.text.secondary,
                        }}>
                          {approval.description}
                        </p>
                        <div style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.text.tertiary,
                        }}>
                          👤 מבקש: {approval.requestedBy} • {new Date(approval.requestedAt).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: spacing.md }}>
                      <button
                        onClick={() => handleApproveRequest(approval.id, approval.type)}
                        style={{
                          flex: 1,
                          padding: spacing.lg,
                          borderRadius: borderRadius.lg,
                          border: 'none',
                          background: theme.gradients.success,
                          color: colors.white,
                          fontSize: typography.fontSize.base,
                          fontWeight: typography.fontWeight.bold,
                          cursor: 'pointer',
                          boxShadow: '0 8px 20px rgba(0, 186, 124, 0.4)',
                          transition: 'all 300ms ease',
                        }}
                      >
                        ✅ אשר
                      </button>
                      <button
                        onClick={() => handleRejectRequest(approval.id, approval.type)}
                        style={{
                          flex: 1,
                          padding: spacing.lg,
                          borderRadius: borderRadius.lg,
                          border: `2px solid ${colors.border.primary}`,
                          background: 'transparent',
                          color: colors.text.primary,
                          fontSize: typography.fontSize.base,
                          fontWeight: typography.fontWeight.bold,
                          cursor: 'pointer',
                          transition: 'all 300ms ease',
                        }}
                      >
                        ❌ דחה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Resources Tab */}
        {selectedView === 'resources' && (
          <Section title="ניהול משאבים" subtitle="Resource management tools">
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <ActionButton label="ניהול מלאי" icon="📦" onClick={() => onNavigate('inventory')} />
              <ActionButton label="הקצאת אזורים" icon="🗺️" onClick={() => onNavigate('zone-management')} />
              <ActionButton label="בקשות חידוש" icon="🔄" onClick={() => onNavigate('restock-requests')} />
            </div>
          </Section>
        )}

        {/* Reports Tab */}
        {selectedView === 'reports' && (
          <Section title="דוחות וניתוחים" subtitle="Analytics and reports">
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <ActionButton label="דוח ביצועים שבועי" icon="📊" onClick={() => onNavigate('reports')} />
              <ActionButton label="ניתוח צוות" icon="👥" onClick={() => onNavigate('stats')} />
              <ActionButton label="דוח הכנסות" icon="💰" onClick={() => onNavigate('stats')} />
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function ActionButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={() => {
        onClick();

      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: `${spacing.lg} ${spacing.xl}`,
        borderRadius: borderRadius.lg,
        border: `2px solid ${isHovered ? colors.brand.primary : colors.border.primary}`,
        background: isHovered ? `${colors.brand.primary}15` : colors.background.secondary,
        color: colors.text.primary,
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: spacing.lg,
        transition: 'all 300ms ease',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ color: colors.text.secondary }}>→</span>
    </button>
  );
}
