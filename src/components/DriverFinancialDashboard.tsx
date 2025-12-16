import React, { useState, useEffect } from 'react';
import { DataStore } from '../data/types';
import { DriverService } from '../lib/driverService';
import { useRoleTheme } from '../hooks/useRoleTheme';

import { Toast } from './Toast';
import { logger } from '../lib/logger';

interface DriverFinancialDashboardProps {
  driverId: string;
  dataStore: DataStore;
}

type PeriodType = 'today' | 'week' | 'month';

interface EarningsSummary {
  totalEarnings: number;
  baseEarnings: number;
  tips: number;
  bonuses: number;
  deliveryCount: number;
  avgEarningsPerDelivery: number;
}

export function DriverFinancialDashboard({ driverId, dataStore }: DriverFinancialDashboardProps) {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
  const [loading, setLoading] = useState(true);

  const driverService = new DriverService(dataStore);
  const { colors, styles } = useRoleTheme();

  useEffect(() => {
    loadEarnings();
  }, [driverId, selectedPeriod]);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const summary = await driverService.getDriverEarningsSummary(driverId);

      let multiplier = 1;
      if (selectedPeriod === 'week') multiplier = 7;
      if (selectedPeriod === 'month') multiplier = 30;

      setEarnings({
        totalEarnings: summary.totalEarnings * multiplier,
        baseEarnings: summary.baseEarnings * multiplier,
        tips: summary.tips * multiplier,
        bonuses: summary.bonuses * multiplier,
        deliveryCount: summary.deliveryCount * multiplier,
        avgEarningsPerDelivery: summary.avgEarningsPerDelivery
      });
    } catch (error) {
      logger.error('Failed to load earnings:', error);
      Toast.error('שגיאה בטעינת נתוני הכנסות');
    } finally {
      setLoading(false);
    }
  };

  const periodLabels: Record<PeriodType, string> = {
    today: 'היום',
    week: 'השבוע',
    month: 'החודש'
  };

  if (loading || !earnings) {
    return (
      <div style={{ ...styles.card, padding: '40px', textAlign: 'center' }}>
        <div style={{ color: colors.muted }}>טוען נתוני הכנסות...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...styles.card, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: colors.text }}>
            💰 סיכום הכנסות
          </h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['today', 'week', 'month'] as PeriodType[]).map(period => (
              <button
                key={period}
                onClick={() => {
                  setSelectedPeriod(period);

                }}
                style={{
                  padding: '8px 14px',
                  background: selectedPeriod === period ? colors.gradientPrimary : colors.secondary,
                  border: 'none',
                  borderRadius: '8px',
                  color: selectedPeriod === period ? colors.textBright : colors.text,
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: selectedPeriod === period ? colors.glowPrimary : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          padding: '32px',
          background: `linear-gradient(135deg, ${colors.gold}20, ${colors.secondary})`,
          borderRadius: '16px',
          border: `2px solid ${colors.gold}30`,
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '700',
            color: colors.gold,
            marginBottom: '8px',
            textShadow: colors.glowGold
          }}>
            ₪{earnings.totalEarnings.toLocaleString()}
          </div>
          <div style={{ fontSize: '16px', color: colors.muted, fontWeight: '500' }}>
            סך הכנסות {periodLabels[selectedPeriod]}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: `${colors.info}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                💵
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  משכורת בסיס
                </div>
                <div style={{ fontSize: '12px', color: colors.muted }}>
                  70% מסך ההכנסות
                </div>
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: colors.info }}>
              ₪{earnings.baseEarnings.toLocaleString()}
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: `${colors.success}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                ✨
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  טיפים
                </div>
                <div style={{ fontSize: '12px', color: colors.muted }}>
                  מלקוחות מרוצים
                </div>
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: colors.success }}>
              +₪{earnings.tips.toLocaleString()}
            </div>
          </div>

          <div style={{
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: `${colors.gold}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                🎯
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  בונוסים
                </div>
                <div style={{ fontSize: '12px', color: colors.muted }}>
                  יעדים והישגים
                </div>
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: colors.gold }}>
              +₪{earnings.bonuses.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...styles.card, padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: colors.text }}>
          📊 סטטיסטיקות משלוחים
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: colors.accent, marginBottom: '4px' }}>
              {earnings.deliveryCount}
            </div>
            <div style={{ fontSize: '12px', color: colors.muted }}>סך משלוחים</div>
          </div>

          <div style={{
            padding: '16px',
            background: colors.secondary,
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: colors.info, marginBottom: '4px' }}>
              ₪{earnings.avgEarningsPerDelivery.toFixed(0)}
            </div>
            <div style={{ fontSize: '12px', color: colors.muted }}>ממוצע למשלוח</div>
          </div>
        </div>
      </div>

      <div style={{
        ...styles.card,
        padding: '16px',
        background: `linear-gradient(135deg, ${colors.success}15, ${colors.secondary})`
      }}>
        <div style={{ fontSize: '14px', color: colors.text, marginBottom: '8px' }}>
          💡 <strong>טיפים להגדלת הכנסות:</strong>
        </div>
        <ul style={{ margin: 0, paddingRight: '20px', fontSize: '13px', color: colors.muted, lineHeight: '1.8' }}>
          <li>השלם משלוחים במהירות וביעילות</li>
          <li>שמור על תקשורת מעולה עם לקוחות</li>
          <li>שאף להשלים את היעדים הבונוס</li>
          <li>עבוד בשעות שיא להכנסה מקסימלית</li>
          <li>שמור על דירוג גבוה לטיפים טובים יותר</li>
        </ul>
      </div>

      <div style={{ ...styles.card, padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: colors.text }}>
          💳 אמצעי תשלום
        </h3>

        <div style={{
          padding: '16px',
          background: colors.secondary,
          borderRadius: '12px',
          border: `1px solid ${colors.cardBorder}`,
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>
              💳 העברה בנקאית
            </span>
            <span style={{
              padding: '4px 10px',
              background: `${colors.success}20`,
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: colors.success
            }}>
              ברירת מחדל
            </span>
          </div>
          <div style={{ fontSize: '12px', color: colors.muted }}>
            תשלום בכל יום שישי
          </div>
        </div>

        <button
          onClick={() => Toast.info('תכונה זו תהיה זמינה בקרוב')}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: `2px solid ${colors.cardBorder}`,
            borderRadius: '12px',
            color: colors.text,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + הוסף אמצעי תשלום
        </button>
      </div>
    </div>
  );
}
