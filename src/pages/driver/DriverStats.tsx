import React, { useEffect, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { useAuth } from '../../context/AuthContext';
import { driverService, DriverProfile } from '../../services/driver';
import { logger } from '../../lib/logger';

interface DriverStatsData {
  profile: DriverProfile | null;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalDeliveries: number;
  todayDeliveries: number;
  averageRating: number;
  acceptanceRate: number;
  completionRate: number;
  onTimeRate: number;
  totalDistance: number;
  achievementPoints: number;
  recentRatings: Array<{
    rating: number;
    feedback: string;
    created_at: string;
  }>;
}

export function DriverStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DriverStatsData>({
    profile: null,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalDeliveries: 0,
    todayDeliveries: 0,
    averageRating: 5.0,
    acceptanceRate: 100,
    completionRate: 100,
    onTimeRate: 100,
    totalDistance: 0,
    achievementPoints: 0,
    recentRatings: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data: profile } = await driverService.getDriverProfile(user.id);

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: weeklyData } = await driverService.getDriverEarnings(user.id, weekAgo, today);
      const { data: monthlyData } = await driverService.getDriverEarnings(user.id, monthAgo, today);
      const { data: todayData } = await driverService.getDriverEarnings(user.id, today, today);

      const weeklyEarnings = weeklyData?.reduce((sum, day) => sum + day.net_earnings, 0) || 0;
      const monthlyEarnings = monthlyData?.reduce((sum, day) => sum + day.net_earnings, 0) || 0;
      const todayDeliveries = todayData?.[0]?.total_deliveries || 0;

      setStats({
        profile,
        weeklyEarnings,
        monthlyEarnings,
        totalDeliveries: profile?.total_deliveries || 0,
        todayDeliveries,
        averageRating: profile?.rating || 5.0,
        acceptanceRate: profile?.acceptance_rate || 100,
        completionRate: profile?.completion_rate || 100,
        onTimeRate: profile?.on_time_rate || 100,
        totalDistance: profile?.total_distance || 0,
        achievementPoints: profile?.achievement_points || 0,
        recentRatings: [],
      });
    } catch (error) {
      logger.error('[DriverStats] Failed to load stats', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: tokens.colors.panel,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600' }}>
            Loading statistics...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.colors.panel,
        paddingBottom: '100px',
      }}
    >
      <div
        style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #1e293b, #334155)',
          borderBottom: `1px solid ${tokens.colors.background.cardBorder}`,
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 16px 0', color: '#fff' }}>
          Performance Stats
        </h1>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSelectedPeriod('week')}
            style={{
              flex: 1,
              padding: '10px',
              background: selectedPeriod === 'week' ? tokens.gradients.primary : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            This Week
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            style={{
              flex: 1,
              padding: '10px',
              background: selectedPeriod === 'month' ? tokens.gradients.primary : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            This Month
          </button>
          <button
            onClick={() => setSelectedPeriod('all')}
            style={{
              flex: 1,
              padding: '10px',
              background: selectedPeriod === 'all' ? tokens.gradients.primary : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            All Time
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', fontWeight: '700', color: tokens.colors.status.success, marginBottom: '8px' }}>
            ₪{selectedPeriod === 'week' ? stats.weeklyEarnings.toFixed(2) : selectedPeriod === 'month' ? stats.monthlyEarnings.toFixed(2) : (stats.profile?.total_earnings || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '16px', color: tokens.colors.text }}>
            {selectedPeriod === 'week' ? 'Weekly' : selectedPeriod === 'month' ? 'Monthly' : 'Total'} Earnings
          </div>
        </div>

        <div
          style={{
            background: tokens.colors.background.card,
            borderRadius: '20px',
            padding: '24px',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.text, marginBottom: '20px' }}>
            Performance Metrics
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <MetricCard
              icon="⭐"
              value={stats.averageRating.toFixed(1)}
              label="Rating"
              color={tokens.colors.status.warning}
              isGood={stats.averageRating >= 4.5}
            />
            <MetricCard
              icon="✅"
              value={`${stats.acceptanceRate.toFixed(0)}%`}
              label="Acceptance"
              color={tokens.colors.status.success}
              isGood={stats.acceptanceRate >= 80}
            />
            <MetricCard
              icon="📦"
              value={`${stats.completionRate.toFixed(0)}%`}
              label="Completion"
              color={tokens.colors.brand.primary}
              isGood={stats.completionRate >= 90}
            />
            <MetricCard
              icon="⏰"
              value={`${stats.onTimeRate.toFixed(0)}%`}
              label="On-Time"
              color={tokens.colors.status.info}
              isGood={stats.onTimeRate >= 85}
            />
          </div>

          <div style={{ marginTop: '20px', padding: '16px', background: tokens.colors.bg, borderRadius: '12px' }}>
            <div style={{ fontSize: '14px', color: tokens.colors.subtle, marginBottom: '8px' }}>
              Performance Summary
            </div>
            <div style={{ fontSize: '15px', color: tokens.colors.text, lineHeight: '1.6' }}>
              {stats.acceptanceRate >= 90 && stats.completionRate >= 95 && stats.averageRating >= 4.8
                ? "Outstanding! You're in the top tier of drivers. Keep up the excellent work!"
                : stats.acceptanceRate >= 80 && stats.completionRate >= 85 && stats.averageRating >= 4.5
                ? "Great performance! You're doing well. Small improvements in acceptance rate can boost your earnings."
                : "Good work! Focus on maintaining high completion and acceptance rates to maximize your earnings."}
            </div>
          </div>
        </div>

        <div
          style={{
            background: tokens.colors.background.card,
            borderRadius: '20px',
            padding: '24px',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.text, marginBottom: '20px' }}>
            Delivery Stats
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <StatBox
              value={stats.totalDeliveries.toString()}
              label="Total Deliveries"
              icon="🚚"
            />
            <StatBox
              value={stats.todayDeliveries.toString()}
              label="Today's Deliveries"
              icon="📦"
            />
            <StatBox
              value={`${stats.totalDistance.toFixed(1)} km`}
              label="Total Distance"
              icon="🛣️"
            />
            <StatBox
              value={stats.achievementPoints.toString()}
              label="Achievement Points"
              icon="🏆"
            />
          </div>
        </div>

        <div
          style={{
            background: tokens.colors.background.card,
            borderRadius: '20px',
            padding: '24px',
            border: `1px solid ${tokens.colors.background.cardBorder}`,
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: tokens.colors.text, marginBottom: '20px' }}>
            Achievements
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AchievementBadge
              icon="🎉"
              title="First Delivery"
              description="Completed your first delivery"
              unlocked={stats.totalDeliveries >= 1}
            />
            <AchievementBadge
              icon="💯"
              title="Century Club"
              description="Completed 100 deliveries"
              unlocked={stats.totalDeliveries >= 100}
              progress={stats.totalDeliveries}
              goal={100}
            />
            <AchievementBadge
              icon="⭐"
              title="5-Star Champion"
              description="Maintain 4.9+ rating for 50 deliveries"
              unlocked={stats.averageRating >= 4.9 && stats.totalDeliveries >= 50}
            />
            <AchievementBadge
              icon="⚡"
              title="Speed Demon"
              description="Complete 20 deliveries in one day"
              unlocked={stats.todayDeliveries >= 20}
              progress={stats.todayDeliveries}
              goal={20}
            />
            <AchievementBadge
              icon="🌙"
              title="Night Owl"
              description="Complete 50 late night deliveries"
              unlocked={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: string;
  value: string;
  label: string;
  color: string;
  isGood: boolean;
}

function MetricCard({ icon, value, label, color, isGood }: MetricCardProps) {
  return (
    <div
      style={{
        padding: '20px',
        background: `${color}10`,
        border: `1px solid ${color}30`,
        borderRadius: '16px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: tokens.colors.subtle, marginBottom: '8px' }}>
        {label}
      </div>
      {isGood && (
        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: `${tokens.colors.status.success}20`,
            border: `1px solid ${tokens.colors.status.success}`,
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: '600',
            color: tokens.colors.status.success,
          }}
        >
          Excellent
        </div>
      )}
    </div>
  );
}

interface StatBoxProps {
  value: string;
  label: string;
  icon: string;
}

function StatBox({ value, label, icon }: StatBoxProps) {
  return (
    <div
      style={{
        padding: '20px',
        background: tokens.colors.bg,
        borderRadius: '12px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: tokens.colors.text, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', color: tokens.colors.subtle }}>
        {label}
      </div>
    </div>
  );
}

interface AchievementBadgeProps {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  goal?: number;
}

function AchievementBadge({ icon, title, description, unlocked, progress, goal }: AchievementBadgeProps) {
  const progressPercentage = progress && goal ? Math.min((progress / goal) * 100, 100) : 0;

  return (
    <div
      style={{
        padding: '16px',
        background: unlocked
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))'
          : tokens.colors.bg,
        border: unlocked
          ? '1px solid rgba(16, 185, 129, 0.3)'
          : `1px solid ${tokens.colors.background.cardBorder}`,
        borderRadius: '12px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        opacity: unlocked ? 1 : 0.6,
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: unlocked ? tokens.colors.status.success : tokens.colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: tokens.colors.text }}>
            {title}
          </div>
          {unlocked && (
            <div
              style={{
                padding: '4px 8px',
                background: tokens.colors.status.success,
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: '700',
                color: '#fff',
              }}
            >
              UNLOCKED
            </div>
          )}
        </div>
        <div style={{ fontSize: '13px', color: tokens.colors.subtle, marginBottom: progress && goal ? '8px' : '0' }}>
          {description}
        </div>
        {progress !== undefined && goal && !unlocked && (
          <div>
            <div
              style={{
                height: '6px',
                background: tokens.colors.bg,
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '4px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: tokens.colors.brand.primary,
                  width: `${progressPercentage}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: tokens.colors.subtle }}>
              {progress} / {goal}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
