import React, { useState, useEffect, useCallback } from 'react';
import { DataStore, User } from '../data/types';
import { DriverApplicationForm } from '../components/DriverApplicationForm';
import { DriverOrderMarketplace } from '../components/DriverOrderMarketplace';
import { DriverEarningsDashboard } from '../components/DriverEarningsDashboard';
import { Toast } from '../components/Toast';
import { useTelegramUI } from '../hooks/useTelegramUI';

interface DriverProfile {
  id: string;
  user_id: string;
  application_status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'deactivated';
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
  is_online: boolean;
  is_active: boolean;
  total_deliveries: number;
  average_rating: number;
  acceptance_rate: number;
  current_order_count: number;
  max_concurrent_orders: number;
}

interface FreelancerDriverDashboardProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

export function FreelancerDriverDashboard({ dataStore, onNavigate }: FreelancerDriverDashboardProps) {
  const { theme, haptic, mainButton } = useTelegramUI();
  const [user, setUser] = useState<User | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplication, setShowApplication] = useState(false);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'earnings' | 'profile'>('marketplace');
  const supabase = (dataStore as any).supabase;

  const loadDriverProfile = useCallback(async () => {
    try {
      const profile = await dataStore.getProfile();
      setUser(profile);

      const { data: driverData, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setDriverProfile(driverData);
    } catch (error) {
      console.error('Failed to load driver profile:', error);
      Toast.error('שגיאה בטעינת פרופיל נהג');
    } finally {
      setLoading(false);
    }
  }, [dataStore, supabase]);

  useEffect(() => {
    loadDriverProfile();
  }, [loadDriverProfile]);

  const handleToggleOnline = async () => {
    if (!driverProfile) return;

    haptic.impactOccurred('medium');
    const newOnlineStatus = !driverProfile.is_online;

    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({
          is_online: newOnlineStatus,
          last_online_at: new Date().toISOString()
        })
        .eq('id', driverProfile.id);

      if (error) throw error;

      setDriverProfile(prev => prev ? { ...prev, is_online: newOnlineStatus } : null);
      Toast.success(newOnlineStatus ? 'עברת למצב מקוון' : 'עברת למצב לא מקוון');
      haptic.notificationOccurred('success');
    } catch (error) {
      console.error('Failed to toggle online status:', error);
      Toast.error('שגיאה בעדכון סטטוס');
      haptic.notificationOccurred('error');
    }
  };

  const handleApplicationComplete = () => {
    setShowApplication(false);
    loadDriverProfile();
    Toast.success('הבקשה נשלחה! נעדכן אותך בקרוב');
  };

  const bgColor = theme.bg_color || '#ffffff';
  const textColor = theme.text_color || '#000000';
  const buttonColor = theme.button_color || '#3390ec';
  const buttonTextColor = theme.button_text_color || '#ffffff';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: bgColor,
        color: textColor
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div style={{ fontSize: '16px' }}>טוען...</div>
        </div>
      </div>
    );
  }

  if (showApplication || (!driverProfile && !loading)) {
    return (
      <DriverApplicationForm
        dataStore={dataStore}
        onComplete={handleApplicationComplete}
        onCancel={() => setShowApplication(false)}
      />
    );
  }

  if (!driverProfile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: bgColor,
        color: textColor,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚗</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
          הפוך לנהג שותף
        </h2>
        <p style={{ fontSize: '16px', opacity: 0.7, marginBottom: '32px', maxWidth: '400px', lineHeight: '1.5' }}>
          הצטרף לפלטפורמה שלנו והתחל להרוויח באופן גמיש. עבוד מתי שנוח לך ובאזורים שאתה בוחר.
        </p>
        <button
          onClick={() => setShowApplication(true)}
          style={{
            padding: '16px 48px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: buttonColor,
            color: buttonTextColor,
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          הגש בקשה עכשיו
        </button>
      </div>
    );
  }

  if (driverProfile.application_status === 'pending' || driverProfile.application_status === 'under_review') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: bgColor,
        color: textColor,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>⏳</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
          הבקשה שלך בבדיקה
        </h2>
        <p style={{ fontSize: '16px', opacity: 0.7, marginBottom: '8px', maxWidth: '400px' }}>
          אנחנו בודקים את המסמכים והפרטים שלך.
        </p>
        <p style={{ fontSize: '14px', opacity: 0.6, maxWidth: '400px' }}>
          זה לוקח בדרך כלל 1-2 ימי עסקים. נעדכן אותך בהקדם.
        </p>
      </div>
    );
  }

  if (driverProfile.application_status === 'rejected') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: bgColor,
        color: textColor,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>❌</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
          הבקשה לא אושרה
        </h2>
        <p style={{ fontSize: '16px', opacity: 0.7, marginBottom: '32px', maxWidth: '400px' }}>
          לצערנו, לא יכולנו לאשר את הבקשה שלך. אנא צור קשר עם התמיכה למידע נוסף.
        </p>
      </div>
    );
  }

  if (!driverProfile.is_active) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: bgColor,
        color: textColor,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚠️</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
          החשבון מושעה
        </h2>
        <p style={{ fontSize: '16px', opacity: 0.7, maxWidth: '400px' }}>
          חשבון הנהג שלך מושעה כרגע. אנא צור קשר עם התמיכה לפרטים נוספים.
        </p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bgColor, minHeight: '100vh' }}>
      <div style={{
        padding: '16px',
        backgroundColor: driverProfile.is_online ? '#10b981' : '#6b7280',
        color: 'white',
        transition: 'background-color 0.3s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
              {user?.display_name || user?.first_name || 'נהג'}
            </h2>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              {driverProfile.is_online ? '🟢 מקוון' : '⚫ לא מקוון'}
            </div>
          </div>
          <button
            onClick={handleToggleOnline}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            {driverProfile.is_online ? 'עבור למצב לא מקוון' : 'התחל לעבוד'}
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {driverProfile.total_deliveries}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>משלוחים</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {driverProfile.average_rating.toFixed(1)}⭐
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9' }}>דירוג</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {driverProfile.acceptance_rate.toFixed(0)}%
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>אחוז קבלה</div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        backgroundColor: bgColor,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={() => setActiveTab('marketplace')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'marketplace' ? buttonColor : textColor,
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderBottom: activeTab === 'marketplace' ? `2px solid ${buttonColor}` : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          הזמנות זמינות
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'earnings' ? buttonColor : textColor,
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderBottom: activeTab === 'earnings' ? `2px solid ${buttonColor}` : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          הכנסות
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'profile' ? buttonColor : textColor,
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderBottom: activeTab === 'profile' ? `2px solid ${buttonColor}` : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          פרופיל
        </button>
      </div>

      {activeTab === 'marketplace' && driverProfile.is_online && (
        <DriverOrderMarketplace
          dataStore={dataStore}
          driverProfileId={driverProfile.id}
          onOrderAccepted={(orderId) => {
            Toast.success('ההזמנה נוספה למשלוחים שלך');
            onNavigate('my-deliveries');
          }}
        />
      )}

      {activeTab === 'marketplace' && !driverProfile.is_online && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: textColor,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌙</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
            אתה לא מקוון
          </h3>
          <p style={{ fontSize: '16px', opacity: 0.7, marginBottom: '24px', maxWidth: '300px' }}>
            כדי לראות הזמנות זמינות, עבור למצב מקוון
          </p>
          <button
            onClick={handleToggleOnline}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: buttonColor,
              color: buttonTextColor,
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            התחל לעבוד
          </button>
        </div>
      )}

      {activeTab === 'earnings' && (
        <DriverEarningsDashboard
          dataStore={dataStore}
          driverProfileId={driverProfile.id}
        />
      )}

      {activeTab === 'profile' && (
        <div style={{ padding: '20px', color: textColor }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
            פרופיל נהג
          </h3>

          <div style={{
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>סטטוס</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {driverProfile.application_status === 'approved' ? '✅ מאושר' : driverProfile.application_status}
            </div>
          </div>

          <div style={{
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>סטטוס אימות</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {driverProfile.verification_status === 'verified' ? '✅ מאומת' : driverProfile.verification_status}
            </div>
          </div>

          <div style={{
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>קיבולת</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              {driverProfile.current_order_count} / {driverProfile.max_concurrent_orders} משלוחים פעילים
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderRadius: '4px',
              marginTop: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(driverProfile.current_order_count / driverProfile.max_concurrent_orders) * 100}%`,
                height: '100%',
                backgroundColor: buttonColor,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          <div style={{
            backgroundColor: theme.secondary_bg_color || '#f5f5f5',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
              סטטיסטיקות
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>סה"כ משלוחים:</span>
                <span style={{ fontWeight: 'bold' }}>{driverProfile.total_deliveries}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>דירוג ממוצע:</span>
                <span style={{ fontWeight: 'bold' }}>{driverProfile.average_rating.toFixed(2)} ⭐</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.7 }}>אחוז קבלה:</span>
                <span style={{ fontWeight: 'bold' }}>{driverProfile.acceptance_rate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
