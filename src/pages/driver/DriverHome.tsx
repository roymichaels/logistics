import React, { useState, useEffect } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { UndergroundCard } from '../../components/underground/UndergroundCard';
import { UndergroundStatCard } from '../../components/underground/UndergroundStatCard';
import { UndergroundButton } from '../../components/underground/UndergroundButton';
import { logger } from '../../lib/logger';
import { driverService, DriverStatus, DriverProfile } from '../../services/driver';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { haptic } from '../../utils/haptic';

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

  useEffect(() => {
    loadDriverData();
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
    } finally {
      setLoading(false);
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
      } else {
        logger.info('[DriverHome] Driver went offline');
      }
    } catch (error) {
      logger.error('[DriverHome] Error toggling status:', error);
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div style={{ color: undergroundTheme.colors.text.primary, fontSize: '18px', fontWeight: '600' }}>
            טוען...
          </div>
        </div>
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
            icon="💵"
            title="הרווחים שלי"
            subtitle="היסטוריית תשלומים"
            onClick={() => {
              navigate('/driver/earnings');
              haptic('light');
            }}
          />

          <QuickActionCard
            icon="📊"
            title="הסטטיסטיקות שלי"
            subtitle="ביצועים ודירוגים"
            onClick={() => {
              navigate('/driver/stats');
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
