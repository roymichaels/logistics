import React, { useState, useEffect } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import {
  UndergroundCard,
  UndergroundStatCard,
  UndergroundButton,
  UndergroundBadge,
  UndergroundLoadingSpinner
} from '../../components/underground';
import { logger } from '../../lib/logger';
import { driverService, DriverStatus, DriverProfile } from '../../services/driver';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../utils/haptic';
import { Toast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';

export function DriverHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [status, setStatus] = useState<DriverStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [todayStats, setTodayStats] = useState({
    deliveries: 0,
    earnings: 0,
    hours: 0,
    rating: 5.0
  });
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);

  useEffect(() => {
    loadDriverData();
    loadAssignments();

    const channel = supabase
      .channel('driver-assignments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assignments',
          filter: `driver_id=eq.${user?.id}`
        },
        (payload) => {
          logger.info('[DriverHome] New assignment received', payload);
          loadAssignments();
          Toast.success('משימה חדשה התקבלה!');
          haptic('heavy');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadDriverData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const [profileResult, statusResult] = await Promise.all([
        driverService.getDriverProfile(user.id),
        driverService.getDriverStatus(user.id)
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      if (statusResult.data) {
        setStatus(statusResult.data);
        setIsOnline(statusResult.data.status === 'online' || statusResult.data.status === 'busy');
      }

      const today = new Date().toISOString().split('T')[0];
      const earningsResult = await driverService.getDriverEarnings(user.id, today, today);

      if (earningsResult.data && earningsResult.data.length > 0) {
        const todayData = earningsResult.data[0];
        setTodayStats({
          deliveries: todayData.total_deliveries,
          earnings: todayData.net_earnings,
          hours: 0,
          rating: profile?.rating || 5.0
        });
      }
    } catch (error) {
      logger.error('[DriverHome] Failed to load driver data:', error);
      Toast.error('Failed to load driver data');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    if (!user?.id) return;

    try {
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          *,
          order:orders(id, order_number, customer_name, delivery_address, total_amount),
          business:businesses(name, name_hebrew)
        `)
        .eq('driver_id', user.id)
        .in('status', ['pending', 'accepted', 'picked_up', 'in_transit']);

      if (error) throw error;

      const pending = assignments?.filter(a => a.status === 'pending') || [];
      const active = assignments?.filter(a => ['accepted', 'picked_up', 'in_transit'].includes(a.status)) || [];

      setPendingAssignments(pending);
      setActiveAssignments(active);
    } catch (error) {
      logger.error('[DriverHome] Failed to load assignments:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!user?.id) return;

    try {
      const newStatus = isOnline ? 'offline' : 'online';

      const { error } = await driverService.updateDriverStatus(
        user.id,
        newStatus
      );

      if (error) {
        logger.error('[DriverHome] Failed to update status:', error);
        return;
      }

      setIsOnline(!isOnline);
      haptic('medium');

      if (!isOnline) {
        logger.info('[DriverHome] Driver went online');
        Toast.success('התחברת בהצלחה - אתה זמין למשלוחים!');
      } else {
        logger.info('[DriverHome] Driver went offline');
        Toast.success('התנתקת - לא זמין למשלוחים');
      }
    } catch (error) {
      logger.error('[DriverHome] Error toggling status:', error);
      Toast.error('שגיאה בשינוי סטטוס');
    }
  };

  const acceptAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;

      Toast.success('המשימה התקבלה!');
      loadAssignments();
      haptic('success');
    } catch (error) {
      logger.error('[DriverHome] Failed to accept assignment:', error);
      Toast.error('Failed to accept assignment');
    }
  };

  const rejectAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;

      Toast.success('המשימה נדחתה');
      loadAssignments();
      haptic('light');
    } catch (error) {
      logger.error('[DriverHome] Failed to reject assignment:', error);
      Toast.error('Failed to reject assignment');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: undergroundTheme.colors.gradient.primary
      }}>
        <UndergroundLoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: undergroundTheme.colors.gradient.primary,
      padding: undergroundTheme.spacing['2xl'],
      paddingBottom: undergroundTheme.spacing['8xl'],
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ marginBottom: undergroundTheme.spacing['3xl'] }}>
        <h1 style={{
          fontSize: undergroundTheme.typography.fontSize['4xl'],
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          margin: '0 0 8px 0',
          color: undergroundTheme.colors.text.primary,
          textShadow: undergroundTheme.shadows.glow.cyan
        }}>
          👋 שלום {profile ? 'נהג' : ''}!
        </h1>
        <p style={{ margin: '0', color: undergroundTheme.colors.text.secondary, fontSize: undergroundTheme.typography.fontSize.lg }}>
          {isOnline ? 'אתה מחובר ומוכן למשלוחים' : 'התחבר כדי להתחיל לעבוד'}
        </p>
      </div>

      {/* Online/Offline Toggle */}
      <UndergroundCard
        variant="strong"
        glow={isOnline}
        style={{
          marginBottom: undergroundTheme.spacing['3xl'],
          border: `2px solid ${isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.glassmorphism.border}`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {isOnline && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: undergroundTheme.colors.gradient.success,
            boxShadow: undergroundTheme.shadows.glow.success
          }} />
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: undergroundTheme.spacing.lg
        }}>
          <div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              marginBottom: '4px'
            }}>
              סטטוס
            </div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.sm,
              color: undergroundTheme.colors.text.secondary
            }}>
              {isOnline ? 'מחובר ומוכן למשלוחים' : 'לא מחובר'}
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={toggleOnlineStatus}
            style={{
              position: 'relative',
              width: '72px',
              height: '40px',
              background: isOnline
                ? undergroundTheme.colors.gradient.success
                : undergroundTheme.colors.glassmorphism.light,
              border: `2px solid ${isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.glassmorphism.border}`,
              borderRadius: undergroundTheme.borderRadius.full,
              cursor: 'pointer',
              transition: undergroundTheme.transitions.normal,
              padding: 0,
              boxShadow: isOnline ? undergroundTheme.shadows.glow.success : 'none'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '4px',
              [isOnline ? 'right' : 'left']: '4px',
              width: '28px',
              height: '28px',
              background: '#ffffff',
              borderRadius: '50%',
              transition: undergroundTheme.transitions.normal,
              boxShadow: undergroundTheme.shadows.md
            }} />
          </button>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: undergroundTheme.spacing.sm,
          padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.lg}`,
          background: isOnline
            ? `${undergroundTheme.colors.status.success}20`
            : `${undergroundTheme.colors.text.muted}20`,
          border: `1px solid ${isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.text.muted}`,
          borderRadius: undergroundTheme.borderRadius.md,
          fontSize: undergroundTheme.typography.fontSize.sm,
          fontWeight: undergroundTheme.typography.fontWeight.semibold,
          color: isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.text.muted
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isOnline ? undergroundTheme.colors.status.success : undergroundTheme.colors.text.muted,
            boxShadow: isOnline ? undergroundTheme.shadows.glow.success : 'none'
          }} />
          {isOnline ? 'מחובר' : 'לא מחובר'}
        </div>
      </UndergroundCard>

      {/* Today's Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: undergroundTheme.spacing.lg,
        marginBottom: undergroundTheme.spacing['3xl']
      }}>
        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>📦</span>}
          label="משלוחים היום"
          value={todayStats.deliveries}
          accentColor={undergroundTheme.colors.accent.primary}
        />

        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>💰</span>}
          label="רווחים היום"
          value={`₪${todayStats.earnings.toFixed(0)}`}
          accentColor={undergroundTheme.colors.status.success}
        />

        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>⭐</span>}
          label="דירוג ממוצע"
          value={profile?.rating.toFixed(1) || '5.0'}
          accentColor={undergroundTheme.colors.status.warning}
        />

        <UndergroundStatCard
          icon={<span style={{ fontSize: '32px' }}>🚀</span>}
          label="סה״כ משלוחים"
          value={profile?.total_deliveries || 0}
          accentColor={undergroundTheme.colors.status.info}
        />
      </div>

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <div style={{ marginBottom: undergroundTheme.spacing['3xl'] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: undergroundTheme.spacing.lg
          }}>
            <h2 style={{
              fontSize: undergroundTheme.typography.fontSize.xl,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              color: undergroundTheme.colors.text.primary,
              margin: 0
            }}>
              משימות ממתינות
            </h2>
            <UndergroundBadge variant="warning" size="md">
              {pendingAssignments.length}
            </UndergroundBadge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            {pendingAssignments.map((assignment) => (
              <UndergroundCard key={assignment.id} glow variant="strong">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: undergroundTheme.spacing.md
                }}>
                  <div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.lg,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.text.primary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      הזמנה #{assignment.order?.order_number}
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.sm,
                      color: undergroundTheme.colors.text.secondary
                    }}>
                      {assignment.business?.name_hebrew || assignment.business?.name}
                    </div>
                  </div>
                  <UndergroundBadge variant="warning">חדש</UndergroundBadge>
                </div>

                <div style={{
                  padding: undergroundTheme.spacing.md,
                  background: 'rgba(0, 212, 255, 0.05)',
                  borderRadius: undergroundTheme.borderRadius.md,
                  border: '1px solid rgba(0, 212, 255, 0.1)',
                  marginBottom: undergroundTheme.spacing.md
                }}>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.sm,
                    color: undergroundTheme.colors.text.secondary,
                    marginBottom: undergroundTheme.spacing.xs
                  }}>
                    כתובת:
                  </div>
                  <div style={{
                    fontSize: undergroundTheme.typography.fontSize.base,
                    color: undergroundTheme.colors.text.primary,
                    fontWeight: undergroundTheme.typography.fontWeight.medium
                  }}>
                    {assignment.order?.delivery_address}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: undergroundTheme.spacing.lg
                }}>
                  <div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      סכום ההזמנה
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xl,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.accent.primary
                    }}>
                      ₪{assignment.order?.total_amount?.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xs,
                      color: undergroundTheme.colors.text.tertiary,
                      marginBottom: undergroundTheme.spacing.xs
                    }}>
                      דמי משלוח
                    </div>
                    <div style={{
                      fontSize: undergroundTheme.typography.fontSize.xl,
                      fontWeight: undergroundTheme.typography.fontWeight.bold,
                      color: undergroundTheme.colors.status.success
                    }}>
                      ₪{assignment.delivery_fee?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: undergroundTheme.spacing.md }}>
                  <UndergroundButton
                    variant="primary"
                    onClick={() => acceptAssignment(assignment.id)}
                    style={{ flex: 1 }}
                  >
                    קבל משימה
                  </UndergroundButton>
                  <UndergroundButton
                    variant="ghost"
                    onClick={() => rejectAssignment(assignment.id)}
                    style={{ flex: 1 }}
                  >
                    דחה
                  </UndergroundButton>
                </div>
              </UndergroundCard>
            ))}
          </div>
        </div>
      )}

      {/* Active Assignments Banner */}
      {activeAssignments.length > 0 && (
        <UndergroundCard
          variant="strong"
          glow
          style={{
            marginBottom: undergroundTheme.spacing['3xl'],
            border: `2px solid ${undergroundTheme.colors.status.info}`,
            background: `${undergroundTheme.colors.status.info}10`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.lg,
                fontWeight: undergroundTheme.typography.fontWeight.bold,
                color: undergroundTheme.colors.text.primary,
                marginBottom: undergroundTheme.spacing.xs
              }}>
                משימות פעילות: {activeAssignments.length}
              </div>
              <div style={{
                fontSize: undergroundTheme.typography.fontSize.sm,
                color: undergroundTheme.colors.text.secondary
              }}>
                יש לך משלוחים בתהליך
              </div>
            </div>
            <UndergroundButton
              variant="primary"
              onClick={() => navigate('/driver/deliveries')}
            >
              צפה במשלוחים
            </UndergroundButton>
          </div>
        </UndergroundCard>
      )}

      {/* Quick Actions */}
      <div style={{ marginBottom: undergroundTheme.spacing['3xl'] }}>
        <h2 style={{
          fontSize: undergroundTheme.typography.fontSize.xl,
          fontWeight: undergroundTheme.typography.fontWeight.bold,
          color: undergroundTheme.colors.text.primary,
          marginBottom: undergroundTheme.spacing.lg
        }}>
          פעולות מהירות
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: undergroundTheme.spacing.md
        }}>
          <UndergroundButton
            variant="primary"
            onClick={() => {
              navigate('/driver/deliveries');
              haptic('light');
            }}
            style={{
              padding: undergroundTheme.spacing['2xl'],
              textAlign: 'right',
              display: 'block',
              height: 'auto'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: undergroundTheme.spacing.sm }}>🚚</div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.lg,
              fontWeight: undergroundTheme.typography.fontWeight.bold,
              marginBottom: '4px'
            }}>
              המשלוחים שלי
            </div>
            <div style={{
              fontSize: undergroundTheme.typography.fontSize.xs,
              opacity: 0.8
            }}>
              צפה במשימות פעילות
            </div>
          </UndergroundButton>

          <QuickActionCard
            icon="📊"
            title="אנליטיקה ורווחים"
            subtitle="ביצועים, דירוגים והכנסות"
            onClick={() => {
              navigate('/driver/analytics');
              haptic('light');
            }}
          />

          <QuickActionCard
            icon="⚙️"
            title="הפרופיל שלי"
            subtitle="הגדרות ופרטים אישיים"
            onClick={() => {
              navigate('/driver/profile');
              haptic('light');
            }}
          />
        </div>
      </div>

      {/* Driver Info Card */}
      {profile && (
        <UndergroundCard>
          <h2 style={{
            fontSize: undergroundTheme.typography.fontSize.xl,
            fontWeight: undergroundTheme.typography.fontWeight.bold,
            color: undergroundTheme.colors.text.primary,
            marginBottom: undergroundTheme.spacing.lg
          }}>
            פרטי רכב
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: undergroundTheme.spacing.md }}>
            <InfoRow label="סוג רכב" value={profile.vehicle_type || 'לא צוין'} />
            <InfoRow label="מספר רכב" value={profile.vehicle_plate || 'לא צוין'} />
            <InfoRow label="טלפון" value={profile.phone || 'לא צוין'} />
          </div>
        </UndergroundCard>
      )}
    </div>
  );
}

function QuickActionCard({ icon, title, subtitle, onClick }: { icon: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <UndergroundCard hover onClick={onClick} style={{ padding: undergroundTheme.spacing['2xl'], textAlign: 'right' }}>
      <div style={{ fontSize: '32px', marginBottom: undergroundTheme.spacing.sm }}>{icon}</div>
      <div style={{
        fontSize: undergroundTheme.typography.fontSize.lg,
        fontWeight: undergroundTheme.typography.fontWeight.bold,
        color: undergroundTheme.colors.text.primary,
        marginBottom: '4px'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: undergroundTheme.typography.fontSize.xs,
        color: undergroundTheme.colors.text.secondary
      }}>
        {subtitle}
      </div>
    </UndergroundCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: undergroundTheme.spacing.md,
      background: undergroundTheme.colors.glassmorphism.light,
      borderRadius: undergroundTheme.borderRadius.md,
      border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`
    }}>
      <span style={{ fontSize: undergroundTheme.typography.fontSize.sm, color: undergroundTheme.colors.text.secondary }}>{label}</span>
      <span style={{ fontSize: undergroundTheme.typography.fontSize.base, fontWeight: undergroundTheme.typography.fontWeight.semibold, color: undergroundTheme.colors.text.primary }}>
        {value}
      </span>
    </div>
  );
}
