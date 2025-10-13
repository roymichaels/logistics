import React, { useMemo, useState } from 'react';
import { useRoleTheme } from '../hooks/useRoleTheme';
import { telegram } from '../lib/telegram';

interface DriverWithDetails {
  profile: any;
  stats: any;
  user: any;
  isOnline: boolean;
  currentStatus: string;
}

interface DriverPerformanceChartProps {
  drivers: DriverWithDetails[];
}

type MetricType = 'deliveries' | 'rating' | 'revenue' | 'success_rate';

export function DriverPerformanceChart({ drivers }: DriverPerformanceChartProps) {
  const { colors, styles } = useRoleTheme();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('deliveries');

  const metrics: { key: MetricType; label: string; icon: string; color: string }[] = [
    { key: 'deliveries', label: 'משלוחים', icon: '📦', color: colors.info },
    { key: 'rating', label: 'דירוג', icon: '⭐', color: colors.gold },
    { key: 'revenue', label: 'הכנסות', icon: '💰', color: colors.success },
    { key: 'success_rate', label: 'הצלחה', icon: '✅', color: colors.accent }
  ];

  const sortedDrivers = useMemo(() => {
    const sorted = [...drivers].sort((a, b) => {
      switch (selectedMetric) {
        case 'deliveries':
          return b.stats.total_deliveries - a.stats.total_deliveries;
        case 'rating':
          return b.profile.rating - a.profile.rating;
        case 'revenue':
          return b.stats.revenue_today - a.stats.revenue_today;
        case 'success_rate':
          return b.stats.success_rate - a.stats.success_rate;
        default:
          return 0;
      }
    });
    return sorted.slice(0, 10);
  }, [drivers, selectedMetric]);

  const maxValue = useMemo(() => {
    if (sortedDrivers.length === 0) return 100;

    const values = sortedDrivers.map(d => {
      switch (selectedMetric) {
        case 'deliveries':
          return d.stats.total_deliveries;
        case 'rating':
          return d.profile.rating;
        case 'revenue':
          return d.stats.revenue_today;
        case 'success_rate':
          return d.stats.success_rate;
        default:
          return 0;
      }
    });

    return Math.max(...values, 1);
  }, [sortedDrivers, selectedMetric]);

  const getMetricValue = (driver: DriverWithDetails): number => {
    switch (selectedMetric) {
      case 'deliveries':
        return driver.stats.total_deliveries;
      case 'rating':
        return driver.profile.rating;
      case 'revenue':
        return driver.stats.revenue_today;
      case 'success_rate':
        return driver.stats.success_rate;
      default:
        return 0;
    }
  };

  const formatValue = (value: number): string => {
    switch (selectedMetric) {
      case 'deliveries':
        return value.toString();
      case 'rating':
        return value.toFixed(1);
      case 'revenue':
        return `₪${value.toLocaleString()}`;
      case 'success_rate':
        return `${value.toFixed(0)}%`;
      default:
        return value.toString();
    }
  };

  const currentMetric = metrics.find(m => m.key === selectedMetric)!;

  const topPerformers = sortedDrivers.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ ...styles.card, padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: colors.text }}>
          📊 ניתוח ביצועים
        </h3>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          {metrics.map(metric => (
            <button
              key={metric.key}
              onClick={() => {
                setSelectedMetric(metric.key);
                telegram.hapticFeedback('selection');
              }}
              style={{
                padding: '10px 16px',
                background: selectedMetric === metric.key ? colors.gradientPrimary : colors.secondary,
                border: 'none',
                borderRadius: '10px',
                color: selectedMetric === metric.key ? colors.textBright : colors.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selectedMetric === metric.key ? colors.glowPrimary : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              {metric.icon} {metric.label}
            </button>
          ))}
        </div>

        {topPerformers.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {topPerformers.map((driver, index) => (
              <div
                key={driver.profile.user_id}
                style={{
                  padding: '16px',
                  background: index === 0
                    ? `linear-gradient(135deg, ${colors.gold}20, ${colors.secondary})`
                    : colors.secondary,
                  borderRadius: '14px',
                  border: index === 0 ? `2px solid ${colors.gold}` : `1px solid ${colors.cardBorder}`,
                  textAlign: 'center',
                  boxShadow: index === 0 ? colors.glowGold : 'none'
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {medals[index]}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  color: colors.text,
                  marginBottom: '8px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {driver.user?.name || 'נהג'}
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: index === 0 ? colors.gold : currentMetric.color,
                  marginBottom: '4px'
                }}>
                  {formatValue(getMetricValue(driver))}
                </div>
                <div style={{ fontSize: '11px', color: colors.muted }}>
                  {currentMetric.label}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedDrivers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
              <div style={{ fontSize: '16px', color: colors.text, fontWeight: '600', marginBottom: '8px' }}>
                אין נתונים להצגה
              </div>
              <div style={{ fontSize: '14px', color: colors.muted }}>
                לא נמצאו נהגים עם ביצועים לתקופה זו
              </div>
            </div>
          ) : (
            sortedDrivers.map((driver, index) => {
              const value = getMetricValue(driver);
              const percentage = (value / maxValue) * 100;

              return (
                <div
                  key={driver.profile.user_id}
                  style={{
                    padding: '12px',
                    background: colors.secondary,
                    borderRadius: '12px',
                    border: `1px solid ${colors.cardBorder}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: driver.isOnline ? colors.gradientSuccess : colors.background,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        border: `2px solid ${driver.isOnline ? colors.success : colors.cardBorder}`,
                        flexShrink: 0
                      }}>
                        🚗
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.text,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {driver.user?.name || driver.profile.user_id}
                        </div>
                        <div style={{ fontSize: '11px', color: colors.muted }}>
                          {driver.profile.vehicle_type || 'רכב לא צוין'}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: currentMetric.color,
                      minWidth: '80px',
                      textAlign: 'left'
                    }}>
                      {formatValue(value)}
                    </div>
                  </div>

                  <div style={{
                    height: '8px',
                    background: colors.background,
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      background: index < 3
                        ? `linear-gradient(90deg, ${colors.gold}, ${currentMetric.color})`
                        : currentMetric.color,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ ...styles.card, padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: colors.text }}>
          📈 סטטיסטיקות כלליות
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <div style={{
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '8px' }}>
              סך משלוחים
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.info }}>
              {drivers.reduce((sum, d) => sum + d.stats.total_deliveries, 0).toLocaleString()}
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '8px' }}>
              דירוג ממוצע
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.gold }}>
              {(drivers.reduce((sum, d) => sum + d.profile.rating, 0) / drivers.length || 0).toFixed(1)} ⭐
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '8px' }}>
              סך הכנסות היום
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.success }}>
              ₪{drivers.reduce((sum, d) => sum + d.stats.revenue_today, 0).toLocaleString()}
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '8px' }}>
              אחוז הצלחה ממוצע
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.accent }}>
              {(drivers.reduce((sum, d) => sum + d.stats.success_rate, 0) / drivers.length || 0).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <div style={{
        ...styles.card,
        padding: '16px',
        background: `linear-gradient(135deg, ${colors.info}15, ${colors.secondary})`
      }}>
        <div style={{ fontSize: '14px', color: colors.text, marginBottom: '8px' }}>
          📊 <strong>תובנות נוספות:</strong>
        </div>
        <ul style={{ margin: 0, paddingRight: '20px', fontSize: '13px', color: colors.muted, lineHeight: '1.8' }}>
          <li>השוואת ביצועים לפי תקופות זמן</li>
          <li>ניתוח מגמות וחיזוי ביצועים</li>
          <li>דוחות מפורטים לייצוא</li>
          <li>התראות על סטיות מהממוצע</li>
          <li>מערכת תגמול והכרה אוטומטית</li>
        </ul>
      </div>
    </div>
  );
}
