import React, { useState, useEffect } from 'react';
import { tokens } from '../../styles/tokens';
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
        background: tokens.colors.panel
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div style={{ color: tokens.colors.text, fontSize: '18px', fontWeight: '600' }}>
            טוען...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: tokens.colors.panel,
      padding: '20px',
      paddingBottom: '100px',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          margin: '0 0 8px 0',
          color: tokens.colors.text
        }}>
          👋 שלום {profile ? 'נהג' : ''}!
        </h1>
        <p style={{ margin: '0', color: tokens.colors.subtle, fontSize: '16px' }}>
          {isOnline ? 'אתה מחובר ומוכן למשלוחים' : 'התחבר כדי להתחיל לעבוד'}
        </p>
      </div>

      {/* Online/Offline Toggle */}
      <div style={{
        background: tokens.colors.background.card,
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        border: `2px solid ${isOnline ? tokens.colors.status.success : tokens.colors.background.cardBorder}`,
        boxShadow: isOnline ? `0 8px 24px ${tokens.colors.status.success}30` : tokens.shadows.md
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: tokens.colors.text,
              marginBottom: '4px'
            }}>
              סטטוס
            </div>
            <div style={{
              fontSize: '14px',
              color: tokens.colors.subtle
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
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : tokens.colors.bg,
              border: `2px solid ${isOnline ? '#10b981' : tokens.colors.background.cardBorder}`,
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0,
              boxShadow: isOnline ? tokens.glows.success : 'none'
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
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }} />
          </button>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: isOnline
            ? `${tokens.colors.status.success}20`
            : `${tokens.colors.subtle}20`,
          border: `1px solid ${isOnline ? tokens.colors.status.success : tokens.colors.subtle}50`,
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600',
          color: isOnline ? tokens.colors.status.success : tokens.colors.subtle
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isOnline ? tokens.colors.status.success : tokens.colors.subtle,
            boxShadow: isOnline ? `0 0 8px ${tokens.colors.status.success}` : 'none'
          }} />
          {isOnline ? 'מחובר' : 'לא מחובר'}
        </div>
      </div>

      {/* Today's Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Deliveries */}
        <div style={{
          background: tokens.colors.background.card,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          boxShadow: tokens.shadows.md
        }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '8px'
          }}>📦</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '4px'
          }}>
            {todayStats.deliveries}
          </div>
          <div style={{
            fontSize: '13px',
            color: tokens.colors.subtle
          }}>
            משלוחים היום
          </div>
        </div>

        {/* Earnings */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
        }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '8px'
          }}>💰</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: tokens.colors.status.success,
            marginBottom: '4px'
          }}>
            ₪{todayStats.earnings.toFixed(0)}
          </div>
          <div style={{
            fontSize: '13px',
            color: tokens.colors.subtle
          }}>
            רווחים היום
          </div>
        </div>

        {/* Rating */}
        <div style={{
          background: tokens.colors.background.card,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          boxShadow: tokens.shadows.md
        }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '8px'
          }}>⭐</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '4px'
          }}>
            {profile?.rating.toFixed(1) || '5.0'}
          </div>
          <div style={{
            fontSize: '13px',
            color: tokens.colors.subtle
          }}>
            דירוג ממוצע
          </div>
        </div>

        {/* Total Deliveries */}
        <div style={{
          background: tokens.colors.background.card,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          boxShadow: tokens.shadows.md
        }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '8px'
          }}>🚀</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '4px'
          }}>
            {profile?.total_deliveries || 0}
          </div>
          <div style={{
            fontSize: '13px',
            color: tokens.colors.subtle
          }}>
            סה"כ משלוחים
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: tokens.colors.text,
          marginBottom: '16px'
        }}>
          פעולות מהירות
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          <button
            onClick={() => {
              navigate('/driver/deliveries');
              haptic('light');
            }}
            style={{
              padding: '20px',
              background: tokens.gradients.primary,
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'right',
              transition: 'all 0.3s ease',
              boxShadow: tokens.glows.primaryStrong
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(29, 155, 240, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = tokens.glows.primaryStrong;
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚚</div>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '4px'
            }}>
              המשלוחים שלי
            </div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              צפה במשימות פעילות
            </div>
          </button>

          <button
            onClick={() => {
              navigate('/driver/earnings');
              haptic('light');
            }}
            style={{
              padding: '20px',
              background: tokens.colors.background.card,
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'right',
              transition: 'all 0.3s ease',
              boxShadow: tokens.shadows.md
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = tokens.colors.brand.primary;
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = tokens.colors.background.cardBorder;
              e.currentTarget.style.boxShadow = tokens.shadows.md;
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💵</div>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: tokens.colors.text,
              marginBottom: '4px'
            }}>
              הרווחים שלי
            </div>
            <div style={{
              fontSize: '12px',
              color: tokens.colors.subtle
            }}>
              היסטוריית תשלומים
            </div>
          </button>

          <button
            onClick={() => {
              navigate('/driver/stats');
              haptic('light');
            }}
            style={{
              padding: '20px',
              background: tokens.colors.background.card,
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'right',
              transition: 'all 0.3s ease',
              boxShadow: tokens.shadows.md
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = tokens.colors.brand.primary;
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = tokens.colors.background.cardBorder;
              e.currentTarget.style.boxShadow = tokens.shadows.md;
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: tokens.colors.text,
              marginBottom: '4px'
            }}>
              הסטטיסטיקות שלי
            </div>
            <div style={{
              fontSize: '12px',
              color: tokens.colors.subtle
            }}>
              ביצועים ודירוגים
            </div>
          </button>

          <button
            onClick={() => {
              navigate('/driver/profile');
              haptic('light');
            }}
            style={{
              padding: '20px',
              background: tokens.colors.background.card,
              border: `1px solid ${tokens.colors.background.cardBorder}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'right',
              transition: 'all 0.3s ease',
              boxShadow: tokens.shadows.md
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = tokens.colors.brand.primary;
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = tokens.colors.background.cardBorder;
              e.currentTarget.style.boxShadow = tokens.shadows.md;
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚙️</div>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: tokens.colors.text,
              marginBottom: '4px'
            }}>
              הפרופיל שלי
            </div>
            <div style={{
              fontSize: '12px',
              color: tokens.colors.subtle
            }}>
              הגדרות ופרטים אישיים
            </div>
          </button>
        </div>
      </div>

      {/* Driver Info Card */}
      {profile && (
        <div style={{
          background: tokens.colors.background.card,
          borderRadius: '20px',
          padding: '24px',
          border: `1px solid ${tokens.colors.background.cardBorder}`,
          boxShadow: tokens.shadows.md
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: tokens.colors.text,
            marginBottom: '16px'
          }}>
            פרטי רכב
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: tokens.colors.bg,
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '14px', color: tokens.colors.subtle }}>סוג רכב</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text }}>
                {profile.vehicle_type || 'לא צוין'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: tokens.colors.bg,
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '14px', color: tokens.colors.subtle }}>מספר רכב</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text }}>
                {profile.vehicle_plate || 'לא צוין'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: tokens.colors.bg,
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '14px', color: tokens.colors.subtle }}>טלפון</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: tokens.colors.text }}>
                {profile.phone || 'לא צוין'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
