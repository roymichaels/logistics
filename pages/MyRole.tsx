import React, { useState, useEffect } from 'react';
import { DataStore, User } from '../data/types';
import { Toast } from '../src/components/Toast';
import { telegram } from '../lib/telegram';

interface MyRoleProps {
  dataStore: DataStore;
  onNavigate: (page: string) => void;
}

const ROYAL_COLORS = {
  background: 'radial-gradient(125% 125% at 50% 0%, rgba(95, 46, 170, 0.55) 0%, rgba(12, 2, 25, 0.95) 45%, #03000a 100%)',
  card: 'rgba(24, 10, 45, 0.75)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  muted: '#bfa9ff',
  text: '#f4f1ff',
  accent: '#9c6dff',
  gold: '#f6c945',
  crimson: '#ff6b8a',
  shadow: '0 20px 40px rgba(20, 4, 54, 0.45)'
};

export function MyRole({ dataStore, onNavigate }: MyRoleProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we need to force refresh (after manager promotion)
    const params = new URLSearchParams(window.location.search);
    const shouldRefresh = params.has('refresh');

    loadUser(shouldRefresh);

    // Clean up URL parameter
    if (shouldRefresh) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadUser = async (forceRefresh = false) => {
    try {
      const profile = forceRefresh
        ? await dataStore.getProfile(true)
        : await dataStore.getProfile();
      setUser(profile);

      // AUTO-REDIRECT: If user has owner/manager role, redirect to dashboard immediately
      if (profile.role === 'owner' || profile.role === 'manager') {
        console.log(`🔄 User has ${profile.role} role, redirecting to dashboard...`);
        Toast.success(`יש לך הרשאות ${profile.role}! מעביר למערכת...`);
        setTimeout(() => {
          onNavigate('dashboard');
        }, 500);
      } else if (profile.role === 'driver') {
        console.log('🔄 User has driver role, redirecting to deliveries...');
        setTimeout(() => {
          onNavigate('my-deliveries');
        }, 500);
      } else if (profile.role === 'warehouse') {
        console.log('🔄 User has warehouse role, redirecting to inventory...');
        setTimeout(() => {
          onNavigate('warehouse-dashboard');
        }, 500);
      } else if (profile.role === 'sales') {
        console.log('🔄 User has sales role, redirecting to orders...');
        setTimeout(() => {
          onNavigate('orders');
        }, 500);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Toast.error('שגיאה בטעינת פרופיל');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestManagerAccess = async () => {
    try {
      telegram.hapticFeedback('medium');

      console.log('🔐 Starting promotion process...');

      // Try to get telegram_id from multiple sources
      let userTelegramId = user?.telegram_id;

      if (!userTelegramId && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        userTelegramId = String(window.Telegram.WebApp.initDataUnsafe.user.id);
        console.log('📱 Got telegram_id from Telegram WebApp:', userTelegramId);
      }

      if (!userTelegramId) {
        console.error('❌ No telegram_id available');
        console.log('User object:', user);
        console.log('Telegram WebApp data:', window.Telegram?.WebApp?.initDataUnsafe);
        Toast.error('לא ניתן לזהות משתמש - אנא נסה שוב');
        return;
      }

      console.log('🔐 Promoting user:', userTelegramId);
      Toast.info('מעדכן הרשאות...');

      const supabaseUrl = import.meta.env.VITE_Bolt_Database_URL;

      console.log('📡 Calling edge function:', `${supabaseUrl}/functions/v1/promote-manager`);

      const response = await fetch(`${supabaseUrl}/functions/v1/promote-manager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_Bolt_Database_ANON_KEY}`
        },
        body: JSON.stringify({
          telegram_id: userTelegramId,
          pin: '000000',
          target_role: 'owner'
        })
      });

      console.log('📡 Response status:', response.status);

      const responseText = await response.text();
      console.log('📡 Response body:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to promote user';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('❌ Error response:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log('✅ User promoted successfully:', result);

      Toast.success('שודרג לבעלים! טוען מחדש...');

      console.log('⏱️ Waiting 1s for DB replication...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔄 Reloading page...');
      window.location.reload();
    } catch (error) {
      console.error('❌ Failed to promote user:', error);
      Toast.error(`שגיאה: ${error instanceof Error ? error.message : 'לא ניתן לעדכן הרשאות'}`);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: ROYAL_COLORS.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: ROYAL_COLORS.text
      }}>
        <div>טוען...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: ROYAL_COLORS.background,
      padding: '20px',
      paddingBottom: '100px',
      direction: 'rtl'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>👤</div>
        <h1 style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: '700',
          color: ROYAL_COLORS.text,
          marginBottom: '8px'
        }}>
          התפקיד שלי
        </h1>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: ROYAL_COLORS.muted
        }}>
          מצב משתמש ונתוני גישה
        </p>
      </div>

      {/* Status Card */}
      <div style={{
        background: ROYAL_COLORS.card,
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: ROYAL_COLORS.shadow
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 107, 138, 0.3), rgba(255, 107, 138, 0.1))',
            border: '2px solid rgba(255, 107, 138, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            ⛔
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '700',
              color: ROYAL_COLORS.crimson,
              marginBottom: '4px'
            }}>
              משתמש לא משוייך
            </h3>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: ROYAL_COLORS.muted
            }}>
              אין לך תפקיד מוקצה במערכת
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 107, 138, 0.1)',
          border: '1px solid rgba(255, 107, 138, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: ROYAL_COLORS.text,
            lineHeight: '1.6'
          }}>
            אתה כרגע לא משוייך לתפקיד במערכת זו.
            <br />
            על מנת לקבל גישה, אנא פנה למנהל שלך.
          </p>
        </div>

        <button
          onClick={handleRequestManagerAccess}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(120deg, #9c6dff, #f6c945)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(156, 109, 255, 0.4)'
          }}
        >
          👑 קבל גישת בעלים
        </button>
      </div>

      {/* Profile Card */}
      <div style={{
        background: ROYAL_COLORS.card,
        border: `1px solid ${ROYAL_COLORS.cardBorder}`,
        borderRadius: '20px',
        padding: '24px',
        boxShadow: ROYAL_COLORS.shadow
      }}>
        <h3 style={{
          margin: '0 0 20px',
          fontSize: '18px',
          fontWeight: '700',
          color: ROYAL_COLORS.text
        }}>
          הפרופיל שלך
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{
              fontSize: '12px',
              color: ROYAL_COLORS.muted,
              marginBottom: '4px',
              fontWeight: '600'
            }}>
              שם מלא
            </div>
            <div style={{
              fontSize: '15px',
              color: ROYAL_COLORS.text,
              fontWeight: '500'
            }}>
              {user?.name || 'לא זמין'}
            </div>
          </div>

          <div>
            <div style={{
              fontSize: '12px',
              color: ROYAL_COLORS.muted,
              marginBottom: '4px',
              fontWeight: '600'
            }}>
              שם משתמש בטלגרם
            </div>
            <div style={{
              fontSize: '15px',
              color: ROYAL_COLORS.accent,
              fontWeight: '500'
            }}>
              @{user?.username || user?.telegram_id || 'לא זמין'}
            </div>
          </div>

          {user?.phone && (
            <div>
              <div style={{
                fontSize: '12px',
                color: ROYAL_COLORS.muted,
                marginBottom: '4px',
                fontWeight: '600'
              }}>
                טלפון
              </div>
              <div style={{
                fontSize: '15px',
                color: ROYAL_COLORS.text,
                fontWeight: '500'
              }}>
                {user.phone}
              </div>
            </div>
          )}

          <div>
            <div style={{
              fontSize: '12px',
              color: ROYAL_COLORS.muted,
              marginBottom: '4px',
              fontWeight: '600'
            }}>
              תפקיד
            </div>
            <div style={{
              display: 'inline-block',
              padding: '6px 12px',
              background: 'rgba(255, 107, 138, 0.2)',
              border: '1px solid rgba(255, 107, 138, 0.4)',
              borderRadius: '8px',
              fontSize: '13px',
              color: ROYAL_COLORS.crimson,
              fontWeight: '600'
            }}>
              משתמש לא משוייך
            </div>
          </div>
        </div>
      </div>

      {/* Help Card */}
      <div style={{
        marginTop: '24px',
        background: 'rgba(77, 208, 225, 0.1)',
        border: '1px solid rgba(77, 208, 225, 0.3)',
        borderRadius: '16px',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <div style={{ fontSize: '20px' }}>💡</div>
          <div style={{ flex: 1 }}>
            <h4 style={{
              margin: '0 0 8px',
              fontSize: '14px',
              fontWeight: '700',
              color: '#4dd0e1'
            }}>
              צריך עזרה?
            </h4>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: ROYAL_COLORS.text,
              lineHeight: '1.5'
            }}>
              פנה למנהל הארגון שלך על מנת לקבל הקצאת תפקיד.
              לאחר הקצאת התפקיד, תוכל לגשת לכל הכלים והנתונים הרלוונטיים.
            </p>
          </div>
        </div>
      </div>

      {/* Manager Login Modal - No longer needed, promotion is instant */}
    </div>
  );
}
