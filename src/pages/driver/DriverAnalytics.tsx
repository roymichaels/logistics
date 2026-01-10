import React, { useEffect, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { useAuth } from '../../context/AuthContext';
import { driverService, DriverProfile } from '../../services/driver';
import { logger } from '../../lib/logger';
import { Toast } from '../../components/Toast';

interface DriverAnalyticsData {
  profile: DriverProfile | null;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalEarnings: number;
  todayDeliveries: number;
  totalDeliveries: number;
  averageRating: number;
  acceptanceRate: number;
  completionRate: number;
  onTimeRate: number;
  totalDistance: number;
  achievementPoints: number;
}

type PeriodType = 'today' | 'week' | 'month' | 'all';

export function DriverAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<DriverAnalyticsData>({
    profile: null,
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalEarnings: 0,
    todayDeliveries: 0,
    totalDeliveries: 0,
    averageRating: 5.0,
    acceptanceRate: 100,
    completionRate: 100,
    onTimeRate: 100,
    totalDistance: 0,
    achievementPoints: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');

  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [profileResult, todayResult, weeklyResult, monthlyResult] = await Promise.all([
        driverService.getDriverProfile(user.id),
        driverService.getDriverEarnings(user.id, today, today),
        driverService.getDriverEarnings(user.id, weekAgo, today),
        driverService.getDriverEarnings(user.id, monthAgo, today),
      ]);

      const profile = profileResult.data;
      const todayEarnings = todayResult.data?.reduce((sum, day) => sum + day.net_earnings, 0) || 0;
      const weeklyEarnings = weeklyResult.data?.reduce((sum, day) => sum + day.net_earnings, 0) || 0;
      const monthlyEarnings = monthlyResult.data?.reduce((sum, day) => sum + day.net_earnings, 0) || 0;
      const todayDeliveries = todayResult.data?.[0]?.total_deliveries || 0;

      setData({
        profile,
        todayEarnings,
        weeklyEarnings,
        monthlyEarnings,
        totalEarnings: profile?.metadata?.total_earnings || 0,
        todayDeliveries,
        totalDeliveries: profile?.total_deliveries || 0,
        averageRating: profile?.rating || 5.0,
        acceptanceRate: (profile?.metadata?.acceptance_rate as number) || 100,
        completionRate: (profile?.metadata?.completion_rate as number) || 100,
        onTimeRate: (profile?.metadata?.on_time_rate as number) || 100,
        totalDistance: (profile?.metadata?.total_distance as number) || 0,
        achievementPoints: (profile?.metadata?.achievement_points as number) || 0,
      });
    } catch (error) {
      logger.error('[DriverAnalytics] Failed to load data', error);
      Toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getEarningsForPeriod = () => {
    switch (selectedPeriod) {
      case 'today':
        return data.todayEarnings;
      case 'week':
        return data.weeklyEarnings;
      case 'month':
        return data.monthlyEarnings;
      case 'all':
        return data.totalEarnings;
      default:
        return 0;
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today':
        return 'היום';
      case 'week':
        return 'השבוע';
      case 'month':
        return 'החודש';
      case 'all':
        return 'כל הזמן';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: tokens.colors.panel
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600' }}>
            טוען נתונים...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.panel,
      paddingBottom: '100px',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        background: 'linear-gradient(135deg, #1e293b, #334155)',
        borderBottom: `1px solid ${tokens.colors.background.cardBorder}`
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          margin: '0 0 8px 0',
          color: '#fff'
        }}>
          📊 אנליטיקה ורווחים
        </h1>
        <p style={{ margin: '0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '15px' }}>
          מעקב אחר הביצועים והרווחים שלך
        </p>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Period Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
          marginBottom: '24px'
        }}>
          {(['today', 'week', 'month', 'all'] as PeriodType[]).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              style={{
                padding: '12px',
                background: selectedPeriod === period
                  ? tokens.gradients.primary
                  : tokens.colors.background.card,
                border: `1px solid ${selectedPeriod === period ? 'transparent' : tokens.colors.background.cardBorder}`,
                borderRadius: '12px',
                color: selectedPeriod === period ? '#fff' : tokens.colors.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {period === 'today' && 'היום'}
              {period === 'week' && 'שבוע'}
              {period === 'month' && 'חודש'}
              {period === 'all' && 'הכל'}
            </button>
          ))}
        </div>

        {/* Main Earnings Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))',
          borderRadius: '20px',
          padding: '32px',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          marginBottom: '24px',
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
        }}>
          <div style={{
            fontSize: '14px',
            color: tokens.colors.text,
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            רווחים {getPeriodLabel()}
          </div>
          <div style={{
            fontSize: '48px',
            fontWeight: '700',
            color: tokens.colors.status.success,
            marginBottom: '8px',
            textShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
          }}>
            ₪{getEarningsForPeriod().toFixed(2)}
          </div>
          <div style={{
            fontSize: '14px',
            color: tokens.colors.subtle
          }}>
            {selectedPeriod === 'today' && `${data.todayDeliveries} משלוחים היום`}
            {selectedPeriod === 'week' && 'רווחי 7 הימים האחרונים'}
            {selectedPeriod === 'month' && 'רווחי 30 הימים האחרונים'}
            {selectedPeriod === 'all' && `סה"כ ${data.totalDeliveries} משלוחים`}
          </div>
        </div>

        {/* Performance Metrics */}
        <div style={{
          background: tokens.colors.background.card,
          borderRadius: '20px',
          padding: '24px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '20px'
          }}>
            מדדי ביצועים
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <MetricCard
              icon="⭐"
              value={data.averageRating.toFixed(1)}
              label="דירוג ממוצע"
              color={tokens.colors.status.warning}
              isGood={data.averageRating >= 4.5}
            />
            <MetricCard
              icon="✅"
              value={`${data.acceptanceRate.toFixed(0)}%`}
              label="שיעור קבלה"
              color={tokens.colors.status.success}
              isGood={data.acceptanceRate >= 80}
            />
            <MetricCard
              icon="📦"
              value={`${data.completionRate.toFixed(0)}%`}
              label="שיעור השלמה"
              color={tokens.colors.brand.primary}
              isGood={data.completionRate >= 90}
            />
            <MetricCard
              icon="⏰"
              value={`${data.onTimeRate.toFixed(0)}%`}
              label="הגעה בזמן"
              color={tokens.colors.status.info}
              isGood={data.onTimeRate >= 85}
            />
          </div>

          {/* Performance Summary */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px'
          }}>
            <div style={{
              fontSize: '14px',
              color: tokens.colors.text,
              lineHeight: '1.6'
            }}>
              {data.acceptanceRate >= 90 && data.completionRate >= 95 && data.averageRating >= 4.8
                ? '🌟 מעולה! אתה בקבוצת העילית של הנהגים. המשך בעבודה מצוינת!'
                : data.acceptanceRate >= 80 && data.completionRate >= 85 && data.averageRating >= 4.5
                ? '👍 ביצועים נהדרים! אתה עושה עבודה טובה. שיפורים קטנים יכולים להגדיל את הרווחים שלך.'
                : '💪 עבודה טובה! התמקד בשמירה על שיעור השלמה וקבלה גבוהים כדי למקסם את הרווחים שלך.'}
            </div>
          </div>
        </div>

        {/* Delivery Stats */}
        <div style={{
          background: tokens.colors.background.card,
          borderRadius: '20px',
          padding: '24px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '20px'
          }}>
            סטטיסטיקות משלוחים
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <StatBox
              value={data.totalDeliveries.toString()}
              label="סה״כ משלוחים"
              icon="🚚"
            />
            <StatBox
              value={data.todayDeliveries.toString()}
              label="משלוחי היום"
              icon="📦"
            />
            <StatBox
              value={`${data.totalDistance.toFixed(1)} ק"מ`}
              label="מרחק כולל"
              icon="🛣️"
            />
            <StatBox
              value={data.achievementPoints.toString()}
              label="נקודות הישג"
              icon="🏆"
            />
          </div>
        </div>

        {/* Achievements */}
        <div style={{
          background: tokens.colors.background.card,
          borderRadius: '20px',
          padding: '24px',
          border: `1px solid ${tokens.colors.background.cardBorder}`
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '20px'
          }}>
            הישגים
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AchievementBadge
              icon="🎉"
              title="משלוח ראשון"
              description="השלמת את המשלוח הראשון שלך"
              unlocked={data.totalDeliveries >= 1}
            />
            <AchievementBadge
              icon="💯"
              title="מועדון המאה"
              description="השלמת 100 משלוחים"
              unlocked={data.totalDeliveries >= 100}
              progress={data.totalDeliveries}
              goal={100}
            />
            <AchievementBadge
              icon="⭐"
              title="אלוף 5 כוכבים"
              description="שמור על דירוג 4.9+ ל-50 משלוחים"
              unlocked={data.averageRating >= 4.9 && data.totalDeliveries >= 50}
            />
            <AchievementBadge
              icon="⚡"
              title="שד מהירות"
              description="השלם 20 משלוחים ביום אחד"
              unlocked={data.todayDeliveries >= 20}
              progress={data.todayDeliveries}
              goal={20}
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
    <div style={{
      padding: '20px',
      background: `${color}10`,
      border: `1px solid ${color}30`,
      borderRadius: '16px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontSize: '28px',
        fontWeight: '700',
        color,
        marginBottom: '4px'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '13px',
        color: tokens.colors.subtle,
        marginBottom: isGood ? '8px' : '0'
      }}>
        {label}
      </div>
      {isGood && (
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: `${tokens.colors.status.success}20`,
          border: `1px solid ${tokens.colors.status.success}`,
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          color: tokens.colors.status.success
        }}>
          מצוין
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
    <div style={{
      padding: '20px',
      background: tokens.colors.bg,
      borderRadius: '12px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: tokens.colors.text,
        marginBottom: '4px'
      }}>
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
    <div style={{
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
      opacity: unlocked ? 1 : 0.6
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: unlocked ? tokens.colors.status.success : tokens.colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            color: tokens.colors.text
          }}>
            {title}
          </div>
          {unlocked && (
            <div style={{
              padding: '4px 8px',
              background: tokens.colors.status.success,
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: '700',
              color: '#fff'
            }}>
              נפתח
            </div>
          )}
        </div>
        <div style={{
          fontSize: '13px',
          color: tokens.colors.subtle,
          marginBottom: progress && goal ? '8px' : '0'
        }}>
          {description}
        </div>
        {progress !== undefined && goal && !unlocked && (
          <div>
            <div style={{
              height: '6px',
              background: tokens.colors.bg,
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '4px'
            }}>
              <div style={{
                height: '100%',
                background: tokens.colors.brand.primary,
                width: `${progressPercentage}%`,
                transition: 'width 0.3s ease'
              }} />
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
