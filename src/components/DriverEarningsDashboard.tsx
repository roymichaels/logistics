import React, { useState, useEffect, useCallback } from 'react';
import { DataStore } from '../data/types';
import { Toast } from './Toast';
import { useTelegramUI } from '../hooks/useTelegramUI';
import { logger } from '../lib/logger';

interface EarningsData {
  today: number;
  week: number;
  month: number;
  todayDeliveries: number;
  weekDeliveries: number;
  monthDeliveries: number;
  avgPerDelivery: number;
  pendingPayout: number;
}

interface EarningRecord {
  id: string;
  order_id: string;
  business_name: string;
  customer_name: string;
  total_earnings: number;
  base_fee: number;
  distance_fee: number;
  tip_amount: number;
  bonus_amount: number;
  is_paid: boolean;
  earned_at: string;
}

interface DriverEarningsDashboardProps {
  dataStore: DataStore;
  driverProfileId: string;
}

export function DriverEarningsDashboard({ dataStore, driverProfileId }: DriverEarningsDashboardProps) {
  const { theme, haptic } = useTelegramUI();
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    week: 0,
    month: 0,
    todayDeliveries: 0,
    weekDeliveries: 0,
    monthDeliveries: 0,
    avgPerDelivery: 0,
    pendingPayout: 0
  });
  const [recentEarnings, setRecentEarnings] = useState<EarningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'today' | 'week' | 'month'>('today');
  const supabase = (dataStore as any).supabase;

  const loadEarnings = useCallback(async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: earningsData, error } = await supabase
        .from('driver_earnings')
        .select(`
          *,
          orders:order_id (
            customer_name
          ),
          businesses:business_id (
            name,
            name_hebrew
          )
        `)
        .eq('driver_profile_id', driverProfileId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      const allEarnings = earningsData || [];

      const todayEarnings = allEarnings.filter(
        (e: any) => new Date(e.earned_at) >= todayStart
      );
      const weekEarnings = allEarnings.filter(
        (e: any) => new Date(e.earned_at) >= weekStart
      );
      const monthEarnings = allEarnings.filter(
        (e: any) => new Date(e.earned_at) >= monthStart
      );

      const todayTotal = todayEarnings.reduce((sum: number, e: any) => sum + parseFloat(e.total_earnings || 0), 0);
      const weekTotal = weekEarnings.reduce((sum: number, e: any) => sum + parseFloat(e.total_earnings || 0), 0);
      const monthTotal = monthEarnings.reduce((sum: number, e: any) => sum + parseFloat(e.total_earnings || 0), 0);

      const pendingTotal = allEarnings
        .filter((e: any) => !e.is_paid)
        .reduce((sum: number, e: any) => sum + parseFloat(e.net_earnings || 0), 0);

      setEarnings({
        today: todayTotal,
        week: weekTotal,
        month: monthTotal,
        todayDeliveries: todayEarnings.length,
        weekDeliveries: weekEarnings.length,
        monthDeliveries: monthEarnings.length,
        avgPerDelivery: monthEarnings.length > 0 ? monthTotal / monthEarnings.length : 0,
        pendingPayout: pendingTotal
      });

      const recentRecords: EarningRecord[] = allEarnings.slice(0, 20).map((e: any) => ({
        id: e.id,
        order_id: e.order_id,
        business_name: e.businesses?.name_hebrew || e.businesses?.name || 'עסק',
        customer_name: e.orders?.customer_name || 'לקוח',
        total_earnings: parseFloat(e.total_earnings || 0),
        base_fee: parseFloat(e.base_fee || 0),
        distance_fee: parseFloat(e.distance_fee || 0),
        tip_amount: parseFloat(e.tip_amount || 0),
        bonus_amount: parseFloat(e.bonus_amount || 0),
        is_paid: e.is_paid,
        earned_at: e.earned_at
      }));

      setRecentEarnings(recentRecords);
    } catch (error) {
      logger.error('Failed to load earnings:', error);
      Toast.error('שגיאה בטעינת נתוני הכנסות');
    } finally {
      setLoading(false);
    }
  }, [dataStore, driverProfileId, supabase]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const getCurrentPeriodEarnings = () => {
    switch (view) {
      case 'today':
        return earnings.today;
      case 'week':
        return earnings.week;
      case 'month':
        return earnings.month;
      default:
        return 0;
    }
  };

  const getCurrentPeriodDeliveries = () => {
    switch (view) {
      case 'today':
        return earnings.todayDeliveries;
      case 'week':
        return earnings.weekDeliveries;
      case 'month':
        return earnings.monthDeliveries;
      default:
        return 0;
    }
  };

  const getPeriodLabel = () => {
    switch (view) {
      case 'today':
        return 'היום';
      case 'week':
        return 'השבוע';
      case 'month':
        return 'החודש';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `היום ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `אתמול ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  };

  const bgColor = theme.bg_color || '#ffffff';
  const textColor = theme.text_color || '#000000';
  const buttonColor = theme.button_color || '#3390ec';
  const buttonTextColor = theme.button_text_color || '#ffffff';

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        backgroundColor: bgColor,
        color: textColor
      }}>
        <div style={{ fontSize: '16px' }}>טוען נתוני הכנסות...</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bgColor, minHeight: '100vh', paddingBottom: '20px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        padding: '24px 16px',
        color: 'white'
      }}>
        <h2 style={{ fontSize: '18px', margin: '0 0 20px 0', opacity: 0.9 }}>
          ההכנסות שלי
        </h2>

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
            {getPeriodLabel()}
          </div>
          <div style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '8px' }}>
            ₪{getCurrentPeriodEarnings().toFixed(0)}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            {getCurrentPeriodDeliveries()} משלוחים
            {getCurrentPeriodDeliveries() > 0 && (
              <> • ממוצע ₪{(getCurrentPeriodEarnings() / getCurrentPeriodDeliveries()).toFixed(0)} למשלוח</>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setView('today')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: view === 'today' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            היום
          </button>
          <button
            onClick={() => setView('week')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: view === 'week' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            שבוע
          </button>
          <button
            onClick={() => setView('month')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: view === 'month' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            חודש
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {earnings.pendingPayout > 0 && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', color: '#92400e' }}>
              ממתין לתשלום
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>
              ₪{earnings.pendingPayout.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', marginTop: '8px', color: '#92400e', opacity: 0.8 }}>
              התשלום יועבר לחשבון הבנק שלך בתאריך התשלום הקרוב
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px 0', color: textColor }}>
            משלוחים אחרונים
          </h3>
        </div>

        {recentEarnings.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: textColor,
            opacity: 0.6
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
            <div style={{ fontSize: '16px' }}>עדיין לא ביצעת משלוחים</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentEarnings.map(earning => (
              <div
                key={earning.id}
                style={{
                  backgroundColor: theme.secondary_bg_color || '#f5f5f5',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: textColor, marginBottom: '4px' }}>
                      {earning.business_name}
                    </div>
                    <div style={{ fontSize: '13px', color: textColor, opacity: 0.7 }}>
                      {earning.customer_name}
                    </div>
                    <div style={{ fontSize: '12px', color: textColor, opacity: 0.6, marginTop: '4px' }}>
                      {formatDate(earning.earned_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#10b981'
                    }}>
                      ₪{earning.total_earnings.toFixed(2)}
                    </div>
                    {!earning.is_paid && (
                      <div style={{
                        fontSize: '11px',
                        color: '#f59e0b',
                        marginTop: '4px',
                        fontWeight: 'bold'
                      }}>
                        ממתין
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(0,0,0,0.1)',
                  fontSize: '12px',
                  color: textColor
                }}>
                  {earning.base_fee > 0 && (
                    <div>
                      <span style={{ opacity: 0.6 }}>תעריף בסיס:</span>{' '}
                      <span style={{ fontWeight: 'bold' }}>₪{earning.base_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {earning.distance_fee > 0 && (
                    <div>
                      <span style={{ opacity: 0.6 }}>תעריף מרחק:</span>{' '}
                      <span style={{ fontWeight: 'bold' }}>₪{earning.distance_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {earning.tip_amount > 0 && (
                    <div>
                      <span style={{ opacity: 0.6 }}>טיפ:</span>{' '}
                      <span style={{ fontWeight: 'bold', color: '#10b981' }}>₪{earning.tip_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {earning.bonus_amount > 0 && (
                    <div>
                      <span style={{ opacity: 0.6 }}>בונוס:</span>{' '}
                      <span style={{ fontWeight: 'bold', color: '#8b5cf6' }}>₪{earning.bonus_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
